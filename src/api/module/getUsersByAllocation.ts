
export interface UserByAllocation {
  userId: number;
  userName: string;
  userRole?: string;
  userWithRole: string;
  allocateModuleId?: number;
  allocationId?: number;
  moduleName?: string;
  projectName?: string;
  moduleId?: number;
  projectId?: number;
  subModuleId?: number;
}

export const getUsersByAllocation = async (projectId: number, moduleId: number): Promise<UserByAllocation[]> => {
  console.log('API: getUsersByAllocation (Mocked for Demo)', { projectId, moduleId });
  return [
    { userId: 2, userName: 'Dev User', userRole: 'Developer', userWithRole: 'Dev User-Developer', allocateModuleId: 1, moduleId, projectId }
  ];
};

export const getUsersBySubmoduleAllocation = async (projectId: number, moduleId: number, subModuleId: number): Promise<UserByAllocation[]> => {
  console.log('API: getUsersBySubmoduleAllocation (Mocked for Demo)', { projectId, moduleId, subModuleId });
  return [
    { userId: 2, userName: 'Dev User', userRole: 'Developer', userWithRole: 'Dev User-Developer', allocationId: 1, moduleId, projectId, subModuleId }
  ];
};

export const getUsersByModuleSubmoduleAllocation = async (projectId: number, moduleId: number, subModuleId: number): Promise<UserByAllocation[]> => {
  console.log('API: getUsersByModuleSubmoduleAllocation (Mocked for Demo)', { projectId, moduleId, subModuleId });
  return [
    { userId: 2, userName: 'Dev User', userRole: 'Developer', userWithRole: 'Dev User-Developer', allocationId: 1, moduleId, projectId, subModuleId }
  ];
};
