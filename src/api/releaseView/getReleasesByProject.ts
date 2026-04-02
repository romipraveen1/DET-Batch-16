
export const getReleasesByProject = async (projectId: string | number) => {
  console.log('API: getReleasesByProject (Mocked for Demo)', projectId);
  return {
    status: 'success',
    data: [
      { id: 1, releaseName: 'Alpha v1.0' },
      { id: 2, releaseName: 'Beta v1.1' }
    ]
  };
};
