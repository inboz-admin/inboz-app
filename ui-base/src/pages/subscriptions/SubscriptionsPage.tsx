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
import { CreditCard, FileText, ExternalLink } from "lucide-react";
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
import type { Subscription } from "@/api/subscriptionTypes";
import {
  SubscriptionStatus,
  SubscriptionStatusLabels,
} from "@/api/subscriptionTypes";
import { subscriptionService } from "@/api/subscriptionService";
import { paymentService } from "@/api/paymentService";
import { roleService } from "@/api/roleService";
import { ActionType, ModuleName } from "@/api/roleTypes";
import { toast } from "sonner";
import { useAppStore } from "@/stores/appStore";
import { createSubscriptionColumns } from "./columns";
import { NoDataState } from "@/components/common/NoDataState";
import { CancelSubscriptionDialog } from "@/components/payments";
import { useNavigate } from "react-router-dom";
import { useOrganizationTimezone } from "@/hooks/useOrganizationTimezone";

export default function SubscriptionsPage() {
  const navigate = useNavigate();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isViewMode, setIsViewMode] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [subscriptionToDelete, setSubscriptionToDelete] =
    useState<Subscription | null>(null);

  const [moduleActions, setModuleActions] = useState<ActionType[]>([]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);

  // Get user data from store
  const { user, selectedOrganizationId } = useAppStore();
  
  // Get organization timezone
  const timezone = useOrganizationTimezone();

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

  // Reset to first page when status filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

  // Fetch subscriptions
  useEffect(() => {
    let isCancelled = false;

    const fetchSubscriptions = async () => {
      try {
        setLoading(true);
        const response = await subscriptionService.getSubscriptions({
          page: currentPage,
          limit: pageSize,
          search: debouncedSearchTerm || undefined,
          status:
            statusFilter !== "all"
              ? (statusFilter as SubscriptionStatus)
              : undefined,
          organizationId: user?.organizationId,
        });

        if (!isCancelled) {
          if (response.success && response.data) {
            setSubscriptions(response.data.data);
            setTotalPages(response.data.totalPages);
            setTotalItems(response.data.total);
          } else {
            setSubscriptions([]);
            setTotalPages(0);
            setTotalItems(0);
          }
        }
      } catch {
        if (!isCancelled) {
          setSubscriptions([]);
          setTotalPages(0);
          setTotalItems(0);
          toast.error("Error loading subscriptions");
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    fetchSubscriptions();

    return () => {
      isCancelled = true;
    };
  }, [currentPage, pageSize, debouncedSearchTerm, statusFilter, user?.organizationId, selectedOrganizationId, user?.type]);

  // Fetch module actions
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
          ModuleName.SUBSCRIPTION
        );

        if (!isCancelled) {
          if (response.success && response.data) {
            setModuleActions(response.data.actions || []);
          } else {
            setModuleActions([]);
          }
        }
      } catch (error) {
        if (!isCancelled) {
          setModuleActions([]);
        }
      }
    };

    fetchModuleActions();

    return () => {
      isCancelled = true;
    };
  }, [user]);

  // Refresh subscriptions
  const refreshSubscriptions = async () => {
    try {
      setLoading(true);
      const response = await subscriptionService.getSubscriptions({
        page: currentPage,
        limit: pageSize,
        search: searchTerm || undefined,
        status:
          statusFilter !== "all"
            ? (statusFilter as SubscriptionStatus)
            : undefined,
        organizationId: user?.organizationId,
      });

      if (response.success && response.data) {
        setSubscriptions(response.data.data);
        setTotalPages(response.data.totalPages);
        setTotalItems(response.data.total);
      } else {
        setSubscriptions([]);
        setTotalPages(0);
        setTotalItems(0);
      }
    } catch {
      setSubscriptions([]);
      setTotalPages(0);
      setTotalItems(0);
      toast.error("Error refreshing subscriptions");
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

  const handleViewSubscription = (subscription: Subscription) => {
    navigate(`/dashboard/subscriptions/${subscription.id}`);
  };

  const handleViewInvoices = (subscription: Subscription) => {
    // Navigate to invoices page with subscription filter
    window.location.href = `/invoices?subscriptionId=${subscription.id}`;
  };

  const handleEditSubscription = (subscription: Subscription) => {
    // For now, just show a toast. You can create a modal later if needed.
    toast.info(`Edit ${subscription.plan?.name} subscription`);
  };

  const handleDeleteClick = (subscription: Subscription) => {
    setSubscriptionToDelete(subscription);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async (reason?: string) => {
    if (!subscriptionToDelete) return;

    try {
      const response = await paymentService.cancelSubscription(
        subscriptionToDelete.id,
        { reason }
      );

      if (response.success) {
        toast.success("Subscription will be cancelled at the end of the billing period");
        refreshSubscriptions();
      } else {
        toast.error("Failed to cancel subscription");
      }
    } catch {
      toast.error("Failed to cancel subscription");
    } finally {
      setIsDeleteDialogOpen(false);
      setSubscriptionToDelete(null);
    }
  };

  const handleInitiatePayment = async () => {
    // Navigate to the first subscription's detail page, or create a new subscription flow
    if (subscriptions.length > 0) {
      // Navigate to the first active subscription's detail page
      const activeSubscription = subscriptions.find(sub => sub.status === "ACTIVE" || sub.status === "TRIAL");
      if (activeSubscription) {
        navigate(`/dashboard/subscriptions/${activeSubscription.id}`);
      } else {
        // If no active subscription, navigate to the first one
        navigate(`/dashboard/subscriptions/${subscriptions[0].id}`);
      }
    } else {
      toast.error("No subscriptions found. Please create a subscription first.");
    }
  };

  const handleOpenCustomerPortal = async () => {
    if (!user?.organizationId) return;
    
    try {
      const response = await subscriptionService.createCustomerPortal({
        organizationId: user.organizationId,
        returnUrl: window.location.href,
      });
      
      if (response.success && response.data?.url) {
        window.open(response.data.url, '_blank', 'noopener,noreferrer');
      } else {
        toast.error("Failed to open billing portal");
      }
    } catch (error) {
      console.error("Error opening customer portal:", error);
      toast.error("Failed to open billing portal");
    }
  };

  // Check if there's an active Stripe subscription
  const hasActiveStripeSubscription = useMemo(() => {
    return subscriptions.some(
      sub => (sub.status === "ACTIVE" || sub.status === "TRIAL") && sub.stripeSubscriptionId
    );
  }, [subscriptions]);

  const handleCancelDelete = () => {
    setIsDeleteDialogOpen(false);
    setSubscriptionToDelete(null);
  };

  const canPerformAction = useMemo(() => {
    return (action: ActionType): boolean => {
      return moduleActions.includes(action);
    };
  }, [moduleActions]);

  const handleToggleStatus = async (subscription: Subscription) => {
    try {
      const newStatus = subscription.status === SubscriptionStatus.ACTIVE 
        ? SubscriptionStatus.CANCELLED 
        : SubscriptionStatus.ACTIVE;
      
      const response = await subscriptionService.updateSubscription(subscription.id, {
        status: newStatus,
      });

      if (response.success) {
        toast.success(`Subscription ${newStatus === SubscriptionStatus.ACTIVE ? 'enabled' : 'cancelled'} successfully`);
        refreshSubscriptions();
      } else {
        toast.error(response.message || "Failed to update subscription status");
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to update subscription status");
    }
  };

  const columns = useMemo(
    () =>
      createSubscriptionColumns({
        canPerformAction,
        onViewSubscription: handleViewSubscription,
        onEditSubscription: handleEditSubscription,
        onDeleteSubscription: handleDeleteClick,
        onViewInvoices: handleViewInvoices,
        onToggleStatus: handleToggleStatus,
        timezone,
      }),
    [canPerformAction, timezone]
  );

  const table = useReactTable({
    data: subscriptions,
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

  return (
    <div className="w-full p-4">
      <div className="space-y-4">
        {/* Actions */}
        <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
          {!loading && (
            <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-x-2 sm:space-y-0">
              <Input
                placeholder="Search subscriptions..."
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
                  {Object.entries(SubscriptionStatusLabels).map(
                    ([value, label]) => (
                      <SelectItem
                        key={value}
                        value={value}
                        className="cursor-pointer"
                      >
                        {label}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-x-2 sm:space-y-0">
            {!loading && totalItems > 0 && (
              <>
                {/* Show billing history button for Stripe subscriptions */}
                {hasActiveStripeSubscription && (
                  <Button 
                    variant="outline" 
                    onClick={handleOpenCustomerPortal} 
                    className="gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    View Billing History
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                )}
                {/* Show upgrade button only if user has CREATE permission for subscriptions */}
                {canPerformAction(ActionType.CREATE) && (
                  <Button onClick={handleInitiatePayment} className="gap-2">
                    <CreditCard className="h-4 w-4" />
                    Upgrade
                  </Button>
                )}
                <DataTableViewOptions table={table} />
              </>
            )}
          </div>
        </div>

        {loading ? (
          <div className="rounded-md border">
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="mt-2 text-sm text-muted-foreground">
                Loading subscriptions...
              </p>
            </div>
          </div>
        ) : totalItems === 0 ? (
          <NoDataState
            title={
              debouncedSearchTerm || statusFilter !== "all"
                ? "No Subscriptions Found"
                : "No Subscriptions Available"
            }
            description={
              debouncedSearchTerm || statusFilter !== "all"
                ? "No subscriptions match your current search criteria. Try adjusting your search term or filters."
                : "There are no subscriptions in the system yet."
            }
            showAction={false}
          />
        ) : (
          <div className="flex flex-col" style={{ maxHeight: 'calc(100vh - 150px)' }}>
            <div className="overflow-auto flex-1">
              <DataTable columns={columns} table={table} />
            </div>
            <div className="mt-4 flex-shrink-0">
              <DataTablePagination
                table={table}
                totalCount={totalItems}
                selectedCount={table.getFilteredSelectedRowModel().rows.length}
              />
            </div>
          </div>
        )}
      </div>

      {/* Cancel Subscription Dialog */}
      <CancelSubscriptionDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        subscriptionEndDate={subscriptionToDelete?.currentPeriodEnd}
        subscriptionName={subscriptionToDelete?.plan?.name}
      />

    </div>
  );
}

























