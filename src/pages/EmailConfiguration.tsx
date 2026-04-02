import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "../components/ui/Table";
import { Modal } from "../components/ui/Modal";
import { Input } from "../components/ui/Input";
import { Plus, Edit, Trash2, Mail, CheckCircle, ChevronLeft, Bell, Settings } from "lucide-react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select';
import { Checkbox } from '../components/ui/Checkbox';
import { createSmtpConfig, getSmtpConfigs, updateSmtpConfig, deleteSmtpConfig, CreateSmtpConfigRequest, CreateSmtpConfigResponse } from '../api/emailConfiguration';
import { Toast } from '../components/ui/Toast';
import { getAllUsersSimple, SimpleUser } from '../api/users/getallusers';
import { updateUserEmailPreferences, getUserEmailPreferences, UserEmailPreferences } from '../api/users/userEmailPreferences';

interface EmailNotification {
  id: string;
  name: string;
  event: string;
  subject: string;
  template: string;
  recipients: string[];
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

// Email Points Setup - mapped to API field names
const mainEmailPoints = [
  { id: 'projectAllocationEmailStatus', label: 'Project Allocation' },
  { id: 'moduleAllocationEmailStatus', label: 'Module' },
  { id: 'submoduleAllocationEmailStatus', label: 'Sub Module' },
  { id: 'defectEmailStatus', label: 'Defect' },
];





const mockRoles = [
  { id: 'role1', name: 'Admin' },
  { id: 'role2', name: 'Project Manager' },
  { id: 'role3', name: 'Developer' },
];



const EmailConfiguration: React.FC = () => {
  const [activeTab, setActiveTab] = useState(() => {
    // Get the saved tab from localStorage, default to 'points' if not found
    const savedTab = localStorage.getItem('emailConfigActiveTab');
    return savedTab || 'points';
  });
  const navigate = useNavigate();

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">EMAIL CONFIGURATION</h1>
        <Button
          variant="secondary"
          onClick={() => navigate('/configurations')}
          className="flex items-center"
        >
          <ChevronLeft className="w-5 h-5 mr-2" /> Back
        </Button>
      </div>
      <div className="flex border-b mb-4">
                 <button
           className={`py-2 px-4 ${activeTab === 'points' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}
           onClick={() => {
             setActiveTab('points');
             localStorage.setItem('emailConfigActiveTab', 'points');
           }}
         >
           Email Points Setup
         </button>
         <button
           className={`py-2 px-4 ${activeTab === 'server' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}
           onClick={() => {
             setActiveTab('server');
             localStorage.setItem('emailConfigActiveTab', 'server');
           }}
         >
           Email Server Configuration
         </button>
      </div>

      {activeTab === 'points' && <EmailPointsSetup />}
      {activeTab === 'server' && <EmailServerConfiguration />}
    </div>
  );
};

const EmailPointsSetup: React.FC = () => {
  const [configType, setConfigType] = useState('user'); // 'user' or 'role'
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [mainPoints, setMainPoints] = useState<Record<string, boolean>>({});
  const [users, setUsers] = useState<SimpleUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(false);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);

  // Fetch users when component mounts or when configType changes to 'user'
  useEffect(() => {
    if (configType === 'user') {
      fetchUsers();
    }
  }, [configType]);

  useEffect(() => {
    // Reset selections when config type changes
    setSelectedId(undefined);
    setMainPoints({});
  }, [configType]);

  // Fetch user preferences when a user is selected
  useEffect(() => {
    if (configType === 'user' && selectedId) {
      fetchUserPreferences(selectedId);
    } else {
      setMainPoints({});
    }
  }, [selectedId, configType]);

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const response = await getAllUsersSimple();
      console.log('Fetched users response:', response);
      if (response.status === 'success' && response.data && response.data.content) {
        console.log(`Successfully loaded ${response.data.content.length} users out of ${response.data.totalElements} total users`);
        setUsers(response.data.content);
      } else {
        console.error('Failed to fetch users:', response);
        setUsers([]);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const fetchUserPreferences = async (userId: string) => {
    setIsLoadingPreferences(true);
    try {
      const response = await getUserEmailPreferences(userId);
      console.log('Fetched user preferences:', response);

      if (response.status === 'success' && response.data) {
        // Map API response to checkbox states
        const preferences = response.data as UserEmailPreferences;
        setMainPoints({
          defectEmailStatus: preferences.defectEmailStatus === true,
          projectAllocationEmailStatus: preferences.projectAllocationEmailStatus === true,
          moduleAllocationEmailStatus: preferences.moduleAllocationEmailStatus === true,
          submoduleAllocationEmailStatus: preferences.submoduleAllocationEmailStatus === true,
        });
        console.log('Set preferences from API:', {
          defectEmailStatus: preferences.defectEmailStatus === true,
          projectAllocationEmailStatus: preferences.projectAllocationEmailStatus === true,
          moduleAllocationEmailStatus: preferences.moduleAllocationEmailStatus === true,
          submoduleAllocationEmailStatus: preferences.submoduleAllocationEmailStatus === true,
        });
      } else {
        // If no preferences found or error, set default values (all false)
        console.log('No existing preferences found or error, using defaults');
        setMainPoints({
          defectEmailStatus: false,
          projectAllocationEmailStatus: false,
          moduleAllocationEmailStatus: false,
          submoduleAllocationEmailStatus: false,
        });
      }
    } catch (error) {
      console.error('Error fetching user preferences:', error);
      // Set default values on error
      setMainPoints({
        defectEmailStatus: false,
        projectAllocationEmailStatus: false,
        moduleAllocationEmailStatus: false,
        submoduleAllocationEmailStatus: false,
      });
    } finally {
      setIsLoadingPreferences(false);
    }
  };

  const handleUpdate = async () => {
    if (configType === 'user' && selectedId) {
      setIsSavingPreferences(true);
      try {
        // Prepare the preferences payload
        const preferences: UserEmailPreferences = {
          defectEmailStatus: mainPoints.defectEmailStatus || false,
          projectAllocationEmailStatus: mainPoints.projectAllocationEmailStatus || false,
          moduleAllocationEmailStatus: mainPoints.moduleAllocationEmailStatus || false,
          submoduleAllocationEmailStatus: mainPoints.submoduleAllocationEmailStatus || false,
        };

        console.log('Updating user email preferences:', { userId: selectedId, preferences });

        const response = await updateUserEmailPreferences(selectedId, preferences);

        if (response.status === 'success') {
          alert('Email preferences updated successfully!');
        } else {
          alert(`Failed to update preferences: ${response.message || 'Unknown error'}`);
        }
      } catch (error: any) {
        console.error('Error updating preferences:', error);
        alert('Error updating email preferences. Please try again.');
      } finally {
        setIsSavingPreferences(false);
      }
    } else if (configType === 'role') {
      // Handle role-based configuration (not implemented yet)
      console.log('Role-based configuration not implemented yet');
      console.log('Selected role ID:', selectedId);
      console.log('Main points:', mainPoints);
      alert('Role-based email configuration is not implemented yet.');
    } else {
      alert('Please select a user first.');
    }
  };

  return (
    <div>
      <div className="flex items-center mb-4">
        <div className="flex rounded-md border border-gray-300">
          <button
            className={`px-4 py-2 rounded-l-md ${configType === 'user' ? 'bg-blue-500 text-white' : 'bg-white text-black'}`}
            onClick={() => setConfigType('user')}
          >
            User
          </button>
          <button
            className={`px-4 py-2 rounded-r-md ${configType === 'role' ? 'bg-blue-500 text-white' : 'bg-white text-black'}`}
            onClick={() => setConfigType('role')}
          >
            Role
          </button>
        </div>
        <div className="ml-4 w-64">
          <Select onValueChange={setSelectedId} value={selectedId}>
            <SelectTrigger>
              <SelectValue placeholder={
                configType === 'user'
                  ? (isLoadingUsers ? 'Loading users...' : 'Select User')
                  : 'Select Role'
              } />
            </SelectTrigger>
            <SelectContent className="max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              {configType === 'user' ? (
                isLoadingUsers ? (
                  <SelectItem value="loading" disabled>Loading users...</SelectItem>
                ) : users.length > 0 ? (
                  users.map(user => (
                    <SelectItem key={user.id || user.userId} value={String(user.id || user.userId)}>
                      {`${user.firstName} ${user.lastName}`.trim() || user.email}
                    </SelectItem>
                  ))
                ) : (
                  <>
                    <SelectItem value="no-users" disabled>No users available</SelectItem>
                    <SelectItem value="refresh" onClick={fetchUsers}>🔄 Refresh Users</SelectItem>
                  </>
                )
              ) : (
                mockRoles.map(role => (
                  <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
        {configType === 'user' && !isLoadingUsers && users.length === 0 && (
          <Button
            variant="secondary"
            onClick={fetchUsers}
            className="ml-2"
            size="sm"
          >
            🔄 Refresh
          </Button>
        )}
      </div>

      <div className="space-y-6">
        <div className="p-4 border rounded-md">
          {isLoadingPreferences ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
                <span className="text-gray-500">Loading user email preferences...</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {mainEmailPoints.map(point => (
                <div key={point.id} className="flex items-center">
                  <Checkbox
                    id={point.id}
                    checked={mainPoints[point.id] || false}
                    onCheckedChange={(checked: boolean) => setMainPoints(prev => ({ ...prev, [point.id]: checked }))}
                    disabled={!selectedId || configType !== 'user' || isSavingPreferences}
                  />
                  <label
                    htmlFor={point.id}
                    className={`ml-2 ${!selectedId || configType !== 'user' ? 'text-gray-400' : ''}`}
                  >
                    {point.label}
                  </label>
                </div>
              ))}
            </div>
          )}

          {configType === 'user' && !selectedId && (
            <div className="text-center py-4 text-gray-500">
              Please select a user to configure email preferences.
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <Button
          onClick={handleUpdate}
          disabled={!selectedId || isSavingPreferences || isLoadingPreferences}
        >
          {isSavingPreferences ? 'Updating...' : 'Update'}
        </Button>
      </div>
    </div>
  );
};

const EmailServerConfiguration: React.FC = () => {
  const [emailConfigs, setEmailConfigs] = useState<CreateSmtpConfigResponse[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedEmailConfig, setSelectedEmailConfig] = useState<CreateSmtpConfigResponse | null>(null);
  const [editingEmailConfig, setEditingEmailConfig] = useState<CreateSmtpConfigResponse | null>(null);
  const [formData, setFormData] = useState<CreateSmtpConfigRequest>({
    name: '', smtpHost: '', smtpPort: 0, username: '', password: '', fromEmail: '', fromName: ''
  });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    isOpen: boolean;
    message: string;
    type: "success" | "error";
  }>({
    isOpen: false,
    message: "",
    type: "success",
  });

  const resetForm = () => {
    setFormData({ name: '', smtpHost: '', smtpPort: 0, username: '', password: '', fromEmail: '', fromName: '' });
  };

  // Fetch email configurations on component mount
  useEffect(() => {
    fetchEmailConfigs();
  }, []);

  const fetchEmailConfigs = async () => {
    try {
      setRefreshing(true);
      setError(null);
      console.log('Fetching email configurations...');
      const configs = await getSmtpConfigs();
      console.log('Fetched configs:', configs);
      setEmailConfigs(configs);
    } catch (error) {
      setError('Failed to fetch email configurations');
      console.error('Error fetching email configurations:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      
      if (editingEmailConfig) {
        // Update logic using the proper update endpoint
        console.log('Updating config with ID:', editingEmailConfig.id);
        console.log('Update data being sent:', formData);
        const updatedConfig = await updateSmtpConfig(editingEmailConfig.id, formData);
        console.log('Updated config response:', updatedConfig);
        
        // Instead of just updating local state, refresh from server to ensure consistency
        await fetchEmailConfigs();
      } else {
        // Create logic
        const newConfig = await createSmtpConfig(formData);
        console.log('Created new config:', newConfig);
        // Refresh the list to get the latest data from server
        await fetchEmailConfigs();
      }
      
      setIsFormOpen(false);
      setEditingEmailConfig(null);
      resetForm();
      
             // Show success message
       const message = editingEmailConfig ? 'SMTP configuration Updated' : 'SMTP configuration Created';
       setToast({
         isOpen: true,
         message: message,
         type: "success",
       });
      
      // Add a small delay and refresh again to ensure we have the latest data
      setTimeout(() => {
        fetchEmailConfigs();
      }, 1000);
         } catch (error) {
       setError('Failed to save email configuration');
       setToast({
         isOpen: true,
         message: 'Failed to save email configuration',
         type: "error",
       });
       console.error('Error saving email configuration:', error);
     } finally {
      setLoading(false);
    }
  };

  const handleEdit = (config: CreateSmtpConfigResponse) => {
    setEditingEmailConfig(config);
    setFormData({
      name: config.name,
      smtpHost: config.smtpHost,
      smtpPort: config.smtpPort,
      username: config.username,
      password: config.password,
      fromEmail: config.fromEmail,
      fromName: config.fromName,
    });
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (selectedEmailConfig) {
      try {
        setLoading(true);
        setError(null);
        
        console.log('Deleting config with ID:', selectedEmailConfig.id);
        await deleteSmtpConfig(selectedEmailConfig.id);
        
        // Remove from local state
        setEmailConfigs(emailConfigs.filter(c => c.id !== selectedEmailConfig.id));
        setIsDeleteModalOpen(false);
        setSelectedEmailConfig(null);
        
                 // Show success message
         setToast({
           isOpen: true,
           message: 'SMTP configuration deleted successfully',
           type: "success",
         });
       } catch (error) {
         setError('Failed to delete email configuration');
         setToast({
           isOpen: true,
           message: 'Failed to delete email configuration',
           type: "error",
         });
         console.error('Error deleting email configuration:', error);
       } finally {
        setLoading(false);
      }
    }
  };

     return (
     <div>
       <Toast
         isOpen={toast.isOpen}
         message={toast.message}
         type={toast.type}
         onClose={() => setToast({ ...toast, isOpen: false })}
       />
       {error && (
         <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
           {error}
         </div>
       )}
      
                    <div className="flex justify-end mb-4">
         <Button 
           onClick={() => { setEditingEmailConfig(null); resetForm(); setIsFormOpen(true); }}
           disabled={loading}
         >
           <Plus className="mr-2 h-4 w-4" /> Add Configuration
         </Button>
       </div>
      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableCell header>Name</TableCell>
              <TableCell header>Host</TableCell>
              <TableCell header>Port</TableCell>
              <TableCell header>Username</TableCell>
              <TableCell header>Actions</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
                         {loading || refreshing ? (
               <TableRow>
                 <TableCell>{loading ? 'Saving...' : 'Refreshing email configurations...'}</TableCell>
                 <TableCell>-</TableCell>
                 <TableCell>-</TableCell>
                 <TableCell>-</TableCell>
                 <TableCell>-</TableCell>
               </TableRow>
             ) : emailConfigs.length === 0 ? (
              <TableRow>
                <TableCell>No email configurations found</TableCell>
                <TableCell>-</TableCell>
                <TableCell>-</TableCell>
                <TableCell>-</TableCell>
                <TableCell>-</TableCell>
              </TableRow>
            ) : (
              emailConfigs.map(config => (
                <TableRow key={config.id}>
                  <TableCell>{config.name}</TableCell>
                  <TableCell>{config.smtpHost}</TableCell>
                  <TableCell>{config.smtpPort}</TableCell>
                  <TableCell>{config.username}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(config)} disabled={loading}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => { setSelectedEmailConfig(config); setIsDeleteModalOpen(true); }} disabled={loading}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={editingEmailConfig ? "Edit Server Configuration" : "Add Server Configuration"}>
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <Input label="Name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
          <Input label="SMTP Host" value={formData.smtpHost} onChange={e => setFormData({ ...formData, smtpHost: e.target.value })} required />
          <Input label="SMTP Port" type="number" value={String(formData.smtpPort)} onChange={e => setFormData({ ...formData, smtpPort: Number(e.target.value) })} required />
          <Input label="Username" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} required />
          <Input label="Password" type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} required />
          <Input label="From Email" type="email" value={formData.fromEmail} onChange={e => setFormData({ ...formData, fromEmail: e.target.value })} required />
          <Input label="From Name" value={formData.fromName} onChange={e => setFormData({ ...formData, fromName: e.target.value })} required />
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="secondary" onClick={() => setIsFormOpen(false)} disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </Modal>

             <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Delete Configuration">
         <p>Are you sure you want to delete this configuration?</p>
         <div className="flex justify-end space-x-2 mt-4">
           <Button variant="secondary" onClick={() => setIsDeleteModalOpen(false)} disabled={loading}>Cancel</Button>
           <Button color="destructive" onClick={handleDelete} disabled={loading}>
             {loading ? 'Deleting...' : 'Delete'}
           </Button>
         </div>
       </Modal>
    </div>
  );
};

export default EmailConfiguration; 