
import { Employee } from "../../types/index";

export async function getBenchList(): Promise<Employee[]> {
  console.log('API: getBenchList (Mocked for Demo)');
  return [
    {
      id: "BT001",
      firstName: "Alice",
      lastName: "Johnson",
      email: "alice.j@example.com",
      phone: "+1-555-1111",
      designation: "Software Engineer",
      experience: 3,
      joinedDate: "2023-05-15",
      skills: ["React", "TypeScript", "Node.js"],
      currentProjects: [],
      availability: 100,
      status: "active",
      startDate: "",
      endDate: "",
      createdAt: "2023-05-15T09:00:00Z",
      updatedAt: "2023-12-01T10:00:00Z"
    },
    {
      id: "BT002",
      firstName: "Charlie",
      lastName: "Davis",
      email: "charlie.d@example.com",
      phone: "+1-555-2222",
      designation: "QA Engineer",
      experience: 2,
      joinedDate: "2023-08-20",
      skills: ["Selenium", "Jest", "Manual Testing"],
      currentProjects: ["Healthcare Portal"],
      availability: 50,
      status: "active",
      startDate: "2024-03-10",
      endDate: "2024-06-10",
      createdAt: "2023-08-20T11:00:00Z",
      updatedAt: "2024-01-15T14:30:00Z"
    }
  ];
}

export const getViewAllocation = async (userId: string) => {
  console.log('API: getViewAllocation (Mocked for Demo)', userId);
  return {
    status: 'success',
    data: {
      availablePeriods: [
        { period: '2024-01-01 to 2024-03-31', percentage: 100, project: 'None', userId: Number(userId) },
        { period: '2024-04-01 to 2024-06-30', percentage: 50, project: 'Smart Banking', userId: Number(userId) }
      ]
    }
  };
};

export async function getEmployeeDetails(employeeId: string): Promise<any> {
    console.log('API: getEmployeeDetails (Mocked for Demo)', employeeId);
    return {
        status: 'success',
        data: {
            id: employeeId,
            fullName: 'Mock User',
            designation: 'Software Engineer',
            skills: ['Java', 'Spring Boot']
        }
    };
}

export const getEmployeeProjectHistory = async (userId: string) => {
    console.log('API: getEmployeeProjectHistory (Mocked for Demo)', userId);
    return {
        status: 'success',
        data: [
            { projectName: 'Project Alpha', startDate: '2023-01-01', endDate: '2023-06-30', role: 'Developer' }
        ]
    };
};

export const getBenchAvailability = async (page: number = 0, size: number = 5, filters: any = {}) => {
    console.log('API: getBenchAvailability (Mocked for Demo)', { page, size, filters });
    return {
        status: 'success',
        data: {
            content: [
                { userId: 1, fullName: 'Alice Johnson', designation: 'Software Engineer', availability: 100 },
                { userId: 2, fullName: 'Bob Wilson', designation: 'QA Engineer', availability: 50 }
            ],
            totalElements: 2
        }
    };
};
