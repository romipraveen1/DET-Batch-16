
export interface UpdateReleaseStatusResponse {
  message: string;
  status: string;
  statusCode: string;
}

export const updateReleaseStatus = async (
  releaseId: number,
  status: 'ACTIVE' | 'HOLD'
): Promise<UpdateReleaseStatusResponse> => {
  console.log('API: updateReleaseStatus (Mocked for Demo)', { releaseId, status });
  return {
    message: `Release ${status === 'ACTIVE' ? 'activated' : 'put on hold'} successfully (Mocked)`,
    status: 'success',
    statusCode: '200'
  };
}; 