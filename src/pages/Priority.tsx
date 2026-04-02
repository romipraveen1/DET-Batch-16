import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Table, TableBody, TableCell, TableRow } from '../components/ui/Table';
import { Modal } from '../components/ui/Modal';
import { ChevronLeft, Plus, Edit2, Trash2, Flag, AwardIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getAllPriorities, updatePriority, deletePriority, createPriority } from '../api/priority';
import { Toast } from '../components/ui/Toast';
import { HexColorPicker } from 'react-colorful';

interface Priority {
  id: number;
  name: string;
  color: string;
}

const Priority: React.FC = () => {
  const navigate = useNavigate();
  const [priorities, setPriorities] = useState<Priority[]>([]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;
  const totalPages = Math.ceil(priorities.length / pageSize);
  const paginatedPriorities = priorities.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingPriority, setEditingPriority] = useState<Priority | null>(null);
  const [deletingPriority, setDeletingPriority] = useState<Priority | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    color: '#000000',
  });
  const [showColorPickerCreate, setShowColorPickerCreate] = useState(false);
  const [showColorPickerEdit, setShowColorPickerEdit] = useState(false);
  // Duplicate color validation state
  const [colorError, setColorError] = useState('');

  // Check for duplicate color on color input change
  useEffect(() => {
    if (isCreateModalOpen || isEditModalOpen) {
      const isDuplicate = priorities.some(
        (p) => p.color.toLowerCase() === formData.color.toLowerCase() && 
               (!editingPriority || p.id !== editingPriority.id)
      );
      if (isDuplicate) {
        setColorError('This color is already in use. Please choose a different color.');
      } else {
        setColorError('');
      }
    } else {
      setColorError('');
    }
  }, [formData.color, priorities, isCreateModalOpen, isEditModalOpen, editingPriority]);

  // Color input handler: only allow # and hex digits, max 7 chars
  const handleColorInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    if (!value.startsWith('#')) value = '#' + value.replace(/[^0-9A-Fa-f]/gi, '');
    value = '#' + value.slice(1).replace(/[^0-9A-Fa-f]/gi, '');
    value = value.slice(0, 7);
    setFormData({ ...formData, color: value });
  };

  // Validation function for priority name
  const validateName = (name: string) => {
    // Only alphabets and spaces, at least one letter
    return /^[A-Za-z ]+$/.test(name.trim());
  };

  // Handle name input change with validation
  const handleNameChange = (value: string) => {
    setFormData({ ...formData, name: value });
  };

  useEffect(() => {
    getAllPriorities()
      .then((res) => {
        if (res && Array.isArray(res.data)) {
          const mapped = res.data.map((item) => ({
            id: item.id,
            name: item.priority,
            color: item.color.startsWith('#') ? item.color : `#${item.color}`,
          }));
          setPriorities(mapped);
        }
      })
      .catch((error) => {
        showToast('Failed to fetch priorities: ' + error, 'error');
      });
    // Reset toast on mount so none show at page load
    setToast({ isOpen: false, message: '', type: 'success' });
    setCurrentPage(1); // Reset to first page on mount
  }, []);

  const resetForm = () => {
    setFormData({
      name: '',
      color: '#000000',
    });
  };

  const handleCreate = async () => {
    // Duplicate name check (case-insensitive, trimmed)
    const exists = priorities.some(p => p.name.trim().toLowerCase() === formData.name.trim().toLowerCase());
    if (exists) {
      // Close modal and show validation error on main page
      setIsCreateModalOpen(false);
      resetForm();
      showToast('Priority Name already exists.', 'error');
      return;
    }
    
    // Duplicate color check
    if (colorError) {
      // Close modal and show validation error on main page
      setIsCreateModalOpen(false);
      resetForm();
      showToast('This color is already in use. Please choose a different color.', 'error');
      return;
    }
    
    // Validate name before creating
    if (formData.name && !validateName(formData.name)) {
      // Close modal and show validation error on main page
      setIsCreateModalOpen(false);
      resetForm();
      showToast('Priority name can only contain alphabets and spaces.', 'error');
      return;
    }
    
    try {
      const res = await createPriority({
        priority: formData.name,
        color: formData.color,
      });
      const refreshed = await getAllPriorities();
      const mapped = refreshed.data.map((item) => ({
        id: item.id,
        name: item.priority,
        color: item.color.startsWith('#') ? item.color : `#${item.color}`,
      }));
      setPriorities(mapped);
      setIsCreateModalOpen(false);
      resetForm();
      showToast('Priority created successfully!');
    } catch (err: any) {
      // Close modal and show validation error on main page for all errors
      setIsCreateModalOpen(false);
      resetForm();
      
      // Extract meaningful error message from the error object
      let errorMessage = 'Failed to create priority';
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      } else if (err.response?.status === 400) {
        errorMessage = 'Invalid priority name. Please check your input.';
      }
      
      showToast(errorMessage, 'error');
    }
  };



  const handleEdit = async () => {
    if (!editingPriority) return;
    
    // Check if the priority name OR color has actually changed
    if (formData.name.trim() === editingPriority.name.trim() && 
        formData.color.toLowerCase() === editingPriority.color.toLowerCase()) {
      showToast('No changes were made to the priority', 'error');
      return;
    }
    
    // Duplicate name check (case-insensitive, trimmed, ignore self)
    const exists = priorities.some(p => p.name.trim().toLowerCase() === formData.name.trim().toLowerCase() && p.id !== editingPriority.id);
    if (exists) {
      // Close modal and show validation error on main page
      setIsEditModalOpen(false);
      setEditingPriority(null);
      resetForm();
      showToast('Priority Name already exists.', 'error');
      return;
    }
    
    // Duplicate color check
    if (colorError) {
      // Close modal and show validation error on main page
      setIsEditModalOpen(false);
      setEditingPriority(null);
      resetForm();
      showToast('This color is already in use. Please choose a different color.', 'error');
      return;
    }
    
    // Validate name before updating
    if (formData.name && !validateName(formData.name)) {
      // Close modal and show validation error on main page
      setIsEditModalOpen(false);
      setEditingPriority(null);
      resetForm();
      showToast('Priority name can only contain alphabets and spaces.', 'error');
      return;
    }
    
    try {
      await updatePriority(editingPriority.id, {
        priority: formData.name,
        color: formData.color,
      });
      const updatedPriorities = priorities.map(priority =>
        priority.id === editingPriority.id
          ? { ...priority, name: formData.name, color: formData.color }
          : priority
      );
      setPriorities(updatedPriorities);
      setIsEditModalOpen(false);
      setEditingPriority(null);
      resetForm();
      showToast('Priority updated successfully!');
    } catch (err: any) {
      // Close modal and show validation error on main page for all errors
      setIsEditModalOpen(false);
      setEditingPriority(null);
      resetForm();
      
      // Extract meaningful error message from the error object
      let errorMessage = 'Failed to update priority';
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      } else if (err.response?.status === 400) {
        errorMessage = 'Invalid priority name. Please check your input.';
      }
      
      showToast(errorMessage, 'error');
    }
  };

  const handleDelete = async () => {
    if (!deletingPriority) return;
    try {
      await deletePriority(deletingPriority.id);
      const updatedPriorities = priorities.filter(
        priority => priority.id !== deletingPriority.id
      );
      setPriorities(updatedPriorities);
      setIsDeleteModalOpen(false);
      setDeletingPriority(null);
      showToast('Priority deleted successfully!');
    } catch (err: any) {
      // Close modal and show validation error on main page
      setIsDeleteModalOpen(false);
      setDeletingPriority(null);
      
      // Show user-friendly error message instead of technical API error
      showToast('Cannot delete priority. It may be in use.', 'error');
    }
  };

  const openEditModal = (priority: Priority) => {
    setEditingPriority(priority);
    setFormData({
      name: priority.name,
      color: priority.color,
    });
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (priority: Priority) => {
    setDeletingPriority(priority);
    setIsDeleteModalOpen(true);
  };

  return (
    <div className="max-w-6xl mx-auto p-8">
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
          <Flag className="w-8 h-8 text-blue-500 mr-3" />
          <h1 className="text-3xl font-bold text-gray-900">Priority Management</h1>
        </div>
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center"
        >
          <Plus className="w-5 h-5 mr-2" />
          Create Priority
        </Button>
      </div>

      {/* Priorities Table */}
      <Card>
        <div className="flex flex-row items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Priority Levels</h2>
        </div>
        <CardContent>
          <Table>
            <thead className="bg-gray-50">
              <TableRow>
                <TableCell header>Name</TableCell>
                <TableCell header>Color</TableCell>
                <TableCell header>Actions</TableCell>
              </TableRow>
            </thead>
            <TableBody>
              {paginatedPriorities.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-center text-gray-500 py-4">
                    No priorities found.
                  </td>
                </tr>
              ) : (
                paginatedPriorities.map((priority) => (
                  <TableRow key={priority.id}>
                    <TableCell className="font-medium">{priority.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded-full border border-gray-300"
                          style={{ backgroundColor: priority.color }}
                        />
                        <span className="text-sm text-gray-600">{priority.color}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(priority)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDeleteModal(priority)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
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

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          resetForm();
          setShowColorPickerCreate(false);
        }}
        title="Create New Priority"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Priority Name
            </label>
            <Input
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Enter priority name"
            />
          </div>
          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Color
            </label>
            <div className="flex flex-col items-center gap-2 w-full">
              <div className="flex items-center gap-3 w-full">
                <Input
                  value={formData.color}
                  onChange={handleColorInput}
                  placeholder="#000000"
                  className={`flex-1 ${colorError ? 'border-red-500 focus:ring-red-500' : ''}`}
                  maxLength={7}
                />
                <div
                  className="w-10 h-10 rounded-md border border-gray-300 cursor-pointer"
                  style={{ backgroundColor: formData.color }}
                  onClick={() => setShowColorPickerCreate((v) => !v)}
                  aria-label="Pick color"
                />
              </div>
              {colorError && (
                <div className="text-red-600 text-sm w-full mt-1">{colorError}</div>
              )}
              {showColorPickerCreate && (
                <div className="z-50 mt-2">
                  <HexColorPicker
                    color={formData.color}
                    onChange={color => setFormData({ ...formData, color })}
                  />
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsCreateModalOpen(false);
                resetForm();
                setShowColorPickerCreate(false);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!formData.name || !!colorError}
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
          setEditingPriority(null);
          resetForm();
          setShowColorPickerEdit(false);
        }}
        title="Edit Priority"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Priority Name
            </label>
            <Input
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Enter priority name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Color
            </label>
            <div className="flex flex-col items-center gap-2 w-full">
              <div className="flex items-center gap-3 w-full">
                <Input
                  value={formData.color}
                  onChange={handleColorInput}
                  placeholder="#000000"
                  className={`flex-1 ${colorError ? 'border-red-500 focus:ring-red-500' : ''}`}
                  maxLength={7}
                />
                <div
                  className="w-10 h-10 rounded-md border border-gray-300 cursor-pointer"
                  style={{ backgroundColor: formData.color }}
                  onClick={() => setShowColorPickerEdit((v) => !v)}
                  aria-label="Pick color"
                />
              </div>
              {colorError && (
                <div className="text-red-600 text-sm w-full mt-1">{colorError}</div>
              )}
              {showColorPickerEdit && (
                <div className="z-50 mt-2">
                  <HexColorPicker
                    color={formData.color}
                    onChange={color => setFormData({ ...formData, color })}
                  />
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsEditModalOpen(false);
                setEditingPriority(null);
                resetForm();
                setShowColorPickerEdit(false);
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
          setDeletingPriority(null);
        }}
        title="Delete Priority"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Are you sure you want to delete the priority "{deletingPriority?.name}"?
            This action cannot be undone.
          </p>
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setDeletingPriority(null);
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

      {/* Toast */}
      <Toast
        isOpen={toast.isOpen}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, isOpen: false })}
      />
    </div>
  );
};

export default Priority;