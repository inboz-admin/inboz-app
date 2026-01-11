"use client";

import * as React from "react";
import type {
  ColumnDef,
  SortingState,
  PaginationState,
} from "@tanstack/react-table";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { OrganizationAnalytics } from "@/api/analyticsTypes";
import { Button } from "@/components/ui/button";
import { Download, FileX } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTablePagination } from "@/components/common";
import { exportToCSVWithAudit } from "@/utils/csvExport";
import { useAppStore } from "@/stores/appStore";

const createColumns = (): ColumnDef<OrganizationAnalytics>[] => [
  {
    accessorKey: "organizationName",
    header: "Organization Name",
    cell: ({ row }) => {
      return (
        <div className="font-medium">
          {row.original.organizationName}
        </div>
      );
    },
  },
  {
    accessorKey: "usersCount",
    header: () => <div className="text-center">Users</div>,
    cell: ({ row }) => {
      return (
        <div className="text-center font-medium">
          {row.original.usersCount.toLocaleString()}
        </div>
      );
    },
  },
  {
    accessorKey: "contactsCount",
    header: () => <div className="text-center">Contacts</div>,
    cell: ({ row }) => {
      return (
        <div className="text-center font-medium">
          {row.original.contactsCount.toLocaleString()}
        </div>
      );
    },
  },
  {
    accessorKey: "contactListsCount",
    header: () => <div className="text-center">Contact Lists</div>,
    cell: ({ row }) => {
      return (
        <div className="text-center font-medium">
          {row.original.contactListsCount.toLocaleString()}
        </div>
      );
    },
  },
  {
    accessorKey: "templatesCount",
    header: () => <div className="text-center">Templates</div>,
    cell: ({ row }) => {
      return (
        <div className="text-center font-medium">
          {row.original.templatesCount.toLocaleString()}
        </div>
      );
    },
  },
  {
    accessorKey: "campaignsCount",
    header: () => <div className="text-center">Campaigns</div>,
    cell: ({ row }) => {
      return (
        <div className="text-center font-medium">
          {row.original.campaignsCount.toLocaleString()}
        </div>
      );
    },
  },
  {
    accessorKey: "subscription",
    header: () => <div className="text-center">Subscription</div>,
    cell: ({ row }) => {
      const subscription = row.original.subscription;
      return (
        <div className="text-center font-medium">
          {subscription}
        </div>
      );
    },
  },
  {
    accessorKey: "revenue",
    header: () => <div className="text-center">Revenue</div>,
    cell: ({ row }) => {
      const revenue = row.original.revenue || 0;
      const formattedRevenue = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(revenue);
      return (
        <div className="text-center font-medium">
          {formattedRevenue}
        </div>
      );
    },
  },
];

interface OrganizationAnalyticsTableProps {
  data: OrganizationAnalytics[];
  loading?: boolean;
  totalCount: number;
  currentPage: number;
  pageSize: number;
  onPaginationChange: (page: number, pageSize: number) => void;
}

export function OrganizationAnalyticsTable({
  data,
  loading,
  totalCount,
  currentPage,
  pageSize,
  onPaginationChange,
}: OrganizationAnalyticsTableProps) {
  const { user } = useAppStore();
  const [sorting, setSorting] = React.useState<SortingState>([]);

  const pagination: PaginationState = {
    pageIndex: currentPage - 1, // TanStack uses 0-based indexing
    pageSize: pageSize,
  };

  const columns = React.useMemo(() => createColumns(), []);

  const table = useReactTable({
    data: data || [],
    columns,
    state: {
      sorting,
      pagination,
    },
    onSortingChange: setSorting,
    onPaginationChange: (updater) => {
      const newState = typeof updater === 'function' ? updater(pagination) : updater;
      onPaginationChange(newState.pageIndex + 1, newState.pageSize);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    pageCount: totalCount > 0 ? Math.ceil(totalCount / pageSize) : 0,
  });

  const handleExport = async () => {
    if (!data || data.length === 0) {
      return;
    }

    const exportData = data.map((org) => ({
      "Organization Name": org.organizationName,
      "Users": org.usersCount,
      "Contacts": org.contactsCount,
      "Contact Lists": org.contactListsCount,
      "Templates": org.templatesCount,
      "Campaigns": org.campaignsCount,
      "Subscription": org.subscription,
      "Revenue": new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(org.revenue || 0),
    }));

    // Get organization IDs for audit log
    const organizationIds = data.map((org) => org.organizationId || org.organizationName);

    // Export with audit logging
    await exportToCSVWithAudit(
      exportData,
      "organization_analytics",
      {
        module: "ANALYTICS",
        organizationId: user?.organizationId || undefined,
        userId: user?.id || undefined,
        recordIds: organizationIds,
        description: `Exported ${data.length} organization analytics record(s) to CSV`,
      }
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div>
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-96 mt-2" />
        </div>
        <div className="rounded-lg border">
          <div className="p-4 space-y-3">
            <Skeleton className="h-10 w-full" />
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Show "No data" if not loading and no data
  if (!loading && (!data || data.length === 0)) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Organization Analytics</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Detailed breakdown of users, contacts, templates, and campaigns per organization
          </p>
        </div>
        <div className="flex flex-col items-center justify-center p-8 text-center border rounded-md bg-muted/10">
          <div className="mb-4">
            <FileX className="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">No Organization Data Available</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            There is no organization analytics data available for the selected date range.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Organization Analytics</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Detailed breakdown of users, contacts, templates, and campaigns per organization
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={!data || data.length === 0}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          Export
        </Button>
      </div>
      <div className="rounded-lg border overflow-hidden">
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="border-t py-3">
          <DataTablePagination table={table} totalCount={totalCount} />
        </div>
      </div>
    </div>
  );
}

