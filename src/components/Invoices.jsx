import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { useNotifications } from './NotificationSystem';

import { 
  Plus, 
  Search, 
  Edit, 
  Send,
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
  getDoc,
  getDocs,
  query,
  orderBy,
  writeBatch
} from 'firebase/firestore';
import LoadingSpinner from './LoadingSpinner';
import ConfirmationModal from './ConfirmationModal';
import { InvoiceDisplay } from './InvoiceDisplay';
import PaymentModal from './PaymentModal';
import { DollarSign } from 'lucide-react';

const Invoices = ({ onAddInvoice }) => {
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
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [invoiceForPayment, setInvoiceForPayment] = useState(null);
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
      const invoicesData = querySnapshot.docs.map((docSnap) => ({
        ...docSnap.data(),
        id: docSnap.id,
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
      setShowDeleteModal(false);
      return;
    }

    try {
      // Find the invoice to get its products
      const invoiceToDeleteData = invoices.find(invoice => invoice.id === invoiceId);
      
      if (!invoiceToDeleteData) {
        showError(t('error'), t('invoiceNotFound'));
        setShowDeleteModal(false);
        return;
      }

      // Create batch for atomic operations
      const batch = writeBatch(db);

      // Return products quantities to inventory (read from Firestore so missing/stale UI state cannot break the batch)
      if (invoiceToDeleteData.products && invoiceToDeleteData.products.length > 0) {
        for (const invoiceProduct of invoiceToDeleteData.products) {
          if (!invoiceProduct.productId) continue;
          const productRef = doc(db, 'products', invoiceProduct.productId);
          const productSnap = await getDoc(productRef);
          if (productSnap.exists()) {
            const currentQty = productSnap.data().quantity || 0;
            const newQuantity = currentQty + (invoiceProduct.quantity || 0);
            batch.update(productRef, {
              quantity: newQuantity,
              available: newQuantity > 0,
            });
          }
        }
      }

      // Delete the invoice
      const invoiceRef = doc(db, 'invoices', invoiceId);
      batch.delete(invoiceRef);

      // Commit all changes
      await batch.commit();

      // Close modal first
      setShowDeleteModal(false);
      setInvoiceToDelete(null);

      // Refresh data
      await fetchInvoices();
      await fetchProducts(); // Refresh products to show updated quantities
      
      success(t('invoiceDeleted') || 'Success', t('invoiceDeletedMessage') || 'Invoice deleted successfully');
    } catch (error) {
      console.error('Error deleting invoice:', error);
      setShowDeleteModal(false);
      showError(t('error'), t('invoiceDeleteError') || 'Failed to delete invoice');
    }
  };

  const openDeleteModal = (invoice) => {
    setInvoiceToDelete(invoice);
    setShowDeleteModal(true);
  };

  const openDisplayInvoice = async (invoice) => {
    setEditingInvoice(invoice);
    setShowEditModal(true);
  };

  const openPaymentModal = (invoice) => {
    if (!invoice || !invoice.id) {
      showError(t('error'), t('invoiceNotFound') || 'Invoice not found');
      return;
    }
    setInvoiceForPayment(invoice);
    setShowPaymentModal(true);
  };

  const handleUpdatePayment = async (paymentData) => {
    if (!invoiceForPayment || !invoiceForPayment.id) {
      showError(t('error'), t('invoiceNotFound') || 'Invoice not found');
      setShowPaymentModal(false);
      setInvoiceForPayment(null);
      return;
    }

    try {
      const invoiceRef = doc(db, 'invoices', invoiceForPayment.id);
      
      // Check if document exists before updating
      const invoiceDoc = await getDoc(invoiceRef);
      if (!invoiceDoc.exists()) {
        showError(t('error'), t('invoiceNotFound') || 'Invoice not found in database');
        setShowPaymentModal(false);
        setInvoiceForPayment(null);
        // Refresh invoices list
        await fetchInvoices();
        return;
      }

      const currentPaymentAmount = parseFloat(invoiceForPayment.paymentAmount) || 0;
      const newPaymentAmount = parseFloat(paymentData.amount) || 0;
      const finalAmount = parseFloat(invoiceForPayment.finalAmount) || 0;
      
      if (newPaymentAmount < 0 || newPaymentAmount > finalAmount) {
        showError(t('error'), t('invalidPaymentAmount') || 'Invalid payment amount');
        return;
      }
      
      const newRemainingAmount = finalAmount - newPaymentAmount;
      
      await updateDoc(invoiceRef, {
        paymentAmount: newPaymentAmount,
        remainingAmount: newRemainingAmount,
        paymentMethod: paymentData.paymentMethod,
        paymentDate: paymentData.paymentDate,
        status: newPaymentAmount >= finalAmount ? 'paid' : 'partial',
        updatedAt: new Date()
      });

      setShowPaymentModal(false);
      setInvoiceForPayment(null);
      success(t('success'), t('paymentUpdated') || 'Payment updated successfully');
      await fetchInvoices();
    } catch (err) {
      console.error('Error updating payment:', err);
      setShowPaymentModal(false);
      setInvoiceForPayment(null);
      showError(t('error'), t('paymentUpdateError') || `Failed to update payment: ${err.message}`);
    }
  };

  if (loading) {
    return <LoadingSpinner page="invoices" />;
  }

  const handleSendInvoice = async (invoice) => {
    console.log("invoice: ", invoice)
    if (!invoice?.id) {
      showError(t('error'), t('invoiceNotFound') || 'الفاتورة غير موجودة');
      return;
    }
    if (invoice.eInvoiceQr) {
      showError(t('error'), 'تم ترحيل هذه الفاتورة مسبقاً إلى نظام الفوترة');
      return;
    }

    const extractEinvoiceErrorMessage = (apiError) => {
      if (!apiError) return 'فشل الترحيل ❌';
      if (typeof apiError === 'string') return apiError;
      const einvMessage = apiError?.EINV_RESULTS?.ERRORS?.[0]?.EINV_MESSAGE;
      if (einvMessage) return einvMessage;
      return apiError.message || 'فشل الترحيل ❌';
    };


    const newInvoice = {
      ...invoice,
      uuid: invoice.eInvoiceUuid,
      invoiceDate: new Date().toISOString().split("T")[0], // YYYY-MM-DD
      invoiceTypeCode: import.meta.env.VITE_INVOICE_TYPE_CODE,
      Note: "فاتورة مرحلة",
      DocumentCurrencyCode: "JOD",
      companyId: import.meta.env.VITE_COMPANY_ID,
      RegistrationName: import.meta.env.VITE_REGISTERATION_NAME,
      customerNationalNumber: "",
      partyIdentificationID: import.meta.env.VITE_PARTY_IDENTIFICATION_ID,
      TaxAmount: invoice.totalAmount * 0.16,
      finalAmount: invoice.totalAmount + (invoice.totalAmount * 0.16),
      products: (invoice.products || []).map(p => ({
        ...p,
        productTaxAmount: p.total * 0.16,
        finalAmount: p.total + (p.total * 0.16)
      })), 
      services: (invoice.services || []).map(p => ({
        ...p,
        productTaxAmount: p.total * 0.16,
        finalAmount: p.total + (p.total * 0.16),
        productId: p.serviceId,
        productName: p.serviceName,
      }))    

    };


    try {
      const res = await fetch("/api/invoice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newInvoice),
      });

      const text = await res.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        showError(t('error'), 'خطأ في الاتصال');
        return;
      }

      if (res.ok && data.success) {
        const einv = data.data || {};
        const eInvoiceQr = typeof einv.EINV_QR === 'string' ? einv.EINV_QR.trim() : '';
        if (!eInvoiceQr) {
          showError(
            t('error'),
            'تم قبول الفاتورة لكن لم يُرجع الخادم رمز QR (EINV_QR).'
          );
          return;
        }
        try {
          await updateDoc(doc(db, 'invoices', invoice.id), {
            eInvoiceSubmitted: true,
            eInvoiceQr,
            eInvoiceNum: einv.EINV_NUM || null,
            eInvoiceUuid: einv.EINV_INV_UUID || null,
          });
          setInvoices((prev) =>
            prev.map((inv) =>
              inv.id === invoice.id
                ? {
                    ...inv,
                    eInvoiceSubmitted: true,
                    eInvoiceQr,
                    eInvoiceNum: einv.EINV_NUM || inv.eInvoiceNum,
                    eInvoiceUuid: einv.EINV_INV_UUID || inv.eInvoiceUuid,
                  }
                : inv
            )
          );
          success(t('success'), 'تم ترحيل الفاتورة وتحديث الحالة بنجاح ✅');
          return einv;
        } catch (fireErr) {
          console.error(fireErr);
          showError(
            t('error'),
            'تم الرد من الخادم لكن فشل حفظ حالة الترحيل في قاعدة البيانات'
          );
        }
      } else {
        showError(t('error'), extractEinvoiceErrorMessage(data.error));
      }
    } catch (err) {
      console.error(err);
      showError(t('error'), 'خطأ في الاتصال');
    }
  };

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
              onClick={() => {
                if (onAddInvoice) {
                  onAddInvoice();
                } else {
                  setShowAddModal(true);
                }
              }}
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
                  <div className="flex items-center justify-center gap-2">
                    <DollarSign size={16} />
                    المبلغ المدفوع
                  </div>
                </th>
                <th className={`px-6 py-3 text-center text-xs font-medium uppercase tracking-wider ${
                  darkMode ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  <div className="flex items-center justify-center gap-2">
                    <Calculator size={16} />
                    المبلغ المتبقي
                  </div>
                </th>
                <th className={`px-6 py-3 text-center text-xs font-medium uppercase tracking-wider ${
                  darkMode ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  حالة الترحيل (الفوترة)
                </th>
                {/* <th className={`px-6 py-3 text-center text-xs font-medium uppercase tracking-wider ${
                  darkMode ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  ترحيل الفاتورة
                </th> */}
                <th className={`px-6 py-3 text-center text-xs font-medium uppercase tracking-wider ${
                  darkMode ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  عرض الفاتورة
                </th>
                <th className={`px-6 py-3 text-center text-xs font-medium uppercase tracking-wider ${
                  darkMode ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  تعديل الدفع
                </th>
                <th className={`px-6 py-3 text-center text-xs font-medium uppercase tracking-wider ${
                  darkMode ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  حذف الفاتورة
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
                    <div className="text-sm font-medium text-green-600">
                      {formatNumber(invoice.paymentAmount || 0)} JOD
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {(() => {
                      const finalAmount = parseFloat(invoice.finalAmount) || 0;
                      const paidAmount = parseFloat(invoice.paymentAmount) || 0;
                      const remainingAmount = invoice.remainingAmount !== undefined 
                        ? parseFloat(invoice.remainingAmount) 
                        : (finalAmount - paidAmount);
                      return (
                        <div className={`text-sm font-medium ${
                          remainingAmount > 0 ? 'text-orange-600' : 'text-green-600'
                        }`}>
                          {formatNumber(remainingAmount)} JOD
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {invoice.eInvoiceQr ? (
                      <span
                        className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-medium ${
                          darkMode
                            ? 'bg-green-900/50 text-green-300'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        مرحّلة
                      </span>
                    ) : (
                      <span
                        className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-medium ${
                          darkMode
                            ? 'bg-gray-700 text-gray-300'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        لم يُرحّل
                      </span>
                    )}
                  </td>
                  {/* <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center">
                    <button
                      onClick={() => handleSendInvoice(invoice)}
                      disabled={!!invoice.eInvoiceQr}
                      title={
                        invoice.eInvoiceQr
                          ? 'تم الترحيل مسبقاً'
                          : undefined
                      }
                      className={`px-3 py-1 rounded text-xs flex items-center gap-1 mx-auto ${
                        invoice.eInvoiceQr
                          ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      <Send size={14} />
                      ترحيل الفاتورة
                    </button>
                  </td> */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center">
                    <button
                      onClick={() => openDisplayInvoice(invoice)}
                      className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-xs flex items-center gap-1 mx-auto"
                    >
                      <Edit size={14} />
                      {t('viewInvoice')}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center">
                    <button
                      onClick={() => openPaymentModal(invoice)}
                      className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 text-xs flex items-center gap-1 mx-auto"
                    >
                      <DollarSign size={14} />
                      تعديل الدفع
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center">
                    <button
                      onClick={() => openDeleteModal(invoice)}
                      className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-xs flex items-center gap-1 mx-auto"
                    >
                      <Trash2 size={14} />
                      {t('deleteInvoice')}
                    </button>
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


        {/* View Invoice Modal */}
        {showEditModal && editingInvoice && (
          <div className="fixed inset-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
            <div className="w-full h-full relative">

              <InvoiceDisplay
                invoice={editingInvoice}
                onClose={() => setShowEditModal(false)}
                onPrint={() => {
                  window.print();
                }}
                onDownloadPDF={() => {
                  // TODO: Implement PDF download functionality
                  // console.log('PDF download not implemented yet');
                }}
                handleSendInvoice={handleSendInvoice}
              />
            </div>
          </div>
        )}

        {/* Payment Modal */}
        {showPaymentModal && invoiceForPayment && (
          <PaymentModal
            isOpen={showPaymentModal}
            onClose={() => {
              setShowPaymentModal(false);
              setInvoiceForPayment(null);
            }}
            invoiceAmount={invoiceForPayment.finalAmount}
            currentPaymentAmount={invoiceForPayment.paymentAmount || 0}
            currentPaymentMethod={invoiceForPayment.paymentMethod}
            currentPaymentDate={invoiceForPayment.paymentDate}
            onPaymentComplete={handleUpdatePayment}
          />
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && invoiceToDelete && (
          <ConfirmationModal
            isOpen={showDeleteModal}
            onClose={() => {
              setShowDeleteModal(false);
              setInvoiceToDelete(null);
            }}
            onConfirm={async () => {
              if (invoiceToDelete && invoiceToDelete.id) {
                await handleDeleteInvoice(invoiceToDelete.id);
              } else {
                showError(t('error'), t('invoiceNotFound') || 'Invoice not found');
                setShowDeleteModal(false);
                setInvoiceToDelete(null);
              }
            }}
            title={t('deleteConfirmation')}
            message={t('confirmDeleteInvoice')}
            confirmText="delete"
            cancelText="cancel"
            type="danger"
          />
        )}

        {/* ProductSelectionModal removed - selection is inline now */}
      </div>
    </div>
  );
};

export default Invoices;
