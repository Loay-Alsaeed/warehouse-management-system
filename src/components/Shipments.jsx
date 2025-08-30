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
  ChevronDown,
  Package,
  User,
  Calendar,
  Save,
  Eye
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
  orderBy,
  writeBatch
} from 'firebase/firestore';
import LoadingSpinner from './LoadingSpinner';
import ConfirmationModal from './ConfirmationModal';

const Shipments = () => {
  const [shipments, setShipments] = useState([]);
  const [filteredShipments, setFilteredShipments] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('shipmentDate');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingShipment, setViewingShipment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [shipmentToDelete, setShipmentToDelete] = useState(null);
  const { t, i18n } = useTranslation();
  const { darkMode } = useTheme();
  const { success, error: showError } = useNotifications();

  const [newShipment, setNewShipment] = useState({
    shipmentNumber: '',
    supplierId: '',
    supplierName: '',
    shipmentDate: new Date().toISOString().split('T')[0],
    totalAmount: 0,
    items: []
  });

  const [newItem, setNewItem] = useState({
    productName: '',
    quantity: 1,
    price: 0,
    total: 0,
    isNewProduct: false
  });

  // Product suggestions state
  const [productSuggestions, setProductSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Validation state
  const [validationErrors, setValidationErrors] = useState({
    supplierId: '',
    shipmentDate: '',
    items: '',
    productName: '',
    quantity: '',
    price: ''
  });

  useEffect(() => {
    fetchShipments();
    fetchSuppliers();
    fetchProducts();
  }, []);

  useEffect(() => {
    filterAndSortShipments();
  }, [shipments, searchTerm, sortBy, sortOrder]);

  useEffect(() => {
    calculateShipmentTotal();
  }, [newShipment.items]);

  const fetchShipments = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'shipments'));
      const shipmentsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setShipments(shipmentsData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching shipments:', error);
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'suppliers'));
      const suppliersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setSuppliers(suppliersData);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'products'));
      const productsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProducts(productsData);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const filterAndSortShipments = () => {
    let filtered = shipments;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(shipment =>
        shipment.shipmentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shipment.supplierName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort shipments
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'shipmentNumber':
          aValue = a.shipmentNumber.toLowerCase();
          bValue = b.shipmentNumber.toLowerCase();
          break;
        case 'supplierName':
          aValue = a.supplierName.toLowerCase();
          bValue = b.supplierName.toLowerCase();
          break;
        case 'shipmentDate':
          aValue = new Date(a.shipmentDate);
          bValue = new Date(b.shipmentDate);
          break;
        case 'totalAmount':
          aValue = parseFloat(a.totalAmount) || 0;
          bValue = parseFloat(b.totalAmount) || 0;
          break;
        default:
          aValue = new Date(a.shipmentDate);
          bValue = new Date(b.shipmentDate);
          break;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredShipments(filtered);
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const calculateShipmentTotal = () => {
    const total = newShipment.items.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
    setNewShipment(prev => ({
      ...prev,
      totalAmount: Math.round(total * 100) / 100
    }));
  };

  const handleSupplierSelect = (supplierId) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    if (supplier) {
      setNewShipment(prev => ({
        ...prev,
        supplierId: supplier.id,
        supplierName: supplier.companyName
      }));
    }
  };

  // Handle product name input for suggestions
  const handleProductNameChange = (value) => {
    setNewItem(prev => ({ ...prev, productName: value }));
    
    if (value.trim() === '') {
      setProductSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Filter products based on input
    const filtered = products.filter(product =>
      product.name.toLowerCase().includes(value.toLowerCase())
    ).slice(0, 5); // Limit to 5 suggestions

    setProductSuggestions(filtered);
    setShowSuggestions(filtered.length > 0);
  };

  // Handle product selection from suggestions
  const handleProductSelect = (product) => {
    setNewItem(prev => ({
      ...prev,
      productName: product.name,
      price: parseFloat(product.price) || 0,
      total: (parseFloat(product.price) || 0) * prev.quantity,
      isNewProduct: false
    }));
    setProductSuggestions([]);
    setShowSuggestions(false);
  };

  const addItemToShipment = () => {
    // Clear previous validation errors
    clearValidationErrors();

    // Validate item data
    if (!validateItem()) {
      return;
    }

    const total = newItem.quantity * newItem.price;
    setNewShipment(prev => ({
      ...prev,
      items: [...prev.items, { 
        ...newItem, 
        total: Math.round(total * 100) / 100 
      }]
    }));
    setNewItem({
      productName: '',
      quantity: 1,
      price: 0,
      total: 0,
      isNewProduct: false
    });
  };

  const removeItemFromShipment = (index) => {
    setNewShipment(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateItemQuantity = (index, quantity) => {
    const updatedItems = [...newShipment.items];
    const newQuantity = parseInt(quantity) || 0;
    updatedItems[index].quantity = newQuantity;
    updatedItems[index].total = newQuantity * updatedItems[index].price;
    
    setNewShipment(prev => ({
      ...prev,
      items: updatedItems
    }));
  };

  const generateShipmentNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `SHP-${year}${month}${day}-${random}`;
  };

  // Helper function to format decimal numbers
  const formatNumber = (number) => {
    const rounded = Math.round(parseFloat(number) * 100) / 100;
    return rounded % 1 === 0 ? rounded.toString() : rounded.toFixed(2);
  };

  // Validation functions
  const validateShipment = () => {
    const errors = {};

    // Validate supplier
    if (!newShipment.supplierId.trim()) {
      errors.supplierId = t('selectSupplierRequired');
    }

    // Validate shipment date
    if (!newShipment.shipmentDate) {
      errors.shipmentDate = t('enterShipmentDate');
    }

    // Validate items
    if (newShipment.items.length === 0) {
      errors.items = t('atLeastOneItemRequired');
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateItem = () => {
    const errors = {};

    // Validate product name
    if (!newItem.productName.trim()) {
      errors.productName = t('enterProductName');
    }

    // Validate quantity
    if (newItem.quantity <= 0) {
      errors.quantity = t('enterValidQuantity');
    }

    // Validate price
    if (newItem.price <= 0) {
      errors.price = t('enterValidPrice');
    }

    setValidationErrors(prev => ({ ...prev, ...errors }));
    return Object.keys(errors).length === 0;
  };

  const clearValidationErrors = () => {
    setValidationErrors({
      supplierId: '',
      shipmentDate: '',
      items: '',
      productName: '',
      quantity: '',
      price: ''
    });
  };

  const handleAddShipment = async () => {
    // Clear previous validation errors
    clearValidationErrors();

    // Validate shipment data
    if (!validateShipment()) {
      return;
    }

    try {
      const shipmentData = {
        ...newShipment,
        shipmentNumber: newShipment.shipmentNumber || generateShipmentNumber(),
        createdAt: new Date()
      };

      // Create batch for updating inventory and adding new products
      const batch = writeBatch(db);

      // Add shipment
      const shipmentRef = await addDoc(collection(db, 'shipments'), shipmentData);

      // Process each item
      for (const item of newShipment.items) {
        if (item.isNewProduct) {
          // Add new product
          const productData = {
            name: item.productName,
            description: '',
            storageLocation: '',
            quantity: item.quantity,
            price: item.price,
            category: 'New Category',
            createdAt: new Date()
          };
          const productRef = await addDoc(collection(db, 'products'), productData);
        } else {
          // Update existing product quantity
          const existingProduct = products.find(p => p.name.toLowerCase() === item.productName.toLowerCase());
          if (existingProduct) {
            const productRef = doc(db, 'products', existingProduct.id);
            const newQuantity = (parseInt(existingProduct.quantity) || 0) + item.quantity;
            batch.update(productRef, { quantity: newQuantity });
          }
        }
      }

      // Commit batch
      await batch.commit();

      setShowAddModal(false);
      setNewShipment({
        shipmentNumber: '',
        supplierId: '',
        supplierName: '',
        shipmentDate: new Date().toISOString().split('T')[0],
        totalAmount: 0,
        items: []
      });
      
      fetchShipments();
      fetchProducts(); // Refresh products to show updated quantities
      success(t('shipmentAdded'), t('shipmentAddedMessage'));
    } catch (error) {
      console.error('Error adding shipment:', error);
      showError(t('error'), t('shipmentAddError'));
    }
  };

  const handleDeleteShipment = async (shipmentId) => {
    try {
      await deleteDoc(doc(db, 'shipments', shipmentId));
      fetchShipments();
      success(t('shipmentDeleted'), t('shipmentDeletedMessage'));
    } catch (error) {
      console.error('Error deleting shipment:', error);
      showError(t('error'), t('shipmentDeleteError'));
    }
  };

  const openDeleteModal = (shipment) => {
    setShipmentToDelete(shipment);
    setShowDeleteModal(true);
  };

  const openViewModal = (shipment) => {
    setViewingShipment(shipment);
    setShowViewModal(true);
  };

  if (loading) {
    return <LoadingSpinner page="shipments" />;
  }

  return (
    <div className={`h-[100%] w-full ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-4">{t('shipments')}</h1>
          
          {/* Search and Filter Controls */}
          <div className="flex justify-between align-center md:grid-cols-2 gap-4 mb-6">
            <div className="relative w-[40%]">
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

            <button
              onClick={() => setShowAddModal(true)}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2 w-[20%] align-center"
            >
              <Plus size={20} />
              {t('addShipment')}
            </button>
          </div>
        </div>

        {/* Shipments Table */}
        <div className={`overflow-x-auto rounded-lg shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <table className="w-full">
            <thead className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <tr>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer ${
                  darkMode ? 'text-gray-300' : 'text-gray-500'
                }`} onClick={() => handleSort('shipmentNumber')}>
                  <div className="flex items-center gap-2">
                    <Package size={16} />
                    {t('shipmentNumber')}
                    {sortBy === 'shipmentNumber' && (
                      sortOrder === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </div>
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer ${
                  darkMode ? 'text-gray-300' : 'text-gray-500'
                }`} onClick={() => handleSort('supplierName')}>
                  <div className="flex items-center gap-2">
                    <User size={16} />
                    {t('supplierName')}
                    {sortBy === 'supplierName' && (
                      sortOrder === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </div>
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer ${
                  darkMode ? 'text-gray-300' : 'text-gray-500'
                }`} onClick={() => handleSort('shipmentDate')}>
                  <div className="flex items-center gap-2">
                    <Calendar size={16} />
                    {t('shipmentDate')}
                    {sortBy === 'shipmentDate' && (
                      sortOrder === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </div>
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer ${
                  darkMode ? 'text-gray-300' : 'text-gray-500'
                }`} onClick={() => handleSort('totalAmount')}>
                  <div className="flex items-center gap-2">
                    <Package size={16} />
                    {t('totalAmount')}
                    {sortBy === 'totalAmount' && (
                      sortOrder === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </div>
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  darkMode ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  {t('actions')}
                </th>
              </tr>
            </thead>
            <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
              {filteredShipments.map((shipment) => (
                <tr key={shipment.id} className={`${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium">{shipment.shipmentNumber}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm">{shipment.supplierName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm">{shipment.shipmentDate}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium">{formatNumber(shipment.totalAmount)} JOD</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openViewModal(shipment)}
                        className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-xs"
                      >
                        <Eye size={14} className="inline mr-1" />
                        {t('viewShipment')}
                      </button>
                      <button
                        onClick={() => openDeleteModal(shipment)}
                        className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-xs"
                      >
                        <Trash2 size={14} className="inline mr-1" />
                        {t('deleteShipment')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredShipments.length === 0 && (
            <div className="text-center py-12">
              <p className="text-xl text-gray-500">{t('noShipments')}</p>
            </div>
          )}
        </div>

        {/* Add Shipment Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
            <div className={`p-6 rounded-lg w-full max-w-4xl max-h-screen overflow-y-auto ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <h2 className="text-xl font-bold mb-4">{t('addShipment')}</h2>
              
              {/* Shipment Information */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4">{t('shipmentInfo')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">{t('selectSupplier')}</label>
                    <select
                      value={newShipment.supplierId}
                      onChange={(e) => handleSupplierSelect(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg ${
                        darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                      } ${validationErrors.supplierId ? 'border-red-500' : ''}`}
                    >
                      <option value="">{t('selectSupplier')}</option>
                      {suppliers.map((supplier) => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.companyName}
                        </option>
                      ))}
                    </select>
                    {validationErrors.supplierId && (
                      <p className="text-red-500 text-sm mt-1">{validationErrors.supplierId}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">{t('shipmentDate')}</label>
                    <input
                      type="date"
                      value={newShipment.shipmentDate}
                      onChange={(e) => setNewShipment({...newShipment, shipmentDate: e.target.value})}
                      className={`w-full px-3 py-2 border rounded-lg ${
                        darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                      } ${validationErrors.shipmentDate ? 'border-red-500' : ''}`}
                    />
                    {validationErrors.shipmentDate && (
                      <p className="text-red-500 text-sm mt-1">{validationErrors.shipmentDate}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">{t('shipmentNumber')}</label>
                    <input
                      type="text"
                      value={newShipment.shipmentNumber}
                      onChange={(e) => setNewShipment({...newShipment, shipmentNumber: e.target.value})}
                      placeholder={t('autoGenerated')}
                      className={`w-full px-3 py-2 border rounded-lg ${
                        darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Supplier Details Display */}
              {newShipment.supplierName && (
                <div className={`p-4 rounded-lg mb-6 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <h3 className="font-medium mb-2">{t('supplierDetails')}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div><strong>{t('supplierName')}:</strong> {newShipment.supplierName}</div>
                  </div>
                </div>
              )}

              {/* Items Section */}
              <div className="mb-6">
                <h3 className="font-medium mb-4">{t('items')}</h3>
                {validationErrors.items && (
                  <p className="text-red-500 text-sm mb-2">{validationErrors.items}</p>
                )}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-4">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder={t('productName')}
                      value={newItem.productName}
                      onChange={(e) => handleProductNameChange(e.target.value)}
                      onFocus={() => {
                        if (newItem.productName.trim() !== '') {
                          handleProductNameChange(newItem.productName);
                        }
                      }}
                      className={`px-3 py-2 border rounded w-full ${
                        darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                      } ${validationErrors.productName ? 'border-red-500' : ''}`}
                    />
                    {validationErrors.productName && (
                      <p className="text-red-500 text-xs mt-1">{validationErrors.productName}</p>
                    )}
                    {/* Product Suggestions Dropdown */}
                    {showSuggestions && productSuggestions.length > 0 && (
                      <div className={`absolute z-10 w-full mt-1 border rounded-lg shadow-lg max-h-48 overflow-y-auto ${
                        darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                      }`}>
                        {productSuggestions.map((product, index) => (
                          <div
                            key={product.id}
                            onClick={() => handleProductSelect(product)}
                            className={`px-3 py-2 cursor-pointer hover:bg-gray-100 ${
                              darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-100'
                            } ${index === 0 ? 'rounded-t-lg' : ''} ${index === productSuggestions.length - 1 ? 'rounded-b-lg' : ''}`}
                          >
                            <div className="font-medium">{product.name}</div>
                            <div className="text-sm text-gray-500">{formatNumber(product.price)} JOD</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <input
                      type="number"
                      placeholder={t('quantity')}
                      value={newItem.quantity}
                      min="1"
                      onChange={(e) => {
                        const quantity = parseInt(e.target.value) || 0;
                        setNewItem({
                          ...newItem,
                          quantity,
                          total: quantity * newItem.price
                        });
                      }}
                      className={`px-3 py-2 border rounded w-full ${
                        darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                      } ${validationErrors.quantity ? 'border-red-500' : ''}`}
                    />
                    {validationErrors.quantity && (
                      <p className="text-red-500 text-xs mt-1">{validationErrors.quantity}</p>
                    )}
                  </div>
                  <div>
                    <input
                      type="number"
                      step="0.01"
                      placeholder={t('price')}
                      value={newItem.price}
                      onChange={(e) => {
                        const price = parseFloat(e.target.value) || 0;
                        setNewItem({
                          ...newItem,
                          price,
                          total: newItem.quantity * price
                        });
                      }}
                      className={`px-3 py-2 border rounded w-full ${
                        darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                      } ${validationErrors.price ? 'border-red-500' : ''}`}
                    />
                    {validationErrors.price && (
                      <p className="text-red-500 text-xs mt-1">{validationErrors.price}</p>
                    )}
                  </div>
                  <div className="flex items-center">
                    <label className="flex items-center text-sm">
                      <input
                        type="checkbox"
                        checked={newItem.isNewProduct}
                        onChange={(e) => setNewItem({...newItem, isNewProduct: e.target.checked})}
                        className="mr-2"
                      />
                      {t('newProduct')}
                    </label>
                  </div>
                  <button
                    onClick={addItemToShipment}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                  >
                    {t('addItem')}
                  </button>
                </div>

                {/* Items List */}
                {newShipment.items.length > 0 && (
                  <div className={`border rounded-lg p-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <h4 className="font-medium mb-2">{t('selectedItems')}</h4>
                    {newShipment.items.map((item, index) => (
                      <div key={index} className="flex justify-between items-center py-2 border-b last:border-b-0">
                        <span>{item.productName}</span>
                        <div className="flex items-center gap-4">
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItemQuantity(index, e.target.value)}
                            className={`w-20 px-2 py-1 border rounded ${
                              darkMode ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'
                            }`}
                          />
                          <span>{formatNumber(item.price)} JOD</span>
                          <span className="font-medium">{formatNumber(item.total)} JOD</span>
                          {item.isNewProduct && (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                              {t('new')}
                            </span>
                          )}
                          <button
                            onClick={() => removeItemFromShipment(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Shipment Summary */}
              <div className={`border rounded-lg p-4 mb-6 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <h3 className="font-medium mb-4">{t('shipmentSummary')}</h3>
                <div className="space-y-2">
                  <div className="flex justify-between font-bold text-lg">
                    <span>{t('totalAmount')}:</span>
                    <span>{formatNumber(newShipment.totalAmount)} JOD</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border rounded hover:bg-gray-100"
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={handleAddShipment}
                  className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 flex items-center justify-center gap-2"
                >
                  <Save size={16} />
                  {t('saveShipment')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View Shipment Modal */}
        {showViewModal && viewingShipment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
            <div className={`p-6 rounded-lg w-full max-w-4xl max-h-screen overflow-y-auto ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              {/* Shipment Header */}
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold text-indigo-600 mb-1">{t('shipmentDetails')}</h1>
                <div className="text-sm text-gray-500">{viewingShipment.shipmentNumber}</div>
              </div>

              {/* Shipment Information */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className={`p-3 rounded border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="text-xs text-gray-500 mb-1">{t('shipmentNumber')}</div>
                  <div className="font-semibold">{viewingShipment.shipmentNumber}</div>
                </div>
                <div className={`p-3 rounded border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="text-xs text-gray-500 mb-1">{t('shipmentDate')}</div>
                  <div className="font-semibold">{viewingShipment.shipmentDate}</div>
                </div>
                <div className={`p-3 rounded border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="text-xs text-gray-500 mb-1">{t('totalAmount')}</div>
                  <div className="font-semibold">{formatNumber(viewingShipment.totalAmount)} JOD</div>
                </div>
              </div>

              {/* Supplier Information */}
              <div className={`p-3 rounded border mb-6 ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                <div className="text-xs text-gray-500 mb-2">{t('supplierInfo')}</div>
                <div className="text-sm">
                  <div><span className="font-medium">{t('supplierName')}:</span> {viewingShipment.supplierName}</div>
                </div>
              </div>

              {/* Items Table */}
              <div className={`rounded border mb-6 ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                <div className="p-3 border-b border-gray-200">
                  <h3 className="font-semibold">{t('shipmentItems')}</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className={`${darkMode ? 'bg-gray-600' : 'bg-gray-100'}`}>
                      <tr>
                        <th className="px-3 py-2 text-left text-sm font-semibold">{t('productName')}</th>
                        <th className="px-3 py-2 text-center text-sm font-semibold">{t('quantity')}</th>
                        <th className="px-3 py-2 text-right text-sm font-semibold">{t('unitPrice')}</th>
                        <th className="px-3 py-2 text-right text-sm font-semibold">{t('amount')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {viewingShipment.items.map((item, index) => (
                        <tr key={index} className={`${darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-50'}`}>
                          <td className="px-3 py-2">
                            <div className="font-medium text-sm">{item.productName}</div>
                          </td>
                          <td className="px-3 py-2 text-center text-sm">{item.quantity}</td>
                          <td className="px-3 py-2 text-right text-sm">{formatNumber(item.price)} JOD</td>
                          <td className="px-3 py-2 text-right text-sm font-semibold">{formatNumber(item.total)} JOD</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-6">
                <button
                  onClick={() => setShowViewModal(false)}
                  className="w-full px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 font-semibold"
                >
                  {t('close')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <ConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={() => handleDeleteShipment(shipmentToDelete?.id)}
          title={t('deleteConfirmation')}
          message={t('confirmDeleteShipment')}
          confirmText="delete"
          cancelText="cancel"
          type="danger"
        />
      </div>
    </div>
  );
};

export default Shipments;
