import apiClient from "../../lib/api";
import { Module } from "../../types/index";

/**
 * Updates a module by ID
 * @param moduleId - The ID of the module to update
 * @param data - Partial module data to update (e.g., name, submodules)
 * @returns Promise with the updated module
 */
export const updateModule = async (
  moduleId: string,
  data: Partial<Module>
): Promise<{ success: boolean; module?: Module; message?: string }> => {
  try {
    const response = await apiClient.put<{ success: boolean; module?: Module; message?: string }>(
      `modules/${moduleId}`,
      data
    );
    return response.data;
  } catch (error) {
    console.error("Error updating module:", error);
    throw error;
  }
};
