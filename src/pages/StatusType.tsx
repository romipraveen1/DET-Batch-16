import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '../components/ui/Table';
import { ChevronLeft, Plus, Edit2, Trash2, ListPlus } from 'lucide-react';
import { StatusType as StatusTypeInterface } from '../types';
import { 
  getAllDefectStatuses, 
  createDefectStatus, 
  updateDefectStatus, 
  deleteDefectStatus,
  DefectStatus 
} from '../api/defectStatus';
import { Toast } from '../components/ui/Toast';
import { HexColorPicker } from 'react-colorful';

// Utility function to normalize color values
const normalizeColor = (color: string): string => {
  if (!color) return '#000000';
  
  // Remove any non-hex characters
  const cleanColor = color.replace(/[^0-9A-Fa-f]/g, '');
  
  // Handle different length hex values
  if (cleanColor.length === 3) {
    // Convert 3-digit hex to 6-digit
    return `#${cleanColor[0]}${cleanColor[0]}${cleanColor[1]}${cleanColor[1]}${cleanColor[2]}${cleanColor[2]}`;
  } else if (cleanColor.length === 1) {
    // Convert 1-digit to 6-digit
    return `#${cleanColor}${cleanColor}${cleanColor}${cleanColor}${cleanColor}${cleanColor}`;
  } else if (cleanColor.length === 2) {
    // Convert 2-digit to 6-digit
    return `#${cleanColor}${cleanColor}${cleanColor}`;
  } else if (cleanColor.length >= 6) {
    // Take first 6 characters
    return `#${cleanColor.substring(0, 6)}`;
  }
  
  // Default fallback
  return '#000000';
};

const StatusType: React.FC = () => {
  const navigate = useNavigate();
  const colorInputRef = useRef<HTMLInputElement>(null);
  
  const [statusTypes, setStatusTypes] = useState<DefectStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<DefectStatus | null>(null);
  const [deletingStatus, setDeletingStatus] = useState<DefectStatus | null>(null);
  const [formData, setFormData] = useState({
    defectStatusName: '',
    colorCode: '#000000',
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
  const totalPages = Math.ceil(statusTypes.length / pageSize);
  const paginatedStatusTypes = statusTypes.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Duplicate color validation state
  const [colorError, setColorError] = useState('');

  // Check for duplicate color on color input change
  useEffect(() => {
    if (isCreateModalOpen || isEditModalOpen) {
      const isDuplicate = statusTypes.some(
        (s) => s.colorCode.toLowerCase() === formData.colorCode.toLowerCase() && 
               (!editingStatus || s.id !== editingStatus.id)
      );
      if (isDuplicate) {
        setColorError('This color is already in use. Please choose a different color.');
      } else {
        setColorError('');
      }
    } else {
      setColorError('');
    }
  }, [formData.colorCode, statusTypes, isCreateModalOpen, isEditModalOpen, editingStatus]);

  // Fetch all status types on component mount
  useEffect(() => {
    fetchStatusTypes();
    // Reset toast on mount so none show at page load
    setToast({ isOpen: false, message: '', type: 'success' });
    setCurrentPage(1); // Reset to first page on mount
  }, []);

  const fetchStatusTypes = async () => {
    try {
      setLoading(true);
      const response = await getAllDefectStatuses();
      // Normalize color values for all status types
      const normalizedStatusTypes = response.data.map(status => ({
        ...status,
        colorCode: normalizeColor(status.colorCode)
      }));
      setStatusTypes(normalizedStatusTypes);
    } catch (error: any) {
      showToast('Failed to fetch status types: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ defectStatusName: '', colorCode: '#000000' });
  };

  const validateForm = () => {
    if (formData.defectStatusName.trim() === '') {
      return { isValid: false, message: 'Status Name cannot be empty.' };
    }
    
    // Check if name contains only alphabets and spaces
    if (!/^[A-Za-z ]+$/.test(formData.defectStatusName.trim())) {
      return { isValid: false, message: 'Status Name can only contain alphabets and spaces.' };
    }
    
    // Validate color format
    const normalizedColor = normalizeColor(formData.colorCode);
    if (!/^#[0-9A-Fa-f]{6}$/.test(normalizedColor)) {
      return { isValid: false, message: 'Please enter a valid color code (e.g., #FF0000).' };
    }
    
    return { isValid: true, message: '' };
  };

  const handleCreate = async () => {
    // Duplicate name check (case-insensitive, trimmed)
    const exists = statusTypes.some(s => s.defectStatusName.trim().toLowerCase() === formData.defectStatusName.trim().toLowerCase());
    if (exists) {
      // Close modal and show validation error on main page
      setIsCreateModalOpen(false);
      resetForm();
      showToast('Status Name already exists.', 'error');
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
    
    const validation = validateForm();
    if (!validation.isValid) {
      // Close modal and show validation error on main page
      setIsCreateModalOpen(false);
      resetForm();
      showToast(validation.message, 'error');
      return;
    }
    
    try {
      setLoading(true);
      const normalizedColor = normalizeColor(formData.colorCode);
      const response = await createDefectStatus({
        ...formData,
        colorCode: normalizedColor
      });
      await fetchStatusTypes(); // Refresh the list
      setIsCreateModalOpen(false);
      resetForm();
      showToast('Status type created successfully!');
    } catch (error: any) {
      // Close modal and show validation error on main page for all errors
      setIsCreateModalOpen(false);
      resetForm();
      
      // Extract meaningful error message from the error object
      let errorMessage = 'Failed to create status type';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      } else if (error.response?.status === 400) {
        errorMessage = 'Invalid status name. Please check your input.';
      }
      
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };



  const handleEdit = async () => {
    if (!editingStatus) return;
    
    // Check if the status name OR color has actually changed
    if (formData.defectStatusName.trim() === editingStatus.defectStatusName.trim() && 
        formData.colorCode.toLowerCase() === editingStatus.colorCode.toLowerCase()) {
      showToast('No changes were made to the status type', 'error');
      return;
    }
    
    // Duplicate name check (case-insensitive, trimmed, ignore self)
    const exists = statusTypes.some(s => s.defectStatusName.trim().toLowerCase() === formData.defectStatusName.trim().toLowerCase() && s.id !== editingStatus.id);
    if (exists) {
      // Close modal and show validation error on main page
      setIsEditModalOpen(false);
      setEditingStatus(null);
      resetForm();
      showToast('Status Name already exists.', 'error');
      return;
    }
    
    // Duplicate color check
    if (colorError) {
      // Close modal and show validation error on main page
      setIsEditModalOpen(false);
      setEditingStatus(null);
      resetForm();
      showToast('This color is already in use. Please choose a different color.', 'error');
      return;
    }
    
    const validation = validateForm();
    if (!validation.isValid) {
      // Close modal and show validation error on main page
      setIsEditModalOpen(false);
      setEditingStatus(null);
      resetForm();
      showToast(validation.message, 'error');
      return;
    }
    
    try {
      setLoading(true);
      const normalizedColor = normalizeColor(formData.colorCode);
      const response = await updateDefectStatus(editingStatus.id, {
        ...formData,
        colorCode: normalizedColor
      });
      await fetchStatusTypes(); // Refresh the list
      setIsEditModalOpen(false);
      setEditingStatus(null);
      resetForm();
      showToast('Status type updated successfully!');
    } catch (error: any) {
      // Close modal and show validation error on main page for all errors
      setIsEditModalOpen(false);
      setEditingStatus(null);
      resetForm();
      
      // Extract meaningful error message from the error object
      let errorMessage = 'Failed to update status type';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      } else if (error.response?.status === 400) {
        errorMessage = 'Invalid status name. Please check your input.';
      }
      
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingStatus) return;
    
    try {
      setLoading(true);
      await deleteDefectStatus(deletingStatus.id);
      await fetchStatusTypes(); // Refresh the list
      setIsDeleteModalOpen(false);
      setDeletingStatus(null);
      showToast('Status type deleted successfully!');
    } catch (error: any) {
      // Close modal and show validation error on main page
      setIsDeleteModalOpen(false);
      setDeletingStatus(null);
      
      // Show user-friendly error message instead of technical API error
      showToast('Failed to delete status Type', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (status: DefectStatus) => {
    setEditingStatus(status);
    setFormData({ 
      defectStatusName: status.defectStatusName, 
      colorCode: normalizeColor(status.colorCode)
    });
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (status: DefectStatus) => {
    setDeletingStatus(status);
    setIsDeleteModalOpen(true);
  };

  // Color input handler: only allow # and hex digits, max 7 chars
  const handleColorInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    if (!value.startsWith('#')) value = '#' + value.replace(/[^0-9A-Fa-f]/gi, '');
    value = '#' + value.slice(1).replace(/[^0-9A-Fa-f]/gi, '');
    value = value.slice(0, 7);
    setFormData({ ...formData, colorCode: value });
  };

  // Status name input handler with validation
  const handleStatusNameInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData({ ...formData, defectStatusName: value.toUpperCase() });
  };
  const [showColorPickerCreate, setShowColorPickerCreate] = useState(false);
  const [showColorPickerEdit, setShowColorPickerEdit] = useState(false);

  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="mb-6 flex justify-end">
        <Button
          variant="secondary"
          onClick={() => navigate('/configurations/status')}
          className="flex items-center"
        >
          <ChevronLeft className="w-5 h-5 mr-2" /> Back
        </Button>
      </div>

      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center">
          <ListPlus className="w-8 h-8 text-blue-700 mr-3" />
          <h1 className="text-3xl font-bold text-gray-900">Status Type Management</h1>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setIsCreateModalOpen(true);
          }}
          className="flex items-center"
          disabled={loading}
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Status
        </Button>
      </div>



      <div className="bg-white p-6 rounded-lg shadow-md">
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading...</span>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell header className="w-[40%]">Name</TableCell>
                <TableCell header className="w-[40%]">Colour</TableCell>
                <TableCell header className="text-right">Action</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedStatusTypes.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-center text-gray-500 py-4">
                    No status types found.
                  </td>
                </tr>
              ) : (
                paginatedStatusTypes.map((status) => (
                  <TableRow key={status.id}>
                    <TableCell className="font-medium">{status.defectStatusName}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <div
                          className="w-6 h-6 rounded-full border border-gray-300 mr-3"
                          style={{ backgroundColor: status.colorCode }}
                        />
                        <span>{status.colorCode}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => openEditModal(status)} 
                        className="mr-2"
                        disabled={loading}
                      >
                        <Edit2 className="w-4 h-4 text-blue-500" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => openDeleteModal(status)}
                        disabled={loading}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>
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
       <Modal isOpen={isCreateModalOpen} onClose={() => { setIsCreateModalOpen(false); resetForm(); setShowColorPickerCreate(false); }} title="Create Status Type">
         <div className="space-y-4">
           <Input
             label="Status Name"
             value={formData.defectStatusName}
             onChange={handleStatusNameInput}
             placeholder="e.g., IN PROGRESS"
           />
          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
            <div className="flex flex-col items-center gap-2 w-full">
              <div className="flex items-center gap-3 w-full">
                <Input
                  value={formData.colorCode}
                  onChange={handleColorInput}
                  placeholder="#000000"
                  className={`flex-1 ${colorError ? 'border-red-500 focus:ring-red-500' : ''}`}
                  maxLength={7}
                />
                <div
                  className="w-10 h-10 rounded-md border border-gray-300 cursor-pointer"
                  style={{ backgroundColor: formData.colorCode }}
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
                    color={formData.colorCode}
                    onChange={color => setFormData({ ...formData, colorCode: color })}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button 
              variant="secondary" 
              onClick={() => { setIsCreateModalOpen(false); resetForm(); setShowColorPickerCreate(false); }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={loading || !!colorError}>
              {loading ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>

             {/* Edit Modal */}
       <Modal isOpen={isEditModalOpen} onClose={() => { setIsEditModalOpen(false); resetForm(); setShowColorPickerEdit(false); }} title="Edit Status Type">
         <div className="space-y-4">
           <Input
             label="Status Name"
             value={formData.defectStatusName}
             onChange={handleStatusNameInput}
             placeholder="e.g., IN PROGRESS"
           />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
            <div className="flex flex-col items-center gap-2 w-full">
              <div className="flex items-center gap-3 w-full">
                <Input
                  value={formData.colorCode}
                  onChange={handleColorInput}
                  placeholder="#000000"
                  className={`flex-1 ${colorError ? 'border-red-500 focus:ring-red-500' : ''}`}
                  maxLength={7}
                />
                <div
                  className="w-10 h-10 rounded-md border border-gray-300 cursor-pointer"
                  style={{ backgroundColor: formData.colorCode }}
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
                    color={formData.colorCode}
                    onChange={color => setFormData({ ...formData, colorCode: color })}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button 
              variant="secondary" 
              onClick={() => { setIsEditModalOpen(false); resetForm(); setShowColorPickerEdit(false); }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Delete Status Type">
        <div>
          <p>Are you sure you want to delete the status "<strong>{deletingStatus?.defectStatusName}</strong>"?</p>
          <div className="flex justify-end space-x-2 mt-4">
            <Button 
              variant="secondary" 
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              variant="danger" 
              onClick={handleDelete}
              disabled={loading}
            >
              {loading ? 'Deleting...' : 'Delete'}
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

export default StatusType; 