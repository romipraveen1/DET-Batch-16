import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { ChevronLeft, Plus, Edit2, Trash2, Briefcase } from 'lucide-react';
import axios from 'axios';
import { deleteDesignation, Designations, getDesignations, putDesignation } from '../api/designation/designation';
import { Toast } from '../components/ui/Toast';
import apiClient from '../lib/api';

const Designation: React.FC = () => {
  const navigate = useNavigate();
  const [designations, setDesignations] = useState<Designations[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingDesignation, setEditingDesignation] = useState<Designations | null>(null);
  const [deletingDesignation, setDeletingDesignation] = useState<Designations | null>(null);
  const [formData, setFormData] = useState({
    name: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const baseUrl=import.meta.env.VITE_BASE_URL;
  const [toast, setToast] = useState<{
    isOpen: boolean;
    message: string;
    type: "success" | "error";
  }>({
    isOpen: false,
    message: "",
    type: "success",
  });
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;
  const totalPages = Math.ceil(designations.length / pageSize);
  const paginatedDesignations = designations.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ isOpen: true, message, type });
  };

  // Fetch designations from API on mount
  const fetchDesignations = async () => {
    setIsLoading(true);
    try {
      const response = await getDesignations();
      setDesignations(Array.isArray(response.data) ? response.data : []);
    } catch (err: any) {
      setDesignations([]); // Ensure it's always an array
      showToast(err.response?.data?.message || 'Failed to fetch designations', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDesignations();
    // Reset toast on mount so none show at page load
    setToast({ isOpen: false, message: '', type: 'success' });
    setCurrentPage(1); // Reset to first page on mount
  }, []);

  const resetForm = () => {
    setFormData({
      name: ''
    });
    // Clear any existing toast messages when resetting form
    setToast({ isOpen: false, message: '', type: 'success' });
  };

  const handleCreate = async () => {
    setIsLoading(true);
    try {
      await apiClient.post(`${baseUrl}designation`, formData);
      await fetchDesignations(); // Refresh the list from backend
      setIsCreateModalOpen(false);
      resetForm();
      showToast('Designation created successfully!', 'success');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to create designation';
      
      // Close modal and show validation error on main page
      setIsCreateModalOpen(false);
      resetForm();
      showToast(errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!editingDesignation) return;
    
    // Check if the designation name has actually changed
    if (formData.name.trim() === editingDesignation.name.trim()) {
      showToast('No changes were made to the designation', 'error');
      return;
    }
    
    setIsLoading(true);
    try {
      await putDesignation(editingDesignation.id, formData);
      await fetchDesignations(); // Refresh the list from backend
      setIsEditModalOpen(false);
      setEditingDesignation(null);
      resetForm();
      showToast('Designation updated successfully!', 'success');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to update designation';
      
      // Close modal and show validation error on main page
      setIsEditModalOpen(false);
      setEditingDesignation(null);
      resetForm();
      showToast(errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingDesignation) return;
    setIsLoading(true);
    try {
      await deleteDesignation(deletingDesignation.id);
      setDesignations(
        designations.filter((designation) => designation.id !== deletingDesignation.id)
      );
      setIsDeleteModalOpen(false);
      setDeletingDesignation(null);
      showToast('Designation deleted successfully!', 'success');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to delete designation';
      
      // Close modal and show validation error on main page
      setIsDeleteModalOpen(false);
      setDeletingDesignation(null);
      showToast(errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const openEditModal = (designation: Designations) => {
    setEditingDesignation(designation);
    setFormData({
      name: designation.name
    });
    setIsEditModalOpen(true);
    setToast({ isOpen: false, message: '', type: 'success' }); // Clear any existing toasts
  };

  const openDeleteModal = (designation: Designations) => {
    setDeletingDesignation(designation);
    setIsDeleteModalOpen(true);
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'entry': return 'bg-green-100 text-green-800';
      case 'mid': return 'bg-blue-100 text-blue-800';
      case 'senior': return 'bg-purple-100 text-purple-800';
      case 'lead': return 'bg-orange-100 text-orange-800';
      case 'manager': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getLevelLabel = (level: string) => {
    switch (level) {
      case 'entry': return 'Entry Level';
      case 'mid': return 'Mid Level';
      case 'senior': return 'Senior';
      case 'lead': return 'Lead';
      case 'manager': return 'Manager';
      default: return level;
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-8">
      {/* Toast Notification */}
      <Toast
        isOpen={toast.isOpen}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, isOpen: false })}
      />
      {/* Back Button */}
      <div className="mb-6 flex justify-end">
        <Button
          variant="secondary"
          onClick={() => navigate('/configurations')}
          className="flex items-center"
        >
          <ChevronLeft className="w-5 h-5 mr-2" /> Back
        </Button>
      </div>

      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center">
          <Briefcase className="w-8 h-8 text-blue-500 mr-3" />
          <h1 className="text-3xl font-bold text-gray-900">Designation Management</h1>
        </div>
                 <Button
           onClick={() => {
             setIsCreateModalOpen(true);
             setToast({ isOpen: false, message: '', type: 'success' }); // Clear any existing toasts
           }}
           className="flex items-center"
         >
           <Plus className="w-5 h-5 mr-2" />
           Create Designation
         </Button>
      </div>

      {/* Designations Table */}
      <div className="overflow-x-auto rounded-lg shadow mb-8 max-w-2xl mx-auto">
        <table className="min-w-full divide-y divide-gray-200 text-base">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Designation Name</th>
              <th className="px-5 py-3 text-center text-sm font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
                         {Array.isArray(designations) && designations.length === 0 && !isLoading && (
               <tr>
                 <td colSpan={2} className="px-5 py-3 text-center text-gray-500">
                   No designations found.
                 </td>
               </tr>
             )}
            {Array.isArray(paginatedDesignations) && paginatedDesignations.map((designation) => (
              <tr key={designation.id}>
                <td className="px-5 py-3 whitespace-nowrap font-semibold text-gray-900 text-base">{designation.name}</td>
                <td className="px-5 py-3 whitespace-nowrap text-center">
                  <button
                    onClick={() => openEditModal(designation)}
                    className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded mr-2"
                    title="Edit"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => openDeleteModal(designation)}
                    className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                    title="Delete"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 py-4">
            <button
              className="px-3 py-1 rounded border bg-gray-100 text-gray-700 disabled:opacity-50"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i + 1}
                className={`px-3 py-1 rounded border ${currentPage === i + 1 ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'}`}
                onClick={() => setCurrentPage(i + 1)}
              >
                {i + 1}
              </button>
            ))}
            <button
              className="px-3 py-1 rounded border bg-gray-100 text-gray-700 disabled:opacity-50"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        )}
      </div>

             {/* Create Modal */}
       <Modal
         isOpen={isCreateModalOpen}
         onClose={() => {
           setIsCreateModalOpen(false);
           resetForm();
         }}
         title="Create New Designation"
       >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Designation Name
            </label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter designation name"
            />
          </div>
          
          {/* Validation Error Display within Modal */}
          {toast.isOpen && toast.type === 'error' && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-800">{toast.message}</p>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsCreateModalOpen(false);
                resetForm();
              }}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!formData.name || isLoading}
            >
              {isLoading ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>

             {/* Edit Modal */}
       <Modal
         isOpen={isEditModalOpen}
         onClose={() => {
           setIsEditModalOpen(false);
           setEditingDesignation(null);
           resetForm();
         }}
         title="Edit Designation"
       >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Designation Name
            </label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter designation name"
            />
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsEditModalOpen(false);
                setEditingDesignation(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEdit}
              disabled={!formData.name}
            >
              Update
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletingDesignation(null);
        }}
        title="Delete Designation"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Are you sure you want to delete the designation "{deletingDesignation?.name}"? 
            This action cannot be undone.
          </p>
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setDeletingDesignation(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Designation;