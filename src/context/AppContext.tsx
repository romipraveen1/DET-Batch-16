import React, { createContext, useContext, useState, useEffect } from "react";
import {
  Employee,
  Project,
  Defect,
  TestCase,
  Release,
  WorkflowItem,
  BenchAllocation,
  WorkflowStatus,
  StatusTransition
} from "../types/index";
import { getModulesByProjectId } from "../api/module/getModule";
import { getAllDefectStatuses } from "../api/defectStatus";
import { tokenManager } from "../lib/api";

interface Submodule {
  id: string;
  name: string;
  assignedDevs: string[];
}

interface Module {
  id: string;
  name: string;
  submodules: Submodule[];
  assignedDevs: string[];
}

interface ModulesByProject {
  [projectId: string]: Module[];
}

// Local StatusType definition (not exported from types/index.ts)
interface StatusType {
  id: string;
  name: string;
  color: string;
}

interface AppContextType {
  employees: Employee[];
  projects: Project[];
  defects: Defect[];
  testCases: TestCase[];
  releases: Release[];
  workflowItems: WorkflowItem[];
  benchAllocations: BenchAllocation[];
  workflowStatuses: WorkflowStatus[];
  transitions: StatusTransition[];
  statusTypes: StatusType[];
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
  addEmployee: (
    employee: Omit<Employee, "id" | "createdAt" | "updatedAt">
  ) => void;
  updateEmployee: (id: string, employee: Partial<Employee>) => void;
  deleteEmployee: (id: string) => void;
  addProject: (project: Project) => void;
  updateProject: (project: Project) => void;
  deleteProject: (projectId: string) => void;
  addDefect: (defect: Defect) => void;
  updateDefect: (defect: Defect) => void;
  deleteDefect: (defectId: string) => void;
  addTestCase: (testCase: TestCase) => void;
  updateTestCase: (testCase: TestCase) => void;
  deleteTestCase: (testCaseId: string) => void;
  addRelease: (release: Release) => void;
  updateRelease: (release: Release) => void;
  deleteRelease: (releaseId: string) => void;
  updateWorkflowItem: (id: string, updates: Partial<WorkflowItem>) => void;
  moveTestCaseToRelease: (testCaseIds: string[], releaseId: string) => void;
  allocateEmployee: (
    allocation: Omit<BenchAllocation, "id" | "createdAt">
  ) => void;
  updateWorkflowStatuses: (statuses: WorkflowStatus[]) => void;
  updateTransitions: (transitions: StatusTransition[]) => void;
  addStatusType: (statusType: Omit<StatusType, "id">) => void;
  updateStatusType: (id: string, statusType: Partial<StatusType>) => void;
  deleteStatusType: (id: string) => void;
  testCaseDefectMap: { [testCaseId: string]: string };
  setTestCaseDefectMap: React.Dispatch<
    React.SetStateAction<{ [testCaseId: string]: string }>
  >;
  modulesByProject: ModulesByProject;
  setModulesByProject: React.Dispatch<React.SetStateAction<ModulesByProject>>;
  addModule: (projectId: string, module: Module) => void;
  updateModule: (
    projectId: string,
    moduleId: string,
    updated: Partial<Module>
  ) => void;
  deleteModule: (projectId: string, moduleId: string) => void;
  addSubmodule: (
    projectId: string,
    moduleId: string,
    submodule: Submodule
  ) => void;
  updateSubmodule: (
    projectId: string,
    moduleId: string,
    submoduleIdx: number,
    newName: string
  ) => void;
  deleteSubmodule: (
    projectId: string,
    moduleId: string,
    submoduleIdx: number
  ) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within AppProvider");
  }
  return context;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [employees, setEmployees] = useState<Employee[]>([
    {
      id: "EMP001",
      firstName: "John",
      lastName: "Doe",
      gender: "Male",
      email: "john.doe@company.com",
      phone: "+1-555-0123",
      designation: "Senior Developer",
      experience: 5,
      joinedDate: "2020-01-15",
      skills: ["React", "Node.js", "TypeScript", "MongoDB"],
      currentProjects: ["Project Alpha"],
      availability: 75,
      status: "active",
      department: "Engineering",
      manager: "Jane Smith",
      startDate: "2024-01-01",
      endDate: "2024-12-31",
      createdAt: "2020-01-15T00:00:00Z",
      updatedAt: "2024-01-15T00:00:00Z",
    },
    {
      id: "EMP002",
      firstName: "Sarah",
      lastName: "Wilson",
      gender: "Female",
      email: "sarah.wilson@company.com",
      phone: "+1-555-0124",
      designation: "QA Engineer",
      experience: 3,
      joinedDate: "2021-03-10",
      skills: ["Manual Testing", "Automation", "Selenium", "Jest"],
      currentProjects: [],
      availability: 100,
      status: "active",
      department: "Quality Assurance",
      manager: "Mike Johnson",
      startDate: "2024-02-01",
      endDate: "2024-11-30",
      createdAt: "2021-03-10T00:00:00Z",
      updatedAt: "2024-01-15T00:00:00Z",
    },
    {
      id: "EMP003",
      firstName: "Michael",
      lastName: "Brown",
      gender: "Male",
      email: "michael.brown@company.com",
      phone: "+1-555-0125",
      designation: "UI/UX Designer",
      experience: 4,
      joinedDate: "2019-08-20",
      skills: ["Figma", "Adobe XD", "Sketch", "Prototyping"],
      currentProjects: ["Project Beta", "Project Gamma"],
      availability: 50,
      status: "active",
      department: "Design",
      manager: "Lisa Davis",
      startDate: "2024-03-01",
      endDate: "2024-10-31",
      createdAt: "2019-08-20T00:00:00Z",
      updatedAt: "2024-01-15T00:00:00Z",
    },
  ]);

  const [projects, setProjects] = useState<Project[]>([
    {
      id: "PR0001",
      name: "Mobile Banking App",
      prefix: "PR0001",
      description: "Secure banking application for iOS and Android",
      status: "active",
      startDate: "2024-02-01",
      endDate: "2024-08-31",
      manager: "Sarah Johnson",
      priority: "high",
      projectType: "mobile",
      progress: 45,
      teamMembers: [],
      createdAt: "2024-02-01T00:00:00Z",
    },
    {
      id: "PR0002",
      name: "Inventory Management",
      prefix: "INVM",
      description: "Enterprise inventory tracking system",
      status: "completed",
      startDate: "2023-09-01",
      endDate: "2024-01-31",
      manager: "Mike Brown",
      priority: "medium",
      projectType: "desktop",
      progress: 100,
      teamMembers: [],
      createdAt: "2023-09-01T00:00:00Z",
    },
    {
      id: "PR0003",
      name: "E-commerce Platform",
      prefix: "ECOM",
      description: "Online shopping platform for multiple vendors",
      status: "active",
      startDate: "2024-03-01",
      endDate: "2024-12-31",
      manager: "Priya Singh",
      priority: "high",
      projectType: "web",
      progress: 30,
      teamMembers: [],
      createdAt: "2024-03-01T00:00:00Z",
    },
    {
      id: "PR0004",
      name: "Healthcare Portal",
      prefix: "HLTH",
      description: "Patient and doctor management system",
      status: "active",
      startDate: "2024-01-15",
      endDate: "2024-10-15",
      manager: "David Lee",
      priority: "medium",
      projectType: "web",
      progress: 55,
      teamMembers: [],
      createdAt: "2024-01-15T00:00:00Z",
    },
    {
      id: "PR0005",
      name: "Learning Management System",
      prefix: "LMS",
      description: "Platform for online courses and assessments",
      status: "active",
      startDate: "2024-04-01",
      endDate: "2024-11-30",
      manager: "Emily Clark",
      priority: "high",
      projectType: "web",
      progress: 20,
      teamMembers: [],
      createdAt: "2024-04-01T00:00:00Z",
    },
    {
      id: "PR0006",
      name: "CRM Solution",
      prefix: "CRM",
      description: "Customer relationship management tool",
      status: "inactive",
      startDate: "2023-11-01",
      endDate: "2024-09-30",
      manager: "Olivia Turner",
      priority: "low",
      projectType: "desktop",
      progress: 60,
      teamMembers: [],
      createdAt: "2023-11-01T00:00:00Z",
    },
    {
      id: "PR0007",
      name: "IoT Device Dashboard",
      prefix: "IOTD",
      description: "Dashboard for monitoring IoT devices",
      status: "active",
      startDate: "2024-05-01",
      endDate: "2024-12-01",
      manager: "Carlos Martinez",
      priority: "medium",
      projectType: "web",
      progress: 10,
      teamMembers: [],
      createdAt: "2024-05-01T00:00:00Z",
    },
    {
      id: "PR0008",
      name: "Travel Booking System",
      prefix: "TRVL",
      description: "System for booking flights and hotels",
      status: "active",
      startDate: "2024-02-15",
      endDate: "2024-10-31",
      manager: "Sophia Kim",
      priority: "high",
      projectType: "web",
      progress: 40,
      teamMembers: [],
      createdAt: "2024-02-15T00:00:00Z",
    },
    {
      id: "PR0009",
      name: "Fitness Tracker App",
      prefix: "FIT",
      description: "Mobile app for tracking fitness activities",
      status: "active",
      startDate: "2024-03-10",
      endDate: "2024-09-30",
      manager: "Liam Patel",
      priority: "medium",
      projectType: "mobile",
      progress: 25,
      teamMembers: [],
      createdAt: "2024-03-10T00:00:00Z",
    },
    {
      id: "PR0010",
      name: "Event Management System",
      prefix: "EVNT",
      description: "Tool for managing events and registrations",
      status: "completed",
      startDate: "2023-06-01",
      endDate: "2024-05-31",
      manager: "Noah Brown",
      priority: "low",
      projectType: "web",
      progress: 100,
      teamMembers: [],
      createdAt: "2023-09-01T00:00:00Z",
    },
  ]);

  const [defects, setDefects] = useState<Defect[]>([
    {
      id: "DEF001",
      title: "Data not encrypted in transit",
      description:
        "Sensitive data visible in network traffic during transmission",
      status: "open",
      severity: "critical",
      priority: "critical",
      projectId: "PR0001",
      reportedBy: "Security Team",
      assignedTo: "John Doe",
      createdAt: "2024-03-04",
      updatedAt: "2024-03-04T00:00:00Z",
    },
    {
      id: "D005",
      title: "UI elements misaligned on iPhone 12",
      description: "UI elements are misaligned on iPhone 12 device",
      status: "in-progress",
      severity: "medium",
      priority: "medium",
      projectId: "PR0002",
      reportedBy: "QA Team",
      assignedTo: "Sarah Wilson",
      createdAt: "2024-03-05",
      updatedAt: "2024-03-05T00:00:00Z",
    },
    {
      id: "D006",
      title: "Fund transfer fails for large amounts",
      description: "Fund transfer fails when amount exceeds $10,000",
      status: "open",
      severity: "high",
      priority: "high",
      projectId: "PR0001",
      reportedBy: "QA Team",
      assignedTo: "Michael Brown",
      createdAt: "2024-03-06",
      updatedAt: "2024-03-06T00:00:00Z",
    },
    {
      id: "D007",
      title: "Database connection timeout",
      description: "Database connection times out during high load",
      status: "in-progress",
      severity: "high",
      priority: "high",
      projectId: "PR0003",
      reportedBy: "DevOps Team",
      assignedTo: "Sarah Wilson",
      createdAt: "2024-03-07",
      updatedAt: "2024-03-07T00:00:00Z",
    },
    {
      id: "D008",
      title: "Report generation slow for large datasets",
      description:
        "Report generation takes more than 5 minutes for datasets with 10,000+ records",
      status: "open",
      severity: "medium",
      priority: "medium",
      projectId: "PR0003",
      reportedBy: "QA Team",
      assignedTo: "John Doe",
      createdAt: "2024-03-08",
      updatedAt: "2024-03-08T00:00:00Z",
    },
  ]);

  const [testCases, setTestCases] = useState<TestCase[]>([
    // No mock test case data. Start with an empty array or load from API.
  ]);

  const [releases, setReleases] = useState<Release[]>([
    // {
    //   id: "R002",
    //   name: "Mobile Banking v2.1",
    //   version: "2.1.0",
    //   description: "Security enhancements and UI updates for mobile banking",
    //   projectId: "2",
    //   status: "planned",
    //   releaseDate: "2024-04-01",
    //   Testcase: ["TC005", "TC006", "TC007"],
    //   features: ["Biometric login", "Quick transfer"],
    //   bugFixes: ["Fixed session timeout"],
    //   createdAt: "2024-03-10T09:00:00Z",
    // },
    // {
    //   id: "R003",
    //   name: "Inventory v1.2",
    //   version: "1.2.0",
    //   description:
    //     "Performance improvements and bug fixes for inventory system",
    //   projectId: "3",
    //   status: "completed",
    //   releaseDate: "2024-02-15",
    //   Testcase: ["TC008", "TC009"],
    //   features: ["Faster report generation"],
    //   bugFixes: ["Fixed database timeout"],
    //   createdAt: "2024-02-01T08:00:00Z",
    // },
    // // Additional mock releases (not related to E-commerce Platform)
    // {
    //   id: "R005",
    //   name: "Mobile Banking v2.2",
    //   version: "2.2.0",
    //   description: "Introduced bill payments and improved security",
    //   projectId: "2",
    //   status: "in-progress",
    //   releaseDate: "2024-06-01",
    //   Testcase: ["TC012", "TC013"],
    //   features: ["Bill payments", "Enhanced 2FA"],
    //   bugFixes: ["Fixed PIN reset issue"],
    //   createdAt: "2024-05-01T11:00:00Z",
    // },
    // {
    //   id: "R006",
    //   name: "Inventory v1.3",
    //   version: "1.3.0",
    //   description: "New analytics dashboard and bug fixes",
    //   projectId: "3",
    //   status: "testing",
    //   releaseDate: "2024-07-01",
    //   Testcase: ["TC014", "TC015"],
    //   features: ["Analytics dashboard"],
    //   bugFixes: ["Fixed export bug"],
    //   createdAt: "2024-06-01T10:00:00Z",
    // },
  ]);

  const [workflowItems, setWorkflowItems] = useState<WorkflowItem[]>([]);
  const [benchAllocations, setBenchAllocations] = useState<BenchAllocation[]>(
    []
  );
  const [workflowStatuses, setWorkflowStatuses] = useState<WorkflowStatus[]>(
    []
  );
  const [transitions, setTransitions] = useState<StatusTransition[]>([]);
  const [statusTypes, setStatusTypes] = useState<StatusType[]>([]);
  const [selectedProjectId, setSelectedProjectIdState] = useState<string | null>(() => {
    return localStorage.getItem('selectedProjectId') || null;
  });

  const setSelectedProjectId = (id: string | null) => {
    setSelectedProjectIdState(id);
    if (id) {
      localStorage.setItem('selectedProjectId', id);
    } else {
      localStorage.removeItem('selectedProjectId');
    }
  };
  const [testCaseDefectMap, setTestCaseDefectMap] = useState<{
    [testCaseId: string]: string;
  }>({});

  // Initial modulesByProject (full object shape)
  const [modulesByProject, setModulesByProject] = useState<ModulesByProject>({
    "PR0001": [
      {
        id: "auth",
        name: "Authentication",
        assignedDevs: [],
        submodules: [
          { id: "auth-bio", name: "Biometric Login", assignedDevs: [] },
          { id: "auth-pin", name: "PIN Login", assignedDevs: [] },
          { id: "auth-pass", name: "Password Reset", assignedDevs: [] },
          { id: "auth-session", name: "Session Management", assignedDevs: [] },
        ],
      },
      {
        id: "acc",
        name: "Account Management",
        assignedDevs: [],
        submodules: [
          { id: "acc-overview", name: "Account Overview", assignedDevs: [] },
          { id: "acc-history", name: "Transaction History", assignedDevs: [] },
          {
            id: "acc-statements",
            name: "Account Statements",
            assignedDevs: [],
          },
          { id: "acc-settings", name: "Account Settings", assignedDevs: [] },
        ],
      },
    ],
    "PR0002": [
      {
        id: "inv-core",
        name: "Core Inventory",
        assignedDevs: [],
        submodules: [
          { id: "inv-stock", name: "Stock Management", assignedDevs: [] },
          { id: "inv-orders", name: "Order Tracking", assignedDevs: [] },
        ],
      },
    ],
  });

  // Module management functions (now use full object shape)
  const addModule = (projectId: string, module: Module) => {
    setModulesByProject((prev) => ({
      ...prev,
      [projectId]: prev[projectId] ? [...prev[projectId], module] : [module],
    }));
  };

  const updateModule = (
    projectId: string,
    moduleId: string,
    updated: Partial<Module>
  ) => {
    setModulesByProject((prev) => ({
      ...prev,
      [projectId]:
        prev[projectId]?.map((m) =>
          m.id === moduleId ? { ...m, ...updated } : m
        ) || [],
    }));
  };

  const deleteModule = (projectId: string, moduleId: string) => {
    setModulesByProject((prev) => ({
      ...prev,
      [projectId]: prev[projectId]?.filter((m) => m.id !== moduleId) || [],
    }));
  };

  const addSubmodule = (
    projectId: string,
    moduleId: string,
    submodule: Submodule
  ) => {
    setModulesByProject((prev) => ({
      ...prev,
      [projectId]:
        prev[projectId]?.map((m) =>
          m.id === moduleId
            ? { ...m, submodules: [...m.submodules, submodule] }
            : m
        ) || [],
    }));
  };

  const updateSubmodule = (
    projectId: string,
    moduleId: string,
    submoduleIdx: number,
    newName: string
  ) => {
    setModulesByProject((prev) => ({
      ...prev,
      [projectId]:
        prev[projectId]?.map((m) =>
          m.id === moduleId
            ? {
              ...m,
              submodules: m.submodules.map((s, i) =>
                i === submoduleIdx ? { ...s, name: newName } : s
              ),
            }
            : m
        ) || [],
    }));
  };

  const deleteSubmodule = (
    projectId: string,
    moduleId: string,
    submoduleIdx: number
  ) => {
    setModulesByProject((prev) => ({
      ...prev,
      [projectId]:
        prev[projectId]?.map((m) =>
          m.id === moduleId
            ? {
              ...m,
              submodules: m.submodules.filter((_, i) => i !== submoduleIdx),
            }
            : m
        ) || [],
    }));
  };

  const addEmployee = (
    employeeData: Omit<Employee, "id" | "createdAt" | "updatedAt">
  ) => {
    const newEmployee: Employee = {
      ...employeeData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setEmployees((prev) => [...prev, newEmployee]);
  };

  const updateEmployee = (id: string, employeeData: Partial<Employee>) => {
    setEmployees((prev) =>
      prev.map((emp) =>
        emp.id === id
          ? { ...emp, ...employeeData, updatedAt: new Date().toISOString() }
          : emp
      )
    );
  };

  const deleteEmployee = (id: string) => {
    setEmployees((prev) => prev.filter((emp) => emp.id !== id));
  };

  const addProject = (project: Project) => {
    setProjects((prev) => [project, ...prev]);
  };

  const updateProject = (project: Project) => {
    setProjects((prev) => prev.map((p) => (p.id === project.id ? project : p)));
  };

  const deleteProject = (projectId: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
  };

  const addDefect = (defect: Defect) => {
    setDefects((prev) => [...prev, defect]);
  };

  const updateDefect = (defect: Defect) => {
    setDefects((prev) => prev.map((d) => (d.id === defect.id ? defect : d)));
  };

  const deleteDefect = (defectId: string) => {
    setDefects((prev) => prev.filter((d) => d.id !== defectId));
  };

  const addTestCase = (testCase: TestCase) => {
    setTestCases((prev) => [...prev, testCase]);
  };

  const updateTestCase = (testCase: TestCase) => {
    setTestCases((prev) =>
      prev.map((tc) => (tc.id === testCase.id ? testCase : tc))
    );
  };

  const deleteTestCase = (testCaseId: string) => {
    setTestCases((prev) => prev.filter((tc) => tc.id !== testCaseId));
  };

  const addRelease = (release: Release) => {
    // Implementation for adding release
    setReleases((prev) => [...prev, release]);
  };

  const updateRelease = (release: Release) => {
    // Implementation for updating release
  };

  const deleteRelease = (releaseId: string) => {
    // Implementation for deleting release
  };

  const updateWorkflowItem = (id: string, updates: Partial<WorkflowItem>) => {
    setWorkflowItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const moveTestCaseToRelease = (testCaseIds: string[], releaseId: string) => {
    // Implementation for moving test cases to a release
  };

  const allocateEmployee = (
    allocationData: Omit<BenchAllocation, "id" | "createdAt">
  ) => {
    // Implementation for allocating an employee
  };

  const updateWorkflowStatuses = (statuses: WorkflowStatus[]) => {
    setWorkflowStatuses(statuses);
  };

  const updateTransitions = (newTransitions: StatusTransition[]) => {
    setTransitions(newTransitions);
  };

  const addStatusType = (statusTypeData: Omit<StatusType, "id">) => {
    const newStatusType: StatusType = {
      ...statusTypeData,
      id: Date.now().toString(),
    };
    setStatusTypes((prev) => [...prev, newStatusType]);
  };

  const updateStatusType = (
    id: string,
    statusTypeData: Partial<StatusType>
  ) => {
    setStatusTypes((prev) =>
      prev.map((status) =>
        status.id === id ? { ...status, ...statusTypeData } : status
      )
    );
  };

  const deleteStatusType = (id: string) => {
    setStatusTypes((prev) => prev.filter((status) => status.id !== id));
  };

  // Fetch status types from API when authenticated
  useEffect(() => {
    const fetchStatusTypes = async () => {
      try {
        const token = tokenManager.getToken();
        if (!token) {
          return;
        }

        const response = await getAllDefectStatuses();

        // Map API response to internal StatusType format
        const apiStatusTypes = response.data.map((status: any) => ({
          id: String(status.id),
          name: status.defectStatusName,
          color: status.colorCode
        }));

        setStatusTypes(apiStatusTypes);
      } catch (error) {
        console.error('Failed to fetch status types:', error);
        // Fallback to default status types if API fails
        setStatusTypes([
          { id: "1", name: "NEW", color: "#2a3eb1" },
          { id: "2", name: "OPEN", color: "#9c27b0" },
          { id: "3", name: "REJECT", color: "#10B981" },
          { id: "4", name: "FIXED", color: "#F59E0B" },
          { id: "5", name: "CLOSED", color: "#EF4444" },
          { id: "6", name: "REOPEN", color: "#06B6D4" },
          { id: "7", name: "DUPLICATE", color: "#618833" },
          { id: "8", name: "HOLD", color: "#ffeb3b" },
        ]);
      }
    };

    fetchStatusTypes();

    // Listen for custom refresh event from StatusWorkflow component
    const handleRefreshStatusTypes = (event: CustomEvent) => {
      const { statusTypes: refreshedStatusTypes } = event.detail;
      if (refreshedStatusTypes) {
        setStatusTypes(refreshedStatusTypes);
      }
    };

    window.addEventListener('refreshDefectStatuses', handleRefreshStatusTypes as EventListener);

    // Cleanup event listener
    return () => {
      window.removeEventListener('refreshDefectStatuses', handleRefreshStatusTypes as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!selectedProjectId) return;
    
    // Check if we already have modules in initial state for this project
    if (modulesByProject[selectedProjectId] && modulesByProject[selectedProjectId].length > 0) {
      console.log('AppContext: Using initial mock modules for project:', selectedProjectId);
      return;
    }

    getModulesByProjectId(selectedProjectId)
      .then((res) => {
        const modules = (res?.data || []).map((mod: any) => ({
          id: String(mod.id),
          name: mod.moduleName || mod.name,
          assignedDevs: [],
          submodules: (mod.submodules || []).map((sm: any) => ({
            id: String(sm.id),
            name: sm.subModuleName || sm.name,
            assignedDevs: [],
          })),
        }));
        if (modules.length > 0) {
          setModulesByProject((prev) => ({ ...prev, [selectedProjectId]: modules }));
        }
      })
      .catch(error => {
        console.error('Failed to fetch modules for project:', error.message);
        // Don't overwrite with empty array if we had initial data
      });
  }, [selectedProjectId, modulesByProject]);

  return (
    <AppContext.Provider
      value={{
        employees,
        projects,
        defects,
        testCases,
        releases,
        workflowItems,
        benchAllocations,
        workflowStatuses,
        transitions,
        statusTypes,
        selectedProjectId,
        setSelectedProjectId,
        addEmployee,
        updateEmployee,
        deleteEmployee,
        addProject,
        updateProject,
        deleteProject,
        addDefect,
        updateDefect,
        deleteDefect,
        addTestCase,
        updateTestCase,
        deleteTestCase,
        addRelease,
        updateRelease,
        deleteRelease,
        updateWorkflowItem,
        moveTestCaseToRelease,
        allocateEmployee,
        updateWorkflowStatuses,
        updateTransitions,
        addStatusType,
        updateStatusType,
        deleteStatusType,
        testCaseDefectMap,
        setTestCaseDefectMap,
        modulesByProject,
        setModulesByProject,
        addModule,
        updateModule,
        deleteModule,
        addSubmodule,
        updateSubmodule,
        deleteSubmodule,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
