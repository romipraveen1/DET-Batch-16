
export interface ProjectRelease {
    id: string;
    releaseId: string;
    releaseName: string;
    description: string;
    releaseStatus: string;
    releaseDate: string;
    releaseType: string;
    projectId: number;
}

export interface ProjectReleaseProps {
    message: string;
    data: ProjectRelease[];
    status: string;
    statusCode: string;
}

export const projectReleaseCardView = async (projectId: string | null): Promise<ProjectReleaseProps> => {
  console.log('API: projectReleaseCardView (Mocked for Demo)', projectId);
  return {
    status: 'success',
    message: 'Fetched (Mocked)',
    statusCode: '200',
    data: [
      { id: '1', releaseId: 'R001', releaseName: 'Alpha v1.0', description: 'Initial release', releaseStatus: 'Planned', releaseDate: '2024-05-01', releaseType: 'Major', projectId: Number(projectId) },
      { id: '2', releaseId: 'R002', releaseName: 'Beta v1.1', description: 'Feature release', releaseStatus: 'Planned', releaseDate: '2024-06-15', releaseType: 'Minor', projectId: Number(projectId) }
    ]
  };
};
