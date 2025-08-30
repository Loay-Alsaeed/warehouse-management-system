import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { Package, Users, FileText, Truck, Building2 } from 'lucide-react';

const LoadingSpinner = ({ page = 'dashboard' }) => {
  const { t, i18n } = useTranslation();
  const { darkMode } = useTheme();

  // Icon mapping for different pages
  const getPageIcon = () => {
    switch (page) {
      case 'products':
        return <Package size={40} />;
      case 'suppliers':
        return <Building2 size={40} />;
      case 'customers':
        return <Users size={40} />;
      case 'invoices':
        return <FileText size={40} />;
      case 'shipments':
        return <Truck size={40} />;
      default:
        return <Package size={40} />;
    }
  };

  // Page title mapping
  const getPageTitle = () => {
    switch (page) {
      case 'products':
        return t('products');
      case 'suppliers':
        return t('suppliers');
      case 'customers':
        return t('customers');
      case 'invoices':
        return t('invoices');
      case 'shipments':
        return t('shipments');
      default:
        return t('dashboard');
    }
  };

  return (
    <div className={`h-screen w-full flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-100'} animate-fade-in`}>
      <div className="text-center animate-fade-in-up">
        {/* Animated Logo/Icon */}
        <div className="mb-8">
          <div className={`w-20 h-20 mx-auto rounded-full ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg flex items-center justify-center animate-pulse-slow`}>
            <div className={`${darkMode ? 'text-blue-400' : 'text-blue-600'} animate-bounce-slow`}>
              {getPageIcon()}
            </div>
          </div>
        </div>
        
        {/* Animated Loading Dots */}
        <div className="flex justify-center space-x-2">
          <div 
            className={`w-3 h-3 rounded-full ${darkMode ? 'bg-blue-400' : 'bg-blue-600'} animate-bounce`} 
            style={{ animationDelay: '0ms' }}
          ></div>
          <div 
            className={`w-3 h-3 rounded-full ${darkMode ? 'bg-blue-400' : 'bg-blue-600'} animate-bounce`} 
            style={{ animationDelay: '150ms' }}
          ></div>
          <div 
            className={`w-3 h-3 rounded-full ${darkMode ? 'bg-blue-400' : 'bg-blue-600'} animate-bounce`} 
            style={{ animationDelay: '300ms' }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default LoadingSpinner;
