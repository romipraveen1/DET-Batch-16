
import apiClient from "../../lib/api";
import { ProjectFormData } from '../../types';

const BASE_URL = import.meta.env.VITE_BASE_URL;
const API_URL = `${BASE_URL}projects`;


export async function createProject(projectData: ProjectFormData) {
   

    try {
        // Map frontend form data to backend DTO structure
        const payload = {
            projectName: projectData.name,
            description: projectData.description,
            projectStatus: projectData.status ? projectData.status.toUpperCase() : 'ACTIVE',
            startDate: projectData.startDate,
            endDate: projectData.endDate,
            clientName: projectData.clientName,
            country: projectData.clientCountry,
            state: projectData.clientState,
            email: projectData.clientEmail,
            phoneNo: projectData.clientPhone,
            userId: projectData.userId || projectData.manager, // Use selected project manager user ID
        };

        console.log('Creating project with payload:', payload);
        const response = await apiClient.post(API_URL, payload);
        console.log('Project creation response:', response.data);
        return response.data;
    } catch (error: any) {
        console.error('Error creating project:', error.response?.data || error.message);
        throw new Error(error.response?.data?.message || 'Failed to create project');
    }
}
