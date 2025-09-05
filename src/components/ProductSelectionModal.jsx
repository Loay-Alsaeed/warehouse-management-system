import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { Search, X, Package, Filter } from 'lucide-react';

const ProductSelectionModal = ({ 
  isOpen, 
  onClose, 
  products, 
  onProductSelect, 
  selectedProducts = [] 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStorage, setFilterStorage] = useState('all');
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [storageLocations, setStorageLocations] = useState([]);
  const { t } = useTranslation();
  const { darkMode } = useTheme();

  useEffect(() => {
    if (products.length > 0) {
      // Extract unique categories and storage locations
      const uniqueCategories = [...new Set(products.map(p => p.category).filter(Boolean))];
      const uniqueStorageLocations = [...new Set(products.map(p => p.storageLocation).filter(Boolean))];
      
      setCategories(uniqueCategories);
      setStorageLocations(uniqueStorageLocations);
    }
  }, [products]);

  useEffect(() => {
    filterProducts();
  }, [products, searchTerm, filterCategory, filterStorage]);

  const filterProducts = () => {
    let filtered = products.filter(product => product.quantity > 0); // Only show available products

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.partNumber && product.partNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (product.brandName && product.brandName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        product.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by category
    if (filterCategory !== 'all') {
      filtered = filtered.filter(product => product.category === filterCategory);
    }

    // Filter by storage location
    if (filterStorage !== 'all') {
      filtered = filtered.filter(product => product.storageLocation === filterStorage);
    }

    setFilteredProducts(filtered);
  };

  const handleProductSelect = (product) => {
    onProductSelect(product);
  };

  const isProductSelected = (productId) => {
    return selectedProducts.some(p => p.productId === productId);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed px-4 inset-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`w-full  max-w-6xl h-5/6 rounded-lg shadow-xl ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center gap-2">
            <Package size={24} />
            <h2 className="text-xl font-bold">{t('selectProducts')}</h2>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-full hover:bg-gray-200 ${darkMode ? 'hover:bg-gray-700' : ''}`}
          >
            <X size={20} />
          </button>
        </div>

        {/* Filters */}
        <div className={`p-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder={t('searchProducts')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
            </div>

            {/* Category Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value="all">{t('allCategories')}</option>
                {categories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            {/* Storage Location Filter */}
            <select
              value={filterStorage}
              onChange={(e) => setFilterStorage(e.target.value)}
              className={`px-4 py-2 border rounded-lg ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="all">{t('allStorageLocations')}</option>
              {storageLocations.map((location) => (
                <option key={location} value={location}>{location}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Products Table */}
        <div className="p-4 h-4/5 overflow-y-auto">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <Package size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-xl text-gray-500">{t('noProductsFound')}</p>
            </div>
          ) : (
            <div className={`overflow-x-auto rounded-lg shadow ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <table className="w-full">
                <thead className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <tr>
                    <th className={`px-4 py-3 text-center text-xs font-medium uppercase tracking-wider ${
                      darkMode ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      {t('productName')}
                    </th>
                    <th className={`px-4 py-3 text-center text-xs font-medium uppercase tracking-wider ${
                      darkMode ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      {t('category')}
                    </th>
                    <th className={`px-4 py-3 text-center text-xs font-medium uppercase tracking-wider ${
                      darkMode ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      {t('brandName')}
                    </th>
                    <th className={`px-4 py-3 text-center text-xs font-medium uppercase tracking-wider ${
                      darkMode ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      {t('partNumber')}
                    </th>
                    <th className={`px-4 py-3 text-center text-xs font-medium uppercase tracking-wider ${
                      darkMode ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      {t('price')}
                    </th>
                    <th className={`px-4 py-3 text-center text-xs font-medium uppercase tracking-wider ${
                      darkMode ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      {t('quantity')}
                    </th>
                    <th className={`px-4 py-3 text-center text-xs font-medium uppercase tracking-wider ${
                      darkMode ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      {t('actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                  {filteredProducts.map((product) => (
                    <tr 
                      key={product.id} 
                      className={`transition-colors ${
                        isProductSelected(product.id)
                          ? 'bg-green-50 dark:bg-green-900/20'
                          : darkMode
                          ? 'hover:bg-gray-700'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <div className="text-sm font-medium">{product.name}</div>
                          <div className="text-xs text-gray-500 truncate max-w-xs" title={product.description}>
                            {product.description}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">{product.category}</td>
                      <td className="px-4 py-3 text-sm">{product.brandName || '-'}</td>
                      <td className="px-4 py-3 text-sm">{product.partNumber || '-'}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-indigo-600">
                        {product.price} JOD
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          product.quantity > 10 
                            ? 'bg-green-100 text-green-800' 
                            : product.quantity > 5
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {product.quantity}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleProductSelect(product)}
                          disabled={isProductSelected(product.id)}
                          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                            isProductSelected(product.id)
                              ? 'bg-green-100 text-green-800 cursor-not-allowed'
                              : 'bg-indigo-600 text-white hover:bg-indigo-700'
                          }`}
                        >
                          {isProductSelected(product.id) ? t('selected') : t('select')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`p-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500">
              {t('showingProducts', { count: filteredProducts.length, total: products.length })}
            </div>
            <button
              onClick={onClose}
              className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700"
            >
              {t('close')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductSelectionModal;
