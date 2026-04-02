
export interface CreateCommentRequest {
  userId: string | number;
  defectId: string | number;
  comment: string;
  attachment?: string | null;
}

export interface CreateCommentResponse {
  message: string;
  data?: any;
  status?: string;
  statusCode?: number;
}

export const createComment = async (payload: CreateCommentRequest): Promise<CreateCommentResponse> => {
  console.log('API: createComment (Mocked for Demo)', payload);
  return {
    message: 'Comment created successfully (Mocked)',
    status: 'success',
    statusCode: 201,
    data: { ...payload, id: Math.floor(Math.random() * 1000), createdAt: new Date().toISOString() }
  };
};
