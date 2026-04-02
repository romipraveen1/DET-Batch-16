import React, { useState, useEffect } from "react";

import { useNavigate, useParams } from "react-router-dom";

import { Card, CardContent } from "../components/ui/Card";

import { Button } from "../components/ui/Button";

import { Badge } from "../components/ui/Badge";

import {

  ChevronLeft,

  Eye,

  Edit2,

  Trash2,

  Plus,

  ChevronRight,

} from "lucide-react";

import { useApp } from "../context/AppContext";

import { Modal } from "../components/ui/Modal";



import { ProjectSelector } from "../components/ui/ProjectSelector";

import axios from 'axios';

import { projectReleaseCardView } from "../api/releaseView/ProjectReleaseCardView";

import { getReleaseTestCaseCounts } from "../api/releaseView/getReleaseTestCaseCount";

import { getSubmodulesByModuleId, Submodule } from "../api/submodule/submoduleget";

import { getTestCasesByProjectAndSubmodule, getTestCasesByProjectAndModule } from "../api/testCase/testCaseApi";
import { getAllocatedTestCases as getQaAllocatedTestCases } from "../api/qa_allocation/qa_allocation_get_filter";

import { getTestCasesByBulkModules, getTestCasesByBulkSubmodules } from "../api/testCase/testCaseApi";

import { getBulkSubmodulesByModules, BulkSubmodule } from "../api/submodule/getBulkSubmodulesByModules";

import { getSubmodulesByModule } from "../api/submodule/getSubmodulesByModule";

import { getSeverities } from "../api/severity";

import { getDefectTypes } from "../api/defectType";

import { TestCase as TestCaseType } from "../types/index";

import { allocateTestCaseToRelease, allocateTestCaseToMultipleReleases, bulkAllocateTestCasesToReleases, ReleaseTestCaseMappingRequest, allocateTestCasesToManyReleases, getReleaseTestCasesByFiltersGroup, getQaAllocationSummary, getQaEngineerTestCases } from "../api/releasetestcase";

import { getAllocatedUsersByModuleId, getModulesByProjectId } from "../api/module/getModule";

import { getQAMembersByProjectId, QAMember } from "../api/qa_allocation/qa_allocation";

import { allocated_testcases, allocated_testcase_details, bulkAssignOwner } from "../api/qa_allocation/qa_allocation_get_filter";

import AlertModal from "../components/ui/AlertModal";



const BASE_URL = import.meta.env.VITE_BASE_URL;

//integration

// Backend API Integration for Test Case Fetching:
// - Module Selection: Uses getTestCasesByProjectAndModule API endpoint
//   URL: http://localhost:8080/api/v1/testcase/filterbymodule?projectId={id}&moduleId={id}
// - Submodule Selection: Uses getTestCasesByProjectAndSubmodule API endpoint
//   URL: http://localhost:8080/api/v1/testcase/filter?projectId={id}&submoduleId={id}
// - Both functions automatically fetch test cases when module/submodule is selected in Release Allocation tab



const TABS = [

  { key: "release", label: "Release Allocation" },

  { key: "qa", label: "QA Allocation" },

];



// --- MOCK DATA SECTION (for modules, testcases, QA, releases) ---



// Mock Modules

// const mockModules = [ ... ];



// Mock QA (engineers/teams)

// const mockQA = [ ... ];



// Mock Releases

// const mockReleases = [ ... ];



// --- END MOCK DATA SECTION ---



// Helper: Use mock data if API/server is not working

export const Allocation: React.FC = () => {

  const { projectId } = useParams();

  const navigate = useNavigate();

  const {

    projects,

    releases,

    employees,

    testCases,

  } = useApp();

  const [modulesByProject, setModulesByProject] = useState<Record<string, { id: string, name: string, submodules: { id: string, name: string }[] }[]>>({});

  const [activeTab, setActiveTab] = useState<"release" | "qa">("release");

  const [selectedReleaseIds, setSelectedReleaseIds] = useState<string[]>([]);

  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const [selectedModule, setSelectedModule] = useState("");

  const [selectedQA, setSelectedQA] = useState<string | null>(null);

  const [selectedTestCases, setSelectedTestCases] = useState<string[]>([]);

  const [isViewStepsModalOpen, setIsViewStepsModalOpen] = useState(false);

  const [isViewTestCaseModalOpen, setIsViewTestCaseModalOpen] = useState(false);

  const [viewingTestCase, setViewingTestCase] = useState<any>(null);

  const [bulkModuleSelect, setBulkModuleSelect] = useState(false);

  const [selectedModules, setSelectedModules] = useState<string[]>([]);

  const [selectedSubmodule, setSelectedSubmodule] = useState<string>("");

  const [bulkSubmoduleSelect, setBulkSubmoduleSelect] = useState<boolean>(false);

  const [selectedSubmodules, setSelectedSubmodules] = useState<string[]>([]);

  const [submodules, setSubmodules] = useState<Submodule[]>([]);

  const [submoduleError, setSubmoduleError] = useState<string>("");

  const [bulkSubmodules, setBulkSubmodules] = useState<BulkSubmodule[]>([]);

  const [bulkSubmodulesLoading, setBulkSubmodulesLoading] = useState(false);

  const [apiRelease, setApiRelease] = useState<any>(null);

  const [loadingRelease, setLoadingRelease] = useState(false);

  const [releaseError, setReleaseError] = useState<string | null>(null);

  const [projectRelease, setProjectRelease] = useState<any[]>([]);

  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  const [qaAllocatedTestCases, setQaAllocatedTestCases] = useState<{ [releaseId: string]: string[] }>({});

  const [qaAllocations, setQaAllocations] = useState<{ [releaseId: string]: { [qaId: string]: string[] } }>({});

  const [selectedTestCasesForQA, setSelectedTestCasesForQA] = useState<{ [releaseId: string]: string[] }>({});

  const [loadingQAAllocations, setLoadingQAAllocations] = useState(false);

  const [selectedReleaseForQA, setSelectedReleaseForQA] = useState<string | null>(null);

  const [selectedProjectId, setSelectedProjectId] = useState<string>(String(projectId ?? ''));

  const [loadingReleases, setLoadingReleases] = useState(false);

  const [allocatedTestCases, setAllocatedTestCases] = useState<TestCaseType[]>([]);

  const [qaAllocatedTestCasesData, setQaAllocatedTestCasesData] = useState<allocated_testcase_details[]>([]);

  const [loadingQATestCases, setLoadingQATestCases] = useState(false);

  const [qaTestCasesError, setQaTestCasesError] = useState<string | null>(null);

  const [qaAllocationLoading, setQaAllocationLoading] = useState(false);

  const [qaAllocationError, setQaAllocationError] = useState<string | null>(null);

  const [qaAllocationSuccess, setQaAllocationSuccess] = useState<string | null>(null);

  const [severities, setSeverities] = useState<{ id: number; name: string; color: string }[]>([]);

  const [defectTypes, setDefectTypes] = useState<{ id: number; defectTypeName: string }[]>([]);

  const [allocationLoading, setAllocationLoading] = useState(false);

  const [allocationSuccess, setAllocationSuccess] = useState<string | null>(null);

  const [allocationError, setAllocationError] = useState<string | null>(null);

  const [allocationProgress, setAllocationProgress] = useState<{ current: number; total: number } | null>(null);

  const [allocationMode, setAllocationMode] = useState<"one-to-one" | "one-to-many" | "bulk" | "many-to-many">("one-to-one");
  const [modeRefreshKey, setModeRefreshKey] = useState<number>(0);

  const [alert, setAlert] = useState({ isOpen: false, message: "" });

  const [loadingModuleTestCases, setLoadingModuleTestCases] = useState(false);

  const [loadingSubmoduleTestCases, setLoadingSubmoduleTestCases] = useState(false);

  const showAlert = (message: string) => setAlert({ isOpen: true, message });

  const closeAlert = () => setAlert((a) => ({ ...a, isOpen: false }));

  const [bulkSubmoduleWarning, setBulkSubmoduleWarning] = useState<string>("");

  const [qaReleaseTestCases, setQaReleaseTestCases] = useState<any[]>([]);

  const [qaReleaseTestCasesLoading, setQaReleaseTestCasesLoading] = useState(false);

  const [qaReleaseTestCasesError, setQaReleaseTestCasesError] = useState<string | null>(null);

  const [qaMembers, setQaMembers] = useState<QAMember[]>([]);

  const [qaMembersLoading, setQaMembersLoading] = useState(false);

  const [qaMembersError, setQaMembersError] = useState<string | null>(null);

  const [releaseTestCaseCounts, setReleaseTestCaseCounts] = useState<any[]>([]);

  const [releaseTestCaseCountsLoading, setReleaseTestCaseCountsLoading] = useState(false);

  const [releaseTestCaseCountsError, setReleaseTestCaseCountsError] = useState<string | null>(null);



  React.useEffect(() => {

    if (projectId) {

      setSelectedProjectId(projectId);

      setSelectedProject(projectId);

    }

  }, [projectId]);



  const getReleaseCardView = async () => {

    if (!selectedProject) return;



    setLoadingReleases(true);

    try {

      const response = await projectReleaseCardView(selectedProject);

      setProjectRelease(response.data || []);

    } catch (error) {

      console.error("Error fetching release card view:", error);

      setProjectRelease([]);

    } finally {

      setLoadingReleases(false);

    }

  };



  const fetchReleaseTestCaseCounts = async () => {

    if (!selectedProject) return;



    setReleaseTestCaseCountsLoading(true);

    setReleaseTestCaseCountsError(null);

    try {

      console.log("Fetching release test case counts for project:", selectedProject);

      const response = await getReleaseTestCaseCounts(selectedProject);

      setReleaseTestCaseCounts(response.data || []);

      console.log("Release test case counts API response:", response);

      console.log("Release test case counts data:", response.data);



      // Log individual release data for debugging

      if (response.data && response.data.length > 0) {

        response.data.forEach((release: any) => {

          console.log(`Release: ${release.releaseName} (ID: ${release.releaseId}) - Test Cases: ${release.testCaseCount}`);

        });

      }

    } catch (error) {

      console.error("Error fetching release test case counts:", error);

      setReleaseTestCaseCountsError("Failed to fetch release test case counts");

      setReleaseTestCaseCounts([]);

    } finally {

      setReleaseTestCaseCountsLoading(false);

    }

  };



  const loadExistingQAAllocations = async () => {

    if (!selectedProject || !effectiveProjectRelease.length) return;

    setLoadingQAAllocations(true);

    try {

      // Since API integration is removed, use only mock data or skip loading from API

      // You may want to reset or keep the current state as is

      // setQaAllocations({});

      // setQaAllocatedTestCases({});

    } catch (error) {

      console.error("Error loading existing QA allocations:", error);

    } finally {

      setLoadingQAAllocations(false);

    }

  };



  // Function to fetch allocated test cases for QA allocation

  const fetchAllocatedTestCases = async (params: allocated_testcases) => {

    setLoadingQATestCases(true);

    setQaTestCasesError(null);

    try {

      const response = await getQaAllocatedTestCases(params);

      setQaAllocatedTestCasesData(response.data);

      return response.data;

    } catch (error) {

      console.error("Error fetching allocated test cases:", error);

      setQaTestCasesError("Failed to fetch allocated test cases");

      setQaAllocatedTestCasesData([]);

      return [];

    } finally {

      setLoadingQATestCases(false);

    }

  };


  // Function to fetch test cases for specific module, submodule, and release
  const fetchTestCasesByModuleSubmoduleRelease = async (
    projectId: number,
    releaseId: number,
    moduleId: number,
    subModuleId: number
  ) => {
    setLoadingQATestCases(true);
    setQaTestCasesError(null);
    try {
      console.log("Fetching test cases with filters:", {
        projectId,
        releaseId,
        moduleId,
        subModuleId
      });

      const response = await getReleaseTestCasesByFiltersGroup({
        projectId,
        releaseId,
        moduleId,
        subModuleId
      });

      console.log("API Response:", response);

      if (response.status === "success" && response.data) {
        // Map the API response to the expected format
        const mappedTestCases = response.data.map((tc: any) => ({
          id: tc.id, // This is the releaseTestCase ID
          testCaseId: tc.testCaseId,
          description: tc.description || 'No description',
          steps: tc.steps || 'No steps',
          type: tc.type || 'Unknown',
          severity: tc.severity || 'Unknown',
          moduleId: moduleId,
          subModuleId: subModuleId
        }));

        setQaAllocatedTestCasesData(mappedTestCases);
        console.log("Mapped test cases:", mappedTestCases);
        return mappedTestCases;
      } else {
        console.warn("API returned non-success status:", response);
        setQaTestCasesError("Failed to fetch test cases for the selected module, submodule, and release");
        setQaAllocatedTestCasesData([]);
        return [];
      }
    } catch (error: any) {
      console.error("Error fetching test cases by filters:", error);
      const errorMessage = error?.response?.data?.message || error?.message || "Failed to fetch test cases for the selected module, submodule, and release";
      setQaTestCasesError(errorMessage);
      setQaAllocatedTestCasesData([]);
      return [];
    } finally {
      setLoadingQATestCases(false);
    }
  };

  // Function to fetch test cases by module only (for release allocation)
  const fetchTestCasesByModule = async (projectId: string, moduleId: string) => {
    setLoadingModuleTestCases(true);
    try {
      console.log("Fetching test cases by module:", { projectId, moduleId });
      console.log("Available effectiveModules:", effectiveModules);
      console.log("Module ID being sent to API:", moduleId);
      
      // Check if we're in QA allocation mode (selectedReleaseForQA is set)
      if (selectedReleaseForQA) {
        console.log("Using QA allocation API for module test cases");
        const response = await getQaAllocatedTestCases({
          projectId: Number(projectId),
          releaseId: selectedReleaseForQA,
          moduleId: Number(moduleId),
          subModuleId: 0 // 0 means get all submodules for this module
        });
        console.log("QA allocation module test cases API response:", response);
        
        if (response && response.data && Array.isArray(response.data)) {
          // Map the API response to the expected format
          const moduleMap = Object.fromEntries(effectiveModules.map((m: any) => [m.id, m.name]));
          const submoduleMap = Object.fromEntries(effectiveModules.flatMap((m: any) => m.submodules.map((sm: any) => [sm.id, sm.name])));
          
          console.log("Module mapping:", moduleMap);
          console.log("Submodule mapping:", submoduleMap);
          
          const mappedTestCases = response.data.map((tc: any) => ({
            ...tc,
            testCaseId: tc.testCaseId || tc.id,
            module: moduleMap[tc.moduleId] || tc.moduleName || tc.module,
            subModule: submoduleMap[tc.subModuleId] || tc.subModuleName || tc.subModule,
            severity: (severities && severities.find(s => s.id === tc.severityId)?.name || tc.severity || "") as TestCaseType['severity'],
            type: (defectTypes && defectTypes.find(dt => dt.id === tc.defectTypeId)?.defectTypeName || tc.type || "") as TestCaseType['type'],
          })) as TestCaseType[];
          
          setQaAllocatedTestCasesData(response.data);
          console.log("Mapped QA allocation module test cases:", mappedTestCases);
          return mappedTestCases;
        } else {
          console.warn("Unexpected response format for QA allocation module test cases:", response);
          setQaAllocatedTestCasesData([]);
          return [];
        }
      } else {
        // Use regular test case API for non-QA allocation
        const response = await getTestCasesByProjectAndModule(projectId, moduleId);
        console.log("Module test cases API response:", response);
        
        if (response && Array.isArray(response)) {
          // Map the API response to the expected format
          const moduleMap = Object.fromEntries(effectiveModules.map((m: any) => [m.id, m.name]));
          const submoduleMap = Object.fromEntries(effectiveModules.flatMap((m: any) => m.submodules.map((sm: any) => [sm.id, sm.name])));
          
          console.log("Module mapping:", moduleMap);
          console.log("Submodule mapping:", submoduleMap);
          
          const mappedTestCases = response.map((tc: any) => ({
            ...tc,
            testCaseId: tc.testCaseId || tc.id,
            module: moduleMap[tc.moduleId] || tc.moduleName || tc.module,
            subModule: submoduleMap[tc.subModuleId] || tc.subModuleName || tc.subModule,
            severity: (severities && severities.find(s => s.id === tc.severityId)?.name || "") as TestCaseType['severity'],
            type: (defectTypes && defectTypes.find(dt => dt.id === tc.defectTypeId)?.defectTypeName || "") as TestCaseType['type'],
          })) as TestCaseType[];
          
          setAllocatedTestCases(mappedTestCases);
          console.log("Mapped module test cases:", mappedTestCases);
          return mappedTestCases;
        } else {
          console.warn("Unexpected response format for module test cases:", response);
          setAllocatedTestCases([]);
          return [];
        }
      }
    } catch (error: any) {
      console.error("Error fetching test cases by module:", error);
      if (selectedReleaseForQA) {
        setQaAllocatedTestCasesData([]);
      } else {
        setAllocatedTestCases([]);
      }
      return [];
    } finally {
      setLoadingModuleTestCases(false);
    }
  };

  // Function to fetch test cases by submodule (for release allocation)
  const fetchTestCasesBySubmodule = async (projectId: string, submoduleId: string) => {
    setLoadingSubmoduleTestCases(true);
    try {
      console.log("Fetching test cases by submodule:", { projectId, submoduleId });
      
      // Check if we're in QA allocation mode (selectedReleaseForQA is set)
      if (selectedReleaseForQA) {
        console.log("Using QA allocation API for submodule test cases");
        const response = await getQaAllocatedTestCases({
          projectId: Number(projectId),
          releaseId: selectedReleaseForQA,
          moduleId: 0, // 0 means get all modules for this submodule
          subModuleId: Number(submoduleId)
        });
        console.log("QA allocation submodule test cases API response:", response);
        
        if (response && response.data && Array.isArray(response.data)) {
          // Map the API response to the expected format
          const moduleMap = Object.fromEntries(effectiveModules.map((m: any) => [m.id, m.name]));
          const submoduleMap = Object.fromEntries(effectiveModules.flatMap((m: any) => m.submodules.map((sm: any) => [sm.id, sm.name])));
          
          const mappedTestCases = response.data.map((tc: any) => ({
            ...tc,
            testCaseId: tc.testCaseId || tc.id,
            module: moduleMap[tc.moduleId] || tc.moduleName || tc.module,
            subModule: submoduleMap[tc.subModuleId] || tc.subModuleName || tc.subModule,
            severity: (severities && severities.find(s => s.id === tc.severityId)?.name || tc.severity || "") as TestCaseType['severity'],
            type: (defectTypes && defectTypes.find(dt => dt.id === tc.defectTypeId)?.defectTypeName || tc.type || "") as TestCaseType['type'],
          })) as TestCaseType[];
          
          setQaAllocatedTestCasesData(response.data);
          console.log("Mapped QA allocation submodule test cases:", mappedTestCases);
          return mappedTestCases;
        } else {
          console.warn("Unexpected response format for QA allocation submodule test cases:", response);
          setQaAllocatedTestCasesData([]);
          return [];
        }
      } else {
        // Use regular test case API for non-QA allocation
        const response = await getTestCasesByProjectAndSubmodule(projectId, submoduleId);
        console.log("Submodule test cases API response:", response);
        
        if (response && Array.isArray(response)) {
          // Map the API response to the expected format
          const moduleMap = Object.fromEntries(effectiveModules.map((m: any) => [m.id, m.name]));
          const submoduleMap = Object.fromEntries(effectiveModules.flatMap((m: any) => m.submodules.map((sm: any) => [sm.id, sm.name])));
          
          const mappedTestCases = response.map((tc: any) => ({
            ...tc,
            testCaseId: tc.testCaseId || tc.id,
            module: moduleMap[tc.moduleId] || tc.moduleName || tc.module,
            subModule: submoduleMap[tc.subModuleId] || tc.subModuleName || tc.subModule,
            severity: (severities && severities.find(s => s.id === tc.severityId)?.name || "") as TestCaseType['severity'],
            type: (defectTypes && defectTypes.find(dt => dt.id === tc.defectTypeId)?.defectTypeName || "") as TestCaseType['type'],
          })) as TestCaseType[];
          
          setAllocatedTestCases(mappedTestCases);
          console.log("Mapped submodule test cases:", mappedTestCases);
          return mappedTestCases;
        } else {
          console.warn("Unexpected response format for submodule test cases:", response);
          setAllocatedTestCases([]);
          return [];
        }
      }
    } catch (error: any) {
      console.error("Error fetching test cases by submodule:", error);
      if (selectedReleaseForQA) {
        setQaAllocatedTestCasesData([]);
      } else {
        setAllocatedTestCases([]);
      }
      return [];
    } finally {
      setLoadingSubmoduleTestCases(false);
    }
  };

  // Function to fetch test cases by bulk modules (for release allocation)
  const fetchTestCasesByBulkModules = async (projectId: string, moduleIds: string[]) => {
    setLoadingModuleTestCases(true);
    try {
      console.log("Fetching test cases by bulk modules:", { projectId, moduleIds });
      
      // Convert string IDs to numbers for the API
      const numericModuleIds = moduleIds.map(id => Number(id)).filter(id => !isNaN(id));
      
      if (numericModuleIds.length === 0) {
        console.warn("No valid module IDs found for bulk fetch");
        setAllocatedTestCases([]);
        return [];
      }
      
      console.log("Calling API with numeric module IDs:", numericModuleIds);
      const response = await getTestCasesByBulkModules(projectId, numericModuleIds);
      console.log("Bulk module test cases API response:", response);
      
      if (response && Array.isArray(response)) {
        console.log("Response is array with length:", response.length);
        
        // Map the API response to the expected format
        const moduleMap = Object.fromEntries(effectiveModules.map((m: any) => [m.id, m.name]));
        const submoduleMap = Object.fromEntries(effectiveModules.flatMap((m: any) => m.submodules.map((sm: any) => [sm.id, sm.name])));
        
        console.log("Module mapping:", moduleMap);
        console.log("Submodule mapping:", submoduleMap);
        
        const mappedTestCases = response.map((tc: any) => ({
          ...tc,
          testCaseId: tc.testCaseId || tc.id,
          module: moduleMap[tc.moduleId] || tc.moduleName || tc.module,
          subModule: submoduleMap[tc.subModuleId] || tc.subModuleName || tc.subModule,
          severity: (severities && severities.find(s => s.id === tc.severityId)?.name || "") as TestCaseType['severity'],
          type: (defectTypes && defectTypes.find(dt => dt.id === tc.defectTypeId)?.defectTypeName || "") as TestCaseType['type'],
        })) as TestCaseType[];
        
        setAllocatedTestCases(mappedTestCases);
        console.log("Mapped bulk module test cases:", mappedTestCases);
        return mappedTestCases;
      } else {
        console.warn("Unexpected response format for bulk module test cases:", response);
        setAllocatedTestCases([]);
        return [];
      }
    } catch (error: any) {
      console.error("Error fetching test cases by bulk modules:", error);
      setAllocatedTestCases([]);
      return [];
    } finally {
      setLoadingModuleTestCases(false);
    }
  };

  // Function to fetch test cases by bulk submodules (for release allocation)
  const fetchTestCasesByBulkSubmodules = async (projectId: string, submoduleIds: string[]) => {
    setLoadingSubmoduleTestCases(true);
    try {
      console.log("Fetching test cases by bulk submodules:", { projectId, submoduleIds });
      
      // Convert string IDs to numbers for the API
      const numericSubmoduleIds = submoduleIds.map(id => Number(id)).filter(id => !isNaN(id));
      
      if (numericSubmoduleIds.length === 0) {
        console.warn("No valid submodule IDs found for bulk fetch");
        setAllocatedTestCases([]);
        return [];
      }
      
      console.log("Calling API with numeric submodule IDs:", numericSubmoduleIds);
      const response = await getTestCasesByBulkSubmodules(projectId, numericSubmoduleIds);
      console.log("Bulk submodule test cases API response:", response);
      
      if (response && Array.isArray(response)) {
        console.log("Response is array with length:", response.length);
        
        // Map the API response to the expected format
        const moduleMap = Object.fromEntries(effectiveModules.map((m: any) => [m.id, m.name]));
        const submoduleMap = Object.fromEntries(effectiveModules.flatMap((m: any) => m.submodules.map((sm: any) => [sm.id, sm.name])));
        
        console.log("Module mapping:", moduleMap);
        console.log("Submodule mapping:", submoduleMap);
        
        const mappedTestCases = response.map((tc: any) => ({
          ...tc,
          testCaseId: tc.testCaseId || tc.id,
          module: moduleMap[tc.moduleId] || tc.moduleName || tc.module,
          subModule: submoduleMap[tc.subModuleId] || tc.subModuleName || tc.subModule,
          severity: (severities && severities.find(s => s.id === tc.severityId)?.name || "") as TestCaseType['severity'],
          type: (defectTypes && defectTypes.find(dt => dt.id === tc.defectTypeId)?.defectTypeName || "") as TestCaseType['type'],
        })) as TestCaseType[];
        
        setAllocatedTestCases(mappedTestCases);
        console.log("Mapped bulk submodule test cases:", mappedTestCases);
        return mappedTestCases;
      } else {
        console.warn("Unexpected response format for bulk submodule test cases:", response);
        setAllocatedTestCases([]);
        return [];
      }
    } catch (error: any) {
      console.error("Error fetching test cases by bulk submodules:", error);
      setAllocatedTestCases([]);
      return [];
    } finally {
      setLoadingSubmoduleTestCases(false);
    }
  };


  // Fetch releases when selectedProject changes

  useEffect(() => {

    if (selectedProject) {

      getReleaseCardView();

      fetchReleaseTestCaseCounts();

    }

  }, [selectedProject]);



  // Fetch severities and defect types on mount

  useEffect(() => {

    getSeverities().then(res => setSeverities(res.data));

    getDefectTypes().then(res => setDefectTypes(res.data));

  }, []);



  // Refetch test cases when severities or defect types change to ensure proper mapping

  useEffect(() => {

    if (selectedProjectId && selectedSubmodule && (severities.length > 0 || defectTypes.length > 0)) {

      handleSelectSubModule(selectedSubmodule);

    }

  }, [severities, defectTypes]);



  // Clear allocation messages when tab changes

  useEffect(() => {

    setAllocationSuccess(null);

    setAllocationError(null);

  }, [activeTab]);







  // Filter releases for this project

  const projectReleases = releases.filter((r) => r.projectId === projectId);

  // Filter test cases for this project

  const projectTestCases = testCases.filter((tc) => tc.projectId === projectId);



  // Get modules for selected project from context

  const projectModules = selectedProjectId ? modulesByProject[selectedProjectId] || [] : [];



  // Use mock data if API/server is not working

  const effectiveProjectRelease = projectRelease;

  const effectiveTestCases = allocatedTestCases.length > 0 ? allocatedTestCases : projectTestCases;

  const effectiveModules = projectModules ? projectModules || [] : []; // Use modulesByProject state
  
  // Debug logging for effectiveModules
  console.log("effectiveModules data:", effectiveModules);
  console.log("projectModules data:", projectModules);
  console.log("selectedProjectId:", selectedProjectId);
  console.log("modulesByProject keys:", Object.keys(modulesByProject));



  // Load existing QA allocations when releases are loaded

  useEffect(() => {

    if (effectiveProjectRelease.length > 0) {

      loadExistingQAAllocations();

    }

  }, [effectiveProjectRelease, selectedProject]);

  const fetchModules = async () => {

    console.log("Fetching modules for project ID:", selectedProjectId);



    if (!selectedProjectId) return;

    try {

      const response = await getModulesByProjectId(selectedProjectId);

      if (response.data) {

        const modules = (response.data || []).map((mod: any) => {
          console.log("Mapping module:", { 
            originalId: mod.id, 
            originalName: mod.moduleName,
            mappedId: mod.id,
            mappedName: mod.moduleName
          });
          return {
          id: mod.id,
          name: mod.moduleName,
          submodules: (mod.submodules || []).map((sm: any) => ({
            id: String(sm.id),
            name: sm.subModuleName || sm.name,
          })),
          };
        });

        console.log("Setting modules in state:", { projectId: selectedProjectId, modules });
        setModulesByProject((prev: any) => ({ ...prev, [selectedProjectId]: modules }));

      }

    } catch (error) {

      console.error("Error fetching modules:", error);



    }

  };



  const fetchQAMembers = async () => {

    if (!selectedProjectId) return;

    

    setQaMembersLoading(true);

    setQaMembersError(null);

    

    try {

      const response = await getQAMembersByProjectId(Number(selectedProjectId));

      if (response.status === 'success') {

        setQaMembers(response.data || []);

      } else {

        setQaMembers([]);

        setQaMembersError(response.message || 'Failed to fetch QA members');

      }

    } catch (error: unknown) {

      console.error("Error fetching QA members:", error);

      if (error instanceof Error) {

        setQaMembersError(error.message);

      } else {

        setQaMembersError('Failed to fetch QA members');

      }

      setQaMembers([]);

    } finally {

      setQaMembersLoading(false);

    }

  };

  console.log("Modules fetched:", modulesByProject);



  // Fetch modules when selectedProjectId changes
  useEffect(() => {

    if (selectedProjectId) {
      console.log("selectedProjectId changed, fetching modules and QA members:", selectedProjectId);
      fetchModules();

      fetchQAMembers();

    }

  }, [selectedProjectId]);

  // Fetch submodules when selectedModule changes

  useEffect(() => {



    if (!selectedModule) {

      setSubmodules([]);

      setSubmoduleError("");

      return;

    }



    // Find the module ID from effectiveModules

    const moduleObj = effectiveModules.find((m: any) => m.name === selectedModule);



    if (moduleObj && moduleObj.id) {

      getSubmodulesByModuleId(Number(moduleObj.id))

        .then((res) => {

          if (res.status !== 'success' || !Array.isArray(res.data) || res.data.length === 0) {

            setSubmodules([]);

            setSubmoduleError(res.message || "No submodules found for this module.");

            return;

          }

          // Normalize submodule name property for UI

          const normalized = (res.data || []).map((sm: any) => ({

            ...sm,

            subModuleId: Number(sm.subModuleId),

            name: sm.name || sm.subModuleName || sm.submoduleName || "Unnamed"

          }));

          setSubmodules(normalized);

          setSubmoduleError("");

        })

        .catch((err) => {

          setSubmodules([]);

          setSubmoduleError("Failed to fetch submodules. Please try again.");

        });

    } else {

      setSubmodules([]);

      setSubmoduleError("Module not found.");

    }

  }, [selectedModule]);





  // --- Bulk selection effect for test cases ---

  useEffect(() => {

    if (

      activeTab === "release" &&

      (bulkModuleSelect || bulkSubmoduleSelect)

    ) {

      if (selectedReleaseIds.length === 0) {

        setBulkSubmoduleWarning("Please select at least one release before using bulk submodule selection.");

        setSelectedTestCases([]);

        return;

      } else {

        setBulkSubmoduleWarning("");

      }

      let ids: Set<string> = new Set();

      // Add all test cases for selected modules (across all submodules)

      if (bulkModuleSelect && selectedModules.length > 0) {

        // Use allocatedTestCases if available (from bulk module API), otherwise fallback to effectiveTestCases

        const testCasesToProcess = allocatedTestCases.length > 0 ? allocatedTestCases : effectiveTestCases;

        const moduleSet = new Set(selectedModules.map(String));

        testCasesToProcess.forEach((tc: any) => {

          console.log('Test case object:', tc);

          if (moduleSet.has(String(tc.moduleId))) {

            ids.add(tc.id);

          }

        });

      }

      // Add all test cases for selected submodules

      if (bulkSubmoduleSelect && selectedSubmodules.length > 0) {

        // Use allocatedTestCases if available (from bulk submodule API), otherwise fallback to effectiveTestCases

        const testCasesToProcess = allocatedTestCases.length > 0 ? allocatedTestCases : effectiveTestCases;

        const submoduleSet = new Set(selectedSubmodules.map(String));

        testCasesToProcess.forEach((tc: any) => {

          console.log('Test case object:', tc);

          if (submoduleSet.has(String(tc.subModuleId))) {

            ids.add(tc.id);

          }

        });

      }

      setSelectedTestCases(Array.from(ids));

    } else {

      setBulkSubmoduleWarning("");

    }

  }, [

    bulkModuleSelect,

    bulkSubmoduleSelect,

    selectedModules,

    selectedSubmodules,

    effectiveTestCases,

    allocatedTestCases, // Add this dependency

    activeTab,

    selectedReleaseIds,

  ]);



  // --- Fetch bulk submodules when multiple modules are selected ---

  useEffect(() => {

    console.log('Bulk submodules useEffect triggered:', {

      bulkModuleSelect,

      selectedModules,

      selectedProjectId

    });



    const fetchBulkSubmodules = async () => {

      if (bulkModuleSelect && selectedModules.length > 0 && selectedProjectId) {

        setBulkSubmodulesLoading(true);

        try {

          console.log('Fetching bulk submodules for modules:', selectedModules);

          const moduleIds = selectedModules.map(id => Number(id));



          // Try bulk API first

          try {

            const bulkSubmodulesData = await getBulkSubmodulesByModules(selectedProjectId, moduleIds);

            console.log('Bulk submodules fetched:', bulkSubmodulesData);

            setBulkSubmodules(bulkSubmodulesData);

          } catch (bulkError) {

            console.warn('Bulk API failed, falling back to individual calls:', bulkError);



            // Fallback: fetch submodules for each module individually

            const allSubmodules: BulkSubmodule[] = [];

            const moduleData = modulesByProject[selectedProjectId] || [];



            for (const moduleId of moduleIds) {

              try {

                const moduleInfo = moduleData.find(m => m.id === String(moduleId));

                const submodulesResponse = await getSubmodulesByModuleId(moduleId);



                if (submodulesResponse.data && Array.isArray(submodulesResponse.data)) {

                  const moduleSubmodules = submodulesResponse.data.map((sub: any) => ({

                    subModuleId: sub.id || sub.subModuleId,

                    subModuleName: sub.name || sub.subModuleName,

                    moduleId: moduleId,

                    moduleName: moduleInfo?.name || `Module ${moduleId}`

                  }));

                  allSubmodules.push(...moduleSubmodules);

                }

              } catch (moduleError) {

                console.error(`Failed to fetch submodules for module ${moduleId}:`, moduleError);

              }

            }



            console.log('Fallback submodules fetched:', allSubmodules);

            setBulkSubmodules(allSubmodules);

          }

        } catch (error) {

          console.error('Failed to fetch submodules:', error);

          setBulkSubmodules([]);

        } finally {

          setBulkSubmodulesLoading(false);

        }

      } else {

        setBulkSubmodules([]);

      }

    };



    fetchBulkSubmodules();

  }, [bulkModuleSelect, selectedModules, selectedProjectId]);

  // --- Fetch test cases when bulk modules are selected ---

  useEffect(() => {

    if (bulkModuleSelect && selectedModules.length > 0 && selectedProjectId) {

      console.log('Bulk modules selected, fetching test cases for modules:', selectedModules);

      console.log('Calling fetchTestCasesByBulkModules with:', { projectId: selectedProjectId, moduleIds: selectedModules });

      fetchTestCasesByBulkModules(selectedProjectId, selectedModules);

    } else if (bulkModuleSelect && selectedModules.length === 0) {

      // Clear test cases when no modules are selected in bulk mode

      console.log('No bulk modules selected, clearing test cases');

      setAllocatedTestCases([]);

    }

  }, [bulkModuleSelect, selectedModules, selectedProjectId]);

  // --- Fetch test cases when bulk submodules are selected ---

  useEffect(() => {

    if (bulkSubmoduleSelect && selectedSubmodules.length > 0 && selectedProjectId) {

      console.log('Bulk submodules selected, fetching test cases for submodules:', selectedSubmodules);

      console.log('Calling fetchTestCasesByBulkSubmodules with:', { projectId: selectedProjectId, submoduleIds: selectedSubmodules });

      fetchTestCasesByBulkSubmodules(selectedProjectId, selectedSubmodules);

    } else if (bulkSubmoduleSelect && selectedSubmodules.length === 0) {

      // Clear test cases when no submodules are selected in bulk mode

      console.log('No bulk submodules selected, clearing test cases');

      setAllocatedTestCases([]);

    }

  }, [bulkSubmoduleSelect, selectedSubmodules, selectedProjectId]);





  // useEffect(() => {

  //   if (!selectedProjectId || selectedSubmoduleId === null) return;

  //   getTestCasesByProjectAndSubmodule(selectedProjectId, selectedSubmoduleId).then((data) => {

  //     // Map moduleId/subModuleId to names for display

  //     const moduleMap = Object.fromEntries(projectModules.map((m: any) => [m.id, m.name]));

  //     const submoduleMap = Object.fromEntries(projectModules.flatMap((m: any) => m.submodules.map((sm: any) => [sm.id, sm.name])));

  //     setTestCases(

  //       (data as any[]).map((tc: any) => ({

  //         ...tc,

  //         module: moduleMap[tc.moduleId] || tc.moduleId,

  //         subModule: submoduleMap[tc.subModuleId] || tc.subModuleId,

  //         severity: (severities && severities.find(s => s.id === tc.severityId)?.name || "") as TestCaseType['severity'],

  //         type: (defectTypes && defectTypes.find(dt => dt.id === tc.defectTypeId)?.defectTypeName || "") as TestCaseType['type'],

  //       })) as TestCaseType[]

  //     );

  //   });

  // }, [selectedProjectId, selectedSubmoduleId, projectModules, severities, defectTypes]);

  // --- Filtered test cases for table ---

  let filteredTestCases = effectiveTestCases;

  if (activeTab === "qa") {

    if (selectedReleaseForQA) {

      // Only show test cases allocated to this release and not yet assigned to any QA

      const allocatedTestCaseIds = qaAllocatedTestCases[selectedReleaseForQA] || [];

      const alreadyAllocatedTestCaseIds = Object.values(qaAllocations[selectedReleaseForQA] || {}).flat();

      const unallocatedTestCaseIds = allocatedTestCaseIds.filter(

        id => !alreadyAllocatedTestCaseIds.includes(id)

      );



      // Get the full test case objects for the allocated test cases

      const allocatedTestCases = effectiveTestCases.filter((tc: any) => allocatedTestCaseIds.includes(tc.id));

      filteredTestCases = allocatedTestCases.filter((tc: any) => unallocatedTestCaseIds.includes(tc.id));

    } else {

      filteredTestCases = [];

    }

  } else if (

    activeTab === "release" &&

    selectedReleaseIds.length > 0 &&

    (bulkModuleSelect || bulkSubmoduleSelect)

  ) {

    let ids: Set<string> = new Set();

    if (bulkModuleSelect && selectedModules.length > 0) {

      // For bulk module selection, use allocatedTestCases if available (from API), otherwise filter from effectiveTestCases

      if (allocatedTestCases.length > 0) {

        // Use the test cases fetched from the bulk module API

        filteredTestCases = allocatedTestCases;

      } else {

        // Fallback to filtering from effectiveTestCases

        effectiveTestCases.forEach((tc: any) => {

          if (selectedModules.includes(String(tc.moduleId))) ids.add(tc.id);

        });

        filteredTestCases = effectiveTestCases.filter((tc: any) => ids.has(tc.id));

      }

    }

    if (bulkSubmoduleSelect && selectedSubmodules.length > 0) {

      // For bulk submodule selection, use allocatedTestCases if available (from API), otherwise filter from effectiveTestCases

      if (allocatedTestCases.length > 0) {

        // Use the test cases fetched from the bulk submodule API

        filteredTestCases = allocatedTestCases;

      } else {

        // Fallback to filtering from effectiveTestCases

        effectiveTestCases.forEach((tc: any) => {

          if (selectedSubmodules.includes(String(tc.subModuleId))) ids.add(tc.id);

        });

        filteredTestCases = effectiveTestCases.filter((tc: any) => ids.has(tc.id));

      }

    }

  } else if (selectedSubmodule) {

    // If a submodule is selected, use allocatedTestCases directly

    filteredTestCases = allocatedTestCases;

  } else if (selectedModule) {

    // If only a module is selected, use allocatedTestCases if available, otherwise filter from effectiveTestCases

    if (allocatedTestCases.length > 0) {

      filteredTestCases = allocatedTestCases;

    } else {

    filteredTestCases = effectiveTestCases.filter(

      (tc: any) => tc.module === selectedModule

    );

    }

  }



  // Helper functions for QA allocation (per release)

  const getAllocatedTestCasesForQA = (qaId: string) => {

    if (!selectedReleaseForQA) return [];

    return qaAllocations[selectedReleaseForQA]?.[qaId] || [];

  };



  const isTestCaseAllocated = (testCaseId: string) => {

    if (!selectedReleaseForQA) return false;

    return Object.values(qaAllocations[selectedReleaseForQA] || {}).some(allocations =>

      allocations.includes(testCaseId)

    );

  };



  const allocateTestCasesToQA = async (qaId: string, testCaseIds: string[]) => {

    if (!selectedReleaseForQA) return;



    setQaAllocationLoading(true);

    setQaAllocationError(null);

    setQaAllocationSuccess(null);



    try {

      // Convert releaseTestCase IDs to numbers for the API

      // The testCaseIds are actually releaseTestCase IDs from the API response

      const testCaseIdsAsNumbers = testCaseIds.map(id => {

        // If the ID is already a number, use it directly

        if (typeof id === 'number') return id;



        // Otherwise, try to parse it as a number

        return parseInt(String(id), 10);

      }).filter(id => !isNaN(id)); // Filter out any invalid numbers



      console.log("Calling bulk assign owner API with:", {

        ownerId: Number(qaId),

        releaseTestCaseIds: testCaseIdsAsNumbers

      });

      console.log("Original selected IDs (releaseTestCase IDs):", testCaseIds);

      console.log("Converted releaseTestCase IDs for API:", testCaseIdsAsNumbers);



      const response = await bulkAssignOwner(Number(qaId), testCaseIdsAsNumbers);



      if (response.status === "success" || response.statusCode === 2000) {

        // Update local state on successful API call

        setQaAllocations(prev => ({

          ...prev,

          [selectedReleaseForQA]: {

            ...(prev[selectedReleaseForQA] || {}),

            [qaId]: [...(prev[selectedReleaseForQA]?.[qaId] || []), ...testCaseIds]

          }

        }));

        setSelectedTestCasesForQA(prev => ({

          ...prev,

          [selectedReleaseForQA]: []

        }));

        setQaAllocationSuccess(response.message || "Test cases successfully allocated to QA member!");

      } else {

        setQaAllocationError(response.message || "Failed to allocate test cases");

      }

    } catch (error: any) {

      console.error("Error allocating test cases to QA:", error);

      setQaAllocationError(error?.response?.data?.message || error?.message || "Failed to allocate test cases");

    } finally {

      setQaAllocationLoading(false);

    }

  };



  const removeAllocationFromQA = (qaId: string, testCaseId: string) => {

    if (!selectedReleaseForQA) return;

    setQaAllocations(prev => ({

      ...prev,

      [selectedReleaseForQA]: {

        ...(prev[selectedReleaseForQA] || {}),

        [qaId]: (prev[selectedReleaseForQA]?.[qaId] || []).filter(id => id !== testCaseId)

      }

    }));

  };



  // Project selection handler

  const handleProjectSelect = (id: string) => {

    setSelectedProjectId(id);

    setSelectedProject(id);

    setSelectedReleaseIds([]);

    setSelectedIds([]);

    setSelectedModule("");

    setSelectedSubmodule("");

    setSelectedTestCases([]);

    setSelectedModules([]);

    setSelectedSubmodules([]);

    setBulkModuleSelect(false);

    setBulkSubmoduleSelect(false);

    setBulkSubmodules([]);

    setBulkSubmodulesLoading(false);

    setAllocatedTestCases([]);

    setAllocationMode("one-to-one");

    setAllocationSuccess(null);

    setAllocationError(null);

    setAllocationProgress(null);

    setSelectedQA(null);

    setSelectedReleaseForQA(null);

    setQaMembers([]);

    setQaMembersError(null);

    setQaAllocatedTestCases({});

    setQaAllocations({});

    setSelectedTestCasesForQA({});

    setQaAllocatedTestCasesData([]);

    setQaTestCasesError(null);

    setQaAllocationLoading(false);

    setQaAllocationError(null);

    setQaAllocationSuccess(null);

    // Clear any release test cases data
    setQaReleaseTestCases([]);
    setQaReleaseTestCasesError(null);

    // Clear loading states
    setLoadingModuleTestCases(false);
    setLoadingSubmoduleTestCases(false);

    // Clear bulk selection states
    setBulkModuleSelect(false);
    setBulkSubmoduleSelect(false);
    setSelectedModules([]);
    setSelectedSubmodules([]);
  };





  // --- UI Panels ---

  const ProjectSelectionPanel = () => (

    <ProjectSelector

      projects={projects}

      selectedProjectId={selectedProjectId || null}

      onSelect={

        (id: string) => {

          setSelectedProjectId(id),

            handleProjectSelect(id)

        }



      }

      className="mb-4"

    />

  );



  // In ReleaseCardsPanel, on Allocate:

  // For each selected release, store the selected test cases

  const handleAllocate = async () => {

    if (selectedReleaseIds.length === 0 || selectedTestCases.length === 0) {

      setAllocationError("Please select at least one release and test case.");

      return;

    }



    // Enforce only one release in bulk mode

    if (allocationMode === "bulk" && selectedReleaseIds.length > 1) {

      setAllocationError("Bulk mode only supports one release at a time. Please select only one release.");

      return;

    }

    // For many-to-many, allow multiple releases and test cases

    if (allocationMode === "many-to-many" && (selectedReleaseIds.length === 0 || selectedTestCases.length === 0)) {

      setAllocationError("Please select at least one release and one test case for many-to-many allocation.");

      return;

    }



    setAllocationLoading(true);

    setAllocationError(null);

    setAllocationSuccess(null);

    setAllocationProgress(null);



    try {

      if (allocationMode === "bulk") {

        setAllocationProgress({ current: 0, total: 1 });

        try {

          // Bulk: { testCaseIds: [...], releaseId: ... }

          const response = await bulkAllocateTestCasesToReleases(selectedTestCases, selectedIds[0]);

          showAlert("Bulk allocation completed.");

          setAllocationProgress({ current: 1, total: 1 });

        } catch (allocationError: any) {

          let errorMessage = allocationError?.response?.data?.message || allocationError?.message || "Bulk allocation failed.";

          if (

            errorMessage.includes("Duplicate entry") ||

            errorMessage.includes("release_test_case.UK4sej21crg7br73a3lsjwufpo1")

          ) {

            errorMessage = "Allocation failed! Some test cases were already allocated.";

          } else if (errorMessage.length > 200) {

            errorMessage = "An error occurred during allocation. Please try again or contact support.";

          }

          showAlert(errorMessage);

          setAllocationProgress({ current: 1, total: 1 });

        }

      } else if (allocationMode === "many-to-many") {

        setAllocationProgress({ current: 0, total: 1 });

        try {

          const response = await allocateTestCasesToManyReleases(selectedIds, selectedTestCases);

          showAlert(response.message || "Many-to-many allocation completed.");

          setAllocationProgress({ current: 1, total: 1 });

        } catch (allocationError: any) {

          let errorMessage = allocationError?.response?.data?.message || allocationError?.message || "Many-to-many allocation failed.";

          if (

            errorMessage.includes("Duplicate entry") ||

            errorMessage.includes("release_test_case.UK4sej21crg7br73a3lsjwufpo1")

          ) {

            errorMessage = "Allocation failed! Some test cases were already allocated.";

          } else if (errorMessage.length > 200) {

            errorMessage = "An error occurred during allocation. Please try again or contact support.";

          }

          showAlert(errorMessage);

          setAllocationProgress({ current: 1, total: 1 });

        }

      } else if (allocationMode === "one-to-many") {

        const totalAllocations = selectedTestCases.length;

        let completedAllocations = 0;

        let firstMessage: string | null = null;

        let firstIsSuccess = false;

        for (const testCaseId of selectedTestCases) {

          try {

            const response = await allocateTestCaseToMultipleReleases(testCaseId, selectedIds);

            if (!firstMessage) {

              if (

                (typeof response.status === 'string' && response.status.toLowerCase() === "success") ||

                (typeof response.message === 'string' && response.message.toLowerCase().includes("allocated to"))

              ) {

                firstMessage = response.message || "Test case(s) successfully allocated to selected releases!";

                firstIsSuccess = true;

              } else {

                firstMessage = response.message || "Failed";

                firstIsSuccess = false;

              }

            }

          } catch (allocationError: any) {

            if (!firstMessage) {

              firstMessage = allocationError?.response?.data?.message || allocationError?.message || "Failed";

              firstIsSuccess = false;

            }

          }

          completedAllocations++;

          setAllocationProgress({ current: completedAllocations, total: totalAllocations });

        }

        if (firstMessage) {

          showAlert(firstMessage);

        }

      } else {

        const totalAllocations = selectedReleaseIds.length * selectedTestCases.length;

        let completedAllocations = 0;

        let firstMessage: string | null = null;

        let firstIsSuccess = false;



        for (const releaseId of selectedIds) {

          for (const testCaseId of selectedTestCases) {



            try {

              const response = await allocateTestCaseToRelease(releaseId, Number(testCaseId));

              if (!firstMessage) {

                if (response.status === "success") {

                  // Always show a frontend message for one-to-one allocation success

                  firstMessage = "Test case allocated successfully.";

                  firstIsSuccess = true;

                } else {

                  firstMessage = "Failed to allocate test case.";

                  firstIsSuccess = false;

                }

              }

            } catch (allocationError: any) {

              if (!firstMessage) {

                let errorMessage = allocationError?.response?.data?.message || allocationError?.message || "Failed";

                if (

                  errorMessage.includes("Duplicate entry") ||

                  errorMessage.includes("release_test_case.UK4sej21crg7br73a3lsjwufpo1")

                ) {

                  errorMessage = "Some test cases are already allocated to the selected release(s).";

                } else if (errorMessage.length > 200) {

                  errorMessage = "An error occurred during allocation. Please try again or contact support.";

                }

                firstMessage = errorMessage;

                firstIsSuccess = false;

              }

            }

            completedAllocations++;

            setAllocationProgress({ current: completedAllocations, total: totalAllocations });

          }

        }

        if (firstMessage) {

          showAlert(firstMessage);

        }

      }

      setQaAllocatedTestCases(prev => {

        const updated = { ...prev };

        selectedReleaseIds.forEach(releaseId => {

          updated[releaseId] = [...selectedTestCases];

        });

        return updated;

      });

      setTimeout(() => {

        setSelectedTestCases([]);

        setSelectedReleaseIds([]);

        setSelectedIds([])

        setActiveTab("qa");

        setAllocationSuccess(null);

        setAllocationProgress(null);

      }, 2000);

    } catch (error: any) {

      let errorMessage = error.response?.data?.message || error.message || "Failed to allocate test cases to releases. Please try again.";

      // Always show a short message for duplicate entry errors

      if (

        errorMessage.includes("Duplicate entry") ||

        errorMessage.includes("release_test_case.UK4sej21crg7br73a3lsjwufpo1")

      ) {

        errorMessage = "Some test cases are already allocated to the selected release(s).";

      } else if (errorMessage.length > 200) {

        // For any other very long backend error, show a generic message

        errorMessage = "An error occurred during allocation. Please try again or contact support.";

      }

      showAlert(errorMessage);

    } finally {

      setAllocationLoading(false);

    }

  };

  const handleSelectSubModule = (selectedSubmoduleId: string) => {

    setSelectedSubmodule(selectedSubmoduleId);

    setSelectedTestCases([]);

    // Use the new API function for better error handling and consistency
    if (selectedProjectId) {
      fetchTestCasesBySubmodule(selectedProjectId, selectedSubmoduleId);
    }
  };



  const ReleaseCardsPanel = () => (

    <div className="mb-4">

      <div className="flex space-x-2 overflow-x-auto">

        {effectiveProjectRelease.map((release: any) => {

          const releaseId = release.releaseId 

          const ids = release.id;

          const isSelected = selectedReleaseIds.includes(releaseId);

          return (

            <div

              key={releaseId}

              className={`min-w-[160px] px-4 py-2 rounded-md border text-left transition-all duration-200 focus:outline-none text-sm font-medium shadow-sm flex flex-col items-start relative bg-white

                ${isSelected

                  ? "border-blue-500 hover:border-blue-500 hover:bg-blue-50 hover:shadow-md hover:ring-1 hover:ring-blue-300"

                  : "border-gray-200 hover:border-blue-500 hover:bg-blue-50 hover:shadow-md hover:ring-1 hover:ring-blue-300"

                }`}

              style={{

                boxShadow: isSelected ? "0 0 0 2px #3b82f6" : undefined,

              }}

            >

              <div className="truncate font-semibold mb-1">{release.releaseName || release.name}</div>

              <div className="text-xs text-gray-500 mb-2">Version: {release.version}</div>

              <Button

                size="sm"

                variant={isSelected ? "primary" : "secondary"}

                className="w-full"

                onClick={() => {

                  if (allocationMode === "one-to-one" || allocationMode === "bulk") {

                    setSelectedReleaseIds(isSelected ? [] : [releaseId]);

                    setSelectedIds(isSelected ? [] : [ids]);

                  } else {

                    setSelectedReleaseIds((prev) =>

                      isSelected ? prev.filter((id) => id !== releaseId) : [...prev, releaseId]

                    );

                    setSelectedIds((prev) =>

                      isSelected ? prev.filter((id) => id !== ids) : [...prev, ids]

                    );

                  }

                }}

                disabled={

                  (allocationMode === "one-to-one" || allocationMode === "bulk") && !isSelected && selectedReleaseIds.length >= 1

                }

              >

                {isSelected ? "Selected" : "Select"}

              </Button>

            </div>

          );

        })}

      </div>

    </div>

  );



  const ModuleSelectionPanel = () => (

    <Card className="mb-4">

      <CardContent className="p-4">

        <div className="flex justify-between items-center mb-3">

          <h2 className="text-lg font-semibold text-gray-900">

            Module Selection

          </h2>

          {(allocationMode === "bulk" || allocationMode === "many-to-many") && activeTab === "release" && selectedReleaseIds.length > 0 && (

            <Button

              size="sm"

              variant={bulkModuleSelect ? "primary" : "secondary"}

              onClick={() => {

                setBulkModuleSelect(v => !v);

                setSelectedModules([]);

                setSelectedTestCases([]);

                setBulkSubmodules([]);

                setSelectedSubmodules([]);

                setBulkSubmoduleSelect(false);

                // Clear allocated test cases when toggling bulk module selection
                setAllocatedTestCases([]);

              }}

            >

              {bulkModuleSelect ? "Cancel Bulk Module Select" : "Bulk Select Modules"}

            </Button>

          )}

        </div>

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

            {effectiveModules.map((module: any) => {

              const moduleTestCases = effectiveTestCases.filter(

                (tc: any) => tc.module === module.name

              );

              const isSelected = bulkModuleSelect

                ? selectedModules.includes(String(module.id))

                : selectedModule === module.name;

              return (

                <Button

                  key={module.id}

                  variant={isSelected ? "primary" : "secondary"}

                  onClick={() => {

                    if (bulkModuleSelect) {

                      setSelectedModules((prev) => {

                        const newSelection = prev.includes(String(module.id))

                          ? prev.filter((m) => m !== String(module.id))

                          : [...prev, String(module.id)];

                        
                        // Clear test cases when modules are deselected in bulk mode
                        if (newSelection.length === 0) {
                          setAllocatedTestCases([]);
                        }
                        
                        return newSelection;
                      });

                    } else {

                      setSelectedModule(module.name);

                      setSelectedSubmodule("");

                      setSelectedTestCases([]);

                      setAllocatedTestCases([]);

                      // Clear QA allocated test cases when module changes
                      setQaAllocatedTestCasesData([]);
                      setQaTestCasesError(null);
                      
                      // Fetch test cases for the selected module
                      if (selectedProjectId && module.id) {
                        console.log("Module clicked:", { 
                          name: module.name, 
                          id: module.id, 
                          type: typeof module.id,
                          selectedProjectId: selectedProjectId,
                          typeOfProjectId: typeof selectedProjectId,
                          effectiveModulesLength: effectiveModules.length,
                          moduleInEffectiveModules: effectiveModules.find(m => m.name === module.name)
                        });
                        fetchTestCasesByModule(selectedProjectId, String(module.id));
                      } else {
                        console.warn("Missing required data for module selection:", { 
                          selectedProjectId, 
                          moduleId: module.id,
                          moduleName: module.name,
                          effectiveModulesLength: effectiveModules.length
                        });
                      }
                    }

                  }}

                  className={`whitespace-nowrap m-2 ${isSelected ? " ring-2 ring-blue-400 border-blue-500" : ""}`}

                >

                  {module.name}

                </Button>

              );

            })}

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

  );



  const SubmoduleSelectionPanel = () => {

    console.log('SubmoduleSelectionPanel render:', {

      bulkModuleSelect,

      selectedModules,

      bulkSubmodules,

      bulkSubmodulesLoading

    });



    // Show bulk submodules when in bulk module select mode

    if (bulkModuleSelect && selectedModules.length > 0) {

      return (

        <Card className="mb-4">

          <CardContent className="p-4">

            <div className="flex justify-between items-center mb-3">

              <h2 className="text-lg font-semibold text-gray-900">

                Submodules for Selected Modules ({bulkSubmodules.length} found)

              </h2>

              {(allocationMode === "bulk" || allocationMode === "many-to-many") && activeTab === "release" && (

                <Button

                  size="sm"

                  variant={bulkSubmoduleSelect ? "primary" : "secondary"}

                  onClick={() => {

                    setBulkSubmoduleSelect(v => !v);

                    setSelectedSubmodules([]);

                    setSelectedTestCases([]);

                  }}

                >

                  {bulkSubmoduleSelect ? "Cancel Bulk Submodules" : "Bulk Select SubModules"}

                </Button>

              )}

            </div>



            {bulkSubmodulesLoading && (

              <div className="text-center py-4">

                <div className="text-gray-500">Loading submodules...</div>

              </div>

            )}



            {!bulkSubmodulesLoading && bulkSubmodules.length === 0 && (

              <div className="text-center py-4">

                <div className="text-gray-500 italic">

                  No submodules found for selected modules

                  <br />

                  <small className="text-xs">

                    Selected modules: {selectedModules.join(', ')} | Project: {selectedProjectId}

                  </small>

                </div>

              </div>

            )}



            {!bulkSubmodulesLoading && bulkSubmodules.length > 0 && (
              <>
                {/* Status indicator for bulk submodule selection */}
                {!bulkSubmoduleSelect && (
                  <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="text-sm text-yellow-800">
                      💡 Click on any submodule to start bulk selection, or use the "Bulk Select SubModules" button above
                    </div>
                  </div>
                )}
                
                {/* Show selected submodules count */}
                {bulkSubmoduleSelect && selectedSubmodules.length > 0 && (
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="text-sm text-blue-800">
                      ✅ {selectedSubmodules.length} submodule(s) selected
                    </div>
                  </div>
                )}
                
                <div className="space-y-3">

                  {/* Group submodules by module */}

                  {selectedModules.map(moduleId => {

                    const moduleSubmodules = bulkSubmodules.filter(sub => sub.moduleId === Number(moduleId));

                    const moduleName = moduleSubmodules[0]?.moduleName || `Module ${moduleId}`;



                    if (moduleSubmodules.length === 0) return null;



                    return (

                      <div key={moduleId} className="border rounded-lg p-3 bg-gray-50">

                        <h4 className="font-medium text-gray-800 mb-2">{moduleName}</h4>

                        <div className="flex flex-wrap gap-2">

                          {moduleSubmodules.map(submodule => {

                            const isSelected = bulkSubmoduleSelect

                              ? selectedSubmodules.includes(String(submodule.subModuleId))

                              : false;



                            return (

                              <Button

                                key={submodule.subModuleId}

                                size="sm"

                                variant={isSelected ? "primary" : "secondary"}

                                onClick={() => {



                                  if (bulkSubmoduleSelect) {

                                    setSelectedSubmodules((prev) => {

                                      const newSelection = prev.includes(String(submodule.subModuleId))

                                        ? prev.filter((s) => s !== String(submodule.subModuleId))

                                        : [...prev, String(submodule.subModuleId)];


                                      
                                      // Clear test cases when submodules are deselected in bulk mode
                                      if (newSelection.length === 0) {
                                        setAllocatedTestCases([]);
                                      }
                                      
                                      return newSelection;
                                    });

                                  } else {
                                    setBulkSubmoduleSelect(true);
                                    setSelectedSubmodules([String(submodule.subModuleId)]);
                                  }

                                }}

                                className={`${isSelected ? "ring-2 ring-blue-400 border-blue-500" : ""}`}

                              >

                                {submodule.subModuleName}

                              </Button>

                            );

                          })}

                        </div>

                      </div>

                    );

                  })}

                </div>
              </>

            )}

          </CardContent>

        </Card>

      );

    }



    // Original single module submodule selection

    return (

      <Card className="mb-4">

        <CardContent className="p-4">

          <div className="flex justify-between items-center mb-3">

            <h2 className="text-lg font-semibold text-gray-900">

              Submodule Selection

            </h2>

            {(allocationMode === "bulk" || allocationMode === "many-to-many") && activeTab === "release" && (

              <Button

                size="sm"

                variant={bulkSubmoduleSelect ? "primary" : "secondary"}

                onClick={() => {

                  setBulkSubmoduleSelect(v => !v);

                  setSelectedSubmodules([]);

                  setSelectedTestCases([]);

                  // Clear allocated test cases when toggling bulk submodule selection
                  setAllocatedTestCases([]);

                }}

                disabled={!selectedSubmodule}

              >

                {bulkSubmoduleSelect ? "Cancel Bulk" : "Bulk Select"}

              </Button>

            )}

          </div>

          {submoduleError && (

            <div className="mb-2 text-red-600 text-sm">{submoduleError}</div>

          )}

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

              className="flex space-x-2 overflow-x-auto pb-2 scroll-smooth flex-1"

              style={{

                scrollbarWidth: "none",

                msOverflowStyle: "none",

                maxWidth: "100%",

              }}

            >

              {submodules.map((submodule: any) => {

                const isSelected = bulkSubmoduleSelect

                  ? selectedSubmodules.includes(String(submodule.subModuleId))

                  : selectedSubmodule === String(submodule.subModuleId);

                return (

                  <Button

                    key={submodule.subModuleId}

                    variant={isSelected ? "primary" : "secondary"}

                    onClick={() => {

                      if (bulkSubmoduleSelect) {

                        setSelectedSubmodules((prev) => {

                          const newSelection = prev.includes(String(submodule.subModuleId))

                            ? prev.filter((s) => s !== String(submodule.subModuleId))

                            : [...prev, String(submodule.subModuleId)];

                          
                          // Clear test cases when submodules are deselected in bulk mode
                          if (newSelection.length === 0) {
                            setAllocatedTestCases([]);
                          }
                          
                          return newSelection;
                        });

                      } else {

                        // Clear previous test cases when selecting a new submodule
                        setQaAllocatedTestCasesData([]);
                        setQaTestCasesError(null);
                        handleSelectSubModule(String(submodule.subModuleId));

                        setSelectedSubmodule(String(submodule.subModuleId));

                      }

                    }}

                    className={`whitespace-nowrap m-2 ${isSelected ? " ring-2 ring-blue-400 border-blue-500" : ""}`}

                  >

                    {submodule.name}

                  </Button>

                );

              })}

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

    );

  };



  // Helper function to format test case ID with abbreviation

  const formatTestCaseId = (id: string | number): string => {

    // Convert to string and pad with zeros to make it 4 digits

    const numericId = String(id).padStart(4, '0');

    return `${numericId}`;

  };



  // Severity color helper - uses actual severity colors from configuration

  const getSeverityColor = (severity: string): { className: string; style: React.CSSProperties } => {

    // Find the severity configuration by name

    const severityConfig = severities.find(s => s.name.toLowerCase() === severity.toLowerCase());



    if (severityConfig && severityConfig.color) {

      // Return custom styles object for inline styling

      return {

        className: "px-2 py-1 rounded-full text-xs font-medium",

        style: {

          backgroundColor: severityConfig.color,

          color: '#ffffff' // White text for better contrast

        }

      };

    }



    // Fallback to default Tailwind classes if severity not found

    let className = "px-2 py-1 rounded-full text-xs font-medium ";

    switch (severity.toLowerCase()) {

      case "critical":

      case "very high":

        className += "bg-red-100 text-red-800";

        break;

      case "high":

        className += "bg-orange-100 text-orange-800";

        break;

      case "medium":

        className += "bg-yellow-100 text-yellow-800";

        break;

      case "low":

        className += "bg-green-100 text-green-800";

        break;

      default:

        className += "bg-gray-100 text-gray-800";

    }



    return {

      className,

      style: {}

    };

  };



  // Selection logic

  const handleSelectAll = (checked: boolean, displayTestCases: any[]) => {

    if (activeTab === "qa") {

      if (!selectedReleaseForQA) return;

      if (checked) {

        setSelectedTestCasesForQA(prev => ({

          ...prev,

          [selectedReleaseForQA]: displayTestCases.map((tc: any) => String(tc.id))

        }));

      } else {

        setSelectedTestCasesForQA(prev => ({

          ...prev,

          [selectedReleaseForQA]: []

        }));

      }

    } else {

      if (checked) {

        // For one-to-one and one-to-many modes, only select the first test case

        if (allocationMode === "one-to-one" || allocationMode === "one-to-many") {

          setSelectedTestCases(displayTestCases.length > 0 ? [String(displayTestCases[0].id)] : []);

        } else {

          setSelectedTestCases(displayTestCases.map((tc: any) => String(tc.id)));

        }

      } else {

        setSelectedTestCases([]);

      }

    }

  };



  const handleSelectTestCase = (testCaseId: string, checked: boolean) => {

    if (activeTab === "qa") {

      if (!selectedReleaseForQA) return;

      if (checked) {

        setSelectedTestCasesForQA(prev => ({

          ...prev,

          [selectedReleaseForQA]: [...(prev[selectedReleaseForQA] || []), testCaseId]

        }));

      } else {

        setSelectedTestCasesForQA(prev => ({

          ...prev,

          [selectedReleaseForQA]: (prev[selectedReleaseForQA] || []).filter((id) => id !== testCaseId)

        }));

      }

    } else {

      if (checked) {

        setSelectedTestCases([...selectedTestCases, testCaseId]);

      } else {

        setSelectedTestCases(selectedTestCases.filter((id) => id !== testCaseId));

      }

    }

  };



  // Table with all columns and actions

  const TestCaseTable = ({ testCases }: { testCases?: any[] }) => {

    // Determine which test cases to display based on the active tab

    const displayTestCases = (() => {

      if (activeTab === "qa" && qaAllocatedTestCasesData.length > 0) {

        // For QA tab, use allocated test cases data and map to expected format

        return qaAllocatedTestCasesData.map((tc: allocated_testcase_details) => ({

          id: tc.id, // This is the releasetestcase ID that the API expects

          testCaseId: tc.testCaseId,

          description: tc.description,

          steps: tc.steps,

          type: tc.type,

          severity: tc.severity

        }));

      }

      return testCases || allocatedTestCases;

    })();



    return (

      <Card>

        <CardContent className="p-0">

          <table className="w-full">

            <thead className="bg-gray-50">

              <tr className="border-b border-gray-200">

                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">

                  <input

                    type="checkbox"

                    checked={

                      activeTab === "qa"

                        ? (selectedReleaseForQA ? ((selectedTestCasesForQA[selectedReleaseForQA]?.length ?? 0) === displayTestCases.length && displayTestCases.length > 0) : false)

                        : (allocationMode === "one-to-one" || allocationMode === "one-to-many")

                          ? (selectedTestCases.length === 1 && displayTestCases.length > 0)

                          : (selectedTestCases.length === displayTestCases.length && displayTestCases.length > 0)

                    }

                    onChange={(e) => handleSelectAll(e.target.checked, displayTestCases)}

                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"

                  />

                </th>

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



              </tr>

            </thead>

            <tbody className="bg-white divide-y divide-gray-200">

              {displayTestCases.map((tc: any) => {

                const testCaseId = tc.id || tc.testCaseId;

                return (

                  <tr key={testCaseId} className="hover:bg-gray-50">

                    <td className="px-6 py-4 whitespace-nowrap">

                      <input

                        type="checkbox"

                        checked={

                          activeTab === "qa"

                            ? (selectedReleaseForQA ? (selectedTestCasesForQA[selectedReleaseForQA]?.includes(String(testCaseId)) ?? false) : false)

                            : selectedTestCases.includes(String(testCaseId))

                        }

                        disabled={

                          (allocationMode === "one-to-one" && !selectedTestCases.includes(String(testCaseId)) && selectedTestCases.length >= 1) ||

                          (allocationMode === "one-to-many" && !selectedTestCases.includes(String(testCaseId)) && selectedTestCases.length >= 1)

                        }

                        onChange={(e) =>

                          handleSelectTestCase(String(testCaseId), e.target.checked)

                        }

                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"

                      />

                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">

                      {(() => {

                        // If testCaseId is available in the data, show it directly

                        if (tc.testCaseId) {

                          return tc.testCaseId; // Show exactly as received: "TC0001", "TC0003", "TC0004", etc.

                        }

                        // Otherwise, use the formatted ID

                        return formatTestCaseId(testCaseId);

                      })()}

                    </td>

                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs description-cell" title={tc.description || 'No description'}>

                      {tc.description || <span className="text-gray-400 italic">No description</span>}

                    </td>

                    <td className="px-6 py-4 text-sm text-gray-500">

                      <button

                        onClick={() => {

                          setViewingTestCase(tc);

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

                      {tc.type}

                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">

                      {(() => {

                        const severityStyles = getSeverityColor(tc.severity);

                        return (

                          <span

                            className={severityStyles.className}

                            style={severityStyles.style}

                          >

                            {tc.severity}

                          </span>

                        );

                      })()}

                    </td>



                  </tr>

                );

              })}

            </tbody>

          </table>

        </CardContent>

      </Card>

    );

  };



  // Show releases that have test cases from API or existing allocations

  const releasesForQAAllocation = (() => {

    // If we have API data, use it to determine which releases to show

    if (releaseTestCaseCounts.length > 0) {

      return releaseTestCaseCounts

        .filter(apiRelease => apiRelease.testCaseCount > 0)

        .map(apiRelease => {

          // Find matching release from effectiveProjectRelease or create a minimal one

          const existingRelease = effectiveProjectRelease.find(r =>

            (r.releaseId || r.id) === apiRelease.releaseId

          );



          return existingRelease || {

            releaseId: apiRelease.releaseId,

            id: apiRelease.releaseId,

            releaseName: apiRelease.releaseName,

            name: apiRelease.releaseName,

            version: 'N/A'

          };

        });

    }



    // Fallback to old logic if API data is not available

    return effectiveProjectRelease.filter((release: any) => {

      const releaseId = release.releaseId || release.id;

      return qaAllocatedTestCases[releaseId] && qaAllocatedTestCases[releaseId].length > 0;

    });

  })();



  // --- QA Allocation Panel ---

  const QASelectionPanel = () => {

    // Only one release can be selected for QA allocation at a time

    let allocatedRelease: any = null;

    if (selectedReleaseForQA) {

      allocatedRelease = effectiveProjectRelease && effectiveProjectRelease.find((release: any) =>

        (release.releaseId || release.id) === selectedReleaseForQA

      );

    }



    // Use fetched QA members instead of filtering employees

    const effectiveQAEngineers = qaMembers.map(qa => ({

      id: String(qa.userId),

      firstName: qa.userFullName.split(' ')[0] || '',

      lastName: qa.userFullName.split(' ').slice(1).join(' ') || '',

      designation: 'QA Engineer'

    }));



    // State for summary modal

    const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
    
    // State for QA allocation summary
    const [qaAllocationSummary, setQaAllocationSummary] = useState<any>(null);
    const [qaAllocationSummaryLoading, setQaAllocationSummaryLoading] = useState(false);
    const [qaAllocationSummaryError, setQaAllocationSummaryError] = useState<string | null>(null);
    
    // State for detailed test case information
    const [qaEngineerTestCases, setQaEngineerTestCases] = useState<any[]>([]);
    const [qaEngineerTestCasesLoading, setQaEngineerTestCasesLoading] = useState(false);
    const [qaEngineerTestCasesError, setQaEngineerTestCasesError] = useState<string | null>(null);



    const handleSelectReleaseForQA = async (release: any) => {

      const releaseId = release.releaseId || release.id;

      setSelectedReleaseForQA(releaseId);

      setQaReleaseTestCasesLoading(true);

      setQaReleaseTestCasesError(null);

      try {

        // Use selectedModule and selectedSubmodule if available, else fallback to 0

        const moduleId = selectedModule ? Number(effectiveModules.find((m: any) => m.name === selectedModule)?.id) : 0;

        const subModuleId = selectedSubmodule ? Number(selectedSubmodule) : 0;

        const projectId = Number(selectedProjectId);



        // Only fetch test cases if we have all required parameters
        if (moduleId && subModuleId && projectId) {
          console.log("Fetching test cases for release with filters:", {
          projectId,

            releaseId: Number(releaseId),
            moduleId,
            subModuleId
        });



          // Use the new function to fetch test cases by module, submodule, and release
          await fetchTestCasesByModuleSubmoduleRelease(
            projectId,

            Number(releaseId),
            moduleId,

            subModuleId

          );
        } else {
          console.log("Missing required parameters for fetching test cases:", {
            moduleId,
            subModuleId,
            projectId
          });
          // Clear any existing test cases if we don't have all parameters
          setQaAllocatedTestCasesData([]);
        }

      } catch (err: any) {

        console.error("Error in handleSelectReleaseForQA:", err);
        setQaReleaseTestCasesError("Failed to fetch test cases for this release.");

        setQaReleaseTestCases([]);

      } finally {

        setQaReleaseTestCasesLoading(false);

      }

    };

    // Function to fetch QA allocation summary
    const fetchQaAllocationSummary = async () => {
      if (!selectedProjectId || qaMembers.length === 0) {
        setQaAllocationSummaryError("No project selected or no QA members found");
        return;
      }

      setQaAllocationSummaryLoading(true);
      setQaAllocationSummaryError(null);

      try {
        // Get all QA member IDs as comma-separated string
        const qaEngineerIds = qaMembers.map(qa => qa.userId).join(',');
        
        const response = await getQaAllocationSummary(qaEngineerIds);
        
        if (response.status === "Success" && response.data?.allocationSummary) {
          setQaAllocationSummary(response.data.allocationSummary);
        } else {
          setQaAllocationSummaryError("Failed to fetch QA allocation summary");
        }
      } catch (err: any) {
        console.error("Error fetching QA allocation summary:", err);
        setQaAllocationSummaryError(err.message || "Failed to fetch QA allocation summary");
      } finally {
        setQaAllocationSummaryLoading(false);
      }
    };

    // Function to fetch detailed test case information for QA engineers
    const fetchQaEngineerTestCases = async () => {
      if (!selectedProjectId || !selectedModule || !selectedSubmodule || !selectedReleaseForQA) {
        setQaEngineerTestCasesError("Missing required parameters for fetching test cases");
        return;
      }

      setQaEngineerTestCasesLoading(true);
      setQaEngineerTestCasesError(null);

      try {
        const projectId = Number(selectedProjectId);
        const releaseId = Number(selectedReleaseForQA);
        const moduleId = Number(effectiveModules.find((m: any) => m.name === selectedModule)?.id);
        const subModuleId = Number(selectedSubmodule);

        if (!moduleId || !subModuleId) {
          setQaEngineerTestCasesError("Invalid module or submodule selection");
          return;
        }

        const response = await getQaEngineerTestCases(projectId, releaseId, moduleId, subModuleId);
        
        if (response.status === "success" && response.data) {
          setQaEngineerTestCases(response.data);
        } else {
          setQaEngineerTestCasesError("Failed to fetch test case details");
        }
      } catch (err: any) {
        console.error("Error fetching QA engineer test cases:", err);
        setQaEngineerTestCasesError(err.message || "Failed to fetch test case details");
      } finally {
        setQaEngineerTestCasesLoading(false);
      }
    };

    // useEffect to fetch QA allocation summary when modal is opened
    useEffect(() => {
      if (isSummaryModalOpen && selectedProjectId && qaMembers.length > 0) {
        fetchQaAllocationSummary();
        // Also fetch detailed test case information if we have all required parameters
        if (selectedModule && selectedSubmodule && selectedReleaseForQA) {
          fetchQaEngineerTestCases();
        }
      }
    }, [isSummaryModalOpen, selectedProjectId, qaMembers.length, selectedModule, selectedSubmodule, selectedReleaseForQA]);

    return (

      <div className="space-y-6">

        {/* Overall Progress Summary */}

        <Card>

          <CardContent className="p-6">

            <div className="flex items-center space-x-3 mb-4">

              <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-sm font-semibold">

                📊

              </div>

              <h3 className="text-lg font-semibold text-gray-900">Overall QA Allocation Progress</h3>

            </div>

            {releaseTestCaseCountsError && (

              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">

                <div className="text-sm text-yellow-800">

                  ⚠️ {releaseTestCaseCountsError}. Showing data from existing allocations.

                </div>

              </div>

            )}





            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">

                <div className="text-2xl font-bold text-blue-600">

                  {releaseTestCaseCountsLoading ? "..." : releaseTestCaseCounts.length}

                </div>

                <div className="text-sm text-blue-700">Releases with Test Cases</div>

                {/* Show release names from API */}

                {!releaseTestCaseCountsLoading && releaseTestCaseCounts.length > 0 && (

                  <div className="text-xs text-blue-600 mt-1">

                    {releaseTestCaseCounts.map(r => r.releaseName).join(", ")}

                  </div>

                )}

              </div>

              <div className="bg-green-50 p-4 rounded-lg border border-green-200">

                <div className="text-2xl font-bold text-green-600">

                  {releaseTestCaseCountsLoading ? "..." : releaseTestCaseCounts.reduce((total, r) => total + r.testCaseCount, 0)}

                </div>

                <div className="text-sm text-green-700">Total Test Cases</div>

                {/* Show test case counts from API */}

                {!releaseTestCaseCountsLoading && releaseTestCaseCounts.length > 0 && (

                  <div className="text-xs text-green-600 mt-1">

                    {releaseTestCaseCounts.map(r => `${r.releaseName}: ${r.testCaseCount}`).join(", ")}

                  </div>

                )}

              </div>

              <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">

                <div className="text-2xl font-bold text-orange-600">

                  {releaseTestCaseCountsLoading ? "..." : releaseTestCaseCounts.reduce((total, r) => {

                    const releaseId = r.releaseId;

                    const allocatedToQA = Object.values(qaAllocations[releaseId] || {}).flat().length;

                    return total + Math.max(0, r.testCaseCount - allocatedToQA);

                  }, 0)}

                </div>

                <div className="text-sm text-orange-700">Test Cases Remaining</div>

              </div>

            </div>

          </CardContent>

        </Card>



        {/* Step 1: Release Selection */}

        <Card>

          <CardContent className="p-6">

            <div className="flex items-center space-x-3 mb-4">

              <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">

                1

              </div>

              <h3 className="text-lg font-semibold text-gray-900">Select Release for QA Allocation</h3>

            </div>

            {releasesForQAAllocation.length > 0 ? (

              <div className="flex space-x-2 overflow-x-auto">

                {releasesForQAAllocation.map((release: any) => {

                const releaseId = release.releaseId

                const ids = release.id;

                const isSelected = selectedReleaseForQA === releaseId;

                const allocatedTestCases = qaAllocatedTestCases[releaseId] || [];

                const allocatedToQA = Object.values(qaAllocations[releaseId] || {}).flat().length;



                // Get test case count from the new API

                const releaseTestCaseData = releaseTestCaseCounts.find(r => r.releaseId === releaseId);

                const totalTestCases = releaseTestCaseData?.testCaseCount || allocatedTestCases.length;

                const remainingTestCases = totalTestCases - allocatedToQA;

                

                return (

                  <div

                    key={releaseId}

                    className={`min-w-[180px] px-4 py-2 rounded-md border text-left transition-all duration-200 focus:outline-none text-sm font-medium shadow-sm flex flex-col items-start relative bg-white

                      ${

                        isSelected

                          ? "border-blue-500 hover:border-blue-500 hover:bg-blue-50 hover:shadow-md hover:ring-1 hover:ring-blue-300"

                          : "border-gray-200 hover:border-blue-500 hover:bg-blue-50 hover:shadow-md hover:ring-1 hover:ring-blue-300"

                      }`}

                    style={{

                      boxShadow: isSelected ? "0 0 0 2px #3b82f6" : undefined,

                    }}

                  >

                    <div className="truncate font-semibold mb-1">

                      {releaseTestCaseData?.releaseName || release.releaseName || release.name}

                    </div>

                    <div className="text-xs text-gray-500 mb-1">Version: {release.version || 'N/A'}</div>

                    <div className="text-xs text-gray-600 mb-2">

                      {releaseTestCaseData?.testCaseCount || totalTestCases} test cases allocated

                    </div>

                    <div className="text-xs text-green-600 mb-2">

                      {allocatedToQA} assigned to QA • {remainingTestCases} remaining

                    </div>

                    <Button

                      size="sm"

                      variant={isSelected ? "primary" : "secondary"}

                      className="w-full"

                      onClick={() => handleSelectReleaseForQA(release)}

                      disabled={

                        (allocationMode === "one-to-one" || allocationMode === "bulk") && !isSelected && selectedReleaseIds.length >= 1

                      }

                    >

                      {isSelected ? "Selected" : "Select"}

                    </Button>

                  </div>

                );

              })}

              </div>

            ) : (

              <div className="text-center py-8">

                <div className="text-sm text-gray-500 mb-2">No releases have test cases allocated for QA.</div>

                <div className="text-xs text-gray-400">Please go back to the Release Allocation tab and allocate test cases to releases first.</div>

              </div>

            )}

          </CardContent>

        </Card>



        {/* Step 2: Allocate New Test Cases (only show if release is selected) */}

        {selectedReleaseForQA && (

          <Card>

            <CardContent className="p-6">

              <div className="flex items-center justify-between mb-4">

                <div className="flex items-center space-x-3">

                  <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-sm font-semibold">

                    2

                  </div>

                  <h3 className="text-lg font-semibold text-gray-900">Allocate New Test Cases</h3>

                </div>

                {/* Summary Button */}

                <Button

                  variant="secondary"

                  size="sm"

                  onClick={async () => {
                    await fetchQaAllocationSummary();
                    setIsSummaryModalOpen(true);
                  }}

                  className="flex items-center space-x-2"

                >

                  <Eye className="w-4 h-4" />

                  <span>View Summary</span>

                </Button>

              </div>


              {/* Instructions for Module and Submodule Selection */}
              {(!selectedModule || !selectedSubmodule) && (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-sm font-medium text-blue-900 mb-2">
                    📋 Next Steps Required
                  </div>
                  <div className="text-sm text-blue-700 mb-2">
                    To view and allocate test cases, you need to:
                  </div>
                  <div className="text-sm text-blue-600 space-y-1">
                    {!selectedModule && (
                      <div>• Select a <strong>Module</strong> from the Module Selection panel below</div>
                    )}
                    {!selectedSubmodule && selectedModule && (
                      <div>• Select a <strong>Submodule</strong> from the Submodule Selection panel below</div>
                    )}
                  </div>
                  <div className="text-xs text-blue-500 mt-2">
                    Test cases will be automatically loaded once both module and submodule are selected.
                  </div>
                </div>
              )}


              {/* Release Info */}

              {allocatedRelease && (

                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">

                  <div className="text-sm font-medium text-blue-900 mb-1">

                    Selected Release:

                  </div>

                  <div className="text-lg font-semibold text-blue-700 mb-1">

                    {allocatedRelease.releaseName || allocatedRelease.name} (v{allocatedRelease.version})

                  </div>

                  <div className="text-sm text-blue-600 mb-2">

                    {(() => {

                      const releaseTestCaseData = releaseTestCaseCounts.find(r => r.releaseId === selectedReleaseForQA);

                      const totalTestCases = releaseTestCaseData?.testCaseCount || qaAllocatedTestCases[selectedReleaseForQA]?.length || 0;

                      return totalTestCases;

                    })()} test cases allocated to this release

                  </div>

                  <div className="text-sm text-green-600">

                    {Object.values(qaAllocations[selectedReleaseForQA] || {}).flat().length} already assigned to QA • {(() => {

                      const releaseTestCaseData = releaseTestCaseCounts.find(r => r.releaseId === selectedReleaseForQA);

                      const totalTestCases = releaseTestCaseData?.testCaseCount || qaAllocatedTestCases[selectedReleaseForQA]?.length || 0;

                      return totalTestCases - Object.values(qaAllocations[selectedReleaseForQA] || {}).flat().length;

                    })()} remaining for allocation

                  </div>

                </div>

              )}



              {/* QA Selection */}

              <div className="mb-6">

                <h4 className="text-md font-semibold text-gray-800 mb-3">Select QA Engineer:</h4>

                

                {qaMembersLoading ? (

                  <div className="text-center py-4">

                    <div className="text-sm text-gray-500">Loading QA members...</div>

                  </div>

                ) : qaMembersError ? (

                  <div className="text-center py-4">

                    <div className="text-sm text-red-500 mb-2">{qaMembersError}</div>

                    <Button

                      variant="secondary"

                      size="sm"

                      onClick={fetchQAMembers}

                    >

                      Retry

                    </Button>

                  </div>

                ) : effectiveQAEngineers.length > 0 ? (

                  <div className="flex flex-wrap gap-3">

                    {effectiveQAEngineers.map((emp: any) => (

                      <Button

                        key={emp.id}

                        variant={selectedQA === emp.id ? "primary" : "secondary"}

                        onClick={() => {

                          setSelectedQA(emp.id);

                          setQaAllocationError(null);

                          setQaAllocationSuccess(null);

                        }}

                        className="min-w-[120px]"

                      >

                        {emp.firstName} {emp.lastName}

                      </Button>

                    ))}

                  </div>

                ) : (

                  <div className="text-center py-4">

                    <div className="text-sm text-gray-500">No QA members found for this project.</div>

                    <div className="text-xs text-gray-400 mt-1">Please contact your administrator to assign QA members to this project.</div>

                  </div>

                )}

              </div>


              {/* Test Cases Loading and Error States */}
              {selectedReleaseForQA && selectedModule && selectedSubmodule && (
                <div className="mb-6">
                  {/* <h4 className="text-md font-semibold text-gray-800 mb-3">Available Cases:</h4> */}
                  
                  {/* Debug Info */}
                  {/* <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="text-xs font-medium text-gray-600 mb-1">Selected Parameters:</div>
                    <div className="text-xs text-gray-500 space-y-1">
                      <div>Project ID: {selectedProjectId}</div>
                      <div>Release ID: {selectedReleaseForQA}</div>
                      <div>Module: {selectedModule} (ID: {effectiveModules.find((m: any) => m.name === selectedModule)?.id})</div>
                      <div>Submodule: {selectedSubmodule}</div>
                    </div>
                  </div> */}

                  {/* Status Indicator */}
                  {qaAllocatedTestCasesData.length === 0 && !loadingQATestCases && !qaTestCasesError && (
                    <div className="mb-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <div className="text-sm text-yellow-800">
                        🔄 Test cases will be loaded automatically for the selected module and submodule
                      </div>
                    </div>
                  )}
                  
                  {loadingQATestCases ? (
                    <div className="text-center py-4">
                      <div className="text-sm text-gray-500">Loading test cases for selected filters...</div>
                      <div className="text-xs text-gray-400 mt-1">
                        Release: {selectedReleaseForQA}, Module: {selectedModule}, Submodule: {selectedSubmodule}
                      </div>
                    </div>
                  ) : qaTestCasesError ? (
                    <div className="text-center py-4">
                      <div className="text-sm text-red-500 mb-2">{qaTestCasesError}</div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          const moduleId = Number(effectiveModules.find((m: any) => m.name === selectedModule)?.id);
                          const subModuleId = Number(selectedSubmodule);
                          const projectId = Number(selectedProjectId);
                          
                          if (moduleId && subModuleId && projectId) {
                            fetchTestCasesByModuleSubmoduleRelease(
                              projectId,
                              Number(selectedReleaseForQA),
                              moduleId,
                              subModuleId
                            );
                          }
                        }}
                      >
                        Retry
                      </Button>
                    </div>
                  ) : qaAllocatedTestCasesData.length > 0 ? (
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="text-sm text-green-900 mb-2">
                        ✅ Found {qaAllocatedTestCasesData.length} test case(s) for the selected filters
                      </div>
                      <div className="text-xs text-green-700">
                        Release: {selectedReleaseForQA} | Module: {selectedModule} | Submodule: {selectedSubmodule}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <div className="text-sm text-gray-500">No test cases found for the selected filters</div>
                      <div className="text-xs text-gray-400 mt-1">
                        Release: {selectedReleaseForQA} | Module: {selectedModule} | Submodule: {selectedSubmodule}
                      </div>
                      <div className="text-xs text-gray-400 mt-2">
                        Please ensure test cases are allocated to this release for the selected module and submodule.
                      </div>
                    </div>
                  )}
                </div>
              )}


              {/* Allocation Action */}

              {selectedQA && selectedReleaseForQA && qaAllocatedTestCasesData.length > 0 && (selectedTestCasesForQA[selectedReleaseForQA]?.length ?? 0) > 0 && effectiveQAEngineers.length > 0 && (
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">

                  <div className="text-sm font-medium text-green-900 mb-3">

                    Ready to allocate {selectedTestCasesForQA[selectedReleaseForQA]?.length ?? 0} test case(s) to{' '}

                    <span className="font-semibold">

                      {effectiveQAEngineers.find((emp: any) => emp.id === selectedQA)?.firstName} {effectiveQAEngineers.find((emp: any) => emp.id === selectedQA)?.lastName}

                    </span>

                  </div>



                  {/* Success Message */}

                  {qaAllocationSuccess && (

                    <div className="mb-3 p-3 bg-green-100 border border-green-300 rounded-lg">

                      <div className="text-sm text-green-800">✅ {qaAllocationSuccess}</div>

                    </div>

                  )}



                  {/* Error Message */}

                  {qaAllocationError && (

                    <div className="mb-3 p-3 bg-red-100 border border-red-300 rounded-lg">

                      <div className="text-sm text-red-800">❌ {qaAllocationError}</div>

                    </div>

                  )}



                  <div className="flex gap-3">

                    <Button

                      variant="primary"

                      size="sm"

                      disabled={qaAllocationLoading}

                      onClick={async () => {

                        if (selectedReleaseForQA && selectedQA) {

                          await allocateTestCasesToQA(selectedQA, selectedTestCasesForQA[selectedReleaseForQA] || []);

                        }

                      }}

                    >

                      {qaAllocationLoading ? "Allocating..." : "Confirm Allocation"}

                    </Button>

                    <Button

                      variant="secondary"

                      size="sm"

                      disabled={qaAllocationLoading}

                      onClick={() => {

                        setSelectedTestCasesForQA(prev => ({

                          ...prev,

                          [selectedReleaseForQA!]: []

                        }));

                        setQaAllocationError(null);

                        setQaAllocationSuccess(null);

                      }}

                    >

                      Cancel

                    </Button>

                  </div>

                </div>

              )}

            </CardContent>

          </Card>

        )}



        {/* Step 3: Release Complete (only show if all test cases for current release are allocated) */}

        {selectedReleaseForQA && (() => {

          const releaseTestCaseData = releaseTestCaseCounts.find(r => r.releaseId === selectedReleaseForQA);

          const totalTestCases = releaseTestCaseData?.testCaseCount || qaAllocatedTestCases[selectedReleaseForQA]?.length || 0;

          const allocatedToQA = Object.values(qaAllocations[selectedReleaseForQA] || {}).flat().length;

          return allocatedToQA === totalTestCases && totalTestCases > 0;

        })() && (

          <Card>

            <CardContent className="p-6">

              <div className="flex items-center space-x-3 mb-4">

                <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-semibold">

                  ✓

                </div>

                <h3 className="text-lg font-semibold text-green-900">Release Allocation Complete!</h3>

              </div>

              <div className="p-4 bg-green-50 rounded-lg border border-green-200">

                <div className="text-sm font-medium text-green-900 mb-2">

                  All test cases for "{allocatedRelease?.releaseName || allocatedRelease?.name}" have been allocated successfully!

                </div>

                <div className="text-sm text-green-700 mb-4">

                  {Object.values(qaAllocations[selectedReleaseForQA] || {}).flat().length} of {(() => {

                    const releaseTestCaseData = releaseTestCaseCounts.find(r => r.releaseId === selectedReleaseForQA);

                    return releaseTestCaseData?.testCaseCount || qaAllocatedTestCases[selectedReleaseForQA]?.length || 0;

                  })()} test cases allocated

                </div>

                <div className="flex gap-3">

                  {releasesForQAAllocation.find((r: any) => (r.releaseId || r.id) !== selectedReleaseForQA) ? (

                    <Button

                      variant="primary"

                      onClick={() => {

                        const nextRelease = releasesForQAAllocation.find((r: any) => (r.releaseId || r.id) !== selectedReleaseForQA);

                        if (nextRelease) {

                          setSelectedReleaseForQA(nextRelease.releaseId || nextRelease.id);

                          setSelectedQA(null);

                        }

                      }}

                    >

                      Next Release

                    </Button>

                  ) : (

                    <Button

                      variant="primary"

                      onClick={() => {

                        const currentProjectId = selectedProject || projectId;

                        if (!currentProjectId) return;

                        // Save mock modules to localStorage for TestExecution page

                        localStorage.setItem("mockModules", JSON.stringify(effectiveModules));

                        navigate(`/projects/${currentProjectId}/releases/test-execution`);

                      }}

                    >

                      Proceed to Test Execution

                    </Button>

                  )}

                </div>

              </div>

            </CardContent>

          </Card>

        )}



        {/* Summary Modal */}

        <Modal

          isOpen={isSummaryModalOpen}

          onClose={() => setIsSummaryModalOpen(false)}

          title="QA Engineers & Their Assignments"

          size="xl"

        >
          {/* Refresh Button */}
          <div className="absolute top-4 right-4">
            <Button
              variant="secondary"
              size="sm"
              onClick={fetchQaAllocationSummary}
              disabled={qaAllocationSummaryLoading}
              className="flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Refresh</span>
            </Button>
          </div>

          <div className="space-y-6">

            {/* Summary Stats */}
            {qaAllocationSummaryLoading ? (
              <div className="text-center py-8">
                <div className="text-sm text-gray-500">Loading QA allocation summary...</div>
              </div>
            ) : qaAllocationSummaryError ? (
              <div className="text-center py-8">
                <div className="text-sm text-red-500 mb-2">Error loading summary: {qaAllocationSummaryError}</div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={fetchQaAllocationSummary}
                  className="mt-2"
                >
                  Retry
                </Button>
              </div>
            ) : qaAllocationSummary ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">

                <div className="text-2xl font-bold text-blue-600">

                  {qaAllocationSummary.totalAllocated}

                </div>

                <div className="text-sm text-blue-700">Total Allocated</div>

              </div>

              <div className="bg-green-50 p-4 rounded-lg border border-green-200">

                <div className="text-2xl font-bold text-green-600">

                  {qaAllocationSummary.qaEngineerCount}

                </div>

                <div className="text-sm text-green-700">QA Engineers</div>

              </div>

              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">

                <div className="text-2xl font-bold text-purple-600">

                  {qaAllocationSummary.remaining}

                </div>

                <div className="text-sm text-purple-700">Remaining</div>

              </div>

            </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-sm text-gray-500">No summary data available</div>
              </div>
            )}

            {/* Test Case ID Information */}
            {/* {qaAllocationSummary && (
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <div className="text-sm text-blue-700 mb-1">
                  <span className="font-medium">ℹ️ Test Case IDs:</span> Individual test case IDs will be displayed below when module, submodule, and release are selected.
                </div>
                <div className="text-xs text-blue-600">
                  {selectedModule && selectedSubmodule && selectedReleaseForQA 
                    ? "All parameters selected - fetching test case details..." 
                    : "Please select module, submodule, and release to view test case IDs"
                  }
                </div>
              </div>
            )} */}

            {/* API Data Source Info */}
            {/* {qaAllocationSummary && (
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="text-sm text-gray-600 mb-2">
                  <span className="font-medium">Data Source:</span> Backend API - QA Allocation Summary
                </div>
                <div className="text-xs text-gray-500">
                  Last updated: {new Date().toLocaleString()}
                </div>
              </div>
            )} */}



            {/* QA Engineers List */}

            <div className="space-y-4">

              <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold text-gray-800">QA Engineers & Their Assignments</h4>
                {selectedModule && selectedSubmodule && selectedReleaseForQA && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={fetchQaEngineerTestCases}
                    disabled={qaEngineerTestCasesLoading}
                    className="flex items-center space-x-2 text-xs"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Refresh Test Cases</span>
                  </Button>
                )}
              </div>

              {qaAllocationSummaryLoading ? (

                <div className="text-center py-8">

                  <div className="text-sm text-gray-500">Loading QA allocation summary...</div>

                </div>

              ) : qaAllocationSummaryError ? (

                <div className="text-center py-8">

                  <div className="text-sm text-red-500 mb-2">Error loading summary: {qaAllocationSummaryError}</div>

                  <Button

                    variant="secondary"

                    size="sm"

                    onClick={fetchQaAllocationSummary}

                    className="mt-2"

                  >

                    Retry

                  </Button>

                </div>

              ) : qaAllocationSummary && qaAllocationSummary.qaEngineers && qaAllocationSummary.qaEngineers.length > 0 ? (

                <div className="space-y-4">

                  {qaAllocationSummary.qaEngineers.map((qa: any) => {

                    const allocatedTestCases = qa.testCases;

                    return (

                      <div key={qa.id} className="border rounded-lg p-4 bg-gray-50">

                        <div className="flex items-center justify-between mb-3">

                          <div className="flex items-center space-x-3">

                            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">

                              {qa.name.split(' ').map((n: string) => n.charAt(0)).join('')}

                            </div>

                            <div>

                              <div className="font-medium text-gray-900">

                                {qa.name}

                              </div>

                              <div className="text-xs text-gray-500">QA Engineer</div>

                            </div>

                          </div>

                          <div className="text-right">

                            <div className="text-lg font-bold text-blue-600">

                              {allocatedTestCases}

                            </div>

                            <div className="text-xs text-gray-500">test cases</div>

                          </div>

                        </div>

                        {allocatedTestCases > 0 && (
                          <div className="space-y-2">
                            <div className="text-xs font-medium text-gray-600 mb-2 flex items-center">
                              <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
                              Assigned Test Cases:
                            </div>
                            
                            {/* Show detailed test case information if available */}
                            {qaEngineerTestCasesLoading ? (
                              <div className="text-center py-2">
                                <div className="text-xs text-gray-500">Loading test case details...</div>
                              </div>
                            ) : qaEngineerTestCasesError ? (
                              <div className="text-center py-2">
                                <div className="text-xs text-red-500 mb-1">Error: {qaEngineerTestCasesError}</div>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={fetchQaEngineerTestCases}
                                  className="text-xs"
                                >
                                  Retry
                                </Button>
                              </div>
                            ) : qaEngineerTestCases && qaEngineerTestCases.length > 0 ? (
                              <div className="space-y-2">
                                {(() => {
                                  // Filter test cases by QA engineer name (case-insensitive)
                                  const filteredTestCases = qaEngineerTestCases.filter((testCase: any) => {
                                    const qaName = qa.name.toLowerCase();
                                    const assignedTo = testCase.assignedTo?.toLowerCase();
                                    
                                    // Try to match by first name or full name
                                    const qaFirstName = qaName.split(' ')[0];
                                    const qaLastName = qaName.split(' ')[1];
                                    
                                    return assignedTo && (
                                      assignedTo.includes(qaFirstName) || 
                                      (qaLastName && assignedTo.includes(qaLastName)) ||
                                      assignedTo.includes(qaName.replace(/\s+/g, ''))
                                    );
                                  });
                                  
                                  // If no test cases found in detailed data, show test case IDs from allocation summary
                                  if (filteredTestCases.length === 0 && qa.testCaseIds && qa.testCaseIds.length > 0) {
                                    return qa.testCaseIds.map((testCaseId: string) => (
                                      <div key={testCaseId} className="bg-white p-2 rounded border text-xs">
                                        <div className="flex items-center justify-between">
                                          <div className="font-medium text-blue-600">
                                            {testCaseId}
                                          </div>
                                          <div className="text-gray-500">
                                            Test Case ID
                                          </div>
                                        </div>
                                        <div className="text-gray-600 mt-1">
                                          (Details not available)
                                        </div>
                                      </div>
                                    ));
                                  }
                                  
                                  // Show filtered test cases with details
                                  return filteredTestCases.map((testCase: any) => (
                                    <div key={testCase.id} className="bg-white p-2 rounded border text-xs">
                                      <div className="flex items-center justify-between">
                                        <div className="font-medium text-blue-600">
                                          {testCase.testCaseId}
                                        </div>
                                        <div className="text-gray-500">
                                          {testCase.type} • {testCase.severity}
                                        </div>
                                      </div>
                                      <div className="text-gray-600 mt-1">
                                        {testCase.description}
                                      </div>
                                    </div>
                                  ));
                                })()}
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {qa.testCaseIds && qa.testCaseIds.length > 0 ? (
                                  qa.testCaseIds.map((testCaseId: string) => (
                                    <div key={testCaseId} className="bg-white p-2 rounded border text-xs">
                                      <div className="flex items-center justify-between">
                                        <div className="font-medium text-blue-600">
                                          {testCaseId}
                                        </div>
                                        <div className="text-gray-500">
                                          Test Case ID
                                        </div>
                                      </div>
                                      <div className="text-gray-600 mt-1">
                                        (Details not available)
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="text-center py-2">
                                    <div className="text-xs text-gray-500">
                                      {allocatedTestCases} test case{allocatedTestCases !== 1 ? 's' : ''} allocated
                                    </div>
                                    <div className="text-xs text-gray-400 mt-1">
                                      (Test case details not available)
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                      </div>

                    );

                  })}

                </div>

              ) : qaAllocationSummary && qaAllocationSummary.qaEngineers && qaAllocationSummary.qaEngineers.length === 0 ? (

                <div className="text-center py-8">

                  <div className="text-sm text-gray-500 mb-2">No QA engineers found in the allocation summary.</div>

                  <div className="text-xs text-gray-400">The summary shows 0 QA engineers allocated.</div>

                </div>

              ) : (

                <div className="text-center py-8">

                  <div className="text-sm text-gray-500 mb-2">No QA members found for this project.</div>

                  <div className="text-xs text-gray-400">Please contact your administrator to assign QA members to this project.</div>

                </div>

              )}

            </div>



            <div className="flex justify-end pt-4">

              <Button

                variant="secondary"

                onClick={() => setIsSummaryModalOpen(false)}

              >

                Close

              </Button>

            </div>

          </div>

        </Modal>

      </div>

    );

  };



  // useEffect(() => {

  //   if (activeTab === "release" && selectedReleaseIds.length === 1) {

  //     setLoadingRelease(true);

  //     setReleaseError(null);

  //     axios

  //       .get(`${BASE_URL}releases/releaseId/${selectedReleaseIds[0]}`)

  //       .then((res) => setApiRelease(res.data))

  //       .catch((err) => setReleaseError(err.message))

  //       .finally(() => setLoadingRelease(false));

  //   } else {

  //     setApiRelease(null);

  //   }

  // }, [activeTab, selectedReleaseIds]);



  // Save mock test cases and mock QA to localStorage on mount (for cross-page use)

  // useEffect(() => {

  //   // No mock test case storage

  // }, []);



  // Save allocations to localStorage whenever they change

  useEffect(() => {

    localStorage.setItem('qaAllocatedTestCases', JSON.stringify(qaAllocatedTestCases));

  }, [qaAllocatedTestCases]);



  // Save QA allocations to localStorage whenever they change

  useEffect(() => {

    localStorage.setItem('qaAllocations', JSON.stringify(qaAllocations));

  }, [qaAllocations]);



  // Fetch allocated test cases when QA tab is active and required parameters are available

  useEffect(() => {

    if (activeTab === "qa" && selectedReleaseForQA && selectedProjectId && selectedModule && selectedSubmodule) {

      const moduleId = Number(effectiveModules.find((m: any) => m.name === selectedModule)?.id);

      const subModuleId = Number(selectedSubmodule);

      const projectId = Number(selectedProjectId);



      if (moduleId && subModuleId && projectId) {

        console.log("Module/Submodule selection changed, fetching test cases with filters:", {
          projectId,

          releaseId: selectedReleaseForQA,

          moduleId,

          subModuleId

        });

        
        // Use the new function to fetch test cases by module, submodule, and release
        fetchTestCasesByModuleSubmoduleRelease(
          projectId,
          Number(selectedReleaseForQA),
          moduleId,
          subModuleId
        );
      }

    }

  }, [activeTab, selectedReleaseForQA, selectedProjectId, selectedModule, selectedSubmodule, effectiveModules]);



  // Add useEffect to enforce selection restrictions

  useEffect(() => {

    if (allocationMode === "one-to-one" || allocationMode === "bulk") {

      if (selectedTestCases.length > 1) {

        setSelectedTestCases([selectedTestCases[0]]);

      }

      if (selectedReleaseIds.length > 1) {

        setSelectedReleaseIds([selectedReleaseIds[0]]);

      }

    }

    // Do not restrict for other modes

    // Only run when allocationMode changes

    // eslint-disable-next-line react-hooks/exhaustive-deps

  }, [allocationMode]);

  // Auto refresh UI when allocation mode changes
  useEffect(() => {
    // Clear test case selections to avoid stale selection under new mode
    setSelectedTestCases([]);
    // Increment key to remount release tab content and re-run effects
    setModeRefreshKey((k) => k + 1);
  }, [allocationMode]);


  // Reset bulk selections when leaving Bulk/M2M modes or switching tabs
  useEffect(() => {
    const isBulkLikeMode = allocationMode === "bulk" || allocationMode === "many-to-many";
    const isReleaseTab = activeTab === "release";

    if (!isBulkLikeMode || !isReleaseTab) {
      if (bulkModuleSelect || bulkSubmoduleSelect || selectedModules.length > 0 || selectedSubmodules.length > 0) {
        setBulkModuleSelect(false);
        setBulkSubmoduleSelect(false);
        setSelectedModules([]);
        setSelectedSubmodules([]);
        setBulkSubmodules([]);
      }
    }
  }, [allocationMode, activeTab]);


  // Auto-fetch test cases when release is selected for QA and module/submodule are already selected
  useEffect(() => {
    if (activeTab === "qa" && selectedReleaseForQA && selectedProjectId && selectedModule && selectedSubmodule) {
      const moduleId = Number(effectiveModules.find((m: any) => m.name === selectedModule)?.id);
      const subModuleId = Number(selectedSubmodule);
      const projectId = Number(selectedProjectId);

      if (moduleId && subModuleId && projectId) {
        console.log("Auto-fetching test cases for selected release:", {
          projectId,
          releaseId: selectedReleaseForQA,
          moduleId,
          subModuleId
        });
        
        fetchTestCasesByModuleSubmoduleRelease(
          projectId,
          Number(selectedReleaseForQA),
          moduleId,
          subModuleId
        );
      }
    }
  }, [selectedReleaseForQA, selectedProjectId, selectedModule, selectedSubmodule, effectiveModules]);

  // Clear test cases when module or submodule changes
  useEffect(() => {
    if (activeTab === "qa") {
      console.log("Module or submodule changed, clearing test cases");
      setQaAllocatedTestCasesData([]);
      setQaTestCasesError(null);
      // Also clear selected test cases for QA allocation
      if (selectedReleaseForQA) {
        setSelectedTestCasesForQA(prev => ({
          ...prev,
          [selectedReleaseForQA]: []
        }));
      }
    }
  }, [selectedModule, selectedSubmodule, activeTab, selectedReleaseForQA]);


  // Add a useEffect to fetch test cases for all submodules when a module is selected and no submodule is selected

  useEffect(() => {

    if (selectedProjectId && selectedModule && !selectedSubmodule) {
      console.log("useEffect triggered for module selection:", {
        selectedProjectId,
        selectedModule,
        selectedSubmodule,
        effectiveModulesLength: effectiveModules.length,
        effectiveModules: effectiveModules
      });

      // Find the module object

      const moduleObj = effectiveModules.find((m: any) => m.name === selectedModule);
      console.log("Found module object:", moduleObj);

      if (moduleObj && moduleObj.id) {

        // Use the new API function to fetch test cases by module

        console.log("Calling fetchTestCasesByModule from useEffect:", { projectId: selectedProjectId, moduleId: moduleObj.id });
        fetchTestCasesByModule(selectedProjectId, String(moduleObj.id));

      } else {
        console.warn("Module object not found or missing ID:", { moduleObj, selectedModule, effectiveModules });
      }

    }

  }, [selectedProjectId, selectedModule, effectiveModules, severities, defectTypes]);



  // The existing useEffect for selectedSubmodule remains, so when a submodule is selected, only its test cases are fetched.

  useEffect(() => {

    if (!selectedProjectId || !selectedSubmodule) return;

    // Use the new API function for better error handling and consistency

    fetchTestCasesBySubmodule(selectedProjectId, selectedSubmodule);

  }, [selectedProjectId, selectedSubmodule, effectiveModules, severities, defectTypes]);



  return (

    <div className="max-w-5xl mx-auto py-8">

      {/* Back Button at the top right */}

      <div className="mb-4 flex justify-end">

        <Button

          variant="secondary"

          onClick={() => navigate(`/projects/${projectId}/releases`)}

          className="flex items-center"

        >

          <ChevronLeft className="w-5 h-5 mr-2" /> Back

        </Button>

      </div>

      {ProjectSelectionPanel()}



      {/* Show releases at the top when project is selected (only for Release Allocation tab) */}

      {selectedProject && activeTab === "release" && (

        <div className="mb-6">

          <Card>

            <CardContent className="p-4">

              <h2 className="text-lg font-semibold text-gray-900 mb-4">

                Available Releases

              </h2>

              {loadingReleases ? (

                <div className="text-center py-8">

                  <div className="text-sm text-gray-500">Loading releases...</div>

                </div>

              ) : effectiveProjectRelease.length > 0 ? (

                <>

                  <ReleaseCardsPanel />

                  {/* Allocate button appears if at least one release is selected */}

                  {selectedReleaseIds.length > 0 && (

                    <div className="mt-6 flex flex-col space-y-3">

                      {/* Allocation Mode Selection */}

                      <div className="flex items-center space-x-4">

                        <span className="text-sm font-medium text-gray-700">Allocation Mode:</span>

                        <div className="flex space-x-2">

                          <Button

                            size="sm"

                            variant={allocationMode === "one-to-one" ? "primary" : "secondary"}

                            onClick={() => setAllocationMode("one-to-one")}

                            disabled={allocationLoading}

                          >

                            One-to-One

                          </Button>

                          <Button

                            size="sm"

                            variant={allocationMode === "one-to-many" ? "primary" : "secondary"}

                            onClick={() => setAllocationMode("one-to-many")}

                            disabled={allocationLoading}

                          >

                            One-to-Many

                          </Button>

                          <Button

                            size="sm"

                            variant={allocationMode === "bulk" ? "primary" : "secondary"}

                            onClick={() => setAllocationMode("bulk")}

                            disabled={allocationLoading}

                          >

                            Bulk

                          </Button>

                          <Button

                            size="sm"

                            variant={allocationMode === "many-to-many" ? "primary" : "secondary"}

                            onClick={() => setAllocationMode("many-to-many")}

                            disabled={allocationLoading}

                          >

                            Many-to-Many

                          </Button>

                        </div>

                      </div>



                      



                      {/* Allocate Button */}

                      <div className="flex justify-end">

                        <Button

                          variant="primary"

                          disabled={selectedTestCases.length === 0 || allocationLoading}

                          onClick={handleAllocate}

                        >

                          {allocationLoading ? "Allocating..." :

                            allocationMode === "bulk"

                              ? `Allocate Test Cases to Single Release (Bulk)`

                              : `Allocate Selected Releases (${allocationMode === "one-to-many" ? "One-to-Many" : allocationMode === "one-to-one" ? "One-to-One" : allocationMode === "many-to-many" ? "Many-to-Many" : "Bulk"})`}

                        </Button>

                      </div>

                    </div>

                  )}

                </>

              ) : (

                <div className="text-center py-8">

                  <div className="text-sm text-gray-500">No releases found for this project.</div>

                </div>

              )}

            </CardContent>

          </Card>

        </div>

      )}



      {/* Success and Error Messages */}

      {allocationSuccess && (

        <div className="mb-4">

          <Card className="border-green-200 bg-green-50">

            <CardContent className="p-4">

              <div className="flex items-center text-green-800">

                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">

                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />

                </svg>

                <span className="font-medium">{allocationSuccess}</span>

              </div>

            </CardContent>

          </Card>

        </div>

      )}



      {allocationError && (

        <div className="mb-4">

          <Card className="border-red-200 bg-red-50">

            <CardContent className="p-4">

              <div className="flex items-center text-red-800">

                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">

                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />

                </svg>

                <span className="font-medium">{allocationError}</span>

              </div>

            </CardContent>

          </Card>

        </div>

      )}



      {/* Allocation Progress */}

      {allocationProgress && (

        <div className="mb-4">

          <Card className="border-blue-200 bg-blue-50">

            <CardContent className="p-4">

              <div className="flex items-center text-blue-800 mb-2">

                <svg className="w-5 h-5 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />

                </svg>

                <span className="font-medium">Allocating test cases to releases...</span>

              </div>

              <div className="w-full bg-blue-200 rounded-full h-2">

                <div

                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"

                  style={{ width: `${(allocationProgress.current / allocationProgress.total) * 100}%` }}

                ></div>

              </div>

              <div className="text-sm text-blue-600 mt-1">

                {allocationProgress.current} of {allocationProgress.total} {allocationMode === "bulk" ? "bulk allocations" : allocationMode === "one-to-many" ? "test cases" : "allocations"} completed

              </div>

            </CardContent>

          </Card>

        </div>

      )}



      {/* Show release details if a single release is selected */}

      {activeTab === "release" && selectedReleaseIds.length === 1 && (

        <div className="mb-4">

          {loadingRelease && (

            <div className="p-4 text-center text-blue-600">

              Loading release details...

            </div>

          )}

          {releaseError && (

            <div className="p-4 text-center text-red-600">{releaseError}</div>

          )}

          {apiRelease && (

            <Card className="mb-4">

              <CardContent>

                <div className="font-bold text-lg mb-1">{apiRelease.name}</div>

                <div className="mb-1">Version: {apiRelease.version}</div>

                <div className="mb-1">Description: {apiRelease.description}</div>

                <div className="mb-1">

                  Release Date:{" "}

                  {apiRelease.releaseDate

                    ? new Date(apiRelease.releaseDate).toLocaleDateString()

                    : "TBD"}

                </div>

                <div className="mb-1">Type: {apiRelease.releaseType}</div>

                {/* Add more fields as needed */}

              </CardContent>

            </Card>

          )}

        </div>

      )}

      {/* Tabs */}

      <div className="flex space-x-4 mb-6 border-b border-gray-200">

        {TABS.map((tab) => (

          <button

            key={tab.key}

            className={`px-4 py-2 font-medium border-b-2 transition-colors duration-200 ${activeTab === tab.key

              ? "border-blue-500 text-blue-700"

              : "border-transparent text-gray-500 hover:text-blue-700"

              }`}

            onClick={() => setActiveTab(tab.key as "release" | "qa")}

          >

            {tab.label}

          </button>

        ))}

      </div>

      {/* Tab Content */}

      {activeTab === "release" ? (

        <>

          {ModuleSelectionPanel()}

          {/* Status indicator for module selection */}
          {/* {selectedModule && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-sm text-blue-900">
                {loadingModuleTestCases ? (
                  <span>🔄 Loading test cases for module: <strong>{selectedModule}</strong></span>
                ) : (
                  <span>✅ Module selected: <strong>{selectedModule}</strong></span>
                )}
              </div>
              {loadingModuleTestCases && (
                <div className="text-xs text-blue-600 mt-1">
                  Fetching test cases from backend API...
                </div>
              )}
            </div>
          )} */}

          {(selectedModule || (bulkModuleSelect && selectedModules.length > 0)) && <SubmoduleSelectionPanel />}

          {/* Status indicator for bulk module selection */}
          {bulkModuleSelect && selectedModules.length > 0 && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-sm text-blue-900">
                {loadingModuleTestCases ? (
                  <span>🔄 Loading test cases for {selectedModules.length} selected module(s)...</span>
                ) : (
                  <span>✅ Bulk modules selected: <strong>{selectedModules.length} module(s)</strong></span>
                )}
              </div>
              {loadingModuleTestCases && (
                <div className="text-xs text-blue-600 mt-1">
                  Fetching test cases from backend API for modules: {selectedModules.join(', ')}
                </div>
              )}
              {!loadingModuleTestCases && allocatedTestCases.length > 0 && (
                <div className="text-xs text-green-600 mt-1">
                  Found {allocatedTestCases.length} test case(s) across selected modules
                </div>
              )}
            </div>
          )}

          {/* Status indicator for bulk submodule selection */}
          {bulkSubmoduleSelect && selectedSubmodules.length > 0 && (
            <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="text-sm text-green-900">
                {loadingSubmoduleTestCases ? (
                  <span>🔄 Loading test cases for {selectedSubmodules.length} selected submodule(s)...</span>
                ) : (
                  <span>✅ Bulk submodules selected: <strong>{selectedSubmodules.length} submodule(s)</strong></span>
                )}
              </div>
              {loadingSubmoduleTestCases && (
                <div className="text-xs text-green-600 mt-1">
                  Fetching test cases from backend API for submodules: {selectedSubmodules.join(', ')}
                </div>
              )}
              {!loadingSubmoduleTestCases && allocatedTestCases.length > 0 && (
                <div className="text-xs text-green-600 mt-1">
                  Found {allocatedTestCases.length} test case(s) across selected submodules
                </div>
              )}
            </div>
          )}

          {/* Status indicator for submodule selection */}
          

          {loadingModuleTestCases || loadingSubmoduleTestCases ? (
            <Card className="mb-4">
              <CardContent className="p-8 text-center">
                <div className="text-gray-500">
                  {loadingModuleTestCases ? "Loading test cases for selected module..." : "Loading test cases for selected submodule..."}
                </div>
                <div className="text-xs text-gray-400 mt-2">
                  {loadingModuleTestCases && selectedModule ? `Module: ${selectedModule}` : ""}
                  {loadingSubmoduleTestCases && selectedSubmodule ? `Submodule: ${selectedSubmodule}` : ""}
                </div>
              </CardContent>
            </Card>
          ) : filteredTestCases.length > 0 ? (
            <TestCaseTable testCases={filteredTestCases} />
          ) : (
            (selectedSubmodule || (bulkSubmoduleSelect && selectedSubmodules.length > 0) || (selectedModule && !selectedSubmodule && !bulkSubmoduleSelect)) && (
              <Card className="mb-4">
                <CardContent className="p-8 text-center">
                  <div className="text-gray-500">
                    {bulkSubmoduleSelect && selectedSubmodules.length > 0 && selectedReleaseIds.length === 0
                      ? "Please select at least one release before using bulk submodule selection."
                      : selectedModule && !selectedSubmodule && !bulkSubmoduleSelect
                      ? "Please select a submodule or use bulk select to choose test cases."
                      : "No test cases found for the selected submodule(s)."}
                  </div>
                </CardContent>
              </Card>
            )
          )}

        </>

      ) : (

        <>

          <QASelectionPanel />

          {qaMembers.length > 0 ? (

            <>

              {ModuleSelectionPanel()}

          {/* Status indicator for module selection */}
          {/* {selectedModule && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-sm text-blue-900">
                {loadingModuleTestCases ? (
                  <span>🔄 Loading test cases for module: <strong>{selectedModule}</strong></span>
                ) : (
                  <span>✅ Module selected: <strong>{selectedModule}</strong></span>
                )}
              </div>
              {loadingModuleTestCases && (
                <div className="text-xs text-blue-600 mt-1">
                  Fetching test cases from backend API...
                </div>
              )}
            </div>
          )} */}

              {selectedModule && <SubmoduleSelectionPanel />}

          {/* Status indicator for submodule selection */}
          {/* {selectedSubmodule && (
            <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="text-sm text-green-900">
                {loadingSubmoduleTestCases ? (
                  <span>🔄 Loading test cases for submodule: <strong>{selectedSubmodule}</strong></span>
                ) : (
                  <span>✅ Submodule selected: <strong>{selectedSubmodule}</strong></span>
                )}
              </div>
              {loadingSubmoduleTestCases && (
                <div className="text-xs text-green-600 mt-1">
                  Fetching test cases from backend API...
                </div>
              )}
            </div>
          )} */}

              {loadingQATestCases ? (

                <Card className="mb-4">

                  <CardContent className="p-8 text-center">

                    <div className="text-gray-500">Loading allocated test cases...</div>

                  </CardContent>

                </Card>

              ) : qaTestCasesError ? (

                <Card className="mb-4">

                  <CardContent className="p-8 text-center">

                    <div className="text-red-500">

                      Error: {qaTestCasesError}

                    </div>

                  </CardContent>

                </Card>

              ) : filteredTestCases.length > 0 || qaAllocatedTestCasesData.length > 0 ? (

                <TestCaseTable testCases={filteredTestCases} />

              ) : (

                (selectedSubmodule || (selectedModule && !selectedSubmodule)) && (

                  <Card className="mb-4">

                    <CardContent className="p-8 text-center">

                      <div className="text-gray-500">

                        {selectedModule && !selectedSubmodule

                          ? "Please select a submodule to view test cases."

                          : selectedReleaseForQA && selectedModule && selectedSubmodule

                          ? qaTestCasesError 
                            ? `Error: ${qaTestCasesError}`
                            : "No test cases found for the selected release, module, and submodule combination. Please check if test cases are allocated to this release for the selected module and submodule."
                          : "No test cases found for the selected submodule."}

                      </div>

                      {selectedReleaseForQA && selectedModule && selectedSubmodule && !qaTestCasesError && (
                        <div className="mt-2 text-xs text-gray-400">
                          Filters: Release ID {selectedReleaseForQA}, Module: {selectedModule}, Submodule: {selectedSubmodule}
                        </div>
                      )}
                    </CardContent>

                  </Card>

                )

              )}

            </>

          ) : (

            <Card className="mb-4">

              <CardContent className="p-8 text-center">

                <div className="text-gray-500">

                  {qaMembersLoading 

                    ? "Loading QA members..." 

                    : qaMembersError 

                      ? `Error: ${qaMembersError}` 

                      : "No QA members found for this project. Please contact your administrator to assign QA members before proceeding with QA allocation."}

                </div>

              </CardContent>

            </Card>

          )}

        </>

      )}

      {/* View Steps Modal */}

      <Modal

        isOpen={isViewStepsModalOpen}

        onClose={() => {

          setIsViewStepsModalOpen(false);

          setViewingTestCase(null);

        }}

        title={`Test Steps - ${formatTestCaseId(viewingTestCase?.id)}`}

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

                {(() => {

                  const severityStyles = getSeverityColor(viewingTestCase.severity);

                  return (

                    <span

                      className={`mt-1 inline-flex ${severityStyles.className}`}

                      style={severityStyles.style}

                    >

                      {viewingTestCase.severity}

                    </span>

                  );

                })()}

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

      <AlertModal

        isOpen={alert.isOpen}

        message={alert.message}

        onClose={closeAlert}

      />

      {bulkSubmoduleWarning && (

        <div className="mb-2 text-red-600 text-sm text-center">{bulkSubmoduleWarning}</div>

      )}

    </div>

  );

};

