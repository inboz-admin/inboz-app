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
import type { User } from "@/api/userTypes";
import {
  UserRole,
  UserStatus,
  UserRoleLabels,
  UserStatusLabels,
} from "@/api/userTypes";
import { userService } from "@/api/userService";
import { roleService } from "@/api/roleService";
import { ActionType, ModuleName } from "@/api/roleTypes";
import { toast } from "sonner";
import UserModal from "./UserModal";
import InviteUserModal from "./InviteUserModal";
import UserQuotaCalendarModal from "./UserQuotaCalendarModal";
import { useAppStore } from "@/stores/appStore";
import { createUserColumns } from "./columns";
import { exportToCSVWithAudit } from "@/utils/csvExport";
import { NoDataState } from "@/components/common/NoDataState";

export default function UsersPage() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isQuotaModalOpen, setIsQuotaModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedUserForQuota, setSelectedUserForQuota] = useState<User | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const [moduleActions, setModuleActions] = useState<ActionType[]>([]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);

  // Get user data from store
  const { user, selectedOrganizationId } = useAppStore();
  
  // For employees, use selectedOrganizationId; for regular users, use organizationId
  const getOrganizationId = () => {
    if (user?.type === 'employee') {
      // For employees, use selectedOrganizationId if set, otherwise undefined (shows all)
      return selectedOrganizationId || undefined;
    }
    // For regular users, use their organizationId
    return user?.organizationId;
  };

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

  // Fetch users data on component mount and when pagination/filters change
  useEffect(() => {
    let isCancelled = false;

    const fetchUsers = async () => {
      try {
        setLoading(true);
        const response = await userService.getUsers({
          page: currentPage,
          limit: pageSize,
          search: debouncedSearchTerm || undefined,
          status:
            statusFilter !== "all" ? (statusFilter as UserStatus) : undefined,
          role: roleFilter !== "all" ? (roleFilter as UserRole) : undefined,
          // Don't pass organizationId - backend will filter by selectedOrganizationId from JWT for employees
          // For regular users, backend will filter by organizationId from JWT
        });

        // Only update state if component is still mounted
        if (!isCancelled) {
          if (response.success && response.data) {
            setUsers(response.data.data);
            setTotalPages(response.data.totalPages);
            setTotalItems(response.data.total);
          } else {
            setUsers([]);
            setTotalPages(0);
            setTotalItems(0);
          }
        }
      } catch {
        // Fallback to sample data on error
        if (!isCancelled) {
          setUsers([]);
          setTotalPages(0);
          setTotalItems(0);
          toast.error("Error loading users, using sample data");
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    fetchUsers();

    return () => {
      isCancelled = true;
    };
  }, [
    currentPage,
    pageSize,
    debouncedSearchTerm,
    statusFilter,
    roleFilter,
    user?.type,
    selectedOrganizationId,
    user?.organizationId,
  ]);

  // Fetch module actions when user is available
  useEffect(() => {
    const fetchModuleActions = async () => {
      if (!user?.role) {
        return;
      }

      try {
        const response = await roleService.getRoleActions(
          user.role,
          ModuleName.USER
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
  }, [user]);

  // Refresh users data
  const refreshUsers = async () => {
    try {
      setLoading(true);
      const response = await userService.getUsers({
        page: currentPage,
        limit: pageSize,
        search: searchTerm || undefined,
        status:
          statusFilter !== "all" ? (statusFilter as UserStatus) : undefined,
        role: roleFilter !== "all" ? (roleFilter as UserRole) : undefined,
        // Don't pass organizationId - backend will filter by selectedOrganizationId from JWT for employees
        // For regular users, backend will filter by organizationId from JWT
      });

      if (response.success && response.data) {
        setUsers(response.data.data);
        setTotalPages(response.data.totalPages);
        setTotalItems(response.data.total);
      } else {
        setUsers([]);
        setTotalPages(0);
        setTotalItems(0);
      }
    } catch {
      setUsers([]);
      setTotalPages(0);
      setTotalItems(0);
      toast.error("Error refreshing users data");
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

  // Handle opening modal for inviting new user
  const handleAddUser = () => {
    setIsInviteModalOpen(true);
  };

  // Handle opening modal for editing user
  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setIsViewMode(false);
    setIsModalOpen(true);
  };

  // Handle opening modal for viewing user details
  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setIsViewMode(true);
    setIsModalOpen(true);
  };

  // Handle closing modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
    setIsViewMode(false);
  };

  // Handle closing invite modal
  const handleCloseInviteModal = () => {
    setIsInviteModalOpen(false);
  };

  // Handle successful form submission
  const handleModalSuccess = () => {
    refreshUsers();
  };

  // Handle delete confirmation
  const handleDeleteClick = (user: User) => {
    setUserToDelete(user);
    setIsDeleteDialogOpen(true);
  };

  // Handle confirmed delete
  const handleConfirmDelete = async () => {
    if (!userToDelete) return;

    try {
      const response = await userService.deleteUser(
        userToDelete.id,
        getOrganizationId()
      );

      if (response.success) {
        toast.success("User deleted successfully");
        refreshUsers();
      } else {
        toast.error("Failed to delete user");
      }
    } catch {
      toast.error("Failed to delete user");
    } finally {
      setIsDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  };

  // Handle cancel delete
  const handleCancelDelete = () => {
    setIsDeleteDialogOpen(false);
    setUserToDelete(null);
  };

  // Handle opening quota usage modal
  const handleViewQuotaUsage = (user: User) => {
    setSelectedUserForQuota(user);
    setIsQuotaModalOpen(true);
  };

  // Handle closing quota modal
  const handleCloseQuotaModal = () => {
    setIsQuotaModalOpen(false);
    setSelectedUserForQuota(null);
  };

  // Check if current user can view quota usage
  // Only ADMIN, SUPERADMIN, and SUPPORT (employee) roles can view quota
  const canViewQuotaUsage = useMemo(() => {
    if (!user) return false;
    const userRole = user.role?.toUpperCase();
    const userType = user.type;
    
    return (
      userRole === "ADMIN" ||
      userRole === "SUPERADMIN" ||
      (userType === "employee" && userRole === "SUPPORT")
    );
  }, [user]);

  // Handle CSV export
  const handleExportCSV = async () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    if (selectedRows.length === 0) {
      toast.error("No users selected for export");
      return;
    }

    try {
      // Transform data for export with proper labels
      const usersToExport = selectedRows.map((row) => {
        const user = row.original;
        return {
          ...user,
          name: user.firstName || user.lastName 
            ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
            : "NA",
          role: UserRoleLabels[user.role] || user.role,
          status: UserStatusLabels[user.status] || user.status,
          createdAt: new Date(user.createdAt).toLocaleDateString(),
        };
      });

      // Get user IDs for audit log
      const userIds = selectedRows.map((row) => row.original.id);

      // Export with audit logging
      await exportToCSVWithAudit(
        usersToExport,
        "users",
        {
          module: "USERS",
          organizationId: user?.organizationId || undefined,
          userId: user?.id || undefined,
          recordIds: userIds,
          description: `Exported ${selectedRows.length} user(s) to CSV`,
        }
      );

      toast.success(`Exported ${selectedRows.length} users successfully`);
    } catch (error) {
      toast.error("Failed to export users");
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
      createUserColumns({
        canPerformAction,
        onViewUser: handleViewUser,
        onEditUser: handleEditUser,
        onDeleteUser: handleDeleteClick,
        onViewQuotaUsage: handleViewQuotaUsage,
        canViewQuotaUsage,
      }),
    [canPerformAction, canViewQuotaUsage]
  );

  const table = useReactTable({
    data: users,
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
                placeholder="Search users..."
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
                    value={UserStatus.ACTIVE}
                    className="cursor-pointer"
                  >
                    Active
                  </SelectItem>
                  <SelectItem
                    value={UserStatus.INACTIVE}
                    className="cursor-pointer"
                  >
                    Inactive
                  </SelectItem>
                  <SelectItem
                    value={UserStatus.SUSPENDED}
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
                  <SelectItem value={UserRole.USER} className="cursor-pointer">
                    User
                  </SelectItem>
                  <SelectItem value={UserRole.ADMIN} className="cursor-pointer">
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
                onClick={handleAddUser}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Invite User</span>
                <span className="sm:hidden">Invite</span>
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="rounded-md border">
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="mt-2 text-sm text-muted-foreground">
                Loading users...
              </p>
            </div>
          </div>
        ) : totalItems === 0 ? (
          <NoDataState
            title={
              debouncedSearchTerm ||
              statusFilter !== "all" ||
              roleFilter !== "all"
                ? "No Users Found"
                : "No Users Available"
            }
            description={
              debouncedSearchTerm ||
              statusFilter !== "all" ||
              roleFilter !== "all"
                ? "No users match your current search criteria. Try adjusting your search term or filters."
                : "There are no users in the system yet. Use the Add User button above to add your first user."
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

      {/* User Modal */}
      <UserModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        user={selectedUser}
        onSuccess={handleModalSuccess}
        isReadOnly={isViewMode}
        userOrganizationId={getOrganizationId()}
      />

      {/* Invite User Modal */}
      <InviteUserModal
        isOpen={isInviteModalOpen}
        onClose={handleCloseInviteModal}
        onSuccess={handleModalSuccess}
        userOrganizationId={getOrganizationId()}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDeleteDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        itemName={userToDelete?.firstName || userToDelete?.lastName
          ? `${userToDelete?.firstName || ""} ${userToDelete?.lastName || ""}`.trim()
          : "NA"}
        itemType="user"
      />

      {/* Quota Usage Calendar Modal */}
      <UserQuotaCalendarModal
        isOpen={isQuotaModalOpen}
        onClose={handleCloseQuotaModal}
        user={selectedUserForQuota}
      />
    </div>
  );
}
