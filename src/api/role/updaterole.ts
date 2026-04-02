
export async function updateRoleById(id: string | number, roleName: string) {
  console.log('API: updateRoleById (Mocked for Demo)', { id, roleName });
  return { status: 'success', message: 'Role updated successfully (Mocked)', data: { id, roleName }, statusCode: 200 };
}

export const updateRole = updateRoleById;
