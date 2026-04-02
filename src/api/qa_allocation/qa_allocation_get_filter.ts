import apiClient from '../../lib/api';

const BASE_URL = import.meta.env.VITE_BASE_URL;

export interface allocated_testcases {
  projectId: number;
  releaseId: string;
  moduleId: number;
  subModuleId: number;
}

export interface allocated_testcase_details {
  id: number; // This is the releasetestcase mapping ID that the bulk assign API expects
  testCaseId: string;
  description: string;
  steps: string;
  type: string;
  severity: string;
}

export interface GetAllocatedTestCases_Response {
  status: string;
  statusCode: number;
  message: string;
  data:allocated_testcase_details[];
}

export async function getAllocatedTestCases({ projectId, releaseId, moduleId, subModuleId }: allocated_testcases) {
  const params = new URLSearchParams();
  params.append("projectId", String(projectId));
  params.append("releaseId", String(releaseId));
  params.append("moduleId", String(moduleId));
  params.append("subModuleId", String(subModuleId));

  const url = `${BASE_URL}releasetestcase/filters?${params.toString()}`;

  const response = await apiClient.get<GetAllocatedTestCases_Response>(url);
  return response.data;
}

export interface BulkAssignOwnerResponse {
  status: string;
  statusCode: number;
  message: string;
  data?: any;
}

export async function bulkAssignOwner(ownerId: number, testCaseIds: number[]): Promise<BulkAssignOwnerResponse> {
  const url = `${BASE_URL}releasetestcase/bulk-assign-owner?ownerId=${ownerId}`;

  const response = await apiClient.put<BulkAssignOwnerResponse>(url, testCaseIds);
  return response.data;
}


