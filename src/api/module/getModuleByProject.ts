
export async function getModulesByProject(projectId: string | number) {
  console.log('API: getModulesByProject (Mocked for Demo)', projectId);
  return [
    { id: 1, moduleId: 'MD001', moduleName: 'Authentication' },
    { id: 2, moduleId: 'MD002', moduleName: 'Payment Gateway' }
  ];
}