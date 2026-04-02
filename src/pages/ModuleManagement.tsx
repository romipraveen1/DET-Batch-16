import React, { useState, useEffect } from "react";
import { Toast } from "../components/ui/Toast";
import {
  PlusCircle,
  Edit2,
  Trash2,
  ChevronLeft,
  Users,
} from "lucide-react";
import { Card, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { useApp } from "../context/AppContext";
import { useParams, useNavigate } from "react-router-dom";
import { ProjectSelector } from "../components/ui/ProjectSelector";
import { createModule as createModuleApi } from "../api/module/createModule";
import { updateModule as updateModuleApi } from "../api/module/updateModule";
import { deleteModule as deleteModuleApi } from "../api/module/deleteModule";
import { deleteSubmodule as deleteSubmoduleApi } from "../api/module/deleteSubmodule";
import { updateSubmodule as updateSubmoduleApi } from "../api/module/updateSubmodule";
import { getModulesByProjectId, Modules as ApiModule } from "../api/module/getModule";
import { createSubmodule } from "../api/module/createModule";
// axios not used in this file
import { getDevelopersWithRolesByProjectId } from "../api/bench/projectAllocation";
import AlertModal from '../components/ui/AlertModal';
import { getDevelopersByModuleId } from "../api/module/getModuleDevelopers";
import { getBulkSuboduleAllocation } from "../api/submodule/getBulkSuboduleAllocation";
import { getUsersByAllocation, getUsersBySubmoduleAllocation, UserByAllocation } from "../api/module/getUsersByAllocation";
import { submoduleBulkAllocate } from "../api/module/submoduleBulkAllocate";
import {
  deallocateDeveloperFromModule,
  deallocateModuleLeaderWithAllocateModuleId,
  deallocateDeveloperFromSubmodule,
  deallocateSubmoduleDeveloperWithAllocateModuleId,
  reassignDeveloperWithAllocateModuleId,
  reassignSubmoduleDeveloperWithAllocateModuleId
} from "../api/module/deallocateDevelopers";
import { getDefectsByProjectId } from "../api/defect/filterDefectByProject";
import apiClient from "../lib/api";


type ModuleAssignment = {
  moduleId: string;
  submoduleId?: string;
  employeeIds: string[];
};

// state for checkbox visibility and selection behavior
export const ModuleManagement: React.FC = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const {
    projects,
    employees,
    setSelectedProjectId: setGlobalProjectId,
    selectedProjectId,
  } = useApp();

  const [isAddModuleModalOpen, setIsAddModuleModalOpen] = useState(false);
  const [isCreatingModule, setIsCreatingModule] = useState(false);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [isEditModuleModalOpen, setIsEditModuleModalOpen] = useState(false);
  const [isBulkAssignmentModalOpen, setIsBulkAssignmentModalOpen] =
    useState(false);
  const [selectedModuleForAssignment, setSelectedModuleForAssignment] =
    useState<any>(null);
  const [selectedSubmoduleForAssignment, setSelectedSubmoduleForAssignment] =
    useState<any>(null);
  const [editingModule, setEditingModule] = useState<any>(null);
  const [selectedItems, setSelectedItems] = useState<
    Array<{
      type: "module" | "submodule";
      moduleId: string;
      submoduleId?: string;
    }>
  >([]);
  const [modulesByProjectId, setModulesByProjectId] = useState<ApiModule[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [moduleForm, setModuleForm] = useState({
    name: ""
  });

  // Input refs for auto-focus when modals open
  const addModuleInputRef = React.useRef<HTMLInputElement>(null);
  const editModuleInputRef = React.useRef<HTMLInputElement>(null);
  const submoduleInputRef = React.useRef<HTMLInputElement>(null);

  const [assignmentForm, setAssignmentForm] = useState<ModuleAssignment>({
    moduleId: "",
    employeeIds: [],
  });

  const [isAddSubmoduleModalOpen, setIsAddSubmoduleModalOpen] = useState(false);
  const [submoduleForm, setSubmoduleForm] = useState({ name: "" });
  const [currentModuleIdForSubmodule, setCurrentModuleIdForSubmodule] = useState<string | null>(null);
  const [isEditingSubmodule, setIsEditingSubmodule] = useState(false);
  const [editingSubmoduleId, setEditingSubmoduleId] = useState<string | null>(null);
  const [isUpdatingModule, setIsUpdatingModule] = useState(false);
  const [isCreatingSubmodule, setIsCreatingSubmodule] = useState(false);
  const [isUpdatingSubmodule, setIsUpdatingSubmodule] = useState(false);

  // New state for developers with roles
  const [developersWithRoles, setDevelopersWithRoles] = useState<Array<{ userWithRole: string; projectAllocationId: number; userId: number }>>([]);

  // New state for selected developer in bulk assignment
  const [selectedDeveloperProjectAllocationId, setSelectedDeveloperProjectAllocationId] = useState<number | null>(null);

  // 1. Add state for selected developer for module allocation (single select)
  const [selectedModuleDeveloperProjectAllocationId, setSelectedModuleDeveloperProjectAllocationId] = useState<number | null>(null);

  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);

  // New state for developers assigned to modules/submodules
  const [moduleDevelopers, setModuleDevelopers] = useState<Record<string, any[]>>({});
  const [moduleDevelopersLoading, setModuleDevelopersLoading] = useState<Record<string, boolean>>({});
  const [moduleDevelopersError, setModuleDevelopersError] = useState<Record<string, string>>({});
  console.log(projectId, "projectId from params in module management page");

  // New state for submodule allocations
  const [submoduleAllocations, setSubmoduleAllocations] = useState<Record<string, { [submoduleId: string]: string[] }>>({});

  // State for module-specific allocated users (for deallocation)
  const [moduleAllocatedUsers, setModuleAllocatedUsers] = useState<UserByAllocation[]>([]);
  const [moduleAllocatedUsersLoading, setModuleAllocatedUsersLoading] = useState(false);
  const [moduleAllocatedUsersError, setModuleAllocatedUsersError] = useState<string | null>(null);

  useEffect(() => {
    if (projectId) {
      setGlobalProjectId(projectId);
    }
  }, [projectId, setGlobalProjectId]);



  // Fetch developers with roles when selectedProjectId changes
  const fetchDevelopersWithRoles = async () => {
    if (!selectedProjectId) return;
    try {
      const response = await getDevelopersWithRolesByProjectId(Number(selectedProjectId));
      console.log('Developers with roles response:', response);

      if (response && response.status === "success" && Array.isArray(response.data)) {
        // Map the response to include userId and create userWithRole format
        const mappedData = response.data.map((dev: any) => ({
          userWithRole: `${dev.userFullName}-${dev.role || 'Developer'}`,
          projectAllocationId: dev.projectAllocationId || dev.id,
          userId: dev.userId
        }));
        console.log('Mapped developers data:', mappedData);
        setDevelopersWithRoles(mappedData);
      } else {
        setDevelopersWithRoles([]);
      }
    } catch (error) {
      console.error('Error fetching developers with roles:', error);
      setDevelopersWithRoles([]);
    }
  };

  // Fetch module-specific allocated users for deallocation
  const fetchModuleAllocatedUsers = async (moduleId: string) => {
    if (!selectedProjectId || !moduleId) return;

    setModuleAllocatedUsersLoading(true);
    setModuleAllocatedUsersError(null);

    try {
      const users = await getUsersByAllocation(Number(selectedProjectId), Number(moduleId));
      console.log('Module allocated users response:', users);
      setModuleAllocatedUsers(users);
    } catch (error) {
      console.error('Error fetching module allocated users:', error);
      setModuleAllocatedUsersError('Failed to fetch allocated users for this module');
      setModuleAllocatedUsers([]);
    } finally {
      setModuleAllocatedUsersLoading(false);
    }
  };

  // Fetch common allocated users across all selected modules
  const fetchAllSelectedModulesAllocatedUsers = async () => {
    const moduleItems = selectedItems.filter(item => item.type === "module");

    if (!selectedProjectId || moduleItems.length === 0) {
      setModuleAllocatedUsers([]);
      setModuleAllocatedUsersError(null);
      setModuleAllocatedUsersLoading(false);
      return;
    }

    console.log('Fetching common allocated users for all selected modules:', moduleItems);

    setModuleAllocatedUsersLoading(true);
    setModuleAllocatedUsersError(null);

    try {
      const allModuleUsers: UserByAllocation[][] = [];
      const errors: string[] = [];

      // Fetch users for each selected module
      for (const item of moduleItems) {
        try {
          const users = await getUsersByAllocation(Number(selectedProjectId), Number(item.moduleId));
          allModuleUsers.push(users);
        } catch (error) {
          console.error(`Error fetching users for module ${item.moduleId}:`, error);
          errors.push(`Failed to load users for module ${item.moduleId}`);
          allModuleUsers.push([]); // Add empty array to maintain index alignment
        }
      }

      let commonUsers: UserByAllocation[] = [];

      if (allModuleUsers.length === 1) {
        // If only one module selected, show all its users
        commonUsers = allModuleUsers[0] || [];
      } else if (allModuleUsers.length > 1) {
        // Find common users across all modules (users present in ALL modules)
        const firstModuleUsers = allModuleUsers[0] || [];

        commonUsers = firstModuleUsers.filter(user => {
          // Check if this user exists in ALL other modules
          return allModuleUsers.slice(1).every(moduleUsers =>
            moduleUsers.some(otherUser => otherUser.userId === user.userId)
          );
        });
      }

      console.log('Users per module:', allModuleUsers.map(users => users.length));
      console.log('Common users found:', commonUsers.length);

      setModuleAllocatedUsers(commonUsers);

      if (errors.length > 0) {
        setModuleAllocatedUsersError(errors.join('; '));
      } else {
        setModuleAllocatedUsersError(null);
      }
    } catch (error) {
      console.error('Error fetching common allocated users for selected modules:', error);
      setModuleAllocatedUsers([]);
      setModuleAllocatedUsersError(
        error instanceof Error ? error.message : 'Failed to load allocated users for selected modules'
      );
    } finally {
      setModuleAllocatedUsersLoading(false);
    }
  };

  // Fetch module-specific allocated users for reassignment
  const fetchModuleAllocatedUsersForReassignment = async (moduleId: string) => {
    if (!selectedProjectId || !moduleId) {
      console.log('Missing parameters for fetchModuleAllocatedUsersForReassignment:', { selectedProjectId, moduleId });
      return;
    }

    console.log('Fetching module allocated users for reassignment:', { selectedProjectId, moduleId });

    setModuleAllocatedUsersForReassignmentLoading(true);
    setModuleAllocatedUsersForReassignmentError(null);

    try {
      const users = await getUsersByAllocation(Number(selectedProjectId), Number(moduleId));
      console.log('Module allocated users for reassignment response:', users);
      console.log('Number of users found:', users.length);
      setModuleAllocatedUsersForReassignment(users);
      setModuleAllocatedUsersForReassignmentError(null);
    } catch (error) {
      console.error('Error fetching module allocated users for reassignment:', error);
      console.error('Error details:', {
        selectedProjectId,
        moduleId,
        error: error instanceof Error ? error.message : error
      });
      setModuleAllocatedUsersForReassignment([]);
      setModuleAllocatedUsersForReassignmentError(
        error instanceof Error ? error.message : 'Failed to load allocated users for this module'
      );
    } finally {
      setModuleAllocatedUsersForReassignmentLoading(false);
    }
  };

  // Fetch submodule-specific allocated users for reassignment
  const fetchSubmoduleAllocatedUsersForReassignment = async (moduleId: string, submoduleId: string) => {
    if (!selectedProjectId || !moduleId || !submoduleId) {
      console.log('Missing parameters for fetchSubmoduleAllocatedUsersForReassignment:', { selectedProjectId, moduleId, submoduleId });
      return;
    }

    console.log('Fetching submodule allocated users for reassignment:', { selectedProjectId, moduleId, submoduleId });

    setSubmoduleAllocatedUsersForReassignmentLoading(true);
    setSubmoduleAllocatedUsersForReassignmentError(null);

    try {
      const users = await getUsersBySubmoduleAllocation(Number(selectedProjectId), Number(moduleId), Number(submoduleId));
      console.log('Submodule allocated users for reassignment response:', users);
      console.log('Number of users found:', users.length);
      setSubmoduleAllocatedUsersForReassignment(users);
      setSubmoduleAllocatedUsersForReassignmentError(null);
    } catch (error) {
      console.error('Error fetching submodule allocated users for reassignment:', error);
      console.error('Error details:', {
        selectedProjectId,
        moduleId,
        submoduleId,
        error: error instanceof Error ? error.message : error
      });
      setSubmoduleAllocatedUsersForReassignment([]);
      setSubmoduleAllocatedUsersForReassignmentError(
        error instanceof Error ? error.message : 'Failed to load allocated users for this submodule'
      );
    } finally {
      setSubmoduleAllocatedUsersForReassignmentLoading(false);
    }
  };

  // Fetch submodule-specific allocated users for deallocation
  const fetchSubmoduleAllocatedUsersForDeallocation = async (moduleId: string, submoduleId: string) => {
    if (!selectedProjectId || !moduleId || !submoduleId) {
      console.log('Missing parameters for fetchSubmoduleAllocatedUsersForDeallocation:', { selectedProjectId, moduleId, submoduleId });
      return;
    }

    console.log('Fetching submodule allocated users for deallocation:', { selectedProjectId, moduleId, submoduleId });

    setSubmoduleAllocatedUsersForDeallocationLoading(true);
    setSubmoduleAllocatedUsersForDeallocationError(null);

    try {
      const users = await getUsersBySubmoduleAllocation(Number(selectedProjectId), Number(moduleId), Number(submoduleId));
      console.log('Submodule allocated users for deallocation response:', users);
      console.log('Number of users found:', users.length);
      setSubmoduleAllocatedUsersForDeallocation(users);
      setSubmoduleAllocatedUsersForDeallocationError(null);
    } catch (error) {
      console.error('Error fetching submodule allocated users for deallocation:', error);
      console.error('Error details:', {
        selectedProjectId,
        moduleId,
        submoduleId,
        error: error instanceof Error ? error.message : error
      });
      setSubmoduleAllocatedUsersForDeallocation([]);
      setSubmoduleAllocatedUsersForDeallocationError(
        error instanceof Error ? error.message : 'Failed to load allocated users for this submodule'
      );
    } finally {
      setSubmoduleAllocatedUsersForDeallocationLoading(false);
    }
  };

  // Fetch common allocated users across all selected submodules
  const fetchAllSelectedSubmodulesAllocatedUsers = async () => {
    const submoduleItems = selectedItems.filter(item => item.type === "submodule");

    if (!selectedProjectId || submoduleItems.length === 0) {
      setSubmoduleAllocatedUsersForDeallocation([]);
      setSubmoduleAllocatedUsersForDeallocationError(null);
      setSubmoduleAllocatedUsersForDeallocationLoading(false);
      return;
    }

    console.log('Fetching common allocated users for all selected submodules:', submoduleItems);

    setSubmoduleAllocatedUsersForDeallocationLoading(true);
    setSubmoduleAllocatedUsersForDeallocationError(null);

    try {
      const allSubmoduleUsers: UserByAllocation[][] = [];
      const errors: string[] = [];

      // Fetch users for each selected submodule
      for (const item of submoduleItems) {
        if (item.submoduleId) {
          try {
            const users = await getUsersBySubmoduleAllocation(
              Number(selectedProjectId),
              Number(item.moduleId),
              Number(item.submoduleId)
            );
            allSubmoduleUsers.push(users);
          } catch (error) {
            console.error(`Error fetching users for submodule ${item.submoduleId}:`, error);
            errors.push(`Failed to load users for submodule ${item.submoduleId}`);
            allSubmoduleUsers.push([]); // Add empty array to maintain index alignment
          }
        }
      }

      let commonUsers: UserByAllocation[] = [];

      if (allSubmoduleUsers.length === 1) {
        // If only one submodule selected, show all its users
        commonUsers = allSubmoduleUsers[0] || [];
      } else if (allSubmoduleUsers.length > 1) {
        // Find common users across all submodules (users present in ALL submodules)
        const firstSubmoduleUsers = allSubmoduleUsers[0] || [];

        commonUsers = firstSubmoduleUsers.filter(user => {
          // Check if this user exists in ALL other submodules
          return allSubmoduleUsers.slice(1).every(submoduleUsers =>
            submoduleUsers.some(otherUser => otherUser.userId === user.userId)
          );
        });
      }

      console.log('Users per submodule:', allSubmoduleUsers.map(users => users.length));
      console.log('Common users found:', commonUsers.length);

      setSubmoduleAllocatedUsersForDeallocation(commonUsers);

      if (errors.length > 0) {
        setSubmoduleAllocatedUsersForDeallocationError(errors.join('; '));
      } else {
        setSubmoduleAllocatedUsersForDeallocationError(null);
      }
    } catch (error) {
      console.error('Error fetching common allocated users for selected submodules:', error);
      setSubmoduleAllocatedUsersForDeallocation([]);
      setSubmoduleAllocatedUsersForDeallocationError(
        error instanceof Error ? error.message : 'Failed to load allocated users for selected submodules'
      );
    } finally {
      setSubmoduleAllocatedUsersForDeallocationLoading(false);
    }
  };


  const handleAddModule = async () => {
    if (moduleForm.name.trim() && selectedProjectId) {

      const payload = {
        moduleName: moduleForm.name.trim(),
        projectId: Number(selectedProjectId),
      }

      setIsCreatingModule(true);

      try {
        // Call backend API to create module
        const response = await createModuleApi(payload);
        console.log('Create module response:', response);

        if (response.status === "success") {
          // Refresh modules after adding
          fetchModules();
          setToastMessage('Module created successfully!');
          setShowToast(true);
          setModuleForm({ name: "" });
          setIsAddModuleModalOpen(false);
          
          // Auto-close notification after 5 seconds
          setTimeout(() => {
            setShowToast(false);
            setToastMessage(null);
          }, 5000);
        } else {
          // Handle API error response using backend message via toast
          console.log('Module creation failed:', response);
          const errorMessage = response.message || 'Failed to create module';
          setToastMessage(errorMessage);
          setShowToast(true);
          setTimeout(() => {
            setShowToast(false);
            setToastMessage(null);
          }, 5000);
        }
      } catch (error: any) {
        console.error('Error creating module:', error);

        // Handle different types of errors
        let errorMessage = 'Failed to add module. Please try again.';

        if (error.response?.data?.message) {
          // Use the exact message from API response
          errorMessage = error.response.data.message;
        } else if (error.response?.data) {
          // API returned an error response
          const apiError = error.response.data;
          if (apiError.message) {
            errorMessage = apiError.message;
          } else if (apiError.status === 'failure') {
            errorMessage = 'Module creation failed. Please check if the module name already exists.';
          }
        } else if (error.message) {
          errorMessage = error.message;
        }

        setToastMessage(errorMessage);
        setShowToast(true);
        
        // Auto-close notification after 5 seconds
        setTimeout(() => {
          setShowToast(false);
          setToastMessage(null);
        }, 5000);
      } finally {
        setIsCreatingModule(false);
      }
    }
  };

  const handleModuleAssignment = (module: ApiModule, submodule?: any) => {
    setSelectedModuleForAssignment(module);
    setSelectedSubmoduleForAssignment(submodule || null);
    setAssignmentForm({
      moduleId: module.id.toString(),
      submoduleId: submodule?.id,
      employeeIds: submodule ? submodule.assignedDevs || [] : module.assignedDevs || [],
    });
    setIsAssignmentModalOpen(true);
  };

  // Assignment handler: update via context
  const handleSaveAssignment = () => {
    if (!selectedProjectId || !assignmentForm.moduleId) return;
    const module = modulesByProjectId?.find((m) => m.id.toString() === assignmentForm.moduleId);
    if (!module) return;

    // For now, just close the modal - you may want to implement actual assignment logic
    setIsAssignmentModalOpen(false);
  };

  const handleEditModule = (module: ApiModule) => {
    setEditingModule(module);
    setModuleForm({
      name: module.moduleName || '',
    });
    setIsEditModuleModalOpen(true);
  };

  const handleUpdateModule = async () => {
    if (moduleForm.name.trim() && editingModule && selectedProjectId) {
      setIsUpdatingModule(true);
      try {
        const response = await updateModuleApi(editingModule.id.toString(), {
          moduleName: moduleForm.name,
          projectId: Number(selectedProjectId),
        });
        if (response.success && response.module) {
          await fetchModules();
          setToastMessage('Module updated successfully!');
          setShowToast(true);
          setTimeout(() => {
            setModuleForm({ name: "" });
            setEditingModule(null);
            setIsEditModuleModalOpen(false);
          }, 200);

          // Auto-close notification after 5 seconds
          setTimeout(() => {
            setShowToast(false);
            setToastMessage(null);
          }, 5000);
        } else {
          // Fallback: refetch modules if update did not succeed
          await fetchModules();
          setToastMessage('Module updated successfully!');
          setShowToast(true);
          setTimeout(() => {
            setModuleForm({ name: "" });
            setEditingModule(null);
            setIsEditModuleModalOpen(false);
          }, 200);

          // Auto-close notification after 5 seconds
          setTimeout(() => {
            setShowToast(false);
            setToastMessage(null);
          }, 5000);
        }
      } catch (error: any) {
        console.error('Error updating module:', error);

        if (error.response?.data?.message) {
          // Use the exact message from API response
          setToastMessage(error.response.data.message);
          setShowToast(true);

          // Auto-close notification after 5 seconds
          setTimeout(() => {
            setShowToast(false);
            setToastMessage(null);
          }, 5000);
        } else {
          // Generic error
          setToastMessage('Failed to update module. Please try again.');
          setShowToast(true);

          // Auto-close notification after 5 seconds
          setTimeout(() => {
            setShowToast(false);
            setToastMessage(null);
          }, 5000);
        }
      } finally {
        setIsUpdatingModule(false);
      }
    }
  };

  // Save or update submodule (used by button click and Enter key)
  const handleSaveSubmodule = async () => {
    if (!submoduleForm.name.trim() || !currentModuleIdForSubmodule) return;
    if (isEditingSubmodule && editingSubmoduleId) {
      // Edit mode: update submodule name via API
      setIsUpdatingSubmodule(true);
      try {
        const response = await updateSubmoduleApi(Number(editingSubmoduleId), {
          subModuleName: submoduleForm.name
        });
        if (response.status === "success" || response.success) {
          await fetchModules();
          setIsAddSubmoduleModalOpen(false);
          setIsEditingSubmodule(false);
          setEditingSubmoduleId(null);
          setToastMessage(response.message || 'Submodule updated successfully!');
          setShowToast(true);
          setTimeout(() => {
            setShowToast(false);
            setToastMessage(null);
          }, 5000);
        } else {
          const serverMessage = response.message;
          setToastMessage(serverMessage || 'Failed to update submodule. Please try again.');
          setShowToast(true);
          setTimeout(() => {
            setShowToast(false);
            setToastMessage(null);
          }, 5000);
        }
      } catch (error: any) {
        const backendMessage = error.response?.data?.message || error.message;
        if (backendMessage) {
          setToastMessage(backendMessage);
        } else {
          setToastMessage('Failed to update submodule. Please try again.');
        }
        setShowToast(true);
        setTimeout(() => {
          setShowToast(false);
          setToastMessage(null);
        }, 5000);
      } finally {
        setIsUpdatingSubmodule(false);
      }
    } else {
      // Add mode
      setIsCreatingSubmodule(true);
      try {
        const response = await createSubmodule({
          subModuleName: submoduleForm.name,
          moduleId: Number(currentModuleIdForSubmodule),
        });
        if (response.status === "success") {
          await fetchModules();
          setIsAddSubmoduleModalOpen(false);
          setIsEditingSubmodule(false);
          setEditingSubmoduleId(null);
          setToastMessage('Submodule added successfully!');
          setShowToast(true);
          setTimeout(() => {
            setShowToast(false);
            setToastMessage(null);
          }, 5000);
        } else {
          const serverMessage = response.message;
          setToastMessage(serverMessage || 'Failed to add submodule. Please try again.');
          setShowToast(true);
          setTimeout(() => {
            setShowToast(false);
            setToastMessage(null);
          }, 5000);
        }
      } catch (error: any) {
        if (error.response?.data?.message) {
          setToastMessage(error.response.data.message);
          setShowToast(true);
          setTimeout(() => {
            setShowToast(false);
            setToastMessage(null);
          }, 5000);
        } else {
          setToastMessage('Failed to add submodule. Please try again.');
          setShowToast(true);
          setTimeout(() => {
            setShowToast(false);
            setToastMessage(null);
          }, 5000);
        }
      } finally {
        setIsCreatingSubmodule(false);
      }
    }
  };

  // Helper function to check if a module has allocated developers
  const hasModuleAllocatedDevelopers = (moduleId: string): boolean => {
    const directModuleDevs = (moduleDevelopers[moduleId] || []).filter((d) => d.subModuleId == null);
    return directModuleDevs.length > 0;
  };

  // Helper function to check if a submodule has allocated developers
  const hasSubmoduleAllocatedDevelopers = (moduleId: string, submoduleId: string): boolean => {
    const submoduleUsers = (submoduleAllocations[moduleId] && submoduleAllocations[moduleId][submoduleId]) || [];
    return submoduleUsers.length > 0;
  };

  // Helper function to check if a module has submodules (children)
  const hasModuleChildren = (moduleId: string): boolean => {
    const module = modulesByProjectId?.find((m) => m.id.toString() === moduleId);
    return !!(module?.submodules && Array.isArray(module.submodules) && module.submodules.length > 0);
  };

  // Helper function to check if a module is used in defects
  const checkModuleUsedInDefects = async (moduleId: string): Promise<boolean> => {
    if (!selectedProjectId) return false;
    try {
      const defects = await getDefectsByProjectId(selectedProjectId);
      const module = modulesByProjectId?.find((m) => m.id.toString() === moduleId);
      const moduleName = module?.moduleName;

      if (!moduleName) return false;

      // Check if any defect uses this module
      return defects.some(defect => defect.module_name === moduleName);
    } catch (error) {
      console.error('Error checking module usage in defects:', error);
      return false;
    }
  };

  // Helper function to check if a submodule is used in defects
  const checkSubmoduleUsedInDefects = async (moduleId: string, submoduleId: string): Promise<boolean> => {
    if (!selectedProjectId) return false;
    try {
      const defects = await getDefectsByProjectId(selectedProjectId);
      const module = modulesByProjectId?.find((m) => m.id.toString() === moduleId);
      const submodule = module?.submodules?.find((s: any) => s.id.toString() === submoduleId);
      const submoduleName = submodule?.getSubModuleName || submodule?.subModuleName || submodule?.name || submodule?.submoduleName || submodule?.subModule;

      if (!submoduleName) return false;

      // Check if any defect uses this submodule
      return defects.some(defect => defect.sub_module_name === submoduleName);
    } catch (error) {
      console.error('Error checking submodule usage in defects:', error);
      return false;
    }
  };

  // Modified delete module handler to check allocations, children, and defect usage first
  const handleDeleteModuleClick = async (moduleId: string) => {
    if (hasModuleAllocatedDevelopers(moduleId)) {
      // Show toast message directly if module has allocated developers
      setToastMessage('Cannot delete module: It has allocated developers. Please remove all allocations first.');
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
        setToastMessage(null);
      }, 5000);
    } else if (hasModuleChildren(moduleId)) {
      // Show toast message directly if module has submodules
      setToastMessage('Cannot delete module: It has submodules. Please delete all submodules first.');
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
        setToastMessage(null);
      }, 5000);
    } else {
      // Check if module is used in defects
      const isUsedInDefects = await checkModuleUsedInDefects(moduleId);
      if (isUsedInDefects) {
        setToastMessage('Cannot delete module: It is being used in defects. Please resolve or reassign all related defects first.');
        setShowToast(true);
        setTimeout(() => {
          setShowToast(false);
          setToastMessage(null);
        }, 5000);
      } else {
        // Show confirmation popup if no allocated developers, no children, and not used in defects
        setPendingDeleteModuleId(moduleId);
        setConfirmModuleOpen(true);
      }
    }
  };

  // Modified delete submodule handler to check allocations and defect usage first
  // Note: Submodules don't have children, so we only check for allocated developers and defect usage
  const handleDeleteSubmoduleClick = async (moduleId: string, submoduleId: string) => {
    if (hasSubmoduleAllocatedDevelopers(moduleId, submoduleId)) {
      // Show toast message directly if submodule has allocated developers
      setToastMessage('Cannot delete submodule: It has allocated developers. Please remove all allocations first.');
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
        setToastMessage(null);
      }, 5000);
    } else {
      // Check if submodule is used in defects
      const isUsedInDefects = await checkSubmoduleUsedInDefects(moduleId, submoduleId);
      if (isUsedInDefects) {
        setToastMessage('Cannot delete submodule: It is being used in defects. Please resolve or reassign all related defects first.');
        setShowToast(true);
        setTimeout(() => {
          setShowToast(false);
          setToastMessage(null);
        }, 5000);
      } else {
        // Show confirmation popup if no allocated developers and not used in defects
        setPendingDeleteSubmoduleId(submoduleId);
        setConfirmOpen(true);
      }
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (selectedProjectId) {
      try {
        const response = await deleteModuleApi(Number(moduleId));
        if (response.status === "success") {
          await fetchModules();
          setToastMessage('Module deleted successfully!');
          setShowToast(true);
          
          // Auto-close notification after 5 seconds
          setTimeout(() => {
            setShowToast(false);
            setToastMessage(null);
          }, 5000);
        } else {
          setToastMessage('Module deleted successfully!');
          setShowToast(true);
          await fetchModules();
          
          // Auto-close notification after 5 seconds
          setTimeout(() => {
            setShowToast(false);
            setToastMessage(null);
          }, 5000);
        }
      } catch (error: any) {
        if (error.response && error.response.data) {
          const errorData = error.response.data;
          if (errorData.message && errorData.message.includes('foreign key constraint fails')) {
            setToastMessage('Cannot delete module: It has allocated developers. Please remove all allocations first.');
            setShowToast(true);
          } else {
            setToastMessage('Failed to delete module. Please try again.');
            setShowToast(true);
          }
        } else {
          setToastMessage('Failed to delete module. Please try again.');
          setShowToast(true);
        }
        // Auto-close notification after 5 seconds
        setTimeout(() => {
          setShowToast(false);
          setToastMessage(null);
        }, 5000);
      }
    }
  };

  const handleBulkAssignment = () => {
    fetchDevelopersWithRoles();
    if (selectedItems.length > 0) {
      setAssignmentForm({
        moduleId: "",
        employeeIds: [],
      });
      setSelectedDeveloperProjectAllocationId(null); // Reset on open
      setSelectedModuleDeveloperProjectAllocationId(null); // Reset on open
      setSelectedDevelopersForDeallocation(null); // Reset deallocation selections
      setSelectedDevelopersForDeallocationBulk([]); // Reset bulk deallocation selections
      setSelectedModuleDevelopersForDeallocationBulk([]); // Reset module bulk deallocation selections
      setSelectedDevelopersForReassignment({ oldDeveloperId: null, newDeveloperId: null }); // Reset reassignment selections

      // Reset submodule reassignment data
      setSubmoduleAllocatedUsersForReassignment([]);
      setSubmoduleAllocatedUsersForReassignmentError(null);
      setSubmoduleAllocatedUsersForReassignmentLoading(false);

      // Reset submodule deallocation data
      setSubmoduleAllocatedUsersForDeallocation([]);
      setSubmoduleAllocatedUsersForDeallocationError(null);
      setSubmoduleAllocatedUsersForDeallocationLoading(false);
      
      // Don't pre-select developers - ensure buttons start disabled until user makes selections
      setSelectedDeveloperProjectAllocationIds([]);
      setSelectedModuleDeveloperProjectAllocationId(null);
      
      setIsBulkAssignmentModalOpen(true);
    }
  };

  // Enhanced developer management handlers
  const handleDeallocateDevelopers = async () => {
    const isModuleSelected = selectedItems.some(item => item.type === "module");
    const isSubmoduleSelected = selectedItems.some(item => item.type === "submodule");
    
    // For modules: bulk selection required
    if (isModuleSelected && selectedModuleDevelopersForDeallocationBulk.length === 0) {
      setToastMessage('Please select developers to deallocate from modules.');
      setShowToast(true);
      return;
    }
    
    // For submodules: bulk selection required
    if (isSubmoduleSelected && selectedDevelopersForDeallocationBulk.length === 0) {
      setToastMessage('Please select developers to deallocate from submodules.');
      setShowToast(true);
      return;
    }

    setIsDeallocating(true);
    try {
      let successCount = 0;
      let errorCount = 0;

      for (const item of selectedItems) {
        try {
          if (item.type === "module") {
            // For modules, we need to deallocate each selected developer from this specific module
            // We need to fetch the allocation data for this specific module to get the correct allocateModuleId
            try {
              const moduleUsers = await getUsersByAllocation(
                Number(selectedProjectId),
                Number(item.moduleId)
              );

              for (const developerId of selectedModuleDevelopersForDeallocationBulk) {
                try {
                  // Find the developer in this specific module's allocation data
                  const selectedUser = moduleUsers.find(
                    user => user.userId === developerId
                  );

                  if (selectedUser && selectedUser.allocateModuleId) {
                    console.log(`Deallocating developer ${developerId} from module ${item.moduleId} with allocateModuleId:`, selectedUser.allocateModuleId);
                    // Use the new API with allocateModuleId
                    await deallocateModuleLeaderWithAllocateModuleId(
                      selectedUser.allocateModuleId
                    );
                    successCount++;
                  } else {
                    console.error('Cannot deallocate module developer - allocateModuleId not found:', {
                      selectedUser,
                      developerId,
                      moduleId: item.moduleId,
                      moduleUsers,
                      hasAllocateModuleId: selectedUser?.allocateModuleId
                    });

                    // Fallback to legacy API if allocateModuleId is not available
                    await deallocateDeveloperFromModule(
                      Number(selectedProjectId),
                      Number(item.moduleId),
                      developerId
                    );
                    successCount++;
                  }
                } catch (error) {
                  console.error(`Module deallocation error for developer ${developerId} from module ${item.moduleId}:`, error);
                  errorCount++;
                }
              }
            } catch (error) {
              console.error(`Error fetching module allocation data for module ${item.moduleId}:`, error);
              // If we can't fetch the specific allocation data, try the legacy API for all selected developers
              for (const developerId of selectedModuleDevelopersForDeallocationBulk) {
                try {
                  await deallocateDeveloperFromModule(
                    Number(selectedProjectId),
                    Number(item.moduleId),
                    developerId
                  );
                  successCount++;
                } catch (legacyError) {
                  console.error(`Legacy module deallocation error for developer ${developerId} from module ${item.moduleId}:`, legacyError);
                  errorCount++;
                }
              }
            }
          } else if (item.type === "submodule" && item.submoduleId) {
            // For submodules, we need to deallocate each selected developer from this specific submodule
            // We need to fetch the allocation data for this specific submodule to get the correct allocationId
            try {
              const submoduleUsers = await getUsersBySubmoduleAllocation(
                Number(selectedProjectId),
                Number(item.moduleId),
                Number(item.submoduleId)
              );

              for (const developerId of selectedDevelopersForDeallocationBulk) {
                try {
                  // Find the developer in this specific submodule's allocation data
                  const selectedUser = submoduleUsers.find(
                    user => user.userId === developerId
                  );

                  if (selectedUser && selectedUser.allocationId) {
                    console.log(`Deallocating developer ${developerId} from submodule ${item.submoduleId} with allocationId:`, selectedUser.allocationId);
                    // Use the new API with allocationId (as allocateModuleId)
                    await deallocateSubmoduleDeveloperWithAllocateModuleId(
                      selectedUser.allocationId
                    );
                    successCount++;
                  } else {
                    console.error('Cannot deallocate submodule developer - allocationId not found:', {
                      selectedUser,
                      developerId,
                      submoduleId: item.submoduleId,
                      submoduleUsers,
                      hasAllocationId: selectedUser?.allocationId
                    });

                    // Fallback to legacy API if allocationId is not available
                    await deallocateDeveloperFromSubmodule(
                      Number(selectedProjectId),
                      Number(item.moduleId),
                      Number(item.submoduleId),
                      developerId
                    );
                    successCount++;
                  }
                } catch (error) {
                  console.error(`Submodule deallocation error for developer ${developerId} from submodule ${item.submoduleId}:`, error);
                  errorCount++;
                }
              }
            } catch (error) {
              console.error(`Error fetching submodule allocation data for submodule ${item.submoduleId}:`, error);
              // If we can't fetch the specific allocation data, try the legacy API for all selected developers
              for (const developerId of selectedDevelopersForDeallocationBulk) {
                try {
                  await deallocateDeveloperFromSubmodule(
                    Number(selectedProjectId),
                    Number(item.moduleId),
                    Number(item.submoduleId),
                    developerId
                  );
                  successCount++;
                } catch (legacyError) {
                  console.error(`Legacy submodule deallocation error for developer ${developerId} from submodule ${item.submoduleId}:`, legacyError);
                  errorCount++;
                }
              }
            }
          }
        } catch (error) {
          console.error('Deallocation error:', error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        setToastMessage(`Successfully deallocated ${successCount} developer(s).${errorCount > 0 ? ` ${errorCount} operation(s) failed.` : ''}`);
        setShowToast(true);
        await fetchModules();
        // Refresh developers list to show in allocate section
        await fetchDevelopersWithRoles();
        // Refresh allocated users data to show updated list (don't clear)
        if (selectedItems.length > 0) {
          const moduleItems = selectedItems.filter(item => item.type === "module");
          const submoduleItems = selectedItems.filter(item => item.type === "submodule");

          if (moduleItems.length > 0) {
            await fetchAllSelectedModulesAllocatedUsers();
          } else if (submoduleItems.length > 0) {
            await fetchAllSelectedSubmodulesAllocatedUsers();
          }
        }
        
        // Auto-close notification after 5 seconds
        setTimeout(() => {
          setShowToast(false);
          setToastMessage(null);
        }, 5000); // 5 seconds
        
        // Auto-close popup after 5 seconds for deallocation
        setTimeout(() => {
          setIsBulkAssignmentModalOpen(false);
          setSelectedItems([]);
          setSelectedDeveloperProjectAllocationId(null);
          setSelectedModuleDeveloperProjectAllocationId(null);
          setSelectedDeveloperProjectAllocationIds([]);
          setSelectedDevelopersForDeallocation(null);
          setSelectedDevelopersForDeallocationBulk([]);
          setSelectedModuleDevelopersForDeallocationBulk([]);
          setSelectedDevelopersForReassignment({ oldDeveloperId: null, newDeveloperId: null });
          setActiveSubmoduleSection(null);
          setActiveTab('allocate');
        }, 3000); // 3 seconds
      } else {
        setToastMessage('Failed to deallocate developers. Please try again.');
        setShowToast(true);
      }
    } catch (error) {
      setToastMessage('An error occurred during deallocation.');
      setShowToast(true);
    } finally {
      setIsDeallocating(false);
      // Clear deallocation selections after successful operation
      setSelectedDevelopersForDeallocation(null);
      setSelectedDevelopersForDeallocationBulk([]);
      setSelectedModuleDevelopersForDeallocationBulk([]);
      // Removed setIsBulkAssignmentModalOpen(false) to keep popup open
      // Removed setSelectedItems([]) to keep selections
    }
  };

  const handleReassignDevelopers = async () => {
    if (!selectedProjectId || 
        !selectedDevelopersForReassignment.oldDeveloperId || 
        !selectedDevelopersForReassignment.newDeveloperId) {
      setToastMessage('Please select both old and new developers for reassignment.');
      setShowToast(true);
      return;
    }

    setIsDeallocating(true);
    try {
      let successCount = 0;
      let errorCount = 0;

      for (const item of selectedItems) {
        try {
          if (item.type === "module") {
            // Find the selected old developer in moduleAllocatedUsersForReassignment to get allocateModuleId
            const selectedOldUser = moduleAllocatedUsersForReassignment.find(
              user => user.userId === selectedDevelopersForReassignment.oldDeveloperId
            );

            if (selectedOldUser && selectedOldUser.allocateModuleId) {
              // Use the new API with allocateModuleId and new userId
              await reassignDeveloperWithAllocateModuleId(
                selectedOldUser.allocateModuleId,
                selectedDevelopersForReassignment.newDeveloperId
              );
              successCount++;
            } else {
              console.error('allocateModuleId not found for selected old developer');
              errorCount++;
            }
          } else if (item.type === "submodule" && item.submoduleId) {
            // Find the selected old developer in submoduleAllocatedUsersForReassignment to get allocationId
            console.log('Processing submodule reassignment:', {
              submoduleId: item.submoduleId,
              oldDeveloperId: selectedDevelopersForReassignment.oldDeveloperId,
              newDeveloperId: selectedDevelopersForReassignment.newDeveloperId,
              availableUsers: submoduleAllocatedUsersForReassignment
            });

            const selectedOldUser = submoduleAllocatedUsersForReassignment.find(
              user => user.userId === selectedDevelopersForReassignment.oldDeveloperId
            );

            if (selectedOldUser && selectedOldUser.allocationId) {
              console.log('Found old user with allocationId:', selectedOldUser);
              // Use the new submodule-specific API with allocationId and new userId
              await reassignSubmoduleDeveloperWithAllocateModuleId(
                selectedOldUser.allocationId,
                selectedDevelopersForReassignment.newDeveloperId
              );
              successCount++;
            } else {
              console.error('Cannot reassign submodule developer - allocationId not found:', {
                selectedOldUser,
                oldDeveloperId: selectedDevelopersForReassignment.oldDeveloperId,
                submoduleAllocatedUsers: submoduleAllocatedUsersForReassignment,
                hasAllocationId: selectedOldUser?.allocationId
              });

              // Provide user feedback about the issue
              const errorMsg = !selectedOldUser
                ? 'Selected developer not found in submodule allocations'
                : 'Allocation ID missing for selected developer';
              console.error(`Submodule reassignment failed: ${errorMsg}`);
              errorCount++;
            }
          }
        } catch (error) {
          console.error('Reassignment error:', error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        setToastMessage(`Successfully reassigned ${successCount} developer(s).${errorCount > 0 ? ` ${errorCount} operation(s) failed.` : ''}`);
        setShowToast(true);

        // Refresh module-specific allocated users for reassignment
        const moduleItem = selectedItems.find(item => item.type === "module");
        if (moduleItem && moduleItem.moduleId) {
          fetchModuleAllocatedUsersForReassignment(moduleItem.moduleId);
        }

        // Refresh submodule-specific allocated users for reassignment
        const submoduleItem = selectedItems.find(item => item.type === "submodule");
        if (submoduleItem && submoduleItem.moduleId && submoduleItem.submoduleId) {
          fetchSubmoduleAllocatedUsersForReassignment(submoduleItem.moduleId, submoduleItem.submoduleId);
        }

        await fetchModules();
      } else {
        setToastMessage('Failed to reassign developers. Please try again.');
        setShowToast(true);
      }
    } catch (error) {
      setToastMessage('An error occurred during reassignment.');
      setShowToast(true);
    } finally {
      setIsDeallocating(false);
      setSelectedDevelopersForReassignment({ oldDeveloperId: null, newDeveloperId: null });
      setIsBulkAssignmentModalOpen(false);
      setSelectedItems([]);
    }
  };

  // Bulk assignment handler: assign developer to all selected modules/submodules
  const handleSaveBulkAssignment = async () => {
    setIsAllocating(true);
    
    try {
      if (onlyModulesSelected) {
      if (!selectedModuleDeveloperProjectAllocationId) {
        setToastMessage('Please select a developer for module allocation.');
        setShowToast(true);
        return;
      }
      let didAllocate = false;
      for (const item of selectedItems) {
        if (item.type === "module") {
          // Check if the module already has a leader allocated
          const directModuleDevs = (moduleDevelopers[item.moduleId] || []).filter((d) => d.subModuleId == null);
          if (directModuleDevs.length > 0) {
            const module = modulesByProjectId?.find((m) => m.id.toString() === item.moduleId);
            const moduleName = module?.moduleName || 'Unknown Module';
            setToastMessage(`Module leader already allocated for ${moduleName}`);
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
            return;
          }
          
          // Check if the specific developer is already assigned to the module
          const alreadyAssigned = directModuleDevs.some((d) => d.projectAllocationId === selectedModuleDeveloperProjectAllocationId);
          if (alreadyAssigned) {
            continue;
          }
          
          try {
            // Use the correct API for module allocation
            const selectedDeveloper = developersWithRoles.find(d => d.projectAllocationId === selectedModuleDeveloperProjectAllocationId);
            if (!selectedDeveloper) {
              setAlertMessage('Selected developer not found. Please try again.');
              setAlertOpen(true);
              return;
            }
            
            await apiClient.post(`${import.meta.env.VITE_BASE_URL}allocateModule/allocate-module-leader`, {
              projectId: Number(selectedProjectId),
              moduleId: Number(item.moduleId),
              userId: selectedDeveloper.userId
            }, {
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
              },
              withCredentials: false
            });
            didAllocate = true;
          } catch (error: any) {
            if (error.response?.data?.message) {
              setToastMessage(error.response.data.message);
            } else {
              setToastMessage('Failed to allocate module leader. Please try again.');
            }
            setShowToast(true);
            return;
          }
        }
      }
      if (didAllocate) {
        setToastMessage("Module leader allocated successfully!");
        setShowToast(true);
        // Refresh allocated users data to show in deallocate section
        if (selectedItems.length > 0) {
          const moduleItems = selectedItems.filter(item => item.type === "module");
          if (moduleItems.length > 0) {
            await fetchAllSelectedModulesAllocatedUsers();
          }
        }
        
        // Auto-close notification after 5 seconds
        setTimeout(() => {
          setShowToast(false);
          setToastMessage(null);
        }, 5000); // 5 seconds
        
        // Auto-close popup after 5 seconds for module allocation
        setTimeout(() => {
          setIsBulkAssignmentModalOpen(false);
          setSelectedItems([]);
          setSelectedDeveloperProjectAllocationId(null);
          setSelectedModuleDeveloperProjectAllocationId(null);
          setSelectedDeveloperProjectAllocationIds([]);
          setSelectedDevelopersForDeallocation(null);
          setSelectedDevelopersForDeallocationBulk([]);
          setSelectedModuleDevelopersForDeallocationBulk([]);
          setSelectedDevelopersForReassignment({ oldDeveloperId: null, newDeveloperId: null });
          setActiveSubmoduleSection(null);
          setActiveTab('allocate');
        }, 3000); // 3 seconds
      } else {
        setToastMessage('Already allocated.');
        setShowToast(true);
      }
      // Clear module allocation selections after successful operation
      setSelectedModuleDeveloperProjectAllocationId(null);
      // Keep popup open and selections for continued work
      fetchModules();
      return;
    }
    // Submodule allocation: allow multiple developers
    if (onlySubmodulesSelected) {
      if (!selectedDeveloperProjectAllocationIds || selectedDeveloperProjectAllocationIds.length === 0) {
        setToastMessage('Please select at least one developer for submodule allocation.');
        setShowToast(true);
        return;
      }
      
      let submoduleAllocationResults: { success: number; alreadyAllocated: string[] } = { success: 0, alreadyAllocated: [] };
      
      for (const item of selectedItems) {
        if (item.type === "submodule" && item.submoduleId) {
          // Check if the specific selected users are already allocated to this submodule
          const existingSubmoduleUsers = (submoduleAllocations[item.moduleId] && submoduleAllocations[item.moduleId][item.submoduleId]) || [];
          const module = modulesByProjectId?.find((m) => m.id.toString() === item.moduleId);
          const submodule = module?.submodules?.find((s) => s.id.toString() === item.submoduleId);
          const submoduleName = submodule?.getSubModuleName || submodule?.subModuleName || submodule?.name || submodule?.submoduleName || submodule?.subModule || 'Unknown Submodule';

          // Collect all already allocated user names for this submodule
          let alreadyAllocatedUserNames: string[] = [];
          let newUserIds: number[] = [];
          for (const userId of selectedDeveloperProjectAllocationIds) {
            const dev = developersWithRoles.find(d => d.projectAllocationId === userId);
            const selectedUserName = dev ? dev.userWithRole.split('-')[0].trim() : userId.toString();
            const isAlreadyAllocated = existingSubmoduleUsers.some(existingUser => existingUser === selectedUserName);
            if (isAlreadyAllocated) {
              alreadyAllocatedUserNames.push(selectedUserName);
            } else {
              newUserIds.push(userId);
            }
          }

          if (alreadyAllocatedUserNames.length === selectedDeveloperProjectAllocationIds.length) {
            setToastMessage(`Already allocated ${alreadyAllocatedUserNames.join(", ")} for ${submoduleName}`);
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
            // Do NOT close the modal or clear selections here
            continue; // Skip allocation for this submodule
          }

          if (newUserIds.length > 0) {
            try {
              // Convert projectAllocationIds to actual userIds
              const actualUserIds = newUserIds.map(projectAllocationId => {
                const dev = developersWithRoles.find(d => d.projectAllocationId === projectAllocationId);
                return dev ? dev.userId : null;
              }).filter(userId => userId !== null);
              
              console.log('Bulk allocation payload:', {
                projectId: Number(selectedProjectId),
                moduleId: Number(item.moduleId),
                subModuleId: Number(item.submoduleId),
                userIds: actualUserIds
              });
              
              if (actualUserIds.length > 0) {
                await submoduleBulkAllocate(Number(selectedProjectId), Number(item.moduleId), Number(item.submoduleId), actualUserIds);
                submoduleAllocationResults.success++;
              }
            } catch (error) {
              // handle error if needed
            }
          }
        }
      }
      // Show success message if any allocation was made
      if (submoduleAllocationResults.success > 0) {
        setToastMessage("Allocations successfully");
        setShowToast(true);
        // Refresh allocated users data to show in deallocate section
        if (selectedItems.length > 0) {
          const submoduleItems = selectedItems.filter(item => item.type === "submodule");
          if (submoduleItems.length > 0) {
            await fetchAllSelectedSubmodulesAllocatedUsers();
          }
        }
        
        // Auto-close notification after 5 seconds
        setTimeout(() => {
          setShowToast(false);
          setToastMessage(null);
        }, 5000); // 5 seconds
        
        // Clear submodule allocation selections after successful operation
        setSelectedDeveloperProjectAllocationIds([]);
        
        // Auto-close popup after 5 seconds for submodule allocation
        setTimeout(() => {
          setIsBulkAssignmentModalOpen(false);
          setSelectedItems([]);
          setSelectedDeveloperProjectAllocationId(null);
          setSelectedModuleDeveloperProjectAllocationId(null);
          setSelectedDeveloperProjectAllocationIds([]);
          setSelectedDevelopersForDeallocation(null);
          setSelectedDevelopersForDeallocationBulk([]);
          setSelectedModuleDevelopersForDeallocationBulk([]);
          setSelectedDevelopersForReassignment({ oldDeveloperId: null, newDeveloperId: null });
          setActiveSubmoduleSection(null);
          setActiveTab('allocate');
        }, 3000); // 3 seconds
      }
      fetchModules();
      return;
    }
  } finally {
    setIsAllocating(false);
  }
  };

  // Helper functions to determine selection mode
  const hasModuleSelection = () => {
    return selectedItems.some(item => item.type === "module");
  };

  const hasSubmoduleSelection = () => {
    return selectedItems.some(item => item.type === "submodule");
  };

  // Check if selected modules are already allocated
  const isModuleAlreadyAllocated = () => {
    if (!hasModuleSelection()) return false;
    
    return selectedItems.some(item => {
      if (item.type === "module") {
        // Check if the specific module has a module leader allocated
        const directModuleDevs = (moduleDevelopers[item.moduleId] || []).filter((d) => d.subModuleId == null);
        return directModuleDevs.length > 0;
      }
      return false;
    });
  };

  // Check if selected submodules are already allocated
  const isSubmoduleAlreadyAllocated = () => {
    // Submodules can have multiple developers allocated, so we don't disable allocation
    // even if they already have developers allocated
    return false;
  };

  // Check if there are any developers available for deallocation
  const hasAllocatedDevelopersForDeallocation = () => {
    if (selectedItems.some(item => item.type === "module")) {
      return moduleAllocatedUsers && moduleAllocatedUsers.length > 0;
    }
    if (selectedItems.some(item => item.type === "submodule")) {
      return submoduleAllocatedUsersForDeallocation && submoduleAllocatedUsersForDeallocation.length > 0;
    }
    return false;
  };

  const isItemDisabled = (
    type: "module" | "submodule",
    moduleId: string,
    submoduleId?: string
  ) => {
    // If no items are selected, nothing is disabled
    if (selectedItems.length === 0) return false;
    
    // If modules are selected, disable submodules
    if (hasModuleSelection() && type === "submodule") return true;
    
    // If submodules are selected, disable modules
    if (hasSubmoduleSelection() && type === "module") return true;
    
    return false;
  };

  const handleSelectItem = (
    type: "module" | "submodule",
    moduleId: string,
    checked: boolean,
    submoduleId?: string
  ) => {
    if (checked) {
      if (type === "module") {
        // When selecting a module, clear all submodule selections and only select modules
        setSelectedItems((prev) => [
          ...prev.filter((item) => item.type === "module"),
          { type: "module" as const, moduleId, submoduleId: undefined },
        ]);
      } else {
        // When selecting a submodule, clear all module selections and only select submodules
        setSelectedItems((prev) => [
          ...prev.filter((item) => item.type === "submodule"),
          { type, moduleId, submoduleId },
        ]);
      }
    } else {
      if (type === "module") {
        // When deselecting a module, remove only this module
        setSelectedItems((prev) =>
          prev.filter((item) => !(item.type === "module" && item.moduleId === moduleId))
        );
      } else {
        // When deselecting a submodule, remove only this submodule
        setSelectedItems((prev) =>
          prev.filter(
            (item) =>
              !(
                item.type === type &&
                item.moduleId === moduleId &&
                item.submoduleId === submoduleId
              )
          )
        );
      }
    }
  };

  const handleSelectAllModules = (checked: boolean) => {
    if (checked) {
      // Select all modules and all their submodules
      const allItems = (modulesByProjectId || []).flatMap((module) => [
        {
          type: "module" as const,
          moduleId: module.id.toString(),
          submoduleId: undefined,
        },
        ...(module.submodules || []).map((sub) => ({
          type: "submodule" as const,
          moduleId: module.id.toString(),
          submoduleId: sub.id.toString(),
        })),
      ]);
      setSelectedItems(allItems);
    } else {
      setSelectedItems([]);
    }
  };

  const isItemSelected = (
    type: "module" | "submodule",
    moduleId: string,
    submoduleId?: string
  ) => {
    return selectedItems.some(
      (item) =>
        item.type === type &&
        item.moduleId === moduleId &&
        item.submoduleId === submoduleId
    );
  };

  const isAllModulesSelected = () => {
    return (
      (modulesByProjectId || []).length > 0 &&
      (modulesByProjectId || []).every((module) =>
        selectedItems.some(
          (item) => item.type === "module" && item.moduleId === module.id.toString()
        )
      )
    );
  };





  // Project selection handler
  const handleProjectSelect = (id: string) => {
    setGlobalProjectId(id); // keep global context in sync
    // Reset modules state when project changes
    setModulesByProjectId(null);
    setSelectedItems([]);
  };

  // Defensive logging and type normalization for project lookup
  console.log("Selected Project ID:", selectedProjectId);


  const project = projects.find((p) => String(p.id) === String(selectedProjectId));


  const fetchModules = async () => {
    if (!selectedProjectId) return;
    setIsLoading(true);
    try {
      const response = await getModulesByProjectId(selectedProjectId);
      if (response.data) {
        setModulesByProjectId(response.data);
      } else {
        // Ensure we set an empty array if no data is returned
        setModulesByProjectId([]);
      }
    } catch (error) {
      console.error("Error fetching modules:", error);
      // Set empty array on error to show no modules state
      setModulesByProjectId([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchModules();
  }, [selectedProjectId]);

  useEffect(() => {
    if (modulesByProjectId && selectedProjectId) {
      modulesByProjectId.forEach(async (module) => {
        try {
          // Validate that we have valid IDs before making the API call
          const projectId = Number(selectedProjectId);
          const moduleId = Number(module.id);
          
          if (!projectId || !moduleId || isNaN(projectId) || isNaN(moduleId)) {
            console.warn('Skipping getDevelopersByModuleId due to invalid IDs:', {
              projectId,
              moduleId,
              selectedProjectId,
              moduleObjectId: module.id // renamed to avoid duplicate
            });
            setModuleDevelopers((prev) => ({ ...prev, [module.id]: [] }));
            setModuleDevelopersError((prev) => ({ ...prev, [module.id]: 'Invalid module ID' }));
            return;
          }
          
          // Set loading state
          setModuleDevelopersLoading((prev) => ({ ...prev, [module.id]: true }));
          setModuleDevelopersError((prev) => ({ ...prev, [module.id]: '' }));
          
          // Use selectedProjectId (or projectId) and module.id for the new API
          const devs = await getDevelopersByModuleId(projectId, moduleId);
          console.log('Module developers for module:', moduleId, devs);
          
          // Ensure devs is an array and has the expected structure
          let processedDevs = devs;
          if (Array.isArray(devs)) {
            processedDevs = devs.map((dev: any) => {
              // Ensure each developer object has the necessary fields
              return {
                ...dev,
                userName: dev.userName || dev.userFullName || dev.name || 
                        (dev.firstName && dev.lastName ? `${dev.firstName} ${dev.lastName}` : 'Unknown User'),
                subModuleId: dev.subModuleId || dev.submoduleId || dev.submodule_id || null
              };
            });
          } else {
            console.warn('Module developers response is not an array:', devs);
            processedDevs = [];
          }
          
          console.log('Processed module developers:', processedDevs);
          
          // If no data is returned, try to show a fallback message
          if (processedDevs.length === 0) {
            console.log('No module developers found for module:', moduleId);
          }
          
          setModuleDevelopers((prev) => ({ ...prev, [module.id]: processedDevs }));
          setModuleDevelopersLoading((prev) => ({ ...prev, [module.id]: false }));
                  } catch (e) {
            console.error('Error fetching developers for module:', module.id, e);
            setModuleDevelopers((prev) => ({ ...prev, [module.id]: [] }));
            setModuleDevelopersLoading((prev) => ({ ...prev, [module.id]: false }));
            setModuleDevelopersError((prev) => ({ ...prev, [module.id]: e instanceof Error ? e.message : 'Unknown error' }));
          }
      });
    }
  }, [modulesByProjectId, selectedProjectId]);

  // Add state for confirmation dialog
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteSubmoduleId, setPendingDeleteSubmoduleId] = useState<string | null>(null);

  // Add state for module confirmation dialog
  const [confirmModuleOpen, setConfirmModuleOpen] = useState(false);
  const [pendingDeleteModuleId, setPendingDeleteModuleId] = useState<string | null>(null);

  // 4. Add state for selectedDeveloperProjectAllocationIds (array)
  const [selectedDeveloperProjectAllocationIds, setSelectedDeveloperProjectAllocationIds] = useState<number[]>([]);

  // New state for enhanced developer management
  const [activeTab, setActiveTab] = useState<'allocate' | 'deallocate' | 'reassign'>('allocate');
  const [selectedDevelopersForDeallocation, setSelectedDevelopersForDeallocation] = useState<number | null>(null);
  const [selectedDevelopersForDeallocationBulk, setSelectedDevelopersForDeallocationBulk] = useState<number[]>([]);
  const [selectedModuleDevelopersForDeallocationBulk, setSelectedModuleDevelopersForDeallocationBulk] = useState<number[]>([]);
  const [selectedDevelopersForReassignment, setSelectedDevelopersForReassignment] = useState<{
    oldDeveloperId: number | null;
    newDeveloperId: number | null;
  }>({ oldDeveloperId: null, newDeveloperId: null });
  const [activeSubmoduleSection, setActiveSubmoduleSection] = useState<'allocate' | 'deallocate' | null>(null);
  const [isAllocating, setIsAllocating] = useState(false);
  const [isDeallocating, setIsDeallocating] = useState(false);

  // State for module-specific allocated users for reassignment
  const [moduleAllocatedUsersForReassignment, setModuleAllocatedUsersForReassignment] = useState<UserByAllocation[]>([]);
  const [moduleAllocatedUsersForReassignmentLoading, setModuleAllocatedUsersForReassignmentLoading] = useState(false);
  const [moduleAllocatedUsersForReassignmentError, setModuleAllocatedUsersForReassignmentError] = useState<string | null>(null);

  // State for submodule-specific allocated users for reassignment
  const [submoduleAllocatedUsersForReassignment, setSubmoduleAllocatedUsersForReassignment] = useState<UserByAllocation[]>([]);
  const [submoduleAllocatedUsersForReassignmentLoading, setSubmoduleAllocatedUsersForReassignmentLoading] = useState(false);
  const [submoduleAllocatedUsersForReassignmentError, setSubmoduleAllocatedUsersForReassignmentError] = useState<string | null>(null);

  // State for submodule-specific allocated users for deallocation
  const [submoduleAllocatedUsersForDeallocation, setSubmoduleAllocatedUsersForDeallocation] = useState<UserByAllocation[]>([]);
  const [submoduleAllocatedUsersForDeallocationLoading, setSubmoduleAllocatedUsersForDeallocationLoading] = useState(false);
  const [submoduleAllocatedUsersForDeallocationError, setSubmoduleAllocatedUsersForDeallocationError] = useState<string | null>(null);

  const onlyModulesSelected = selectedItems.length > 0 && selectedItems.every(item => item.type === "module");
  const onlySubmodulesSelected = selectedItems.length > 0 && selectedItems.every(item => item.type === "submodule");
  const mixedSelection = selectedItems.some(item => item.type === "module") && selectedItems.some(item => item.type === "submodule");

  // Fetch submodule allocations for all modules and submodules
  useEffect(() => {
    const fetchAllSubmoduleAllocations = async () => {
      if (!modulesByProjectId || !selectedProjectId) return;
      const allocations: Record<string, { [submoduleId: string]: string[] }> = {};
      for (const module of modulesByProjectId) {
        allocations[module.id] = {};
        if (Array.isArray(module.submodules)) {
          for (const sub of module.submodules) {
            try {
              // Validate that we have valid IDs before making the API call
              const projectId = Number(selectedProjectId);
              const moduleId = Number(module.id);
              const submoduleId = Number(sub.id);
              
              if (!projectId || !moduleId || !submoduleId || isNaN(projectId) || isNaN(moduleId) || isNaN(submoduleId)) {
                console.warn('Skipping getBulkSuboduleAllocation due to invalid IDs:', {
                  projectId,
                  moduleId,
                  submoduleId,
                  selectedProjectId,
                  moduleObjectId: module.id, // renamed
                  submoduleObjectId: sub.id  // renamed
                });
                allocations[module.id][sub.id] = [];
                continue;
              }
              
              const data = await getBulkSuboduleAllocation(projectId, moduleId, submoduleId);
              console.log('Submodule allocation data for:', { moduleId, submoduleId }, data);
              
              // Extract unique user names for this submodule
              let userNames: string[] = [];
              if (Array.isArray(data)) {
                userNames = [...new Set(data.map((d: any) => {
                  console.log('Processing user data:', d);
                  // Try multiple possible field names for user display
                  const userName = d.userName || d.userFullName || d.name || 
                                 (d.firstName && d.lastName ? `${d.firstName} ${d.lastName}` : null) ||
                                 d.employeeName || d.fullName || 'Unknown User';
                  console.log('Extracted userName:', userName);
                  return userName;
                }))];
              } else if (data && typeof data === 'object') {
                // Handle case where data might be an object with user information
                console.log('Data is object, checking for user fields:', data);
                const userName = data.userName || data.userFullName || data.name || 
                               (data.firstName && data.lastName ? `${data.firstName} ${data.lastName}` : null) ||
                               data.employeeName || data.fullName || 'Unknown User';
                if (userName !== 'Unknown User') {
                  userNames = [userName];
                }
              }
              console.log('Final extracted user names:', userNames);
              allocations[module.id][sub.id] = userNames;
            } catch (error) {
              console.error('Error fetching submodule allocations for:', { moduleId: module.id, submoduleId: sub.id }, error);
              allocations[module.id][sub.id] = [];
            }
          }
        }
      }
      setSubmoduleAllocations(allocations);
    };
    fetchAllSubmoduleAllocations();
  }, [modulesByProjectId, selectedProjectId]);

  // Removed automatic modal opening - now requires manual button click
  // useEffect(() => {
  //   if (selectedItems.length > 0 && !isBulkAssignmentModalOpen) {
  //     handleBulkAssignment();
  //     setActiveTab('allocate'); // Reset to allocate tab when modal opens
  //   }
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [selectedItems]);

  // Auto-refresh allocated users data when selected items change
  useEffect(() => {
    if (isBulkAssignmentModalOpen && selectedItems.length > 0) {
      const moduleItems = selectedItems.filter(item => item.type === "module");
      const submoduleItems = selectedItems.filter(item => item.type === "submodule");

      if (moduleItems.length > 0) {
        // For modules, fetch common data for all selected modules
        fetchAllSelectedModulesAllocatedUsers();
      } else if (submoduleItems.length > 0) {
        // For submodules, fetch common data for all selected submodules
        fetchAllSelectedSubmodulesAllocatedUsers();
      }
    }
  }, [selectedItems, isBulkAssignmentModalOpen]);

  // Debug: Monitor activeSubmoduleSection changes
  useEffect(() => {
    console.log('Active submodule section changed:', activeSubmoduleSection);
    console.log('Allocation selections:', selectedDeveloperProjectAllocationIds);
    console.log('Deallocation selections:', selectedDevelopersForDeallocationBulk);
  }, [activeSubmoduleSection, selectedDeveloperProjectAllocationIds, selectedDevelopersForDeallocationBulk]);

  // Reset active section when both sections are empty
  useEffect(() => {
    console.log('Checking if both sections are empty:', {
      allocationLength: selectedDeveloperProjectAllocationIds.length,
      deallocationLength: selectedDevelopersForDeallocationBulk.length,
      currentActiveSection: activeSubmoduleSection
    });
    
    if (selectedDevelopersForDeallocationBulk.length === 0 && selectedDeveloperProjectAllocationIds.length === 0) {
      console.log('Both sections empty, resetting activeSubmoduleSection to null');
      setActiveSubmoduleSection(null);
    }
  }, [selectedDevelopersForDeallocationBulk, selectedDeveloperProjectAllocationIds]);

  // Pre-select allocated developers when developersWithRoles is loaded and modal is open
  useEffect(() => {
    if (isBulkAssignmentModalOpen && developersWithRoles.length > 0 && activeTab === 'allocate') {
      if (onlySubmodulesSelected) {
        // Don't pre-select developers for submodule allocation in allocate tab
        // This ensures the "Allocate Developers" button starts disabled until user makes a selection
        setSelectedDeveloperProjectAllocationIds([]);
      } else if (onlyModulesSelected) {
        // Don't pre-select developers for module allocation in allocate tab
        // This ensures the "Allocate Developers" button starts disabled until user makes a selection
        setSelectedModuleDeveloperProjectAllocationId(null);
      }
    }
  }, [isBulkAssignmentModalOpen, developersWithRoles, activeTab, selectedItems, submoduleAllocations, moduleDevelopers, onlySubmodulesSelected, onlyModulesSelected]);

  // Prevent body scrolling when modal is open
  useEffect(() => {
    if (isAddModuleModalOpen) {
      // Focus add module input when modal opens
      setTimeout(() => addModuleInputRef.current?.focus(), 0);
    }
  }, [isAddModuleModalOpen]);

  useEffect(() => {
    if (isEditModuleModalOpen) {
      setTimeout(() => editModuleInputRef.current?.focus(), 0);
    }
  }, [isEditModuleModalOpen]);

  useEffect(() => {
    if (isAddSubmoduleModalOpen) {
      setTimeout(() => submoduleInputRef.current?.focus(), 0);
    }
  }, [isAddSubmoduleModalOpen]);

  useEffect(() => {
    if (isBulkAssignmentModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isBulkAssignmentModalOpen]);

  // Fetch common allocated users when modules are selected for deallocation
  useEffect(() => {
    const moduleItems = selectedItems.filter(item => item.type === "module");
    if (moduleItems.length > 0) {
      fetchAllSelectedModulesAllocatedUsers();
    } else {
      // Clear the data when no modules are selected
      setModuleAllocatedUsers([]);
      setModuleAllocatedUsersError(null);
    }
  }, [selectedItems, selectedProjectId]);

  // Fetch module-specific allocated users when a module is selected for reassignment
  useEffect(() => {
    const moduleItem = selectedItems.find(item => item.type === "module");
    if (activeTab === 'reassign' && moduleItem && moduleItem.moduleId) {
      fetchModuleAllocatedUsersForReassignment(moduleItem.moduleId);
    } else {
      // Clear the data when no module is selected or not in reassign tab
      setModuleAllocatedUsersForReassignment([]);
      setModuleAllocatedUsersForReassignmentError(null);
      setModuleAllocatedUsersForReassignmentLoading(false);
    }
  }, [activeTab, selectedItems, selectedProjectId]);

  // Fetch submodule-specific allocated users when a submodule is selected for reassignment
  useEffect(() => {
    const submoduleItem = selectedItems.find(item => item.type === "submodule");
    if (activeTab === 'reassign' && submoduleItem && submoduleItem.moduleId && submoduleItem.submoduleId) {
      fetchSubmoduleAllocatedUsersForReassignment(submoduleItem.moduleId, submoduleItem.submoduleId);
    } else {
      // Clear the data when no submodule is selected or not in reassign tab
      setSubmoduleAllocatedUsersForReassignment([]);
      setSubmoduleAllocatedUsersForReassignmentError(null);
      setSubmoduleAllocatedUsersForReassignmentLoading(false);
    }
  }, [activeTab, selectedItems, selectedProjectId]);

  // Fetch allocated users for all selected submodules when in deallocate tab
  useEffect(() => {
    const submoduleItems = selectedItems.filter(item => item.type === "submodule");
    if (activeTab === 'deallocate' && submoduleItems.length > 0) {
      fetchAllSelectedSubmodulesAllocatedUsers();
    } else {
      // Clear the data when no submodules are selected or not in deallocate tab
      setSubmoduleAllocatedUsersForDeallocation([]);
      setSubmoduleAllocatedUsersForDeallocationError(null);
      setSubmoduleAllocatedUsersForDeallocationLoading(false);
    }
  }, [activeTab, selectedItems, selectedProjectId]);

  // Alternative sticky solution using Intersection Observer
  useEffect(() => {
    if (!selectedProjectId) return;

    const buttonsElement = document.getElementById('action-buttons');
    const sentinelElement = document.getElementById('sticky-sentinel');
    
    if (!buttonsElement || !sentinelElement) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Sentinel is visible, buttons should be in normal position
          buttonsElement.style.position = 'relative';
          buttonsElement.style.top = 'auto';
          buttonsElement.style.left = 'auto';
          buttonsElement.style.right = 'auto';
          buttonsElement.style.zIndex = 'auto';
          buttonsElement.style.width = 'auto';
          buttonsElement.style.boxShadow = 'none';
          
          // Reset button colors to original when not sticky
          const buttons = buttonsElement.querySelectorAll('button');
          buttons.forEach((button) => {
            button.style.backgroundColor = '';
            button.style.color = '';
          });
        } else {
          // Sentinel is not visible, make buttons fixed
          buttonsElement.style.position = 'fixed';
          buttonsElement.style.top = '80px';
          buttonsElement.style.left = '320px'; // Align with module cards start position
          buttonsElement.style.right = '16px';
          buttonsElement.style.zIndex = '45';
          buttonsElement.style.width = 'auto';
          buttonsElement.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
          

        }
      },
      { 
        root: null, 
        threshold: 0,
        rootMargin: '-64px 0px 0px 0px' // Account for header height
      }
    );

    observer.observe(sentinelElement);

    return () => {
      observer.disconnect();
    };
  }, [selectedProjectId]);

  return (
    <div className="max-w-6xl mx-auto" style={{ overflow: isBulkAssignmentModalOpen ? 'hidden' : 'auto' }}>


      <AlertModal isOpen={alertOpen} message={alertMessage} onClose={() => setAlertOpen(false)} />
      {/* Custom Toast Message */}
      <Toast
        isOpen={!!showToast && !!toastMessage}
        message={toastMessage || ''}
        type={toastMessage && /(fail|cannot|error|unable|invalid|not allowed|already|exists|violate|constraint|duplicate|no changes found)/i.test(toastMessage) ? 'error' : 'success'}
        duration={5000}
        onClose={() => { setShowToast(false); setToastMessage(null); }}
      />
      {!selectedProjectId ? (
        <div className="p-8 text-center text-gray-500">
          Please select a project to manage modules.
        </div>
      ) : (
        <>
          {/* Project Selection Header */}
          <div className="flex-none p-6 pb-4">
            <div className="flex justify-between items-center mb-4">
              <div className="space-y-1">
                <h1 className="text-2xl font-bold text-gray-900">
                  Module Management
                </h1>
                <p className="text-sm text-gray-500">
                  {selectedProjectId && project
                    ? `Project: ${project.name || project.projectName}`
                    : "Select a project to begin"}
                </p>
              </div>
              {/* Back Button aligned with title */}
              <div className="flex-shrink-0">
                <Button
                  variant="secondary"
                  onClick={() => navigate(`/projects/${projectId}/project-management`)}
                  className="flex items-center"
                >
                  <ChevronLeft className="w-5 h-5 mr-2" /> Back
                </Button>
              </div>
            </div>
            {/* Project Selection Panel */}
            <ProjectSelector
              projects={projects.map((p) => ({ ...p, name: p.name || p.projectName }))}
              selectedProjectId={selectedProjectId}
              onSelect={handleProjectSelect}
            />
          </div>
          
          {/* Sticky Sentinel - invisible element to detect when to make buttons sticky */}
          <div id="sticky-sentinel" style={{ height: '1px' }}></div>
          
          {/* Action Buttons - will become sticky via JavaScript */}
          <div id="action-buttons" className="bg-white border-b border-gray-200 shadow-sm">
            <div className="max-w-6xl mx-auto px-6 py-4">
               <div className="flex justify-between items-center">
                 <div className="flex space-x-6">
                   <Button
                     onClick={() => setIsAddModuleModalOpen(true)}
                     className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
                   >
                     <PlusCircle className="w-4 h-4" />
                     <span>Add Module</span>
                   </Button>
                   {/* Management button that appears when items are selected */}
                   {selectedItems.length > 0 && (
                     <Button
                       onClick={() => {
                         handleBulkAssignment();
                         setActiveTab('allocate');
                       }}
                       className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
                     >
                       <Users className="w-4 h-4" />
                       <span>Manage Developers ({selectedItems.length} selected)</span>
                     </Button>
                   )}
                   {/* Removed Allocate and Test API buttons */}
                 </div>
                 {selectedItems.length > 0 && (
                   <Button
                     variant="secondary"
                     onClick={() => setSelectedItems([])}
                     className="text-sm"
                   >
                     Clear Selection
                   </Button>
                 )}
               </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="max-w-6xl mx-auto px-6 pb-6">
            {/* Loading State */}
            {isLoading && (
              <div className="text-center py-8">
                <div className="text-gray-500">Loading modules...</div>
              </div>
            )}

            {/* Modules Grid */}
            {!isLoading && (
              <>
                {console.log("Modules state:", modulesByProjectId, "Length:", modulesByProjectId?.length)}
                {(modulesByProjectId && Array.isArray(modulesByProjectId) && modulesByProjectId.length > 0) ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
                    {(modulesByProjectId || []).map((module) => {
                      // Module-level devs for display beside module name:
                      const moduleDevs = (moduleDevelopers[module.id] || []).filter((d) => {
                        // Filter for module-level developers (not assigned to specific submodules)
                        return !d.subModuleId && !d.submoduleId && !d.submodule_id;
                      });
                      console.log('Module developers for module', module.id, ':', moduleDevs);
                      return (
                        <Card key={module.id} className={`hover:shadow-lg transition-shadow flex flex-col h-full group ${isItemSelected("module", module.id.toString()) ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}>
                          <CardContent className="p-6 flex flex-col h-full">
                            <div className="flex justify-between items-start mb-4">
                              <div className="flex items-center space-x-3">
                                <input
                                  type="checkbox"
                                  checked={isItemSelected("module", module.id.toString())}
                                  onChange={(e) => handleSelectItem("module", module.id.toString(), e.target.checked)}
                                  disabled={isItemDisabled("module", module.id.toString())}
                                  className={`rounded border-gray-300 text-blue-600 focus:ring-blue-500 transition-opacity duration-200 ${
                                    isItemDisabled("module", module.id.toString()) 
                                      ? 'opacity-30 cursor-not-allowed' 
                                      : isItemSelected("module", module.id.toString())
                                        ? 'opacity-100 cursor-pointer'
                                        : 'opacity-0 group-hover:opacity-100 cursor-pointer'
                                  }`}
                                />

                                <div>
                                  <div className="flex items-center">
                                    <h3 className="text-lg font-semibold text-gray-900">
                                      {module.moduleName}
                                    </h3>
                                    {isItemSelected("module", module.id.toString()) && (
                                      <div className="ml-2 w-2 h-2 bg-blue-500 rounded-full"></div>
                                    )}
                                  </div>
                                  {/* Module allocated developers box */}
                                  {moduleDevelopersLoading[module.id] ? (
                                    <div className="mt-2 p-2 bg-gray-100 rounded-md border border-gray-200">
                                      <span className="text-xs text-gray-500">Loading...</span>
                                    </div>
                                  ) : moduleDevelopersError[module.id] ? (
                                    <div className="mt-2 p-2 bg-red-50 rounded-md border border-red-200">
                                      <span className="text-xs text-red-500">Error: {moduleDevelopersError[module.id]}</span>
                                    </div>
                                  ) : moduleDevs.length > 0 ? (
                                    <div className="mt-2">
                                      <div className="flex flex-wrap gap-2">
                                        {moduleDevs.map((d, index) => {
                                          // Handle different possible field names for user display
                                          const userName = d.userName || d.userFullName || d.name || 
                                                         (d.firstName && d.lastName ? `${d.firstName} ${d.lastName}` : 'Unknown User');
                                          return (
                                            <div key={index} className="px-3 py-1 bg-blue-100 rounded-md border border-blue-300 text-xs text-blue-700 font-medium flex items-center gap-1">
                                              <Users className="w-3 h-3" />
                                              {userName}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="mt-2 p-2 bg-gray-50 rounded-md border border-gray-200">
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-500 flex-1">No module leader assigned</span>
                                        <button
                                          type="button"
                                          className={`text-xs font-medium ml-2 whitespace-nowrap ${
                                            isItemDisabled("module", module.id.toString())
                                              ? 'text-gray-400 cursor-not-allowed'
                                              : 'text-blue-600 hover:text-blue-800'
                                          }`}
                                          onClick={() => {
                                            if (!isItemDisabled("module", module.id.toString())) {
                                              setSelectedItems([{ type: "module", moduleId: module.id.toString() }]);
                                              handleBulkAssignment();
                                              setActiveTab('allocate');
                                            }
                                          }}
                                          disabled={isItemDisabled("module", module.id.toString())}
                                        >
                                          Assign Leader
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex space-x-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleEditModule(module)}
                                  className="p-1"
                                  title="Edit Module"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteModuleClick(module.id.toString())}
                                  className="p-1 text-red-600 hover:text-red-800"
                                  title="Delete Module"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                            {/* Submodules List */}
                            <div className="flex-1">
                              <h4 className="text-sm font-medium text-gray-700 mb-2">Submodules</h4>
                              {Array.isArray(module.submodules) && module.submodules.length > 0 ? (
                                <ul className="list-inside space-y-1">
                                  {module.submodules.map((sub: any) => {
                                    const submoduleName = sub.getSubModuleName || sub.subModuleName || sub.name || sub.submoduleName || sub.subModule || 'Unknown';
                                    // Get user names for this submodule from submoduleAllocations
                                    const submoduleUserNames = (submoduleAllocations[module.id] && submoduleAllocations[module.id][sub.id]) || [];
                                    console.log('Submodule user names for', sub.id, ':', submoduleUserNames);
                                    return (
                                      <li key={sub.id} className={`text-gray-800 text-sm group ${isItemSelected("submodule", module.id.toString(), sub.id.toString()) ? 'bg-blue-50 rounded px-2 py-1' : ''}`}>
                                        <div className="flex items-center justify-between mb-2">
                                          <div className="flex items-center">
                                            <input
                                              type="checkbox"
                                              checked={isItemSelected("submodule", module.id.toString(), sub.id.toString())}
                                              onChange={(e) => handleSelectItem("submodule", module.id.toString(), e.target.checked, sub.id.toString())}
                                              disabled={isItemDisabled("submodule", module.id.toString(), sub.id.toString())}
                                              className={`rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2 transition-opacity duration-200 ${
                                                isItemDisabled("submodule", module.id.toString(), sub.id.toString()) 
                                                  ? 'opacity-30 cursor-not-allowed' 
                                                  : isItemSelected("submodule", module.id.toString(), sub.id.toString())
                                                    ? 'opacity-100 cursor-pointer'
                                                    : 'opacity-0 group-hover:opacity-100 cursor-pointer'
                                              }`}
                                            />

                                            <span className="font-medium">{submoduleName}</span>
                                            {isItemSelected("submodule", module.id.toString(), sub.id.toString()) && (
                                              <div className="ml-2 w-2 h-2 bg-blue-500 rounded-full"></div>
                                            )}
                                          </div>
                                          <span className="flex items-center space-x-2 opacity-80 group-hover:opacity-100">
                                            <button
                                              type="button"
                                              className="p-1 hover:text-blue-600"
                                              title="Edit Submodule"
                                              onClick={() => {
                                                setCurrentModuleIdForSubmodule(module.id.toString());
                                                setIsAddSubmoduleModalOpen(true);
                                                setSubmoduleForm({ name: submoduleName });
                                                setIsEditingSubmodule(true);
                                                setEditingSubmoduleId(sub.id.toString());
                                              }}
                                            >
                                              <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                              type="button"
                                              className="p-1 hover:text-red-600"
                                              title="Delete Submodule"
                                              onClick={() => handleDeleteSubmoduleClick(module.id.toString(), sub.id.toString())}
                                            >
                                              <Trash2 className="w-4 h-4" />
                                            </button>
                                          </span>
                                        </div>
                                        {/* Submodule allocated developers box */}
                                        {submoduleUserNames.length > 0 ? (
                                          <div className="ml-8 mt-2">
                                            <div className="flex flex-wrap gap-2">
                                              {submoduleUserNames.map((name, index) => {
                                                // Handle different possible field names for user display
                                                const userName = name || 'Unknown User';
                                                return (
                                                  <div key={index} className="px-3 py-1 bg-blue-100 rounded-md border border-blue-300 text-xs text-blue-700 font-medium flex items-center gap-1">
                                                    <Users className="w-3 h-3" />
                                                    {userName}
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="ml-8 p-2 bg-gray-50 rounded-md border border-gray-200">
                                            <div className="flex items-center justify-between">
                                              <span className="text-xs text-gray-500 flex-1">No developers assigned</span>
                                              <button
                                                type="button"
                                                className={`text-xs font-medium ml-2 whitespace-nowrap ${
                                                  isItemDisabled("submodule", module.id.toString(), sub.id.toString())
                                                    ? 'text-gray-400 cursor-not-allowed'
                                                    : 'text-blue-600 hover:text-blue-800'
                                                }`}
                                                onClick={() => {
                                                  if (!isItemDisabled("submodule", module.id.toString(), sub.id.toString())) {
                                                    setSelectedItems([{ type: "submodule", moduleId: module.id.toString(), submoduleId: sub.id.toString() }]);
                                                    handleBulkAssignment();
                                                    setActiveTab('allocate');
                                                  }
                                                }}
                                                disabled={isItemDisabled("submodule", module.id.toString(), sub.id.toString())}
                                              >
                                                Assign Developer
                                              </button>
                                            </div>
                                          </div>
                                        )}
                                      </li>
                                    );
                                  })}
                                </ul>
                              ) : (
                                <div className="italic text-gray-400 text-sm">No Submodules</div>
                              )}
                            </div>
                            <div className="flex justify-end mt-4">
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => {
                                  setCurrentModuleIdForSubmodule(module.id.toString());
                                  setIsAddSubmoduleModalOpen(true);
                                  setSubmoduleForm({ name: "" });
                                  setIsEditingSubmodule(false);
                                  setEditingSubmoduleId(null);
                                }}
                              >
                                <PlusCircle className="w-4 h-4 mr-1" /> Add Submodule
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Edit2 className="w-8 h-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No modules found
                      </h3>
                      <p className="text-gray-500 mb-4">
                        This project doesn't have any modules yet. Create your first module to get started.
                      </p>
                      <Button onClick={() => setIsAddModuleModalOpen(true)} icon={PlusCircle}>
                        Add Module
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* Add Module Modal */}
      <Modal
        isOpen={isAddModuleModalOpen}
        onClose={() => setIsAddModuleModalOpen(false)}
        title="Add New Module"
        size="xl"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Module Name
            </label>
            <Input
              ref={addModuleInputRef}
              value={moduleForm.name}
              onChange={(e) =>
                setModuleForm((prev) => ({ ...prev, name: e.target.value }))
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddModule();
                }
              }}
              placeholder="Enter module name"
              disabled={isCreatingModule}
            />
            {moduleForm.name.trim() && modulesByProjectId?.find(
              (module) => module.moduleName.toLowerCase() === moduleForm.name.trim().toLowerCase()
            ) && (
              <p className="text-sm text-red-600 mt-1">
                A module with this name already exists in the project.
              </p>
            )}
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => setIsAddModuleModalOpen(false)}
              disabled={isCreatingModule}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddModule}
              disabled={isCreatingModule || !moduleForm.name.trim()}
            >
              {isCreatingModule ? 'Creating...' : 'Add Module'}
            </Button>
          </div>
        </div>
      </Modal>



      {/* Edit Module Modal */}
      <Modal
        isOpen={isEditModuleModalOpen}
        onClose={() => {
          setIsEditModuleModalOpen(false);
          setEditingModule(null);
          setModuleForm({ name: "" });
        }}
        title="Edit Module"
        size="xl"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Module Name
            </label>
            <Input
              ref={editModuleInputRef}
              value={moduleForm.name}
              onChange={(e) =>
                setModuleForm((prev) => ({ ...prev, name: e.target.value }))
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter' && moduleForm.name.trim() && !isUpdatingModule) {
                  e.preventDefault();
                  handleUpdateModule();
                }
              }}
              placeholder="Enter module name"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsEditModuleModalOpen(false);
                setEditingModule(null);
                setModuleForm({ name: "" });
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateModule} disabled={isUpdatingModule || !moduleForm.name.trim()}>
              {isUpdatingModule ? 'Updating...' : 'Update Module'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Enhanced Developer Management Modal */}
      <Modal
        isOpen={isBulkAssignmentModalOpen}
        onClose={() => {
          setIsBulkAssignmentModalOpen(false);
          setSelectedItems([]);
          setSelectedDeveloperProjectAllocationId(null);
          setSelectedModuleDeveloperProjectAllocationId(null);
          setSelectedDeveloperProjectAllocationIds([]);
          setSelectedDevelopersForDeallocation(null);
          setSelectedDevelopersForDeallocationBulk([]);
          setSelectedModuleDevelopersForDeallocationBulk([]);
          setSelectedDevelopersForReassignment({ oldDeveloperId: null, newDeveloperId: null });
          setActiveSubmoduleSection(null);
          setActiveTab('allocate');
        }}
        title={`Developer Management`}
        size="full"
      >

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-h-[95vh] overflow-y-auto">
          {/* Selected Items Column */}
          <div className="lg:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Selected Modules and Submodules
            </label>
            <div className="max-h-[50vh] overflow-y-auto p-3 bg-gray-50 rounded text-sm mb-4">
              {/* Group selected items by module */}
              {(() => {
                const moduleMap: Record<string, { module: any, selected: boolean, submodules: Set<string> }> = {};
                selectedItems.forEach(item => {
                  if (!moduleMap[item.moduleId]) {
                    const module = modulesByProjectId?.find((m) => m.id.toString() === item.moduleId);
                    moduleMap[item.moduleId] = {
                      module,
                      selected: false,
                      submodules: new Set<string>(),
                    };
                  }
                  if (item.type === "module") {
                    moduleMap[item.moduleId].selected = true;
                  } else if (item.type === "submodule" && item.submoduleId) {
                    moduleMap[item.moduleId].submodules.add(item.submoduleId);
                  }
                });
                return Object.values(moduleMap).map(({ module, selected, submodules }, idx) => {
                  if (!module) return null;
                  const allSubmodules = module.submodules || [];
                  return (
                    <div key={module.id} className="mb-3 border border-gray-200 rounded-lg p-3 bg-white">
                      {/* Module Header with Selection Indicator */}
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-3 h-3 rounded-full flex-shrink-0 ${selected ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                        <div className="font-semibold text-gray-900 flex items-center gap-2">
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">MODULE</span>
                          {module.moduleName}
                        </div>
                        {selected && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium ml-auto">
                            SELECTED
                          </span>
                        )}
                      </div>

                      {/* Submodules List */}
                      {(selected || submodules.size > 0) && (
                        <div className="ml-5 border-l-2 border-gray-200 pl-3">
                          <div className="text-xs text-gray-600 mb-2 font-medium">Submodules:</div>
                          <ul className="space-y-1">
                            {selected
                              ? allSubmodules.map((sub: any) => {
                                const submoduleName = sub.getSubModuleName || sub.subModuleName || sub.name || sub.submoduleName || sub.subModule || 'Unknown';
                                return (
                                  <li key={sub.id} className="flex items-center gap-2 text-sm">
                                    <div className="w-2 h-2 rounded-full bg-blue-300 flex-shrink-0"></div>
                                    <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-medium">SUB</span>
                                    <span className="text-gray-700">{submoduleName}</span>
                                    <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-medium ml-auto">
                                      SELECTED
                                    </span>
                                  </li>
                                );
                              })
                              : Array.from(submodules).map(subId => {
                                const sub = allSubmodules.find((s: any) => s.id.toString() === subId);
                                if (!sub) return null;
                                const submoduleName = sub.getSubModuleName || sub.subModuleName || sub.name || sub.submoduleName || sub.subModule || 'Unknown';
                                return (
                                  <li key={sub.id} className="flex items-center gap-2 text-sm">
                                    <div className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0"></div>
                                    <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-medium">SUB</span>
                                    <span className="text-gray-700">{submoduleName}</span>
                                    <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-medium ml-auto">
                                      SELECTED
                                    </span>
                                  </li>
                                );
                              })}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
            
            {/* Action Summary */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800">
                <strong>Available Actions:</strong>
                <br />
                • <strong>Allocate:</strong> {
                  isModuleAlreadyAllocated() 
                    ? "Not available - already allocated" 
                    : `${selectedDeveloperProjectAllocationIds.length + (selectedModuleDeveloperProjectAllocationId ? 1 : 0)} developer(s) selected for allocation`
                }
                <br />
                • <strong>Deallocate:</strong> {
                  (selectedItems.some(item => item.type === "module") ? (selectedDevelopersForDeallocation ? 1 : 0) : 0) +
                  selectedDevelopersForDeallocationBulk.length
                } developer(s) selected for deallocation
              </p>
            </div>
          </div>

          {/* Allocate Section */}
          <div className="lg:col-span-1">

            {onlyModulesSelected && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Developer for Module Allocation</label>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {developersWithRoles.length > 0 ? (
                    developersWithRoles
                      .filter(dev => {
                        // Filter out developers who are already allocated to the selected modules
                        const [name] = dev.userWithRole.split("-");
                        const trimmedName = name.trim();
                        return !selectedItems.some(item => {
                          if (item.type === "module") {
                            const moduleAllocatedUserNames = moduleAllocatedUsers.map(user => {
                              const [allocatedName] = user.userWithRole.split("-");
                              return allocatedName.trim();
                            });
                            return moduleAllocatedUserNames.includes(trimmedName);
                          }
                          return false;
                        });
                      })
                      .map((dev, idx) => {
                        const [name, role] = dev.userWithRole.split("-");
                        return (
                          <div
                            key={idx}
                            className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                            onClick={() => setSelectedModuleDeveloperProjectAllocationId(dev.projectAllocationId)}
                          >
                            <input
                              type="radio"
                              name="module-assign-developer"
                              checked={selectedModuleDeveloperProjectAllocationId === dev.projectAllocationId}
                              onChange={() => setSelectedModuleDeveloperProjectAllocationId(dev.projectAllocationId)}
                              disabled={isModuleAlreadyAllocated()}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <div className="flex-1">
                              <div className="text-sm font-semibold text-gray-900">{name.trim()}</div>
                              {role && role.trim().toLowerCase() !== 'developer' && (
                                <div className="text-xs text-gray-500">{role.trim()}</div>
                              )}
                            </div>
                          </div>
                        );
                      })
                  ) : (
                    <div className="text-gray-400 text-sm">No developers found for this project.</div>
                  )}
                </div>
                {isModuleAlreadyAllocated() && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <div className="text-sm text-blue-800">
                      <strong>Module Already Allocated:</strong> The selected module(s) already have module leaders assigned. Use the deallocate option to remove existing assignments before allocating new ones.
                    </div>
                  </div>
                )}
              </div>
            )}
            {onlySubmodulesSelected && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Developers for Submodule Allocation</label>
                
                {/* Select All checkbox for allocation */}
                {(() => {
                  const availableDevelopers = developersWithRoles.filter(dev => {
                    const [name] = dev.userWithRole.split("-");
                    const trimmedName = name.trim();
                    return !selectedItems.some(item => {
                      if (item.type === "submodule" && item.submoduleId) {
                        const submoduleAllocatedUserNames = submoduleAllocatedUsersForDeallocation.map(user => {
                          const [allocatedName] = user.userWithRole.split("-");
                          return allocatedName.trim();
                        });
                        return submoduleAllocatedUserNames.includes(trimmedName);
                      }
                      return false;
                    });
                  });
                  
                  return availableDevelopers.length > 0 ? (
                    <div className="mb-3 p-2 bg-gray-50 rounded border">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedDeveloperProjectAllocationIds.length === availableDevelopers.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              // Select all available developers
                              setSelectedDeveloperProjectAllocationIds(availableDevelopers.map(dev => dev.projectAllocationId));
                              setActiveSubmoduleSection('allocate');
                              setSelectedDevelopersForDeallocationBulk([]);
                            } else {
                              // Deselect all
                              setSelectedDeveloperProjectAllocationIds([]);
                              setActiveSubmoduleSection(null);
                            }
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700">Select All Available Developers</span>
                      </label>
                    </div>
                  ) : null;
                })()}
                
                <div className={`max-h-60 overflow-y-auto space-y-2 ${
                  activeSubmoduleSection === 'deallocate' && selectedDevelopersForDeallocationBulk.length > 0 ? 'opacity-50 pointer-events-none' : ''
                }`}>
                  {developersWithRoles.length > 0 ? (
                    developersWithRoles
                      .filter(dev => {
                        // Filter out developers who are already allocated to the selected submodules
                        const [name] = dev.userWithRole.split("-");
                        const trimmedName = name.trim();
                        return !selectedItems.some(item => {
                          if (item.type === "submodule" && item.submoduleId) {
                            const submoduleAllocatedUserNames = submoduleAllocatedUsersForDeallocation.map(user => {
                              const [allocatedName] = user.userWithRole.split("-");
                              return allocatedName.trim();
                            });
                            return submoduleAllocatedUserNames.includes(trimmedName);
                          }
                          return false;
                        });
                      })
                      .map((dev, idx) => {
                        const [name, role] = dev.userWithRole.split("-");
                        return (
                          <div
                            key={idx}
                            className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                            onClick={() => {
                              const isCurrentlySelected = selectedDeveloperProjectAllocationIds.includes(dev.projectAllocationId);
                              const newSelection = isCurrentlySelected
                                ? selectedDeveloperProjectAllocationIds.filter((id) => id !== dev.projectAllocationId)
                                : [...selectedDeveloperProjectAllocationIds, dev.projectAllocationId];

                              setSelectedDeveloperProjectAllocationIds(newSelection);
                              if (newSelection.length > 0) {
                                setActiveSubmoduleSection('allocate');
                                setSelectedDevelopersForDeallocationBulk([]);
                              } else {
                                setActiveSubmoduleSection(null);
                                setSelectedDevelopersForDeallocationBulk([]);
                              }
                            }}
                          >
                            <input
                              type="checkbox"
                              name="submodule-assign-developer"
                              checked={selectedDeveloperProjectAllocationIds.includes(dev.projectAllocationId)}
                              onChange={() => {
                                const isCurrentlySelected = selectedDeveloperProjectAllocationIds.includes(dev.projectAllocationId);
                                const newSelection = isCurrentlySelected
                                  ? selectedDeveloperProjectAllocationIds.filter((id) => id !== dev.projectAllocationId)
                                  : [...selectedDeveloperProjectAllocationIds, dev.projectAllocationId];
                                
                                console.log('Allocation checkbox changed:', {
                                  devName: dev.userWithRole.split("-")[0],
                                  isCurrentlySelected,
                                  newSelection,
                                  newSelectionLength: newSelection.length,
                                  currentActiveSection: activeSubmoduleSection
                                });
                                
                                setSelectedDeveloperProjectAllocationIds(newSelection);
                                
                                // Auto-activate allocation section when user selects
                                if (newSelection.length > 0) {
                                  setActiveSubmoduleSection('allocate');
                                  setSelectedDevelopersForDeallocationBulk([]);
                                } else {
                                  // When all allocations are cleared, reset the active section
                                  setActiveSubmoduleSection(null);
                                  setSelectedDevelopersForDeallocationBulk([]);
                                }
                              }}
                              disabled={activeSubmoduleSection === 'deallocate' && selectedDevelopersForDeallocationBulk.length > 0}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                            />
                            <div className="flex-1">
                              <div className="text-sm font-semibold text-gray-900">{name.trim()}</div>
                              {role && role.trim().toLowerCase() !== 'developer' && (
                                <div className="text-xs text-gray-500">{role.trim()}</div>
                              )}
                            </div>
                          </div>
                        );
                      })
                  ) : (
                    <div className="text-gray-400 text-sm">No developers found for this project.</div>
                  )}
                </div>
              </div>
            )}
            {mixedSelection && (
              <div className="mb-4 text-red-600 font-medium">
                Please select either modules or submodules, not both, for allocation.
              </div>
            )}
          </div>

          {/* Deallocate Section */}
          <div className="lg:col-span-1">

            
            {/* Module Deallocation - Single Selection */}
            {selectedItems.some(item => item.type === "module") && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {selectedItems.filter(item => item.type === "module").length > 1
                    ? "Common Developers Across Selected Modules"
                    : "Allocated Developers for Selected Module"
                  }
                </label>

                {/* Select All checkbox for module deallocation */}
                {moduleAllocatedUsers.length > 0 ? (
                  <div className="mb-3 p-2 bg-gray-50 rounded border">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedModuleDevelopersForDeallocationBulk.length === moduleAllocatedUsers.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            // Select all allocated developers
                            setSelectedModuleDevelopersForDeallocationBulk(moduleAllocatedUsers.map(dev => dev.userId));
                          } else {
                            // Deselect all
                            setSelectedModuleDevelopersForDeallocationBulk([]);
                          }
                        }}
                        className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        {selectedItems.filter(item => item.type === "module").length > 1
                          ? "Select All Common Developers"
                          : "Select All Allocated Developers"
                        }
                      </span>
                    </label>
                  </div>
                ) : null}

                <div className="max-h-60 overflow-y-auto space-y-2">
                  {moduleAllocatedUsersLoading ? (
                    <div className="text-sm text-gray-500 p-2">Loading allocated users...</div>
                  ) : moduleAllocatedUsersError ? (
                    <div className="text-sm text-red-500 p-2">{moduleAllocatedUsersError}</div>
                  ) : moduleAllocatedUsers.length > 0 ? (
                    moduleAllocatedUsers.map((user, idx) => {
                      const [name, role] = user.userWithRole.split("-");
                      return (
                        <div key={idx} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded">
                          <input
                            type="checkbox"
                            name="deallocate-module-developer"
                            checked={selectedModuleDevelopersForDeallocationBulk.includes(user.userId)}
                            onChange={() => {
                              const isCurrentlySelected = selectedModuleDevelopersForDeallocationBulk.includes(user.userId);
                              const newSelection = isCurrentlySelected
                                ? selectedModuleDevelopersForDeallocationBulk.filter((id) => id !== user.userId)
                                : [...selectedModuleDevelopersForDeallocationBulk, user.userId];

                              setSelectedModuleDevelopersForDeallocationBulk(newSelection);
                            }}
                            className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                          />
                          <div className="flex-1">
                            <div className="text-sm font-semibold text-gray-900">{name.trim()}</div>
                            {role && role.trim().toLowerCase() !== 'developer' && (
                              <div className="text-xs text-gray-500">{role.trim()}</div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-gray-400 text-sm">
                      {selectedItems.filter(item => item.type === "module").length > 1
                        ? "No common developers found across selected modules."
                        : "No developers allocated to this module."
                      }
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Submodule Deallocation - Bulk Selection */}
            {selectedItems.some(item => item.type === "submodule") && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {selectedItems.filter(item => item.type === "submodule").length > 1
                    ? "Common Developers Across Selected Submodules"
                    : "Allocated Developers for Selected Submodule"
                  }
                </label>
                
                {/* Select All checkbox for deallocation */}
                {submoduleAllocatedUsersForDeallocation.length > 0 ? (
                  <div className="mb-3 p-2 bg-gray-50 rounded border">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedDevelopersForDeallocationBulk.length === submoduleAllocatedUsersForDeallocation.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            // Select all allocated developers
                            setSelectedDevelopersForDeallocationBulk(submoduleAllocatedUsersForDeallocation.map(dev => dev.userId));
                            setActiveSubmoduleSection('deallocate');
                            setSelectedDeveloperProjectAllocationIds([]);
                          } else {
                            // Deselect all
                            setSelectedDevelopersForDeallocationBulk([]);
                            setActiveSubmoduleSection(null);
                          }
                        }}
                        className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        {selectedItems.filter(item => item.type === "submodule").length > 1
                          ? "Select All Common Developers"
                          : "Select All Allocated Developers"
                        }
                      </span>
                    </label>
                  </div>
                ) : null}
                
                <div className={`max-h-60 overflow-y-auto space-y-2 ${
                  activeSubmoduleSection === 'allocate' && selectedDeveloperProjectAllocationIds.length > 0 ? 'opacity-50 pointer-events-none' : ''
                }`}>
                  {selectedItems.some(item => item.type === 'submodule') ? (
                    submoduleAllocatedUsersForDeallocationLoading ? (
                      <div className="text-sm text-gray-500 p-2">Loading allocated developers...</div>
                    ) : submoduleAllocatedUsersForDeallocationError ? (
                      <div className="text-sm text-red-500 p-2">
                        <div>Error loading developers: {submoduleAllocatedUsersForDeallocationError}</div>
                        <div className="text-xs mt-1">Check console for details.</div>
                      </div>
                    ) : submoduleAllocatedUsersForDeallocation.length > 0 ? (
                      submoduleAllocatedUsersForDeallocation.map((dev, idx) => {
                        const [name, role] = dev.userWithRole.split("-");
                        return (
                          <div key={idx} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded">
                            <input
                              type="checkbox"
                              name="deallocate-submodule-developer"
                              checked={selectedDevelopersForDeallocationBulk.includes(dev.userId)}
                              onChange={() => {
                                const isCurrentlySelected = selectedDevelopersForDeallocationBulk.includes(dev.userId);
                                const newSelection = isCurrentlySelected
                                  ? selectedDevelopersForDeallocationBulk.filter((id) => id !== dev.userId)
                                  : [...selectedDevelopersForDeallocationBulk, dev.userId];
                                
                                console.log('Deallocation checkbox changed:', {
                                  devName: dev.userWithRole.split("-")[0],
                                  isCurrentlySelected,
                                  newSelection,
                                  newSelectionLength: newSelection.length,
                                  currentActiveSection: activeSubmoduleSection
                                });
                                
                                setSelectedDevelopersForDeallocationBulk(newSelection);
                                
                                // Auto-activate deallocation section when user selects
                                if (newSelection.length > 0) {
                                  setActiveSubmoduleSection('deallocate');
                                  setSelectedDeveloperProjectAllocationIds([]);
                                } else {
                                  // When all deallocations are cleared, reset the active section
                                  setActiveSubmoduleSection(null);
                                  setSelectedDeveloperProjectAllocationIds([]);
                                }
                              }}
                              disabled={activeSubmoduleSection === 'allocate' && selectedDeveloperProjectAllocationIds.length > 0}
                              className="rounded border-gray-300 text-red-600 focus:ring-red-500 disabled:opacity-50"
                            />
                            <div className="flex-1">
                              <div className="text-sm font-semibold text-gray-900">{name.trim()}</div>
                              {role && role.trim().toLowerCase() !== 'developer' && (
                                <div className="text-xs text-gray-500">{role.trim()}</div>
                              )}
                              {/* Hide allocation id in UI per requirement */}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-gray-400 text-sm">
                        <div>
                          {selectedItems.filter(item => item.type === "submodule").length > 1
                            ? "No common developers found across selected submodules."
                            : "No developers allocated to selected submodule."
                          }
                        </div>
                        <div className="text-xs mt-1">
                          {selectedItems.filter(item => item.type === "submodule").length > 1
                            ? "The selected submodules don't share any common developers."
                            : "Selected submodule may not have any allocated developers."
                          }
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="text-gray-400 text-sm">Please select submodules to see allocated developers.</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button
            variant="secondary"
            onClick={() => {
              setIsBulkAssignmentModalOpen(false);
              setSelectedItems([]);
              setSelectedDeveloperProjectAllocationId(null);
              setSelectedModuleDeveloperProjectAllocationId(null);
              setSelectedDeveloperProjectAllocationIds([]);
              setSelectedDevelopersForDeallocation(null);
              setSelectedDevelopersForDeallocationBulk([]);
              setSelectedModuleDevelopersForDeallocationBulk([]);
              setSelectedDevelopersForReassignment({ oldDeveloperId: null, newDeveloperId: null });
              setActiveSubmoduleSection(null);
              setActiveTab('allocate');
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSaveBulkAssignment} 
            disabled={
              selectedItems.length === 0 ||
              mixedSelection || 
              isAllocating || 
              (onlyModulesSelected && isModuleAlreadyAllocated()) ||
              (onlyModulesSelected && !selectedModuleDeveloperProjectAllocationId) ||
              (onlySubmodulesSelected && selectedDeveloperProjectAllocationIds.length === 0)
            }
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isAllocating ? 'Processing...' : 'Allocate Developers'}
          </Button>
          <Button 
            onClick={handleDeallocateDevelopers} 
            disabled={
              selectedItems.length === 0 ||
              isDeallocating ||
              !hasAllocatedDevelopersForDeallocation() ||
              (selectedItems.some(item => item.type === "module") && selectedModuleDevelopersForDeallocationBulk.length === 0) ||
              (selectedItems.some(item => item.type === "submodule") && selectedDevelopersForDeallocationBulk.length === 0)
            }
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isDeallocating ? 'Processing...' : 'Deallocate Developers'}
          </Button>

        </div>
      </Modal>

      {/* Add Submodule Modal */}
      <Modal
        isOpen={isAddSubmoduleModalOpen}
        onClose={() => {
          setIsAddSubmoduleModalOpen(false);
          setIsEditingSubmodule(false);
          setEditingSubmoduleId(null);
        }}
        title="Add Submodule"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Submodule Name
            </label>
            <Input
              ref={submoduleInputRef}
              value={submoduleForm.name}
              onChange={(e) => setSubmoduleForm({ name: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSaveSubmodule();
                }
              }}
              placeholder="Enter submodule name"
              disabled={isCreatingSubmodule || isUpdatingSubmodule}
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => setIsAddSubmoduleModalOpen(false)}
              disabled={isCreatingSubmodule || isUpdatingSubmodule}
            >
              Cancel
            </Button>
            <Button
              disabled={!submoduleForm.name.trim() || isCreatingSubmodule || isUpdatingSubmodule}
              onClick={handleSaveSubmodule}
            >
              {isEditingSubmodule
                ? (isUpdatingSubmodule ? 'Updating...' : 'Update Submodule')
                : (isCreatingSubmodule ? 'Creating...' : 'Add Submodule')}
            </Button>
          </div>
        </div>
      </Modal >



      {/* Custom confirmation dialog for submodule deletion */}
      {confirmOpen && (
        <div className="fixed inset-0 z-[60] flex justify-center items-start bg-black bg-opacity-40">
          <div className="mt-8 bg-[#444] text-white rounded-lg shadow-2xl min-w-[400px] max-w-[95vw]" style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.25)' }}>
            <div className="px-6 pb-4 pt-5 text-base text-white">Are you sure you want to delete this submodule?</div>
            <div className="px-6 pb-5 flex justify-end gap-3">
              <button
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-6 py-2 rounded mr-2"
                onClick={() => { setConfirmOpen(false); setPendingDeleteSubmoduleId(null); }}
                type="button"
              >
                Cancel
              </button>
              <button
                className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-2 rounded"
                onClick={async () => {
                  if (pendingDeleteSubmoduleId) {
                    try {
                      const response = await deleteSubmoduleApi(Number(pendingDeleteSubmoduleId));
                      if (response.status === "success" || response.success) {
                        await fetchModules();
                        setToastMessage('Submodule deleted successfully!');
                        setShowToast(true);
                        
                        // Auto-close notification after 5 seconds
                        setTimeout(() => {
                          setShowToast(false);
                          setToastMessage(null);
                        }, 5000);
                      } else {
                        const serverMessage = (response.message || '').toLowerCase();
                        if (serverMessage.includes('foreign key') || serverMessage.includes('allocated')) {
                          setToastMessage('Cannot delete submodule: It has allocated developers. Please remove all allocations first.');
                        } else if (response.message) {
                          setToastMessage(response.message);
                        } else {
                          setToastMessage('Failed to delete submodule. Please try again.');
                        }
                        setShowToast(true);
                        // Auto-close notification after 5 seconds
                        setTimeout(() => {
                          setShowToast(false);
                          setToastMessage(null);
                        }, 5000);
                      }
                    } catch (error: any) {
                      if (error.response && error.response.data) {
                        const errorData = error.response.data;
                        if (errorData.message && errorData.message.includes('foreign key constraint fails')) {
                          setToastMessage('Cannot delete submodule: It has allocated developers. Please remove all allocations first.');
                          setShowToast(true);
                        } else {
                          setToastMessage('Failed to delete submodule. Please try again.');
                          setShowToast(true);
                        }
                      } else {
                        setToastMessage('Failed to delete submodule. Please try again.');
                        setShowToast(true);
                      }
                      // Auto-close notification after 5 seconds
                      setTimeout(() => {
                        setShowToast(false);
                        setToastMessage(null);
                      }, 5000);
                    } finally {
                      setConfirmOpen(false);
                      setPendingDeleteSubmoduleId(null);
                    }
                  }
                }}
                type="button"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom confirmation dialog for module deletion */}
      {confirmModuleOpen && (
        <div className="fixed inset-0 z-[60] flex justify-center items-start bg-black bg-opacity-40">
          <div className="mt-8 bg-[#444] text-white rounded-lg shadow-2xl min-w-[400px] max-w-[95vw]" style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.25)' }}>
            <div className="px-6 pb-4 pt-5 text-base text-white">Are you sure you want to delete this module? This will also delete all submodules.</div>
            <div className="px-6 pb-5 flex justify-end gap-3">
              <button
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-6 py-2 rounded mr-2"
                onClick={() => { setConfirmModuleOpen(false); setPendingDeleteModuleId(null); }}
                type="button"
              >
                Cancel
              </button>
              <button
                className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-2 rounded"
                onClick={async () => {
                  if (pendingDeleteModuleId) {
                    await handleDeleteModule(pendingDeleteModuleId);
                    setConfirmModuleOpen(false);
                    setPendingDeleteModuleId(null);
                  }
                }}
                type="button"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div >
  );
};
