


// Interface for defect density data
export interface DefectDensityData {
  kloc: number;
  defects: number;
  defectDensity: number;
}

// Interface for defect density API response
export interface DefectDensityResponse {
  status: string;
  message: string;
  data: DefectDensityData;
  statusCode: number;
}

// Fetch defect density (KLOC and defect count) for a given project
export async function getDefectDensity(projectId: string): Promise<DefectDensityResponse> {
  console.log('API: getDefectDensity (Mocked for Demo)', projectId);
  return {
    status: 'success',
    message: 'Mocked for demo',
    data: {
      kloc: 120,
      defects: 5,
      defectDensity: 0.041
    },
    statusCode: 200
  };
}
