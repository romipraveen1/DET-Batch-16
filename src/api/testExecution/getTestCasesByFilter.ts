
export async function getTestCasesByFilter({projectId,releaseId,moduleId,subModuleId}:
   {
  projectId:   number;
  releaseId:   number;
  moduleId?:   number;
  subModuleId?:number;
}) {
  console.log("API: getTestCasesByFilter (Mocked for Demo)", { projectId, releaseId, moduleId, subModuleId });
  return [
    {
      id: "1",
      testCaseId: "TC-DEMO-001",
      description: "Demo test case for the prototype",
      steps: "1. Step one\n2. Step two",
      type: "functional",
      severity: "high",
      priority: "medium",
      module: "Auth",
      subModule: "Login",
      projectId: String(projectId),
      releaseId: String(releaseId)
    }
  ];
} 