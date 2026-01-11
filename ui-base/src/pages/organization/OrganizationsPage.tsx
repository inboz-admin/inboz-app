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
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Building2, Download } from "lucide-react";
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
import type { Organization } from "@/api/organizationTypes";
import {
  OrganizationStatus,
  OrganizationStatusLabels,
} from "@/api/organizationTypes";
import { organizationService } from "@/api/organizationService";
import { roleService } from "@/api/roleService";
import { ActionType, ModuleName } from "@/api/roleTypes";
import { toast } from "sonner";
import OrganizationModal from "./OrganizationModal";
import { useAppStore } from "@/stores/appStore";
import { createOrganizationColumns } from "./columns";
import {
  DataTable,
  DataTableViewOptions,
  DataTablePagination,
} from "@/components/common";
import { exportToCSVWithAudit } from "@/utils/csvExport";
import { NoDataState } from "@/components/common/NoDataState";

export function OrganizationsPage() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrganization, setSelectedOrganization] =
    useState<Organization | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);
  // Commented out delete organization functionality
  // const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  // const [organizationToDelete, setOrganizationToDelete] =
  //   useState<Organization | null>(null);

  const [moduleActions, setModuleActions] = useState<ActionType[]>([]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);

  // Get user data from store
  const { user, selectedOrganizationId } = useAppStore();
  const isEmployee = user?.type === 'employee';

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

  // Fetch organizations data on component mount and when pagination/filters change
  useEffect(() => {
    let isCancelled = false;

    const fetchOrganizations = async () => {
      try {
        setLoading(true);
        // For employees: apiService will automatically add selectedOrganizationId if set
        // For regular users: backend will filter by organizationId from JWT (no need to pass it)
        // The organizationService.getOrganizations intentionally doesn't pass organizationId
        // to avoid filtering when we want all organizations (for employees)
        const response = await organizationService.getOrganizations({
          page: currentPage,
          limit: pageSize,
          search: debouncedSearchTerm || undefined,
          status: statusFilter !== "all" ? (statusFilter as any) : undefined,
          // Don't pass organizationId - backend handles filtering:
          // - For regular users: filters by organizationId from JWT
          // - For employees: filters by selectedOrganizationId from query param (if set, via apiService)
        });

        // Only update state if component is still mounted
        if (!isCancelled) {
          if (response.success && response.data) {
            setOrganizations(response.data.data);
            setTotalPages(response.data.totalPages);
            setTotalItems(response.data.total);
          } else {
            setOrganizations([]);
            setTotalPages(0);
            setTotalItems(0);
          }
        }
      } catch {
        // Only show error if component is still mounted
        if (!isCancelled) {
          setOrganizations([]);
          setTotalPages(0);
          setTotalItems(0);
          toast.error("Error loading organizations");
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    fetchOrganizations();

    // Cleanup function to prevent state updates on unmounted component
    return () => {
      isCancelled = true;
    };
  }, [currentPage, pageSize, debouncedSearchTerm, statusFilter]); // Only run on mount

  // Fetch module actions when user is available
  useEffect(() => {
    let isCancelled = false;

    const fetchModuleActions = async () => {
      if (!user?.role) {
        if (!isCancelled) {
          setModuleActions([]);
        }
        return;
      }

      try {
        const response = await roleService.getRoleActions(
          user.role,
          ModuleName.ORGANIZATION
        );

        // Only update state if component is still mounted
        if (!isCancelled) {
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
        }
      } catch (error) {
        if (!isCancelled) {
          setModuleActions([]);
          toast.error(
            `Failed to fetch module actions: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          );
        }
      }
    };

    fetchModuleActions();

    // Cleanup function to prevent state updates on unmounted component
    return () => {
      isCancelled = true;
    };
  }, [user?.role]); // Only run when user.role changes, not the entire user object

  // Refresh organizations data
  const refreshOrganizations = async () => {
    try {
      setLoading(true);
      // For employees: apiService will automatically add selectedOrganizationId if set
      // For regular users: backend will filter by organizationId from JWT (no need to pass it)
      const response = await organizationService.getOrganizations({
        page: currentPage,
        limit: pageSize,
        search: debouncedSearchTerm || undefined,
        status: statusFilter !== "all" ? (statusFilter as any) : undefined,
        // Don't pass organizationId - backend handles filtering:
        // - For regular users: filters by organizationId from JWT
        // - For employees: filters by selectedOrganizationId from query param (if set, via apiService)
      });

      if (response.success && response.data) {
        setOrganizations(response.data.data);
        setTotalPages(response.data.totalPages);
        setTotalItems(response.data.total);
      } else {
        setOrganizations([]);
        setTotalPages(0);
        setTotalItems(0);
      }
    } catch {
      setOrganizations([]);
      setTotalPages(0);
      setTotalItems(0);
      toast.error("Error refreshing organizations data");
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

  // Handle opening modal for adding new organization
  const handleAddOrganization = () => {
    setSelectedOrganization(null);
    setIsModalOpen(true);
  };

  // Handle opening modal for editing organization
  const handleEditOrganization = (organization: Organization) => {
    setSelectedOrganization(organization);
    setIsViewMode(false);
    setIsModalOpen(true);
  };

  // Handle opening modal for viewing organization details
  const handleViewOrganization = (organization: Organization) => {
    setSelectedOrganization(organization);
    setIsViewMode(true);
    setIsModalOpen(true);
  };

  // Handle closing modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedOrganization(null);
    setIsViewMode(false);
  };

  // Handle successful form submission
  const handleModalSuccess = () => {
    refreshOrganizations();
  };

  // Commented out delete organization functionality
  // // Handle delete confirmation
  // const handleDeleteClick = (organization: Organization) => {
  //   setOrganizationToDelete(organization);
  //   setIsDeleteDialogOpen(true);
  // };

  // // Handle confirmed delete
  // const handleConfirmDelete = async () => {
  //   if (!organizationToDelete) return;

  //   try {
  //     const response = await organizationService.deleteOrganization(
  //       organizationToDelete.id,
  //       user?.organizationId
  //     );
  //     if (response.success) {
  //       toast.success("Organization deleted successfully");
  //       refreshOrganizations();
  //     } else {
  //       toast.error("Failed to delete organization");
  //     }
  //   } catch {
  //     toast.error("Error deleting organization");
  //   } finally {
  //     setIsDeleteDialogOpen(false);
  //     setOrganizationToDelete(null);
  //   }
  // };

  // // Handle cancel delete
  // const handleCancelDelete = () => {
  //   setIsDeleteDialogOpen(false);
  //   setOrganizationToDelete(null);
  // };

  // Handle CSV export
  const handleExportCSV = async () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    if (selectedRows.length === 0) {
      toast.error("No organizations selected for export");
      return;
    }

    try {
      // Transform data for export with proper labels
      const organizationsToExport = selectedRows.map((row) => {
        const org = row.original;
        return {
          ...org,
          status: OrganizationStatusLabels[org.status] || org.status,
          createdAt: new Date(org.createdAt).toLocaleDateString(),
        };
      });

      // Get organization IDs for audit log
      const organizationIds = selectedRows.map((row) => row.original.id);

      // Export with audit logging
      await exportToCSVWithAudit(
        organizationsToExport,
        "organizations",
        {
          module: "ORGANIZATIONS",
          organizationId: user?.organizationId || undefined,
          userId: user?.id || undefined,
          recordIds: organizationIds,
          description: `Exported ${selectedRows.length} organization(s) to CSV`,
        }
      );

      toast.success(
        `Exported ${selectedRows.length} organizations successfully`
      );
    } catch (error) {
      toast.error("Failed to export organizations");
      console.error("Export error:", error);
    }
  };

  // Check if action is available in module actions
  const canPerformAction = useMemo(() => {
    return (action: ActionType): boolean => {
      return moduleActions.includes(action);
    };
  }, [moduleActions]);

  // Server-side filtering is handled by the API, no need for client-side filtering

  // Table columns definition
  const columns = useMemo(
    () =>
      createOrganizationColumns({
        canPerformAction,
        onViewOrganization: handleViewOrganization,
        onEditOrganization: handleEditOrganization,
        onDeleteOrganization: () => {}, // Disabled delete functionality
      }),
    [canPerformAction]
  );

  // Table instance
  const table = useReactTable({
    data: organizations,
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
    <div className="w-full">
      <div className="space-y-4 p-4">
        {/* Filters and Actions */}
        <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
          {/* Search and Filters - Always visible when not loading */}
          {!loading && (
            <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-x-2 sm:space-y-0">
              <Input
                placeholder="Search organizations..."
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
                    All
                  </SelectItem>
                  <SelectItem
                    value={OrganizationStatus.ACTIVE}
                    className="cursor-pointer"
                  >
                    Active
                  </SelectItem>
                  <SelectItem
                    value={OrganizationStatus.INACTIVE}
                    className="cursor-pointer"
                  >
                    Inactive
                  </SelectItem>
                  <SelectItem
                    value={OrganizationStatus.SUSPENDED}
                    className="cursor-pointer"
                  >
                    Suspended
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-x-2 sm:space-y-0">
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
            {canPerformAction(ActionType.CREATE) && (
              <Button
                className="cursor-pointer w-full sm:w-auto"
                onClick={handleAddOrganization}
              >
                <Building2 className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Add Organization</span>
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
                Loading organizations...
              </p>
            </div>
          </div>
        ) : totalItems === 0 ? (
          <NoDataState
            title={
              debouncedSearchTerm || statusFilter !== "all"
                ? "No Organizations Found"
                : "No Organizations Available"
            }
            description={
              debouncedSearchTerm || statusFilter !== "all"
                ? "No organizations match your current search criteria. Try adjusting your search term or filters."
                : "There are no organizations in the system yet. Use the Add Organization button above to add your first organization."
            }
            showAction={false}
          />
        ) : (
          <div className="flex flex-col" style={{ maxHeight: 'calc(100vh - 150px)' }}>
            <div className="overflow-auto flex-1">
              <DataTable columns={columns} table={table} />
            </div>
            <div className="mt-4 flex-shrink-0">
              <DataTablePagination table={table} totalCount={totalItems} />
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      <OrganizationModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        organization={selectedOrganization}
        onSuccess={handleModalSuccess}
        isReadOnly={isViewMode}
        userOrganizationId={user?.organizationId}
      />

      {/* Delete Confirmation Dialog */}
      {/* Commented out delete organization dialog */}
      {/* <ConfirmDeleteDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        itemName={organizationToDelete?.name}
        itemType="organization"
      /> */}
    </div>
  );
}
