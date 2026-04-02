
import apiClient from "../../lib/api";

const BASE_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:8080/api/v1/';

export const deleteProject = async (projectId: string): Promise<any> => {
  try {
    console.log('Deleting project with ID:', projectId);
    console.log('Using BASE_URL:', BASE_URL);
    const url = `${BASE_URL}projects/${projectId}`;
    console.log('Delete URL:', url);
    
    const response = await apiClient.delete(url);
    console.log('Delete response:', response);
    return response.data;
  } catch (error: any) {
    console.error('Delete project error:', error);
    console.error('Error response:', error.response);
    throw new Error('Project Can\'t Delete');
  }
}; 