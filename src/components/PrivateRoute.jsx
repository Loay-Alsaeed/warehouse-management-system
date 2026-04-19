import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import Login from './Login';

const PrivateRoute = ({ children }) => {
  const auth = useAuth();
  
  // Check if auth context is available
  if (!auth) {
    return <Login />;
  }
  
  const { currentUser } = auth;

  return currentUser ? children : <Login />;
};

export default PrivateRoute;
