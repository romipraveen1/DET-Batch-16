import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ProjectCard from '../components/ui/ProjectCard';
import { useApp } from '../context/AppContext';
import { Pie as ChartJSPie } from 'react-chartjs-2';
import { Modal } from '../components/ui/Modal';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Chart as ChartJS, ArcElement, Tooltip as ChartTooltip, Legend as ChartLegend } from 'chart.js';
import { AlertCircle, Clock, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';

import { ProjectSelector } from '../components/ui/ProjectSelector';
import DefectToRemarkRatio from '../components/ui/DefectToRemarkRatio';
import { getDefectSeveritySummary, getReleaseDefectsDaily, getTimeToFixDefectsDaily, TimeToFindDefectsResponse, TimeToFixDefectsResponse } from '../api/dashboard/dash_get';
import { getAllDefectStatuses, DefectStatus } from '../api/defectStatus';
import { getSeverities, Severity } from '../api/severity';
import { getDefectTypeByProjectId } from '../api/dashboard/defecttype';
import { getDefectRemarkRatioByProjectId } from '../api/dashboard/remarkratio';
import { getDefectSeverityIndex } from '../api/dashboard/dsi';
import { getDefectDensity, DefectDensityData } from '../api/KLOC/getKLOC';
import { updateProjectKloc } from '../api/KLOC/putKLOC';
import { getDefectsByModule } from '../api/dashboard/defectbymodule';
import { getAllProjects } from '../api/projectget';
import { getProjectCardColor } from '../api/dashboard/projectCardColor';
import { getReopenCountSummary } from '../api/dashboard/Defectreopen';
import { projectReleaseCardView, ProjectRelease } from '../api/releaseView/ProjectReleaseCardView';
import { getActiveReleases, ActiveRelease } from '../api/releaseView/ActiveReleases';
import { getDefectsByProjectId, FilteredDefect } from '../api/defect/filterDefectByProject';
ChartJS.register(ArcElement, ChartTooltip, ChartLegend);
console.log('Dashboard: Initializing Prototype...');

export const Dashboard: React.FC = () => {
  // Remove projects from context for overview
  const { defects, selectedProjectId, setSelectedProjectId } = useApp();
  const [projects, setProjects] = useState<any[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [projectsError, setProjectsError] = useState<string | null>(null);

  // Debug logging for selectedProjectId changes
  useEffect(() => {
    console.log('Dashboard: selectedProjectId changed to:', selectedProjectId);
  }, [selectedProjectId]);
  // Remove KLOC state from dashboard, always read from backend
  const navigate = useNavigate();
  const [reopenModal, setReopenModal] = useState<{ open: boolean; label: string; defects: any[] }>({ open: false, label: '', defects: [] });
  const [riskFilter, setRiskFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [pieModal, setPieModal] = useState<{ open: boolean; severity: string | null }>({ open: false, severity: null });
  const [reopenedHoveredIdx, setReopenedHoveredIdx] = useState<number | null>(null);
  const reopenedChartRef = useRef<any>(null);
  const [isReopenedCardHovered, setIsReopenedCardHovered] = useState(false);
  const [hoveredModuleIdx, setHoveredModuleIdx] = useState<number | null>(null);
  const [isModuleCardHovered, setIsModuleCardHovered] = useState(false);
  const [moduleDetailModal, setModuleDetailModal] = useState<{ open: boolean; mod: any; totalHigh: number; totalMed: number; totalLow: number } | null>(null);
  const [reopenedDetailModal, setReopenedDetailModal] = useState<{ open: boolean; label: string; defects: any[] } | null>(null);
  // State for hover table functionality
  const [hoveredReopenSegment, setHoveredReopenSegment] = useState<{ label: string; defects: FilteredDefect[] } | null>(null);
  const [allDefects, setAllDefects] = useState<FilteredDefect[]>([]);
  const [loadingDefects, setLoadingDefects] = useState(false);
  // Add state for defect severity summary from API
  const [defectSeveritySummary, setDefectSeveritySummary] = useState<any>(null);
  const [loadingSeveritySummary, setLoadingSeveritySummary] = useState(false);
  const [severitySummaryError, setSeveritySummaryError] = useState<string | null>(null);
  // Local state for status types
  const [statusTypes, setStatusTypes] = useState<DefectStatus[]>([]);
  const [loadingStatusTypes, setLoadingStatusTypes] = useState(true);
  const [statusTypesError, setStatusTypesError] = useState<string | null>(null);
  // State for severities
  const [severities, setSeverities] = useState<Severity[]>([]);
  const [loadingSeverities, setLoadingSeverities] = useState(true);
  const [severitiesError, setSeveritiesError] = useState<string | null>(null);
  // State for defect type distribution
  const [defectTypeData, setDefectTypeData] = useState<{ labels: string[]; counts: number[]; percentages?: number[]; total?: number; mostCommon?: string; mostCount?: number; } | null>(null);
  const [loadingDefectType, setLoadingDefectType] = useState(false);
  const [defectTypeError, setDefectTypeError] = useState<string | null>(null);
  // State for defect to remark ratio
  const [remarkRatioData, setRemarkRatioData] = useState<{
    ratio?: string;
    category?: string;
    color?: string;
  } | null>(null);
  const [loadingRemarkRatio, setLoadingRemarkRatio] = useState(false);
  const [remarkRatioError, setRemarkRatioError] = useState<string | null>(null);
  const [dsi, setDsi] = useState<string | null>(null);
  const [loadingDsi, setLoadingDsi] = useState(false);
  const [dsiError, setDsiError] = useState<string | null>(null);
  // KLOC state for editing
  const [klocInput, setKlocInput] = useState<number>(0.1);
  const [defectDensity, setDefectDensity] = useState<DefectDensityData | null>(null);

  // KLOC update handler
  const handleKlocInputChange = async () => {
    if (!selectedProjectId) return;

    const value = Number(klocInput) || 0.1;

    try {
      // Use the new API that updates KLOC and calculates defect density in the database
      const response = await updateProjectKloc(Number(selectedProjectId), value);
      console.log("KLOC updated successfully:", response);

      // Refresh defect density data after updating KLOC to get the latest calculated values
      const numericProjectId = String(selectedProjectId).replace(/\D/g, '');
      const apiData = await getDefectDensity(numericProjectId);
      if (apiData && apiData.data) {
        setDefectDensity({
          kloc: apiData.data.kloc,
          defects: apiData.data.defects,
          defectDensity: apiData.data.defectDensity,
        });
        // Update the input to reflect the actual saved value
        setKlocInput(apiData.data.kloc || value);
      }
    } catch (error) {
      console.error("Failed to update KLOC:", error);
      // You might want to show an error message to the user here
    }
  };
  const [loadingDefectDensity, setLoadingDefectDensity] = useState(false);
  const [defectDensityError, setDefectDensityError] = useState<string | null>(null);
  const [defectsByModule, setDefectsByModule] = useState<any[]>([]);
  const [loadingDefectsByModule, setLoadingDefectsByModule] = useState(false);
  const [defectsByModuleError, setDefectsByModuleError] = useState<string | null>(null);
  const [projectColors, setProjectColors] = useState<{ [projectId: string]: string }>({});
  const [releases, setReleases] = useState<ProjectRelease[]>([]);
  const [selectedRelease, setSelectedRelease] = useState<{ releaseId: number; releaseName: string } | null>(null);
  const [loadingReleases, setLoadingReleases] = useState(false);
  const [releasesError, setReleasesError] = useState<string | null>(null);
  const [releaseDailyDefects, setReleaseDailyDefects] = useState<TimeToFindDefectsResponse['data'] | null>(null);
  const [loadingReleaseDailyDefects, setLoadingReleaseDailyDefects] = useState(false);
  const [releaseDailyFixedDefects, setReleaseDailyFixedDefects] = useState<TimeToFixDefectsResponse['dailyData'] | null>(null);
  const [loadingReleaseDailyFixedDefects, setLoadingReleaseDailyFixedDefects] = useState(false);

  const FetchData = async () => {
    setLoadingProjects(true);
    setProjectsError(null);
    try {
      const response: any = await getAllProjects();
      setProjects(response?.data || []);
      setLoadingProjects(false);
      response?.data && response?.data.forEach((project: any) => {
        getProjectCardColor(project.id)
          .then((className) => {
            setProjectColors((prev) => ({ ...prev, [project.id]: className }));
          })
          .catch(() => {
            console.log('Failed to fetch project card color for project:', project.id);
          });
      });
    } catch (error) {
      setProjectsError('Failed to load projects');
      setLoadingProjects(false);
    }
  }

  useEffect(() => {
    FetchData();
  }, []);
   
    
  const [reopenSummary, setReopenSummary] = useState<any[]>([]);
  const [loadingReopenSummary, setLoadingReopenSummary] = useState(false);
  const [reopenSummaryError, setReopenSummaryError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedProjectId) {
      setDefectSeveritySummary(null);
      setDsi(null);
      return;
    }
    setLoadingSeveritySummary(true);
    setSeveritySummaryError(null);
    const numericProjectId = String(selectedProjectId).replace(/\D/g, '');
    getDefectSeveritySummary(numericProjectId)
      .then((apiData) => {
        // Map API data to UI format dynamically for all severities provided by backend
        const dynamicSummary: any = {};
        if (apiData && apiData.data && Array.isArray(apiData.data.defectSummary)) {
          apiData.data.defectSummary.forEach((item: any) => {
            const sevKey = String(item.severity || '').toLowerCase();
            const statusCounts: { [key: string]: number } = {};
            if (item.statuses && typeof item.statuses === 'object') {
              Object.entries(item.statuses).forEach(([status, val]: [string, any]) => {
                const normalizedStatus = String(status).toLowerCase();
                const count = (val && typeof (val as any).count === 'number') ? (val as any).count : (typeof val === 'number' ? val : 0);
                statusCounts[normalizedStatus] = count;
              });
            }
            dynamicSummary[sevKey] = {
              statusCounts,
              total: typeof item.total === 'number' ? item.total : 0,
              totalDefects: typeof item.totalDefects === 'number' ? item.totalDefects : 0,
              validDefects: typeof item.validDefects === 'number' ? item.validDefects : 0,
            };
          });
        }
        if (apiData && apiData.data) {
          if (typeof apiData.data.Remark === 'number') dynamicSummary.Remark = apiData.data.Remark;
          if (typeof apiData.data.TotalDefect === 'number') dynamicSummary.TotalDefect = apiData.data.TotalDefect;
        }

        setDefectSeveritySummary(dynamicSummary);
        setLoadingSeveritySummary(false);
      })
      .catch(() => {
        setSeveritySummaryError('Failed to load defect severity summary');
        setLoadingSeveritySummary(false);
      });
  }, [selectedProjectId]);

  // Fetch defects data for hover table functionality
  useEffect(() => {
    if (!selectedProjectId) {
      setAllDefects([]);
      return;
    }
    setLoadingDefects(true);
    getDefectsByProjectId(selectedProjectId)
      .then((defects) => {
        setAllDefects(defects);
        setLoadingDefects(false);
      })
      .catch((error) => {
        console.error('Error fetching defects:', error);
        setAllDefects([]);
        setLoadingDefects(false);
      });
  }, [selectedProjectId]);

  // Helper function to filter defects by reopen count based on segment label
  const getDefectsByReopenCount = (label: string): FilteredDefect[] => {
    if (!allDefects.length) return [];

    // Parse the label to determine reopen count range
    // Expected labels: "1 time", "2 times", "3 times", "4+ times", etc.
    if (label.includes('1 time')) {
      return allDefects.filter(d => d.reOpenCount === 1);
    } else if (label.includes('2 times')) {
      return allDefects.filter(d => d.reOpenCount === 2);
    } else if (label.includes('3 times')) {
      return allDefects.filter(d => d.reOpenCount === 3);
    } else if (label.includes('4+ times') || label.includes('4 or more')) {
      return allDefects.filter(d => d.reOpenCount >= 4);
    } else {
      // Try to extract number from label
      const match = label.match(/(\d+)/);
      if (match) {
        const count = parseInt(match[1]);
        return allDefects.filter(d => d.reOpenCount === count);
      }
    }
    return [];
  };

  useEffect(() => {
    if (!selectedProjectId) {
      setDsi(null);
      setDsiError(null);
      return;
    }
    setLoadingDsi(true);
    setDsiError(null);
    getDefectSeverityIndex(selectedProjectId)
      .then((data) => {
        // Extract dsiPercentage from backend response
        let value = data?.data?.dsiPercentage ?? null;
        if (typeof value === 'number') value = value.toFixed(2);
        setDsi(value?.toString() ?? null);
        setLoadingDsi(false);
      })
      .catch(() => {
        setDsiError('Failed to load Defect Severity Index');
        setDsi(null);
        setLoadingDsi(false);
      });
  }, [selectedProjectId]);

  // Fetch status types from backend
  useEffect(() => {
    setLoadingStatusTypes(true);
    setStatusTypesError(null);
    getAllDefectStatuses()
      .then((res) => {
        if (res && res.data) {
          setStatusTypes(res.data);
        } else {
          setStatusTypes([]);
        }
        setLoadingStatusTypes(false);
      })
      .catch(() => {
        setStatusTypesError('Failed to load status types');
        setStatusTypes([]);
        setLoadingStatusTypes(false);
      });
  }, []);

  // Fetch severities from backend
  useEffect(() => {
    setLoadingSeverities(true);
    setSeveritiesError(null);
    getSeverities()
      .then((res) => {
        if (res && res.data) {
          setSeverities(res.data);
        } else {
          setSeverities([]);
        }
        setLoadingSeverities(false);
      })
      .catch(() => {
        setSeveritiesError('Failed to load severities');
        setSeverities([]);
        setLoadingSeverities(false);
      });
  }, []);

  useEffect(() => {
    if (!selectedProjectId) {
      setDefectTypeData(null);
      return;
    }
    setLoadingDefectType(true);
    setDefectTypeError(null);
    getDefectTypeByProjectId(selectedProjectId)
      .then((res) => {
        // Support new backend structure: res.data.defectTypes is an array
        if (res?.data?.defectTypes && Array.isArray(res.data.defectTypes)) {
          setDefectTypeData({
            labels: res.data.defectTypes.map((d: any) => d.defectType),
            counts: res.data.defectTypes.map((d: any) => d.defectCount),
            percentages: res.data.defectTypes.map((d: any) => d.percentage),
            total: res.data.totalDefectCount,
            mostCommon: res.data.mostCommonDefectType,
            mostCount: res.data.mostCommonDefectCount,
          });
        } else if (Array.isArray(res?.data)) {
          setDefectTypeData({
            labels: res.data.map((d: any) => d.type),
            counts: res.data.map((d: any) => d.count),
          });
        } else if (res?.labels && res?.counts) {
          setDefectTypeData({ labels: res.labels, counts: res.counts });
        } else {
          setDefectTypeData(null);
          setDefectTypeError('No data available');
        }
        setLoadingDefectType(false);
      })
      .catch(() => {
        setDefectTypeError('Failed to load defect type distribution');
        setDefectTypeData(null);
        setLoadingDefectType(false);
      });
  }, [selectedProjectId]);

  useEffect(() => {
    if (!selectedProjectId) {
      setRemarkRatioData(null);
      return;
    }
    setLoadingRemarkRatio(true);
    setRemarkRatioError(null);
    getDefectRemarkRatioByProjectId(selectedProjectId)
      .then((res) => {
        if (!res || !res.data || Object.keys(res.data).length === 0) {
          setRemarkRatioData(null);
          setRemarkRatioError('No defect or remark data available');
          setLoadingRemarkRatio(false);
          return;
        }

        if (res.data.error) {
          setRemarkRatioData(null);
          setRemarkRatioError(res.data.error);
          setLoadingRemarkRatio(false);
          return;
        }

        if (
          typeof res.data.ratio === 'string' &&
          typeof res.data.category === 'string' &&
          typeof res.data.color === 'string'
        ) {
          setRemarkRatioData({
            ratio: res.data.ratio,
            category: res.data.category,
            color: res.data.color,
          });
          setRemarkRatioError(null);
          setLoadingRemarkRatio(false);
          return;
        }

        setRemarkRatioData(null);
        setRemarkRatioError('Invalid defect to remark ratio data');
        setLoadingRemarkRatio(false);
      })
      .catch(() => {
        setRemarkRatioError('No data available');
        setRemarkRatioData(null);
        setLoadingRemarkRatio(false);
      });
  }, [selectedProjectId]);

  useEffect(() => {
    if (!selectedProjectId) {
      setDefectsByModule([]);
      return;
    }
    setLoadingDefectsByModule(true);
    setDefectsByModuleError(null);
    getDefectsByModule(selectedProjectId)
      .then((res) => {
        if (res && Array.isArray(res.data)) {
          setDefectsByModule(res.data);
        } else if (res && Array.isArray(res)) {
          setDefectsByModule(res);
        } else {
          setDefectsByModule([]);
          setDefectsByModuleError('No data available');
        }
        setLoadingDefectsByModule(false);
      })
      .catch(() => {
        setDefectsByModuleError('No data available');
        setDefectsByModule([]);
        setLoadingDefectsByModule(false);
      });
  }, [selectedProjectId]);

  useEffect(() => {
    if (!selectedProjectId) {
      setReopenSummary([]);
      return;
    }
    setLoadingReopenSummary(true);
    setReopenSummaryError(null);
    getReopenCountSummary(selectedProjectId)
      .then((res) => {
        if (res && Array.isArray(res.data)) {
          setReopenSummary(res.data);
        } else if (res && Array.isArray(res)) {
          setReopenSummary(res);
        } else {
          setReopenSummary([]);
          setReopenSummaryError('Invalid reopen summary data');
        }
        setLoadingReopenSummary(false);
      })
      .catch(() => {
        setReopenSummaryError('Failed to load reopen summary');
        setReopenSummary([]);
        setLoadingReopenSummary(false);
      });
  }, [selectedProjectId]);

  // Fetch releases when project changes
  useEffect(() => {
    if (!selectedProjectId) {
      setReleases([]);
      setSelectedRelease(null);
      return;
    }
    setLoadingReleases(true);
    setReleasesError(null);
    projectReleaseCardView(selectedProjectId)
      .then((res) => {
        setReleases(res.data || []);
        setLoadingReleases(false);
      })
      .catch(() => {
        setReleases([]);
        setLoadingReleases(false);
        setReleasesError('Failed to load releases');
      });
  }, [selectedProjectId]);

  // Fetch day-wise defects when a release is selected
  useEffect(() => {
    if (selectedProjectId && selectedRelease?.releaseName) {
      console.log('Fetching time to find data for projectId:', selectedProjectId, 'releaseName:', selectedRelease.releaseName);
      setLoadingReleaseDailyDefects(true);
      getReleaseDefectsDaily(selectedProjectId, selectedRelease.releaseName)
        .then((res) => {
          console.log('Time to find defects response:', res);
          setReleaseDailyDefects(res.data || []);
          setLoadingReleaseDailyDefects(false);
        })
        .catch((error: unknown) => {
          console.error('Error fetching time to find defects:', error);
          setReleaseDailyDefects([]);
          setLoadingReleaseDailyDefects(false);
        });
    } else {
      console.log('Not fetching time to find data - missing projectId or releaseName');
      console.log('selectedProjectId:', selectedProjectId);
      console.log('selectedRelease:', selectedRelease);
      setReleaseDailyDefects(null);
    }
  }, [selectedProjectId, selectedRelease]);

  // Fetch day-wise fixed defects when a release is selected
  useEffect(() => {
    if (selectedProjectId && selectedRelease?.releaseId) {
      console.log('Fetching time to fix data for projectId:', selectedProjectId, 'releaseId:', selectedRelease.releaseId);
      console.log('Selected release object:', selectedRelease);
      setLoadingReleaseDailyFixedDefects(true);
      console.log('=== New API Call Debug ===');
      console.log('Calling getTimeToFixDefectsDaily with projectId:', Number(selectedProjectId), 'releaseId:', selectedRelease.releaseId);
      getTimeToFixDefectsDaily(Number(selectedProjectId), selectedRelease.releaseId)
        .then((res) => {
          console.log('=== New API Response Debug ===');
          console.log('Time to fix defects response:', res);
          let dailyData = [];
          if (res && Array.isArray(res)) {
            dailyData = res;
          } else if (res && res.data && Array.isArray(res.data)) {
            dailyData = res.data;
          } else if (res && res.dailyData && Array.isArray(res.dailyData)) {
            dailyData = res.dailyData;
          }

          console.log('Processed daily data:', dailyData);
          console.log('Daily data length:', dailyData.length);
          setReleaseDailyFixedDefects(dailyData);
          setLoadingReleaseDailyFixedDefects(false);
        })
        .catch((error) => {
          console.error('Error fetching time to fix defects:', error);
          setReleaseDailyFixedDefects([]);
          setLoadingReleaseDailyFixedDefects(false);
        });
    } else {
      console.log('Not fetching time to fix data - missing projectId or releaseId');
      console.log('selectedProjectId:', selectedProjectId);
      console.log('selectedRelease:', selectedRelease);
      setReleaseDailyFixedDefects(null);
    }
  }, [selectedProjectId, selectedRelease]);

  // Helper to determine project status color (unused)
  function getProjectStatusColor(projectId: string): 'red' | 'yellow' | 'green' {
    const projectDefects = defects.filter(d => d.projectId === projectId);
    if (projectDefects.some(d => d.severity === 'high' || d.severity === 'critical')) return 'red';
    if (projectDefects.some(d => d.severity === 'medium')) return 'yellow';
    return 'green';
  }

  // Filter defects for selected project
  const projectDefects = selectedProjectId
    ? defects.filter(d => d.projectId === selectedProjectId)
    : [];
  const selectedProject = Array.isArray(projects) ? projects.find((p: any) => p.id === selectedProjectId) : null;

  // Filter defects for selected project and release
  const filteredDefects = selectedProjectId
    ? defects.filter(d => d.projectId === selectedProjectId && (!selectedRelease?.releaseName || String(d.releaseId ?? '') === selectedRelease.releaseName))
    : [];

  // Debug log for chart data
  if (selectedProjectId) {
    // All defects for this project
    const projectDefectsForDebug = defects.filter(d => d.projectId === selectedProjectId);
    // Log releaseId values for all defects in this project
    // Only log if in browser (avoid SSR noise)
    if (typeof window !== 'undefined') {
      console.log('--- Dashboard Debug ---');
      console.log('selectedRelease:', selectedRelease);
      console.log('filteredDefects:', filteredDefects);
      console.log('projectDefects (with releaseId):', projectDefectsForDebug.map(d => ({ id: d.id, releaseId: d.releaseId, createdAt: d.createdAt, updatedAt: d.updatedAt })));
      console.log('-----------------------');
    }
  }

  // --- Project Health Summary Logic ---
  // Count projects by risk color from integration
  const riskCounts = { high: 0, medium: 0, low: 0 };
  projects.forEach(project => {
    const risk = getRiskLevelFromClass(projectColors[project.id]) ?? 'low';
    riskCounts[risk]++;
  });

  useEffect(() => {
    if (!selectedProjectId) {
      setDefectDensity(null);
      return;
    }
    setLoadingDefectDensity(true);
    setDefectDensityError(null);
    const numericProjectId = String(selectedProjectId).replace(/\D/g, '');
    getDefectDensity(numericProjectId)
      .then((apiData) => {
        // Use correct backend fields
        if (apiData && apiData.data) {
          setDefectDensity({
            kloc: apiData.data.kloc,
            defects: apiData.data.defects,
            defectDensity: apiData.data.defectDensity, // optional, for direct display
          });
          setKlocInput(apiData.data.kloc || 0.1);
        } else {
          setDefectDensity({ kloc: 0.1, defects: 0, defectDensity: 0 });
          setKlocInput(0.1);
        }
        setLoadingDefectDensity(false);
      })
      .catch(() => {
        setDefectDensityError('Failed to load defect density');
        setDefectDensity({ kloc: 0.1, defects: 0, defectDensity: 0 });
        setKlocInput(0.1);
        setLoadingDefectDensity(false);
      });
  }, [selectedProjectId]);

  // Helper to extract text color class from Tailwind bg-gradient class
  function getTextColorClass(bgClass: string | undefined): string {
    if (!bgClass) return '';
    // Try to extract the 'from-...' color and convert to 'text-...'
    const match = bgClass.match(/from-([a-z]+-[0-9]+)/);
    if (match) {
      return `text-${match[1]}`;
    }
    // fallback
    return '';
  }

  // Helper to extract risk label from Tailwind/hex/rgb color classes
  function getRiskLabelFromClass(bgClass: string | undefined): string {
    if (!bgClass) return '';
    const cls = bgClass.toLowerCase();
    // High (red family)
    if (/(red|rose|#ef4444|#dc2626|rgb\(\s*239\s*,\s*68\s*,\s*68)/.test(cls)) return 'High Risk';
    // Medium (yellow/amber family)
    if (/(yellow|amber|#f59e0b|#facc15|rgb\(\s*250\s*,\s*204\s*,\s*21)/.test(cls)) return 'Medium Risk';
    // Low (green family)
    if (/(green|emerald|lime|teal|#22c55e|#10b981|#16a34a|rgb\(\s*34\s*,\s*197\s*,\s*94)/.test(cls)) return 'Low Risk';
    return '';
  }

  // Helper to extract risk level from Tailwind/hex/rgb color classes
  function getRiskLevelFromClass(bgClass: string | undefined): 'high' | 'medium' | 'low' | undefined {
    if (!bgClass) return undefined;
    const cls = bgClass.toLowerCase();
    if (/(red|rose|#ef4444|#dc2626|rgb\(\s*239\s*,\s*68\s*,\s*68)/.test(cls)) return 'high';
    if (/(yellow|amber|#f59e0b|#facc15|rgb\(\s*250\s*,\s*204\s*,\s*21)/.test(cls)) return 'medium';
    if (/(green|emerald|lime|teal|#22c55e|#10b981|#16a34a|rgb\(\s*34\s*,\s*197\s*,\s*94)/.test(cls)) return 'low';
    return undefined;
  }

  // Get risk label for selected project
  const selectedProjectRiskLabel = getRiskLabelFromClass(selectedProject ? projectColors[selectedProject.id] : undefined);

  if (!selectedProjectId) {
    // Show summary and project cards grid
    return (
      <>
        {/* Dashboard Heading */}
        <div className="max-w-5xl mx-auto flex flex-col items-center mt-16 mb-12">
          <h1
            className="text-5xl md:text-5xl font-extrabold tracking-tight text-gray-900 mb-4 drop-shadow-sm"
            style={{ letterSpacing: '-0.02em', fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}
          >
            Dashboard Overview
          </h1>
          <p
            className="text-lg md:text-xl font-medium text-gray-500 text-center max-w-2xl mb-2"
            style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif', lineHeight: '1.6' }}
          >
            Gain insights into your projects with real-time health metrics and status summaries
          </p>
          <div className="h-1 w-24 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-full mt-2 mb-1 opacity-80" />
        </div>
        
        {/* Section: Project Health Summary - Using the better structured version from code 1 */}
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-6 text-left tracking-tight flex items-center gap-3">
            <span className="inline-block w-2 h-8 bg-blue-500 rounded-full mr-2" />
            Project Status Insights
          </h2>
          {/* Modernized Project Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-7 mb-12">
            {/* High Risk Projects */}
            <div className="bg-white rounded-2xl shadow-lg flex items-center p-7 min-h-[150px] border-2 border-red-500/100 hover:shadow-xl transition-transform hover:scale-[1.03] group relative">
              <span className="flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-red-600 to-red-800 mr-5 shadow-md">
                { <AlertCircle className="w-9 h-9 text-red-100" /> }
              </span>
              <div>
                <div className="text-slate-700 font-semibold text-lg mb-1">High Risk Projects</div>
                <div className="text-4xl font-extrabold text-red-600">{riskCounts.high}</div>
                <div className="text-xs text-red-500 mt-1 font-medium">Immediate attention required</div>
              </div>
              <div className="absolute top-4 right-4 w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            </div>
            {/* Moderate Risk Projects */}
            <div className="bg-white rounded-2xl shadow-lg flex items-center p-7 min-h-[150px] border-2 border-yellow-500/100 hover:shadow-xl transition-transform hover:scale-[1.03] group relative">
              <span className="flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-500 mr-5 shadow-md">
                <Clock className="w-9 h-9 text-yellow-100" />
              </span>
              <div>
                <div className="text-slate-700 font-semibold text-lg mb-1">Medium Risk Projects</div>
                <div className="text-4xl font-extrabold text-yellow-600">{riskCounts.medium}</div>
                <div className="text-xs text-yellow-600 mt-1 font-medium">Monitor progress closely</div>
              </div>
              <div className="absolute top-4 right-4 w-3 h-3 rounded-full bg-yellow-400 animate-pulse" />
            </div>
            {/* Low Risk Projects */}
            <div className="bg-white rounded-2xl shadow-lg flex items-center p-7 min-h-[150px] border-2 border-green-600/80 hover:shadow-xl transition-transform hover:scale-[1.03] group relative">
              <span className="flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-green-600 mr-5 shadow-md">
                <CheckCircle className="w-9 h-9 text-green-100" />
              </span>
              <div>
                <div className="text-slate-700 font-semibold text-lg mb-1">Low Risk Projects</div>
                <div className="text-4xl font-extrabold text-green-600">{riskCounts.low}</div>
                <div className="text-xs text-green-600 mt-1 font-medium">Stable and on track</div>
              </div>
              <div className="absolute top-4 right-4 w-3 h-3 rounded-full bg-green-500 animate-pulse" />
            </div>
          </div>
            </div>
        {/* Divider */}
        <hr className="my-10 border-gray-200 max-w-5xl mx-auto" />
        
        {/* Section: All Projects - Using the better filter implementation from code 2 */}
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
            <h2 className="text-2xl font-bold text-gray-900">All Projects</h2>
            
                </div>
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-8">
            <span className="text-gray-700 font-medium mr-0 sm:mr-3 whitespace-nowrap self-start sm:self-center">Filter by severity:</span>
            <div className="flex bg-gradient-to-r from-slate-50 via-blue-50 to-slate-100 border border-slate-200 rounded-full shadow-[0_2px_16px_rgba(30,41,59,0.10)] px-2 py-1 gap-4 backdrop-blur-sm w-fit">
              <button
                className={`px-5 py-2 rounded-full font-semibold transition text-sm focus:outline-none focus:ring-2 focus:ring-blue-400
                  ${riskFilter === 'all'
                    ? 'bg-gradient-to-r from-blue-500 to-blue-400 text-white shadow-lg scale-105 ring-2 ring-blue-300'
                    : 'bg-white/60 text-slate-700 hover:bg-blue-100/60 hover:shadow-md hover:scale-105'}
                  backdrop-blur-[2px] border border-transparent`}
                style={{ boxShadow: riskFilter === 'all' ? '0 4px 24px 0 rgba(59,130,246,0.10)' : undefined }}
                onClick={() => setRiskFilter('all')}
              >
                All Projects
              </button>
              <button
                className={`px-5 py-2 rounded-full font-semibold transition text-sm focus:outline-none focus:ring-2 focus:ring-red-300
                  ${riskFilter === 'high'
                    ? 'bg-gradient-to-r from-red-600 to-red-800 text-white shadow-lg scale-105 ring-2 ring-red-200'
                    : 'bg-white/60 text-red-700 hover:bg-red-100/60 hover:shadow-md hover:scale-105'}
                  backdrop-blur-[2px] border border-transparent`}
                style={{ boxShadow: riskFilter === 'high' ? '0 4px 24px 0 rgba(239,68,68,0.10)' : undefined }}
                onClick={() => setRiskFilter('high')}
              >
                High Risk
              </button>
              <button
                className={`px-5 py-2 rounded-full font-semibold transition text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300
                  ${riskFilter === 'medium'
                    ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-white shadow-lg scale-105 ring-2 ring-yellow-200'
                    : 'bg-white/60 text-yellow-700 hover:bg-yellow-100/60 hover:shadow-md hover:scale-105'}
                  backdrop-blur-[2px] border border-transparent`}
                style={{ boxShadow: riskFilter === 'medium' ? '0 4px 24px 0 rgba(251,191,36,0.10)' : undefined }}
                onClick={() => setRiskFilter('medium')}
              >
                Medium Risk
              </button>
              <button
                className={`px-5 py-2 rounded-full font-semibold transition text-sm focus:outline-none focus:ring-2 focus:ring-green-300
                  ${riskFilter === 'low'
                    ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg scale-105 ring-2 ring-green-200'
                    : 'bg-white/60 text-green-700 hover:bg-green-100/60 hover:shadow-md hover:scale-105'}
                  backdrop-blur-[2px] border border-transparent`}
                style={{ boxShadow: riskFilter === 'low' ? '0 4px 24px 0 rgba(34,197,94,0.10)' : undefined }}
                onClick={() => setRiskFilter('low')}
              >
                Low Risk
              </button>
            </div>
          </div>
          {/* Project Cards Grid */}
          <div className="flex flex-wrap gap-8 justify-start py-6">
            {loadingProjects ? (
              <div className="text-gray-500">Loading projects...</div>
            ) : projectsError ? (
              <div className="text-red-500">{projectsError}</div>
            ) : projects.length === 0 ? (
              <div className="text-gray-400">No projects found.</div>
            ) : (() => {
              // Sort projects: high risk first, then medium, then low, using backend risk color/class
              const riskOrder = { high: 0, medium: 1, low: 2 };
              const sortedProjects = [...projects].sort((a: any, b: any) => {
                const riskA = getRiskLevelFromClass(projectColors[a.id]) ?? 'low';
                const riskB = getRiskLevelFromClass(projectColors[b.id]) ?? 'low';
                return riskOrder[riskA] - riskOrder[riskB];
              });
              return sortedProjects.map((project: any, idx: number) => {
                const projectDefects = defects.filter(d => d.projectId === project.id);
                const highCount = projectDefects.filter(d => d.severity === 'high' || d.severity === 'critical').length;
                const mediumCount = projectDefects.filter(d => d.severity === 'medium').length;
                const lowCount = projectDefects.filter(d => d.severity === 'low').length;
                let risk: 'high' | 'medium' | 'low' = getRiskLevelFromClass(projectColors[project.id]) ?? 'low';
                if (riskFilter !== 'all' && risk !== riskFilter) return null;
                return (
                  <div
                    key={project.id}
                    className="animate-fade-in"
                    style={{ animationDelay: `${idx * 60}ms` }}
                  >
                    <ProjectCard
                      name={project.name || project.projectName || 'Unnamed Project'}
                      risk={risk}
                      defectCounts={{ high: highCount, medium: mediumCount, low: lowCount }}
                      onClick={() => setSelectedProjectId(project.id)}
                      size="small"
                      customBgClass={projectColors[project.id]}
                      riskLabel={getRiskLabelFromClass(projectColors[project.id])}
                    />
                  </div>
                );
              });
            })()}
          </div>
            </div>
      </>
    );
  }

  // Show widgets for selected project
  return (
    <>
      <style>
        {`
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
        `}
      </style>
      <div className="max-w-6xl mx-auto px-4 pt-8">
        {/* Back Button for Project Dashboard */}
        {selectedProject && (
          <div className="flex justify-end mb-4">
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold shadow-sm border border-gray-200 transition"
              onClick={() => {
                console.log('Back button clicked - clearing selectedProjectId:', selectedProjectId);
                setSelectedProjectId(null);
              }}
            >
              <ChevronLeft className="w-5 h-5" />
              Back
            </button>
                </div>
        )}
        {/* Project Selection Panel (shared component) */}
        <div className="mb-6">
          <ProjectSelector
            projects={projects}
            selectedProjectId={selectedProjectId || ''}
            onSelect={(id: string) => setSelectedProjectId(id)}
          />
              </div>
        {/* Project Name/Status Bar */}
        {selectedProject && (
          <div className="bg-white rounded-2xl border border-gray-200 flex items-center justify-between px-8 py-4 mb-12" style={{ minHeight: '80px' }}>
            <div>
              <div className="text-2xl font-bold text-gray-900">{selectedProject.name || selectedProject.projectName || 'Unnamed Project'}</div>
            </div>
            <div className="flex flex-col items-end">
              {selectedProjectRiskLabel && (
                <span
                  className={
                    selectedProjectRiskLabel === 'High Risk'
                      ? 'bg-red-100 text-red-700 rounded-full px-4 py-1 text-sm font-semibold'
                      : selectedProjectRiskLabel === 'Medium Risk'
                      ? 'bg-yellow-100 text-yellow-800 rounded-full px-4 py-1 text-sm font-semibold'
                      : selectedProjectRiskLabel === 'Low Risk'
                      ? 'bg-green-100 text-green-800 rounded-full px-4 py-1 text-sm font-semibold'
                      : 'bg-gray-100 text-gray-500 rounded-full px-4 py-1 text-sm font-semibold'
                  }
                >
                  {selectedProjectRiskLabel}
                </span>
              )}
              {!selectedProjectRiskLabel && (
                <span className="bg-gray-100 text-gray-500 rounded-full px-4 py-1 text-sm font-semibold">NO RISK</span>
              )}
            </div>
          </div>
        )}
        {/* Defect Severity Breakdown */}
        <div className="mb-14">
          <div className="flex items-center mb-3 gap-4">
            <h2 className="text-lg font-semibold text-gray-600">Defect Severity Breakdown</h2>
            {/* Show total remark and total defect from backend summary */}
            {defectSeveritySummary && (
              <div className="flex items-center gap-3">
                <span className="text-base font-bold text-blue-500 border border-blue-400 rounded-lg px-3 py-1 bg-blue-50 shadow-sm" style={{ boxShadow: '0 1px 4px 0 rgba(59,130,246,0.07)' }}>
                  Total Remark : {defectSeveritySummary.Remark || 0}
                </span>
                <span className="text-base font-bold text-red-500 border border-red-400 rounded-lg px-3 py-1 bg-red-50 shadow-sm" style={{ boxShadow: '0 1px 4px 0 rgba(239,68,68,0.07)' }}>
                  Total Defect : {defectSeveritySummary.TotalDefect || 0}
                </span>
              </div>
            )}
          </div>
          {(loadingSeveritySummary || loadingStatusTypes || loadingSeverities) && <div className="text-gray-500 p-4">Loading...</div>}
          {(severitySummaryError || statusTypesError || severitiesError) && <div className="text-red-500 p-4">{severitySummaryError || statusTypesError || severitiesError}</div>}
          {!loadingSeveritySummary && !loadingStatusTypes && !loadingSeverities && !severitySummaryError && !statusTypesError && !severitiesError && defectSeveritySummary && statusTypes.length > 0 && severities.length > 0 && (
            <div className="relative flex items-center">
              <button
                onClick={() => {
                  const container = document.getElementById('severity-scroll');
                  if (container) container.scrollLeft -= 300;
                }}
                className="flex-shrink-0 z-10 bg-white shadow-md rounded-full p-1 hover:bg-gray-50 mr-2"
                type="button"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div
                id="severity-scroll"
                className="flex space-x-6 overflow-x-auto pb-2 scroll-smooth flex-1 scrollbar-hide"
                style={{
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                  maxWidth: '100%'
                }}
              >
              {(() => {
                const severityKeys = Object.keys(defectSeveritySummary).filter((key) => {
                  const v = defectSeveritySummary[key];
                  return v && typeof v === 'object' && 'statusCounts' in v;
                });
                const severityOrder: Record<string, number> = { critical: 3, high: 2, medium: 1, low: 0 };
                severityKeys.sort((a, b) => (severityOrder[b] ?? -1) - (severityOrder[a] ?? -1));
                return severityKeys.map((severity) => {
                  // Only use API data for rendering
                  const severityLabel = `Defects on ${severity.charAt(0).toUpperCase() + severity.slice(1)}`;
                  // Get severity color from API data
                  const severityData = severities.find(s => s.name.toLowerCase() === severity);
                  const severityColor = severityData?.color || '#6B7280';
                  const hexColor = severityColor.startsWith('#') ? severityColor : `#${severityColor}`;

                  // Generate border colors based on API color (lighter version for card border)
                  const generateLighterColor = (color: string) => {
                    // Convert hex to RGB, then lighten it
                    const hex = color.replace('#', '');
                    const r = parseInt(hex.substring(0, 2), 16);
                    const g = parseInt(hex.substring(2, 4), 16);
                    const b = parseInt(hex.substring(4, 6), 16);
                    // Lighten by mixing with white (increase RGB values towards 255)
                    const lighten = 0.7; // 70% lighter
                    const newR = Math.round(r + (255 - r) * lighten);
                    const newG = Math.round(g + (255 - g) * lighten);
                    const newB = Math.round(b + (255 - b) * lighten);
                    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
                  };

                  const borderColor = generateLighterColor(hexColor);
                  // Use backend status types for columns
                  const statusList = statusTypes.map(s => s.defectStatusName.toLowerCase());
                  const statusColorMap = Object.fromEntries(statusTypes.map(s => [s.defectStatusName.toLowerCase(), s.colorCode]));
                  const summary = defectSeveritySummary[severity] || { statusCounts: {}, total: 0 };
                  // Only use API data for status counts
                  const statusCounts = statusList.map(status => summary.statusCounts?.[status] || 0);
                  // Split status legend into two columns
                  const half = Math.ceil(statusList.length / 2);
                  const leftStatuses = statusList.slice(0, half);
                  const rightStatuses = statusList.slice(half);
                  return (
                    <div
                      key={severity}
                      className="bg-white rounded-xl shadow flex flex-col justify-between min-h-[200px] min-w-[300px] border border-l-8"
                      style={{ borderColor: borderColor, borderLeftColor: hexColor }}
                    >
                      <div className="px-6 pt-4 pb-1">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-base" style={{ color: hexColor }}>{severityLabel}</span>
                          <span className="font-semibold text-gray-600 text-base"></span>
                        </div>
                        {/* Removed Total Remark count from severity box, only show Total Defect for this severity */}
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
                            Total Defect: {summary.validDefects || 0}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-row gap-8 px-6 pb-1">
                        <div className="flex flex-col gap-1">
                          {leftStatuses.map((status, idx) => (
                            <div key={status} className="flex items-center gap-2 text-xs">
                              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: statusColorMap[status] }}></span>
                              <span className="text-gray-700 font-normal">{statusTypes[idx].defectStatusName}</span>
                              <span className="text-gray-700 font-medium">{statusCounts[idx]}</span>
                            </div>
                          ))}
                        </div>
                        <div className="flex flex-col gap-1">
                          {rightStatuses.map((status, idx) => (
                            <div key={status} className="flex items-center gap-2 text-xs">
                              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: statusColorMap[status] }}></span>
                              <span className="text-gray-700 font-normal">{statusTypes[half + idx].defectStatusName}</span>
                              <span className="text-gray-700 font-medium">{statusCounts[half + idx]}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="px-6 pb-3">
                        <button
                          className="mt-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-md font-medium text-xs border border-blue-100 hover:bg-blue-100 transition"
                          onClick={() => setPieModal({ open: true, severity })}
                        >
                          View Chart
                        </button>
                      </div>
                    </div>
                  );
                });
              })()}
              </div>
              <button
                onClick={() => {
                  const container = document.getElementById('severity-scroll');
                  if (container) container.scrollLeft += 300;
                }}
                className="flex-shrink-0 z-10 bg-white shadow-md rounded-full p-1 hover:bg-gray-50 ml-2"
                type="button"
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          )}
        </div>
        {/* Pie Chart Modal */}
        {pieModal.open && pieModal.severity && (() => {
          const severity = pieModal.severity;
          // Use API data for status counts
          const statusList = statusTypes.map(s => (s.defectStatusName || '').toLowerCase());
          const statusColorMap = Object.fromEntries(statusTypes.map(s => [(s.defectStatusName || '').toLowerCase(), s.colorCode]));
          const summary = defectSeveritySummary[severity] || { statusCounts: {}, total: 0 };
          const statusCounts = statusList.map(status => summary.statusCounts?.[status] || 0);
          const pieData = {
            labels: statusList.map(s => s.toUpperCase()),
            datasets: [
              {
                data: statusCounts,
                backgroundColor: statusList.map(s => statusColorMap[s] || '#ccc'),
              },
            ],
          };
          return (
            <Modal isOpen={pieModal.open} onClose={() => setPieModal({ open: false, severity: null })} title={`Status Breakdown for ${severity.charAt(0).toUpperCase() + severity.slice(1)}`}> 
              <div className="flex flex-col items-center justify-center p-4">
                <div className="w-64 h-64">
                  <ChartJSPie data={pieData} options={{ plugins: { legend: { display: true, position: 'bottom' } } }} />
                </div>
              </div>
            </Modal>
          );
        })()}
      </div>
      {/* Defect Density Meter & Defect Severity Index Row */}
      <div className="mb-14 grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
        {/* Defect Density Card */}
        <div className="bg-white rounded-xl shadow flex flex-col p-6 h-full border border-gray-200">
          <h2 className="text-lg font-semibold mb-3 text-gray-700">Defect Density</h2>
          <div className="flex-1 flex flex-col justify-center">
            {loadingDefectDensity ? (
              <div className="text-gray-500">Loading...</div>
            ) : defectDensityError ? (
              <div className="text-red-500">{defectDensityError}</div>
            ) : defectDensity ? (
              <DefectDensityMeter
                kloc={defectDensity.kloc}
                defectCount={defectDensity.defects}
                defectDensity={defectDensity.defectDensity}
                klocInput={klocInput}
                onKlocInputChange={setKlocInput}
                onKlocUpdate={handleKlocInputChange}
                canEdit={true}
              />
            ) : null}
          </div>
        </div>
      {/* Defect Severity Index Card */}
      <div className="bg-white rounded-xl shadow flex flex-col p-6 h-full border border-gray-200">
        <h2 className="text-lg font-semibold mb-3 text-gray-700">Defect Severity Index</h2>
        <div className="flex-1 flex flex-col items-center justify-center">
          {loadingDsi ? (
            <span className="text-gray-400">Loading...</span>
          ) : dsiError ? (
            <span className="text-red-500">{dsiError}</span>
          ) : (
            (() => {
              // Parse dsi as number
              const dsiValue = typeof dsi === 'string' ? parseFloat(dsi) : (typeof dsi === 'number' ? dsi : 0);
              let barColor = '#22c55e'; // green
              let numberColor = 'text-green-600';
              if (dsiValue >= 50) {
                barColor = '#ef4444'; // red
                numberColor = 'text-red-600';
              } else if (dsiValue >= 25) {
                barColor = '#facc15'; // yellow
                numberColor = 'text-yellow-500';
              }
              // Bar height: max 120px, min 0px
              const maxBarHeight = 120;
              const cappedDsi = Math.max(0, Math.min(dsiValue, 100));
              const barHeight = (cappedDsi / 100) * maxBarHeight;
              return (
                <div className="flex flex-col items-center w-full">
                  <div className="flex flex-row items-end justify-center gap-6 w-full" style={{ minHeight: maxBarHeight + 20 }}>
                    {/* Vertical Bar Meter */}
                    <div className="flex flex-col items-center justify-end h-full" style={{ height: maxBarHeight }}>
                      <div style={{
                        width: '28px',
                        height: `${maxBarHeight}px`,
                        background: '#f3f4f6',
                        borderRadius: '16px',
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'flex-end',
                        boxShadow: '0 2px 8px 0 rgba(30,41,59,0.07)'
                      }}>
                        <div style={{
                          width: '100%',
                          height: `${barHeight}px`,
                          background: barColor,
                          borderRadius: '16px',
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          transition: 'height 0.7s cubic-bezier(0.4,0,0.2,1)',
                        }} />
                        {/* Tick marks */}
                        <div style={{
                          position: 'absolute',
                          left: '100%',
                          top: 0,
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          marginLeft: '6px',
                          fontSize: '12px',
                          color: '#64748b',
                          fontWeight: 500,
                          pointerEvents: 'none',
                        }}>
                          <span>100</span>
                          <span>75</span>
                          <span>50</span>
                          <span>25</span>
                          <span>0</span>
                        </div>
                      </div>
                    </div>
                    {/* DSI Value and Label */}
                    <div className="flex flex-col items-center justify-center ml-2">
                      <span className={`text-4xl font-bold mb-2 ${numberColor}`}>{isNaN(dsiValue) ? '0.00' : dsiValue.toString()}</span>
                      <span className="text-gray-700 text-center">Weighted severity score (higher = more severe defects)</span>
                    </div>
                  </div>
                </div>
              );
            })()
          )}
        </div>
      </div>
      {/* Defect to Remark Ratio Card */}
      <div className="bg-white rounded-xl shadow flex flex-col p-6 h-full border border-gray-200">
        <h2 className="text-lg font-semibold mb-3 text-gray-700">Defect to Remark Ratio</h2>
        <div className="flex-1 flex flex-col items-center justify-center">
          {loadingRemarkRatio ? (
            <span className="text-gray-500">Loading...</span>
          ) : remarkRatioError ? (
            <span className="text-red-500">{remarkRatioError}</span>
          ) : remarkRatioData ? (
            <DefectToRemarkRatio
              ratio={remarkRatioData.ratio}
              category={remarkRatioData.category}
              color={remarkRatioData.color}
            />
          ) : (
            <span className="text-gray-400">No data available.</span>
          )}
        </div>
      </div>
      </div>
    {/* Defects Reopened Multiple Times & Defect Distribution by Type Row */}
    <div className="mb-14 flex flex-col md:flex-row gap-8 items-stretch">
      {/* Defects Reopened Multiple Times Pie Chart */}
      <div className="flex-1 bg-white rounded-2xl shadow p-6 flex flex-col relative">
        <h2 className="text-lg font-semibold mb-4 text-gray-900">Defects Reopened Multiple Times</h2>
        {loadingReopenSummary ? (
          <div className="text-gray-500">Loading...</div>
        ) : reopenSummaryError ? (
          <div className="text-red-500">{reopenSummaryError}</div>
        ) : reopenSummary && reopenSummary.length > 0 ? (
          (() => {
            const labels = reopenSummary.map(item => item.label);
            const data = {
              labels,
              datasets: [
                {
                  data: reopenSummary.map(item => item.count),
                  backgroundColor: [
                    '#4285F4', '#FBBC05', '#EA4335', '#C5221F', '#F29900', '#00B894', '#A259F7', '#00B8D9', '#FF6F00', '#8E24AA',
                  ].slice(0, reopenSummary.length),
                },
              ],
            };
            const total = reopenSummary.reduce((a, b) => a + (b.count || 0), 0);
            return (
              <>
                <div className="w-64 h-64 relative">
                  <ChartJSPie
                    data={data}
                    options={{
                      plugins: { legend: { display: false } },
                      onHover: (_, elements) => {
                        if (elements.length > 0) {
                          const elementIndex = elements[0].index;
                          const label = labels[elementIndex];
                          const filteredDefects = getDefectsByReopenCount(label);
                          setHoveredReopenSegment({ label, defects: filteredDefects });
                        } else {
                          setHoveredReopenSegment(null);
                        }
                      },
                      interaction: {
                        intersect: false,
                        mode: 'nearest'
                      }
                    }}
                  />
                  {/* Hover Table */}
                  {hoveredReopenSegment && hoveredReopenSegment.defects.length > 0 && (
                    <div className="absolute top-0 left-full ml-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-10 min-w-[150px]">
                      <h4 className="font-semibold text-gray-800 mb-2">{hoveredReopenSegment.label}</h4>
                      <div className="max-h-48 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="text-left py-1 px-2 font-medium text-gray-600">Defect ID</th>
                            </tr>
                          </thead>
                          <tbody>
                            {hoveredReopenSegment.defects.slice(0, 10).map((defect, idx) => (
                              <tr key={defect.id} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                                <td className="py-1 px-2 text-gray-800">{defect.defectId}</td>
                              </tr>
                            ))}
                            {hoveredReopenSegment.defects.length > 10 && (
                              <tr>
                                <td colSpan={2} className="py-1 px-2 text-gray-500 text-center">
                                  +{hoveredReopenSegment.defects.length - 10} more defects
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-6 grid grid-cols-1 gap-1 text-sm">
                  {reopenSummary.map((item, idx) => (
                    <div key={item.label} className="flex items-center gap-2">
                      <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: data.datasets[0].backgroundColor[idx] }}></span>
                      <span className="text-gray-700">{item.label}: <span className="font-semibold">{item.count}</span> <span className='text-gray-500'>({total > 0 ? ((item.count / total) * 100).toFixed(1) : 0}%)</span></span>
                    </div>
                  ))}
                </div>
              </>
            );
          })()
        ) : (
          <div className="text-gray-400">No data available.</div>
        )}
      </div>
      {/* Defect Distribution by Type Pie Chart */}
      <div className="flex-1 bg-white rounded-2xl shadow p-6 flex flex-col">
        <h2 className="text-lg font-semibold mb-4 text-gray-900">Defect Distribution by Type</h2>
        {loadingDefectType && <div className="text-gray-500 p-4">Loading...</div>}
        {defectTypeError && <div className="text-red-500 p-4">{defectTypeError}</div>}
        {!loadingDefectType && !defectTypeError && defectTypeData && Array.isArray(defectTypeData.labels) && Array.isArray(defectTypeData.counts) && defectTypeData.labels.length === defectTypeData.counts.length && defectTypeData.labels.length > 0 ? (() => {
          const labels = defectTypeData.labels;
          const counts = defectTypeData.counts;
                   const percentages = defectTypeData.percentages || counts.map((c) => {
                const total = counts.reduce((a, b) => a + b, 0);
            return total > 0 ? (c / total) * 100 : 0;
          });
          const data = {
            labels,
            datasets: [
              {
                data: counts,
                backgroundColor: [
                  '#4285F4', // fallback colors
                  '#00B894',
                  '#FBBC05',
                  '#EA4335',
                  '#A259F7',
                  '#FF6F00',
                  '#8E24AA',
                  '#43A047',
                  '#F4511E',
                ].slice(0, labels.length),
              },
            ],
          };
          const total = defectTypeData.total || counts.reduce((a, b) => a + b, 0);
          const mostCommon = defectTypeData.mostCommon || (() => {
            let idx = 0, max = 0;
            counts.forEach((c, i) => { if (c > max) { max = c; idx = i; } });
            return labels[idx];
          })();
          const mostCount = defectTypeData.mostCount || Math.max(...counts);
          return (
            <>
              <div className="flex flex-col items-center justify-center">
                <div className="w-64 h-64">
                  <ChartJSPie data={data} options={{ plugins: { legend: { display: false } } }} />
                </div>
                <div className="mt-6 grid grid-cols-1 gap-1 text-sm">
                  {labels.map((type, idx) => (
                    <div key={type} className="flex items-center gap-2">
                      <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: data.datasets[0].backgroundColor[idx] }}></span>
                      <span className="text-gray-700">{type}: <span className="font-semibold">{counts[idx]}</span> <span className='text-gray-500'>({percentages[idx]?.toFixed(1)}%)</span></span>
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex justify-between w-full max-w-xs mx-auto border-t pt-4">
                  <div className="flex flex-col items-center">
                    <span className="text-2xl font-bold text-gray-900">{total}</span>
                    <span className="text-xs text-gray-500">Total Defects</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-2xl font-bold text-blue-600">{mostCount}</span>
                    <span className="text-xs text-gray-500">Most Common</span>
                    <span className="text-xs text-gray-700 font-semibold">{mostCommon}</span>
                  </div>
                </div>
              </div>
            </>
          );
        })() : null}
        {!loadingDefectType && !defectTypeError && defectTypeData && (!Array.isArray(defectTypeData.labels) || !Array.isArray(defectTypeData.counts) || defectTypeData.labels.length !== defectTypeData.counts.length || defectTypeData.labels.length === 0) && (
          <div className="text-gray-400 p-4">No defect type data available.</div>
        )}
      </div>
    </div>


    {/* Time to Find Defects and Time to Fix Defects with Release Dropdown */}
    <div className="mb-14 flex flex-col gap-4">
      {/* Release Dropdown */}
      {selectedProjectId && (
        <div className="flex items-center gap-3 mb-2">
          <label htmlFor="release-select" className="font-medium text-gray-700">Release:</label>
          <select
            id="release-select"
            className="border border-gray-300 rounded px-3 py-1 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={selectedRelease?.releaseName || ''}
            onChange={e => {
              const selected = releases.find(r => r.releaseName === e.target.value);
              console.log('Selected release:', selected);
              console.log('Available releases:', releases.map(r => ({ id: r.id, releaseId: r.releaseId, releaseName: r.releaseName })));
              console.log('Dropdown value:', e.target.value);
              console.log('Using id as releaseId:', selected ? Number(selected.id) : null);
              setSelectedRelease(selected ? { releaseId: Number(selected.id), releaseName: selected.releaseName } : null);            }}
            disabled={loadingReleases || releases.length === 0}
          >
            <option value="">All Releases</option>
            {releases.map(r => (
              <option key={r.releaseId} value={r.releaseName}>{r.releaseName}</option>
            ))}
          </select>
          {loadingReleases && <span className="ml-2 text-gray-400 text-sm">Loading...</span>}
          {releasesError && <span className="ml-2 text-red-500 text-sm">{releasesError}</span>}
        </div>
      )}
      <div className="flex flex-col md:flex-row gap-8 items-stretch">
        {/* Time to Find Defects */}
        <div className="flex-1 bg-white rounded-2xl shadow p-6 flex flex-col">
          <h2 className="text-lg font-semibold mb-4 text-gray-900">Time to Find Defects</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={(() => {
                if (selectedProjectId && selectedRelease?.releaseName && releaseDailyDefects && releaseDailyDefects.length > 0) {
                  // Use API data for selected release
                  const days = Array.from({ length: 7 }, (_, i) => `Day ${i + 1}`);
                  const defectCounts = Array(7).fill(0);
                  releaseDailyDefects.forEach(d => {
                    if (d.dayNumber >= 1 && d.dayNumber <= 7) {
                      defectCounts[d.dayNumber - 1] = d.totalDefects;
                    }
                  });
                  return days.map((day, i) => ({ day, defects: defectCounts[i] }));
                }
                // Fallback: use existing logic for selected release only
                if (!selectedRelease?.releaseName) {
                  return Array.from({ length: 7 }, (_, i) => ({ day: `Day ${i + 1}`, defects: 0 }));
                }
                const days = Array.from({ length: 7 }, (_, i) => `Day ${i + 1}`);
                const dateCounts: number[] = Array(7).fill(0);
                filteredDefects.forEach(d => {
                  if (d.createdAt) {
                    const createdDate = new Date(d.createdAt);
                    const dayIdx = createdDate.getDate() - 1;
                    if (dayIdx >= 0 && dayIdx < 7) {
                      dateCounts[dayIdx]++;
                    }
                  }
                });
                return days.map((day, i) => ({ day, defects: dateCounts[i] }));
              })()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" label={{ value: 'Day', position: 'insideBottom', offset: -5 }} />
                <YAxis allowDecimals={false} tickCount={5} interval={0} domain={[0, 'auto']} tickFormatter={v => v} ticks={[0,2,4,6,8,10,12,14]} label={{ value: 'Defects Count', angle: -90, position: 'insideLeft', offset: 10 }} />
                <Tooltip formatter={v => `${v} defects`} />
                <Line type="monotone" dataKey="defects" stroke="#2563eb" strokeWidth={3} dot={{ r: 5, stroke: '#2563eb', strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 7 }} />
              </LineChart>
            </ResponsiveContainer>
            {loadingReleaseDailyDefects && <div className="text-gray-400 text-center mt-2">Loading time to find data...</div>}
            {!loadingReleaseDailyDefects && (!releaseDailyDefects || releaseDailyDefects.length === 0) && (
              <div className="text-gray-400 text-center mt-2">No time to find data available for selected release</div>
            )}
          </div>
        </div>
        {/* Time to Fix Defects */}
        <div className="flex-1 bg-white rounded-2xl shadow p-6 flex flex-col">
          <h2 className="text-lg font-semibold mb-4 text-gray-900">Time to Fix Defects</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={(() => {
                console.log('=== Time to Fix Chart Data Processing ===');
                console.log('selectedProjectId:', selectedProjectId);
                console.log('selectedRelease:', selectedRelease);
                console.log('releaseDailyFixedDefects:', releaseDailyFixedDefects);
                console.log('releaseDailyFixedDefects length:', releaseDailyFixedDefects?.length);
                
                if (selectedProjectId && selectedRelease?.releaseId && releaseDailyFixedDefects && releaseDailyFixedDefects.length > 0) {
                  // Use API data for selected release
                  console.log('Processing time to fix chart data:', releaseDailyFixedDefects);
                  console.log('API data structure check:', releaseDailyFixedDefects.map(d => ({
                    dayNumber: d.dayNumber,
                    defectFixedCount: d.defectFixedCount,
                    label: d.label,
                    timeRange: d.timeRange
                  })));
                  const days = Array.from({ length: 7 }, (_, i) => `Day ${i + 1}`);
                  const fixedCounts = Array(7).fill(0);
                  releaseDailyFixedDefects.forEach(d => {
                    if (d.dayNumber >= 1 && d.dayNumber <= 7) {
                      fixedCounts[d.dayNumber - 1] = d.defectFixedCount;
                    }
                  });
                  const chartData = days.map((day, i) => ({ day, defects: fixedCounts[i] }));
                  console.log('Time to fix chart data:', chartData);
                  return chartData;
                }
                // Fallback: use existing logic for selected release only
                console.log('=== Using Fallback Logic ===');
                
                // If no specific release is selected, return empty data
                if (!selectedRelease?.releaseId) {
                  console.log('No specific release selected, returning empty data');
                  return Array.from({ length: 7 }, (_, i) => ({ day: `Day ${i + 1}`, defects: 0 }));
                }
                
                const days = Array.from({ length: 7 }, (_, i) => `Day ${i + 1}`);
                const fixTimes: number[][] = Array(7).fill(null).map(() => []);
                
                // Filter defects for the selected release specifically
                const releaseFilteredDefects = selectedProjectId && selectedRelease?.releaseId
                  ? defects.filter(d => d.projectId === selectedProjectId && Number(d.releaseId ?? 0) === Number(selectedRelease.releaseId))
                  : [];

                console.log('Fallback: filtering defects for releaseId:', selectedRelease?.releaseId);
                console.log('Fallback: total defects count:', defects.length);
                console.log('Fallback: defects with matching projectId:', defects.filter(d => d.projectId === selectedProjectId).length);
                console.log('Fallback: releaseFilteredDefects count:', releaseFilteredDefects.length);
                console.log('Fallback: sample defects with releaseId:', releaseFilteredDefects.slice(0, 3).map(d => ({
                  id: d.id,
                  releaseId: d.releaseId,
                  releaseIdType: typeof d.releaseId,
                  createdAt: d.createdAt,
                  updatedAt: d.updatedAt
                })));
                console.log('Fallback: selectedRelease.releaseId type:', typeof selectedRelease?.releaseId);
                
                releaseFilteredDefects.forEach(d => {
                  if (d.createdAt && d.updatedAt && d.updatedAt > d.createdAt) {
                    const createdDate = new Date(d.createdAt);
                    const dayIdx = createdDate.getDate() - 1; // Day 1 = index 0
                    if (dayIdx >= 0 && dayIdx < 7) {
                      const daysToFix = Math.ceil((new Date(d.updatedAt).getTime() - new Date(d.createdAt).getTime()) / (1000 * 60 * 60 * 24));
                      fixTimes[dayIdx].push(daysToFix);
                    }
                  }
                });
                const fallbackData = days.map((day, i) => ({
                  day,
                  defects: fixTimes[i].length > 0 ? (fixTimes[i].reduce((a, b) => a + b, 0) / fixTimes[i].length) : 0
                }));
                console.log('Using fallback time to fix data:', fallbackData);

                return fallbackData;
              })()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" label={{ value: 'Day', position: 'insideBottom', offset: -5 }} />
                <YAxis allowDecimals={true} tickCount={5} interval={0} domain={[0, 'auto']} tickFormatter={v => v} label={{ value: 'Defects Fixed', angle: -90, position: 'insideLeft', offset: 10 }} />
                <Tooltip formatter={v => `${v} defects`} />
                <Line type="monotone" dataKey="defects" stroke="#10b981" strokeWidth={3} dot={{ r: 5, stroke: '#10b981', strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 7 }} />
              </LineChart>
            </ResponsiveContainer>
            {loadingReleaseDailyFixedDefects && <div className="text-gray-400 text-center mt-2">Loading time to fix data...</div>}
            {!loadingReleaseDailyFixedDefects && (!releaseDailyFixedDefects || releaseDailyFixedDefects.length === 0) && (
              <div className="text-gray-400 text-center mt-2">No time to fix data available for selected release</div>
            )}
          </div>
        </div>
      </div>
    </div>

  {/* Defects by Module Pie Chart (added at the end) */}
  <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow p-8 flex flex-col items-center mt-10">
    <h2 className="text-xl font-bold mb-6 text-center">Defects by Module</h2>
    {loadingDefectsByModule ? (
      <div className="text-gray-500">Loading...</div>
    ) : defectsByModuleError ? (
      <div className="text-red-500">{defectsByModuleError}</div>
    ) : defectsByModule && defectsByModule.length > 0 ? (
      <>
        <div className="w-72 h-72 mx-auto">
          <ChartJSPie
            data={{
              labels: defectsByModule.map((m) => m.name),
              datasets: [
                {
                  data: defectsByModule.map((m) => m.value),
                  backgroundColor: [
                    '#4285F4', '#00B894', '#FBBC05', '#EA4335', '#A259F7', '#00B8D9', '#FF6F00', '#8E24AA', '#43A047', '#F4511E',
                  ].slice(0, defectsByModule.length),
                },
              ],
            }}
            options={{ plugins: { legend: { display: false } } }}
          />
        </div>
        <div className="mt-8 w-full max-w-md mx-auto">
          <div className="space-y-2">
            {defectsByModule.map((item, idx) => (
              <div key={item.name} className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="inline-block w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: [
                    '#4285F4', '#00B894', '#FBBC05', '#EA4335', '#A259F7', '#00B8D9', '#FF6F00', '#8E24AA', '#43A047', '#F4511E',
                  ][idx % 10] }}></span>
                  <span className="text-gray-700 text-sm truncate">{item.name}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="font-bold text-gray-900 text-sm min-w-[2rem] text-right">{item.value}</span>
                  <span className="text-gray-500 text-sm min-w-[3.5rem] text-right">({item.percentage?.toFixed(1) ?? 0}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </>
    ) : (
      <div className="text-gray-400">No data available.</div>
    )}
  </div>
  </>
);
};

export default Dashboard;

function DefectDensityMeter({
  kloc,
  defectCount,
  defectDensity,
  klocInput,
  onKlocInputChange,
  onKlocUpdate,
  canEdit = false
}: {
  kloc: number,
  defectCount: number,
  defectDensity?: number,
  klocInput?: number,
  onKlocInputChange?: (value: number) => void,
  onKlocUpdate?: () => void,
  canEdit?: boolean
}) {
  // Use backend defectDensity if provided, otherwise calculate
  const density = typeof defectDensity === 'number' ? defectDensity : (kloc > 0 ? defectCount / kloc : 0);
  // Meter now starts at -90deg (left) and ends at 90deg (right), total sweep 180deg
  // Meter range: 0-15
  const min = 0, max = 15;
  const cappedDensity = Math.max(min, Math.min(density, max));
  // angle = -90 + (density / 15) * 180
  const angle = -90 + (cappedDensity / 15) * 180;
  const needleRef = useRef<SVGPolygonElement>(null);

  useEffect(() => {
    if (needleRef.current) {
      needleRef.current.style.transition = 'transform 0.7s cubic-bezier(0.4,0,0.2,1)';
      needleRef.current.style.transform = `rotate(${angle}deg)`;
    }
  }, [angle]);

  // Color zones for legend
  const getZoneColor = (val: number) => {
    if (val <= 7) return '#22c55e'; // green
    if (val <= 10) return '#facc15'; // yellow
    return '#ef4444'; // red
  };
  const zoneColor = getZoneColor(density);

  // Arc path helpers
  function describeArc(cx: number, cy: number, r: number, startValue: number, endValue: number) {
    // Map value (0-15) to angle (-90 to 90)
    const valueToAngle = (v: number) => -90 + (v / 15) * 180;
    const startAngle = valueToAngle(startValue);
    const endAngle = valueToAngle(endValue);
    const start = polarToCartesian(cx, cy, r, endAngle);
    const end = polarToCartesian(cx, cy, r, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    return [
      'M', start.x, start.y,
      'A', r, r, 0, largeArcFlag, 0, end.x, end.y
    ].join(' ');
  }
  function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
    const rad = (angle - 90) * Math.PI / 180.0;
    return {
      x: cx + (r * Math.cos(rad)),
      y: cy + (r * Math.sin(rad))
    };
  }

  // Arc value ranges
  const arcGreenStart = 0, arcGreenEnd = 7;
  const arcYellowStart = 7.1, arcYellowEnd = 10;
  const arcRedStart = 10.1, arcRedEnd = 15;

  // Tick positions for 0, 7, 10
  const ticks = [0, 7, 10];
  const valueToAngle = (v: number) => -90 + (v / 15) * 180;
  const tickAngles = ticks.map(valueToAngle);
  const tickRadius = 80;
  const tickLabelRadius = 95;

  return (
    <div className="flex flex-col items-center">
      <div className="text-lg font-semibold mb-1 text-center">
        Defect Density:
        <span className="ml-2 font-extrabold" style={{ color: zoneColor }}>{isNaN(density) ? '0.00' : density.toFixed(2)}</span>
      </div>
      <div className="w-72 h-40 flex items-end justify-center relative">
        <svg viewBox="0 0 200 120" className="w-full h-full">
          {/* Meter background */}
          <path d={describeArc(100, 100, 70, 0, 15)} fill="none" stroke="#e5e7eb" strokeWidth="18" />
          {/* Green arc: 0-7 */}
          <path d={describeArc(100, 100, 70, arcGreenStart, arcGreenEnd)} fill="none" stroke="#22c55e" strokeWidth="14" />
          {/* Yellow arc: 7.1-10 */}
          <path d={describeArc(100, 100, 70, arcYellowStart, arcYellowEnd)} fill="none" stroke="#facc15" strokeWidth="14" />
          {/* Red arc: 10.1-15 */}
          <path d={describeArc(100, 100, 70, arcRedStart, arcRedEnd)} fill="none" stroke="#ef4444" strokeWidth="14" />
          {/* Needle */}
          <g style={{ transform: 'rotate(0deg)', transformOrigin: '100px 100px' }}>
            <polygon
              ref={needleRef}
              points="100,35 97,100 103,100"
              fill="#334155"
              style={{ transform: `rotate(${angle}deg)`, transformOrigin: '100px 100px', transition: 'transform 0.7s cubic-bezier(0.4,0,0.2,1)' }}
            />
          </g>
          {/* Center dot */}
          <circle cx="100" cy="100" r="7" fill="#334155" />
          {/* Tick marks and labels */}
          {ticks.map((tick, i) => {
            const a = tickAngles[i];
            const tickStart = polarToCartesian(100, 100, tickRadius, a);
            const tickEnd = polarToCartesian(100, 100, tickRadius + 8, a);
            const labelPos = polarToCartesian(100, 100, tickLabelRadius, a);
            return (
              <g key={tick}>
                <line x1={tickStart.x} y1={tickStart.y} x2={tickEnd.x} y2={tickEnd.y} stroke="#64748b" strokeWidth="2" />
                <text x={labelPos.x} y={labelPos.y + 5} fontSize="13" fill="#64748b" textAnchor="middle">{tick}</text>
              </g>
            );
          })}
        </svg>
      
      </div>

      {/* KLOC Input Section */}
      {canEdit && (
        <div className="mt-4 flex items-center gap-2 justify-center">
          <label htmlFor="kloc-input-dashboard" className="text-sm text-gray-600 font-medium">KLOC:</label>
          <input
            id="kloc-input-dashboard"
            type="number"
            min={0.1}
            step={0.1}
            className="w-20 px-2 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
            value={klocInput || kloc}
            onChange={(e) => onKlocInputChange && onKlocInputChange(Number(e.target.value) || 0.1)}
            style={{ minWidth: 60 }}
          />
          <button
            type="button"
            className={`ml-1 w-8 h-8 rounded-full bg-green-500 hover:bg-green-600 text-white flex items-center justify-center transition disabled:opacity-50`}
            onClick={onKlocUpdate}
            disabled={!klocInput || klocInput === kloc}
            title="Update KLOC value"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

