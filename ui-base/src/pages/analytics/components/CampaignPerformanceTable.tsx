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
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Download, FileX } from "lucide-react";
import { DataTablePagination, EmailDetailsModal } from "@/components/common";
import { exportToCSVWithAudit } from "@/utils/csvExport";
import { CampaignsApi } from "@/api/campaigns";
import { toast } from "sonner";
import type { CampaignAnalytics } from "@/api/analyticsTypes";
import { useAppStore } from "@/stores/appStore";

type MetricClickHandler = (campaignId: string, campaignName: string, metric: string, count: number) => void;

const createColumns = (onMetricClick: MetricClickHandler): ColumnDef<CampaignAnalytics>[] => [
  {
    accessorKey: "campaignName",
    header: "Campaign Name",
    cell: ({ row }) => {
      return (
        <div className="font-medium">
          {row.original.campaignName}
        </div>
      );
    },
  },
  {
    accessorKey: "creator",
    header: "Creator",
    cell: ({ row }) => {
      return (
        <div className="text-muted-foreground">
          {row.original.creator?.fullName || row.original.creator?.email || "N/A"}
        </div>
      );
    },
  },
  {
    accessorKey: "totalRecipients",
    header: () => <div className="text-center">Recipients</div>,
    cell: ({ row }) => {
      const count = row.original.totalRecipients;
      return (
        <div 
          className="text-center font-medium cursor-pointer hover:text-primary hover:underline"
          onClick={() => count > 0 && onMetricClick(row.original.campaignId, row.original.campaignName, 'recipients', count)}
          title={count > 0 ? "Click to view details" : undefined}
        >
          {count.toLocaleString()}
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
          onClick={() => count > 0 && onMetricClick(row.original.campaignId, row.original.campaignName, 'sent', count)}
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
          onClick={() => count > 0 && onMetricClick(row.original.campaignId, row.original.campaignName, 'bounced', count)}
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
          onClick={() => count > 0 && onMetricClick(row.original.campaignId, row.original.campaignName, 'opened', count)}
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
          onClick={() => count > 0 && onMetricClick(row.original.campaignId, row.original.campaignName, 'clicked', count)}
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
          onClick={() => count > 0 && onMetricClick(row.original.campaignId, row.original.campaignName, 'replied', count)}
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
          onClick={() => count > 0 && onMetricClick(row.original.campaignId, row.original.campaignName, 'unsubscribed', count)}
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

interface CampaignPerformanceTableProps {
  data: CampaignAnalytics[];
  loading?: boolean;
  totalCount: number;
  currentPage: number;
  pageSize: number;
  onPaginationChange: (page: number, pageSize: number) => void;
}

export function CampaignPerformanceTable({
  data,
  loading,
  totalCount,
  currentPage,
  pageSize,
  onPaginationChange,
}: CampaignPerformanceTableProps) {
  const { user } = useAppStore();
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [selectedCampaign, setSelectedCampaign] = React.useState<{ id: string; name: string; stepId?: string } | null>(null);
  const [selectedMetric, setSelectedMetric] = React.useState<{ type: string; count: number } | null>(null);

  const handleMetricClick = async (campaignId: string, campaignName: string, metric: string, count: number) => {
    // Show alert if count is 0
    if (count === 0) {
      toast.info(`No ${metric} emails found for this campaign`);
      return;
    }

    // Fetch campaign to get first step ID
    try {
      const campaign = await CampaignsApi.get(campaignId);
      const firstStep = campaign?.steps?.[0];
      
      if (firstStep) {
        setSelectedCampaign({ id: campaignId, name: campaignName, stepId: firstStep.id });
        setSelectedMetric({ type: metric, count });
        setModalOpen(true);
      } else {
        toast.error('No steps found for this campaign');
      }
    } catch (error) {
      console.error('Failed to fetch campaign details:', error);
      toast.error('Failed to load campaign details');
    }
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

    const exportData = data.map((campaign) => ({
      "Campaign Name": campaign.campaignName,
      "Creator": campaign.creator?.fullName || campaign.creator?.email || "N/A",
      "Recipients": campaign.totalRecipients,
      "Sent": campaign.emailsSent,
      "Bounced": campaign.emailsBounced,
      "Opened": campaign.emailsOpened,
      "Clicked": campaign.emailsClicked,
      "Replied": campaign.emailsReplied,
      "Unsubscribed": campaign.unsubscribes,
      "Open Rate": `${campaign.openRate.toFixed(1)}%`,
      "Click Rate": `${campaign.clickRate.toFixed(1)}%`,
      "Bounce Rate": `${campaign.bounceRate.toFixed(1)}%`,
    }));

    // Get campaign IDs for audit log
    const campaignIds = data.map((campaign) => campaign.campaignId);

    // Export with audit logging
    await exportToCSVWithAudit(
      exportData,
      "campaign_performance",
      {
        module: "ANALYTICS",
        organizationId: user?.organizationId || undefined,
        userId: user?.id || undefined,
        recordIds: campaignIds,
        description: `Exported ${data.length} campaign performance record(s) to CSV`,
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
          <h2 className="text-xl font-semibold">Campaign Performance</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Detailed performance metrics for completed campaigns
          </p>
        </div>
        <div className="flex flex-col items-center justify-center p-8 text-center border rounded-md bg-muted/10">
          <div className="mb-4">
            <FileX className="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">No Campaign Data Available</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            There are no completed campaigns with analytics data for the selected organization or date range.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Campaign Performance</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Detailed performance metrics for completed campaigns
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
      {selectedCampaign && selectedMetric && (
        <EmailDetailsModal
          open={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setSelectedCampaign(null);
            setSelectedMetric(null);
          }}
          title={`${selectedCampaign.name} - ${selectedMetric.type.charAt(0).toUpperCase() + selectedMetric.type.slice(1)} Emails`}
          campaignId={selectedCampaign.id}
          stepId={selectedCampaign.stepId}
          campaignName={selectedCampaign.name}
          filterType={selectedMetric.type as 'all' | 'sent' | 'bounced' | 'opened' | 'clicked' | 'replied' | 'unsubscribed'}
          initialTotalCount={selectedMetric.count}
        />
      )}
    </div>
  );
}

