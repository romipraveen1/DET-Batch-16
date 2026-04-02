
export interface UserFilter {
  id: number;
  userId?: string;
  firstName: string;
  lastName: string;
  email: string;
  userGender?: string;
  userStatus?: string;
  designationId?: number;
  designationName?: string;
}

export async function getUsersByFilter(gender?: string, status?: string, designationId?: number, page: number = 1, size: number = 10) {
  console.log('API: getUsersByFilter (Mocked for Demo)', { gender, status, designationId, page, size });
  return {
    status: 'success',
    data: {
      users: [
        { id: 1, userId: 'US0001', firstName: 'Admin', lastName: 'User', email: 'admin@gmail.com', userGender: 'Male', userStatus: 'Active', designationId: 4 },
        { id: 2, userId: 'US0002', firstName: 'Dev', lastName: 'User', email: 'dev@gmail.com', userGender: 'Male', userStatus: 'Active', designationId: 1 }
      ],
      totalPages: 1,
      totalItems: 2
    }
  };
}

export const filterUsers = getUsersByFilter;
