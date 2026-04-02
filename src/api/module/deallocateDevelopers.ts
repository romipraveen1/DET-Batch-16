
import apiClient from "../../lib/api";

// Use direct URL since proxy is causing issues for some endpoints
const BASE_URL = import.meta.env.VITE_BASE_URL;

// Deallocate developer from module using allocateModuleId
export const deallocateModuleLeaderWithAllocateModuleId = async (
  allocateModuleId: number
) => {
  try {
    console.log('Deallocating module leader using allocateModuleId:', { allocateModuleId });

    const response = await apiClient.delete(`${BASE_URL}allocateModule/${allocateModuleId}`, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      withCredentials: false,
      timeout: 1000000
    });

    console.log('Deallocate module leader response:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('Deallocate module leader error:', {
      allocateModuleId,
      error: error.response?.data || error.message,
      status: error.response?.status
    });

    // Provide specific error messages
    if (error.response?.status === 403) {
      throw new Error(`Access denied. You may not have permission to deallocate this module leader. (allocateModuleId: ${allocateModuleId})`);
    } else if (error.response?.status === 404) {
      throw new Error(`Module allocation not found. The allocation may have been removed. (allocateModuleId: ${allocateModuleId})`);
    } else if (error.response?.status === 401) {
      throw new Error('Authentication required. Please log in again.');
    } else {
      throw new Error(`Failed to deallocate module leader: ${error.response?.data?.message || error.message}`);
    }
  }
};

// Legacy deallocate developer from module (kept for backward compatibility)
export const deallocateDeveloperFromModule = async (
  projectId: number,
  moduleId: number,
  userId: number
) => {
  try {
    const response = await apiClient.delete(`${BASE_URL}allocateModule/deallocate-module-leader`, {
      data: {
        projectId,
        moduleId,
        userId
      },
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      withCredentials: false
    });
    return response.data;
  } catch (error) {
    console.error('Deallocate developer from module error:', error);
    throw error;
  }
};

// Deallocate developer from submodule using allocateModuleId (allocationId)
export const deallocateSubmoduleDeveloperWithAllocateModuleId = async (
  allocateModuleId: number
) => {
  try {
    console.log('Deallocating submodule developer using allocateModuleId (allocationId):', { allocateModuleId });

    const response = await apiClient.delete(`${BASE_URL}allocateModule/allocate-submodule/${allocateModuleId}`, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      withCredentials: false,
      timeout: 1000000
    });

    console.log('Deallocate submodule developer response:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('Deallocate submodule developer error:', {
      allocateModuleId,
      error: error.response?.data || error.message,
      status: error.response?.status
    });

    // Provide specific error messages
    if (error.response?.status === 403) {
      throw new Error(`Access denied. You may not have permission to deallocate this submodule developer. (allocateModuleId: ${allocateModuleId})`);
    } else if (error.response?.status === 404) {
      throw new Error(`Submodule allocation not found. The allocation may have been removed. (allocateModuleId: ${allocateModuleId})`);
    } else if (error.response?.status === 401) {
      throw new Error('Authentication required. Please log in again.');
    } else {
      throw new Error(`Failed to deallocate submodule developer: ${error.response?.data?.message || error.message}`);
    }
  }
};

// Legacy deallocate developer from submodule (kept for backward compatibility)
export const deallocateDeveloperFromSubmodule = async (
  projectId: number,
  moduleId: number,
  submoduleId: number,
  userId: number
) => {
  try {
    const response = await apiClient.delete(`${BASE_URL}allocateModule/deallocate-submodule-developer`, {
      data: {
        projectId,
        moduleId,
        submoduleId,
        userId
      },
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      withCredentials: false
    });
    return response.data;
  } catch (error) {
    console.error('Deallocate developer from submodule error:', error);
    throw error;
  }
};

// Reassign developer using allocateModuleId and new userId
export const reassignDeveloperWithAllocateModuleId = async (
  allocateModuleId: number,
  newUserId: number
) => {
  try {
    console.log('Reassigning developer using allocateModuleId:', { allocateModuleId, newUserId });

    const response = await apiClient.put(`${BASE_URL}allocateModule/${allocateModuleId}`, {
      userId: newUserId
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      withCredentials: false,
      timeout: 1000000
    });

    console.log('Reassign developer response:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('Reassign developer error:', {
      allocateModuleId,
      newUserId,
      error: error.response?.data || error.message,
      status: error.response?.status
    });

    // Provide specific error messages
    if (error.response?.status === 403) {
      throw new Error(`Access denied. You may not have permission to reassign this developer. (allocateModuleId: ${allocateModuleId})`);
    } else if (error.response?.status === 404) {
      throw new Error(`Allocation not found. The allocation may have been removed. (allocateModuleId: ${allocateModuleId})`);
    } else if (error.response?.status === 401) {
      throw new Error('Authentication required. Please log in again.');
    } else {
      throw new Error(`Failed to reassign developer: ${error.response?.data?.message || error.message}`);
    }
  }
};

// Reassign developer for submodule using allocationId and new userId
export const reassignSubmoduleDeveloperWithAllocateModuleId = async (
  allocationId: number,
  newUserId: number
) => {
  try {
    console.log('Reassigning submodule developer using allocationId:', { allocationId, newUserId });

    const response = await apiClient.put(`${BASE_URL}allocateModule/allocate-submodule/${allocationId}`, {
      userId: newUserId
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      withCredentials: false,
      timeout: 1000000
    });

    console.log('Reassign submodule developer response:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('Reassign submodule developer error:', {
      allocationId,
      newUserId,
      error: error.response?.data || error.message,
      status: error.response?.status
    });

    // Provide specific error messages
    if (error.response?.status === 403) {
      throw new Error(`Access denied. You may not have permission to reassign this submodule developer. (allocationId: ${allocationId})`);
    } else if (error.response?.status === 404) {
      throw new Error(`Submodule allocation not found. The allocation may have been removed. (allocationId: ${allocationId})`);
    } else if (error.response?.status === 401) {
      throw new Error('Authentication required. Please log in again.');
    } else {
      throw new Error(`Failed to reassign submodule developer: ${error.response?.data?.message || error.message}`);
    }
  }
};

// Legacy reassign function (kept for backward compatibility)
export const reassignDeveloperToModule = async (
  projectId: number,
  moduleId: number,
  oldUserId: number,
  newUserId: number
) => {
  try {
    const response = await apiClient.put(`${BASE_URL}allocateModule/reassign-module-leader`, {
      projectId,
      moduleId,
      oldUserId,
      newUserId
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      withCredentials: false
    });
    return response.data;
  } catch (error) {
    console.error('Reassign developer to module error:', error);
    throw error;
  }
};

// Reassign developer to submodule (remove old allocation and add new one)
export const reassignDeveloperToSubmodule = async (
  projectId: number,
  moduleId: number,
  submoduleId: number,
  oldUserId: number,
  newUserId: number
) => {
  try {
    const response = await apiClient.put(`${BASE_URL}allocateModule/reassign-submodule-developer`, {
      projectId,
      moduleId,
      submoduleId,
      oldUserId,
      newUserId
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      withCredentials: false
    });
    return response.data;
  } catch (error) {
    console.error('Reassign developer to submodule error:', error);
    throw error;
  }
}; 