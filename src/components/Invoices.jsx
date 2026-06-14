import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { useNotifications } from './NotificationSystem';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { Plus, Search, Edit, Trash2, DollarSign, Eye } from 'lucide-react';
import { db } from '../firebase';
import {
  collection,
  updateDoc,
  doc,
  getDoc,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import LoadingSpinner from './LoadingSpinner';
import ConfirmationModal from './ConfirmationModal';
import { InvoiceDisplay } from './InvoiceDisplay';
import PaymentModal from './PaymentModal';
import ReactDataTable from './ReactDataTable';
import RowActionsMenu from './ReactDataTable/RowActionsMenu';

const Invoices = ({ onAddInvoice, onEditInvoice }) => {
  const [invoices, setInvoices] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [invoiceForPayment, setInvoiceForPayment] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);
  const { t, i18n } = useTranslation();
  const { darkMode } = useTheme();
  const { success, error: showError } = useNotifications();

  const muiTheme = useMemo(
    () =>
      createTheme({
        direction: i18n.language === 'ar' ? 'rtl' : 'ltr',
      }),
    [i18n.language]
  );

  useEffect(() => {
    fetchInvoices();
  }, []);

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

  const filteredInvoices = useMemo(() => {
    if (!searchTerm.trim()) return invoices;

    const q = searchTerm.toLowerCase();
    return invoices.filter(
      (invoice) =>
        (invoice.invoiceNumber || '').toLowerCase().includes(q) ||
        (invoice.customerName || '').toLowerCase().includes(q) ||
        (invoice.carNumber || '').toLowerCase().includes(q)
    );
  }, [invoices, searchTerm]);

  const formatNumber = (number) => {
    const rounded = Math.round(parseFloat(number || 0) * 100) / 100;
    return rounded % 1 === 0 ? rounded.toString() : rounded.toFixed(2);
  };

  const getRemainingAmount = (invoice) => {
    const finalAmount = parseFloat(invoice.finalAmount) || 0;
    const paidAmount = parseFloat(invoice.paymentAmount) || 0;
    return invoice.remainingAmount !== undefined
      ? parseFloat(invoice.remainingAmount)
      : finalAmount - paidAmount;
  };

  const handleDeleteInvoice = async (invoiceId) => {
    if (!invoiceId) {
      showError(t('error'), t('invoiceNotFound'));
      setShowDeleteModal(false);
      return;
    }

    try {
      const invoiceToDeleteData = invoices.find((invoice) => invoice.id === invoiceId);

      if (!invoiceToDeleteData) {
        showError(t('error'), t('invoiceNotFound'));
        setShowDeleteModal(false);
        return;
      }

      const batch = writeBatch(db);

      if (invoiceToDeleteData.products?.length > 0) {
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

      batch.delete(doc(db, 'invoices', invoiceId));
      await batch.commit();

      setShowDeleteModal(false);
      setInvoiceToDelete(null);
      await fetchInvoices();
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

  const openDisplayInvoice = (invoice) => {
    setEditingInvoice(invoice);
    setShowEditModal(true);
  };

  const handleEditInvoice = (invoice) => {
    if (invoice.eInvoiceQr) {
      showError(t('error'), 'لا يمكن تعديل فاتورة مرحّلة إلى نظام الفوترة');
      return;
    }
    onEditInvoice?.(invoice);
  };

  const openPaymentModal = (invoice) => {
    if (!invoice?.id) {
      showError(t('error'), t('invoiceNotFound') || 'Invoice not found');
      return;
    }
    setInvoiceForPayment(invoice);
    setShowPaymentModal(true);
  };

  const handleUpdatePayment = async (paymentData) => {
    if (!invoiceForPayment?.id) {
      showError(t('error'), t('invoiceNotFound') || 'Invoice not found');
      setShowPaymentModal(false);
      setInvoiceForPayment(null);
      return;
    }

    try {
      const invoiceRef = doc(db, 'invoices', invoiceForPayment.id);
      const invoiceDoc = await getDoc(invoiceRef);

      if (!invoiceDoc.exists()) {
        showError(t('error'), t('invoiceNotFound') || 'Invoice not found in database');
        setShowPaymentModal(false);
        setInvoiceForPayment(null);
        await fetchInvoices();
        return;
      }

      const newPaymentAmount = parseFloat(paymentData.amount) || 0;
      const finalAmount = parseFloat(invoiceForPayment.finalAmount) || 0;

      if (newPaymentAmount < 0 || newPaymentAmount > finalAmount) {
        showError(t('error'), t('invalidPaymentAmount') || 'Invalid payment amount');
        return;
      }

      await updateDoc(invoiceRef, {
        paymentAmount: newPaymentAmount,
        remainingAmount: finalAmount - newPaymentAmount,
        paymentMethod: paymentData.paymentMethod,
        paymentDate: paymentData.paymentDate,
        status: newPaymentAmount >= finalAmount ? 'paid' : 'partial',
        updatedAt: new Date(),
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

  const handleSendInvoice = async (invoice) => {
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
      invoiceDate: new Date().toISOString().split('T')[0],
      invoiceTypeCode: import.meta.env.VITE_INVOICE_TYPE_CODE,
      Note: 'فاتورة مرحلة',
      DocumentCurrencyCode: 'JOD',
      companyId: import.meta.env.VITE_COMPANY_ID,
      RegistrationName: import.meta.env.VITE_REGISTERATION_NAME,
      customerNationalNumber: '',
      partyIdentificationID: import.meta.env.VITE_PARTY_IDENTIFICATION_ID,
      TaxAmount: invoice.totalAmount * 0.16,
      finalAmount: invoice.totalAmount + invoice.totalAmount * 0.16,
      products: (invoice.products || []).map((p) => ({
        ...p,
        productTaxAmount: p.total * 0.16,
        finalAmount: p.total + p.total * 0.16,
      })),
      services: (invoice.services || []).map((p) => ({
        ...p,
        productTaxAmount: p.total * 0.16,
        finalAmount: p.total + p.total * 0.16,
        productId: p.serviceId,
        productName: p.serviceName,
      })),
    };

    try {
      const res = await fetch('/api/invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
          showError(t('error'), 'تم قبول الفاتورة لكن لم يُرجع الخادم رمز QR (EINV_QR).');
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
          showError(t('error'), 'تم الرد من الخادم لكن فشل حفظ حالة الترحيل في قاعدة البيانات');
        }
      } else {
        if (res.status === 404) {
          showError(
            t('error'),
            'مسار API غير متاح. إذا كنت تعمل محلياً ضع VITE_API_BASE_URL أو شغّل المشروع عبر vercel dev.'
          );
          return;
        }
        showError(t('error'), extractEinvoiceErrorMessage(data.error));
      }
    } catch (err) {
      console.error(err);
      showError(t('error'), 'خطأ في الاتصال');
    }
  };

  const getRowActions = (row) => [
      {
        label: t('viewInvoice') || 'عرض الفاتورة',
        icon: <Eye size={18} color='green'/>,
        onClick: () => openDisplayInvoice(row),
      },
      {
        label: t('editInvoice'),
        icon: <Edit size={18} color='blue'/>,
        onClick: () => handleEditInvoice(row),
        disabled: !!row.eInvoiceQr,
      },
      {
        label: t('updatePayment') || 'تحديث الدفع',
        icon: <DollarSign size={18} color='green' />,
        onClick: () => openPaymentModal(row),
      },
      {
        label: t('delete'),
        icon: <Trash2 size={18} color='red'/>,
        onClick: () => openDeleteModal(row),
      },
  ];

  const columns = useMemo(
    () => [
      {
        name: '',
        minWidth: '80px',
        center: true,
        cell: (row) => <RowActionsMenu actions={getRowActions(row)} />,
      },
      {
        name: t('invoiceNumber'),
        selector: (row) => row.invoiceNumber || '',
        sortable: true,
        minWidth: '140px',
        center: true,
      },
      {
        name: t('customerName'),
        selector: (row) => row.customerName || '',
        sortable: true,
        minWidth: '160px',
        center: true,
      },
      {
        name: t('carNumber'),
        selector: (row) => row.carNumber || '',
        minWidth: '120px',
        center: true,
      },
      {
        name: t('invoiceDate'),
        selector: (row) => row.invoiceDate || '',
        sortable: true,
        minWidth: '120px',
        center: true,
        type: 'date',
      },
      {
        name: t('finalAmount'),
        selector: (row) => parseFloat(row.finalAmount) || 0,
        sortable: true,
        minWidth: '130px',
        center: true,
        cell: (row) => (
          <span className="font-medium">{formatNumber(row.finalAmount)} JOD</span>
        ),
      },
      {
        name: t('paidAmount') || 'المبلغ المدفوع',
        selector: (row) => parseFloat(row.paymentAmount) || 0,
        sortable: true,
        minWidth: '130px',
        center: true,
        cell: (row) => (
          <span className="font-medium text-green-600">
            {formatNumber(row.paymentAmount || 0)} JOD
          </span>
        ),
      },
      {
        name: t('remainingAmount') || 'المبلغ المتبقي',
        selector: (row) => getRemainingAmount(row),
        sortable: true,
        minWidth: '130px',
        center: true,
        cell: (row) => {
          const remaining = getRemainingAmount(row);
          return (
            <span
              className={`font-medium ${remaining > 0 ? 'text-orange-600' : 'text-green-600'}`}
            >
              {formatNumber(remaining)} JOD
            </span>
          );
        },
      },
      {
        name: t('eInvoiceStatus') || 'حالة الترحيل',
        selector: (row) => (row.eInvoiceQr ? 1 : 0),
        sortable: true,
        minWidth: '130px',
        center: true,
        cell: (row) =>
          row.eInvoiceQr ? (
            <span
              className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-medium ${
                darkMode ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-800'
              }`}
            >
              {t('eInvoiceSubmitted') || 'مرحّلة'}
            </span>
          ) : (
            <span
              className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-medium ${
                darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {t('eInvoiceNotSubmitted') || 'لم يُرحّل'}
            </span>
          ),
      },
    ],
    [t, darkMode, getRowActions]
  );

  if (loading) {
    return <LoadingSpinner page="invoices" />;
  }

  return (
    <div className={`h-[100%] w-full ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-4">{t('invoices')}</h1>

          <div className="flex justify-between align-center md:grid-cols-2 gap-4 mb-6">
            <div className="relative w-[40%]">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={20}
              />
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
              onClick={() => onAddInvoice?.()}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2 w-[20%]"
            >
              <Plus size={20} />
              {t('addInvoice')}
            </button>
          </div>
        </div>

          <ReactDataTable
            SelectedRow={selectedRow}
            onRowClicked={setSelectedRow}
            columns={columns}
            data={filteredInvoices}
            pagination
            paginationRowsPerPageOptions={[10, 25, 50, 100]}
            
            />

        {showEditModal && editingInvoice && (
          <div className="fixed inset-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center z-505 overflow-y-auto">
            <div className="w-full h-full relative">
              <InvoiceDisplay
                invoice={editingInvoice}
                onClose={() => setShowEditModal(false)}
                handleSendInvoice={handleSendInvoice}
              />
            </div>
          </div>
        )}

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

        {showDeleteModal && invoiceToDelete && (
          <ConfirmationModal
            isOpen={showDeleteModal}
            onClose={() => {
              setShowDeleteModal(false);
              setInvoiceToDelete(null);
            }}
            onConfirm={async () => {
              if (invoiceToDelete?.id) {
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
      </div>
    </div>
  );
};

export default Invoices;
