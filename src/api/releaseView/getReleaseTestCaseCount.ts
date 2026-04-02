
export const getReleaseTestCaseCount = async (releaseId: string | number) => {
  console.log('API: getReleaseTestCaseCount (Mocked for Demo)', releaseId);
  return {
    status: 'success',
    data: { totalTestCases: 50, executedTestCases: 35, passedTestCases: 30, failedTestCases: 5 }
  };
};

export const getReleaseTestCaseCounts = getReleaseTestCaseCount;