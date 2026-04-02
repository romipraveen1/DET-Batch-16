import { Pie as ChartJSPie } from 'react-chartjs-2';
import React, { useEffect, useState, useCallback } from "react";
import { deleteDefectById } from '../api/defect/delete_defect';

import {
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  Eye,
  FileText,
  MessageSquareWarning,
  ChevronLeft,
  ChevronRight,
  History,
  MessageCircle,
  MessageSquare,
} from "lucide-react";
import { Card, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { ImagePicker } from "../components/ui/ImagePicker";
import { Modal } from "../components/ui/Modal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/Select";
import { MultiSelect } from "../components/ui/MultiSelect";
import { SearchableMultiSelect } from "../components/ui/SearchableMultiSelect";
import { useApp } from "../context/AppContext";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import * as XLSX from "xlsx";
import { importDefects } from "../api/importTestCase";
import { getAllPriorities, Priority } from "../api/priority";
import { getAllDefectStatuses, DefectStatus } from "../api/defectStatus";
import { getNextStatuses } from "../api/workflow";
import type { Defect as BaseDefect, DefectHistoryEntry } from "../types/index";
import { getDefectTypes } from "../api/defectType";
import { getSeverities } from "../api/severity";
import { ProjectSelector } from "../components/ui/ProjectSelector";
import { getAllProjects } from "../api/projectget";
import type { Project } from "../types";
import { FilteredDefect } from '../api/defect/filterDefectByProject';
import { getModulesByProjectId } from '../api/module/getModule';
import { getSubmodulesByModuleId } from '../api/submodule/submoduleget';
import { filterDefects, getDefectsByProjectId } from "../api/defect/filterDefectByProject";
import { getAllUsersSimple } from "../api/users/getallusers";

import { updateDefectById } from '../api/defect/updateDefect';
import { ProjectRelease, projectReleaseCardView } from "../api/releaseView/ProjectReleaseCardView";
import { addDefects } from "../api/defect/addNewDefect";
import { getDefectHistoryByDefectId, DefectHistoryEntry as RealDefectHistoryEntry } from '../api/defect/defectHistory';
import { getAllocatedUsersByModuleId, getUsersByAllocation } from '../api/module/getModule';
import AlertModal from '../components/ui/AlertModal';
import { getDefectSeveritySummary } from '../api/dashboard/dash_get';

import { getDevelopersWithRolesByProjectId } from "../api/bench/projectAllocation";
import { getActiveRelease } from "../api/releaseView/getActiveRelease";
import { useAuth } from '../context/AuthContext';
import { createComment } from '../api/comment/createComment';
import { getCommentsByDefectId } from '../api/comment/comment';
import apiClient from '../lib/api';


const BASE_URL = import.meta.env.VITE_BASE_URL;

// Define ConfirmModal inline (above the component)
const ConfirmModal = ({ isOpen, message, onCancel, onConfirm }: { isOpen: boolean; message: string; onCancel: () => void; onConfirm: () => void }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] flex justify-center items-start bg-black bg-opacity-40">
      <div className="mt-8 bg-[#444] text-white rounded-lg shadow-2xl min-w-[400px] max-w-[95vw]" style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.25)' }}>
        <div className="px-6 pb-4 pt-5 text-base text-white">{message}</div>
        <div className="px-6 pb-5 flex justify-end gap-3">
          <button
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-6 py-2 rounded mr-2"
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
          <button
            className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-2 rounded"
            onClick={onConfirm}
            type="button"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export const Defects: React.FC = () => {

  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    defects,
    releases,
    addDefect,
    updateDefect,
    deleteDefect,
    setSelectedProjectId: setGlobalProjectId,
    employees,
  } = useApp();


  // Backend projects state
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectIdLocal] = React.useState<string | null>(projectId || null);



  // Backend defects state
  const [backendDefects, setBackendDefects] = React.useState<FilteredDefect[]>([]);
  // Lookup maps for names
  const [statusMap, setStatusMap] = React.useState<Record<number, string>>({});
  const [severityMap, setSeverityMap] = React.useState<Record<number, string>>({});
  const [priorityMap, setPriorityMap] = React.useState<Record<number, string>>({});
  const [typeMap, setTypeMap] = React.useState<Record<number, string>>({});
  const [moduleMap, setModuleMap] = React.useState<Record<number, string>>({});
  const [submoduleMap, setSubmoduleMap] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    getAllProjects().then((data) => {
      setProjects(Array.isArray(data) ? data : []);
    });
  }, []);

  React.useEffect(() => {
    if (projectId) setSelectedProjectIdLocal(projectId);
  }, [projectId]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDefect, setEditingDefect] = useState<FilteredDefect | null>(null);
  const [releasesData, setReleasesData] = useState<ProjectRelease[]>([]);
  const [formData, setFormData] = useState({
    defectId: '',
    id: '', // real numeric id
    description: '',
    steps: '',
    moduleId: '',
    subModuleId: '',
    severityId: '',
    priorityId: '',
    typeId: '',
    assigntoId: '',
    assignbyId: '',
    releaseId: '',
    attachment: '',
    statusId: '',
    testCaseId: '',
    testCaseRequired: true, // Default to true (yes) for new defects
  });

  const [isViewStepsModalOpen, setIsViewStepsModalOpen] = useState(false);
  const [viewingSteps, setViewingSteps] = useState<string | null>(null);
  const [isViewDefectDetailsModalOpen, setIsViewDefectDetailsModalOpen] = useState(false);
  const [viewingDefectDetails, setViewingDefectDetails] = useState<any>(null);
  const [isRejectionCommentModalOpen, setIsRejectionCommentModalOpen] =
    useState(false);
  const [viewingRejectionComment, setViewingRejectionComment] = useState<
    string | null
  >(null);
  const [isImageViewerModalOpen, setIsImageViewerModalOpen] = useState(false);
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);

  // Filter state
  const [filters, setFilters] = useState({
    id: "",
    module: [] as string[],
    subModule: [] as string[],
    type: [] as string[],
    severity: [] as string[],
    priority: [] as string[],
    status: [] as string[],
    releaseId: [] as string[],
    assignedTo: [] as string[],
    reportedBy: [] as string[],
    search: "",
  });

  // Add debouncing for filter changes
  const [debouncedFilters, setDebouncedFilters] = useState(filters);
  const [isLoading, setIsLoading] = useState(false);
  
  // Debounce filter changes to prevent excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilters(filters);
    }, 300); // 300ms delay

    return () => clearTimeout(timer);
  }, [filters]);

  // Fetch static lookup data only once on mount
  React.useEffect(() => {
    getSeverities().then(res => setSeverityMap(Object.fromEntries((res.data || []).map((s: any) => [s.id, s.name]))));
    getAllPriorities().then(res => setPriorityMap(Object.fromEntries((res.data || []).map((p: any) => [p.id, p.priority]))));
    getDefectTypes().then(res => setTypeMap(Object.fromEntries((res.data || []).map((t: any) => [t.id, t.defectTypeName]))));
  }, []);

  // Fetch project-specific lookup data when selectedProjectId changes
  React.useEffect(() => {
    if (!selectedProjectId) return;
    getAllDefectStatuses().then((statuses) => {
      setStatusMap(Object.fromEntries((statuses.data || []).map((s: any) => [s.id, s.defectStatusName])));
    });
    getModulesByProjectId(selectedProjectId).then((modules) => {
      setModuleMap(Object.fromEntries((modules.data || []).map((m: any) => [m.id, m.moduleName])));
      // Fetch submodules for each module
      Promise.all((modules.data || []).map((m: any) => getSubmodulesByModuleId(m.id)))
        .then((submoduleResults) => {
          const subMap: Record<string, string> = {};
          submoduleResults.forEach((res) => {
            (res.data || []).forEach((sm: any) => {
              subMap[String(sm.id)] = sm.name;
            });
          });
          setSubmoduleMap(subMap);
        })
        .catch(() => setSubmoduleMap({}));
    });
  }, [selectedProjectId]);
  //vinu
// Fetch modules when project changes
React.useEffect(() => {
  if (!selectedProjectId) return;
  getModulesByProjectId(selectedProjectId)
    .then((res) => {
      setModules((res.data || []).map((m: any) => ({ id: m.id?.toString(), name: m.moduleName })));
    })
    .catch(error => {
      console.error('Failed to fetch modules:', error.message);
      setModules([]);
    });
}, [selectedProjectId]);
  // Fetch submodules when modules change


  // Helper to map backend defect fields to frontend expected fields
  const mapDefect = (d: any) => {
    // Debug: Log raw backend data to see what assignee fields are available
    if (d.assigned_to_name || d.assignedTo || d.assignTo || d.assignedToName) {
      console.log('=== RAW BACKEND DEFECT DATA ===');
      console.log('Raw defect object keys:', Object.keys(d));
      console.log('assigned_to_name:', d.assigned_to_name);
      console.log('assignedToName:', d.assignedToName);
      console.log('assignedTo:', d.assignedTo);
      console.log('assignTo:', d.assignTo);
      console.log('assigned_to_id:', d.assigned_to_id);
      console.log('assignedToId:', d.assignedToId);
      console.log('assignTo_id:', d.assignTo_id);
      console.log('assignToId:', d.assignToId);
      console.log('=== END RAW DATA ===');
    }

    // Helper function to safely get nested values
    const getNestedValue = (obj: any, paths: string[]): string => {
      for (const path of paths) {
        const keys = path.split('.');
        let value = obj;
        let isValid = true;

        for (const key of keys) {
          if (value && typeof value === 'object' && key in value) {
            value = value[key];
          } else {
            isValid = false;
            break;
          }
        }

        if (isValid && value !== null && value !== undefined) {
          return String(value);
        }
      }
      return '';
    };

    // Helper function to get user name from user object
    const getUserName = (userObj: any): string => {
      if (!userObj) return '';
      if (typeof userObj === 'string') return userObj;
      if (userObj.firstName && userObj.lastName) {
        return `${userObj.firstName} ${userObj.lastName}`;
      }
      if (userObj.name) return userObj.name;
      return '';
    };

    const mapped = {
      id: d.id,
      defectId: getNestedValue(d, ['defect_id', 'defectId']) || d.id?.toString() || '',
      description: d.description || '',
      reOpenCount: d.re_open_count ?? d.reOpenCount ?? 0,
      attachment: d.attachment ?? null,
      steps: d.steps ?? '',
      project_name: getNestedValue(d, [
        'project_name', 'projectName', 'project.name', 'project.projectName'
      ]),
      severity_name: getNestedValue(d, [
        'severity_name', 'severityName', 'severity.name', 'severity.severityName'
      ]),
      priority_name: getNestedValue(d, [
        'priority_name', 'priorityName', 'priority.priority', 'priority.name', 'priority.priorityName'
      ]),
      priority: getNestedValue(d, [
        'priority', 'priority_name', 'priorityName', 'priority.priority'
      ]),
      defect_status_name: getNestedValue(d, [
        'status_name', 'statusName', 'defectStatus.defectStatusName', 'status.name', 'defectStatusName'
      ]),
      release_test_case_description: getNestedValue(d, [
        'release_test_case_description', 'releaseTestCaseDescription'
      ]),
      release_name: getNestedValue(d, [
        'release_name', 'releaseName', 'release.releaseName', 'release.name'
      ]),
      assigned_by_name: getNestedValue(d, [
        'assigned_by_name', 'assignedByName'
      ]) || getUserName(d.assignedBy) || getUserName(d.assignBy),
      assigned_to_name: getNestedValue(d, [
        'assigned_to_name', 'assignedToName'
      ]) || getUserName(d.assignedTo) || getUserName(d.assignTo),
      assigned_by_id: getNestedValue(d, [
        'assigned_by_id', 'assignedById', 'assignedBy', 'assignBy'
      ]) ? Number(getNestedValue(d, [
        'assigned_by_id', 'assignedById', 'assignedBy', 'assignBy'
      ])) : undefined,
      assigned_to_id: getNestedValue(d, [
        'assigned_to_id', 'assignedToId', 'assignedTo', 'assignTo', 'assignTo_id', 'assignToId'
      ]) ? Number(getNestedValue(d, [
        'assigned_to_id', 'assignedToId', 'assignedTo', 'assignTo', 'assignTo_id', 'assignToId'
      ])) : undefined,
      defect_type_name: getNestedValue(d, [
        'type_name', 'typeName', 'defectType.defectTypeName', 'type.name', 'defectTypeName'
      ]),
      module_name: getNestedValue(d, [
        'module_name', 'moduleName', 'module.moduleName', 'module.name'
      ]),
      sub_module_name: getNestedValue(d, [
        'sub_module_name', 'subModuleName', 'subModule.name', 'subModule.subModuleName'
      ]),
    };

    return mapped;
  };

  // Fetch defects when project changes or filters change
  const fetchData = () => {
    if (!selectedProjectId) return;

    // Check if any filters are applied
    const hasFilters =
      (debouncedFilters.type && debouncedFilters.type.length > 0) ||
      (debouncedFilters.severity && debouncedFilters.severity.length > 0) ||
      (debouncedFilters.priority && debouncedFilters.priority.length > 0) ||
      (debouncedFilters.status && debouncedFilters.status.length > 0) ||
      (debouncedFilters.releaseId && debouncedFilters.releaseId.length > 0) ||
      (debouncedFilters.module && debouncedFilters.module.length > 0) ||
      (debouncedFilters.subModule && debouncedFilters.subModule.length > 0) ||
      (debouncedFilters.assignedTo && debouncedFilters.assignedTo.length > 0) ||
      (debouncedFilters.reportedBy && debouncedFilters.reportedBy.length > 0);

    setIsLoading(true);

    if (!hasFilters) {
      // No filters applied - use the project-specific API
      getDefectsByProjectId(selectedProjectId)
        .then((data) => {
          setBackendDefects(data.map(mapDefect));
        })
        .catch((err) => {
          setBackendDefects([]);
          console.error('Failed to fetch defects by project:', err.message);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      // Filters are applied - use the filter API with new array-based parameter mapping
      const filterParams: any = { projectId: selectedProjectId };

      // Handle type filters - now supports multiple selections
      if (debouncedFilters.type && debouncedFilters.type.length > 0) {
        const typeIds = debouncedFilters.type
          .map(typeName => defectTypes?.find(t =>
            t.defectTypeName.toLowerCase() === typeName.toLowerCase()
          )?.id)
          .filter(id => id !== undefined) as number[];
        if (typeIds.length > 0) {
          filterParams.typeIds = typeIds;
        }
      }

      // Handle severity filters - now supports multiple selections
      if (debouncedFilters.severity && debouncedFilters.severity.length > 0) {
        const severityIds = debouncedFilters.severity
          .map(severityName => severities?.find(s =>
            s.name.toLowerCase() === severityName.toLowerCase()
          )?.id)
          .filter(id => id !== undefined) as number[];
        if (severityIds.length > 0) {
          filterParams.severityIds = severityIds;
        }
      }

      // Handle priority filters - now supports multiple selections
      if (debouncedFilters.priority && debouncedFilters.priority.length > 0) {
        const priorityIds = debouncedFilters.priority
          .map(priorityName => priorities?.find(p =>
            p.priority.toLowerCase() === priorityName.toLowerCase()
          )?.id)
          .filter(id => id !== undefined) as number[];
        if (priorityIds.length > 0) {
          filterParams.priorityIds = priorityIds;
        }
      }

      // Handle status filters - now supports multiple selections
      if (debouncedFilters.status && debouncedFilters.status.length > 0) {
        const statusIds = debouncedFilters.status
          .map(statusName => defectStatuses?.find(s =>
            s.defectStatusName.toLowerCase() === statusName.toLowerCase()
          )?.id)
          .filter(id => id !== undefined) as number[];
        if (statusIds.length > 0) {
          filterParams.statusIds = statusIds;
        }
      }

      // Handle release filters - now supports multiple selections
      if (debouncedFilters.releaseId && debouncedFilters.releaseId.length > 0) {
        const releaseIds = debouncedFilters.releaseId
          .map(id => parseInt(id))
          .filter(id => !isNaN(id));
        if (releaseIds.length > 0) {
          filterParams.releaseIds = releaseIds;
        }
      }

      // Handle module filters - now supports multiple selections
      if (debouncedFilters.module && debouncedFilters.module.length > 0) {
        const moduleIds = debouncedFilters.module
          .map(moduleName => modules?.find(m =>
            m.name.toLowerCase() === moduleName.toLowerCase()
          )?.id)
          .filter(id => id !== undefined)
          .map(id => parseInt(id as string))
          .filter(id => !isNaN(id));
        if (moduleIds.length > 0) {
          filterParams.moduleIds = moduleIds;
        }
      }

      // Handle submodule filters - now supports multiple selections
      if (debouncedFilters.subModule && debouncedFilters.subModule.length > 0) {
        const subModuleIds = debouncedFilters.subModule
          .map(subModuleName => filterSubmodules?.find(sm =>
            sm.name.toLowerCase() === subModuleName.toLowerCase()
          )?.id)
          .filter(id => id !== undefined)
          .map(id => parseInt(id as string))
          .filter(id => !isNaN(id));
        if (subModuleIds.length > 0) {
          filterParams.subModuleIds = subModuleIds;
        }
      }

      // Handle assignedTo filters - now supports multiple selections
      if (debouncedFilters.assignedTo && debouncedFilters.assignedTo.length > 0) {
        const assignToIds = debouncedFilters.assignedTo
          .map(id => parseInt(id))
          .filter(id => !isNaN(id));
        if (assignToIds.length > 0) {
          filterParams.assignToIds = assignToIds;
        }
      }

      // Handle reportedBy filter - now supports multiple selections
      if (debouncedFilters.reportedBy && debouncedFilters.reportedBy.length > 0) {
        const userIds = debouncedFilters.reportedBy
          .map(userName => userList?.find(u => `${u.firstName} ${u.lastName}` === userName)?.id)
          .filter(id => id !== undefined) as number[];
        if (userIds.length > 0) {
          filterParams.assignByIds = userIds;
        }
      }

      // Use the filter API
      filterDefects(filterParams)
        .then((data) => {
          setBackendDefects(data.map(mapDefect));
        })
        .catch((err) => {
          setBackendDefects([]);
          console.error('Failed to fetch defects with filters:', err.message);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }

  React.useEffect(() => {
    if (!selectedProjectId) return;
    fetchData();
  }, [selectedProjectId, debouncedFilters.type, debouncedFilters.severity, debouncedFilters.priority, debouncedFilters.status, debouncedFilters.module, debouncedFilters.subModule, debouncedFilters.releaseId, debouncedFilters.assignedTo, debouncedFilters.reportedBy]);

  // Filtered defects - now only handles client-side search since API handles other filters
  const filteredDefects = backendDefects.filter((d) => {
    try {
      // Only handle search filtering client-side since API now handles all other filters
      const search = filters.search.trim().toLowerCase();
      const matchesSearch =
        !search ||
        (d.description && d.description.toLowerCase().includes(search)) ||
        (d.defectId && d.defectId.toLowerCase().includes(search)) ||
        (d.steps && d.steps.toLowerCase().includes(search));

      return matchesSearch;
    } catch (error) {
      console.error('Error filtering defect:', error, d);
      // If there's an error in filtering, include the defect to prevent blank page
      return true;
    }
  });

  const fetchReleaseData = async (selectedProject: string | null) => {
    try {
      const response = await projectReleaseCardView(selectedProject);
      setReleasesData(response.data || []);
    } catch (error) {
      console.error("Failed to fetch releases:", error);
    }
  };

  // Fetch next available statuses based on current status
  const fetchNextStatuses = async (fromStatusId: number) => {
    try {
      setIsNextStatusLoading(true);
      setNextStatusError(null);

      const response = await getNextStatuses(fromStatusId);

      // Map the response to DefectStatus format
      const mappedStatuses = response.data.map(status => ({
        id: status.id,
        defectStatusName: status.defectStatusName,
        colorCode: status.colorCode,
        color: status.colorCode, // Add color property for compatibility
        name: status.defectStatusName // Add name property for compatibility
      }));

      setNextStatuses(mappedStatuses);
    } catch (error: any) {
      console.error("Failed to fetch next statuses:", error);
      setNextStatusError(error.message || 'Failed to fetch next statuses');
      // Fallback to all statuses if next statuses API fails
      setNextStatuses(defectStatuses);
    } finally {
      setIsNextStatusLoading(false);
    }
  };

  useEffect(() => {
    fetchReleaseData(selectedProjectId);
  }, [selectedProjectId]);

  // Project selection handler
  const handleProjectSelect = (id: string) => {
    setSelectedProjectIdLocal(id);
    setGlobalProjectId(id); // keep global context in sync
    navigate(`/projects/${id}/defects`);
  };

  // Helper to generate next defect ID in order
  const getNextDefectId = () => {
    const projectDefects = defects.filter((d) => d.projectId === projectId);
    const ids = projectDefects
      .map((d) => d.id)
      .map((id) => parseInt(id.replace("DEF-", "")))
      .filter((n) => !isNaN(n));
    const nextNum = ids.length > 0 ? Math.max(...ids) + 1 : 1;
    return `DEF-${nextNum.toString().padStart(4, "0")}`;
  };

  const defectAdd = async () => {
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

    // Remove testCaseId as it's commented out in the specification
    // testCaseId: formData.testCaseId ? Number(formData.testCaseId) : null,

    console.log('Submitting defect with payload:', payload);

    try {
      // Always send as FormData to maintain consistency with the backend
      // This ensures the backend receives the same request structure whether an image is present or not
      let response;
      const attachmentFile: File | undefined = (formData as any).attachmentFile;
      const form = new FormData();
      form.append('data', new Blob([JSON.stringify(payload)], { type: 'application/json' }));
      
      if (attachmentFile) {
        form.append('attachmentFile', attachmentFile);
      } else {
        // Send an empty blob to maintain the same FormData structure
        // This prevents 403 errors that occur when the backend expects FormData but receives JSON
        form.append('attachmentFile', new Blob([], { type: 'application/octet-stream' }));
      }
      
      response = await addDefects(form as any);
      console.log('📡 Add defect API response:', response);

      // Check for success - API returns "Success" (uppercase) or statusCode 2000
      if (response.status === "Success" || response.statusCode === 2000 || response.statusCode === 200) {
        // Handle successful defect addition
        showAlert("Defect added successfully!");
        await fetchData(); // Always re-fetch and map data after add
        resetForm();
      } else {
        // Handle API response with error status
        const errorMessage = response.message || "Failed to add defect.";
        console.error('❌ Defect add failed with response:', response);
        showAlert(`Failed to add defect: ${errorMessage}`);
      }
    } catch (error: any) {
      console.error('❌ Error adding defect:', error);

      // Enhanced error handling for different error scenarios
      let errorMessage = "Error adding defect. Please try again.";

      if (error.response) {
        // Server responded with error status
        const { status, data } = error.response;
        console.error('📡 Server error response:', { status, data });

        if (data) {
          if (data.message) {
            // Backend provided a specific error message
            errorMessage = `Failed to add defect: ${data.message}`;
          } else if (data.error) {
            // Alternative error field
            errorMessage = `Failed to add defect: ${data.error}`;
          } else if (data.errors && Array.isArray(data.errors)) {
            // Validation errors array
            errorMessage = `Failed to add defect: ${data.errors.join(', ')}`;
          } else if (typeof data === 'string') {
            // Error message as string
            errorMessage = `Failed to add defect: ${data}`;
          } else {
            // Fallback for unknown data structure
            errorMessage = `Failed to add defect: ${JSON.stringify(data)}`;
          }
        } else {
          // No data in response
          errorMessage = `Failed to add defect: Server error (${status})`;
        }
      } else if (error.request) {
        // Network error - no response received
        console.error('🌐 Network error:', error.request);
        errorMessage = "Failed to add defect: Network error. Please check your connection.";
      } else {
        // Other error
        console.error('⚠️ Unknown error:', error.message);
        errorMessage = `Failed to add defect: ${error.message || 'Unknown error'}`;
      }

      showAlert(errorMessage);
    }
  };

  // CRUD handlers
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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

    // Check if release is selected (only for new defects, not updates)
    if (!editingDefect && !formData.releaseId) {
      showAlert("Failed to add defect: Release cannot be null");
      return;
    }

    // Note: Assignee is optional for updates - users can update defects without reassigning

    if (editingDefect) {
      // EDIT: Call updateDefectById with new API
      try {
        const defectIdForApi = Number(formData.id);

        // Safety check: Ensure user data is loaded if we have an assignee
        if (editingDefect.assigned_to_name && userList.length === 0 && isUsersLoading) {
          showAlert("Please wait for user data to load before updating...");
          return;
        }

        // Assignee is optional for updates - allow updates without reassigning

        // Use the new payload structure as per backend requirements
        // Use selected next status if available, otherwise keep original status
        const statusToUse = selectedNextStatusId || originalStatusId;

        const payload = {
          description: formData.description,
          projectId: Number(selectedProjectId),
          severityId: Number(formData.severityId),
          priorityId: Number(formData.priorityId),
          defectStatusId: statusToUse ? Number(statusToUse) : null,
          typeId: Number(formData.typeId),
          steps: formData.steps,
          modulesId: Number(formData.moduleId),
          subModuleId: formData.subModuleId ? Number(formData.subModuleId) : null,
          assignbyId: formData.assignbyId ? Number(formData.assignbyId) : undefined,
          assigntoId: (() => {
            // If user selected a new assignee, use that
            if (formData.assigntoId) {
              return Number(formData.assigntoId);
            }

            // If we have the preserved numeric ID, use that
            if (editingDefect.assigned_to_id) {
              return editingDefect.assigned_to_id;
            }

            // If we have assignee name but no ID, try to find ID from userList first (more reliable), then allocated users
            if (editingDefect.assigned_to_name) {
              console.log('🔍 Looking up assignee ID for:', editingDefect.assigned_to_name);

              // First try userList (all users - more reliable as it's loaded on mount)
              if (userList.length > 0) {
                console.log('📋 Searching in userList:', userList.map(u => `${u.firstName} ${u.lastName}`));

                // Try exact match first
                let matchingUser = userList.find(user =>
                  `${user.firstName} ${user.lastName}` === editingDefect.assigned_to_name
                );

                // If exact match fails, try partial matches
                if (!matchingUser) {
                  console.log('🔍 Exact match failed, trying partial matches...');
                  const assignedName = editingDefect?.assigned_to_name ?? '';
                  // Try first name only
                  matchingUser = userList.find(user =>
                    user.firstName === assignedName
                  );

                  // Try last name only
                  if (!matchingUser) {
                    matchingUser = userList.find(user =>
                      user.lastName === assignedName
                    );
                  }

                  // Try case-insensitive full name match
                  if (!matchingUser) {
                    const compareName = assignedName.toLowerCase();
                    matchingUser = userList.find(user =>
                      `${user.firstName} ${user.lastName}`.toLowerCase() === compareName
                    );
                  }

                  // Try case-insensitive partial matches
                  if (!matchingUser) {
                    const compareName = assignedName.toLowerCase();
                    matchingUser = userList.find(user =>
                      user.firstName.toLowerCase() === compareName ||
                      user.lastName.toLowerCase() === compareName
                    );
                  }
                }

                if (matchingUser) {
                  console.log('✅ Found in userList:', matchingUser);
                  return matchingUser.id;
                } else {
                  console.log('❌ Not found in userList even with partial matching');
                  console.log('Available names:', userList.map(u => `"${u.firstName}" "${u.lastName}" "${u.firstName} ${u.lastName}"`));
                }
              } else {
                console.log('⚠️ userList is empty');
              }

              // If not found in userList, try allocated users as fallback
              if (allocatedUsers.length > 0) {
                console.log('📋 Searching in allocatedUsers:', allocatedUsers.map(u => u.userName));
                const matchingUser = allocatedUsers.find(user =>
                  user.userName === editingDefect.assigned_to_name
                );
                if (matchingUser) {
                  console.log('✅ Found in allocatedUsers:', matchingUser);
                  return matchingUser.userId;
                } else {
                  console.log('❌ Not found in allocatedUsers');
                }
              } else {
                console.log('⚠️ allocatedUsers is empty');
              }

              console.log('💥 No matching user found anywhere for:', editingDefect.assigned_to_name);
            } else {
              console.log('⚠️ No assignee name to lookup');
            }

            // Last resort: null (backend should handle this)
            return null;
          })(),
          releasesId: formData.releaseId ? Number(formData.releaseId) : undefined,
          testCaseId: formData.testCaseId ? Number(formData.testCaseId) : undefined,
        };

        console.log('=== DEFECT UPDATE DEBUG ===');
        console.log('editingDefect.assigned_to_name:', editingDefect.assigned_to_name);
        console.log('editingDefect.assigned_to_id:', editingDefect.assigned_to_id);
        console.log('formData.assigntoId:', formData.assigntoId);
        console.log('allocatedUsers count:', allocatedUsers.length);
        console.log('userList count:', userList.length);
        console.log('Final payload.assigntoId:', payload.assigntoId);
        console.log('Full payload:', payload);
        console.log('=== END DEBUG ===');
        // Attachment handling for UPDATE
        const attachmentFile: File | undefined = (formData as any).attachmentFile;
        let response;
        if (attachmentFile) {
          // New file selected: send as multipart/form-data with JSON in 'data'
          const form = new FormData();
          form.append('data', new Blob([JSON.stringify(payload)], { type: 'application/json' }));
          form.append('attachmentFile', attachmentFile);
          const url = `${BASE_URL}defect/${defectIdForApi}`;
          response = await apiClient.put(url, form, { headers: { 'Content-Type': 'multipart/form-data' } });
        } else if (formData.attachment === '' || formData.attachment === null) {
          // Existing removed: send multipart/form-data with attachment: null and empty file
          const updatePayload = { ...payload, attachment: null } as any;
          const form = new FormData();
          form.append('data', new Blob([JSON.stringify(updatePayload)], { type: 'application/json' }));
          // append an empty blob to keep same field present for backend parsers expecting a file key
          form.append('attachmentFile', new Blob([], { type: 'application/octet-stream' }));
          const url = `${BASE_URL}defect/${defectIdForApi}`;
          response = await apiClient.put(url, form, { headers: { 'Content-Type': 'multipart/form-data' } });
        } else {
          // Keep existing attachment: still send multipart/form-data to match add format
          // Use empty file placeholder so the payload contains both 'data' and 'attachmentFile'
          const form = new FormData();
          form.append('data', new Blob([JSON.stringify(payload)], { type: 'application/json' }));
          form.append('attachmentFile', new Blob([], { type: 'application/octet-stream' }));
          const url = `${BASE_URL}defect/${defectIdForApi}`;
          response = await apiClient.put(url, form, { headers: { 'Content-Type': 'multipart/form-data' } });
        }
        const responseData = (response && (response as any).data) ? (response as any).data : response;
        if (
          (responseData && (responseData as any).status === 'Success') ||
          (responseData && (responseData as any).statusCode === 2000) ||
          ((response as any)?.status === 200)
        ) {
          showAlert("Defect updated successfully!");
          await fetchData(); // Always re-fetch and map data after edit
          resetForm();
        } else {
          showAlert("Failed to update defect.");
        }
      } catch (error: any) {
        console.error('❌ Error updating defect:', error);

        // Enhanced error handling for defect updates
        let errorMessage = "Error updating defect. Please try again.";

        if (error.response) {
          // Server responded with error status
          const { status, data } = error.response;
          console.error('📡 Server error response:', { status, data });

          if (data) {
            if (data.message) {
              // Handle specific backend error messages
              const backendMessage = data.message;

              // Check for specific "Assigned To cannot be null" error
              if (backendMessage.toLowerCase().includes("assigned to cannot be null")) {
                errorMessage = "Please select an Assigned To user. This field is required for defect updates.";
              }
              // Check for other assignment-related errors
              else if (backendMessage.toLowerCase().includes("assigned") && backendMessage.toLowerCase().includes("null")) {
                errorMessage = "Please ensure all assignment fields are properly filled.";
              }
              // Check for validation errors
              else if (backendMessage.toLowerCase().includes("validation") || backendMessage.toLowerCase().includes("required")) {
                errorMessage = `Validation Error: ${backendMessage}`;
              }
              // Default case - show backend message as is
              else {
                errorMessage = backendMessage;
              }
            } else if (data.error) {
              // Alternative error field
              errorMessage = data.error;
            } else if (data.errors && Array.isArray(data.errors)) {
              // Validation errors array
              errorMessage = data.errors.join(', ');
            } else if (typeof data === 'string') {
              // Error message as string
              errorMessage = data;
            } else {
              // Fallback for unknown data structure
              errorMessage = `Update failed: ${JSON.stringify(data)}`;
            }
          } else {
            // No data in response
            errorMessage = `Server error (${status}). Please try again.`;
          }
        } else if (error.request) {
          // Network error - no response received
          console.error('🌐 Network error:', error.request);
          errorMessage = "Failed to update defect: Network error. Please check your connection.";
        } else {
          // Other error
          console.error('⚠️ Unknown error:', error.message);
          errorMessage = `Failed to update defect: ${error.message || 'Unknown error'}`;
        }

        showAlert(errorMessage);
      }
    } else {
      // ADD: Call defectAdd for new defect
      await defectAdd();
    }
  };
  const handleEdit = async (defect: FilteredDefect) => {
    // Map names to IDs for dropdowns
    const moduleId = modules.find(m => m.name === defect.module_name)?.id || '';
    const severityId = severities.find(s => s.name === defect.severity_name)?.id?.toString() || '';
    const priorityId = priorities.find(p => p.priority === defect.priority_name)?.id?.toString() || '';
    const typeId = defectTypes.find(t => t.defectTypeName === defect.defect_type_name)?.id?.toString() || '';
    // Find assigntoId from allocatedUsers (for the dropdown) or fallback to userList
    let assigntoId = '';
    console.log('Editing defect - assigned_to_name:', defect.assigned_to_name);
    console.log('Available allocatedUsers:', allocatedUsers);
    console.log('Available userList:', userList);

    if (allocatedUsers.length > 0) {
      assigntoId = allocatedUsers.find(u => u.userName === defect.assigned_to_name)?.userId?.toString() || '';
      console.log('Found assigntoId in allocatedUsers:', assigntoId);
    }
    // If not found in allocated users, try userList as fallback
    if (!assigntoId) {
      assigntoId = userList.find(u => `${u.firstName} ${u.lastName}` === defect.assigned_to_name)?.id?.toString() || '';
      console.log('Found assigntoId in userList (fallback):', assigntoId);
    }

    const assignbyId = userList.find(u => `${u.firstName} ${u.lastName}` === defect.assigned_by_name)?.id?.toString() || '';
    const statusId = defectStatuses.find(s => s.defectStatusName === defect.defect_status_name)?.id?.toString() || '';
    const releaseId = releasesData.find(r => r.releaseName === defect.release_test_case_description)?.id?.toString() || '';
    const id = backendDefects.find(x => x.id === defect.id)?.id?.toString() || "";
    // console.log(id);
    // console.log('Editing defect:', {
    //   defectReleaseDesc: defect.release_test_case_description,
    //   releasesData: releasesData.map(r => r.releaseName),
    //   foundReleaseId: releaseId
    // });


    setEditingDefect(defect);
    setFormData(prev => ({
      ...prev,
      id,
      defectId: defect.defectId || '',
      description: defect.description || '',
      steps: defect.steps || '',
      moduleId,
      subModuleId: '', // temporarily clear until submodules are loaded
      severityId,
      priorityId,
      typeId,
      assigntoId,
      assignbyId,
      releaseId,
      attachment: defect.attachment || '',
      statusId,
      testCaseRequired: (defect as any).testCaseRequired ?? true, // Default to true if not set
    }));

    // Set original status and clear selected next status
    setOriginalStatusId(statusId);
    setSelectedNextStatusId('');

    // Fetch next available statuses based on current status
    if (statusId) {
      await fetchNextStatuses(Number(statusId));
    }

    setIsModalOpen(true);
    // Fetch submodules for the selected module, then set subModuleId
    if (moduleId) {
      try {
        const res = await getSubmodulesByModuleId(Number(moduleId));
        const mapped = (res.data || []).map((sm: any) => ({
          id: sm.id?.toString() || sm.subModuleId?.toString(),
          name: sm.name || sm.subModuleName
        }));
        setSubmodules(mapped);
        const subModuleId = mapped.find(sm => sm.name === defect.sub_module_name)?.id || '';
        setFormData(prev => ({ ...prev, subModuleId }));
      } catch (err) {
        setSubmodules([]);
        setFormData(prev => ({ ...prev, subModuleId: '' }));
      }
    }
  };
  // Add state for delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; defectId: string | null }>({ open: false, defectId: null });
  const openDeleteConfirm = (defectId: string) => setDeleteConfirm({ open: true, defectId });
  const closeDeleteConfirm = () => setDeleteConfirm({ open: false, defectId: null });
  // Update handleDelete to use confirmation modal
  const handleDelete = async (defectId: string) => {
    openDeleteConfirm(defectId);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.defectId) return closeDeleteConfirm();
    try {
      const defect = backendDefects.find(d => d.defectId === deleteConfirm.defectId);
      if (!defect) {
        showAlert("Defect not found.");
        closeDeleteConfirm();
        return;
      }
      const response = await deleteDefectById(defect.id.toString());
      if (response.status === 'Success' || response.statusCode === 2000) {
        showAlert("Defect deleted successfully.");
        await fetchData();
      } else {
        showAlert("Delete failed. Please try again.");
      }
    } catch (error: any) {
      console.error('❌ Error deleting defect:', error);

      // Enhanced error handling for defect deletion
      let errorMessage = "Failed to delete defect. Please try again.";

      if (error.response) {
        // Server responded with error status
        const { status, data } = error.response;
        console.error('📡 Server error response:', { status, data });

        if (data) {
          if (data.message) {
            // Backend provided a specific error message
            errorMessage = `Failed to delete defect: ${data.message}`;
          } else if (data.error) {
            // Alternative error field
            errorMessage = `Failed to delete defect: ${data.error}`;
          } else if (typeof data === 'string') {
            // Error message as string
            errorMessage = `Failed to delete defect: ${data}`;
          } else {
            // Fallback for unknown data structure
            errorMessage = `Failed to delete defect: ${JSON.stringify(data)}`;
          }
        } else {
          // No data in response
          errorMessage = `Failed to delete defect: Server error (${status})`;
        }
      } else if (error.request) {
        // Network error - no response received
        console.error('🌐 Network error:', error.request);
        errorMessage = "Failed to delete defect: Network error. Please check your connection.";
      } else {
        // Other error
        console.error('⚠️ Unknown error:', error.message);
        errorMessage = `Failed to delete defect: ${error.message || 'Unknown error'}`;
      }

      showAlert(errorMessage);
    } finally {
      closeDeleteConfirm();
    }
  };

  const resetForm = () => {
    setFormData({
      defectId: '',
      id: '', // real numeric id
      description: '',
      steps: '',
      moduleId: '',
      subModuleId: '',
      severityId: '',
      priorityId: '',
      typeId: '',
      assigntoId: '',
      assignbyId: '',
      releaseId: '',
      attachment: '',
      statusId: '',
      testCaseId: '',
      testCaseRequired: true, // Default to true (yes) for new defects
    });
    setEditingDefect(null);
    setIsModalOpen(false);

    // Clear next statuses state
    setNextStatuses([]);
    setNextStatusError(null);
    setIsNextStatusLoading(false);

    // Clear original and selected status state
    setOriginalStatusId('');
    setSelectedNextStatusId('');
  };

  // Function to handle viewing attachments in modal
  const handleViewAttachment = (attachmentUrl: string) => {
    setViewingImageUrl(attachmentUrl);
    setIsImageViewerModalOpen(true);
  };

  // Function to close image viewer modal
  const closeImageViewer = () => {
    setIsImageViewerModalOpen(false);
    setViewingImageUrl(null);
  };
  const handleInputChange = async (field: string, value: string) => {
    // Handle testCaseRequired as boolean
    if (field === 'testCaseRequired') {
      setFormData(prev => ({ ...prev, [field]: value === 'true' }));
    } else if (field === 'statusId') {
      // Handle status change differently - track the selected next status separately
      // This allows users to switch between next statuses multiple times before saving
      setSelectedNextStatusId(value);
      // Don't update formData.statusId - we'll use selectedNextStatusId or originalStatusId for submission
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }

    // Note: We don't fetch next statuses when status changes anymore
    // since we want to keep showing the original status's next statuses
  };

  // Helper function to render colored span with proper styling
  const renderColoredSpan = (text: string | undefined | null, colorResult: string | React.CSSProperties) => {
    const displayText = text || '-';
    if (typeof colorResult === 'string') {
      // Use Tailwind classes
      return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${colorResult}`}>
          {displayText}
        </span>
      );
    } else {
      // Use inline styles
      return (
        <span 
          className="px-2 py-1 rounded-full text-xs font-medium"
          style={colorResult}
        >
          {displayText}
        </span>
      );
    }
  };

  // Helper functions to get colors from database configuration
  const getSeverityColor = (severityName: string | undefined | null) => {
    if (!severityName) return "bg-gray-100 text-gray-800";
    
    const severity = severities.find(s => s.name.toLowerCase() === severityName.toLowerCase());
    if (severity && severity.color) {
      // Return custom style object for inline styling
      const hexColor = severity.color.startsWith('#') ? severity.color : `#${severity.color}`;
      return { backgroundColor: hexColor, color: 'white' };
    }
    
    // Fallback to hardcoded colors if not found in database
    switch (severityName.toLowerCase()) {
      case "critical":
        return "bg-red-100 text-red-800";
      case "high":
        return "bg-orange-100 text-orange-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priorityName: string | undefined | null) => {
    if (!priorityName) return "bg-gray-100 text-gray-800";
    
    const priority = priorities.find(p => p.priority.toLowerCase() === priorityName.toLowerCase());
    if (priority && priority.color) {
      // Return custom style object for inline styling
      const hexColor = priority.color.startsWith('#') ? priority.color : `#${priority.color}`;
      return { backgroundColor: hexColor, color: 'white' };
    }
    
    // Fallback to hardcoded colors if not found in database
    switch (priorityName.toLowerCase()) {
      case "critical":
        return "bg-red-100 text-red-800";
      case "high":
        return "bg-orange-100 text-orange-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (statusName: string | undefined | null) => {
    if (!statusName) return "bg-gray-100 text-gray-800";
    
    const status = defectStatuses.find(s => s.defectStatusName.toLowerCase() === statusName.toLowerCase());
    if (status && status.colorCode) {
      // Return custom style object for inline styling
      const hexColor = status.colorCode.startsWith('#') ? status.colorCode : `#${status.colorCode}`;
      return { backgroundColor: hexColor, color: 'white' };
    }
    
    // Fallback to hardcoded colors if not found in database
    switch (statusName.toLowerCase()) {
      case "open":
        return "bg-purple-100 text-purple-800";
      case "in-progress":
        return "bg-blue-100 text-blue-800";
      case "resolved":
        return "bg-green-100 text-green-800";
      case "closed":
        return "bg-gray-100 text-gray-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Add state for modules and submodules
  const [modules, setModules] = React.useState<{ id: string; name: string }[]>([]);
  const [submodules, setSubmodules] = React.useState<{ id: string; name: string }[]>([]);
  const [submoduleError, setSubmoduleError] = React.useState<string>("");

  // Separate state for filter submodules
  const [filterSubmodules, setFilterSubmodules] = React.useState<{ id: string; name: string; moduleId?: string; moduleName?: string }[]>([]);

  // Fetch modules when project changes
  React.useEffect(() => {
    if (!selectedProjectId) return;
    getModulesByProjectId(selectedProjectId)
      .then((res) => {
        setModules((res.data || []).map((m: any) => ({ id: m.id?.toString(), name: m.moduleName })));
      })
      .catch(error => {
        console.error('Failed to fetch modules:', error.message);
        setModules([]);
      });
  }, [selectedProjectId]);

  // Fetch submodules when module changes in the form
  React.useEffect(() => {
    if (!formData.moduleId) {
      setSubmodules([]);
      setFormData(f => ({ ...f, subModuleId: '' }));
      return;
    }
    getSubmodulesByModuleId(Number(formData.moduleId))
      .then(res => {
        const mapped = (res.data || []).map((sm: any) => ({
          id: sm.id?.toString() || sm.subModuleId?.toString(),
          name: sm.name || sm.subModuleName
        }));
        setSubmodules(mapped);
      })
      .catch((err) => {
        // Only log the error once, not on every render
        if (err && !submodules.length) {
          console.error('Failed to fetch submodules:', err.message);
        }
        setSubmodules([]);
      });
  }, [formData.moduleId]);

  // Fetch submodules for filter when module filter changes
  React.useEffect(() => {
    if (!filters.module || !filters.module.length) {
      setFilterSubmodules([]);
      return;
    }

    // Fetch submodules for ALL selected modules
    const selectedModules = modules.filter(m => filters.module.includes(m.name));
    if (!selectedModules.length) {
      setFilterSubmodules([]);
      return;
    }

    console.log('🔍 Fetching submodules for selected modules:', selectedModules.map(m => m.name));

    // Fetch submodules for all selected modules
    Promise.all(
      selectedModules.map(module =>
        getSubmodulesByModuleId(Number(module.id))
          .then((res) => ({
            moduleId: module.id,
            moduleName: module.name,
            submodules: (res.data || []).map((sm: any) => ({
              id: sm.id?.toString() || sm.subModuleId?.toString(),
              name: sm.name || sm.subModuleName,
              moduleId: module.id,
              moduleName: module.name
            }))
          }))
          .catch((error) => {
            console.error(`Failed to fetch submodules for module ${module.name}:`, error);
            return { moduleId: module.id, moduleName: module.name, submodules: [] };
          })
      )
    ).then((results) => {
      // Combine all submodules from all selected modules
      const allSubmodules = results.flatMap(result => result.submodules);
      console.log('✅ Combined submodules from all modules:', allSubmodules.length, 'submodules');
      setFilterSubmodules(allSubmodules);
    });
  }, [filters.module, modules]);

  // For Assigned To and Entered By, use employees context
  
  // Remove mock/fallback employeeOptions; only use userList from backend

  // Get highlight param from URL
  const highlightId = React.useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("highlight");
  }, [location.search]);
  // Ref for scrolling
  const highlightedRowRef = React.useRef<HTMLTableRowElement>(null);
  React.useEffect(() => {
    if (highlightedRowRef.current) {
      highlightedRowRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [highlightId]);

  // Add these state hooks at the top of the Defects component
  const [editingStatusId, setEditingStatusId] = useState<string | null>(null);
  const [statusEditValue, setStatusEditValue] = useState<string>('new');
  const [statusEditComment, setStatusEditComment] = useState<string>('');
  const [viewingDefectHistory, setViewingDefectHistory] = useState<RealDefectHistoryEntry[]>([]);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isEditingRejectionComment, setIsEditingRejectionComment] = useState(false);

  // Add state to track original status and selected next status
  const [originalStatusId, setOriginalStatusId] = useState<string>('');
  const [selectedNextStatusId, setSelectedNextStatusId] = useState<string>('');

  const [priorities, setPriorities] = useState<Priority[]>([]);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [defectStatuses, setDefectStatuses] = useState<DefectStatus[]>([]);
  const [isStatusLoading, setIsStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  // State for next available statuses based on current status
  const [nextStatuses, setNextStatuses] = useState<DefectStatus[]>([]);
  const [isNextStatusLoading, setIsNextStatusLoading] = useState(false);
  const [nextStatusError, setNextStatusError] = useState<string | null>(null);

  // Add state for severities and defect types
  const [severities, setSeverities] = useState<{ id: number; name: string; color: string }[]>([]);
  const [defectTypes, setDefectTypes] = useState<{ id: number; defectTypeName: string }[]>([]);

  // Fetch severities and defect types on mount (only once)
  React.useEffect(() => {
    getSeverities()
      .then(res => setSeverities(res.data))
      .catch(error => {
        console.error('Failed to fetch severities:', error.message);
        setSeverities([]);
      });
    getDefectTypes()
      .then(res => setDefectTypes(res.data))
      .catch(error => {
        console.error('Failed to fetch defect types:', error.message);
        setDefectTypes([]);
      });
    getAllPriorities()
      .then(res => setPriorities(res.data || []))
      .catch(error => {
        console.error("Failed to fetch priorities:", error);
        setPriorities([]);
      });
    getAllDefectStatuses()
      .then(res => {
        setDefectStatuses(res.data || []);
        setIsStatusLoading(false);
      })
      .catch(err => {
        setStatusError(err.message || "Failed to fetch statuses");
        setDefectStatuses([]);
        setIsStatusLoading(false);
      });
  }, []); // Only run once on mount

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!selectedProjectId) {
      showAlert("Please select a project before importing defects.");
      return;
    }

    // Validate file type
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv' // .csv
    ];

    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
      showAlert("Please select a valid Excel (.xlsx, .xls) or CSV (.csv) file.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    console.log('Importing defects:', {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      projectId: selectedProjectId,
      apiUrl: `${BASE_URL}defect/import/${selectedProjectId}`
    });

    try {
      // Show loading state
      showAlert("Importing defects... Please wait.");

      const response = await importDefects(formData, selectedProjectId);

      console.log('📡 Import API response:', {
        status: response.status,
        statusCode: response.statusCode,
        message: response.message,
        dataKeys: response.data ? Object.keys(response.data) : 'no data',
        importStats: response.data ? {
          imported: response.data.imported || response.data.success || response.data.successCount,
          failed: response.data.failed || response.data.error || response.data.failedCount,
          total: response.data.total || response.data.totalCount,
          skipped: response.data.skipped || response.data.skippedCount,
          warnings: response.data.warnings?.length || 0,
          errors: response.data.errors?.length || 0
        } : 'no stats',
        fullResponse: response
      });

      if (response.status === 'success' || response.status === 'Success' || response.statusCode === 200 || response.statusCode === 2000) {
        // Refresh the defects list after successful import
        await fetchData();

        // Enhanced success message handling with detailed statistics
        let successMessage = "Defects imported successfully!";

        // Handle detailed import statistics
        if (response.data) {
          const importedCount = response.data.imported || response.data.success || response.data.successCount || 0;
          const failedCount = response.data.failed || response.data.error || response.data.failedCount || 0;
          const totalCount = response.data.total || response.data.totalCount || (importedCount + failedCount);
          const skippedCount = response.data.skipped || response.data.skippedCount || 0;

          // Case 1: All defects imported successfully
          if (totalCount > 0 && failedCount === 0 && skippedCount === 0) {
            successMessage = `✅ Import completed successfully! All ${totalCount} defects imported.`;
          }
          // Case 2: Partial import - some succeeded, some failed
          else if (importedCount > 0 && failedCount > 0) {
            successMessage = `⚠️ Partial import completed! ${importedCount} out of ${totalCount} defects imported successfully, ${failedCount} defects failed to import.`;

            // Add failure reasons if available
            if (response.data.failureReasons && Array.isArray(response.data.failureReasons)) {
              const reasons = response.data.failureReasons.slice(0, 3).join(', ');
              const moreReasons = response.data.failureReasons.length > 3 ? ` and ${response.data.failureReasons.length - 3} more issues` : '';
              successMessage += ` Failure reasons: ${reasons}${moreReasons}`;
            } else if (response.data.errors && Array.isArray(response.data.errors)) {
              const errors = response.data.errors.slice(0, 2).map((error: any) => {
                if (typeof error === 'string') return error;
                if (error.message) return error.message;
                return JSON.stringify(error);
              }).join(', ');
              const moreErrors = response.data.errors.length > 2 ? ` and ${response.data.errors.length - 2} more errors` : '';
              successMessage += ` Issues: ${errors}${moreErrors}`;
            }
          }
          // Case 3: Some imported with skipped items
          else if (importedCount > 0 && skippedCount > 0) {
            successMessage = `✅ Import completed! ${importedCount} defects imported successfully, ${skippedCount} defects skipped.`;
            if (response.data.skipReasons) {
              successMessage += ` Skip reasons: ${response.data.skipReasons}`;
            }
          }
          // Case 4: Simple count without failures
          else if (importedCount > 0) {
            successMessage = `✅ Import completed successfully! ${importedCount} defects imported.`;
          }
          // Case 5: Use total count if available
          else if (totalCount > 0) {
            successMessage = `✅ Import completed successfully! ${totalCount} defects imported.`;
          }

          // Add warnings if some rows had warnings but still imported
          if (response.data.warnings && Array.isArray(response.data.warnings) && response.data.warnings.length > 0) {
            const warningCount = response.data.warnings.length;
            successMessage += ` Note: ${warningCount} defect(s) imported with warnings.`;
          }

          // Add detailed breakdown if available
          if (response.data.breakdown) {
            successMessage += ` Breakdown: ${response.data.breakdown}`;
          }
        }

        // Fallback to response message if no detailed data
        if (successMessage === "Defects imported successfully!" && response.message) {
          successMessage = `Defects imported successfully! ${response.message}`;
        }

        showAlert(successMessage);
      } else {
        // Enhanced failure message handling for backend responses
        console.error('❌ Import failed with response:', response);

        let failureMessage = "Import failed: Unknown error";

        // Priority 1: Use main response message from backend if available
        if (response.message) {
          failureMessage = `Import failed: ${response.message}`;
          console.log('🔔 Using backend message:', response.message);
        }

        // Priority 2: Check for detailed error information in response.data (only if no main message)
        if (response.data && failureMessage === "Import failed: Unknown error") {
          // Handle validation errors with row details
          if (response.data.validationErrors && Array.isArray(response.data.validationErrors)) {
            const validationErrors = response.data.validationErrors.slice(0, 3).map((error: any) => {
              if (error.row && error.field && error.message) {
                return `Row ${error.row}, ${error.field}: ${error.message}`;
              } else if (error.row && error.message) {
                return `Row ${error.row}: ${error.message}`;
              } else if (error.message) {
                return error.message;
              }
              return JSON.stringify(error);
            });
            const moreErrors = response.data.validationErrors.length > 3 ? ` and ${response.data.validationErrors.length - 3} more validation errors` : '';
            failureMessage = `Import failed - Validation errors: ${validationErrors.join(', ')}${moreErrors}`;
          }
          // Handle file format errors
          else if (response.data.fileErrors && Array.isArray(response.data.fileErrors)) {
            failureMessage = `Import failed - File errors: ${response.data.fileErrors.join(', ')}`;
          }
          // Handle general errors array
          else if (response.data.errors && Array.isArray(response.data.errors)) {
            const errorCount = response.data.errors.length;
            const sampleErrors = response.data.errors.slice(0, 3).map((error: any) => {
              if (typeof error === 'string') return error;
              if (error.message) return error.message;
              if (error.error) return error.error;
              return JSON.stringify(error);
            });
            const moreErrors = errorCount > 3 ? ` and ${errorCount - 3} more errors` : '';
            failureMessage = `Import failed: ${sampleErrors.join(', ')}${moreErrors}`;
          }
          // Handle partial import failures with detailed statistics
          else if (response.data.imported !== undefined && response.data.failed !== undefined) {
            const importedCount = response.data.imported || response.data.success || response.data.successCount || 0;
            const failedCount = response.data.failed || response.data.error || response.data.failedCount || 0;
            const totalCount = response.data.total || response.data.totalCount || (importedCount + failedCount);
            const skippedCount = response.data.skipped || response.data.skippedCount || 0;

            if (importedCount > 0 && failedCount > 0) {
              // Partial success case
              failureMessage = `⚠️ Partial import completed: ${importedCount} out of ${totalCount} defects imported successfully, ${failedCount} defects failed to import.`;

              // Add failure details if available
              if (response.data.failureDetails && Array.isArray(response.data.failureDetails)) {
                const details = response.data.failureDetails.slice(0, 3).map((detail: any) => {
                  if (typeof detail === 'string') return detail;
                  if (detail.row && detail.reason) return `Row ${detail.row}: ${detail.reason}`;
                  if (detail.message) return detail.message;
                  return JSON.stringify(detail);
                }).join(', ');
                const moreDetails = response.data.failureDetails.length > 3 ? ` and ${response.data.failureDetails.length - 3} more issues` : '';
                failureMessage += ` Failed defects: ${details}${moreDetails}`;
              } else if (response.data.errors && Array.isArray(response.data.errors)) {
                const errors = response.data.errors.slice(0, 2).map((error: any) => {
                  if (typeof error === 'string') return error;
                  if (error.message) return error.message;
                  return JSON.stringify(error);
                }).join(', ');
                const moreErrors = response.data.errors.length > 2 ? ` and ${response.data.errors.length - 2} more errors` : '';
                failureMessage += ` Issues: ${errors}${moreErrors}`;
              } else if (response.message) {
                failureMessage += ` Reason: ${response.message}`;
              }

              // Add skipped count if any
              if (skippedCount > 0) {
                failureMessage += ` Additionally, ${skippedCount} defects were skipped.`;
              }
            } else if (importedCount === 0 && failedCount > 0) {
              // Complete failure case
              failureMessage = `❌ Import failed: All ${failedCount} out of ${totalCount} defects failed to import.`;

              if (response.data.failureDetails && Array.isArray(response.data.failureDetails)) {
                const details = response.data.failureDetails.slice(0, 3).map((detail: any) => {
                  if (typeof detail === 'string') return detail;
                  if (detail.row && detail.reason) return `Row ${detail.row}: ${detail.reason}`;
                  if (detail.message) return detail.message;
                  return JSON.stringify(detail);
                }).join(', ');
                const moreDetails = response.data.failureDetails.length > 3 ? ` and ${response.data.failureDetails.length - 3} more issues` : '';
                failureMessage += ` Reasons: ${details}${moreDetails}`;
              } else if (response.message) {
                failureMessage += ` Reason: ${response.message}`;
              }
            } else if (importedCount > 0 && skippedCount > 0) {
              // Success with skipped items
              failureMessage = `✅ Import completed: ${importedCount} defects imported successfully, ${skippedCount} defects skipped.`;
              if (response.data.skipReasons) {
                failureMessage += ` Skip reasons: ${response.data.skipReasons}`;
              }
            }
          }
          // Handle summary with counts
          else if (response.data.summary) {
            failureMessage = `Import failed: ${response.data.summary}`;
          }
          // Handle single error message in data
          else if (response.data.error) {
            failureMessage = `Import failed: ${response.data.error}`;
          }
          // Handle message in data
          else if (response.data.message) {
            failureMessage = `Import failed: ${response.data.message}`;
          }
        }

        // Priority 2: Check main response message if no detailed data errors
        if (failureMessage === "Import failed: Unknown error" && response.message) {
          failureMessage = `Import failed: ${response.message}`;
        }

        // Priority 3: Handle specific status-based failures (only if no backend message was already set)
        if ((response.status === 'Failure' || response.status === 'failure' || response.status === 'error') &&
            failureMessage === "Import failed: Unknown error") {
          // Only use generic messages if backend didn't provide a specific message
          if (response.message?.includes('invalid file') || response.message?.includes('Invalid file')) {
            failureMessage = `Import failed: Invalid file format. ${response.message}`;
          } else if (response.message?.includes('permission') || response.message?.includes('Permission')) {
            failureMessage = `Import failed: Permission denied. ${response.message}`;
          } else if (response.message?.includes('size') || response.message?.includes('Size')) {
            failureMessage = `Import failed: File size issue. ${response.message}`;
          } else {
            // For any other failure status, use the backend message as-is
            failureMessage = `Import failed: ${response.message || 'Unknown error'}`;
          }
        }

        // Priority 4: Handle HTTP status codes (only if no backend message was provided)
        if (response.statusCode && failureMessage === "Import failed: Unknown error") {
          if (response.statusCode === 400) {
            failureMessage = "Import failed: Bad request - Please check your file format and data.";
          } else if (response.statusCode === 413) {
            failureMessage = "Import failed: File too large. Please reduce file size and try again.";
          } else if (response.statusCode === 415) {
            failureMessage = "Import failed: Unsupported file type. Please use Excel (.xlsx) or CSV (.csv) format.";
          } else if (response.statusCode === 422) {
            failureMessage = "Import failed: Data validation error. Please check your file content.";
          } else if (response.statusCode >= 500 && response.statusCode < 5000) {
            // Only treat 500-4999 as server errors, not custom codes like 4000
            failureMessage = `Import failed: Server error (${response.statusCode}). Please try again later.`;
          } else {
            // For custom status codes like 4000, use generic message
            failureMessage = "Import failed: Please check your file and try again.";
          }
        }

        console.error('📋 Final failure message:', failureMessage);
        showAlert(failureMessage);
      }
    } catch (error: any) {
      console.error('❌ Import error:', error);

      // Enhanced error handling for defect import exceptions
      let errorMessage = "Failed to import defects. Please try again.";

      if (error.response) {
        // Server responded with error status
        const { status, data } = error.response;
        console.error('📡 Server error response:', { status, data });

        if (data) {
          // Handle import-specific validation errors
          if (data.validationErrors && Array.isArray(data.validationErrors)) {
            const validationErrors = data.validationErrors.slice(0, 3).map((error: any) => {
              if (error.row && error.field && error.message) {
                return `Row ${error.row}, ${error.field}: ${error.message}`;
              } else if (error.row && error.message) {
                return `Row ${error.row}: ${error.message}`;
              } else if (error.message) {
                return error.message;
              }
              return JSON.stringify(error);
            });
            const moreErrors = data.validationErrors.length > 3 ? ` and ${data.validationErrors.length - 3} more validation errors` : '';
            errorMessage = `Import failed - Validation errors: ${validationErrors.join(', ')}${moreErrors}`;
          }
          // Handle file processing errors
          else if (data.fileErrors && Array.isArray(data.fileErrors)) {
            errorMessage = `Import failed - File processing errors: ${data.fileErrors.join(', ')}`;
          }
          // Handle backend-specific error message
          else if (data.message) {
            errorMessage = `Import failed: ${data.message}`;

            // Add context for common import errors
            if (data.message.includes('column') || data.message.includes('header')) {
              errorMessage += " Please check your file headers and column names.";
            } else if (data.message.includes('format') || data.message.includes('invalid')) {
              errorMessage += " Please ensure your file is in the correct format.";
            } else if (data.message.includes('size') || data.message.includes('large')) {
              errorMessage += " Please reduce the file size or split into smaller files.";
            }
          }
          // Handle alternative error field
          else if (data.error) {
            errorMessage = `Import failed: ${data.error}`;
          }
          // Handle errors array
          else if (data.errors && Array.isArray(data.errors)) {
            const errorCount = data.errors.length;
            const sampleErrors = data.errors.slice(0, 3).map((error: any) => {
              if (typeof error === 'string') return error;
              if (error.message) return error.message;
              if (error.error) return error.error;
              return JSON.stringify(error);
            });
            const moreErrors = errorCount > 3 ? ` and ${errorCount - 3} more errors` : '';
            errorMessage = `Import failed: ${sampleErrors.join(', ')}${moreErrors}`;
          }
          // Handle detailed import errors with row information
          else if (data.details && Array.isArray(data.details)) {
            const errorDetails = data.details.slice(0, 3).map((detail: any) => {
              if (typeof detail === 'string') return detail;
              if (detail.row && detail.field && detail.message) {
                return `Row ${detail.row}, ${detail.field}: ${detail.message}`;
              } else if (detail.row && detail.message) {
                return `Row ${detail.row}: ${detail.message}`;
              } else if (detail.message) {
                return detail.message;
              }
              return JSON.stringify(detail);
            });
            const moreErrors = data.details.length > 3 ? ` and ${data.details.length - 3} more errors` : '';
            errorMessage = `Import failed: ${errorDetails.join(', ')}${moreErrors}`;
          }
          // Handle string error response
          else if (typeof data === 'string') {
            errorMessage = `Import failed: ${data}`;
          }
          // Fallback for unknown data structure
          else {
            errorMessage = `Import failed: ${JSON.stringify(data)}`;
          }
        } else {
          // No data in response - use status code for context
          if (status === 400) {
            errorMessage = "Import failed: Bad request - Please check your file format and data.";
          } else if (status === 413) {
            errorMessage = "Import failed: File too large. Please reduce file size and try again.";
          } else if (status === 415) {
            errorMessage = "Import failed: Unsupported file type. Please use Excel (.xlsx) or CSV (.csv) format.";
          } else if (status === 422) {
            errorMessage = "Import failed: Data validation error. Please check your file content.";
          } else if (status >= 500 && status < 5000) {
            // Only treat 500-4999 as server errors, not custom codes like 4000
            errorMessage = `Import failed: Server error (${status}). Please try again later.`;
          } else {
            // For custom status codes like 4000, use generic message
            errorMessage = `Import failed: Please check your file and try again.`;
          }
        }
      } else if (error.request) {
        // Network error - no response received
        console.error('🌐 Network error:', error.request);
        errorMessage = "Import failed: Network error. Please check your internet connection and try again.";
      } else if (error.message) {
        // Other error with message
        console.error('⚠️ Unknown error:', error.message);

        // Handle common client-side errors
        if (error.message.includes('timeout')) {
          errorMessage = "Import failed: Request timeout. The file might be too large or server is busy. Please try again.";
        } else if (error.message.includes('abort')) {
          errorMessage = "Import failed: Request was cancelled. Please try again.";
        } else {
          errorMessage = `Import failed: ${error.message}`;
        }
      }

      showAlert(errorMessage);
    } finally {
      // Reset the file input
      if (e.target) {
        e.target.value = '';
      }
    }
  };
  // Add exportDefects function
  const exportDefects = async () => {
    if (!selectedProjectId) {
      showAlert("Please select a project before exporting defects.");
      return;
    }
    try {
      const response = await apiClient.get(
        `${BASE_URL}defect/export/${selectedProjectId}`,
        {
          responseType: "blob",
        }
      );
      // Create a link to download the file
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      // Try to get filename from content-disposition header, fallback to defects_export.csv
      const contentDisposition = response.headers["content-disposition"];
      let fileName = "defects_export.csv";
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^";]+)"?/);
        if (match && match[1]) fileName = match[1];
      }
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      showAlert("Failed to export defects. Please try again.");
    }
  };

  // Update handleExportExcel to use exportDefects
  const handleExportExcel = () => {
    exportDefects();
  };

  const releaseMap = React.useMemo(() => Object.fromEntries(releases.map(r => [Number(r.id), r.name])), [releases]);

  const handleStatusSave = (defect: FilteredDefect, newStatus: string, comment: string) => {
    const now = new Date().toISOString();
    setBackendDefects(prev =>
      prev.map(d =>
        d.defectId === defect.defectId
          ? {
            ...d,
            defect_status_name: newStatus,
          }
          : d
      )
    );
    setEditingStatusId(null);
  };

  // Add state for users for 'Assigned To' and 'Entered By'
  const [userList, setUserList] = React.useState<{ id: number; firstName: string; lastName: string }[]>([]);

  // Fetch users for 'Assigned To' and 'Entered By' on mount
  React.useEffect(() => {
    setIsUsersLoading(true);

    console.log('Fetching users using getAllUsersSimple API...');

    getAllUsersSimple().then(response => {
      console.log('Users API response:', response);

      if (response.status === 'success' && response.data && response.data.content) {
        const mappedUsers = response.data.content.map((u: any) => ({
          id: parseInt(u.id) || 0,
          firstName: u.firstName,
          lastName: u.lastName
        }));
        console.log(`Successfully loaded ${mappedUsers.length} users for dropdowns`);
        setUserList(mappedUsers);
        setIsUsersLoading(false); // Set loading to false on success
      } else {
        console.warn('No users found or invalid response format:', response);
        setUserList([]);
        setIsUsersLoading(false); // Set loading to false even if no users
      }
    }).catch(error => {
      console.error('Failed to fetch users with getAllUsersSimple, trying fallback:', error);

      // Fallback to the original users endpoint
      const userApiUrl = `${import.meta.env.VITE_BASE_URL}users`;
      apiClient.get(userApiUrl).then(res => {
        console.log('Fallback users API response:', res.data);

        if (res.data && Array.isArray(res.data.data)) {
          const mappedUsers = res.data.data.map((u: any) => ({
            id: u.id,
            firstName: u.firstName,
            lastName: u.lastName
          }));
          console.log(`Fallback: loaded ${mappedUsers.length} users`);
          setUserList(mappedUsers);
        } else if (res.data && Array.isArray(res.data)) {
          const mappedUsers = res.data.map((u: any) => ({
            id: u.id,
            firstName: u.firstName,
            lastName: u.lastName
          }));
          console.log(`Fallback (direct): loaded ${mappedUsers.length} users`);
          setUserList(mappedUsers);
        } else {
          console.warn('Fallback also failed:', res.data);
          setUserList([]);
        }
        setIsUsersLoading(false); // Always set loading to false in fallback
      }).catch(fallbackError => {
        console.error('Both user APIs failed:', fallbackError);
        setUserList([]);
        setIsUsersLoading(false); // Set loading to false even on error
      });
    });

  }, []);

  // Compute releases for the selected project, with mock fallback
  let projectReleases = selectedProjectId ? releases.filter(r => r.projectId === selectedProjectId) : [];
  if (projectReleases.length === 0 && selectedProjectId) {
    projectReleases = [
      { id: 'REL-001', name: 'Release 1.0', projectId: selectedProjectId, status: 'planned', version: '1.0', description: '', Testcase: [], features: [], bugFixes: [], createdAt: new Date().toISOString() },
      { id: 'REL-002', name: 'Release 2.0', projectId: selectedProjectId, status: 'planned', version: '2.0', description: '', Testcase: [], features: [], bugFixes: [], createdAt: new Date().toISOString() },
    ];
  }

  // Add state for loading and error
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [isUsersLoading, setIsUsersLoading] = useState(true);

  // Safety check: Force loading to false if users are loaded but loading is still true
  React.useEffect(() => {
    if (userList.length > 0 && isUsersLoading) {
      console.log('Safety check: Users loaded but loading state stuck, fixing...');
      setIsUsersLoading(false);
    }
  }, [userList.length, isUsersLoading]);

  const handleOpenDefectHistory = async (defectId: string) => {
    setIsHistoryModalOpen(true);
    setIsHistoryLoading(true);
    setHistoryError(null);
    try {

      const defect = backendDefects.find(d => d.defectId === defectId);
      if (!defect) {
        setHistoryError('Defect not found');
        setViewingDefectHistory([]);
        return;
      }
      
      const data = await getDefectHistoryByDefectId(defect.id);
      setViewingDefectHistory(data);
    } catch (err: any) {
      setViewingDefectHistory([]);
      setHistoryError(err.message || 'Failed to fetch defect history');
    } finally {
      setIsHistoryLoading(false);
    }
  };

  // Add state for comments by defect
  const [commentsByDefectId, setCommentsByDefectId] = useState<Record<string, { text: string; timestamp: string; userId?: string | number }[]>>({});
  const [isCommentsModalOpen, setIsCommentsModalOpen] = useState(false);
  const [activeCommentsDefectId, setActiveCommentsDefectId] = useState<string | null>(null);
  const [newCommentText, setNewCommentText] = useState('');

  const [isCommentsLoading, setIsCommentsLoading] = useState(false);

  const handleOpenCommentsModal = async (defectId: string) => {
    setActiveCommentsDefectId(defectId);
    setIsCommentsModalOpen(true);
    setNewCommentText('');
    
    // Find the defect to get the numeric ID
    const defect = backendDefects.find(d => d.defectId === defectId);
    if (!defect) {
      showAlert('Defect not found for comments.');
      return;
    }
    
    setIsCommentsLoading(true);
    try {
      const response = await getCommentsByDefectId(defect.id);
      setCommentsByDefectId(prev => ({
        ...prev,
        [defectId]: (response.data || []).map((c: any) => ({
          text: c.comment,
          timestamp: c.createdTime, // Use correct field from API
          userId: c.userId,
        })),
      }));
    } catch (error: any) {
      showAlert(error.message || 'Failed to fetch comments');
      setCommentsByDefectId(prev => ({ ...prev, [defectId]: [] }));
    } finally {
      setIsCommentsLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (activeCommentsDefectId && newCommentText.trim() && user) {
      console.log('Current user object:', user);
      console.log('Active defect ID:', activeCommentsDefectId);
      
      // Find the defect to get the numeric ID
      const defect = backendDefects.find(d => d.defectId === activeCommentsDefectId);
      if (!defect) {
        showAlert('Defect not found for comment.');
        return;
      }
      console.log('Found defect:', defect);
      
      // Optimistically update UI
      setCommentsByDefectId(prev => {
        const prevComments = prev[activeCommentsDefectId] || [];
        return {
          ...prev,
          [activeCommentsDefectId]: [
            ...prevComments,
            { text: newCommentText, timestamp: new Date().toISOString(), userId: user.id },
          ],
        };
      });
      try {
        console.log('Creating comment with user ID:', user.id, 'and defect ID:', defect.id);
        await createComment({
          userId: user.id,
          defectId: defect.id,
          comment: newCommentText,
        });
        showAlert('Comment added successfully!');
        // Immediately fetch latest comments after posting
        const response = await getCommentsByDefectId(defect.id);
        setCommentsByDefectId(prev => ({
          ...prev,
          [activeCommentsDefectId]: (response.data || []).map((c: any) => ({
            text: c.comment,
            timestamp: c.createdTime,
            userId: c.userId,
          })),
        }));
      } catch (error: any) {
        console.error('Comment creation error:', error);
        showAlert(error.message || 'Failed to add comment');
      }
      setNewCommentText('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddComment();
    }
  };

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [defectsPerPage, setDefectsPerPage] = useState(10);
  const totalPages = Math.ceil(filteredDefects.length / defectsPerPage);

  // Reset to page 1 when filters or project change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedProjectId, filters]);

  // Clear filters when project changes
  useEffect(() => {
    if (selectedProjectId) {
      setFilters({
        id: "",
        module: [],
        subModule: [],
        type: [],
        severity: [],
        priority: [],
        status: [],
        releaseId: [],
        assignedTo: [],
        reportedBy: [],
        search: "",
      });
    }
  }, [selectedProjectId]);

  // Paginated defects
  const paginatedDefects = filteredDefects.slice(
    (currentPage - 1) * defectsPerPage,
    currentPage * defectsPerPage
  );

  // Add state for allocated users for the selected module
  const [allocatedUsers, setAllocatedUsers] = useState<{ userId: number; userName: string }[]>([]);
  const [isAllocatedUsersLoading, setIsAllocatedUsersLoading] = useState(false);

  // Fetch allocated users when moduleId or subModuleId changes in the form
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

        // Map the users to the expected format - prioritize full name format
        const mappedUsers = users.map((user: any) => ({
          userId: user.userId || user.id,
          userName: user.firstName && user.lastName
            ? `${user.firstName} ${user.lastName}`.trim()
            : (user.userName || user.name || 'Unknown User')
        })).filter((user: any) => user.userId && user.userName);

        setAllocatedUsers(mappedUsers);
      })
      .catch((error) => {
        console.error('Failed to fetch users by allocation:', error);
        setAllocatedUsers([]);
      })
      .finally(() => setIsAllocatedUsersLoading(false));
  }, [formData.moduleId, formData.subModuleId, selectedProjectId]);

  // Add state for AlertModal
  const [alert, setAlert] = useState<{ open: boolean; message: string }>({ open: false, message: '' });
  const showAlert = (message: string) => setAlert({ open: true, message });
  const closeAlert = () => setAlert({ open: false, message: '' });

  // Add state for defect severity summary from API
  const [defectSeveritySummary, setDefectSeveritySummary] = useState<any>(null);
  const [loadingSeveritySummary, setLoadingSeveritySummary] = useState(false);
  const [severitySummaryError, setSeveritySummaryError] = useState<string | null>(null);

  // Fetch defect severity summary when selectedProjectId changes (dynamic severities)
  useEffect(() => {
    if (!selectedProjectId) {
      setDefectSeveritySummary(null);
      return;
    }
    setLoadingSeveritySummary(true);
    setSeveritySummaryError(null);
    const numericProjectId = String(selectedProjectId).replace(/\D/g, '');
    getDefectSeveritySummary(numericProjectId)
      .then((apiData) => {
        const dynamicSummary: any = {};
        if (apiData && apiData.data) {
          if (typeof apiData.data.Remark === 'number') dynamicSummary.Remark = apiData.data.Remark;
          if (typeof apiData.data.TotalDefect === 'number') dynamicSummary.TotalDefect = apiData.data.TotalDefect;
          if (Array.isArray(apiData.data.defectSummary)) {
            apiData.data.defectSummary.forEach((item: any) => {
              const sevKey = String(item.severity || '').toLowerCase();
              const statusCounts: Record<string, number> = {};
              if (item.statuses && typeof item.statuses === 'object') {
                Object.entries(item.statuses).forEach(([status, val]: [string, any]) => {
                  const count = (val && typeof (val as any).count === 'number') ? (val as any).count : (typeof val === 'number' ? val : 0);
                  statusCounts[String(status).toLowerCase()] = count;
                });
              }
              dynamicSummary[sevKey] = {
                statusCounts,
                total: typeof item.total === 'number' ? item.total : (typeof item.totalDefects === 'number' ? item.totalDefects : 0),
                totalDefects: typeof item.totalDefects === 'number' ? item.totalDefects : 0,
                validDefects: typeof item.validDefects === 'number' ? item.validDefects : 0,
              };
            });
          }
        }
        setDefectSeveritySummary(dynamicSummary);
        setLoadingSeveritySummary(false);
      })
      .catch(() => {
        setSeveritySummaryError('Failed to load defect severity summary');
        setLoadingSeveritySummary(false);
      });
  }, [selectedProjectId]);

  // Add state for developers for the filter dropdown
  const [projectDevelopers, setProjectDevelopers] = useState<{ id: number; name: string; role?: string }[]>([]);

  // Fetch developers for the selected project for filter dropdown
  // useEffect(() => {
  //   if (!selectedProjectId) {
  //     setProjectDevelopers([]);
  //     return;
  //   }
  //   getDevelopersWithRolesByProjectId(Number(selectedProjectId))
  //     .then(data => {
  //       setProjectDevelopers(
  //         (Array.isArray(data) ? data : []).map(dev => ({
  //           id: dev.id,
  //           name: dev.name || `${dev.firstName ?? ''} ${dev.lastName ?? ''}`.trim(),
  //           role: dev.role
  //         }))
  //       );
  //     })
  //     .catch(() => setProjectDevelopers([]));
  // }, [selectedProjectId]);
useEffect(() => {
  if (!selectedProjectId) {
    setProjectDevelopers([]);
    return;
  }
  apiClient
    .get(`${import.meta.env.VITE_BASE_URL}projectAllocations/project/${selectedProjectId}`)
    .then(res => {
      try {
        const developers = (res.data.data || []).map((dev: any) => ({
          id: dev.userId, // Use userId for filtering
          name: dev.userFullName, // Use userFullName for display
        }));
        
        // Debug logging to identify duplicates
        console.log('Raw project developers data:', res.data.data);
        console.log('Processed developers:', developers);
        
        // Check for duplicates
        const duplicateIds = developers
          .map((dev: { id: number; name: string }) => dev.id)
          .filter((id: number, index: number, self: number[]) => self.indexOf(id) !== index);
        
        if (duplicateIds.length > 0) {
          console.log('Duplicate IDs found:', duplicateIds);
        }
        
        setProjectDevelopers(developers);
      } catch (error) {
        console.error('Error processing project developers data:', error);
        setProjectDevelopers([]);
      }
    })
    .catch((error) => {
      console.error('Error fetching project developers:', error);
      setProjectDevelopers([]);
    });
}, [selectedProjectId]);


  const [pieModal, setPieModal] = useState<{ open: boolean; severity: string | null }>({ open: false, severity: null });

  // For Add Defect modal: fetch only the active release for the selected project
  const [activeRelease, setActiveRelease] = React.useState<any>(null);
  React.useEffect(() => {
    if (!selectedProjectId) {
      setActiveRelease(null);
      return;
    }
    getActiveRelease(selectedProjectId)
      .then(res => {
        const active = res && res.data;
        setActiveRelease(active && active.status ? active : null);
      })
      .catch(() => setActiveRelease(null));
  }, [selectedProjectId]);
  const { user } = useAuth();

  const [commentsCountByDefectId, setCommentsCountByDefectId] = useState<Record<string, number>>({});

  // Fetch comments for visible defects (paginated) when defects change or page changes
  // useEffect(() => {
  //   const fetchAllComments = async () => {
  //     const updates: Record<string, { text: string; timestamp: string }[]> = {};
  //     const countUpdates: Record<string, number> = {};
  //     await Promise.all(
  //       paginatedDefects.map(async (defect) => {
  //         try {
  //           const response = await getCommentsByDefectId(defect.id);
  //           updates[defect.defectId] = (response.data || []).map((c: any) => ({
  //             text: c.comment,
  //             timestamp: c.createdAt,
  //           }));
  //           countUpdates[defect.defectId] = response.data ? response.data.length : 0;
  //         } catch {
  //           updates[defect.defectId] = [];
  //           countUpdates[defect.defectId] = 0;
  //         }
  //       })
  //     );
  //     setCommentsByDefectId((prev) => ({ ...prev, ...updates }));
  //     setCommentsCountByDefectId((prev) => ({ ...prev, ...countUpdates }));
  //   };
  //   if (paginatedDefects.length > 0) {
  //     fetchAllComments();
  //   }
  // }, [paginatedDefects]);

  return (
    <>
      <style>
        {`
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
        `}
      </style>
      <div className="max-w-6xl mx-auto">

      {/* Project Selection Panel */}
      <ProjectSelector
        projects={projects}
        selectedProjectId={selectedProjectId}
        onSelect={handleProjectSelect}
      />

      {/* Defect Severity Breakdown */}
      <div className="mb-8 mt-4">
        <div className="flex items-center mb-3 gap-4">
          <h2 className="text-lg font-semibold text-gray-700">Defect Severity Breakdown</h2>
          {/* Show total remark and total defect from backend summary */}
          {defectSeveritySummary && (
            <div className="flex items-center gap-3">
              <span className="text-base font-bold text-blue-500 border border-blue-400 rounded-lg px-3 py-1 bg-blue-50 shadow-sm" style={{ boxShadow: '0 1px 4px 0 rgba(59,130,246,0.07)' }}>
                Total Remark : {defectSeveritySummary.Remark || 0}
              </span>
              <span className="text-base font-bold text-red-500 border border-red-400 rounded-lg px-3 py-1 bg-red-50 shadow-sm" style={{ boxShadow: '0 1px 4px 0 rgba(239,68,68,0.07)' }}>
                Total Defect : {defectSeveritySummary.TotalDefect || 0}
              </span>
            </div>
          )}
        </div>
        {(loadingSeveritySummary || isStatusLoading) && <div className="text-gray-500 p-4">Loading...</div>}
        {(severitySummaryError || statusError) && <div className="text-red-500 p-4">{severitySummaryError || statusError}</div>}
        {!loadingSeveritySummary && !isStatusLoading && !severitySummaryError && !statusError && defectSeveritySummary && defectStatuses.length > 0 && (
          <div className="relative flex items-center">
            <button
              onClick={() => {
                const container = document.getElementById('defects-severity-scroll');
                if (container) container.scrollLeft -= 300;
              }}
              className="flex-shrink-0 z-10 bg-white shadow-md rounded-full p-1 hover:bg-gray-50 mr-2"
              type="button"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div
              id="defects-severity-scroll"
              className="flex space-x-6 overflow-x-auto pb-2 scroll-smooth flex-1 scrollbar-hide"
              style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                maxWidth: '100%'
              }}
            >
            {(() => {
              const severityKeys = Object.keys(defectSeveritySummary).filter((key) => {
                const v = defectSeveritySummary[key];
                return v && typeof v === 'object' && 'statusCounts' in v;
              });
              const severityOrder: Record<string, number> = { critical: 3, high: 2, medium: 1, low: 0 };
              severityKeys.sort((a, b) => (severityOrder[b] ?? -1) - (severityOrder[a] ?? -1));
              return severityKeys.map((severity) => {
                const severityLabel = `Defects on ${severity.charAt(0).toUpperCase() + severity.slice(1)}`;
                const severityData = severities.find(s => s.name.toLowerCase() === severity);
                const severityColor = severityData?.color || '#6B7280';
                const hexColor = severityColor.startsWith('#') ? severityColor : `#${severityColor}`;

                const statusList = defectStatuses.map((s) => s.defectStatusName.toLowerCase());
                const statusColorMap: Record<string, string> = Object.fromEntries(defectStatuses.map((s) => [s.defectStatusName.toLowerCase(), s.colorCode]));
                const summary = defectSeveritySummary[severity] || { statusCounts: {}, total: 0 };
                const statusCounts = statusList.map((status) => summary.statusCounts?.[status] || 0);
                const half = Math.ceil(statusList.length / 2);
                const leftStatuses = statusList.slice(0, half);
                const rightStatuses = statusList.slice(half);
                return (
                  <div
                    key={severity}
                    className={`bg-white rounded-xl shadow flex flex-col justify-between min-h-[200px] min-w-[300px] border border-gray-200 border-l-8`}
                    style={{ borderLeftColor: hexColor }}
                  >
                    <div className="px-6 pt-4 pb-1">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-base" style={{ color: hexColor }}>{severityLabel}</span>
                        <span className="font-semibold text-gray-600 text-base"></span>
                      </div>
                      {/* Removed Total Remark count from severity box, only show Total Defect for this severity */}
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
                          Total Defect: {summary.validDefects || 0}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-row gap-8 px-6 pb-1">
                      <div className="flex flex-col gap-1">
                        {leftStatuses.map((status, idx) => (
                          <div key={status} className="flex items-center gap-2 text-xs">
                            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: statusColorMap[status] }}></span>
                            <span className="text-gray-700 font-normal">{defectStatuses[idx].defectStatusName}</span>
                            <span className="text-gray-700 font-medium">{statusCounts[idx]}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex flex-col gap-1">
                        {rightStatuses.map((status, idx) => (
                          <div key={status} className="flex items-center gap-2 text-xs">
                            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: statusColorMap[status] }}></span>
                            <span className="text-gray-700 font-normal">{defectStatuses[half + idx]?.defectStatusName}</span>
                            <span className="text-gray-700 font-medium">{statusCounts[half + idx]}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="px-6 pb-3">
                      <button
                        className="mt-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-md font-medium text-xs border border-blue-100 hover:bg-blue-100 transition"
                        onClick={() => setPieModal({ open: true, severity })}
                      >
                        View Chart
                      </button>
                    </div>
                  </div>
                );
              });
            })()}
            </div>
            <button
              onClick={() => {
                const container = document.getElementById('defects-severity-scroll');
                if (container) container.scrollLeft += 300;
              }}
              className="flex-shrink-0 z-10 bg-white shadow-md rounded-full p-1 hover:bg-gray-50 ml-2"
              type="button"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        )}

        {/* Pie Chart Modal for Defect Severity Breakdown */}
        {pieModal.open && pieModal.severity && (() => {
          const severity = pieModal.severity;
          const statusList = defectStatuses.map(s => (s.defectStatusName || '').toLowerCase());
          const statusColorMap = Object.fromEntries(defectStatuses.map(s => [(s.defectStatusName || '').toLowerCase(), s.colorCode]));
          const summary = defectSeveritySummary[severity] || { statusCounts: {}, total: 0 };
          const statusCounts = statusList.map(status => summary.statusCounts?.[status] || 0);
          const pieData = {
            labels: statusList.map(s => s.toUpperCase()),
            datasets: [
              {
                data: statusCounts,
                backgroundColor: statusList.map(s => statusColorMap[s] || '#ccc'),
              },
            ],
          };
          return (
            <Modal isOpen={pieModal.open} onClose={() => setPieModal({ open: false, severity: null })} title={`Status Breakdown for ${severity.charAt(0).toUpperCase() + severity.slice(1)}`}>
              <div className="flex flex-col items-center justify-center p-4">
                <div className="w-64 h-64">
                  <ChartJSPie data={pieData} options={{ plugins: { legend: { display: true, position: 'bottom' } } }} />
                </div>
              </div>
            </Modal>
          );
        })()}
      </div>

      {/* Header Row with Import/Export/Add Defect Buttons */}
      <div className="flex justify-between items-center m-4">
        <h1 className="text-2xl font-bold text-gray-900">Defects</h1>
        <div className="flex gap-2">
          <button
            type="button"
            className="flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded shadow"
            onClick={() => fileInputRef.current?.click()}
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4"
              />
            </svg>
            Import from Excel
          </button>
          <input
            type="file"
            accept=".xlsx,.csv"
            onChange={handleImportExcel}
            ref={fileInputRef}
            className="hidden"
          />
          <button
            type="button"
            className="flex items-center px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded shadow"
            onClick={handleExportExcel}
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4v16m8-8H4"
              />
            </svg>
            Export to Excel
          </button>
          <Button onClick={() => setIsModalOpen(true)} icon={Plus}>
            Add Defect
          </Button>
        </div>
      </div>

      {/* Filter Row - compact, scrollable, and responsive design */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 mb-6">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-gray-700">Filters</h3>
          </div>
          <button
            onClick={() => setFilters({
              id: "",
              module: [],
              subModule: [],
              type: [],
              severity: [],
              priority: [],
              status: [],
              releaseId: [],
              assignedTo: [],
              reportedBy: [],
              search: "",
            })}
            className="text-xs px-2 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors"
          >
            Clear All Filters
          </button>
        </div>
        <div className="flex flex-nowrap overflow-x-auto gap-2 hide-scrollbar h-24">
          <div className="min-w-[200px] flex-shrink-0">
            <label className="block text-xs font-medium text-gray-500 mb-0.5" title="Search in defect ID, description, and steps">
              Search
            </label>
            <Input
              placeholder="Search..."
              value={filters.search}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
              className="w-full h-6 text-xs"
            />
          </div>
          <div className="min-w-[140px] flex-shrink-0">
            <label className="block text-xs font-medium text-gray-500 mb-0.5" title="Filter by project module">
              Module
            </label>
            <SearchableMultiSelect
              options={[
                ...modules.map((m) => ({
                  value: m.name,
                  label: m.name
                }))
              ]}
              selectedValues={filters.module}
              onChange={(values) => setFilters(f => ({ ...f, module: values, subModule: [] }))}
              placeholder="All"
              className="h-6 text-xs"
            />
          </div>
          <div className="min-w-[140px] flex-shrink-0">
            <label className="block text-xs font-medium text-gray-500 mb-0.5">
              Submodule {filterSubmodules.length > 0 && `(${filterSubmodules.length} available)`}
            </label>
            <SearchableMultiSelect
              options={[
                ...filterSubmodules.map((sm) => ({
                  value: sm.name,
                  label: `${sm.name}${sm.moduleName ? ` (${sm.moduleName})` : ''}` // Show which module each submodule belongs to
                }))
              ]}
              selectedValues={filters.subModule}
              onChange={(values) => {
                console.log('🔄 Submodule filter changed to:', values);
                console.log('📊 Available submodules:', filterSubmodules.map(sm => `${sm.name} (${sm.moduleName})`));
                setFilters(f => ({ ...f, subModule: values }));
              }}
              placeholder={!filters.module.length ? "Select modules first" : filterSubmodules.length === 0 ? "No submodules" : "All"}
              className="h-6 text-xs"
              disabled={!filters.module.length}
            />
          </div>
          <div className="min-w-[120px] flex-shrink-0">
            <label className="block text-xs font-medium text-gray-500 mb-0.5" title="Filter by defect type (e.g., Bug, Feature, etc.)">
              Type
            </label>
            <SearchableMultiSelect
              options={[
                ...defectTypes.map((t) => ({
                  value: t.defectTypeName,
                  label: t.defectTypeName
                }))
              ]}
              selectedValues={filters.type}
              onChange={(values) => setFilters(f => ({ ...f, type: values }))}
              placeholder="All"
              className="h-6 text-xs"
            />
          </div>
          <div className="min-w-[120px] flex-shrink-0">
            <label className="block text-xs font-medium text-gray-500 mb-0.5" title="Filter by defect severity (High, Medium, Low)">
              Severity
            </label>
            <SearchableMultiSelect
              options={[
                ...severities.map((s) => ({
                  value: s.name,
                  label: s.name
                }))
              ]}
              selectedValues={filters.severity}
              onChange={(values) => setFilters(f => ({ ...f, severity: values }))}
              placeholder="All"
              className="h-6 text-xs"
            />
          </div>
          <div className="min-w-[120px] flex-shrink-0">
            <label className="block text-xs font-medium text-gray-500 mb-0.5" title="Filter by defect priority (High, Medium, Low)">
              Priority
            </label>
            <SearchableMultiSelect
              options={[
                ...priorities.map((priority) => ({
                  value: priority.priority,
                  label: priority.priority
                }))
              ]}
              selectedValues={filters.priority}
              onChange={(values) => setFilters(f => ({ ...f, priority: values }))}
              placeholder="All"
              className="h-6 text-xs"
            />
          </div>
          <div className="min-w-[140px] flex-shrink-0">
            <label className="block text-xs font-medium text-gray-500 mb-0.5">
              Release
            </label>
            <SearchableMultiSelect
              options={[
                ...releasesData.map(release => ({
                  value: release.id.toString(),
                  label: release.releaseName
                }))
              ]}
              selectedValues={filters.releaseId}
              onChange={(values) => setFilters(f => ({ ...f, releaseId: values }))}
              placeholder="All"
              className="h-6 text-xs"
            />
          </div>
          <div className="min-w-[120px] flex-shrink-0">
            <label className="block text-xs font-medium text-gray-500 mb-0.5" title="Filter by defect status (Open, In Progress, Closed, etc.)">
              Status
            </label>
            <MultiSelect
              options={isStatusLoading ? [] : statusError ? [] : defectStatuses.map(s => ({ value: s.defectStatusName, label: s.defectStatusName }))}
              selectedValues={filters.status}
              onChange={(values) => setFilters(f => ({ ...f, status: values }))}
              placeholder={isStatusLoading ? "Loading..." : statusError ? "Error loading statuses" : "All"}
              className="text-xs"
              disabled={isStatusLoading || !!statusError}
            />
          </div>
          <div className="min-w-[140px] flex-shrink-0">
            <label className="block text-xs font-medium text-gray-500 mb-0.5" title="Filter by assigned developer">
              Assigned To
            </label>
            <SearchableMultiSelect
              options={[
                ...projectDevelopers
                  .filter((dev: { id: number; name: string; role?: string }, index: number, self: { id: number; name: string; role?: string }[]) => {
                    // Remove duplicates based on ID first
                    const firstIndexById = self.findIndex(d => d.id === dev.id);
                    if (index !== firstIndexById) return false;
                    
                    // If same ID, also check by name to be extra safe
                    const firstIndexByName = self.findIndex(d => d.name === dev.name);
                    return index === firstIndexByName;
                  })
                  .map((dev) => ({
                    value: dev.id.toString(),
                    label: dev.role ? `${dev.name} (${dev.role})` : dev.name
                  }))
              ]}
              selectedValues={filters.assignedTo}
              onChange={(values) => setFilters(f => ({ ...f, assignedTo: values }))}
              placeholder="All"
              className="h-6 text-xs"
            />
          </div>
          <div className="min-w-[140px] flex-shrink-0">
            <label className="block text-xs font-medium text-gray-500 mb-0.5">
              Entered By
            </label>
            <SearchableMultiSelect
              options={[
                ...userList.map((user) => ({
                  value: `${user.firstName} ${user.lastName}`,
                  label: `${user.firstName} ${user.lastName}`
                }))
              ]}
              selectedValues={filters.reportedBy}
              onChange={(values) => {
                console.log('Entered By changed to:', values);
                setFilters(f => ({ ...f, reportedBy: values }));
              }}
              placeholder={isUsersLoading ? "Loading..." : "All"}
              disabled={isUsersLoading}
              className="h-6 text-xs"
            />
          </div>
        </div>
      </div>

  {/* ...existing code... */}

      {/* Results Summary */}
      {(filteredDefects.length > 0 || backendDefects.length > 0 || isLoading) && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="text-sm text-blue-700">
              {isLoading ? (
                <span className="font-medium flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700 mr-2"></div>
                  Loading Remarks...
                </span>
              ) : (
                <span className="font-medium">
                  {filteredDefects.length} remark{filteredDefects.length !== 1 ? 's' : ''} found
                </span>
              )}

            </div>
            {!isLoading && filteredDefects.length !== backendDefects.length && (
              <div className="text-xs text-blue-600">
                {backendDefects.length} total defects in project
              </div>
            )}
          </div>
        </div>
      )}

      {/* Defect Table in a single frame with search/filter in one line */}
      <Card>
        <CardContent className="p-0">

                      {filteredDefects.length === 0 && backendDefects.length === 0 && (
              <div className="flex items-center justify-center py-8">
                <div className="text-center text-gray-500">
                  <div className="text-lg font-medium mb-2">No defects found</div>
                  <div className="text-sm">Try adjusting your filters or search criteria</div>
                </div>
              </div>
            )}
            {filteredDefects.length === 0 && backendDefects.length > 0 && (
              <div className="flex items-center justify-center py-8">
                <div className="text-center text-gray-500">
                  <div className="text-lg font-medium mb-2">No defects match your filters</div>
                  <div className="text-sm">Try adjusting your filter criteria</div>
                </div>
              </div>
            )}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 whitespace-nowrap">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 z-20 bg-gray-50" style={{ minWidth: 120 }}>
                    Defect ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-[120px] z-20 bg-gray-50" style={{ minWidth: 220 }}>
                    Brief Description
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Steps
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Attachment
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Module
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submodule
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Severity
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    History
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned To</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entered By</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Release</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredDefects.length > 0 ? (
                  paginatedDefects.map((defect) => (
                    <tr
                      key={defect.defectId}
                      ref={
                        highlightId === defect.defectId
                          ? highlightedRowRef
                          : undefined
                      }
                      className={`border-b border-gray-200 hover:bg-gray-50 ${highlightId === defect.defectId ? "border-2 border-blue-500" : ""}`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 sticky left-0 z-10 bg-white border-r border-gray-200" style={{ minWidth: 120 }}>
                        {defect.defectId}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 sticky left-[120px] z-10 bg-white border-r border-gray-200" style={{ minWidth: 220, maxWidth: 220 }}>
                        <div
                          className="break-words overflow-hidden"
                          style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical',
                            lineHeight: '1.4',
                            maxHeight: '4.2em' // 3 lines * 1.4 line-height
                          }}
                          title={defect.description} // Show full text on hover
                        >
                          {defect.description}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-blue-600 cursor-pointer">
                        <button
                          type="button"
                          className="flex items-center space-x-1 hover:underline"
                          onClick={() => {
                            setViewingSteps(defect.steps);
                            setIsViewStepsModalOpen(true);
                          }}
                          title="View Steps"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          <span>View</span>
                        </button>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {defect.attachment ? (
                          <button
                            type="button"
                            onClick={() => handleViewAttachment(defect.attachment)}
                            className="text-blue-600 hover:text-blue-800 underline bg-transparent border-none cursor-pointer"
                          >
                            View Attachment
                          </button>
                        ) : (
                          <span className="text-gray-400">No attachment</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {defect.module_name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {defect.sub_module_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {defect.defect_type_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {renderColoredSpan(defect.severity_name, getSeverityColor(defect.severity_name))}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {renderColoredSpan(defect.priority_name, getPriorityColor(defect.priority_name))}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap w-32">
                        <div className="flex flex-col items-center gap-1">
                          {renderColoredSpan(defect.defect_status_name, getStatusColor(defect.defect_status_name))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                        <button
                          type="button"
                          className="text-blue-600 hover:text-blue-900 p-1"
                          title="View defect history"
                          onClick={() => handleOpenDefectHistory(defect.defectId)}
                        >
                          <History className="h-5 w-5 inline" />
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {defect.assigned_to_name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {defect.assigned_by_name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {((defect as any).release_name?.toString() || releaseMap[(defect as any).releaseId || ''] || '-')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="text-blue-600 hover:text-blue-900 flex items-center"
                            title="View Defect Details"
                            onClick={() => {
                              setViewingDefectDetails({
                                defectId: defect.defectId,
                                description: defect.description,
                                steps: defect.steps,
                                module: defect.module_name,
                                submodule: defect.sub_module_name,
                                type: defect.defect_type_name,
                                severity: defect.severity_name,
                                priority: defect.priority_name,
                                status: defect.defect_status_name,
                                assignedTo: defect.assigned_to_name,
                                enteredBy: defect.assigned_by_name,
                                release: (defect as any).release_name?.toString() || releaseMap[(defect as any).releaseId || ''] || '-',
                                attachment: defect.attachment
                              });
                              setIsViewDefectDetailsModalOpen(true);
                            }}
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            className="text-green-600 hover:text-green-900 flex items-center"
                            title="Edit Defect"
                            onClick={() => handleEdit(defect)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            className="text-red-600 hover:text-red-900 flex items-center"
                            title="Delete Defect"
                            onClick={() => handleDelete(defect.defectId)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            className="relative text-blue-600 hover:text-blue-800 flex items-center"
                            title="Comments"
                            onClick={() => handleOpenCommentsModal(defect.defectId)}
                          >
                            <MessageSquare className="w-5 h-5" />
                            {commentsCountByDefectId[defect.defectId] ? (
                              <span className="ml-1 text-xs text-gray-500">{commentsCountByDefectId[defect.defectId]}</span>
                            ) : null}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} className="p-12 text-center text-gray-500">
                      <CheckCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <div className="text-lg font-medium text-gray-900 mb-2">
                        No defects found
                      </div>
                      <div className="text-gray-500 mb-4">
                        No defects have been reported for this project
                      </div>
                      <Button onClick={() => setIsModalOpen(true)} icon={Plus}>
                        Add Defect
                      </Button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination Controls */}
          <div
            className="sticky bottom-0 left-0 w-full bg-white border-t z-10"
            style={{ boxShadow: '0 -2px 8px rgba(0,0,0,0.04)' }}
          >
            <div className="flex items-center justify-between px-4 py-4">
              {/* Rows per page dropdown - positioned on the left */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">Rows per page:</span>
                <select
                  value={defectsPerPage}
                  onChange={(e) => {
                    setDefectsPerPage(Number(e.target.value));
                    setCurrentPage(1); // Reset to first page when changing rows per page
                  }}
                  className="border border-gray-300 rounded px-2 py-1 text-sm"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              {/* Pagination controls - centered */}
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              {/* Page number range */}
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => {
                // Show first, last, current, and neighbors; collapse others with ...
                const isCurrent = pageNum === currentPage;
                const isEdge = pageNum === 1 || pageNum === totalPages;
                const isNear = Math.abs(pageNum - currentPage) <= 1;
                if (isEdge || isNear) {
                  return (
                    <button
                      key={pageNum}
                      className={`px-2 py-1 rounded text-sm font-medium ${isCurrent ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-blue-100'}`}
                      onClick={() => setCurrentPage(pageNum)}
                      disabled={isCurrent}
                      style={{ minWidth: 32 }}
                    >
                      {pageNum}
                    </button>
                  );
                }
                // Show ... after first and before last if needed
                if (pageNum === 2 && currentPage > 3) {
                  return <span key="start-ellipsis" className="px-2">...</span>;
                }
                if (pageNum === totalPages - 1 && currentPage < totalPages - 2) {
                  return <span key="end-ellipsis" className="px-2">...</span>;
                }
                return null;
              })}
              <Button
                type="button"
                variant="secondary"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              {/* Page number input */}
                </div>
              )}

              {/* Go to Page - Right corner */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">Go to</span>
                <input
                  type="text"
                  defaultValue={currentPage}
                  onInput={(e) => {
                    const target = e.target as HTMLInputElement;
                    const val = target.value;
                    // Only allow digits
                    target.value = val.replace(/[^0-9]/g, '');
                  }}
                  onBlur={(e) => {
                    const val = e.target.value;
                    let numVal = Number(val);

                    if (val === '' || isNaN(numVal) || numVal < 1) {
                      numVal = 1;
                    } else if (numVal > totalPages) {
                      numVal = totalPages;
                    }

                    setCurrentPage(numVal);
                    e.target.value = numVal.toString();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.currentTarget.blur();
                    }
                  }}
                  placeholder="1"
                  className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <span className="text-sm text-gray-700">/ {totalPages}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal for Add/Edit Defect */}
      <Modal
        isOpen={isModalOpen}
        onClose={resetForm}
        title={editingDefect ? "Edit Defect" : "Add New Defect"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Brief Description */}
          <Input
            label="Brief Description"
            value={formData.description}
            onChange={e => handleInputChange("description", e.target.value)}
            required
          />
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
          {/* Attachment Image */}
          <ImagePicker
            label="Attachment Image"
            value={(formData as any).attachmentFile || null}
            existingAttachment={editingDefect ? formData.attachment : null}
            isEditing={!!editingDefect}
            onChange={(file) => {
              if (file === null) {
                setFormData((prev: any) => ({ ...prev, attachmentFile: null, attachment: '' }));
              } else {
                setFormData((prev: any) => ({ ...prev, attachmentFile: file }));
              }
            }}
          />

          {/* Test Case Required Toggle - Only show for Add Defect */}
          {!editingDefect && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Test Case Required
              </label>
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => handleInputChange('testCaseRequired', 'true')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    formData.testCaseRequired
                      ? 'bg-green-600 text-white shadow-md'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => handleInputChange('testCaseRequired', 'false')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    !formData.testCaseRequired
                      ? 'bg-red-600 text-white shadow-md'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  No
                </button>
              </div>
            </div>
          )}

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
              <option value="">Select module</option>
              {modules.map(module => (
        <option key={`module-${module.id}`} value={module.id}>{module.name}</option>
              ))}
            </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Submodules
              </label>
              {submoduleError && (
                <div className="mb-2 text-red-600 text-sm">{submoduleError}</div>
              )}
              <select
                value={formData.subModuleId}
                onChange={e => setFormData(f => ({ ...f, subModuleId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={!formData.moduleId}
              >
                <option value="">
                  {submodules.length === 0
                    ? "No submodules"
                    : "Select submodule"}
                </option>
                {/* {submodules.map((submodule) => (
                  <option key={submodule.id} value={submodule.id}>
                    {submodule.name}
                  </option>
                ))} */}
                {submodules.map(submodule => (
                  <option key={`submodule-${submodule.id}`} value={submodule.id}>{submodule.name}</option>
                ))}
              </select>
            </div>
          </div>
          {/* Severity, Priority, Type, Status */}
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
              //nilux
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
            {/* Found in Release and Priority side by side */}




            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Found in Release <span className="text-gray-400">()</span>
              </label>
              {editingDefect ? (
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                  value={
                    releasesData.find(r => r.id === String(formData.releaseId))?.releaseName ||
                    (editingDefect as any).release_name?.toString() ||
                    '-'
                  }
                  readOnly
                  disabled
                />
              ) : (
                <select
                  value={formData.releaseId}
                  onChange={e => handleInputChange('releaseId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select release (optional)</option>
                  {activeRelease && (
                    <option key={activeRelease.id} value={activeRelease.id}>{activeRelease.releaseName}</option>
                  )}
                </select>
              )}
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
                {/* {priorities.map(p => (
                  <option key={p.id} value={p.id.toString()}>{p.priority}</option>
                ))} */}
                {priorities.map((p, index) => (
                  <option key={`${p.id}-${index}`} value={p.id.toString()}>{p.priority}</option>
                ))}

              </select>
            </div>
            {/* Assigned To for Add Defect */}
            {!editingDefect && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assigned To
                </label>
                <select
                  value={formData.assigntoId}
                  onChange={e => handleInputChange('assigntoId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isAllocatedUsersLoading || !formData.moduleId}
                >
                  <option value="">
                    {isAllocatedUsersLoading ? "Loading users..." : allocatedUsers.length === 0 ? " available users for this module" : "Select assignee"}
                  </option>
                  {/* {allocatedUsers.map(user => (
                    <option key={user.userId} value={user.userId.toString()}>{user.userName}</option>
                  ))} */}
                  {allocatedUsers.map(user => (
                    <option key={`user-${user.userId}`} value={user.userId.toString()}>{user.userName}</option>
                  ))}
                </select>
              </div>
            )}
            {editingDefect && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Status
                  </label>
                  {/* Show current status as read-only */}
                  {originalStatusId && (
                    <div className="mb-3 p-3 bg-blue-50 rounded-md border border-blue-200">
                      <div className="flex items-center text-sm">
                        <div
                          className="w-4 h-4 rounded-full mr-3"
                          style={{ backgroundColor: defectStatuses.find(s => s.id.toString() === originalStatusId)?.colorCode || '#gray' }}
                        />
                        <span className="font-medium text-blue-800">
                          {defectStatuses.find(s => s.id.toString() === originalStatusId)?.defectStatusName}
                        </span>
                        <span className="ml-2 text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">Current</span>
                      </div>
                    </div>
                  )}

                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Change Status To {isNextStatusLoading && <span className="text-sm text-gray-500">(Loading...)</span>}
                  </label>
                  <select
                    value={selectedNextStatusId}
                    onChange={e => handleInputChange('statusId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={isNextStatusLoading}
                  >
                    <option value="">Keep current status</option>
                    {/* Show next available statuses */}
                    {nextStatuses.map((s, index) => (
                      <option key={`next-${s.id}-${index}`} value={s.id}>
                        {s.defectStatusName}
                      </option>
                    ))}
                  </select>

                  {/* Show selected status preview */}
                  {selectedNextStatusId && (
                    <div className="mt-2 p-2 bg-green-50 rounded-md border border-green-200">
                      <div className="flex items-center text-sm">
                        <div
                          className="w-3 h-3 rounded-full mr-2"
                          style={{ backgroundColor: nextStatuses.find(s => s.id.toString() === selectedNextStatusId)?.colorCode || '#gray' }}
                        />
                        <span className="font-medium text-green-800">Will change to: </span>
                        <span className="text-green-700">
                          {nextStatuses.find(s => s.id.toString() === selectedNextStatusId)?.defectStatusName}
                        </span>
                      </div>
                    </div>
                  )}

                  {nextStatusError && (
                    <p className="text-sm text-red-600 mt-1">
                      {nextStatusError}
                    </p>
                  )}
                  {nextStatuses.length === 0 && !isNextStatusLoading && !nextStatusError && originalStatusId && (
                    <p className="text-sm text-gray-500 mt-1">
                      No next statuses available. This may be a terminal status.
                    </p>
                  )}
                  {nextStatuses.length > 0 && (
                    <div className="mt-1">
                      <p className="text-sm text-blue-600">
                        {nextStatuses.length} status transition{nextStatuses.length > 1 ? 's' : ''} available
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        You can switch between statuses multiple times before saving. The current status will only change when you save the form.
                      </p>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reassign
                  </label>
                  <select
                    value={formData.assigntoId}
                    onChange={e => handleInputChange('assigntoId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={isAllocatedUsersLoading || !formData.moduleId}
                  >
                    <option value="">
                      {isAllocatedUsersLoading ? "Loading users..." :
                       allocatedUsers.length === 0 ? "No users available for this module" :
                       (editingDefect && editingDefect.assigned_to_name && !formData.assigntoId ?
                        editingDefect.assigned_to_name :
                        "Select assignee")}
                    </option>
                    {/* {allocatedUsers.map(user => (
                      <option key={user.userId} value={user.userId.toString()}>{user.userName}</option>
                    ))} */}
                      {allocatedUsers.map((user, idx) => (
                      <option key={`${user.userId}-${idx}`} value={user.userId.toString()}>
                        {user.userName}
                      </option>
                    ))}

                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Entered By</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                    value={editingDefect?.assigned_by_name || '-'}
                    readOnly
                    disabled
                  />
                </div>
              </>
            )}
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="secondary" onClick={resetForm}>
              Cancel
            </Button>
            <Button type="submit">
              {editingDefect ? "Save Changes" : "Submit"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal for viewing steps only */}
      <Modal
        isOpen={isViewStepsModalOpen}
        onClose={() => setIsViewStepsModalOpen(false)}
        title="Steps"
        size="md"
      >
        <div className="overflow-x-auto">
          {viewingSteps ? (
            <div className="whitespace-pre-line text-gray-700 p-4 bg-gray-50 rounded-lg">
              {viewingSteps}
            </div>
          ) : (
            <div className="text-gray-500 text-center py-8">
              No steps provided
            </div>
          )}
        </div>
        <div className="flex justify-end pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setIsViewStepsModalOpen(false)}
          >
            Close
          </Button>
        </div>
      </Modal>

      {/* Modal for viewing defect details */}
      <Modal
        isOpen={isViewDefectDetailsModalOpen}
        onClose={() => setIsViewDefectDetailsModalOpen(false)}
        title="Defect Details"
        size="lg"
      >
        <div className="overflow-x-auto">
          {viewingDefectDetails && (
            <table className="min-w-full divide-y divide-gray-200">
              <tbody className="bg-white divide-y divide-gray-200">
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 w-1/3">Defect ID</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{viewingDefectDetails.defectId}</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Description</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{viewingDefectDetails.description}</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Steps</td>
                  <td className="px-6 py-4 text-sm text-gray-700 whitespace-pre-line">{viewingDefectDetails.steps || 'No steps provided'}</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Module</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{viewingDefectDetails.module}</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Submodule</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{viewingDefectDetails.submodule}</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Type</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{viewingDefectDetails.type}</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Severity</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {renderColoredSpan(viewingDefectDetails.severity, getSeverityColor(viewingDefectDetails.severity))}
                  </td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Priority</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {renderColoredSpan(viewingDefectDetails.priority, getPriorityColor(viewingDefectDetails.priority))}
                  </td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Status</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {renderColoredSpan(viewingDefectDetails.status, getStatusColor(viewingDefectDetails.status))}
                  </td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Assigned To</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{viewingDefectDetails.assignedTo || '-'}</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Entered By</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{viewingDefectDetails.enteredBy || '-'}</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Release</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{viewingDefectDetails.release}</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Attachment</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {viewingDefectDetails.attachment ? (
                      <button
                        type="button"
                        onClick={() => handleViewAttachment(viewingDefectDetails.attachment)}
                        className="text-blue-600 hover:text-blue-800 underline bg-transparent border-none cursor-pointer"
                      >
                        View Attachment
                      </button>
                    ) : (
                      <span className="text-gray-400">No attachment</span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
        <div className="flex justify-end pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setIsViewDefectDetailsModalOpen(false)}
          >
            Close
          </Button>
        </div>
      </Modal>

      {/* Modal for viewing and editing rejection comment */}
      <Modal
        isOpen={isRejectionCommentModalOpen}
        onClose={() => {
          setIsRejectionCommentModalOpen(false);
          setIsEditingRejectionComment(false);
        }}
        title="Rejection Comment"
        size="md"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Rejection Comment</label>
          {!isEditingRejectionComment ? (
            <div className="flex items-center gap-2">
              <span className="text-gray-800 text-base whitespace-pre-line flex-1">{statusEditComment || <span className="italic text-gray-400">No comment</span>}</span>
              <Button type="button" size="sm" variant="secondary" onClick={() => setIsEditingRejectionComment(true)}>
                Edit
              </Button>
            </div>
          ) : (
            <form
              onSubmit={e => {
                e.preventDefault();
                if (!editingStatusId) return setIsRejectionCommentModalOpen(false);
                const defect = backendDefects.find(d => d.defectId === editingStatusId) as FilteredDefect;
                if (!defect) return setIsRejectionCommentModalOpen(false);
                // For now, just close the modal since updateDefect doesn't work with the new structure
                setIsEditingRejectionComment(false);
                setIsRejectionCommentModalOpen(false);
              }}
            >
              <Input
                value={statusEditComment}
                onChange={e => setStatusEditComment(e.target.value)}
                placeholder="Enter reason for rejection"
                required
              />
              <div className="flex justify-end pt-4 gap-2">
                <Button type="button" variant="secondary" onClick={() => setIsEditingRejectionComment(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  Save
                </Button>
              </div>
            </form>
          )}
        </div>
      </Modal>

      {/* Modal for viewing defect history */}
      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        title="Defect History"
        size="xl"
      >
        <div className="flex flex-col items-center w-full max-w-4xl mx-auto">
          {isHistoryLoading ? (
            <div className="text-gray-500">Loading history...</div>
          ) : historyError ? (
            <div className="text-red-500">{historyError}</div>
          ) : !Array.isArray(viewingDefectHistory) || viewingDefectHistory.length === 0 ? (
            <div className="text-gray-500">No history available.</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Assigned By</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Assigned To</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Previous Status</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Current Status</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Release</th>
                  <th className='px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase'>EditBy</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {/* {Array.isArray(viewingDefectHistory) && viewingDefectHistory.map((entry, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-2 text-sm text-gray-700">{entry.assignedByName}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{entry.assignedToName}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{entry.defectDate}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{entry.defectTime}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{entry.previousStatus}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{entry.defectStatus}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{entry.releaseName}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{entry.createdBy}</td>
                  </tr>
                ))} */}
                {Array.isArray(viewingDefectHistory) && viewingDefectHistory.map((entry, idx) => (
                <tr key={`history-${entry.defectDate}-${entry.defectTime}-${idx}`}>
                  <td className="px-4 py-2 text-sm text-gray-700">{entry.assignedByName}</td>
                  <td className="px-4 py-2 text-sm text-gray-700">{entry.assignedToName}</td>
                  <td className="px-4 py-2 text-sm text-gray-700">{entry.defectDate}</td>
                  <td className="px-4 py-2 text-sm text-gray-700">{entry.defectTime}</td>
                  <td className="px-4 py-2 text-sm text-gray-700">{entry.previousStatus}</td>
                  <td className="px-4 py-2 text-sm text-gray-700">{entry.defectStatus}</td>
                  <td className="px-4 py-2 text-sm text-gray-700">{entry.releaseName}</td>
                  <td className="px-4 py-2 text-sm text-gray-700">{entry.createdBy}</td>
                </tr>
              ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="flex justify-end pt-4">
          <Button type="button" variant="secondary" onClick={() => setIsHistoryModalOpen(false)}>
            Close
          </Button>
        </div>
      </Modal>

      {/* Comments Modal */}
      <Modal
        isOpen={isCommentsModalOpen}
        onClose={() => setIsCommentsModalOpen(false)}
        title="Comments"
        size="lg"
      >
        <div className="space-y-4">
          {/* Add Comment Section */}
          <div className="border-b pb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Add a comment</label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              rows={3}
              value={newCommentText}
              onChange={e => setNewCommentText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter your comment here... (Press Enter to submit, Shift+Enter for new line)"
            />
            <div className="flex justify-end pt-3 gap-2">
              <Button type="button" variant="secondary" onClick={() => setIsCommentsModalOpen(false)}>
                Close
              </Button>
              <Button 
                type="button" 
                variant="primary" 
                onClick={handleAddComment} 
                disabled={!newCommentText.trim()}
              >
                Add Comment
              </Button>
            </div>
          </div>

          {/* Comments List */}
          <div className="max-h-96 overflow-y-auto">
            {isCommentsLoading ? (
              <div className="text-center py-8">
                <div className="text-gray-500">Loading comments...</div>
              </div>
            ) : activeCommentsDefectId && (commentsByDefectId[activeCommentsDefectId]?.length > 0) ? (
              <div className="space-y-4">
                {commentsByDefectId[activeCommentsDefectId].map((comment, idx) => (
                  <div 
                    key={`comment-${activeCommentsDefectId}-${comment.timestamp}-${idx}`} 
                    className="bg-gray-50 rounded-lg p-4 border-l-4 border-blue-500"
                  >
                                         <div className="flex items-center justify-between mb-2">
                       <div className="text-sm font-medium text-gray-700">
                         {comment.userId ? `User ID: ${comment.userId}` : 'Anonymous User'}
                       </div>
                       <div className="text-xs text-gray-400">
                         {new Date(comment.timestamp).toLocaleString()}
                       </div>
                     </div>
                    <div className="text-gray-800 whitespace-pre-wrap">{comment.text}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-500">No comments yet.</div>
                <div className="text-sm text-gray-400 mt-1">Be the first to add a comment!</div>
              </div>
            )}
          </div>
        </div>
      </Modal>


      <AlertModal isOpen={alert.open} message={alert.message} onClose={closeAlert} />
      <ConfirmModal
        isOpen={deleteConfirm.open}
        message={"Are you sure you want to delete this defect?"}
        onCancel={closeDeleteConfirm}
        onConfirm={confirmDelete}
      />

      {/* Image Viewer Modal */}
      <Modal
        isOpen={isImageViewerModalOpen}
        onClose={closeImageViewer}
        title="View Attachment"
        size="xl"
      >
        <div className="flex justify-center">
          {viewingImageUrl && (
            <img
              src={viewingImageUrl}
              alt="Attachment"
              className="max-w-full max-h-[70vh] object-contain rounded-lg"
              onError={(e) => {
                // Handle image load errors
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const errorDiv = document.createElement('div');
                errorDiv.className = 'text-red-600 text-center p-4';
                errorDiv.textContent = 'Failed to load image. The file may not be a valid image or may have been moved.';
                target.parentNode?.appendChild(errorDiv);
              }}
            />
          )}
        </div>
        <div className="flex justify-end pt-4 gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              if (viewingImageUrl) {
                window.open(viewingImageUrl, '_blank');
              }
            }}
          >
            Open in New Tab
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={closeImageViewer}
          >
            Close
          </Button>
        </div>
      </Modal>
    </div>
    </>
  );
};
