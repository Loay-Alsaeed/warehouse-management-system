import React, { useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import Dashboard from './Dashboard';
import Products from './Products';
import Services from './Services';
import Suppliers from './Suppliers';
import Customers from './Customers';
import Invoices from './Invoices';
import DailyInventory from './DailyInventory';
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
      case 'services':
        return <Services />;
      case 'suppliers':
        return <Suppliers />;
      case 'customers':
        return <Customers />;
      case 'invoices':
        return <Invoices />;
      case 'dailyInventory':
        return <DailyInventory />;
      case 'shipments':
        return <Shipments />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className=" flex min-h-screen" style={{minHeight: '100vh', overflow: 'auto'}} dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
      <Sidebar activePage={activePage} onPageChange={setActivePage} />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 overflow-auto">
          {renderPage()}
        </main>
      </div>
    </div>
  );
};

export default Layout;
