import apiClient from '../../lib/api'; // Import your centralized API client

export interface QAMember {
  userId: number;
  userFullName: string;
}

export interface QAMembersResponse {
  status: string;
  statusCode: number;
  message: string;
  data: QAMember[];
}

export const getQAMembersByProjectId = async (projectId: number): Promise<QAMembersResponse> => {
  try {
    // Using the centralized apiClient which automatically handles auth headers
    const response = await apiClient.get(`projectAllocations/quality-lead/${projectId}`);
    return response.data;
  } catch (error: unknown) {
    if (error instanceof Error && 'response' in error) {
      const axiosError = error as { response?: { status: number, data?: { message?: string } } };
      
      if (axiosError.response?.status === 404) {
        throw new Error('No QA members found for this project');
      }
      if (axiosError.response?.status === 403) {
        throw new Error('You do not have permission to access QA members');
      }
      if (axiosError.response?.status === 401) {
        throw new Error('Session expired. Please login again.');
      }
      throw new Error(axiosError.response?.data?.message || 'Failed to fetch QA members');
    }
    throw new Error('Failed to fetch QA members');
  }
};