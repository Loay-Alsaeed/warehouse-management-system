import React, { useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import Dashboard from './Dashboard';
import Products from './Products';
import Suppliers from './Suppliers';
import Customers from './Customers';
import Invoices from './Invoices';
import Shipments from './Shipments';
import { useTranslation } from 'react-i18next';

const Layout = () => {
  const [activePage, setActivePage] = useState('dashboard');
  const { i18n } = useTranslation();

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard />;
      case 'products':
        return <Products />;
      case 'suppliers':
        return <Suppliers />;
      case 'customers':
        return <Customers />;
      case 'invoices':
        return <Invoices />;
      case 'shipments':
        return <Shipments />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
      <Sidebar activePage={activePage} onPageChange={setActivePage} />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1">
          {renderPage()}
        </main>
      </div>
    </div>
  );
};

export default Layout;
