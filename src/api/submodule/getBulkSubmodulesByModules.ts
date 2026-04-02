import apiClient from "../../lib/api";

export interface BulkSubmodule {
  subModuleId: number;
  subModuleName: string;
  moduleId: number;
  moduleName: string;
}

export interface GetBulkSubmodulesResponse {
  status?: string;
  message?: string;
  data?: BulkSubmodule[];
  statusCode?: number;
}

/**
 * Get submodules for multiple modules using bulk API endpoint
 * @param projectId - The project ID
 * @param moduleIds - Array of module IDs or comma-separated string
 * @returns Promise resolving to array of submodules grouped by modules
 */
export const getBulkSubmodulesByModules = async (
  projectId: string | number,
  moduleIds: number[] | string
): Promise<BulkSubmodule[]> => {
  try {
    // Convert moduleIds to comma-separated string if it's an array
    const moduleIdsParam = Array.isArray(moduleIds) 
      ? moduleIds.join(',') 
      : moduleIds;

    console.log('Calling bulk submodules API:', {
      projectId: String(projectId),
      moduleIds: moduleIdsParam
    });

    const response = await apiClient.get<BulkSubmodule[] | GetBulkSubmodulesResponse>(
      `subModule/bulk-by-modules`,
      {
        params: {
          projectId: String(projectId),
          moduleIds: moduleIdsParam
        },
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

    console.log('getBulkSubmodulesByModules response:', response.data);

    // Handle different response structures
    if (Array.isArray(response.data)) {
      return response.data;
    } else if (response.data && 'data' in response.data) {
      if (Array.isArray(response.data.data)) {
        return response.data.data;
      } else {
        console.warn('Response data.data is not an array:', response.data.data);
        return [];
      }
    } else if (response.data && 'status' in response.data && response.data.status === 'success') {
      // Handle case where data might be directly in response
      return [];
    } else {
      console.warn('Unexpected response structure:', response.data);
      return [];
    }
  } catch (error) {
    console.error("Error fetching bulk submodules:", error);
    throw error;
  }
};
