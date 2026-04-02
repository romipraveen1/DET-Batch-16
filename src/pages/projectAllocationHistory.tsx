import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ChevronLeft, Users, Calendar, User, Clock, ArrowRight, ChevronDown, ChevronUp, Search, Filter, ChevronRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getAllProjects } from '../api/projectget';
import { Project } from '../types';
import { getProjectAllocationHistory, getProjectAllocationHistoryByRole } from '../api/projectAllocationHistory/projectAllocationHistory';
import { getAllRoles } from '../api/role/viewrole';
import * as Select from '@radix-ui/react-select';

interface AllocationRecord {
  id: number;
  percentage: number;
  userFullName: string;
  email: string;
  projectName: string;
  roleName: string;
  startDate: string;
  endDate: string;
  projectId: number;
  userId: number;
  roleId: number;
  status: boolean;
  allocationPercentage: number;
  firstName: string;
  lastName: string;
}

interface ProjectAllocationHistory {
  userId: number;
  allocations: AllocationRecord[];
  deallocations: AllocationRecord[];
}

interface Role {
  id: string | number;
  name?: string;
  roleName: string;
  description?: string;
  permissions?: string[];
  level?: string;
  createdAt?: string;
  updatedAt?: string;
}


const ProjectAllocationHistory: React.FC = () => {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const { selectedProjectId: contextProjectId, setSelectedProjectId: setContextProjectId } = useApp();

  // State for projects from API (same pattern as BenchAllocate)
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState<string | null>(null);

  // Always call useState - don't use conditional logic
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(contextProjectId || null);

  const [expandedUser, setExpandedUser] = useState<number | null>(null);
  const [allocationHistory, setAllocationHistory] = useState<ProjectAllocationHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const scrollRef = React.useRef<HTMLDivElement>(null);
  // Add state for role filter and roles
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [roles, setRoles] = useState<Role[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [rolesError, setRolesError] = useState<string | null>(null);
  // Update allocation history fetching to use role filter
  useEffect(() => {
    if (selectedProjectId) {
      setLoading(true);
      getProjectAllocationHistoryByRole(Number(selectedProjectId), roleFilter)
        .then((response: any) => {
          setAllocationHistory(Array.isArray(response.data) ? response.data : []);
        })
        .catch((error) => {
          console.log("Failed to fetch project allocation history:", error);
          setAllocationHistory([]);
        })
        .finally(() => setLoading(false));
    }
  }, [selectedProjectId, roleFilter]);
  console.log("Allocation History:", allocationHistory);
  

  // Update selectedProjectId when contextProjectId changes
  useEffect(() => {
    if (contextProjectId && contextProjectId !== selectedProjectId) {
      setSelectedProjectId(contextProjectId);
    }
  }, [contextProjectId, selectedProjectId]);

  // Fetch projects from API (same pattern as BenchAllocate)
  useEffect(() => {
    setProjectsLoading(true);
    getAllProjects()
      .then((data: any) => {
        let projectsArray = Array.isArray(data)
          ? data
          : (data && Array.isArray(data.data))
            ? data.data
            : [];
        setProjects(projectsArray);
        setProjectsError(null);
        
        // Set selected project if none is selected
        if (!selectedProjectId && projectsArray.length > 0) {
          const firstActiveProject = projectsArray.find((p: Project) => p.status === 'active');
          if (firstActiveProject) {
            setSelectedProjectId(firstActiveProject.id);
          }
        }
      })
      .catch((err) => {
        console.error("Failed to fetch projects:", err);
        setProjectsError(err.message);
      })
      .finally(() => setProjectsLoading(false));
  }, []);

  // Fetch roles from API
  useEffect(() => {
    setRolesLoading(true);
    getAllRoles()
      .then((data: any) => {
        let roleArray = Array.isArray(data)
          ? data
          : (data && Array.isArray(data.data))
            ? data.data
            : [];
        setRoles(roleArray);
        setRolesError(null);
      })
      .catch((err) => {
        setRolesError(err.message);
        setRoles([]);
      })
      .finally(() => setRolesLoading(false));
  }, []);

  // Only show active projects
  const availableProjects = useMemo(() => projects.filter(p => p.status === 'active'), [projects]);
  const currentProject = useMemo(
    () => projects.find(p => String(p.id) === String(selectedProjectId)),
    [selectedProjectId, projects]
  );

  const scrollBy = (offset: number) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  const getStatusColor = (status: boolean) => {
    if (status === true) {
      return 'bg-green-100 text-green-800';
    }
    if (status === false) {
      return 'bg-red-100 text-red-800';
    }
    return 'bg-gray-100 text-gray-800';
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'allocated':
        return 'bg-green-100 text-green-800';
      case 'deallocated':
        return 'bg-red-100 text-red-800';
      case 'percentage_changed':
        return 'bg-blue-100 text-blue-800';
      case 'role_changed':
        return 'bg-purple-100 text-purple-800';
      case 'period_changed':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };



  // Removed unused getUserHistory

  // Project selection handler (same pattern as BenchAllocate)
  const handleProjectSelect = (id: string) => {
    setSelectedProjectId(id);
    setContextProjectId?.(id); // keep global context in sync
    setExpandedUser(null);
    // TODO: In real app, fetch new project allocation data here based on selectedProjectId

  };

  if (loading || projectsLoading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (projectsError) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-500 mb-4">Failed to load projects: {projectsError}</p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </div>
        </div>
      </div>
    );
  }

  const filteredAllocationHistory = Array.isArray(allocationHistory)
    ? allocationHistory.filter(user => {
        const term = searchTerm.trim().toLowerCase();
        if (!term) return true;
        // Check name, email, or roleName in any allocation
        const nameMatch = user.allocations.some(a =>
          `${a.firstName} ${a.lastName}`.toLowerCase().includes(term)
        );
        const emailMatch = user.allocations.some(a =>
          (a.email || '').toLowerCase().includes(term)
        );
        const roleMatch = user.allocations.some(a =>
          (a.roleName || '').toLowerCase().includes(term)
        );
        return nameMatch || emailMatch || roleMatch;
      })
    : [];

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header with Back Button */}
      <div className="mb-6">
        {/* Back Button at the top right, like ModuleManagement */}
        <div className="mb-4 flex justify-end">
          <Button
            variant="secondary"
            onClick={() => navigate(`/projects/${projectId}/project-management`)}
            className="flex items-center"
          >
            <ChevronLeft className="w-5 h-5 mr-2" /> Back
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <Users className="w-8 h-8 text-blue-500" />
          <h1 className="text-3xl font-bold text-gray-900">Project Allocation History</h1>
        </div>
        <p className="text-gray-600 mt-2">Track project-level user allocations and movements</p>
      </div>

      {/* Project Selection Panel - Same as BenchAllocate */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Project Selection</h2>
          <div className="relative flex items-center">
            <button
              onClick={() => {
                const container = document.getElementById('project-scroll');
                if (container) container.scrollLeft -= 200;
              }}
              className="flex-shrink-0 z-10 bg-white shadow-md rounded-full p-1 hover:bg-gray-50 mr-2"
              type="button"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div
              id="project-scroll"
              className="flex space-x-2 overflow-x-auto pb-2 scroll-smooth flex-1"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', maxWidth: '100%' }}
            >
              {projects.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  No projects available
                </div>
              ) : (
                projects.map((project) => {
                  const isSelected = Number(selectedProjectId) === (Number(project?.id));
                  return (
                    <Button
                      key={project.id}
                      variant={isSelected ? 'primary' : 'secondary'}
                      onClick={() => handleProjectSelect(project?.id)}
                      className="whitespace-nowrap m-2"
                    >
                      {project?.projectName || project?.name}
                    </Button>
                  );
                })
              )}
            </div>
            <button
              onClick={() => {
                const container = document.getElementById('project-scroll');
                if (container) container.scrollLeft += 200;
              }}
              className="flex-shrink-0 z-10 bg-white shadow-md rounded-full p-1 hover:bg-gray-50 ml-2"
              type="button"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </CardContent>
      </Card>
{/* Search and Filter Controls */}

<Card className="mb-6">
  <CardContent className="p-4">
    <div className="flex flex-col md:flex-row gap-4">
      <div className="flex-1">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search users by name, email, or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>
      <div className="flex items-center gap-2 min-w-[220px]">
        <Filter className="w-4 h-4 text-gray-400" />
        <div className="w-full">
          <Select.Root value={roleFilter} onValueChange={setRoleFilter}>
            <Select.Trigger
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full flex items-center justify-between"
              aria-label="Role"
            >
              <Select.Value placeholder="All Roles" />
              <Select.Icon>
                <ChevronDown className="w-4 h-4" />
              </Select.Icon>
            </Select.Trigger>
            <Select.Portal>
              <Select.Content
                position="popper"
                sideOffset={4}
                className="bg-white border rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto min-w-[220px]"
                style={{ position: 'fixed' }}
              >
                <Select.Viewport>
                  <Select.Item value="all" className="pl-4 pr-8 py-2 flex items-center cursor-pointer data-[state=checked]:bg-blue-100">
                    <Select.ItemText>All Roles</Select.ItemText>
                  </Select.Item>
                  {roles.map((r) => (
                    <Select.Item key={r.id} value={String(r.id)} className="pl-4 pr-8 py-2 flex items-center cursor-pointer data-[state=checked]:bg-blue-100">
                      <Select.ItemText>{r.roleName}</Select.ItemText>
                    </Select.Item>
                  ))}
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </div>
      </div>
    </div>
  </CardContent>
</Card>


      {/* User Allocation Table */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Project Allocation History
            {selectedProjectId && (
              <span className="text-sm font-normal text-gray-600">
                - {currentProject?.projectName || currentProject?.name}
              </span>
            )}
          </h3>
        </CardHeader>
        <CardContent>
          {Array.isArray(filteredAllocationHistory) && filteredAllocationHistory.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No users found matching the selected criteria.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Array.isArray(filteredAllocationHistory) && filteredAllocationHistory.map((user, userIdx) => {
                const isExpanded = expandedUser === user.userId;
                return (
                  <Card key={user.userId + '-' + userIdx} className="border border-gray-200">
                    <CardContent className="p-0">
                      {/* User Row: show latest allocation */}
                      {user && Array.isArray(user.allocations) && user.allocations.length > 0 && (
                        <div 
                          key={user.userId + '-' + user.allocations[0].id}
                          className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                          onClick={() => setExpandedUser(isExpanded ? null : user.userId)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4 text-gray-400" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-gray-400" />
                                )}
                                <User className="w-5 h-5 text-blue-500" />
                              </div>
                              <div>
                                <h4 className="font-semibold text-gray-900">{user.allocations[0].firstName} {user.allocations[0].lastName}</h4>
                                <p className="text-sm text-gray-600">{user.allocations[0].email}</p>
                              </div>
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="text-sm font-medium text-gray-900">{user.allocations[0].roleName}</p>
                                <p className="text-xs text-gray-600">{user.allocations[0].percentage}% allocated</p>
                                <p className="text-xs text-gray-500">
                                  {user.allocations[0].startDate && user.allocations[0].endDate
                                    ? `${new Date(user.allocations[0].startDate).toLocaleDateString()} to ${new Date(user.allocations[0].endDate).toLocaleDateString()}`
                                    : 'No period set'
                                  }
                                </p>
                              </div>
                              <Badge className={getStatusColor(user.allocations[0].status)}>
                                {user.allocations[0].status === true
                                  ? 'Allocated'
                                  : user.allocations[0].status === false
                                    ? 'Deallocated'
                                    : ''}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Expanded History: allocations and deallocations sorted by startDate */}
                      {isExpanded && (
                        <div className="border-t border-gray-200 bg-gray-50">
                          <div className="p-4">
                            <h5 className="font-semibold text-gray-900 mb-3">Allocation History</h5>
                            {((user.allocations && user.allocations.length > 0) || (user.deallocations && user.deallocations.length > 0)) ? (
                              <div className="space-y-3">
                                {[...(user.allocations || []), ...(user.deallocations || [])]
                                  .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
                                  .map((record, idx) => (
                                    <div key={user.userId + '-' + record.id + '-' + idx} className="bg-white p-3 rounded-lg border">
                                      <div className="flex items-center justify-between mb-2">
                                          <div className="flex items-center gap-2">
                                            <Badge className={getStatusColor(record.status)}>
                                              {record.status === true ? 'Allocated' : record.status === false ? 'Deallocated' : ''}
                                            </Badge>
                                          </div>
                                        <span className="text-sm font-medium">{record.roleName || ''}</span>
                                      </div>
                                      <div className="space-y-2">
                                        <div className="text-sm">
                                          <p><span className="font-medium">User:</span> {record.firstName} {record.lastName}</p>
                                          <p><span className="font-medium">Email:</span> {record.email}</p>
                                          <p><span className="font-medium">Role:</span> {record.roleName}</p>
                                          <p><span className="font-medium">Percentage:</span> {record.percentage}%</p>
                                          <p><span className="font-medium">Period:</span> {record.startDate ? new Date(record.startDate).toLocaleDateString() : ''} to {record.endDate ? new Date(record.endDate).toLocaleDateString() : ''}</p>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            ) : (
                              <p className="text-gray-500 text-sm">No allocation history available.</p>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Statistics panel removed as requested */}
    </div>
  );
};

export default ProjectAllocationHistory;