import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { ChevronLeft, Plus, Edit2, Trash2, Rocket } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  getAllReleaseTypes,
  createReleaseType,
  updateReleaseType,
  deleteReleaseType,
  ReleaseType as ReleaseTypeModel
} from '../api/Releasetype';
import { Toast } from '../components/ui/Toast';

const ReleaseType: React.FC = () => {
  const navigate = useNavigate();
  const [releaseTypes, setReleaseTypes] = useState<ReleaseTypeModel[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingReleaseType, setEditingReleaseType] = useState<ReleaseTypeModel | null>(null);
  const [deletingReleaseType, setDeletingReleaseType] = useState<ReleaseTypeModel | null>(null);
  const [formData, setFormData] = useState({
    releaseTypeName: '',
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
  const totalPages = Math.ceil(releaseTypes.length / pageSize);
  const paginatedReleaseTypes = releaseTypes.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    getAllReleaseTypes().then((res) => {
      if (res?.data) setReleaseTypes(res.data);
    }).catch((error) => {
      showToast('Failed to fetch release types: ' + error, 'error');
    });
    // Reset toast on mount so none show at page load
    setToast({ isOpen: false, message: '', type: 'success' });
    setCurrentPage(1); // Reset to first page on mount
  }, []);

  const resetForm = () => {
    setFormData({
      releaseTypeName: '',
    });
  };

  const handleCreate = async () => {
    // Duplicate name check (case-insensitive, trimmed)
    const exists = releaseTypes.some(rt => rt.releaseTypeName.trim().toLowerCase() === formData.releaseTypeName.trim().toLowerCase());
    if (exists) {
      // Close modal and show validation error on main page
      setIsCreateModalOpen(false);
      resetForm();
      showToast('Release Type Name already exists.', 'error');
      return;
    }
    try {
      const created = await createReleaseType(formData);
      // Defensive: If backend returns only id, fetch all again; else, add to list
      if (created && created.releaseTypeName) {
        setReleaseTypes((prev) => [...prev, created]);
      } else {
        // fallback: refetch all
        const res = await getAllReleaseTypes();
        if (res?.data) setReleaseTypes(res.data);
      }
      setIsCreateModalOpen(false);
      resetForm();
      showToast('Release type created successfully!', 'success');
    } catch (error: any) {
      // Close modal and show validation error on main page for all errors
      setIsCreateModalOpen(false);
      resetForm();
      
      // Extract meaningful error message from the error object
      let errorMessage = 'Failed to create release type';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      } else if (error.response?.status === 400) {
        errorMessage = 'Invalid release type name. Please check your input.';
      }
      
      showToast(errorMessage, 'error');
    }
  };

  const handleEdit = async () => {
    if (!editingReleaseType) return;
    
    // Check if the release type name has actually changed
    if (formData.releaseTypeName.trim() === editingReleaseType.releaseTypeName.trim()) {
      showToast('No changes were made to the release type', 'error');
      return;
    }
    
    // Duplicate name check (case-insensitive, trimmed, ignore self)
    const exists = releaseTypes.some(rt => rt.releaseTypeName.trim().toLowerCase() === formData.releaseTypeName.trim().toLowerCase() && rt.id !== editingReleaseType.id);
    if (exists) {
      // Close modal and show validation error on main page
      setIsEditModalOpen(false);
      setEditingReleaseType(null);
      resetForm();
      showToast('Release Type Name already exists.', 'error');
      return;
    }
    try {
      const updated = await updateReleaseType(editingReleaseType.id, {
        releaseTypeName: formData.releaseTypeName,
      });
      // Update the local state so the UI refreshes immediately
      setReleaseTypes((prev) =>
        prev.map((rt) =>
          rt.id === editingReleaseType.id
            ? { ...rt, releaseTypeName: formData.releaseTypeName }
            : rt
        )
      );
      setIsEditModalOpen(false);
      setEditingReleaseType(null);
      setFormData({ releaseTypeName: '' });
      showToast('Release type updated successfully!', 'success');
    } catch (error: any) {
      // Close modal and show validation error on main page for all errors
      setIsEditModalOpen(false);
      setEditingReleaseType(null);
      resetForm();
      
      // Extract meaningful error message from the error object
      let errorMessage = 'Failed to update release type';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      } else if (error.response?.status === 400) {
        errorMessage = 'Invalid release type name. Please check your input.';
      }
      
      showToast(errorMessage, 'error');
    }
  };

  const handleDelete = async () => {
    if (!deletingReleaseType) return;
    try {
      await deleteReleaseType(deletingReleaseType.id);
      setReleaseTypes((prev) => prev.filter((rt) => rt.id !== deletingReleaseType.id));
      setIsDeleteModalOpen(false);
      setDeletingReleaseType(null);
      showToast('Release type deleted successfully!', 'success');
    } catch (error: any) {
      // Close modal and show validation error on main page
      setIsDeleteModalOpen(false);
      setDeletingReleaseType(null);
      
      // Extract meaningful error message from the error object
      let errorMessage = 'Failed to delete release type';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      } else if (error.response?.status === 400) {
        errorMessage = 'Cannot delete release type. It may be in use.';
      }
      
      showToast(errorMessage, 'error');
    }
  };

  const openEditModal = (releaseType: ReleaseTypeModel) => {
    setEditingReleaseType(releaseType);
    setFormData({
      releaseTypeName: releaseType.releaseTypeName,
    });
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (releaseType: ReleaseTypeModel) => {
    setDeletingReleaseType(releaseType);
    setIsDeleteModalOpen(true);
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
          <Rocket className="w-8 h-8 text-blue-500 mr-3" />
          <h1 className="text-3xl font-bold text-gray-900">Release Type Management</h1>
        </div>
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center"
        >
          <Plus className="w-5 h-5 mr-2" />
          Create Release Type
        </Button>
      </div>

      {/* Release Types Table */}
      <div className="overflow-x-auto rounded-lg shadow mb-8 max-w-2xl mx-auto">
        <table className="min-w-full divide-y divide-gray-200 text-base">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Release Type</th>
              <th className="px-5 py-3 text-center text-sm font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedReleaseTypes.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-5 py-3 text-center text-gray-500">
                  No release types found.
                </td>
              </tr>
            ) : (
              paginatedReleaseTypes.map((releaseType) => (
              <tr key={releaseType.id}>
                <td className="px-5 py-3 whitespace-nowrap font-semibold text-gray-900 text-base">{releaseType.releaseTypeName}</td>
                <td className="px-5 py-3 whitespace-nowrap text-center">
                  <button
                    onClick={() => openEditModal(releaseType)}
                    className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded mr-2"
                    title="Edit"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => openDeleteModal(releaseType)}
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
        title="Create New Release Type"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Release Type Name
            </label>
            <Input
              value={formData.releaseTypeName}
              onChange={(e) => setFormData({ ...formData, releaseTypeName: e.target.value })}
              placeholder="Enter release type name"
            />
          </div>
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
              disabled={!formData.releaseTypeName}
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
          setEditingReleaseType(null);
          resetForm();
        }}
        title="Edit Release Type"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Release Type Name
            </label>
            <Input
              value={formData.releaseTypeName}
              onChange={(e) => setFormData({ ...formData, releaseTypeName: e.target.value })}
              placeholder="Enter release type name"
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsEditModalOpen(false);
                setEditingReleaseType(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEdit}
              disabled={!formData.releaseTypeName}
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
          setDeletingReleaseType(null);
        }}
        title="Delete Release Type"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Are you sure you want to delete the release type "{deletingReleaseType?.releaseTypeName}"?
            This action cannot be undone.
          </p>
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setDeletingReleaseType(null);
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

export default ReleaseType;