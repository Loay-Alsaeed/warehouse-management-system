import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { useNotifications } from './NotificationSystem';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2,
  ChevronUp,
  ChevronDown,
  FileText,
  User,
  Package,
  Calculator,
  Save
} from 'lucide-react';
import { db } from '../firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs,
  query,
  orderBy,
  writeBatch
} from 'firebase/firestore';
import LoadingSpinner from './LoadingSpinner';
import ConfirmationModal from './ConfirmationModal';
import AddInvoiceModal from './AddInvoiceModal';
import { InvoiceDisplay } from './InvoiceDisplay';

const Invoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [availableServices, setAvailableServices] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('invoiceNumber');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState(null);
  const { t, i18n } = useTranslation();
  const { darkMode } = useTheme();
  const { success, error: showError } = useNotifications();

  useEffect(() => {
    fetchInvoices();
    fetchCustomers();
    fetchProducts();
    fetchServices();
  }, []);

  useEffect(() => {
    filterAndSortInvoices();
  }, [invoices, searchTerm, sortBy, sortOrder]);

  const fetchInvoices = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'invoices'));
      const invoicesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setInvoices(invoicesData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'customers'));
      const customersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCustomers(customersData);
    } catch (error) {
      console.error('Error fetching customers:', error);
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

  const fetchServices = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'services'));
      const servicesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAvailableServices(servicesData);
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  const filterAndSortInvoices = () => {
    let filtered = invoices;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(invoice =>
        invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.carNumber.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort invoices
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'invoiceNumber':
          aValue = a.invoiceNumber.toLowerCase();
          bValue = b.invoiceNumber.toLowerCase();
          break;
        case 'customerName':
          aValue = a.customerName.toLowerCase();
          bValue = b.customerName.toLowerCase();
          break;
        case 'invoiceDate':
          aValue = new Date(a.invoiceDate);
          bValue = new Date(b.invoiceDate);
          break;
        case 'finalAmount':
          aValue = parseFloat(a.finalAmount) || 0;
          bValue = parseFloat(b.finalAmount) || 0;
          break;
        default:
          aValue = a.invoiceNumber.toLowerCase();
          bValue = b.invoiceNumber.toLowerCase();
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

  // Helper to format numbers
  const formatNumber = (number) => {
    const rounded = Math.round(parseFloat(number || 0) * 100) / 100;
    return rounded % 1 === 0 ? rounded.toString() : rounded.toFixed(2);
  };

  // Refresh data callback for AddInvoiceModal
  const handleInvoiceAdded = () => {
    fetchInvoices();
    fetchCustomers();
    fetchProducts();
    fetchServices();
  };

  // Handle delete invoice
  const handleDeleteInvoice = async (invoiceId) => {
    if (!invoiceId) {
      showError(t('error'), t('invoiceNotFound'));
      return;
    }

    try {
      // Find the invoice to get its products
      const invoiceToDelete = invoices.find(invoice => invoice.id === invoiceId);
      
      if (!invoiceToDelete) {
        showError(t('error'), t('invoiceNotFound'));
        return;
      }

      // Create batch for atomic operations
      const batch = writeBatch(db);

      // Return products quantities to inventory
      if (invoiceToDelete.products && invoiceToDelete.products.length > 0) {
        for (const invoiceProduct of invoiceToDelete.products) {
          if (invoiceProduct.productId) {
            // Find the current product in inventory
            const currentProduct = products.find(p => p.id === invoiceProduct.productId);
            
            if (currentProduct) {
              // Calculate new quantity (add back the sold quantity)
              const newQuantity = (currentProduct.quantity || 0) + (invoiceProduct.quantity || 0);
              
              // Update product quantity in batch
              const productRef = doc(db, 'products', invoiceProduct.productId);
              batch.update(productRef, {
                quantity: newQuantity,
                available: newQuantity > 0
              });
            }
          }
        }
      }

      // Delete the invoice
      const invoiceRef = doc(db, 'invoices', invoiceId);
      batch.delete(invoiceRef);

      // Commit all changes
      await batch.commit();

      // Refresh data
      fetchInvoices();
      fetchProducts(); // Refresh products to show updated quantities
      setShowDeleteModal(false);
      success(t('invoiceDeleted') || 'Success', t('invoiceDeletedMessage') || 'Invoice deleted successfully');
    } catch (error) {
      console.error('Error deleting invoice:', error);
      showError(t('error'), t('invoiceDeleteError'));
    }
  };

  const openDeleteModal = (invoice) => {
    setInvoiceToDelete(invoice);
    setShowDeleteModal(true);
  };

  const openEditModal = (invoice) => {
    setEditingInvoice(invoice);
    setShowEditModal(true);
  };

  if (loading) {
    return <LoadingSpinner page="invoices" />;
  }

  return (
    <div className={`h-[100%] w-full ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-4">{t('invoices')}</h1>
          
          {/* Search and Filter Controls */}
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

            <button
              onClick={() => setShowAddModal(true)}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2 w-[20%]"
            >
              <Plus size={20} />
              {t('addInvoice')}
            </button>
          </div>
        </div>

        {/* Invoices Table */}
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
                  {t('paymentMethod')}
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
                <tr key={invoice.id} className={`${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
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
                    <div className="text-sm">{invoice.invoiceDate}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="text-sm font-medium">{formatNumber(invoice.finalAmount)} JOD</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        invoice.paymentMethod === 'cash' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {invoice.paymentMethod === 'cash' ? t('cash') : t('visa')}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center">
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => openEditModal(invoice)}
                        className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-xs"
                      >
                        <Edit size={14} className="inline mr-1" />
                        {t('viewInvoice')}
                      </button>
                      <button
                        onClick={() => openDeleteModal(invoice)}
                        className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-xs"
                      >
                                                <Trash2 size={14} className="inline mr-1" />
                        {t('deleteInvoice')}
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredInvoices.length === 0 && (
            <div className="text-center py-12">
              <p className="text-xl text-gray-500">{t('noInvoices')}</p>
            </div>
          )}
        </div>

        {/* Add Invoice Modal */}
        <AddInvoiceModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          customers={customers}
          products={products}
          availableServices={availableServices}
          onInvoiceAdded={handleInvoiceAdded}
        />

        {/* View Invoice Modal */}
        {showEditModal && editingInvoice && (
          <div className="fixed inset-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
            <div className="w-full h-full relative">
              <div className="absolute top-4 right-4 z-10">
                <button
                  onClick={() => setShowEditModal(false)}
                  className={`${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-white hover:bg-gray-100 text-gray-900'} px-4 py-2 rounded-lg font-semibold shadow-lg flex items-center gap-2`}
                >
                  <span>{t('close')}</span>
                </button>
              </div>
              <InvoiceDisplay
                invoice={editingInvoice}
                onClose={() => setShowEditModal(false)}
                onPrint={() => {
                  window.print();
                }}
                onDownloadPDF={() => {
                  // TODO: Implement PDF download functionality
                  console.log('PDF download not implemented yet');
                }}
              />
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <ConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={() => handleDeleteInvoice(invoiceToDelete?.id)}
          title={t('deleteConfirmation')}
          message={t('confirmDeleteInvoice')}
          confirmText="delete"
          cancelText="cancel"
          type="danger"
        />

        {/* ProductSelectionModal removed - selection is inline now */}
      </div>
    </div>
  );
};

export default Invoices;
