import React, { useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import Dashboard from './Dashboard';
import Products from './Products';
import Services from './Services';
import Suppliers from './Suppliers';
import Customers from './Customers';
import Invoices from './Invoices';
import OpenInvoices from './OpenInvoices';
import AddInvoice from './AddInvoice';
import DailyInventory from './DailyInventory';
import Shipments from './Shipments';
import { useTranslation } from 'react-i18next';

const Layout = () => {
  const [activePage, setActivePage] = useState('dashboard');
  // Holds context for AddInvoice page: { invoice, source: 'invoices' | 'openInvoices' }
  const [addInvoiceContext, setAddInvoiceContext] = useState(null);
  const { i18n } = useTranslation();

  const renderPage = () => {
    // If AddInvoice page is active, show it
    if (addInvoiceContext !== null) {
      const { invoice, source } = addInvoiceContext;
      return (
        <AddInvoice
          invoiceToEdit={invoice}
          onBack={() => {
            // Close AddInvoice and return to the page we came from
            const targetPage = source === 'invoices' ? 'invoices' : 'openInvoices';
            setAddInvoiceContext(null);
            setActivePage(targetPage);
          }}
          onInvoiceAdded={() => {
            // After saving, also return to the source page
            const targetPage = source === 'invoices' ? 'invoices' : 'openInvoices';
            setAddInvoiceContext(null);
            setActivePage(targetPage);
          }}
        />
      );
    }

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
        return (
          <Invoices
            onAddInvoice={() =>
              setAddInvoiceContext({
                invoice: null,
                source: 'invoices',
              })
            }
          />
        );
      case 'openInvoices':
        return (
          <OpenInvoices
            onAddInvoice={() =>
              setAddInvoiceContext({
                invoice: null,
                source: 'openInvoices',
              })
            }
            onEditInvoice={(invoice) =>
              setAddInvoiceContext({
                invoice,
                source: 'openInvoices',
              })
            }
          />
        );
      case 'dailyInventory':
        return <DailyInventory />;
      case 'shipments':
        return <Shipments />;
      default:
        return <Dashboard />;
    }
  };

  const handlePageChange = (pageId) => {
    // If user changes page from sidebar, close AddInvoice if open
    if (addInvoiceContext !== null) {
      setAddInvoiceContext(null);
    }
    setActivePage(pageId);
  };

  return (
    <div className="flex min-h-screen" style={{ minHeight: '100vh', overflow: 'auto' }} dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
      <Sidebar activePage={activePage} onPageChange={handlePageChange} />
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
