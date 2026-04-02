import React, { useState, useMemo, useEffect, useRef } from 'react';

import { ArrowRight, ArrowLeft, Search, User, Users, Filter, ChevronLeft, ChevronRight, X, ChevronDown, Calendar, Briefcase, Percent } from 'lucide-react';

import { Modal } from '../components/ui/Modal';

import { Button } from '../components/ui/Button';

import { Input } from '../components/ui/Input';

import { Badge } from '../components/ui/Badge';

import { DonutChart } from '../components/ui/DonutChart';

import { useApp } from '../context/AppContext';

import { EmployeeDetailsCard } from '../components/ui/EmployeeDetailsCard';

import { useNavigate } from 'react-router-dom';

import { Card, CardContent } from '../components/ui/Card';

import { getBenchList, getViewAllocation, getEmployeeDetails, getEmployeeProjectHistory, getBenchAvailability } from '../api/bench/bench';

import type { BenchSearchParams } from '../api/bench/filterbench';

import { Employee } from '../types/index';

import { postProjectAllocations, getProjectAllocationsById, updateProjectAllocation, deleteProjectAllocation, filterProjectAllocations, getMaxAvailablePercentage } from '../api/bench/projectAllocation';

import { getAllProjects } from '../api/projectget';

import { Project } from '../types';

import { ProjectSelector } from '../components/ui/ProjectSelector';

import { getAllRoles } from '../api/role/viewrole';

import { Toast } from '../components/ui/Toast';

import { SearchableMultiSelect } from '../components/ui/SearchableMultiSelect';

import { SearchableSelect } from '../components/ui/SearchableSelect';

import { getDesignations, DesignationGetResponse } from '../api/designation/designation';



const AVAILABILITY_COLORS = {

    100: '#10B981',

    75: '#F59E0B',

    50: '#6EE7B7',

};

const TAG_COLORS = {

    highly: '#D1FAE5',

    partial: '#FEF3C7',

    none: '#E5E7EB',

};



function getAvailabilityColor(availability: number) {

    if (availability >= 100) return AVAILABILITY_COLORS[100];

    if (availability >= 75) return AVAILABILITY_COLORS[75];

    return AVAILABILITY_COLORS[50];

}

function getAvailabilityTag(availability: number) {

    if (availability >= 100) return { label: 'Highly Available', color: TAG_COLORS.highly };

    if (availability >= 75) return { label: 'Partially Available', color: TAG_COLORS.partial };

    return { label: 'Busy', color: TAG_COLORS.none };

}



// AllocationPopover component for dropdown

function AllocationPopover({ employee, anchorRef, onClose, isLoading }: { employee: any, anchorRef: React.RefObject<HTMLButtonElement>, onClose: () => void, isLoading?: boolean }) {

  React.useEffect(() => {

    function handleClick(event: MouseEvent) {

      if (anchorRef.current && !anchorRef.current.contains(event.target as Node)) {

        onClose();

      }

    }

    document.addEventListener('mousedown', handleClick);

    return () => document.removeEventListener('mousedown', handleClick);

  }, [anchorRef, onClose]);



  // Defensive: always treat availablePeriods as array

  const availablePeriods = Array.isArray(employee?.availablePeriods) ? employee.availablePeriods : [];

  if (!employee) return null;



  // Position the dropdown below the anchor button

  let style: React.CSSProperties = { display: 'none' };

  if (anchorRef.current) {

    const rect = anchorRef.current.getBoundingClientRect();

    style = {

      position: 'absolute',

      left: rect.left + window.scrollX,

      top: rect.bottom + window.scrollY + 4,

      zIndex: 1000,

      minWidth: 320,

      background: 'white',

      borderRadius: '0.5rem',

      boxShadow: '0 4px 24px 0 rgba(0,0,0,0.12)',

      border: '1px solid #e5e7eb',

    };

  } else {

    style = {

      position: 'absolute',

      left: 0,

      top: 40,

      zIndex: 1000,

      minWidth: 320,

      background: 'white',

      borderRadius: '0.5rem',

      boxShadow: '0 4px 24px 0 rgba(0,0,0,0.12)',

      border: '1px solid #e5e7eb',

    };

  }



  return (

    <div style={style}>

      <div className="p-4">

        <div className="flex items-center justify-between mb-2">

          <div className="font-semibold text-lg">{employee.firstName} {employee.lastName}</div>

          <button

            onClick={onClose}

            className="text-gray-400 hover:text-red-500 text-xl font-bold p-1 rounded-full hover:bg-gray-100 transition-colors"

            title="Close popup"

          >

            ×

          </button>

        </div>

        {isLoading ? (

          <div className="flex items-center justify-center py-4">

            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>

            <span className="ml-2 text-gray-500">Loading allocations...</span>

          </div>

        ) : (

          <table className="w-full text-sm">

            <thead>

              <tr className="border-b">

                <th className="text-left py-2 px-3 font-semibold">Project</th>

                <th className="text-left py-2 px-3 font-semibold">Period</th>

                <th className="text-left py-2 px-3 font-semibold">Allocated %</th>

              </tr>

            </thead>

            <tbody>

              {availablePeriods.length === 0 ? (

                <tr>

                  <td colSpan={3} className="text-center text-gray-400 py-2">No allocations found</td>

                </tr>

              ) : (

                availablePeriods.map((period: any, idx: number) => (

                  <tr key={`${period.project || ''}-${period.period || ''}-${idx}`} className="hover:bg-gray-50">

                    <td className="py-1 px-3">{period.project}</td>

                    <td className="py-1 px-3">{period.period}</td>

                    <td className="py-1 px-3">{period.percentage}%</td>

                  </tr>

                ))

              )}

            </tbody>

          </table>

        )}

      </div>

    </div>

  );

}



export default function BenchAllocate() {

    const { selectedProjectId: contextProjectId, setSelectedProjectId: setContextProjectId, updateEmployee } = useApp();

    const navigate = useNavigate();

    

    // State for projects from API

    const [projects, setProjects] = useState<Project[]>([]);

    const [projectsLoading, setProjectsLoading] = useState(false);

    const [projectsError, setProjectsError] = useState<string | null>(null);

    

    // Always call useState - don't use conditional logic

    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(contextProjectId || null);

    

    const [employees, setEmployees] = useState<Employee[]>([]);

    const [benchFilter, setBenchFilter] = useState('');

    const [designationFilter, setDesignationFilter] = useState<string[]>([]);


    const [availabilityFilter, setAvailabilityFilter] = useState<number[]>([]);

    const [fromDateFilter, setFromDateFilter] = useState('');

    const [toDateFilter, setToDateFilter] = useState('');

    const [isSearching, setIsSearching] = useState(false);

    const [isProjectFiltering, setIsProjectFiltering] = useState(false);

    const [selectedBench, setSelectedBench] = useState<string[]>([]);

    const [selectedProjectUsers, setSelectedProjectUsers] = useState<string[]>([]);

    const [allocationModal, setAllocationModal] = useState<{ open: boolean, employees: any[] }>({ open: false, employees: [] });

    const [deallocationFilter, setDeallocationFilter] = useState('');

    const [deallocationRoleFilter, setDeallocationRoleFilter] = useState<string[]>([]);
    const [deallocationAvailabilityFilter, setDeallocationAvailabilityFilter] = useState<string>('');

    // Allocations are local to this page for now

    const [projectAllocations, setProjectAllocations] = useState<{ [projectId: string]: any[] }>({});

    const [hoveredEmployee, setHoveredEmployee] = useState<any | null>(null);

    const [popupPosition, setPopupPosition] = useState<{ x: number; y: number } | null>(null);

    const [viewInfoEmployee, setViewInfoEmployee] = useState<any | null>(null);

    const [isLoadingEmployeeDetails, setIsLoadingEmployeeDetails] = useState<{ [employeeId: string]: boolean }>({});

    const [isAllocating, setIsAllocating] = useState(false);

    const scrollRef = React.useRef<HTMLDivElement>(null);

    const scrollBy = (offset: number) => {

        if (scrollRef.current) {

            scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });

        }

    };



    const [roles, setRoles] = useState<{ id: number; roleName: string }[]>([]);

    const [rolesLoading, setRolesLoading] = useState(false);
    const [deallocationConfirmModal, setDeallocationConfirmModal] = useState(false);

    const [isDeallocating, setIsDeallocating] = useState(false);

    const [allocationConfirmModal, setAllocationConfirmModal] = useState(false);

    const [allocationSuccessModal, setAllocationSuccessModal] = useState(false);

    const [alertModal, setAlertModal] = useState<{ open: boolean; message: string }>({ open: false, message: '' });

    const [dateValidationErrors, setDateValidationErrors] = useState<{ [employeeId: string]: { startDate?: string; endDate?: string } }>({});



    // Designation state

    const [designations, setDesignations] = useState<{ id: number; name: string }[]>([]);

    const [designationsLoading, setDesignationsLoading] = useState(false);



    // Toast state

    const [toast, setToast] = useState<{

        isOpen: boolean;

        message: string;

        type: "success" | "error";

    }>({

        isOpen: false,

        message: "",

        type: "success",

    });



    // State for tracking max availability for each employee

    const [maxAvailabilityMap, setMaxAvailabilityMap] = useState<{ [employeeId: string]: number }>({});

    const [isLoadingMaxAvailability, setIsLoadingMaxAvailability] = useState<{ [employeeId: string]: boolean }>({});



    // Toast helper function

    const showToast = (message: string, type: "success" | "error" = "success") => {

        setToast({ isOpen: true, message, type });

    };



    // Pagination state for bench employees (left panel)

    const [benchCurrentPage, setBenchCurrentPage] = useState(1);

    const benchPageSize = 5;



    // Pagination state for allocated employees (right panel)

    const [allocatedCurrentPage, setAllocatedCurrentPage] = useState(1);

    const allocatedPageSize = 5;



    // API pagination state for bench/availability

    const [apiPagination, setApiPagination] = useState({

        totalElements: 0,

        totalPages: 0,

        page: 0,

        size: 5,

        hasNext: false

    });



    // Add state for expanded user

    const [expandedBenchUserId, setExpandedBenchUserId] = useState<string | null>(null);

    // Add state for allocation dropdown

    const [openAllocationUserId, setOpenAllocationUserId] = useState<string | null>(null);



    // Update selectedProjectId when contextProjectId changes

    useEffect(() => {

        if (contextProjectId && contextProjectId !== selectedProjectId) {

            setSelectedProjectId(contextProjectId);

        }

    }, [contextProjectId, selectedProjectId]);



    // Fetch projects from API

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



    // Mock data for bench employees (new API structure)

    const mockBenchEmployees = [

      {

        id: '1',

        firstName: 'Alice',

        lastName: 'Smith',

        gender: 'Female',

        email: '',

        phone: '',

        designation: 'QA Engineer',

        experience: 0,

        joinedDate: '',

        skills: [],

        currentProjects: [],

        availability: 100,

        status: 'active',

        startDate: '',

        endDate: '',

        createdAt: '',

        updatedAt: '',

        availablePeriods: [

          { period: '2024-06-01 to 2024-12-01', percentage: 100, project: 'Bench' },

          { period: '2024-12-02 to 2025-06-01', percentage: 50, project: 'E-Commerce' }

        ]

      },

      {

        id: '2',

        firstName: 'Bob',

        lastName: 'Johnson',

        gender: 'Male',

        email: '',

        phone: '',

        designation: 'QA Analyst',

        experience: 1,

        joinedDate: '2023-01-01',

        skills: ['Testing', 'Manual Testing'],

        currentProjects: ['Project A', 'Project B'],

        availability: 80,

        status: 'inactive',

        startDate: '2024-06-01',

        endDate: '2024-09-01',

        createdAt: '2023-01-01T10:00:00Z',

        updatedAt: '2023-01-01T10:00:00Z',

        availablePeriods: [

          { period: '2024-06-01 to 2024-09-01', percentage: 80, project: 'Bench' },

          { period: '2024-09-02 to 2025-01-01', percentage: 20, project: 'Online Shop' }

        ]

      },

      {

        id: '3',

        firstName: 'Carol',

        lastName: 'Lee',

        gender: 'Female',

        email: '',

        phone: '',

        designation: 'QA Tester',

        experience: 2,

        joinedDate: '2022-05-15',

        skills: ['Automation Testing', 'API Testing'],

        currentProjects: ['Project X'],

        availability: 60,

        status: 'active',

        startDate: '2024-06-01',

        endDate: '2024-08-01',

        createdAt: '2022-05-15T10:00:00Z',

        updatedAt: '2022-05-15T10:00:00Z',

        availablePeriods: [

          { period: '2024-06-01 to 2024-08-01', percentage: 60, project: 'Bench' },

          { period: '2024-08-02 to 2024-12-01', percentage: 40, project: 'Mobile App' }

        ]

      },

      {

        id: '4',

        firstName: 'David',

        lastName: 'Kim',

        gender: 'Male',

        email: '',

        phone: '',

        designation: 'Senior QA Engineer',

        experience: 5,

        joinedDate: '2021-02-10',

        skills: ['Performance Testing', 'Security Testing'],

        currentProjects: ['Project Y', 'Project Z'],

        availability: 90,

        status: 'active',

        startDate: '2024-07-01',

        endDate: '2024-10-01',

        createdAt: '2021-02-10T10:00:00Z',

        updatedAt: '2021-02-10T10:00:00Z',

        availablePeriods: [

          { period: '2024-07-01 to 2024-10-01', percentage: 90, project: 'Bench' },

          { period: '2024-10-02 to 2025-01-01', percentage: 60, project: 'Banking App' }

        ]

      },

      {

        id: '5',

        firstName: 'Emily',

        lastName: 'Davis',

        gender: 'Female',

        email: '',

        phone: '',

        designation: 'QA Lead',

        experience: 7,

        joinedDate: '2020-07-20',

        skills: ['Leadership', 'Project Management'],

        currentProjects: ['Project A', 'Project B'],

        availability: 100,

        status: 'active',

        startDate: '2024-06-15',

        endDate: '2024-12-15',

        createdAt: '2020-07-20T10:00:00Z',

        updatedAt: '2020-07-20T10:00:00Z',

        availablePeriods: [

          { period: '2024-06-15 to 2024-12-15', percentage: 100, project: 'Bench' },

          { period: '2024-12-16 to 2025-06-15', percentage: 80, project: 'CRM Solution' }

        ]

      },

      {

        id: '6',

        firstName: 'Frank',

        lastName: 'Moore',

        gender: 'Male',

        email: '',

        phone: '',

        designation: 'QA Engineer',

        experience: 3,

        joinedDate: '2023-09-01',

        skills: ['Testing', 'Manual Testing'],

        currentProjects: ['Project X'],

        availability: 70,

        status: 'active',

        startDate: '2024-08-01',

        endDate: '2024-11-01',

        createdAt: '2023-09-01T10:00:00Z',

        updatedAt: '2023-09-01T10:00:00Z',

        availablePeriods: [

          { period: '2024-08-01 to 2024-11-01', percentage: 70, project: 'Bench' },

          { period: '2024-11-02 to 2025-02-01', percentage: 30, project: 'Inventory System' }

        ]

      },

      {

        id: '7',

        firstName: 'Grace',

        lastName: 'Chen',

        gender: 'Female',

        email: '',

        phone: '',

        designation: 'QA Analyst',

        experience: 4,

        joinedDate: '2022-10-10',

        skills: ['Testing', 'Manual Testing'],

        currentProjects: ['Project Y'],

        availability: 50,

        status: 'inactive',

        startDate: '2024-09-01',

        endDate: '2024-12-01',

        createdAt: '2022-10-10T10:00:00Z',

        updatedAt: '2022-10-10T10:00:00Z',

        availablePeriods: [

          { period: '2024-09-01 to 2024-12-01', percentage: 50, project: 'Bench' },

          { period: '2024-12-02 to 2025-03-01', percentage: 50, project: 'Analytics Platform' }

        ]

      },

      {

        id: '8',

        firstName: 'Henry',

        lastName: 'Patel',

        gender: 'Male',

        email: '',

        phone: '',

        designation: 'QA Tester',

        experience: 2,

        joinedDate: '2023-03-20',

        skills: ['Testing', 'Manual Testing'],

        currentProjects: ['Project Z'],

        availability: 100,

        status: 'active',

        startDate: '2024-06-01',

        endDate: '2024-12-01',

        createdAt: '2023-03-20T10:00:00Z',

        updatedAt: '2023-03-20T10:00:00Z',

        availablePeriods: [

          { period: '2024-06-01 to 2024-12-01', percentage: 100, project: 'Bench' }

        ]

      },

      {

        id: '9',

        firstName: 'Ivy',

        lastName: 'Zhang',

        gender: 'Female',

        email: '',

        phone: '',

        designation: 'QA Engineer',

        experience: 6,

        joinedDate: '2021-08-01',

        skills: ['Performance Testing', 'Security Testing'],

        currentProjects: ['Project A', 'Project B'],

        availability: 85,

        status: 'active',

        startDate: '2024-07-01',

        endDate: '2024-10-01',

        createdAt: '2021-08-01T10:00:00Z',

        updatedAt: '2021-08-01T10:00:00Z',

        availablePeriods: [

          { period: '2024-07-01 to 2024-10-01', percentage: 85, project: 'Bench' },

          { period: '2024-10-02 to 2025-01-01', percentage: 60, project: 'Order Processing' }

        ]

      },

      {

        id: '10',

        firstName: 'Jack',

        lastName: 'Wilson',

        gender: 'Male',

        email: '',

        phone: '',

        designation: 'QA Analyst',

        experience: 1,

        joinedDate: '2023-11-15',

        skills: ['Testing', 'Manual Testing'],

        currentProjects: ['Project X'],

        availability: 95,

        status: 'active',

        startDate: '2024-06-01',

        endDate: '2024-09-01',

        createdAt: '2023-11-15T10:00:00Z',

        updatedAt: '2023-11-15T10:00:00Z',

        availablePeriods: [

          { period: '2024-06-01 to 2024-09-01', percentage: 95, project: 'Bench' },

          { period: '2024-09-02 to 2025-01-01', percentage: 75, project: 'Payment Gateway' }

        ]

      }

    ];



    // Update fetchBenchEmployees to use the new bench/availability API

    const fetchBenchEmployees = async (searchParams: BenchSearchParams = {}, page: number = 0, size: number = 5) => {

        setIsSearching(true);

        try {

            // Prepare filters for the API

            const filters: any = {};



            // Add designation filter

            if (designationFilter.length > 0) {

                filters.designation = designationFilter[0]; // Use first selected designation

            }



            // Add availability filter

            if (availabilityFilter.length > 0) {

                filters.minAvailable = availabilityFilter[0];

            }



            // Add date filters

            if (fromDateFilter) {

                filters.startDate = fromDateFilter;

            }

            if (toDateFilter) {

                filters.endDate = toDateFilter;

            }



            console.log('Applying filters to API:', filters);



            // Always fetch a large page for client-side pagination

            const requestPage = 0;

            const requestSize = 1000;

            const availabilityResponse = await getBenchAvailability(requestPage, requestSize, filters);

            console.log('Bench availability API response:', availabilityResponse);



            if (availabilityResponse && availabilityResponse.data && availabilityResponse.data.items) {

                console.log('Processing availability items:', availabilityResponse.data.items);

                // Map the availability API response to Employee format

                const mappedEmployees = availabilityResponse.data.items.map((item: any) => ({

                    id: String(item.userId), // Use userId from API response

                    firstName: item.fullName ? item.fullName.split(' ')[0] : '',

                    lastName: item.fullName ? item.fullName.split(' ').slice(1).join(' ') : '',

                    email: '',

                    phone: BigInt(0),

                    designation: item.designation || '',

                    experience: 0,

                    joinedDate: '',

                    skills: [],

                    currentProjects: [],

                    availability: item.availabilityPercentage || 0,

                    status: 'active' as 'active' | 'inactive' | 'on-leave',

                    startDate: '',

                    endDate: '',

                    createdAt: '',

                    updatedAt: '',

                    gender: 'Other' as 'Male' | 'Female' | 'Other'

                }));



                console.log('Mapped employees from availability API:', mappedEmployees);



                // Force client-side pagination mode

                setApiPagination({

                    totalElements: 0,

                    totalPages: 0,

                    page: 0,

                    size: 5,

                    hasNext: false

                });



                setEmployees(mappedEmployees);

                return;

            }



            // Fallback to original getBenchList API

            const response = await getBenchList();

            if (Array.isArray(response) && response.length > 0) {

                setEmployees(response);

            } else {

                // Fix gender type for mockBenchEmployees

                setEmployees(mockBenchEmployees.map(e => ({

                    ...e,

                    phone: BigInt(e.phone || '0'),

                    gender: (e.gender === 'Male' ? 'Male' : e.gender === 'Female' ? 'Female' : 'Other') as 'Male' | 'Female' | 'Other',

                    status: (e.status === 'active' ? 'active' : e.status === 'inactive' ? 'inactive' : 'on-leave') as 'active' | 'inactive' | 'on-leave',

                })) as Employee[]);

            }

        } catch (error) {

            console.error('Failed to fetch bench employees:', error);

            // Use mock data as final fallback

            setEmployees(mockBenchEmployees.map(e => ({

                ...e,

                phone: BigInt(e.phone || '0'),

                gender: (e.gender === 'Male' ? 'Male' : e.gender === 'Female' ? 'Female' : 'Other') as 'Male' | 'Female' | 'Other',

                status: (e.status === 'active' ? 'active' : e.status === 'inactive' ? 'inactive' : 'on-leave') as 'active' | 'inactive' | 'on-leave',

            })) as Employee[]);

        } finally {

            setIsSearching(false);

        }

    };



    // Function to handle pagination changes

    const handleBenchPageChange = (newPage: number) => {

        setBenchCurrentPage(newPage);

        // Avoid server refetch when using client-side pagination (e.g., name search)

        if (apiPagination.totalPages > 0 && benchFilter.trim().length === 0) {

            fetchBenchEmployees({}, newPage - 1, benchPageSize); // API uses 0-based indexing

        }

    };



    // Initial fetch

    useEffect(() => {

        fetchBenchEmployees();

    }, []);



    // Fetch project allocations when selectedProjectId changes

    useEffect(() => {

        if (selectedProjectId) {

            getProjectAllocationsById(selectedProjectId)

                .then((data) => {

                    setProjectAllocations(prev => ({

                        ...prev,

                        [selectedProjectId]: Array.isArray(data.data) ? data.data : [],

                    }));

                })

                .catch((error) => {

                    console.error('Failed to fetch project allocations:', error);

                    setProjectAllocations(prev => ({

                        ...prev,

                        [selectedProjectId]: [],

                    }));

                });

        }

    }, [selectedProjectId]);



    // Fetch roles on mount

    useEffect(() => {

      setRolesLoading(true);
      getAllRoles()

        .then((response) => {

          // Try to support both array and object response

          const rolesArray = Array.isArray(response.data) ? response.data : response.data?.data || [];

          setRoles(rolesArray);

          console.log('Roles loaded:', rolesArray.length);
        })
        .catch((error) => {
          console.error('Failed to fetch roles:', error);
          setRoles([]);
        })
        .finally(() => setRolesLoading(false));
    }, []);



    // Fetch designations on mount

    useEffect(() => {

      setDesignationsLoading(true);

      getDesignations()

        .then((response: DesignationGetResponse) => {

          const designationsArray = response.data || [];

          setDesignations(designationsArray);

          console.log('Designations loaded:', designationsArray.length);

        })

        .catch((error) => {

          console.error('Failed to fetch designations:', error);

          setDesignations([]);

        })

        .finally(() => setDesignationsLoading(false));

    }, []);



    // Name search handled purely on the client; keep a tiny no-op debouncer to avoid extra API calls
    const debouncedNameSearch = useMemo(() => {
      let timeoutId: number;
      return (_searchTerm: string) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          // no-op: client-side filtering is applied in `filteredBench`
              setIsSearching(false);
        }, 0);
      };
    }, []);







    // Debounced availability search function

    const debouncedAvailabilitySearch = useMemo(() => {

      let timeoutId: number;

      return (availability: string) => {

        clearTimeout(timeoutId);

        timeoutId = setTimeout(async () => {

          if (availability.trim() && availability !== 'All Availability' && availability !== '') {

            setIsSearching(true);

            console.log('Searching availability:', availability.trim());

            try {

              const availabilityNumber = parseInt(availability.trim());

              if (!isNaN(availabilityNumber)) {

                // client-side filtering handled elsewhere; no API call
                // keep state consistent
                setIsSearching(false);

              } else {

                console.error('Invalid availability number:', availability);

              }

            } catch (error: any) {

              console.error('Availability API search failed:', error);

              console.error('Error details:', error.response?.status, error.response?.data);

              // Fallback to client-side filtering

            } finally {

              setIsSearching(false);

            }

          } else {

            // If "All Availability" is selected or empty, load all employees

            fetchBenchEmployees();

          }

        }, 100); // Reduced delay for faster response

      };

    }, []);



    // Debounced date search function

    const debouncedDateSearch = useMemo(() => {

      let timeoutId: number;

      return (fromDate: string, toDate: string) => {

        clearTimeout(timeoutId);

        timeoutId = setTimeout(async () => {

          if (fromDate.trim() || toDate.trim()) {

            setIsSearching(true);

            console.log('Searching dates - fromDate:', fromDate, 'toDate:', toDate);

            try {

              const searchParams: any = {};

              if (fromDate.trim()) {

                searchParams.startDate = fromDate.trim();

              }

              if (toDate.trim()) {

                searchParams.endDate = toDate.trim();

              }

              

              // Client-side filtering handled in fetchBenchEmployees using server-side filters otherwise
              // No API call here for name search scenario

            } catch (error: any) {

              console.error('Date API search failed:', error);

              console.error('Error details:', error.response?.status, error.response?.data);

              // Fallback to client-side filtering

            } finally {

              setIsSearching(false);

            }

          } else {

            // If no dates are selected, load all employees

            fetchBenchEmployees();

          }

        }, 30); // Ultra-fast response

      };

    }, []);



    // Debounced project filter search functions

    const debouncedProjectNameSearch = useMemo(() => {

      let timeoutId: number;

      return (searchTerm: string) => {

        clearTimeout(timeoutId);

        timeoutId = setTimeout(async () => {

          if (searchTerm.trim()) {

            setIsProjectFiltering(true);

            console.log('Searching allocated employees by name:', searchTerm.trim());

            // For allocated employees, we need to filter the existing allocations

            // This is client-side filtering since we already have the allocations data

            setDeallocationFilter(searchTerm.trim());

          } else {

            setDeallocationFilter('');

          }

          setIsProjectFiltering(false);

        }, 30); // Ultra-fast response

      };

    }, []);



    const debouncedProjectRoleSearch = useMemo(() => {

      let timeoutId: number;

      return (roles: string[]) => {
        clearTimeout(timeoutId);

        timeoutId = setTimeout(async () => {

          if (roles.length > 0) {
            setIsProjectFiltering(true);

            console.log('Filtering allocated employees by roles:', roles);
            setDeallocationRoleFilter(roles);
          } else {

            setDeallocationRoleFilter([]);
          }

          setIsProjectFiltering(false);

        }, 100); // Reduced delay for faster response

      };

    }, []);



    const debouncedProjectAvailabilitySearch = useMemo(() => {

      let timeoutId: number;

      return (availability: string) => {

        clearTimeout(timeoutId);

        timeoutId = setTimeout(async () => {

          if (availability.trim() && availability !== 'All Availability' && availability !== '') {

            setIsProjectFiltering(true);

            console.log('Filtering allocated employees by availability:', availability.trim());

            setDeallocationAvailabilityFilter(availability.trim());

          } else {

            setDeallocationAvailabilityFilter('');

          }

          setIsProjectFiltering(false);

        }, 100); // Reduced delay for faster response

      };

    }, []);











    const handleAvailabilityChange = (value: string) => {

        const availability = value ? parseInt(value) : 0;

        setAvailabilityFilter(value ? [availability] : []);

        console.log('Availability changed to:', value);



        // Reset pagination and refetch with new filter

        setBenchCurrentPage(1);

        setApiPagination({

            totalElements: 0,

            totalPages: 0,

            page: 0,

            size: 5,

            hasNext: false

        });



        // Fetch employees with new availability filter

        fetchBenchEmployees({}, 0, benchPageSize);

    };



    // Handle bench filter changes

    const handleBenchFilterChange = (value: string) => {

        setBenchFilter(value);

        console.log('Bench filter changed to:', value);

        // Client-side only; no API calls
        debouncedNameSearch(value);

    };



    // Handle date filter changes

    const handleFromDateChange = (value: string) => {

        setFromDateFilter(value);

        console.log('From date changed to:', value);



        // Reset pagination and refetch with new filter

        setBenchCurrentPage(1);

        setApiPagination({

            totalElements: 0,

            totalPages: 0,

            page: 0,

            size: 5,

            hasNext: false

        });



        // Fetch employees with new date filter

        fetchBenchEmployees({}, 0, benchPageSize);

    };



    const handleToDateChange = (value: string) => {

        setToDateFilter(value);

        console.log('To date changed to:', value);



        // Reset pagination and refetch with new filter

        setBenchCurrentPage(1);

        setApiPagination({

            totalElements: 0,

            totalPages: 0,

            page: 0,

            size: 5,

            hasNext: false

        });



        // Fetch employees with new date filter

        fetchBenchEmployees({}, 0, benchPageSize);

    };



    // Project selection handler

    const handleProjectSelect = (id: string) => {

        setSelectedProjectId(id);

        setContextProjectId?.(id); // If provided by context

    };



    // Bench selection handler (left)

    const handleBenchSelect = (id: string) => {

        setSelectedBench(sel => {

            const newSel = sel.includes(id) ? sel.filter(i => i !== id) : [...sel, id];

            if (newSel.length > 0) setSelectedProjectUsers([]); // Clear right selection

            return newSel;

        });

    };

    // Project Allocations selection handler (right)

    const handleProjectUserSelect = (id: string) => {

        setSelectedProjectUsers(sel => {

            const newSel = sel.includes(id) ? sel.filter(i => i !== id) : [...sel, id];

            if (newSel.length > 0) setSelectedBench([]); // Clear left selection

            return newSel;

        });

    };



    // Only show active projects

    const availableProjects = useMemo(() => projects.filter(p => p.status === 'active'), [projects]);

    const currentProject = useMemo(

  () => {

    const project = projects.find(p => String(p.id) === String(selectedProjectId));

    if (project) {

      console.log('Current project object:', project);

    }

    return project;

  },

  [selectedProjectId, projects]

);



    // Employees not allocated to the current project (or partially allocated)

    const benchEmployees = useMemo(() => {

        // If we have active filters (designation, availability, dates), show all filtered employees from API

        const hasActiveFilters = designationFilter.length > 0 || availabilityFilter.length > 0 || fromDateFilter || toDateFilter;



        if (hasActiveFilters) {

            // When using API filters, show all returned employees without additional filtering

            return employees;

        }



        // Get all allocations for this project

        const allocations = selectedProjectId ? (projectAllocations[selectedProjectId] || []) : [];

        // For each employee, calculate remaining availability after allocations

        return employees.map(e => {

            const allocated = allocations

                .filter((emp: any) => emp.userId === e.id)

                .reduce((sum: number, emp: any) => sum + (emp.allocationAvailability || emp.availability), 0);

            const remaining = e.availability - allocated;

            return remaining > 0 ? { ...e, availability: remaining } : null;

        }).filter((e): e is Employee & { availability: number } => e !== null);

    }, [employees, projectAllocations, selectedProjectId, designationFilter, availabilityFilter, fromDateFilter, toDateFilter]);



    // Filter bench employees by benchFilter (case-insensitive substring match for first or last name)

    const filteredBench = useMemo(() => {

        let filtered = benchEmployees;

        

        // Apply name filter if provided

        if (benchFilter.trim()) {

            const filter = benchFilter.trim().toLowerCase();

            filtered = filtered.filter(e =>

                (e.firstName && e.firstName.toLowerCase().includes(filter)) ||

                (e.lastName && e.lastName.toLowerCase().includes(filter)) || (e.firstName && e.lastName && (e.firstName + ' ' + e.lastName).toLowerCase().includes(filter))

            );

        }

        

        // Note: Designation, role, and availability filters are now handled server-side



        // Note: Date range filters are now handled server-side

        

        // Sort by full name with relevance: exact match > startsWith > substring; each bucket A-Z

        if (!benchFilter.trim()) {

            return filtered.sort((a, b) => {

                const fullNameA = `${a.firstName} ${a.lastName}`.toLowerCase();

                const fullNameB = `${b.firstName} ${b.lastName}`.toLowerCase();

                return fullNameA.localeCompare(fullNameB);

            });

        }



        const q = benchFilter.trim().toLowerCase();

        const rank = (e: any) => {
            const first = (e.firstName || '').toLowerCase();
            const last = (e.lastName || '').toLowerCase();
            const full = `${first} ${last}`.trim();
            if (first === q) return 0;                // exact first name
            if (first.startsWith(q)) return 1;        // prefix first name
            if (last === q) return 2;                 // exact last name
            if (last.startsWith(q)) return 3;         // prefix last name
            if (first.includes(q)) return 4;          // substring first name
            if (last.includes(q)) return 5;           // substring last name
            if (full.includes(q)) return 6;           // substring anywhere in full name
            return 7;                                  // no match safety
        };

        return filtered

            .slice()

            .sort((a, b) => {

                const sa = rank(a);

                const sb = rank(b);

                if (sa !== sb) return sa - sb;

                const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();

                const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();

                return nameA.localeCompare(nameB);

            });

    }, [benchEmployees, benchFilter]);
    

    const allocatedEmployees = useMemo(() => selectedProjectId ? (projectAllocations[selectedProjectId] || []) : [], [projectAllocations, selectedProjectId]);

    

    const filteredAllocatedEmployees = useMemo(() => {

        const filtered = allocatedEmployees.filter(emp => {

            const matchesSearch = emp.userFullName?.toLowerCase().includes(deallocationFilter.toLowerCase()) || 

                                 emp.roleName?.toLowerCase().includes(deallocationFilter.toLowerCase());

            const matchesRole = deallocationRoleFilter.length === 0 || deallocationRoleFilter.includes(emp.roleName);
            let matchesAvailability = true;

            if (deallocationAvailabilityFilter === '100') {

                matchesAvailability = emp.allocationPercentage === 100;

            } else if (deallocationAvailabilityFilter === '75') {

                matchesAvailability = emp.allocationPercentage >= 75;

            } else if (deallocationAvailabilityFilter === '50') {

                matchesAvailability = emp.allocationPercentage >= 50;

            }

            return matchesSearch && matchesRole && matchesAvailability;

        });

        

        // Sort by employee name alphabetically (A to Z)

        return filtered.sort((a, b) => {

            const nameA = a.userFullName?.toLowerCase() || '';

            const nameB = b.userFullName?.toLowerCase() || '';

            return nameA.localeCompare(nameB);

        });

    }, [allocatedEmployees, deallocationFilter, deallocationRoleFilter, deallocationAvailabilityFilter]);



    // Pagination calculations for bench employees
    // Use API pagination if available, otherwise fall back to client-side pagination
    const isNameSearching = benchFilter.trim().length > 0;
    const useClientPagination = isNameSearching || apiPagination.totalPages === 0;

    const benchTotalPages = useClientPagination ? Math.ceil(filteredBench.length / benchPageSize) : apiPagination.totalPages;

    const paginatedBenchEmployees = useClientPagination
        ? filteredBench.slice((benchCurrentPage - 1) * benchPageSize, benchCurrentPage * benchPageSize)
        : filteredBench;

    

    // Pagination calculations for allocated employees
    const allocatedTotalPages = Math.ceil(filteredAllocatedEmployees.length / allocatedPageSize);

    const paginatedAllocatedEmployees = filteredAllocatedEmployees.slice((allocatedCurrentPage - 1) * allocatedPageSize, allocatedCurrentPage * allocatedPageSize);



    // Reset pagination when filters change
    useEffect(() => {

        setBenchCurrentPage(1);
        // Reset API pagination as well
        setApiPagination({

            totalElements: 0,
            totalPages: 0,
            page: 0,
            size: 5,
            hasNext: false
        });
        // Refetch data with new filters (server-side filters only)
        fetchBenchEmployees({}, 0, benchPageSize);

    }, [designationFilter, availabilityFilter, fromDateFilter, toDateFilter]);

    // When searching by name, just reset to page 1 and keep client-side pagination
    useEffect(() => {
        setBenchCurrentPage(1);
    }, [benchFilter]);

    useEffect(() => {

        setAllocatedCurrentPage(1);

    }, [deallocationFilter, deallocationRoleFilter, deallocationAvailabilityFilter]);



    // Handlers

    const handleAllocate = () => {

        const toAllocate = employees.filter(e => selectedBench.includes(e.id));

        if (toAllocate.length === 0) {

            showToast('Please select employees to allocate', 'error');

            return;

        }

        setAllocationModal({ open: true, employees: toAllocate });

    };



    const handleConfirmAllocation = async (updatedEmployees: any[]) => {

        if (!selectedProjectId) {

            showToast('Please select a project first', 'error');

            return;

        }

        

        // Check for date validation errors

        const hasDateErrors = updatedEmployees.some(emp => {

            const errors = dateValidationErrors[emp.id];

            return errors && (errors.startDate || errors.endDate);

        });

        

        if (hasDateErrors) {

            showToast('Please fix date validation errors before proceeding', 'error');

            return;

        }

        

        // Client-side validation for role selection

        const missingRole = updatedEmployees.some(emp => !emp.roleId || emp.roleId === '');

        if (missingRole) {

            showToast('Role information is required', 'error');

            return;

        }

        // Client-side validation for start date and end date

        const missingStartDate = updatedEmployees.some(emp => !emp.allocationStartDate || emp.allocationStartDate === '');

        if (missingStartDate) {

            showToast('Start date is required', 'error');

            return;

        }

        const missingEndDate = updatedEmployees.some(emp => !emp.allocationEndDate || emp.allocationEndDate === '');

        if (missingEndDate) {

            showToast('End date is required', 'error');

            return;

        }

        const invalidDateOrder = updatedEmployees.some(emp => 

            emp.allocationStartDate && emp.allocationEndDate &&

            new Date(emp.allocationStartDate) >= new Date(emp.allocationEndDate)

        );

        if (invalidDateOrder) {

            showToast('Start date must be before end date.', 'error');

            return;

        }



        const today = new Date();

        today.setHours(0, 0, 0, 0);

        const endDateInPast = updatedEmployees.some(emp => {

            if (!emp.allocationEndDate) return false;

            const endDate = new Date(emp.allocationEndDate);

            endDate.setHours(0, 0, 0, 0);

            return endDate < today;

        });

        if (endDateInPast) {

            showToast("End date cannot be earlier than today's date.", 'error');

            return;

        }

        // Client-side validation for allocation availability

        const missingAvailability = updatedEmployees.some(emp => emp.allocationAvailability === undefined || emp.allocationAvailability === null || emp.allocationAvailability === '');

        if (missingAvailability) {

            // Try fallback to emp.availability if allocationAvailability is missing

            const allHaveAvailability = updatedEmployees.every(emp => {

                const value = emp.allocationAvailability ?? emp.availability;

                return value !== undefined && value !== null && value !== '';

            });

            if (!allHaveAvailability) {

                showToast('Allocation percentage is required', 'error');

                return;

            }

        }

        const invalidAvailability = updatedEmployees.some(emp => 

            isNaN(Number(emp.allocationAvailability ?? emp.availability)) ||

            Number(emp.allocationAvailability ?? emp.availability) < 1 ||

            Number(emp.allocationAvailability ?? emp.availability) > 100

        );

        if (invalidAvailability) {

            showToast('Allocation percentage must be between 1 and 100', 'error');

            return;

        }

        const exceedsMaxAvailability = updatedEmployees.some(emp => {

            const maxAvailable = maxAvailabilityMap[emp.id] || emp.availability;

            // No blocking check; optionally, you could show a warning here instead of blocking

            return false;

        });

        // Removed blocking check for exceeding max availability

        setIsAllocating(true);

        try {

            const allocationErrors = [];

            for (const emp of updatedEmployees) {

                const payload = {

                    userId: Number(emp.id),

                    projectId: Number(selectedProjectId),

                    roleId: Number(emp.roleId),

                    allocationPercentage: Number(emp.allocationAvailability ?? emp.availability),

                    startDate: emp.allocationStartDate,

                    endDate: emp.allocationEndDate

                };

                try {

                    if (emp.allocationId || emp.idOnAllocationTable || emp.idOnAllocatedTable || emp.allocation_id || emp.idOnEdit) {

                        // If editing, use the allocation's id

                        const allocationId = emp.allocationId || emp.idOnAllocationTable || emp.idOnAllocatedTable || emp.allocation_id || emp.idOnEdit || emp.id;

                        await updateProjectAllocation(allocationId, payload);

                    } else {

                        await postProjectAllocations(payload);

                    }

                } catch (error: any) {

                    let errorMsg = error instanceof Error ? error.message : 'Unknown error';

                    // Only override for very specific cases that need user-friendly wording

                    if (errorMsg && errorMsg.toLowerCase().includes('start date must be before end date')) {

                        errorMsg = 'Start date must be before end date.';

                    }

                    // For all other errors, preserve the backend message

                    allocationErrors.push(`${emp.firstName || emp.userFullName}: ${errorMsg}`);

                }

            }

            if (allocationErrors.length > 0) {

                const errorMessage = `Failed to allocate/update employees:\n${allocationErrors.join('\n')}`;

                console.error('All allocation attempts failed:', errorMessage);



                // Show the actual backend error message instead of generic ones

                // Only use specific handling for very common cases that need user-friendly wording

                let userMessage = errorMessage;

                if (errorMessage.toLowerCase().includes('start date must be before end date')) {

                    userMessage = 'Start date must be before end date.';

                } else {

                    // For all other errors, show the actual backend message

                    userMessage = errorMessage;

                }

                showToast(userMessage, 'error');

            } else {

                // Success - show success modal

                setAllocationSuccessModal(true);

                // Refresh allocations and bench list

                const allocationsData = await getProjectAllocationsById(selectedProjectId);

                setProjectAllocations(prev => ({

                    ...prev,

                    [selectedProjectId]: Array.isArray(allocationsData.data) ? allocationsData.data : [],

                }));



                // Reset pagination and refetch bench employees with proper API integration

                setBenchCurrentPage(1);

                setApiPagination({

                    totalElements: 0,

                    totalPages: 0,

                    page: 0,

                    size: 5,

                    hasNext: false

                });



                // Use fetchBenchEmployees to maintain proper pagination

                await fetchBenchEmployees({}, 0, benchPageSize);

                setSelectedBench([]);

                setAllocationModal({ open: false, employees: [] });

                setMaxAvailabilityMap({});

                setIsLoadingMaxAvailability({});

                setIsLoadingViewAllocation({});

                setIsLoadingEmployeeDetails({});

            }

        } catch (error) {

            console.error('Allocation failed:', error);

            showToast('Failed to allocate employees. Please try again.', 'error');

        } finally {

            setIsAllocating(false);

        }

    };



    const handleDeallocate = async () => {

        if (!selectedProjectId || selectedProjectUsers.length === 0) return;

        setDeallocationConfirmModal(true);

    };



    // Actual deallocation logic, separated from the button handler

    const confirmDeallocate = async () => {

        if (!selectedProjectId || selectedProjectUsers.length === 0) return;

        setIsDeallocating(true);

        try {

            // Always use force deallocation to ensure users are removed from modules/submodules

            console.log('Using force deallocation to ensure complete removal from modules/submodules');

            await Promise.all(selectedProjectUsers.map(async (allocationId) => {

                await deleteProjectAllocation(allocationId, true); // Always force deallocate

            }));

            

            // Refresh allocations and bench list

            const allocationsData = await getProjectAllocationsById(selectedProjectId);

            setProjectAllocations(prev => ({

                ...prev,

                [selectedProjectId]: Array.isArray(allocationsData.data) ? allocationsData.data : [],

            }));



            // Reset pagination and refetch bench employees with proper API integration

            setBenchCurrentPage(1);

            setApiPagination({

                totalElements: 0,

                totalPages: 0,

                page: 0,

                size: 5,

                hasNext: false

            });



            // Use fetchBenchEmployees to maintain proper pagination

            await fetchBenchEmployees({}, 0, benchPageSize);

            setSelectedProjectUsers([]);

            showToast('Force deallocation successful! Users removed from project and modules/submodules.', 'success');

        } catch (error: any) {

            console.error('Force deallocation failed:', error);

            

            // If force deallocation fails, try normal deallocation as fallback

            try {

                console.log('Force deallocation failed, trying normal deallocation as fallback');

                await Promise.all(selectedProjectUsers.map(async (allocationId) => {

                    await deleteProjectAllocation(allocationId);

                }));

                

                // Refresh allocations and bench list

                const allocationsData = await getProjectAllocationsById(selectedProjectId);

                setProjectAllocations(prev => ({

                    ...prev,

                    [selectedProjectId]: Array.isArray(allocationsData.data) ? allocationsData.data : [],

                }));



                // Reset pagination and refetch bench employees with proper API integration

                setBenchCurrentPage(1);

                setApiPagination({

                    totalElements: 0,

                    totalPages: 0,

                    page: 0,

                    size: 5,

                    hasNext: false

                });



                // Use fetchBenchEmployees to maintain proper pagination

                await fetchBenchEmployees({}, 0, benchPageSize);

                setSelectedProjectUsers([]);

                showToast('Deallocation successful! (Note: Users may still be allocated to modules/submodules)', 'success');

            } catch (retryError: any) {

                console.error('Both force and normal deallocation failed:', retryError);

                const errorMessage = retryError?.message || retryError?.response?.data?.message || 'Unknown error';

                showToast(`Failed to deallocate users: ${errorMessage}`, 'error');

            }

        } finally {

            setDeallocationConfirmModal(false);

            setIsDeallocating(false);

        }

    };







    // UI

    // (Remove this effect entirely, as the correct values are now set in the Edit handler)



    // Add click outside handler for dropdown

    useEffect(() => {

      function handleClickOutside(event: MouseEvent) {

        if (!(event.target as HTMLElement).closest('.z-50')) {

          setOpenAllocationUserId(null);

        }

      }

      if (openAllocationUserId) {

        document.addEventListener('mousedown', handleClickOutside);

        return () => document.removeEventListener('mousedown', handleClickOutside);

      }

    }, [openAllocationUserId]);



    // Clear max availability when allocation modal opens with new employees

    useEffect(() => {

        if (allocationModal.open && allocationModal.employees.length > 0) {

            setMaxAvailabilityMap({});

            setIsLoadingMaxAvailability({});

            setIsLoadingViewAllocation({});

            setIsLoadingEmployeeDetails({});

        }

    }, [allocationModal.open, allocationModal.employees.length]);



    const [popoverEmployee, setPopoverEmployee] = useState<any | null>(null);

    const [viewAllocationData, setViewAllocationData] = useState<any | null>(null);

    const [isLoadingViewAllocation, setIsLoadingViewAllocation] = useState<{ [employeeId: string]: boolean }>({});

    const popoverAnchor = useRef<HTMLButtonElement>(null);



    const handleViewAllocation = async (employee: any) => {

        const employeeId = employee.id;

        setIsLoadingViewAllocation(prev => ({ ...prev, [employeeId]: true }));

        try {

            console.log('Fetching allocation data for employee:', employee.id);

            const response = await getViewAllocation(employee.id);

            console.log('View allocation response:', response);

            setViewAllocationData(response.data || []);

            setPopoverEmployee(employee);

        } catch (error) {

            console.error('Failed to fetch view allocation data:', error);

            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

            showToast(`Failed to fetch allocation data: ${errorMessage}`, 'error');

        } finally {

            setIsLoadingViewAllocation(prev => ({ ...prev, [employeeId]: false }));

        }

    };



    const handleViewInfo = async (employee: any) => {

        const employeeId = employee.id;

        setIsLoadingEmployeeDetails(prev => ({ ...prev, [employeeId]: true }));

        try {

            console.log('Fetching employee details for:', employee.id);

            const response = await getEmployeeDetails(employee.id);

            console.log('Employee details response:', response);

            setViewInfoEmployee(response);

        } catch (error) {

            console.error('Failed to fetch employee details:', error);

            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

            showToast(`Failed to fetch employee details: ${errorMessage}`, 'error');

        } finally {

            setIsLoadingEmployeeDetails(prev => ({ ...prev, [employeeId]: false }));

        }

    };



    // Handle project filter changes

    const handleProjectNameFilterChange = (value: string) => {

        console.log('Project name filter changed to:', value);

        setDeallocationFilter(value);

        

        // If search is empty, load all allocations

        if (!value.trim()) {

            if (selectedProjectId) {

                getProjectAllocationsById(selectedProjectId)

                    .then((data) => {

                        setProjectAllocations(prev => ({

                            ...prev,

                            [selectedProjectId]: Array.isArray(data.data) ? data.data : [],

                        }));

                    })

                    .catch((error) => {

                        console.error('Failed to fetch project allocations:', error);

                    });

            }

            return;

        }

        

        // API call for name filtering

        if (selectedProjectId) {

            setIsProjectFiltering(true);

            filterProjectAllocations(selectedProjectId, { name: value.trim() })

                .then((data) => {

                    console.log('Project name API search successful:', data.data?.length || 0, 'results');

                    setProjectAllocations(prev => ({

                        ...prev,

                        [selectedProjectId]: Array.isArray(data.data) ? data.data : [],

                    }));

                })

                .catch(error => {

                    console.error('Project name API search failed:', error);

                    // Fallback to client-side filtering

                })

                .finally(() => {

                    setIsProjectFiltering(false);

                });

        }

    };



    const handleProjectRoleFilterChange = (values: string[]) => {
        console.log('Project role filter changed to:', values);
        setDeallocationRoleFilter(values);
        
        // If no roles are selected, load all allocations
        if (values.length === 0) {
            if (selectedProjectId) {

                getProjectAllocationsById(selectedProjectId)

                    .then((data) => {

                        setProjectAllocations(prev => ({

                            ...prev,

                            [selectedProjectId]: Array.isArray(data.data) ? data.data : [],

                        }));

                    })

                    .catch((error) => {

                        console.error('Failed to fetch project allocations:', error);

                    });

            }

            return;

        }

        

        // API call for role filtering - use the first role for API call, but filter by all selected roles
        if (selectedProjectId) {

            setIsProjectFiltering(true);

            filterProjectAllocations(selectedProjectId, { role: values[0].trim() })
                .then((data) => {

                    console.log('Project role API search successful:', data.data?.length || 0, 'results');

                    setProjectAllocations(prev => ({

                        ...prev,

                        [selectedProjectId]: Array.isArray(data.data) ? data.data : [],

                    }));

                })

                .catch(error => {

                    console.error('Project role API search failed:', error);

                    // Fallback to client-side filtering

                })

                .finally(() => {

                    setIsProjectFiltering(false);

                });

        }

    };



    const handleProjectAvailabilityFilterChange = (value: string) => {

        console.log('Project availability filter changed to:', value);

        setDeallocationAvailabilityFilter(value);

        

        // If "All Availability" is selected, load all allocations

        if (!value || value === '' || value === 'All Availability') {

            if (selectedProjectId) {

                getProjectAllocationsById(selectedProjectId)

                    .then((data) => {

                        setProjectAllocations(prev => ({

                            ...prev,

                            [selectedProjectId]: Array.isArray(data.data) ? data.data : [],

                        }));

                    })

                    .catch((error) => {

                        console.error('Failed to fetch project allocations:', error);

                    });

            }

            return;

        }

        

        // API call for availability filtering

        if (selectedProjectId) {

            setIsProjectFiltering(true);

            filterProjectAllocations(selectedProjectId, { availability: value.trim() })

                .then((data) => {

                    console.log('Project availability API search successful:', data.data?.length || 0, 'results');

                    setProjectAllocations(prev => ({

                        ...prev,

                        [selectedProjectId]: Array.isArray(data.data) ? data.data : [],

                    }));

                })

                .catch(error => {

                    console.error('Project availability API search failed:', error);

                    // Fallback to client-side filtering

                })

                .finally(() => {

                    setIsProjectFiltering(false);

                });

        }

    };



    // Function to validate allocation dates against project date range

    const validateAllocationDates = (employeeId: string, startDate: string, endDate: string) => {

        const errors: { startDate?: string; endDate?: string } = {};

        

        if (!currentProject) return errors;

        

        const projectStartDate = currentProject.startDate ? new Date(currentProject.startDate) : null;

        const projectEndDate = currentProject.endDate ? new Date(currentProject.endDate) : null;

        

        if (startDate) {

            const allocationStartDate = new Date(startDate);

            

            if (projectStartDate && allocationStartDate < projectStartDate) {

                errors.startDate = `Start date must be within project date range (${projectStartDate.toLocaleDateString()} to ${projectEndDate?.toLocaleDateString() || 'No end date'})`;

            }

        }

        

        if (endDate) {

            const allocationEndDate = new Date(endDate);

            

            if (projectEndDate && allocationEndDate > projectEndDate) {

                errors.endDate = `End date must be within project date range (${projectStartDate?.toLocaleDateString() || 'No start date'} to ${projectEndDate.toLocaleDateString()})`;

            }

        }

        

        if (startDate && endDate) {

            const allocationStartDate = new Date(startDate);

            const allocationEndDate = new Date(endDate);

            

            if (allocationStartDate >= allocationEndDate) {

                errors.endDate = 'End date must be after start date';

            }

        }

        

        setDateValidationErrors(prev => ({

            ...prev,

            [employeeId]: errors

        }));

        

        return Object.keys(errors).length === 0;

    };



    // Function to fetch max available percentage for an employee

    const fetchMaxAvailability = async (employeeId: string, startDate: string, endDate: string) => {

        if (!startDate || !endDate) {

            setMaxAvailabilityMap(prev => ({ ...prev, [employeeId]: 0 }));

            return;

        }



        // Validate date format (should be YYYY-MM-DD)

        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

        if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {

            console.warn('Invalid date format for max availability calculation');

            return;

        }



        setIsLoadingMaxAvailability(prev => ({ ...prev, [employeeId]: true }));

        try {

            const response = await getMaxAvailablePercentage(employeeId, startDate, endDate);

            console.log('Max availability API response:', response);

            // Extract the maximum value from the backend response
            // Handle different possible response structures
            let maxPercentage = 0;

            if (response.data && typeof response.data === 'number') {
                // If response.data is directly the number (like "data: 90")
                maxPercentage = response.data;
            } else if (response.data?.maxAvailablePercentage) {
                // If it's nested in maxAvailablePercentage
                maxPercentage = response.data.maxAvailablePercentage;
            } else if (response.maxAvailablePercentage) {
                // If it's directly in response
                maxPercentage = response.maxAvailablePercentage;
            } else if (response.data?.data) {
                // If it's nested deeper
                maxPercentage = response.data.data;
            }

            console.log('Extracted max percentage:', maxPercentage);

            setMaxAvailabilityMap(prev => ({ ...prev, [employeeId]: maxPercentage }));

        } catch (error) {

            console.error('Failed to fetch max availability:', error);

            // Fallback to current availability if API fails

            const employee = employees.find(emp => emp.id === employeeId);

            const fallbackAvailability = employee?.availability || 0;

            setMaxAvailabilityMap(prev => ({ ...prev, [employeeId]: fallbackAvailability }));



            // Show a subtle error message in console (not blocking the user)

            console.warn(`Using fallback availability (${fallbackAvailability}%) for employee ${employeeId} due to API error`);

        } finally {

            setIsLoadingMaxAvailability(prev => ({ ...prev, [employeeId]: false }));

        }

    };



    return (

        <div className="min-h-screen bg-[#F9FAFB] text-[#111827] p-6 flex flex-col">

            {/* Heading */}

            <div className="flex justify-between items-center mb-4">

                <div className="flex-1">

                    <h1 className="text-3xl font-bold text-gray-900">Bench Allocation</h1>

                    {currentProject ? (

                        <div className="flex items-center gap-4 mt-2">

                            <div className="flex items-center gap-2 bg-blue-50 px-3 py-1 rounded-lg">

                                <Briefcase className="w-4 h-4 text-blue-600" />

                                <span className="text-sm font-medium text-blue-800">Selected Project:</span>

                                <span className="text-sm font-semibold text-blue-900">

                             {(currentProject as any)?.projectName || currentProject?.name || 'Unknown Project'}

                         </span>

                            </div>

                            <div className="flex items-center gap-2 bg-green-50 px-3 py-1 rounded-lg">

                                <Calendar className="w-4 h-4 text-green-600" />

                                <span className="text-sm font-medium text-green-800">Period:</span>

                                <span className="text-sm font-semibold text-green-900">

                                    {currentProject.startDate ? new Date(currentProject.startDate).toLocaleDateString() : 'Not set'} - {currentProject.endDate ? new Date(currentProject.endDate).toLocaleDateString() : 'Not set'}

                                </span>

                            </div>

                            {/* Status badge removed as per UI request */}

                        </div>

                    ) : (

                        <div className="flex items-center gap-2 mt-2 bg-yellow-50 px-3 py-1 rounded-lg">

                            <Briefcase className="w-4 h-4 text-yellow-600" />

                            <span className="text-sm font-medium text-yellow-800">Please select a project to start allocation</span>

                        </div>

                    )}

                </div>

                <Button

                    variant="secondary"

                    onClick={() => navigate('/bench')}

                    className="flex items-center"

                >

                    <ChevronLeft className="w-4 h-4 mr-2" /> Back

                </Button>

            </div>

            

            {/* Project Selection Panel */}

            <ProjectSelector

                projects={projects}

                selectedProjectId={selectedProjectId}

                onSelect={handleProjectSelect}

                className="mb-4"

            />





            {/* Main Panels */}

            <div className="flex flex-1 gap-6 relative">

                {/* Left: Bench */}

                <div className="bg-white rounded-lg p-4 flex flex-col shadow-[0_4px_24px_0_rgba(0,0,0,0.08)] w-[calc(50%-24px)] mr-6 min-w-0 overflow-hidden">

                    <div className="flex items-center justify-between mb-2 bg-[#e3f0fa] rounded-xl px-6 py-3 shadow-[0_2px_8px_0_rgba(0,0,0,0.04)]">

                        <div className="font-semibold text-lg flex items-center gap-2"><Users className="w-5 h-5" /> Employee Bench</div>

                        <div className="flex gap-2">

                            <Button

                                variant="primary"

                                className="bg-[#2563EB] rounded-xl shadow-[4px_4px_12px_#e0e0e0,-4px_-4px_12px_#ffffff] px-6 py-2 font-semibold text-white transition hover:bg-[#1d4ed8] hover:shadow-[2px_2px_6px_#e0e0e0,-2px_-2px_6px_#ffffff]"

                                onClick={() => setSelectedBench(employees.map(e => e.id))}

                            >Select All</Button>

                            <Button

                                variant="primary"

                                className="bg-[#2563EB] rounded-xl shadow-[4px_4px_12px_#e0e0e0,-4px_-4px_12px_#ffffff] px-6 py-2 font-semibold text-white transition hover:bg-[#1d4ed8] hover:shadow-[2px_2px_6px_#e0e0e0,-2px_-2px_6px_#ffffff]"

                                onClick={() => setSelectedBench([])}

                            >Clear</Button>

                        </div>

                    </div>

                    {/* Bench Filter Status */}

                    <div className="mb-2 px-4 py-1 bg-gray-50 rounded">

                        <div className="text-sm text-gray-600">

                            {isSearching && (

                                <span className="text-blue-600">Searching employees...</span>

                            )}

                            {!isSearching && (benchFilter || designationFilter.length > 0 || availabilityFilter.length > 0 || fromDateFilter || toDateFilter) && (
                                <span className="text-green-600">

                                    {designationFilter.length > 0 && (

                                        <span className="ml-1">({designationFilter.length} designation{designationFilter.length > 1 ? 's' : ''} selected)</span>

                                    )}


                                </span>

                            )}

                            {!isSearching && !benchFilter && designationFilter.length === 0 && availabilityFilter.length === 0 && !fromDateFilter && !toDateFilter && (
                                <span className="text-gray-600">Showing all employees</span>

                            )}

                            {filteredBench.length > 0 && (

                                <span className="ml-2">({filteredBench.length} results)</span>

                            )}

                        </div>

                    </div>

                    {/* Search and Filter for Bench */}

                    <div className="mb-4 space-y-3">

                        {/* New global search input for benchFilter */}

                        <div className="relative">

                            <Input

                                placeholder="Search by name..."

                                value={benchFilter}

                                onChange={e => handleBenchFilterChange(e.target.value)}

                                className="w-full mb-2"

                            />

                            {isSearching && (

                                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">

                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>

                                </div>

                            )}

                        </div>

                        <div className="flex flex-wrap gap-4">
                            {/* Designations Dropdown */}
                            <div className="w-40 relative">
                                <SearchableSelect
                                    options={designations.map(d => ({ value: d.name, label: d.name }))}
                                    value={designationFilter[0] || ""}
                                    onChange={(value) => {
                                        const next = value ? [value] : [];
                                        setDesignationFilter(next);
                                        setBenchCurrentPage(1);
                                        setApiPagination({
                                          totalElements: 0,
                                          totalPages: 0,
                                          page: 0,
                                          size: 5,
                                          hasNext: false
                                        });
                                        fetchBenchEmployees({}, 0, benchPageSize);
                                    }}

                                    placeholder={designationsLoading ? "Loading designations..." : designations.length === 0 ? "No designations available" : "Designations"}
                                    className="w-40"
                                    disabled={designationsLoading || designations.length === 0}
                                />
                                {designationsLoading && (
                                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                    </div>
                                )}
                                {!designationsLoading && designations.length === 0 && (
                                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                        <button
                                            onClick={() => {
                                                setDesignationsLoading(true);
                                                getDesignations()
                                                    .then((response: DesignationGetResponse) => {
                                                        const designationsArray = response.data || [];
                                                        setDesignations(designationsArray);
                                                        console.log('Designations loaded:', designationsArray.length);
                                                    })
                                                    .catch((error) => {
                                                        console.error('Failed to fetch designations:', error);
                                                        setDesignations([]);
                                                    })
                                                    .finally(() => setDesignationsLoading(false));
                                            }}
                                            className="text-red-500 hover:text-red-700 text-xs p-1 rounded hover:bg-red-50"
                                            title="Retry loading designations"
                                        >
                                            🔄
                                        </button>
                                    </div>
                                )}
                            </div>
                            {/* Date Pickers */}
                            <Input
                                type="date"
                                value={fromDateFilter}
                                onChange={(e) => handleFromDateChange(e.target.value)}
                                placeholder="From Date"
                                className="w-40"
                                title="Select start date for availability period"
                            />
                            <Input
                                type="date"
                                value={toDateFilter}
                                onChange={(e) => handleToDateChange(e.target.value)}
                                placeholder="To Date"
                                className="w-40"
                                title="Select end date for availability period"
                            />
                            {/* All Availability Dropdown */}
                            <select
                                value={availabilityFilter[0] ? String(availabilityFilter[0]) : ''}
                                onChange={e => handleAvailabilityChange(e.target.value)}
                                className="w-40 border border-gray-300 rounded px-2 py-1 text-sm"
                            >
                                <option value="">All Availability</option>
                                <option value={100}>100% Available</option>
                                <option value={75}>75% and above</option>
                                <option value={50}>50% and above</option>
                                <option value={20}>20% and above</option>
                            </select>
                        </div>

                        {/* ...existing code... */}

                        <Button

                            variant="secondary"

                            onClick={() => {

                                setBenchFilter('');

                                setDesignationFilter([]);


                                setAvailabilityFilter([]);

                                setFromDateFilter('');

                                setToDateFilter('');



                                // Reset pagination and refetch all data

                                setBenchCurrentPage(1);

                                setApiPagination({

                                    totalElements: 0,

                                    totalPages: 0,

                                    page: 0,

                                    size: 5,

                                    hasNext: false

                                });



                                // Fetch all employees without filters

                                fetchBenchEmployees({}, 0, benchPageSize);

                            }}

                            className="px-2 py-1 text-sm min-w-[80px]"

                        >

                            Clear Filters

                        </Button>

                    </div>

                    <div className="flex-1 overflow-y-auto">

                        {isSearching ? (

                            <div className="text-center py-8">

                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>

                                <p className="text-gray-500">Searching employees...</p>

                            </div>

                        ) : paginatedBenchEmployees.length > 0 ? (

                            (paginatedBenchEmployees as any[]).map((emp: any) => {

                                const userId = emp.id || String(Math.random());

                                return (

                                    <div key={userId} className={`flex flex-col gap-1 p-2 rounded cursor-pointer border transition-all duration-150 ${selectedBench.includes(userId) ? 'border-2 border-blue-500 bg-[#f6fff8]' : 'border border-transparent'} hover:bg-[#f6fff8] ${selectedProjectUsers.length > 0 ? 'opacity-50 cursor-not-allowed' : ''}`}

                                    onClick={() => {

                                            if (selectedProjectUsers.length === 0) handleBenchSelect(userId);

                                    }}

                                    draggable

                                        onDragStart={e => { e.dataTransfer.setData('employeeId', userId); }}

                                        style={{ position: 'relative' }}

                                >

                                        <div className="flex items-center gap-4 min-w-0">

                                    <DonutChart
                                        percentage={emp.availability}
                                        size={40}
                                        strokeWidth={4}
                                        color={
                                            emp.availability >= 80 ? '#16a34a' :
                                            emp.availability >= 60 ? '#eab308' :
                                            '#dc2626'
                                        }
                                    />

                                    <div className="flex-1 min-w-0">
                                                <div className="font-medium truncate pr-24">{emp.firstName} {emp.lastName}</div>
                                        <div className="text-gray-500 text-sm leading-tight truncate pr-24">{emp.designation}</div>
                                    </div>

                                            <Button

                                                size="sm"

                                                variant="secondary"

                                                className="ml-2 shrink-0"

                                                onClick={e => {

                                                    e.stopPropagation();

                                                    if (popoverEmployee && (popoverEmployee.id) === userId) {

                                                        setPopoverEmployee(null);

                                                        setViewAllocationData(null);

                                                    } else {

                                                        handleViewAllocation(emp);

                                                    }

                                                }}

                                                title="View allocation"

                                                disabled={isLoadingViewAllocation[userId] || false}

                                            >

                                                {isLoadingViewAllocation[userId] ? 'Loading...' : 'View allocation'}

                                            </Button>

                                    <Button

                                        size="sm"

                                        variant="secondary"

                                        className="ml-2 shrink-0"

                                        onClick={e => { 

                                            e.stopPropagation(); 

                                            setPopoverEmployee(null); 

                                            handleViewInfo(emp); 

                                        }}

                                        title="View Info"

                                        disabled={isLoadingEmployeeDetails[userId] || false}

                                    >

                                        {isLoadingEmployeeDetails[userId] ? 'Loading...' : 'View Info'}

                                    </Button>

                                </div>

                                        {popoverEmployee && (popoverEmployee.id) === userId && (

                                            <AllocationPopover

                                                employee={{ ...popoverEmployee, availablePeriods: viewAllocationData?.availablePeriods || [] }}

                                                anchorRef={popoverAnchor}

                                                onClose={() => {

                                                    setPopoverEmployee(null);

                                                    setViewAllocationData(null);

                                                }}

                                                isLoading={isLoadingViewAllocation[userId] || false}

                                            />

                                        )}

                                    </div>

                                );

                            })

                        ) : (

                            <div className="text-center py-8">

                                <p className="text-gray-500">

                                    {(benchFilter.trim() || designationFilter.length > 0 || availabilityFilter.length > 0)

                                        ? 'No user found'

                                        : 'No employees found'}

                                </p>

                            </div>

                        )}

                    </div>

                    

                    {/* Pagination Controls for Bench */}

                    {benchTotalPages > 1 && (

                        <div className="flex justify-center items-center gap-2 py-4">

                            <button

                                className="px-3 py-1 rounded border bg-gray-100 text-gray-700 disabled:opacity-50"

                                onClick={() => handleBenchPageChange(Math.max(1, benchCurrentPage - 1))}

                                disabled={benchCurrentPage === 1}

                            >

                                Prev

                            </button>

                            {(() => {
                                const windowSize = 5;
                                let start = 1;
                                let end = Math.min(benchTotalPages, windowSize);
                                if (benchCurrentPage > windowSize) {
                                    end = benchCurrentPage;
                                    start = Math.max(1, end - windowSize + 1);
                                }
                                const buttons: JSX.Element[] = [];
                                for (let p = start; p <= end; p++) {
                                    buttons.push(
                                        <button
                                            key={p}
                                            className={`px-3 py-1 rounded border ${benchCurrentPage === p ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'}`}
                                            onClick={() => handleBenchPageChange(p)}
                                        >
                                            {p}
                                        </button>
                                    );
                                }
                                return buttons;
                            })()}

                            <button
                                className="px-3 py-1 rounded border bg-gray-100 text-gray-700 disabled:opacity-50"
                                onClick={() => handleBenchPageChange(Math.min(benchTotalPages, benchCurrentPage + 1))}
                                disabled={benchCurrentPage === benchTotalPages}
                            >
                                Next
                            </button>

                        </div>

                    )}

                </div>

                {/* Arrows */}

                <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 flex flex-col items-center justify-center gap-4 z-10">

                    <Button

                        className="bg-[#2563EB] text-white rounded-full p-3 shadow-lg"

                        disabled={selectedBench.length === 0 || selectedProjectUsers.length > 0}

                        onClick={handleAllocate}

                    >

                        <ArrowRight className="w-6 h-6" />

                    </Button>

                    <Button

                        className="bg-[#2563EB] text-white rounded-full p-3 shadow-lg"

                        disabled={selectedProjectUsers.length === 0 || selectedBench.length > 0}

                        onClick={handleDeallocate}

                    >

                        <ArrowLeft className="w-6 h-6" />

                    </Button>

                </div>

                {/* Right: Project Allocations */}

                <div className="bg-white rounded-lg p-4 flex flex-col shadow-[0_4px_24px_0_rgba(0,0,0,0.08)] w-[calc(50%-24px)] ml-6 min-w-0 overflow-hidden">

                    <div className="flex items-center justify-between mb-2 bg-[#e3f0fa] rounded-xl px-6 py-3 shadow-[0_2px_8px_0_rgba(0,0,0,0.04)] min-w-0">

                        <User className="w-5 h-5 mr-2" />

                                 <span className="font-semibold text-lg text-blue-900 truncate min-w-0">

             {currentProject ? `Project: ${(currentProject as any)?.projectName || currentProject.name}` : 'Project Allocations'}

         </span>

                        <div className="flex gap-2 shrink-0">
                             <Button
                                 variant="primary"
                                 className="mr-2"
                                 onClick={() => setSelectedProjectUsers(filteredAllocatedEmployees.map(e => e.id))}
                                 disabled={!currentProject}
                             >Select All</Button>
                             <Button
                                 variant="primary"
                                 onClick={() => setSelectedProjectUsers([])}
                                 disabled={!currentProject}
                             >Clear</Button>
                         </div>
                     </div>

                    {/* Project Period Information */}

                    {currentProject ? (

                        <div className="bg-blue-25 border-b border-blue-100 px-4 py-3">

                                <div className="flex items-center gap-4">

                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-blue-600" />

                                    <span className="text-sm font-medium text-blue-800">Project Period:</span>

                                </div>

                                <div className="flex items-center gap-3 text-sm text-blue-700 mt-1">

                                    <div className="flex items-center gap-1">

                                        <span className="font-medium">Start:</span>

                                        <span>{currentProject.startDate ? new Date(currentProject.startDate).toLocaleDateString() : 'Not set'}</span>

                                    </div>

                                    <div className="flex items-center gap-1">

                                        <span className="font-medium">End:</span>

                                        <span>{currentProject.endDate ? new Date(currentProject.endDate).toLocaleDateString() : 'Not set'}</span>

                                    </div>

                                </div>

                            </div>

                        </div>

                    ) : (

                        <div className="bg-yellow-25 border-b border-yellow-100 px-4 py-3">

                            <div className="flex items-center gap-2">

                                <Briefcase className="w-4 h-4 text-yellow-600" />

                                <span className="text-sm font-medium text-yellow-800">No project selected</span>

                            </div>

                        </div>

                    )}

                    {/* Project Filter Status */}

                    <div className="px-4 py-2 bg-gray-50 border-b">

                        <div className="text-sm text-gray-600">

                            {isProjectFiltering && (

                                <span className="text-blue-600">Filtering allocated employees...</span>

                            )}

                            {!isProjectFiltering && (deallocationFilter || deallocationRoleFilter || deallocationAvailabilityFilter) && (

                                <span className="text-green-600">Users</span>
                            )}

                            {!isProjectFiltering && !deallocationFilter && !deallocationRoleFilter && !deallocationAvailabilityFilter && (

                                <span className="text-gray-600">Showing all allocated employees</span>

                            )}

                            {filteredAllocatedEmployees.length > 0 && (

                                <span className="ml-2">({filteredAllocatedEmployees.length} results)</span>

                            )}

                        </div>

                    </div>

                    {/* Search and Filter for Deallocation */}

                    <div className="mb-4 space-y-3 px-4 py-2">

                        <div className="relative">

                            <Input

                                placeholder="Search allocated employees..."

                                value={deallocationFilter}

                                onChange={e => handleProjectNameFilterChange(e.target.value)}

                                className="w-full"

                            />

                            {isProjectFiltering && (

                                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">

                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>

                                </div>

                            )}

                        </div>

                        <div className="flex flex-wrap gap-2">
                             <div className="flex-1 relative">
                                 <SearchableMultiSelect
                                     options={roles.map(r => ({ value: r.roleName, label: r.roleName }))}
                                     selectedValues={deallocationRoleFilter}
                                     onChange={(values) => handleProjectRoleFilterChange(values)}
                                     placeholder={rolesLoading ? "Loading roles..." : roles.length === 0 ? "No roles available" : "All Roles"}
                                     className="w-full"
                                     disabled={rolesLoading || roles.length === 0}
                                 />
                                 {rolesLoading && (
                                     <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                         <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                     </div>
                                 )}
                                 {!rolesLoading && roles.length === 0 && (
                                     <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                         <button
                                             onClick={() => {
                                                 setRolesLoading(true);
                                                 getAllRoles()
                                                     .then((response) => {
                                                         const rolesArray = Array.isArray(response.data) ? response.data : response.data?.data || [];
                                                         setRoles(rolesArray);
                                                         console.log('Roles loaded:', rolesArray.length);
                                                     })
                                                     .catch((error) => {
                                                         console.error('Failed to fetch roles:', error);
                                                         setRoles([]);
                                                     })
                                                     .finally(() => setRolesLoading(false));
                                             }}
                                             className="text-red-500 hover:text-red-700 text-xs p-1 rounded hover:bg-red-50"
                                             title="Retry loading roles"
                                         >
                                             🔄
                                         </button>
                                     </div>
                                 )}
                             </div>
                             <select

                                 value={deallocationAvailabilityFilter}

                                 onChange={e => handleProjectAvailabilityFilterChange(e.target.value)}

                                 className="flex-1 border border-[#D1D5DB] rounded px-2 py-2 text-sm h-10"

                             >


                                 <option value="">Allocated % </option>
                                 <option value="100">100% Allocated</option>
                                 <option value="75">75% & Above Allocated</option>
                                 <option value="50">50% & Above Allocated</option>

                             </select>

                         </div>

                         <Button

                             variant="secondary"

                             onClick={() => {

                                 setDeallocationFilter('');

                                 setDeallocationRoleFilter([]);
                                 setDeallocationAvailabilityFilter('');

                             }}

                              className="px-2 py-1 text-sm min-w-[80px]"

                         >

                             Clear Project Filters

                         </Button>

                     </div>

                    <div className="flex-1 overflow-y-auto">

                        {paginatedAllocatedEmployees.length === 0 ? (

                            <div className="text-gray-400 text-center py-8">

                                {allocatedEmployees.length === 0 ? "No allocations yet" : "No employees match your search"}

                            </div>

                        ) : (

                            <>

                                <table className="w-full text-center table-fixed">
                                     <thead>
                                         <tr className="border-b border-[#D1D5DB]">
                                             <th className="py-2 px-4 text-center whitespace-nowrap min-w-[120px]">Name</th>
                                             <th className="text-center px-4 whitespace-nowrap min-w-[100px]">Role</th>
                                             <th className="text-center px-4 whitespace-nowrap min-w-[130px]">Allocated %</th>
                                             <th className="text-center px-4 whitespace-nowrap min-w-[110px]">Start Date</th>
                                             <th className="text-center px-4 whitespace-nowrap min-w-[110px]">End Date</th>
                                             <th className="text-center px-4 whitespace-nowrap"></th>
                                         </tr>
                                     </thead>
                                     <tbody>
                                         {paginatedAllocatedEmployees.map((emp: any) => (
                                             <tr
                                                 key={emp.id}
                                                 className={`border-b hover:bg-[#f6fff8] cursor-pointer transition-all duration-150
    ${selectedProjectUsers.includes(emp.id) ? 'border-2 border-blue-500 bg-[#f6fff8]' : 'border border-[#D1D5DB]'}
    ${selectedBench.length > 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                 onClick={() => {
                                                     if (selectedBench.length === 0) handleProjectUserSelect(emp.id);
                                                 }}
                                             >
                                                 <td><span className="inline-block max-w-[200px] truncate align-middle">{emp.userFullName}</span></td>
                                                 <td>{emp.roleName}</td>
                                                 <td>{emp.allocationPercentage}%</td>
                                                 <td>{emp.startDate ? emp.startDate.split('T')[0] : '-'}</td>
                                                 <td>{emp.endDate ? emp.endDate.split('T')[0] : '-'}</td>
                                                 <td>
                                                     <Button
                                                         size="sm"
                                                         variant="primary"
                                                         onClick={e => {
                                                             e.stopPropagation();
                                                             // Map the selected allocation to the modal's expected employee object
                                                             const mappedEmp = {
                                                                 id: emp.id,
                                                                 allocationId: emp.id,
                                                                 firstName: emp.userFullName?.split(' ')[0] || emp.firstName || '',
                                                                 lastName: emp.userFullName?.split(' ').slice(1).join(' ') || emp.lastName || '',
                                                                 designation: emp.designation || '',
                                                                 roleId: emp.roleId || roles.find(r => r.roleName === emp.roleName)?.id || '',
                                                                 roleName: emp.roleName || '',
                                                                 allocationAvailability: emp.allocationPercentage ?? emp.availability ?? 0,
                                                                 availability: emp.availability ?? emp.allocationPercentage ?? 0,
                                                                 allocationStartDate: emp.startDate ? emp.startDate.split('T')[0] : '',
                                                                 allocationEndDate: emp.endDate ? emp.endDate.split('T')[0] : '',
                                                             };
                                                             setAllocationModal({ open: true, employees: [mappedEmp] });
                                                         }}
                                                         title="Edit"
                                                     >
                                                         Edit
                                                     </Button>
                                                 </td>
                                             </tr>
                                         ))}
                                     </tbody>
                                 </table>

                                

                                {/* Pagination Controls for Allocated Employees */}

                                {allocatedTotalPages > 1 && (

                                    <div className="flex justify-center items-center gap-2 py-4">

                                        <button

                                            className="px-3 py-1 rounded border bg-gray-100 text-gray-700 disabled:opacity-50"

                                            onClick={() => setAllocatedCurrentPage((p) => Math.max(1, p - 1))}

                                            disabled={allocatedCurrentPage === 1}

                                        >

                                            Previous

                                        </button>

                                        {(() => {
                                            const windowSize = 5;
                                            let start = Math.max(1, allocatedCurrentPage - (windowSize - 1));
                                            let end = Math.min(allocatedTotalPages, allocatedCurrentPage);
                                            if (end - start + 1 < windowSize) {
                                                start = Math.max(1, end - windowSize + 1);
                                            }
                                            const pages = [] as number[];
                                            for (let p = start; p <= end; p++) pages.push(p);
                                            return pages.map((p) => (
                                                <button
                                                    key={p}
                                                    className={`px-3 py-1 rounded border ${allocatedCurrentPage === p ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'}`}
                                                    onClick={() => setAllocatedCurrentPage(p)}
                                                >
                                                    {p}
                                                </button>
                                            ));
                                        })()}

                                        <button
                                            className="px-3 py-1 rounded border bg-gray-100 text-gray-700 disabled:opacity-50"
                                            onClick={() => setAllocatedCurrentPage((p) => Math.min(allocatedTotalPages, p + 1))}
                                            disabled={allocatedCurrentPage === allocatedTotalPages}
                                        >
                                            Next
                                        </button>

                                    </div>

                                )}

                            </>

                        )}

                    </div>

                </div>

            </div>



            {/* Allocation Modal */}

            {allocationModal.open && (

            <Modal

                isOpen={allocationModal.open}

                onClose={() => {

                    setAllocationModal({ open: false, employees: [] });

                    setMaxAvailabilityMap({});

                    setIsLoadingMaxAvailability({});

                    setIsLoadingViewAllocation({});

                    setIsLoadingEmployeeDetails({});

                    setDateValidationErrors({});

                }}

                title="Allocation Preview"

                size="2xl"

            >

                <div className="flex flex-col gap-6 p-6 min-w-[900px]">

                    {/* Project Information Header */}

                    {currentProject && (

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">

                            <div className="flex items-center gap-3">

                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">

                                    <Briefcase className="w-4 h-4 text-blue-600" />

                                </div>

                                <div className="flex-1">

                                    <h3 className="font-bold text-blue-900 text-xl font-serif">

                                        {(currentProject as any)?.projectName || currentProject.name || 'Unknown Project'}

                                    </h3>

                                    <div className="flex items-center gap-4 text-sm text-blue-700 mt-1">

                                        <div className="flex items-center gap-1">

                                            <Calendar className="w-4 h-4" />

                                            <span>

                                                Start Date: {currentProject.startDate ? new Date(currentProject.startDate).toLocaleDateString() : 'Not set'} - End Date: {currentProject.endDate ? new Date(currentProject.endDate).toLocaleDateString() : 'Not set'}

                                            </span>

                                        </div>

                                    </div>

                                </div>

                            </div>

                        </div>

                    )}

                    {allocationModal.employees.map((emp, index) => (

                        <div key={emp.id} className="bg-white border border-gray-200 rounded-lg flex items-center gap-8 p-6 w-full relative">

                            {/* Close icon in the top-right, only show if more than one employee */}

                            {allocationModal.employees.length > 1 && (

                                <button

                                    className="absolute top-2 right-2 text-gray-400 hover:text-red-500 text-xl font-bold"

                                    onClick={() => {

                                        setAllocationModal(modal => ({

                                            ...modal,

                                            employees: modal.employees.filter((e, i) => i !== index)

                                        }));

                                        // Clear max availability for the removed employee

                                        setMaxAvailabilityMap(prev => {

                                            const newMap = { ...prev };

                                            delete newMap[emp.id];

                                            return newMap;

                                        });

                                        setIsLoadingMaxAvailability(prev => {

                                            const newMap = { ...prev };

                                            delete newMap[emp.id];

                                            return newMap;

                                        });

                                    }}

                                    title="Remove"

                                    type="button"

                                >

                                    ×

                                </button>

                            )}

                            {/* Name and Designation */}

                            <div className="flex flex-col min-w-[180px]">

                                <span className="font-semibold">{emp.firstName} {emp.lastName}</span>

                                <span className="text-gray-500 text-sm leading-tight">{emp.designation}</span>

                            </div>

                            {/* Role */}

                            <div className="flex flex-col min-w-[140px]">

                                <label className="text-sm font-medium text-gray-700 mb-1">Role</label>

                                <select

                                    value={emp.roleId || ''}

                                    onChange={e => {

                                        const selectedRoleId = Number(e.target.value);

                                        const selectedRole = roles.find(r => r.id === selectedRoleId);

                                        setAllocationModal(modal => ({

                                            ...modal,

                                            employees: modal.employees.map((employee, i) =>

                                                i === index ? { ...employee, roleId: selectedRoleId, role: selectedRole?.roleName } : employee

                                            )

                                        }));

                                    }}

                                    className="border border-[#D1D5DB] rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"

                                    style={{ minWidth: 120 }}

                                >

                                    <option value="">Select Role</option>

                                    {roles.map(role => (

                                        <option key={role.id} value={role.id}>{role.roleName}</option>

                                    ))}

                                </select>

                            </div>

                            {/* Start Date */}

                            <div className="flex flex-col min-w-[150px]">

                                <label className="text-sm font-medium text-gray-700 mb-1">Start Date</label>

                                <input

                                    type="date"

                                    value={emp.allocationStartDate || ''}

                                    onChange={e => {

                                        const newStartDate = e.target.value;

                                        setAllocationModal(modal => ({

                                            ...modal,

                                            employees: modal.employees.map((employee, i) =>

                                                i === index ? { ...employee, allocationStartDate: newStartDate } : employee

                                            )

                                        }));

                                        

                                        // Validate dates

                                        validateAllocationDates(emp.id, newStartDate, emp.allocationEndDate || '');

                                        

                                        // Fetch max availability if both dates are provided

                                        if (newStartDate && emp.allocationEndDate) {

                                            fetchMaxAvailability(emp.id, newStartDate, emp.allocationEndDate);

                                        }

                                    }}

                                    className={`w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 ${

                                        dateValidationErrors[emp.id]?.startDate ? 'border-red-500' : 'border-[#D1D5DB]'

                                    }`}

                                    style={{ minWidth: 120 }}

                                />

                                {dateValidationErrors[emp.id]?.startDate && (

                                    <div className="flex items-center gap-1 text-red-600 text-xs mt-1">

                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">

                                            <circle cx="12" cy="12" r="12" fill="#dc2626" fillOpacity="0.15" />

                                            <circle cx="12" cy="12" r="10" fill="#dc2626" fillOpacity="0.10" />

                                            <path d="M12 7v5" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" />

                                            <circle cx="12" cy="16" r="1.2" fill="#dc2626" />

                                        </svg>

                                        <span>{dateValidationErrors[emp.id].startDate}</span>

                                    </div>

                                )}

                            </div>

                            {/* End Date */}

                            <div className="flex flex-col min-w-[150px] relative">

                                <label className="text-sm font-medium text-gray-700 mb-1">End Date</label>

                                <input

                                    type="date"

                                    value={emp.allocationEndDate || ''}

                                    onChange={e => {

                                        const newEndDate = e.target.value;

                                        setAllocationModal(modal => ({

                                            ...modal,

                                            employees: modal.employees.map((employee, i) =>

                                                i === index ? { ...employee, allocationEndDate: newEndDate } : employee

                                            )

                                        }));

                                        

                                        // Validate dates

                                        validateAllocationDates(emp.id, emp.allocationStartDate || '', newEndDate);

                                        

                                        // Fetch max availability if both dates are provided

                                        if (emp.allocationStartDate && newEndDate) {

                                            fetchMaxAvailability(emp.id, emp.allocationStartDate, newEndDate);

                                        }

                                    }}

                                    className={`w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 ${

                                        dateValidationErrors[emp.id]?.endDate ? 'border-red-500' : 'border-[#D1D5DB]'

                                    }`}

                                    style={{ minWidth: 120 }}

                                />

                                {dateValidationErrors[emp.id]?.endDate && (

                                    <div className="flex items-center gap-1 text-red-600 text-xs mt-1 absolute left-0 top-full z-10 bg-white">

                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">

                                            <circle cx="12" cy="12" r="12" fill="#dc2626" fillOpacity="0.15" />

                                            <circle cx="12" cy="12" r="10" fill="#dc2626" fillOpacity="0.10" />

                                            <path d="M12 7v5" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" />

                                            <circle cx="12" cy="16" r="1.2" fill="#dc2626" />

                                        </svg>

                                        <span>{dateValidationErrors[emp.id].endDate}</span>

                                    </div>

                                )}

                            </div>

                            {/* Availability */}

                            <div className="flex flex-col min-w-[120px]">

                                <label className="text-sm font-medium text-gray-700 mb-1">Availability</label>

                                <div className="flex items-center">

                                    <input

                                        type="number"

                                        min="1"

                                        max={maxAvailabilityMap[emp.id] || emp.availability}

                                        value={emp.allocationAvailability ?? emp.availability}

                                        onChange={e => {

                                            const value = parseInt(e.target.value) || 0;

                                            setAllocationModal(modal => ({

                                                ...modal,

                                                employees: modal.employees.map((employee, i) =>

                                                    i === index ? { ...employee, allocationAvailability: value } : employee

                                                )

                                            }));

                                        }}

                                        className="w-16 border border-[#D1D5DB] rounded px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"

                                    />

                                    <span className="ml-2 text-xs text-gray-400">

                                        {emp.allocationAvailability ?? emp.availability}% 

                                        (Max: {isLoadingMaxAvailability[emp.id] ? (

                                            <span className="text-blue-500">Loading...</span>

                                        ) : (

                                            maxAvailabilityMap[emp.id] || emp.availability

                                        )}%)

                                    </span>

                                </div>

                            </div>

                        </div>

                    ))}

                    <div className="flex justify-end gap-3 pt-4">

                        <button

                            className="px-4 py-2 rounded bg-gray-200 text-gray-700 font-medium hover:bg-gray-300"

                            onClick={() => {

                                setAllocationModal({ open: false, employees: [] });

                                setMaxAvailabilityMap({});

                                setIsLoadingMaxAvailability({});

                                setIsLoadingViewAllocation({});

                                setIsLoadingEmployeeDetails({});

                                setDateValidationErrors({});

                            }}

                        >

                            Cancel

                        </button>

                        <button

                            className="px-4 py-2 rounded bg-blue-600 text-white font-medium hover:bg-blue-700"

                            onClick={() => handleConfirmAllocation(allocationModal.employees)}

                            disabled={isAllocating}

                        >

                            {isAllocating ? 'Allocating...' : 'Confirm'}

                        </button>

                    </div>

                </div>

            </Modal>

            )}



            {/* Employee Info Modal */}

            {viewInfoEmployee && (

            <Modal

                isOpen={!!viewInfoEmployee}

                onClose={() => setViewInfoEmployee(null)}

                    title="Employee Details"

                    size="full"

            >

                {viewInfoEmployee && isLoadingEmployeeDetails[viewInfoEmployee.id] ? (

                    <div className="flex items-center justify-center py-8">

                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>

                        <p className="text-gray-500">Loading employee details...</p>

                    </div>

                ) : (

                    <EmployeeDetailsCard employee={viewInfoEmployee} />

                )}

                </Modal>

                )}

            <Toast

                isOpen={toast.isOpen}

                onClose={() => setToast({ ...toast, isOpen: false })}

                message={toast.message}

                type={toast.type}

            />

            {/* Deallocation Confirmation Modal */}

            <Modal

                isOpen={deallocationConfirmModal}

                onClose={() => setDeallocationConfirmModal(false)}

                title="Confirm Deallocation"

                size="md"

            >

                <div className="p-6 flex flex-col gap-6">

                    <div className="text-lg font-semibold text-gray-800">Are you sure you want to deallocate the selected user(s) from this project?</div>

                    <div className="flex justify-end gap-3">

                        <button

                            className="px-4 py-2 rounded bg-gray-200 text-gray-700 font-medium hover:bg-gray-300"

                            onClick={() => setDeallocationConfirmModal(false)}

                        >

                            Cancel

                        </button>

                        <button

                            className="px-4 py-2 rounded bg-red-600 text-white font-medium hover:bg-red-700"

                            onClick={confirmDeallocate}

                            disabled={isDeallocating}

                        >

                            {isDeallocating ? 'Deallocating...' : 'Confirm'}

                        </button>

                    </div>

                </div>

            </Modal>







            {/* Allocation Success Modal */}

            <Modal

                isOpen={allocationSuccessModal}

                onClose={() => setAllocationSuccessModal(false)}

                title="Allocation Successful"

                size="md"

            >

                <div className="p-3 flex flex-col gap-3">

                    <div className="text-center">

                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">

                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>

                            </svg>

                        </div>

                        <div className="text-lg font-bold text-gray-800 mb-2">Allocation Successful!</div>

                        <div className="text-md text-gray-800">The selected employees have been successfully allocated to the project.</div>

                    </div>

                    <div className="flex justify-center">

                        <button

                            className="px-6 py-2 rounded bg-blue-600 text-white font-bold hover:bg-blue-700 text-md"

                            onClick={() => setAllocationSuccessModal(false)}

                        >

                            OK

                        </button>

                    </div>

                </div>

            </Modal>

        </div>

    );

}