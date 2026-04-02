import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { ChevronLeft, Plus, Edit2, Trash2, Bug } from 'lucide-react';
import { createDefectType, getDefectTypes, getDefectTypeById, updateDefectType, deleteDefectType } from '../api/defectType';
import { Toast } from '../components/ui/Toast';

interface DefectType {
  id: string;
  name: string;
  description: string;
  category: 'functional' | 'performance' | 'security' | 'usability' | 'compatibility' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  priority: 'low' | 'medium' | 'high' | 'critical';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const DefectType: React.FC = () => {
  const navigate = useNavigate();
  const [defectTypes, setDefectTypes] = useState<DefectType[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingDefectType, setEditingDefectType] = useState<DefectType | null>(null);
  const [deletingDefectType, setDeletingDefectType] = useState<DefectType | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'functional' as DefectType["category"],
    severity: 'medium' as DefectType["severity"],
    priority: 'medium' as DefectType["priority"],
    isActive: true
  });

  // Toast state
  const [toast, setToast] = useState<{
    isOpen: boolean;
    message: string;
    type: "success" | "error";
  }>({
    isOpen: false,
    message: "",
    type: "success",
  });

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ isOpen: true, message, type });
  };

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;
  const totalPages = Math.ceil(defectTypes.length / pageSize);
  const paginatedDefectTypes = defectTypes.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    const fetchDefectTypes = async () => {
      try {
        const response = await getDefectTypes();
        if (response.status === 'success') {
          const transformedData = response.data.map(d => ({
            ...d,
            id: d.id.toString(),
            name: d.defectTypeName
          }));
          setDefectTypes(transformedData);
        } else {
          showToast("Failed to fetch defect types: " + response.message, 'error');
        }
      } catch (error) {
        showToast("Error fetching defect types: " + error, 'error');
      }
    };
    fetchDefectTypes();
    // Reset toast on mount so none show at page load
    setToast({ isOpen: false, message: '', type: 'success' });
    setCurrentPage(1); // Reset to first page on mount
  }, []);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: 'functional' as DefectType["category"],
      severity: 'medium' as DefectType["severity"],
      priority: 'medium' as DefectType["priority"],
      isActive: true
    });
  };

  const handleCreate = async () => {
    // Duplicate name check (case-insensitive, trimmed)
    const exists = defectTypes.some(dt => dt.name.trim().toLowerCase() === formData.name.trim().toLowerCase());
    if (exists) {
      // Close modal and show validation error on main page
      setIsCreateModalOpen(false);
      resetForm();
      showToast('Defect Type Name already exists.', 'error');
      return;
    }
    try {
      const response = await createDefectType({ defectTypeName: formData.name });
      if (response.status === 'success') {
        const newDefectType: DefectType = {
          id: response.data.id.toString(),
          name: response.data.defectTypeName,
          description: formData.description,
          category: formData.category,
          severity: formData.severity,
          priority: formData.priority,
          isActive: formData.isActive,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        setDefectTypes([...defectTypes, newDefectType]);
        setIsCreateModalOpen(false);
        resetForm();
        showToast('Defect type created successfully!', 'success');
      } else {
        // Close modal and show validation error on main page
        setIsCreateModalOpen(false);
        resetForm();
        showToast('Failed to create defect type: ' + response.message, 'error');
      }
         } catch (error: any) {
       // Close modal and show validation error on main page for all errors
       setIsCreateModalOpen(false);
       resetForm();
       
       // Extract meaningful error message from the error object
       let errorMessage = 'Failed to create defect type';
       if (error.response?.data?.message) {
         errorMessage = error.response.data.message;
       } else if (error.message) {
         errorMessage = error.message;
       } else if (error.response?.status === 400) {
         errorMessage = 'Invalid defect type name. Please check your input.';
       }
       
       showToast(errorMessage, 'error');
     }
  };



  const handleEdit = async () => {
    if (!editingDefectType) return;
    
    // Check if the defect type name has actually changed
    if (formData.name.trim() === editingDefectType.name.trim()) {
      showToast('No changes were made to the defect type', 'error');
      return;
    }
    
    // Duplicate name check (case-insensitive, trimmed, ignore self)
    const exists = defectTypes.some(dt => dt.name.trim().toLowerCase() === formData.name.trim().toLowerCase() && dt.id !== editingDefectType.id);
    if (exists) {
      // Close modal and show validation error on main page
      setIsEditModalOpen(false);
      setEditingDefectType(null);
      resetForm();
      showToast('Defect Type Name already exists.', 'error');
      return;
    }
    try {
      const payload = {
        defectTypeName: formData.name,
        description: formData.description,
        category: formData.category,
        severity: formData.severity,
        priority: formData.priority,
        isActive: formData.isActive
      };
      
      const response = await updateDefectType(editingDefectType.id, payload);
      
      if (response.status === 'success') {
        const updatedDefectTypes = defectTypes.map(defectType =>
          defectType.id === editingDefectType.id
            ? { 
                ...defectType, 
                name: response.data.defectTypeName,
                ...payload 
              }
            : defectType
        );
        setDefectTypes(updatedDefectTypes);
        setIsEditModalOpen(false);
        setEditingDefectType(null);
        resetForm();
        showToast('Defect type updated successfully!', 'success');
      } else {
        // Close modal and show validation error on main page
        setIsEditModalOpen(false);
        setEditingDefectType(null);
        resetForm();
        showToast('Failed to update defect type: ' + response.message, 'error');
      }
         } catch (error: any) {
       // Close modal and show validation error on main page for all errors
       setIsEditModalOpen(false);
       setEditingDefectType(null);
       resetForm();
       
       // Extract meaningful error message from the error object
       let errorMessage = 'Failed to update defect type';
       if (error.response?.data?.message) {
         errorMessage = error.response.data.message;
       } else if (error.message) {
         errorMessage = error.message;
       } else if (error.response?.status === 400) {
         errorMessage = 'Invalid defect type name. Please check your input.';
       }
       
       showToast(errorMessage, 'error');
     }
  };

  const handleDelete = async () => {
    if (!deletingDefectType) return;
    
    try {
      const response = await deleteDefectType(deletingDefectType.id);
      if (response.status === 'success') {
        const updatedDefectTypes = defectTypes.filter(
          defectType => defectType.id !== deletingDefectType.id
        );
        setDefectTypes(updatedDefectTypes);
        setIsDeleteModalOpen(false);
        setDeletingDefectType(null);
        showToast('Defect type deleted successfully!', 'success');
      } else {
        // Close modal and show validation error on main page
        setIsDeleteModalOpen(false);
        setDeletingDefectType(null);
        showToast('Failed to delete defect Type', 'error');
      }
         } catch (error: any) {
       // Close modal and show validation error on main page
       setIsDeleteModalOpen(false);
       setDeletingDefectType(null);
       
       // Show user-friendly error message instead of technical API error
       showToast('Failed to delete defect Type', 'error');
     }
  };

  const openEditModal = async (defectType: DefectType) => {
    try {
      const response = await getDefectTypeById(defectType.id);
      if (response.status === 'success') {
        const fetchedDefectType = response.data;
        setEditingDefectType({
          ...fetchedDefectType,
          id: fetchedDefectType.id.toString(),
          name: fetchedDefectType.defectTypeName,
        });
        setFormData({
          name: fetchedDefectType.defectTypeName,
          description: fetchedDefectType.description,
          category: fetchedDefectType.category,
          severity: fetchedDefectType.severity,
          priority: fetchedDefectType.priority,
          isActive: fetchedDefectType.isActive
        });
        setIsEditModalOpen(true);
      } else {
        console.error("Failed to fetch defect type for editing:", response.message);
        // Optionally, show an error to the user
      }
    } catch (error) {
      console.error("Error fetching defect type for editing:", error);
      // Optionally, show an error to the user
    }
  };

  const openDeleteModal = (defectType: DefectType) => {
    setDeletingDefectType(defectType);
    setIsDeleteModalOpen(true);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'functional': return 'bg-blue-100 text-blue-800';
      case 'performance': return 'bg-orange-100 text-orange-800';
      case 'security': return 'bg-red-100 text-red-800';
      case 'usability': return 'bg-purple-100 text-purple-800';
      case 'compatibility': return 'bg-green-100 text-green-800';
      case 'other': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'functional': return 'Functional';
      case 'performance': return 'Performance';
      case 'security': return 'Security';
      case 'usability': return 'UI/UX';
      case 'compatibility': return 'Compatibility';
      case 'other': return 'Other';
      default: return category;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'bg-blue-100 text-blue-800';
      case 'medium': return 'bg-purple-100 text-purple-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-8">
      {/* Toast */}
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
          <Bug className="w-8 h-8 text-blue-500 mr-3" />
          <h1 className="text-3xl font-bold text-gray-900">Defect Type Management</h1>
        </div>
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center"
        >
          <Plus className="w-5 h-5 mr-2" />
          Create Defect Type
        </Button>
      </div>

      {/* Defect Types Table */}
      <div className="overflow-x-auto rounded-lg shadow mb-8 max-w-2xl mx-auto">
        <table className="min-w-full divide-y divide-gray-200 text-base">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Defect Type</th>
              <th className="px-5 py-3 text-center text-sm font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedDefectTypes.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-5 py-3 text-center text-gray-500">
                  No defect types found.
                </td>
              </tr>
            ) : (
              paginatedDefectTypes.map((defectType) => (
              <tr key={defectType.id}>
                <td className="px-5 py-3 whitespace-nowrap font-semibold text-gray-900 text-base">{defectType.name}</td>
                <td className="px-5 py-3 whitespace-nowrap text-center">
                  <button
                    onClick={() => openEditModal(defectType)}
                    className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded mr-2"
                    title="Edit"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => openDeleteModal(defectType)}
                    className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                    title="Delete"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))
            )}
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
        title="Create New Defect Type"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Defect Type Name
            </label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter defect type name"
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
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!formData.name}
            >
              Create
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingDefectType(null);
          resetForm();
        }}
        title="Edit Defect Type"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Defect Type Name
            </label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter defect type name"
            />
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsEditModalOpen(false);
                setEditingDefectType(null);
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
          setDeletingDefectType(null);
        }}
        title="Delete Defect Type"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Are you sure you want to delete the defect type "{deletingDefectType?.name}"? 
            This action cannot be undone.
          </p>
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setDeletingDefectType(null);
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

export default DefectType; 