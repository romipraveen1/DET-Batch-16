import React, { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { Input } from "../components/ui/Input";
import { useApp } from "../context/AppContext";
import * as exceljs from "xlsx";
import { importTestCases } from "../api/importTestCase";
import { getSeverities } from "../api/severity";
import { getDefectTypes } from "../api/defectType";
import { getModulesByProjectId } from "../api/module/getModule";
import { getSubmodulesByModuleId } from "../api/submodule/submoduleget";
import { createTestCase } from "../api/testCase/createTestcase";
import AlertModal from "../components/ui/AlertModal";


const QuickAddTestCase: React.FC<{ selectedProjectId: string, onTestCaseAdded?: () => void }> = ({ selectedProjectId, onTestCaseAdded }) => {
  const { projects, addTestCase } = useApp();
  const [modals, setModals] = useState([
    {
      open: false,
      formData: {
        moduleId: "",
        subModuleId: "",
        description: "",
        steps: "",
        type: "functional",
        severity: "",
      },
    },
  ]);
  const [currentModalIdx, setCurrentModalIdx] = useState(0);
  const [success, setSuccess] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [severities, setSeverities] = useState<{ id: number; name: string; color: string }[]>([]);
  const [defectTypes, setDefectTypes] = useState<{ id: number; defectTypeName: string }[]>([]);
  const [subModules, setSubModules] = useState<any[]>([]);
  
  // Debug log for subModules state
  // console.log('Current subModules state:', subModules);
  // console.log('subModules length:', subModules.length);
  // console.log('subModules type:', typeof subModules);
  const [alert, setAlert] = useState({ isOpen: false, message: "" });
  const showAlert = (message: string) => setAlert({ isOpen: true, message });
  const closeAlert = () => setAlert((a) => ({ ...a, isOpen: false }));

  // Add a local state for mapped modules
  const [projectModules, setProjectModules] = useState<any[]>([]);

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
          moduleId: "",
          subModuleId: "",
          description: "",
          steps: "",
          type: "functional",
          severity: "",
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

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      const response = await importTestCases(formData);
      if (response && response.data && Array.isArray(response.data)) {
        setModals(response.data.map((row: any) => ({ open: true, formData: row })));
        setCurrentModalIdx(0);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 1200);
      } else {
        showAlert("Import succeeded but no data returned.");
      }
    } catch (error: any) {
      showAlert("Failed to import test cases: " + (error?.message || error));
    }
  };

  const handleSubmitAll = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    // Build a single payload array so multiple test cases are created at once
    const batchPayload: any[] = [];
    let hasErrors = false;

    modals.forEach(({ formData }) => {
      const selectedModule = projectModules.find((m: any) => String(m.id) === String(formData.moduleId));
      const selectedSeverity = severities.find((sev) => sev.name === formData.severity);
      const selectedDefectType = defectTypes.find((dt) => dt.defectTypeName === formData.type);

      if (!selectedModule || !selectedSeverity || !selectedDefectType) {
        hasErrors = true;
        return;
      }

      batchPayload.push({
        subModuleId: formData.subModuleId ? Number(formData.subModuleId) : null,
        moduleId: Number(selectedModule.id),
        steps: formData.steps,
        severityId: selectedSeverity.id,
        projectId: Number(selectedProjectId),
        description: formData.description,
        defectTypeId: selectedDefectType.id,
      });
    });

    if (batchPayload.length === 0) {
      showAlert('Please fill all required fields before submitting.');
      return;
    }

    // Log the single combined payload so you can see exactly what is sent
    console.log('Quick Add - batch payload:', batchPayload);

    try {
      const response = await createTestCase(batchPayload);
      if (response?.status === 'Success' || response?.statusCode === 2000) {
        showAlert(response?.message || `${batchPayload.length} test case(s) created successfully!`);
        if (onTestCaseAdded) onTestCaseAdded();
      } else {
        showAlert(response?.message || 'Failed to create test cases.');
      }
    } catch (error: any) {
      showAlert(error?.response?.data?.message || error?.message || 'Failed to create test cases.');
    }

    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      setModals([
        {
          open: false,
          formData: {
            moduleId: "",
            subModuleId: "",
            description: "",
            steps: "",
            type: "functional",
            severity: "",
          },
        },
      ]);
      setCurrentModalIdx(0);
    }, 1200);

    if (hasErrors) {
      showAlert('Some rows were skipped because of missing selections.');
    }
  };

  // Add a helper to check if the current modal form is valid
  const isCurrentModalValid = (modal: any) => {
    return (
      modal.moduleId &&
      modal.description &&
      modal.steps &&
      modal.type &&
      modal.severity
    );
  };

  // Count how many forms are valid and ready
  const readyCount = React.useMemo(() => {
    return modals.filter(m => isCurrentModalValid(m.formData)).length;
  }, [modals]);

  // Fetch static data only once on mount
  useEffect(() => {
    getSeverities()
      .then(res => setSeverities(res.data))
      .catch(() => setSeverities([]));
    getDefectTypes()
      .then(res => setDefectTypes(res.data))
      .catch(() => setDefectTypes([]));
  }, []);

  // Fetch and map modules when project changes
  useEffect(() => {
    if (selectedProjectId) {
      getModulesByProjectId(selectedProjectId)
        .then(res => {
          const mapped = (res.data || []).map((mod: any) => ({
            id: mod.id, // Use the numeric id instead of moduleId string
            name: mod.moduleName,
            submodules: (mod.submodules || []).map((sm: any) => ({
              id: sm.subModuleId,
              name: sm.getSubModuleName
            }))
          }));
          setProjectModules(mapped);
        })
        .catch(() => setProjectModules([]));
    } else {
      setProjectModules([]);
    }
  }, [selectedProjectId]);

  // Fetch and map submodules for the selected module only
  useEffect(() => {
    const selectedModuleId = modals[currentModalIdx]?.formData.moduleId;
    // Find the module object by either id or moduleId
    const selectedModuleObj = projectModules && projectModules.find(
      (m: any) => String(m.id) === String(selectedModuleId) || String(m.moduleId) === String(selectedModuleId)
    );
    // Use id or moduleId for API call - ensure it's numeric
    const moduleIdForApi = selectedModuleObj?.id || selectedModuleObj?.moduleId;
    if (selectedModuleObj && moduleIdForApi) {
      // Convert to number and ensure it's valid
      const numericModuleId = Number(moduleIdForApi);
      if (!isNaN(numericModuleId)) {
        getSubmodulesByModuleId(numericModuleId)
          .then(res => {
            console.log('Full API Response:', res);
            console.log('Response data:', res.data);
            console.log('Response data type:', typeof res.data);
            
            // The 'res' object itself is the API response body (e.g., { status, message, data: [...], statusCode })
            // The actual array of submodules is in res.data
            const submodulesArray = res.data;
            console.log('Submodules array:', submodulesArray);
            console.log('Submodules array length:', submodulesArray.length);
            
            if (Array.isArray(submodulesArray)) {
              const mapped = submodulesArray.map((sm: any) => {
                console.log('Mapping submodule:', sm);
                return {
                  id: sm.subModuleId,
                  name: sm.subModuleName
                };
              });
              console.log('Mapped submodules:', mapped);
              setSubModules(mapped);
              console.log('setSubModules called with:', mapped);
            } else {
              console.error('Submodules array is not an array:', submodulesArray);
              setSubModules([]);
              console.log('setSubModules called with empty array');
            }
          })
          .catch((error) => {
            console.error('Error fetching submodules:', error);
            setSubModules([]);
          });
      } else {
        console.error('Invalid module ID:', moduleIdForApi);
        setSubModules([]);
      }
    } else {
      setSubModules([]);
    }
  }, [modals[currentModalIdx]?.formData.moduleId, projectModules]);

  // Reset modal state and module/submodule lists when project changes
  useEffect(() => {
    setModals([
      {
        open: false,
        formData: {
          moduleId: "",
          subModuleId: "",
          description: "",
          steps: "",
          type: "functional",
          severity: "",
        },
      },
    ]);
    setCurrentModalIdx(0);
    setSubModules([]);
  }, [selectedProjectId]);

  return (
    <div>
      <div className="relative flex items-center w-44 h-12">
        <span className="absolute left-0 flex items-center justify-center w-12 h-12 rounded-lg bg-blue-500 shadow-md">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="lucide lucide-clipboard-check"
            style={{ color: '#fff' }}
          >
            <rect x="9" y="2" width="6" height="4" rx="1" />
            <path d="M9 4H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2" />
            <path d="m9 14 2 2 4-4" stroke="#22c55e" />
          </svg>
        </span>
        <Button
          onClick={() => {
            setModals([{
              open: true,
              formData: {
                moduleId: "",
                subModuleId: "",
                description: "",
                steps: "",
                type: "functional",
                severity: "",
              },
            }]);
            setCurrentModalIdx(0);
          }}
          className="pl-14 pr-4 py-1 bg-white rounded-xl shadow border border-gray-200 w-full h-12 flex items-center font-semibold text-gray-900 hover:shadow-lg hover:bg-gray-50 transition-all justify-start"
          disabled={!selectedProjectId}
          style={{ fontWeight: 500, borderStyle: 'solid' }}
        >
          <span className="text-base font-medium text-gray-900 whitespace-nowrap">Add Test Case</span>
        </Button>
      </div>
      {modals[currentModalIdx]?.open &&
        (() => {
          const idx = currentModalIdx;
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
              }}
              title={
                projects && projects.find(
                  (p: { id: string }) => p.id === selectedProjectId
                )
                  ? `Add New Test Case (${projects.find(
                    (p: { id: string }) => p.id === selectedProjectId
                  )?.name})`
                  : "Add New Test Case"
              }
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
                  <button
                    type="button"
                    className="flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded shadow mr-3"
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
                    Import from Excel/CSV
                  </button>
                  <input
                    type="file"
                    accept=".xlsx,.csv"
                    onChange={handleImportExcel}
                    ref={fileInputRef}
                    className="hidden"
                  />
                </div>
                <div className="border rounded-lg p-4 mb-2 relative">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Module
                      </label>
                      <select
                        value={modal.formData.moduleId}
                        onChange={(e) => {
                          handleInputChange(idx, "moduleId", e.target.value);
                          handleInputChange(idx, "subModuleId", "");
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                        disabled={!selectedProjectId}
                      >
                        <option value="">Select Module</option>
                        {projectModules.map(
                          (module: { id: string; name: string }) => (
                            <option key={module.id} value={module.id}>
                              {module.name}
                            </option>
                          )
                        )}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Sub Module
                      </label>
                      <select
                        value={modal.formData.subModuleId}
                        onChange={(e) => handleInputChange(idx, "subModuleId", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        disabled={!modal.formData.moduleId}
                      >
                        <option value="">
                          {subModules.length === 0
                            ? "No submodules"
                            : "Select a submodule (optional)"}
                        </option>
                        {subModules.map((submodule: any) => (
                          <option key={submodule.id} value={submodule.id}>
                            {submodule.name}
                          </option>
                        ))}
                      </select>
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
                        {defectTypes.map((type) => (
                          <option key={type.id} value={type.defectTypeName}>
                            {type.defectTypeName}
                          </option>
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
                        {severities.map((severity) => (
                          <option key={severity.id} value={severity.name}>
                            {severity.name}
                          </option>
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
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setCurrentModalIdx(idx - 1)}
                      disabled={idx === 0}
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
                                moduleId: modal.formData.moduleId,
                                subModuleId: modal.formData.subModuleId,
                                description: "",
                                steps: "",
                                type: "functional",
                                severity: "",
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
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-gray-600 mr-2">{readyCount} test case{readyCount === 1 ? '' : 's'} ready to submit</span>
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
                    <Button type="submit" disabled={success || readyCount === 0}>
                      {success ? "Added!" : "Submit All"}
                    </Button>
                  </div>
                </div>
              </form>
            </Modal>
          );
        })()}
      <AlertModal
        isOpen={alert.isOpen}
        message={alert.message}
        onClose={closeAlert}
      />
    </div>
  );
};

export default QuickAddTestCase;
