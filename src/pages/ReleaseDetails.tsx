import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getModulesByProjectId } from "../api/module/getModule";
import { getSubmodulesByModuleId } from "../api/submodule/submoduleget";
import { getReleaseTestCasesByFiltersGroup } from "../api/releasetestcase";
import { getSeverities } from "../api/severity";
import { getDefectTypes } from "../api/defectType";
import { Modal } from "../components/ui/Modal";

interface TestCase {
  id: number;
  testCaseId: string;
  description: string;
  steps: string;
  type: string;
  severity: string;
  assignedBy: string;
  assignedTo: string;
  executionStatus: string;
  defectId: string;
}

interface Module {
  id: string;
  name: string;
}

export const ReleaseDetails: React.FC = () => {
  const { projectId, releaseId } = useParams();
  const navigate = useNavigate();
  const [modules, setModules] = useState<Module[]>([]);
  const [selectedModule, setSelectedModule] = useState<string>("");
  const [submodules, setSubmodules] = useState<any[]>([]);
  const [selectedSubmoduleId, setSelectedSubmoduleId] = useState<string | null>(null);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(false);
  const [modulesLoading, setModulesLoading] = useState(true);
  const [submodulesLoading, setSubmodulesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modulesError, setModulesError] = useState<string | null>(null);
  const [submodulesError, setSubmodulesError] = useState<string | null>(null);
  const [severities, setSeverities] = useState<{ id: number; name: string; color: string }[]>([]);
  const [defectTypes, setDefectTypes] = useState<{ id: number; defectTypeName: string }[]>([]);
  const [isViewStepsModalOpen, setIsViewStepsModalOpen] = useState(false);
  const [viewingTestCase, setViewingTestCase] = useState<TestCase | null>(null);

  useEffect(() => {
    if (projectId) {
      setModulesLoading(true);
      setModulesError(null);
      getModulesByProjectId(projectId)
        .then(async (res) => {
          const fetchedModules: Module[] = (res.data || []).map((mod: any) => ({
            id: String(mod.id),
            name: mod.moduleName || mod.name,
          }));

          // If we don't have a releaseId yet, keep the modules as-is
          if (!releaseId) {
            setModules(fetchedModules);
            return;
          }

          // Filter modules by keeping only those that have at least one submodule
          // with test cases allocated to this release
          const filteredModules: Module[] = [];
          for (const mod of fetchedModules) {
            try {
              const subRes = await getSubmodulesByModuleId(Number(mod.id));
              const submods = subRes?.data || [];

              if (!Array.isArray(submods) || submods.length === 0) {
                continue;
              }

              // Check test cases for submodules; include module if any submodule has data
              let moduleHasData = false;
              for (const sm of submods) {
                try {
                  const response = await getReleaseTestCasesByFiltersGroup({
                    projectId: Number(projectId),
                    moduleId: Number(mod.id),
                    subModuleId: Number((sm as any).subModuleId),
                    releaseId: Number(releaseId),
                  });

                  let data: any[] = [];
                  if (response && Array.isArray((response as any).data)) {
                    data = (response as any).data;
                  } else if (Array.isArray(response)) {
                    data = response as any[];
                  }

                  if (data.length > 0) {
                    moduleHasData = true;
                    break;
                  }
                } catch (err) {
                  // Ignore per-submodule failures and keep checking others
                  console.error("Failed to check test cases for module/submodule", mod.id, (sm as any)?.subModuleId, err);
                }
              }

              if (moduleHasData) {
                filteredModules.push(mod);
              }
            } catch (err) {
              console.error("Failed to load submodules for module", mod.id, err);
            }
          }

          setModules(filteredModules);
        })
        .catch((err) => {
          console.error('Error loading modules:', err);
          setModulesError("Failed to load modules");
          setModules([]);
        })
        .finally(() => {
          setModulesLoading(false);
        });
    }
  }, [projectId, releaseId]);

  useEffect(() => {
    getSeverities().then(res => {
      console.log('Loaded severities:', res.data);
      setSeverities(res.data);
    }).catch(err => {
      console.error('Error loading severities:', err);
    });
    getDefectTypes().then(res => setDefectTypes(res.data)).catch(err => {
      console.error('Error loading defect types:', err);
    });
  }, []);

  const handleModuleSelect = (moduleId: string) => {
    setSelectedModule(moduleId);
    setSelectedSubmoduleId(null);
    setTestCases([]);
    setSubmodulesLoading(true);
    setSubmodulesError(null);
    
    // Fetch test cases for the entire module when module is selected
    if (projectId && releaseId) {
      setLoading(true);
      setError(null);
      
      // Try to fetch test cases for the module without specific submodule
      // We'll use the first submodule as a fallback if needed
      getSubmodulesByModuleId(Number(moduleId))
        .then(async (res) => {
          const allSubmodules = (res.data || []);
          
          // First, try to get test cases for the entire module by aggregating from all submodules
          try {
            const allTestCases: any[] = [];
            
            // Fetch test cases from all submodules and aggregate them
            for (const sm of allSubmodules) {
              try {
                const response = await getReleaseTestCasesByFiltersGroup({
                  projectId: Number(projectId),
                  moduleId: Number(moduleId),
                  subModuleId: Number((sm as any).subModuleId),
                  releaseId: Number(releaseId),
                });

                let testCaseData = [];
                if (response && Array.isArray((response as any).data)) {
                  testCaseData = (response as any).data;
                } else if (Array.isArray(response)) {
                  testCaseData = response as any[];
                }

                // Add test cases to the aggregated list
                allTestCases.push(...testCaseData);
              } catch (err) {
                console.error("Failed to fetch test cases for submodule", (sm as any)?.subModuleId, err);
                // Continue with other submodules
              }
            }

            if (allTestCases.length > 0) {
              // Remove duplicates based on test case ID
              const uniqueTestCases = allTestCases.filter((tc, index, self) => 
                index === self.findIndex(t => t.id === tc.id)
              );

              // Map the test cases
              const mappedTestCases = uniqueTestCases.map((tc: any) => {
                // Handle severity mapping
                let severity = 'N/A';
                if (tc.severity) {
                  severity = tc.severity;
                } else if (tc.severityName) {
                  severity = tc.severityName;
                } else if (tc.severityId && severities.length > 0) {
                  const severityObj = severities.find(s => s.id === tc.severityId);
                  severity = severityObj ? severityObj.name : 'N/A';
                }
                
                // Handle type mapping
                let type = 'N/A';
                if (tc.type) {
                  type = tc.type;
                } else if (tc.testCaseType) {
                  type = tc.testCaseType;
                } else if (tc.defectTypeId && defectTypes.length > 0) {
                  const typeObj = defectTypes.find(dt => dt.id === tc.defectTypeId);
                  type = typeObj ? typeObj.defectTypeName : 'N/A';
                }
                
                return {
                  id: tc.id,
                  testCaseId: tc.testCaseId,
                  description: tc.description,
                  steps: tc.steps,
                  type: type,
                  severity: severity,
                  assignedBy: tc.assignedBy || 'N/A',
                  assignedTo: tc.assignedTo,
                  executionStatus: tc.executionStatus,
                  defectId: tc.defectId
                };
              });
              setTestCases(mappedTestCases);
            }
          } catch (err) {
            console.error("Failed to fetch test cases for module:", err);
            // If that fails, we'll continue with the submodule filtering logic below
          }

          // Continue with submodule filtering logic
          if (!projectId || !releaseId) {
            setSubmodules(allSubmodules);
            return;
          }

          try {
            // For each submodule, check if it has test cases for this release
            const checks = await Promise.all(
              allSubmodules.map(async (sm: any) => {
                try {
                  const response = await getReleaseTestCasesByFiltersGroup({
                    projectId: Number(projectId),
                    moduleId: Number(moduleId),
                    subModuleId: Number(sm.subModuleId),
                    releaseId: Number(releaseId),
                  });

                  let data: any[] = [];
                  if (response && Array.isArray((response as any).data)) {
                    data = (response as any).data;
                  } else if (Array.isArray(response)) {
                    data = response as any[];
                  }

                  return data.length > 0 ? sm : null;
                } catch (err) {
                  console.error("Failed to check test cases for submodule", sm?.subModuleId, err);
                  return null;
                }
              })
            );

            const filtered = checks.filter(Boolean) as any[];
            setSubmodules(filtered);
          } catch (err) {
            console.error("Error while filtering submodules by test cases", err);
            setSubmodules(allSubmodules);
          }
        })
        .catch((err) => {
          console.error('Error loading submodules:', err);
          setSubmodulesError("Failed to load submodules");
          setSubmodules([]);
        })
        .finally(() => {
          setSubmodulesLoading(false);
          setLoading(false);
        });
    } else {
      // If no projectId or releaseId, just load submodules
      getSubmodulesByModuleId(Number(moduleId))
        .then((res) => {
          setSubmodules(res.data || []);
        })
        .catch((err) => {
          console.error('Error loading submodules:', err);
          setSubmodulesError("Failed to load submodules");
          setSubmodules([]);
        })
        .finally(() => {
          setSubmodulesLoading(false);
        });
    }
  };

  const handleSubmoduleSelect = (submoduleId: string) => {
    setSelectedSubmoduleId(submoduleId);
    setTestCases([]);
    if (projectId && selectedModule && submoduleId && releaseId) {
      setLoading(true);
      setError(null);
      getReleaseTestCasesByFiltersGroup({
        projectId: Number(projectId),
        moduleId: Number(selectedModule),
        subModuleId: Number(submoduleId),
        releaseId: Number(releaseId)
      })
        .then((res) => {
          console.log('API Response:', res); // Debug log
          
          // Check if res exists and has the expected structure
          if (!res) {
            setError("No response received from API");
            return;
          }
          
          // Handle different possible response structures
          let testCaseData = [];
          if (res.data && Array.isArray(res.data)) {
            testCaseData = res.data;
          } else if (Array.isArray(res)) {
            testCaseData = res;
          } else {
            console.error('Unexpected response structure:', res);
            setError("Unexpected response structure from API");
            return;
          }
          
          const mappedTestCases = testCaseData.map((tc: any) => {
            // Debug logging for severity
            console.log('Test Case:', tc.testCaseId, 'Raw severity data:', {
              severity: tc.severity,
              severityName: tc.severityName,
              severityId: tc.severityId
            });
            
            // Handle severity mapping - check for different possible field names
            let severity = 'N/A';
            if (tc.severity) {
              severity = tc.severity;
            } else if (tc.severityName) {
              severity = tc.severityName;
            } else if (tc.severityId && severities.length > 0) {
              const severityObj = severities.find(s => s.id === tc.severityId);
              severity = severityObj ? severityObj.name : 'N/A';
            }
            
            // Handle type mapping - check for different possible field names
            let type = 'N/A';
            if (tc.type) {
              type = tc.type;
            } else if (tc.testCaseType) {
              type = tc.testCaseType;
            } else if (tc.defectTypeId && defectTypes.length > 0) {
              const typeObj = defectTypes.find(dt => dt.id === tc.defectTypeId);
              type = typeObj ? typeObj.defectTypeName : 'N/A';
            }
            
            console.log('Mapped severity:', severity, 'Mapped type:', type);
            
            return {
              id: tc.id,
              testCaseId: tc.testCaseId,
              description: tc.description,
              steps: tc.steps,
              type: type,
              severity: severity,
              assignedBy: tc.assignedBy || 'N/A',
              assignedTo: tc.assignedTo,
              executionStatus: tc.executionStatus,
              defectId: tc.defectId
            };
          });
          setTestCases(mappedTestCases);
        })
        .catch((err) => {
          console.error('API Error:', err); // Debug log
          setError(err.message || "Failed to load test cases");
        })
        .finally(() => setLoading(false));
    }
  };

  const getSeverityColor = (severity: string) => {
    if (!severity || severity === 'N/A') return "bg-gray-100 text-gray-800";
    
    // First try to find the severity in the severities array to get the actual color
    const severityObj = severities.find(s => s.name.toLowerCase() === severity.toLowerCase());
    if (severityObj) {
      // Use the actual color from the severities data
      return `bg-[${severityObj.color}] text-white`;
    }
    
    // Fallback to hardcoded colors if severity not found in array
    const severityLower = severity.toLowerCase();
    switch (severityLower) {
      case "critical":
      case "very high":
        return "bg-red-100 text-red-800";
      case "high":
        return "bg-orange-100 text-orange-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      case "very low":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8">
      <Button variant="secondary" onClick={() => navigate(-1)} className="mb-4">&larr; Back to Releases</Button>
      <h1 className="text-2xl font-bold mb-6">Release Details</h1>
      
      {/* Module Selection */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Module Selection</h2>
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
              {modulesLoading ? (
                <div className="p-2">Loading modules...</div>
              ) : modulesError ? (
                <div className="p-2 text-red-500">{modulesError}</div>
              ) : modules.length === 0 ? (
                <div className="p-2 text-gray-500">No modules found for this project.</div>
              ) : (
                modules.map((module: Module) => (
                  <Button
                    key={module.id}
                    variant={selectedModule === module.id ? "primary" : "secondary"}
                    onClick={() => handleModuleSelect(module.id)}
                    className="whitespace-nowrap m-2"
                  >
                    {module.name}
                  </Button>
                ))
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
      
      {/* Show message when no modules are available */}
      {!modulesLoading && !modulesError && modules.length === 0 && (
        <Card className="mb-4">
          <CardContent className="p-6 text-center">
            <div className="text-gray-500">
              <p className="text-lg mb-2">No modules available</p>
              <p className="text-sm">This project doesn't have any modules configured yet.</p>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Submodule Selection */}
      {selectedModule && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Submodule Selection</h2>
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
                {submodulesLoading ? (
                  <div className="p-2">Loading submodules...</div>
                ) : submodulesError ? (
                  <div className="p-2 text-red-500">{submodulesError}</div>
                ) : submodules.length === 0 ? (
                  <div className="p-2 text-gray-500">No submodules found for this module.</div>
                ) : (
                  submodules.map((submodule) => (
                    <Button
                      key={submodule.subModuleId}
                      variant={selectedSubmoduleId === String(submodule.subModuleId) ? "primary" : "secondary"}
                      onClick={() => handleSubmoduleSelect(String(submodule.subModuleId))}
                      className="min-w-max whitespace-nowrap m-2"
                    >
                      {submodule.subModuleName}
                    </Button>
                  ))
                )}
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
      
      {/* Show message when selected module has no submodules */}
      {selectedModule && !submodulesLoading && !submodulesError && submodules.length === 0 && (
        <Card className="mb-4">
          <CardContent className="p-6 text-center">
            <div className="text-gray-500">
              <p className="text-lg mb-2">No submodules available</p>
              <p className="text-sm">The selected module doesn't have any submodules configured yet.</p>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Test Cases Table */}
      {selectedModule && (
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center">Loading test cases...</div>
            ) : error ? (
              <div className="p-8 text-center text-red-500">{error}</div>
            ) : testCases.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                {selectedSubmoduleId 
                  ? "No test cases found for the selected module and submodule." 
                  : "No test cases found for the selected module."}
              </div>
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Assign To
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {testCases.map((testCase: TestCase) => (
                    <tr key={testCase.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{testCase.testCaseId}</td>
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
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          <span>View</span>
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{testCase.type || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {(() => {
                          const severityObj = severities.find(s => s.name.toLowerCase() === (testCase.severity || '').toLowerCase());
                          if (severityObj) {
                            // Use the actual color from severities data
                            return (
                              <span 
                                className="px-2 py-1 rounded-full text-xs font-medium text-white"
                                style={{ backgroundColor: severityObj.color }}
                              >
                                {testCase.severity || 'N/A'}
                              </span>
                            );
                          } else {
                            // Fallback to CSS classes
                            return (
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(testCase.severity || 'low')}`}>
                                {testCase.severity || 'N/A'}
                              </span>
                            );
                          }
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{testCase.assignedTo || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}
      {isViewStepsModalOpen && (
        <Modal
          isOpen={isViewStepsModalOpen}
          onClose={() => {
            setIsViewStepsModalOpen(false);
            setViewingTestCase(null);
          }}
          title={`Test Steps - ${viewingTestCase?.testCaseId}`}
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
      )}
    </div>
  );
};

export default ReleaseDetails; 