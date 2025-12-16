import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { useNotifications } from './NotificationSystem';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { db } from '../firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs,
  query,
  orderBy
} from 'firebase/firestore';
import LoadingSpinner from './LoadingSpinner';
import ConfirmationModal from './ConfirmationModal';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const { t, i18n } = useTranslation();
  const { darkMode } = useTheme();
  const { success, error: showError, warning } = useNotifications();

  // Handle form submit
  const handleFormSubmit = (e) => {
    e.preventDefault();
  };

  // Handle Enter key to move to next input or submit if last field
  const handleKeyDown = (e, formId) => {
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
      const form = document.getElementById(formId);
      if (form) {
        const inputs = Array.from(form.querySelectorAll('input:not([type="submit"]):not([type="button"]), textarea, select'));
        const currentIndex = inputs.indexOf(e.target);
        
        if (currentIndex < inputs.length - 1) {
          // Move to next input
          e.preventDefault();
          inputs[currentIndex + 1].focus();
        } else {
          // Last field - allow form submission
          // Don't prevent default, let form submit naturally
        }
      }
    }
  };

  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    storageLocation: '',
    quantity: '',
    price: '',
    category: '',
    partNumber: '',
    brandName: '',
    cost: ''
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    filterAndSortProducts();
  }, [products, searchTerm, filterCategory, sortBy, sortOrder]);

  const fetchProducts = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'products'));
      const productsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProducts(productsData);
      
      // Extract unique categories
      const uniqueCategories = [...new Set(productsData.map(p => p.category).filter(Boolean))];
      setCategories(uniqueCategories);
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching products:', error);
      setLoading(false);
    }
  };

  const filterAndSortProducts = () => {
    let filtered = products;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.storageLocation.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.partNumber && product.partNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (product.brandName && product.brandName.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filter by category
    if (filterCategory !== 'all') {
      filtered = filtered.filter(product => product.category === filterCategory);
    }

    // Sort products
    filtered.sort((a, b) => {
      let aValue, bValue;
      
             switch (sortBy) {
         case 'price':
           aValue = parseFloat(a.price) || 0;
           bValue = parseFloat(b.price) || 0;
           break;
        case 'quantity':
          aValue = parseInt(a.quantity) || 0;
          bValue = parseInt(b.quantity) || 0;
          break;
        case 'name':
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredProducts(filtered);
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handleAddProduct = async () => {
    try {
      const productData = {
        ...newProduct,
        quantity: parseInt(newProduct.quantity),
        price: parseFloat(newProduct.price),
        createdAt: new Date()
      };

      await addDoc(collection(db, 'products'), productData);
      setShowAddModal(false);
      setNewProduct({
        name: '',
        description: '',
        storageLocation: '',
        quantity: '',
        price: '',
        category: '',
        partNumber: '',
        brandName: '',
        cost: ''
      });
      fetchProducts();
      success(t('productAdded'), t('productAddedMessage'));
    } catch (error) {
      console.error('Error adding product:', error);
      showError(t('error'), t('productAddError'));
    }
  };

  const handleEditProduct = async () => {
    try {
      const productRef = doc(db, 'products', editingProduct.id);
      const productData = {
        ...editingProduct,
        quantity: parseInt(editingProduct.quantity),
        price: parseFloat(editingProduct.price),
        updatedAt: new Date()
      };

      await updateDoc(productRef, productData);
      setShowEditModal(false);
      setEditingProduct(null);
      fetchProducts();
      success(t('productUpdated'), t('productUpdatedMessage'));
    } catch (error) {
      console.error('Error updating product:', error);
      showError(t('error'), t('productUpdateError'));
    }
  };

  const handleDeleteProduct = async (productId) => {
    try {
      await deleteDoc(doc(db, 'products', productId));
      fetchProducts();
      success(t('productDeleted'), t('productDeletedMessage'));
    } catch (error) {
      console.error('Error deleting product:', error);
      showError(t('error'), t('productDeleteError'));
    }
  };

  const openDeleteModal = (product) => {
    setProductToDelete(product);
    setShowDeleteModal(true);
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setShowEditModal(true);
  };

  const getAvailabilityStatus = (quantity) => {
    return parseInt(quantity) > 0 ? t('available') : t('unavailable');
  };

  const getAvailabilityColor = (quantity) => {
    return parseInt(quantity) > 0 ? 'text-green-600' : 'text-red-600';
  };

  if (loading) {
    return <LoadingSpinner page="products" />;
  }

  return (
    <div className={`h-[100%] w-full ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-4">{t('products')}</h1>
          
          {/* Search and Filter Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder={t('search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg ${
                  darkMode 
                    ? 'bg-gray-800 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
            </div>

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className={`px-4 py-2 border rounded-lg ${
                darkMode 
                  ? 'bg-gray-800 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="all">{t('allCategories')}</option>
              {categories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>

            <button
              onClick={() => setShowAddModal(true)}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2"
            >
              <Plus size={20} />
              {t('addProduct')}
            </button>
          </div>
        </div>

        {/* Products Table */}
        <div className={`overflow-x-auto rounded-lg shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <tr className=''>
                <th className={`px-2 py-3 text-center text-xs font-medium uppercase tracking-wider cursor-pointer ${
                  darkMode ? 'text-gray-300' : 'text-gray-500'
                }`} onClick={() => handleSort('name')}>
                  <div className="flex items-center justify-center gap-2">
                    {t('productName')}
                    {sortBy === 'name' && (
                      sortOrder === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </div>
                </th>
                <th className={`px-2 py-1 text-center text-xs font-medium uppercase tracking-wider w-48 ${
                  darkMode ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  {t('description')}
                </th>
                <th className={`px-2 py-1 text-center text-xs font-medium uppercase tracking-wider ${
                  darkMode ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  {t('category')}
                </th>
                <th className={`px-2 py-1 text-center text-xs font-medium uppercase tracking-wider ${
                  darkMode ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  {t('partNumber')}
                </th>
                <th className={`px-2 py-1 text-center text-xs font-medium uppercase tracking-wider ${
                  darkMode ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  {t('brandName')}
                </th>
               
                <th className={`px-2 py-1 text-center text-xs font-medium uppercase tracking-wider ${
                  darkMode ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  {t('storageLocation')}
                </th>
                <th className={`px-2 py-1 text-center text-xs font-medium uppercase tracking-wider cursor-pointer ${
                  darkMode ? 'text-gray-300' : 'text-gray-500'
                }`} onClick={() => handleSort('quantity')}>
                  <div className="flex items-center justify-center gap-2">
                    {t('quantity')}
                    {sortBy === 'quantity' && (
                      sortOrder === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </div>
                </th>
                <th className={`px-2 py-1 text-center text-xs font-medium uppercase tracking-wider ${
                  darkMode ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  {t('cost')}
                </th>
                <th className={`px-2 py-1 text-center text-xs font-medium uppercase tracking-wider cursor-pointer ${
                  darkMode ? 'text-gray-300' : 'text-gray-500'
                }`} onClick={() => handleSort('price')}>
                  <div className="flex items-center justify-center gap-2">
                    {t('price')}
                    {sortBy === 'price' && (
                      sortOrder === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </div>
                </th>
                <th className={`px-2 py-1 text-center text-xs font-medium uppercase tracking-wider ${
                  darkMode ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  {t('available')}
                </th>
                <th className={`px-2 py-1 text-center text-xs font-medium uppercase tracking-wider ${
                  darkMode ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  {t('actions')}
                </th>
              </tr>
            </thead>
            <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
              {filteredProducts.map((product) => (
                <tr key={product.id} className={`${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
                  <td className="px-2 py-3 whitespace-nowrap text-center">
                    <div className="text-sm font-medium">{product.name}</div>
                  </td>
                  <td className="px-2 py-1 text-center">
                    <div 
                      className="text-sm w-48 truncate cursor-help" 
                      title={product.description}
                    >
                      {product.description}
                    </div>
                  </td>
                  <td className="px-2 py-1 whitespace-nowrap text-center">
                    <div className="text-sm">{product.category}</div>
                  </td>
                  <td className="px-2 py-1 whitespace-nowrap text-center">
                    <div className="text-sm">{product.partNumber || '-'}</div>
                  </td>
                  <td className="px-2 py-1 whitespace-nowrap text-center">
                    <div className="text-sm">{product.brandName || '-'}</div>
                  </td>
                 
                  <td className="px-2 py-1 whitespace-nowrap text-center">
                    <div className="text-sm">{product.storageLocation}</div>
                  </td>
                  <td className="px-2 py-1 whitespace-nowrap text-center">
                    <div className="text-sm">{product.quantity}</div>
                  </td>
                  <td className="px-2 py-1 whitespace-nowrap text-center">
                    <div className="text-sm">{product.cost ? `${product.cost} JOD` : '-'}</div>
                  </td>
                  <td className="px-2 py-1 whitespace-nowrap text-center">
                    <div className="text-sm">{product.price} JOD</div>
                  </td>
                  
                  <td className="px-2 py-1 whitespace-nowrap text-center">
                    <span className={`text-sm font-medium ${getAvailabilityColor(product.quantity)}`}>
                      {getAvailabilityStatus(product.quantity)}
                    </span>
                  </td>
                  <td className="px-2 py-1 whitespace-nowrap text-sm font-medium text-center">
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => openEditModal(product)}
                        className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition-colors"
                        title={t('editProduct')}
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => openDeleteModal(product)}
                        className="bg-red-600 text-white p-2 rounded hover:bg-red-700 transition-colors"
                        title={t('deleteProduct')}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <p className="text-xl text-gray-500">{t('noProducts')}</p>
            </div>
          )}
        </div>

        {/* Add Product Modal */}
        {showAddModal && (
          <div className="fixed inset-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className={`p-6 rounded-lg w-full max-w-md ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <h2 className="text-xl font-bold mb-4">{t('addProduct')}</h2>
              <form id="addProductForm" onSubmit={handleFormSubmit}>
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder={t('productName')}
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                    onKeyDown={(e) => handleKeyDown(e, 'addProductForm')}
                    className={`w-full px-3 py-2 border rounded ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                    }`}
                  />
                <textarea
                  placeholder={t('description')}
                  value={newProduct.description}
                  onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                  className={`w-full px-3 py-2 border rounded ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                  rows="3"
                />
                  <input
                    type="text"
                    placeholder={t('category')}
                    value={newProduct.category}
                    onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
                    onKeyDown={(e) => handleKeyDown(e, 'addProductForm')}
                    className={`w-full px-3 py-2 border rounded ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                    }`}
                    list="categories"
                  />
                  <datalist id="categories">
                    {categories.map((category) => (
                      <option key={category} value={category} />
                    ))}
                  </datalist>
                  <input
                    type="text"
                    placeholder={t('partNumber')}
                    value={newProduct.partNumber}
                    onChange={(e) => setNewProduct({...newProduct, partNumber: e.target.value})}
                    onKeyDown={(e) => handleKeyDown(e, 'addProductForm')}
                    className={`w-full px-3 py-2 border rounded ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                    }`}
                  />
                  <input
                    type="text"
                    placeholder={t('brandName')}
                    value={newProduct.brandName}
                    onChange={(e) => setNewProduct({...newProduct, brandName: e.target.value})}
                    onKeyDown={(e) => handleKeyDown(e, 'addProductForm')}
                    className={`w-full px-3 py-2 border rounded ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                    }`}
                  />
                  
                  <input
                    type="text"
                    placeholder={t('storageLocation')}
                    value={newProduct.storageLocation}
                    onChange={(e) => setNewProduct({...newProduct, storageLocation: e.target.value})}
                    onKeyDown={(e) => handleKeyDown(e, 'addProductForm')}
                    className={`w-full px-3 py-2 border rounded ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                    }`}
                  />
                  <input
                    type="number"
                    placeholder={t('quantity')}
                    value={newProduct.quantity}
                    onChange={(e) => setNewProduct({...newProduct, quantity: e.target.value})}
                    onKeyDown={(e) => handleKeyDown(e, 'addProductForm')}
                    className={`w-full px-3 py-2 border rounded ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                    }`}
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder={t('cost')}
                    value={newProduct.cost}
                    onChange={(e) => setNewProduct({...newProduct, cost: e.target.value})}
                    onKeyDown={(e) => handleKeyDown(e, 'addProductForm')}
                    className={`w-full px-3 py-2 border rounded ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                    }`}
                  />
                  <input
                   type="number"
                   step="0.01"
                   placeholder={t('price')}
                   value={newProduct.price}
                   onChange={(e) => setNewProduct({...newProduct, price: e.target.value})}
                   onKeyDown={(e) => handleKeyDown(e, 'addProductForm')}
                   className={`w-full px-3 py-2 border rounded ${
                     darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                   }`}
                 />
                </div>
                <div className="flex gap-2 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-4 py-2 border rounded hover:bg-gray-100"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="submit"
                    onClick={handleAddProduct}
                    className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
                    disabled={!newProduct.name || !newProduct.description || !newProduct.category || !newProduct.storageLocation || !newProduct.quantity || !newProduct.price || loading}
                  >
                    {t('save')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Product Modal */}
        {showEditModal && editingProduct && (
          <div className="fixed inset-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className={`p-6 rounded-lg w-full max-w-md ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <h2 className="text-xl font-bold mb-4">{t('editProduct')}</h2>
              <form id="editProductForm" onSubmit={handleFormSubmit}>
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder={t('productName')}
                    value={editingProduct.name}
                    onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})}
                    onKeyDown={(e) => handleKeyDown(e, 'editProductForm')}
                    className={`w-full px-3 py-2 border rounded ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                    }`}
                  />
                <textarea
                  placeholder={t('description')}
                  value={editingProduct.description}
                  onChange={(e) => setEditingProduct({...editingProduct, description: e.target.value})}
                  className={`w-full px-3 py-2 border rounded ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                  rows="3"
                />
                <input
                  type="text"
                  placeholder={t('category')}
                  value={editingProduct.category}
                  onChange={(e) => setEditingProduct({...editingProduct, category: e.target.value})}
                  onKeyDown={(e) => handleKeyDown(e, 'editProductForm')}
                  className={`w-full px-3 py-2 border rounded ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                  list="editCategories"
                />
                <datalist id="editCategories">
                  {categories.map((category) => (
                    <option key={category} value={category} />
                  ))}
                </datalist>
                <input
                  type="text"
                  placeholder={t('partNumber')}
                  value={editingProduct.partNumber || ''}
                  onChange={(e) => setEditingProduct({...editingProduct, partNumber: e.target.value})}
                  onKeyDown={(e) => handleKeyDown(e, 'editProductForm')}
                  className={`w-full px-3 py-2 border rounded ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                />
                <input
                  type="text"
                  placeholder={t('brandName')}
                  value={editingProduct.brandName || ''}
                  onChange={(e) => setEditingProduct({...editingProduct, brandName: e.target.value})}
                  onKeyDown={(e) => handleKeyDown(e, 'editProductForm')}
                  className={`w-full px-3 py-2 border rounded ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder={t('cost')}
                  value={editingProduct.cost || ''}
                  onChange={(e) => setEditingProduct({...editingProduct, cost: e.target.value})}
                  onKeyDown={(e) => handleKeyDown(e, 'editProductForm')}
                  className={`w-full px-3 py-2 border rounded ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                />
                <input
                  type="text"
                  placeholder={t('storageLocation')}
                  value={editingProduct.storageLocation}
                  onChange={(e) => setEditingProduct({...editingProduct, storageLocation: e.target.value})}
                  onKeyDown={(e) => handleKeyDown(e, 'editProductForm')}
                  className={`w-full px-3 py-2 border rounded ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                />
                <input
                  type="number"
                  placeholder={t('quantity')}
                  value={editingProduct.quantity}
                  onChange={(e) => setEditingProduct({...editingProduct, quantity: e.target.value})}
                  onKeyDown={(e) => handleKeyDown(e, 'editProductForm')}
                  className={`w-full px-3 py-2 border rounded ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                />
                <input
                 type="number"
                 step="0.01"
                 placeholder={t('price')}
                 value={editingProduct.price}
                 onChange={(e) => setEditingProduct({...editingProduct, price: e.target.value})}
                 onKeyDown={(e) => handleKeyDown(e, 'editProductForm')}
                 className={`w-full px-3 py-2 border rounded ${
                   darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                 }`}
               />
                </div>
                <div className="flex gap-2 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="flex-1 px-4 py-2 border rounded hover:bg-gray-100"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="submit"
                    onClick={handleEditProduct}
                    className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
                  >
                    {t('save')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <ConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={() => handleDeleteProduct(productToDelete?.id)}
          title={t('deleteConfirmation')}
          message={t('confirmDelete')}
          confirmText="delete"
          cancelText="cancel"
          type="danger"
        />
      </div>
    </div>
  );
};

export default Products;
