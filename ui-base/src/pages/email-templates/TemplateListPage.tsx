"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
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
import { FileText, Plus, Copy, Trash2, Eye, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDeleteDialog } from "@/components/common";
import {
  DataTable,
  DataTableViewOptions,
  DataTablePagination,
} from "@/components/common";
import type { EmailTemplate } from "@/api/emailTemplateTypes";
import { EmailTemplateType } from "@/api/emailTemplateTypes";
import { emailTemplateService } from "@/api/emailTemplateService";
import { ActionType, ModuleName } from "@/api/roleTypes";
import { toast } from "sonner";
import EmailTemplateModal from "./EmailTemplateModal";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/stores/appStore";
import { createEmailTemplateColumns } from "./columns";
import { useOrganizationTimezone } from "@/hooks/useOrganizationTimezone";
import { NoDataState } from "@/components/common/NoDataState";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export default function TemplateListPage() {
  const navigate = useNavigate();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<EmailTemplate | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);

  const [moduleActions, setModuleActions] = useState<ActionType[]>([]);
  const { user, selectedOrganizationId } = useAppStore();

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
  }, [debouncedSearchTerm, categoryFilter, typeFilter]);

  // Fetch email templates function
  const fetchTemplates = useCallback(async () => {
    const isEmployee = user?.type === 'employee';
    
    // For employees: apiService will automatically add organizationId from store if selected
    // For regular users: require organizationId from user object
    if (!isEmployee && !user?.organizationId) return;
    
    try {
      setLoading(true);
      const response = await emailTemplateService.getTemplates({
        // For employees, don't pass organizationId - apiService handles it automatically
        // For regular users, pass organizationId from user object
        organizationId: !isEmployee ? user?.organizationId : undefined,
        searchTerm: debouncedSearchTerm || undefined,
        category: categoryFilter && categoryFilter !== "all" ? categoryFilter : undefined,
        type: typeFilter !== "all" ? (typeFilter as EmailTemplateType) : undefined,
        page: currentPage,
        limit: pageSize,
      });

      setEmailTemplates(response.data);
      setTotalPages(response.totalPages);
      setTotalItems(response.total);
    } catch (error) {
      console.error("Error fetching email templates:", error);
      toast.error("Failed to fetch email templates");
      setEmailTemplates([]);
      setTotalPages(0);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  }, [user?.organizationId, debouncedSearchTerm, categoryFilter, typeFilter, currentPage, pageSize, selectedOrganizationId, user?.type]);

  // Fetch email templates on mount and when dependencies change
  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Get module actions for RBAC
  useEffect(() => {
    const fetchModuleActions = async () => {
      if (!user?.role) {
        setModuleActions([]);
        return;
      }

      try {
        const response = await import("@/api/roleService").then((module) =>
          module.roleService.getRoleActions(user.role, ModuleName.TEMPLATE)
        );

        if (response.success && response.data) {
          setModuleActions(response.data.actions || []);
        } else {
          setModuleActions([]);
        }
      } catch (error) {
        setModuleActions([]);
      }
    };

    fetchModuleActions();
  }, [user]);

  const canPerformAction = useMemo(() => {
    return (action: ActionType): boolean => {
      return moduleActions.includes(action);
    };
  }, [moduleActions]);

  // Get organization timezone
  const timezone = useOrganizationTimezone();

  const columns = useMemo(
    () => createEmailTemplateColumns({
      onView: (template) => {
        setSelectedTemplate(template);
        setIsViewMode(true);
        setIsModalOpen(true);
      },
      onEdit: (template) => {
        setSelectedTemplate(template);
        setIsViewMode(false);
        setIsModalOpen(true);
      },
      onDelete: (template) => {
        setTemplateToDelete(template);
        setIsDeleteDialogOpen(true);
      },
      canPerformAction,
      timezone,
    }, timezone),
    [canPerformAction, timezone]
  );

  const table = useReactTable({
    data: emailTemplates,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    manualPagination: true,
    pageCount: totalPages,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination: {
        pageIndex: currentPage - 1,
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

  const handleCreate = () => {
    setSelectedTemplate(null);
    setIsViewMode(false);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedTemplate(null);
    setIsViewMode(false);
  };

  const handleModalSuccess = () => {
    fetchTemplates();
    handleModalClose();
  };

  const handleDelete = async () => {
    if (!templateToDelete) return;

    try {
      const response = await emailTemplateService.deleteTemplate(templateToDelete.id);
      if (response?.success) {
        toast.success("Template deleted successfully");
        fetchTemplates();
      } else {
        const errorMessage = response?.message || response?.error?.details || "Failed to delete template";
        toast.error(errorMessage as string);
      }
    } catch (error: any) {
      const errorMessage = error?.message || error?.response?.data?.message || "Failed to delete template";
      toast.error(errorMessage);
    } finally {
      setIsDeleteDialogOpen(false);
      setTemplateToDelete(null);
    }
  };

  const canCreate = moduleActions.includes(ActionType.CREATE);
  const canUpdate = moduleActions.includes(ActionType.UPDATE);
  const canDelete = moduleActions.includes(ActionType.DELETE);

  return (
    <>
      <div className="w-full p-4">
        <div className="space-y-4">
          {/* Actions */}
          <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
            {!loading && (
              <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-x-2 sm:space-y-0">
                <Input
                  placeholder="Search templates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full sm:max-w-sm"
                />
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="welcome">Welcome</SelectItem>
                    <SelectItem value="newsletter">Newsletter</SelectItem>
                    <SelectItem value="promotion">Promotion</SelectItem>
                    <SelectItem value="notification">Notification</SelectItem>
                    <SelectItem value="follow-up">Follow-up</SelectItem>
                    <SelectItem value="reminder">Reminder</SelectItem>
                    <SelectItem value="thank-you">Thank You</SelectItem>
                    <SelectItem value="invitation">Invitation</SelectItem>
                    <SelectItem value="announcement">Announcement</SelectItem>
                    <SelectItem value="survey">Survey</SelectItem>
                    <SelectItem value="onboarding">Onboarding</SelectItem>
                    <SelectItem value="support">Support</SelectItem>
                    <SelectItem value="sales">Sales</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="event">Event</SelectItem>
                    <SelectItem value="re-engagement">Re-engagement</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Templates" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Templates</SelectItem>
                    <SelectItem value="PUBLIC">Public</SelectItem>
                    <SelectItem value="PRIVATE">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-x-2 sm:space-y-0">
              {!loading && emailTemplates.length > 0 && (
                <DataTableViewOptions table={table} />
              )}
              {canCreate && (
                <Button
                  className="cursor-pointer w-full sm:w-auto"
                  onClick={handleCreate}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  <span>Create Template</span>
                </Button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="rounded-md border">
              <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Loading templates...
                </p>
              </div>
            </div>
          ) : emailTemplates.length === 0 ? (
            <NoDataState
              icon={<FileText className="h-12 w-12 text-muted-foreground" />}
              title="No email templates found"
              description=""
            />
          ) : (
            <div className="flex flex-col" style={{ maxHeight: 'calc(100vh - 150px)' }}>
              <div className="overflow-auto flex-1">
                <DataTable table={table} columns={columns} />
              </div>
              <div className="mt-4 flex-shrink-0">
                <DataTablePagination table={table} totalCount={totalItems} />
              </div>
            </div>
          )}
        </div>
      </div>

      <EmailTemplateModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        template={selectedTemplate}
        isViewMode={isViewMode}
        canUpdate={canUpdate}
      />

      <ConfirmDeleteDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onCancel={() => {
          setIsDeleteDialogOpen(false);
          setTemplateToDelete(null);
        }}
        onConfirm={handleDelete}
        title="Delete Email Template"
        description={`Are you sure you want to delete "${templateToDelete?.name}"?`}
        itemName={templateToDelete?.name}
        itemType="email template"
      />
    </>
  );
}
