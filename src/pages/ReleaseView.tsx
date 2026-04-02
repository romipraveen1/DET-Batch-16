import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
// import { Badge } from "../components/ui/Badge"; // Unused
import { Input } from "../components/ui/Input";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  // FileText,
  // Users,
  Eye,
  Edit2,
  Trash2,
  Plus,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { Modal } from "../components/ui/Modal";

import { ProjectSelector } from "../components/ui/ProjectSelector";
import { projectReleaseCardView } from "../api/releaseView/ProjectReleaseCardView";
import { createRelease } from "../api/createRelease/CreateRelease";
// import { searchRelease } from "../api/searchRelease/SearchRelease"; // Unused
import { getModulesByProjectId } from "../api/module/getModule";
import { getTestCasesByFilter } from "../api/releasetestcase";
import { getSubmodulesByModuleId } from "../api/submodule/submoduleget";
import { getSeverities } from "../api/severity";
import { getDefectTypes } from "../api/defectType";
import { getAllReleaseTypes } from "../api/Releasetype";
// import axios from 'axios'; // Unused
import AlertModal from '../components/ui/AlertModal';
import { Toast } from '../components/ui/Toast';
import { formatErrorMessage } from "../lib/errorUtils";
import { deleteReleaseById } from "../api/createRelease/deleteRelease";
import { updateRelease } from "../api/createRelease/updateRelease";
import { getAllProjects } from "../api/projectget";
// const BASE_URL = import.meta.env.VITE_BASE_URL; // Unused

interface TestCase {
  id: string;
  module: string;
  subModule: string;
  description: string;
  steps: string;
  type: string;
  severity: string;
  projectId: string;
  releaseId?: string;
  // Alternative field names that might be used by the backend
  testCaseType?: string;
  testCaseSeverity?: string;
  testType?: string;
  testSeverity?: string;
  caseType?: string;
  caseSeverity?: string;
  assignedBy?: string;
}

interface Module {
  id: string;
  name: string;
  submodules: { id: string; name: string }[];
}

export const ReleaseView: React.FC = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const {
    projects,
    setSelectedProjectId,
  } = useApp();

  // State
  const [selectedProject, setSelectedProject] = useState<string | null>(projectId || null);
  
  // Debug: Log initial values
  console.log('Initial values:', { projectId, selectedProject });
  const [selectedProjectData, setSelectedProjectData] = useState<any>(null);
  const [selectedRelease, setSelectedRelease] = useState<string | null>(null);
  const [releases, setReleases] = useState<any[]>([]);
  const [selectedModule, setSelectedModule] = useState("");
  const [projectModules, setProjectModules] = useState<Module[]>([]);
  const [filteredTestCases, setFilteredTestCases] = useState<TestCase[]>([]);
  const [loadingTestCases, setLoadingTestCases] = useState(false);
  const [testCaseError, setTestCaseError] = useState<string | null>(null);
  const [isViewStepsModalOpen, setIsViewStepsModalOpen] = useState(false);
  const [isViewTestCaseModalOpen, setIsViewTestCaseModalOpen] = useState(false);
  const [isCreateReleaseModalOpen, setIsCreateReleaseModalOpen] = useState(false);
  const [viewingTestCase, setViewingTestCase] = useState<TestCase | null>(null);
  const [releaseFormData, setReleaseFormData] = useState({
    name: "",
    releaseDate: "",
    releaseType: "",
  });
  // const [releaseSearch, setReleaseSearch] = useState(""); // Unused
  // const [searchResults, setSearchResults] = useState<any[] | null>(null); // Unused
  // const [searchError, setSearchError] = useState<string>(""); // Unused
  // const [isSearching, setIsSearching] = useState(false); // Unused
  const [submodules, setSubmodules] = useState<any[]>([]);
  const [selectedSubmoduleId, setSelectedSubmoduleId] = useState<string | null>(null);

  // Add state for severities and defect types (like TestCase page)
  const [severities, setSeverities] = useState<{ id: number; name: string; color: string }[]>([]);
  const [defectTypes, setDefectTypes] = useState<{ id: number; defectTypeName: string }[]>([]);
  const [editingReleaseId, setEditingReleaseId] = useState<string | null>(null);
  const [releaseTypes, setReleaseTypes] = useState<any[]>([]);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [alertModal, setAlertModal] = useState({ isOpen: false, message: '' });
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  const [toast, setToast] = useState({ isOpen: false, message: '', type: 'success' as 'success' | 'error' });

  // Fetch modules when project changes
  useEffect(() => {
    if (selectedProject) {
      getModulesByProjectId(selectedProject)
        .then((res) => {
          // Map API response to Module[] as in TestCase.tsx
          const modules = (res.data || []).map((mod: any) => ({
            id: String(mod.id),
            name: mod.moduleName || mod.name,
            submodules: [], // add this to match the Module interface
          }));
          setProjectModules(modules);
        })
        .catch(() => setProjectModules([]));
    } else {
      setProjectModules([]);
    }
  }, [selectedProject]);

  // Fetch severities and defect types on mount (like TestCase page)
  useEffect(() => {
    getSeverities().then(res => setSeverities(res.data));
    getDefectTypes().then(res => setDefectTypes(res.data));
  }, []);

  // Function to fetch specific project data
  const fetchProjectData = async (projectId: string) => {
    try {
      console.log('Fetching project data for ID:', projectId);
      const response = await getAllProjects();
      const allProjects = Array.isArray(response) ? response : ((response as any)?.data || []);
      
      const project = allProjects.find((p: any) => String(p.id) === String(projectId));
      console.log('Found project from API:', project);
      
      if (project) {
        setSelectedProjectData(project);
        return project;
      } else {
        console.log('Project not found in API response. Available projects:', allProjects.map((p: any) => ({ id: p.id, name: p.projectName || p.name })));
        return null;
      }
    } catch (error) {
      console.error('Error fetching project data:', error);
      return null;
    }
  };

  // Handle initial project loading when projects are available
  useEffect(() => {
    console.log('Projects effect triggered:', { 
      projectsLength: projects.length, 
      selectedProject, 
      hasSelectedProjectData: !!selectedProjectData 
    });
    
    // Always try to set project data when projects are available and we have a selected project
    if (projects.length > 0 && selectedProject) {
      const initialProject = projects.find(p => String(p.id) === String(selectedProject));
      console.log('Looking for project:', selectedProject, 'Found:', initialProject);
      
      if (initialProject) {
        console.log('Setting initial project data:', initialProject);
        setSelectedProjectData(initialProject);
      } else {
        console.log('Project not found in projects array. Available projects:', projects.map(p => ({ id: p.id, name: p.projectName || p.name })));
        
        // Try alternative search methods
        const projectByNumber = projects.find(p => Number(p.id) === Number(selectedProject));
        const projectByString = projects.find(p => p.id.toString() === selectedProject.toString());
        
        console.log('Alternative searches:', { projectByNumber, projectByString });
        
        if (projectByNumber) {
          console.log('Found project by number comparison:', projectByNumber);
          setSelectedProjectData(projectByNumber);
        } else if (projectByString) {
          console.log('Found project by string comparison:', projectByString);
          setSelectedProjectData(projectByString);
        } else {
          // If still not found, fetch from API directly
          console.log('Project not found in context, fetching from API...');
          fetchProjectData(selectedProject);
        }
      }
    } else if (selectedProject && projects.length === 0) {
      // If we have a selectedProject but no projects in context, fetch from API
      console.log('No projects in context, fetching from API...');
      fetchProjectData(selectedProject);
    }
  }, [projects, selectedProject]);

  useEffect(() => {
    if (isCreateReleaseModalOpen) {
      getAllReleaseTypes()
        .then((res) => setReleaseTypes(res.data || []))
        .catch(() => setReleaseTypes([]));
    }
  }, [isCreateReleaseModalOpen]);

  // Fetch test cases when all filters are selected
  useEffect(() => {
    if (selectedProject && selectedModule && selectedSubmoduleId && selectedRelease) {
      setLoadingTestCases(true);
      setTestCaseError(null);



      getTestCasesByFilter(selectedProject, selectedModule, selectedSubmoduleId, selectedRelease)
        .then((res) => {
          if (res.data && res.data.length > 0) {
          }

          // Map the test cases like TestCase page does
          const mappedTestCases = (res.data || []).map((tc: any) => ({
            ...tc,
            severity: (severities.find(s => s.id === tc.severityId)?.name || "") as string,
            type: (defectTypes.find(dt => dt.id === tc.defectTypeId)?.defectTypeName || "") as string,
          }));

          setFilteredTestCases(mappedTestCases);
        })
        .catch((err) => {
          console.error('API Error:', err);
          setTestCaseError(err.message || "Failed to load test cases");
        })
        .finally(() => setLoadingTestCases(false));
    } else {
      setFilteredTestCases([]);
    }
  }, [selectedProject, selectedModule, selectedSubmoduleId, selectedRelease, severities, defectTypes]);

  // Fetch releases for the selected project
  const getReleaseCardView = async () => {
    try {
      const response = await projectReleaseCardView(selectedProject);
      setReleases(response.data || []);
    } catch (error) {
      setReleases([]);
    }
  };
  // Initialize selectedProjectData when component mounts or selectedProject changes
  useEffect(() => {
    if (selectedProject && !selectedProjectData) {
      const currentProject = projects.find(p => String(p.id) === String(selectedProject));
      if (currentProject) {
        setSelectedProjectData(currentProject);
      }
    }
  }, [selectedProject, projects, selectedProjectData]);

  useEffect(() => {
    getReleaseCardView();
  }, [selectedProject]);

  // Project selection
  const handleProjectSelect = (projectId: string, projectData?: any) => {
    setSelectedProject(projectId);
    setSelectedProjectData(projectData);
    setSelectedProjectId(projectId);
    setSelectedRelease(null);
    setSelectedModule("");
    setProjectModules([]);
    setFilteredTestCases([]);
  };

  // Release selection (currently unused)
  // const handleReleaseSelect = (releaseId: string) => {
  //   setSelectedRelease(releaseId);
  //   setSelectedModule("");
  //   setFilteredTestCases([]);
  // };

  const handleModuleSelect = async (moduleId: string) => {
    setSelectedModule(moduleId);
    setSelectedSubmoduleId(null);
    getSubmodulesByModuleId(Number(moduleId))
      .then((res) => setSubmodules(res.data || []))
      .catch(() => setSubmodules([]));
  };

  // Helper function to show toast messages
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ isOpen: true, message, type });
  };

  const deleteRelease = async (releaseId: string) => {
    try {
      const resp = await deleteReleaseById(releaseId as string);
      // If API provides a message, show it; otherwise show a default
      const successMsg = (resp as any)?.message || 'Release deleted successfully.';
      await getReleaseCardView();
      showToast(successMsg, 'success');
    } catch (error: any) {
      // Surface backend validation/error message if available
      const backendMsg = error?.response?.data?.message
        || error?.response?.data?.error
        || error?.message
        || 'Failed to delete release.';
      showToast(formatErrorMessage(backendMsg), 'error');
    }
  };

  // UI helpers
  const getSeverityColor = (severity: string) => {
    if (!severity) return "bg-gray-100 text-gray-800";

    switch (severity.toLowerCase()) {
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

  // Helper functions removed - now using proper mapping like TestCase page

  // Render
  return (
    <div className="max-w-6xl mx-auto py-8">
      {/* Back Button at the top right */}
      <div className="mb-4 flex justify-end">
        <Button
          variant="secondary"
          onClick={() => navigate(`/projects/${projectId}/project-management`)}
          className="flex items-center"
        >
          <ChevronLeft className="w-5 h-5 mr-2" /> Back
        </Button>
      </div>
      {/* Project Selection Panel */}
      <ProjectSelector
        projects={projects}
        selectedProjectId={selectedProject}
        onSelect={handleProjectSelect}
        className="mb-6"
      />

      {/* Release Selection Panel */}
      {selectedProject && (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Release Overview
            </h2>
            <Button
              onClick={() => {
                console.log('Opening modal with:', {
                  selectedProject,
                  selectedProjectData,
                  projectsCount: projects.length,
                  projectIds: projects.map(p => p.id)
                });
                
                // Always ensure we have the current project data when opening the modal
                if (selectedProject) {
                  let currentProject = selectedProjectData;
                  
                  // If no selectedProjectData, try to find it
                  if (!currentProject) {
                    currentProject = projects.find(p => String(p.id) === String(selectedProject));
                    console.log('Found project from projects array:', currentProject);
                    if (currentProject) {
                      setSelectedProjectData(currentProject);
                    }
                  }
                  
                  // If still no project data, try alternative search methods
                  if (!currentProject) {
                    const projectByNumber = projects.find(p => Number(p.id) === Number(selectedProject));
                    const projectByString = projects.find(p => p.id.toString() === selectedProject.toString());
                    
                    if (projectByNumber) {
                      console.log('Found project by number comparison:', projectByNumber);
                      setSelectedProjectData(projectByNumber);
                    } else if (projectByString) {
                      console.log('Found project by string comparison:', projectByString);
                      setSelectedProjectData(projectByString);
                    } else {
                      // If still not found, fetch from API
                      console.log('Project not found, fetching from API...');
                      fetchProjectData(selectedProject).then((project) => {
                        if (project) {
                          console.log('Successfully fetched project data:', project);
                        }
                      });
                    }
                  }
                }
                
                setIsCreateReleaseModalOpen(true);
              }}
              className="flex items-center space-x-2"
              disabled={!selectedProject}
            >
              <Plus className="w-4 h-4" />
              <span>Create Release</span>
            </Button>
          </div>
          {releases.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-gray-500">
                  No releases found for the selected project. Please create releases first.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {releases.map((release: any) => (
                <Card
                  key={release.id}
                  hover
                  className={`cursor-pointer group transition-all duration-300 hover:shadow-lg hover:scale-[1.02] ${selectedRelease === release.id ? 'border-4 border-blue-700 bg-blue-600 text-white' : 'border border-gray-200 bg-white text-gray-900'}`}
                  onClick={() => navigate(`/projects/${selectedProject}/releases/${release.id}/details`)}
                >
                  <CardContent className={`p-6 relative ${selectedRelease === release.id ? 'bg-blue-600 text-white' : 'bg-white text-gray-900'}`}>
                    {/* Edit & Delete Icons */}
                    <div className="absolute top-4 right-4 flex space-x-2 opacity-80 group-hover:opacity-100 z-10">
                      <button
                        type="button"
                                                  onClick={e => {
                            e.stopPropagation();
                            setReleaseFormData({
                              name: release.releaseName,
                              releaseDate: release.releaseDate ? release.releaseDate.split('T')[0] : "",
                              releaseType: release.releaseType || "",
                            });
                            setIsCreateReleaseModalOpen(true);
                            setEditingReleaseId(release.id);
                          }}
                        title="Edit"
                        className="p-1 rounded hover:bg-gray-200"
                      >
                        <Edit2 className="w-5 h-5 text-blue-500" />
                      </button>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          setDeleteTargetId(release.id);
                          setConfirmDeleteOpen(true);
                        }}
                        title="Delete"
                        className="p-1 rounded hover:bg-gray-200"
                      >
                        <Trash2 className="w-5 h-5 text-red-500" />
                      </button>
                    </div>
                    <div className="mb-4">
                      <h3
                        className={`text-lg font-semibold mb-1 truncate max-w-full ${selectedRelease === release.id ? 'text-white' : 'text-gray-900'}`}
                        title={release.releaseName}
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          display: 'block',
                          maxWidth: '100%'
                        }}
                      >
                        {release.releaseName}
                      </h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="flex items-center space-x-2">
                        <Calendar className={`w-4 h-4 ${selectedRelease === release.id ? 'text-white' : 'text-gray-400'}`} />
                        <div>
                          <p className={`text-xs ${selectedRelease === release.id ? 'text-white' : 'text-gray-500'}`}>Release Date</p>
                          <p className={`text-sm font-medium ${selectedRelease === release.id ? 'text-white' : 'text-gray-900'}`}>
                            {release.releaseDate
                              ? new Date(release.releaseDate).toLocaleDateString()
                              : "TBD"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Module Selection Panel */}
      {selectedRelease && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Module Selection
            </h2>
            <div className="relative flex items-center">
              <button
                onClick={() => {
                  const container = document.getElementById("module-scroll");
                  if (container) container.scrollLeft -= 200;
                }}
                className="flex-shrink-0 z-10 bg-white shadow-md rounded-full p-1 hover:bg-gray-50 mr-2"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div
                id="module-scroll"
                className="flex space-x-2 overflow-x-auto pb-2 scroll-smooth flex-1"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                {projectModules.map((module: Module) => (
                  <Button
                    key={module.id}
                    variant={selectedModule === module.id ? "primary" : "secondary"}
                    onClick={() => handleModuleSelect(module.id)}
                    className="whitespace-nowrap m-2"
                  >
                    {module.name}
                  </Button>
                ))}
              </div>
              <button
                onClick={() => {
                  const container = document.getElementById("module-scroll");
                  if (container) container.scrollLeft += 200;
                }}
                className="flex-shrink-0 z-10 bg-white shadow-md rounded-full p-1 hover:bg-gray-50 ml-2"
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submodule Selection Panel */}
      {selectedRelease && selectedModule && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Submodule Selection
            </h2>
            <div className="relative flex items-center">
              <button
                onClick={() => {
                  const container = document.getElementById("submodule-scroll");
                  if (container) container.scrollLeft -= 200;
                }}
                className="flex-shrink-0 z-10 bg-white shadow-md rounded-full p-1 hover:bg-gray-50 mr-2"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div
                id="submodule-scroll"
                className="flex flex-nowrap gap-2 overflow-x-auto scrollbar-hide scroll-smooth flex-1"
                style={{ msOverflowStyle: "none", scrollbarWidth: "none" }}
              >
                {submodules.map((submodule) => (
                  <Button
                    key={submodule.subModuleId}
                    variant={selectedSubmoduleId === String(submodule.subModuleId) ? "primary" : "secondary"}
                    onClick={() => setSelectedSubmoduleId(String(submodule.subModuleId))}
                    className="min-w-max whitespace-nowrap m-2"
                  >
                    {submodule.subModuleName}
                  </Button>
                ))}
              </div>
              <button
                onClick={() => {
                  const container = document.getElementById("submodule-scroll");
                  if (container) container.scrollLeft += 200;
                }}
                className="flex-shrink-0 z-10 bg-white shadow-md rounded-full p-1 hover:bg-gray-50 ml-2"
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Cases Table */}
      {selectedRelease && selectedModule && (
        <Card>
          <CardContent className="p-0">
            {loadingTestCases ? (
              <div className="p-8 text-center">Loading test cases...</div>
            ) : testCaseError ? (
              <div className="p-8 text-center text-red-500">{testCaseError}</div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr className="border-b border-gray-200">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Test Case ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Steps
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Severity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned By</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTestCases.map((testCase: TestCase) => (
                    <tr key={testCase.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{testCase.id}</td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs description-cell" title={testCase.description}>
                        {testCase.description}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <button
                          onClick={() => {
                            setViewingTestCase(testCase);
                            setIsViewStepsModalOpen(true);
                          }}
                          className="text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                          title="View Steps"
                        >
                          <Eye className="w-4 h-4" />
                          <span>View</span>
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {testCase.type || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(testCase.severity || 'low')}`}>
                          {testCase.severity || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{testCase.assignedBy || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {/* View Steps Modal */}
      <Modal
        isOpen={isViewStepsModalOpen}
        onClose={() => {
          setIsViewStepsModalOpen(false);
          setViewingTestCase(null);
        }}
        title={`Test Steps - ${viewingTestCase?.id}`}
      >
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-gray-700 whitespace-pre-line">
              {viewingTestCase?.steps}
            </p>
          </div>
          <div className="flex justify-end pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsViewStepsModalOpen(false);
                setViewingTestCase(null);
              }}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* View Test Case Modal */}
      <Modal
        isOpen={isViewTestCaseModalOpen}
        onClose={() => {
          setIsViewTestCaseModalOpen(false);
          setViewingTestCase(null);
        }}
        title={`Test Case Details - ${viewingTestCase?.id}`}
        size="xl"
      >
        {viewingTestCase && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">
                  Description
                </h3>
                <p className="mt-1 text-sm text-gray-900">
                  {viewingTestCase.description}
                </p>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">
                Test Steps
              </h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700 whitespace-pre-line">
                  {viewingTestCase.steps}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Severity</h3>
                <span
                  className={`mt-1 inline-flex px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(
                    viewingTestCase.severity || 'low'
                  )}`}
                >
                  {viewingTestCase.severity || 'N/A'}
                </span>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Module</h3>
                <p className="mt-1 text-sm text-gray-900">
                  {viewingTestCase.module} / {viewingTestCase.subModule}
                </p>
              </div>
            </div>
            <div className="flex justify-end pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setIsViewTestCaseModalOpen(false);
                  setViewingTestCase(null);
                }}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Release Modal */}
      <Modal
        isOpen={isCreateReleaseModalOpen}
                 onClose={() => {
           setIsCreateReleaseModalOpen(false);
           setReleaseFormData({
             name: "",
             releaseDate: "",
             releaseType: "",
           });
           setEditingReleaseId(null);
           setValidationErrors({});
         }}
        title={editingReleaseId ? "Edit Release" : "Create New Release"}
        size="xl"
      >
                 <form onSubmit={async (e) => {
           e.preventDefault();
           if (!selectedProject) return;
           
                       // Clear previous validation errors
            setValidationErrors({});
            
            // Validate required fields
            if (!releaseFormData.name.trim()) {
              setValidationErrors(prev => ({ ...prev, name: "Release name is required" }));
              return;
            }
            
            if (!releaseFormData.releaseType) {
              setValidationErrors(prev => ({ ...prev, releaseType: "Release type is required" }));
              return;
            }
            
            if (!releaseFormData.releaseDate) {
              setValidationErrors(prev => ({ ...prev, releaseDate: "Release date is required" }));
              return;
            }
            
                         // Validate release date against project date range
             const currentProject = selectedProjectData || projects.find(p => String(p.id) === String(selectedProject));
             if (currentProject) {
               const releaseDate = new Date(releaseFormData.releaseDate);
               
               // Check if release date is before project start date
               if (currentProject.startDate) {
                 const projectStartDate = new Date(currentProject.startDate);
                 if (releaseDate < projectStartDate) {
                   setValidationErrors(prev => ({ ...prev, releaseDate: "Release date cannot be before project start date" }));
                   return;
                 }
               }
               
               // Check if release date is after project end date
               if (currentProject.endDate) {
                 const projectEndDate = new Date(currentProject.endDate);
                 if (releaseDate > projectEndDate) {
                   setValidationErrors(prev => ({ ...prev, releaseDate: "Release date cannot be after project end date" }));
                   return;
                 }
               }
             }
           
                                               const payload = {
               releaseName: releaseFormData.name.trim(),
               releaseDate: releaseFormData.releaseDate, // Now required, validation ensures it's not empty
               releaseType: releaseFormData.releaseType,
               projectId: Number(selectedProject),
             };
           
           try {
            let createOrUpdateSucceeded = false;
            if (editingReleaseId) {
              // Editing: Call backend updateRelease API
              const response = await updateRelease(Number(editingReleaseId), payload);
              if (response && (response.status === "success" || response.statusCode === 2000)) {
                // Close modal only after successful update
                setIsCreateReleaseModalOpen(false);
                // Reset form data
                setReleaseFormData({
                  name: "",
                  releaseDate: "",
                  releaseType: "",
                });
                setEditingReleaseId(null);
                setValidationErrors({});
                // Refresh releases and show success message
                getReleaseCardView();
                showToast(response?.message || "Release updated successfully!", "success");
                createOrUpdateSucceeded = true;
              } else {
                showToast(formatErrorMessage(response?.message || "Failed to update release"), "error");
              }
            } else {
              // Creating: Call backend as before
              const response = await createRelease(payload);
              console.log('Create release response:', response); // Debug log
              
              // Check for successful response - be more flexible with the condition
              if (response && (response.status === "success" || response.statusCode === 2000 || response.statusCode === 200)) {
                // Close modal only after successful creation
                setIsCreateReleaseModalOpen(false);
                // Reset form data
                setReleaseFormData({
                  name: "",
                  releaseDate: "",
                  releaseType: "",
                });
                setValidationErrors({});
                // Refresh releases and show success message
                getReleaseCardView();
                showToast(response?.message || "Release created successfully!", "success");
                createOrUpdateSucceeded = true;
              } else {
                showToast(formatErrorMessage(response?.message || "Failed to create release"), "error");
              }
            }
          } catch (error: any) {
            let errorMessage = editingReleaseId ? "Failed to update release" : "Failed to create release";
            
            if (error?.response?.data?.message) {
              errorMessage = error.response.data.message;
            } else if (error?.message) {
              errorMessage = error.message;
            } else if (error?.response?.status === 400) {
              errorMessage = "Invalid data provided. Please check your input.";
            } else if (error?.response?.status === 500) {
              errorMessage = "Server error occurred. Please try again later.";
            }
            
            showToast(formatErrorMessage(errorMessage), "error");
          } finally {
            // In finally, do not force-close modal; it is closed only when succeeded above
          }
         }} className="space-y-4">
                     <Input
             label="Release Name *"
             value={releaseFormData.name}
             onChange={(e) => setReleaseFormData((prev) => ({ ...prev, name: e.target.value }))}
             required
           />
           {validationErrors.name && (
             <p className="text-red-500 text-sm mt-1">{validationErrors.name}</p>
           )}
                     <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">
               Release Type *
             </label>
             <select
               value={releaseFormData.releaseType}
               onChange={(e) => setReleaseFormData((prev) => ({ ...prev, releaseType: e.target.value }))}
               className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
               required
             >
               <option value="">Select Release Type</option>
               {releaseTypes.map((type) => (
                 <option key={type.id} value={type.releaseTypeName}>
                   {type.releaseTypeName}
                 </option>
               ))}
                            </select>
             </div>
             {validationErrors.releaseType && (
               <p className="text-red-500 text-sm mt-1">{validationErrors.releaseType}</p>
             )}
                                           <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Release Date *
              </label>
              <input
                type="date"
                value={releaseFormData.releaseDate}
                onChange={(e) => setReleaseFormData((prev) => ({ ...prev, releaseDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
              
                             {/* Project Date Range Information */}
               {(() => {
                 // Try to get project data from selectedProjectData first, then fallback to context projects
                 let currentProject = selectedProjectData || projects.find(p => String(p.id) === String(selectedProject));
                 
                 // If still no project found, try alternative search methods
                 if (!currentProject && selectedProject) {
                   currentProject = projects.find(p => Number(p.id) === Number(selectedProject)) ||
                                   projects.find(p => p.id.toString() === selectedProject.toString());
                 }
                 
                 console.log('Modal project data:', {
                   selectedProject,
                   selectedProjectData,
                   currentProject,
                   projectsCount: projects.length
                 });
                 
                 if (!selectedProject) {
                   return (
                     <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                       <div className="text-xs text-yellow-700 font-medium mb-1">No Project Selected</div>
                       <div className="text-xs text-yellow-600">
                         Please select a project first to see the date range.
                       </div>
                     </div>
                   );
                 }
                 
                 if (!currentProject) {
                   return (
                     <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                       <div className="text-xs text-red-700 font-medium mb-1">Project Data Not Available</div>
                       <div className="text-xs text-red-600">
                         Unable to load project information. Please try selecting the project again.
                       </div>
                     </div>
                   );
                 }
                 
                 // Show the date range information
                 console.log('Project dates:', { 
                   startDate: currentProject.startDate, 
                   endDate: currentProject.endDate 
                 });
                 
                 if (currentProject.startDate || currentProject.endDate) {
                   return (
                     <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                       <div className="text-xs text-blue-700 font-medium mb-1">Project Date Range:</div>
                       <div className="grid grid-cols-2 gap-4 text-xs text-blue-600">
                         <div>
                           <span className="font-medium">Start Date:</span>
                           <span className="ml-1">
                             {currentProject.startDate 
                               ? new Date(currentProject.startDate).toLocaleDateString()
                               : 'Not set'
                             }
                           </span>
                         </div>
                         <div>
                           <span className="font-medium">End Date:</span>
                           <span className="ml-1">
                             {currentProject.endDate 
                               ? new Date(currentProject.endDate).toLocaleDateString()
                               : 'Not set'
                             }
                           </span>
                         </div>
                       </div>
                       <div className="text-xs text-blue-500 mt-1 italic">
                         Release date must be within this range
                       </div>
                     </div>
                   );
                 } else {
                   return (
                     <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                       <div className="text-xs text-orange-700 font-medium mb-1">No Date Range Set</div>
                       <div className="text-xs text-orange-600">
                         This project doesn't have start/end dates configured.
                       </div>
                     </div>
                   );
                 }
               })()}
              
              {validationErrors.releaseDate && (
                <p className="text-red-500 text-sm mt-1">{validationErrors.releaseDate}</p>
              )}
             </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="secondary"
                             onClick={() => {
                 setIsCreateReleaseModalOpen(false);
                 setReleaseFormData({
                   name: "",
                   releaseDate: "",
                   releaseType: "",
                 });
                 setEditingReleaseId(null);
                 setValidationErrors({});
               }}
            >
              Cancel
            </Button>
            <Button type="submit">Submit</Button>
          </div>
        </form>
      </Modal>
      
      {/* Toast Notification */}
      <Toast
        isOpen={toast.isOpen}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ isOpen: false, message: '', type: 'success' })}
      />
      
      {/* Delete Confirmation Modal */}
      {confirmDeleteOpen && (
        <div className="fixed inset-0 z-[70] flex justify-center items-start bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-2xl min-w-[350px] max-w-[95vw] p-6 mt-8">
            <div className="text-lg font-semibold mb-4 text-gray-900">Delete Release</div>
            <div className="mb-6 text-gray-700">
              {(() => {
                const release = releases.find(r => r.id === deleteTargetId);
                return (
                  <>Are you sure you want to delete the release "<span className='font-semibold'>{release?.releaseName || ''}</span>"? This action cannot be undone.</>
                );
              })()}
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setConfirmDeleteOpen(false); setDeleteTargetId(null); }}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-6 py-2 rounded"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setConfirmDeleteOpen(false);
                  if (deleteTargetId) await deleteRelease(deleteTargetId);
                  setDeleteTargetId(null);
                }}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-2 rounded"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
      <AlertModal
        isOpen={alertModal.isOpen}
        message={alertModal.message}
        onClose={() => setAlertModal({ isOpen: false, message: '' })}
      />
    </div>
  );
};