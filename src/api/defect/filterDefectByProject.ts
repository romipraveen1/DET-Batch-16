
import { FilteredDefect } from "../../types";

export async function getDefectsByProjectId(projectId: string | number): Promise<FilteredDefect[]> {
  console.log('API: getDefectsByProjectId (Mocked for Demo)', projectId);
  
  if (String(projectId) === 'PR001') {
    return [
      {
        id: 1,
        defectId: "DEF-001",
        description: "Login button not responding on mobile",
        reOpenCount: 0,
        attachment: null,
        steps: "1. Open app on iPhone 13\n2. Enter credentials\n3. Tap login button",
        projectName: "Smart Banking App",
        severityName: "High",
        priorityName: "High",
        statusName: "New",
        defectStatusName: "New",
        moduleName: "Authentication",
        subModuleName: "Login API",
        assignedToName: "John Doe",
        assignedByName: "Admin",
        defectTypeName: "UI Bug",
        releaseName: "Release 1.0"
      },
      {
        id: 2,
        defectId: "DEF-002",
        description: "Failed to process Stripe refund",
        reOpenCount: 1,
        attachment: null,
        steps: "1. Go to transaction history\n2. Select transaction\n3. Click refund",
        projectName: "Smart Banking App",
        severityName: "Critical",
        priorityName: "Immediate",
        statusName: "Open",
        defectStatusName: "Open",
        moduleName: "Payment Gateway",
        subModuleName: "Refund Logic",
        assignedToName: "Jane Smith",
        assignedByName: "QA Lead",
        defectTypeName: "Functional",
        releaseName: "Release 1.1"
      },
      {
        id: 3,
        defectId: "DEF-003",
        description: "Dashboard chart showing incorrect data for Q1",
        reOpenCount: 0,
        attachment: null,
        steps: "1. Navigate to dashboard\n2. Select Q1 filter\n3. Observe bar chart",
        projectName: "Smart Banking App",
        severityName: "Medium",
        priorityName: "Medium",
        statusName: "Fixed",
        defectStatusName: "Fixed",
        moduleName: "Analytics",
        subModuleName: "Reports",
        assignedToName: "Bob Wilson",
        assignedByName: "John Doe",
        defectTypeName: "Logical",
        releaseName: "Release 1.0"
      }
    ];
  }

  return [];
}

export async function filterDefects(filters: any): Promise<FilteredDefect[]> {
  console.log('API: filterDefects (Mocked for Demo)', filters);
  // Just return defects for PR001 as a default
  return getDefectsByProjectId('PR001');
}