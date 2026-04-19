import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import NotificationProvider from './components/NotificationSystem';
import PrivateRoute from './components/PrivateRoute';
import Layout from './components/Layout';
import InvoicePdfPage from "./pages/InvoicePdfPage"
import InvoicePdfWrapper from "./pages/InvoicePdfWrapper"
import './i18n';

function App() {
  return (
    <Router>
      <ThemeProvider>
        <NotificationProvider>
          <AuthProvider>
            <div className="App min-h-screen" style={{minHeight: '100vh'}}>
              <Routes>
                <Route path="/login" element={<Navigate to="/" replace />} />
                <Route path="/invoice-pdf" element={<InvoicePdfWrapper />} />

                <Route 
                  path="/" 
                  element={
                    <PrivateRoute>
                      <Layout />
                    </PrivateRoute>
                  } 
                />
              </Routes>
            </div>
          </AuthProvider>
        </NotificationProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;