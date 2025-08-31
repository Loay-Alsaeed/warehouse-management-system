import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { Package, Home, Building2, User, FileText, Truck } from 'lucide-react';

const Sidebar = ({ activePage, onPageChange }) => {
  const { t, i18n } = useTranslation();
  const { darkMode } = useTheme();

  const menuItems = [
    { id: 'dashboard', label: t('dashboard'), icon: Home },
    { id: 'products', label: t('products'), icon: Package },
    { id: 'suppliers', label: t('suppliers'), icon: Building2 },
    { id: 'customers', label: t('customers'), icon: User },
    { id: 'invoices', label: t('invoices'), icon: FileText },
    { id: 'shipments', label: t('shipments'), icon: Truck }
  ];

  return (
    <div className={`w-64 h-[100%] ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg flex flex-col`}>
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <button
                  onClick={() => onPageChange(item.id)}
                  className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors bg-transparent ${
                    activePage === item.id
                      ? `${darkMode ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-700'}`
                      : `${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`
                  }`}
                >
                  <Icon className="w-5 h-5 mr-3 m-2" />
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar;
