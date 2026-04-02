
// Interface for time to find defects response
export interface TimeToFindDefectsResponse {
  status: string;
  message: string;
  data: {
    dayNumber: number;
    totalDefects: number;
    periodStart: string;
    periodEnd: string;
  }[];
  statusCode: number;
}

// Interface for time to fix defects response
export interface TimeToFixDefectsResponse {
  projectId: number;
  releaseName: string;
  dailyData: {
    label: string;
    dayNumber: number;
    defectFixedCount: number;
    timeRange: string;
  }[];
  data?: {
    label: string;
    dayNumber: number;
    defectFixedCount: number;
    timeRange: string;
  }[];
}

// Fetch defect severity summary for a given project
export async function getDefectSeveritySummary(projectId: string) {
  console.log('API: getDefectSeveritySummary (Mocked for Demo)', projectId);
  return {
    status: 'success',
    data: {
      defectSummary: [
        { severity: 'Critical', total: 5, statusCounts: { 'new': 2, 'open': 3 } },
        { severity: 'High', total: 12, statusCounts: { 'open': 8, 'fixed': 4 } },
        { severity: 'Medium', total: 25, statusCounts: { 'fixed': 20, 'closed': 5 } },
        { severity: 'Low', total: 18, statusCounts: { 'closed': 18 } }
      ],
      Remark: 150,
      TotalDefect: 200
    }
  };
}

// Fetch day-wise defect counts for a release
export async function getReleaseDefectsDaily(projectId: string, releaseName: string) {
  console.log('API: getReleaseDefectsDaily (Mocked for Demo)', { projectId, releaseName });
  return {
    status: 'success',
    data: Array.from({ length: 7 }, (_, i) => ({
      dayNumber: i + 1,
      totalDefects: Math.floor(Math.random() * 10),
      periodStart: new Date().toISOString(),
      periodEnd: new Date().toISOString()
    }))
  };
}

// Fetch day-wise fixed defect counts for a release (using release name)
export async function getReleaseFixedDefectsDaily(projectId: string, releaseName: string) {
  console.log('API: getReleaseFixedDefectsDaily (Mocked for Demo)', { projectId, releaseName });
  return {
    status: 'success',
    data: Array.from({ length: 7 }, (_, i) => ({
      label: `Day ${i + 1}`,
      dayNumber: i + 1,
      defectFixedCount: Math.floor(Math.random() * 8),
      timeRange: '24h'
    }))
  };
}

// Fetch day-wise fixed defect counts for a release (using release ID)
export async function getTimeToFixDefectsDaily(projectId: number, releaseId: number) {
  console.log('API: getTimeToFixDefectsDaily (Mocked for Demo)', { projectId, releaseId });
  return {
    projectId,
    releaseName: 'Mock Release',
    dailyData: Array.from({ length: 7 }, (_, i) => ({
      label: `Day ${i + 1}`,
      dayNumber: i + 1,
      defectFixedCount: Math.floor(Math.random() * 5),
      timeRange: '24h'
    }))
  };
}
