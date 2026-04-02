
export interface Designations {
  id: number;
  designationName: string;
  name: string;
}

export async function getDesignations() {
  console.log('API: getDesignations (Mocked for Demo)');
  return {
    status: 'success',
    data: [
      { id: 1, designationName: 'Software Engineer', name: 'Software Engineer' },
      { id: 2, designationName: 'Senior Software Engineer', name: 'Senior Software Engineer' },
      { id: 3, designationName: 'QA Engineer', name: 'QA Engineer' },
      { id: 4, designationName: 'Project Manager', name: 'Project Manager' }
    ]
  };
}

export const getAllDesignations = getDesignations;

export async function createDesignation(data: any) {
  console.log('API: createDesignation (Mocked for Demo)', data);
  return { status: 'success', message: 'Designation created successfully (Mocked)', data };
}

export async function putDesignation(id: string | number, data: any) {
  console.log('API: putDesignation (Mocked for Demo)', { id, data });
  return { status: 'success', message: 'Designation updated successfully (Mocked)', data };
}

export const updateDesignation = putDesignation;

export async function deleteDesignation(id: string | number) {
  console.log('API: deleteDesignation (Mocked for Demo)', id);
  return { status: 'success', message: 'Designation deleted successfully (Mocked)' };
}