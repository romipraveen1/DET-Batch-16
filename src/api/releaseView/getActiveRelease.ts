
export const getActiveRelease = async (projectId: string | number) => {
  console.log('API: getActiveRelease (Mocked for Demo)', projectId);
  return {
    status: 'success',
    data: { id: 1, releaseName: 'Alpha v1.0', releaseStatus: 'Active' }
  };
}; 