
export interface SearchUserData {
  id: number;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  userStatus: string;
  userGender: string;
  designationName: string;
}

export async function searchUsers(searchTerm: string) {
  console.log('API: searchUsers (Mocked for Demo)', searchTerm);
  return {
    status: 'success',
    statusCode: 200,
    message: 'Search successful (Mocked)',
    data: [
      { id: 1, userId: 'US0001', firstName: 'Admin', lastName: 'User', email: 'admin@gmail.com', userStatus: 'Active', userGender: 'Male', designationName: 'Project Manager' }
    ]
  };
}
