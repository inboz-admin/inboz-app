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
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DataTable,
  DataTableViewOptions,
  DataTablePagination,
} from "@/components/common";
import type { Invoice } from "@/api/invoiceTypes";
import { InvoiceStatus, InvoiceStatusLabels } from "@/api/invoiceTypes";
import { invoiceService } from "@/api/invoiceService";
import { subscriptionService } from "@/api/subscriptionService";
import { paymentService } from "@/api/paymentService";
import { roleService } from "@/api/roleService";
import { ActionType, ModuleName } from "@/api/roleTypes";
import { toast } from "sonner";
import { useAppStore } from "@/stores/appStore";
import { createInvoiceColumns } from "./columns";
import { NoDataState } from "@/components/common/NoDataState";

export default function InvoicesPage() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [moduleActions, setModuleActions] = useState<ActionType[]>([]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);

  // Get user data from store
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
  }, [debouncedSearchTerm]);

  // Reset to first page when status filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

  // Get subscriptionId from URL params
  const [subscriptionIdFromUrl, setSubscriptionIdFromUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const subscriptionId = params.get('subscriptionId') || undefined;
      setSubscriptionIdFromUrl(subscriptionId);
    }
  }, []);

  // Fetch invoices
  useEffect(() => {
    let isCancelled = false;

    const fetchInvoices = async () => {
      try {
        setLoading(true);
        const response = await invoiceService.getInvoices({
          page: currentPage,
          limit: pageSize,
          search: debouncedSearchTerm || undefined,
          status:
            statusFilter !== "all"
              ? (statusFilter as InvoiceStatus)
              : undefined,
          organizationId: user?.organizationId,
          subscriptionId: subscriptionIdFromUrl,
        });

        if (!isCancelled) {
          if (response.success && response.data) {
            setInvoices(response.data.data);
            setTotalPages(response.data.totalPages);
            setTotalItems(response.data.total);
          } else {
            setInvoices([]);
            setTotalPages(0);
            setTotalItems(0);
          }
        }
      } catch {
        if (!isCancelled) {
          setInvoices([]);
          setTotalPages(0);
          setTotalItems(0);
          toast.error("Error loading invoices");
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    fetchInvoices();

    return () => {
      isCancelled = true;
    };
  }, [
    currentPage,
    pageSize,
    debouncedSearchTerm,
    statusFilter,
    user?.organizationId,
    subscriptionIdFromUrl,
    selectedOrganizationId, // Refresh when organization changes (for employees)
    user?.type, // Refresh when user type changes
  ]);

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
          ModuleName.INVOICE
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

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const handleDownloadInvoice = async (invoice: Invoice) => {
    try {
      // Always download from API to ensure proper download behavior
      const blob = await invoiceService.downloadInvoicePdf(invoice.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${invoice.invoiceNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Invoice downloaded successfully");
    } catch (error) {
      toast.error("Failed to download invoice");
    }
  };

  const handlePayInvoice = async (invoice: Invoice) => {
    if (!invoice.subscriptionId) {
      toast.error("Invoice is not linked to a subscription");
      return;
    }

    try {
      // Get subscription to initiate payment
      const subscriptionResponse = await subscriptionService.getSubscription(invoice.subscriptionId);
      if (!subscriptionResponse.success || !subscriptionResponse.data) {
        toast.error("Failed to load subscription details");
        return;
      }

      const subscription = subscriptionResponse.data;
      const plan = subscription.plan;
      if (!plan) {
        toast.error("Plan not found for subscription");
        return;
      }

      // Initiate payment with existing subscription
      const paymentResponse = await paymentService.initiatePayment({
        planId: plan.id,
        billingCycle: subscription.billingCycle,
        organizationId: invoice.organizationId,
      });

      if (paymentResponse.success && paymentResponse.data) {
        // Payment checkout will be handled by PaymentCheckout component
        // For now, show a message
        toast.info("Redirecting to payment...");
        // TODO: Open payment modal or redirect to payment page
      } else {
        toast.error("Failed to initiate payment");
      }
    } catch (error) {
      console.error("Payment initiation error:", error);
      toast.error("Failed to initiate payment");
    }
  };

  const canPerformAction = useMemo(() => {
    return (action: ActionType): boolean => {
      return moduleActions.includes(action);
    };
  }, [moduleActions]);

  const columns = useMemo(
    () =>
      createInvoiceColumns({
        canPerformAction,
        onDownloadInvoice: handleDownloadInvoice,
        onPayInvoice: handlePayInvoice,
      }),
    [canPerformAction]
  );

  const table = useReactTable({
    data: invoices,
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
                placeholder="Search invoices..."
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
                  {Object.entries(InvoiceStatusLabels).map(([value, label]) => (
                    <SelectItem
                      key={value}
                      value={value}
                      className="cursor-pointer"
                    >
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-x-2 sm:space-y-0">
            {!loading && totalItems > 0 && (
              <DataTableViewOptions table={table} />
            )}
          </div>
        </div>

        {loading ? (
          <div className="rounded-md border">
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="mt-2 text-sm text-muted-foreground">
                Loading invoices...
              </p>
            </div>
          </div>
        ) : totalItems === 0 ? (
          <NoDataState
            title={
              debouncedSearchTerm || statusFilter !== "all"
                ? "No Invoices Found"
                : "No Invoices Available"
            }
            description={
              debouncedSearchTerm || statusFilter !== "all"
                ? "No invoices match your current search criteria. Try adjusting your search term or filters."
                : "There are no invoices in the system yet."
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
    </div>
  );
}

























