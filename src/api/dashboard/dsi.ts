
export async function getDefectSeverityIndex(projectId: string) {
  console.log('API: getDefectSeverityIndex (Mocked for Demo)', projectId);
  return {
    status: 'success',
    data: {
      dsiPercentage: 0.85,
      threshold: 0.90,
      status: 'Healthy'
    }
  };
}