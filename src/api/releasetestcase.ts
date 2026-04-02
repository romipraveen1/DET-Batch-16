
export interface TestCase {
  id: string;
  module: string;
  subModule: string;
  description: string;
  steps: string;
  type: string;
  severity: string;
  projectId: string;
  releaseId?: string;
  testCaseId?: string;
}

export interface GetTestCasesByFilterResponse {
  status: string;
  message: string;
  data: TestCase[];
  statusCode: number;
}

export const getTestCasesByFilter = async (
  projectId: string | number,
  moduleId: string | number,
  submoduleId: string | number,
  releaseId: string | number
): Promise<GetTestCasesByFilterResponse> => {
  console.log('API: getTestCasesByFilter (Mocked for Demo)', { projectId, moduleId, submoduleId, releaseId });
  return {
    status: 'success',
    message: 'Fetched (Mocked)',
    statusCode: 200,
    data: [
      { id: '1', testCaseId: 'TC001', module: 'Auth', subModule: 'Login', description: 'Check login', steps: 'Steps...', type: 'Functional', severity: 'High', projectId: String(projectId), releaseId: String(releaseId) }
    ]
  };
};

export const allocateTestCaseToRelease = async (releaseId: number, testCaseId: number): Promise<any> => {
  console.log('API: allocateTestCaseToRelease (Mocked for Demo)', { releaseId, testCaseId });
  return { status: 'success', message: 'Allocated (Mocked)', statusCode: 200 };
};

export const allocateTestCaseToMultipleReleases = async (testCaseId: string | number, releaseIds: (string | number)[]): Promise<any> => {
  console.log('API: allocateTestCaseToMultipleReleases (Mocked for Demo)', { testCaseId, releaseIds });
  return { status: 'success', message: 'Allocated (Mocked)', statusCode: 200 };
};

export const allocateTestCasesToManyReleases = async (releaseIds: (string | number)[], testCaseIds: (string | number)[]): Promise<any> => {
  console.log('API: allocateTestCasesToManyReleases (Mocked for Demo)', { releaseIds, testCaseIds });
  return { status: 'success', message: 'Allocated (Mocked)', statusCode: 200 };
};

export const bulkAllocateTestCasesToReleases = async (testCaseIds: (string | number)[], releaseId: string | number): Promise<any> => {
  console.log('API: bulkAllocateTestCasesToReleases (Mocked for Demo)', { testCaseIds, releaseId });
  return { status: 'success', message: 'Bulk Allocated (Mocked)', statusCode: 200 };
};

export const getReleaseTestCasesByFiltersGroup = async (params: any) => {
  console.log('API: getReleaseTestCasesByFiltersGroup (Mocked for Demo)', params);
  return {
    status: 'success',
    data: [
       { id: 1, testCaseId: 'TC-01', description: 'Demo test case' }
    ]
  };
};

export const getQaAllocationSummary = async (qaEngineerIds: string): Promise<any> => {
  console.log('API: getQaAllocationSummary (Mocked for Demo)', qaEngineerIds);
  return {
    status: 'success',
    data: {
      allocationSummary: {
        totalAllocated: 10,
        qaEngineerCount: 2,
        remaining: 5,
        qaEngineers: [
          { id: 1, name: 'QA User 1', testCases: 5 },
          { id: 2, name: 'QA User 2', testCases: 5 }
        ]
      }
    },
    statusCode: 200
  };
};

export const getQaEngineerTestCases = async (params: any): Promise<any> => {
  console.log('API: getQaEngineerTestCases (Mocked for Demo)', params);
  return {
    status: 'success',
    data: [
      { id: 1, testCaseId: 'TC-01', description: 'Demo test case', steps: 'Steps...', type: 'Functional', severity: 'High' }
    ],
    statusCode: 200
  };
};

export const getDefectTestCaseCounts = async (releaseId: string | number): Promise<any> => {
  console.log('API: getDefectTestCaseCounts (Mocked for Demo)', releaseId);
  return {
    status: 'success',
    data: [
      { testId: 1, testCaseId: 'TC-01', defectId: 'DEF-01', assignedTo: 'Dev User 1', priority: 'High' }
    ],
    statusCode: 200
  };
};
