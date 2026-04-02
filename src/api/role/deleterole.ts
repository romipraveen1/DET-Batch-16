
export async function deleteRoleById(id: string | number) {
  console.log('API: deleteRoleById (Mocked for Demo)', id);
  return { status: 'success', message: 'Role deleted successfully (Mocked)', statusCode: 200 };
}

export const deleteRole = deleteRoleById;
