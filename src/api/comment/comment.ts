
export interface Comment {
  id: number;
  comment: string;
  userId: number | string;
  defectId: number | string;
  attachment?: string | null;
  createdAt: string;
}

export interface GetCommentsResponse {
  message: string;
  data: Comment[];
  status?: string;
  statusCode?: number;
}

export const getCommentsByDefectId = async (defectId: number | string): Promise<GetCommentsResponse> => {
  console.log('API: getCommentsByDefectId (Mocked for Demo)', defectId);
  return {
    message: 'Fetched (Mocked)',
    status: 'success',
    statusCode: 200,
    data: [
      { id: 1, comment: 'Initial comment', userId: 1, defectId, createdAt: new Date().toISOString() },
      { id: 2, comment: 'Work in progress', userId: 2, defectId, createdAt: new Date().toISOString() }
    ]
  };
};
