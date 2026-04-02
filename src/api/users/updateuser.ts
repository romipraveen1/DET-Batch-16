
export interface UpdateUserPayload {
  id: number;
  userId?: string;
  firstName: string;
  lastName: string;
  email: string;
  password?: string | null;
  phoneNo?: string;
  joinDate?: string;
  userGender?: "Male" | "Female";
  designationId?: number;
  designationName?: string;
}

export async function updateUser(id: number, userData: UpdateUserPayload) {
  console.log('API: updateUser (Mocked for Demo)', { id, userData });
  return { status: 'success', message: 'User updated successfully (Mocked)', data: userData, statusCode: 200 };
}

export async function updateUserStatus(id: number, status: 'Active' | 'Inactive') {
  console.log('API: updateUserStatus (Mocked for Demo)', { id, status });
  return { status: 'success', message: 'User status updated successfully (Mocked)', statusCode: 200 };
}
