import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { useNotifications } from './NotificationSystem';
import { Icon } from "@iconify/react";
import { db } from '../firebase';
import { 
  collection, 
  addDoc, 
  doc, 
  getDocs,
  writeBatch
} from 'firebase/firestore';
// import './AddInvoiceModal.css';

export default function AddInvoiceModal({
  isOpen,
  onClose,
  customers,
  products,
  availableServices,
  onInvoiceAdded
}) {
  const { t } = useTranslation();
  const { darkMode } = useTheme();
  const { success, error: showError } = useNotifications();

  // Invoice state
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

  // Combined item selection (products + services) state
  const [newItem, setNewItem] = useState({
    type: '', // 'product' or 'service'
    id: '',
    name: '',
    quantity: 1,
    price: 0,
    total: 0,
    maxQuantity: 0
  });

  // Search & suggestions for product/service autocomplete
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [editingProductIndex, setEditingProductIndex] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Refs for navigation
  const searchInputRef = useRef(null);
  const quantityInputRefs = useRef({});
  const priceInputRefs = useRef({});

  // New customer form state
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    customerName: '',
    carType: '',
    carNumber: '',
    phone: ''
  });

  // Calculate invoice total whenever products, services, or discount changes
  useEffect(() => {
    calculateInvoiceTotal();
  }, [newInvoice.products, newInvoice.services, newInvoice.discount, newInvoice.discountType]);

  // Suggestions for search input (products + services)
  useEffect(() => {
    if (!searchQuery || searchQuery.trim() === '') {
      setSuggestions([]);
      return;
    }

    const q = searchQuery.toLowerCase();
    const productMatches = products
      .filter(p => p.name && p.name.toLowerCase().includes(q))
      .map(p => ({ type: 'product', id: p.id, name: p.name, price: p.price, maxQuantity: p.quantity || 0 }));

    const serviceMatches = availableServices
      .filter(s => s.name && s.name.toLowerCase().includes(q))
      .map(s => ({ type: 'service', id: s.id, name: s.name, price: s.price }));

    setSuggestions([...productMatches, ...serviceMatches].slice(0, 50));
    setSelectedSuggestionIndex(-1);
  }, [searchQuery, products, availableServices]);

  // Helper to format numbers
  const formatNumber = (number) => {
    const rounded = Math.round(parseFloat(number || 0) * 100) / 100;
    return rounded % 1 === 0 ? rounded.toString() : rounded.toFixed(2);
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

  const selectSuggestion = (item, index = null) => {
    if (!item) return;
    
    // Create the item object
    const selectedItem = item.type === 'product' 
      ? {
          type: 'product',
          id: item.id,
          name: item.name,
          quantity: 1,
          price: parseFloat(item.price) || 0,
          total: parseFloat(item.price) || 0,
          maxQuantity: item.maxQuantity || 0
        }
      : {
          type: 'service',
          id: item.id,
          name: item.name,
          quantity: 1,
          price: parseFloat(item.price) || 0,
          total: parseFloat(item.price) || 0,
          maxQuantity: 0
        };

    setNewItem(selectedItem);
    setShowSuggestions(false);
    setSearchQuery('');
    setSelectedSuggestionIndex(-1);

    // Add item directly to invoice
    if (selectedItem.type === 'product') {
      // Check if already added
      const exists = newInvoice.products.find(p => p.productId === selectedItem.id);
      if (exists) {
        showError(t('error'), t('productAlreadyAdded'));
        return;
      }

      if (selectedItem.quantity > selectedItem.maxQuantity) {
        showError(t('error'), `الكمية المطلوبة (${selectedItem.quantity}) أكبر من الكمية المتوفرة (${selectedItem.maxQuantity})`);
        return;
      }

      const productToAdd = {
        productId: selectedItem.id,
        productName: selectedItem.name,
        quantity: selectedItem.quantity,
        price: selectedItem.price,
        total: selectedItem.total,
        maxQuantity: selectedItem.maxQuantity
      };

      const newProducts = [...newInvoice.products, productToAdd];
      setNewInvoice(prev => ({ ...prev, products: newProducts }));
      
      // Set editing mode for the newly added product
      const newIndex = newProducts.length - 1;
      
      // Use a longer delay to ensure the DOM is updated
      setTimeout(() => {
        setEditingProductIndex(newIndex);
        // Focus on quantity input after setting editing mode
        setTimeout(() => {
          if (quantityInputRefs.current[newIndex]) {
            quantityInputRefs.current[newIndex].focus();
            quantityInputRefs.current[newIndex].select();
          }
        }, 50);
      }, 150);
    } else {
      const exists = newInvoice.services.find(s => s.serviceId === selectedItem.id);
      if (exists) {
        showError(t('error'), t('serviceAlreadyAdded'));
        return;
      }

      const serviceToAdd = {
        serviceId: selectedItem.id,
        serviceName: selectedItem.name,
        price: selectedItem.price
      };

      setNewInvoice(prev => ({ ...prev, services: [...prev.services, serviceToAdd] }));
      
      // Focus back on search
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 100);
    }

    // Clear selection
    setNewItem({ type: '', id: '', name: '', quantity: 1, price: 0, total: 0, maxQuantity: 0 });
  };

  // Handle keyboard navigation in suggestions
  const handleSearchKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (suggestions.length > 0) {
        setShowSuggestions(true);
        setSelectedSuggestionIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (suggestions.length > 0) {
        setShowSuggestions(true);
        setSelectedSuggestionIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedSuggestionIndex >= 0 && suggestions[selectedSuggestionIndex]) {
        selectSuggestion(suggestions[selectedSuggestionIndex], selectedSuggestionIndex);
      } else if (suggestions.length > 0) {
        // If no selection but suggestions exist, select first one
        selectSuggestion(suggestions[0], 0);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
    }
  };

  // Handle quantity change and Enter key
  const handleQuantityChange = (index, value) => {
    updateProductQuantity(index, value);
  };

  const handleQuantityKeyDown = (e, index) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Move to price input
      if (priceInputRefs.current[index]) {
        priceInputRefs.current[index].focus();
        priceInputRefs.current[index].select();
      }
    }
  };

  // Handle price change and Enter key
  const handlePriceChange = (index, value) => {
    setNewInvoice(prev => {
      const productsCopy = [...prev.products];
      const prod = { ...productsCopy[index] };
      prod.price = parseFloat(value) || 0;
      prod.total = Math.round(prod.quantity * prod.price * 100) / 100;
      productsCopy[index] = prod;
      return { ...prev, products: productsCopy };
    });
  };

  const handlePriceKeyDown = (e, index) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // First blur the price input
      if (priceInputRefs.current[index]) {
        priceInputRefs.current[index].blur();
      }
      // Close editing mode
      setEditingProductIndex(null);
      // Move to search input after a delay
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 150);
    }
  };

  // Add combined item (product or service) to invoice
  const addItemToInvoice = async () => {
    if (!newItem.type || !newItem.id) {
      showError(t('error'), t('selectProductRequired'));
      return;
    }

    if (newItem.type === 'product') {
      // Check if already added
      const exists = newInvoice.products.find(p => p.productId === newItem.id);
      if (exists) {
        showError(t('error'), t('productAlreadyAdded'));
        return;
      }

      if (!newItem.quantity || newItem.quantity <= 0) {
        showError(t('error'), t('enterValidQuantity'));
        return;
      }

      if (newItem.quantity > newItem.maxQuantity) {
        showError(t('error'), `الكمية المطلوبة (${newItem.quantity}) أكبر من الكمية المتوفرة (${newItem.maxQuantity})`);
        return;
      }

      const productToAdd = {
        productId: newItem.id,
        productName: newItem.name,
        quantity: newItem.quantity,
        price: parseFloat(newItem.price) || 0,
        total: Math.round((newItem.quantity * (parseFloat(newItem.price) || 0)) * 100) / 100,
        maxQuantity: newItem.maxQuantity
      };

      setNewInvoice(prev => ({ ...prev, products: [...prev.products, productToAdd] }));
      // Clear search / selection
      setNewItem({ type: '', id: '', name: '', quantity: 1, price: 0, total: 0, maxQuantity: 0 });
      setSearchQuery('');
      setShowSuggestions(false);
    } else if (newItem.type === 'service') {
      const exists = newInvoice.services.find(s => s.serviceId === newItem.id);
      if (exists) {
        showError(t('error'), t('serviceAlreadyAdded'));
        return;
      }

      if (!newItem.price || newItem.price <= 0) {
        showError(t('error'), t('enterValidServicePrice'));
        return;
      }

      const serviceToAdd = {
        serviceId: newItem.id,
        serviceName: newItem.name,
        price: parseFloat(newItem.price) || 0
      };

      setNewInvoice(prev => ({ ...prev, services: [...prev.services, serviceToAdd] }));
      // Clear search / selection
      setNewItem({ type: '', id: '', name: '', quantity: 1, price: 0, total: 0, maxQuantity: 0 });
      setSearchQuery('');
      setShowSuggestions(false);
    }
  };

  const updateProductQuantity = (index, quantity) => {
    setNewInvoice(prev => {
      const productsCopy = [...prev.products];
      const q = parseInt(quantity) || 1;
      const prod = { ...productsCopy[index] };
      prod.quantity = q;
      prod.total = Math.round(q * (parseFloat(prod.price) || 0) * 100) / 100;
      productsCopy[index] = prod;
      return { ...prev, products: productsCopy };
    });
  };

  const removeProductFromInvoice = (index) => {
    setNewInvoice(prev => ({ ...prev, products: prev.products.filter((_, i) => i !== index) }));
  };

  const removeServiceFromInvoice = (index) => {
    setNewInvoice(prev => ({ ...prev, services: prev.services.filter((_, i) => i !== index) }));
  };

  const handleAddNewCustomer = async () => {
    if (!newCustomer.customerName || !newCustomer.carNumber) {
      showError(t('error'), t('fillRequiredFields'));
      return;
    }

    try {
      await addDoc(collection(db, 'customers'), newCustomer);
      setShowNewCustomerForm(false);
      setNewCustomer({ customerName: '', carType: '', carNumber: '', phone: '' });
      success(t('success'), t('customerAdded'));
      // Refresh customers list by calling callback if provided
      if (onInvoiceAdded) {
        onInvoiceAdded();
      }
    } catch (err) {
      console.error('Error adding customer:', err);
      showError(t('error'), t('customerAddError'));
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

  const handleAddInvoice = async () => {
    // Basic validation
    if (!newInvoice.customerId || (!newInvoice.products.length && !newInvoice.services.length)) {
      showError(t('error'), t('invoiceValidationError') || 'Invoice missing required fields');
      return;
    }

    // Prevent multiple submissions
    if (isSaving) return;

    setIsSaving(true);

    try {
      const batch = writeBatch(db);

      // Decrease product quantities
      for (const p of newInvoice.products) {
        if (p.productId) {
          const productRef = doc(db, 'products', p.productId);
          const currentProduct = products.find(x => x.id === p.productId);
          const newQuantity = (currentProduct?.quantity || 0) - (p.quantity || 0);
          batch.update(productRef, { quantity: newQuantity, available: newQuantity > 0 });
        }
      }

      // Prepare invoice data (remove id field as Firebase will generate it)
      const { id, ...invoiceDataWithoutId } = newInvoice;
      const invoiceData = {
        ...invoiceDataWithoutId,
        invoiceNumber: newInvoice.invoiceNumber || generateInvoiceNumber()
      };

      const invoicesRef = collection(db, 'invoices');
      await addDoc(invoicesRef, invoiceData);

      await batch.commit();

      // Reset invoice state
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

      // Clear search
      setSearchQuery('');
      setNewItem({ type: '', id: '', name: '', quantity: 1, price: 0, total: 0, maxQuantity: 0 });
      setEditingProductIndex(null);

      // Close modal and refresh
      setIsSaving(false);
      onClose();
      success(t('success'), t('invoiceAdded'));
      
      // Call callback to refresh parent component
      if (onInvoiceAdded) {
        onInvoiceAdded();
      }
    } catch (err) {
      console.error('Error adding invoice:', err);
      setIsSaving(false);
      showError(t('error'), t('invoiceAddError'));
    }
  };

  const handleDiscountTypeChange = (e) => {
    setNewInvoice(prev => ({
      ...prev,
      discountType: e.target.value === 'Percentage' ? 'percentage' : 'fixedAmount'
    }));
  };

  const handleDiscountChange = (e) => {
    setNewInvoice(prev => ({
      ...prev,
      discount: parseFloat(e.target.value) || 0
    }));
  };

  const handlePaymentMethodChange = (method) => {
    setNewInvoice(prev => ({
      ...prev,
      paymentMethod: method
    }));
  };

  const handleInvoiceDateChange = (e) => {
    setNewInvoice(prev => ({
      ...prev,
      invoiceDate: e.target.value
    }));
  };

  if (!isOpen) return null;

  // Calculate totals for display
  const productsTotal = newInvoice.products.reduce((sum, product) => sum + (parseFloat(product.total) || 0), 0);
  const servicesTotal = newInvoice.services.reduce((sum, service) => sum + (parseFloat(service.price) || 0), 0);
  const subtotal = productsTotal + servicesTotal;
  const discountAmount = newInvoice.discountType === 'percentage' 
    ? (subtotal * newInvoice.discount / 100) 
    : newInvoice.discount;

  return (
    <section className="fixed inset-0 z-10 w-full min-h-screen bg-background text-foreground font-sans overflow-scroll">
        <header className="z-10 bg-background/95 backdrop-blur-sm border-b border-border">
            <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Icon onClick={onClose} className="cursor-pointer" icon="icon-park-outline:back" width="20" height="20" />
                    <h1 className="text-3xl font-bold font-heading">Add Invoice</h1>
                    <span className="text-sm text-muted-foreground px-3 py-1 bg-muted rounded-full">
                        New Invoice
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setShowNewCustomerForm(true)}
                      className="flex items-center gap-2 bg-transparent border border-border hover:bg-muted text-foreground px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
                    >
                        <Icon icon="solar:user-plus-bold" className="size-4" />
                        Add Customer
                    </button>
                    <button 
                      onClick={handleAddInvoice}
                      disabled={isSaving}
                      className="flex items-center gap-2 bg-[#10b981] hover:bg-[#059669] disabled:bg-[#10b981]/50 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
                    >
                        {isSaving ? (
                            <>
                                <Icon icon="svg-spinners:ring-resize" className="size-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Icon icon="solar:diskette-bold" className="size-4" />
                                Save Invoice
                            </>
                        )}
                    </button>
                </div>
            </div>
        </header>
        <main className="max-w-7xl mx-auto px-8 py-8">
            <div className="grid grid-cols-12 gap-8">
                {/* Left section  */}
                <div className="col-span-8 space-y-6">
                    {/* Customer section */}
                    <section className="bg-card border border-border rounded-xl p-6 space-y-5">
                        <div className="flex items-center justify-between pb-4 border-b border-border">
                            <h2 className="text-lg font-semibold font-heading">Customer Information</h2>
                            <button 
                              onClick={() => setShowNewCustomerForm(true)}
                              className="text-sm text-primary hover:text-primary/80 font-medium"
                            >
                                New Customer
                            </button>
                        </div>
                        {/* select customer and date  */}
                        <div className="grid grid-cols-2 gap-5">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">Select Customer</label>
                                <div className="relative">
                                    <select 
                                      onChange={(e) => handleCustomerSelect(e.target.value)}
                                      value={newInvoice.customerId || ''}
                                      className="w-full appearance-none bg-input border border-border rounded-lg px-4 py-3 text-sm text-foreground focus:ring-2 focus:ring-ring focus:border-ring outline-none"
                                    >
                                        <option value="">Select Customer</option>
                                        {customers.map((customer) => (
                                            <option key={customer.id} value={customer.id}>
                                            {customer.customerName} - {customer.carNumber}
                                            </option>
                                        ))}
                                    </select>
                                    <Icon
                                        icon="solar:alt-arrow-down-linear"
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground size-4 pointer-events-none"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">Invoice Date</label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        value={newInvoice.invoiceDate}
                                        onChange={handleInvoiceDateChange}
                                        className="w-full bg-input border border-border rounded-lg px-4 py-3 text-sm text-foreground focus:ring-2 focus:ring-ring focus:border-ring outline-none"
                                    />
                                    <Icon
                                        icon="solar:calendar-linear"
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground size-5 pointer-events-none"
                                    />
                                </div>
                            </div>
                        </div>
                        {/* customer details  */}
                        <div className="bg-muted/30 border border-border rounded-lg p-5 space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Icon icon="solar:user-id-bold" className="text-primary size-5" />
                                <span className="font-semibold">Customer Details</span>
                            </div>

                            <div className="grid grid-cols-4 gap-5">
                                <div>
                                    <span className="block text-xs text-muted-foreground mb-1.5">
                                        Customer Name
                                    </span>
                                    <span className="font-medium">{newInvoice.customerName || '-'}</span>
                                </div>
                                <div>
                                    <span className="block text-xs text-muted-foreground mb-1.5">Phone</span>
                                    <span className="font-medium font-mono">{newInvoice.phone || '-'}</span>
                                </div>
                                <div>
                                    <span className="block text-xs text-muted-foreground mb-1.5">Car Type</span>
                                    <span className="font-medium">{newInvoice.carType || '-'}</span>
                                </div>
                                <div>
                                    <span className="block text-xs text-muted-foreground mb-1.5">Car Number</span>
                                    <span className="font-medium font-mono">{newInvoice.carNumber || '-'}</span>
                                </div>
                            </div>
                        </div>
                    </section>
                    {/* Product section  */}
                    <section className="bg-card border border-border rounded-xl p-6 space-y-5">
                        <div className="flex items-center justify-between pb-4 border-b border-border">
                            <h2 className="text-lg font-semibold font-heading">Products & Services</h2>
                            <button className="flex items-center gap-2 text-[#10b981] bg-[#10b981]/10 px-4 py-2 rounded-lg text-sm font-medium border border-[#10b981]/20 hover:bg-[#10b981]/20 transition-colors">
                                <Icon icon="solar:box-bold" className="size-4" />
                                New Products
                            </button>
                        </div>
                        {/* Search input above table */}
                        <div className="relative mb-4">
                                <input
                                ref={searchInputRef}
                                type="text"
                                    value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setShowSuggestions(true);
                                    setSelectedSuggestionIndex(-1);
                                }}
                                    onFocus={() => setShowSuggestions(true)}
                                onKeyDown={handleSearchKeyDown}
                                onBlur={(e) => {
                                    // Don't hide if clicking on suggestion
                                    if (!e.currentTarget.contains(e.relatedTarget)) {
                                        setTimeout(() => setShowSuggestions(false), 200);
                                    }
                                }}
                                placeholder={t('searchProductOrService') || 'Search product or service...'}
                                className="w-full bg-input border border-border rounded-lg px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                                />

                                {showSuggestions && suggestions && suggestions.length > 0 && (
                                <ul 
                                    className="absolute left-0 right-0 mt-1 max-h-52 overflow-auto bg-card border border-border rounded shadow-lg"
                                    style={{ 
                                        zIndex: 1000,
                                        position: 'absolute',
                                        top: '100%',
                                        left: 0,
                                        right: 0
                                    }}
                                    onMouseDown={(e) => e.preventDefault()}
                                >
                                        {suggestions.map((item, i) => (
                                            <li
                                                key={`${item.type}-${item.id}-${i}`}
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                selectSuggestion(item, i);
                                            }}
                                            className={`px-4 py-3 cursor-pointer flex justify-between items-center text-sm ${
                                                selectedSuggestionIndex === i ? 'bg-primary/20 border-l-2 border-primary' : 'hover:bg-muted/50'
                                            }`}
                                            >
                                                <div className="truncate">
                                                    <strong className="mr-2">{item.type === 'product' ? '[P]' : '[S]'}</strong>
                                                    <span>{item.name}</span>
                                                </div>
                                                <div className="text-xs text-muted-foreground ml-3">
                                                {formatNumber(item.price)} JOD
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        {/* Products table */}
                        <div className="bg-muted/20 border border-border border-dashed rounded-lg p-5 space-y-4 min-h-30">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="text-left text-xs text-muted-foreground">
                                        <tr>
                                            <th className="px-3 py-2">Item</th>
                                            <th className="px-3 py-2 w-24 text-center">Qty</th>
                                            <th className="px-3 py-2 w-28 text-right">Unit</th>
                                            <th className="px-3 py-2 w-28 text-right">Amount</th>
                                            <th className="px-3 py-2 w-20 text-center"> </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {newInvoice.products.map((p, idx) => (
                                            <tr key={`sel-prod-${idx}`} className="border-t border-border">
                                                <td className="px-3 py-2">{p.productName}</td>
                                                <td className="px-3 py-2 text-center">
                                                    {editingProductIndex === idx ? (
                                                    <input
                                                            ref={el => quantityInputRefs.current[idx] = el}
                                                        type="number"
                                                        min="1"
                                                        value={p.quantity}
                                                            onChange={(e) => handleQuantityChange(idx, e.target.value)}
                                                            onKeyDown={(e) => handleQuantityKeyDown(e, idx)}
                                                            onBlur={(e) => {
                                                                // Check if the next focus target is the price input for the same product
                                                                const nextTarget = e.relatedTarget;
                                                                const isPriceInput = nextTarget && priceInputRefs.current[idx] === nextTarget;
                                                                
                                                                // Only close if not moving to price input
                                                                if (!isPriceInput) {
                                                                    setTimeout(() => {
                                                                        // Double check that we're not editing this product anymore
                                                                        if (editingProductIndex === idx) {
                                                                            setEditingProductIndex(null);
                                                                        }
                                                                    }, 300);
                                                                }
                                                            }}
                                                        className="w-20 bg-input border border-border rounded px-2 py-1 text-sm text-foreground text-center"
                                                            autoFocus
                                                        />
                                                    ) : (
                                                        <span 
                                                            onMouseDown={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                setEditingProductIndex(idx);
                                                                setTimeout(() => {
                                                                    if (quantityInputRefs.current[idx]) {
                                                                        quantityInputRefs.current[idx].focus();
                                                                        quantityInputRefs.current[idx].select();
                                                                    }
                                                                }, 100);
                                                            }}
                                                            className="cursor-pointer hover:bg-muted/50 px-2 py-1 rounded inline-block"
                                                        >
                                                            {p.quantity}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 text-right">
                                                    {editingProductIndex === idx ? (
                                                        <input
                                                            ref={el => priceInputRefs.current[idx] = el}
                                                            type="number"
                                                            min="0"
                                                            step="1.00"
                                                            value={p.price}
                                                            onChange={(e) => handlePriceChange(idx, e.target.value)}
                                                            onKeyDown={(e) => handlePriceKeyDown(e, idx)}
                                                            onBlur={(e) => {
                                                                // Check if the next focus target is the search input
                                                                const nextTarget = e.relatedTarget;
                                                                const isSearchInput = nextTarget && searchInputRef.current === nextTarget;
                                                                
                                                                // Only close if not moving to search input
                                                                if (!isSearchInput) {
                                                                    setTimeout(() => {
                                                                        // Double check that we're not editing this product anymore
                                                                        if (editingProductIndex === idx) {
                                                                            setEditingProductIndex(null);
                                                                        }
                                                                    }, 300);
                                                                }
                                                            }}
                                                            className="w-24 bg-input border border-border rounded px-2 py-1 text-sm text-foreground text-right"
                                                        />
                                                    ) : (
                                                        <span 
                                                            onMouseDown={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                setEditingProductIndex(idx);
                                                                setTimeout(() => {
                                                                    if (priceInputRefs.current[idx]) {
                                                                        priceInputRefs.current[idx].focus();
                                                                        priceInputRefs.current[idx].select();
                                                                    }
                                                                }, 100);
                                                            }}
                                                            className="cursor-pointer hover:bg-muted/50 px-2 py-1 rounded inline-block"
                                                        >
                                                            {formatNumber(p.price)} JOD
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 text-right font-medium">{formatNumber(p.total)} JOD</td>
                                                <td className="px-3 py-2 text-center">
                                                    <button onClick={() => removeProductFromInvoice(idx)} className="text-destructive text-sm">
                                                        Remove
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}

                                        {newInvoice.services.map((s, idx) => (
                                            <tr key={`sel-serv-${idx}`} className="border-t border-border">
                                                <td className="px-3 py-2">{s.serviceName}</td>
                                                <td className="px-3 py-2 text-center">1</td>
                                                <td className="px-3 py-2 text-right">{formatNumber(s.price)} JOD</td>
                                                <td className="px-3 py-2 text-right font-medium">{formatNumber(s.price)} JOD</td>
                                                <td className="px-3 py-2 text-center">
                                                    <button onClick={() => removeServiceFromInvoice(idx)} className="text-destructive text-sm">
                                                        Remove
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        
                    </section>
                    
                </div>
                {/* Right section */}
                <div className="col-span-4 space-y-6">
                    <div className="sticky top-24 space-y-6">
                        {/* Discount */}
                        <section className="bg-card border border-border rounded-xl p-6 space-y-5">
                            <div className="flex items-center gap-2 pb-4 border-b border-border">
                                <Icon icon="solar:tag-price-bold" className="size-5 text-primary" />
                                <h3 className="text-lg font-semibold font-heading">Discount</h3>
                            </div>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-foreground">Type</label>
                                    <div className="relative">
                                        <select 
                                          value={newInvoice.discountType === 'percentage' ? 'Percentage' : 'Fixed Amount'}
                                          onChange={handleDiscountTypeChange}
                                          className="w-full appearance-none bg-input border border-border rounded-lg px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                                        >
                                            <option>Fixed Amount</option>
                                            <option>Percentage</option>
                                        </select>
                                        <Icon
                                            icon="solar:alt-arrow-down-linear"
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground size-4 pointer-events-none"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-foreground">Amount</label>
                                    <input
                                        type="number"
                                        value={newInvoice.discount}
                                        onChange={handleDiscountChange}
                                        min="0"
                                        className="w-full bg-input border border-border rounded-lg px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                                    />
                                </div>
                            </div>
                        </section>
                        {/* Payment Method */}
                        <section className="bg-card border border-border rounded-xl p-6 space-y-5">
                            <div className="flex items-center gap-2 pb-4 border-b border-border">
                                <Icon icon="solar:card-bold" className="size-5 text-primary" />
                                <h3 className="text-lg font-semibold font-heading">Payment Method</h3>
                            </div>
                            <div className="space-y-3">
                                <label className={`flex items-center gap-3 p-4 bg-input/50 rounded-lg border-2 ${newInvoice.paymentMethod === 'cash' ? 'border-primary' : 'border-border'} cursor-pointer transition-all`}>
                                    <div className="relative flex items-center justify-center">
                                        <input
                                            type="radio"
                                            name="payment"
                                            checked={newInvoice.paymentMethod === 'cash'}
                                            onChange={() => handlePaymentMethodChange('cash')}
                                            className="peer appearance-none size-5 border-2 border-muted-foreground rounded-full checked:border-primary checked:border-[6px] transition-all"
                                        />
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Icon icon="solar:wallet-money-bold" className={`size-5 ${newInvoice.paymentMethod === 'cash' ? 'text-primary' : 'text-muted-foreground'}`} />
                                        <span className="text-sm font-medium">Cash</span>
                                    </div>
                                </label>
                                <label className={`flex items-center gap-3 p-4 bg-input/50 rounded-lg border-2 ${newInvoice.paymentMethod === 'visa' ? 'border-primary' : 'border-border'} cursor-pointer transition-all`}>
                                    <div className="relative flex items-center justify-center">
                                        <input
                                            type="radio"
                                            name="payment"
                                            checked={newInvoice.paymentMethod === 'visa'}
                                            onChange={() => handlePaymentMethodChange('visa')}
                                            className="peer appearance-none size-5 border-2 border-muted-foreground rounded-full checked:border-primary checked:border-[6px] transition-all"
                                        />
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Icon icon="solar:card-bold" className={`size-5 ${newInvoice.paymentMethod === 'visa' ? 'text-primary' : 'text-muted-foreground'}`} />
                                        <span className="text-sm font-medium">Visa</span>
                                    </div>
                                </label>
                            </div>
                        </section>

                        {/* Invoice Summary */}
                        <section className="bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/30 rounded-xl p-6 space-y-4">
                            <h3 className="text-lg font-semibold font-heading mb-4">Invoice Summary</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground">Products Total:</span>
                                    <span className="font-medium">{formatNumber(productsTotal)} JOD</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground">Services Total:</span>
                                    <span className="font-medium">{formatNumber(servicesTotal)} JOD</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground">Subtotal:</span>
                                    <span className="font-medium">{formatNumber(subtotal)} JOD</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground">Discount:</span>
                                    <span className="font-medium text-destructive">- {formatNumber(discountAmount)} JOD</span>
                                </div>
                            </div>
                            <div className="h-px bg-border my-4" />
                            <div className="flex justify-between items-center">
                                <span className="font-bold text-lg">Final Amount:</span>
                                <span className="font-bold text-2xl text-primary">{formatNumber(newInvoice.finalAmount)} JOD</span>
                            </div>
                            <div className="pt-4 space-y-3">
                                <button 
                                  onClick={handleAddInvoice}
                                  disabled={isSaving}
                                  className="w-full py-3.5 px-4 bg-primary hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed text-primary-foreground rounded-lg font-semibold shadow-lg shadow-primary/25 flex items-center justify-center gap-2 transition-all"
                                >
                                    {isSaving ? (
                                        <>
                                            <Icon icon="svg-spinners:ring-resize" className="size-5 animate-spin" />
                                            Saving Invoice...
                                        </>
                                    ) : (
                                        <>
                                            <Icon icon="solar:diskette-bold" className="size-5" />
                                            Save Invoice
                                        </>
                                    )}
                                </button>
                                <button onClick={onClose} className="w-full py-3 px-4 bg-transparent border border-border hover:bg-muted text-foreground rounded-lg font-medium transition-colors">
                                    Cancel
                                </button>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </main>

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
    </section>
  );
}
