import React, { useEffect, useState } from "react";
import {
  Plus,
  Edit,
  Eye,
  Mail,
  Phone,
  Calendar,
  Award,
  Trash2,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from "../components/ui/Table";
import { Badge } from "../components/ui/Badge";
import { useApp } from "../context/AppContext";
import { Employee } from "../types/index";
import { createUser } from "../api/users/createUser";
import { Designations, getDesignations } from "../api/designation/designation";
import { useParams } from "react-router-dom";
import { getAllUsers, User as BackendUser } from "../api/users/getallusers";
import { getUsersByFilter, UserFilter } from "../api/users/filter";
import { updateUser, updateUserStatus, UpdateUserPayload } from "../api/users/updateuser";
import { deleteUser } from "../api/users/deleteUser";
import { searchUsers, SearchUserData } from "../api/users/searchuser";
import { Toast } from "../components/ui/Toast";
import { formatErrorMessage } from "../lib/errorUtils";

export const Employees: React.FC = () => {
  const { employees, addEmployee, updateEmployee, deleteEmployee } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState({
    id: "",
    firstName: "",
    lastName: "",
    gender: "",
    email: "",
    phone: "",
    designation: "",
    experience: 0,
    joinedDate: "",
    availability: 100,
    status: true,
    skills: "",
  });
  const [users, setUsers] = useState<BackendUser[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [designationFilter, setDesignationFilter] = useState("");
  const [userData, setUserData] = useState<any>(null);
  const [designations, setDesignations] = useState<Designations[]>([]);
  const [filterError, setFilterError] = useState<string | null>(null);
  const [isFiltering, setIsFiltering] = useState(false);
  const [filterRefreshTrigger, setFilterRefreshTrigger] = useState(0);
  
  // Toast state variables
  const [toast, setToast] = useState<{
    isOpen: boolean;
    message: string;
    type: "success" | "error";
  }>({
    isOpen: false,
    message: "",
    type: "success",
  });
  const [pendingCreateSuccess, setPendingCreateSuccess] = useState(false);
  const [pendingEditSuccess, setPendingEditSuccess] = useState(false);
  
  // Search state variables
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchUserData[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchTotalPages, setSearchTotalPages] = useState(1);
  const [searchTotalItems, setSearchTotalItems] = useState(0);
  const [originalSearchResultsCount, setOriginalSearchResultsCount] = useState(0);
  
  // Toast helper functions
  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ isOpen: true, message, type });
  };
  
  // Get unique designations for the filter dropdown
  const uniqueDesignations = Array.from(
    new Set(employees.map((emp) => emp.designation))
  );

  // Filter and search logic
    // const filteredEmployees = employees.filter((emp) => {
    //   const matchesSearch =
    //     emp.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    //     emp.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    //     emp.id.toLowerCase().includes(searchTerm.toLowerCase());
    //   const matchesStatus = statusFilter ? emp.status === statusFilter : true;
    //   const matchesGender = genderFilter ? emp.gender === genderFilter : true;
    //   const matchesDesignation = designationFilter
    //     ? emp.designation === designationFilter
    //     : true;
    //   return (
    //     matchesSearch && matchesStatus && matchesGender && matchesDesignation
    //   );
    // });
  const name=useParams().name;
    const fetchDesignations = async () => {
  
      try {
        const response = await getDesignations();
        setDesignations(response.data);
      } catch (err: any) {
       console.error("Error fetching designations:", err);
      }
    };
      useEffect(() => {
    fetchDesignations();  
  }, [name]);

  // Handle success toasts
  useEffect(() => {
    if (!isModalOpen && pendingCreateSuccess) {
      showToast('Employee created successfully!', 'success');
      setPendingCreateSuccess(false);
    }
  }, [isModalOpen, pendingCreateSuccess]);

  useEffect(() => {
    if (!isModalOpen && pendingEditSuccess) {
      showToast('Employee updated successfully!', 'success');
      setPendingEditSuccess(false);
    }
  }, [isModalOpen, pendingEditSuccess]);

  // Search function
  const handleSearch = async (query: string, page: number = 1) => {
    if (!query.trim()) {
      setSearchResults([]);
      setSearchError(null);
      setSearchTotalPages(1);
      setSearchTotalItems(0);
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    try {
      // Reset to first page when starting a new search
      if (page === 1) {
        setCurrentPage(1);
      }
      
      const response = await searchUsers(query);
      if (response.statusCode === 200 || response.statusCode === 2000) {
        const results = response.data || [];

        // Store original results count for display
        setOriginalSearchResultsCount(results.length);
        
        // Apply current filters to search results
        let filteredResults = results;
        if (statusFilter || genderFilter || designationFilter) {
          filteredResults = results.filter((user: any) => {
            // Status filter - handle both "Active"/"Inactive" and "active"/"inactive"
            const matchesStatus = !statusFilter || 
              (statusFilter === 'active' && (user.userStatus?.toLowerCase() === 'active' || user.userStatus === 'Active')) ||
              (statusFilter === 'inactive' && (user.userStatus?.toLowerCase() === 'inactive' || user.userStatus === 'Inactive'));
            
            // Gender filter - exact match
            const matchesGender = !genderFilter || user.userGender === genderFilter;
            
            // Designation filter - exact match
            const matchesDesignation = !designationFilter || 
              (user.designationName && user.designationName === designationFilter);
            
            return matchesStatus && matchesGender && matchesDesignation;
          });
        }
        
        setSearchResults(filteredResults);
        
        // Calculate pagination for filtered search results
        const totalItems = filteredResults.length;
        const totalPages = Math.ceil(totalItems / rowsPerPage);
        setSearchTotalItems(totalItems);
        setSearchTotalPages(totalPages);
        
        // Ensure current page is valid for new pagination
        if (currentPage > totalPages && totalPages > 0) {
          setCurrentPage(1);
        }
        
        // Set appropriate error message based on filtered results
        if (totalItems === 0) {
          if (results.length > 0) {
            // Search found results but filters filtered them out
            setSearchError(`No employees found matching "${query}" with the current filters. Try adjusting your filter criteria.`);
          } else if (response.message) {
            // No search results at all
            setSearchError(formatErrorMessage(response.message));
          } else {
            setSearchError(`No employees found matching "${query}"`);
          }
        } else {
          setSearchError(null);
        }
      } else {
        setSearchError(formatErrorMessage(response.message || 'Search failed'));
        setSearchResults([]);
        setSearchTotalPages(1);
        setSearchTotalItems(0);
      }
    } catch (error: any) {
      console.error('Search error:', error);
      setSearchError(formatErrorMessage(error.message || 'Search failed'));
      setSearchResults([]);
      setSearchTotalPages(1);
      setSearchTotalItems(0);
    } finally {
      setIsSearching(false);
    }
  };

  // Get paginated search results
  const getPaginatedSearchResults = () => {
    if (!searchTerm.trim() || searchResults.length === 0) {
      return [];
    }
    
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return searchResults.slice(startIndex, endIndex);
  };

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm.trim()) {
        handleSearch(searchTerm);
      } else {
        setSearchResults([]);
        setSearchError(null);
        setSearchTotalPages(1);
        setSearchTotalItems(0);
        setOriginalSearchResultsCount(0);
        // Reset to first page when clearing search
        setCurrentPage(1);
      }
    }, 500); // 500ms delay

    return () => clearTimeout(timeoutId);
  }, [searchTerm, statusFilter, genderFilter, designationFilter]);

  // Reset to first page when search results change
  useEffect(() => {
    if (searchTerm.trim() && searchResults.length > 0) {
      setCurrentPage(1);
    }
  }, [searchResults, searchTerm]);

  // Recalculate search pagination when rowsPerPage changes
  useEffect(() => {
    if (searchTerm.trim() && searchResults.length > 0) {
      const totalPages = Math.ceil(searchResults.length / rowsPerPage);
      setSearchTotalPages(totalPages);
      // Reset to first page if current page exceeds new total pages
      if (currentPage > totalPages) {
        setCurrentPage(1);
      }
    }
  }, [rowsPerPage, searchResults, searchTerm, currentPage]);

  // Handle page change for search results
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    
    // If searching, scroll to top to show new results
    if (searchTerm.trim()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
    
  function generateRandomPassword(length = 12) {
    const chars =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
    let password = "";
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }
  const fetchCreate = async (): Promise<boolean> => {
    // Find the designation ID
    const selectedDesignation = designations.find((d) => d.name === formData.designation);
    const designationId = selectedDesignation ? Number(selectedDesignation.id) : null;

    // Validate required fields
    if (!designationId) {
      alert("Please select a valid designation");
      return false;
    }

    // Format joinDate as ISO string with timezone
    const joinDateISO = formData.joinedDate ? new Date(formData.joinedDate + 'T00:00:00.000+05:30').toISOString() : '';

    const payload = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      //password: generateRandomPassword(),
      phoneNo: formData.phone,
      joinDate: joinDateISO,
      userGender: formData.gender as "Male" | "Female",
      userStatus: formData.status ? "Active" : "Inactive", // Convert boolean to string
      designationId: designationId,
    };


    try {
      const response = await createUser(payload);
      if (response.statusCode === 201) {
        setUserData(response.data);
        setPendingCreateSuccess(true);
        // Refresh the user list after successful creation
        const res = await getAllUsers(currentPage - 1, rowsPerPage);
        setUsers(res.data.content);
        setTotalPages(res.data.totalPages);
        return true;
      }
      return false;
    } catch (error: any) {
      console.error("Error creating user:", error);
      const backendMsg = error?.response?.data?.message || error.message || "Failed to create user";
      showToast(formatErrorMessage(backendMsg), 'error');
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Find the designationId from the name
    const designationId = designations.find(d => d.name === formData.designation)?.id;

    // Backend-compatible payload
    const backendEmployeeData = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      // password: formData.password, // Uncomment if you have a password field
      phoneNo: formData.phone,
      joinDate: formData.joinedDate
        ? new Date(formData.joinedDate).toISOString()
        : "",
      userGender: formData.gender,
      userStatus: formData.status ? "Active" : "Inactive",
      designationId: designationId,
    };

    // Frontend-compatible structure
    const frontendEmployeeData = {
      ...formData,
      gender: formData.gender as "Male" | "Female",
      status: (formData.status ? "active" : "inactive") as "active" | "inactive",
      skills: (formData.skills || "")
        .split(",")
        .map((skill) => skill.trim())
        .filter(Boolean),
      currentProjects: [],
    };

    if (editingEmployee) {
      console.log("Updating employee:", editingEmployee);
      const userId = Number(editingEmployee.id);
      if (!userId || isNaN(userId)) {
        showToast("Invalid user ID for update.", 'error');
        setEditingEmployee(null);
        resetForm();
        setIsModalOpen(false);
        return;
      }
      const updatePayload: UpdateUserPayload = {
        id: userId,
        userId: String(editingEmployee.userId),
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: null,
        phoneNo: formData.phone,
        joinDate: formData.joinedDate
          ? new Date(formData.joinedDate + 'T00:00:00.000+05:30').toISOString()
          : "",
        userGender: formData.gender as "Male" | "Female",
        designationId: designationId ? Number(designationId) : 0,
        designationName: formData.designation
      };

      // Check if status has changed
      const currentStatus = editingEmployee.status === "active" ? "Active" : "Inactive";
      const newStatus = formData.status ? "Active" : "Inactive";
      const statusChanged = currentStatus !== newStatus;

      try {
        let hasUpdates = false;
        let statusUpdateError: string | null = null;

        // Update status first if it has changed
        if (statusChanged) {
          try {
            await updateUserStatus(userId, newStatus as 'Active' | 'Inactive');
            hasUpdates = true;
          } catch (statusError: any) {
            // If backend throws allocation error, show that message and abort update
            const backendMsg = statusError?.response?.data?.message || statusError.message || "Failed to update user status";
            const backendStatus = statusError?.response?.data?.status || "";
            if (
              backendStatus.toLowerCase() === "failure" &&
              backendMsg.toLowerCase().includes("cannot update status")
            ) {
              showToast(formatErrorMessage(backendMsg), 'error');
              return; // Stop further update if allocation error
            } else {
              // Other errors, show toast but continue with other updates if needed
              showToast(formatErrorMessage(backendMsg), 'error');
              statusUpdateError = backendMsg;
            }
          }
        }

        // Check if any user information has changed (excluding status)
        const originalJoinDate = editingEmployee.joinedDate ? getInputDateStringLocal(editingEmployee.joinedDate) : '';

        const fieldChanges = {
          firstName: (editingEmployee.firstName || '').trim() !== (formData.firstName || '').trim(),
          lastName: (editingEmployee.lastName || '').trim() !== (formData.lastName || '').trim(),
          email: (editingEmployee.email || '').trim() !== (formData.email || '').trim(),
          phone: String(editingEmployee.phone || '').trim() !== (formData.phone || '').trim(),
          gender: editingEmployee.gender !== formData.gender,
          designation: (editingEmployee.designation || '').trim() !== (formData.designation || '').trim(),
          joinedDate: originalJoinDate !== (formData.joinedDate || '')
        };

        const userInfoChanged = Object.values(fieldChanges).some(changed => changed);

        // Only call user update API if user info has actually changed
        if (userInfoChanged) {
          try {
            await updateUser(userId, updatePayload);
            hasUpdates = true;
          } catch (userError: any) {
            const errorMessage = userError?.response?.data?.message || "";
            const responseStatus = userError?.response?.data?.status || "";
            if (
              responseStatus !== "FAILURE" &&
              (errorMessage.toLowerCase().includes("no changes found") ||
                errorMessage.toLowerCase().includes("no changes detected"))
            ) {
              // Backend incorrectly reported no changes, but frontend detected changes
              hasUpdates = true; // Treat as successful since we know there were changes
            } else {
              showToast(formatErrorMessage(errorMessage || "Failed to update user information"), 'error');
              return;
            }
          }
        }

        // Show message if no changes were made and no status update error
        if (!hasUpdates && !statusUpdateError) {
          showToast("No changes detected", 'error');
          return;
        }

        // Fetch latest users after update
        const res = await getAllUsers(currentPage - 1, rowsPerPage);
        setUsers(res.data.content);
        setTotalPages(res.data.totalPages);
        setPendingEditSuccess(true);
        updateEmployee(editingEmployee.id, frontendEmployeeData);
        setEditingEmployee(null);
        resetForm();
        setIsModalOpen(false);
        
        // If we're in search mode, refresh search results to show updated data
        if (searchTerm.trim()) {
          try {
            // Re-run the search to get updated results
            await handleSearch(searchTerm);
          } catch (err) {
            console.error("Failed to refresh search results after edit:", err);
          }
        } else {
          // Trigger filter refresh to ensure updated data is shown
          setFilterRefreshTrigger(prev => prev + 1);
          if (statusFilter || genderFilter || designationFilter) {
            // Trigger the useEffect to refetch filtered data
            const selectedDesignationObj = designations.find(
              (d) => d.name === designationFilter
            );
            const designationId = selectedDesignationObj ? selectedDesignationObj.id : undefined;
            
            try {
              const filterRes = await getUsersByFilter(genderFilter, statusFilter, designationId, currentPage, rowsPerPage);
              if (!filterRes.data?.users || filterRes.data.users.length === 0) {
                setFilterError("Data not Found For Filter");
                setUsers([]);
                setTotalPages(1);
              } else {
                setFilterError(null);
                const mappedUsers = (filterRes.data.users).map((user) => {
                  const designationObj = designations.find(d => String(d.id) === String(user.designationId));
                  const numericUserId = extractNumericId(user.userId);
                  return {
                    ...user,
                    id: (user as any).id ?? numericUserId,
                    userId: user.userId,
                    designationName: designationObj ? designationObj.name : '',
                  };
                });
                setUsers(mappedUsers as any);
                setTotalPages(filterRes.data?.totalPages || 1);
              }
            } catch (err) {
              console.error("Failed to refresh filtered data after edit:", err);
            }
          } else {
            // If no filters are active, refresh the main user list to show updated data
            const res = await getAllUsers(currentPage - 1, rowsPerPage);
            setUsers(res.data.content);
            setTotalPages(res.data.totalPages);
          }
        }
      } catch (error: any) {
        showToast(formatErrorMessage(error?.response?.data?.message || error.message || "Failed to update user"), 'error');
      }
      return;
    } else {
      // Only create, do not update
      try {
        const createSuccess = await fetchCreate(); // This should call createUser in the backend
        if (createSuccess) {
          addEmployee(frontendEmployeeData as unknown as Omit<Employee, "id" | "createdAt" | "updatedAt">);
          // Only close modal and reset form on successful creation
          resetForm();
          setIsModalOpen(false);
          
          // If we're in search mode, refresh search results to show new data
          if (searchTerm.trim()) {
            try {
              // Re-run the search to get updated results including the new employee
              await handleSearch(searchTerm);
            } catch (err) {
              console.error("Failed to refresh search results after create:", err);
            }
          } else {
            // Trigger filter refresh to ensure new data is shown
            setFilterRefreshTrigger(prev => prev + 1);
          }
        }
        // If creation failed, don't close modal - let user see the error and try again
      } catch (err) {
        showToast(formatErrorMessage("Failed to create user"), 'error');
        // Don't close modal on error - let user see the error and try again
      }
    }
  };

  const resetForm = () => {
    setFormData({
      id: "",
      firstName: "",
      lastName: "",
      gender: "",
      email: "",
      phone: "",
      designation: "",
      experience: 0,
      joinedDate: "",
      availability: 100,
      status: true,
      skills: "",
    });
  };
  

  const handleEdit = (employee: Employee) => {
    console.log("Editing employee:", employee);
    setEditingEmployee(employee);
    setFormData({
      id: employee.id,
      firstName: employee.firstName,
      lastName: employee.lastName,
      gender: employee.gender || "",
      email: employee.email,
      phone: employee.phone,
      designation: employee.designation,
      experience: employee.experience,
      // Convert join date to YYYY-MM-DD for input type="date"
      joinedDate: employee.joinedDate ? getInputDateStringLocal(employee.joinedDate) : "",
      availability: employee.availability,
      status: employee.status === "active" ? true : false,
      skills: Array.isArray(employee.skills) ? employee.skills.join(", ") : "", // convert array to string for form
    });
    setIsModalOpen(true);
  };

  const handleView = (employee: Employee) => {
    setViewingEmployee(employee);
    setIsViewModalOpen(true);
  };

  const handleDelete = async (userId: number) => {
    if (window.confirm("Are you sure you want to delete this employee?")) {
      try {
        console.log('Delete: Starting delete for user ID:', userId);
        
        // Call backend API to delete user
        const response = await deleteUser(userId);
        console.log('Delete: Delete API response:', response);
        
        if (response.statusCode === 200 || response.statusCode === 204 || response.statusCode === 2000) {
          console.log('Delete: Success, now refreshing data...');
          
          // Refresh users from backend for latest data - same pattern as Role.tsx
          const res = await getAllUsers(currentPage - 1, rowsPerPage);
          console.log('Delete: GetAllUsers response:', res);
          
          setUsers(res.data.content);
          setTotalPages(res.data.totalPages);
          
                     // If we're in search mode, refresh search results to show updated data
          if (searchTerm.trim()) {
            try {
              // Re-run the search to get updated results
              await handleSearch(searchTerm);
            } catch (err) {
              console.error("Failed to refresh search results after delete:", err);
            }
          } else {
            // Trigger filter refresh to ensure updated data is shown
            setFilterRefreshTrigger(prev => prev + 1);
            if (statusFilter || genderFilter || designationFilter) {
              const selectedDesignationObj = designations.find(
                (d) => d.name === designationFilter
              );
              const designationId = selectedDesignationObj ? selectedDesignationObj.id : undefined;
              
              try {
                const filterRes = await getUsersByFilter(genderFilter, statusFilter, designationId, currentPage, rowsPerPage);
                if (!filterRes.data?.users || filterRes.data.users.length === 0) {
                  setFilterError("Data not Found For Filter");
                  setUsers([]);
                  setTotalPages(1);
                } else {
                  const mappedUsers = (filterRes.data.users).map((user) => {
                    const designationObj = designations.find(d => String(d.id) === String(user.designationId));
                    const numericUserId = extractNumericId(user.userId);
                    return {
                      ...user,
                      id: (user as any).id ?? numericUserId,
                      userId: user.userId,
                      designationName: designationObj ? designationObj.name : '',
                    };
                  });
                  setUsers(mappedUsers as any);
                  setTotalPages(filterRes.data?.totalPages || 1);
                }
              } catch (err) {
                console.error("Failed to refresh filtered data after delete:", err);
              }
            } else {
              // If no filters are active, refresh the main user list to show updated data
              const res = await getAllUsers(currentPage - 1, rowsPerPage);
              setUsers(res.data.content);
              setTotalPages(res.data.totalPages);
            }
          }
          
          console.log('Delete: Data refreshed successfully');
          showToast('Employee deleted successfully!', 'success');
          
          
        } else {
          console.log('Delete: Failed with status:', response.statusCode);
          showToast(formatErrorMessage(response.message || 'Failed to delete employee'), 'error');
        }
      } catch (error: any) {
        console.error("Delete: Error deleting user:", error);
        showToast(formatErrorMessage(error?.response?.data?.message || error.message || "Failed to delete employee"), 'error');
      }
    }
  };
  

  const handleInputChange = (field: string, value: string | boolean | undefined) => {
    if (field === "gender") {
      setFormData((prev) => ({ ...prev, [field]: value as "Male" | "Female" }));
    } else if (field === "status") {
      setFormData((prev) => ({ ...prev, [field]: value as boolean }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
  };

  const getStatusBadge = (status: string | boolean | undefined) => {
    if (typeof status === "string") {
      if (status.toLowerCase() === "active") return <Badge variant="success">Active</Badge>;
      if (status.toLowerCase() === "inactive") return <Badge variant="error">Inactive</Badge>;
      return <Badge variant="default">{status}</Badge>;
    }
    if (status === true) return <Badge variant="success">Active</Badge>;
    if (status === false) return <Badge variant="error">Inactive</Badge>;
    return <Badge variant="default">{String(status)}</Badge>;
  };

  useEffect(() => {
    async function fetchUsers() {
      try {
        setIsFiltering(true);
        setFilterError(null);
        
        const selectedDesignationObj = designations.find(
          (d) => d.name === designationFilter
        );
        const designationId = selectedDesignationObj ? selectedDesignationObj.id : undefined;

        if (statusFilter || genderFilter || designationId) {
          console.log('📡 Calling filter API with:', { genderFilter, statusFilter, designationId, page: currentPage, size: rowsPerPage });
          const res = await getUsersByFilter(genderFilter, statusFilter, designationId, currentPage, rowsPerPage);
          console.log('✅ Filter API response:', {
            status: res.status,
            totalItems: res.data?.totalItems,
            totalPages: res.data?.totalPages,
            currentPage: res.data?.currentPage,
            usersCount: res.data?.users?.length,
            sampleUsers: res.data?.users?.slice(0, 3).map(u => ({
              name: `${u.firstName} ${u.lastName}`,
              gender: u.userGender,
              status: u.userStatus
            }))
          });
          
                     // Check if filter returned no results
           if (!res.data?.users || res.data.users.length === 0) {
             setFilterError("Data not Found For Filter");
             setUsers([]);
             setTotalPages(1);
           } else {
             setFilterError(null); // Clear any previous filter errors
             const mappedUsers = (res.data.users).map((user) => {
               const designationObj = designations.find(d => String(d.id) === String(user.designationId));
               const numericUserId = extractNumericId(user.userId);
               return {
                 ...user,
                 id: (user as any).id ?? numericUserId,
                 userId: user.userId,
                 designationName: designationObj ? designationObj.name : '',
               };
             });
             setUsers(mappedUsers as any); // Type assertion to handle UserFilter to User conversion
             setTotalPages(res.data?.totalPages || 1);
           }
        } else {
          const allRes = await getAllUsers(currentPage - 1, rowsPerPage);
          // No id conversion here, keep as string | null
          setUsers(allRes.data.content);
          setTotalPages(allRes.data.totalPages);
        }
             } catch (err) {
         console.error("Failed to fetch users", err);
         // Don't show generic error message, just log it
         setUsers([]);
         setTotalPages(1);
       } finally {
         setIsFiltering(false);
       }
    }
    fetchUsers();
     }, [currentPage, rowsPerPage, genderFilter, statusFilter, designationFilter, designations, filterRefreshTrigger]);

  // Helper function to format Employee ID
  function formatEmployeeId(id: string | number): string {
    if (!id) return '';
    const num = typeof id === 'string' ? parseInt(id, 10) : id;
    if (isNaN(num)) return String(id);
    return `US${num.toString().padStart(4, '0')}`;
  }

  // Helper to get YYYY-MM-DD in UTC for input type="date"
  function getInputDateString(dateString: string): string {
    if (!dateString) return "";
    const date = new Date(dateString);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  // Helper to get YYYY-MM-DD in local time for input type="date"
  function getInputDateStringLocal(dateString: string): string {
    if (!dateString) return "";
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  // Helper to extract numeric userId from formatted string like 'US0002'
  function extractNumericId(id: string | number): number {
    if (typeof id === 'number') return id;
    const match = id.match(/\d+/);
    return match ? Number(match[0]) : NaN;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 no-horizontal-scroll">
      {/* Employee Management Heading */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Employee Management
          </h1>
          <p className="text-gray-600 mt-1">
            Manage your team members and their information
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setEditingEmployee(null);
            setIsModalOpen(true);
          }}
          icon={Plus}
          className="shadow-lg hover:shadow-xl transition-shadow duration-200"
        >
          Add Employee
        </Button>
      </div>

      {/* Search and Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4 mt-4">
        <div className="relative w-full md:w-64">
          <input
            type="text"
            placeholder="Search employees..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
              setFilterError(null);
              // Clear search results when typing new search
              if (!e.target.value.trim()) {
                setSearchResults([]);
                setSearchError(null);
                setSearchTotalPages(1);
                setSearchTotalItems(0);
                setOriginalSearchResultsCount(0);
              }
            }}
            className="border border-gray-300 rounded-lg px-3 py-2 w-full pr-8"
            title="Search by Employee ID, First Name, or Last Name"
          />
          {isSearching && (
            <div className="absolute right-2 top-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
            </div>
          )}
          {searchTerm.trim() && !isSearching && (
            <button
              onClick={() => {
                setSearchTerm("");
                setSearchResults([]);
                setSearchError(null);
                setSearchTotalPages(1);
                setSearchTotalItems(0);
                setOriginalSearchResultsCount(0);
                setCurrentPage(1);
              }}
              className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {isFiltering && (
            <div className="flex items-center gap-2 text-blue-600 text-sm">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
              Applying filters...
            </div>
          )}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
              setFilterError(null);
              // Clear search results when filters change to avoid confusion
              if (searchTerm.trim()) {
                setSearchResults([]);
                setSearchError(null);
                setSearchTotalPages(1);
                setSearchTotalItems(0);
                setOriginalSearchResultsCount(0);
              }
            }}
            className="border border-gray-300 rounded-lg px-3 py-2 min-w-[120px]"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select
            value={genderFilter}
            onChange={(e) => {
              setGenderFilter(e.target.value);
              setCurrentPage(1);
              setFilterError(null);
              // Clear search results when filters change to avoid confusion
              if (searchTerm.trim()) {
                setSearchResults([]);
                setSearchError(null);
                setSearchTotalPages(1);
                setSearchTotalItems(0);
                setOriginalSearchResultsCount(0);
              }
            }}
            className="border border-gray-300 rounded-lg px-3 py-2 min-w-[120px]"
          >
            <option value="">All Genders</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
          <select
            value={designationFilter}
            onChange={(e) => {
              setDesignationFilter(e.target.value);
              setCurrentPage(1);
              setFilterError(null);
              // Clear search results when filters change to avoid confusion
              if (searchTerm.trim()) {
                setSearchResults([]);
                setSearchError(null);
                setSearchTotalPages(1);
                setSearchTotalItems(0);
                setOriginalSearchResultsCount(0);
              }
            }}
            className="border border-gray-300 rounded-lg px-3 py-2 min-w-[140px] max-w-[200px]"
          >
            <option value="">All Designations</option>
            {designations.map((designation) => (
              <option key={designation?.id} value={designation?.name}>
                {designation?.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Employee Table */}
      <Card className="shadow-lg no-horizontal-scroll">
        <CardHeader>
          <h3 className="text-xl font-semibold text-gray-900">
            Employee Directory
          </h3>
        </CardHeader>
        <CardContent className="p-0 no-horizontal-scroll">
          <div className="overflow-x-auto table-container">
            <div className="min-w-[1400px]">
              {/* Show search results count */}
              {searchTerm.trim() && searchResults.length > 0 && (
                <div className="p-4 text-center text-blue-600 bg-blue-50 rounded-lg mb-4">
                  Found {searchTotalItems} employee(s) matching "{searchTerm}" 
                  {originalSearchResultsCount > searchTotalItems && (
                    <span> (filtered from {originalSearchResultsCount} total results by current filters)</span>
                  )}
                  {searchTotalPages > 1 && (
                    <span> - Showing page {currentPage} of {searchTotalPages}</span>
                  )}
                </div>
              )}
              
              {/* Show search error if any */}
              {searchTerm.trim() && searchError && searchResults.length === 0 && (
                <div className="p-4 text-center text-red-500 bg-red-50 rounded-lg mb-4">
                  {searchError}
                  {originalSearchResultsCount > 0 && (
                    <div className="mt-2 text-sm text-red-600">
                      The search found {originalSearchResultsCount} employee(s), but none match your current filters.
                    </div>
                  )}
                </div>
              )}
              
              {/* Show filter error if any */}
              {filterError && !isFiltering && users.length === 0 && (
                <div className="p-4 text-center text-red-500 bg-red-50 rounded-lg mb-4">
                  {filterError}
                </div>
              )}
              
              {/* Show search results or regular users */}
              {(searchResults.length > 0 || users.length > 0) ? (
                <>
                  {/* Show message if search results exist but current page is empty */}
                  {searchTerm.trim() && searchResults.length > 0 && getPaginatedSearchResults().length === 0 && (
                    <div className="p-4 text-center text-orange-600 bg-orange-50 rounded-lg mb-4">
                      No results on page {currentPage}. Use pagination to view other pages.
                    </div>
                  )}
 
                  <table className="w-full min-w-[1400px]">
                  <TableHeader>
                    <TableRow>
                      <TableCell header className="whitespace-nowrap min-w-[100px]">Employee ID</TableCell>
                      <TableCell header className="whitespace-nowrap min-w-[100px]">First Name</TableCell>
                      <TableCell header className="whitespace-nowrap min-w-[100px]">Last Name</TableCell>
                      <TableCell header className="whitespace-nowrap min-w-[80px]">Gender</TableCell>
                      <TableCell header className="whitespace-nowrap min-w-[120px]">Designation</TableCell>
                      <TableCell header className="whitespace-nowrap min-w-[120px]">Contact Number</TableCell>
                      <TableCell header className="whitespace-nowrap min-w-[250px]">Email ID</TableCell>
                      <TableCell header className="whitespace-nowrap min-w-[100px]">Join Date</TableCell>
                      <TableCell header className="whitespace-nowrap min-w-[80px]">Status</TableCell>
                      <TableCell header className="whitespace-nowrap min-w-[100px]">Actions</TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Display paginated search results if available, otherwise show regular users */}
                    {(searchTerm.trim() ? getPaginatedSearchResults() : users).map((user: any) => {
                      // Helper function to get the correct primary key ID
                      const getUserId = (user: any) => {
                        if ('id' in user && user.id) return user.id;
                        if ('userId' in user) return user.userId;
                        return 'Unknown';
                      };

                      // Map backend user to Employee shape for edit/delete
                      const mappedEmployee = {
                        id: user.id, // use backend primary key
                        userId: user.userId, // keep abbreviation for display
                        firstName: user.firstName,
                        lastName: user.lastName,
                        gender: (user.userGender as "Male" | "Female") || "Male",
                        email: user.email,
                        phone: user.phoneNo,
                        designation: user.designationName || "",
                        experience: 0,
                        joinedDate: user.joinDate,
                        availability: 100,
                        status: (user.userStatus.toLowerCase() === "active" ? "active" : "inactive") as "active" | "inactive",
                        currentProjects: [],
                        createdAt: "",
                        updatedAt: "",
                        skills: [], // <-- ensure skills is always an array for Employee
                      } as Employee;
                      return (
                        <TableRow key={getUserId(user)}>
                          <TableCell className="font-mono text-sm min-w-[100px]">{formatEmployeeId(user.userId)}</TableCell>
                          <TableCell className="min-w-[100px]">{user.firstName}</TableCell>
                          <TableCell className="min-w-[100px]">{user.lastName}</TableCell>
                          <TableCell className="min-w-[80px]">{user.userGender || "-"}</TableCell>
                          <TableCell className="min-w-[120px]">{user.designationName || "-"}</TableCell>
                          <TableCell className="min-w-[120px]">{user.phoneNo || "-"}</TableCell>
                          <TableCell className="min-w-[250px]">{user.email || "-"}</TableCell>
                          <TableCell className="text-sm min-w-[100px]">
                            {user.joinDate
                              ? new Date(user.joinDate).toLocaleDateString()
                              : "-"}
                          </TableCell>
                          <TableCell className="min-w-[80px]">{getStatusBadge(user.userStatus)}</TableCell>
                          <TableCell className="min-w-[100px]">
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(mappedEmployee)}
                                className="p-2 hover:bg-yellow-50 text-yellow-600"
                                title="Edit Employee"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(Number(user.id))}
                                className="p-2 hover:bg-red-50 text-red-600"
                                title="Delete Employee"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </table>
                </>
              ) : (
                <div className="p-12 text-center">
                  <Award className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {searchTerm.trim() ? 'No search results found' : 
                     (statusFilter || genderFilter || designationFilter) ? 'No employees found for the selected filters' : 
                     'No employees yet'}
                  </h3>
                  <p className="text-gray-500 mb-4">
                    {searchTerm.trim() 
                      ? (searchResults.length === 0 && (statusFilter || genderFilter || designationFilter))
                        ? `No employees found matching "${searchTerm}" with the current filters. Try adjusting your filter criteria or search with different keywords.`
                        : `No employees found matching "${searchTerm}". Try searching with different keywords.`
                      : (statusFilter || genderFilter || designationFilter)
                      ? 'Try adjusting your filter criteria or clear all filters'
                      : 'Get started by adding your first employee'
                    }
                  </p>
                  {!searchTerm.trim() && !statusFilter && !genderFilter && !designationFilter && (
                    <Button onClick={() => setIsModalOpen(true)} icon={Plus}>
                      Add Employee
                    </Button>
                  )}
                </div>
              )}
            </div>
            {/* Pagination Controls */}
            <div
              className="sticky bottom-0 left-0 right-0 w-full bg-white border-t z-50"
              style={{
                boxShadow: '0 -2px 8px rgba(0,0,0,0.04)',
                position: 'sticky',
                bottom: 0
              }}
            >
              {/* Pagination Controls */}
              <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 gap-3">
                  {/* Rows per page dropdown - positioned on the left */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-700 whitespace-nowrap">Rows per page:</span>
                    <select
                      value={rowsPerPage}
                      onChange={(e) => {
                        setRowsPerPage(Number(e.target.value));
                        setCurrentPage(1); // Reset to first page when changing rows per page
                        // Recalculate search pagination when rows per page changes
                        if (searchTerm.trim() && searchResults.length > 0) {
                          const totalPages = Math.ceil(searchResults.length / Number(e.target.value));
                          setSearchTotalPages(totalPages);
                        }
                      }}
                      className="border border-gray-300 rounded px-2 py-1 text-sm"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>

                  {/* Pagination controls - centered */}
                  <div className="flex items-center gap-1">
                    {/* Previous Button */}
                    <button
                      className="px-2 py-1 rounded border bg-gray-100 text-gray-700 disabled:opacity-50 text-sm"
                      onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                    >
                      &lt;
                    </button>

                {/* Page Numbers - Compact Design */}
                {(() => {
                  const pages = [];
                  const maxVisible = 3; // Show fewer pages for compact design
                  const effectiveTotalPages = searchTerm.trim() ? searchTotalPages : totalPages;

                  if (effectiveTotalPages <= maxVisible) {
                    for (let i = 1; i <= effectiveTotalPages; i++) {
                      pages.push(i);
                    }
                  } else {
                    // Always show current page and neighbors
                    const start = Math.max(1, currentPage - 1);
                    const end = Math.min(effectiveTotalPages, currentPage + 1);
                    for (let i = start; i <= end; i++) {
                      pages.push(i);
                    }
                  }

                  return pages.map((page) => (
                    <button
                      key={page}
                      className={`w-8 h-8 rounded text-sm font-medium ${
                        currentPage === page
                          ? "bg-blue-500 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                      onClick={() => handlePageChange(Number(page))}
                    >
                      {page}
                    </button>
                  ));
                })()}

                {/* Next Button */}
                <button
                  className="px-2 py-1 rounded border bg-gray-100 text-gray-700 disabled:opacity-50 text-sm"
                  onClick={() => handlePageChange(Math.min(searchTerm.trim() ? searchTotalPages : totalPages, currentPage + 1))}
                  disabled={currentPage === (searchTerm.trim() ? searchTotalPages : totalPages)}
                >
                  &gt;
                </button>
                  </div>

                  {/* Go to Page - Right side */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-700 whitespace-nowrap">Go to</span>
                    <input
                      type="text"
                      defaultValue={currentPage}
                      onInput={(e) => {
                        const target = e.target as HTMLInputElement;
                        const val = target.value;
                        // Only allow digits
                        target.value = val.replace(/[^0-9]/g, '');
                      }}
                      onBlur={(e) => {
                        const val = e.target.value;
                        let numVal = Number(val);
                        const effectiveTotalPages = searchTerm.trim() ? searchTotalPages : totalPages;

                        if (val === '' || isNaN(numVal) || numVal < 1) {
                          numVal = 1;
                        } else if (numVal > effectiveTotalPages) {
                          numVal = effectiveTotalPages;
                        }

                        handlePageChange(numVal);
                        e.target.value = numVal.toString();
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.currentTarget.blur();
                        }
                      }}
                      placeholder="1"
                      className="w-12 border rounded px-1 py-1 text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <span className="text-sm text-gray-700 whitespace-nowrap">/ {searchTerm.trim() ? searchTotalPages : totalPages}</span>
                  </div>
                </div>
              </div>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Employee Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingEmployee(null);
          resetForm();
                setToast({ isOpen: false, message: '', type: 'success' });
        }}
        title={editingEmployee ? "Edit Employee" : "Add New Employee"}
        size="2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            {/* <Input
              label="Employee ID"
              value={formData.id || ""}
              onChange={(e) => handleInputChange("id", e.target.value)}
              placeholder="Enter employee ID (ex: EMP001)"
              required
            /> */}
            <Input
              label="First Name"
              value={formData.firstName}
              onChange={(e) => handleInputChange("firstName", e.target.value)}
              placeholder="Enter first name"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Last Name"
              value={formData.lastName}
              onChange={(e) => handleInputChange("lastName", e.target.value)}
              placeholder="Enter last name"
              required
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gender
              </label>
              <select
                value={formData.gender || ""}
                onChange={(e) => handleInputChange("gender", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="" disabled>
                  Select gender
                </option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Designation
              </label>
              <select
                value={formData.designation}
                onChange={(e) =>
                  handleInputChange("designation", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="" disabled>
                  Select designation
                </option>
                {designations.map((designation) => (
                  <option key={designation?.id} value={designation?.name}>
                    {designation?.name}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Email ID"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              placeholder="Enter the Email ID"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Contact Number"
              value={formData.phone}
              onChange={(e) => handleInputChange("phone", e.target.value)}
              placeholder="Enter the Contact number"
              required
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={formData.status ? "true" : "false"}
                onChange={(e) => handleInputChange("status", e.target.value === "true")}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Join date"
              type="date"
              value={formData.joinedDate}
              onChange={(e) => handleInputChange("joinedDate", e.target.value)}
              placeholder="Enter the date employee joined"
              required
            />
          </div>
          <div className="flex justify-start space-x-3 pt-4">
            <Button type="submit">
              {editingEmployee ? "Update Employee" : "Save Employee"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                resetForm();
              }}
            >
              Clear
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Employee Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setViewingEmployee(null);
        }}
        title="Employee Details"
        size="lg"
      >
        {viewingEmployee && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">
                    Basic Information
                  </h4>
                  <div className="space-y-2 text-sm">
                    <p>
                      <span className="font-medium">Employee ID:</span>{" "}
                      {viewingEmployee.id}
                    </p>
                    <p>
                      <span className="font-medium">First Name:</span>{" "}
                      {viewingEmployee.firstName}
                    </p>
                    <p>
                      <span className="font-medium">Last Name:</span>{" "}
                      {viewingEmployee.lastName}
                    </p>
                    <p>
                      <span className="font-medium">Gender:</span>{" "}
                      {viewingEmployee.gender}
                    </p>
                    <p>
                      <span className="font-medium">Designation:</span>{" "}
                      {viewingEmployee.designation}
                    </p>
                    <p>
                      <span className="font-medium">Contact Number:</span>{" "}
                      {String(viewingEmployee.phone)}
                    </p>
                    <p>
                      <span className="font-medium">Email ID:</span>{" "}
                      {viewingEmployee.email}
                    </p>
                    <p>
                      <span className="font-medium">Join Date:</span>{" "}
                      {new Date(
                        viewingEmployee.joinedDate
                      ).toLocaleDateString()}
                    </p>
                    <p>
                      <span className="font-medium">Status:</span>{" "}
                      {getStatusBadge(viewingEmployee.status)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Toast Notification */}
      <Toast
        isOpen={toast.isOpen}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, isOpen: false })}
      />
    </div>
  );
};
