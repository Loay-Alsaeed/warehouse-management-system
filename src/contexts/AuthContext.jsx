import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { auth } from '../firebase';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  setPersistence,
  browserSessionPersistence,
  browserLocalPersistence
} from 'firebase/auth';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const login = async (email, password, rememberMe = false) => {
    // Set persistence based on rememberMe option
    const persistence = rememberMe ? browserLocalPersistence : browserSessionPersistence;
    await setPersistence(auth, persistence);
    
    return signInWithEmailAndPassword(auth, email, password);
  };

  const logout = useCallback(() => {
    return signOut(auth);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const rememberMe = localStorage.getItem('rememberMe') === 'true';
        
        if (!rememberMe) {
          // If rememberMe is false, check if this is a fresh session
          const sessionStart = sessionStorage.getItem('sessionStart');
          if (!sessionStart) {
            // This is a fresh session, set the start time
            sessionStorage.setItem('sessionStart', Date.now().toString());
          }
        } else {
          // If rememberMe is true, clear session storage
          sessionStorage.removeItem('sessionStart');
        }
      } else {
        // User is not logged in, clear session storage
        sessionStorage.removeItem('sessionStart');
      }
      
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Check session persistence on page load
  useEffect(() => {
    if (!loading && currentUser) {
      const rememberMe = localStorage.getItem('rememberMe') === 'true';
      const sessionStart = sessionStorage.getItem('sessionStart');
      
      // If rememberMe is false and no session start exists, 
      // it means the browser was closed and reopened
      if (!rememberMe && !sessionStart) {
        // Force logout
        logout();
      }
    }
  }, [currentUser, logout, loading]);



  const value = {
    currentUser,
    login,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
