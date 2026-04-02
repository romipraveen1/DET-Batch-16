// Mocked for demo

// Interface for view allocations response
export interface AvailablePeriod {
  period: string;
  percentage: number;
  project: string;
  userId: number;
}

export interface ViewAllocationsResponse {
  data: {
    availablePeriods: AvailablePeriod[];
  };
  message: string;
  status: string;
  statusCode: number;
}

export interface ProjectAllocationPayload {
  projectId?: string | number;
  allocations?: Array<{
    employeeId: string | number;
    role: string;
    allocationPercent?: number;
    allocationAvailability?: number;
    startDate?: string;
    allocationStartDate?: string;
    endDate?: string;
    allocationEndDate?: string;
  }>;
  // Alternative structure for individual allocations
  employeeId?: string | number;
  role?: string;
  allocationPercent?: number;
  allocationAvailability?: number;
  startDate?: string;
  endDate?: string;
  // Snake case alternatives
  project_id?: string | number;
  employee_id?: string | number;
  allocation_percent?: number;
  start_date?: string;
  end_date?: string;
  // Nested structure alternatives
  project?: { id: string | number };
  employee?: { id: string | number };
  allocation?: {
    percent: number;
    startDate: string;
    endDate: string;
  };
  // Additional fields that might be required
  id?: string | number;
  createdBy?: string | number;
  updatedBy?: string | number;
  createdAt?: string;
  updatedAt?: string;
  status?: string;
  // Allow any additional properties
  [key: string]: any;
}

export async function postProjectAllocations(payload: ProjectAllocationPayload) {
  console.log('API: postProjectAllocations (Mocked for Demo)', payload);
  return { status: 'success', message: 'Allocation successful (Mocked)' };
}

export async function getProjectAllocationsById(projectId: string | number) {
  console.log('API: getProjectAllocationsById (Mocked for Demo)', projectId);
  return { data: [], status: 'success' };
}

export async function filterProjectAllocations(projectId: string | number, filters: any) {
  console.log('API: filterProjectAllocations (Mocked for Demo)', { projectId, filters });
  return { data: [], status: 'success' };
}

export async function updateProjectAllocation(allocationId: string | number, payload: ProjectAllocationPayload) {
  console.log('API: updateProjectAllocation (Mocked for Demo)', { allocationId, payload });
  return { status: 'success', message: 'Update successful (Mocked)' };
}

export async function deleteProjectAllocation(allocationId: string | number, forceDeallocate: boolean = false) {
  console.log('API: deleteProjectAllocation (Mocked for Demo)', { allocationId, forceDeallocate });
  return { status: 'success', message: 'Deletion successful (Mocked)' };
}

export async function getMaxAvailablePercentage(userId: string | number, newStart: string, newEnd: string) {
  console.log('API: getMaxAvailablePercentage (Mocked for Demo)', { userId, newStart, newEnd });
  return { data: 100, status: 'success' };
}

export async function getDevelopersWithRolesByProjectId(projectId: number) {
  console.log('API: getDevelopersWithRolesByProjectId (Mocked for Demo)', projectId);
  return { data: [], status: 'success' };
}

export async function allocateDeveloperToModule(moduleId: number, projectAllocationId: number) {
  console.log('API: allocateDeveloperToModule (Mocked for Demo)', { moduleId, projectAllocationId });
  return { status: 'success', message: 'Allocation successful (Mocked)' };
}

export async function allocateDeveloperToSubModule(moduleId: number, projectAllocationId: number, subModuleId: number) {
  console.log('API: allocateDeveloperToSubModule (Mocked for Demo)', { moduleId, projectAllocationId, subModuleId });
  return { status: 'success', message: 'Allocation successful (Mocked)' };
}

export async function getViewAllocations(userId: string | number): Promise<ViewAllocationsResponse> {
  console.log('API: getViewAllocations (Mocked for Demo)', userId);
  return {
    data: { availablePeriods: [] },
    message: 'Mocked for demo',
    status: 'success',
    statusCode: 200
  };
}