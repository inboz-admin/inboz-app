import { useEffect, useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { CampaignsApi } from '@/api/campaigns';
import { analyticsService } from '@/api/analyticsService';
import { format } from 'date-fns';
import { formatDateTime } from '@/utils/dateFormat';
import { useOrganizationTimezone } from '@/hooks/useOrganizationTimezone';
import { DataTablePagination } from '@/components/common';
import { exportToCSV } from '@/utils/csvExport';
import { toast } from 'sonner';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type PaginationState,
} from '@tanstack/react-table';

interface EmailMessage {
  id: string;
  subject: string;
  status: string;
  sentAt: string;
  scheduledSendAt?: string;
  contact?: {
    email: string;
    firstName?: string;
    lastName?: string;
  };
  campaign?: {
    id: string;
    name: string;
  };
  eventOccurredAt?: string;
  clickedUrl?: string;
  snippet?: string;
  bounceReason?: string;
  bounceType?: string;
  unsubscribedAt?: string;
  openedAt?: string;
  repliedAt?: string;
  clickedAt?: string;
  bouncedAt?: string;
}

interface EmailDetailsModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  campaignId?: string;
  stepId?: string;
  campaignName?: string;
  userId?: string;
  organizationId?: string;
  filterType?: 'all' | 'sent' | 'bounced' | 'opened' | 'clicked' | 'replied' | 'unsubscribed';
  initialTotalCount?: number;
}

export function EmailDetailsModal({
  open,
  onClose,
  title,
  campaignId,
  stepId,
  campaignName,
  userId,
  organizationId,
  filterType,
  initialTotalCount,
}: EmailDetailsModalProps) {
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalItems, setTotalItems] = useState(initialTotalCount || 0);
  
  // Pagination state - default to 50 per page
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 50,
  });

  // Helper functions
  const getContactName = (email: EmailMessage) => {
    if (email.contact?.firstName || email.contact?.lastName) {
      return `${email.contact.firstName || ''} ${email.contact.lastName || ''}`.trim();
    }
    return email.contact?.email || 'Unknown';
  };

  // Get organization timezone
  const timezone = useOrganizationTimezone();

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    try {
      return formatDateTime(dateString, timezone);
    } catch {
      return '-';
    }
  };

  useEffect(() => {
    if (open && ((campaignId && stepId) || (userId && organizationId))) {
      setLoading(true);
      const currentPage = pagination.pageIndex + 1; // TanStack uses 0-based, API uses 1-based
      const pageSize = pagination.pageSize;
      
      // Determine event type from filter
      let eventType: string | undefined;
      if (filterType === 'opened') eventType = 'OPENED';
      else if (filterType === 'clicked') eventType = 'CLICKED';
      else if (filterType === 'bounced') eventType = 'BOUNCED';
      else if (filterType === 'sent') eventType = 'SENT';
      else if (filterType === 'replied') eventType = 'REPLIED';
      else if (filterType === 'unsubscribed') eventType = 'UNSUBSCRIBED';
      
      // Fetch emails - either by campaign/step or by user
      const fetchPromise = userId && organizationId
        ? analyticsService.getUserEmails({
            userId,
            organizationId,
            eventType,
            page: currentPage,
            limit: pageSize,
          }).then((response: any) => {
            let emailData: EmailMessage[] = [];
            let total = 0;
            
            if (response?.success && response?.data) {
              const responseData = response.data;
              if (responseData.data && Array.isArray(responseData.data)) {
                emailData = responseData.data;
                total = responseData.total || 0;
              } else if (Array.isArray(responseData)) {
                emailData = responseData;
                total = responseData.length;
              }
            } else if (response?.data && Array.isArray(response.data)) {
              emailData = response.data;
              total = response.total || 0;
            }
            
            return { emailData, total };
          })
        : CampaignsApi.getStepEmails(campaignId!, stepId!, eventType, currentPage, pageSize, 'ALL')
            .then((response: any) => {
              let emailData: EmailMessage[] = [];
              let total = 0;
              
              if (response?.data && Array.isArray(response.data)) {
                emailData = response.data;
                total = response.total || 0;
              } else if (response?.success && response?.data && Array.isArray(response.data)) {
                emailData = response.data;
                total = response.total || 0;
              } else if (Array.isArray(response)) {
                emailData = response;
                total = response.length;
              }
              
              // Filter out SENDING and DELIVERED statuses (for campaign/step emails)
              emailData = emailData.filter((email: EmailMessage) => {
                const status = email.status?.toUpperCase();
                return status !== 'SENDING' && status !== 'DELIVERED';
              });
              
              return { emailData, total };
            });
      
      fetchPromise
        .then(({ emailData, total }) => {
          // Add campaign name to emails if in campaign mode
          if (campaignId && campaignName) {
            emailData = emailData.map((email: EmailMessage) => ({
              ...email,
              campaign: email.campaign || {
                id: campaignId,
                name: campaignName,
              },
            }));
          }
          setEmails(emailData);
          setTotalItems(total);
        })
        .catch((err) => {
          console.error('Failed to load emails:', err);
          setEmails([]);
          setTotalItems(0);
        })
        .finally(() => setLoading(false));
    } else {
      // Reset when modal closes
      setEmails([]);
      setPagination({ pageIndex: 0, pageSize: 10 });
      setTotalItems(0);
    }
  }, [open, campaignId, stepId, campaignName, userId, organizationId, filterType, pagination.pageIndex, pagination.pageSize]);

  // Define columns
  const columns = useMemo<ColumnDef<EmailMessage>[]>(() => [
    {
      accessorKey: 'id',
      header: '#',
      cell: ({ row, table }) => {
        const pageIndex = table.getState().pagination.pageIndex;
        const pageSize = table.getState().pagination.pageSize;
        return (
          <span className="text-sm font-medium text-muted-foreground">
            {pageIndex * pageSize + row.index + 1}
          </span>
        );
      },
    },
    {
      accessorKey: 'contactName',
      header: 'Name',
      cell: ({ row }) => {
        const email = row.original;
        return (
          <div className="font-medium text-sm truncate" title={getContactName(email)}>
            {getContactName(email)}
          </div>
        );
      },
    },
    {
      accessorKey: 'contactEmail',
      header: 'Email',
      cell: ({ row }) => (
        <div className="text-sm truncate" title={row.original.contact?.email || '-'}>
          {row.original.contact?.email || '-'}
        </div>
      ),
    },
    {
      accessorKey: 'campaignName',
      header: 'Campaign Name',
      cell: ({ row }) => (
        <div className="text-sm font-medium truncate" title={row.original.campaign?.name || '-'}>
          {row.original.campaign?.name || '-'}
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <span className="text-xs font-medium">{row.original.status || '-'}</span>
      ),
    },
    {
      accessorKey: 'scheduledSendAt',
      header: 'Scheduled Send At',
      cell: ({ row }) => (
        <div className="truncate text-sm" title={formatDate(row.original.scheduledSendAt)}>
          {formatDate(row.original.scheduledSendAt)}
        </div>
      ),
    },
    {
      accessorKey: 'sentAt',
      header: 'Sent At',
      cell: ({ row }) => (
        <div className="truncate text-sm" title={formatDate(row.original.sentAt)}>
          {formatDate(row.original.sentAt)}
        </div>
      ),
    },
  ], []);

  const table = useReactTable({
    data: emails,
    columns,
    state: {
      pagination,
    },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: totalItems > 0 ? Math.ceil(totalItems / pagination.pageSize) : 0,
  });

  const handleExport = () => {
    if (emails.length === 0) {
      return;
    }

    const exportData = emails.map((email) => ({
      "Contact Name": getContactName(email),
      "Email": email.contact?.email || '-',
      "Campaign Name": email.campaign?.name || '-',
      "Status": email.status || '-',
      "Scheduled Send At": formatDate(email.scheduledSendAt),
      "Sent At": formatDate(email.sentAt),
      "Opened At": formatDate(email.openedAt),
      "Clicked At": formatDate(email.clickedUrl ? email.eventOccurredAt : undefined),
      "Bounce Reason": email.bounceReason || '-',
    }));

    // Create filename with campaign name, metric, and timestamp
    // Format: "Campaign Name - Metric - YYYY-MM-DD_HH-MM-SS"
    const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
    const filename = `${title} - ${timestamp}`;

    exportToCSV(exportData, filename);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="!max-w-[95vw] !w-[95vw] flex flex-col" style={{ maxWidth: '95vw', width: '95vw', minHeight: '400px', maxHeight: '90vh' }}>
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <DialogTitle>{title}</DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Total: {totalItems.toLocaleString()} emails
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={emails.length === 0}
            className="gap-2 mr-8"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
        </DialogHeader>

        <div className="flex-1 overflow-auto border rounded-md">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
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
              {loading ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
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
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    No emails found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="pt-4">
          <DataTablePagination table={table} totalCount={totalItems} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

