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
  FileText,
  User,
  Package,
  Calculator,
  Save
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
import ProductSelectionModal from './ProductSelectionModal';

const Invoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [availableServices, setAvailableServices] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('invoiceNumber');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState(null);
  const [showProductSelectionModal, setShowProductSelectionModal] = useState(false);
  const { t, i18n } = useTranslation();
  const { darkMode } = useTheme();
  const { success, error: showError } = useNotifications();

  const [newInvoice, setNewInvoice] = useState({
    invoiceNumber: '',
    customerId: '',
    customerName: '',
    carType: '',
    carNumber: '',
    phone: '',
    products: [],
    services: [],
    discount: 0,
    discountType: 'fixedAmount', // 'fixedAmount' or 'percentage'
    totalAmount: 0,
    finalAmount: 0,
    paymentMethod: 'cash', // 'cash' or 'visa'
    invoiceDate: new Date().toISOString().split('T')[0]
  });

  const [newProduct, setNewProduct] = useState({
    productId: '',
    productName: '',
    quantity: 1,
    price: 0,
    total: 0,
    maxQuantity: 0
  });

  const [newService, setNewService] = useState({
    serviceId: '',
    serviceName: '',
    price: 0
  });

  // New customer form state
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    customerName: '',
    carType: '',
    carNumber: '',
    phone: ''
  });

  useEffect(() => {
    fetchInvoices();
    fetchCustomers();
    fetchProducts();
    fetchServices();
  }, []);

  useEffect(() => {
    filterAndSortInvoices();
  }, [invoices, searchTerm, sortBy, sortOrder]);

  useEffect(() => {
    calculateInvoiceTotal();
  }, [newInvoice.products, newInvoice.services, newInvoice.discount, newInvoice.discountType]);

  const fetchInvoices = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'invoices'));
      const invoicesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setInvoices(invoicesData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'customers'));
      const customersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCustomers(customersData);
    } catch (error) {
      console.error('Error fetching customers:', error);
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

  const fetchServices = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'services'));
      const servicesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAvailableServices(servicesData);
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  const filterAndSortInvoices = () => {
    let filtered = invoices;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(invoice =>
        invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.carNumber.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort invoices
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'invoiceNumber':
          aValue = a.invoiceNumber.toLowerCase();
          bValue = b.invoiceNumber.toLowerCase();
          break;
        case 'customerName':
          aValue = a.customerName.toLowerCase();
          bValue = b.customerName.toLowerCase();
          break;
        case 'invoiceDate':
          aValue = new Date(a.invoiceDate);
          bValue = new Date(b.invoiceDate);
          break;
        case 'finalAmount':
          aValue = parseFloat(a.finalAmount) || 0;
          bValue = parseFloat(b.finalAmount) || 0;
          break;
        default:
          aValue = a.invoiceNumber.toLowerCase();
          bValue = b.invoiceNumber.toLowerCase();
          break;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredInvoices(filtered);
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const calculateInvoiceTotal = () => {
    const productsTotal = newInvoice.products.reduce((sum, product) => sum + (parseFloat(product.total) || 0), 0);
    const servicesTotal = newInvoice.services.reduce((sum, service) => sum + (parseFloat(service.price) || 0), 0);
    const totalAmount = Math.round((productsTotal + servicesTotal) * 100) / 100;
    const discount = parseFloat(newInvoice.discount) || 0;
    
    let finalAmount;
    if (newInvoice.discountType === 'percentage') {
      finalAmount = Math.round((totalAmount - (totalAmount * discount / 100)) * 100) / 100;
    } else {
      finalAmount = Math.round((totalAmount - discount) * 100) / 100;
    }

    setNewInvoice(prev => ({
      ...prev,
      totalAmount,
      finalAmount
    }));
  };

  const handleCustomerSelect = (customerId) => {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      setNewInvoice(prev => ({
        ...prev,
        customerId: customer.id,
        customerName: customer.customerName,
        carType: customer.carType,
        carNumber: customer.carNumber,
        phone: customer.phone
      }));
    }
  };

  const handleProductSelect = (productId) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      setNewProduct({
        productId: product.id,
        productName: product.name,
        quantity: 1,
        price: parseFloat(product.price) || 0,
        total: parseFloat(product.price) || 0,
        maxQuantity: parseInt(product.quantity) || 0
      });
    }
  };

  const handleServiceSelect = (serviceId) => {
    const service = availableServices.find(s => s.id === serviceId);
    if (service) {
      setNewService({
        serviceId: service.id,
        serviceName: service.name,
        price: parseFloat(service.price) || 0
      });
    }
  };

  const handleProductSelectionFromModal = (product) => {
    // Check if product is already in the invoice
    const existingProduct = newInvoice.products.find(p => p.productId === product.id);
    if (existingProduct) {
      showError(t('error'), t('productAlreadyAdded'));
      return;
    }

    const productToAdd = {
      productId: product.id,
      productName: product.name,
      quantity: 1,
      price: parseFloat(product.price) || 0,
      total: parseFloat(product.price) || 0,
      maxQuantity: parseInt(product.quantity) || 0
    };

    setNewInvoice(prev => ({
      ...prev,
      products: [...prev.products, productToAdd]
    }));
    
    setShowProductSelectionModal(false);
  };

  const addProductToInvoice = () => {
    if (!newProduct.productId || !newProduct.productName) {
      showError(t('error'), t('selectProductRequired'));
      return;
    }
    
    if (!newProduct.quantity || newProduct.quantity <= 0) {
      showError(t('error'), t('enterValidQuantity'));
      return;
    }
    
    if (newProduct.quantity > newProduct.maxQuantity) {
      showError(t('error'), `الكمية المطلوبة (${newProduct.quantity}) أكبر من الكمية المتوفرة (${newProduct.maxQuantity})`);
      return;
    }
    
    if (newProduct.quantity <= newProduct.maxQuantity) {
      setNewInvoice(prev => ({
        ...prev,
        products: [...prev.products, { ...newProduct }]
      }));
      setNewProduct({
        productId: '',
        productName: '',
        quantity: 1,
        price: 0,
        total: 0,
        maxQuantity: 0
      });
    }
  };

  const removeProductFromInvoice = (index) => {
    setNewInvoice(prev => ({
      ...prev,
      products: prev.products.filter((_, i) => i !== index)
    }));
  };

  const addServiceToInvoice = () => {
    if (!newService.serviceId || !newService.serviceName) {
      showError(t('error'), t('selectServiceRequired'));
      return;
    }
    
    if (!newService.price || newService.price <= 0) {
      showError(t('error'), t('enterValidServicePrice'));
      return;
    }
    
    // Check if service already exists in the invoice
    const existingService = newInvoice.services.find(s => s.serviceId === newService.serviceId);
    if (existingService) {
      showError(t('error'), t('serviceAlreadyAdded'));
      return;
    }
    
    setNewInvoice(prev => ({
      ...prev,
      services: [...prev.services, { ...newService }]
    }));
    setNewService({
      serviceId: '',
      serviceName: '',
      price: 0
    });
  };

  const removeServiceFromInvoice = (index) => {
    setNewInvoice(prev => ({
      ...prev,
      services: prev.services.filter((_, i) => i !== index)
    }));
  };

  const updateProductQuantity = (index, quantity) => {
    const updatedProducts = [...newInvoice.products];
    const newQuantity = parseInt(quantity) || 0;
    const maxQuantity = updatedProducts[index].maxQuantity;
    
    if (newQuantity <= maxQuantity) {
      updatedProducts[index].quantity = newQuantity;
      updatedProducts[index].total = updatedProducts[index].quantity * updatedProducts[index].price;
      
      setNewInvoice(prev => ({
        ...prev,
        products: updatedProducts
      }));
    } else {
      showError(t('error'), `الكمية المطلوبة (${newQuantity}) أكبر من الكمية المتوفرة (${maxQuantity})`);
    }
  };

  const generateInvoiceNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `INV-${year}${month}${day}-${random}`;
  };

  // Helper function to format decimal numbers
  const formatNumber = (number) => {
    const rounded = Math.round(parseFloat(number) * 100) / 100;
    return rounded % 1 === 0 ? rounded.toString() : rounded.toFixed(2);
  };

  const handleAddNewCustomer = async () => {
    // Validation for new customer
    if (!newCustomer.customerName || newCustomer.customerName.trim() === '') {
      showError(t('error'), t('enterCustomerName'));
      return;
    }
    
    if (!newCustomer.carType || newCustomer.carType.trim() === '') {
      showError(t('error'), t('enterCarType'));
      return;
    }
    
    if (!newCustomer.carNumber || newCustomer.carNumber.trim() === '') {
      showError(t('error'), t('enterCarNumber'));
      return;
    }
    
    if (!newCustomer.phone || newCustomer.phone.trim() === '') {
      showError(t('error'), t('enterPhoneNumber'));
      return;
    }

    try {
      const customerData = {
        ...newCustomer,
        createdAt: new Date()
      };

      const customerRef = await addDoc(collection(db, 'customers'), customerData);
      
      // Add the new customer to the local state
      const newCustomerWithId = {
        id: customerRef.id,
        ...customerData
      };
      setCustomers(prev => [...prev, newCustomerWithId]);
      
      // Select the new customer in the invoice
      setNewInvoice(prev => ({
        ...prev,
        customerId: customerRef.id,
        customerName: newCustomer.customerName,
        carType: newCustomer.carType,
        carNumber: newCustomer.carNumber,
        phone: newCustomer.phone
      }));

      // Reset new customer form
      setNewCustomer({
        customerName: '',
        carType: '',
        carNumber: '',
        phone: ''
      });
      setShowNewCustomerForm(false);
      
      success(t('customerAdded'), t('customerAddedMessage'));
    } catch (error) {
      console.error('Error adding customer:', error);
      showError(t('error'), t('customerAddError'));
    }
  };

  const handleAddInvoice = async () => {
    // Validation checks
    if (!newInvoice.customerId || !newInvoice.customerName) {
      showError(t('error'), t('selectCustomerRequired'));
      return;
    }

    if (newInvoice.products.length === 0 && newInvoice.services.length === 0) {
      showError(t('error'), t('addProductOrServiceRequired'));
      return;
    }

    if (newInvoice.products.length === 0 && newInvoice.services.length === 0) {
      showError(t('error'), t('atLeastOneItemRequired'));
      return;
    }

    // Check if any product has invalid quantity
    for (const product of newInvoice.products) {
      if (!product.quantity || product.quantity <= 0) {
        showError(t('error'), t('invalidProductQuantity'));
        return;
      }
    }

    // Check if any service has invalid price
    for (const service of newInvoice.services) {
      if (!service.serviceName || !service.price || service.price <= 0) {
        showError(t('error'), t('invalidServiceData'));
        return;
      }
    }

    try {
      const invoiceData = {
        ...newInvoice,
        invoiceNumber: newInvoice.invoiceNumber || generateInvoiceNumber(),
        createdAt: new Date()
      };

      // Create batch for updating inventory
      const batch = writeBatch(db);

      // Add invoice
      const invoiceRef = await addDoc(collection(db, 'invoices'), invoiceData);

      // Update product quantities
      for (const product of newInvoice.products) {
        const productRef = doc(db, 'products', product.productId);
        const productDoc = products.find(p => p.id === product.productId);
        if (productDoc) {
          const newQuantity = (parseInt(productDoc.quantity) || 0) - product.quantity;
          batch.update(productRef, { quantity: Math.max(0, newQuantity) });
        }
      }

      // Commit batch
      await batch.commit();

      setShowAddModal(false);
      setNewInvoice({
        invoiceNumber: '',
        customerId: '',
        customerName: '',
        carType: '',
        carNumber: '',
        phone: '',
        products: [],
        services: [],
        discount: 0,
        discountType: 'fixedAmount',
        totalAmount: 0,
        finalAmount: 0,
        paymentMethod: 'cash',
        invoiceDate: new Date().toISOString().split('T')[0]
      });
      
      fetchInvoices();
      fetchProducts(); // Refresh products to show updated quantities
      success(t('invoiceAdded'), t('invoiceAddedMessage'));
    } catch (error) {
      console.error('Error adding invoice:', error);
      showError(t('error'), t('invoiceAddError'));
    }
  };

  const handleDeleteInvoice = async (invoiceId) => {
    try {
      // Find the invoice to get its products
      const invoiceToDelete = invoices.find(invoice => invoice.id === invoiceId);
      
      if (!invoiceToDelete) {
        showError(t('error'), t('invoiceNotFound'));
        return;
      }

      // Create batch for atomic operations
      const batch = writeBatch(db);

      // Return products quantities to inventory
      if (invoiceToDelete.products && invoiceToDelete.products.length > 0) {
        for (const invoiceProduct of invoiceToDelete.products) {
          if (invoiceProduct.productId) {
            // Find the current product in inventory
            const currentProduct = products.find(p => p.id === invoiceProduct.productId);
            
            if (currentProduct) {
              // Calculate new quantity (add back the sold quantity)
              const newQuantity = (currentProduct.quantity || 0) + (invoiceProduct.quantity || 0);
              
              // Update product quantity in batch
              const productRef = doc(db, 'products', invoiceProduct.productId);
              batch.update(productRef, {
                quantity: newQuantity,
                available: newQuantity > 0
              });
            }
          }
        }
      }

      // Delete the invoice
      const invoiceRef = doc(db, 'invoices', invoiceId);
      batch.delete(invoiceRef);

      // Commit all changes
      await batch.commit();

      // Refresh data
      fetchInvoices();
      fetchProducts(); // Refresh products to show updated quantities
      success(t('invoiceDeleted'), t('invoiceDeletedMessage'));
    } catch (error) {
      console.error('Error deleting invoice:', error);
      showError(t('error'), t('invoiceDeleteError'));
    }
  };

  const openDeleteModal = (invoice) => {
    setInvoiceToDelete(invoice);
    setShowDeleteModal(true);
  };

  const openEditModal = (invoice) => {
    setEditingInvoice(invoice);
    setShowEditModal(true);
  };

  if (loading) {
    return <LoadingSpinner page="invoices" />;
  }

  return (
    <div className={`h-[100%] w-full ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-4">{t('invoices')}</h1>
          
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
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2 w-[20%]"
            >
              <Plus size={20} />
              {t('addInvoice')}
            </button>
          </div>
        </div>

        {/* Invoices Table */}
        <div className={`overflow-x-auto rounded-lg shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <table className="w-full">
            <thead className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <tr>
                <th className={`px-6 py-3 text-center text-xs font-medium uppercase tracking-wider cursor-pointer ${
                  darkMode ? 'text-gray-300' : 'text-gray-500'
                }`} onClick={() => handleSort('invoiceNumber')}>
                  <div className="flex items-center justify-center gap-2">
                    <FileText size={16} />
                    {t('invoiceNumber')}
                    {sortBy === 'invoiceNumber' && (
                      sortOrder === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </div>
                </th>
                <th className={`px-6 py-3 text-center text-xs font-medium uppercase tracking-wider cursor-pointer ${
                  darkMode ? 'text-gray-300' : 'text-gray-500'
                }`} onClick={() => handleSort('customerName')}>
                  <div className="flex items-center justify-center gap-2">
                    <User size={16} />
                    {t('customerName')}
                    {sortBy === 'customerName' && (
                      sortOrder === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </div>
                </th>
                <th className={`px-6 py-3 text-center text-xs font-medium uppercase tracking-wider ${
                  darkMode ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  {t('carNumber')}
                </th>
                <th className={`px-6 py-3 text-center text-xs font-medium uppercase tracking-wider cursor-pointer ${
                  darkMode ? 'text-gray-300' : 'text-gray-500'
                }`} onClick={() => handleSort('invoiceDate')}>
                  <div className="flex items-center justify-center gap-2">
                    <FileText size={16} />
                    {t('invoiceDate')}
                    {sortBy === 'invoiceDate' && (
                      sortOrder === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </div>
                </th>
                <th className={`px-6 py-3 text-center text-xs font-medium uppercase tracking-wider cursor-pointer ${
                  darkMode ? 'text-gray-300' : 'text-gray-500'
                }`} onClick={() => handleSort('finalAmount')}>
                  <div className="flex items-center justify-center gap-2">
                    <Calculator size={16} />
                    {t('finalAmount')}
                    {sortBy === 'finalAmount' && (
                      sortOrder === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </div>
                </th>
                <th className={`px-6 py-3 text-center text-xs font-medium uppercase tracking-wider ${
                  darkMode ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  {t('paymentMethod')}
                </th>
                <th className={`px-6 py-3 text-center text-xs font-medium uppercase tracking-wider ${
                  darkMode ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  {t('actions')}
                </th>
              </tr>
            </thead>
            <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
              {filteredInvoices.map((invoice) => (
                <tr key={invoice.id} className={`${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="text-sm font-medium">{invoice.invoiceNumber}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="text-sm">{invoice.customerName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="text-sm">{invoice.carNumber}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="text-sm">{invoice.invoiceDate}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="text-sm font-medium">{formatNumber(invoice.finalAmount)} JOD</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        invoice.paymentMethod === 'cash' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {invoice.paymentMethod === 'cash' ? t('cash') : t('visa')}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center">
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => openEditModal(invoice)}
                        className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-xs"
                      >
                        <Edit size={14} className="inline mr-1" />
                        {t('viewInvoice')}
                      </button>
                      <button
                        onClick={() => openDeleteModal(invoice)}
                        className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-xs"
                      >
                                                <Trash2 size={14} className="inline mr-1" />
                        {t('deleteInvoice')}
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredInvoices.length === 0 && (
            <div className="text-center py-12">
              <p className="text-xl text-gray-500">{t('noInvoices')}</p>
            </div>
          )}
        </div>

        {/* Add Invoice Modal */}
        {showAddModal && (
          <div className="fixed inset-0 w-full h-full py-4 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
            <div className={`p-6 rounded-lg max-w-4xl h-full overflow-y-auto ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <h2 className="text-xl font-bold mb-4">{t('addInvoice')}</h2>
              
              {/* Customer Information */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">{t('customerInfo')}</h3>
                  <button
                    type="button"
                    onClick={() => setShowNewCustomerForm(true)}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm"
                  >
                    <Plus size={16} />
                    {t('addNewCustomer')}
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">{t('selectCustomer')}</label>
                    <select
                      value={newInvoice.customerId}
                      onChange={(e) => handleCustomerSelect(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg ${
                        darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                      }`}
                    >
                      <option value="">{t('selectCustomer')}</option>
                      {customers.map((customer) => (
                        <option key={customer.id} value={customer.id}>
                          {customer.customerName} - {customer.carNumber}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">{t('invoiceDate')}</label>
                    <input
                      type="date"
                      value={newInvoice.invoiceDate}
                      onChange={(e) => setNewInvoice({...newInvoice, invoiceDate: e.target.value})}
                      className={`w-full px-3 py-2 border rounded-lg ${
                        darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Customer Details Display */}
              {newInvoice.customerName && (
                <div className={`p-4 rounded-lg mb-6 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <h3 className="font-medium mb-2">{t('customerDetails')}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div><strong>{t('customerName')}:</strong> {newInvoice.customerName}</div>
                    <div><strong>{t('carType')}:</strong> {newInvoice.carType}</div>
                    <div><strong>{t('carNumber')}:</strong> {newInvoice.carNumber}</div>
                    <div><strong>{t('phone')}:</strong> {newInvoice.phone}</div>
                  </div>
                </div>
              )}

              {/* Products Section */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium">{t('products')}</h3>
                  <button
                    type="button"
                    onClick={() => setShowProductSelectionModal(true)}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm"
                  >
                    <Package size={16} />
                    {t('browseProducts')}
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-4">
                  <select
                    value={newProduct.productId}
                    onChange={(e) => handleProductSelect(e.target.value)}
                    className={`px-3 py-2 border rounded ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                    }`}
                  >
                    <option value="">{t('selectProduct')}</option>
                    {products.filter(p => p.quantity > 0).map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} - {product.price} JOD (Stock: {product.quantity})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    placeholder={t('quantity')}
                    value={newProduct.quantity}
                    min="1"
                    max={newProduct.maxQuantity}
                    onChange={(e) => {
                      const quantity = parseInt(e.target.value) || 0;
                      setNewProduct({
                        ...newProduct,
                        quantity,
                        total: quantity * newProduct.price
                      });
                    }}
                    className={`px-3 py-2 border rounded ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                    }`}
                  />
                  {newProduct.maxQuantity > 0 && (
                    <div className="text-xs text-gray-500 col-span-4">
                      الكمية المتوفرة: {newProduct.maxQuantity}
                    </div>
                  )}
                  <input
                    type="number"
                    placeholder={t('price')}
                    value={newProduct.price}
                    onChange={(e) => {
                      const price = parseFloat(e.target.value) || 0;
                      setNewProduct({
                        ...newProduct,
                        price,
                        total: newProduct.quantity * price
                      });
                    }}
                    className={`px-3 py-2 border rounded ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                    }`}
                  />
                  <button
                    onClick={addProductToInvoice}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                  >
                    {t('addProduct')}
                  </button>
                </div>

                {/* Products List */}
                {newInvoice.products.length > 0 && (
                  <div className={`border rounded-lg p-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <h4 className="font-medium mb-2">{t('selectedProducts')}</h4>
                    {newInvoice.products.map((product, index) => (
                      <div key={index} className="flex justify-between items-center py-2 border-b last:border-b-0">
                        <span>{product.productName}</span>
                        <div className="flex items-center gap-4">
                          <input
                            type="number"
                            value={product.quantity}
                            onChange={(e) => updateProductQuantity(index, e.target.value)}
                            className={`w-20 px-2 py-1 border rounded ${
                              darkMode ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'
                            }`}
                          />
                          <span>{formatNumber(product.price)} JOD</span>
                          <span className="font-medium">{formatNumber(product.total)} JOD</span>
                          <button
                            onClick={() => removeProductFromInvoice(index)}
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

              {/* Services Section */}
              <div className="mb-6">
                <h3 className="font-medium mb-4">{t('services')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
                  <select
                    value={newService.serviceId}
                    onChange={(e) => handleServiceSelect(e.target.value)}
                    className={`px-3 py-2 border rounded ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                    }`}
                  >
                    <option value="">{t('selectService')}</option>
                    {availableServices.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name} - {service.price} JOD
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    placeholder={t('servicePrice')}
                    value={newService.price}
                    onChange={(e) => setNewService({...newService, price: parseFloat(e.target.value) || 0})}
                    className={`px-3 py-2 border rounded ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                    }`}
                  />
                  <button
                    onClick={addServiceToInvoice}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    {t('addService')}
                  </button>
                </div>

                {/* Services List */}
                {newInvoice.services.length > 0 && (
                  <div className={`border rounded-lg p-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <h4 className="font-medium mb-2">{t('selectedServices')}</h4>
                    {newInvoice.services.map((service, index) => (
                      <div key={index} className="flex justify-between items-center py-2 border-b last:border-b-0">
                        <span>{service.serviceName}</span>
                        <div className="flex items-center gap-4">
                          <span>{formatNumber(service.price)} JOD</span>
                          <button
                            onClick={() => removeServiceFromInvoice(index)}
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

              {/* Payment and Discount Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Discount Section */}
                <div className={`border rounded-lg p-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <h3 className="font-medium mb-4">{t('discount')}</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">{t('discountType')}</label>
                      <select
                        value={newInvoice.discountType}
                        onChange={(e) => setNewInvoice({...newInvoice, discountType: e.target.value})}
                        className={`w-full px-3 py-2 border rounded-lg ${
                          darkMode ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'
                        }`}
                      >
                        <option value="fixedAmount">{t('fixedAmount')}</option>
                        <option value="percentage">{t('percentage')}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        {newInvoice.discountType === 'percentage' ? t('discountPercentage') : t('discountAmount')}
                      </label>
                      <input
                        type="number"
                        step={newInvoice.discountType === 'percentage' ? '1' : '0.01'}
                        value={newInvoice.discount}
                        onChange={(e) => setNewInvoice({...newInvoice, discount: parseFloat(e.target.value) || 0})}
                        className={`w-full px-3 py-2 border rounded-lg ${
                          darkMode ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'
                        }`}
                        placeholder={newInvoice.discountType === 'percentage' ? '0-100' : '0.00'}
                      />
                    </div>
                  </div>
                </div>

                {/* Payment Method Section */}
                <div className={`border rounded-lg p-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <h3 className="font-medium mb-4">{t('paymentMethod')}</h3>
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="cash"
                        checked={newInvoice.paymentMethod === 'cash'}
                        onChange={(e) => setNewInvoice({...newInvoice, paymentMethod: e.target.value})}
                        className="mr-3"
                      />
                      <span className="text-sm">{t('cash')}</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="visa"
                        checked={newInvoice.paymentMethod === 'visa'}
                        onChange={(e) => setNewInvoice({...newInvoice, paymentMethod: e.target.value})}
                        className="mr-3"
                      />
                      <span className="text-sm">{t('visa')}</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Invoice Summary */}
              <div className={`border rounded-lg p-4 mb-6 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <h3 className="font-medium mb-4">{t('invoiceSummary')}</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>{t('subtotal')}:</span>
                    <span>{formatNumber(newInvoice.totalAmount)} JOD</span>
                  </div>
                  {newInvoice.discount > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>{t('discount')}:</span>
                      <span>
                        {newInvoice.discountType === 'percentage' 
                          ? `${newInvoice.discount}% (-${formatNumber(newInvoice.totalAmount * newInvoice.discount / 100)} JOD)`
                          : `-${formatNumber(newInvoice.discount)} JOD`
                        }
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>{t('finalAmount')}:</span>
                    <span>{formatNumber(newInvoice.finalAmount)} JOD</span>
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
                  onClick={handleAddInvoice}
                  className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 flex items-center justify-center gap-2"
                  disabled={!newInvoice.customerId || !newInvoice.customerName || !newInvoice.carType || !newInvoice.carNumber || !newInvoice.phone || (newInvoice.products.length ===0 && newInvoice.services.length ===0) || loading}
                >
                  <Save size={16} />
                  {t('saveInvoice')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View Invoice Modal */}
        {showEditModal && editingInvoice && (
          <div className="fixed inset-0 w-full h-full py-4 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
            <div className={`p-6 rounded-lg my-4 max-w-4xl h-full overflow-y-auto ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              {/* Compact Invoice Header */}
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold text-indigo-600 mb-1">{t('invoiceHeader')}</h1>
                <div className="text-sm text-gray-500">Auto Parts Store</div>
              </div>

              {/* Compact Invoice Information */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className={`p-3 rounded border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="text-xs text-gray-500 mb-1">{t('invoiceNumber')}</div>
                  <div className="font-semibold">{editingInvoice.invoiceNumber}</div>
                </div>
                <div className={`p-3 rounded border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="text-xs text-gray-500 mb-1">{t('invoiceDate')}</div>
                  <div className="font-semibold">{editingInvoice.invoiceDate}</div>
                </div>
                <div className={`p-3 rounded border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="text-xs text-gray-500 mb-1">{t('paymentMethod')}</div>
                  <div className="font-semibold">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      editingInvoice.paymentMethod === 'cash' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {editingInvoice.paymentMethod === 'cash' ? t('cash') : t('visa')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Compact Customer Information */}
              <div className={`p-3 rounded border mb-6 ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                <div className="text-xs text-gray-500 mb-2">{t('customerInfo')}</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div><span className="font-medium">{t('customerName')}:</span> {editingInvoice.customerName}</div>
                  <div><span className="font-medium">{t('carType')}:</span> {editingInvoice.carType}</div>
                  <div><span className="font-medium">{t('carNumber')}:</span> {editingInvoice.carNumber}</div>
                  <div><span className="font-medium">{t('phone')}:</span> {editingInvoice.phone}</div>
                </div>
              </div>

              {/* Invoice Items Table */}
              <div className={`rounded border mb-6 ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                <div className="p-3 border-b border-gray-200">
                  <h3 className="font-semibold">{t('invoiceItems')}</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className={`${darkMode ? 'bg-gray-600' : 'bg-gray-100'}`}>
                      <tr>
                        <th className="px-3 py-2 text-center text-sm font-semibold">{t('itemDescription')}</th>
                        <th className="px-3 py-2 text-center text-sm font-semibold">{t('quantity')}</th>
                        <th className="px-3 py-2 text-center text-sm font-semibold">{t('unitPrice')}</th>
                        <th className="px-3 py-2 text-center text-sm font-semibold">{t('amount')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {/* Products */}
                      {editingInvoice.products.map((product, index) => (
                        <tr key={`product-${index}`} className={`${darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-50'}`}>
                          <td className="px-3 py-2">
                            <div className="font-medium text-sm">{product.productName}</div>
                          </td>
                          <td className="px-3 py-2 text-center text-sm">{product.quantity}</td>
                          <td className="px-3 py-2 text-right text-sm">{formatNumber(product.price)} JOD</td>
                          <td className="px-3 py-2 text-right text-sm font-semibold">{formatNumber(product.total)} JOD</td>
                        </tr>
                      ))}
                      
                      {/* Services */}
                      {editingInvoice.services.map((service, index) => (
                        <tr key={`service-${index}`} className={`${darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-50'}`}>
                          <td className="px-3 py-2">
                            <div className="font-medium text-sm">{service.serviceName}</div>
                          </td>
                          <td className="px-3 py-2 text-center text-sm">1</td>
                          <td className="px-3 py-2 text-right text-sm">{formatNumber(service.price)} JOD</td>
                          <td className="px-3 py-2 text-right text-sm font-semibold">{formatNumber(service.price)} JOD</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Compact Invoice Summary */}
              <div className={`p-4 rounded border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{t('subtotal')}:</span>
                    <span className="font-semibold">{formatNumber(editingInvoice.totalAmount)} JOD</span>
                  </div>
                  {editingInvoice.discount > 0 && (
                    <div className="flex justify-between text-sm text-red-600">
                      <span>{t('discount')}:</span>
                      <span className="font-semibold">
                        {editingInvoice.discountType === 'percentage' 
                          ? `${editingInvoice.discount}% (-${formatNumber(editingInvoice.totalAmount * editingInvoice.discount / 100)} JOD)`
                          : `-${formatNumber(editingInvoice.discount)} JOD`
                        }
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>{t('grandTotal')}:</span>
                    <span className="text-indigo-600">{formatNumber(editingInvoice.finalAmount)} JOD</span>
                  </div>
                </div>
              </div>

              {/* Thank You Message */}
              <div className="text-center mt-4 py-2">
                <p className="text-gray-600 italic text-sm">{t('thankYou')}</p>
              </div>

              <div className="mt-6">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="w-full px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 font-semibold"
                >
                  {t('close')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add New Customer Modal */}
        {showNewCustomerForm && (
          <div className="fixed inset-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className={`p-6 rounded-lg w-full max-w-md ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <h2 className="text-xl font-bold mb-4">{t('addNewCustomer')}</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">{t('customerName')}</label>
                  <input
                    type="text"
                    value={newCustomer.customerName}
                    onChange={(e) => setNewCustomer({...newCustomer, customerName: e.target.value})}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                    }`}
                    placeholder={t('customerName')}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">{t('carType')}</label>
                  <input
                    type="text"
                    value={newCustomer.carType}
                    onChange={(e) => setNewCustomer({...newCustomer, carType: e.target.value})}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                    }`}
                    placeholder={t('carType')}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">{t('carNumber')}</label>
                  <input
                    type="text"
                    value={newCustomer.carNumber}
                    onChange={(e) => setNewCustomer({...newCustomer, carNumber: e.target.value})}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                    }`}
                    placeholder={t('carNumber')}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">{t('phone')}</label>
                  <input
                    type="text"
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                    }`}
                    placeholder={t('phone')}
                  />
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => setShowNewCustomerForm(false)}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-100"
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={handleAddNewCustomer}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                >
                  {t('save')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <ConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={() => handleDeleteInvoice(invoiceToDelete?.id)}
          title={t('deleteConfirmation')}
          message={t('confirmDeleteInvoice')}
          confirmText="delete"
          cancelText="cancel"
          type="danger"
        />

        {/* Product Selection Modal */}
        <ProductSelectionModal
          isOpen={showProductSelectionModal}
          onClose={() => setShowProductSelectionModal(false)}
          products={products}
          onProductSelect={handleProductSelectionFromModal}
          selectedProducts={newInvoice.products}
        />
      </div>
    </div>
  );
};

export default Invoices;
