import { Project } from '../types';

// Centralized mock data and utility functions for the app

// Projects mock data (from AppContext)
export const mockProjects: Project[] = [
  {
    id: "PR0001",
    name: "Mobile Banking App",
    prefix: "MBAP",
    description: "Secure banking application for iOS and Android",
    status: "active",
    startDate: "2024-02-01",
    endDate: "2024-08-31",
    priority: "high",
    projectType: "mobile",
    progress: 45,
    teamMembers: [],
    createdAt: "2024-02-01T00:00:00Z",
  },
  // ...other projects from AppContext, remove manager/department fields...
];

// Utility function example: getNextDefectId
export function getNextDefectId(defects: { id: string; projectId: string }[], projectId: string): string {
  const projectDefects = defects.filter((d: { id: string; projectId: string }) => d.projectId === projectId);
  const ids = projectDefects
    .map((d: { id: string }) => d.id)
    .map((id: string) => parseInt(id.replace("DEF-", "")))
    .filter((n: number) => !isNaN(n));
  const nextNum = ids.length > 0 ? Math.max(...ids) + 1 : 1;
  return `DEF-${nextNum.toString().padStart(4, "0")}`;
}

// Add more utility functions as needed for test cases, modules, etc.
