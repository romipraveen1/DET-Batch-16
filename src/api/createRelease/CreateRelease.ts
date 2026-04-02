
export interface CreateReleaseRequest {
  releaseName: string;
  releaseDate: string; // YYYY-MM-DD
  releaseType: string;
  projectId: number;
  releaseStatus?: string;
  description?: string;
  version?: string;
}

export interface CreateReleaseResponse {
  status: string;
  message: string;
  data: CreateReleaseRequest[];
  statusCode: number;
}

export const createRelease = async (payload: CreateReleaseRequest): Promise<CreateReleaseResponse> => {
  console.log('API: createRelease (Mocked for Demo)', payload);
  return {
    status: 'success',
    message: 'Release created successfully (Mocked)',
    data: [payload],
    statusCode: 201
  };
};
