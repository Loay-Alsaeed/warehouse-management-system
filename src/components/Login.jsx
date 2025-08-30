import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { useNotifications } from './NotificationSystem';
import { Eye, EyeOff, Sun, Moon } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const { t, i18n } = useTranslation();
  const { darkMode, toggleTheme } = useTheme();
  // const { success, error: showError } = useNotifications();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);
      
      // Store rememberMe preference
      localStorage.setItem('rememberMe', rememberMe.toString());
      
      await login(email, password, rememberMe);
      // success(t('loginSuccess'), t('welcomeMessage'));
    } catch (error) {
      setError(t('emailOrPasswordNotValid'));
      // showError(t('loginError'), error.message || t('error'));
    }
    setLoading(false);
  };

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'ar' ? 'en' : 'ar');
  };

  return (
    <div className={`h-screen w-full ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
      {/* Language and Theme Toggle Buttons - Top Right */}
      <div className="absolute top-4 right-4 flex space-x-2 z-10">
        <button
          onClick={toggleTheme}
          className={`p-2 rounded-lg transition-colors ${darkMode ? 'bg-gray-700 text-yellow-400 hover:bg-gray-600' : 'bg-white text-gray-700 hover:bg-gray-100'} shadow-lg`}
          title={darkMode ? t('lightMode') : t('darkMode')}
        >
          {darkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        <button
          onClick={toggleLanguage}
          className={`px-3 py-2 rounded-lg transition-colors ${darkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-white text-gray-700 hover:bg-gray-100'} shadow-lg font-medium`}
          title={i18n.language === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
        >
          {i18n.language === 'ar' ? 'EN' : 'عربي'}
        </button>
      </div>

      {/* Login Form - Centered */}
      <div className="flex items-center justify-center h-full">
        <div className={`max-w-md w-full space-y-8 p-8 ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg`}>
          <div className="text-center">
            <h2 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {t('login')}
            </h2>
          </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              {t('email')}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                darkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-gray-900'
              }`}
              placeholder={t('email')}
            />
          </div>

          <div>
            <label htmlFor="password" className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              {t('password')}
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                  darkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-gray-900'
                }`}
                placeholder={t('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showPassword ? (
                  <EyeOff className={`h-5 w-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                ) : (
                  <Eye className={`h-5 w-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="remember-me" className={`ml-2 block text-sm ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
              {t('rememberMe')}
            </label>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? '...' : t('loginButton')}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
