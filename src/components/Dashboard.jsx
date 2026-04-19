import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { Package, TrendingUp, AlertTriangle, MapPin } from 'lucide-react';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import LoadingSpinner from './LoadingSpinner';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalProducts: 0,
    availableProducts: 0,
    unavailableProducts: 0,
    totalValue: 0,
    totalCategories: 0
  });
  const [loading, setLoading] = useState(true);
  const { t, i18n } = useTranslation();
  const { darkMode } = useTheme();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'products'));
      const products = querySnapshot.docs.map(doc => doc.data());
      
      const totalProducts = products.length;
      const availableProducts = products.filter(p => (parseInt(p.quantity) || 0) > 0).length;
      const unavailableProducts = totalProducts - availableProducts;
      const totalValue = products.reduce((sum, p) => sum + ((parseFloat(p.price) || 0) * (parseInt(p.quantity) || 0)), 0);
      const uniqueCategories = [...new Set(products.map(p => p.category).filter(Boolean))];
      const totalCategories = uniqueCategories.length;

      setStats({
        totalProducts,
        availableProducts,
        unavailableProducts,
        totalValue,
        totalCategories
      });
      setLoading(false);
    } catch (error) {
      console.error('Error fetching stats:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner page="dashboard" />;
  }

  return (
    <div className={`h-[100%] w-full ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{t('dashboard')}</h1>
        <p className={`text-lg ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          {i18n.language === 'ar' ? 'مرحباً بك في نظام إدارة المخازن' : 'Welcome to the Warehouse Management System'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className={`p-6 rounded-lg shadow-lg ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border`}>
          <div className="flex items-center space-x-2">
            <div className="p-3 rounded-full bg-blue-100 text-blue-600">
              <Package size={24} />
            </div>
            <div className="ml-4">
              <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {t('products')}
              </p>
              <p className="text-2xl font-bold">{stats.totalProducts}</p>
            </div>
          </div>
        </div>

        <div className={`p-6 rounded-lg shadow-lg ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border`}>
          <div className="flex items-center space-x-2">
            <div className="p-3 rounded-full bg-green-100 text-green-600">
              <TrendingUp size={24} />
            </div>
            <div className="ml-4">
              <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {t('available')}
              </p>
              <p className="text-2xl font-bold text-green-600">{stats.availableProducts}</p>
            </div>
          </div>
        </div>

        <div className={`p-6 rounded-lg shadow-lg ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border`}>
          <div className="flex items-center space-x-2">
            <div className="p-3 rounded-full bg-red-100 text-red-600">
              <AlertTriangle size={24} />
            </div>
            <div className="ml-4">
              <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {t('unavailable')}
              </p>
              <p className="text-2xl font-bold text-red-600">{stats.unavailableProducts}</p>
            </div>
          </div>
        </div>

        <div className={`p-6 rounded-lg shadow-lg ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border`}>
          <div className="flex items-center space-x-2">
            <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
              <MapPin size={24} />
            </div>
            <div className="ml-4">
              <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {i18n.language === 'ar' ? 'القيمة الإجمالية' : 'Total Value'}
              </p>
              <p className="text-2xl font-bold text-yellow-600">{stats.totalValue} JOD</p>
            </div>
          </div>
        </div>

      </div>


      </div>
    </div>
  );
};

export default Dashboard;
