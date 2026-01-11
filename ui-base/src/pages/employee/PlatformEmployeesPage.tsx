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
import { UserPlus } from "lucide-react";
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
import type {
  PlatformEmployee,
  PlatformEmployeeRole,
  PlatformEmployeeStatus,
} from "@/api";
import {
  PlatformEmployeeRoleLabels,
  PlatformEmployeeStatusLabels,
  platformEmployeeService,
} from "@/api";
import { toast } from "sonner";
import { useAppStore } from "@/stores/appStore";
import { createPlatformEmployeeColumns } from "./platformEmployeeColumns";
import { NoDataState } from "@/components/common/NoDataState";
import PlatformEmployeeModal from "./PlatformEmployeeModal";

export function PlatformEmployeesPage() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [employees, setEmployees] = useState<PlatformEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<PlatformEmployee | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<PlatformEmployee | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);

  // Get user data from store
  const { user } = useAppStore();
  const isSuperAdmin = user?.role === "SUPERADMIN" && user?.type === "employee";

  // Debounce search term
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

  // Fetch employees data
  useEffect(() => {
    let isCancelled = false;

    const fetchEmployees = async () => {
      try {
        setLoading(true);
        const response = await platformEmployeeService.getEmployees({
          page: currentPage,
          limit: pageSize,
          search: debouncedSearchTerm || undefined,
          status: statusFilter !== "all" ? (statusFilter as PlatformEmployeeStatus) : undefined,
          role: roleFilter !== "all" ? (roleFilter as PlatformEmployeeRole) : undefined,
        });

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
        if (!isCancelled) {
          setEmployees([]);
          setTotalPages(0);
          setTotalItems(0);
          toast.error("Error loading platform employees");
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
  }, [currentPage, pageSize, debouncedSearchTerm, statusFilter, roleFilter]);

  // Handler functions - defined before useReactTable to avoid initialization errors
  const handleAddEmployee = () => {
    setSelectedEmployee(null);
    setIsModalOpen(true);
  };

  const handleEditEmployee = (employee: PlatformEmployee) => {
    setSelectedEmployee(employee);
    setIsViewMode(false);
    setIsModalOpen(true);
  };

  const handleViewEmployee = (employee: PlatformEmployee) => {
    setSelectedEmployee(employee);
    setIsViewMode(true);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (employee: PlatformEmployee) => {
    setEmployeeToDelete(employee);
    setIsDeleteDialogOpen(true);
  };

  const columns = useMemo(
    () =>
      createPlatformEmployeeColumns({
        isSuperAdmin,
        onView: handleViewEmployee,
        onEdit: handleEditEmployee,
        onDelete: handleDeleteClick,
      }),
    [isSuperAdmin]
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

  const refreshEmployees = async () => {
    try {
      setLoading(true);
      const response = await platformEmployeeService.getEmployees({
        page: currentPage,
        limit: pageSize,
        search: debouncedSearchTerm || undefined,
        status: statusFilter !== "all" ? (statusFilter as PlatformEmployeeStatus) : undefined,
        role: roleFilter !== "all" ? (roleFilter as PlatformEmployeeRole) : undefined,
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

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const handleRoleFilterChange = (value: string) => {
    setRoleFilter(value);
    setCurrentPage(1);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedEmployee(null);
    setIsViewMode(false);
  };

  const handleModalSuccess = () => {
    refreshEmployees();
  };

  const handleConfirmDelete = async () => {
    if (!employeeToDelete) return;

    try {
      const response = await platformEmployeeService.deleteEmployee(employeeToDelete.id);
      if (response.success) {
        toast.success("Employee deleted successfully");
        refreshEmployees();
      } else {
        toast.error("Failed to delete employee");
      }
    } catch {
      toast.error("Error deleting employee");
    } finally {
      setIsDeleteDialogOpen(false);
      setEmployeeToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setIsDeleteDialogOpen(false);
    setEmployeeToDelete(null);
  };

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
                value={roleFilter}
                onValueChange={handleRoleFilterChange}
              >
                <SelectTrigger className="w-full sm:w-[180px] cursor-pointer">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="cursor-pointer">
                    All Roles
                  </SelectItem>
                  {Object.entries(PlatformEmployeeRoleLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value} className="cursor-pointer">
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                  {Object.entries(PlatformEmployeeStatusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value} className="cursor-pointer">
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Action buttons - Always visible */}
          <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-x-2 sm:space-y-0">
            {!loading && totalItems > 0 && (
              <DataTableViewOptions table={table} />
            )}
            {isSuperAdmin && (
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
                : "There are no platform employees in the system yet. Use the Add Employee button above to add your first employee."
            }
            showAction={false}
          />
        ) : (
          <div className="flex flex-col" style={{ maxHeight: 'calc(100vh - 150px)' }}>
            <div className="overflow-auto flex-1">
              <DataTable table={table} />
            </div>
            <div className="mt-4 flex-shrink-0">
              <DataTablePagination table={table} totalCount={totalItems} />
            </div>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <ConfirmDeleteDialog
          isOpen={isDeleteDialogOpen}
          onClose={handleCancelDelete}
          onConfirm={handleConfirmDelete}
          title="Delete Employee"
          description={`Are you sure you want to delete ${employeeToDelete?.email}? This action cannot be undone.`}
        />

        {/* Employee Modal */}
        <PlatformEmployeeModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          employee={selectedEmployee}
          isReadOnly={isViewMode}
          onSuccess={handleModalSuccess}
        />
      </div>
    </div>
  );
}

