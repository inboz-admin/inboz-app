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
import type { UserWiseAnalytics } from "@/api/analyticsTypes";
import { Button } from "@/components/ui/button";
import { Download, FileX } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTablePagination, EmailDetailsModal } from "@/components/common";
import { exportToCSVWithAudit } from "@/utils/csvExport";
import { toast } from "sonner";
import { useAppStore } from "@/stores/appStore";

type MetricClickHandler = (userId: string, userName: string, metric: string, count: number) => void;

const createColumns = (onMetricClick: MetricClickHandler): ColumnDef<UserWiseAnalytics>[] => [
  {
    accessorKey: "fullName",
    header: "User Name",
    cell: ({ row }) => {
      return (
        <div className="font-medium">
          {row.original.fullName || row.original.email}
        </div>
      );
    },
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => {
      return <div className="text-muted-foreground">{row.original.email}</div>;
    },
  },
  {
    accessorKey: "templatesCreated",
    header: () => <div className="text-center">Templates</div>,
    cell: ({ row }) => {
      return (
        <div className="text-center font-medium">
          {row.original.templatesCreated}
        </div>
      );
    },
  },
  {
    accessorKey: "campaignsCreated",
    header: () => <div className="text-center">Campaigns</div>,
    cell: ({ row }) => {
      return (
        <div className="text-center font-medium">
          {row.original.campaignsCreated}
        </div>
      );
    },
  },
  {
    accessorKey: "emailsSent",
    header: () => <div className="text-center">Sent</div>,
    cell: ({ row }) => {
      const count = row.original.emailsSent;
      return (
        <div 
          className="text-center font-medium cursor-pointer hover:text-primary hover:underline"
          onClick={() => count > 0 && onMetricClick(row.original.userId, row.original.fullName, 'sent', count)}
          title={count > 0 ? "Click to view details" : undefined}
        >
          {count.toLocaleString()}
        </div>
      );
    },
  },
  {
    accessorKey: "emailsBounced",
    header: () => <div className="text-center">Bounced</div>,
    cell: ({ row }) => {
      const count = row.original.emailsBounced;
      return (
        <div 
          className="text-center font-medium cursor-pointer hover:text-primary hover:underline"
          onClick={() => count > 0 && onMetricClick(row.original.userId, row.original.fullName, 'bounced', count)}
          title={count > 0 ? "Click to view details" : undefined}
        >
          {count.toLocaleString()}
        </div>
      );
    },
  },
  {
    accessorKey: "emailsOpened",
    header: () => <div className="text-center">Opened</div>,
    cell: ({ row }) => {
      const count = row.original.emailsOpened;
      return (
        <div 
          className="text-center font-medium cursor-pointer hover:text-primary hover:underline"
          onClick={() => count > 0 && onMetricClick(row.original.userId, row.original.fullName, 'opened', count)}
          title={count > 0 ? "Click to view details" : undefined}
        >
          {count.toLocaleString()}
        </div>
      );
    },
  },
  {
    accessorKey: "emailsClicked",
    header: () => <div className="text-center">Clicked</div>,
    cell: ({ row }) => {
      const count = row.original.emailsClicked;
      return (
        <div 
          className="text-center font-medium cursor-pointer hover:text-primary hover:underline"
          onClick={() => count > 0 && onMetricClick(row.original.userId, row.original.fullName, 'clicked', count)}
          title={count > 0 ? "Click to view details" : undefined}
        >
          {count.toLocaleString()}
        </div>
      );
    },
  },
  {
    accessorKey: "emailsReplied",
    header: () => <div className="text-center">Replied</div>,
    cell: ({ row }) => {
      const count = row.original.emailsReplied;
      return (
        <div 
          className="text-center font-medium cursor-pointer hover:text-primary hover:underline"
          onClick={() => count > 0 && onMetricClick(row.original.userId, row.original.fullName, 'replied', count)}
          title={count > 0 ? "Click to view details" : undefined}
        >
          {count.toLocaleString()}
        </div>
      );
    },
  },
  {
    accessorKey: "unsubscribes",
    header: () => <div className="text-center">Unsubscribed</div>,
    cell: ({ row }) => {
      const count = row.original.unsubscribes;
      return (
        <div 
          className="text-center font-medium cursor-pointer hover:text-primary hover:underline"
          onClick={() => count > 0 && onMetricClick(row.original.userId, row.original.fullName, 'unsubscribed', count)}
          title={count > 0 ? "Click to view details" : undefined}
        >
          {count.toLocaleString()}
        </div>
      );
    },
  },
  {
    accessorKey: "openRate",
    header: () => <div className="text-center">Open Rate</div>,
    cell: ({ row }) => {
      return (
        <div className="text-center font-medium">
          {row.original.openRate.toFixed(1)}%
        </div>
      );
    },
  },
  {
    accessorKey: "clickRate",
    header: () => <div className="text-center">Click Rate</div>,
    cell: ({ row }) => {
      return (
        <div className="text-center font-medium">
          {row.original.clickRate.toFixed(1)}%
        </div>
      );
    },
  },
  {
    accessorKey: "bounceRate",
    header: () => <div className="text-center">Bounce Rate</div>,
    cell: ({ row }) => {
      return (
        <div className="text-center font-medium">
          {row.original.bounceRate.toFixed(1)}%
        </div>
      );
    },
  },
];

interface UserAnalyticsTableProps {
  data: UserWiseAnalytics[];
  loading?: boolean;
  totalCount: number;
  currentPage: number;
  pageSize: number;
  onPaginationChange: (page: number, pageSize: number) => void;
}

export function UserAnalyticsTable({
  data,
  loading,
  totalCount,
  currentPage,
  pageSize,
  onPaginationChange,
}: UserAnalyticsTableProps) {
  const { user } = useAppStore();
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [selectedUser, setSelectedUser] = React.useState<{ id: string; name: string } | null>(null);
  const [selectedMetric, setSelectedMetric] = React.useState<{ type: string; count: number } | null>(null);

  const handleMetricClick = (userId: string, userName: string, metric: string, count: number) => {
    // Show alert if count is 0
    if (count === 0) {
      toast.info(`No ${metric} emails found for this user`);
      return;
    }

    setSelectedUser({ id: userId, name: userName });
    setSelectedMetric({ type: metric, count });
    setModalOpen(true);
  };

  const pagination: PaginationState = {
    pageIndex: currentPage - 1, // TanStack uses 0-based indexing
    pageSize: pageSize,
  };

  const columns = React.useMemo(() => createColumns(handleMetricClick), []);

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

    const exportData = data.map((user) => ({
      "User Name": user.fullName,
      "Email": user.email,
      "Templates Created": user.templatesCreated,
      "Campaigns Created": user.campaignsCreated,
      "Sent": user.emailsSent,
      "Bounced": user.emailsBounced,
      "Opened": user.emailsOpened,
      "Clicked": user.emailsClicked,
      "Replied": user.emailsReplied,
      "Unsubscribed": user.unsubscribes,
      "Open Rate": `${user.openRate.toFixed(1)}%`,
      "Click Rate": `${user.clickRate.toFixed(1)}%`,
      "Bounce Rate": `${user.bounceRate.toFixed(1)}%`,
    }));

    // Get user IDs for audit log
    const userIds = data.map((user) => user.userId || user.email);

    // Export with audit logging
    await exportToCSVWithAudit(
      exportData,
      "user_analytics",
      {
        module: "ANALYTICS",
        organizationId: user?.organizationId || undefined,
        userId: user?.id || undefined,
        recordIds: userIds,
        description: `Exported ${data.length} user analytics record(s) to CSV`,
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
          <h2 className="text-xl font-semibold">User Analytics</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Detailed breakdown of templates, campaigns, and emails sent by each user
          </p>
        </div>
        <div className="flex flex-col items-center justify-center p-8 text-center border rounded-md bg-muted/10">
          <div className="mb-4">
            <FileX className="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">No User Data Available</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            There is no user analytics data available for the selected organization or date range.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">User Analytics</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Detailed breakdown of templates, campaigns, and emails sent by each user
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

      {/* Email Details Modal */}
      {selectedUser && selectedMetric && (
        <EmailDetailsModal
          open={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setSelectedUser(null);
            setSelectedMetric(null);
          }}
          title={`${selectedUser.name} - ${selectedMetric.type.charAt(0).toUpperCase() + selectedMetric.type.slice(1)} Emails`}
          userId={selectedUser.id}
          organizationId={user?.organizationId}
          filterType={selectedMetric.type as 'all' | 'sent' | 'bounced' | 'opened' | 'clicked' | 'replied' | 'unsubscribed'}
          initialTotalCount={selectedMetric.count}
        />
      )}
    </div>
  );
}

