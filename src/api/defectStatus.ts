
export interface DefectStatus {
  color: any;
  name: any;
  id: number;
  defectStatusName: string;
  colorCode: string;
}

export interface DefectStatusResponse {
  status: string;
  message: string;
  data: DefectStatus[];
  statusCode: number;
}

export interface CreateDefectStatusRequest {
  defectStatusName: string;
  colorCode: string;
}

export interface UpdateDefectStatusRequest {
  defectStatusName: string;
  colorCode: string;
}

export const getAllDefectStatuses = async (): Promise<DefectStatusResponse> => {
  console.log('API: getAllDefectStatuses (Mocked for Demo)');
  return {
    status: 'success',
    message: 'Mocked for demo',
    statusCode: 200,
    data: [
      { id: 1, defectStatusName: 'NEW', colorCode: '#2a3eb1', name: 'NEW', color: '#2a3eb1' },
      { id: 2, defectStatusName: 'OPEN', colorCode: '#9c27b0', name: 'OPEN', color: '#9c27b0' },
      { id: 3, defectStatusName: 'REJECT', colorCode: '#10B981', name: 'REJECT', color: '#10B981' },
      { id: 4, defectStatusName: 'FIXED', colorCode: '#F59E0B', name: 'FIXED', color: '#F59E0B' },
      { id: 5, defectStatusName: 'CLOSED', colorCode: '#EF4444', name: 'CLOSED', color: '#EF4444' },
      { id: 6, defectStatusName: 'REOPEN', colorCode: '#06B6D4', name: 'REOPEN', color: '#06B6D4' },
      { id: 7, defectStatusName: 'DUPLICATE', colorCode: '#618833', name: 'DUPLICATE', color: '#618833' },
      { id: 8, defectStatusName: 'HOLD', colorCode: '#ffeb3b', name: 'HOLD', color: '#ffeb3b' },
    ]
  };
};

export const createDefectStatus = async (statusData: CreateDefectStatusRequest): Promise<any> => {
  console.log('API: createDefectStatus (Mocked for Demo)', statusData);
  return { status: 'success', message: 'Created (Mocked)', statusCode: 201 };
};

export const updateDefectStatus = async (id: number, statusData: UpdateDefectStatusRequest): Promise<any> => {
  console.log('API: updateDefectStatus (Mocked for Demo)', { id, statusData });
  return { status: 'success', message: 'Updated (Mocked)', statusCode: 200 };
};

export const deleteDefectStatus = async (id: number): Promise<any> => {
  console.log('API: deleteDefectStatus (Mocked for Demo)', id);
  return { status: 'success', message: 'Deleted (Mocked)', statusCode: 200 };
};