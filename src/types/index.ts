export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'manager' | 'developer' | 'tester';
  userId?: string; // The userID in format US0001
  token?: string; // Authentication token
}

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  gender: 'Male' | 'Female' | 'Other';
  email: string;
  phone: string;
  designation: string;
  experience: number; // years
  joinedDate: string;
  skills: string[];
  currentProjects: string[];
  availability: number; // percentage
  status: 'active' | 'inactive' | 'on-leave';
  department?: string; // Added for mock data
  manager?: string; // Added for mock data
 
  startDate?: string; // Available from date
  endDate?: string; // Available until date
  createdAt: string;
  updatedAt: string;
  userId?: number;
}

export interface Project {
  id: string;
  // Old fields for compatibility
  name?: string;
  status?: 'active' | 'inactive' | 'completed' | 'ACTIVE' | 'INACTIVE' | 'COMPLETED';
  teamMembers?: string[];
  priority?: 'low' | 'medium' | 'high' | 'critical';
  budget?: number;
  createdAt?: string;
  prefix?: string;
  projectType?: string;
  progress?: number;
  manager?: string | number; // Flexible for mock/form data
  // Backend fields (made optional for prototype)
  projectId?: string;
  projectName?: string;
  description?: string;
  projectStatus?: 'ACTIVE' | 'INACTIVE' | 'COMPLETED';
  startDate?: string;
  endDate?: string;
  clientName?: string;
  country?: string;
  state?: string;
  email?: string;
  phoneNo?: string;
  userId?: number;
  userFirstName?: string;
  userLastName?: string;
  kloc?: number;
  address?: string;
}

export interface DefectHistoryEntry {
  status: 'new' | 'open' | 'in-progress' | 'resolved' | 'closed' | 'rejected';
  changedAt: string;
  comment?: string;
}

export interface Defect {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'new' | 'open' | 'in-progress' | 'resolved' | 'closed' | 'rejected';
  projectId: string;
  assignedTo?: string;
  reportedBy: string;
  stepsToReproduce?: string[];
  environment?: string;
  attachments?: string[];
  createdAt: string;
  updatedAt: string;
  rejectionComment?: string;
  defectHistory?: DefectHistoryEntry[];
  releaseId?: string;
}

export interface TestCase {
  testCaseId: string | number | null | undefined;
  id: string;
  description: string;
  steps: string;
  priority: 'low' | 'medium' | 'high';
  projectId: string;
  createdBy: string;
  status: 'draft' | 'active' | 'deprecated';
  category: string;
  estimatedTime?: number; // minutes
  createdAt: string;
  selected?: boolean;
  releaseId?: string;
  module?: string;
  subModule?: string;
  type?: 'functional' | 'regression' | 'smoke' | 'integration';
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

export interface Release {
  id: string;
  name: string;
  version: string;
  description: string;
  projectId: string;
  status: 'planned' | 'in-progress' | 'testing' | 'released' | 'completed';
  releaseDate?: string;
  Testcase: string[]; // List of test case IDs (capital C for consistency with AppContext)
  features: string[];
  bugFixes: string[];
  createdAt: string;
}

export interface WorkflowItem {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high';
  assignedTo?: string;
  dueDate?: string;
  estimatedHours?: number;
  actualHours?: number;
  tags: string[];
  createdAt: string;
}

export interface BenchAllocation {
  id: string;
  employeeId: string;
  projectId: string;
  startDate: string;
  endDate?: string;
  allocationPercentage: number;
  role: string;
  createdAt: string;
}

export interface WorkflowStatus {
  id: string;
  name: string;
  color: string;
  description?: string;
  order: number;
}

export interface StatusTransition {
  id: string;
  fromStatus: string;
  toStatus: string;
}

export interface EmailConfig {
  id: string;
  name: string;
  smtpHost: string;
  smtpPort: number;
  username: string;
  password: string;
  fromEmail: string;
  fromName: string;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

// Submodule and Module types for module management
export interface Submodule {
  id: string;
  name: string;
  assignedDevs: string[];
}

export interface Module {
  projectId: number;
  moduleName: string;
  id: string;
  name: string;
  submodules: Submodule[];
  assignedDevs: string[];
}

export interface CreateModuleRequest {
  moduleName: string;
  projectId: number;
  // submodules?: { name: string }[];
}

export interface CreateModuleResponse {
  status: string;
  statusCode?: string;
  data?: CreateModuleRequest[];
  message?: string;
}

export interface GetModulesResponse {
  modules: Module[];
}

export interface BenchSearchParams {
  startDate?: string;
  endDate?: string;
  designation?: string;
  firstName?: string;
  lastName?: string;
  availability?: number;
}

export interface ProjectFormData {
  name: string;
  prefix: string;
  projectType: string;
  status: string;
  startDate: string;
  endDate: string;
  manager: number;
  designationId?: number;
  userId?: number;
  clientName: string;
  clientCountry: string;
  clientState: string;
  clientEmail: string;
  clientPhone: string;
  address: string;
  description: string;
}

export interface FilteredDefect {
  id: number;
  defectId: string;
  description: string;
  reOpenCount: number;
  attachment: string | null;
  steps: string;
  // Support both snake_case and camelCase field names from backend
  project_name?: string; projectName?: string;
  severity_name?: string; severityName?: string;
  priority_name?: string; priorityName?: string;
  priority?: string;
  defect_status_name?: string; statusName?: string;
  release_test_case_description?: string;
  release_name?: string; releaseName?: string;
  assigned_by_name?: string; assignedByName?: string;
  assigned_to_name?: string; assignedToName?: string;
  assigned_by_id?: number;
  assigned_to_id?: number;
  defect_status_id?: number;
  defect_type_name?: string; defectTypeName?: string;
  module_name?: string; moduleName?: string;
  sub_module_name?: string; subModuleName?: string;
  testCaseId?: number | null;
}
