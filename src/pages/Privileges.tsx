import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";

import { Card, CardContent, CardHeader } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Save, Shield, ChevronDown, ChevronRight, CheckSquare, Square, ChevronLeft, Lock, Key, FileText, User, Search, Filter, X } from "lucide-react";
import { getAllUsersSimple, SimpleUser } from "../api/users/getallusers";
import { getAllRoles } from "../api/role/viewrole";
import { Input } from "../components/ui/Input";

interface PrivilegeGroup {
  module: string;
  privileges: {
    id: string;
    name: string;
    description: string;
    permissions: string[];
  }[];
}

interface RolePrivilege {
  roleId: string;
  roleName: string;
  privileges: string[];
}

interface UserPrivilege {
  userId: string;
  userName: string;
  userEmail: string;
  privileges: string[];
}

interface Role {
  id: string;
  name?: string;
  roleName?: string;
  description?: string;
}

const Privileges: React.FC = () => {
  const navigate = useNavigate();
  const [privilegeGroups, setPrivilegeGroups] = useState<PrivilegeGroup[]>([]);
  const [rolePrivileges, setRolePrivileges] = useState<RolePrivilege[]>([]);
  const [userPrivileges, setUserPrivileges] = useState<UserPrivilege[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<SimpleUser[]>([]);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [isUserMode, setIsUserMode] = useState(false); // Toggle between Role/User mode
  const [loading, setLoading] = useState(false);

  // Filter and search states for user mode
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [selectedDesignations, setSelectedDesignations] = useState<string[]>([]);
  const [availableDesignations, setAvailableDesignations] = useState<string[]>([]);
  const [isDesignationDropdownOpen, setIsDesignationDropdownOpen] = useState(false);

  // Filter and search states for role mode
  const [roleSearchTerm, setRoleSearchTerm] = useState('');

  // Function to load users from API
  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await getAllUsersSimple();
      if (response.status === 'success' && response.data.content) {
        setUsers(response.data.content);

        // Extract unique designations for filter dropdown
        const designations = [...new Set(
          response.data.content
            .map(user => user.designationName)
            .filter((designation): designation is string => designation !== undefined && designation.trim() !== '')
        )].sort();
        setAvailableDesignations(designations);

        // Initialize user privileges with empty privileges
        const initialUserPrivileges: UserPrivilege[] = response.data.content.map(user => ({
          userId: user.id?.toString() || user.userId.toString(),
          userName: `${user.firstName} ${user.lastName}`,
          userEmail: user.email,
          privileges: [] // Start with no privileges
        }));
        setUserPrivileges(initialUserPrivileges);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  // Function to load roles from API
  const loadRoles = async () => {
    try {
      setLoading(true);
      const response = await getAllRoles();

      // Use the same pattern as Role.tsx page
      const rolesData = Array.isArray(response.data) ? response.data : response.data?.data || [];

      // Map roles to ensure consistent property names
      const mappedRoles = rolesData.map((role: any) => ({
        id: role.id?.toString() || '',
        name: role.roleName || role.name || '',
        roleName: role.roleName || role.name || '',
        description: role.description || ''
      }));


      setRoles(mappedRoles);

      // Initialize role privileges with empty privileges
      const initialRolePrivileges: RolePrivilege[] = mappedRoles.map((role: Role) => ({
        roleId: role.id,
        roleName: role.name || role.roleName || '',
        privileges: [] // Start with no privileges
      }));
      setRolePrivileges(initialRolePrivileges);
    } catch (error) {
      console.error('Error loading roles:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter users based on search term and designations
  const filteredUsers = users.filter(user => {
    const matchesSearch = userSearchTerm === '' ||
      `${user.firstName} ${user.lastName}`.toLowerCase().includes(userSearchTerm.toLowerCase());
    const matchesDesignation = selectedDesignations.length === 0 ||
      (user.designationName && selectedDesignations.includes(user.designationName));
    return matchesSearch && matchesDesignation;
  });

  // Filter roles based on search term
  const filteredRoles = roles.filter(role => {
    const roleName = role.name || role.roleName || '';
    const matchesSearch = roleSearchTerm === '' ||
      roleName.toLowerCase().includes(roleSearchTerm.toLowerCase());
    return matchesSearch;
  });



  // Handle designation selection
  const handleDesignationToggle = (designation: string) => {
    setSelectedDesignations(prev =>
      prev.includes(designation)
        ? prev.filter(d => d !== designation)
        : [...prev, designation]
    );
  };

  // Remove specific designation
  const removeDesignation = (designation: string) => {
    setSelectedDesignations(prev => prev.filter(d => d !== designation));
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (isDesignationDropdownOpen && !target.closest('.designation-dropdown')) {
        setIsDesignationDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDesignationDropdownOpen]);

  // Load data from APIs
  useEffect(() => {
    const mockPrivilegeGroups: PrivilegeGroup[] = [
      {
        module: "Defects",
        privileges: [
          {
            id: "defect_create",
            name: "Create Defects",
            description: "Create new defects and issues",
            permissions: ["create"],
          },
          {
            id: "defect_read",
            name: "View Defects",
            description: "View and search defects",
            permissions: ["read"],
          },
          {
            id: "defect_update",
            name: "Update Defects",
            description: "Modify defect details and status",
            permissions: ["update"],
          },
          {
            id: "defect_delete",
            name: "Delete Defects",
            description: "Delete defects from the system",
            permissions: ["delete"],
          },
          {
            id: "defect_assign",
            name: "Assign Defects",
            description: "Assign defects to team members",
            permissions: ["assign"],
          },
        ],
      },
      {
        module: "Test Cases",
        privileges: [
          {
            id: "testcase_create",
            name: "Create Test Cases",
            description: "Create new test cases",
            permissions: ["create"],
          },
          {
            id: "testcase_read",
            name: "View Test Cases",
            description: "View and search test cases",
            permissions: ["read"],
          },
          {
            id: "testcase_update",
            name: "Update Test Cases",
            description: "Modify test case details",
            permissions: ["update"],
          },
          {
            id: "testcase_execute",
            name: "Execute Test Cases",
            description: "Execute and update test results",
            permissions: ["execute"],
          },
        ],
      },
      {
        module: "Projects",
        privileges: [
          {
            id: "project_create",
            name: "Create Projects",
            description: "Create new projects",
            permissions: ["create"],
          },
          {
            id: "project_read",
            name: "View Projects",
            description: "View project details and reports",
            permissions: ["read"],
          },
          {
            id: "project_update",
            name: "Update Projects",
            description: "Modify project settings and details",
            permissions: ["update"],
          },
          {
            id: "project_delete",
            name: "Delete Projects",
            description: "Delete projects from the system",
            permissions: ["delete"],
          },
          {
            id: "project_manage",
            name: "Manage Projects",
            description: "Full project management capabilities",
            permissions: ["manage"],
          },
        ],
      },
      {
        module: "Users",
        privileges: [
          {
            id: "user_create",
            name: "Create Users",
            description: "Create new user accounts",
            permissions: ["create"],
          },
          {
            id: "user_read",
            name: "View Users",
            description: "View user profiles and information",
            permissions: ["read"],
          },
          {
            id: "user_update",
            name: "Update Users",
            description: "Modify user details and settings",
            permissions: ["update"],
          },
          {
            id: "user_delete",
            name: "Delete Users",
            description: "Delete user accounts",
            permissions: ["delete"],
          },
        ],
      },
      {
        module: "Reports",
        privileges: [
          {
            id: "report_view",
            name: "View Reports",
            description: "Access to view all reports",
            permissions: ["read"],
          },
          {
            id: "report_export",
            name: "Export Reports",
            description: "Export reports to various formats",
            permissions: ["export"],
          },
          {
            id: "report_create",
            name: "Create Reports",
            description: "Create custom reports",
            permissions: ["create"],
          },
        ],
      },
      {
        module: "Configuration",
        privileges: [
          {
            id: "config_view",
            name: "View Configuration",
            description: "View system configuration settings",
            permissions: ["read"],
          },
          {
            id: "config_update",
            name: "Update Configuration",
            description: "Modify system configuration",
            permissions: ["update"],
          },
        ],
      },
    ];



    setPrivilegeGroups(mockPrivilegeGroups);

    // Load data when component mounts
    loadUsers();
    loadRoles();
  }, []);

  // Handle toggle between Role and User mode
  const handleToggle = () => {
    setIsUserMode(!isUserMode);
  };

  const handlePrivilegeToggle = (entityId: string, privilegeId: string) => {
    if (isUserMode) {
      // Handle user privilege toggle
      setUserPrivileges(prev =>
        prev.map(userPriv => {
          if (userPriv.userId === entityId) {
            const hasPrivilege = userPriv.privileges.includes(privilegeId);
            return {
              ...userPriv,
              privileges: hasPrivilege
                ? userPriv.privileges.filter(p => p !== privilegeId)
                : [...userPriv.privileges, privilegeId]
            };
          }
          return userPriv;
        })
      );
    } else {
      // Handle role privilege toggle
      setRolePrivileges(prev =>
        prev.map(rolePriv => {
          if (rolePriv.roleId === entityId) {
            const hasPrivilege = rolePriv.privileges.includes(privilegeId);
            return {
              ...rolePriv,
              privileges: hasPrivilege
                ? rolePriv.privileges.filter(p => p !== privilegeId)
                : [...rolePriv.privileges, privilegeId]
            };
          }
          return rolePriv;
        })
      );
    }
  };

  const handleGroupToggle = (module: string) => {
    setCollapsedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(module)) {
        newSet.delete(module);
      } else {
        newSet.add(module);
      }
      return newSet;
    });
  };

  const handleSelectAllGroup = (entityId: string, module: string) => {
    const group = privilegeGroups && privilegeGroups.find(g => g.module === module);
    if (!group) return;

    const groupPrivilegeIds = group.privileges.map(p => p.id);

    if (isUserMode) {
      // Handle user group selection
      const userPriv = userPrivileges && userPrivileges.find(up => up.userId === entityId);
      if (!userPriv) return;

      const hasAllGroupPrivileges = groupPrivilegeIds.every(id =>
        userPriv.privileges.includes(id)
      );

      setUserPrivileges(prev =>
        prev.map(up => {
          if (up.userId === entityId) {
            if (hasAllGroupPrivileges) {
              // Remove all group privileges
              return {
                ...up,
                privileges: up.privileges.filter(p => !groupPrivilegeIds.includes(p))
              };
            } else {
              // Add all group privileges
              const newPrivileges = [...up.privileges];
              groupPrivilegeIds.forEach(id => {
                if (!newPrivileges.includes(id)) {
                  newPrivileges.push(id);
                }
              });
              return {
                ...up,
                privileges: newPrivileges
              };
            }
          }
          return up;
        })
      );
    } else {
      // Handle role group selection
      const rolePriv = rolePrivileges && rolePrivileges.find(rp => rp.roleId === entityId);
      if (!rolePriv) return;

      const hasAllGroupPrivileges = groupPrivilegeIds.every(id =>
        rolePriv.privileges.includes(id)
      );

      setRolePrivileges(prev =>
        prev.map(rp => {
          if (rp.roleId === entityId) {
            if (hasAllGroupPrivileges) {
              // Remove all group privileges
              return {
                ...rp,
                privileges: rp.privileges.filter(p => !groupPrivilegeIds.includes(p))
              };
            } else {
              // Add all group privileges
              const newPrivileges = [...rp.privileges];
              groupPrivilegeIds.forEach(id => {
                if (!newPrivileges.includes(id)) {
                  newPrivileges.push(id);
                }
              });
              return {
                ...rp,
                privileges: newPrivileges
              };
            }
          }
          return rp;
        })
      );
    }
  };

  const isGroupSelected = (entityId: string, module: string) => {
    const group = privilegeGroups && privilegeGroups.find(g => g.module === module);
    if (!group) return false;

    const groupPrivilegeIds = group.privileges.map(p => p.id);

    if (isUserMode) {
      const userPriv = userPrivileges && userPrivileges.find(up => up.userId === entityId);
      if (!userPriv) return false;
      return groupPrivilegeIds.every(id => userPriv.privileges.includes(id));
    } else {
      const rolePriv = rolePrivileges && rolePrivileges.find(rp => rp.roleId === entityId);
      if (!rolePriv) return false;
      return groupPrivilegeIds.every(id => rolePriv.privileges.includes(id));
    }
  };

  const isGroupPartiallySelected = (entityId: string, module: string) => {
    const group = privilegeGroups && privilegeGroups.find(g => g.module === module);
    if (!group) return false;

    const groupPrivilegeIds = group.privileges.map(p => p.id);

    if (isUserMode) {
      const userPriv = userPrivileges && userPrivileges.find(up => up.userId === entityId);
      if (!userPriv) return false;
      const selectedCount = groupPrivilegeIds.filter(id =>
        userPriv.privileges.includes(id)
      ).length;
      return selectedCount > 0 && selectedCount < groupPrivilegeIds.length;
    } else {
      const rolePriv = rolePrivileges && rolePrivileges.find(rp => rp.roleId === entityId);
      if (!rolePriv) return false;
      const selectedCount = groupPrivilegeIds.filter(id =>
        rolePriv.privileges.includes(id)
      ).length;
      return selectedCount > 0 && selectedCount < groupPrivilegeIds.length;
    }
  };

  const handleSave = () => {
    // In real app, this would save to API
    alert("Role privileges saved successfully!");
  };

  return (
    <div className="max-w-6xl mx-auto p-8">
      {/* Header with toggle and back button */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Privileges Configuration</h1>
          <p className="text-gray-600 mt-1">
            Assign privileges to {isUserMode ? 'users' : 'roles'} for access control
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Toggle between Role/User mode */}
          <Card className="p-3 bg-gray-50 border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-blue-600" />
                <span className={`text-sm font-medium ${!isUserMode ? 'text-blue-600' : 'text-gray-500'}`}>
                  Roles
                </span>
              </div>

              <button
                onClick={handleToggle}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  isUserMode ? 'bg-blue-600' : 'bg-gray-300'
                }`}
                disabled={loading}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isUserMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>

              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-green-600" />
                <span className={`text-sm font-medium ${isUserMode ? 'text-green-600' : 'text-gray-500'}`}>
                  Users
                </span>
              </div>
            </div>
          </Card>

          <Button
            onClick={handleSave}
            className="flex items-center space-x-2"
            disabled={loading}
          >
            <Save className="w-4 h-4" />
            <span>Save Changes</span>
          </Button>
          <Button
            variant="secondary"
            onClick={() => navigate('/configurations')}
            className="flex items-center"
          >
            <ChevronLeft className="w-5 h-5 mr-2" /> Back
          </Button>
        </div>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                {isUserMode ? 'User' : 'Role'} Privileges Matrix
              </h3>
            </div>
            <div className="text-sm text-gray-500">
              {privilegeGroups.length} modules • {isUserMode ? filteredUsers.length : filteredRoles.length} {isUserMode ? 'users' : 'roles'}
              {isUserMode && filteredUsers.length !== users.length && (
                <span className="text-blue-600"> (filtered from {users.length})</span>
              )}
              {!isUserMode && filteredRoles.length !== roles.length && (
                <span className="text-blue-600"> (filtered from {roles.length})</span>
              )}
              {loading && <span className="ml-2 text-blue-600">Loading...</span>}
              <span className="ml-2 text-xs text-gray-400">
                (Privileges column is frozen, scroll horizontally to view all {isUserMode ? 'users' : 'roles'} →)
              </span>
            </div>
          </div>
        </CardHeader>

        {/* Filter and Search Controls */}
        {(isUserMode || !isUserMode) && (
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center space-x-4">
              {isUserMode ? (
                <>
                  {/* Search by Name - Users */}
                  <div className="flex-1 max-w-md">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        type="text"
                        placeholder="Search users by name..."
                        value={userSearchTerm}
                        onChange={(e) => setUserSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Search by Name - Roles */}
                  <div className="flex-1 max-w-md">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        type="text"
                        placeholder="Search roles by name..."
                        value={roleSearchTerm}
                        onChange={(e) => setRoleSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Filter by Designation - Multi-select with Tags (User Mode Only) */}
              {isUserMode && (
                <div className="min-w-[300px] max-w-[500px] flex-1">
                <div className="relative designation-dropdown">
                  <Filter className="absolute left-3 top-3 text-gray-400 w-4 h-4 z-10" />

                  {/* Selected Tags Display */}
                  <div className="min-h-[42px] pl-10 pr-10 py-2 border border-gray-300 rounded-md bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
                    <div className="flex flex-wrap gap-1 items-center">
                      {selectedDesignations.map(designation => (
                        <Badge
                          key={designation}
                          variant="info"
                          size="sm"
                          className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 border border-blue-200"
                        >
                          <span className="text-xs">{designation}</span>
                          <button
                            onClick={() => removeDesignation(designation)}
                            className="ml-1 hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                            type="button"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}

                      {/* Dropdown Toggle */}
                      <button
                        type="button"
                        onClick={() => setIsDesignationDropdownOpen(!isDesignationDropdownOpen)}
                        className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded"
                      >
                        {selectedDesignations.length === 0 ? 'Select designations...' : 'Add more...'}
                      </button>
                    </div>
                  </div>

                  {/* Dropdown Arrow */}
                  <button
                    type="button"
                    onClick={() => setIsDesignationDropdownOpen(!isDesignationDropdownOpen)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <ChevronDown className={`w-4 h-4 transition-transform ${isDesignationDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown Options */}
                  {isDesignationDropdownOpen && (
                    <>
                      {/* Backdrop for better visibility */}
                      <div
                        className="fixed inset-0 z-[9998]"
                        onClick={() => setIsDesignationDropdownOpen(false)}
                      />
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-gray-300 rounded-lg shadow-2xl z-[9999] max-h-48 overflow-y-auto backdrop-blur-sm ring-1 ring-black ring-opacity-5">
                      <div className="py-1">
                        {availableDesignations.map(designation => (
                          <button
                            key={designation}
                            type="button"
                            onClick={() => {
                              handleDesignationToggle(designation);
                            }}
                            className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 flex items-center justify-between transition-all duration-200 border-b border-gray-100 last:border-b-0 ${
                              selectedDesignations.includes(designation)
                                ? 'bg-blue-50 text-blue-700 border-l-4 border-l-blue-500 font-semibold shadow-sm'
                                : 'text-gray-700 hover:text-gray-900 hover:bg-blue-50 hover:shadow-sm'
                            }`}
                          >
                            <span className="font-medium">{designation}</span>
                            {selectedDesignations.includes(designation) && (
                              <CheckSquare className="w-4 h-4 text-blue-600 flex-shrink-0" />
                            )}
                          </button>
                        ))}
                        {availableDesignations.length === 0 && (
                          <div className="px-4 py-3 text-sm text-gray-500 italic text-center">
                            No designations available
                          </div>
                        )}
                      </div>
                    </div>
                    </>
                  )}
                </div>
              </div>
              )}

              {/* Clear Filters */}
              {isUserMode ? (
                (userSearchTerm || selectedDesignations.length > 0) && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setUserSearchTerm('');
                      setSelectedDesignations([]);
                      setIsDesignationDropdownOpen(false);
                    }}
                    className="px-3 py-2 text-sm"
                  >
                    Clear
                  </Button>
                )
              ) : (
                roleSearchTerm && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setRoleSearchTerm('');
                    }}
                    className="px-3 py-2 text-sm"
                  >
                    Clear
                  </Button>
                )
              )}

              {/* Results Count */}
              <div className="text-sm text-gray-500">
                {isUserMode
                  ? `${filteredUsers.length} of ${users.length} users`
                  : `${filteredRoles.length} of ${roles.length} roles`
                }
              </div>
            </div>
          </div>
        )}

        <CardContent className="p-0">
          <div className="overflow-x-auto" style={{ maxHeight: '70vh' }}>
            <table className="w-full">
              <thead className="sticky top-0 z-30">
                <tr className="bg-gray-50 border-b border-gray-200 whitespace-nowrap">
                  {/* Frozen Privileges Column Header */}
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 z-40 bg-gray-50 border-r border-gray-300" style={{ minWidth: 320 }}>
                    <div className="flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-gray-600" />
                      <span>Module / Privilege</span>
                    </div>
                  </th>
                  {isUserMode ? (
                    // User headers - scrollable
                    filteredUsers.map(user => (
                      <th key={user.id || user.userId} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50" style={{ minWidth: 140 }}>
                        <div className="flex flex-col items-center space-y-1">
                          <User className="w-4 h-4 text-green-600" />
                          <div className="font-medium text-sm">{user.firstName} {user.lastName}</div>
                          {user.designationName && (
                            <div className="text-xs text-gray-400 mt-0.5" style={{ fontSize: '10px' }}>
                              {user.designationName}
                            </div>
                          )}
                        </div>
                      </th>
                    ))
                  ) : (
                    // Role headers - scrollable
                    filteredRoles.map((role, index) => {
                      const displayName = role.name || role.roleName || 'Unknown Role';
                      return (
                        <th key={role.id || index} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50" style={{ minWidth: 120 }}>
                          <div className="flex flex-col items-center space-y-1">
                            <Shield className="w-4 h-4 text-blue-600" />
                            <span className="font-medium">{displayName}</span>
                          </div>
                        </th>
                      );
                    })
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {privilegeGroups.map((group) => {
                  const isCollapsed = collapsedGroups.has(group.module);
                  const currentEntities = isUserMode ? filteredUsers : filteredRoles;

                  return (
                    <React.Fragment key={group.module}>
                      {/* Enhanced Module Header */}
                      <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-l-4 border-l-blue-500">
                        {/* Frozen Module Header Cell */}
                        <td className="px-4 py-3 sticky left-0 z-10 bg-gradient-to-r from-gray-50 to-gray-100 border-r border-gray-300">
                          <div className="flex items-center space-x-3 py-2">
                            <button
                              onClick={() => handleGroupToggle(group.module)}
                              className="p-1.5 hover:bg-white hover:shadow-sm rounded-md transition-all duration-200"
                              title={isCollapsed ? 'Expand module' : 'Collapse module'}
                            >
                              {isCollapsed ? (
                                <ChevronRight className="w-4 h-4 text-gray-600" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-gray-600" />
                              )}
                            </button>
                            <div className="flex items-center space-x-2">
                              <Shield className="w-4 h-4 text-blue-600" />
                              <span className="font-semibold text-gray-800 text-base">{group.module}</span>
                            </div>
                            <Badge variant="default" size="sm">
                              {group.privileges.length} privileges
                            </Badge>
                          </div>
                        </td>
                        {/* Scrollable Module Header Cells */}
                        {currentEntities.map(entity => {
                          const entityId = isUserMode
                            ? (entity as SimpleUser).id?.toString() || (entity as SimpleUser).userId.toString()
                            : (entity as { id: string; name: string }).id;
                          const isSelected = isGroupSelected(entityId, group.module);
                          const isPartiallySelected = isGroupPartiallySelected(entityId, group.module);

                          return (
                            <td key={entityId} className="px-4 py-3 text-center bg-gradient-to-r from-gray-50 to-gray-100">
                              <button
                                onClick={() => handleSelectAllGroup(entityId, group.module)}
                                className="p-2 hover:bg-white hover:shadow-sm rounded-md transition-all duration-200"
                                title={isSelected ? 'Deselect all' : 'Select all'}
                              >
                                {isSelected ? (
                                  <CheckSquare className="w-5 h-5 text-green-600" />
                                ) : isPartiallySelected ? (
                                  <div className="w-5 h-5 border-2 border-blue-500 bg-blue-50 rounded flex items-center justify-center">
                                    <div className="w-2.5 h-0.5 bg-blue-500 rounded"></div>
                                  </div>
                                ) : (
                                  <Square className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                                )}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                      {/* Enhanced Individual Privileges */}
                      {!isCollapsed && group.privileges.map((privilege) => (
                        <tr key={privilege.id} className="hover:bg-blue-50/30 transition-colors duration-150">
                          {/* Frozen Privilege Cell */}
                          <td className="px-4 py-3 sticky left-0 z-10 bg-white border-r border-gray-300">
                            <div className="pl-12 py-3">
                              <div className="flex items-start space-x-3">
                                <div className="flex-shrink-0 mt-1">
                                  <Lock className="w-3 h-3 text-gray-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <h4 className="font-medium text-gray-900 text-sm">{privilege.name}</h4>
                                  </div>
                                  <p className="text-xs text-gray-600 mb-2 leading-relaxed">{privilege.description}</p>
                                  <div className="flex flex-wrap gap-1">
                                    {privilege.permissions.map((permission, index) => (
                                      <Badge
                                        key={index}
                                        variant="info"
                                        size="sm"
                                        className="text-xs font-medium"
                                      >
                                        {permission.charAt(0).toUpperCase() + permission.slice(1)}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                          {/* Scrollable Privilege Cells */}
                          {currentEntities.map(entity => {
                            const entityId = isUserMode
                              ? (entity as SimpleUser).id?.toString() || (entity as SimpleUser).userId.toString()
                              : (entity as { id: string; name: string }).id;

                            let hasPrivilege = false;
                            if (isUserMode) {
                              const userPriv = userPrivileges && userPrivileges.find(up => up.userId === entityId);
                              hasPrivilege = userPriv?.privileges.includes(privilege.id) || false;
                            } else {
                              const rolePriv = rolePrivileges && rolePrivileges.find(rp => rp.roleId === entityId);
                              hasPrivilege = rolePriv?.privileges.includes(privilege.id) || false;
                            }

                            return (
                              <td key={entityId} className="px-4 py-3 text-center bg-white">
                                <div className="flex justify-center">
                                  <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={hasPrivilege}
                                      onChange={() => handlePrivilegeToggle(entityId, privilege.id)}
                                      className="sr-only peer"
                                    />
                                    <div className="w-5 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded border border-gray-300 peer-checked:bg-blue-600 peer-checked:border-blue-600 transition-all duration-200 flex items-center justify-center">
                                      {hasPrivilege && (
                                        <CheckSquare className="w-3 h-3 text-white" />
                                      )}
                                    </div>
                                  </label>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Instructions Card */}
      <Card className="mt-6 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardContent className="p-6">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Key className="w-4 h-4 text-blue-600" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 mb-3 flex items-center space-x-2">
                <span>How to Use {isUserMode ? 'User' : 'Role'} Privileges Configuration</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-start space-x-2">
                    <ChevronDown className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-blue-800">Click chevron icons to expand/collapse module groups</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <CheckSquare className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-blue-800">Use module checkboxes to select/deselect all privileges</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <Square className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-blue-800">Individual checkboxes control specific privilege access</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-start space-x-2">
                    <div className="w-4 h-4 border-2 border-blue-500 bg-blue-50 rounded mt-0.5 flex-shrink-0 flex items-center justify-center">
                      <div className="w-2 h-0.5 bg-blue-500 rounded"></div>
                    </div>
                    <span className="text-sm text-blue-800">Blue dash indicators show partially selected modules</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    {isUserMode ? <User className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" /> : <Shield className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />}
                    <span className="text-sm text-blue-800">Toggle between Role and User modes using the switch above</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <Save className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-blue-800">Remember to save changes when configuration is complete</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Privileges; 