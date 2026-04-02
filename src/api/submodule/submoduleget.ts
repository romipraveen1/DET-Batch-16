
export interface Submodule {
  id: number;
  name: string;
  submoduleName?: string;
}

export interface GetSubmodulesResponse {
  status: string;
  message: string;
  data: Submodule[];
  statusCode: number;
}

export const getSubmodulesByModuleId = async (moduleId: number): Promise<GetSubmodulesResponse> => {
  console.log('API: getSubmodulesByModuleId (Mocked for Demo)', moduleId);
  return {
    status: 'success',
    message: 'Fetched (Mocked)',
    statusCode: 200,
    data: [
      { id: 101, name: 'Login API', submoduleName: 'Login API' },
      { id: 102, name: 'JWT Validation', submoduleName: 'JWT Validation' }
    ]
  };
};
