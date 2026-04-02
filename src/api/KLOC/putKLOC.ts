
export interface StandardResponse {
  status: string;
  message: string;
  data: any;
  statusCode: number;
}

export const updateProjectKloc = async (projectId: number, kloc: number): Promise<StandardResponse> => {
  console.log('API: updateProjectKloc (Mocked for Demo)', { projectId, kloc });
  return {
    status: 'success',
    message: 'KLOC updated successfully (Mocked)',
    data: { projectId, kloc },
    statusCode: 200
  };
};

export const createKloc = async (payload: { projectId: number; kloc: number }, projectId: number): Promise<StandardResponse> => {
  return updateProjectKloc(projectId, payload.kloc);
};
