
export interface ActiveRelease {
    id: string;
    releaseId: string;
    releaseName: string;
    description: string;
    releaseStatus: string;
    releaseDate: string;
    releaseType: string;
    projectId: number;
}

export interface ActiveReleasesResponse {
    message: string;
    data: ActiveRelease[];
    status: string;
    statusCode: string;
}

export const getActiveReleases = async (projectId: string | number): Promise<ActiveReleasesResponse> => {
  console.log('API: getActiveReleases (Mocked for Demo)', projectId);
  return {
    status: 'success',
    message: 'Fetched (Mocked)',
    statusCode: '200',
    data: [
      { id: '1', releaseId: 'R001', releaseName: 'Alpha v1.0', description: 'Active release', releaseStatus: 'Active', releaseDate: '2024-05-01', releaseType: 'Major', projectId: Number(projectId) }
    ]
  };
};