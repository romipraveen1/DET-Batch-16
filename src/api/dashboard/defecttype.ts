
export async function getDefectTypeByProjectId(projectId: string) {
  console.log('API: getDefectTypeByProjectId (Mocked for Demo)', projectId);
  return {
    status: 'success',
    data: {
      defectTypes: [
        { defectType: 'UI', defectCount: 20, percentage: 30 },
        { defectType: 'Functional', defectCount: 35, percentage: 55 },
        { defectType: 'Performance', defectCount: 10, percentage: 15 }
      ],
      totalDefectCount: 65,
      mostCommonDefectType: 'Functional',
      mostCommonDefectCount: 35
    }
  };
}
