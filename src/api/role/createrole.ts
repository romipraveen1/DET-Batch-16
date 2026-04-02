
export async function createRole(roleData: any) {
  console.log('API: createRole (Mocked for Demo)', roleData);
  return { status: 'success', message: 'Role created successfully (Mocked)', data: roleData };
}