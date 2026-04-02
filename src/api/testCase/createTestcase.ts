
export interface CreateTestCaseRequest {
  subModuleId: number | null;
  moduleId: number;
  steps: string;
  severityId: number;
  projectId: number;
  description: string;
  defectTypeId: number;
}

export interface CreateTestCaseResponse {
  status: string;
  message: string;
  data: CreateTestCaseRequest[];
  statusCode: number;
}

export const createTestCase = async (payload: CreateTestCaseRequest[]): Promise<CreateTestCaseResponse> => {
  console.log('API: createTestCase (Mocked for Demo)', payload);
  return {
    status: 'success',
    message: 'Test cases created successfully (Mocked)',
    data: payload,
    statusCode: 201
  };
};
