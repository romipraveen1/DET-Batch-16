
export interface DefectHistoryEntry {
  status: string;
  changedAt: string;
  comment: string;
  changedBy?: string;
}

export async function getDefectHistoryByDefectId(defectId: string) {
  console.log('API: getDefectHistoryByDefectId (Mocked for Demo)', defectId);
  return {
    status: 'success',
    data: [
      { status: 'NEW', changedAt: '2024-03-01T10:00:00Z', comment: 'Defect created', changedBy: 'Admin' },
      { status: 'OPEN', changedAt: '2024-03-02T14:30:00Z', comment: 'Assigned to developer', changedBy: 'Manager' },
      { status: 'FIXED', changedAt: '2024-03-04T09:15:00Z', comment: 'Bug fixed by John', changedBy: 'Developer' }
    ]
  };
}

export const getDefectHistory = getDefectHistoryByDefectId;
