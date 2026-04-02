
/// <reference types="vite/client" />

export interface Modules {
  id: number;
  moduleId: string;
  moduleName: string;
  projectId: string;
  submodules?: Submodule[];
  assignedDevs?: string[];
}

export interface Submodule {
  id: number;
  subModuleId: string;
  getSubModuleName: string;
  moduleId: number;
  assignedDevs?: string[];
  name?: string;
  submoduleName?: string;
}

export interface CreateReleaseResponse {
  status: string;
  message: string;
  data: Modules[];
  statusCode: number;
}

export const getModulesByProjectId = (projectId: string | number): Promise<CreateReleaseResponse> => {
  console.log('API: getModulesByProjectId (Mocked for Demo)', projectId);
  
  const projectStr = String(projectId);
  let mockModules: Modules[] = [];

  if (projectStr === 'PR001') {
    mockModules = [
      { id: 1, moduleId: 'MD001', moduleName: 'Authentication', projectId: projectStr, submodules: [
        { id: 101, subModuleId: 'SM001', getSubModuleName: 'Login API', moduleId: 1 },
        { id: 102, subModuleId: 'SM002', getSubModuleName: 'JWT Validation', moduleId: 1 }
      ]},
      { id: 2, moduleId: 'MD002', moduleName: 'Payment Gateway', projectId: projectStr, submodules: [
        { id: 201, subModuleId: 'SM201', getSubModuleName: 'Stripe Integration', moduleId: 2 },
        { id: 202, subModuleId: 'SM202', getSubModuleName: 'Refund Logic', moduleId: 2 }
      ]}
    ];
  } else if (projectStr === 'PR002') {
    mockModules = [
      { id: 3, moduleId: 'MD003', moduleName: 'E-commerce Engine', projectId: projectStr, submodules: [
        { id: 301, subModuleId: 'SM301', getSubModuleName: 'Cart Logic', moduleId: 3 }
      ]},
      { id: 4, moduleId: 'MD004', moduleName: 'Inventory Sync', projectId: projectStr }
    ];
  } else if (projectStr === 'PR003') {
    mockModules = [
      { id: 5, moduleId: 'MD005', moduleName: 'CRM Dashboard', projectId: projectStr },
      { id: 6, moduleId: 'MD006', moduleName: 'Lead Management', projectId: projectStr }
    ];
  } else {
    mockModules = [
      { id: 100, moduleId: `MD-${projectStr}-01`, moduleName: 'Core Engine', projectId: projectStr },
      { id: 101, moduleId: `MD-${projectStr}-02`, moduleName: 'UI Components', projectId: projectStr }
    ];
  }

  return Promise.resolve({
    status: 'success',
    message: 'Mocked for demo',
    statusCode: 200,
    data: mockModules
  });
};

export async function getAllocatedUsersByModuleId(moduleId: string | number) {
  console.log('API: getAllocatedUsersByModuleId (Mocked for Demo)', moduleId);
  return [];
}

export async function getUsersByAllocation(projectId: string | number, moduleId: string | number, subModuleId?: string | number) {
  console.log('API: getUsersByAllocation (Mocked for Demo)', { projectId, moduleId, subModuleId });
  return [];
}
