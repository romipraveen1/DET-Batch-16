/**

 * TestExecution.tsx

 * 

 * This component integrates with the backend API to fetch allocated test cases for a release.

 * 

 * Backend Integration:

 * - API Endpoint: GET /api/v1/releasetestcase/filtersgroup

 * - Parameters: projectId, releaseId, moduleId (optional), subModuleId (optional)

 * - Response Format: 

 *   {

 *     "status": "success",

 *     "code": 2000,

 *     "message": "Release Testcase Retrieved Successfully",

 *     "data": [

 *       {

 *         "id": 1,

 *         "testCaseId": "TC001",

 *         "description": "Login functionality test",

 *         "steps": "1. Open login page, 2. Enter credentials, 3. Submit",

 *         "type": "Functional",

 *         "severity": "Critical"

 *       }

 *     ]

 *   }

 * 

 * Features:

 * - Fetches test cases when module and submodule are selected

 * - Maps backend response to frontend data structure

 * - Shows loading states and error handling

 * - Integrates with defect creation workflow

 */



import React, { useState, useEffect } from "react";

import { useNavigate, useParams } from "react-router-dom";

import { Card, CardContent } from "../components/ui/Card";

import { Button } from "../components/ui/Button";

import { Badge } from "../components/ui/Badge";

import { ChevronLeft, Eye, ChevronRight, Play, FileText, Calendar } from "lucide-react";

import { useApp } from "../context/AppContext";

import { Modal } from "../components/ui/Modal";

import { nanoid } from "nanoid";

import { Input } from "../components/ui/Input";



import { ProjectSelector } from "../components/ui/ProjectSelector";

import { ModuleSelector } from "../components/ui/ModuleSelector";

import { SubmoduleSelector } from "../components/ui/SubmoduleSelector";

import { projectReleaseCardView } from "../api/releaseView/ProjectReleaseCardView";

import { getReleaseTestCaseCounts } from "../api/releaseView/getReleaseTestCaseCount";

import { Toast } from "../components/ui/Toast";

import { updateReleaseStatus } from "../api/projectAllocationHistory/updateReleaseStatus";

import { getModulesByProject } from "../api/module/getModuleByProject";

import { getSubmodulesByModule } from "../api/submodule/getSubmodulesByModule";

import { getTestCasesByFilter } from "../api/testExecution/getTestCasesByFilter";

import {

  getExecutionStatuses as getSavedExecutionStatuses,

  setExecutionStatus as persistExecutionStatus,

  ExecutionStatus,

  updateReleaseTestCaseStatus,

} from "../api/testExecution/testExecution";

import { getSeverities } from "../api/severity";

import { getDefectTypes } from "../api/defectType";

import { getAllPriorities } from "../api/priority";

import { getAllDefectStatuses } from "../api/defectStatus";

import { getUsersByModuleSubmoduleAllocation, getUsersByAllocation } from "../api/module/getUsersByAllocation";


import { filterDefects, getDefectsByProjectId } from "../api/defect/filterDefectByProject";

import { updateDefectById } from "../api/defect/updateDefect";
import { getDefectTestCaseCounts } from "../api/releasetestcase";
import Priority from "./Priority";



// Define interfaces for our data types

interface TestCase {

  priority: string | null | undefined;

  id: string;

  module: string;

  subModule: string;

  description: string;

  steps: string;

  type: "functional" | "regression" | "smoke" | "integration";

  severity: "low" | "medium" | "high" | "critical";

  projectId: string;

  releaseId?: string;

  executionStatus?:

  | "not-started"

  | "in-progress"

  | "passed"

  | "failed"

  | "blocked";

  assignee?: string;

  defectId?: string;

  assignedto?: string;

  assignedTo?: string;

}





// Add mockQA if not already present

const mockQA: any[] = [

  // ... (copy from allocation.tsx, or keep minimal for fallback)

];



// --- MOCK DATA SECTION (copied from allocation.tsx) ---

// const mockModules = [ ... ]; // REMOVE this declaration, will use as fallback only

const fallbackMockModules = [

  {

    id: "auth",

    moduleName: "Authentication",

    submodules: [

      { id: "auth-bio", name: "Biometric Login" },

      { id: "auth-pin", name: "PIN Login" },

      { id: "auth-pass", name: "Password Reset" },

      { id: "auth-session", name: "Session Management" },

    ],

  },

  {

    id: "acc",

    moduleName: "Account Management",

    submodules: [

      { id: "acc-overview", name: "Account Overview" },

      { id: "acc-history", name: "Transaction History" },

      { id: "acc-statements", name: "Account Statements" },

      { id: "acc-settings", name: "Account Settings" },

    ],

  },

  {

    id: "payment",

    moduleName: "Payment",

    submodules: [

      { id: "pay-gateway", name: "Gateway Integration" },

      { id: "pay-methods", name: "Payment Methods" },

      { id: "pay-security", name: "Payment Security" },

      { id: "pay-processing", name: "Payment Processing" },

    ],

  },

  {

    id: "cart",

    moduleName: "Shopping Cart",

    submodules: [

      { id: "cart-management", name: "Cart Management" },

      { id: "cart-checkout", name: "Checkout Process" },

      { id: "cart-discounts", name: "Discounts & Coupons" },

      { id: "cart-inventory", name: "Inventory Check" },

    ],

  },

  {

    id: "user",

    moduleName: "User Management",

    submodules: [

      { id: "user-dashboard", name: "Dashboard" },

      { id: "user-profile", name: "Profile Management" },

      { id: "user-preferences", name: "User Preferences" },

      { id: "user-security", name: "Security Settings" },

    ],

  },

  {

    id: "analytics",

    moduleName: "Analytics",

    submodules: [

      { id: "analytics-realtime", name: "Real-time Data" },

      { id: "analytics-trends", name: "Trend Analysis" },

      { id: "analytics-metrics", name: "Key Metrics" },

      { id: "analytics-insights", name: "Data Insights" },

    ],

  },

  {

    id: "reporting",

    moduleName: "Reporting",

    submodules: [

      { id: "reports-custom", name: "Custom Reports" },

      { id: "reports-scheduled", name: "Scheduled Reports" },

      { id: "reports-export", name: "Data Export" },

      { id: "reports-sharing", name: "Report Sharing" },

    ],

  },

  {

    id: "visualization",

    moduleName: "Visualization",

    submodules: [

      { id: "visual-charts", name: "Charts" },

      { id: "visual-graphs", name: "Graphs" },

      { id: "visual-dashboards", name: "Dashboards" },

      { id: "visual-widgets", name: "Widgets" },

    ],

  },

];



// --- MOCK TEST CASES SECTION (copied from allocation.tsx) ---

const mockTestCases = [

  {

    id: "TC-AUT-BIO-0001",

    module: "Authentication",

    subModule: "Biometric Login",

    description: "Verify that users can log in using biometric authentication",

    steps: "Open the mobile banking app\nSelect biometric login option\nAuthenticate using fingerprint/face ID\nVerify successful login and redirection to dashboard",

    type: "functional",

    severity: "high",

    status: "active",

    projectId: "PR0001",

  },

  {

    id: "TC-AUT-PIN-0001",

    module: "Authentication",

    subModule: "PIN Login",

    description: "Test PIN login security features",

    steps: "Enter incorrect PIN 3 times\nVerify account lockout\nWait for lockout period\nEnter correct PIN\nVerify successful login",

    type: "functional",

    severity: "critical",

    status: "active",

    projectId: "PR0001",

  },

  {

    id: "TC-PAY-001",

    module: "Payment",

    subModule: "Gateway Integration",

    description: "Test new payment gateway integration",

    steps: "Add items to cart\nProceed to checkout\nSelect new payment method\nComplete payment\nVerify order confirmation",

    type: "integration",

    severity: "high",

    status: "active",

    projectId: "PR0001",

  },

  {

    id: "TC-CART-002",

    module: "Shopping Cart",

    subModule: "Cart Management",

    description: "Test enhanced cart functionality",

    steps: "Add multiple items to cart\nModify quantities\nRemove items\nApply discount codes\nVerify total calculation",

    type: "functional",

    severity: "medium",

    status: "active",

    projectId: "PR0001",

  },

  {

    id: "TC-USER-003",

    module: "User Management",

    subModule: "Dashboard",

    description: "Test new user dashboard features",

    steps: "Login to user account\nNavigate to dashboard\nView order history\nUpdate profile information\nSave changes",

    type: "functional",

    severity: "medium",

    status: "active",

    projectId: "PR0001",

  },

  {

    id: "TC-ANALYTICS-001",

    module: "Analytics",

    subModule: "Real-time Data",

    description: "Test real-time analytics data display",

    steps: "Access analytics dashboard\nSelect real-time data view\nVerify data updates\nExport data\nGenerate reports",

    type: "functional",

    severity: "high",

    status: "active",

    projectId: "PR0002",

  },

  {

    id: "TC-REPORTS-002",

    module: "Reporting",

    subModule: "Custom Reports",

    description: "Test custom report generation",

    steps: "Navigate to reports section\nCreate custom report\nSelect data parameters\nGenerate report\nDownload report",

    type: "functional",

    severity: "medium",

    status: "active",

    projectId: "PR0002",

  },

  {

    id: "TC-VISUAL-003",

    module: "Visualization",

    subModule: "Charts",

    description: "Test data visualization components",

    steps: "Select chart type\nConfigure data source\nCustomize appearance\nSave chart configuration\nShare chart",

    type: "functional",

    severity: "low",

    status: "active",

    projectId: "PR0002",

  },

];



// --- MOCK DATA SECTION (copied from allocation.tsx) ---

const mockReleases = (() => {

  // Try to get mockReleases from localStorage (set by allocation.tsx)

  try {

    const stored = localStorage.getItem('mockReleases');

    if (stored) return JSON.parse(stored);

  } catch (e) {}

  // Fallback to hardcoded mockReleases if not in localStorage

  return [

    {

      id: "R002",

      name: "Mobile Banking v2.1",

      version: "2.1.0",

      description: "Security enhancements and UI updates for mobile banking",

      projectId: "PR0001",

      status: "planned",

      releaseDate: "2024-04-01",

      testCases: ["TC-AUT-BIO-0001", "TC-AUT-PIN-0001"],

      features: ["Biometric login", "Quick transfer"],

      bugFixes: ["Fixed session timeout"],

      createdAt: "2024-03-10T09:00:00Z",

    },

    {

      id: "R003",

      name: "Inventory v1.2",

      version: "1.2.0",

      description: "Performance improvements and bug fixes for inventory system",

      projectId: "PR0003",

      status: "completed",

      releaseDate: "2024-02-15",

      testCases: [],

      features: ["Faster report generation"],

      bugFixes: ["Fixed database timeout"],

      createdAt: "2024-02-01T08:00:00Z",

    },

    {

      id: "R004",

      name: "E-commerce Platform v3.0",

      version: "3.0.0",

      description: "Major update with new payment gateway integration and improved user experience",

      projectId: "PR0001",

      status: "in-progress",

      releaseDate: "2024-05-15",

      testCases: ["TC-PAY-001", "TC-CART-002", "TC-USER-003"],

      features: ["New payment gateway", "Enhanced cart", "User dashboard"],

      bugFixes: ["Fixed checkout flow", "Improved search"],

      createdAt: "2024-04-01T10:00:00Z",

    },

    {

      id: "R005",

      name: "Analytics Dashboard v2.5",

      version: "2.5.0",

      description: "Advanced analytics with real-time data visualization and custom reports",

      projectId: "PR0002",

      status: "planned",

      releaseDate: "2024-06-01",

      testCases: ["TC-ANALYTICS-001", "TC-REPORTS-002", "TC-VISUAL-003"],

      features: ["Real-time analytics", "Custom reports", "Data export"],

      bugFixes: ["Fixed chart rendering", "Improved performance"],

      createdAt: "2024-04-15T14:00:00Z",

    },

  ];

})();



// Helper: Use mock data if API/server is not working

function useMockOrApiData(apiData: any, mockData: any): any {

  if (!apiData || (Array.isArray(apiData) && apiData.length === 0)) {

    return mockData;

  }

  return apiData;

}



export const TestExecution: React.FC = () => {

  const { projectId, releaseId } = useParams();

  const navigate = useNavigate();

  const {

    projects,

    releases,

    testCases,

    setSelectedProjectId,

    addDefect,

    testCaseDefectMap,

    setTestCaseDefectMap,

    defects,

    modulesByProject,

  } = useApp();

  const [selectedProject, setSelectedProject] = useState<string | null>(

    projectId || null

  );

  const [selectedRelease, setSelectedRelease] = useState<string | null>(

    releaseId || null

  );

  const [selectedModule, setSelectedModule] = useState("");

  const [selectedSubmodule, setSelectedSubmodule] = useState("");

  const [isViewStepsModalOpen, setIsViewStepsModalOpen] = useState(false);

  const [isViewTestCaseModalOpen, setIsViewTestCaseModalOpen] = useState(false);

  const [viewingTestCase, setViewingTestCase] = useState<TestCase | null>(null);
  console.log({viewingTestCase});
  

  const [executionStatuses, setExecutionStatuses] = useState<{

    [key: string]: TestCase["executionStatus"];

  }>({});

  const [defectModalOpen, setDefectModalOpen] = useState<string | null>(null);

  const [defectFormData, setDefectFormData] = useState({

    title: "",

    description: "",

    module: "",

    subModule: "",

    type: "bug",

    priority: "medium",

    severity: "medium",

    status: "NEW",

    projectId: projectId || "",

    releaseId: releaseId || "",

    testCaseId: "",

    assignedTo: 0,

    reportedBy: "",

    rejectionComment: "",

  });

  const [releaseLoading, setReleaseLoading] = useState(false);

  const [releaseError, setReleaseError] = useState("");

  const [projectReleaseCard, setProjectReleaseCard] = useState<any[]>([]);

   const [toast, setToast] = useState<{

    isOpen: boolean;

    message: string;

    type: "success" | "error";

  }>({

    isOpen: false,

    message: "",

    type: "success",

  });



  // MODULES STATE

  const [modules, setModules] = useState<any[]>([]);

  const [modulesLoading, setModulesLoading] = useState(false);

  const [modulesError, setModulesError] = useState("");



  // Add submodule state

  const [submodules, setSubmodules] = useState<any[]>([]);

  const [submodulesLoading, setSubmodulesLoading] = useState(false);

  const [submodulesError, setSubmodulesError] = useState("");



  // Add state for release test case counts

  const [releaseTestCaseCounts, setReleaseTestCaseCounts] = useState<{[key: string]: number}>({});

  const [releaseTestCaseCountsLoading, setReleaseTestCaseCountsLoading] = useState(false);



  // Add severities state

  const [severities, setSeverities] = useState<any[]>([]);



  // Add defect types state

  const [defectTypes, setDefectTypes] = useState<{ id: number; defectTypeName: string }[]>([]);



  // Add priorities state

  const [priorities, setPriorities] = useState<{ id: number; priority: string; color: string }[]>([]);



  // Add defect statuses state

  const [defectStatuses, setDefectStatuses] = useState<{ id: number; defectStatusName: string; colorCode: string }[]>([]);



  // Add allocated users state

  const [allocatedUsers, setAllocatedUsers] = useState<{ userId: number; userName: string; userRole?: string; userWithRole: string }[]>([]);

  const [allocatedUsersLoading, setAllocatedUsersLoading] = useState(false);

  

  // Add defect submission state

  const [defectSubmitting, setDefectSubmitting] = useState(false);

  

  // Add state for existing defects

  const [existingDefects, setExistingDefects] = useState<any[]>([]);

  const [defectsLoading, setDefectsLoading] = useState(false);

  

  // Add state to track test case that needs status update after defect creation

  const [pendingStatusUpdate, setPendingStatusUpdate] = useState<{

    testCase: any;

    status: TestCase["executionStatus"];

  } | null>(null);



  // Add state to track previous status before changing to "failed" (for cancel functionality)

  const [previousStatusBeforeFail, setPreviousStatusBeforeFail] = useState<{

    testCaseId: string;

    previousStatus: TestCase["executionStatus"];

  } | null>(null);



  // State to track if we're editing an existing defect

  const [editingDefect, setEditingDefect] = useState<any | null>(null);

  const [isEditingDefect, setIsEditingDefect] = useState(false);

  

  // Debug: Log when pending status update changes

  useEffect(() => {

    console.log("Pending status update changed:", pendingStatusUpdate);

  }, [pendingStatusUpdate]);



  // Add state to track defect assignments (defectId -> assignedUser)

  const [defectAssignments, setDefectAssignments] = useState<{[key: string]: string}>({});



  // Read allocations from localStorage (as set by allocation.tsx)

  const allocatedTestCasesMap = JSON.parse(localStorage.getItem('qaAllocatedTestCases') || '{}');

  const qaAllocationsMap = JSON.parse(localStorage.getItem('qaAllocations') || '{}');

  

  // Read test case defect mapping from localStorage for persistence

  const [localTestCaseDefectMap, setLocalTestCaseDefectMap] = useState<{[key: string]: string}>({});



  // Helper to get assigned QA for a test case in the selected release

  function getAssignedQAForRelease(testCaseId: string) {

    const allocations = qaAllocationsMap[selectedRelease || ''] || {};

    for (const [qaId, ids] of Object.entries(allocations)) {

      if ((ids as string[]).includes(testCaseId)) {

        // Find the QA name from the QA ID

        const qa = effectiveQA && effectiveQA.find((q: any) => q.id === qaId);

        return qa ? qa.name : qaId;

      }

    }

    return null;

  }



  // Helper to get assigned user for a defect

  function getAssignedUserForDefect(defectId: string) {

    return defectAssignments[defectId] || null;

  }



  // Fallback: try to find a matching defect for a test case when there is no direct mapping

  // Match by module, submodule and description coming from backend fields

  function normalize(text: string) {

    return (text || "")

      .toString()

      .toLowerCase()

      .replace(/\s+/g, " ")

      .trim();

  }



  // Helper function to extract field values with fallbacks for different naming conventions

  function extractFieldValue(obj: any, fieldNames: string[]): string {

    for (const fieldName of fieldNames) {

      if (obj[fieldName] !== undefined && obj[fieldName] !== null && obj[fieldName] !== '') {

        return obj[fieldName];

      }

    }

    return '';

  }



  function findMatchingDefectForTestCase(testCase: any) {

    if (!existingDefects || existingDefects.length === 0 || !testCase) return null;



    // Use helper function to extract field values with fallbacks

    const tcModule = normalize(extractFieldValue(testCase, ['module', 'moduleName', 'module_name']));

    const tcSubmodule = normalize(extractFieldValue(testCase, ['subModule', 'subModuleName', 'sub_module_name']));

    const tcDesc = normalize(extractFieldValue(testCase, ['description', 'release_test_case_description']));



    console.log("Looking for defect match for test case:", {

      id: testCase.id,

      module: tcModule,

      submodule: tcSubmodule,

      description: tcDesc,

      rawTestCase: testCase

    });



    const match = existingDefects.find((defect: any) => {

      // Use helper function to extract field values with fallbacks

      const dModule = normalize(extractFieldValue(defect, ['module_name', 'moduleName', 'module']));

      const dSubmodule = normalize(extractFieldValue(defect, ['sub_module_name', 'subModuleName', 'subModule']));

      const dDesc = normalize(extractFieldValue(defect, ['release_test_case_description', 'description', 'steps']));

      

      // Allow exact or partial description matches to be tolerant of small differences

      const descMatches = dDesc === tcDesc || 

                         (dDesc && tcDesc && (

                           dDesc.includes(tcDesc) || 

                           tcDesc.includes(dDesc) ||

                           dDesc.toLowerCase().includes(tcDesc.toLowerCase()) ||

                           tcDesc.toLowerCase().includes(dDesc.toLowerCase())

                         ));

      

      const moduleMatch = dModule === tcModule;

      const submoduleMatch = dSubmodule === tcSubmodule;

      

      console.log("Defect match attempt:", {

        defectId: defect.defectId || defect.id,

        dModule, dSubmodule, dDesc,

        moduleMatch, submoduleMatch, descMatches,

        rawDefect: defect

      });

      

      return moduleMatch && submoduleMatch && descMatches;

    });



    if (match) {

      console.log("Found matching defect:", match.defectId || match.id);

    } else {

      console.log("No matching defect found for test case:", testCase.id);

    }



    return match || null;

  }



  // Use mock data if modulesByProject or testCases are empty

  const safeProjectId = selectedProject || projectId || "";



  // Fetch modules when project changes

  useEffect(() => {

    if (selectedProject) {

      setModulesLoading(true);

      setModulesError("");

      getModulesByProject(selectedProject)

        .then((data) => setModules(data))

        .catch((err) => {

          setModulesError(err.message);

          setModules([]); // Do not fallback to mock data

        })

        .finally(() => setModulesLoading(false));

    } else {

      setModules([]);

    }

  }, [selectedProject]);



  // Read mockTestCases and mockQA from localStorage if available

  let storedMockTestCases = null;

  let storedMockQA = null;

  try {

    const stored = localStorage.getItem('mockTestCases');

    if (stored) storedMockTestCases = JSON.parse(stored);

    const storedQA = localStorage.getItem('mockQA');

    if (storedQA) storedMockQA = JSON.parse(storedQA);

  } catch (e) {}



  const effectiveTestCases = useMockOrApiData(testCases, storedMockTestCases || mockTestCases);

  const effectiveQA = storedMockQA || mockQA;



  // Update testCaseIdToQA to use effectiveQA for QA name mapping

  const testCaseIdToQA: Record<string, string> = {};

  if (qaAllocationsMap && Array.isArray(qaAllocationsMap.allocations)) {

    qaAllocationsMap.allocations.forEach((alloc: any) => {

      alloc.testCaseIds.forEach((tcId: string) => {

        const qa = effectiveQA && effectiveQA.find((q: any) => q.id === alloc.qaId || q.name === alloc.qaName);

        testCaseIdToQA[tcId] = qa ? qa.name : (alloc.qaName || alloc.qaId);

      });

    });

  }



  const [filteredTestCases, setFilteredTestCases] = useState<any[]>([]);



  // Filter test cases based on selected project, release, module, and submodule

  // Fetch test cases when module is selected (submodule is optional)

  useEffect(() => {

    const fetchTestCases = async () => {

      setFilteredTestCases([]); // Clear previous results

      // Fetch test cases if project, release, and module are selected
      // Submodule is optional - if not selected, fetch all test cases for the module

      if (selectedProject && selectedRelease && selectedModule) {

        setTestCasesLoading(true);

        try {

          const moduleObj = modules.find((m: any) => m.moduleName === selectedModule);
          const submoduleObj = selectedSubmodule ? 
            submodules.find((s: any) => (s.subModuleName || s.name) === selectedSubmodule) : null;

          const testCases = await getTestCasesByFilter({

            projectId: parseInt(selectedProject),

            releaseId: parseInt(selectedRelease),

            moduleId: moduleObj?.id,

            subModuleId: submoduleObj?.subModuleId,

          });



          console.log("Raw test cases from API:", testCases);



          // Enhance test cases with module and submodule information

          const enhancedTestCases = testCases.map((tc: any) => {

            // Map execution status from backend to frontend format

            const mapBackendStatusToFrontend = (backendStatus: string): TestCase["executionStatus"] => {

              if (!backendStatus) return "not-started";



              const status = backendStatus.toLowerCase();

              switch (status) {

                case "pass":

                case "passed":

                  return "passed";

                case "fail":

                case "failed":

                  return "failed";

                case "in-progress":

                case "in_progress":

                case "inprogress":

                  return "in-progress";

                case "blocked":

                  return "blocked";

                default:

                  return "not-started";

              }

            };



            // Extract execution status from various possible backend field names

            const backendStatus = tc.testCaseStatus ||

                                 tc.status ||

                                 tc.executionStatus ||

                                 tc.execution_status ||

                                 tc.test_case_status ||

                                 tc.releaseTestCaseStatus ||

                                 tc.release_test_case_status;



            return {

              ...tc,

              // Ensure our row key aligns with release test case id if provided by API

              id:

                tc.testCaseId ||

                tc.release_test_case_id ||

                tc.ReleaseTestCaseId ||

                tc.releaseTestCaseId ||

                tc.ReleaseTestCaseID ||

                tc.release_testcase_id ||

                tc.id,

              // Keep numeric backend PK for API calls
              backendId: tc.id,

              module: tc.module || tc.moduleName || selectedModule || "Unknown Module",

              subModule: tc.subModule || tc.subModuleName || selectedSubmodule || "Unknown Submodule",

              // Map backend fields to expected format

              description: tc.description || tc.release_test_case_description || "No description",

              steps: tc.steps || tc.test_steps || "No steps provided",

              type: tc.type || tc.test_case_type || "functional",

              severity: tc.severity || tc.severity_level || "medium",

              // Map execution status from backend

              executionStatus: mapBackendStatusToFrontend(backendStatus),

              // Map assignee fields

              assignee: tc.assignedTo || tc.assignee || "",

              assignedTo: tc.assignedTo || tc.assignee || "",

            };

          });







          // Update execution statuses with database values, preserving localStorage values where database has no status

          const databaseStatuses: {[key: string]: TestCase["executionStatus"]} = {};

          enhancedTestCases.forEach((tc: any) => {

            if (tc.executionStatus && tc.executionStatus !== "not-started") {

              databaseStatuses[tc.id] = tc.executionStatus;

            }

          });



          // Load saved execution statuses for this project+release

          let localStorageStatuses: Record<string, TestCase["executionStatus"]> = {};

          if (selectedProject && selectedRelease) {

            const saved = getSavedExecutionStatuses(selectedProject, selectedRelease);

            if (saved && Object.keys(saved).length > 0) {

              localStorageStatuses = saved as Record<string, TestCase["executionStatus"]>;

            }

          }



          // Merge database statuses with localStorage statuses (database takes priority)

          const mergedStatuses = { ...localStorageStatuses, ...databaseStatuses };

          console.log("Merged execution statuses (localStorage + database):", mergedStatuses);

          setExecutionStatuses(mergedStatuses);



          setFilteredTestCases(enhancedTestCases);

          // Fetch defect information for test cases using the new API
          try {
            console.log("🔴 DEBUG: Calling getDefectTestCaseCounts API with releaseId:", selectedRelease);
            
            if (selectedRelease) {
              console.log("🔴 DEBUG: Calling getDefectTestCaseCounts API...");
              const defectInfo = await getDefectTestCaseCounts(selectedRelease);
              console.log("🔴 DEBUG: Received response from new API:", defectInfo.data);
              
              const testCasesWithDefectInfo = enhancedTestCases.map((tc: any) => {
                // Map by testCaseId from the new API response
                const defectData = defectInfo.data?.find((d: any) => d.testCaseId === (tc.testCaseId || tc.id));
                console.log(`🔴 DEBUG: Mapping test case ${tc.testCaseId || tc.id} with defect data:`, defectData);
                
                return {
                  ...tc,
                 
                  defectId: defectData?.defectId || null,
                  assignedTo: defectData?.assignedTo || null,
                  priority: defectData?.priority || null,
                };
              });
              
              
              console.log("🔴 DEBUG: Final mapped test cases with defect info:", testCasesWithDefectInfo);
              setFilteredTestCases(testCasesWithDefectInfo);
            }
          } catch (defectError) {
            console.error("🔴 DEBUG: Error fetching defect information:", defectError);
          }

        } catch (err: any) {

          setFilteredTestCases([]);

          setModulesError(err.message || "Failed to fetch test cases");

        } finally {

          setTestCasesLoading(false);

        }

      }

    };



    fetchTestCases();

  }, [selectedProject, selectedRelease, selectedModule, selectedSubmodule, modules, submodules]);



  // Load saved execution statuses when project or release changes

  useEffect(() => {

    if (selectedProject && selectedRelease) {

      const saved = getSavedExecutionStatuses(selectedProject, selectedRelease);

      setExecutionStatuses(saved as Record<string, TestCase["executionStatus"]>);

    } else {

      setExecutionStatuses({});

    }

  }, [selectedProject, selectedRelease]);



  // Add state for module and submodule test case counts

  const [moduleTestCaseCounts, setModuleTestCaseCounts] = useState<{[key: string]: number}>({});

  const [submoduleTestCaseCounts, setSubmoduleTestCaseCounts] = useState<{[key: string]: number}>({});

  const [countsLoading, setCountsLoading] = useState(false);

  

  // Add state for test case loading

  const [testCasesLoading, setTestCasesLoading] = useState(false);



  // Fetch test case counts for all modules when project and release are selected

  useEffect(() => {

    const fetchModuleTestCaseCounts = async () => {

      if (selectedProject && selectedRelease && modules.length > 0) {

        setCountsLoading(true);

        const counts: {[key: string]: number} = {};

        

        try {

          // Fetch test cases for each module

          for (const module of modules) {

            const testCases = await getTestCasesByFilter({

              projectId: parseInt(selectedProject),

              releaseId: parseInt(selectedRelease),

              moduleId: module.id,

            });

            console.log(`Module ${module.moduleName} test cases:`, testCases);

            counts[module.moduleName] = testCases.length;

          }

          setModuleTestCaseCounts(counts);

        } catch (err: any) {

          console.error("Failed to fetch module test case counts:", err);

          setModuleTestCaseCounts({});

        } finally {

          setCountsLoading(false);

        }

      }

    };



    fetchModuleTestCaseCounts();

  }, [selectedProject, selectedRelease, modules]);



  // Fetch test case counts for submodules when a module is selected

  useEffect(() => {

    const fetchSubmoduleTestCaseCounts = async () => {

      if (selectedProject && selectedRelease && selectedModule && submodules.length > 0) {

        const counts: {[key: string]: number} = {};

        

        try {

          // Fetch test cases for each submodule

          for (const submodule of submodules) {

            const testCases = await getTestCasesByFilter({

              projectId: parseInt(selectedProject),

              releaseId: parseInt(selectedRelease),

              moduleId: modules.find((m: any) => m.moduleName === selectedModule)?.id,

              subModuleId: submodule.subModuleId,

            });

            console.log(`Submodule ${submodule.subModuleName || submodule.name} test cases:`, testCases);

            counts[submodule.subModuleName || submodule.name] = testCases.length;

          }

          setSubmoduleTestCaseCounts(counts);

        } catch (err: any) {

          console.error("Failed to fetch submodule test case counts:", err);

          setSubmoduleTestCaseCounts({});

        }

      }

    };



    fetchSubmoduleTestCaseCounts();

  }, [selectedProject, selectedRelease, selectedModule, submodules, modules]);







  useEffect(() => {

    if (selectedProject) {

      setSelectedProjectId(selectedProject);

    }

  }, [selectedProject, setSelectedProjectId]);



  useEffect(() => {

    if (selectedProject) {

      setReleaseLoading(true);

      setReleaseError("");

      

      // Fetch releases and test case counts in parallel

      Promise.all([

        projectReleaseCardView(selectedProject),

        getReleaseTestCaseCounts(selectedProject)

      ])

        .then(([releasesRes, testCaseCountsRes]) => {

          if (releasesRes.status === "success" || releasesRes.statusCode === "2000") {

            setProjectReleaseCard(releasesRes.data || []);

          } else {

            setReleaseError(releasesRes.message || "No releases found");

          }

          

          if (testCaseCountsRes.status === "success" || testCaseCountsRes.statusCode === 2000 || testCaseCountsRes.statusCode === 200) {

            const countsMap: {[key: string]: number} = {};

            console.log("Test case counts response:", testCaseCountsRes);

            

            // Handle different response data structures

            const data = testCaseCountsRes.data || [];

            

            if (Array.isArray(data)) {

              data.forEach((item: any) => {

                // Map by both releaseId and id for compatibility

                if (item.releaseId && typeof item.testCaseCount === 'number') {

                  countsMap[item.releaseId] = item.testCaseCount;

                }

                if (item.id && item.id !== item.releaseId && typeof item.testCaseCount === 'number') {

                  countsMap[item.id] = item.testCaseCount;

                }

                console.log(`Mapping release ${item.releaseId} (id: ${item.id}) to count ${item.testCaseCount}`);

              });

            } else {

              console.warn("Test case counts response data is not an array:", data);

            }

            

            console.log("Final counts map:", countsMap);

            setReleaseTestCaseCounts(countsMap);

          } else {

            console.error("Failed to fetch test case counts:", testCaseCountsRes.message);

            setReleaseTestCaseCounts({});

          }

        })

        .catch((error) => {

          console.log("Error fetching releases:", error);

          setReleaseError("Failed to fetch releases and test case counts");

          setReleaseTestCaseCounts({});

        })

        .finally(() => setReleaseLoading(false));

    }

  }, [selectedProject]);

  

  // Fetch severities on component mount

  useEffect(() => {

    getSeverities()

      .then(res => setSeverities(res.data))

      .catch(error => {

        console.error('Failed to fetch severities:', error.message);

        setSeverities([]);

      });

  }, []);



  // Fetch defect types on component mount

  useEffect(() => {

    getDefectTypes()

      .then(res => {

        console.log("Fetched defect types:", res.data);

        setDefectTypes(res.data);

      })

      .catch(error => {

        console.error('Failed to fetch defect types:', error.message);

        setDefectTypes([]);

      });

  }, []);



  // Fetch priorities on component mount

  useEffect(() => {

    getAllPriorities()

      .then(res => {

        console.log("Fetched priorities:", res.data);

        setPriorities(res.data);

      })

      .catch(error => {

        console.error('Failed to fetch priorities:', error.message);

        setPriorities([]);

      });

  }, []);



  // Fetch defect statuses on component mount

  useEffect(() => {

    getAllDefectStatuses()

      .then(res => {

        console.log("Fetched defect statuses:", res.data);

        setDefectStatuses(res.data);

      })

      .catch(error => {

        console.error('Failed to fetch defect statuses:', error.message);

        setDefectStatuses([]);

      });

  }, []);



  // Fetch allocated users when module or submodule changes

  useEffect(() => {

    const fetchAllocatedUsers = async () => {

      if (selectedProject && selectedModule) {

        setAllocatedUsersLoading(true);

        try {

          // Find module ID

          const moduleObj = modules.find((m: any) => m.moduleName === selectedModule);

          

          if (moduleObj?.id) {

            let users: any[] = [];

            // If submodule is also selected, fetch users for module + submodule
            if (selectedSubmodule) {
              const submoduleObj = submodules.find((s: any) => (s.subModuleName || s.name) === selectedSubmodule);
              
              if (submoduleObj?.subModuleId) {
                users = await getUsersByModuleSubmoduleAllocation(
                  parseInt(selectedProject),
                  moduleObj.id,
                  submoduleObj.subModuleId
                );
              }
            } else {
              // If only module is selected, fetch users for just the module
              users = await getUsersByAllocation(
                parseInt(selectedProject),
                moduleObj.id
              );
            }

            console.log("Fetched allocated users:", users);

            setAllocatedUsers(users);

          } else {

            setAllocatedUsers([]);

          }

        } catch (error: any) {

          console.error('Failed to fetch allocated users:', error.message);

          setAllocatedUsers([]);

        } finally {

          setAllocatedUsersLoading(false);

        }

      } else {

        setAllocatedUsers([]);

      }

    };



    fetchAllocatedUsers();

  }, [selectedProject, selectedModule, selectedSubmodule, modules, submodules]);



  // Load test case defect mapping from localStorage on component mount

  useEffect(() => {

    const savedMapping = localStorage.getItem('testCaseDefectMapping');

    if (savedMapping) {

      try {

        const parsedMapping = JSON.parse(savedMapping);

        console.log("Loaded test case defect mapping from localStorage:", parsedMapping);

        setLocalTestCaseDefectMap(parsedMapping);

        

        // Also update the global test case defect map

        setTestCaseDefectMap(parsedMapping);

      } catch (error) {

        console.error("Failed to parse test case defect mapping from localStorage:", error);

      }

    }

    

    // Load defect assignments from localStorage

    const savedAssignments = localStorage.getItem('defectAssignments');

    if (savedAssignments) {

      try {

        const parsedAssignments = JSON.parse(savedAssignments);

        console.log("Loaded defect assignments from localStorage:", parsedAssignments);

        setDefectAssignments(parsedAssignments);

      } catch (error) {

        console.error("Failed to parse defect assignments from localStorage:", error);

      }

    }

  }, []);

  

  // Sync local test case defect map with global map changes

  useEffect(() => {

    if (Object.keys(testCaseDefectMap).length > 0) {

      console.log("Global test case defect map updated:", testCaseDefectMap);

      setLocalTestCaseDefectMap(testCaseDefectMap);

      

      // Update localStorage with the latest mapping

      localStorage.setItem('testCaseDefectMapping', JSON.stringify(testCaseDefectMap));

    }

  }, [testCaseDefectMap]);

  

  // Cleanup function to clear mapping when component unmounts

  useEffect(() => {

    return () => {

      // Don't clear localStorage on unmount as we want to persist the data

      // Just clear the local state

      setLocalTestCaseDefectMap({});

      setDefectAssignments({});

      setPendingStatusUpdate(null);

      console.log("Clearing pending status update - component unmounting");

    };

  }, []);



  // Fetch existing defects when project or release changes

  useEffect(() => {

    const fetchExistingDefects = async () => {

      if (selectedProject) {

        setDefectsLoading(true);

        try {

          console.log("Fetching existing defects for project:", selectedProject);

          

          // Fetch defects for the current project

          const defects = await filterDefects({ 

            projectId: selectedProject,

            releaseId: selectedRelease ? parseInt(selectedRelease) : undefined

          });

          

          console.log("Fetched existing defects:", defects);

          console.log("First defect full object:", defects[0]);



          // Log each defect to understand the data structure

          defects.forEach((defect: any, index: number) => {

            console.log(`Defect ${index + 1}:`, {

              id: defect.id,

              defectId: defect.defectId,

              description: defect.description,

              moduleName: defect.moduleName,

              module_name: defect.module_name,

              subModuleName: defect.subModuleName,

              sub_module_name: defect.sub_module_name,

              assignedToName: defect.assignedToName,

              assigned_to_name: defect.assigned_to_name,

              testCaseId: defect.testCaseId,

              ReleaseTestCaseId: defect.ReleaseTestCaseId,

              releaseTestCaseId: defect.releaseTestCaseId

            });

          });

          

          setExistingDefects(defects);

          

          // Helper to normalize release test case id from defect payload

          const extractReleaseTestCaseIdFromDefect = (defect: any) =>

            defect.testCaseId ||

            defect.ReleaseTestCaseId ||

            defect.releaseTestCaseId ||

            defect.ReleaseTestCaseID ||

            defect.release_testcase_id ||

            defect.release_test_case_id ||

            defect.test_case_id;



          // Map defects to test cases and restore the mappings

          const defectMappings: {[key: string]: string} = {};

          const defectUserAssignments: {[key: string]: string} = {};

          

          defects.forEach((defect: any) => {

            // Try to find the test case ID from the defect data

            let testCaseId = defect.testCaseId || defect.ReleaseTestCaseId || defect.releaseTestCaseId;

            

            console.log("Processing defect:", {

              defectId: defect.defectId,

              testCaseId: defect.testCaseId,

              moduleName: defect.moduleName,

              subModuleName: defect.subModuleName,

              description: defect.description,

              assignedToName: defect.assignedToName

            });

            

            // If we can't find a direct test case ID, try to match by module/submodule and description

            if (!testCaseId && (defect.module_name || defect.moduleName) && (defect.sub_module_name || defect.subModuleName)) {

              // Find test cases that match the module/submodule and have similar description

              const matchingTestCase = filteredTestCases.find((tc: any) => {

                const tcModule = tc.module || tc.moduleName;

                const tcSubmodule = tc.subModule || tc.subModuleName;

                const dModule = defect.module_name || defect.moduleName;

                const dSub = defect.sub_module_name || defect.subModuleName;

                const dDesc = defect.description || defect.release_test_case_description;

                

                const moduleMatch = tcModule === dModule;

                const submoduleMatch = tcSubmodule === dSub;

                const descMatch = tc.description === dDesc || 

                                tc.description === defect.release_test_case_description ||

                                (dDesc && tc.description && (

                                  dDesc.toLowerCase().includes(tc.description.toLowerCase()) ||

                                  tc.description.toLowerCase().includes(dDesc.toLowerCase())

                                ));

                

                console.log("Matching attempt:", {

                  tcModule, tcSubmodule, tcDescription: tc.description,

                  dModule, dSub, dDesc,

                  moduleMatch, submoduleMatch, descMatch

                });

                

                return moduleMatch && submoduleMatch && descMatch;

              });

              

              if (matchingTestCase) {

                testCaseId = matchingTestCase.id;

                console.log("Found matching test case:", matchingTestCase.id);

              }

            }

            

            if (testCaseId) {

              // Map the defect ID (use defectId if available, otherwise use id)

              const defectId = defect.defectId || `DEF-${defect.id.toString().padStart(4, '0')}`;

              defectMappings[testCaseId] = defectId;

              

              // Map the assigned user (only if it exists in the backend data)

              const assignedUser = defect.assigned_to_name || defect.assignedToName;

              if (assignedUser) {

                defectUserAssignments[defectId] = assignedUser;

              }

              



            } else {

              console.log(`Could not map defect ${defect.defectId} - no test case match found`);

            }

          });

          

          // Update the test case defect mappings with backend data (merge, don't overwrite unknowns)

          if (Object.keys(defectMappings).length > 0) {

            console.log("Merging defect mappings from backend:", defectMappings);

            setTestCaseDefectMap((prev: any) => {

              const merged = { ...(prev || {}), ...defectMappings };

              setLocalTestCaseDefectMap(merged);

              localStorage.setItem('testCaseDefectMapping', JSON.stringify(merged));

              return merged;

            });

          }

          

          // Update defect assignments with backend data (merge, but preserve local assignments)

          console.log("Current defect assignments before merge:", defectAssignments);

          console.log("Backend defect assignments to merge:", defectUserAssignments);



          setDefectAssignments((prev) => {

            // Always merge, even if backend has no assignments (to preserve local ones)

            const merged = { ...(prev || {}), ...defectUserAssignments };

            localStorage.setItem('defectAssignments', JSON.stringify(merged));

            console.log("Final merged defect assignments:", merged);

            return merged;

          });

          

        } catch (error: any) {

          console.error('Failed to fetch existing defects:', error.message);

          setExistingDefects([]);

        } finally {

          setDefectsLoading(false);

        }

      } else {

        setExistingDefects([]);

      }

    };



    fetchExistingDefects();

  }, [selectedProject, selectedRelease, filteredTestCases]);



  // Refresh defect data when component mounts or test cases are loaded

  useEffect(() => {

    if (selectedProject && selectedRelease && filteredTestCases.length > 0) {

      // Small delay to ensure test cases are fully loaded

      const timer = setTimeout(() => {

        refreshDefectData(false); // Don't show toast for automatic refresh

      }, 500);

      

      return () => clearTimeout(timer);

    }

  }, [selectedProject, selectedRelease, filteredTestCases.length]);



  // Periodic refresh of defect data to keep it in sync

  useEffect(() => {

    if (selectedProject && selectedRelease) {

      // Refresh defect data every 30 seconds to keep it in sync

      const interval = setInterval(() => {

        if (filteredTestCases.length > 0) {

          refreshDefectData(false); // Don't show toast for automatic refresh

        }

      }, 30000); // 30 seconds

      

      return () => clearInterval(interval);

    }

  }, [selectedProject, selectedRelease, filteredTestCases.length]);



  // Filter releases for selected project (API or mock fallback)

  const safeReleases = Array.isArray(releases) ? releases : [];

  const projectReleases = (safeReleases.length > 0

    ? safeReleases

    : mockReleases

  ).filter((r: any) => r.projectId === selectedProject);



  // DEBUG LOGGING to diagnose why no release cards are shown



  // Handle project selection

  const handleProjectSelect = (projectId: string) => {

    setSelectedProject(projectId);

    setSelectedProjectId(projectId); // Ensure global context is updated

    setSelectedRelease(null);

    setSelectedModule("");

    setSelectedSubmodule("");

    

    // Clear test case defect mapping when changing projects

    // (defects from different projects shouldn't be mixed)

    setTestCaseDefectMap({});

    setLocalTestCaseDefectMap({});

    setDefectAssignments({});

    setPendingStatusUpdate(null); // Clear pending status update

    console.log("Clearing pending status update - project changed");

    localStorage.removeItem('testCaseDefectMapping');

    localStorage.removeItem('defectAssignments');

  };



  // Handle release selection

  const handleReleaseSelect = (releaseId: string) => {

    setSelectedRelease(releaseId);

    setSelectedModule("");

    setSelectedSubmodule("");

    

    // Clear test case defect mapping when changing releases

    // (defects from different releases shouldn't be mixed)

    setTestCaseDefectMap({});

    setLocalTestCaseDefectMap({});

    setDefectAssignments({});

    setPendingStatusUpdate(null); // Clear pending status update

    console.log("Clearing pending status update - release changed");

    localStorage.removeItem('testCaseDefectMapping');

    localStorage.removeItem('defectAssignments');

  };



  // Update handleModuleSelect to fetch test cases for the selected module

  const handleModuleSelect = async (moduleName: string) => {

    setSelectedModule(moduleName);

    setSelectedSubmodule("");

    setSubmodules([]);

    setSubmodulesLoading(true);

    setSubmodulesError("");

    setFilteredTestCases([]);

    try {

      const moduleObj = modules.find((m: any) => m.moduleName === moduleName);

      if (moduleObj && moduleObj.id) {

        // Fetch submodules
        const submods = await getSubmodulesByModule(moduleObj.id);

        setSubmodules(submods);

        // Fetch test cases for the selected module (without submodule)
        if (selectedProject && selectedRelease) {
          setTestCasesLoading(true);
          
          try {
            const testCases = await getTestCasesByFilter({
              projectId: parseInt(selectedProject),
              releaseId: parseInt(selectedRelease),
              moduleId: moduleObj.id,
              // Don't pass subModuleId to fetch all test cases for the module
            });

            console.log("Raw module test cases from API:", testCases);

            // Map API response to our expected format
            const mappedTestCases = testCases.map((tc: any) => {
              const mapBackendStatusToFrontend = (backendStatus: string): TestCase["executionStatus"] => {
                if (!backendStatus) return "not-started";
                const status = backendStatus.toLowerCase();
                switch (status) {
                  case "pass":
                  case "passed":
                    return "passed";
                  case "fail":
                  case "failed":
                    return "failed";
                  case "in-progress":
                  case "in_progress":
                  case "inprogress":
                    return "in-progress";
                  case "blocked":
                    return "blocked";
                  default:
                    return "not-started";
                }
              };

              return {
                id: tc.id?.toString() || tc.testCaseId?.toString() || "",
                testCaseId: tc.testCaseId || tc.id?.toString() || "",
                description: tc.description || "",
                steps: tc.steps || "",
                type: tc.type === "functionality" ? "functional" : (tc.type as TestCase["type"]) || "functional",
                severity: tc.severity?.toLowerCase() === "very high" ? "critical" : 
                         tc.severity?.toLowerCase() === "high" ? "high" :
                         tc.severity?.toLowerCase() === "medium" ? "medium" : "low",
                priority: tc.priority || null,
                projectId: selectedProject,
                releaseId: selectedRelease,
                executionStatus: mapBackendStatusToFrontend(tc.executionStatus),
                assignee: tc.assignedTo || tc.assignee || "",
                assignedTo: tc.assignedTo || tc.assignee || "",
                defectId: tc.defectId || null,
                module: moduleName,
                subModule: tc.subModule || tc.subModuleName || "",
              };
            });

            setFilteredTestCases(mappedTestCases);
            console.log("Mapped test cases for module:", mappedTestCases);
          } catch (testCaseError: any) {
            console.error("Error fetching test cases for module:", testCaseError);
            setFilteredTestCases([]);
          } finally {
            setTestCasesLoading(false);
          }
        }

      } else {

        setSubmodules([]);

        setFilteredTestCases([]);

      }

    } catch (err: any) {

      setSubmodulesError(err.message || "Failed to fetch submodules");

      setSubmodules([]);

      setFilteredTestCases([]);

    } finally {

      setSubmodulesLoading(false);

    }

  };



  // Update handleSubmoduleSelect to fetch test cases for the selected submodule

  const handleSubmoduleSelect = async (submoduleName: string) => {

    setSelectedSubmodule(submoduleName);

    setFilteredTestCases([]);

    const moduleObj = modules.find((m: any) => m.moduleName === selectedModule);

    const submoduleObj = submodules.find(

      (s: any) => (s.subModuleName || s.name) === submoduleName

    );

    if (moduleObj && moduleObj.id && submoduleObj && submoduleObj.subModuleId) {

      if (selectedProject && selectedRelease) {

        const testCases = await getTestCasesByFilter({

          projectId: parseInt(selectedProject),

          releaseId: parseInt(selectedRelease),

          moduleId: moduleObj.id,

          subModuleId: submoduleObj.subModuleId,

        });

        

        console.log("Raw submodule test cases from API:", testCases);

        

        // Map API response to our expected format

        const mappedTestCases = testCases.map((tc: any) => {

          // Map execution status from backend to frontend format

          const mapBackendStatusToFrontend = (backendStatus: string): TestCase["executionStatus"] => {

            if (!backendStatus) return "not-started";



            const status = backendStatus.toLowerCase();

            switch (status) {

              case "pass":

              case "passed":

                return "passed";

              case "fail":

              case "failed":

                return "failed";

              case "in-progress":

              case "in_progress":

              case "inprogress":

                return "in-progress";

              case "blocked":

                return "blocked";

              default:

                return "not-started";

            }

          };



          // Extract execution status from various possible backend field names

          const backendStatus = tc.testCaseStatus ||

                               tc.status ||

                               tc.executionStatus ||

                               tc.execution_status ||

                               tc.test_case_status ||

                               tc.releaseTestCaseStatus ||

                               tc.release_test_case_status;



          return {

            ...tc,

            id:

              tc.releaseTestCaseId ||

              tc.ReleaseTestCaseId ||

              tc.ReleaseTestCaseID ||

              tc.release_testcase_id ||

              tc.release_test_case_id ||

              tc.testCaseId || // Use testCaseId from your backend response

              tc.id,

            module: tc.module || tc.moduleName || selectedModule || "Unknown Module",

            subModule: tc.subModule || tc.subModuleName || submoduleName || "Unknown Submodule",

            // Map backend fields to expected format

            description: tc.description || tc.release_test_case_description || "No description",

            steps: tc.steps || tc.test_steps || "No steps provided",

            type: tc.type || tc.test_case_type || "functional",

            severity: tc.severity || tc.severity_level || "medium",

            // Map execution status from backend

            executionStatus: mapBackendStatusToFrontend(backendStatus),

          };

        });

        

        console.log("Mapped submodule test cases:", mappedTestCases);



        // Update execution statuses with database values, preserving localStorage values where database has no status

        const databaseStatuses: {[key: string]: TestCase["executionStatus"]} = {};

        mappedTestCases.forEach((tc: any) => {

          if (tc.executionStatus && tc.executionStatus !== "not-started") {

            databaseStatuses[tc.id] = tc.executionStatus;

          }

        });



        // Merge database statuses with existing localStorage statuses

        setExecutionStatuses((prev) => {

          const merged = { ...prev, ...databaseStatuses };

          console.log("Merged execution statuses (database + localStorage):", merged);

          return merged;

        });



        setFilteredTestCases(mappedTestCases);

      }

    }

  };



  // Add manual refresh function for defect data

  const refreshDefectData = async (showToast: boolean = true) => {

    if (selectedProject) {

      try {

        console.log("Manually refreshing defect data...");

        setDefectsLoading(true);

        

        // Fetch defects for the current project

        const defects = await filterDefects({ 

          projectId: selectedProject,

          releaseId: selectedRelease ? parseInt(selectedRelease) : undefined

        });

        

        console.log("Refreshed defects:", defects);

        setExistingDefects(defects);

        

        // Map defects to test cases and restore the mappings

        const defectMappings: {[key: string]: string} = {};

        const defectUserAssignments: {[key: string]: string} = {};

        

        defects.forEach((defect: any) => {

          // Try to find the test case ID from the defect data

          let testCaseId = defect.testCaseId || defect.ReleaseTestCaseId || defect.releaseTestCaseId;

          

          console.log("Processing defect:", {

            defectId: defect.defectId,

            testCaseId: defect.testCaseId,

            moduleName: defect.moduleName,

            subModuleName: defect.subModuleName,

            description: defect.description,

            assignedToName: defect.assignedToName

          });

          

          // If we can't find a direct test case ID, try to match by module/submodule and description

          if (!testCaseId && (defect.module_name || defect.moduleName) && (defect.sub_module_name || defect.subModuleName)) {

            // Find test cases that match the module/submodule and have similar description

            const matchingTestCase = filteredTestCases.find((tc: any) => {

              const tcModule = tc.module || tc.moduleName;

              const tcSubmodule = tc.subModule || tc.subModuleName;

              const dModule = defect.module_name || defect.moduleName;

              const dSub = defect.sub_module_name || defect.subModuleName;

              const dDesc = defect.description || defect.release_test_case_description;

              

              const moduleMatch = tcModule === dModule;

              const submoduleMatch = tcSubmodule === dSub;

              const descMatch = tc.description === dDesc || 

                              tc.description === defect.release_test_case_description ||

                              (dDesc && tc.description && (

                                dDesc.toLowerCase().includes(tc.description.toLowerCase()) ||

                                tc.description.toLowerCase().includes(dDesc.toLowerCase())

                              ));

              

              console.log("Matching attempt:", {

                tcModule, tcSubmodule, tcDescription: tc.description,

                dModule, dSub, dDesc,

                moduleMatch, submoduleMatch, descMatch

              });

              

              return moduleMatch && submoduleMatch && descMatch;

            });

            

            if (matchingTestCase) {

              testCaseId = matchingTestCase.id;

              console.log("Found matching test case:", matchingTestCase.id);

            }

          }

          

          if (testCaseId) {

            // Map the defect ID (use defectId if available, otherwise use id)

            const defectId = defect.defectId || `DEF-${defect.id.toString().padStart(4, '0')}`;

            defectMappings[testCaseId] = defectId;

            

            // Map the assigned user

            if (defect.assigned_to_name || defect.assignedToName) {

              defectUserAssignments[defectId] = defect.assigned_to_name || defect.assignedToName;

            }

            

            console.log(`Mapped defect ${defectId} to test case ${testCaseId}, assigned to ${defect.assigned_to_name || defect.assignedToName}`);

          } else {

            console.log(`Could not map defect ${defect.defectId} - no test case match found`);

          }

        });

        

        // Update the test case defect mappings with backend data (merge)

        if (Object.keys(defectMappings).length > 0) {

          console.log("Merging defect mappings from backend:", defectMappings);

          setTestCaseDefectMap((prev: any) => {

            const merged = { ...(prev || {}), ...defectMappings };

            setLocalTestCaseDefectMap(merged);

            localStorage.setItem('testCaseDefectMapping', JSON.stringify(merged));

            return merged;

          });

        }

        

        // Update defect assignments with backend data (merge)

        if (Object.keys(defectUserAssignments).length > 0) {

          console.log("Merging defect assignments from backend:", defectUserAssignments);

          setDefectAssignments((prev) => {

            const merged = { ...(prev || {}), ...defectUserAssignments };

            localStorage.setItem('defectAssignments', JSON.stringify(merged));

            return merged;

          });

        }

        

        // Show success message only if showToast is true

        if (showToast) {

          setToast({

            isOpen: true,

            message: "Defect data refreshed successfully!",

            type: "success"

          });

        }

        

      } catch (error: any) {

        console.error('Failed to refresh defect data:', error.message);

        if (showToast) {

          setToast({

            isOpen: true,

            message: "Failed to refresh defect data",

            type: "error"

          });

        }

      } finally {

        setDefectsLoading(false);

      }

    }

  };



  // Handle execution status change

  const handleExecutionStatusChange = (

    testCaseId: string,

    status: TestCase["executionStatus"]

  ) => {

    setExecutionStatuses((prev) => {

      const updated = { ...prev, [testCaseId]: status };

      if (selectedProject && selectedRelease) {

        // Persist to localStorage for this project + release

        persistExecutionStatus(

          selectedProject,

          selectedRelease,

          testCaseId,

          status as ExecutionStatus

        );

      }

      return updated;

    });

  };



  // Helpers for backend payload defaults

  const getDefaultPriorityId = (): number => {

    const medium = priorities.find((p) => (p.priority || "").toLowerCase() === "medium");

    return medium?.id || priorities[0]?.id || 1;

  };



  const getDefaultDefectStatusId = (): number => {

    const newStatus = defectStatuses.find((s) => (s.defectStatusName || "").toLowerCase() === "new");

    return newStatus?.id || defectStatuses[0]?.id || 3;

  };



  const getReleaseTestCaseId = (tc: any): string | number => {
    // Prefer numeric backend primary key stored as backendId
    if (tc && tc.backendId != null) return tc.backendId;
    return tc?.releaseTestCaseId || tc?.ReleaseTestCaseId;

  };



  const persistStatusToBackend = async (tc: any, status: TestCase["executionStatus"]) => {

    if (!tc) {

      console.error("No test case provided for status update");

      return;

    }

    if (status !== "passed" && status !== "failed") {

      console.log("Status not supported by API:", status);

      return; // API supports PASS_STATUS/FAIL_STATUS

    }



    try {

      const releaseTestCaseId = getReleaseTestCaseId(tc);



      if (!releaseTestCaseId) {

        console.error("No releaseTestCaseId found for test case:", tc);

        setToast({ isOpen: true, message: "Cannot update status: Missing release test case ID", type: "error" });

        return;

      }



      console.log("Updating status for test case:", {

        testCaseId: tc.id,

        releaseTestCaseId,

        status,

        testCase: tc

      });



      const payload = {

        testCaseStatus: status === "passed" ? ("PASS" as const) : ("FAIL" as const),

        priorityId: getDefaultPriorityId(),

        assignedTo: defectFormData.assignedTo === 0 ? undefined : defectFormData.assignedTo,

      };



      console.log("API payload:", payload);



      await updateReleaseTestCaseStatus(releaseTestCaseId, payload);

      console.log("Status update successful for:", releaseTestCaseId);



      setToast({

        isOpen: true,

        message: `Test case ${tc.id} status updated to ${status}`,

        type: "success"

      });

    } catch (e: any) {

      console.error("Failed to update execution status:", {

        testCaseId: tc.id,

        error: e?.message || e,

        fullError: e

      });



      setToast({

        isOpen: true,

        message: `Failed to update status for ${tc.id}: ${e?.message || "Unknown error"}`,

        type: "error"

      });

    }

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



  const getExecutionStatusColor = (status: TestCase["executionStatus"]) => {

    switch (status) {

      case "passed":

        return "bg-green-100 text-green-800";

      case "failed":

        return "bg-red-100 text-red-800";

      case "in-progress":

        return "bg-blue-100 text-blue-800";

      case "blocked":

        return "bg-yellow-100 text-yellow-800";

      default:

        return "bg-gray-100 text-gray-800";

    }

  };



  const handleViewSteps = (testCase: TestCase) => {

    setViewingTestCase(testCase);

    setIsViewStepsModalOpen(true);

  };



  const handleViewTestCase = (testCase: TestCase) => {

    setViewingTestCase(testCase);

    setIsViewTestCaseModalOpen(true);

  };



  // Add getNextDefectId function (copied from Defects.tsx)

  const getNextDefectId = () => {

    const projectDefects = defects.filter(

      (d) => d.projectId === selectedProject

    );

    const ids = projectDefects

      .map((d) => d.id)

      .map((id) => parseInt(id.replace("DEF-", "")))

      .filter((n) => !isNaN(n));

    const nextNum = ids.length > 0 ? Math.max(...ids) + 1 : 1;

    return `DEF-${nextNum.toString().padStart(4, "0")}`;

  };



  // Helper function to format test case ID with abbreviation

  const formatTestCaseId = (id: string | number): string => {

    // Convert to string and extract numeric part

    const idStr = String(id);

    

    // If ID already contains "TC" or "TCTC", extract just the numeric part

    if (idStr.includes('TC')) {

      // Extract numbers from the end of the string

      const numericMatch = idStr.match(/\d+$/);

      if (numericMatch) {

        const numericId = numericMatch[0];

        return `TC${numericId}`;

      }

    }

    

    // Fallback: try to extract any numbers from the string

    const numericMatch = idStr.match(/\d+/);

    if (numericMatch) {

      const numericId = numericMatch[0];

      return `TC${numericId}`;

    }

    

    // If no numbers found, return original ID

    return idStr;

  };



  // Handler for input changes

  const handleDefectInputChange = (field: string, value: string | number) => {

    setDefectFormData((prev) => ({ ...prev, [field]: value }));

  };



  // Handler for submitting the defect form

  const handleDefectFormSubmit = async (e: React.FormEvent) => {

    e.preventDefault();

    

    console.log("Submitting defect form with data:", defectFormData);
    console.log("assignedTo value:", defectFormData.assignedTo, "type:", typeof defectFormData.assignedTo);

    

    try {

      setDefectSubmitting(true);

      

      // Validate form data completeness

      if (!defectFormData.description || !defectFormData.title) {

        throw new Error("Please fill in all required fields: description and steps.");

      }

      

      // Helper function to get ID from name

      const getIdFromName = (array: any[], name: string, idField: string = 'id', nameField: string = 'name'): number => {

        if (!array || array.length === 0) {

          console.warn(`Array is empty for ${nameField}:`, array);

          return 0;

        }

        

        // First try exact match

        let item = array.find(item => item[nameField] === name || item[`${nameField}Name`] === name);

        

        // If no exact match, try case-insensitive match

        if (!item) {

          item = array.find(item => 

            (item[nameField] || '').toLowerCase() === name.toLowerCase() || 

            (item[`${nameField}Name`] || '').toLowerCase() === name.toLowerCase()

          );

        }

        

        // If still no match, try partial match for severity (e.g., "high" matches "Very High")

        if (!item && nameField === 'name' && name) {

          item = array.find(item => 

            (item[nameField] || '').toLowerCase().includes(name.toLowerCase()) ||

            name.toLowerCase().includes((item[nameField] || '').toLowerCase())

          );

        }

        

        if (!item) {

          console.warn(`Could not find ${nameField} with value "${name}" in array:`, array);

          return 0;

        }

        return item[idField];

      };







      // Debug: Log the values we're trying to map

      console.log("Mapping form data to API request:");

      console.log("Form data:", defectFormData);

      console.log("Available arrays:", {

        priorities: priorities.length,

        defectStatuses: defectStatuses.length,

      });

      

      // Debug: Log the actual array contents for better troubleshooting

      console.log("Priorities array:", priorities);

      console.log("Defect statuses array:", defectStatuses);



      // Map form data to API request structure for release test case status update

      const apiRequestData = {

        priorityId: getIdFromName(priorities, defectFormData.priority, 'id', 'priority'),

        defectStatusId: getIdFromName(defectStatuses, defectFormData.status, 'id', 'defectStatusName'),

      };

      

      // Debug: Log individual field mappings

      console.log("Individual field mappings:");

      console.log("Priority mapping:", { value: defectFormData.priority, mappedId: apiRequestData.priorityId });

      console.log("Status mapping:", { value: defectFormData.status, mappedId: apiRequestData.defectStatusId });



      // Validate required fields

      if (!apiRequestData.priorityId || !apiRequestData.defectStatusId) {

        throw new Error("Missing required field data. Please check priority and status fields.");

      }



      console.log("API request data:", apiRequestData);



      // Get the release test case ID for the current test case

      const releaseTestCaseId = getReleaseTestCaseId(pendingStatusUpdate?.testCase);

      

      if (!releaseTestCaseId) {

        throw new Error("Cannot find release test case ID for this test case.");

      }



      // Call the API to update release test case status instead of creating defect
      console.log("Sending assignedTo ID:", defectFormData.assignedTo);

      let response;



      if (isEditingDefect && editingDefect) {

        // Update existing defect

        console.log("Updating existing defect:", editingDefect.id);



        const updatePayload = {

          description: defectFormData.description,

          steps: defectFormData.title, // Note: title maps to steps in the form

          priorityId: apiRequestData.priorityId,

          defectStatusId: apiRequestData.defectStatusId,

          assigntoId: defectFormData.assignedTo || null,

        };



        response = await updateDefectById(editingDefect.id, updatePayload);

        console.log("Defect update response:", response);



        // After successful defect update, refresh the defects data to update table

        if (selectedProject) {

          console.log("Refreshing defects data after update...");

          try {

            const updatedDefects = await getDefectsByProjectId(selectedProject);

            console.log("Updated defects fetched:", updatedDefects);



            // Update the defects in the app context

            if (updatedDefects && updatedDefects.length > 0) {

              // Update defect mappings and assignments

              const defectMappings: {[key: string]: string} = {};

              const defectUserAssignments: {[key: string]: string} = {};



              updatedDefects.forEach((defect: any) => {

                const testCaseId = defect.testCaseId || defect.ReleaseTestCaseId || defect.releaseTestCaseId;

                if (testCaseId) {

                  const defectId = defect.defectId || `DEF-${defect.id.toString().padStart(4, '0')}`;

                  defectMappings[testCaseId] = defectId;



                  const assignedUser = defect.assigned_to_name || defect.assignedToName;

                  if (assignedUser) {

                    defectUserAssignments[defectId] = assignedUser;

                  }

                }

              });



              // Update the mappings

              setTestCaseDefectMap(defectMappings);

              setDefectAssignments(defectUserAssignments);



              // Also update the existingDefects array to keep it in sync

              setExistingDefects(updatedDefects);



              console.log("Updated defect mappings:", defectMappings);

              console.log("Updated defect assignments:", defectUserAssignments);

            }

          } catch (error) {

            console.error("Error refreshing defects after update:", error);

          }

        }



      } else {

        // Create new defect via release test case status update

        response = await updateReleaseTestCaseStatus(releaseTestCaseId, {

          testCaseStatus: "FAIL",

          priorityId: apiRequestData.priorityId,

          assignedTo: defectFormData.assignedTo

        });

      }

      

      console.log("Release test case status updated successfully:", response);

      

      // Show success toast

      setToast({

        isOpen: true,

        message: isEditingDefect

          ? `Defect updated successfully!`

          : `Test case marked as failed successfully!`,

        type: "success"

      });



      // Update test case status in local state

      if (pendingStatusUpdate && pendingStatusUpdate.testCase) {

        setExecutionStatuses((prev) => ({

          ...prev,

          [pendingStatusUpdate.testCase.id]: "failed",

        }));



        // Persist to localStorage

        if (selectedProject && selectedRelease) {

          persistExecutionStatus(

            selectedProject,

            selectedRelease,

            pendingStatusUpdate.testCase.id,

            "failed" as ExecutionStatus

          );

        }

      } else if (previousStatusBeforeFail) {

        // Handle case where previousStatusBeforeFail is set but pendingStatusUpdate is not

        setExecutionStatuses((prev) => ({

          ...prev,

          [previousStatusBeforeFail.testCaseId]: "failed",

        }));



        // Persist to localStorage

        if (selectedProject && selectedRelease) {

          persistExecutionStatus(

            selectedProject,

            selectedRelease,

            previousStatusBeforeFail.testCaseId,

            "failed" as ExecutionStatus

          );

        }

      }

      

      // Force a re-render to update the table immediately

      setFilteredTestCases([...filteredTestCases]);

      

      // Update test case status in backend after successful defect creation

      if (pendingStatusUpdate && pendingStatusUpdate.testCase) {

        try {

          console.log("Updating test case status after defect creation:", pendingStatusUpdate);

          // Removed duplicate API call - status already updated above

          console.log("Test case status updated successfully after defect creation");

        } catch (error) {

          console.error("Failed to update test case status after defect creation:", error);

          // Don't show error toast here as defect was created successfully

        }

        // Clear the pending status update

        console.log("Clearing pending status update after successful API call");

        setPendingStatusUpdate(null);

      }

      

      // Sync defect data with backend to ensure consistency

      setTimeout(() => {

        refreshDefectData(true); // Show toast for manual refresh

      }, 1000);

      

      // Reset form data and close modal

      setDefectFormData({

        title: "",

        description: "",

        module: "",

        subModule: "",

        type: "bug",

        priority: "medium",

        severity: "medium",

        status: "NEW",

        projectId: projectId || "",

        releaseId: releaseId || "",

        testCaseId: "",

        assignedTo: 0,

        reportedBy: "",

        rejectionComment: "",

      });

      // Clear the previous status tracking since defect was successfully created

      setPreviousStatusBeforeFail(null);



      // Reset editing state

      setIsEditingDefect(false);

      setEditingDefect(null);



      setDefectModalOpen(null);



      // Small delay to ensure the table updates before closing the modal

      setTimeout(() => {

        setFilteredTestCases([...filteredTestCases]);

      }, 100);

      

    } catch (error: any) {

      console.error("Error creating defect:", error);

      

      // Provide more specific error messages

      let errorMessage = "Failed to create defect. Please try again.";

      

      if (error.response?.status === 400) {

        errorMessage = "Invalid defect data. Please check all required fields.";

      } else if (error.response?.status === 401) {

        errorMessage = "Unauthorized. Please check your authentication.";

      } else if (error.response?.status === 403) {

        errorMessage = "Access denied. You don't have permission to create defects.";

      } else if (error.response?.status === 500) {

        errorMessage = "Server error. Please try again later.";

      } else if (error.message) {

        errorMessage = error.message;

      }

      

      // Show error toast

      setToast({

        isOpen: true,

        message: errorMessage,

        type: "error"

      });

    } finally {

      setDefectSubmitting(false);

    }

  };



  // Handler for opening defect modal with prefilled data

  const handleFailClick = async (testCase: any) => {

    // Check if there's already a defect for this test case

    const existingDefectId = testCaseDefectMap[testCase.id];

    let existingDefect = null;



    if (existingDefectId) {

      // Find the existing defect from the defects list

      existingDefect = existingDefects.find(d => d.defectId === existingDefectId);

      console.log("Found existing defect for test case:", testCase.id, existingDefect);

    }



    // Set editing state

    setIsEditingDefect(!!existingDefect);

    setEditingDefect(existingDefect);



    // Map test case type to defect type

    const mapTestCaseTypeToDefectType = (testCaseType: string) => {

      // Try to find a matching defect type from the API

      if (defectTypes.length > 0) {

        const testCaseTypeLower = testCaseType.toLowerCase();



        // Look for exact matches first

        let defectType = defectTypes.find(dt =>

          dt.defectTypeName.toLowerCase().includes(testCaseTypeLower)

        );



        // If no exact match, try to find functional-related types

        if (!defectType && (testCaseTypeLower === 'functional' || testCaseTypeLower === 'regression' || testCaseTypeLower === 'smoke' || testCaseTypeLower === 'integration')) {

          defectType = defectTypes.find(dt =>

            dt.defectTypeName.toLowerCase().includes('functional') ||

            dt.defectTypeName.toLowerCase().includes('bug')

          );

        }



        // If still no match, return the first available defect type

        if (defectType) {

          return defectType.defectTypeName;

        }

      }



      // Fallback to hardcoded mapping

      switch (testCaseType) {

        case "functional":

          return "Functional Bug";

        case "regression":

          return "Functional Bug";

        case "smoke":

          return "Functional Bug";

        case "integration":

          return "Functional Bug";

        default:

          return defectTypes.length > 0 ? defectTypes[0]?.defectTypeName || "Bug" : "Bug";

      }

    };



    // Get module and submodule from test case or use currently selected ones

    const moduleName = testCase.module || testCase.moduleName || selectedModule || "Not specified";

    const submoduleName = testCase.subModule || testCase.subModuleName || selectedSubmodule || "Not specified";



    // Map test case type to defect type

    const mappedDefectType = mapTestCaseTypeToDefectType(testCase.type);



    // Store the test case that needs status update after defect creation

    console.log("Setting pending status update for test case:", testCase.id, "status: failed");

    setPendingStatusUpdate({

      testCase: testCase,

      status: "failed"

    });



    if (existingDefect) {

      // Load existing defect data for editing

      setDefectFormData({

        title: existingDefect.description || testCase.description,

        description: existingDefect.steps || testCase.steps,

        module: (existingDefect as any).module_name || (existingDefect as any).moduleName || moduleName,

        subModule: (existingDefect as any).submodule_name || (existingDefect as any).subModuleName || submoduleName,

        type: (existingDefect as any).defect_type_name || (existingDefect as any).defectTypeName || mappedDefectType,

        priority: (existingDefect as any).priority_name || (existingDefect as any).priorityName || "medium",

        severity: (existingDefect as any).severity_name || (existingDefect as any).severityName || testCase.severity || "medium",

        status: (existingDefect as any).defect_status_name || (existingDefect as any).statusName || "NEW",

        projectId: selectedProject || "",

        releaseId: selectedRelease || "",

        testCaseId: testCase.id,

        assignedTo: (existingDefect as any).assigned_to_id || 0,

        reportedBy: (existingDefect as any).assigned_by_name || (existingDefect as any).assignedByName || "",

        rejectionComment: (existingDefect as any).rejectionComment || "",

      });

    } else {

      // Create new defect data

      setDefectFormData({

        title: testCase.description,

        description: testCase.steps,

        module: moduleName,

        subModule: submoduleName,

        type: mappedDefectType,

        priority: "medium",

        severity: testCase.severity || "medium",

        status: "NEW",

        projectId: selectedProject || "",

        releaseId: selectedRelease || "",

        testCaseId: testCase.id,

        assignedTo: 0, // Don't pre-select any user - let user choose from dropdown

        reportedBy: "",

        rejectionComment: "",

      });

    }

    setDefectModalOpen(testCase.id);

  };



  // If we're in detailed execution view (release selected)

  if (selectedRelease) {

    const currentRelease = releases && releases.find((r) => r.id === selectedRelease);

    const currentProject = projects && projects.find((p) => p.id === selectedProject);

    





    // Only show test cases allocated to this release, with module/submodule filtering

    const allocatedIds = allocatedTestCasesMap[selectedRelease || ''] || [];

    let allocatedTestCases = effectiveTestCases.filter((tc: any) => allocatedIds.includes(tc.id));

    // If a module is selected, filter to that module

    if (selectedModule) {

      allocatedTestCases = allocatedTestCases.filter((tc: any) => tc.module === selectedModule);

    }

    // If a submodule is selected, filter to that submodule (must also match selected module)

    if (selectedSubmodule) {

      allocatedTestCases = allocatedTestCases.filter((tc: any) => tc.subModule === selectedSubmodule && (!selectedModule || tc.module === selectedModule));

    }



    // Get submodules for selected module

    const selectedModuleObj = modules && modules.find((m: any) => m.moduleName === selectedModule);

    const submodulesToShow = submodules.length > 0 ? submodules : selectedModuleObj?.submodules || [];



    return (

      <div className="max-w-6xl mx-auto py-8">

        {/* Fixed Header Section */}

        <div className="flex-none p-6 pb-4">

          <div className="flex justify-between items-center mb-4">

            <div className="space-y-1">

              <h1 className="text-2xl font-bold text-gray-900">

                Test Execution

              </h1>

              <p className="text-sm text-gray-500">

                {currentProject?.name} - {currentRelease?.name}

              </p>

            </div>

            <Button

              variant="secondary"

              onClick={() => setSelectedRelease(null)}

              className="flex items-center space-x-2"

            >

              <ChevronLeft className="w-4 h-4" />

              <span>Back</span>

            </Button>

          </div>



          {/* Module Selection Panel */}

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

                  {countsLoading ? (

                    <span className="text-gray-400 px-4 py-2">Loading test case counts...</span>

                  ) : modules.length > 0 ? (

                    modules.map((module) => {

                      const moduleTestCaseCount = moduleTestCaseCounts[module.moduleName] || 0;

                      return (

                        <Button

                          key={module.moduleId || module.id}

                          variant={

                            selectedModule === module.moduleName

                              ? "primary"

                              : "secondary"

                          }

                          onClick={() => handleModuleSelect(module.moduleName)}

                          className="whitespace-nowrap m-2"

                        >

                          {module.moduleName} ({moduleTestCaseCount})

                        </Button>

                      );

                    })

                  ) : (

                    <span className="text-gray-400 px-4 py-2">No modules found for this project.</span>

                  )}

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



          {/* Submodule Selection Panel */}

          <Card className="mb-4">

            <CardContent className="p-4">

              <h2 className="text-lg font-semibold text-gray-900 mb-3">

                Submodule Selection

              </h2>

              <div className="relative flex items-center min-h-[44px]">

                <button

                  onClick={() => {

                    const container =

                      document.getElementById("submodule-scroll");

                    if (container) container.scrollLeft -= 200;

                  }}

                  className="flex-shrink-0 z-10 bg-white shadow-md rounded-full p-1 hover:bg-gray-50 mr-2"

                >

                  <ChevronLeft className="w-5 h-5 text-gray-600" />

                </button>

                <div

                  id="submodule-scroll"

                  className="flex space-x-2 overflow-x-auto p-2 scroll-smooth flex-1"

                  style={{

                    scrollbarWidth: "none",

                    msOverflowStyle: "none",

                    maxWidth: "100%",

                  }}

                >

                  {submodulesLoading || countsLoading ? (

                    <span className="text-gray-400 px-4 py-2">Loading...</span>

                  ) : submodulesError ? (

                    <span className="text-red-400 px-4 py-2">{submodulesError}</span>

                  ) : submodulesToShow.length > 0 ? (

                    submodulesToShow.map((submodule: any) => {

                      const submoduleTestCaseCount = submoduleTestCaseCounts[submodule.subModuleName || submodule.name] || 0;

                      return (

                        <Button

                          key={submodule.subModuleId || submodule.id}

                          variant={

                            selectedSubmodule === (submodule.subModuleName || submodule.name)

                              ? "primary"

                              : "secondary"

                          }

                          onClick={() => handleSubmoduleSelect(submodule.subModuleName || submodule.name)}

                          className="whitespace-nowrap m-2"

                        >

                          {submodule.subModuleName || submodule.name} ({submoduleTestCaseCount})

                        </Button>

                      );

                    })

                  ) : (

                    <span className="text-gray-400 px-4 py-2">No submodules</span>

                  )}

                </div>

                <button

                  onClick={() => {

                    const container =

                      document.getElementById("submodule-scroll");

                    if (container) container.scrollLeft += 200;

                  }}

                  className="flex-shrink-0 z-10 bg-white shadow-md rounded-full p-1 hover:bg-gray-50 ml-2"

                >

                  <ChevronRight className="w-5 h-5 text-gray-600" />

                </button>

              </div>

            </CardContent>

          </Card>

        </div>



       



        {/* Content Area - Test Cases Table */}

        <div className="flex-1 px-6 pb-6">

          <div className="mb-4">

            <h3 className="text-lg font-semibold text-gray-900">Test Cases</h3>

          </div>

          <Card>

            <CardContent className="p-0">

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

                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">

                      Assigned To

                    </th>

                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">

                      Execution Status

                    </th>

                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">

                      Defect ID

                      {defectsLoading && (

                        <div className="inline-block ml-2">

                          <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>

                        </div>

                      )}

                    </th>

                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">

                      Actions

                    </th>

                  </tr>

                </thead>

                <tbody className="bg-white divide-y divide-gray-200">

                  {testCasesLoading ? (

                    <tr>

                      <td colSpan={9} className="px-6 py-8 text-center">

                        <div className="flex items-center justify-center space-x-2">

                          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>

                          <span className="text-gray-500">Loading test cases...</span>

                        </div>

                      </td>

                    </tr>

                  ) : filteredTestCases.length === 0 ? (

                    <tr>

                      <td colSpan={9} className="px-6 py-8 text-center text-gray-500">

                        {selectedModule && selectedSubmodule 

                          ? "No test cases found for the selected module and submodule."

                          : "Please select a module and submodule to view test cases."

                        }

                      </td>

                    </tr>

                  ) : (

                    filteredTestCases.map((testCase: any) => {

                    // Prioritize localStorage status over database status for immediate UI updates

                    // This allows users to change status (e.g., from fail to pass) and see immediate feedback

                    const databaseStatus = testCase.executionStatus;

                    const localStorageStatus = executionStatuses[testCase.id];

                    const status = localStorageStatus || databaseStatus || "not-started";

                    const isFailed = status === "failed";

                    const isPassed = status === "passed";



                    // Compute fallbacks for defect id and assigned user

                    const fallbackDefect = findMatchingDefectForTestCase(testCase);

                    const computedDefectId = testCaseDefectMap[testCase.id] || (fallbackDefect ? (fallbackDefect.defectId || `DEF-${String(fallbackDefect.id).padStart(4,'0')}`) : undefined);

                    const computedAssignedUser = computedDefectId ? (getAssignedUserForDefect(computedDefectId) || (fallbackDefect ? (fallbackDefect.assigned_to_name || fallbackDefect.assignedToName) : undefined)) : (fallbackDefect ? (fallbackDefect.assigned_to_name || fallbackDefect.assignedToName) : undefined);



                    // Debug logging for failed test cases

                    if (isFailed) {

                      console.log(`Debug for failed test case ${testCase.id}:`, {

                        status,

                        isFailed,

                        testCaseDefectMap: testCaseDefectMap[testCase.id],

                        fallbackDefect,

                        computedDefectId,

                        computedAssignedUser,

                        defectAssignments,

                        existingDefectsCount: existingDefects.length,

                        testCaseDefectMapKeys: Object.keys(testCaseDefectMap),

                        defectAssignmentsKeys: Object.keys(defectAssignments)

                      });

                    }









                    

                    return (

                      <tr key={testCase.id} className="hover:bg-gray-50">

                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">

                          {formatTestCaseId(testCase.id)}

                        </td>

                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs description-cell" title={testCase.description}>

                          {testCase.description}

                        </td>

                        <td className="px-6 py-4 text-sm text-gray-500">

                          <button

                            onClick={() => handleViewSteps(testCase)}

                            className="text-blue-600 hover:text-blue-800 flex items-center space-x-1"

                            title="View Steps"

                          >

                            <Eye className="w-4 h-4" />

                            <span>View</span>

                          </button>

                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">

                          {testCase.type}

                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">

                          {renderColoredSpan(testCase.severity, getSeverityColor(testCase.severity))}

                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">

                          {isFailed ? (
                            (() => {
                              // Priority 1: Show assignedTo from new API if available
                              if (testCase.assignedTo) {
                                return (
                                  <span className="font-medium text-blue-700">
                                    {testCase.assignedTo}
                                  </span>
                                );
                              }

                              // Priority 2: Show defect assignment when status is "failed"
                              if (computedDefectId) {
                                return (
                                  <span className="font-medium text-blue-700">
                                    {computedAssignedUser || "No Assignment"}
                                  </span>
                                );
                              }

                              // Show when status is failed but no defect ID
                              return (
                                <span className="font-medium text-red-600">
                                  Failed - No Defect ID
                                </span>
                              );
                            })()
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}

                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">

                          <div className="flex rounded border border-gray-200 bg-white shadow overflow-hidden w-fit">

                            <button

                              type="button"

                              className={`px-3 py-1 text-xs font-semibold focus:outline-none transition-colors duration-200 ${isPassed

                                  ? "bg-green-500 text-white"

                                  : "bg-white text-gray-700 hover:bg-green-100"

                                }`}

                              style={{

                                borderTopLeftRadius: 6,

                                borderBottomLeftRadius: 6,

                              }}

                              onClick={() => {

                                // Clear any previous status tracking when user clicks Pass

                                setPreviousStatusBeforeFail(null);



                                const newStatus: TestCase["executionStatus"] = "passed";

                                setExecutionStatuses((prev) => ({

                                  ...prev,

                                  [testCase.id]: newStatus,

                                }));

                                if (selectedProject && selectedRelease) {

                                  persistExecutionStatus(

                                    selectedProject,

                                    selectedRelease,

                                    testCase.id,

                                    newStatus as ExecutionStatus

                                  );

                                }

                                persistStatusToBackend(testCase, newStatus);

                                setDefectModalOpen(null);

                              }}

                              aria-pressed={isPassed}

                            >

                              Pass

                            </button>

                            <button

                              type="button"

                              className={`px-3 py-1 text-xs font-semibold focus:outline-none transition-colors duration-200 ${isFailed

                                  ? "bg-red-500 text-white"

                                  : "bg-white text-gray-700 hover:bg-red-100"

                                }`}

                              style={{

                                borderTopRightRadius: 6,

                                borderBottomRightRadius: 6,

                                borderLeft: "1px solid #e5e7eb",

                              }}

                              onClick={() => {

                                if (!isFailed) {

                                  // Store the previous status before opening the fail modal

                                  const currentStatus = status;

                                  console.log("Storing previous status before fail:", {

                                    testCaseId: testCase.id,

                                    currentStatus,

                                    databaseStatus: testCase.executionStatus,

                                    localStorageStatus: executionStatuses[testCase.id]

                                  });

                                  setPreviousStatusBeforeFail({

                                    testCaseId: testCase.id,

                                    previousStatus: currentStatus

                                  });



                                  // Don't change status to "failed" yet - wait for defect creation

                                  // Just open the defect creation modal

                                  handleFailClick(testCase);

                                } else {

                                  // If already failed, just open the modal to edit the defect

                                  handleFailClick(testCase);

                                }

                              }}

                              aria-pressed={isFailed}

                            >

                              Fail

                            </button>

                          </div>

                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">

                          {isFailed ? (
                            (() => {
                              // Priority 1: Show defectId from new API if available
                              if (testCase.defectId) {
                                return (
                                  <button
                                    className="px-3 py-1 rounded-full bg-blue-100 text-blue-800 font-semibold hover:bg-blue-200 transition text-xs"
                                    onClick={() =>
                                      navigate(
                                        `/projects/${selectedProject}/defects?highlight=${testCase.defectId}`
                                      )
                                    }
                                    title="View Defect"
                                  >
                                    {testCase.defectId}
                                  </button>
                                );
                              }

                              // Priority 2: Show existing defect when status is "failed"
                              if (computedDefectId) {
                                return (
                                  <div className="flex flex-col items-start space-y-1">
                                    <button
                                      className="px-3 py-1 rounded-full bg-blue-100 text-blue-800 font-semibold hover:bg-blue-200 transition text-xs"
                                      onClick={() =>
                                        navigate(
                                          `/projects/${selectedProject}/defects?highlight=${computedDefectId}`
                                        )
                                      }
                                      title="View Defect"
                                    >
                                      {computedDefectId}
                                    </button>
                                    <span className="text-xs text-green-600 font-medium">✓ Defect Created</span>
                                  </div>
                                );
                              }

                              // Show when status is failed but no defect ID
                              return (
                                <span className="text-xs text-red-600">
                                  Failed - No Defect ID
                                </span>
                              );
                            })()
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}

                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">

                          <button

                            onClick={() => handleViewTestCase(testCase)}

                            className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"

                            title="View"

                          >

                            <Eye className="w-4 h-4" />

                          </button>

                        </td>

                      </tr>

                    );

                  })

                  )}

                </tbody>

              </table>

            </CardContent>

          </Card>

        </div>



        {/* View Steps Modal */}

        <Modal

          isOpen={isViewStepsModalOpen}

          onClose={() => {

            setIsViewStepsModalOpen(false);

            setViewingTestCase(null);

          }}

          title={`Test Steps - ${viewingTestCase?.id ? formatTestCaseId(viewingTestCase.id) : 'N/A'}`}

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

          title={`Test Case Details - ${viewingTestCase?.id ? formatTestCaseId(viewingTestCase.id) : 'N/A'}`}

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

                  {renderColoredSpan(viewingTestCase.severity, getSeverityColor(viewingTestCase.severity))}

                </div>

                <div>

                  <h3 className="text-sm font-medium text-gray-500">Priority</h3>
                  
                  {renderColoredSpan(viewingTestCase.priority, getSeverityColor(viewingTestCase.priority))}

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



        {/* Defect Entry Modal */}

        <Modal

          isOpen={!!defectModalOpen}

          onClose={() => {

            console.log("Modal onClose triggered. Previous status data:", previousStatusBeforeFail);

            // Revert to previous status if user closes modal after clicking fail

            if (previousStatusBeforeFail) {

              console.log("Modal close - Reverting status from failed to:", previousStatusBeforeFail.previousStatus);



              setExecutionStatuses((prev) => ({

                ...prev,

                [previousStatusBeforeFail.testCaseId]: previousStatusBeforeFail.previousStatus,

              }));



              // Also update localStorage

              if (selectedProject && selectedRelease) {

                persistExecutionStatus(

                  selectedProject,

                  selectedRelease,

                  previousStatusBeforeFail.testCaseId,

                  previousStatusBeforeFail.previousStatus as ExecutionStatus

                );

              }



              // Clear the previous status tracking

              setPreviousStatusBeforeFail(null);

            }



            setDefectModalOpen(null);

            // Clear pending status update when modal is closed without submitting

            console.log("Clearing pending status update - modal closed");

            setPendingStatusUpdate(null);

            setDefectFormData({

              title: "",

              description: "",

              module: "",

              subModule: "",

              type: "bug",

              priority: "medium",

              severity: "medium",

              status: "NEW",

              projectId: projectId || "",

              releaseId: releaseId || "",

              testCaseId: "",

              assignedTo: 0,

              reportedBy: "",

              rejectionComment: "",

            });

          }}

          title="Add New Defect"

          size="lg"

        >



          <form onSubmit={handleDefectFormSubmit} className="space-y-4">

            <div>

              <label className="block text-sm font-medium text-gray-700 mb-1">

                Brief Description

              </label>

              <input

                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"

                value={defectFormData.title}

                disabled

                readOnly

              />

            </div>

            <div>

              <label className="block text-sm font-medium text-gray-700 mb-1">

                Steps

              </label>

              <textarea

                value={defectFormData.description}

                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"

                rows={3}

                disabled

                readOnly

              />

            </div>

            <div className="grid grid-cols-2 gap-4">

              <div>

                <label className="block text-sm font-medium text-gray-700 mb-1">

                  Modules

                </label>

                <input

                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"

                  value={defectFormData.module}

                  disabled

                />

              </div>

              <div>

                <label className="block text-sm font-medium text-gray-700 mb-1">

                  Submodules

                </label>

                <input

                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"

                  value={defectFormData.subModule}

                  disabled

                />

              </div>

            </div>

            <div className="grid grid-cols-2 gap-4">

              <div>

                <label className="block text-sm font-medium text-gray-700 mb-1">

                  Severity

                </label>

                <input

                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"

                  value={defectFormData.severity}

                  disabled

                />

              </div>

              <div>

                <label className="block text-sm font-medium text-gray-700 mb-1">

                  Priority

                </label>

                <select

                  value={defectFormData.priority}

                  onChange={(e) =>

                    handleDefectInputChange("priority", e.target.value)

                  }

                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"

                  required

                >

                  <option value="">Select priority</option>

                  {priorities.length > 0 ? (

                    priorities.map((priority) => (

                      <option key={priority.id} value={priority.priority}>

                        {priority.priority}

                      </option>

                    ))

                  ) : (

                    <>

                      <option value="high">High</option>

                      <option value="medium">Medium</option>

                      <option value="low">Low</option>

                    </>

                  )}

                </select>

              </div>

            </div>

            <div className="grid grid-cols-2 gap-4">

              <div>

                <label className="block text-sm font-medium text-gray-700 mb-1">

                  Type

                </label>

                <input

                  value={defectFormData.type || "Not specified"}

                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"

                  disabled

                  readOnly

                />

              </div>

              <div>

                <label className="block text-sm font-medium text-gray-700 mb-1">

                  Status

                </label>

                <input

                  value="NEW"

                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"

                  disabled

                  readOnly

                />

              </div>

            </div>



            <div className="grid grid-cols-2 gap-4">

              <div>

                <label className="block text-sm font-medium text-gray-700 mb-1">

                  Assigned To

                </label>

                <select

                  value={defectFormData.assignedTo}

                  onChange={(e) =>

                    handleDefectInputChange("assignedTo", e.target.value)

                  }

                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"

                  required

                >

                  <option value="">Select assigned user</option>

                  {allocatedUsersLoading ? (

                    <option value="" disabled>Loading users...</option>

                  ) : allocatedUsers.length > 0 ? (

                                                          allocatedUsers.map((user) => (

                                        <option key={user.userId} value={user.userId}>

                                          {user.userName}

                                        </option>

                                      ))

                  ) : (

                    <>
                    

                    </>

                  )}

                </select>

              </div>

            </div>

            <div className="flex justify-end space-x-3 pt-4">

              <Button

                type="button"

                variant="secondary"

                onClick={() => {

                  // Revert to previous status if user cancels after clicking fail

                  console.log("Cancel button clicked. Previous status data:", previousStatusBeforeFail);

                  if (previousStatusBeforeFail) {

                    console.log("Cancel clicked - Reverting status from failed to:", previousStatusBeforeFail.previousStatus);

                    console.log("Previous status data:", previousStatusBeforeFail);



                    setExecutionStatuses((prev) => ({

                      ...prev,

                      [previousStatusBeforeFail.testCaseId]: previousStatusBeforeFail.previousStatus,

                    }));



                    // Also update localStorage

                    if (selectedProject && selectedRelease) {

                      persistExecutionStatus(

                        selectedProject,

                        selectedRelease,

                        previousStatusBeforeFail.testCaseId,

                        previousStatusBeforeFail.previousStatus as ExecutionStatus

                      );

                    }



                    // Clear the previous status tracking

                    setPreviousStatusBeforeFail(null);

                  }



                  setDefectModalOpen(null);

                  // Clear pending status update when cancel is clicked

                  console.log("Clearing pending status update - cancel clicked");

                  setPendingStatusUpdate(null);



                  // Reset editing state

                  setIsEditingDefect(false);

                  setEditingDefect(null);



                  setDefectFormData({

                    title: "",

                    description: "",

                    module: "",

                    subModule: "",

                    type: "bug",

                    priority: "medium",

                    severity: "medium",

                    status: "NEW",

                    projectId: projectId || "",

                    releaseId: releaseId || "",

                    testCaseId: "",

                    assignedTo: 0,

                    reportedBy: "",

                    rejectionComment: "",

                  });

                }}

              >

                Cancel

              </Button>

                              <Button type="submit" disabled={defectSubmitting}>

                  {defectSubmitting

                    ? (isEditingDefect ? "Updating..." : "Creating...")

                    : (isEditingDefect ? "Update Defect" : "Save Defect")

                  }

                </Button>

            </div>

          </form>

        </Modal>

      </div>

    );

  }



  // Main Test Execution page (project selection and release cards)

  return (

    <div className="max-w-6xl mx-auto">

      {/* Back Button at the top right */}

      <div className="mb-4 flex justify-end">

        <Button

          variant="secondary"

          onClick={() => navigate(`/projects/${selectedProject || projectId}/releases`)}

          className="flex items-center"

        >

          <ChevronLeft className="w-5 h-5 mr-2" /> Back

        </Button>

      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-8">Test Execution</h1>

      {/* Project Selection Panel */}

      <ProjectSelector

        projects={projects}

        selectedProjectId={selectedProject}

        onSelect={handleProjectSelect}

        className="mb-6"

      />

       <Toast

        isOpen={toast.isOpen}

        message={toast.message}

        type={toast.type}

        onClose={() => setToast({ ...toast, isOpen: false })}

      />

      {/* Release Cards Panel */}

      {releaseLoading && (

        <div className="text-center text-gray-500 mb-4">Loading releases...</div>

      )}

      {releaseError && (

        <div className="text-center text-red-500 mb-4">{releaseError}</div>

      )}

      {selectedProject && !releaseLoading && !releaseError && (

        <div className="mb-6">

          <div className="mb-4">

            <h2 className="text-lg font-semibold text-gray-900">

              Releases for Project

            </h2>

          </div>

          {projectReleaseCard.length === 0 ? (

            <Card>

              <CardContent className="p-6 text-center">

                <p className="text-gray-500">

                  No releases found for the selected project.

                </p>

              </CardContent>

            </Card>

          ) : (

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

              {projectReleaseCard.map((release: any) => {

                const currentProject = projects && projects.find(

                  (p: any) => p.id === selectedProject

                );

                const isActive = release.status === true;

                

                // Debug: Log release data to understand the structure

                console.log("Release data:", {

                  releaseId: release.releaseId,

                  id: release.id,

                  name: release.releaseName,

                  status: release.status,

                  testCaseCount: releaseTestCaseCounts[release.releaseId] || releaseTestCaseCounts[release.id] || 0

                });

                return (

                <Card

                  key={release.releaseId}

                  hover

                  className={`group transition-all duration-300 hover:shadow-lg hover:scale-[1.02] ${

                    isActive 

                      ? 'cursor-pointer border-blue-500 ring-2 ring-blue-300' 

                      : 'cursor-default border-gray-200'

                  }`}

                  onClick={() => {

                    // Only allow navigation if the card is active

                    if (isActive) {

                      handleReleaseSelect(release.id || release.releaseId);

                    }

                  }}

                >

                  <CardContent className="p-6">

                      {/* Header */}

                    <div className="mb-4">

                      <h3 className="text-lg font-semibold text-gray-900 mb-1">

                        {release.releaseName}

                      </h3>

                    </div>



                      {/* Description */}

                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">

                        {release.description}

                      </p>

                    

                      {/* Stats */}

                    <div className="grid grid-cols-2 gap-4 mb-4">

                      <div className="flex items-center space-x-2">

                          <FileText className="w-4 h-4 text-gray-400" />

                          <div>

                            <p className="text-xs text-gray-500">Test Cases</p>

                            <p className="text-sm font-medium text-gray-900">

                              {releaseLoading || Object.keys(releaseTestCaseCounts).length === 0 ? (

                                <span className="flex items-center space-x-1">

                                  <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>

                                  <span>Loading...</span>

                                </span>

                              ) : (() => {

                                // Try both releaseId and id fields for compatibility

                                const count = releaseTestCaseCounts[release.releaseId] || releaseTestCaseCounts[release.id] || 0;

                                console.log(`Release ${release.releaseId || release.id} (${release.releaseName}) has ${count} test cases`);

                                return count;

                              })()}

                            </p>

                            {Object.keys(releaseTestCaseCounts).length > 0 && (

                              <p className="text-xs text-gray-400">

                                Last updated: {new Date().toLocaleTimeString()}

                              </p>

                            )}

                          </div>

                      </div>

                      <div className="flex items-center space-x-2">

                          <Calendar className="w-4 h-4 text-gray-400" />

                          <div>

                            <p className="text-xs text-gray-500">Release Date</p>

                            <p className="text-sm font-medium text-gray-900">

                          {release.releaseDate

                            ? new Date(release.releaseDate).toLocaleDateString()

                            : "TBD"}

                            </p>

                          </div>

                        </div>

                      </div>



                      {/* Project Info */}

                      {currentProject && (

                        <div className="pt-4 border-t border-gray-200">

                          <div className="flex items-center justify-between">

                            <div className="flex items-center space-x-2">

                              <span className="text-xs text-gray-500">

                                Project: {currentProject.name}

                        </span>

                      </div>

                          </div>

                        </div>

                      )}



                      {/* Active/Hold Toggle */}

                      <div className="flex gap-2 mt-4">

                        <button

                          type="button"

                          className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors duration-150 ${

                            isActive 

                              ? 'bg-blue-100 text-blue-700 border-blue-400' 

                              : 'bg-white text-gray-500 border-gray-300 hover:bg-blue-50'

                          }`}

                          onClick={async e => {

                            e.stopPropagation();

                            try {

                              await updateReleaseStatus(parseInt(release.id || release.releaseId, 10), "ACTIVE");

                              setReleaseLoading(true);

                              // Fetch both releases and test case counts

                              const [res, testCaseCountsRes] = await Promise.all([

                                projectReleaseCardView(selectedProject),

                                getReleaseTestCaseCounts(selectedProject)

                              ]);

                              if (res.status === "success" || res.statusCode === "2000") {

                                setProjectReleaseCard(res.data || []);

                              } else {

                                setReleaseError(res.message || "No releases found");

                              }

                              if (testCaseCountsRes.status === "success" || testCaseCountsRes.statusCode === 2000) {

                                const countsMap: {[key: string]: number} = {};

                                testCaseCountsRes.data.forEach((item: any) => {

                                  countsMap[item.releaseId] = item.testCaseCount;

                                });

                                setReleaseTestCaseCounts(countsMap);

                              }

                              setToast({

                                isOpen: true,

                                message: "Release activated and other releases set to Hold for this project",

                                type: "success",

                              });

                            } catch (err) {

                              console.error("Failed to activate release:", err);

                              setToast({

                                isOpen: true,

                                message: "Failed to activate release",

                                type: "error",

                              });

                            } finally {

                              setReleaseLoading(false);

                            }

                          }}

                        >

                          Active

                        </button>

                        <button

                          type="button"

                          className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors duration-150 ${

                            !isActive 

                              ? 'bg-red-100 text-red-700 border-red-400' 

                              : 'bg-white text-gray-500 border-gray-300 hover:bg-red-50'

                          }`}

                          onClick={async e => {

                            e.stopPropagation();

                            // If this card is currently active, deactivate it

                            if (isActive) {

                              try {

                                await updateReleaseStatus(parseInt(release.id || release.releaseId, 10), "HOLD");

                                setReleaseLoading(true);

                                // Fetch both releases and test case counts

                                const [res, testCaseCountsRes] = await Promise.all([

                                  projectReleaseCardView(selectedProject),

                                  getReleaseTestCaseCounts(selectedProject)

                                ]);

                                if (res.status === "success" || res.statusCode === "2000") {

                                  setProjectReleaseCard(res.data || []);

                                } else {

                                  setReleaseError(res.message || "No releases found");

                                }

                                if (testCaseCountsRes.status === "success" || testCaseCountsRes.statusCode === 2000) {

                                  const countsMap: {[key: string]: number} = {};

                                  testCaseCountsRes.data.forEach((item: any) => {

                                    countsMap[item.releaseId] = item.testCaseCount;

                                  });

                                  setReleaseTestCaseCounts(countsMap);

                                }

                                setToast({

                                  isOpen: true,

                                  message: "Release status set to Hold for this project",

                                  type: "success",

                                });

                              }

                              catch (err) {

                                console.error("Failed to hold release:", err);

                                setToast({

                                  isOpen: true,

                                  message: "Failed to hold release",

                                  type: "error",

                                });

                              } finally {

                                setReleaseLoading(false);

                              }

                            }

                          }}

                        >

                          Hold

                        </button>

                    </div>





                    {/* Status indicator */}

                    {isActive && (

                      <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">

                        <div className="flex items-center space-x-2">

                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>

                          <span className="text-xs font-medium text-blue-700">

                            Active - Click to enter test execution

                          </span>

                        </div>

                      </div>

                    )}

                  </CardContent>

                </Card>

                );

              })}

            </div>

          )}

        </div>

      )}



    </div>

  );

};

