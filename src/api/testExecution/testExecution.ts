
import apiClient from "../../lib/api";

const BASE_URL = import.meta.env.VITE_BASE_URL;

export async function updateReleaseStatus(
  id: string | number,
  status: "Active" | "Hold"
) {
  let url = "";
  if (status === "Active") {
    url = `${BASE_URL}releases/activate/${id}`;
    return apiClient.put(url);
  } else if (status === "Hold") {
    url = `${BASE_URL}releases/hold/${id}`;
    return apiClient.put(url);
  }
}

// Local persistence helpers for test execution statuses
// Structure in localStorage under EXECUTION_STATUS_KEY:
// {
//   [projectId]: { [releaseId]: { [testCaseId]: "passed" | "failed" | ... } }
// }

export type ExecutionStatus =
  | "not-started"
  | "in-progress"
  | "passed"
  | "failed"
  | "blocked";

const EXECUTION_STATUS_KEY = "executionStatuses";

export function getExecutionStatuses(
  projectId: string | number,
  releaseId: string | number
): Record<string, ExecutionStatus> {
  try {
    const raw = localStorage.getItem(EXECUTION_STATUS_KEY);
    if (!raw) return {};
    const all: Record<string, any> = JSON.parse(raw);
    const proj = all[String(projectId)] || {};
    return (proj[String(releaseId)] || {}) as Record<string, ExecutionStatus>;
  } catch {
    return {};
  }
}

export function setExecutionStatus(
  projectId: string | number,
  releaseId: string | number,
  testCaseId: string | number,
  status: ExecutionStatus
): Record<string, ExecutionStatus> {
  let all: Record<string, any> = {};
  try {
    const raw = localStorage.getItem(EXECUTION_STATUS_KEY);
    all = raw ? JSON.parse(raw) : {};
  } catch {
    all = {};
  }

  const pid = String(projectId);
  const rid = String(releaseId);
  if (!all[pid]) all[pid] = {};
  if (!all[pid][rid]) all[pid][rid] = {};
  all[pid][rid][String(testCaseId)] = status;

  localStorage.setItem(EXECUTION_STATUS_KEY, JSON.stringify(all));
  return all[pid][rid] as Record<string, ExecutionStatus>;
}

export function setBulkExecutionStatuses(
  projectId: string | number,
  releaseId: string | number,
  statuses: Record<string, ExecutionStatus>
): void {
  let all: Record<string, any> = {};
  try {
    const raw = localStorage.getItem(EXECUTION_STATUS_KEY);
    all = raw ? JSON.parse(raw) : {};
  } catch {
    all = {};
  }

  const pid = String(projectId);
  const rid = String(releaseId);
  if (!all[pid]) all[pid] = {};
  all[pid][rid] = { ...(all[pid][rid] || {}), ...statuses };
  localStorage.setItem(EXECUTION_STATUS_KEY, JSON.stringify(all));
}

// Backend call to update a release test case execution status
export async function updateReleaseTestCaseStatus(
  releaseTestCaseId: string | number,
  payload: { testCaseStatus: "PASS" | "FAIL"; priorityId: number; assignedTo?: string | number;}
) {
  const url = `${BASE_URL}releasetestcase/update-status/${releaseTestCaseId}`;
  console.log("Making PUT request to:", url);
  console.log("With payload:", payload);
  try {
    const response = await apiClient.put(url, payload);
    console.log("Update status response:", response);
    return response;
  } catch (error) {
    console.error("Update status error:", error);
    throw error;
  }
}