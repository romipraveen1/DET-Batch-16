import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  Eye,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { Card, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { Badge } from "../components/ui/Badge";
import AlertModal from "../components/ui/AlertModal";
import { useParams, useNavigate } from "react-router-dom";

import * as XLSX from "xlsx";
import { TestCase as TestCaseType } from "../types/index";
import { ProjectSelector } from "../components/ui/ProjectSelector";
import ModuleSelector from "../components/ui/ModuleSelector";
import { Project } from "../types";
import { getAllProjects } from "../api/projectget";
import { getTestCasesByProjectAndSubmodule, getTestCasesByProjectAndModule } from "../api/testCase/testCaseApi";
import { getSeverities } from "../api/severity";
import { getDefectTypes } from "../api/defectType";
import { searchTestCases } from "../api/testCase/searchTestCase";
import { updateTestCase } from "../api/testCase/updateTestCase";
import { getModulesByProjectId } from "../api/module/getModule";
import { getSubmodulesByModuleId, Submodule } from "../api/submodule/submoduleget";
import { createTestCase } from "../api/testCase/createTestcase";
import axios from "axios";
const BASE_URL = import.meta.env.VITE_BASE_URL;

// import { updateReleaseStatus } from "../api/releaseView/updateReleaseStatus";
import { Toast } from "../components/ui/Toast";
import QuickAddTestCase from "./QuickAddTestCase";
import { useApp } from "../context/AppContext";
import { getTestCasesByProjectAndModuleExternal } from "../api/testCase/testCaseApi";
import apiClient from "../lib/api";
import { importTestCases, ImportTestCaseResponse } from "../api/importTestCase";


// --- MOCK DATA for projects/modules/submodules ---
// const mockProjects = [
//   { id: "PROJ001", name: "Project Alpha" },
//   { id: "PROJ002", name: "Project Beta" },
// ];
// --- MOCK DATA for modules/submodules by projectId (numeric IDs matching DB) ---
// const mockModulesByProject: Record<string, { id: string, name: string, submodules: { id: string, name: string }[] }[]> = {
//   "1": [ ... ]
// };

export const TestCase: React.FC = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { setSelectedProjectId: setGlobalProjectId } = useApp();
  // --- State for projects/modules/submodules (real backend) ---
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(String(projectId ?? ''));
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [selectedSubmoduleId, setSelectedSubmoduleId] = useState<string | null>(null);
  const [testCases, setTestCases] = useState<TestCaseType[]>([]);

  // Add state for modules by project
  const [modulesByProject, setModulesByProject] = useState<Record<string, { id: string, name: string, submodules: { id: string, name: string }[] }[]>>({});

  // Fetch real projects from backend on mount
  useEffect(() => {
    getAllProjects().then(res => setProjects(res));
  }, []);

  // Reset module and submodule when project changes
  useEffect(() => {
    setSelectedModuleId(null);
    setSelectedSubmoduleId(null);
  }, [selectedProjectId]);

  // Fetch static data only once on mount
  useEffect(() => {
    getSeverities().then(res => setSeverities(res.data));
    getDefectTypes().then(res => setDefectTypes(res.data));
  }, []);

  // Fetch modules when selectedProjectId changes
  useEffect(() => {
    if (!selectedProjectId) return;
    getModulesByProjectId(selectedProjectId).then((res) => {
      console.log("Fetched modules for project", selectedProjectId, res.data);

      const modules = (res.data || []).map((mod: any) => ({
        id: String(mod.id),
        name: mod.moduleName || mod.name,
        submodules: (mod.submodules || []).map((sm: any) => ({
          id: String(sm.id),
          name: sm.getSubModuleName || sm.name,
        })),
      }));
      setModulesByProject((prev) => ({ ...prev, [selectedProjectId]: modules }));
    });
  }, [selectedProjectId]);
  console.log("modulesByProject", modulesByProject);


  // Use fetched modules for the selected project
  const projectModules = selectedProjectId ? modulesByProject[selectedProjectId] || [] : [];

  // ... keep other UI state as before ...
  // const [isModalOpen, setIsModalOpen] = useState(false); // Unused
  const [isViewStepsModalOpen, setIsViewStepsModalOpen] = useState(false);
  const [isViewTestCaseModalOpen, setIsViewTestCaseModalOpen] = useState(false);
  // const [selectedTestCases, setSelectedTestCases] = useState<string[]>([]); // Removed
  const [viewingTestCase, setViewingTestCase] = useState<TestCaseType | null>(null);
  // const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set()); // Unused
  const [isDescriptionModalOpen, setIsDescriptionModalOpen] = useState(false);
  const [selectedDescription, setSelectedDescription] = useState("");
  const [selectedModules] = useState<string[]>([]); // setSelectedModules unused
  const [selectedSubmodules] = useState<string[]>([]); // setSelectedSubmodules unused
  // const [filterText, setFilterText] = useState(""); // Unused
  // const [filterType, setFilterType] = useState(""); // Unused
  // const [filterSeverity, setFilterSeverity] = useState(""); // Unused

  // --- Multi-modal state for bulk add like QuickAddTestCase ---
  // Extend ModalFormData to include moduleId and subModuleId
  interface ModalFormData {
    module: string;
    subModule: string;
    description: string;
    steps: string;
    type: string;
    severity: string;
    projectId: string | undefined;
    id?: string;
    moduleId?: string | number;
    subModuleId?: string | number;
  }
  const [modals, setModals] = useState<{
    open: boolean;
    formData: ModalFormData;
  }[]>([
    {
      open: false,
      formData: {
        module: "",
        subModule: "",
        description: "",
        steps: "",
        type: "functional",
        severity: "", // changed from "medium"
        projectId: projectId,
      },
    },
  ]);
  console.log("modals", modals);

  const [currentModalIdx, setCurrentModalIdx] = useState(0);
  const [success, setSuccess] = useState(false);
  const [backendProjects, setBackendProjects] = React.useState<Project[]>([]);

  // 1. Add state to track if modal is in edit mode
  const isEditMode = modals[currentModalIdx]?.formData?.id !== undefined && modals[currentModalIdx]?.formData?.id !== '';

  // Add after state declarations
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Add state for submodules
  const [submodules, setSubmodules] = useState<Submodule[]>([]);
  const [submoduleError, setSubmoduleError] = useState<string>("");
  console.log({ submodules });

  // Fetch submodules when selectedModuleId changes
  useEffect(() => {
    if (!selectedModuleId) {
      setSubmodules([]);
      setSubmoduleError("");
      return;
    }
    getSubmodulesByModuleId(Number(selectedModuleId))
      .then((res) => {
        setSubmodules(res.data || []);
        setSubmoduleError("");
      })
      .catch((err) => {
        if (err?.response?.status === 404) {
          setSubmodules([]);
          setSubmoduleError("No submodules found for this module.");
        } else {
          setSubmodules([]);
          setSubmoduleError("Failed to fetch submodules. Please try again.");
        }
      });
  }, [selectedModuleId]);
  console.log("submodule", submodules);
  // Add state for severities and defect types
  const [severities, setSeverities] = useState<{ id: number; name: string; color: string }[]>([]);
  const [defectTypes, setDefectTypes] = useState<{ id: number; defectTypeName: string }[]>([]);

  // Add toast state for notifications
  const [toast, setToast] = useState<{
    isOpen: boolean;
    message: string;
    type: 'success' | 'error';
  }>({
    isOpen: false,
    message: '',
    type: 'success'
  });

  // Alert states for test case operations
  const [createAlert, setCreateAlert] = useState({ isOpen: false, message: '' });
  const [updateAlert, setUpdateAlert] = useState({ isOpen: false, message: '' });
  const [deleteAlert, setDeleteAlert] = useState({ isOpen: false, message: '' });
  // Pending success flags
  const [pendingCreateSuccess, setPendingCreateSuccess] = useState(false);
  const [pendingUpdateSuccess, setPendingUpdateSuccess] = useState(false);
  const [pendingDeleteSuccess, setPendingDeleteSuccess] = useState(false);

  // Fetch test cases when projectId and submoduleId are selected
  useEffect(() => {
    if (!selectedProjectId || selectedSubmoduleId === null) return;

    // Only fetch by submodule if a submodule is actually selected (not just reset to null)
    if (selectedSubmoduleId && selectedSubmoduleId !== null) {
      getTestCasesByProjectAndSubmodule(selectedProjectId, String(selectedSubmoduleId)).then((data) => {
        // Map moduleId/subModuleId to names for display
        console.log("Fetched test cases for project", selectedProjectId, "and submodule", selectedSubmoduleId, data);

        const moduleMap = Object.fromEntries(projectModules.map((m: any) => [m.id, m.name]));
        console.log("moduleMap", moduleMap);

        const submoduleMap = Object.fromEntries(projectModules.flatMap((m: any) => m.submodules.map((sm: any) => [sm.id, sm.name])));
        console.log("submoduleMap", submoduleMap);
        setTestCases(
          (data as any[]).map((tc: any) => ({
            ...tc,
            moduleId: tc.moduleId, // always keep the ID
            module: moduleMap[tc.moduleId] || tc.moduleName || tc.module, // display name
            subModuleId: tc.subModuleId, // always keep the ID
            subModule: submoduleMap[tc.subModuleId] || tc.subModuleName || tc.subModule, // display name
            severity: (severities && severities.find(s => s.id === tc.severityId)?.name || "") as TestCaseType['severity'],
            type: (defectTypes && defectTypes.find(dt => dt.id === tc.defectTypeId)?.defectTypeName || "") as TestCaseType['type'],
          })) as TestCaseType[]
        );
      });
    }
  }, [selectedProjectId, selectedSubmoduleId, severities, defectTypes, projectModules]);

  // Add after state declarations
  const [allSubmoduleTestCases, setAllSubmoduleTestCases] = useState<{ [submoduleId: string]: TestCaseType[] }>({});

  // Extract fetchAllSubmoduleTestCases as a callback
  const fetchAllSubmoduleTestCases = React.useCallback(() => {
    if (!selectedProjectId || !selectedModuleId) return;
    const moduleObj = projectModules.find((m) => m.id === selectedModuleId);
    if (moduleObj && Array.isArray(moduleObj.submodules)) {
      Promise.all(
        moduleObj.submodules.map((sm) =>
          getTestCasesByProjectAndSubmodule(selectedProjectId, String(sm.id))
            .then((data) => ({ submoduleId: String(sm.id), testCases: data }))
        )
      ).then((results) => {
        const testCaseMap: { [submoduleId: string]: TestCaseType[] } = {};
        const moduleMap = Object.fromEntries(projectModules.map((m: any) => [m.id, m.name]));
        const submoduleMap = Object.fromEntries(projectModules.flatMap((m: any) => m.submodules.map((sm: any) => [sm.id, sm.name])));
        
        results.forEach(({ submoduleId, testCases }) => {
          testCaseMap[submoduleId] = (testCases as any[]).map((tc: any) => ({
            ...tc,
            moduleId: tc.moduleId, // always keep the ID
            module: moduleMap[tc.moduleId] || tc.moduleName || tc.module, // display name
            subModuleId: tc.subModuleId, // always keep the ID
            subModule: submoduleMap[tc.subModuleId] || tc.subModuleName || tc.subModule, // display name
            severity: (severities && severities.find(s => s.id === tc.severityId)?.name || "") as TestCaseType['severity'],
            type: (defectTypes && defectTypes.find(dt => dt.id === tc.defectTypeId)?.defectTypeName || "") as TestCaseType['type'],
          })) as TestCaseType[];
        });
        setAllSubmoduleTestCases(testCaseMap);
      });
    }
  }, [selectedProjectId, selectedModuleId, projectModules, severities, defectTypes]);

  // Replace the useEffect for allSubmoduleTestCases with a call to this function
  useEffect(() => {
    fetchAllSubmoduleTestCases();
  }, [fetchAllSubmoduleTestCases]);

  // If no selectedProjectId, show a message or redirect
  if (!selectedProjectId) {
    return (
      <div className="p-8 text-center text-gray-500">
        Please select a project to view its test cases.
      </div>
    );
  }

  // Compute selected test case IDs based on selected modules/submodules
  const selectedTestCaseIds = useMemo(() => {
    let ids: string[] = [];
    if (selectedModules.length > 0) {
      ids = [
        ...new Set(
          testCases
            .filter(
              (tc) =>
                tc.projectId === String(selectedProjectId) &&
                selectedModules.includes(tc.module ?? "")
            )
            .map((tc) => tc.id)
        ),
      ];
    }
    if (selectedSubmodules.length > 0) {
      ids = [
        ...ids,
        ...new Set(
          testCases
            .filter(
              (tc) =>
                tc.projectId === String(selectedProjectId) &&
                selectedSubmodules.includes(tc.subModule ?? "")
            )
            .map((tc) => tc.id)
        ),
      ];
    }
    return Array.from(new Set(ids));
  }, [selectedModules, selectedSubmodules, testCases, selectedProjectId]);

  // Compute filtered test cases for the table (show all for module)
  const filteredTestCases = testCases;

  // Handle project selection
  // const handleProjectSelect = (projectId: string) => {
  //   setSelectedProjectId(projectId);
  //   navigate(`/projects/${projectId}/test-cases`);
  // };

  // Handle module selection
  // const handleModuleSelect = (moduleId: string) => {
  //   setSelectedModuleId(Number(moduleId));
  //   setSelectedSubmoduleId(null);
  //   setSelectedTestCases([]);
  //   fetch(`${BASE_URL}testcase/module/${moduleId}`)
  //     .then((res) => res.json())
  //     .then((data) => {
  //       const mapped = (data.data || []).map((tc: any) => ({
  //         id: tc.testCaseId || tc.id,
  //         description: tc.description,
  //         steps: tc.steps,
  //         subModule: tc.subModuleId || tc.subModule,
  //         module: tc.moduleId || tc.module,
  //         projectId: tc.projectId,
  //         severity: tc.severityName || tc.severityId || tc.severity,
  //         type: tc.typeId || tc.type,
  //       }));
  //       setTestCases(mapped);
  //     });
  // };

  // When selection changes, update selectedTestCases for bulk actions
  // useEffect(() => {
  //   if (selectedModules.length > 0 || selectedSubmodules.length > 0) {
  //     setSelectedTestCases(selectedTestCaseIds);
  //   }
  // }, [selectedTestCaseIds, selectedModules, selectedSubmodules]); // Removed

  const handleInputChange = (idx: number, field: string, value: string) => {
    setModals((prev) =>
      prev.map((modal, i) =>
        i === idx
          ? { ...modal, formData: { ...modal.formData, [field]: value } }
          : modal
      )
    );
  };

  const handleAddAnother = () => {
    setModals((prev) => [
      ...prev,
      {
        open: true,
        formData: {
          module: "",
          subModule: "",
          description: "",
          steps: "",
          type: "functional",
          severity: "", // changed from "medium"
          projectId: selectedProjectId,
        },
      },
    ]);
    setCurrentModalIdx(modals.length); // go to the new modal
  };

  const handleRemove = (idx: number) => {
    if (modals.length === 1) {
      setModals([{ ...modals[0], open: false }]);
      setCurrentModalIdx(0);
    } else {
      setModals((prev) => prev.filter((_, i) => i !== idx));
      setCurrentModalIdx((prevIdx) => (prevIdx > 0 ? prevIdx - 1 : 0));
    }
  };

  const handleImportExcelButton = () => {
    fileInputRef.current?.click();
  };
  const handleImportExcelInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!selectedProjectId) {
      showAlert("Please select a project before importing test cases.");
      return;
    }
    // Only allow .xlsx or .csv files
    const allowedTypes = ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-excel", "text/csv"];
    if (!allowedTypes.includes(file.type) && !file.name.endsWith(".xlsx") && !file.name.endsWith(".csv")) {
      showAlert("Please select a valid Excel (.xlsx) or CSV (.csv) file.");
      return;
    }
    const formData = new FormData();
    // Try different field names if needed: 'file', 'testcaseFile', 'excel', etc.
    formData.append("file", file); // Change 'file' to match backend if needed
    // for (let pair of formData.entries()) {
    //   console.log('FormData:', pair[0], pair[1]);
    // }
    // importTestCases(formData, selectedProjectId)
    //   .then((response: ImportTestCaseResponse) => {
    //     console.log('Import TestCase Response:', response);
    //     setCreateAlert({ isOpen: true, message: response?.message || "Test cases imported successfully!" });
    //     refreshTestCases && refreshTestCases();
    //     if (fileInputRef.current) fileInputRef.current.value = "";
    //   })
    //   .catch((error: any) => {
    //     console.error('Import TestCase Error:', error);
    //     setCreateAlert({ isOpen: true, message: error?.response?.data?.message || "Failed to import test cases. Please try again." });
    //     if (fileInputRef.current) fileInputRef.current.value = "";
    //   });
    for (let pair of formData.entries()) {
      console.log('FormData:', pair[0], pair[1]);
    }
    importTestCases(formData, selectedProjectId)
      .then((response) => {
        console.log('Import TestCase Response:', response);
        setCreateAlert({ isOpen: true, message: response?.message || "Test cases imported successfully!" });
        refreshTestCases && refreshTestCases();
        if (fileInputRef.current) fileInputRef.current.value = "";
      })
      .catch((error) => {
        console.error('Import TestCase Error:', error);
        setCreateAlert({ isOpen: true, message: error?.response?.data?.message || "Failed to import test cases. Please try again." });
        if (fileInputRef.current) fileInputRef.current.value = "";
      });
  };
  const handleExportExcel = () => {
    const wsData = [
      ["Module", "Sub Module", "Description", "Steps", "Type", "Severity", "Test Case ID"],
      ...filteredTestCases.map(tc => [
        tc.module,
        tc.subModule,
        tc.description,
        tc.steps,
        tc.type,
        tc.severity,
        tc.id
      ])
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "TestCases");
    XLSX.writeFile(wb, `TestCases_${selectedProjectId}_${selectedModuleId}.xlsx`);
  };

  // Only rely on backend validation in handleSubmitAll
  const handleSubmitAll = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // Check if we're in edit mode (single test case update)
    const currentFormData = modals[currentModalIdx]?.formData;
    if (currentFormData?.id) {
      // Handle single test case update
      const moduleIdToUse = currentFormData.moduleId;
      const subModuleIdToUse = currentFormData.subModuleId;
      const payload: any = {
        description: currentFormData.description,
        steps: currentFormData.steps,
        subModuleId: Number(subModuleIdToUse),
        moduleId: Number(moduleIdToUse),
        projectId: Number(currentFormData.projectId),
      };
      const severityId = severities.find(s => s.name === currentFormData.severity)?.id;
      if (typeof severityId === 'number') payload.severityId = severityId;
      const defectTypeId = defectTypes.find(dt => dt.defectTypeName === currentFormData.type)?.id;
      if (typeof defectTypeId === 'number') payload.defectTypeId = defectTypeId;
      
      try {
        const response = await updateTestCase(currentFormData.id, payload);
        if (response?.status === 'Failure' || response?.statusCode === 4000) {
          setUpdateAlert({ isOpen: true, message: response?.message || 'Failed to update test case.' });
          setPendingUpdateSuccess(false);
          return;
        } else {
          setUpdateAlert({ isOpen: true, message: response?.message });
          setPendingUpdateSuccess(true);
          setTimeout(() => {
            setSuccess(false);
            setModals([
              {
                open: false,
                formData: {
                  module: "",
                  subModule: "",
                  description: "",
                  steps: "",
                  type: "functional",
                  severity: "",
                  projectId: selectedProjectId,
                },
              },
            ]);
            setCurrentModalIdx(0);
            setUpdateAlert({ isOpen: false, message: '' });
            if (selectedProjectId && selectedSubmoduleId !== null) {
              getTestCasesByProjectAndSubmodule(selectedProjectId, String(selectedSubmoduleId)).then((data) => {
                const moduleMap = Object.fromEntries(projectModules.map((m: any) => [m.id, m.name]));
                const submoduleMap = Object.fromEntries(projectModules.flatMap((m: any) => m.submodules.map((sm: any) => [sm.id, sm.name])));
                setTestCases(
                  (data as any[]).map((tc: any) => ({
                    ...tc,
                    moduleId: tc.moduleId,
                    module: moduleMap[tc.moduleId] || tc.moduleId,
                    subModuleId: tc.subModuleId,
                    subModule: submoduleMap[tc.subModuleId] || tc.subModuleId,
                    severity: (severities && severities.find(s => s.id === tc.severityId)?.name || "") as TestCaseType['severity'],
                    type: (defectTypes && defectTypes.find(dt => dt.id === tc.defectTypeId)?.defectTypeName || "") as TestCaseType['type'],
                  })) as TestCaseType[]
                );
              });
            }
          }, 1200);
        }
      } catch (error: any) {
        setPendingUpdateSuccess(false);
        const errorMessage = error?.response?.data?.message || error?.message || 'Failed to update test case. Please try again.';
        setUpdateAlert({ isOpen: true, message: errorMessage });
        return;
      }
      return;
    }

    // Handle bulk test case creation
    const validTestCases = [];
    
    // Collect all valid test cases from all modals
    for (let i = 0; i < modals.length; i++) {
      const modal = modals[i];
      const formData = modal.formData;
      
      // Skip if modal is not open or form data is incomplete
      if (!modal.open || !isCurrentModalValid(formData)) {
        continue;
      }
      
      // Find module and submodule IDs
      const moduleObj = projectModules.find((m: any) => m.name === formData.module);
      if (!moduleObj) {
        console.error(`Module not found: ${formData.module}`);
        continue;
      }
      
      const submoduleObj = moduleObj.submodules.find((sm: any) => sm.name === formData.subModule);
      if (!submoduleObj) {
        console.error(`Submodule not found: ${formData.subModule} in module ${formData.module}`);
        continue;
      }
      
      const severityId = severities.find(s => s.name === formData.severity)?.id;
      const defectTypeId = defectTypes.find(dt => dt.defectTypeName === formData.type)?.id;
      
      if (!severityId || !defectTypeId) {
        console.error(`Invalid severity or defect type for test case ${i + 1}`);
        continue;
      }
      
      const testCasePayload = {
        description: formData.description,
        steps: formData.steps,
        subModuleId: Number(submoduleObj.id),
        moduleId: Number(moduleObj.id),
        projectId: Number(formData.projectId),
        severityId: severityId,
        defectTypeId: defectTypeId,
      };
      
      validTestCases.push(testCasePayload);
    }
    
    if (validTestCases.length === 0) {
      setCreateAlert({ isOpen: true, message: 'No valid test cases to create. Please fill in all required fields.' });
      return;
    }
    
    console.log('Bulk test case creation payload:', validTestCases);
    
    try {
      const response = await createTestCase(validTestCases);
      if (response?.status === 'Failure' || response?.statusCode === 4000) {
        setCreateAlert({ isOpen: true, message: response?.message || 'Failed to create test cases.' });
        setPendingCreateSuccess(false);
        return;
      } else {
        const successMessage = validTestCases.length === 1 
          ? 'Test case created successfully!' 
          : `${validTestCases.length} test cases created successfully!`;
        setCreateAlert({ isOpen: true, message: response?.message || successMessage });
        setPendingCreateSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          setModals([
            {
              open: false,
              formData: {
                module: "",
                subModule: "",
                description: "",
                steps: "",
                type: "functional",
                severity: "",
                projectId: selectedProjectId,
              },
            },
          ]);
          setCurrentModalIdx(0);
          setCreateAlert({ isOpen: false, message: '' });
          if (selectedProjectId && selectedSubmoduleId !== null) {
            getTestCasesByProjectAndSubmodule(selectedProjectId, String(selectedSubmoduleId)).then((data) => {
              const moduleMap = Object.fromEntries(projectModules.map((m: any) => [m.id, m.name]));
              const submoduleMap = Object.fromEntries(projectModules.flatMap((m: any) => m.submodules.map((sm: any) => [sm.id, sm.name])));
              setTestCases(
                (data as any[]).map((tc: any) => ({
                  ...tc,
                  moduleId: tc.moduleId,
                  module: moduleMap[tc.moduleId] || tc.moduleId,
                  subModuleId: tc.subModuleId,
                  subModule: submoduleMap[tc.subModuleId] || tc.subModuleId,
                  severity: (severities && severities.find(s => s.id === tc.severityId)?.name || "") as TestCaseType['severity'],
                  type: (defectTypes && defectTypes.find(dt => dt.id === tc.defectTypeId)?.defectTypeName || "") as TestCaseType['type'],
                })) as TestCaseType[]
              );
            });
          }
          fetchAllSubmoduleTestCases();
        }, 1200);
      }
    } catch (error: any) {
      setPendingCreateSuccess(false);
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to create test cases. Please try again.';
      setCreateAlert({ isOpen: true, message: errorMessage });
      return;
    }
  };

  const getSeverityColor = (severityName: string | undefined | null) => {
    if (!severityName) return "bg-gray-100 text-gray-800";

    const severity = severities.find(s => s.name.toLowerCase() === severityName.toLowerCase());
    if (severity && severity.color) {
      const hexColor = severity.color.startsWith('#') ? severity.color : `#${severity.color}`;
      return { backgroundColor: hexColor, color: 'white' };
    }
    // Fallback to hardcoded colors if not found in database
    switch (severityName.toLowerCase()) {
      case "critical": return "bg-red-100 text-red-800";
      case "high": return "bg-orange-100 text-orange-800";
      case "medium": return "bg-yellow-100 text-yellow-800";
      case "low": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  // Helper function to format test case ID with abbreviation
  const formatTestCaseId = (id: string | number): string => {
    // Convert to string and pad with zeros to make it 4 digits
    const numericId = String(id).padStart(4, '0');
    return `${numericId}`;
  };

  const renderColoredSpan = (text: string | undefined | null, colorResult: string | React.CSSProperties) => {
    const displayText = text || '-';
    if (typeof colorResult === 'string') {
      return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${colorResult}`}>
          {displayText}
        </span>
      );
    } else {
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

  // const handleSelectAll = (checked: boolean) => {
  //   if (checked) {
  //     setSelectedTestCases(filteredTestCases.map((tc: TestCaseType) => tc.id));
  //   } else {
  //     setSelectedTestCases([]);
  //   }
  // };

  // const handleSelectTestCase = (testCaseId: string, checked: boolean) => {
  //   if (checked) {
  //     setSelectedTestCases([...selectedTestCases, testCaseId]);
  //   } else {
  //     setSelectedTestCases(selectedTestCases.filter((id) => id !== testCaseId));
  //   }
  // };

  const handleViewSteps = (testCase: TestCaseType) => {
    setViewingTestCase(testCase);
    setIsViewStepsModalOpen(true);
  };

  const handleViewTestCase = (testCase: TestCaseType) => {
    setViewingTestCase(testCase);
    setIsViewTestCaseModalOpen(true);
  };
  // Integration removed: no fetching of all projects

  // const toggleRowExpansion = (testCaseId: string) => {
  //   setExpandedRows((prev) => {
  //     const newSet = new Set(prev);
  //     if (newSet.has(testCaseId)) {
  //       newSet.delete(testCaseId);
  //     } else {
  //       newSet.add(testCaseId);
  //     }
  //     return newSet;
  //   });
  // };

  // const handleViewDescription = (description: string) => {
  //   setSelectedDescription(description);
  //   setIsDescriptionModalOpen(true);
  // };

  // Add state for search filters and search results
  const [searchFilters, setSearchFilters] = useState({
    description: "",
    typeId: "",
    severityId: "",
    submoduleId: "",
  });
  const [searchResults, setSearchResults] = useState<TestCaseType[] | null>(null);
  console.log("searchResults", searchResults);

  const [isSearching, setIsSearching] = useState(false);
  
  // Add state for client-side filtered results (letter-by-letter filtering)
  const [clientFilteredResults, setClientFilteredResults] = useState<TestCaseType[] | null>(null);
  
  // Add debounce for search and client-side filtering
  const searchTimeoutRef = useRef<number | null>(null);
  const filterTimeoutRef = useRef<number | null>(null);
  
  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      if (filterTimeoutRef.current) {
        clearTimeout(filterTimeoutRef.current);
      }
    };
  }, []);

  // Handle submodule selection (just highlight, no fetch)
  const handleSubmoduleSelect = (submoduleId: string | null) => {
    setSelectedSubmoduleId(submoduleId);
    setSearchResults(null);
    setClientFilteredResults(null);
    setSearchFilters({ description: "", typeId: "", severityId: "", submoduleId: "" });
  };

  // Add state to track submodules for each modal
  const [modalSubmodules, setModalSubmodules] = useState<Submodule[][]>([]);

  // Add a useEffect to fetch submodules for the selected module in the current modal
  useEffect(() => {
    const currentModal = modals[currentModalIdx];
    // Skip fetching submodules if we're in edit mode (formData.id exists)
    if (currentModal?.formData.id) {
      return;
    }
    const currentModuleName = currentModal?.formData.module;
    const moduleObj = projectModules && projectModules.find((m: any) => m.name === currentModuleName);
    if (moduleObj && moduleObj.id) {
      getSubmodulesByModuleId(Number(moduleObj.id)).then(res => {
        setModalSubmodules(prev => {
          const copy = [...prev];
          copy[currentModalIdx] = res.data || [];
          return copy;
        });
      });
    } else {
      setModalSubmodules(prev => {
        const copy = [...prev];
        copy[currentModalIdx] = [];
        return copy;
      });
    }
  }, [modals[currentModalIdx]?.formData.module, projectModules, currentModalIdx]);

  // General helper for mapping
  const getNameByIdOrValue = (value: string | number | undefined | null, list: any[], idKey: string = 'id', nameKey: string = 'name') => {
    if (!value) return "";
    const found = list.find(item => String(item[idKey]) === String(value) || item[nameKey] === value);
    return found ? found[nameKey] : String(value); // fallback to value if not found
  }

  const getModuleName = (value: string | number | undefined | null) => {
    if (!value) return "";
    const found = projectModules.find(m => String(m.id) === String(value) || m.name === value);
    return found ? found.name : "Unknown Module";
  };
  const getSubmoduleName = (value: string | number | undefined | null) => {
    if (!value) return "";
    for (const mod of projectModules) {
      const found = mod.submodules.find(sm => String(sm.id) === String(value) || sm.name === value);
      if (found) return found.name;
    }
    if (Array.isArray(submodules)) {
      const foundGlobal = submodules.find(sm => String(sm.id) === String(value) || sm.name === value);
      if (foundGlobal) return foundGlobal.name;
    }
    return "Unknown Submodule";
  };
  const getTypeName = (value: string | number | undefined | null) => getNameByIdOrValue(value, defectTypes, 'id', 'defectTypeName');
  const getSeverityName = (value: string | number | undefined | null) => getNameByIdOrValue(value, severities, 'id', 'name');

  // Replace all usages of apiDeleteTestCase with this function
  const deleteTestCaseById = async (testCaseId: string) => {
    const url = `${BASE_URL}testcase/${testCaseId}`;
    try {
      const response = await apiClient.delete(url);
      showAlert(response?.data?.message || 'Test case deleted successfully!');
      return response;
    } catch (error: any) {
      showAlert('Cannot delete test case: There are dependencies.');
      throw error;
    }
  };

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Compute paginated test cases (works for searchResults, clientFilteredResults, and filteredTestCases)
  const tableData = searchResults !== null ? searchResults : 
                   clientFilteredResults !== null ? clientFilteredResults : 
                   filteredTestCases;
  const totalRows = tableData.length;
  const totalPages = Math.ceil(totalRows / rowsPerPage) || 1;
  const paginatedTestCases = tableData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  // Only reset to page 1 when search results change (new search)
  useEffect(() => {
    setCurrentPage(1);
  }, [searchResults, clientFilteredResults]);

  // Only reset to page 1 when rows per page changes
  useEffect(() => {
    setCurrentPage(1);
  }, [rowsPerPage]);

  // Alert state handlers
  // Remove this useEffect:
  // useEffect(() => {
  //   if (!modals[currentModalIdx]?.open && pendingCreateSuccess) {
  //     setCreateAlert({ isOpen: true, message: 'Test case created successfully!' });
  //     setPendingCreateSuccess(false);
  //   }
  // }, [modals[currentModalIdx]?.open, pendingCreateSuccess]);


  console.log("paginatedTestCases", paginatedTestCases);

  // Debug alert state changes
  useEffect(() => {
    console.log("Create alert state changed:", createAlert);
  }, [createAlert]);

  useEffect(() => {
    console.log("Update alert state changed:", updateAlert);
  }, [updateAlert]);

  // Add helper function at the top (after imports)
  function extractNumericId(id: string) {
    return id.replace(/\D/g, '').replace(/^0+/, '');
  }

  const [alert, setAlert] = useState({ isOpen: false, message: "" });
  const showAlert = (message: string) => setAlert({ isOpen: true, message });
  const closeAlert = () => setAlert((a) => ({ ...a, isOpen: false }));

  // Add a helper to check if the current modal form is valid
  const isCurrentModalValid = (modal: ModalFormData) => {
    return (
      modal.module &&
      modal.subModule &&
      modal.description &&
      modal.steps &&
      modal.type &&
      modal.severity
    );
  };



  // Add the refreshTestCases function
  const refreshTestCases = () => {
    if (selectedProjectId && selectedSubmoduleId !== null) {
      getTestCasesByProjectAndSubmodule(selectedProjectId, String(selectedSubmoduleId)).then((data) => {
        const moduleMap = Object.fromEntries(projectModules.map((m: any) => [m.id, m.name]));
        const submoduleMap = Object.fromEntries(projectModules.flatMap((m: any) => m.submodules.map((sm: any) => [sm.id, sm.name])));
        setTestCases(
          (data as any[]).map((tc: any) => ({
            ...tc,
            moduleId: tc.moduleId,
            module: moduleMap[tc.module] || tc.module,
            subModuleId: tc.subModuleId,
            subModule: submoduleMap[tc.subModule] || tc.subModule,
            severity: (severities && severities.find(s => s.id === tc.severityId)?.name || "") as TestCaseType['severity'],
            type: (defectTypes && defectTypes.find(dt => dt.id === tc.defectTypeId)?.defectTypeName || "") as TestCaseType['type'],
          })) as TestCaseType[]
        );
        // Restore the page after deletion if needed
        if (pageAfterDeleteRef.current !== null) {
          setCurrentPage(pageAfterDeleteRef.current);
          pageAfterDeleteRef.current = null;
        }
      });
    }
  };

  // Add state for AlertModal confirmation
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // Add a ref to store the intended page after deletion
  const pageAfterDeleteRef = useRef<number | null>(null);

  const [showQuickAdd, setShowQuickAdd] = useState(false);

  // Add exportTestCases function for CSV export
  const exportTestCases = async () => {
    if (!selectedProjectId) {
      showAlert("Please select a project before exporting test cases.");
      return;
    }
    // Ensure BASE_URL ends with a slash
    let baseUrl = BASE_URL || '';
    if (baseUrl && !baseUrl.endsWith('/')) {
      baseUrl += '/';
    }
    try {
      const response = await apiClient.get(
        `${baseUrl}testcase/export/${selectedProjectId}`,
        {
          responseType: "blob",
        }
      );
      // Create a link to download the file
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      // Try to get filename from content-disposition header, fallback to testcases_export.csv
      const contentDisposition = response.headers["content-disposition"];
      let fileName = `testcases_project_${selectedProjectId}.csv`;
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
      showAlert("Failed to export test cases. Please try again.");
    }
  };

  return (
    <div className="max-w-6xl mx-auto ">
      {/* Fixed Header Section */}
      <div className="flex-none p-6 pb-4">
        <div className="flex justify-between items-center mb-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-gray-900">Test Cases</h1>
          </div>
          {/* Removed the '+ Add Test Case' button from here as per request */}
        </div>
        {/* Project Selection Panel */}
        <ProjectSelector
          projects={projects}
          selectedProjectId={selectedProjectId || ''}
          onSelect={id => {
            setSelectedProjectId(id);
            setGlobalProjectId(id); // keep global context in sync
            navigate(`/projects/${id}/test-cases`);
          }}
        />
        
           {/* Filter Options Above Table */}
      {selectedProjectId && (
            <div className="flex justify-end gap-2 mb-2 py-5 ">
              <button
                type="button"
                className="flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded shadow"
                onClick={handleImportExcelButton}
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
                onChange={handleImportExcelInput}
                ref={fileInputRef}
                className="hidden"
              />
              <button
                type="button"
                className="flex items-center px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded shadow"
                onClick={exportTestCases}
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
            </div>
          )}


      </div>

     


      {/* Content Area - Now scrollable at page level */}
      <div className="flex-1 px-6 pb-6">
        <div className="flex flex-col">
          {/* Module Selection Panel */}
          {selectedProjectId && (
            <ModuleSelector
              modules={projectModules}
              selectedModuleId={selectedModuleId}
              onSelect={async (id) => {
                console.log("Module selected:", id, "Project:", selectedProjectId);
                setSelectedModuleId(id);
                setSelectedSubmoduleId(null);

                // Clear search results when module changes
                setSearchResults(null);
                setClientFilteredResults(null);

                // Fetch test cases for the selected project and module
                if (id && selectedProjectId) {
                  try {
                    console.log("Fetching test cases for module:", id);
                    // Try the regular API first, fall back to external if needed
                    let data;
                    try {
                      data = await getTestCasesByProjectAndModule(selectedProjectId, id);
                      console.log("Fetched test cases data (regular API):", data);
                    } catch (regularApiError) {
                      console.log("Regular API failed, trying external API:", regularApiError);
                      data = await getTestCasesByProjectAndModuleExternal(selectedProjectId, id);
                      console.log("Fetched test cases data (external API):", data);
                    }

                    // Map the data to include proper type and severity names
                    const moduleMap = Object.fromEntries(projectModules.map((m: any) => [m.id, m.name]));
                    const submoduleMap = Object.fromEntries(projectModules.flatMap((m: any) => m.submodules.map((sm: any) => [sm.id, sm.name])));

                    const mappedTestCases = (data as any[]).map((tc: any) => ({
                      ...tc,
                      moduleId: tc.moduleId, // always keep the ID
                      module: moduleMap[tc.moduleId] || tc.moduleName || tc.module, // display name
                      subModuleId: tc.subModuleId, // always keep the ID
                      subModule: submoduleMap[tc.subModuleId] || tc.subModuleName || tc.subModule, // display name
                      severity: (severities && severities.find(s => s.id === tc.severityId)?.name || "") as TestCaseType['severity'],
                      type: (defectTypes && defectTypes.find(dt => dt.id === tc.defectTypeId)?.defectTypeName || "") as TestCaseType['type'],
                    })) as TestCaseType[];

                    console.log("Mapped test cases:", mappedTestCases);
                    setTestCases(mappedTestCases);
                  } catch (error) {
                    console.error("Error fetching test cases for module:", error);
                    setTestCases([]);
                  }
                } else {
                  console.log("No module or project selected, clearing test cases");
                  setTestCases([]);
                }
              }}
              className="mb-4"
            />
          )}

          {/* Submodule Selection Panel */}
          {selectedProjectId && (
            selectedModuleId ? (
              <Card className="mb-4">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h2 className="text-lg font-semibold text-gray-900">
                      Submodule Selection
                    </h2>
                  </div>
                  {submoduleError && (
                    <div className="mb-2 text-red-600 text-sm">{submoduleError}</div>
                  )}
                  <div className="relative flex items-center">
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
                      className="flex space-x-2 overflow-x-auto pb-2 scroll-smooth flex-1"
                      style={{
                        scrollbarWidth: "none",
                        msOverflowStyle: "none",
                        maxWidth: "100%",
                      }}
                    >
                      {submodules.map((x: any) => {
                        // Count all test cases for this submodule, regardless of selection
                        const submoduleTestCases = allSubmoduleTestCases[String(x.subModuleId)] || [];
                        return (
                          <div key={x.subModuleId} className="flex items-center">
                            <div className="flex items-center border border-gray-200 rounded-lg p-0.5 bg-white hover:border-gray-300 transition-colors">
                              <Button
                                variant={
                                  selectedSubmoduleId === x.subModuleId
                                    ? "primary"
                                    : "secondary"
                                }
                                onClick={() => handleSubmoduleSelect(x.subModuleId)}
                                className="whitespace-nowrap border-0 m-2"
                              >
                                {x.subModuleName}
                                <Badge variant="info" className="ml-2">
                                  {submoduleTestCases.length}
                                </Badge>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setModals((prev) => {
                                    const newModals = [
                                      ...prev,
                                      {
                                        open: true,
                                        formData: {
                                          module: x.moduleName,
                                          subModule: x.subModuleName,
                                          description: "",
                                          steps: "",
                                          type: "functional",
                                          severity: "", // changed from "medium"
                                          projectId: selectedProjectId,
                                        },
                                      },
                                    ];
                                    setCurrentModalIdx(newModals.length - 1);
                                    return newModals;
                                  });
                                }}
                                className="p-1 border-0 hover:bg-gray-50"
                                disabled={selectedSubmoduleId !== x.subModuleId}
                              >
                                <Plus className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
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
            ) : (
              <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-center">
                Please select a module first.
              </div>
            )
          )}

          {/* Bulk Operations Panel */}
          {/* Removed bulk delete button */}

          

          {/* Add a search/filter panel above the table */}
          {selectedProjectId && selectedModuleId && (
            <Card className="mb-4">
              <CardContent className="p-4">
                <form
                  className="flex flex-wrap gap-4 items-end"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setIsSearching(true);
                    try {
                      // Clear client filtered results when doing backend search
                      setClientFilteredResults(null);
                      
                      const params: any = {};
                      if (searchFilters.description) params.description = searchFilters.description;
                      if (searchFilters.typeId) params.typeId = Number(searchFilters.typeId);
                      if (searchFilters.severityId) params.severityId = Number(searchFilters.severityId);
                      // Add module and submodule filtering
                      if (selectedModuleId) params.moduleId = Number(selectedModuleId);
                      if (selectedSubmoduleId) params.submoduleId = Number(selectedSubmoduleId);
                      
                      console.log("Search params:", params);
                      const res = await searchTestCases(params);
                      console.log("Search results:", res.data);

                      const normalized = (res.data || []).map((tc: any) => ({
                        ...tc,
                        type: defectTypes && defectTypes.find(dt => dt.id === tc.defectTypeId)?.defectTypeName || "",
                        severity: severities && severities.find(s => s.id === tc.severityId)?.name || "",
                      }));

                      setSearchResults(normalized);
                    } catch (error) {
                      console.error("Search error:", error);
                      setSearchResults([]);
                    } finally {
                      setIsSearching(false);
                    }
                  }}
                >
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                    <input
                      type="text"
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Type to filter or click Search for backend search"
                      value={searchFilters.description}
                      onChange={e => {
                        setSearchFilters(f => ({ ...f, description: e.target.value }));
                        
                        // Clear previous timeout
                        if (filterTimeoutRef.current) {
                          clearTimeout(filterTimeoutRef.current);
                        }
                        
                        // Client-side filtering when description changes (with debounce)
                        if (e.target.value.trim()) {
                          filterTimeoutRef.current = setTimeout(() => {
                            // Clear any existing search results when doing client-side filtering
                            setSearchResults(null);
                            
                            // Filter the current test cases based on description
                            const filtered = testCases.filter(tc => 
                              tc.description.toLowerCase().includes(e.target.value.toLowerCase())
                            );
                            setClientFilteredResults(filtered);
                          }, 300); // 300ms debounce for client-side filtering
                        } else {
                          // If description is empty, clear both search and client filtered results
                          setSearchResults(null);
                          setClientFilteredResults(null);
                        }
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                    <select
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={searchFilters.typeId}
                      onChange={e => setSearchFilters(f => ({ ...f, typeId: e.target.value }))}
                    >
                      <option value="">All</option>
                      {defectTypes.map(type => (
                        <option key={type.id} value={type.id}>{type.defectTypeName}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Severity</label>
                    <select
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={searchFilters.severityId}
                      onChange={e => setSearchFilters(f => ({ ...f, severityId: e.target.value }))}
                    >
                      <option value="">All</option>
                      {severities.map(sev => (
                        <option key={sev.id} value={sev.id}>{sev.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      type="submit" 
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center"
                      disabled={isSearching}
                    >
                      {isSearching ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Searching...
                        </>
                      ) : (
                        "Search"
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="px-4 py-2 rounded"
                      onClick={() => {
                        setSearchFilters({ description: "", typeId: "", severityId: "", submoduleId: "" });
                        setSearchResults(null);
                        setClientFilteredResults(null);
                        // Refresh the test cases to show all results for the current module/submodule
                        if (selectedProjectId && selectedSubmoduleId !== null) {
                          getTestCasesByProjectAndSubmodule(selectedProjectId, String(selectedSubmoduleId)).then((data) => {
                            const moduleMap = Object.fromEntries(projectModules.map((m: any) => [m.id, m.name]));
                            const submoduleMap = Object.fromEntries(projectModules.flatMap((m: any) => m.submodules.map((sm: any) => [sm.id, sm.name])));
                            setTestCases(
                              (data as any[]).map((tc: any) => ({
                                ...tc,
                                moduleId: tc.moduleId,
                                module: moduleMap[tc.moduleId] || tc.moduleName,
                                subModuleId: tc.subModuleId,
                                subModule: submoduleMap[tc.subModuleId] || tc.subModuleName,
                                severity: (severities && severities.find(s => s.id === tc.severityId)?.name || "") as TestCaseType['severity'],
                                type: (defectTypes && defectTypes.find(dt => dt.id === tc.defectTypeId)?.defectTypeName || "") as TestCaseType['type'],
                              })) as TestCaseType[]
                            );
                          });
                        }
                      }}
                    >
                      Clear
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Test Cases Table - Now with dynamic height */}
          {selectedProjectId && selectedModuleId && (
            <Card>
              <CardContent className="p-0">
                <table className="w-full testcase-table">
                  <thead className="bg-gray-50">
                    <tr className="border-b border-gray-200">
                      {/* Removed checkbox column */}
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        TEST CASE ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        DESCRIPTION
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        STEPS
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        TYPE
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        SEVERITY
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ACTIONS
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedTestCases.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                          {searchResults !== null || clientFilteredResults !== null ? (
                            <div>
                              <p className="text-lg font-medium mb-2">No test cases found</p>
                              <p className="text-sm">Try adjusting your search criteria or clear the filters</p>
                            </div>
                          ) : (
                            <div>
                              <p className="text-lg font-medium mb-2">No test cases available</p>
                              <p className="text-sm">
                                {selectedModuleId
                                  ? "No test cases found for the selected module. You can select a submodule for more specific results or add new test cases."
                                  : "Select a module to view test cases"
                                }
                              </p>
                            </div>
                          )}
                        </td>
                      </tr>
                    ) : (
                      paginatedTestCases.map((testCase: TestCaseType) => (
                      <tr key={testCase.testCaseId} className="hover:bg-gray-50">
                        {/* Removed checkbox column */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatTestCaseId(testCase.testCaseId)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs description-cell" title={testCase.description}>
                          <div className="description-text">{testCase.description}</div>
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
                          <div className="flex space-x-2">
                            <button
                              onClick={() => {
                                console.log('Available projectModules:', projectModules);
                                console.log('Test case to edit:', testCase);
                                // Robustly get module and submodule name using both ID and name
                                let moduleId = (testCase as any).moduleId ?? testCase.module;
                                let subModuleId = (testCase as any).subModuleId ?? testCase.subModule;
                                let moduleName = "Unknown Module";
                                let subModuleName = "Unknown Submodule";
                                console.log({ testCase });
                                console.log({ projectModules });
                                console.log('moduleId:', moduleId, 'subModuleId:', subModuleId);


                                if (moduleId) {
                                  const foundModule = projectModules.find((m: any) => String(m.id) === String(moduleId));
                                  console.log('Found module:', foundModule);
                                  if (foundModule) {
                                    moduleName = foundModule.name;
                                    if (subModuleId) {
                                      const foundSubmodule = foundModule.submodules.find((sm: any) => String(sm.id) === String(subModuleId) || sm.name === subModuleId);
                                      console.log('Found submodule:', foundSubmodule);
                                      if (foundSubmodule) subModuleName = foundSubmodule.name;
                                    }
                                  }
                                }
                                // fallback to names if IDs are not available
                                if (moduleName === "Unknown Module" && testCase.module) moduleName = String(testCase.module);
                                if (subModuleName === "Unknown Submodule" && testCase.subModule) subModuleName = String(testCase.subModule);
                                console.log('Resolved moduleName:', moduleName, 'subModuleName:', subModuleName);
                                const typeName = getTypeName(testCase.type);
                                const severityName = getSeverityName(testCase.severity);
                                console.log('Setting up edit modal with testCase.id:', testCase.id, 'testCase.testCaseId:', testCase.testCaseId);
                                setModals([
                                  {
                                    open: true,
                                    formData: {
                                      module: moduleName, // always the name
                                      subModule: subModuleName, // always the name
                                      description: testCase.description || "",
                                      steps: testCase.steps || "",
                                      type: typeName || "functional",
                                      severity: severityName || "", // changed from "medium"
                                      projectId: testCase.projectId,
                                      id: testCase.id,
                                      moduleId: moduleId, // keep for reference
                                      subModuleId: subModuleId, // keep for reference
                                    },
                                  },
                                ]);
                                setCurrentModalIdx(0);
                              }}
                              className="p-1 text-yellow-600 hover:text-yellow-800 hover:bg-yellow-50 rounded"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setPendingDeleteId(testCase.id);
                                setConfirmOpen(true);
                              }}
                              className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                </table>
                {/* Pagination Controls */}
                <div className="flex items-center justify-between px-6 py-3 bg-gray-50 border-t border-gray-200">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-700">Rows per page:</span>
                    <select
                      className="border border-gray-300 rounded px-2 py-1 text-sm"
                      value={rowsPerPage}
                      onChange={e => setRowsPerPage(Number(e.target.value))}
                    >
                      {[5, 10, 20, 50, 100].map(n => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      className="px-2 py-1 rounded border border-gray-300 bg-white text-gray-700 disabled:opacity-50"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    //style={idx === 0 ? { opacity: 0.5, pointerEvents: 'none' } : {}}
                    >
                      Previous
                    </button>
                    <span className="text-sm text-gray-700">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      className="px-2 py-1 rounded border border-gray-300 bg-white text-gray-700 disabled:opacity-50"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </button>
                  </div>
                  <span className="text-sm text-gray-500">
                    {totalRows === 0
                      ? 'No test cases'
                      : `Showing ${(currentPage - 1) * rowsPerPage + 1}–${Math.min(currentPage * rowsPerPage, totalRows)} of ${totalRows}`}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Add/Edit Test Case Modal */}
      {modals[currentModalIdx]?.open &&
        (() => {
          const idx = currentModalIdx;
          console.log("Rendering modal for index:", idx, "with data:", modals[idx]);

          const modal = modals[idx];
          return (
            <Modal
              key={idx}
              isOpen={modal.open}
              onClose={() => {
                if (modals.length === 1) {
                  setModals([{ ...modals[0], open: false }]);
                  setCurrentModalIdx(0);
                } else {
                  handleRemove(idx);
                }
                setCreateAlert({ isOpen: false, message: '' }); // Clear alert on close/cancel
                setUpdateAlert({ isOpen: false, message: '' });
              }}
              title={isEditMode ? "Edit Test Case" : "Create New Test Case"}
              size="xl"
            >
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSubmitAll();
                }}
                className="space-y-4"
              >
                <div className="flex items-center mb-2">
                  {/* Only show import button in add mode */}

                </div>
                <div className="border rounded-lg p-4 mb-2 relative">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Module
                      </label>
                      <div className="w-full px-3 py-2 rounded-lg bg-gray-100 text-gray-800 border border-gray-300">
                        {modal.formData.module}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Sub Module
                      </label>
                      <div className="w-full px-3 py-2 rounded-lg bg-gray-100 text-gray-800 border border-gray-300">
                        {modal.formData.subModule}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Type
                      </label>
                      <select
                        value={modal.formData.type}
                        onChange={(e) =>
                          handleInputChange(idx, "type", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      >
                        <option value="">Select Type</option>
                        {defectTypes.map(type => (
                          <option key={type.id} value={type.defectTypeName}>{type.defectTypeName}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Severity
                      </label>
                      <select
                        value={modal.formData.severity}
                        onChange={(e) =>
                          handleInputChange(idx, "severity", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      >
                        <option value="">Select Severity</option>
                        {severities.map(sev => (
                          <option key={sev.id} value={sev.name}>{sev.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <p className="text-xs text-gray-500 mb-1">Description must contain letters and at least one number or special character</p>
                    <textarea
                      value={modal.formData.description}
                      onChange={(e) =>
                        handleInputChange(idx, "description", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={1}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Test Steps
                    </label>
                    <p className="text-xs text-gray-500 mb-1">Steps must contain letters and at least one number or special character (e.g., "1. Step one", "Step 1!")</p>
                    <textarea
                      value={modal.formData.steps}
                      onChange={(e) =>
                        handleInputChange(idx, "steps", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={4}
                      required
                    />
                  </div>
                </div>
                                 <div className="flex justify-between items-center pt-4">
                   <div className="flex space-x-2">
                     {!isEditMode && (
                       <>
                         <Button
                           type="button"
                           variant="secondary"
                           onClick={() => setCurrentModalIdx(idx - 1)}
                           disabled={idx === 1}
                         // style={idx === 0 ? { opacity: 0.5, pointerEvents: 'none' } : {}}
                         >
                           Previous
                         </Button>
                         <Button
                           type="button"
                           variant="secondary"
                           onClick={() => {
                             if (idx === modals.length - 1) {
                               setModals((prev) => [
                                 ...prev,
                                 {
                                   open: true,
                                   formData: {
                                     module: modal.formData.module,
                                     subModule: modal.formData.subModule,
                                     description: "",
                                     steps: "",
                                     type: "functional",
                                     severity: "", // changed from "medium"
                                     projectId: modal.formData.projectId,
                                   },
                                 },
                               ]);
                               setCurrentModalIdx(modals.length);
                             } else {
                               setCurrentModalIdx(idx + 1);
                             }
                           }}
                           disabled={!isCurrentModalValid(modal.formData)}
                         >
                           Next
                         </Button>
                       </>
                     )}
                   </div>
                   <div className="flex items-center space-x-3">
                     {!isEditMode && (
                       <div className="text-sm text-gray-600">
                         {(() => {
                           const validCount = modals.filter(m => m.open && isCurrentModalValid(m.formData)).length;
                           return `${validCount} test case${validCount !== 1 ? 's' : ''} ready to submit`;
                         })()}
                       </div>
                     )}
                     <Button
                       type="button"
                       variant="secondary"
                       onClick={() => {
                         if (modals.length === 1) {
                           setModals([{ ...modals[0], open: false }]);
                           setCurrentModalIdx(0);
                         } else {
                           handleRemove(idx);
                         }
                       }}
                     >
                       Cancel
                     </Button>
                     <Button type="submit"
                       disabled={
                         !modal.formData.description ||
                         !modal.formData.steps ||
                         !modal.formData.module ||
                         !modal.formData.subModule ||
                         !modal.formData.type ||
                         !modal.formData.severity
                       }
                     >
                       {success ? (isEditMode ? "Updated!" : "Added!") : (isEditMode ? "Update Test Case" : "Submit All")}
                     </Button>
                   </div>
                 </div>
              </form>
            </Modal>
          );
        })()}

      {/* View Steps Modal */}
      <Modal
        isOpen={isViewStepsModalOpen}
        onClose={() => {
          setIsViewStepsModalOpen(false);
          setViewingTestCase(null);
        }}
        title={`Test Steps - ${formatTestCaseId(viewingTestCase?.testCaseId)}`}
      >
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-gray-700 whitespace-pre-wrap break-words">
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
        title={`Test Case Details - ${formatTestCaseId(viewingTestCase?.testCaseId)}`}
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
                <div className="mt-1">
                  {renderColoredSpan(viewingTestCase.severity, getSeverityColor(viewingTestCase.severity))}
                </div>
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

      {/* Description View Modal */}
      <Modal
        isOpen={isDescriptionModalOpen}
        onClose={() => {
          setIsDescriptionModalOpen(false);
          setSelectedDescription("");
        }}
        title="Test Case Description"
      >
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-gray-700 whitespace-pre-wrap">
              {selectedDescription}
            </p>
          </div>
          <div className="flex justify-end">
            <Button
              variant="secondary"
              onClick={() => {
                setIsDescriptionModalOpen(false);
                setSelectedDescription("");
              }}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create Alert Modal */}
      <AlertModal
        isOpen={createAlert.isOpen}
        message={createAlert.message}
        onClose={() => {
          console.log("Closing create alert");
          setCreateAlert({ isOpen: false, message: '' });
        }}
      />
      {/* Update Alert Modal */}
      <AlertModal
        isOpen={updateAlert.isOpen}
        message={updateAlert.message}
        onClose={() => {
          console.log("Closing update alert");
          setUpdateAlert({ isOpen: false, message: '' });
        }}
      />
      {/* Delete Alert Modal */}
      <AlertModal
        isOpen={deleteAlert.isOpen}
        message={deleteAlert.message}
        onClose={() => {
          console.log("Closing delete alert");
          setDeleteAlert({ isOpen: false, message: '' });
        }}
      />
      {confirmOpen && (
        <div className="fixed inset-0 z-[60] flex justify-center items-start bg-black bg-opacity-40">
          <div className="mt-8 bg-[#444] text-white rounded-lg shadow-2xl min-w-[400px] max-w-[95vw]" style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.25)' }}>
            <div className="px-6 pb-4 pt-5 text-base text-white">Are you sure you want to delete this test case?</div>
            <div className="px-6 pb-5 flex justify-end gap-3">
              <button
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-6 py-2 rounded mr-2"
                onClick={() => { setConfirmOpen(false); setPendingDeleteId(null); }}
                type="button"
              >
                Cancel
              </button>
              <button
                className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-2 rounded"
                onClick={async () => {
                  if (pendingDeleteId) {
                    try {
                      await deleteTestCaseById(pendingDeleteId);
                      setDeleteAlert({ isOpen: true, message: 'Test case deleted successfully!' });
                      // Immediately update testCases and allSubmoduleTestCases with robust ID comparison
                      setTestCases(prev => {
                        const updated = prev.filter(tc =>
                          String(tc.testCaseId) !== String(pendingDeleteId) && String(tc.id) !== String(pendingDeleteId)
                        );
                        // If the current page is now empty and not the first page, go to previous page
                        const newTotalRows = updated.length;
                        const newTotalPages = Math.ceil(newTotalRows / rowsPerPage) || 1;
                        if (currentPage > newTotalPages && currentPage > 1) {
                          setCurrentPage(currentPage - 1);
                        }
                        return updated;
                      });
                      setAllSubmoduleTestCases(prev => {
                        const updated = { ...prev };
                        Object.keys(updated).forEach(submoduleId => {
                          updated[submoduleId] = updated[submoduleId].filter(tc =>
                            String(tc.testCaseId) !== String(pendingDeleteId) && String(tc.id) !== String(pendingDeleteId)
                          );
                        });
                        return updated;
                      });
                      // Force a refresh from backend for full consistency
                      refreshTestCases();
                      fetchAllSubmoduleTestCases();
                    } catch (error: any) {
                      setDeleteAlert({ isOpen: true, message: 'Cannot delete test case: There are dependencies (e.g., allocated to a release).' });
                    } finally {
                      setConfirmOpen(false);
                      setPendingDeleteId(null);
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
      {/* Quick Add Test Case Modal */}
      {showQuickAdd && (
        <QuickAddTestCase
          selectedProjectId={selectedProjectId}
          onTestCaseAdded={() => {
            setShowQuickAdd(false);
            // Optionally refresh test cases here
            refreshTestCases && refreshTestCases();
          }}
        />
      )}
    </div>
  );
};
