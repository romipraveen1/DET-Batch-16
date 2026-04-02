import React, { useState, useMemo, useEffect } from 'react';
import { UserCheck, Calendar, Percent, ArrowRight, Eye, User, Search, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Table, TableHeader, TableBody, TableRow, TableCell } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { DonutChart } from '../components/ui/DonutChart';
import { SearchableMultiSelect } from '../components/ui/SearchableMultiSelect';
import { useApp } from '../context/AppContext';
import { Employee } from '../types/index';
import { useNavigate } from 'react-router-dom';
import { getBenchList, getEmployeeDetails, getEmployeeProjectHistory, getBenchAvailability } from '../api/bench/bench';
import { searchBenchEmployees } from '../api/bench/filterbench';
import { getDesignations, Designations } from '../api/designation/designation';

export const Bench: React.FC = () => {
  const { projects, allocateEmployee } = useApp();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [allDesignations, setAllDesignations] = useState<Designations[]>([]);
  const [isAllocationModalOpen, setIsAllocationModalOpen] = useState(false);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);
  const [projectHistory, setProjectHistory] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isUsingClientSideFilter, setIsUsingClientSideFilter] = useState(false);
  const [filters, setFilters] = useState({
    name: '',
    designation: [] as string[],
    availability: '',
    fromDate: '',
    toDate: '',
  });

  const [allocationData, setAllocationData] = useState({
    projectId: '',
    allocationPercentage: 50,
    role: '',
    startDate: '',
    endDate: '',
  });

  // Date error state instead of toast
  const [dateError, setDateError] = useState<string>('');

  // Error state for API errors
  const [apiError, setApiError] = useState<string>('');

  const navigate = useNavigate();

  useEffect(() => {
    loadAllBenchEmployees();
  }, []);

  // Filter employees by all filters (client-side filtering)
  const filteredEmployees = useMemo(() => {
    let filtered = employees.filter(emp => emp.availability > 0);
    
    console.log('Total employees before filtering:', filtered.length);
    console.log('Sample employees:', filtered.slice(0, 3).map(emp => `${emp.firstName} ${emp.lastName}`));
    
    // Apply name filter (case-insensitive substring match for first or last name)
    if (filters.name.trim()) {
    const nameFilter = filters.name.trim().toLowerCase();
      console.log('Filtering with:', nameFilter);
      filtered = filtered.filter(emp => {
        const firstName = (emp.firstName || '').toLowerCase();
        const lastName = (emp.lastName || '').toLowerCase();
        const fullName = `${firstName} ${lastName}`.toLowerCase();
        
        // Check if name starts with the search term (not just contains it)
        const matches = firstName.startsWith(nameFilter) || 
                       lastName.startsWith(nameFilter) || 
                       fullName.startsWith(nameFilter);
        
        // Additional check: only match if the full name starts with the search term
        const fullNameStartsWith = fullName.startsWith(nameFilter);
        
        if (matches) {
          console.log('Match found:', `${emp.firstName} ${emp.lastName}`, 'for filter:', nameFilter);
          console.log('  firstName:', firstName, 'startsWith:', firstName.startsWith(nameFilter));
          console.log('  lastName:', lastName, 'startsWith:', lastName.startsWith(nameFilter));
          console.log('  fullName:', fullName, 'startsWith:', fullName.startsWith(nameFilter));
        }
        
        return fullNameStartsWith; // Only return true if full name starts with search term
      });
      console.log('Employees after name filtering:', filtered.length);
    }
    
    // Apply designation filter
    if (filters.designation && filters.designation.length > 0) {
      console.log('Filtering by designations:', filters.designation);
      filtered = filtered.filter(emp => filters.designation.includes(emp.designation));
      console.log('Employees after designation filtering:', filtered.length);
    }
    
    // Apply availability filter
    if (filters.availability && filters.availability !== 'All Availability' && filters.availability !== '') {
      const minAvailability = parseInt(filters.availability);
      if (!isNaN(minAvailability)) {
        filtered = filtered.filter(emp => emp.availability >= minAvailability);
      }
    }
    
    // Apply date range filters - handle availablePeriods format
    // Only apply date filtering if both start and end dates are provided
    if (filters.fromDate && filters.toDate && filters.fromDate.trim() && filters.toDate.trim()) {
      filtered = filtered.filter(emp => {
        if (!emp.joinedDate) return false;
        
        // Parse availablePeriods format: "2024-06-01 to 2024-12-01"
        const periodMatch = emp.joinedDate.match(/(\d{4}-\d{2}-\d{2})\s+to\s+(\d{4}-\d{2}-\d{2})/);
        if (!periodMatch) return false;
        
        const employeeStartDate = new Date(periodMatch[1] + 'T00:00:00');
        const employeeEndDate = new Date(periodMatch[2] + 'T23:59:59');
        
        // Apply fromDate filter - employee's period should start on or after the filter start date
        const filterStartDate = new Date(filters.fromDate + 'T00:00:00');
        if (employeeStartDate < filterStartDate) return false;
        
        // Apply toDate filter - employee's period should end on or before the filter end date
        const filterEndDate = new Date(filters.toDate + 'T23:59:59');
        if (employeeEndDate > filterEndDate) return false;
        
        return true;
      });
    }
    
    // Sort by full name alphabetically (A to Z)
    return filtered.sort((a, b) => {
      const fullNameA = `${a.firstName} ${a.lastName}`.toLowerCase();
      const fullNameB = `${b.firstName} ${b.lastName}`.toLowerCase();
      return fullNameA.localeCompare(fullNameB);
    });
  }, [employees, filters]);

  // Add state for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.ceil(filteredEmployees.length / pageSize);
  const paginatedEmployees = filteredEmployees.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Get unique designations for filter dropdown
  const designations = useMemo(() => {
    console.log('Original allDesignations:', allDesignations);
    
    // Get unique designation names from the Designations array
    const cleanDesignations = allDesignations
      .filter(designation => 
        designation && 
        designation.name && 
        designation.name.trim() !== ''
      )
      .map(d => d.name);
    
    console.log('Clean designations:', cleanDesignations);
    
    // Get unique values only
    const uniqueDesignations = [...new Set(cleanDesignations)];
    console.log('Unique designations:', uniqueDesignations);
    
    return uniqueDesignations;
  }, [allDesignations]);

  // Utility to normalize filter values (trim and collapse spaces)
  const normalizeFilterValue = (value: string) => value.replace(/\s+/g, ' ').trim();
  const normalizeFilters = (filtersObj: typeof filters): typeof filters => ({
    name: normalizeFilterValue(filtersObj.name),
    designation: filtersObj.designation,
    availability: normalizeFilterValue(filtersObj.availability),
    fromDate: normalizeFilterValue(filtersObj.fromDate),
    toDate: normalizeFilterValue(filtersObj.toDate),
  });

  const handleFilterChange = async (field: string, value: string | string[]) => {
    // Clear date error when user starts typing in date fields
    if (field === 'fromDate' || field === 'toDate') {
      setDateError('');
    }

    // Date validation logic
    if (field === 'toDate' && value && filters.fromDate) {
      if (new Date(value as string) < new Date(filters.fromDate)) {
        setDateError('End date must be after the start date');
        // Reset end date
        setFilters(prev => ({ ...prev, toDate: '' }));
        return;
      }
    }
    if (field === 'fromDate' && value && filters.toDate) {
      if (new Date(filters.toDate) < new Date(value as string)) {
        setDateError('End date must be after the start date');
        // Reset from date
        setFilters(prev => ({ ...prev, fromDate: '' }));
        return;
      }
    }

    setFilters(prev => ({ ...prev, [field]: value }));
    
    // Reset pagination when filters change
    setCurrentPage(1);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // All filtering is now done client-side, no API calls needed
    setCurrentPage(1);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    // All filtering is now done client-side, no API calls needed
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      setCurrentPage(1);
    }
  };



  const loadAllBenchEmployees = async () => {
    try {
      setApiError(''); // Clear any previous errors
      
      // Get both APIs to merge availability data
      const [benchData, availabilityData] = await Promise.all([
        getBenchList(),
        getBenchAvailability(0, 1000, {})
      ]);

      if (Array.isArray(benchData)) {
        // Create a map of availability data by employee name for quick lookup
        const availabilityMap = new Map();
        if (availabilityData && availabilityData.data && availabilityData.data.items) {
          availabilityData.data.items.forEach((item: any) => {
            const fullName = item.fullName || '';
            availabilityMap.set(fullName.toLowerCase(), item.availabilityPercentage || 0);
          });
        }

        // Merge the data - keep original bench data but update availability
        const mergedEmployees = benchData.map(emp => {
          const fullName = `${emp.firstName} ${emp.lastName}`;
          const benchAllocateAvailability = availabilityMap.get(fullName.toLowerCase());
          
          return {
            ...emp,
            // Use bench-allocate availability if available, otherwise keep original
            availability: benchAllocateAvailability !== undefined ? benchAllocateAvailability : emp.availability
          };
        });

        setEmployees(mergedEmployees);

        // Debug: Log all designations from API
        const allDesignationsFromAPI = mergedEmployees.map(emp => emp.designation);
        console.log('All designations from API:', allDesignationsFromAPI);

        // Load designations from the designation API
        try {
          const designationResponse = await getDesignations();
          if (designationResponse.data && Array.isArray(designationResponse.data)) {
            setAllDesignations(designationResponse.data);
            console.log('Designations loaded from API:', designationResponse.data);
          }
        } catch (designationError) {
          console.error('Error loading designations:', designationError);
          // Fallback to designations from employee data
          const designationsList = Array.from(new Set(allDesignationsFromAPI))
            .filter(designation =>
              designation !== 'All Designations' &&
              designation !== 'All Designation' &&
              designation !== null &&
              designation !== undefined &&
              designation.trim() !== ''
            );

          console.log('Fallback designations list:', designationsList);
          // Convert to Designations format for consistency
          const fallbackDesignations = designationsList.map((name, index) => ({
            id: index + 1,
            name: name
          }));
          setAllDesignations(fallbackDesignations);
        }
      } else {
        setEmployees([]);
        setAllDesignations([]);
      }
    } catch (error) {
      console.error('Error loading bench employees:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load bench employees';
      setApiError(errorMessage);
      setEmployees([]);
      setAllDesignations([]);
    }
  };

  const handleAllocate = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsAllocationModalOpen(true);
  };

  const handleViewEmployee = async (employee: Employee) => {
    try {
      setApiError(''); // Clear any previous errors
      // Fetch detailed employee information and project history from the backend
      const [employeeDetails, projectHistoryData] = await Promise.all([
        getEmployeeDetails(employee.id),
        getEmployeeProjectHistory(employee.id)
      ]);

      console.log('Employee details:', employeeDetails);
      console.log('Project history:', projectHistoryData);

      // Merge the detailed information with the existing employee data
      const detailedEmployee = {
        ...employee,
        ...employeeDetails,
        // Map personal information from the backend response
        email: employeeDetails.personalInformation?.email || employee.email,
        phone: employeeDetails.personalInformation?.phone || employee.phone,
        joinedDate: employeeDetails.personalInformation?.joinedDate || employee.joinedDate,
        role: employeeDetails.role || employee.designation,
        status: employeeDetails.status || employee.status,
        availability: employeeDetails.availability || employee.availability,
      };

      setViewingEmployee(detailedEmployee);
      setProjectHistory(projectHistoryData || []);
      setIsEmployeeModalOpen(true);
    } catch (error) {
      console.error('Error fetching employee details:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch employee details';
      setApiError(errorMessage);
      // Fallback to basic employee data
      setViewingEmployee(employee);
      setProjectHistory([]);
      setIsEmployeeModalOpen(true);
    }
  };

  const handleAllocationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedEmployee) {
      try {
      allocateEmployee({
        employeeId: selectedEmployee.id,
        ...allocationData,
      });
        console.log('Employee allocated successfully!');
      setIsAllocationModalOpen(false);
      setSelectedEmployee(null);
      setAllocationData({
        projectId: '',
        allocationPercentage: 50,
        role: '',
        startDate: '',
        endDate: '',
      });
      } catch (error: any) {
        console.error('Failed to allocate employee:', error?.message || error);
      }
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setAllocationData(prev => ({ ...prev, [field]: value }));
  };

  const getAvailabilityColor = (availability: number) => {
    if (availability >= 80) return 'text-green-600';
    if (availability >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getAvailabilityStatus = (availability: number) => {
    if (availability >= 80) return { label: 'Highly Available', variant: 'success' as const };
    if (availability >= 50) return { label: 'Partially Available', variant: 'warning' as const };
    return { label: 'Busy', variant: 'error' as const };
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bench Management</h1>
          <p className="text-gray-600 mt-1">Manage employee availability and project allocations</p>
        </div>
      </div>

      {/* Error Display */}
      {apiError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{apiError}</p>
              </div>
            </div>
            <div className="ml-auto pl-3">
              <div className="-mx-1.5 -my-1.5">
                <button
                  type="button"
                  className="inline-flex bg-red-50 rounded-md p-1.5 text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-red-50 focus:ring-red-600"
                  onClick={() => setApiError('')}
                >
                  <span className="sr-only">Dismiss</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Simplified Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Single search box for both first and last name */}
            <div className="relative flex-1 min-w-[240px]">
              {isSearching ? (
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                </div>
              ) : (
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              )}
              <Input
                placeholder="Search by name..."
                value={filters.name}
                onChange={e => handleFilterChange('name', e.target.value)}
                className="pl-10"
              />
            </div>

            <SearchableMultiSelect
              options={allDesignations.map(d => ({ value: d.name, label: d.name }))}
              selectedValues={filters.designation}
              onChange={(values) => handleFilterChange('designation', values)}
              placeholder={allDesignations.length > 0 ? "All Designations" : "Loading designations..."}
              className="min-w-[200px]"
              disabled={allDesignations.length === 0}
            />

            <select
              value={filters.availability || 'All Availability'}
              onChange={(e) => handleFilterChange('availability', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[180px]"
            >
              <option value="">All Availability</option>
              <option value="80">80% and above</option>
              <option value="50">50% and above</option>
              <option value="30">30% and above</option>
              <option value="10">10% and above</option>
            </select>

            <div className="flex flex-col gap-1 min-w-[300px]">
              <div className="flex gap-2">
              <Input
                type="date"
                value={filters.fromDate}
                onChange={(e) => handleFilterChange('fromDate', e.target.value)}
                placeholder="From Date"
                className="flex-1"
                disabled={isSearching}
              />
              <Input
                type="date"
                value={filters.toDate}
                onChange={(e) => handleFilterChange('toDate', e.target.value)}
                placeholder="To Date"
                className="flex-1"
                disabled={isSearching}
              />
              </div>
              {/* Inline error message */}
              {dateError && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="12" fill="#dc2626" fillOpacity="0.15" />
                    <circle cx="12" cy="12" r="10" fill="#dc2626" fillOpacity="0.10" />
                    <path d="M12 7v5" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" />
                    <circle cx="12" cy="16" r="1.2" fill="#dc2626" />
                  </svg>
                  <span>{dateError}</span>
                </div>
              )}
            </div>

            <Button
              variant="secondary"
              onClick={() => {
                setFilters({
                  name: '',
                  designation: [],
                  availability: '',
                  fromDate: '',
                  toDate: '',
                });
                setDateError(''); // Clear error when clearing filters
                setApiError(''); // Clear API error when clearing filters
                loadAllBenchEmployees();
              }}
              className="px-4 py-2"
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filter Summary */}
      {(filters.name || filters.designation.length > 0 || filters.availability || filters.fromDate || filters.toDate) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center gap-2 text-sm text-blue-800">
            <Filter className="w-4 h-4" />
            <span className="font-medium">Active Filters:</span>
            {filters.name && (
              <Badge variant="info" size="sm">
                Name: {filters.name}
              </Badge>
            )}
            {filters.designation.length > 0 && (
              <Badge variant="info" size="sm">
                Designations: {filters.designation.join(', ')}
              </Badge>
            )}
            {filters.availability && (
              <Badge variant="info" size="sm">
                Availability: {filters.availability}% and above
              </Badge>
            )}
            {(filters.fromDate || filters.toDate) && (
              <Badge variant="info" size="sm">
                Date Range: {filters.fromDate || 'Any'} to {filters.toDate || 'Any'}
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Move Manage button to top right above Employee Bench table */}
      <div className="flex justify-end mb-2">
        <Button
          variant="primary"
          className="ml-4"
          onClick={() => navigate('/bench-allocate')}
        >
          Allocate
        </Button>
      </div>

      {/* Bench Table */}
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
          <h3 className="text-xl font-semibold text-gray-900">Employee Bench</h3>
          <p className="text-gray-600">Click on employee names to view detailed information</p>
            </div>
            <div className="text-sm text-gray-500">
              {isUsingClientSideFilter && filters.name.trim() && (
                <span className="text-blue-600">Using client-side filtering</span>
              )}
              {/* {!isUsingClientSideFilter && filters.name.trim() && (
                <span className="text-green-600">Using API search</span>
              )} */}
              {filteredEmployees.length > 0 && (
                <span className="ml-2">({filteredEmployees.length} results)</span>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredEmployees.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableCell header>Employee</TableCell>
                  <TableCell header>Designation</TableCell>
                  <TableCell header>Availability</TableCell>
                  <TableCell header>Available Period</TableCell>
                  <TableCell header>Current Projects</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedEmployees.map((employee: Employee) => {
                  const availabilityStatus = getAvailabilityStatus(employee.availability);
                  return (
                    <TableRow key={employee.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                            <span className="text-white font-semibold text-sm">
                              {employee.firstName.charAt(0)}{employee.lastName.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <button
                              onClick={() => handleViewEmployee(employee)}
                              className="font-semibold text-blue-600 hover:text-blue-800 transition-colors duration-200"
                            >
                              {employee.firstName} {employee.lastName}
                            </button>
                           
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-gray-900">{employee.designation}</p>
                        
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                            <DonutChart
                              percentage={employee.availability}
                              size={50}
                              strokeWidth={4}
                              color={
                                availabilityStatus.variant === 'success' ? '#16a34a' :
                                availabilityStatus.variant === 'warning' ? '#eab308' :
                                '#dc2626'
                              }
                            />
                            <Badge variant={availabilityStatus.variant} size="sm">
                              {availabilityStatus.label}
                            </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-600">
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4" />
                            <span>
                              {employee.joinedDate || 'N/A'}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {employee.currentProjects.length > 0 ? (
                          <div className="relative group max-w-[320px]">
                            <div className="space-y-1">
                              {employee.currentProjects.slice(0, 2).map((project: string, index: number) => (
                                <Badge key={index} variant="info" size="sm" title={project}>
                                  <span className="inline-block max-w-[300px] truncate align-middle">{project}</span>
                                </Badge>
                              ))}
                              {employee.currentProjects.length > 2 && (
                                <Badge variant="secondary" size="sm" className="cursor-default select-none" title={employee.currentProjects.slice(2).join(', ')}>
                                  +{employee.currentProjects.length - 2} more
                                </Badge>
                              )}
                            </div>
                            {employee.currentProjects.length > 2 && (
                              <div className="absolute hidden group-hover:block left-0 top-full mt-1 z-20 w-64 max-h-48 overflow-auto rounded-md border border-gray-200 bg-white shadow-lg p-2">
                                <div className="text-xs text-gray-500 mb-1">All Projects</div>
                                <ul className="space-y-1">
                                  {employee.currentProjects.map((project: string, idx: number) => (
                                    <li key={idx} className="text-sm text-gray-800 truncate" title={project}>
                                      {project}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        ) : (
                          <Badge variant="default" size="sm">No projects</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="p-12 text-center">
              <UserCheck className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {Object.entries(filters).some(([k, v]) => v !== '')
                  ? 'User not found'
                  : 'No employees found'}
              </h3>
              <p className="text-gray-500">
                {Object.entries(filters).some(([k, v]) => v !== '') 
                  ? 'Try adjusting your search filters' 
                  : 'Try adjusting your filters or add employees to the bench'}
              </p>
            </div>
          )}
          {/* Pagination Controls - now inside the card */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 py-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                &lt;
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => {
                const isCurrent = pageNum === currentPage;
                const isEdge = pageNum === 1 || pageNum === totalPages;
                const isNear = Math.abs(pageNum - currentPage) <= 1;
                if (isEdge || isNear) {
                  return (
                    <button
                      key={pageNum}
                      className={`px-2 py-1 rounded text-sm font-medium ${isCurrent ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-blue-100'}`}
                      onClick={() => setCurrentPage(pageNum)}
                      disabled={isCurrent}
                      style={{ minWidth: 32 }}
                    >
                      {pageNum}
                    </button>
                  );
                }
                if (pageNum === 2 && currentPage > 3) {
                  return <span key="start-ellipsis" className="px-2">...</span>;
                }
                if (pageNum === totalPages - 1 && currentPage < totalPages - 2) {
                  return <span key="end-ellipsis" className="px-2">...</span>;
                }
                return null;
              })}
              <Button
                type="button"
                variant="secondary"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                &gt;
              </Button>
              <span className="ml-4 text-sm text-gray-700">Go to</span>
              <input
                type="number"
                min={1}
                max={totalPages}
                value={currentPage}
                onChange={e => {
                  let val = Number(e.target.value);
                  if (isNaN(val)) val = 1;
                  if (val < 1) val = 1;
                  if (val > totalPages) val = totalPages;
                  setCurrentPage(val);
                }}
                className="w-16 px-2 py-1 border border-gray-300 rounded text-center mx-1 text-sm"
                style={{ minWidth: 48 }}
              />
              <span className="text-sm text-gray-700">/ {totalPages}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Employee Details Modal */}
      <Modal
        isOpen={isEmployeeModalOpen}
        onClose={() => {
          setIsEmployeeModalOpen(false);
          setViewingEmployee(null);
        }}
        title="Employee Details"
        size="xl"
      >
        {viewingEmployee && (
          <div className="space-y-6">
            <div className="flex items-center space-x-6">
              <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-2xl">
                  {viewingEmployee.firstName.charAt(0)}{viewingEmployee.lastName.charAt(0)}
                </span>
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-gray-900">
                  {viewingEmployee.firstName} {viewingEmployee.lastName}
                </h3>
                <p className="text-lg text-gray-600">{viewingEmployee.designation}</p>
                <div className="flex items-center space-x-4 mt-2">
                  <Badge
                    variant={viewingEmployee.status === 'active' ? 'success' :
                      viewingEmployee.status === 'on-leave' ? 'warning' : 'error'}
                  >
                    {viewingEmployee.status}
                  </Badge>
                </div>
              </div>
              <div className="text-center">
                <DonutChart
                  percentage={viewingEmployee.availability}
                  size={80}
                  strokeWidth={8}
                />
                <p className="text-sm font-semibold text-gray-700 mt-2">
                  {viewingEmployee.availability}% Available
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <User className="w-5 h-5 mr-2" />
                    Personal Information
                  </h4>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Email:</span>
                      <span className="font-medium">{viewingEmployee.email || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Phone:</span>
                      <span className="font-medium">{String(viewingEmployee.phone) || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Joined Date:</span>
                      <span className="font-medium">
                        {viewingEmployee.joinedDate ? new Date(viewingEmployee.joinedDate).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Project History</h4>
                  {projectHistory.length > 0 ? (
                    <div className="space-y-2">
                      {projectHistory.map((project: any, index: number) => (
                          <div key={index} className="bg-green-50 p-3 rounded-lg border border-green-200">
                          <div className="flex justify-between items-center">
                            <p className="font-medium text-green-900">{project.projectName}</p>
                            <span className="text-sm font-semibold text-green-700">
                              {project.percentage}%
                            </span>
                          </div>
                          <div className="mt-2">
                            <div className="w-full bg-green-200 rounded-full h-2">
                              <div
                                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${project.percentage}%` }}
                              ></div>
                              </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-gray-50 p-4 rounded-lg text-center">
                      <p className="text-gray-500">No project history available</p>
                      <p className="text-sm text-gray-400 mt-1">No previous projects found</p>
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Availability Timeline</h4>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-blue-900 font-medium">Current Availability</span>
                      <span className="text-blue-900 font-bold">{viewingEmployee.availability}%</span>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-3">
                      <div
                        className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${viewingEmployee.availability}%` }}
                      ></div>
                    </div>
                    <p className="text-sm text-blue-700 mt-2">
                      {viewingEmployee.availability >= 80 ? 'Highly available for new projects' :
                        viewingEmployee.availability >= 50 ? 'Partially available' :
                          'Currently busy with existing commitments'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};