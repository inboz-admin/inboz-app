"use client";

import { useState, useMemo, useEffect } from "react";
import type {
  ColumnFiltersState,
  SortingState,
  VisibilityState,
} from "@tanstack/react-table";
import {
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { UserPlus, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDeleteDialog } from "@/components/common";
import {
  DataTable,
  DataTableViewOptions,
  DataTablePagination,
} from "@/components/common";
import type { Employee } from "@/api/employeeTypes";
import {
  EmployeeRole,
  EmployeeStatus,
  EmployeeRoleLabels,
  EmployeeStatusLabels,
} from "@/api/employeeTypes";
import { employeeService } from "@/api/employeeService";
import { roleService } from "@/api/roleService";
import { ActionType, ModuleName } from "@/api/roleTypes";
import { toast } from "sonner";
import EmployeeModal from "./EmployeeModal";
import { useAppStore } from "@/stores/appStore";
import { createEmployeeColumns } from "./columns";
import { exportToCSVWithAudit } from "@/utils/csvExport";
import { NoDataState } from "@/components/common/NoDataState";

export default function EmployeesPage() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null
  );
  const [isViewMode, setIsViewMode] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(
    null
  );

  const [moduleActions, setModuleActions] = useState<ActionType[]>([]);

  // Pagination state for client-side pagination
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);

  // Get user data from store
  const { user } = useAppStore();

  // Debounce search term to prevent excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset to first page when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm]);

  // Fetch employees data on component mount and when pagination/filters change
  useEffect(() => {
    let isCancelled = false;

    const fetchEmployees = async () => {
      try {
        setLoading(true);
        const response = await employeeService.getEmployees({
          page: currentPage,
          limit: pageSize,
          search: debouncedSearchTerm || undefined,
          status:
            statusFilter !== "all"
              ? (statusFilter as EmployeeStatus)
              : undefined,
          role: roleFilter !== "all" ? (roleFilter as EmployeeRole) : undefined,
          centerId: user?.centerId,
        });

        // Only update state if component is still mounted
        if (!isCancelled) {
          if (response.success && response.data) {
            setEmployees(response.data.data);
            setTotalPages(response.data.totalPages);
            setTotalItems(response.data.total);
          } else {
            setEmployees([]);
            setTotalPages(0);
            setTotalItems(0);
          }
        }
      } catch {
        // Fallback to sample data on error
        if (!isCancelled) {
          setEmployees([]);
          setTotalPages(0);
          setTotalItems(0);
          toast.error("Error loading employees, using sample data");
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    fetchEmployees();

    return () => {
      isCancelled = true;
    };
  }, [
    currentPage,
    pageSize,
    debouncedSearchTerm,
    statusFilter,
    roleFilter,
    user?.centerId,
  ]); // Only run on mount

  // Fetch module actions when user is available
  useEffect(() => {
    const fetchModuleActions = async () => {
      if (!user?.role) {
        return;
      }

      try {
        const response = await roleService.getRoleActions(
          user.role,
          ModuleName.EMPLOYEE
        );

        if (response.success && response.data) {
          setModuleActions(response.data.actions || []);
        } else {
          setModuleActions([]);
          if (response.message) {
            toast.error(`Failed to fetch permissions: ${response.message}`);
          } else {
            toast.error(
              "Failed to fetch module actions - no permissions data received"
            );
          }
        }
      } catch (error) {
        setModuleActions([]);
        toast.error(
          `Failed to fetch module actions: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    };

    fetchModuleActions();
  }, [user]); // Run when user changes

  // Refresh employees data
  const refreshEmployees = async () => {
    try {
      setLoading(true);
      const response = await employeeService.getEmployees({
        page: currentPage,
        limit: pageSize,
        search: searchTerm || undefined,
        status:
          statusFilter !== "all" ? (statusFilter as EmployeeStatus) : undefined,
        role: roleFilter !== "all" ? (roleFilter as EmployeeRole) : undefined,
        centerId: user?.centerId,
      });

      if (response.success && response.data) {
        setEmployees(response.data.data);
        setTotalPages(response.data.totalPages);
        setTotalItems(response.data.total);
      } else {
        setEmployees([]);
        setTotalPages(0);
        setTotalItems(0);
      }
    } catch {
      setEmployees([]);
      setTotalPages(0);
      setTotalItems(0);
      toast.error("Error refreshing employees data");
    } finally {
      setLoading(false);
    }
  };

  // Handle search change
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    // Page reset is handled by useEffect when debouncedSearchTerm changes
  };

  // Handle status filter change
  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1); // Reset to first page when filtering
  };

  // Handle role filter change
  const handleRoleFilterChange = (value: string) => {
    setRoleFilter(value);
    setCurrentPage(1); // Reset to first page when filtering
  };

  // Handle opening modal for adding new employee
  const handleAddEmployee = () => {
    setSelectedEmployee(null);
    setIsModalOpen(true);
  };

  // Handle opening modal for editing employee
  const handleEditEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsViewMode(false);
    setIsModalOpen(true);
  };

  // Handle opening modal for viewing employee details
  const handleViewEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsViewMode(true);
    setIsModalOpen(true);
  };

  // Handle closing modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedEmployee(null);
    setIsViewMode(false);
  };

  // Handle successful form submission
  const handleModalSuccess = () => {
    refreshEmployees();
  };

  // Handle delete confirmation
  const handleDeleteClick = (employee: Employee) => {
    setEmployeeToDelete(employee);
    setIsDeleteDialogOpen(true);
  };

  // Handle confirmed delete
  const handleConfirmDelete = async () => {
    if (!employeeToDelete) return;

    try {
      const response = await employeeService.deleteEmployee(
        employeeToDelete.id
      );

      if (response.success) {
        toast.success("Employee deleted successfully");
        refreshEmployees();
      } else {
        toast.error("Failed to delete employee");
      }
    } catch {
      toast.error("Failed to delete employee");
    } finally {
      setIsDeleteDialogOpen(false);
      setEmployeeToDelete(null);
    }
  };

  // Handle cancel delete
  const handleCancelDelete = () => {
    setIsDeleteDialogOpen(false);
    setEmployeeToDelete(null);
  };

  // Handle CSV export
  const handleExportCSV = async () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    if (selectedRows.length === 0) {
      toast.error("No employees selected for export");
      return;
    }

    try {
      // Transform data for export with proper labels
      const employeesToExport = selectedRows.map((row) => {
        const employee = row.original;
        return {
          ...employee,
          role: EmployeeRoleLabels[employee.role] || employee.role,
          status: EmployeeStatusLabels[employee.status] || employee.status,
          createdAt: new Date(employee.createdAt).toLocaleDateString(),
        };
      });

      // Get employee IDs for audit log
      const employeeIds = selectedRows.map((row) => row.original.id);

      // Export with audit logging
      await exportToCSVWithAudit(
        employeesToExport,
        "employees",
        {
          module: "EMPLOYEES",
          organizationId: user?.organizationId || undefined,
          userId: user?.id || undefined,
          recordIds: employeeIds,
          description: `Exported ${selectedRows.length} employee(s) to CSV`,
        }
      );

      toast.success(`Exported ${selectedRows.length} employees successfully`);
    } catch (error) {
      toast.error("Failed to export employees");
      console.error("Export error:", error);
    }
  };

  // Check if action is available in module actions
  const canPerformAction = useMemo(() => {
    return (action: ActionType): boolean => {
      return moduleActions.includes(action);
    };
  }, [moduleActions]);

  // Table columns definition
  const columns = useMemo(
    () =>
      createEmployeeColumns({
        canPerformAction,
        onViewEmployee: handleViewEmployee,
        onEditEmployee: handleEditEmployee,
        onDeleteEmployee: handleDeleteClick,
      }),
    [canPerformAction]
  );

  const table = useReactTable({
    data: employees,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    // Server-side pagination configuration
    manualPagination: true,
    pageCount: totalPages,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination: {
        pageIndex: currentPage - 1, // TanStack Table uses 0-based indexing
        pageSize: pageSize,
      },
    },
    onPaginationChange: (updater) => {
      if (typeof updater === "function") {
        const newState = updater({
          pageIndex: currentPage - 1,
          pageSize: pageSize,
        });
        if (newState.pageSize !== pageSize) {
          setCurrentPage(1);
        } else {
          setCurrentPage(newState.pageIndex + 1);
        }
        setPageSize(newState.pageSize);
      } else {
        if (updater.pageSize !== pageSize) {
          setCurrentPage(1);
        } else {
          setCurrentPage(updater.pageIndex + 1);
        }
        setPageSize(updater.pageSize);
      }
    },
  });

  return (
    <div className="w-full p-4">
      <div className="space-y-4">
        {/* Actions - Always visible */}
        <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
          {/* Search and Filters - Always visible when not loading */}
          {!loading && (
            <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-x-2 sm:space-y-0">
              <Input
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(event) => handleSearchChange(event.target.value)}
                className="w-full sm:max-w-sm"
              />
              <Select
                value={statusFilter}
                onValueChange={handleStatusFilterChange}
              >
                <SelectTrigger className="w-full sm:w-[180px] cursor-pointer">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="cursor-pointer">
                    All Status
                  </SelectItem>
                  <SelectItem
                    value={EmployeeStatus.ACTIVE}
                    className="cursor-pointer"
                  >
                    Active
                  </SelectItem>
                  <SelectItem
                    value={EmployeeStatus.INACTIVE}
                    className="cursor-pointer"
                  >
                    Inactive
                  </SelectItem>
                  <SelectItem
                    value={EmployeeStatus.SUSPENDED}
                    className="cursor-pointer"
                  >
                    Suspended
                  </SelectItem>
                </SelectContent>
              </Select>
              <Select value={roleFilter} onValueChange={handleRoleFilterChange}>
                <SelectTrigger className="w-full sm:w-[180px] cursor-pointer">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="cursor-pointer">
                    All Roles
                  </SelectItem>
                  <SelectItem
                    value={EmployeeRole.INSTRUCTOR}
                    className="cursor-pointer"
                  >
                    Instructor
                  </SelectItem>
                  <SelectItem
                    value={EmployeeRole.OPERATOR}
                    className="cursor-pointer"
                  >
                    Operator
                  </SelectItem>
                  <SelectItem
                    value={EmployeeRole.ADMIN}
                    className="cursor-pointer"
                  >
                    Admin
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Action buttons - Always visible */}
          <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-x-2 sm:space-y-0">
            {!loading && totalItems > 0 && (
              <>
                <DataTableViewOptions table={table} />
                {table.getFilteredSelectedRowModel().rows.length > 0 &&
                  canPerformAction(ActionType.READ) && (
                    <Button
                      variant="outline"
                      className="cursor-pointer"
                      onClick={handleExportCSV}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      <span className="hidden sm:inline">Export</span>
                      <span className="sm:hidden">Export</span>
                      <span className="ml-1">
                        ({table.getFilteredSelectedRowModel().rows.length})
                      </span>
                    </Button>
                  )}
              </>
            )}
            {canPerformAction(ActionType.CREATE) && (
              <Button
                className="cursor-pointer w-full sm:w-auto"
                onClick={handleAddEmployee}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Add Employee</span>
                <span className="sm:hidden">Add</span>
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="rounded-md border">
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="mt-2 text-sm text-muted-foreground">
                Loading employees...
              </p>
            </div>
          </div>
        ) : totalItems === 0 ? (
          <NoDataState
            title={
              debouncedSearchTerm ||
              statusFilter !== "all" ||
              roleFilter !== "all"
                ? "No Employees Found"
                : "No Employees Available"
            }
            description={
              debouncedSearchTerm ||
              statusFilter !== "all" ||
              roleFilter !== "all"
                ? "No employees match your current search criteria. Try adjusting your search term or filters."
                : "There are no employees in the system yet. Use the Add Employee button above to add your first employee."
            }
            showAction={false}
          />
        ) : (
          <>
            <DataTable columns={columns} table={table} />
            <div className="mt-4">
              <DataTablePagination table={table} />
            </div>
          </>
        )}
      </div>

      {/* Employee Modal */}
      <EmployeeModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        employee={selectedEmployee}
        onSuccess={handleModalSuccess}
        isReadOnly={isViewMode}
        userCenterId={user?.centerId}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDeleteDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        itemName={employeeToDelete?.name}
        itemType="employee"
      />
    </div>
  );
}
