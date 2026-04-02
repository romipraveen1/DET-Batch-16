

//merged

export interface Severity {
  id: number;
  name: string;
  color: string;
  weight: number; // Added weight
}

export interface CreateSeverityRequest {
  name: string;
  color: string;
  weight: number; // Added weight
}

export interface CreateSeverityResponse {
  status: string;
  message: string;
  statusCode: number;
  data?: Severity;
}

export interface GetSeveritiesResponse {
  status: string;
  message: string;
  data: Severity[];
}

export interface ErrorResponse {
  status: string;
  message: string;
  statusCode: number;
}

export const createSeverity = async (data: CreateSeverityRequest): Promise<CreateSeverityResponse> => {
  console.log('API: createSeverity (Mocked for Demo)', data);
  return { status: "success", message: "Created (Mocked)", statusCode: 201 };
};

export const getSeverities = async (): Promise<GetSeveritiesResponse> => {
  console.log('API: getSeverities (Mocked for Demo)');
  return {
    status: "success",
    message: "Fetched (Mocked)",
    data: [
      { id: 1, name: "Low", color: "#3B82F6", weight: 1 },
      { id: 2, name: "Medium", color: "#F59E0B", weight: 2 },
      { id: 3, name: "High", color: "#EF4444", weight: 3 },
      { id: 4, name: "Critical", color: "#7C3AED", weight: 4 },
    ]
  };
};

export const updateSeverity = async (id: number, data: Partial<CreateSeverityRequest>): Promise<CreateSeverityResponse> => {
  console.log('API: updateSeverity (Mocked for Demo)', { id, data });
  return { status: "success", message: "Updated (Mocked)", statusCode: 200 };
};

export const deleteSeverity = async (id: number): Promise<CreateSeverityResponse> => {
  console.log('API: deleteSeverity (Mocked for Demo)', id);
  return { status: "success", message: "Deleted (Mocked)", statusCode: 200 };
};
