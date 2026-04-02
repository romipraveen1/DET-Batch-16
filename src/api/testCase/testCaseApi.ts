
export async function getTestCasesByProjectAndSubmodule(projectId: string | undefined, submoduleId: string) {
  console.log('API: getTestCasesByProjectAndSubmodule (Mocked for Demo)', { projectId, submoduleId });
  
  const subId = Number(submoduleId);
  let mockTestCases = [];

  if (subId === 101) { // Login API
    mockTestCases = [
      { id: 1001, testCaseId: 'TC-LOG-01', description: 'User can login with valid credentials', steps: '1. Enter email\n2. Enter password\n3. Click login', severityId: 1, defectTypeId: 1, moduleId: 1, subModuleId: 101 },
      { id: 1002, testCaseId: 'TC-LOG-02', description: 'User cannot login with invalid credentials', steps: '1. Enter fake email\n2. Enter fake password\n3. Click login', severityId: 2, defectTypeId: 1, moduleId: 1, subModuleId: 101 }
    ];
  } else if (subId === 102) { // JWT Validation
    mockTestCases = [
      { id: 1003, testCaseId: 'TC-JWT-01', description: 'Valid JWT allows access', steps: '1. Provide valid JWT\n2. Request protected resource', severityId: 1, defectTypeId: 2, moduleId: 1, subModuleId: 102 }
    ];
  } else {
    mockTestCases = [
      { id: subId * 10, testCaseId: `TC-${subId}-01`, description: `Demo test case for submodule ${subId}`, steps: '1. Step 1\n2. Step 2', severityId: 2, defectTypeId: 1, moduleId: 0, subModuleId: subId }
    ];
  }

  return mockTestCases;
}

export async function deleteTestCase(testCaseId: string) {
  console.log('API: deleteTestCase (Mocked for Demo)', testCaseId);
  return { status: 'success', message: 'Deleted (Mocked)' };
}

export async function getTestCasesByProjectAndModule(projectId: string | number, moduleId: string | number) {
  console.log('API: getTestCasesByProjectAndModule (Mocked for Demo)', { projectId, moduleId });
  return getTestCasesByProjectAndSubmodule(String(projectId), '101'); // Just return some data
}

export async function getTestCasesByBulkModules(projectId: string | number, moduleIds: number[]) {
  console.log('API: getTestCasesByBulkModules (Mocked for Demo)', { projectId, moduleIds });
  return [];
}

export async function getTestCasesByBulkSubmodules(projectId: string | number, submoduleIds: number[]) {
  console.log('API: getTestCasesByBulkSubmodules (Mocked for Demo)', { projectId, submoduleIds });
  return [];
}

export async function getTestCasesByProjectAndModuleExternal(projectId: string | number, moduleId: string | number) {
  console.log('API: getTestCasesByProjectAndModuleExternal (Mocked for Demo)', { projectId, moduleId });
  return [];
}
