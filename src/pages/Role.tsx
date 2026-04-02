import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { ChevronLeft, Plus, Edit2, Trash2, UserCog } from 'lucide-react';
import { createRole } from '../api/role/createrole';
import { getAllRoles } from '../api/role/viewrole';
import { updateRoleById } from '../api/role/updaterole';
import { deleteRoleById } from '../api/role/deleterole';
import { Toast } from '../components/ui/Toast';

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  level: 'basic' | 'standard' | 'advanced' | 'admin';

  createdAt: string;
  updatedAt: string;
  roleName: string;
}

const Role: React.FC = () => {
  const navigate = useNavigate();
  const [roles, setRoles] = useState<Role[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [deletingRole, setDeletingRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: [] as string[],
    level: 'basic' as Role["level"],
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;
  const totalPages = Math.ceil(roles.length / pageSize);
  const paginatedRoles = roles.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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

  // Available permissions
  const availablePermissions = [
    'View Dashboard',
    'Manage Projects',
    'Create Defects',
    'Edit Defects',
    'Delete Defects',
    'Manage Test Cases',
    'Execute Tests',
    'Manage Employees',
    'View Reports',
    'Manage Configurations',
    'Admin Access'
  ];

  // Load roles from backend on component mount
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const response = await getAllRoles();
        const rolesArray = Array.isArray(response.data) ? response.data : response.data?.data || [];
        setRoles(rolesArray);
      } catch (error) {
        showToast('Failed to fetch roles: ' + error, 'error');
        setRoles([]);
      }
    };
    fetchRoles();
    // Reset toast on mount so none show at page load
    setToast({ isOpen: false, message: '', type: 'success' });
    setCurrentPage(1); // Reset to first page on mount
  }, []);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      permissions: [],
      level: 'basic',
     
    });
  };

  const validateForm = () => {
    if (formData.name.trim() === '') {
      return { isValid: false, message: 'Role Name cannot be empty.' };
    }
    
    // Check if name contains only alphabets and spaces
    if (!/^[A-Za-z ]+$/.test(formData.name.trim())) {
      return { isValid: false, message: 'Role Name can only contain alphabets and spaces.' };
    }
    
    return { isValid: true, message: '' };
  };

  const handleCreate = async () => {
    // Frontend duplicate check as fallback
    const exists = roles.some(role => role.roleName.trim().toLowerCase() === formData.name.trim().toLowerCase());
    if (exists) {
      showToast('Role already exists', 'error');
      setIsCreateModalOpen(false);
      resetForm();
      return;
    }

    // Validate form input
    const validation = validateForm();
    if (!validation.isValid) {
      // Close modal and show validation error on main page
      setIsCreateModalOpen(false);
      resetForm();
      showToast(validation.message, 'error');
      return;
    }

    try {
      await createRole({ roleName: formData.name });
      // Add this:
      const response = await getAllRoles();
      const rolesArray = Array.isArray(response.data) ? response.data : response.data?.data || [];
      setRoles(rolesArray);
      setIsCreateModalOpen(false);
      resetForm();
      showToast('Role created successfully!', 'success');
    } catch (error: any) {
      console.log('Error details:', error);
      console.log('Error message:', error.message);
      console.log('Error response:', error.response);
      
      // Handle specific error messages from the API
      const errorMessage = error.message || error.response?.data?.message || 'Unknown error';
      
      // Close modal and show validation error on main page for all errors
      setIsCreateModalOpen(false);
      resetForm();
      showToast('Failed to create role: ' + errorMessage, 'error');
    }
  };

  // Show create alert after modal closes
  useEffect(() => {
    if (!isCreateModalOpen) {
      // The original code had a pendingCreateSuccess state, but it's removed.
      // This useEffect will now only run when isCreateModalOpen becomes false.
      // If the intent was to show a toast on successful creation, it needs to be re-added.
      // For now, removing the dependency on pendingCreateSuccess.
    }
  }, [isCreateModalOpen]);

  const handleEdit = async () => {
    if (!editingRole) return;
    
    // Check if the role name has actually changed
    if (formData.name.trim() === editingRole.roleName.trim()) {
      showToast('No changes were made to the role', 'error');
      return;
    }
    
    // Frontend duplicate check as fallback (ignore current role being edited)
    const exists = roles.some(role => 
      role.roleName.trim().toLowerCase() === formData.name.trim().toLowerCase() && 
      role.id !== editingRole.id
    );
    if (exists) {
      showToast('Role already exists', 'error');
      setIsEditModalOpen(false);
      setEditingRole(null);
      resetForm();
      return;
    }

    // Validate form input
    const validation = validateForm();
    if (!validation.isValid) {
      // Close modal and show validation error on main page
      setIsEditModalOpen(false);
      setEditingRole(null);
      resetForm();
      showToast(validation.message, 'error');
      return;
    }

    try {
      // Call backend API to update role
      await updateRoleById(editingRole.id, formData.name);

      // Refresh roles from backend for latest data
      const response = await getAllRoles();
      const rolesArray = Array.isArray(response.data) ? response.data : response.data?.data || [];
      setRoles(rolesArray);
      setIsEditModalOpen(false);
      setEditingRole(null);
      resetForm();
      showToast('Role updated successfully!', 'success');
    } catch (error: any) {
      // Handle specific error messages from the API
      const errorMessage = error.message || error.response?.data?.message || 'Unknown error';
      
      // Close modal and show validation error on main page for all errors
      setIsEditModalOpen(false);
      setEditingRole(null);
      resetForm();
      showToast('Failed to update role: ' + errorMessage, 'error');
    }
  };

  const handleDelete = async () => {
    if (!deletingRole) return;

    try {
      // Call backend API to delete role
      await deleteRoleById(deletingRole.id);

      // Refresh roles from backend for latest data
      const response = await getAllRoles();
      const rolesArray = Array.isArray(response.data) ? response.data : response.data?.data || [];
      setRoles(rolesArray);
      setIsDeleteModalOpen(false);
      setDeletingRole(null);
      showToast('Role deleted successfully!', 'success');
    } catch (error: any) {
      // Close modal and show validation error on main page
      setIsDeleteModalOpen(false);
      setDeletingRole(null);
      
      // Show user-friendly error message instead of technical API error
      showToast('Failed to delete role', 'error');
    }
  };

  const openEditModal = (role: Role) => {
    setEditingRole(role);
    setFormData({
      name: role.roleName,
      description: role.description,
      permissions: role.permissions,
      level: role.level,
      
    });
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (role: Role) => {
    setDeletingRole(role);
    setIsDeleteModalOpen(true);
  };

  const togglePermission = (permission: string) => {
    const updatedPermissions = formData.permissions.includes(permission)
      ? formData.permissions.filter(p => p !== permission)
      : [...formData.permissions, permission];
    setFormData({ ...formData, permissions: updatedPermissions });
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'basic': return 'bg-green-100 text-green-800';
      case 'standard': return 'bg-blue-100 text-blue-800';
      case 'advanced': return 'bg-purple-100 text-purple-800';
      case 'admin': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getLevelLabel = (level: string) => {
    switch (level) {
      case 'basic': return 'Basic';
      case 'standard': return 'Standard';
      case 'advanced': return 'Advanced';
      case 'admin': return 'Admin';
      default: return level;
    }
  };

  // Role name input handler with validation
  const handleRoleNameInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData({ ...formData, name: value });
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
          <UserCog className="w-8 h-8 text-blue-500 mr-3" />
          <h1 className="text-3xl font-bold text-gray-900">Role Management</h1>
        </div>
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center"
        >
          <Plus className="w-5 h-5 mr-2" />
          Create Role
        </Button>
      </div>

      {/* Roles Table */}
      <div className="overflow-x-auto rounded-lg shadow mb-8 max-w-2xl mx-auto">
        <table className="min-w-full divide-y divide-gray-200 text-base">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-5 py-3 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Role</th>
              <th className="px-5 py-3 text-center text-sm font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedRoles.map((role) => (
              <tr key={role.id}>
                <td className="px-5 py-3 whitespace-nowrap font-semibold text-gray-900 text-base">{role.roleName}</td>
                <td className="px-5 py-3 whitespace-nowrap text-center">
                  <button
                    onClick={() => openEditModal(role)}
                    className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded mr-2"
                    title="Edit"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => openDeleteModal(role)}
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
        title="Create New Role"
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role Name
            </label>
            <Input
              value={formData.name}
              onChange={handleRoleNameInput}
              placeholder="Enter role name"
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
          setEditingRole(null);
          resetForm();
        }}
        title="Edit Role"
        size="sm"
      >
                <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role Name
            </label>
            <Input
              value={formData.name}
              onChange={handleRoleNameInput}
              placeholder="Enter role name"
            />
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsEditModalOpen(false);
                setEditingRole(null);
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
          setDeletingRole(null);
        }}
        title="Delete Role"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Are you sure you want to delete the role "{deletingRole?.roleName}"? 
            This action cannot be undone.
          </p>
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setDeletingRole(null);
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

export default Role;