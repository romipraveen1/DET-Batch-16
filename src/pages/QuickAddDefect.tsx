import React, { useState, useEffect } from "react";
import { Bug, Plus } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { Input } from "../components/ui/Input";
import { ImagePicker } from "../components/ui/ImagePicker";
import { useApp } from "../context/AppContext";
import { importDefects } from "../api/importTestCase";
import { getModulesByProjectId } from "../api/module/getModule";
import { getSubmodulesByModuleId } from "../api/submodule/submoduleget";
import { getDefectTypes } from "../api/defectType";
import { getSeverities } from "../api/severity";
import { getAllPriorities } from "../api/priority";
import { projectReleaseCardView } from "../api/releaseView/ProjectReleaseCardView";
import axios from "axios";
import { addDefects } from "../api/defect/addNewDefect";
import { getAllocatedUsersByModuleId, getUsersByAllocation } from '../api/module/getModule';
import AlertModal from '../components/ui/AlertModal';
import { getActiveRelease } from "../api/releaseView/getActiveRelease";
import { useAuth } from '../context/AuthContext';

interface QuickAddDefectProps {
  projectModules: { id: string; name: string; submodules: { id: string; name: string }[] }[];
  onDefectAdded?: () => void;
}

const QuickAddDefect: React.FC<QuickAddDefectProps> = ({ projectModules, onDefectAdded }) => {
  const { selectedProjectId, projects, addDefect, employees } = useApp();
  const { user, isAuthenticated } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    description: "",
    steps: "",
    moduleId: "",
    subModuleId: "",
    severityId: "",
    priorityId: "",
    typeId: "",
    assigntoId: "",
    assignbyId: "",
    releaseId: "",
    attachment: "",
    statusId: "",
    testCaseRequired: true, // Default to true (yes) for new defects
    attachmentFile: null as File | null, // Add attachmentFile field
  });
  const [success, setSuccess] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Dropdown data
  const [modules, setModules] = useState<{ id: string; name: string }[]>([]);
  const [submodules, setSubmodules] = useState<{ id: string; name: string }[]>([]);
  const [defectTypes, setDefectTypes] = useState<{ id: number; defectTypeName: string }[]>([]);
  const [severities, setSeverities] = useState<{ id: number; name: string }[]>([]);
  const [priorities, setPriorities] = useState<{ id: number; priority: string }[]>([]);
  const [releasesData, setReleasesData] = useState<any[]>([]);
  const [isReleaseLoading, setIsReleaseLoading] = useState(false);

  // Add state for allocated users for the selected module
  const [allocatedUsers, setAllocatedUsers] = useState<{ userId: number; userName: string }[]>([]);
  const [isAllocatedUsersLoading, setIsAllocatedUsersLoading] = useState(false);

  // Add state for alert modal
  const [alert, setAlert] = useState<{ open: boolean; message: string }>({ open: false, message: '' });
  const showAlert = (message: string) => setAlert({ open: true, message });
  const closeAlert = () => setAlert({ open: false, message: '' });

  // Fetch static data only once on mount
  useEffect(() => {
    getSeverities().then(res => setSeverities(res.data));
    getAllPriorities().then(res => setPriorities(res.data));
    getDefectTypes().then(res => setDefectTypes(res.data));
  }, []);

  // Fetch project-specific data only when project changes
  useEffect(() => {
    if (selectedProjectId) {
      getActiveRelease(selectedProjectId).then(res => {
        const activeRelease = res && res.data;
        setReleasesData(activeRelease && activeRelease.status ? [activeRelease] : []);
      }).catch(() => setReleasesData([]));
      getModulesByProjectId(selectedProjectId)
        .then((res) => {
          setModules((res.data || []).map((m: any) => ({ id: m.id?.toString(), name: m.moduleName })));
        })
        .catch(() => setModules([]));
    } else {
      setReleasesData([]);
      setModules([]);
    }
  }, [selectedProjectId]);

  // Add this effect to reset form and dropdowns when project changes
  useEffect(() => {
    setFormData({
      description: "",
      steps: "",
      moduleId: "",
      subModuleId: "",
      severityId: "",
      priorityId: "",
      typeId: "",
      assigntoId: "",
      assignbyId: "",
      releaseId: "",
      attachment: "",
      statusId: "",
      testCaseRequired: true, // Default to true (yes) for new defects
      attachmentFile: null, // Clear the attachment file as well
    });
    setModules([]);
    setSubmodules([]);
    setAllocatedUsers([]);
  }, [selectedProjectId]);

  // Fetch submodules when module changes
  useEffect(() => {
    if (formData.moduleId) {
      getSubmodulesByModuleId(Number(formData.moduleId)).then(res => {
        const mapped = (res.data || []).map((sm: any) => ({
          id: sm.id?.toString() || sm.subModuleId?.toString(),
          name: sm.subModuleName || sm.name || ''
        }));
        setSubmodules(mapped);
      }).catch(() => setSubmodules([]));
    } else {
      setSubmodules([]);
    }
  }, [formData.moduleId]);

  // Fetch allocated users when moduleId changes in the form
  useEffect(() => {
    if (!formData.moduleId || !selectedProjectId) {
      setAllocatedUsers([]);
      return;
    }
    setIsAllocatedUsersLoading(true);

    // Use the new API endpoint based on whether submodule is selected
    getUsersByAllocation(selectedProjectId, formData.moduleId, formData.subModuleId || undefined)
      .then((data) => {
        // Handle the response data structure
        let users = [];
        if (Array.isArray(data)) {
          users = data;
        } else if (data && Array.isArray(data.data)) {
          users = data.data;
        } else if (data && data.users && Array.isArray(data.users)) {
          users = data.users;
        }

        // Map the users to the expected format
        const mappedUsers = users.map((user: any) => ({
          userId: user.userId || user.id,
          userName: user.userName || user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim()
        })).filter((user: any) => user.userId && user.userName);

        setAllocatedUsers(mappedUsers);
      })
      .catch((error) => {
        console.error('Failed to fetch users by allocation:', error);
        setAllocatedUsers([]);
      })
      .finally(() => setIsAllocatedUsersLoading(false));
  }, [formData.moduleId, formData.subModuleId, selectedProjectId]);

  // Fetch active release only when projectId changes
  useEffect(() => {
    console.log('selectedProjectId:', selectedProjectId); // Debugging
    if (!selectedProjectId) {
      setReleasesData([]);
      return;
    }
    setIsReleaseLoading(true);
    getActiveRelease(selectedProjectId)
      .then(res => {
        const activeRelease = res && res.data;
        setReleasesData(activeRelease && activeRelease.status ? [activeRelease] : []);
      })
      .catch(() => setReleasesData([]))
      .finally(() => setIsReleaseLoading(false));
  }, [selectedProjectId]);

  const handleInputChange = (field: string, value: string) => {
    // Handle testCaseRequired as boolean
    if (field === 'testCaseRequired') {
      setFormData(prev => ({ ...prev, [field]: value === 'true' }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log('QuickAdd: Form submission started');
    console.log('QuickAdd: Form data:', formData);
    console.log('QuickAdd: Authentication status:', { isAuthenticated, user: user?.username });

    // Check authentication
    if (!isAuthenticated || !user) {
      showAlert("Please log in to add defects.");
      return;
    }

    // Validate required fields
    if (!formData.description.trim()) {
      showAlert("Please enter a description");
      return;
    }
    if (!formData.severityId) {
      showAlert("Please select a severity");
      return;
    }
    if (!formData.priorityId) {
      showAlert("Please select a priority");
      return;
    }
    if (!formData.typeId) {
      showAlert("Please select a type");
      return;
    }
    if (!formData.moduleId) {
      showAlert("Please select a module");
      return;
    }
    if (!formData.steps.trim()) {
      showAlert("Please enter steps");
      return;
    }
    if (!formData.assigntoId) {
      showAlert("Please select an assignee");
      return;
    }

    console.log('QuickAdd: All validations passed');

    setSuccess(true);

    // Build payload according to the API specification
    const payload: any = {
      description: formData.description,
      steps: formData.steps,
      projectId: Number(selectedProjectId),
      severityId: Number(formData.severityId),
      priorityId: Number(formData.priorityId),
      defectStatusId: formData.statusId ? Number(formData.statusId) : 1, // Default to status 1 if not provided
      typeId: Number(formData.typeId),
      reOpenCount: 0, // Always start with 0 for new defects
      attachment: formData.attachment || null,
      assignbyId: null, // Ignore assign by for now as requested
      assigntoId: formData.assigntoId ? Number(formData.assigntoId) : null,
      modulesId: Number(formData.moduleId),
      subModuleId: formData.subModuleId ? Number(formData.subModuleId) : null,
      releasesId: formData.releaseId ? Number(formData.releaseId) : null,
      testCaseRequired: formData.testCaseRequired, // Include testcase required field
    };

    console.log('QuickAdd: Submitting defect with payload:', payload);
    console.log('QuickAdd: Attachment file present:', !!formData.attachmentFile);

    try {
      let response;
      const attachmentFile: File | undefined = formData.attachmentFile || undefined;
      // Always send as FormData to maintain consistency with the backend
      // This ensures the backend receives the same request structure whether an image is present or not
      const form = new FormData();
      form.append('data', new Blob([JSON.stringify(payload)], { type: 'application/json' }));
      
      if (attachmentFile) {
        console.log('QuickAdd: Sending with attachment file');
        form.append('attachmentFile', attachmentFile);
      } else {
        console.log('QuickAdd: Sending without attachment file');
        // Send an empty blob to maintain the same FormData structure
        // This prevents 403 errors that occur when the backend expects FormData but receives JSON
        form.append('attachmentFile', new Blob([], { type: 'application/octet-stream' }));
      }
      
      console.log('QuickAdd: FormData entries:');
      for (let [key, value] of form.entries()) {
        console.log('QuickAdd: FormData key:', key, 'value type:', typeof value, 'value:', value);
      }
      
      console.log('QuickAdd: API endpoint:', `${import.meta.env.VITE_BASE_URL}defect`);
      response = await addDefects(form as any);
      console.log('QuickAdd: API response:', response);
      if (response.status === "Success" || response.statusCode === 2000 || response.statusCode === 200) {
        showAlert("Defect added successfully!");
        setTimeout(() => {
          setSuccess(false);
          setIsModalOpen(false);
          setFormData({
            description: "",
            steps: "",
            moduleId: "",
            subModuleId: "",
            severityId: "",
            priorityId: "",
            typeId: "",
            assigntoId: "",
            assignbyId: "",
            releaseId: "",
            attachment: "",
            statusId: "",
            testCaseRequired: true, // Default to true (yes) for new defects
            attachmentFile: null, // Clear the attachment file as well
          });
        }, 1200);
        if (onDefectAdded) onDefectAdded();
      } else {
        setSuccess(false);
        showAlert(response.message || "Failed to add defect.");
      }
    } catch (error: any) {
      setSuccess(false);
      console.error('QuickAdd: Error details:', error);
      console.error('QuickAdd: Response status:', error?.response?.status);
      console.error('QuickAdd: Response data:', error?.response?.data);
      console.error('QuickAdd: Response headers:', error?.response?.headers);
      
      // Enhanced error handling for different scenarios
      let errorMessage = "Error adding defect. Please try again.";
      
      if (error?.response?.status === 403) {
        errorMessage = "Access denied (403 Forbidden). Please check your permissions or try logging in again.";
      } else if (error?.response?.status === 401) {
        errorMessage = "Authentication failed (401 Unauthorized). Please log in again.";
      } else if (error?.response?.data?.message) {
        errorMessage = `Backend error: ${error.response.data.message}`;
      } else if (error?.response?.data?.error) {
        errorMessage = `Backend error: ${error.response.data.error}`;
      } else if (error?.message) {
        errorMessage = `Network error: ${error.message}`;
      }
      
      showAlert(errorMessage);
    }
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!selectedProjectId) {
      showAlert("Please select a project before importing defects.");
      return;
    }
    
    const formData = new FormData();
    formData.append("file", file);
    try {
      const response = await importDefects(formData, selectedProjectId);
      if (response && response.data && Array.isArray(response.data)) {
        showAlert("Import succeeded but no data returned.");
      } else {
        showAlert("Import succeeded but no data returned.");
      }
    } catch (error: any) {
      showAlert("Failed to import defects: " + (error?.message || error));
    }
  };

  return (
    <div>
      <div className="relative flex items-center w-44 h-12">
        <span className="absolute left-0 flex items-center justify-center w-12 h-12 rounded-lg bg-rose-500 shadow-md">
          <Bug size={20} style={{ color: '#fff' }} />
        </span>
        <Button
          onClick={() => setIsModalOpen(true)}
          className="pl-14 pr-4 py-1 bg-white rounded-xl shadow border border-gray-200 w-full h-12 flex items-center font-semibold text-gray-900 hover:shadow-lg hover:bg-gray-50 transition-all justify-start"
          disabled={!selectedProjectId}
          style={{ fontWeight: 500, borderStyle: 'solid' }}
        >
          <span className="text-base font-medium text-gray-900 whitespace-nowrap">Add Defect</span>
        </Button>
      </div>
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add New Defect"
        size="xl"
      >
        {selectedProjectId && (
          <div className="font-bold text-blue-600 text-base mb-2">
            {projects.find((p) => p.id === selectedProjectId)?.name}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Brief Description */}
          <Input
            label="Brief Description"
            value={formData.description}
            onChange={e => handleInputChange("description", e.target.value)}
            required
          />
          {/* Steps */}
          {/* Steps */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Steps
            </label>
            <textarea
              value={formData.steps}
              onChange={e => handleInputChange("steps", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              required
            />
          </div>
          {/* Attachment Image - Optional */}
          <ImagePicker
            label="Attachment Image (Optional)"
            value={formData.attachmentFile}
            onChange={(file) => setFormData((prev) => ({ ...prev, attachmentFile: file }))}
          />
          {/* Test Case Required Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Test Case Required
            </label>
            <div className="flex space-x-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleInputChange('testCaseRequired', 'true')}
                className={`w-20 h-8 text-xs transition-all duration-200 ${
                  formData.testCaseRequired 
                    ? 'bg-green-500 hover:bg-green-600 text-white border-2 border-green-600 shadow-md' 
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700 border-2 border-gray-300'
                }`}
              >
                Yes
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleInputChange('testCaseRequired', 'false')}
                className={`w-20 h-8 text-xs transition-all duration-200 ${
                  !formData.testCaseRequired 
                    ? 'bg-red-500 hover:bg-red-600 text-white border-2 border-red-600 shadow-md' 
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700 border-2 border-gray-300'
                }`}
              >
                No
              </Button>
            </div>
          </div>
          {/* Modules and Submodules */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Modules
              </label>
              <select
                value={formData.moduleId}
                onChange={e => setFormData(f => ({ ...f, moduleId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select a module</option>
                {modules.map(module => (
                  <option key={module.id} value={module.id}>{module.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Submodules
              </label>
              <select
                value={formData.subModuleId}
                onChange={e => setFormData(f => ({ ...f, subModuleId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={!formData.moduleId}
              >
                <option value="">
                  {submodules.length === 0
                    ? "No submodules"
                    : "Select a submodule"}
                </option>
                {submodules.map((submodule) => (
                  <option key={submodule.id} value={submodule.id}>
                    {submodule.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {/* Severity, Priority, Type, Release, Assigned To */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
              <select
                value={formData.typeId}
                onChange={e => handleInputChange('typeId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select type</option>
                {defectTypes.map((t) => (
                  <option key={t.id} value={t.id}>{t.defectTypeName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Severity
              </label>
              <select
                value={formData.severityId}
                onChange={e => handleInputChange('severityId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select severity</option>
                {severities.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            {/* Found in Release Dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Found in Release
              </label>
              <select
                value={formData.releaseId}
                onChange={e => handleInputChange('releaseId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isReleaseLoading || !selectedProjectId}
              >
                {!selectedProjectId ? (
                  <option value="">Please select a project first</option>
                ) : isReleaseLoading ? (
                  <option value="">Loading releases...</option>
                ) : releasesData.length === 0 ? (
                  <option value="">No active release available</option>
                ) : (
                  <>
                    <option value="">Select release (optional)</option>
                    {releasesData.map(release => (
                      <option key={release.id} value={release.id}>
                        {release.releaseName}
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                value={formData.priorityId}
                onChange={e => handleInputChange('priorityId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select priority</option>
                {priorities.map(p => (
                  <option key={p.id} value={p.id.toString()}>{p.priority}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assigned To
              </label>
              <select
                value={formData.assigntoId}
                onChange={e => handleInputChange('assigntoId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isAllocatedUsersLoading || !formData.moduleId}
                required
              >
                <option value="">
                  {isAllocatedUsersLoading ? "Loading users..." : allocatedUsers.length === 0 ? "No users available for this module" : "Select assignee"}
                </option>
                {allocatedUsers.map(user => (
                  <option key={user.userId} value={user.userId.toString()}>{user.userName}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={success}>
              {success ? "Added!" : "Submit"}
            </Button>
          </div>
        </form>
      </Modal>
      <AlertModal isOpen={alert.open} message={alert.message} onClose={closeAlert} />
    </div>
  );
};

export default QuickAddDefect;
