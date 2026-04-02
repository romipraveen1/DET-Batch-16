export async function getDefectRemarkRatioByProjectId(projectId: string) {
  console.log('API: getDefectRemarkRatioByProjectId (Mocked Version 2.0)', projectId);
  return {
    status: 'success',
    data: {
      remarkCount: 150,
      totalDefects: 200,
      ratio: "0.75",
      category: 'Good',
      color: '#10B981'
    }
  };
}
