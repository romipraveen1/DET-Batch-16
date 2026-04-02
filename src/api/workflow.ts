
// Define interfaces for the workflow API
export interface WorkflowTransition {
  fromStatusId: number;
  toStatusId: number;
  isInitialStatus: boolean;
}

export interface SaveWorkflowRequest {
  transitions: WorkflowTransition[];
}

export interface SaveWorkflowResponse {
  status: string;
  message: string;
  data?: any;
  statusCode: number;
}

export interface StatusInfo {
  id: number;
  defectStatusName: string;
  colorCode: string;
}

export interface WorkflowTransitionResponse {
  fromStatus: StatusInfo;
  toStatus: StatusInfo;
}

export interface GetAllWorkflowsResponse {
  status: string;
  message: string;
  data: WorkflowTransitionResponse[];
  statusCode: number;
}

export interface NextStatusResponse {
  status: string;
  message: string;
  data: StatusInfo[];
  statusCode: number;
}

// GET - Fetch all workflows
export const getAllWorkflows = async (): Promise<GetAllWorkflowsResponse> => {
    console.log('API: getAllWorkflows (Mocked for Demo)');
    return {
        status: 'success',
        message: 'Fetched (Mocked)',
        statusCode: 200,
        data: [
            { fromStatus: { id: 1, defectStatusName: 'NEW', colorCode: '#2a3eb1' }, toStatus: { id: 2, defectStatusName: 'OPEN', colorCode: '#9c27b0' } },
            { fromStatus: { id: 2, defectStatusName: 'OPEN', colorCode: '#9c27b0' }, toStatus: { id: 4, defectStatusName: 'FIXED', colorCode: '#F59E0B' } },
            { fromStatus: { id: 4, defectStatusName: 'FIXED', colorCode: '#F59E0B' }, toStatus: { id: 5, defectStatusName: 'CLOSED', colorCode: '#EF4444' } }
        ]
    };
};

// POST - Save workflow transitions
export const saveWorkflow = async (workflowData: SaveWorkflowRequest): Promise<SaveWorkflowResponse> => {
    console.log('API: saveWorkflow (Mocked for Demo)', workflowData);
    return {
        status: 'success',
        message: 'Saved (Mocked)',
        statusCode: 200
    };
};

// GET - Fetch next available statuses for a given status
export const getNextStatuses = async (fromStatusId: number): Promise<NextStatusResponse> => {
    console.log(`API: getNextStatuses (Mocked for Demo) for ${fromStatusId}`);
    return {
        status: 'success',
        message: 'Fetched (Mocked)',
        statusCode: 200,
        data: [
            { id: 2, defectStatusName: 'OPEN', colorCode: '#9c27b0' },
            { id: 3, defectStatusName: 'REJECT', colorCode: '#10B981' }
        ]
    };
};
