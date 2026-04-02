
export interface User {
  id: number;
  userId?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  phoneNo?: string;
  joinDate?: string;
  userGender?: string;
  userStatus?: string;
  designationId?: number;
  designationName?: string;
  role?: { id?: number; roleName: string };
}

export interface SimpleUser {
  id: number;
  userId: string;
  firstName: string;
  lastName: string;
  designationId?: number;
}

export interface GetUsersByDesignationResponse {
  status: string;
  data: SimpleUser[];
}

export async function getAllUsers(page: number = 0, size: number = 10) {
  console.log('API: getAllUsers (Mocked for Demo)', { page, size });
  return {
    status: 'success',
    data: {
      content: [
        { id: 1, userId: 'US0001', firstName: 'Admin', lastName: 'User', email: 'admin@gmail.com', phoneNo: '1234567890', userStatus: 'Active', designationId: 4, designationName: 'Project Manager', role: { roleName: 'admin' } },
        { id: 2, userId: 'US0002', firstName: 'Dev', lastName: 'User', email: 'dev@gmail.com', phoneNo: '2345678901', userStatus: 'Active', designationId: 1, designationName: 'Software Engineer', role: { roleName: 'developer' } },
        { id: 3, userId: 'US0003', firstName: 'Tester', lastName: 'User', email: 'tester@gmail.com', phoneNo: '3456789012', userStatus: 'Active', designationId: 3, designationName: 'QA Engineer', role: { roleName: 'tester' } }
      ],
      totalPages: 1,
      totalElements: 3
    }
  };
}

export async function getAllUsersSimple() {
  console.log('API: getAllUsersSimple (Mocked for Demo)');
  return getAllUsers(0, 100);
}

export async function getUsersByDesignationId(designationId: number): Promise<GetUsersByDesignationResponse> {
  console.log('API: getUsersByDesignationId (Mocked for Demo)', designationId);
  const all = [
    { id: 1, userId: 'US0001', firstName: 'Admin', lastName: 'User', designationId: 4 },
    { id: 2, userId: 'US0002', firstName: 'Dev', lastName: 'User', designationId: 1 },
    { id: 3, userId: 'US0003', firstName: 'Tester', lastName: 'User', designationId: 3 }
  ];
  return {
    status: 'success',
    data: all.filter(u => u.designationId === designationId)
  };
}
