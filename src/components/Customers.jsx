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
  User,
  Car,
  Phone
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

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('customerName');
  const [sortOrder, setSortOrder] = useState('asc');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);
  const { t, i18n } = useTranslation();
  const { darkMode } = useTheme();
  const { success, error: showError } = useNotifications();

  const [newCustomer, setNewCustomer] = useState({
    customerName: '',
    carType: '',
    carNumber: '',
    phone: ''
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    filterAndSortCustomers();
  }, [customers, searchTerm, sortBy, sortOrder]);

  const fetchCustomers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'customers'));
      const customersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCustomers(customersData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching customers:', error);
      setLoading(false);
    }
  };

  const filterAndSortCustomers = () => {
    let filtered = customers;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(customer =>
        customer.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.carType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.carNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone.includes(searchTerm)
      );
    }

    // Sort customers
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'customerName':
          aValue = a.customerName.toLowerCase();
          bValue = b.customerName.toLowerCase();
          break;
        case 'carType':
          aValue = a.carType.toLowerCase();
          bValue = b.carType.toLowerCase();
          break;
        case 'carNumber':
          aValue = a.carNumber.toLowerCase();
          bValue = b.carNumber.toLowerCase();
          break;
        case 'phone':
          aValue = a.phone;
          bValue = b.phone;
          break;
        default:
          aValue = a.customerName.toLowerCase();
          bValue = b.customerName.toLowerCase();
          break;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredCustomers(filtered);
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handleAddCustomer = async () => {
    try {
      setShowAddModal(false);
      const customerData = {
        ...newCustomer,
        createdAt: new Date()
      };

      await addDoc(collection(db, 'customers'), customerData);
      setNewCustomer({
        customerName: '',
        carType: '',
        carNumber: '',
        phone: ''
      });
      fetchCustomers();
      success(t('customerAdded'), t('customerAddedMessage'));
    } catch (error) {
      console.error('Error adding customer:', error);
      showError(t('error'), t('customerAddError'));
    }
  };

  const handleEditCustomer = async () => {
    try {
      const customerRef = doc(db, 'customers', editingCustomer.id);
      const customerData = {
        ...editingCustomer,
        updatedAt: new Date()
      };

      await updateDoc(customerRef, customerData);
      setShowEditModal(false);
      setEditingCustomer(null);
      fetchCustomers();
      success(t('customerUpdated'), t('customerUpdatedMessage'));
    } catch (error) {
      console.error('Error updating customer:', error);
      showError(t('error'), t('customerUpdateError'));
    }
  };

  const handleDeleteCustomer = async (customerId) => {
    try {
      await deleteDoc(doc(db, 'customers', customerId));
      fetchCustomers();
      success(t('customerDeleted'), t('customerDeletedMessage'));
    } catch (error) {
      console.error('Error deleting customer:', error);
      showError(t('error'), t('customerDeleteError'));
    }
  };

  const openDeleteModal = (customer) => {
    setCustomerToDelete(customer);
    setShowDeleteModal(true);
  };

  const openEditModal = (customer) => {
    setEditingCustomer(customer);
    setShowEditModal(true);
  };

  if (loading) {
    return <LoadingSpinner page="customers" />;
  }

  return (
    <div className={`h-[100%] w-full ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-4">{t('customers')}</h1>
          
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
              {t('addCustomer')}
            </button>
          </div>
        </div>

        {/* Customers Table */}
        <div className={`overflow-x-auto rounded-lg shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <table className="w-full">
            <thead className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <tr>
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
                <th className={`px-6 py-3 text-center text-xs font-medium uppercase tracking-wider cursor-pointer ${
                  darkMode ? 'text-gray-300' : 'text-gray-500'
                }`} onClick={() => handleSort('carType')}>
                  <div className="flex items-center justify-center gap-2">
                    <Car size={16} />
                    {t('carType')}
                    {sortBy === 'carType' && (
                      sortOrder === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </div>
                </th>
                <th className={`px-6 py-3 text-center text-xs font-medium uppercase tracking-wider cursor-pointer ${
                  darkMode ? 'text-gray-300' : 'text-gray-500'
                }`} onClick={() => handleSort('carNumber')}>
                  <div className="flex items-center justify-center gap-2">
                    <Car size={16} />
                    {t('carNumber')}
                    {sortBy === 'carNumber' && (
                      sortOrder === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </div>
                </th>
                <th className={`px-6 py-3 text-center text-xs font-medium uppercase tracking-wider cursor-pointer ${
                  darkMode ? 'text-gray-300' : 'text-gray-500'
                }`} onClick={() => handleSort('phone')}>
                  <div className="flex items-center justify-center gap-2">
                    <Phone size={16} />
                    {t('phone')}
                    {sortBy === 'phone' && (
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
                         <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
               {filteredCustomers.map((customer) => (
                 <tr key={customer.id} className={`${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
                   <td className="px-6 py-4 whitespace-nowrap text-center">
                     <div className="text-sm font-medium">{customer.customerName}</div>
                   </td>
                   <td className="px-6 py-4 whitespace-nowrap text-center">
                     <div className="text-sm">{customer.carType}</div>
                   </td>
                   <td className="px-6 py-4 whitespace-nowrap text-center">
                     <div className="text-sm">{customer.carNumber}</div>
                   </td>
                   <td className="px-6 py-4 whitespace-nowrap text-center">
                     <div className="text-sm">{customer.phone}</div>
                   </td>
                   <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center">
                     <div className="flex gap-2 justify-center">
                       <button
                         onClick={() => openEditModal(customer)}
                         className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-xs"
                       >
                         <Edit size={14} className="inline mr-1" />
                         {t('editCustomer')}
                       </button>
                       <button
                         onClick={() => openDeleteModal(customer)}
                         className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-xs"
                       >
                         <Trash2 size={14} className="inline mr-1" />
                         {t('deleteCustomer')}
                       </button>
                     </div>
                   </td>
                 </tr>
               ))}
             </tbody>
          </table>

          {filteredCustomers.length === 0 && (
            <div className="text-center py-12">
              <p className="text-xl text-gray-500">{t('noCustomers')}</p>
            </div>
          )}
        </div>

        {/* Add Customer Modal */}
        {showAddModal && (
          <div className="fixed inset-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className={`p-6 rounded-lg w-full max-w-md ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <h2 className="text-xl font-bold mb-4">{t('addCustomer')}</h2>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder={t('customerName')}
                  value={newCustomer.customerName}
                  onChange={(e) => setNewCustomer({...newCustomer, customerName: e.target.value})}
                  className={`w-full px-3 py-2 border rounded ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                />
                <input
                  type="text"
                  placeholder={t('carType')}
                  value={newCustomer.carType}
                  onChange={(e) => setNewCustomer({...newCustomer, carType: e.target.value})}
                  className={`w-full px-3 py-2 border rounded ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                />
                <input
                  type="text"
                  placeholder={t('carNumber')}
                  value={newCustomer.carNumber}
                  onChange={(e) => setNewCustomer({...newCustomer, carNumber: e.target.value})}
                  className={`w-full px-3 py-2 border rounded ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                />
                <input
                  type="tel"
                  placeholder={t('phone')}
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                  className={`w-full px-3 py-2 border rounded ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                />
              </div>
              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border rounded hover:bg-gray-100"
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={loading ? null : handleAddCustomer}
                  className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
                  disabled={!newCustomer.customerName || !newCustomer.carType || !newCustomer.carNumber || !newCustomer.phone || loading}
                >
                  {t('save')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Customer Modal */}
        {showEditModal && editingCustomer && (
          <div className="fixed inset-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className={`p-6 rounded-lg w-full max-w-md ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <h2 className="text-xl font-bold mb-4">{t('editCustomer')}</h2>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder={t('customerName')}
                  value={editingCustomer.customerName}
                  onChange={(e) => setEditingCustomer({...editingCustomer, customerName: e.target.value})}
                  className={`w-full px-3 py-2 border rounded ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                />
                <input
                  type="text"
                  placeholder={t('carType')}
                  value={editingCustomer.carType}
                  onChange={(e) => setEditingCustomer({...editingCustomer, carType: e.target.value})}
                  className={`w-full px-3 py-2 border rounded ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                />
                <input
                  type="text"
                  placeholder={t('carNumber')}
                  value={editingCustomer.carNumber}
                  onChange={(e) => setEditingCustomer({...editingCustomer, carNumber: e.target.value})}
                  className={`w-full px-3 py-2 border rounded ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                />
                <input
                  type="tel"
                  placeholder={t('phone')}
                  value={editingCustomer.phone}
                  onChange={(e) => setEditingCustomer({...editingCustomer, phone: e.target.value})}
                  className={`w-full px-3 py-2 border rounded ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                />
              </div>
              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 border rounded hover:bg-gray-100"
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={handleEditCustomer}
                  className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
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
          onConfirm={() => handleDeleteCustomer(customerToDelete?.id)}
          title={t('deleteConfirmation')}
          message={t('confirmDeleteCustomer')}
          confirmText="delete"
          cancelText="cancel"
          type="danger"
        />
      </div>
    </div>
  );
};

export default Customers;
