
export async function getReopenCountSummary(projectId: string) {
  console.log('API: getReopenCountSummary (Mocked for Demo)', projectId);
  return {
    status: 'success',
    data: [
      { name: 'Reopened', count: 12 },
      { name: 'Not Reopened', count: 45 }
    ]
  };
}
