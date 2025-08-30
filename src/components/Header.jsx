import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from './NotificationSystem';
import { Sun, Moon, Globe, LogOut } from 'lucide-react';

const Header = () => {
  const { t, i18n } = useTranslation();
  const { darkMode, toggleTheme } = useTheme();
  const { logout } = useAuth();
  const { success } = useNotifications();

  const handleLogout = async () => {
    try {
      await logout();
      success(t('logoutSuccess'), t('logoutMessage'));
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'ar' ? 'en' : 'ar');
  };

  return (
    <header className={`h-16 px-6 py-6 flex items-center justify-between shadow-sm ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b`}>
      <div className="flex items-center">
        <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          {i18n.language === 'ar' ? 'نظام إدارة المخازن' : 'Warehouse Management System'}
        </h1>
      </div>

      <div className="flex items-center space-x-4">
        <button
          onClick={toggleTheme}
          className={`p-2 rounded-lg transition-colors ${
            darkMode ? 'bg-gray-700 text-yellow-400 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
          title={darkMode ? t('lightMode') : t('darkMode')}
        >
          {darkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>

                 <button
           onClick={toggleLanguage}
           className={`px-3 py-2 rounded-lg transition-colors ${
             darkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
           }`}
           title={i18n.language === 'ar' ? 'English' : 'العربية'}
         >
           <Globe size={20} />
         </button>

        <button
          onClick={handleLogout}
          className={`px-3 py-2 rounded-lg transition-colors text-red-600 hover:bg-red-50 ${
            darkMode ? 'bg-gray-700 hover:bg-red-900' : 'bg-gray-200 hover:bg-red-50'
          }`}
          title={t('logout')}
        >
          <LogOut size={20} />
        </button>
      </div>
    </header>
  );
};

export default Header;
