


let BASE_URL = import.meta.env.VITE_BASE_URL || "/api/v1/";
// Ensure BASE_URL ends with a slash
if (BASE_URL && !BASE_URL.endsWith("/")) {
  BASE_URL = BASE_URL + "/";
}
// Updated function to accept both projectId and moduleId
export const getDevelopersByModuleId = async (projectId: number, moduleId: number) => {
  console.log('API: getDevelopersByModuleId (Mocked for Demo)', { projectId, moduleId });
  return []; // Mocked empty list
};

// Function to get developers allocated to a submodule
export const getDevelopersBySubmoduleId = async (projectId: number, moduleId: number, submoduleId: number) => {
  console.log('API: getDevelopersBySubmoduleId (Mocked for Demo)', { projectId, moduleId, submoduleId });
  return []; // Mocked empty list
};