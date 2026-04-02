
export async function deleteUser(id: number) {
  console.log('API: deleteUser (Mocked for Demo)', id);
  return { status: 'success', message: 'User deleted successfully (Mocked)', statusCode: 200 };
}