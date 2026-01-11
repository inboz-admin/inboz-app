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
import { Download } from "lucide-react";
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
import type { AuditLog } from "@/api/auditTypes";
import {
  AuditAction,
  AuditModule,
  AuditActionLabels,
  AuditModuleLabels,
} from "@/api/auditTypes";

// Filtered module labels - only show relevant modules for email campaign tool (inboz)
// Remove student-related modules: STUDENT, COURSE, COHORT, ENROLLMENT, ENQUIRY, FEEDBACK, CENTER, PAYMENT
// Add email campaign tool related modules
const RelevantAuditModules = [
  AuditModule.AUTH,
  AuditModule.ORGANIZATION,
  AuditModule.EMPLOYEE,
  AuditModule.AUDIT,
] as const;

const FilteredAuditModuleLabels: Record<string, string> = {};
RelevantAuditModules.forEach((module) => {
  FilteredAuditModuleLabels[module] = AuditModuleLabels[module];
});

// Add email campaign tool (inboz) related modules
// Using canonical module names to avoid duplicates in dropdown
const InbozModules: Record<string, string> = {
  'CAMPAIGNS': 'Campaign',
  'CONTACTS': 'Contact',
  'CONTACTLISTS': 'Contact List',
  'TEMPLATES': 'Email Template',
  'SUBSCRIPTIONS': 'Subscription',
  'INVOICES': 'Invoice',
  'NOTIFICATIONS': 'Notification',
  'USERS': 'User',
};

// Merge inboz modules into filtered labels
Object.assign(FilteredAuditModuleLabels, InbozModules);

import { auditLogService } from "@/api/auditService";
import { roleService } from "@/api/roleService";
import { ActionType, ModuleName } from "@/api/roleTypes";
import { toast } from "sonner";
import AuditLogModal from "./AuditLogModal";
import { useAppStore } from "@/stores/appStore";
import { createAuditLogColumns } from "./columns";
import { exportToCSVWithAudit } from "@/utils/csvExport";
import { NoDataState } from "@/components/common/NoDataState";

export default function AuditLogsPage() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [moduleFilter, setModuleFilter] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAuditLog, setSelectedAuditLog] = useState<AuditLog | null>(
    null
  );

  const [moduleActions, setModuleActions] = useState<ActionType[]>([]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalPages, setTotalPages] = useState(0);

  // Get user data from store
  const { user } = useAppStore();

  // Fetch audit logs data on component mount and when pagination/filters change
  useEffect(() => {
    let isCancelled = false;

    const fetchAuditLogs = async () => {
      try {
        setLoading(true);
        const response = await auditLogService.getAuditLogs({
          page: currentPage,
          limit: pageSize,
          search: searchTerm || undefined,
          action: actionFilter !== "all" ? (actionFilter as any) : undefined,
          module: moduleFilter !== "all" ? (moduleFilter as any) : undefined,
          organizationId: user?.organizationId,
        });

        // Only update state if component is still mounted
        if (!isCancelled) {
          if (response.success && response.data) {
            setAuditLogs(response.data.data);
            setTotalPages(response.data.totalPages);
          } else {
            setAuditLogs([]);
            setTotalPages(0);
          }
        }
      } catch {
        // Fallback to empty array on error
        if (!isCancelled) {
          setAuditLogs([]);
          setTotalPages(0);
          toast.error("Error loading audit logs, using sample data");
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    fetchAuditLogs();

    return () => {
      isCancelled = true;
    };
  }, [currentPage, pageSize, searchTerm, actionFilter, moduleFilter]);

  // Fetch module actions when user is available
  useEffect(() => {
    const fetchModuleActions = async () => {
      if (!user?.role) {
        return;
      }

      try {
        const response = await roleService.getRoleActions(
          user.role, // Use role name instead of user ID
          ModuleName.AUDITLOGS
        );

        if (response.success && response.data) {
          setModuleActions(response.data.actions || []);
        } else {
          setModuleActions([]);
        }
      } catch {
        setModuleActions([]);
      }
    };

    fetchModuleActions();
  }, [user]);

  // Handle opening modal for viewing audit log
  const handleViewAuditLog = (auditLog: AuditLog) => {
    setSelectedAuditLog(auditLog);
    setIsModalOpen(true);
  };

  // Handle closing modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedAuditLog(null);
  };

  // Check if action is available in module actions
  const canPerformAction = useMemo(() => {
    return (action: ActionType): boolean => {
      return moduleActions.includes(action);
    };
  }, [moduleActions]);

  // Handle search change
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1); // Reset to first page when searching
  };

  // Handle action filter change
  const handleActionFilterChange = (value: string) => {
    setActionFilter(value);
    setCurrentPage(1); // Reset to first page when filtering
  };

  // Handle module filter change
  const handleModuleFilterChange = (value: string) => {
    setModuleFilter(value);
    setCurrentPage(1); // Reset to first page when filtering
  };

  // CSV Export functionality
  const handleExportCSV = async () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    if (selectedRows.length === 0) {
      toast.error("No audit logs selected for export");
      return;
    }

    try {
      // Transform data for export with proper labels
      const auditLogsToExport = selectedRows.map((row) => {
        const auditLog = row.original;
        return {
          Action: AuditActionLabels[auditLog.action] || auditLog.action,
          Module: AuditModuleLabels[auditLog.module] || auditLog.module,
          "Performed By": auditLog.performedByUser?.name || auditLog.performedByUser?.email || "System",
          Description: auditLog.description || "",
          "Event Date": new Date(auditLog.eventTimestamp).toLocaleDateString(),
        };
      });

      // Get audit log IDs for audit log
      const auditLogIds = selectedRows.map((row) => row.original.id);

      // Export with audit logging
      await exportToCSVWithAudit(
        auditLogsToExport,
        "audit-logs",
        {
          module: "AUDIT_LOGS",
          organizationId: user?.organizationId || undefined,
          userId: user?.id || undefined,
          recordIds: auditLogIds,
          description: `Exported ${selectedRows.length} audit log(s) to CSV`,
        }
      );

      toast.success("Audit log data exported successfully");
    } catch (error) {
      toast.error("Failed to export audit log data");
      console.error("Export error:", error);
    }
  };

  // Table columns definition
  const columns = useMemo(
    () =>
      createAuditLogColumns({
        canPerformAction,
        onViewAuditLog: handleViewAuditLog,
      }),
    [canPerformAction]
  );

  // Filter audit logs based on search term and filters

  const table = useReactTable({
    data: auditLogs,
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
      <div>
        {/* Actions - Always visible */}
        <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
          {/* Search and Filters - Always visible when not loading */}
          {!loading && (
            <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-x-4 sm:space-y-0">
              <div className="flex items-center space-x-2">
                <Input
                  placeholder="Search audit logs..."
                  value={searchTerm}
                  onChange={(event) => handleSearchChange(event.target.value)}
                  className="max-w-sm"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Select
                  value={actionFilter}
                  onValueChange={handleActionFilterChange}
                >
                  <SelectTrigger className="w-[140px] cursor-pointer">
                    <SelectValue placeholder="Filter by action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    {Object.entries(AuditActionLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={moduleFilter}
                  onValueChange={handleModuleFilterChange}
                >
                  <SelectTrigger className="w-[140px] cursor-pointer">
                    <SelectValue placeholder="Filter by module" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Modules</SelectItem>
                    {Object.entries(FilteredAuditModuleLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Action buttons - Only show when data exists */}
          {!loading && auditLogs.length > 0 && (
            <div className="flex items-center space-x-2">
              <Button
                onClick={handleExportCSV}
                variant="outline"
                size="sm"
                disabled={table.getFilteredSelectedRowModel().rows.length === 0}
                className="cursor-pointer disabled:cursor-not-allowed"
              >
                <Download className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Export CSV</span>
                <span className="sm:hidden">Export</span>
              </Button>
              <DataTableViewOptions table={table} />
            </div>
          )}
        </div>

        {/* Data Table */}
        <div className="mt-4">
          {loading ? (
            <div className="rounded-md border">
              <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Loading audit logs...
                </p>
              </div>
            </div>
          ) : auditLogs.length === 0 ? (
            <NoDataState
              title={
                searchTerm || actionFilter !== "all" || moduleFilter !== "all"
                  ? "No Audit Logs Found"
                  : "No Audit Logs Available"
              }
              description={
                searchTerm || actionFilter !== "all" || moduleFilter !== "all"
                  ? "No audit logs match your current search criteria. Try adjusting your search term or filters."
                  : "There are no audit logs in the system yet. Audit logs will appear here as users perform actions in the system."
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
      </div>

      {/* Audit Log Modal */}
      {selectedAuditLog && (
        <AuditLogModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          auditLog={selectedAuditLog}
        />
      )}
    </div>
  );
}
