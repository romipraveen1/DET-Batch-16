
export async function getReleasesByProjectId(projectId: string) {
  console.log('API: getReleasesByProjectId (Mocked for Demo)', projectId);
  return {
    status: 'success',
    data: [
      { id: 'R001', releaseName: 'Alpha v1.0', releaseDate: '2024-05-01', releaseType: 'Major', status: 'planned' },
      { id: 'R002', releaseName: 'Beta v1.1', releaseDate: '2024-06-15', releaseType: 'Minor', status: 'planned' }
    ]
  };
}

export async function searchReleases(params: any) {
  console.log('API: searchReleases (Mocked for Demo)', params);
  return {
    status: 'success',
    data: [
      { id: 'R001', releaseName: 'Alpha v1.0', projectId: params.projectId }
    ]
  };
}
