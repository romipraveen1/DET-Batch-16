
export async function getSubmodulesByModule(moduleId: string | number) {
  console.log('API: getSubmodulesByModule (Mocked for Demo)', moduleId);
  return [
    { id: 101, subModuleId: 'SM001', name: 'Login API' },
    { id: 102, subModuleId: 'SM002', name: 'JWT Validation' }
  ];
}