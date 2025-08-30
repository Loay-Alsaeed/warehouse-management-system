import React, { createContext, useContext, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { 
  CheckCircle, 
  AlertCircle, 
  Info, 
  X, 
  XCircle 
} from 'lucide-react';

const NotificationContext = createContext();

export const useNotifications = () => {
  return useContext(NotificationContext);
};

const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const { t } = useTranslation();
  const { darkMode } = useTheme();

  const addNotification = useCallback((notification) => {
    const id = Date.now() + Math.random();
    const newNotification = {
      id,
      type: notification.type || 'info',
      title: notification.title || '',
      message: notification.message || '',
      duration: notification.duration || 5000,
      ...notification
    };

    setNotifications(prev => [...prev, newNotification]);

    // Auto remove notification after duration
    if (newNotification.duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration);
    }

    return id;
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Helper methods for different notification types
  const success = useCallback((title, message, options = {}) => {
    return addNotification({
      type: 'success',
      title,
      message,
      ...options
    });
  }, [addNotification]);

  const error = useCallback((title, message, options = {}) => {
    return addNotification({
      type: 'error',
      title,
      message,
      duration: 8000, // Longer duration for errors
      ...options
    });
  }, [addNotification]);

  const warning = useCallback((title, message, options = {}) => {
    return addNotification({
      type: 'warning',
      title,
      message,
      ...options
    });
  }, [addNotification]);

  const info = useCallback((title, message, options = {}) => {
    return addNotification({
      type: 'info',
      title,
      message,
      ...options
    });
  }, [addNotification]);

  const value = {
    notifications,
    addNotification,
    removeNotification,
    clearAllNotifications,
    success,
    error,
    warning,
    info
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationContainer />
    </NotificationContext.Provider>
  );
};

const NotificationContainer = () => {
  const { notifications, removeNotification, clearAllNotifications } = useNotifications();
  const { t } = useTranslation();
  const { darkMode } = useTheme();

  if (notifications.length === 0) return null;

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle size={20} className="text-green-500" />;
      case 'error':
        return <XCircle size={20} className="text-red-500" />;
      case 'warning':
        return <AlertCircle size={20} className="text-yellow-500" />;
      case 'info':
      default:
        return <Info size={20} className="text-blue-500" />;
    }
  };

  const getNotificationStyles = (type) => {
    const baseStyles = "border-l-4 p-4 rounded-lg shadow-lg max-w-sm w-full";
    
    switch (type) {
      case 'success':
        return `${baseStyles} bg-green-50 border-green-400 ${darkMode ? 'bg-green-900/20 border-green-500' : ''}`;
      case 'error':
        return `${baseStyles} bg-red-50 border-red-400 ${darkMode ? 'bg-red-900/20 border-red-500' : ''}`;
      case 'warning':
        return `${baseStyles} bg-yellow-50 border-yellow-400 ${darkMode ? 'bg-yellow-900/20 border-yellow-500' : ''}`;
      case 'info':
      default:
        return `${baseStyles} bg-blue-50 border-blue-400 ${darkMode ? 'bg-blue-900/20 border-blue-500' : ''}`;
    }
  };

  const getTextStyles = (type) => {
    const baseStyles = "font-medium";
    
    switch (type) {
      case 'success':
        return `${baseStyles} text-green-800 ${darkMode ? 'text-green-200' : ''}`;
      case 'error':
        return `${baseStyles} text-red-800 ${darkMode ? 'text-red-200' : ''}`;
      case 'warning':
        return `${baseStyles} text-yellow-800 ${darkMode ? 'text-yellow-200' : ''}`;
      case 'info':
      default:
        return `${baseStyles} text-blue-800 ${darkMode ? 'text-blue-200' : ''}`;
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {notifications.length > 1 && (
        <div className="flex justify-between items-center mb-2">
          <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            {notifications.length} {t('notifications')}
          </span>
          <button
            onClick={clearAllNotifications}
            className={`text-xs px-2 py-1 rounded ${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
          >
            {t('clearAll')}
          </button>
        </div>
      )}
      
      {notifications.map((notification) => (
                 <div
           key={notification.id}
           className={`${getNotificationStyles(notification.type)} transform transition-all duration-300 ease-in-out animate-slide-in-bottom`}
         >
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              {getNotificationIcon(notification.type)}
            </div>
            
            <div className="flex-1 min-w-0">
              {notification.title && (
                <p className={`${getTextStyles(notification.type)} text-sm`}>
                  {notification.title}
                </p>
              )}
              {notification.message && (
                <p className={`text-sm mt-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  {notification.message}
                </p>
              )}
            </div>
            
            <button
              onClick={() => removeNotification(notification.id)}
              className={`flex-shrink-0 p-1 rounded-full ${darkMode ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200'}`}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default NotificationProvider;
