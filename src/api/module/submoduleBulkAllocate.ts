
import apiClient from "../../lib/api";

const BASE_URL = import.meta.env.VITE_BASE_URL ;

export const submoduleBulkAllocate = async (
  projectId: number,
  moduleId: number,
  subModuleId: number,
  userIds: number[]
) => {
  try {
    const response = await apiClient.post(`${BASE_URL}allocateModule/bulk-allocate`, {
      projectId,
      moduleId,
      subModuleId,
      userIds,
    });
    return response.data;
  } catch (error) {
    console.error("Bulk allocation failed:", error);
    throw error;
  }
};
