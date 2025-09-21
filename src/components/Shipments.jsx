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
  Eye,
  Check,
  Minus
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
import { dir } from 'i18next';

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
  const [showProductSelectionModal, setShowProductSelectionModal] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [productQuantities, setProductQuantities] = useState({});
  const [filteredProductsInModal, setFilteredProductsInModal] = useState([]);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [productFilterCategory, setProductFilterCategory] = useState('all');
  const [productFilterType, setProductFilterType] = useState('all'); // all, selected, unselected
  const [showAddProductInModal, setShowAddProductInModal] = useState(false);
  const [newProductInModal, setNewProductInModal] = useState({
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

  useEffect(() => {
    filterProductsInModal();
  }, [products, productSearchTerm, productFilterCategory, productFilterType, selectedProducts]);



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

    // البحث عن المنتج للحصول على ID
    const product = products.find(p => p.name.toLowerCase() === newItem.productName.toLowerCase());
    const productId = product ? product.id : null;

    const total = newItem.quantity * newItem.price;
    setNewShipment(prev => ({
      ...prev,
      items: [...prev.items, { 
        ...newItem, 
        productId: productId, // إضافة ID المنتج
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

  const filterProductsInModal = () => {
    let filtered = products;

    // Filter by search term
    if (productSearchTerm) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
        product.description.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
        product.category.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
        (product.partNumber && product.partNumber.toLowerCase().includes(productSearchTerm.toLowerCase())) ||
        (product.brandName && product.brandName.toLowerCase().includes(productSearchTerm.toLowerCase()))
      );
    }

    // Filter by category
    if (productFilterCategory !== 'all') {
      filtered = filtered.filter(product => product.category === productFilterCategory);
    }

    // Filter by selection status
    if (productFilterType === 'selected') {
      filtered = filtered.filter(product => selectedProducts.some(p => p.id === product.id));
    } else if (productFilterType === 'unselected') {
      filtered = filtered.filter(product => !selectedProducts.some(p => p.id === product.id));
    }

    setFilteredProductsInModal(filtered);
  };

  const openProductSelectionModal = () => {
    setShowProductSelectionModal(true);
    setProductSearchTerm('');
    setProductFilterCategory('all');
    setProductFilterType('all');
    
    // أخذ المنتجات المختارة من عناصر الشحنة الحالية
    const currentSelectedProducts = [];
    const currentProductQuantities = {};
    
    newShipment.items.forEach(item => {
      // البحث عن المنتج باستخدام ID أولاً، ثم الاسم كبديل
      let product;
      if (item.productId) {
        product = products.find(p => p.id === item.productId);
      } else {
        // للعناصر القديمة التي لا تحتوي على productId
        product = products.find(p => p.name.toLowerCase() === item.productName.toLowerCase());
      }
      
      if (product) {
        currentSelectedProducts.push(product);
        currentProductQuantities[product.id] = item.quantity;
      }
    });
    
    setSelectedProducts(currentSelectedProducts);
    setProductQuantities(currentProductQuantities);
    
    filterProductsInModal();
  };

  const closeProductSelectionModal = () => {
    setShowProductSelectionModal(false);
    // لا نمسح المنتجات المختارة والكميات - ستأخذ من الشحنة عند الفتح التالي
    setProductSearchTerm('');
    setProductFilterCategory('all');
    setProductFilterType('all');
    setShowAddProductInModal(false);
    setNewProductInModal({
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
  };

  const clearSelectedProducts = () => {
    setSelectedProducts([]);
    setProductQuantities({});
    // مسح عناصر الشحنة أيضاً عند مسح المنتجات المختارة
    setNewShipment(prev => ({
      ...prev,
      items: []
    }));
  };

  const toggleProductSelection = (product) => {
    const isSelected = selectedProducts.some(p => p.id === product.id);
    
    if (isSelected) {
      setSelectedProducts(selectedProducts.filter(p => p.id !== product.id));
      const newQuantities = { ...productQuantities };
      delete newQuantities[product.id];
      setProductQuantities(newQuantities);
    } else {
      setSelectedProducts([...selectedProducts, product]);
      setProductQuantities({
        ...productQuantities,
        [product.id]: 1
      });
    }
  };

  const updateProductQuantity = (productId, quantity) => {
    const newQuantity = Math.max(1, parseInt(quantity) || 1);
    setProductQuantities({
      ...productQuantities,
      [productId]: newQuantity
    });
  };

  const increaseQuantity = (productId) => {
    const currentQuantity = productQuantities[productId] || 1;
    updateProductQuantity(productId, currentQuantity + 1);
  };

  const decreaseQuantity = (productId) => {
    const currentQuantity = productQuantities[productId] || 1;
    if (currentQuantity > 1) {
      updateProductQuantity(productId, currentQuantity - 1);
    }
  };

  const addSelectedProductsToShipment = () => {
    const newItems = selectedProducts.map(product => ({
      productId: product.id, // إضافة ID المنتج
      productName: product.name,
      quantity: productQuantities[product.id] || 1,
      price: parseFloat(product.price) || 0,
      total: (productQuantities[product.id] || 1) * (parseFloat(product.price) || 0),
      isNewProduct: false
    }));

    // استبدال جميع عناصر الشحنة بالمنتجات المختارة الجديدة
    setNewShipment(prev => ({
      ...prev,
      items: newItems
    }));

    closeProductSelectionModal();
    // لا نمسح المنتجات المختارة هنا - نتركها للاستخدام المستقبلي
    success(t('productsAdded'), t('productsAddedToShipment'));
  };

  const handleAddNewProductInModal = async () => {
    try {
      const productData = {
        ...newProductInModal,
        quantity: parseInt(newProductInModal.quantity),
        price: parseFloat(newProductInModal.price),
        cost: parseFloat(newProductInModal.cost) || 0,
        createdAt: new Date()
      };

      const docRef = await addDoc(collection(db, 'products'), productData);
      const newProductWithId = { id: docRef.id, ...productData };
      
      // Add to products list
      setProducts(prev => [...prev, newProductWithId]);
      
      // Auto-select the new product
      setSelectedProducts(prev => [...prev, newProductWithId]);
      setProductQuantities(prev => ({
        ...prev,
        [docRef.id]: 1
      }));

      // إضافة المنتج الجديد للشحنة مباشرة
      const newItem = {
        productId: newProductWithId.id, // إضافة ID المنتج
        productName: newProductWithId.name,
        quantity: 1,
        price: parseFloat(newProductWithId.price) || 0,
        total: parseFloat(newProductWithId.price) || 0,
        isNewProduct: false
      };

      setNewShipment(prev => ({
        ...prev,
        items: [...prev.items, newItem]
      }));

      // Reset form
      setNewProductInModal({
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
      
      setShowAddProductInModal(false);
      success(t('productAdded'), t('productAddedAndSelected'));
    } catch (error) {
      console.error('Error adding product:', error);
      showError(t('error'), t('productAddError'));
    }
  };

  if (loading) {
    return <LoadingSpinner page="shipments" />;
  }

  return (
    <div className={` relative h-[100%] w-full ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
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
          <table className="w-full text-center">
            <thead className={`text-center ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <tr>
                <th className={`px-6 py-3 text-center text-xs font-medium uppercase tracking-wider cursor-pointer ${
                  darkMode ? 'text-gray-300' : 'text-gray-500'
                }`} onClick={() => handleSort('shipmentNumber')}>
                  <div className="flex items-center justify-center gap-2">
                    <Package size={16} />
                    {t('shipmentNumber')}
                    {sortBy === 'shipmentNumber' && (
                      sortOrder === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </div>
                </th>
                <th className={`px-6 py-3 text-center text-xs font-medium uppercase tracking-wider cursor-pointer ${
                  darkMode ? 'text-gray-300' : 'text-gray-500'
                }`} onClick={() => handleSort('supplierName')}>
                  <div className="flex items-center justify-center gap-2">
                    <User size={16} />
                    {t('supplierName')}
                    {sortBy === 'supplierName' && (
                      sortOrder === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </div>
                </th>
                <th className={`px-6 py-3 text-center text-xs font-medium uppercase tracking-wider cursor-pointer ${
                  darkMode ? 'text-gray-300' : 'text-gray-500'
                }`} onClick={() => handleSort('shipmentDate')}>
                  <div className="flex items-center justify-center gap-2">
                    <Calendar size={16} />
                    {t('shipmentDate')}
                    {sortBy === 'shipmentDate' && (
                      sortOrder === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </div>
                </th>
                <th className={`px-6 py-3 text-center text-xs font-medium uppercase tracking-wider cursor-pointer ${
                  darkMode ? 'text-gray-300' : 'text-gray-500'
                }`} onClick={() => handleSort('totalAmount')}>
                  <div className="flex items-center justify-center gap-2">
                    <Package size={16} />
                    {t('totalAmount')}
                    {sortBy === 'totalAmount' && (
                      sortOrder === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </div>
                </th>
                <th className={`px-6 py-3 text-center text-xs font-medium uppercase tracking-wider ${
                  darkMode ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  {t('actions')}
                </th>
              </tr>
            </thead>
            <tbody className={`text-center divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
              {filteredShipments.map((shipment) => (
                <tr key={shipment.id} className={`${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="text-sm font-medium">{shipment.shipmentNumber}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="text-sm">{shipment.supplierName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="text-sm">{shipment.shipmentDate}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="text-sm font-medium">{formatNumber(shipment.totalAmount)} JOD</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center">
                    <div className="flex gap-2 justify-center">
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
          <div className="fixed inset-0 w-full h-full py-4 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
            <div className={`p-6 rounded-lg w-fill-content h-full overflow-y-auto ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
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
                      placeholder={t('')}
                      className={`w-full px-3 py-2 border rounded-lg ${
                        darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                      }`}
                    />
                  </div>
                </div>
              </div>


              {/* Items Section */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-medium">{t('items')} ({newShipment.items.length})</h3>
                  <button
                    onClick={openProductSelectionModal}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
                  >
                    <Package size={16} />
                    {t('selectProducts')}
                  </button>
                </div>
                {validationErrors.items && (
                  <p className="text-red-500 text-sm mb-2">{validationErrors.items}</p>
                )}
               

                {/* Items Table */}
                <div className={`border rounded-lg overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-white'}`}>
                  {/* <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-600">
                    <h4 className="font-medium">{t('selectedItems')} ({newShipment.items.length})</h4>
                  </div> */}
                  
                  {newShipment.items.length > 0 ? (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className={`${darkMode ? 'bg-gray-500 text-white' : 'bg-gray-100'} text-center text-gray-500`}>
                            <tr>
                            <th className="px-4 py-3 text-center text-xs font-medium  dark:text-gray-400 uppercase tracking-wider">
                                {t('actions')}
                              </th>
                              <th className="px-4 py-3 text-center text-left text-xs font-medium dark:text-gray-400 uppercase tracking-wider">
                                {t('productName')}
                              </th>
                              
                              <th className="px-4 py-3 text-center text-left text-xs font-medium dark:text-gray-400 uppercase tracking-wider">
                                {t('price')}
                              </th>
                              <th className="px-4 py-3 text-center text-left text-xs font-medium dark:text-gray-400 uppercase tracking-wider">
                                {t('total')}
                              </th>
                              <th className="px-4 py-3 text-center text-left text-xs font-medium dark:text-gray-400 uppercase tracking-wider">
                                {t('quantity')}
                              </th>
                            </tr>
                          </thead>
                          <tbody className={`divide-y ${darkMode ? 'bg-gray-800 text-white' : 'divide-gray-200 text-gray-500'} text-center`}>
                            {newShipment.items.map((item, index) => (
                              <tr key={index} className={`hover:${darkMode ? 'bg-gray-600' : 'bg-gray-50'} text-center`}>
                                <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-center bg-transparent">
                                  <button
                                    onClick={() => removeItemFromShipment(index)}
                                    className="bg-transparent text-red-500 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </td>
                                <td className="px-4 py-2 whitespace-nowrap text-center">
                                  <div className="flex justify-center align-center text-center">
                                    <div>
                                      <div className="text-sm font-medium  dark:text-white">
                                        {item.productName}
                                      </div>
                                      {item.isNewProduct && (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
                                          {t('new')}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                
                                <td className="px-4 py-2 whitespace-nowrap text-sm  text-center">
                                  {formatNumber(item.price)} JOD
                                </td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-center">
                                  {formatNumber(item.total)} JOD
                                </td>
                                
                                <td className="px-4 py-2 whitespace-nowrap ">
                                  <div className="flex justify-center align-center   space-x-2">
                                    <button
                                      onClick={() => updateItemQuantity(index, Math.max(1, item.quantity - 1))}
                                      className="p-1 rounded-full bg-red-500 text-white  dark:hover:bg-gray-600"
                                      disabled={item.quantity <= 1}
                                    >
                                      <Minus size={16} />
                                    </button>
                                    <input
                                      type="number"
                                      value={item.quantity}
                                      onChange={(e) => updateItemQuantity(index, e.target.value)}
                                      className={`w-16 px-2 py-1 text-center border rounded  ${
                                        darkMode ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'
                                      }`}
                                      min="1"
                                    />
                                    <button
                                      onClick={() => updateItemQuantity(index, item.quantity + 1)}
                                      className="p-1 rounded-full bg-green-500 text-white dark:hover:bg-gray-600"
                                    >
                                      <Plus size={16} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-500'} border-t ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                            <tr>
                              <td colSpan="3" className="px-4 py-3  text-right text-sm font-medium">
                                {t('totalAmount')}:
                              </td>
                              <td className="px-2 py-3   "></td>
                              <td className="px-4 py-3 text-sm font-bold  text-center">
                                {formatNumber(newShipment.totalAmount)} JOD
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </>
                  ) : (
                    <div className="px-4 py-8 text-center">
                      <p className="py-2 text-gray-400 dark:text-gray-400">{t('noItemsSelected')}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Shipment Summary */}
              {/* <div className={`border rounded-lg p-4 mb-6 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <h3 className="font-medium mb-4">{t('shipmentSummary')}</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>{t('shipmentNumber')}:</span>
                    <span className="font-medium">{newShipment.shipmentNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('supplier')}:</span>
                    <span className="font-medium">{newShipment.supplierName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('shipmentDate')}:</span>
                    <span className="font-medium">{newShipment.shipmentDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('itemsCount')}:</span>
                    <span className="font-medium">{newShipment.items.length}</span>
                  </div>
                </div>
              </div> */}

              {/* Action Buttons */}
              <div className="flex gap-2 relative bottom-0 left-0 right-0 w-full p-4">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    clearSelectedProducts(); // مسح المنتجات المختارة عند إلغاء الشحنة
                  }}
                  className="flex-1 px-4 py-2 border rounded hover:bg-gray-100"
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={handleAddShipment}
                  className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 flex items-center justify-center gap-2"
                  disabled={!newShipment.supplierId || !newShipment.shipmentDate || !newShipment.shipmentNumber || !newShipment.items.length || loading}
                >
                  <Save size={16} />
                  {t('saveShipment')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Product Selection Modal */}
        {showProductSelectionModal && (
          <div className='fixed inset-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto'>

          
          <div className="fixed inset-0 h-full my-4 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
            <div className={`p-6 rounded-lg w-full max-w-7xl h-full max-h-[90vh] overflow-y-auto ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">{t('selectProducts')}</h2>
                <button
                  onClick={closeProductSelectionModal}
                  className="text-red-500 hover:text-gray-700 bg-transparent font-bold"
                >
                  ✕
                </button>
              </div>

              
              <div className="flex gap-4 ">

              {/* Add Product Button */}
              <div className="mb-4">
                <button
                  onClick={() => setShowAddProductInModal(true)}
                  className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2"
                  >
                  <Plus size={20} />
                  {t('addProduct')}
                </button>
              </div>
              {/* Clear All Button */}
                <div className="mb-4">
                  <button
                    onClick={clearSelectedProducts}
                    className="bg-red-500 text-white px-4 py-2 rounded text-sm hover:bg-red-600 flex items-center gap-2"
                  >
                    <Trash2 size={16} />
                    {t('clearAll')} ({selectedProducts.length})
                  </button>
                </div>
              </div>

              {/* Search and Filter Controls */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder={t('search')}
                    value={productSearchTerm}
                    onChange={(e) => setProductSearchTerm(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg ${
                      darkMode 
                        ? 'bg-gray-800 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>

                <select
                  value={productFilterCategory}
                  onChange={(e) => setProductFilterCategory(e.target.value)}
                  className={`px-4 py-2 border rounded-lg ${
                    darkMode 
                      ? 'bg-gray-800 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="all">{t('allCategories')}</option>
                  {[...new Set(products.map(p => p.category).filter(Boolean))].map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>

                <select
                  value={productFilterType}
                  onChange={(e) => setProductFilterType(e.target.value)}
                  className={`px-4 py-2 border rounded-lg ${
                    darkMode 
                      ? 'bg-gray-800 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="all">{t('allProducts')}</option>
                  <option value="selected">{t('selectedProducts')} ({selectedProducts.length})</option>
                  <option value="unselected">{t('unselectedProducts')}</option>
                </select>
              </div>
              {/* Products Table */}
              <div className={`overflow-x-auto rounded-lg shadow-lg mb-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <table className="w-full">
                  <thead className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <tr>
                      <th className={`px-6 py-3 text-center text-xs font-medium uppercase tracking-wider ${
                        darkMode ? 'text-gray-300' : 'text-gray-500'
                      }`}>
                        {t('select')}
                      </th>
                      <th className={`px-6 py-3 text-center text-xs font-medium uppercase tracking-wider ${
                        darkMode ? 'text-gray-300' : 'text-gray-500'
                      }`}>
                        {t('productName')}
                      </th>
                      <th className={`px-4 py-3 text-center text-xs font-medium uppercase tracking-wider w-48 ${
                        darkMode ? 'text-gray-300' : 'text-gray-500'
                      }`}>
                        {t('description')}
                      </th>
                      <th className={`px-6 py-3 text-center text-xs font-medium uppercase tracking-wider ${
                        darkMode ? 'text-gray-300' : 'text-gray-500'
                      }`}>
                        {t('category')}
                      </th>
                      <th className={`px-6 py-3 text-center text-xs font-medium uppercase tracking-wider ${
                        darkMode ? 'text-gray-300' : 'text-gray-500'
                      }`}>
                        {t('price')}
                      </th>
                      <th className={`px-6 py-3 text-center text-xs font-medium uppercase tracking-wider ${
                        darkMode ? 'text-gray-300' : 'text-gray-500'
                      }`}>
                        {t('available')}
                      </th>
                      <th className={`px-6 py-3 text-center text-xs font-medium uppercase tracking-wider ${
                        darkMode ? 'text-gray-300' : 'text-gray-500'
                      }`}>
                        {t('quantity')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                    {filteredProductsInModal.map((product) => {
                      const isSelected = selectedProducts.some(p => p.id === product.id);
                      const quantity = productQuantities[product.id] || 1;
                      
                      return (
                        <tr key={product.id} className={`${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
                          <td className="px-6 py-2 whitespace-nowrap text-center">
                            <button
                              onClick={() => toggleProductSelection(product)}
                              className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                                isSelected 
                                  ? 'bg-green-600 border-green-600 text-white' 
                                  : `border-gray-300 ${darkMode ? 'hover:border-gray-500' : 'hover:border-gray-400'}`
                              }`}
                            >
                              {isSelected && <Check size={14} />}
                            </button>
                          </td>
                          <td className="px-6 py-2 whitespace-nowrap text-center">
                            <div className="text-sm font-medium">{product.name}</div>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <div 
                              className="text-sm w-48 truncate cursor-help" 
                              title={product.description}
                            >
                              {product.description}
                            </div>
                          </td>
                          <td className="px-6 py-2 whitespace-nowrap text-center">
                            <div className="text-sm">{product.category}</div>
                          </td>
                          <td className="px-6 py-2 whitespace-nowrap text-center">
                            <div className="text-sm">{product.price} JOD</div>
                          </td>
                          <td className="px-6 py-2 whitespace-nowrap text-center">
                            <span className={`text-sm font-medium ${
                              parseInt(product.quantity) > 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {parseInt(product.quantity) > 0 ? t('available') : t('unavailable')}
                            </span>
                          </td>
                          <td className="px-6 py-2 whitespace-nowrap text-center">
                            {isSelected && (
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => decreaseQuantity(product.id)}
                                  className="bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-red-600"
                                  disabled={quantity <= 1}
                                >
                                  <Minus size={14} />
                                </button>
                                <input
                                  type="number"
                                  value={quantity}
                                  onChange={(e) => updateProductQuantity(product.id, e.target.value)}
                                  className={`w-16 px-2 py-1 border rounded text-center ${
                                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                                  }`}
                                  min="1"
                                />
                                <button
                                  onClick={() => increaseQuantity(product.id)}
                                  className="bg-green-500 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-green-600"
                                >
                                  <Plus size={14} />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {filteredProductsInModal.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-xl text-gray-500">{t('noProducts')}</p>
                  </div>
                )}
              </div>


              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={closeProductSelectionModal}
                  className="flex-1 px-4 py-2 border rounded hover:bg-gray-100"
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={addSelectedProductsToShipment}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center justify-center gap-2"
                  disabled={selectedProducts.length === 0}
                >
                  <Check size={16} />
                  {t('addSelectedProducts')} ({selectedProducts.length})
                </button>
              </div>
            </div>

{/* Add Product in Modal */}
        {showAddProductInModal && (
          <div className="fixed inset-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center z-[70]">
            <div className={`p-6 rounded-lg w-full max-w-md ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">{t('addProduct')}</h2>
                <button
                  onClick={() => {
                    setShowAddProductInModal(false);
                    setNewProductInModal({
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
                  }}
                  className="text-gray-500 hover:text-gray-700 text-2xl bg-transparent"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder={t('productName')}
                  value={newProductInModal.name}
                  onChange={(e) => setNewProductInModal({...newProductInModal, name: e.target.value})}
                  className={`w-full px-3 py-2 border rounded ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                />
                <textarea
                  placeholder={t('description')}
                  value={newProductInModal.description}
                  onChange={(e) => setNewProductInModal({...newProductInModal, description: e.target.value})}
                  className={`w-full px-3 py-2 border rounded ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                  rows="3"
                />
                <input
                  type="text"
                  placeholder={t('category')}
                  value={newProductInModal.category}
                  onChange={(e) => setNewProductInModal({...newProductInModal, category: e.target.value})}
                  className={`w-full px-3 py-2 border rounded ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                  list="modalCategories"
                />
                <datalist id="modalCategories">
                  {[...new Set(products.map(p => p.category).filter(Boolean))].map((category) => (
                    <option key={category} value={category} />
                  ))}
                </datalist>
                <input
                  type="text"
                  placeholder={t('partNumber')}
                  value={newProductInModal.partNumber}
                  onChange={(e) => setNewProductInModal({...newProductInModal, partNumber: e.target.value})}
                  className={`w-full px-3 py-2 border rounded ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                />
                <input
                  type="text"
                  placeholder={t('brandName')}
                  value={newProductInModal.brandName}
                  onChange={(e) => setNewProductInModal({...newProductInModal, brandName: e.target.value})}
                  className={`w-full px-3 py-2 border rounded ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                />
                <input
                  type="text"
                  placeholder={t('storageLocation')}
                  value={newProductInModal.storageLocation}
                  onChange={(e) => setNewProductInModal({...newProductInModal, storageLocation: e.target.value})}
                  className={`w-full px-3 py-2 border rounded ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                />
                <input
                  type="number"
                  placeholder={t('quantity')}
                  value={newProductInModal.quantity}
                  onChange={(e) => setNewProductInModal({...newProductInModal, quantity: e.target.value})}
                  className={`w-full px-3 py-2 border rounded ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder={t('cost')}
                  value={newProductInModal.cost}
                  onChange={(e) => setNewProductInModal({...newProductInModal, cost: e.target.value})}
                  className={`w-full px-3 py-2 border rounded ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder={t('price')}
                  value={newProductInModal.price}
                  onChange={(e) => setNewProductInModal({...newProductInModal, price: e.target.value})}
                  className={`w-full px-3 py-2 border rounded ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                />
              </div>
              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => {
                    setShowAddProductInModal(false);
                    setNewProductInModal({
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
                  }}
                  className="flex-1 px-4 py-2 border rounded hover:bg-gray-100"
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={handleAddNewProductInModal}
                  className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
                  disabled={!newProductInModal.name || !newProductInModal.category || !newProductInModal.quantity || !newProductInModal.price}
                >
                  {t('save')}
                </button>
              </div>
            </div>
          </div>
        )}

          </div>
          </div>
        )}

        

        {/* View Shipment Modal */}
        {showViewModal && viewingShipment && (
          <div className="fixed inset-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
            <div className={`p-6 rounded-lg max-w-4xl overflow-y-auto ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
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
                        <th className="px-3 py-2 text-center  text-sm font-semibold">{t('productName')}</th>
                        <th className="px-3 py-2 text-center text-sm font-semibold">{t('quantity')}</th>
                        <th className="px-3 py-2 text-center text-sm font-semibold">{t('unitPrice')}</th>
                        <th className="px-3 py-2 text-center text-sm font-semibold">{t('amount')}</th>
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
