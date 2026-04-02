import apiClient from "../../lib/api";

/**
 * Updates a submodule by ID
 * @param submoduleId - The ID of the submodule to update
 * @param data - Object containing the updated submodule data (e.g., subModuleName)
 * @returns Promise with the API response
 */
export const updateSubmodule = async (
  submoduleId: number, 
  data: { subModuleName: string }
): Promise<{ status: string; statusCode?: string; data?:any[]; message?: string ; success?: boolean }> => {
  try {
    const response = await apiClient.put<{ status: string; statusCode?: string; data?:any[]; message?: string ; success?: boolean }>(
      `subModule/${submoduleId}`,
      data
    );
    return response.data;
  } catch (error) {
    console.error("Error updating submodule:", error);
    throw error;
  }
}; 