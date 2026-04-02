
export interface Priority {
  id: number;
  priority: string;
  color: string;
}

export interface GetPrioritiesResponse {
  status: string;
  message: string;
  data: Priority[];
}

export const getAllPriorities = async (): Promise<GetPrioritiesResponse> => {
    console.log('API: getAllPriorities (Mocked for Demo)');
    return {
        status: 'success',
        message: 'Fetched (Mocked)',
        data: [
            { id: 1, priority: 'Low', color: '#3B82F6' },
            { id: 2, priority: 'Medium', color: '#F59E0B' },
            { id: 3, priority: 'High', color: '#EF4444' },
            { id: 4, priority: 'Critical', color: '#7C3AED' }
        ]
    };
};

export const updatePriority = async (id: number, data: { priority: string; color: string }) => {
    console.log('API: updatePriority (Mocked for Demo)', { id, data });
    return { status: 'success', message: 'Updated (Mocked)' };
};

export const deletePriority = async (id: number) => {
    console.log('API: deletePriority (Mocked for Demo)', id);
    return { status: 'success', message: 'Deleted (Mocked)' };
};

export const createPriority = async (data: { priority: string; color: string }) => {
    console.log('API: createPriority (Mocked for Demo)', data);
    return { status: 'success', message: 'Created (Mocked)' };
};