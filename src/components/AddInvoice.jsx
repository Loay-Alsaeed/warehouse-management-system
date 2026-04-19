import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { useNotifications } from './NotificationSystem';
import { Icon } from "@iconify/react";
import { db } from '../firebase';
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import PaymentModal from './PaymentModal';

export default function AddInvoice({
  invoiceToEdit = null,
  onBack,
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
    discountType: 'fixedAmount',
    totalAmount: 0,
    finalAmount: 0,
    paymentMethod: 'cash',
    invoiceDate: new Date().toISOString().split('T')[0]
  });

  // Combined item selection (products + services) state
  const [newItem, setNewItem] = useState({
    type: '',
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
  const [editingServiceIndex, setEditingServiceIndex] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Refs for navigation
  const searchInputRef = useRef(null);
  const quantityInputRefs = useRef({});
  const priceInputRefs = useRef({});
  const serviceQuantityInputRefs = useRef({});
  const servicePriceInputRefs = useRef({});

  // Data fetching
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [availableServices, setAvailableServices] = useState([]);
  const [loading, setLoading] = useState(true);

  // New customer form state
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [selectedCustomerIndex, setSelectedCustomerIndex] = useState(-1);
  const [newCustomer, setNewCustomer] = useState({
    customerName: '',
    carType: '',
    carNumber: '',
    phone: ''
  });

  // New product form state
  const [showNewProductForm, setShowNewProductForm] = useState(false);
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
  const [categories, setCategories] = useState([]);

  // Load data on mount
  useEffect(() => {
    fetchCustomers();
    fetchProducts();
    fetchServices();
  }, []);

  // Load invoice data if editing
  useEffect(() => {
    if (invoiceToEdit) {
      setNewInvoice({
        ...invoiceToEdit,
        products: invoiceToEdit.products || [],
        services: (invoiceToEdit.services || []).map((s) => {
          const qty = parseInt(s.quantity, 10) || 1;
          const price = parseFloat(s.price) || 0;
          const total =
            s.total != null && s.total !== ''
              ? Math.round(parseFloat(s.total) * 100) / 100
              : Math.round(qty * price * 100) / 100;
          return { ...s, quantity: qty, price, total };
        }),
        invoiceDate: invoiceToEdit.invoiceDate || new Date().toISOString().split('T')[0]
      });
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [invoiceToEdit]);

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

  // Helper to format numbers
  const formatNumber = (number) => {
    const rounded = Math.round(parseFloat(number || 0) * 100) / 100;
    return rounded % 1 === 0 ? rounded.toString() : rounded.toFixed(2);
  };

  const getServiceLineTotal = (service) => {
    if (service.total != null && service.total !== '') {
      return parseFloat(service.total) || 0;
    }
    const q = parseInt(service.quantity, 10) || 1;
    const p = parseFloat(service.price) || 0;
    return Math.round(q * p * 100) / 100;
  };

  const calculateInvoiceTotal = () => {
    const productsTotal = (newInvoice.products || []).reduce((sum, product) => sum + (parseFloat(product.total) || 0), 0);
    const servicesTotal = (newInvoice.services || []).reduce((sum, service) => sum + getServiceLineTotal(service), 0);
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

  const handleCustomerKeyDown = (e) => {
    const search = (newInvoice.customerName || '').toLowerCase();
    const filteredCustomers = customers.filter(c =>
      c.customerName.toLowerCase().includes(search) ||
      (c.carNumber || '').toLowerCase().includes(search)
    );

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (filteredCustomers.length > 0) {
        setShowCustomerSuggestions(true);
        setSelectedCustomerIndex(prev =>
          prev < filteredCustomers.length - 1 ? prev + 1 : 0
        );
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (filteredCustomers.length > 0) {
        setShowCustomerSuggestions(true);
        setSelectedCustomerIndex(prev =>
          prev > 0 ? prev - 1 : filteredCustomers.length - 1
        );
      }
    } else if (e.key === 'Enter') {
      if (selectedCustomerIndex >= 0 && filteredCustomers[selectedCustomerIndex]) {
        e.preventDefault();
        const customer = filteredCustomers[selectedCustomerIndex];
        handleCustomerSelect(customer.id);
        setShowCustomerSuggestions(false);
        setSelectedCustomerIndex(-1);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setShowCustomerSuggestions(false);
      setSelectedCustomerIndex(-1);
    }
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

    if (selectedItem.type === 'product') {
      const exists = (newInvoice.products || []).find(p => p.productId === selectedItem.id);
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

      const newProducts = [...(newInvoice.products || []), productToAdd];
      setNewInvoice(prev => ({ ...prev, products: newProducts }));

      const newIndex = newProducts.length - 1;
      setEditingServiceIndex(null);
      setTimeout(() => {
        setEditingProductIndex(newIndex);
        setTimeout(() => {
          if (quantityInputRefs.current[newIndex]) {
            quantityInputRefs.current[newIndex].focus();
            quantityInputRefs.current[newIndex].select();
          }
        }, 50);
      }, 150);
    } else {
      const exists = (newInvoice.services || []).find(s => s.serviceId === selectedItem.id);
      if (exists) {
        showError(t('error'), t('serviceAlreadyAdded'));
        return;
      }

      const serviceToAdd = {
        serviceId: selectedItem.id,
        serviceName: selectedItem.name,
        quantity: selectedItem.quantity,
        price: selectedItem.price,
        total: selectedItem.total
      };

      const newServices = [...(newInvoice.services || []), serviceToAdd];
      setNewInvoice(prev => ({ ...prev, services: newServices }));

      const newSvcIndex = newServices.length - 1;
      setEditingProductIndex(null);
      setTimeout(() => {
        setEditingServiceIndex(newSvcIndex);
        setTimeout(() => {
          if (serviceQuantityInputRefs.current[newSvcIndex]) {
            serviceQuantityInputRefs.current[newSvcIndex].focus();
            serviceQuantityInputRefs.current[newSvcIndex].select();
          }
        }, 50);
      }, 150);
    }

    setNewItem({ type: '', id: '', name: '', quantity: 1, price: 0, total: 0, maxQuantity: 0 });
  };

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
        selectSuggestion(suggestions[0], 0);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
    }
  };

  const handleQuantityChange = (index, value) => {
    updateProductQuantity(index, value);
  };

  const handleQuantityKeyDown = (e, index) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (priceInputRefs.current[index]) {
        priceInputRefs.current[index].focus();
        priceInputRefs.current[index].select();
      }
    }
  };

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
      if (priceInputRefs.current[index]) {
        priceInputRefs.current[index].blur();
      }
      setEditingProductIndex(null);
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 150);
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
    setNewInvoice(prev => ({ ...prev, products: (prev.products || []).filter((_, i) => i !== index) }));
  };

  const removeServiceFromInvoice = (index) => {
    setEditingServiceIndex((prev) => {
      if (prev === null) return null;
      if (prev === index) return null;
      if (prev > index) return prev - 1;
      return prev;
    });
    setNewInvoice(prev => ({ ...prev, services: (prev.services || []).filter((_, i) => i !== index) }));
  };

  const updateServiceQuantity = (index, quantity) => {
    setNewInvoice(prev => {
      const servicesCopy = [...(prev.services || [])];
      const q = parseInt(quantity, 10) || 1;
      const svc = { ...servicesCopy[index] };
      svc.quantity = q;
      svc.total = Math.round(q * (parseFloat(svc.price) || 0) * 100) / 100;
      servicesCopy[index] = svc;
      return { ...prev, services: servicesCopy };
    });
  };

  const handleServiceQuantityChange = (index, value) => {
    updateServiceQuantity(index, value);
  };

  const handleServiceQuantityKeyDown = (e, index) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (servicePriceInputRefs.current[index]) {
        servicePriceInputRefs.current[index].focus();
        servicePriceInputRefs.current[index].select();
      }
    }
  };

  const handleServicePriceChange = (index, value) => {
    setNewInvoice(prev => {
      const servicesCopy = [...(prev.services || [])];
      const svc = { ...servicesCopy[index] };
      svc.price = parseFloat(value) || 0;
      svc.total = Math.round((parseInt(svc.quantity, 10) || 1) * svc.price * 100) / 100;
      servicesCopy[index] = svc;
      return { ...prev, services: servicesCopy };
    });
  };

  const handleServicePriceKeyDown = (e, index) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (servicePriceInputRefs.current[index]) {
        servicePriceInputRefs.current[index].blur();
      }
      setEditingServiceIndex(null);
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 150);
    }
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
      fetchCustomers();
    } catch (err) {
      console.error('Error adding customer:', err);
      showError(t('error'), t('customerAddError'));
    }
  };

  const handleProductFormSubmit = (e) => {
    e.preventDefault();
  };

  const handleProductKeyDown = (e, formId) => {
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
      const form = document.getElementById(formId);
      if (form) {
        const inputs = Array.from(form.querySelectorAll('input:not([type="submit"]):not([type="button"]), textarea, select'));
        const currentIndex = inputs.indexOf(e.target);

        if (currentIndex < inputs.length - 1) {
          e.preventDefault();
          inputs[currentIndex + 1].focus();
        }
      }
    }
  };

  const handleAddNewProduct = async () => {
    if (!newProduct.name || !newProduct.description || !newProduct.category || !newProduct.storageLocation || !newProduct.quantity || !newProduct.price) {
      showError(t('error'), t('fillRequiredFields') || 'Please fill all required fields');
      return;
    }

    try {
      const productData = {
        ...newProduct,
        quantity: parseInt(newProduct.quantity) || 0,
        price: parseFloat(newProduct.price) || 0,
        cost: parseFloat(newProduct.cost) || 0,
        available: (parseInt(newProduct.quantity) || 0) > 0,
        createdAt: new Date()
      };

      const docRef = await addDoc(collection(db, 'products'), productData);

      setShowNewProductForm(false);
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

      success(t('productAdded') || 'Success', t('productAddedMessage') || 'Product added successfully');

      const productToAdd = {
        productId: docRef.id,
        productName: productData.name,
        quantity: 1,
        price: productData.price,
        total: productData.price,
        maxQuantity: productData.quantity
      };

      setNewInvoice(prev => {
        const newProducts = [...prev.products, productToAdd];
        const newIndex = newProducts.length - 1;

        setTimeout(() => {
          setEditingProductIndex(newIndex);
          setTimeout(() => {
            if (quantityInputRefs.current[newIndex]) {
              quantityInputRefs.current[newIndex].focus();
              quantityInputRefs.current[newIndex].select();
            }
          }, 50);
        }, 150);

        return { ...prev, products: newProducts };
      });

      fetchProducts();
    } catch (err) {
      console.error('Error adding product:', err);
      showError(t('error'), t('productAddError') || 'Failed to add product');
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

  // Save as open invoice
  const handleSaveAsOpenInvoice = async () => {
    if (!newInvoice.customerId || (!(newInvoice.products || []).length && !(newInvoice.services || []).length)) {
      showError(t('error'), t('invoiceValidationError') || 'Invoice missing required fields');
      return;
    }

    if (isSaving) return;
    setIsSaving(true);

    try {
      const invoiceData = {
        ...newInvoice,
        invoiceNumber: newInvoice.invoiceNumber || generateInvoiceNumber(),
        status: 'open',
        createdAt: invoiceToEdit?.createdAt || new Date(),
        updatedAt: new Date()
      };

      if (invoiceToEdit && invoiceToEdit.id) {
        // Update existing open invoice
        const invoiceRef = doc(db, 'openInvoices', invoiceToEdit.id);
        await updateDoc(invoiceRef, invoiceData);
        success(t('success'), t('invoiceUpdated') || 'Invoice updated successfully');
      } else {
        // Create new open invoice
        await addDoc(collection(db, 'openInvoices'), invoiceData);
        success(t('success'), t('invoiceSavedAsOpen') || 'Invoice saved as open invoice');
      }

      setIsSaving(false);
      if (onInvoiceAdded) {
        onInvoiceAdded();
      }
      if (onBack) {
        onBack();
      }
    } catch (err) {
      console.error('Error saving open invoice:', err);
      setIsSaving(false);
      showError(t('error'), t('invoiceSaveError') || 'Failed to save invoice');
    }
  };

  // Close invoice with payment
  const handleCloseInvoice = () => {
    if (!newInvoice.customerId || (!(newInvoice.products || []).length && !(newInvoice.services || []).length)) {
      showError(t('error'), t('invoiceValidationError') || 'Invoice missing required fields');
      return;
    }
    setShowPaymentModal(true);
  };

  const handlePaymentComplete = async (paymentData) => {
    if (isSaving) return;
    setIsSaving(true);

    try {
      const batch = writeBatch(db);

      // Decrease product quantities
      for (const p of (newInvoice.products || [])) {
        if (p.productId) {
          const productRef = doc(db, 'products', p.productId);
          const currentProduct = products.find(x => x.id === p.productId);
          const newQuantity = (currentProduct?.quantity || 0) - (p.quantity || 0);
          batch.update(productRef, { quantity: newQuantity, available: newQuantity > 0 });
        }
      }

      // Prepare invoice data for final invoices collection (omit any stale id from open-invoice state)
      const { id: _omitInvoiceId, ...invoiceFields } = newInvoice;
      const invoiceData = {
        ...invoiceFields,
        invoiceNumber: newInvoice.invoiceNumber || generateInvoiceNumber(),
        paymentAmount: paymentData.amount,
        remainingAmount: newInvoice.finalAmount - paymentData.amount,
        paymentMethod: paymentData.paymentMethod,
        paymentDate: paymentData.paymentDate,
        status: paymentData.amount >= newInvoice.finalAmount ? 'paid' : 'partial',
        createdAt: new Date(),
        eInvoiceSubmitted: false,
      };

      // Add to invoices collection
      const invoicesRef = collection(db, 'invoices');
      await addDoc(invoicesRef, invoiceData);

      // If updating an existing open invoice, delete it
      if (invoiceToEdit && invoiceToEdit.id) {
        const openInvoiceRef = doc(db, 'openInvoices', invoiceToEdit.id);
        batch.delete(openInvoiceRef);
      }

      await batch.commit();

      setIsSaving(false);
      setShowPaymentModal(false);
      success(t('success'), t('invoiceClosed') || 'Invoice closed successfully');

      if (onInvoiceAdded) {
        onInvoiceAdded();
      }
      if (onBack) {
        onBack();
      }
    } catch (err) {
      console.error('Error closing invoice:', err);
      setIsSaving(false);
      showError(t('error'), t('invoiceCloseError') || 'Failed to close invoice');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  const productsTotal = (newInvoice.products || []).reduce((sum, product) => sum + (parseFloat(product.total) || 0), 0);
  const servicesTotal = (newInvoice.services || []).reduce((sum, service) => sum + getServiceLineTotal(service), 0);
  const subtotal = productsTotal + servicesTotal;
  const discountAmount = newInvoice.discountType === 'percentage'
    ? (subtotal * newInvoice.discount / 100)
    : newInvoice.discount;

  return (
    <section className="h-full w-full bg-background text-foreground font-sans overflow-y-auto flex flex-col">
      <header className="z-10 bg-background/95 backdrop-blur-sm border-b border-border flex-shrink-0">
        <div className="px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Icon onClick={onBack} className="cursor-pointer" icon="icon-park-outline:back" width="20" height="20" />
            <h1 className="text-3xl font-bold font-heading">{invoiceToEdit ? t('editInvoice') : t('addInvoice')}</h1>

          </div>
          {/* <div className="flex items-center gap-3">
            <button
              onClick={() => setShowNewCustomerForm(true)}
              className="flex items-center gap-2 bg-transparent border border-border hover:bg-muted text-foreground px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              <Icon icon="solar:user-plus-bold" className="size-4" />
              {t('addCustomer')}
            </button>
          </div> */}
        </div>
      </header>
      <main className="px-8 py-8 flex-1 overflow-y-auto">
        <div className="grid grid-cols-12 gap-8">
          {/* Left section  */}
          <div className="col-span-8 space-y-6">

            {/* Product section  */}
            <section className="bg-card border border-border rounded-xl p-6 space-y-5">
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <h2 className="text-lg font-semibold font-heading">المنتجات والخدمات</h2>
                <button
                  onClick={() => setShowNewProductForm(true)}
                  className="flex items-center gap-2 text-[#10b981] bg-[#10b981]/10 px-4 py-2 rounded-lg text-sm font-medium border border-[#10b981]/20 hover:bg-[#10b981]/20 transition-colors"
                >
                  <Icon icon="solar:box-bold" className="size-4" />
                  منتج جديد
                </button>
              </div>
              {/* <div className="relative mb-4">
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
                              if (!e.currentTarget.contains(e.relatedTarget)) {
                                  setTimeout(() => setShowSuggestions(false), 200);
                              }
                          }}
                          placeholder="ابحث عن منتج أو خدمة..."
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
                        </div> */}
              <div className="bg-muted/20 border border-border border-dashed rounded-lg p-5 space-y-4 min-h-30">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2">{t('item')}</th>
                        <th className="px-3 py-2 w-24 text-center">{t('quantity')}</th>
                        <th className="px-3 py-2 w-28 text-right">{t('unitPrice')}</th>
                        <th className="px-3 py-2 w-28 text-right">{t('amount')}</th>
                        <th className="px-3 py-2 w-20 text-center"> </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(newInvoice.products || []).map((p, idx) => (
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
                                  const nextTarget = e.relatedTarget;
                                  const isPriceInput = nextTarget && priceInputRefs.current[idx] === nextTarget;

                                  if (!isPriceInput) {
                                    setTimeout(() => {
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
                                  setEditingServiceIndex(null);
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
                                  const nextTarget = e.relatedTarget;
                                  const isSearchInput = nextTarget && searchInputRef.current === nextTarget;

                                  if (!isSearchInput) {
                                    setTimeout(() => {
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
                                  setEditingServiceIndex(null);
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
                              {t('remove')}
                            </button>
                          </td>
                        </tr>
                      ))}

                      {(newInvoice.services || []).map((s, idx) => (
                        <tr key={`sel-serv-${idx}`} className="border-t border-border">
                          <td className="px-3 py-2">{s.serviceName}</td>
                          <td className="px-3 py-2 text-center">
                            {editingServiceIndex === idx ? (
                              <input
                                ref={(el) => { serviceQuantityInputRefs.current[idx] = el; }}
                                type="number"
                                min="1"
                                value={s.quantity ?? 1}
                                onChange={(e) => handleServiceQuantityChange(idx, e.target.value)}
                                onKeyDown={(e) => handleServiceQuantityKeyDown(e, idx)}
                                onBlur={(e) => {
                                  const nextTarget = e.relatedTarget;
                                  const isPriceInput = nextTarget && servicePriceInputRefs.current[idx] === nextTarget;
                                  if (!isPriceInput) {
                                    setTimeout(() => {
                                      if (editingServiceIndex === idx) {
                                        setEditingServiceIndex(null);
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
                                  setEditingProductIndex(null);
                                  setEditingServiceIndex(idx);
                                  setTimeout(() => {
                                    if (serviceQuantityInputRefs.current[idx]) {
                                      serviceQuantityInputRefs.current[idx].focus();
                                      serviceQuantityInputRefs.current[idx].select();
                                    }
                                  }, 100);
                                }}
                                className="cursor-pointer hover:bg-muted/50 px-2 py-1 rounded inline-block"
                              >
                                {s.quantity ?? 1}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {editingServiceIndex === idx ? (
                              <input
                                ref={(el) => { servicePriceInputRefs.current[idx] = el; }}
                                type="number"
                                min="0"
                                step="1"
                                value={s.price}
                                onChange={(e) => handleServicePriceChange(idx, e.target.value)}
                                onKeyDown={(e) => handleServicePriceKeyDown(e, idx)}
                                onBlur={(e) => {
                                  const nextTarget = e.relatedTarget;
                                  const isSearchInput = nextTarget && searchInputRef.current === nextTarget;
                                  if (!isSearchInput) {
                                    setTimeout(() => {
                                      if (editingServiceIndex === idx) {
                                        setEditingServiceIndex(null);
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
                                  setEditingProductIndex(null);
                                  setEditingServiceIndex(idx);
                                  setTimeout(() => {
                                    if (servicePriceInputRefs.current[idx]) {
                                      servicePriceInputRefs.current[idx].focus();
                                      servicePriceInputRefs.current[idx].select();
                                    }
                                  }, 100);
                                }}
                                className="cursor-pointer hover:bg-muted/50 px-2 py-1 rounded inline-block"
                              >
                                {formatNumber(s.price)} JOD
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right font-medium">{formatNumber(getServiceLineTotal(s))} JOD</td>
                          <td className="px-3 py-2 text-center">
                            <button onClick={() => removeServiceFromInvoice(idx)} className="text-destructive text-sm">
                              {t('remove')}
                            </button>
                          </td>
                        </tr>
                      ))}

                    </tbody>
                  </table>
                </div>
                {/* SEARCH FIELD */}
                <div className="relative">

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
                      if (!e.currentTarget.contains(e.relatedTarget)) {
                        setTimeout(() => setShowSuggestions(false), 200);
                      }
                    }}
                    placeholder="ابحث عن منتج أو خدمة..."
                    className="w-full bg-input border border-border rounded-lg px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                  />

                  {/* FLOATING DROPDOWN */}
                  {showSuggestions && suggestions?.length > 0 && (
                    <ul
                      className="absolute top-full mt-2 left-0 right-0 max-h-60 overflow-auto bg-card border border-border rounded-lg shadow-xl z-50"
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      {suggestions.map((item, i) => (
                        <li
                          key={`${item.type}-${item.id}-${i}`}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            selectSuggestion(item, i);
                          }}
                          className={`px-4 py-3 cursor-pointer flex justify-between items-center text-sm transition ${selectedSuggestionIndex === i
                            ? 'bg-primary/20 border-l-2 border-primary'
                            : 'hover:bg-muted/50'
                            }`}
                        >
                          <div className="truncate">
                            <strong className="mr-2">
                              {item.type === 'product' ? '[P]' : '[S]'}
                            </strong>
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
              </div>

            </section>

          </div>
          {/* Right section */}
          <div className="col-span-4 space-y-6">
            <div className="sticky top-24 space-y-6">
              {/* Discount */}
              {/* <section className="bg-card border border-border rounded-xl p-6 space-y-5">
                            <div className="flex items-center gap-2 pb-4 border-b border-border">
                                <Icon icon="solar:tag-price-bold" className="size-5 text-primary" />
                                <h3 className="text-lg font-semibold font-heading">{t('discount')}</h3>
                            </div>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-foreground">{t('type')}</label>
                                    <div className="relative">
                                        <select 
                                          value={newInvoice.discountType === 'percentage' ? 'Percentage' : 'Fixed Amount'}
                                          onChange={handleDiscountTypeChange}
                                          className="w-full appearance-none bg-input border border-border rounded-lg px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                                        >
                                            <option>{t('fixedAmount')}</option>
                                            <option>{t('percentage')}</option>
                                        </select>
                                        <Icon
                                            icon="solar:alt-arrow-down-linear"
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground size-4 pointer-events-none"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-foreground">{t('amount')}</label>
                                    <input
                                        type="number"
                                        value={newInvoice.discount}
                                        onChange={handleDiscountChange}
                                        min="0"
                                        className="w-full bg-input border border-border rounded-lg px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                                    />
                                </div>
                            </div>
                        </section> */}
              {/* Customer section */}
              <section className="bg-card border border-border rounded-xl p-6 space-y-5">
                <div className="flex items-center justify-between pb-4 border-b border-border">
                  <h2 className="text-lg font-semibold font-heading">معلومات العميل</h2>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setShowNewCustomerForm(true)}
                      className="flex items-center gap-2 bg-transparent border border-border hover:bg-muted text-foreground px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
                    >
                      <Icon icon="solar:user-plus-bold" className="size-4" />
                      {t('addCustomer')}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">{t('selectCustomer')}</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={newInvoice.customerName || ''}
                        onChange={e => {
                          const input = e.target.value;
                          setNewInvoice(prev => ({
                            ...prev,
                            customerName: input,
                            customerId: '', // reset to allow custom entry
                            carNumber: '',
                            carType: '',
                            phone: ''
                          }));
                          setShowCustomerSuggestions(true);
                          setSelectedCustomerIndex(-1);
                        }}
                        onFocus={() => setShowCustomerSuggestions(true)}
                        onKeyDown={handleCustomerKeyDown}
                        placeholder={t('selectCustomer')}
                        className="w-full bg-input border border-border rounded-lg px-4 py-3 text-sm text-foreground focus:ring-2 focus:ring-ring focus:border-ring outline-none"
                        autoComplete="off"
                      />

                      {showCustomerSuggestions && (
                        <ul className="absolute left-0 right-0 mt-2 z-20 bg-card border border-border rounded shadow-lg max-h-56 overflow-y-auto">
                          {customers
                            .filter(c =>
                              c.customerName.toLowerCase().includes((newInvoice.customerName || '').toLowerCase()) ||
                              (c.carNumber || '').toLowerCase().includes((newInvoice.customerName || '').toLowerCase())
                            )
                            .map((customer, index) => (
                              <li
                                key={customer.id}
                                className={`px-4 py-2 cursor-pointer text-sm ${
                                  selectedCustomerIndex === index ? 'bg-primary/20' : 'hover:bg-muted'
                                }`}
                                onMouseDown={(e) => {
                                  // نستخدم onMouseDown حتى لا يغلق الـ input القائمة قبل اختيار العميل
                                  e.preventDefault();
                                  handleCustomerSelect(customer.id);
                                  setShowCustomerSuggestions(false);
                                  setSelectedCustomerIndex(-1);
                                }}
                              >
                                {customer.customerName} - {customer.carNumber}
                              </li>
                            ))}
                          {customers.filter(c =>
                            c.customerName.toLowerCase().includes((newInvoice.customerName || '').toLowerCase()) ||
                            (c.carNumber || '').toLowerCase().includes((newInvoice.customerName || '').toLowerCase())
                          ).length === 0 && (
                              <li className="px-4 py-2 text-muted-foreground text-sm">{t('noResultsFound')}</li>
                            )}
                        </ul>
                      )}
                    </div>
                  </div>
                  {/* <div className="space-y-2">
                                    <label className="text-sm font-medium text-foreground">{t('invoiceDate')}</label>
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
                                </div> */}
                </div>
                {newInvoice.customerName && newInvoice.carNumber && newInvoice.phone && (
                  <div className="bg-muted/30 border border-border rounded-lg p-5 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon icon="solar:user-id-bold" className="text-primary size-5" />
                      <span className="font-semibold">{t('customerDetails')}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-5">
                      <div>
                        <span className="block text-xs text-muted-foreground mb-1.5">
                          {t('customerName')}
                        </span>
                        <span className="font-medium">{newInvoice.customerName || '-'}</span>
                      </div>
                      <div>
                        <span className="block text-xs text-muted-foreground mb-1.5">{t('phone')}</span>
                        <span className="font-medium font-mono">{newInvoice.phone || '-'}</span>
                      </div>
                      <div>
                        <span className="block text-xs text-muted-foreground mb-1.5">{t('carType')}</span>
                        <span className="font-medium">{newInvoice.carType || '-'}</span>
                      </div>
                      <div>
                        <span className="block text-xs text-muted-foreground mb-1.5">{t('carNumber')}</span>
                        <span className="font-medium font-mono">{newInvoice.carNumber || '-'}</span>
                      </div>
                    </div>
                  </div>
                )}
              </section>
              {/* Invoice Summary */}
              <section className="bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/30 rounded-xl p-6 space-y-4">
                <h3 className="text-lg font-semibold font-heading mb-4">{t('invoiceSummary')}</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">المنتجات:</span>
                    <span className="font-medium">{formatNumber(productsTotal)} JOD</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">الخدمات:</span>
                    <span className="font-medium">{formatNumber(servicesTotal)} JOD</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">المبلغ الإجمالي:</span>
                    <span className="font-medium">{formatNumber(subtotal)} JOD</span>
                  </div>
                  {/* <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">{t('discount')}:</span>
                    <span className="font-medium text-destructive">- {formatNumber(discountAmount)} JOD</span>
                  </div> */}
                </div>
                <div className="h-px bg-border my-4" />
                <div className="flex justify-between items-center">
                  <span className="font-bold text-lg">{t('finalAmount')}:</span>
                  <span className="font-bold text-2xl text-primary">{formatNumber(newInvoice.finalAmount)} JOD</span>
                </div>
                <div className="pt-4 space-y-3">
                  <button
                    onClick={handleSaveAsOpenInvoice}
                    disabled={isSaving}
                    className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white rounded-lg font-semibold shadow-lg flex items-center justify-center gap-2 transition-all"
                  >
                    {isSaving ? (
                      <>
                        <Icon icon="svg-spinners:ring-resize" className="size-5 animate-spin" />
                        {t('saving')}...
                      </>
                    ) : (
                      <>
                        <Icon icon="solar:diskette-bold" className="size-5" />
                        حفظ كفاتورة مفتوحة
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleCloseInvoice}
                    disabled={isSaving}
                    className="w-full py-3.5 px-4 bg-[#10b981] hover:bg-[#059669] disabled:bg-[#10b981]/50 disabled:cursor-not-allowed text-white rounded-lg font-semibold shadow-lg flex items-center justify-center gap-2 transition-all"
                  >
                    <Icon icon="solar:check-circle-bold" className="size-5" />
                    الانتقال للدفع
                  </button>
                  <button onClick={onBack} className="w-full py-3 px-4 bg-transparent border border-border hover:bg-muted text-foreground rounded-lg font-medium transition-colors">
                    {t('cancel')}
                  </button>
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>

      {/* Payment Modal */}
      {showPaymentModal && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          invoiceAmount={newInvoice.finalAmount}
          onPaymentComplete={handlePaymentComplete}
        />
      )}

      {/* Add New Customer Modal */}
      {showNewCustomerForm && (
        <div className="fixed inset-0 w-full h-full bg-[#00000085] bg-opacity-50 flex items-center justify-center z-50">
          <div className={`p-6 rounded-lg w-full max-w-md ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h2 className="text-xl font-bold mb-4">{t('addNewCustomer')}</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">{t('customerName')}</label>
                <input
                  type="text"
                  value={newCustomer.customerName}
                  onChange={(e) => setNewCustomer({ ...newCustomer, customerName: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                    }`}
                  placeholder={t('customerName')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">{t('carType')}</label>
                <input
                  type="text"
                  value={newCustomer.carType}
                  onChange={(e) => setNewCustomer({ ...newCustomer, carType: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                    }`}
                  placeholder={t('carType')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">{t('carNumber')}</label>
                <input
                  type="text"
                  value={newCustomer.carNumber}
                  onChange={(e) => setNewCustomer({ ...newCustomer, carNumber: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                    }`}
                  placeholder={t('carNumber')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">{t('phone')}</label>
                <input
                  type="text"
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
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

      {/* Add New Product Modal */}
      {showNewProductForm && (
        <div className="fixed inset-0 w-full h-full bg-[#00000085] bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className={`p-6 rounded-lg w-full max-w-5xl my-4 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h2 className="text-xl font-bold mb-4">{t('addProduct')}</h2>
            <form id="addProductForm" onSubmit={handleProductFormSubmit}>
              {/* كل صف فيه حقلين أو ثلاث حقول جنب بعض */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="productName">{t('productName')}</label>
                    <input
                      type="text"
                      placeholder={t('productName')}
                      value={newProduct.name}
                      onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                      onKeyDown={(e) => handleKeyDown(e, 'addProductForm')}
                      className={`w-full px-3 py-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                        }`}
                    />
                  </div>
                  <div>
                    <label htmlFor="partNumber">{t('partNumber')}</label>
                    <input
                      type="text"
                      placeholder={t('partNumber')}
                      value={newProduct.partNumber}
                      onChange={(e) => setNewProduct({ ...newProduct, partNumber: e.target.value })}
                      onKeyDown={(e) => handleKeyDown(e, 'addProductForm')}
                      className={`w-full px-3 py-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                        }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="category">{t('category')}</label>
                    <input
                      type="text"
                      placeholder={t('category')}
                      value={newProduct.category}
                      onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                      onKeyDown={(e) => handleKeyDown(e, 'addProductForm')}
                      className={`w-full px-3 py-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                        }`}
                      list="categories"
                    />
                    <datalist id="categories">
                      {categories.map((category) => (
                        <option key={category} value={category} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label htmlFor="brandName">{t('brandName')}</label>
                    <input
                      type="text"
                      placeholder={t('brandName')}
                      value={newProduct.brandName}
                      onChange={(e) => setNewProduct({ ...newProduct, brandName: e.target.value })}
                      onKeyDown={(e) => handleKeyDown(e, 'addProductForm')}
                      className={`w-full px-3 py-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                        }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="storageLocation">{t('storageLocation')}</label>
                    <input
                      type="text"
                      placeholder={t('storageLocation')}
                      value={newProduct.storageLocation}
                      onChange={(e) => setNewProduct({ ...newProduct, storageLocation: e.target.value })}
                      onKeyDown={(e) => handleKeyDown(e, 'addProductForm')}
                      className={`w-full px-3 py-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                        }`}
                    />
                  </div>
                  <div>
                    <label htmlFor="quantity">{t('quantity')}</label>
                    <input
                      type="number"
                      placeholder={t('quantity')}
                      value={newProduct.quantity}
                      onChange={(e) => setNewProduct({ ...newProduct, quantity: e.target.value })}
                      onKeyDown={(e) => handleKeyDown(e, 'addProductForm')}
                      className={`w-full px-3 py-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                        }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="cost">{t('cost')}</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder={t('cost')}
                      value={newProduct.cost}
                      onChange={(e) => setNewProduct({ ...newProduct, cost: e.target.value })}
                      onKeyDown={(e) => handleKeyDown(e, 'addProductForm')}
                      className={`w-full px-3 py-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                        }`}
                    />
                  </div>
                  <div>
                    <label htmlFor="price">{t('price')}</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder={t('price')}
                      value={newProduct.price}
                      onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                      onKeyDown={(e) => handleKeyDown(e, 'addProductForm')}
                      className={`w-full px-3 py-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                        }`}
                    />
                  </div>
                </div>

                {/* حقل الوصف يكون في صف لوحده بكامل العرض */}
                <div>
                  <label htmlFor="description">{t('description')}</label>
                  <textarea
                    placeholder={t('description')}
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                    className={`w-full px-3 py-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                      }`}
                    rows="3"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <button className="w-full py-3 px-4 bg-transparent border border-border hover:bg-muted text-foreground rounded-lg font-medium transition-colors"
                  onClick={() => { setShowNewProductForm(false) }}>
                  Cancel
                </button>
                <button className="w-full py-3.5 px-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-semibold shadow-lg shadow-primary/25 flex items-center justify-center gap-2 transition-all"
                  onClick={() => { handleAddNewProduct() }}>
                  اضافة منتج
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
