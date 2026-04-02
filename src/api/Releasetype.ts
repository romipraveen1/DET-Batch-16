
// Interfaces for ReleaseType API
export interface ReleaseType {
  id: number;
  releaseTypeName: string;
}

export interface ReleaseTypeResponse {
  status: string;
  message: string;
  data: ReleaseType[];
  statusCode: number;
}

export interface CreateReleaseTypeRequest {
  releaseTypeName: string;
}

export interface UpdateReleaseTypeRequest {
  releaseTypeName: string;
}

// GET - Fetch all release types
export const getAllReleaseTypes = async (): Promise<ReleaseTypeResponse> => {
    console.log('API: getAllReleaseTypes (Mocked for Demo)');
    return {
        status: 'success',
        message: 'Fetched (Mocked)',
        statusCode: 200,
        data: [
            { id: 1, releaseTypeName: 'Major Release' },
            { id: 2, releaseTypeName: 'Minor Release' },
            { id: 3, releaseTypeName: 'Patch' }
        ]
    };
};

// POST - Create a new release type
export const createReleaseType = async (data: CreateReleaseTypeRequest): Promise<ReleaseType> => {
    console.log('API: createReleaseType (Mocked for Demo)', data);
    return { id: Math.floor(Math.random() * 100), releaseTypeName: data.releaseTypeName };
};

// PUT - Update an existing release type
export const updateReleaseType = async (id: number, data: UpdateReleaseTypeRequest): Promise<ReleaseType> => {
    console.log('API: updateReleaseType (Mocked for Demo)', { id, data });
    return { id, releaseTypeName: data.releaseTypeName };
};

// DELETE - Delete a release type
export const deleteReleaseType = async (id: number): Promise<any> => {
    console.log('API: deleteReleaseType (Mocked for Demo)', id);
    return { status: 'success', message: 'Deleted (Mocked)' };
};