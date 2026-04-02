
export interface getProjectAllocationHistoryResponse {
  status: string;
  message: string;
  data: any[];
  statusCode: number;
}

export const getProjectAllocationHistory = async (id: number): Promise<getProjectAllocationHistoryResponse> => {
  console.log('API: getProjectAllocationHistory (Mocked for Demo)', id);
  return {
    status: 'success',
    message: 'Fetched (Mocked)',
    statusCode: 200,
    data: [
      { id: 1, employeeName: 'Alice Johnson', role: 'Frontend Developer', allocationPercent: 100, startDate: '2024-01-01', endDate: '2024-12-31' },
      { id: 2, employeeName: 'Bob Wilson', role: 'QA Engineer', allocationPercent: 50, startDate: '2024-03-10', endDate: '2024-06-10' }
    ]
  };
};

export const getProjectAllocationHistoryByRole = async (projectId: number, roleId?: string): Promise<getProjectAllocationHistoryResponse> => {
  console.log('API: getProjectAllocationHistoryByRole (Mocked for Demo)', { projectId, roleId });
  return getProjectAllocationHistory(projectId);
};
