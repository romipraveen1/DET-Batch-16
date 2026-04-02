
export async function getDefectsByModule(projectId: string) {
  console.log('API: getDefectsByModule (Mocked for Demo)', projectId);
  return {
    status: 'success',
    data: [
      { moduleName: 'Authentication', defectCount: 15 },
      { moduleName: 'Payment Gateway', defectCount: 8 },
      { moduleName: 'Inventory', defectCount: 22 }
    ]
  };
}
