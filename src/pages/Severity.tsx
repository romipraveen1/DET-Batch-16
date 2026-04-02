import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Table, TableBody, TableCell, TableRow } from '../components/ui/Table';
import { Modal } from '../components/ui/Modal';
import { ChevronLeft, Plus, Edit2, Trash2, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getSeverities, createSeverity as apiCreateSeverity, updateSeverity as apiUpdateSeverity, deleteSeverity as apiDeleteSeverity, Severity as SeverityType } from '../api/severity';
import { Toast } from '../components/ui/Toast';
import { HexColorPicker } from 'react-colorful';

const Severity: React.FC = () => {
  const navigate = useNavigate();
  const [severities, setSeverities] = useState<SeverityType[]>([]);
  const [loading, setLoading] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;
  const totalPages = Math.ceil(severities.length / pageSize);
  const paginatedSeverities = severities.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingSeverity, setEditingSeverity] = useState<SeverityType | null>(null);
  const [deletingSeverity, setDeletingSeverity] = useState<SeverityType | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    color: '#000000',
    weight: 1,
  });

  // Custom color picker visibility
  const [showColorPickerCreate, setShowColorPickerCreate] = useState(false);
  const [showColorPickerEdit, setShowColorPickerEdit] = useState(false);

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

  // Duplicate color validation state
  const [colorError, setColorError] = useState('');

  const resetForm = () => {
    setFormData({
      name: '',
      color: '#000000',
      weight: 1,
    });
  };

  useEffect(() => {
    const fetchSeverities = async () => {
      setLoading(true);
      try {
        const res = await getSeverities();
        setSeverities(res.data);
      } catch (err: any) {
        showToast('Failed to fetch severities', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchSeverities();
    // Reset toast on mount so none show at page load
    setToast({ isOpen: false, message: '', type: 'success' });
    setCurrentPage(1); // Reset to first page on mount
  }, []);



  // Check for duplicate color on color input change
  useEffect(() => {
    if (isCreateModalOpen) {
      const isDuplicate = severities.some(
        (s) => s.color.toLowerCase() === formData.color.toLowerCase()
      );
      if (isDuplicate) {
        setColorError('This color is already in use. Please choose a different color.');
      } else {
        setColorError('');
      }
    } else {
      setColorError('');
    }
  }, [formData.color, severities, isCreateModalOpen]);

  const handleCreate = async () => {
    // Duplicate name check (case-insensitive, trimmed)
    const exists = severities.some(s => s.name.trim().toLowerCase() === formData.name.trim().toLowerCase());
    if (exists) {
      // Close modal and show validation error on main page
      setIsCreateModalOpen(false);
      resetForm();
      showToast('Severity Name already exists.', 'error');
      return;
    }
    
    try {
      setLoading(true);
      const res = await apiCreateSeverity(formData);
      if (res.data) {
        setSeverities([...severities, res.data]);
        setIsCreateModalOpen(false);
        resetForm();
        showToast('Severity created successfully!', 'success');
      } else {
        showToast('Failed to create severity', 'error');
      }
    } catch (err: any) {
      // Close modal and show validation error on main page for all errors
      setIsCreateModalOpen(false);
      resetForm();
      
      // Extract meaningful error message from the error object
      let errorMessage = 'Failed to create severity';
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      } else if (err.response?.status === 400) {
        errorMessage = 'Severity name can only contain alphabets and spaces.';
      }
      
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!editingSeverity) return;
    
    // Check if any of the severity fields (name, color, or weight) has actually changed
    if (formData.name.trim() === editingSeverity.name.trim() && 
        formData.color.toLowerCase() === editingSeverity.color.toLowerCase() &&
        formData.weight === editingSeverity.weight) {
      showToast('No changes were made to the severity', 'error');
      return;
    }
    
    // Duplicate name check (case-insensitive, trimmed, ignore self)
    const exists = severities.some(s => s.name.trim().toLowerCase() === formData.name.trim().toLowerCase() && s.id !== editingSeverity.id);
    if (exists) {
      // Close modal and show validation error on main page
      setIsEditModalOpen(false);
      setEditingSeverity(null);
      resetForm();
      showToast('Severity Name already exists.', 'error');
      return;
    }
    
    try {
      setLoading(true);
      const res = await apiUpdateSeverity(editingSeverity.id, formData);
      if (res.data) {
        const updatedSeverities = severities.map((severity): SeverityType =>
          severity.id === editingSeverity.id ? res.data as SeverityType : severity
        );
        setSeverities(updatedSeverities);
        setIsEditModalOpen(false);
        setEditingSeverity(null);
        resetForm();
        showToast('Severity updated successfully!', 'success');
      } else {
        showToast('Failed to update severity', 'error');
      }
    } catch (err: any) {
      // Close modal and show validation error on main page for all errors
      setIsEditModalOpen(false);
      setEditingSeverity(null);
      resetForm();
      
      // Extract meaningful error message from the error object
      let errorMessage = 'Failed to update severity';
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      } else if (err.response?.status === 400) {
        errorMessage = 'Severity name can only contain alphabets and spaces.';
      }
      
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingSeverity) return;
    try {
      setLoading(true);
      await apiDeleteSeverity(deletingSeverity.id);
      const updatedSeverities = severities.filter(
        severity => severity.id !== deletingSeverity.id
      );
      setSeverities(updatedSeverities);
      setIsDeleteModalOpen(false);
      setDeletingSeverity(null);
      showToast('Severity deleted successfully!', 'success');
    } catch (err: any) {
      // Close modal and show validation error on main page
      setIsDeleteModalOpen(false);
      setDeletingSeverity(null);
      
      // Extract meaningful error message from the error object
      let errorMessage = 'Failed to delete severity';
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      } else if (err.response?.status === 400) {
        errorMessage = 'Cannot delete severity. It may be in use.';
      }
      
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (severity: SeverityType) => {
    setEditingSeverity(severity);
    setFormData({
      name: severity.name,
      color: severity.color,
      weight: severity.weight,
    });
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (severity: SeverityType) => {
    setDeletingSeverity(severity);
    setIsDeleteModalOpen(true);
  };

  // Color input handler: only allow # and hex digits, max 7 chars
  const handleColorInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    if (!value.startsWith('#')) value = '#' + value.replace(/[^0-9A-Fa-f]/gi, '');
    value = '#' + value.slice(1).replace(/[^0-9A-Fa-f]/gi, '');
    value = value.slice(0, 7);
    setFormData({ ...formData, color: value });
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
          <AlertTriangle className="w-8 h-8 text-blue-500 mr-3" />
          <h1 className="text-3xl font-bold text-gray-900">Severity Management</h1>
        </div>
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center"
        >
          <Plus className="w-5 h-5 mr-2" />
          Create Severity
        </Button>
      </div>

      {/* Severities Table */}
      <Card>
        <div className="flex flex-row items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Severity Levels</h2>
        </div>
        <CardContent>
          <Table>
            <thead className="bg-gray-50">
              <TableRow>
                <TableCell header>Name</TableCell>
                <TableCell header>Color</TableCell>
                <TableCell header>Weight</TableCell>
                <TableCell header>Actions</TableCell>
              </TableRow>
            </thead>
            <TableBody>
              {paginatedSeverities.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center text-gray-500 py-4">
                    No severities found.
                  </td>
                </tr>
              ) : (
                paginatedSeverities.map((severity) => (
                  <TableRow key={severity.id}>
                    <TableCell className="font-medium">{severity.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded-full border border-gray-300"
                          style={{ backgroundColor: severity.color }}
                        />
                        <span className="text-sm text-gray-600">{severity.color}</span>
                      </div>
                    </TableCell>
                    <TableCell>{severity.weight}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(severity)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDeleteModal(severity)}
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
        title="Create New Severity"
      >
        <div className="space-y-4 items-start flex flex-col">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Severity Name
            </label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter severity name"
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
          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Weight
            </label>
            <Input
              type="number"
              value={formData.weight}
              min={1}
              onChange={e => setFormData({ ...formData, weight: Number(e.target.value) })}
              placeholder="Enter severity weight"
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4 w-full">
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
          setEditingSeverity(null);
          resetForm();
          setShowColorPickerEdit(false);
        }}
        title="Edit Severity"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Severity Name
            </label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter severity name"
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
                  className="flex-1"
                  maxLength={7}
                />
                <div
                  className="w-10 h-10 rounded-md border border-gray-300 cursor-pointer"
                  style={{ backgroundColor: formData.color }}
                  onClick={() => setShowColorPickerEdit((v) => !v)}
                  aria-label="Pick color"
                />
              </div>
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Weight
            </label>
            <Input
              type="number"
              value={formData.weight}
              min={1}
              onChange={e => setFormData({ ...formData, weight: Number(e.target.value) })}
              placeholder="Enter severity weight"
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsEditModalOpen(false);
                setEditingSeverity(null);
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
          setDeletingSeverity(null);
        }}
        title="Delete Severity"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Are you sure you want to delete the severity "{deletingSeverity?.name}"?
            This action cannot be undone.
          </p>
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setDeletingSeverity(null);
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

      {loading && <div className="text-gray-600 mb-4">Loading...</div>}
    </div>
  );
};

export default Severity;
