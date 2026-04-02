
export async function searchTestCases(params: any) {
  console.log('API: searchTestCases (Mocked for Demo)', params);
  return {
    status: 'success',
    data: [
      { id: 'TC001', description: 'Check login with valid credentials', steps: '1. Enter email\n2. Enter password', priority: 'high', status: 'active', category: 'functional' },
      { id: 'TC002', description: 'Check logout functionality', steps: '1. Click logout button', priority: 'medium', status: 'active', category: 'functional' }
    ]
  };
}