import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { useNotifications } from './NotificationSystem';
import { 
  Calendar,
  DollarSign,
  CreditCard,
  FileText,
  TrendingUp,
  Users,
  Package
} from 'lucide-react';
import { db } from '../firebase';
import { 
  collection, 
  getDocs,
  query,
  where,
  orderBy
} from 'firebase/firestore';
import LoadingSpinner from './LoadingSpinner';

const DailyInventory = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [dailyData, setDailyData] = useState({
    invoices: [],
    totalCash: 0,
    totalVisa: 0,
    totalAmount: 0,
    totalInvoices: 0,
    topProducts: [],
    topServices: []
  });
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();
  const { darkMode } = useTheme();
  const { error: showError } = useNotifications();

  useEffect(() => {
    fetchDailyData();
  }, [selectedDate]);

  const fetchDailyData = async () => {
    setLoading(true);
    try {
      // Get invoices for the selected date
      const invoicesQuery = query(
        collection(db, 'invoices'),
        where('invoiceDate', '==', selectedDate)
      );
      
      const querySnapshot = await getDocs(invoicesQuery);
      const invoices = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a, b) => {
        // Sort by createdAt in descending order (newest first)
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB - dateA;
      });

      // Calculate totals
      let totalCash = 0;
      let totalVisa = 0;
      let totalAmount = 0;
      const productCount = {};
      const serviceCount = {};

      invoices.forEach(invoice => {
        const amount = parseFloat(invoice.finalAmount) || 0;
        totalAmount += amount;

        if (invoice.paymentMethod === 'cash') {
          totalCash += amount;
        } else if (invoice.paymentMethod === 'visa') {
          totalVisa += amount;
        }

        // Count products
        if (invoice.products) {
          invoice.products.forEach(product => {
            const key = product.productName;
            if (productCount[key]) {
              productCount[key].quantity += product.quantity;
              productCount[key].total += product.total;
            } else {
              productCount[key] = {
                name: product.productName,
                quantity: product.quantity,
                total: product.total
              };
            }
          });
        }

        // Count services
        if (invoice.services) {
          invoice.services.forEach(service => {
            const key = service.serviceName;
            if (serviceCount[key]) {
              serviceCount[key].count += 1;
              serviceCount[key].total += service.price;
            } else {
              serviceCount[key] = {
                name: service.serviceName,
                count: 1,
                total: service.price
              };
            }
          });
        }
      });

      // Get top products and services
      const topProducts = Object.values(productCount)
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

      const topServices = Object.values(serviceCount)
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

      setDailyData({
        invoices,
        totalCash: Math.round(totalCash * 100) / 100,
        totalVisa: Math.round(totalVisa * 100) / 100,
        totalAmount: Math.round(totalAmount * 100) / 100,
        totalInvoices: invoices.length,
        topProducts,
        topServices
      });

    } catch (error) {
      console.error('Error fetching daily data:', error);
      showError(t('error'), t('errorFetchingData'));
      // Set empty data on error
      setDailyData({
        invoices: [],
        totalCash: 0,
        totalVisa: 0,
        totalAmount: 0,
        totalInvoices: 0,
        topProducts: [],
        topServices: []
      });
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (number) => {
    const rounded = Math.round(parseFloat(number) * 100) / 100;
    return rounded % 1 === 0 ? rounded.toString() : rounded.toFixed(2);
  };

  if (loading) {
    return <LoadingSpinner page="dailyInventory" />;
  }

  return (
    <div className={`h-[100%] w-full ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-4 flex items-center gap-2">
            <TrendingUp size={32} />
            {t('dailyInventory')}
          </h1>
          
          {/* Date Selector */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Calendar size={20} />
              <label className="font-medium">{t('selectDate')}:</label>
            </div>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className={`px-4 py-2 border rounded-lg ${
                darkMode 
                  ? 'bg-gray-800 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Sales */}
          <div className={`p-6 rounded-lg shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{t('totalSales')}</p>
                <p className="text-2xl font-bold text-indigo-600">
                  {formatNumber(dailyData.totalAmount)} JOD
                </p>
              </div>
              <div className="p-3 bg-indigo-100 rounded-full">
                <DollarSign size={24} className="text-indigo-600" />
              </div>
            </div>
          </div>
          {/* Total Invoices */}
          <div className={`p-6 rounded-lg shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{t('totalInvoices')}</p>
                <p className="text-2xl font-bold text-purple-600">
                  {dailyData.totalInvoices}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <FileText size={24} className="text-purple-600" />
              </div>
            </div>
          </div>

          {/* Cash Sales */}
          <div className={`p-6 rounded-lg shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{t('cashSales')}</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatNumber(dailyData.totalCash)} JOD
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <DollarSign size={24} className="text-green-600" />
              </div>
            </div>
          </div>

          {/* Visa Sales */}
          <div className={`p-6 rounded-lg shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{t('visaSales')}</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatNumber(dailyData.totalVisa)} JOD
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <CreditCard size={24} className="text-blue-600" />
              </div>
            </div>
          </div>
        </div>
        {/* Invoices Table */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <FileText size={20} />
              {t('dailyInvoices')}</h3>
          </div>
        <div className={`rounded-lg shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          
          {dailyData.invoices.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <tr>
                    <th className={`px-6 py-3 text-center text-xs font-medium uppercase tracking-wider ${
                      darkMode ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      {t('invoiceNumber')}
                    </th>
                    <th className={`px-6 py-3 text-center text-xs font-medium uppercase tracking-wider ${
                      darkMode ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      {t('customerName')}
                    </th>
                    <th className={`px-6 py-3 text-center text-xs font-medium uppercase tracking-wider ${
                      darkMode ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      {t('paymentMethod')}
                    </th>
                    <th className={`px-6 py-3 text-center text-xs font-medium uppercase tracking-wider ${
                      darkMode ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      {t('finalAmount')}
                    </th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                  {dailyData.invoices.map((invoice) => (
                    <tr key={invoice.id} className={`${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                        {invoice.invoiceNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                        {invoice.customerName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          invoice.paymentMethod === 'cash' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {invoice.paymentMethod === 'cash' ? t('cash') : t('visa')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-bold text-indigo-600">
                        {formatNumber(invoice.finalAmount)} JOD
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-4 text-center py-12">
              <FileText size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-xl text-gray-500">{t('noInvoicesForDate')}</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1  gap-8 mb-8">
          {/* Top Products */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Package size={20} />
              {t('topProducts')}
            </h3>
          </div>
          <div className={`p-4 rounded-lg shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            {dailyData.topProducts.length > 0 ? (
              <div className="space-y-3">
                {dailyData.topProducts.map((product, index) => (
                  <div key={index} className="flex justify-between items-center p-3  dark:bg-gray-700 rounded">
                    <div className='flex gap-4'>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-gray-500">{t('quantity')}: {product.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-indigo-600">{formatNumber(product.total)} JOD</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">{t('noProductsSold')}</p>
            )}
          </div>

          {/* Top Services */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Users size={20} />
              {t('topServices')}
            </h3>
          </div>
          <div className={` rounded-lg shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            {dailyData.topServices.length > 0 ? (
              <div className="space-y-3 px-4" >
                {dailyData.topServices.map((service, index) => (
                  <div key={index} className="flex justify-between items-center p-3  dark:bg-gray-700 rounded">
                    <div className='flex gap-4'>
                      <p className="font-medium">{service.name}</p>
                      <p className="text-sm text-gray-500">{t('count')}: {service.count}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-blue-600">{formatNumber(service.total)} JOD</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="p-4 text-gray-500 text-center py-8">{t('noServicesSold')}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyInventory;
