
import { Project } from "../types";

export const getAllProjects = async (): Promise<Project[]> => {
  console.log('API: getAllProjects (Mocked for Demo)');
  return [
    {
      id: "PR001",
      projectName: "Smart Banking App",
      name: "Smart Banking App",
      description: "A comprehensive mobile banking solution with advanced security features.",
      projectStatus: "ACTIVE",
      status: "Active",
      startDate: "2024-01-01",
      endDate: "2024-12-31",
      clientName: "Global Bank Corp",
      clientCountry: "USA",
      clientState: "New York",
      clientEmail: "contact@globalbank.com",
      clientPhone: "+1-555-0123",
      userFirstName: "John",
      userLastName: "Doe",
      manager: "John Doe"
    },
    {
      id: "PR002",
      projectName: "E-Commerce Replatform",
      name: "E-Commerce Replatform",
      description: "Modernizing the legacy e-commerce platform for better performance and scalability.",
      projectStatus: "IN-PROGRESS",
      status: "In-Progress",
      startDate: "2024-02-15",
      endDate: "2024-11-30",
      clientName: "Retail Giants LLC",
      clientCountry: "Canada",
      clientState: "Ontario",
      clientEmail: "it-support@retailgiants.ca",
      clientPhone: "+1-555-0456",
      userFirstName: "Jane",
      userLastName: "Smith",
      manager: "Jane Smith"
    },
    {
      id: "PR003",
      projectName: "Healthcare Portal",
      name: "Healthcare Portal",
      description: "Patient management and tele-health consultation portal.",
      projectStatus: "ACTIVE",
      status: "Active",
      startDate: "2024-03-10",
      endDate: "2025-03-10",
      clientName: "HealthyLife Systems",
      clientCountry: "UK",
      clientState: "London",
      clientEmail: "admin@healthylife.co.uk",
      clientPhone: "+44-20-1234-5678",
      userFirstName: "Bob",
      userLastName: "Wilson",
      manager: "Bob Wilson"
    }
  ];
};

export async function updateProject(params: { id: string | number, projectData: any }) {
    console.log('API: updateProject (Mocked for Demo)', params);
    return { status: 'success', message: 'Project updated successfully (Mocked)', data: params.projectData, statusCode: 200 };
}

export async function deleteProject(id: string | number) {
    console.log('API: deleteProject (Mocked for Demo)', id);
    return { status: 'success', message: 'Project deleted successfully (Mocked)', statusCode: 200 };
}

export async function createProject(data: any) {
    console.log('API: createProject (Mocked for Demo)', data);
    return { status: 'success', message: 'Project created successfully (Mocked)', data, statusCode: 201 };
}
