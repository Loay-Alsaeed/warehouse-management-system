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
  Building2,
  User,
  Phone,
  Mail
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

const Suppliers = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('companyName');
  const [sortOrder, setSortOrder] = useState('asc');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState(null);
  const { t, i18n } = useTranslation();
  const { darkMode } = useTheme();
  const { success, error: showError } = useNotifications();

  // Handle form submit
  const handleFormSubmit = (e) => {
    e.preventDefault();
  };

  const [newSupplier, setNewSupplier] = useState({
    companyName: '',
    contactPerson: '',
    phone: '',
    email: ''
  });

  useEffect(() => {
    fetchSuppliers();
  }, []);

  useEffect(() => {
    filterAndSortSuppliers();
  }, [suppliers, searchTerm, sortBy, sortOrder]);

  const fetchSuppliers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'suppliers'));
      const suppliersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setSuppliers(suppliersData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      setLoading(false);
    }
  };

  const filterAndSortSuppliers = () => {
    let filtered = suppliers;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(supplier =>
        supplier.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.phone.includes(searchTerm) ||
        supplier.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort suppliers
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'companyName':
          aValue = a.companyName.toLowerCase();
          bValue = b.companyName.toLowerCase();
          break;
        case 'contactPerson':
          aValue = a.contactPerson.toLowerCase();
          bValue = b.contactPerson.toLowerCase();
          break;
        case 'phone':
          aValue = a.phone;
          bValue = b.phone;
          break;
        case 'email':
          aValue = a.email.toLowerCase();
          bValue = b.email.toLowerCase();
          break;
        default:
          aValue = a.companyName.toLowerCase();
          bValue = b.companyName.toLowerCase();
          break;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredSuppliers(filtered);
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handleAddSupplier = async () => {
    try {
      const supplierData = {
        ...newSupplier,
        createdAt: new Date()
      };

      await addDoc(collection(db, 'suppliers'), supplierData);
      setShowAddModal(false);
      setNewSupplier({
        companyName: '',
        contactPerson: '',
        phone: '',
        email: ''
      });
      fetchSuppliers();
      success(t('supplierAdded'), t('supplierAddedMessage'));
    } catch (error) {
      console.error('Error adding supplier:', error);
      showError(t('error'), t('supplierAddError'));
    }
  };

  const handleEditSupplier = async () => {
    try {
      const supplierRef = doc(db, 'suppliers', editingSupplier.id);
      const supplierData = {
        ...editingSupplier,
        updatedAt: new Date()
      };

      await updateDoc(supplierRef, supplierData);
      setShowEditModal(false);
      setEditingSupplier(null);
      fetchSuppliers();
      success(t('supplierUpdated'), t('supplierUpdatedMessage'));
    } catch (error) {
      console.error('Error updating supplier:', error);
      showError(t('error'), t('supplierUpdateError'));
    }
  };

  const handleDeleteSupplier = async (supplierId) => {
    try {
      await deleteDoc(doc(db, 'suppliers', supplierId));
      fetchSuppliers();
      success(t('supplierDeleted'), t('supplierDeletedMessage'));
    } catch (error) {
      console.error('Error deleting supplier:', error);
      showError(t('error'), t('supplierDeleteError'));
    }
  };

  const openDeleteModal = (supplier) => {
    setSupplierToDelete(supplier);
    setShowDeleteModal(true);
  };

  const openEditModal = (supplier) => {
    setEditingSupplier(supplier);
    setShowEditModal(true);
  };

  if (loading) {
    return <LoadingSpinner page="suppliers" />;
  }

  return (
    <div className={`h-[100%] w-full ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-4">{t('suppliers')}</h1>
          
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
              {t('addSupplier')}
            </button>
          </div>
        </div>

        {/* Suppliers Table */}
        <div className={`overflow-x-auto rounded-lg shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <table className="w-full">
            <thead className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <tr>
                <th className={`px-6 py-3 text-center text-xs font-medium uppercase tracking-wider cursor-pointer ${
                  darkMode ? 'text-gray-300' : 'text-gray-500'
                }`} onClick={() => handleSort('companyName')}>
                  <div className="flex items-center gap-2 justify-center">
                    <Building2 size={16} />
                    {t('companyName')}
                    {sortBy === 'companyName' && (
                      sortOrder === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </div>
                </th>
                <th className={`px-6 py-3 text-center text-xs font-medium uppercase tracking-wider cursor-pointer ${
                  darkMode ? 'text-gray-300' : 'text-gray-500'
                }`} onClick={() => handleSort('contactPerson')}>
                  <div className="flex items-center gap-2 justify-center">
                    <User size={16} />
                    {t('contactPerson')}
                    {sortBy === 'contactPerson' && (
                      sortOrder === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </div>
                </th>
                <th className={`px-6 py-3 text-center text-xs font-medium uppercase tracking-wider cursor-pointer ${
                  darkMode ? 'text-gray-300' : 'text-gray-500'
                }`} onClick={() => handleSort('phone')}>
                  <div className="flex items-center gap-2 justify-center">
                    <Phone size={16} />
                    {t('phone')}
                    {sortBy === 'phone' && (
                      sortOrder === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </div>
                </th>
                <th className={`px-6 py-3 text-center text-xs font-medium uppercase tracking-wider cursor-pointer ${
                  darkMode ? 'text-gray-300' : 'text-gray-500'
                }`} onClick={() => handleSort('email')}>
                  <div className="flex items-center gap-2 justify-center">
                    <Mail size={16} />
                    {t('email')}
                    {sortBy === 'email' && (
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
               {filteredSuppliers.map((supplier) => (
                 <tr key={supplier.id} className={`${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
                   <td className="px-6 py-4 whitespace-nowrap text-center">
                     <div className="text-sm font-medium">{supplier.companyName}</div>
                   </td>
                   <td className="px-6 py-4 whitespace-nowrap text-center">
                     <div className="text-sm">{supplier.contactPerson}</div>
                   </td>
                   <td className="px-6 py-4 whitespace-nowrap text-center">
                     <div className="text-sm">{supplier.phone}</div>
                   </td>
                   <td className="px-6 py-4 whitespace-nowrap text-center">
                     <div className="text-sm">{supplier.email}</div>
                   </td>
                   <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center">
                     <div className="flex gap-2 justify-center">
                       <button
                         onClick={() => openEditModal(supplier)}
                         className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-xs"
                       >
                         <Edit size={14} className="inline mr-1" />
                         {t('editSupplier')}
                       </button>
                       <button
                         onClick={() => openDeleteModal(supplier)}
                         className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-xs"
                       >
                         <Trash2 size={14} className="inline mr-1" />
                         {t('deleteSupplier')}
                       </button>
                     </div>
                   </td>
                 </tr>
               ))}
             </tbody>
          </table>

          {filteredSuppliers.length === 0 && (
            <div className="text-center py-12">
              <p className="text-xl text-gray-500">{t('noSuppliers')}</p>
            </div>
          )}
        </div>

        {/* Add Supplier Modal */}
        {showAddModal && (
          <div className="fixed inset-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className={`p-6 rounded-lg w-full max-w-md ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <h2 className="text-xl font-bold mb-4">{t('addSupplier')}</h2>
              <form onSubmit={handleFormSubmit}>
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder={t('companyName')}
                    value={newSupplier.companyName}
                    onChange={(e) => setNewSupplier({...newSupplier, companyName: e.target.value})}
                    className={`w-full px-3 py-2 border rounded ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                    }`}
                  />
                  <input
                    type="text"
                    placeholder={t('contactPerson')}
                    value={newSupplier.contactPerson}
                    onChange={(e) => setNewSupplier({...newSupplier, contactPerson: e.target.value})}
                    className={`w-full px-3 py-2 border rounded ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                    }`}
                  />
                  <input
                    type="tel"
                    placeholder={t('phone')}
                    value={newSupplier.phone}
                    onChange={(e) => setNewSupplier({...newSupplier, phone: e.target.value})}
                    className={`w-full px-3 py-2 border rounded ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                    }`}
                  />
                  <input
                    type="email"
                    placeholder={t('email')}
                    value={newSupplier.email}
                    onChange={(e) => setNewSupplier({...newSupplier, email: e.target.value})}
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
                    onClick={handleAddSupplier}
                    className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!newSupplier.companyName || !newSupplier.contactPerson || !newSupplier.phone || !newSupplier.email || loading}
                  >
                    {t('save')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Supplier Modal */}
        {showEditModal && editingSupplier && (
          <div className="fixed inset-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className={`p-6 rounded-lg w-full max-w-md ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <h2 className="text-xl font-bold mb-4">{t('editSupplier')}</h2>
              <form onSubmit={handleFormSubmit}>
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder={t('companyName')}
                    value={editingSupplier.companyName}
                    onChange={(e) => setEditingSupplier({...editingSupplier, companyName: e.target.value})}
                    className={`w-full px-3 py-2 border rounded ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                    }`}
                  />
                  <input
                    type="text"
                    placeholder={t('contactPerson')}
                    value={editingSupplier.contactPerson}
                    onChange={(e) => setEditingSupplier({...editingSupplier, contactPerson: e.target.value})}
                    className={`w-full px-3 py-2 border rounded ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                    }`}
                  />
                  <input
                    type="tel"
                    placeholder={t('phone')}
                    value={editingSupplier.phone}
                    onChange={(e) => setEditingSupplier({...editingSupplier, phone: e.target.value})}
                    className={`w-full px-3 py-2 border rounded ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                    }`}
                  />
                  <input
                    type="email"
                    placeholder={t('email')}
                    value={editingSupplier.email}
                    onChange={(e) => setEditingSupplier({...editingSupplier, email: e.target.value})}
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
                    onClick={handleEditSupplier}
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
          onConfirm={() => handleDeleteSupplier(supplierToDelete?.id)}
          title={t('deleteConfirmation')}
          message={t('confirmDeleteSupplier')}
          confirmText="delete"
          cancelText="cancel"
          type="danger"
        />
      </div>
    </div>
  );
};

export default Suppliers;
