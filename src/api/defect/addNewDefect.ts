
export interface DefectCreate {
  description: string;
  steps: string;
  projectId: number;
  severityId: number;
  priorityId: number;
  defectStatusId: number;
  typeId: number;
  reOpenCount: number;
  attachment?: string | null;
  assignbyId?: number | null;
  assigntoId?: number;
  modulesId: number;
  subModuleId?: number | null;
  releasesId?: number | null;
  testCaseRequired?: boolean;
}

export interface DefectCreateProps {
  message: string;
  data: DefectCreate[];
  status: string;
  statusCode: number;
}

export const addDefects = async (payload: DefectCreate | FormData): Promise<DefectCreateProps> => {
  console.log('API: addDefects (Mocked for Demo)', payload);
  const data = payload instanceof FormData ? {} as any : payload;
  return {
    status: 'success',
    message: 'Defect added successfully (Mocked)',
    data: [data],
    statusCode: 201
  };
};
