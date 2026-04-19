import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { Icon } from "@iconify/react";

export default function PaymentModal({
  isOpen,
  onClose,
  invoiceAmount,
  currentPaymentAmount = 0,
  currentPaymentMethod = 'cash',
  currentPaymentDate = null,
  onPaymentComplete
}) {
  const { t } = useTranslation();
  const { darkMode } = useTheme();
  
  const [paymentData, setPaymentData] = useState({
    amount: currentPaymentAmount || invoiceAmount,
    paymentMethod: currentPaymentMethod || 'cash',
    paymentDate: currentPaymentDate || new Date().toISOString().split('T')[0]
  });

  // Update state when props change
  useEffect(() => {
    if (isOpen) {
      setPaymentData({
        amount: currentPaymentAmount || invoiceAmount,
        paymentMethod: currentPaymentMethod || 'cash',
        paymentDate: currentPaymentDate || new Date().toISOString().split('T')[0]
      });
    }
  }, [isOpen, currentPaymentAmount, currentPaymentMethod, currentPaymentDate, invoiceAmount]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (paymentData.amount <= 0 || paymentData.amount > invoiceAmount) {
      return;
    }
    onPaymentComplete(paymentData);
  };

  const handleAmountChange = (e) => {
    const value = parseFloat(e.target.value) || 0;
    setPaymentData(prev => ({
      ...prev,
      amount: value
    }));
  };

  if (!isOpen) return null;

  const remainingAmount = invoiceAmount - paymentData.amount;

  return (
    <div className="fixed inset-0 w-full h-full bg-[#00000085] bg-opacity-50 flex items-center justify-center z-50">
      <div className={`p-6 rounded-lg w-full max-w-md ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">معلومات الدفع </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <Icon icon="solar:close-circle-bold" className="size-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="invoiceAmount">المبلغ الاجمالي</label>
              <div className={`px-3 py-2 border rounded-lg ${
                darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300'
              }`}>
                {invoiceAmount.toFixed(2)} JOD
              </div>
            </div>


            <div>
              <label htmlFor="paymentAmount">المبلغ المدفوع</label>
              <input
                type="number"
                step="1"
                max={invoiceAmount}
                value={paymentData.amount}
                onChange={handleAmountChange}
                className={`w-full px-3 py-2 border rounded-lg ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                }`}
                required
              />

            </div>

            <div>
              <label htmlFor="remainingAmount">المبلغ المتبقي</label>
              <div className={`px-3 py-2 border rounded-lg ${
                darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300'
              } ${remainingAmount > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                {remainingAmount.toFixed(2)} JOD
              </div>
            </div>

           

            <div>
              <label htmlFor="paymentDate">تاريخ الدفع</label>
              <input
                type="date"
                value={paymentData.paymentDate}
                onChange={(e) => setPaymentData(prev => ({ ...prev, paymentDate: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg text-right ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                }`}
                required
              />
            </div>
          </div>

          <div className="flex gap-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-100"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={paymentData.amount <= 0 || paymentData.amount > invoiceAmount}
              className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              حفظ الفاتورة
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
