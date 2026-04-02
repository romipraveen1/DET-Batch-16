import apiClient from "../../lib/api";
import { CreateModuleRequest, CreateModuleResponse } from "../../types/index";

/**
 * Creates a new module for a project
 * @param data - Object containing moduleName and projectId
 * @returns Promise with the API response
 */
export const createModule = async (data: CreateModuleRequest): Promise<CreateModuleResponse> => {
  try {
    console.log('Creating module with data:', data);
    const response = await apiClient.post<CreateModuleResponse>("modules", data);
    console.log('Create module API response:', response.data);
    return response.data;
  } catch (error: any) {
    console.error("Error creating module:", error);

    // If the API returned an error response, return it instead of throwing
    if (error.response && error.response.data) {
      console.log('API error response:', error.response.data);
      return error.response.data; // Return the error response so the UI can handle it
    }

    throw error;
  }
};

/**
 * Creates a new submodule for a module
 * @param data - Object containing subModuleName and moduleId
 * @returns Promise with the API response
 */
export const createSubmodule = async (data: { subModuleName: string; moduleId: number }): Promise<any> => {
  try {
    // Use VITE_BASE_URL for the endpoint
    const response = await apiClient.post(
      `subModule`,
      data
    );
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Error creating submodule:", error.response.data);
    } else {
      console.error("Error creating submodule:", error);
    }
    throw error;
  }
};

