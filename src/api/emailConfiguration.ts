import apiClient from "../lib/api";



const BASE_URL = import.meta.env.VITE_BASE_URL ;

export interface CreateSmtpConfigRequest {
  name: string;
  smtpHost: string;
  smtpPort: number;
  username: string;
  password: string;
  fromEmail: string;
  fromName: string;
}

export interface CreateSmtpConfigResponse {
  id: number;
  name: string;
  smtpHost: string;
  smtpPort: number;
  username: string;
  password: string;
  fromEmail: string;
  fromName: string;
}

export const createSmtpConfig = async (data: CreateSmtpConfigRequest): Promise<CreateSmtpConfigResponse> => {
  try {
    const response = await apiClient.post(`${BASE_URL}smtp-config`, data);
    return response.data;
  } catch (error) {
    console.error('Error creating SMTP configuration:', error);
    throw error;
  }
};

export const getSmtpConfigs = async (): Promise<CreateSmtpConfigResponse[]> => {
  try {
    const response = await apiClient.get(`${BASE_URL}smtp-config`);
    const result = response.data;
    console.log('SMTP Config Response:', result); // Debug log

    // Handle different response formats
    if (Array.isArray(result)) {
      return result;
    } else if (result && typeof result === 'object') {
      // If it's a single object, wrap it in an array
      return [result];
    } else {
      // If it's empty or null, return empty array
      return [];
    }
  } catch (error) {
    console.error('Error fetching SMTP configurations:', error);
    throw error;
  }
};

export const updateSmtpConfig = async (id: number, data: CreateSmtpConfigRequest): Promise<CreateSmtpConfigResponse> => {
  try {
    console.log(`Making PUT request to: ${BASE_URL}smtp-config/${id}`);
    console.log('Request body:', JSON.stringify(data, null, 2));
    
    const response = await apiClient.put(`${BASE_URL}smtp-config/${id}`, data);

    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);

    const result = response.data;
    console.log('Updated SMTP Config Response:', result); // Debug log
    return result;
  } catch (error) {
    console.error('Error updating SMTP configuration:', error);
    throw error;
  }
};

export const deleteSmtpConfig = async (id: number): Promise<void> => {
  try {
    console.log(`Making DELETE request to: ${BASE_URL}smtp-config/${id}`);
    
    const response = await apiClient.delete(`${BASE_URL}smtp-config/${id}`);

    console.log('Delete response status:', response.status);
    console.log('Delete response headers:', response.headers);

    console.log('SMTP configuration deleted successfully');
  } catch (error) {
    console.error('Error deleting SMTP configuration:', error);
    throw error;
  }
}; 