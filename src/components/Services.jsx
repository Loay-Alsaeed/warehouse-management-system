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
  Wrench
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

const Services = () => {
  const [services, setServices] = useState([]);
  const [filteredServices, setFilteredServices] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState(null);
  const { t, i18n } = useTranslation();
  const { darkMode } = useTheme();
  const { success, error: showError, warning } = useNotifications();

  const [newService, setNewService] = useState({
    name: '',
    notes: '',
    price: ''
  });

  useEffect(() => {
    fetchServices();
  }, []);

  useEffect(() => {
    filterAndSortServices();
  }, [services, searchTerm, sortBy, sortOrder]);

  const fetchServices = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'services'));
      const servicesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setServices(servicesData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching services:', error);
      setLoading(false);
    }
  };

  const filterAndSortServices = () => {
    let filtered = services;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(service =>
        service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (service.notes && service.notes.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Sort services
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'price':
          aValue = parseFloat(a.price) || 0;
          bValue = parseFloat(b.price) || 0;
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

    setFilteredServices(filtered);
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handleAddService = async () => {
    try {
      const serviceData = {
        ...newService,
        price: parseFloat(newService.price),
        createdAt: new Date()
      };

      await addDoc(collection(db, 'services'), serviceData);
      setShowAddModal(false);
      setNewService({
        name: '',
        notes: '',
        price: ''
      });
      fetchServices();
      success(t('serviceAdded'), t('serviceAddedMessage'));
    } catch (error) {
      console.error('Error adding service:', error);
      showError(t('error'), t('serviceAddError'));
    }
  };

  const handleEditService = async () => {
    try {
      const serviceRef = doc(db, 'services', editingService.id);
      const serviceData = {
        ...editingService,
        price: parseFloat(editingService.price),
        updatedAt: new Date()
      };

      await updateDoc(serviceRef, serviceData);
      setShowEditModal(false);
      setEditingService(null);
      fetchServices();
      success(t('serviceUpdated'), t('serviceUpdatedMessage'));
    } catch (error) {
      console.error('Error updating service:', error);
      showError(t('error'), t('serviceUpdateError'));
    }
  };

  const handleDeleteService = async (serviceId) => {
    try {
      await deleteDoc(doc(db, 'services', serviceId));
      fetchServices();
      success(t('serviceDeleted'), t('serviceDeletedMessage'));
    } catch (error) {
      console.error('Error deleting service:', error);
      showError(t('error'), t('serviceDeleteError'));
    }
  };

  const openDeleteModal = (service) => {
    setServiceToDelete(service);
    setShowDeleteModal(true);
  };

  const openEditModal = (service) => {
    setEditingService(service);
    setShowEditModal(true);
  };

  if (loading) {
    return <LoadingSpinner page="services" />;
  }

  return (
    <div className={`h-[100%] w-full ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-4 flex items-center gap-2">
            <Wrench size={32} />
            {t('services')}
          </h1>
          
          {/* Search and Add Controls */}
          <div className="flex justify-between items-center gap-4 mb-6">
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
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2"
            >
              <Plus size={20} />
              {t('addService')}
            </button>
          </div>
        </div>

        {/* Services Table */}
        <div className={`overflow-x-auto rounded-lg shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <table className="w-full">
            <thead className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <tr>
                <th className={`px-6 py-3 text-center text-xs font-medium uppercase tracking-wider cursor-pointer ${
                  darkMode ? 'text-gray-300' : 'text-gray-500'
                }`} onClick={() => handleSort('name')}>
                  <div className="flex items-center justify-center gap-2">
                    {t('serviceName')}
                    {sortBy === 'name' && (
                      sortOrder === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </div>
                </th>
                <th className={`px-6 py-3 text-center text-xs font-medium uppercase tracking-wider ${
                  darkMode ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  {t('notes')}
                </th>
                <th className={`px-6 py-3 text-center text-xs font-medium uppercase tracking-wider cursor-pointer ${
                  darkMode ? 'text-gray-300' : 'text-gray-500'
                }`} onClick={() => handleSort('price')}>
                  <div className="flex items-center justify-center gap-2">
                    {t('price')}
                    {sortBy === 'price' && (
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
              {filteredServices.map((service) => (
                <tr key={service.id} className={`${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="text-sm font-medium">{service.name}</div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div 
                      className="text-sm max-w-xs truncate cursor-help" 
                      title={service.notes || ''}
                    >
                      {service.notes || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="text-sm">{service.price} JOD</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center">
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => openEditModal(service)}
                        className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-xs"
                      >
                        <Edit size={14} className="inline mr-1" />
                        {t('editService')}
                      </button>
                      <button
                        onClick={() => openDeleteModal(service)}
                        className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-xs"
                      >
                        <Trash2 size={14} className="inline mr-1" />
                        {t('deleteService')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredServices.length === 0 && (
            <div className="text-center py-12">
              <p className="text-xl text-gray-500">{t('noServices')}</p>
            </div>
          )}
        </div>

        {/* Add Service Modal */}
        {showAddModal && (
          <div className="fixed inset-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className={`p-6 rounded-lg w-full max-w-md ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <h2 className="text-xl font-bold mb-4">{t('addService')}</h2>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder={t('serviceName')}
                  value={newService.name}
                  onChange={(e) => setNewService({...newService, name: e.target.value})}
                  className={`w-full px-3 py-2 border rounded ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                />
                <textarea
                  placeholder={t('notes')}
                  value={newService.notes}
                  onChange={(e) => setNewService({...newService, notes: e.target.value})}
                  className={`w-full px-3 py-2 border rounded ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                  rows="3"
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder={t('price')}
                  value={newService.price}
                  onChange={(e) => setNewService({...newService, price: e.target.value})}
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
                  onClick={handleAddService}
                  className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
                  disabled={!newService.name || !newService.price || loading}
                >
                  {t('save')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Service Modal */}
        {showEditModal && editingService && (
          <div className="fixed inset-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className={`p-6 rounded-lg w-full max-w-md ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <h2 className="text-xl font-bold mb-4">{t('editService')}</h2>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder={t('serviceName')}
                  value={editingService.name}
                  onChange={(e) => setEditingService({...editingService, name: e.target.value})}
                  className={`w-full px-3 py-2 border rounded ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                />
                <textarea
                  placeholder={t('notes')}
                  value={editingService.notes || ''}
                  onChange={(e) => setEditingService({...editingService, notes: e.target.value})}
                  className={`w-full px-3 py-2 border rounded ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                  rows="3"
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder={t('price')}
                  value={editingService.price}
                  onChange={(e) => setEditingService({...editingService, price: e.target.value})}
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
                  onClick={handleEditService}
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
          onConfirm={() => handleDeleteService(serviceToDelete?.id)}
          title={t('deleteConfirmation')}
          message={t('confirmDeleteService')}
          confirmText="delete"
          cancelText="cancel"
          type="danger"
        />
      </div>
    </div>
  );
};

export default Services;
