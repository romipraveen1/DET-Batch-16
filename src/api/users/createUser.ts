
export async function createUser(userData: any) {
  console.log('API: createUser (Mocked for Demo)', userData);
  return { status: 'success', message: 'User created successfully (Mocked)', data: userData, statusCode: 201 };
}