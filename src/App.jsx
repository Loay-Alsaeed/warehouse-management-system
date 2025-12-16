import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import NotificationProvider from './components/NotificationSystem';
import PrivateRoute from './components/PrivateRoute';
import Layout from './components/Layout';
import './i18n';
import { AddInvoice } from './components/AddInvoice';

function App() {
  return (
    <Router>
      <ThemeProvider>
        <NotificationProvider>
          <AuthProvider>
            <div className="App min-h-screen" style={{minHeight: '100vh'}}>
              <Routes>
                <Route path="/login" element={<Navigate to="/" replace />} />
                <Route 
                  path="/" 
                  element={
                    <PrivateRoute>
                      <Layout />
                    </PrivateRoute>
                  } 
                />
              <Route path='/addinvoice' element={<AddInvoice/>}/>
              </Routes>
            </div>
          </AuthProvider>
        </NotificationProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;