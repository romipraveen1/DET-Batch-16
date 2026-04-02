import React, { useState, useEffect } from "react";
import {
  Plus,
  FolderOpen,
  Calendar,
  User,
  ChevronDown,
  ChevronUp,
  Building2,
  Mail,
  Phone,
  MapPin,
  Users,
  Briefcase,
  Clock,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Trash2,
  Smartphone,
  FileText,
  ShoppingCart,
  HeartPulse,
  GraduationCap,
  Cpu,
  Plane,
  Dumbbell,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { useApp } from "../context/AppContext";
import { ProjectFormData, Project } from "../types";
import { useNavigate } from "react-router-dom";
import { getAllProjects } from "../api/projectget";
import { createProject } from "../api/createProject/createProject";
import { Toast } from "../components/ui/Toast";
import { getAllRoles } from "../api/role/viewrole";
import { updateProject as updateProjectApi } from "../api/createProject/updateProject";
import { deleteProject as deleteProjectApi } from "../api/createProject/deleteProject";
import { getDesignations, Designations } from "../api/designation/designation";
import { SimpleUser, getUsersByDesignationId, GetUsersByDesignationResponse, getAllUsersSimple } from "../api/users/getallusers";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select';

const cardStyles = [
  { border: "border-t-4 border-blue-400", iconBg: "bg-gradient-to-br from-blue-400 to-blue-600", iconColor: "text-white" },
  { border: "border-t-4 border-green-400", iconBg: "bg-gradient-to-br from-green-400 to-green-600", iconColor: "text-white" },
  { border: "border-t-4 border-purple-400", iconBg: "bg-gradient-to-br from-purple-400 to-purple-600", iconColor: "text-white" },
  { border: "border-t-4 border-pink-400", iconBg: "bg-gradient-to-br from-pink-400 to-pink-600", iconColor: "text-white" },
  { border: "border-t-4 border-yellow-400", iconBg: "bg-gradient-to-br from-yellow-400 to-yellow-600", iconColor: "text-white" },
  { border: "border-t-4 border-orange-400", iconBg: "bg-gradient-to-br from-orange-400 to-orange-600", iconColor: "text-white" },
  { border: "border-t-4 border-cyan-400", iconBg: "bg-gradient-to-br from-cyan-400 to-cyan-600", iconColor: "text-white" },
  { border: "border-t-4 border-indigo-400", iconBg: "bg-gradient-to-br from-indigo-400 to-indigo-600", iconColor: "text-white" },
];

const projectIcons = [
  Smartphone,        // Mobile Banking App
  FileText,          // Inventory Management
  ShoppingCart,      // E-commerce Platform
  HeartPulse,        // Healthcare Portal
  GraduationCap,     // Learning Management System
  Users,             // CRM Solution
  Cpu,               // IoT Device Dashboard
  Plane,             // Travel Booking System
  Dumbbell,          // Fitness Tracker App
];

export const Projects: React.FC = () => {
  const {
    projects,
    addProject,
    updateProject,
    deleteProject,
    employees,
    setSelectedProjectId: setGlobalProjectId,
  } = useApp();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showPrivileges, setShowPrivileges] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [deleteConfirmProject, setDeleteConfirmProject] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [formData, setFormData] = useState<ProjectFormData>({
    name: "",
    prefix: "",
    projectType: "",
    status: "ACTIVE",
    startDate: "",
    endDate: "",
    manager: 2,
    designationId: 0,
    userId: 0,
    clientName: "",
    clientCountry: "",
    clientState: "",
    clientEmail: "",
    clientPhone: "",
    address: "",
    description: "",
  } as ProjectFormData);
  const [backendProjects, setBackendProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<any[]>([]);
  const [designations, setDesignations] = useState<Designations[]>([]);
  const [isLoadingDesignations, setIsLoadingDesignations] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [filteredUsers, setFilteredUsers] = useState<SimpleUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    isOpen: boolean;
    message: string;
    type: "success" | "error";
  }>({
    isOpen: false,
    message: "",
    type: "success",
  });

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE' | 'COMPLETED'>('ALL');

  useEffect(() => {
    setLoading(true);
    getAllProjects()
      .then((data: any) => {
        let projectsArray = Array.isArray(data)
          ? data
          : (data && Array.isArray(data.data))
            ? data.data
            : [];
        setBackendProjects(projectsArray);
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (isModalOpen) {
      getAllRoles()
        .then((data) => {
          setRoles(Array.isArray(data) ? data : (data?.data ?? []));
        })
        .catch(() => setRoles([]));
    }
  }, [isModalOpen]);

  // Fetch designations when modal opens
  useEffect(() => {
    if (isModalOpen) {
      fetchDesignations();
    }
  }, [isModalOpen]);

  const fetchDesignations = async () => {
    setIsLoadingDesignations(true);
    try {
      const response = await getDesignations();
      console.log('Designations API response:', response);
      // Handle both 'success' and 'SUCCESS' status
      if ((response.status === 'success' || response.status === 'SUCCESS') && response.data) {
        setDesignations(response.data);
        console.log(`Successfully loaded ${response.data.length} designations`);
      } else {
        console.error('Failed to fetch designations:', response);
        setDesignations([]);
      }
    } catch (error) {
      console.error('Error fetching designations:', error);
      setDesignations([]);
    } finally {
      setIsLoadingDesignations(false);
    }
  };

  const fetchUsersByDesignation = async (designationId: number) => {
    setIsLoadingUsers(true);
    try {
      const response = await getUsersByDesignationId(designationId);
      console.log(`Fetching users for designation ID: ${designationId}`, response);
      // Users by designation API returns data directly in data array, not data.content
      if (response.status === 'success' && response.data && Array.isArray(response.data)) {
        console.log(`Successfully loaded ${response.data.length} users for designation ${designationId}`);
        setFilteredUsers(response.data);
      } else {
        console.error('Failed to fetch users by designation:', response);
        setFilteredUsers([]);
      }
    } catch (error) {
      console.error('Error fetching users by designation:', error);
      setFilteredUsers([]);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // Fetch users when designation changes
  useEffect(() => {
    if (formData.designationId) {
      fetchUsersByDesignation(formData.designationId);
    } else {
      setFilteredUsers([]);
    }
  }, [formData.designationId]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate that a project manager (user) is selected
    if (!formData.userId) {
      setToast({
        isOpen: true,
        message: 'Please select a project manager (designation and user)',
        type: 'error'
      });
      setLoading(false);
      return;
    }

    try {
      if (editingProject) {
        // Call backend API to update project
        await updateProjectApi(editingProject.id, formData);
        // Refresh project list
        const data: any = await getAllProjects();
        let projectsArray = Array.isArray(data)
          ? data
          : (data && Array.isArray(data.data))
            ? data.data
            : [];
        setBackendProjects(projectsArray);
              setToast({
        isOpen: true,
        message: 'Project updated successfully!',
        type: 'success'
      });
      } else {
        // Call backend API to create project
        await createProject(formData);
        // Refresh project list
        const data: any = await getAllProjects();
        let projectsArray = Array.isArray(data)
          ? data
          : (data && Array.isArray(data.data))
            ? data.data
            : [];
        setBackendProjects(projectsArray);
        setToast({
          isOpen: true,
          message: 'Project created successfully!',
          type: 'success'
        });
      }
      resetForm();
    } catch (err: any) {
      setToast({
        isOpen: true,
        message: err.message || 'Failed to create/update project',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // --- Add/Edit: handleEdit function ---
  const handleEdit = async (project: any) => {
    console.log('Editing project:', project);
    console.log('All project properties:', Object.keys(project));
    console.log('Project startDate:', project.startDate);
    console.log('Project endDate:', project.endDate);
    console.log('Project start_date:', project.start_date);
    console.log('Project end_date:', project.end_date);
    console.log('Project startDateFormatted:', project.startDateFormatted);
    console.log('Project endDateFormatted:', project.endDateFormatted);
    
    setEditingProject(project);
    
    // Format dates for HTML date inputs (YYYY-MM-DD format)
    const formatDateForInput = (dateString: string | undefined) => {
      if (!dateString) {
        console.log('No date string provided');
        return '';
      }
      
      console.log('Processing date string:', dateString, 'Type:', typeof dateString);
      
      try {
        // Handle different date formats
        let date: Date;
        
        // If it's already in YYYY-MM-DD format, return as is
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
          console.log('Date already in YYYY-MM-DD format:', dateString);
          return dateString;
        }
        
        // If it's in MM/DD/YYYY format, convert it
        if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateString)) {
          const [month, day, year] = dateString.split('/');
          const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          console.log('Converted MM/DD/YYYY to YYYY-MM-DD:', formattedDate);
          return formattedDate;
        }
        
        // Try parsing as ISO string or other formats
        date = new Date(dateString);
        
        // Check if the date is valid
        if (isNaN(date.getTime())) {
          console.error('Invalid date:', dateString);
          return '';
        }
        
        const formattedDate = date.toISOString().split('T')[0]; // Convert to YYYY-MM-DD format
        console.log('Formatted date:', formattedDate, 'from:', dateString);
        return formattedDate;
      } catch (error) {
        console.error('Error formatting date:', dateString, error);
        return '';
      }
    };

    // Try multiple possible date property names
    const startDate = project.startDate || project.start_date || project.startDateFormatted || '';
    const endDate = project.endDate || project.end_date || project.endDateFormatted || '';
    
    setFormData({
      name: project.projectName || project.name || '',
      prefix: project.prefix || '',
      projectType: project.projectType || '',
      status: project.projectStatus || project.status || 'ACTIVE',
      startDate: formatDateForInput(startDate),
      endDate: formatDateForInput(endDate),
      manager: 2,
      designationId: 0,
      userId: project.userId || 0,
      clientName: project.clientName || '',
      clientCountry: project.country || '',
      clientState: project.state || '',
      clientEmail: project.email || '',
      clientPhone: project.phoneNo || '',
      address: project.address || '',
      description: project.description || '',
    } as ProjectFormData);
    
    console.log('Extracted dates:', { startDate, endDate });
    console.log('Final formData:', {
      startDate: formatDateForInput(startDate),
      endDate: formatDateForInput(endDate)
    });
    
    setIsModalOpen(true);

    // Ensure designations are loaded so the Select can render the chosen option text
    try {
      await fetchDesignations();
    } catch {}

    // Attempt to infer designation from selected user and preselect both
    try {
      const allUsersResponse = await getAllUsersSimple();
      const usersList = allUsersResponse?.data?.content || [];
      const projectUserId = project.userId ?? project.userID ?? project.user_id;
      let matchedUser = usersList.find((u: any) => String(u.id ?? u.userId) === String(projectUserId));
      // Fallback: try to match by first/last name if ID isn't available in project data
      if (!matchedUser && (project.userFirstName || project.userLastName)) {
        const pf = String(project.userFirstName || '').trim().toLowerCase();
        const pl = String(project.userLastName || '').trim().toLowerCase();
        matchedUser = usersList.find((u: any) =>
          String(u.firstName || '').trim().toLowerCase() === pf &&
          String(u.lastName || '').trim().toLowerCase() === pl
        );
      }
      if (matchedUser && matchedUser.designationId) {
        const designationIdNumber = Number(matchedUser.designationId);
        handleInputChange('designationId', designationIdNumber);
        // Ensure users list loads for that designation
        await fetchUsersByDesignation(designationIdNumber);
        handleInputChange('userId', Number(matchedUser.id || matchedUser.userId));
        return;
      }
      // Fallback: scan users by each designation to locate the project's user
      try {
        const designationsResponse = await getDesignations();
        const designationsData = (designationsResponse?.data || []) as any[];
        for (const d of designationsData) {
          const dId = Number(d.id);
          if (!dId) continue;
          const usersByDesig = await getUsersByDesignationId(dId);
          const list = usersByDesig?.data || [];
          const found = list.find((u: any) => String(u.id ?? u.userId) === String(projectUserId));
          if (found) {
            handleInputChange('designationId', dId);
            await fetchUsersByDesignation(dId);
            handleInputChange('userId', Number(found.id || found.userId));
            break;
          }
        }
      } catch (inner) {
        console.warn('Fallback designation scan failed', inner);
      }
    } catch (e) {
      // If fetching all users fails, we still allow editing with userId set
      console.warn('Could not preselect designation/user from users list', e);
    }
  };

  const handleDelete = (projectId: string) => {
    if (
      window.confirm(
        "Are you sure you want to delete this project? This action cannot be undone."
      )
    ) {
      deleteProject(projectId);
    }
  };

  const handleDeleteClick = (project: any) => {
    setDeleteConfirmProject(project);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmProject) return;
    
    try {
      setLoading(true);
      console.log('Attempting to delete project:', deleteConfirmProject);
      console.log('Project ID:', deleteConfirmProject.id);
      
      await deleteProjectApi(deleteConfirmProject.id);
      console.log('Delete API call completed successfully');
      
      // Refresh project list
      const data: any = await getAllProjects();
      let projectsArray = Array.isArray(data)
        ? data
        : (data && Array.isArray(data.data))
          ? data.data
          : [];
      console.log('Refreshed projects:', projectsArray);
      setBackendProjects(projectsArray);
      
      setToast({
        isOpen: true,
        message: 'Project deleted successfully!',
        type: 'success'
      });
    } catch (err: any) {
      console.error('Error in confirmDelete:', err);
      setToast({
        isOpen: true,
        message: err.message || 'Project Can\'t Delete',
        type: 'error'
      });
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
      setDeleteConfirmProject(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setDeleteConfirmProject(null);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      prefix: "",
      projectType: "",
      status: "ACTIVE",
      startDate: "",
      endDate: "",
      manager: 2,
      designationId: 0,
      userId: 0,
      clientName: "",
      clientCountry: "",
      clientState: "",
      clientEmail: "",
      clientPhone: "",
      address: "",
      description: "",
    } as ProjectFormData);
    setEditingProject(null);
    setIsModalOpen(false);
  };

  const handleInputChange = (field: string, value: string | boolean | number | undefined) => {
    setFormData((prev) => ({ ...prev, [field]: value } as ProjectFormData));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-800";
      case "INACTIVE":
        return "bg-yellow-100 text-yellow-800";
      case "COMPLETED":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
              <Toast 
          isOpen={toast.isOpen} 
          message={toast.message} 
          type={toast.type}
          onClose={() => setToast({ ...toast, isOpen: false })} 
        />
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Project Management</h1>
            <p className="text-gray-600">Manage your projects and teams</p>
          </div>
          <div className="flex flex-col md:flex-row gap-2 items-center">
            <Input
              type="text"
              placeholder="Search projects..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-48 border border-gray-300 rounded-md px-3 py-2"
            />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="w-40 border border-gray-300 rounded-md px-3 py-2 bg-white"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="COMPLETED">Completed</option>
            </select>
            <Button onClick={() => setIsModalOpen(true)} icon={Plus}>
              Add Project
            </Button>
          </div>
        </div>

        {loading && (
          <div className="text-center text-gray-500">Loading projects...</div>
        )}
        {error && (
          <div className="text-center text-red-500">{error}</div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...backendProjects]
            .filter((project: any) => {
              // Filter by status
              if (statusFilter !== 'ALL' && String(project.projectStatus).toUpperCase() !== statusFilter) {
                return false;
              }
              // Filter by search term (name, prefix, description)
              const term = searchTerm.trim().toLowerCase();
              if (!term) return true;
              const name = (project.projectName || project.name || '').toLowerCase();
              const prefix = (project.prefix || '').toLowerCase();
              const desc = (project.description || '').toLowerCase();
              return name.includes(term) || prefix.includes(term) || desc.includes(term);
            })
            .sort((a: any, b: any) => {
              const order: Record<string, number> = { ACTIVE: 0, INACTIVE: 1, COMPLETED: 2 };
              const aStatus = typeof a.projectStatus === 'string' ? a.projectStatus.toUpperCase() : '';
              const bStatus = typeof b.projectStatus === 'string' ? b.projectStatus.toUpperCase() : '';
              const statusCompare = (order[aStatus] ?? 3) - (order[bStatus] ?? 3);
              if (statusCompare !== 0) return statusCompare;
              // Days left calculation
              const getDaysLeft = (project: any) => {
                if (!project.endDate) return Number.POSITIVE_INFINITY;
                return Math.ceil((new Date(project.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
              };
              const aDays = getDaysLeft(a);
              const bDays = getDaysLeft(b);
              return aDays - bDays;
            })
            .map((project, index) => {
              const style = cardStyles[index % cardStyles.length];
              const Icon = projectIcons[index % projectIcons.length];
              const daysLeft = project.endDate
                ? Math.ceil(
                  (new Date(project.endDate).getTime() - new Date().getTime()) /
                  (1000 * 60 * 60 * 24)
                )
                : 0;
              // --- Status badge color ---
              const statusBadge = (
                <span className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-semibold shadow ${getStatusColor((project as any).projectStatus)}`}
                  style={{ zIndex: 2 }}>
                  {(project as any).projectStatus === "ACTIVE"
                    ? "Active"
                    : (project as any).projectStatus === "INACTIVE"
                      ? "Inactive"
                      : (project as any).projectStatus === "COMPLETED"
                        ? "Completed"
                        : "Unknown"}
                </span>
              );
              // --- Edit and Delete buttons ---
              const editButton = (
                <button
                  type="button"
                  className="absolute bottom-4 right-12 bg-white rounded-full p-1 shadow hover:bg-gray-100 z-10"
                  onClick={e => { e.stopPropagation(); handleEdit(project); }}
                  title="Edit Project"
                >
                  <Edit2 className="w-5 h-5 text-gray-500" />
                </button>
              );

              const deleteButton = (
                <button
                  type="button"
                  className="absolute bottom-4 right-4 bg-white rounded-full p-1 shadow hover:bg-red-100 z-10"
                  onClick={e => { e.stopPropagation(); handleDeleteClick(project); }}
                  title="Delete Project"
                >
                  <Trash2 className="w-5 h-5 text-red-500" />
                </button>
              );
              return (
                <Card
                  key={project.id}
                  className={`relative rounded-2xl shadow-md border border-gray-200 bg-white ${style.border} cursor-pointer transition-all duration-300 hover:shadow-2xl hover:scale-[1.03] hover:border-blue-300 hover:bg-blue-50`}
                  style={{ overflow: "visible" }}
                  onClick={() => {
                    setGlobalProjectId(project?.id); // keep global context in sync
                    navigate(`/projects/${project?.id}/project-management`);
                  }}
                >
                  {/* Status badge and Edit/Delete buttons */}
                  {statusBadge}
                  {editButton}
                  {deleteButton}
                  <CardContent className="pt-7 pb-6 px-7">
                    <div className="flex items-center space-x-4 mb-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${style.iconBg}`}>
                        <Icon className={`w-7 h-7 ${style.iconColor}`} />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900">
                        {(project as any).projectName}
                      </h3>
                    </div>
                    <div className="flex items-center space-x-2 text-gray-700">
                      <Calendar className="w-5 h-5 text-gray-400" />
                      <span className="font-medium">Timeline:</span>
                      <span className="text-gray-900 font-semibold">
                        {project.startDate
                          ? new Date(project.startDate).toLocaleDateString()
                          : "Not set"} {" "}
                        -{" "}
                        {project.endDate
                          ? new Date(project.endDate).toLocaleDateString()
                          : "Not set"}
                      </span>
                    </div>
                    {daysLeft > 0 && (
                      <div className="flex items-center space-x-2 text-gray-700">
                        <Calendar className="w-5 h-5 text-gray-400" />
                        <span className="font-medium">Days Left:</span>
                        <span className="text-gray-900 font-semibold">
                          {daysLeft} days
                        </span>
                      </div>
                    )}
                    {/* Project Manager */}
                    <div className="flex items-center space-x-2 text-gray-700 mt-2">
                      <User className="w-5 h-5 text-gray-400" />
                      <span className="font-medium">Project Manager:</span>
                      <span className="text-gray-900 font-semibold">
                        {(project as any).userFirstName && (project as any).userLastName
                          ? `${(project as any).userFirstName} ${(project as any).userLastName}`
                          : (project as any).userFirstName
                          ? (project as any).userFirstName
                          : (project as any).userLastName
                          ? (project as any).userLastName
                          : "Not assigned"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </div>
        {backendProjects.length === 0 && !loading && !error && (
          <Card>
            <CardContent className="p-12 text-center">
              <FolderOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No projects yet
              </h3>
              <p className="text-gray-500 mb-4">
                Create your first project to get started
              </p>
              <Button onClick={() => setIsModalOpen(true)} icon={Plus}>
                Add Project
              </Button>
            </CardContent>
          </Card>
        )}

        <Modal
          isOpen={isModalOpen}
          onClose={resetForm}
          title={editingProject ? "Edit Project" : "Create Project Details"}
          size="xl"
        >
          <form
            onSubmit={handleSubmit}
            className="bg-white border border-gray-300 rounded-xl p-6 md:p-8 space-y-6"
            style={{ background: '#fff' }}
          >
            <div>
              {/* Project Details Section */}
            <div>
              <h2 className="font-semibold text-lg text-gray-800 mb-4">Project Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Row 1: Project Name | Project Status (only for edit) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    required
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                  />
                </div>
                {editingProject && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Project Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => handleInputChange("status", e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                      required
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                      <option value="COMPLETED">Completed</option>
                    </select>
                  </div>
                )}
                {/* Row 2: Project Description (full width) */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Project Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                    rows={4}
                    required
                  />
                </div>
                {/* Row 3: Start Date | End Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <Input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => handleInputChange("startDate", e.target.value)}
                    required
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <Input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => handleInputChange("endDate", e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                  />
                </div>
              </div>
            </div>

            {/* Project Manager Section */}
            <div className="mt-6 mb-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Select Project Manager</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Designation Dropdown */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
                  <Select
                    onValueChange={(value) => {
                      handleInputChange("designationId", Number(value));
                      // Clear previously selected user when designation changes
                      handleInputChange("userId", 0);
                    }}
                    value={formData.designationId ? String(formData.designationId) : ""}
                  >
                    <SelectTrigger className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400">
                      <SelectValue placeholder={isLoadingDesignations ? "Loading designations..." : "Select Designation"} />
                    </SelectTrigger>
                    <SelectContent
                      className="max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 z-[9999] bg-white border border-gray-200 shadow-lg"
                      position="popper"
                      sideOffset={4}
                    >
                      {isLoadingDesignations ? (
                        <SelectItem value="loading" disabled>Loading designations...</SelectItem>
                      ) : designations.length > 0 ? (
                        designations.map(designation => (
                          <SelectItem key={designation.id} value={String(designation.id)}>
                            {designation.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-designations" disabled>No designations available</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* User Dropdown */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">User</label>
                  <Select
                    onValueChange={(value) => handleInputChange("userId", Number(value))}
                    value={formData.userId ? String(formData.userId) : ""}
                    disabled={!formData.designationId}
                  >
                    <SelectTrigger className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400">
                      <SelectValue placeholder={
                        !formData.designationId
                          ? "Select designation first"
                          : isLoadingUsers
                            ? "Loading users..."
                            : "Select User"
                      } />
                    </SelectTrigger>
                    <SelectContent
                      className="max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 z-[9999] bg-white border border-gray-200 shadow-lg"
                      position="popper"
                      sideOffset={4}
                    >
                      {isLoadingUsers ? (
                        <SelectItem value="loading" disabled>Loading users...</SelectItem>
                      ) : filteredUsers.length > 0 ? (
                        filteredUsers.map(user => (
                          <SelectItem key={user.id || user.userId} value={String(user.id || user.userId)}>
                            {`${user.firstName} ${user.lastName}`.trim() || user.email}
                          </SelectItem>
                        ))
                      ) : formData.designationId ? (
                        <SelectItem value="no-users" disabled>No users found for this designation</SelectItem>
                      ) : (
                        <SelectItem value="select-designation" disabled>Please select a designation first</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            {/* Client Details Section */}
            <div className="border border-gray-200 rounded-lg p-4 mb-4">
              <h2 className="font-semibold text-lg text-gray-800 mb-4">Client Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Client Name"
                  value={formData.clientName}
                  onChange={(e) => handleInputChange("clientName", e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                />
                <Input
                  label="Country"
                  value={formData.clientCountry}
                  onChange={(e) => handleInputChange("clientCountry", e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                />
                <Input
                  label="State"
                  value={formData.clientState}
                  onChange={(e) => handleInputChange("clientState", e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                />
                <Input
                  label="Email"
                  type="email"
                  value={formData.clientEmail}
                  onChange={(e) => handleInputChange("clientEmail", e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                />
                <Input
                  label="Phone Number"
                  value={formData.clientPhone}
                  onChange={(e) => handleInputChange("clientPhone", e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 md:col-span-2"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={resetForm}
                className="bg-gray-100 text-gray-800 hover:bg-gray-200 rounded-md px-4 py-2"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-md px-4 py-2"
              >
                {editingProject ? "Update Project" : "Save Project"}
              </Button>
            </div>
            </div>
          </form>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={showDeleteConfirm}
          onClose={cancelDelete}
          title="Delete Project"
          size="md"
        >
          <div className="p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Do you want to delete this project?
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                This action cannot be undone. The project "{deleteConfirmProject?.projectName || deleteConfirmProject?.name}" will be permanently deleted.
              </p>
              <div className="flex justify-center space-x-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={cancelDelete}
                  className="bg-gray-100 text-gray-800 hover:bg-gray-200 rounded-md px-4 py-2"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={confirmDelete}
                  className="bg-red-600 hover:bg-red-700 text-white rounded-md px-4 py-2"
                  disabled={loading}
                >
                  {loading ? "Deleting..." : "Delete Project"}
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
};
