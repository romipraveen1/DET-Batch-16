let BASE_URL = import.meta.env.VITE_BASE_URL || "/api/v1/";
// Ensure BASE_URL ends with a slash
if (BASE_URL && !BASE_URL.endsWith("/")) {
  BASE_URL = BASE_URL + "/";
}

// Get bulk submodule allocations for a given project, module, and submodule
export const getBulkSuboduleAllocation = async (projectId: number, moduleId: number, submoduleId: number) => {
  console.log('API: getBulkSuboduleAllocation (Mocked for Demo)', { projectId, moduleId, submoduleId });
  return [];
};