
export async function getAllRoles() {
  console.log('API: getAllRoles (Mocked for Demo)');
  return {
    status: 'success',
    data: [
      { id: 1, roleName: 'admin' },
      { id: 2, roleName: 'developer' },
      { id: 3, roleName: 'tester' },
      { id: 4, roleName: 'manager' }
    ]
  };
}
