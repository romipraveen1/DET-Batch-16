
// --- Interfaces ---

export interface CreateDefectTypePayload {
    defectTypeName: string;
}

export interface CreateDefectTypeResponse {
    status: string;
    message: string;
    statusCode: number;
    data: {
        id: number;
        defectTypeName: string;
    };
}

export interface ApiDefectType {
    id: number;
    defectTypeName: string;
    description: string;
    category: 'functional' | 'performance' | 'security' | 'usability' | 'compatibility' | 'other';
    severity: 'low' | 'medium' | 'high' | 'critical';
    priority: 'low' | 'medium' | 'high' | 'critical';
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface GetDefectTypesResponse {
    status: string;
    message: string;
    statusCode: number;
    data: ApiDefectType[];
}

export interface GetDefectTypeByIdResponse {
    status: string;
    message: string;
    statusCode: number;
    data: ApiDefectType;
}

export interface UpdateDefectTypePayload {
    defectTypeName: string;
    description: string;
    category: 'functional' | 'performance' | 'security' | 'usability' | 'compatibility' | 'other';
    severity: 'low' | 'medium' | 'high' | 'critical';
    priority: 'low' | 'medium' | 'high' | 'critical';
    isActive: boolean;
}

export interface UpdateDefectTypeResponse {
    status: string;
    message: string;
    statusCode: number;
    data: {
        id: number;
        defectTypeName: string;
    };
}

export interface DeleteDefectTypeResponse {
    status: string;
    message: string;
    statusCode: number;
}

// --- Mocked Functions ---

export const createDefectType = async (payload: CreateDefectTypePayload): Promise<CreateDefectTypeResponse> => {
    console.log('API: createDefectType (Mocked for Demo)', payload);
    return {
        status: 'success',
        message: 'Created (Mocked)',
        statusCode: 201,
        data: { id: Math.floor(Math.random() * 1000), defectTypeName: payload.defectTypeName }
    };
};

export const getDefectTypes = async (): Promise<GetDefectTypesResponse> => {
    console.log('API: getDefectTypes (Mocked for Demo)');
    const now = new Date().toISOString();
    return {
        status: 'success',
        message: 'Fetched (Mocked)',
        statusCode: 200,
        data: [
            { id: 1, defectTypeName: 'UI Bug', description: 'User interface issues', category: 'usability', severity: 'low', priority: 'low', isActive: true, createdAt: now, updatedAt: now },
            { id: 2, defectTypeName: 'Functional Bug', description: 'Feature not working', category: 'functional', severity: 'high', priority: 'high', isActive: true, createdAt: now, updatedAt: now },
            { id: 3, defectTypeName: 'Security Vulnerability', description: 'Data leak risk', category: 'security', severity: 'critical', priority: 'critical', isActive: true, createdAt: now, updatedAt: now }
        ]
    };
};

export const getDefectTypeById = async (id: string): Promise<GetDefectTypeByIdResponse> => {
    console.log('API: getDefectTypeById (Mocked for Demo)', id);
    const now = new Date().toISOString();
    return {
        status: 'success',
        message: 'Fetched (Mocked)',
        statusCode: 200,
        data: { id: Number(id), defectTypeName: 'Sample Type', description: 'Sample description', category: 'functional', severity: 'medium', priority: 'medium', isActive: true, createdAt: now, updatedAt: now }
    };
};

export const updateDefectType = async (id: string, payload: UpdateDefectTypePayload): Promise<UpdateDefectTypeResponse> => {
    console.log('API: updateDefectType (Mocked for Demo)', { id, payload });
    return {
        status: 'success',
        message: 'Updated (Mocked)',
        statusCode: 200,
        data: { id: Number(id), defectTypeName: payload.defectTypeName }
    };
};

export const deleteDefectType = async (id: string): Promise<DeleteDefectTypeResponse> => {
    console.log('API: deleteDefectType (Mocked for Demo)', id);
    return {
        status: 'success',
        message: 'Deleted (Mocked)',
        statusCode: 200
    };
};