import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { useNotifications } from './NotificationSystem';
import { 
  Search, 
  Edit, 
  ChevronUp,
  ChevronDown,
  FileText,
  User,
  Calculator,
  XCircle
} from 'lucide-react';
import { db } from '../firebase';
import { 
  collection, 
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
  writeBatch
} from 'firebase/firestore';
import LoadingSpinner from './LoadingSpinner';
import PaymentModal from './PaymentModal';

const OpenInvoices = ({ onEditInvoice, onAddInvoice }) => {
  const [openInvoices, setOpenInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('invoiceDate');
  const [sortOrder, setSortOrder] = useState('desc');
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [invoiceForPayment, setInvoiceForPayment] = useState(null);
  const [products, setProducts] = useState([]);
  const { t } = useTranslation();
  const { darkMode } = useTheme();
  const { success, error: showError } = useNotifications();

  useEffect(() => {
    fetchOpenInvoices();
    fetchProducts();
  }, []);

  useEffect(() => {
    filterAndSortInvoices();
  }, [openInvoices, searchTerm, sortBy, sortOrder]);

  const fetchOpenInvoices = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'openInvoices'));
      const invoicesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Sort by createdAt if available, otherwise by invoiceDate
      invoicesData.sort((a, b) => {
        const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : 
                     (a.createdAt?.seconds ? new Date(a.createdAt.seconds * 1000) :
                      (a.createdAt ? new Date(a.createdAt) : new Date(a.invoiceDate || 0)));
        const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : 
                     (b.createdAt?.seconds ? new Date(b.createdAt.seconds * 1000) :
                      (b.createdAt ? new Date(b.createdAt) : new Date(b.invoiceDate || 0)));
        return bDate - aDate; // Descending order
      });
      setOpenInvoices(invoicesData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching open invoices:', error);
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'products'));
      const productsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProducts(productsData);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const filterAndSortInvoices = () => {
    let filtered = openInvoices;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(invoice =>
        invoice.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.carNumber?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort invoices
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'invoiceNumber':
          aValue = (a.invoiceNumber || '').toLowerCase();
          bValue = (b.invoiceNumber || '').toLowerCase();
          break;
        case 'customerName':
          aValue = (a.customerName || '').toLowerCase();
          bValue = (b.customerName || '').toLowerCase();
          break;
        case 'invoiceDate':
          aValue = new Date(a.invoiceDate || a.createdAt);
          bValue = new Date(b.invoiceDate || b.createdAt);
          break;
        case 'finalAmount':
          aValue = parseFloat(a.finalAmount) || 0;
          bValue = parseFloat(b.finalAmount) || 0;
          break;
        default:
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
          break;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredInvoices(filtered);
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const formatNumber = (number) => {
    const rounded = Math.round(parseFloat(number || 0) * 100) / 100;
    return rounded % 1 === 0 ? rounded.toString() : rounded.toFixed(2);
  };

  const handleEditInvoice = (invoice) => {
    if (onEditInvoice) {
      onEditInvoice(invoice);
    }
  };

  const handleCloseInvoice = (invoice) => {
    setInvoiceForPayment(invoice);
    setShowPaymentModal(true);
  };

  const handlePaymentComplete = async (paymentData) => {
    if (!invoiceForPayment) return;

    try {
      const batch = writeBatch(db);

      // Decrease product quantities
      if (invoiceForPayment.products && invoiceForPayment.products.length > 0) {
        for (const p of invoiceForPayment.products) {
          if (p.productId) {
            const productRef = doc(db, 'products', p.productId);
            const currentProduct = products.find(x => x.id === p.productId);
            const newQuantity = (currentProduct?.quantity || 0) - (p.quantity || 0);
            batch.update(productRef, { quantity: newQuantity, available: newQuantity > 0 });
          }
        }
      }

      // Prepare invoice data for final invoices collection
      const invoiceData = {
        ...invoiceForPayment,
        paymentAmount: paymentData.amount,
        remainingAmount: invoiceForPayment.finalAmount - paymentData.amount,
        paymentMethod: paymentData.paymentMethod,
        paymentDate: paymentData.paymentDate,
        status: paymentData.amount >= invoiceForPayment.finalAmount ? 'paid' : 'partial',
        createdAt: invoiceForPayment.createdAt || new Date()
      };

      // Add to invoices collection
      const invoicesRef = collection(db, 'invoices');
      await addDoc(invoicesRef, invoiceData);

      // Delete from open invoices
      const openInvoiceRef = doc(db, 'openInvoices', invoiceForPayment.id);
      batch.delete(openInvoiceRef);

      await batch.commit();

      setShowPaymentModal(false);
      setInvoiceForPayment(null);
      success(t('success'), t('invoiceClosed') || 'Invoice closed successfully');
      fetchOpenInvoices();
      fetchProducts();
    } catch (err) {
      console.error('Error closing invoice:', err);
      showError(t('error'), t('invoiceCloseError') || 'Failed to close invoice');
    }
  };

  if (loading) {
    return <LoadingSpinner page="openInvoices" />;
  }

  return (
    <div className={`h-[100%] w-full ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-4">الفواتير المفتوحة</h1>
          
          {/* Search Controls */}
          <div className="flex justify-between align-center md:grid-cols-2 gap-4 mb-6">
            <div className="relative w-[40%]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder={t('search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg ${
                  darkMode 
                    ? 'bg-gray-800 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
            </div>
            {onAddInvoice && (
              <button
                onClick={onAddInvoice}
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2 w-[20%]"
              >
                <FileText size={20} />
                {t('addInvoice')}
              </button>
            )}
          </div>
        </div>

        {/* Open Invoices Table */}
        <div className={`overflow-x-auto rounded-lg shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <table className="w-full">
            <thead className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <tr>
                <th className={`px-6 py-3 text-center text-xs font-medium uppercase tracking-wider cursor-pointer ${
                  darkMode ? 'text-gray-300' : 'text-gray-500'
                }`} onClick={() => handleSort('invoiceNumber')}>
                  <div className="flex items-center justify-center gap-2">
                    <FileText size={16} />
                    {t('invoiceNumber')}
                    {sortBy === 'invoiceNumber' && (
                      sortOrder === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </div>
                </th>
                <th className={`px-6 py-3 text-center text-xs font-medium uppercase tracking-wider cursor-pointer ${
                  darkMode ? 'text-gray-300' : 'text-gray-500'
                }`} onClick={() => handleSort('customerName')}>
                  <div className="flex items-center justify-center gap-2">
                    <User size={16} />
                    {t('customerName')}
                    {sortBy === 'customerName' && (
                      sortOrder === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </div>
                </th>
                <th className={`px-6 py-3 text-center text-xs font-medium uppercase tracking-wider ${
                  darkMode ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  {t('carNumber')}
                </th>
                <th className={`px-6 py-3 text-center text-xs font-medium uppercase tracking-wider cursor-pointer ${
                  darkMode ? 'text-gray-300' : 'text-gray-500'
                }`} onClick={() => handleSort('invoiceDate')}>
                  <div className="flex items-center justify-center gap-2">
                    <FileText size={16} />
                    {t('invoiceDate')}
                    {sortBy === 'invoiceDate' && (
                      sortOrder === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </div>
                </th>
                <th className={`px-6 py-3 text-center text-xs font-medium uppercase tracking-wider cursor-pointer ${
                  darkMode ? 'text-gray-300' : 'text-gray-500'
                }`} onClick={() => handleSort('finalAmount')}>
                  <div className="flex items-center justify-center gap-2">
                    <Calculator size={16} />
                    {t('finalAmount')}
                    {sortBy === 'finalAmount' && (
                      sortOrder === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </div>
                </th>
                <th className={`px-6 py-3 text-center text-xs font-medium uppercase tracking-wider ${
                  darkMode ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  {t('actions')}
                </th>
              </tr>
            </thead>
            <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
              {filteredInvoices.map((invoice) => (
                <tr key={invoice.id} className={`${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'} cursor-pointer`}
                    onClick={() => handleEditInvoice(invoice)}>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="text-sm font-medium">{invoice.invoiceNumber}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="text-sm">{invoice.customerName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="text-sm">{invoice.carNumber}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="text-sm">
                      {invoice.invoiceDate || 
                       (invoice.createdAt?.toDate ? invoice.createdAt.toDate().toLocaleDateString() : 
                        (invoice.createdAt?.seconds ? new Date(invoice.createdAt.seconds * 1000).toLocaleDateString() :
                         (invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString() : '-')))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="text-sm font-medium">{formatNumber(invoice.finalAmount)} JOD</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => handleEditInvoice(invoice)}
                        className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-xs flex items-center gap-1"
                      >
                        <Edit size={14} />
                        {t('edit')}
                      </button>
                      <button
                        onClick={() => handleCloseInvoice(invoice)}
                        className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 text-xs flex items-center gap-1"
                      >
                        <XCircle size={14} />
                        {t('closeInvoice')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredInvoices.length === 0 && (
            <div className="text-center py-12">
              <p className="text-xl text-gray-500">لا توجد فواتير مفتوحة</p>
            </div>
          )}
        </div>

        {/* Payment Modal */}
        {showPaymentModal && invoiceForPayment && (
          <PaymentModal
            isOpen={showPaymentModal}
            onClose={() => {
              setShowPaymentModal(false);
              setInvoiceForPayment(null);
            }}
            invoiceAmount={invoiceForPayment.finalAmount}
            onPaymentComplete={handlePaymentComplete}
          />
        )}
      </div>
    </div>
  );
};

export default OpenInvoices;
