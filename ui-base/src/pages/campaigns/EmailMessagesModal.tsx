import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CampaignsApi } from '@/api/campaigns';
import { formatDateTime } from '@/utils/dateFormat';
import { useOrganizationTimezone } from '@/hooks/useOrganizationTimezone';
import { DataTablePagination } from '@/components/common';
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
  eventOccurredAt?: string;
  clickedUrl?: string;
  clickedAt?: string;
  snippet?: string;
  bounceReason?: string;
  bounceType?: string;
  bouncedAt?: string;
  unsubscribedAt?: string;
  openedAt?: string;
  repliedAt?: string;
}

interface EmailMessagesModalProps {
  open: boolean;
  onClose: () => void;
  campaignId: string;
  stepId: string;
  eventType?: 'OPENED' | 'CLICKED' | 'REPLIED' | 'BOUNCED' | 'UNSUBSCRIBED';
  stepName?: string;
}

export function EmailMessagesModal({
  open,
  onClose,
  campaignId,
  stepId,
  eventType: initialEventType,
  stepName,
}: EmailMessagesModalProps) {
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [eventTypeFilter, setEventTypeFilter] = useState<string>(initialEventType || 'ALL');
  const [totalItems, setTotalItems] = useState(0);
  
  // Pagination state
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 50,
  });

  // Reset eventTypeFilter when initialEventType changes
  useEffect(() => {
    if (initialEventType) {
      setEventTypeFilter(initialEventType);
    }
  }, [initialEventType]);

  // Reset to first page when event type filter changes
  useEffect(() => {
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
  }, [eventTypeFilter]);

  // Get organization timezone
  const timezone = useOrganizationTimezone();

  const formatDate = useCallback((dateString?: string | null) => {
    if (!dateString) return '-';
    try {
      return formatDateTime(dateString, timezone);
    } catch {
      return dateString;
    }
  }, [timezone]);

  const getContactName = useCallback((email: EmailMessage) => {
    if (email.contact?.firstName || email.contact?.lastName) {
      return `${email.contact.firstName || ''} ${email.contact.lastName || ''}`.trim();
    }
    return email.contact?.email || '-';
  }, []);

  useEffect(() => {
    if (open && campaignId && stepId) {
      setLoading(true);
      const currentPage = pagination.pageIndex + 1; // TanStack uses 0-based, API uses 1-based
      const pageSize = pagination.pageSize;
      
      // Map eventTypeFilter to API eventType and status (same logic as EmailDetailsModal)
      let eventType: string | undefined;
      let status: string | undefined;
      
      if (eventTypeFilter === 'OPENED') {
        eventType = 'OPENED';
      } else if (eventTypeFilter === 'CLICKED') {
        eventType = 'CLICKED';
      } else if (eventTypeFilter === 'REPLIED') {
        eventType = 'REPLIED';
      } else if (eventTypeFilter === 'BOUNCED') {
        eventType = 'BOUNCED';
      } else if (eventTypeFilter === 'UNSUBSCRIBED') {
        eventType = 'UNSUBSCRIBED';
      } else if (eventTypeFilter === 'SENT') {
        eventType = 'SENT';
      } else if (eventTypeFilter === 'QUEUED') {
        status = 'QUEUED';
      } else if (eventTypeFilter === 'FAILED') {
        status = 'FAILED';
      } else if (eventTypeFilter === 'CANCELLED') {
        status = 'CANCELLED';
      }
      // For 'ALL', both eventType and status remain undefined
      
      // Fetch emails with pagination and filter
      CampaignsApi.getStepEmails(campaignId, stepId, eventType, currentPage, pageSize, status || 'ALL')
        .then((response: any) => {
          // Response structure from backend: { success: true, data: [...], total: 1152, totalPages: 29, page: 1, limit: 40 }
          // After apiService.get() wrapper: { success: true, data: { success: true, data: [...], total: 1152, ... } }
          // After getStepEmails extraction: { success: true, data: [...], total: 1152, totalPages: 29, ... }
          
          let emailData: EmailMessage[] = [];
          let total = 0;
          
          if (response?.data && Array.isArray(response.data)) {
            // Response has data array and pagination info at root level
            emailData = response.data;
            total = response.total || 0;
          } else if (response?.success && response?.data && Array.isArray(response.data)) {
            // Response structure: { success: true, data: [...], total: 1152, ... }
            emailData = response.data;
            total = response.total || 0;
          } else if (Array.isArray(response)) {
            // Fallback: response is directly an array (non-paginated)
            emailData = response;
            total = response.length;
          } else {
            emailData = [];
            total = 0;
          }
          
          // Filter out SENDING and DELIVERED statuses
          emailData = emailData.filter((email: EmailMessage) => {
            const status = email.status?.toUpperCase();
            return status !== 'SENDING' && status !== 'DELIVERED';
          });
          
          setEmails(emailData);
          // Use original total from server for pagination, not filtered count
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
      setPagination({ pageIndex: 0, pageSize: 20 });
      setTotalItems(0);
      setEventTypeFilter(initialEventType || 'ALL');
    }
  }, [open, campaignId, stepId, pagination.pageIndex, pagination.pageSize, eventTypeFilter, initialEventType]);

  // No client-side filtering - backend handles filtering
  const filteredEmails = emails;

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
      size: 50,
      maxSize: 50,
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
      size: 150,
      minSize: 120,
    },
    {
      accessorKey: 'contactEmail',
      header: 'Email',
      cell: ({ row }) => {
        const email = row.original;
        return (
          <div className="text-sm text-muted-foreground truncate" title={email.contact?.email || '-'}>
            {email.contact?.email || '-'}
          </div>
        );
      },
      size: 200,
      minSize: 150,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <span className="text-xs font-medium">{row.original.status || '-'}</span>
      ),
      size: 100,
    },
    {
      accessorKey: 'scheduledSendAt',
      header: 'Scheduled Send At',
      cell: ({ row }) => (
        <div className="truncate text-sm" title={formatDate(row.original.scheduledSendAt)}>
          {formatDate(row.original.scheduledSendAt)}
        </div>
      ),
      size: 150,
    },
    {
      accessorKey: 'sentAt',
      header: 'Sent At',
      cell: ({ row }) => (
        <div className="truncate text-sm" title={formatDate(row.original.sentAt)}>
          {formatDate(row.original.sentAt)}
        </div>
      ),
      size: 150,
    },
    {
      accessorKey: 'openedAt',
      header: 'Opened At',
      cell: ({ row }) => (
        <div className="truncate text-sm" title={formatDate(row.original.openedAt)}>
          {formatDate(row.original.openedAt)}
        </div>
      ),
      size: 150,
    },
    {
      accessorKey: 'clickedAt',
      header: 'Clicked At',
      cell: ({ row }) => (
        <div className="truncate text-sm" title={formatDate(row.original.clickedAt)}>
          {formatDate(row.original.clickedAt)}
        </div>
      ),
      size: 150,
    },
    {
      accessorKey: 'clickedUrl',
      header: 'Clicked URL',
      cell: ({ row }) => {
        const url = row.original.clickedUrl;
        return url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline truncate block text-xs font-medium"
            title={url}
          >
            {url}
          </a>
        ) : '-';
      },
      size: 200,
    },
    {
      accessorKey: 'repliedAt',
      header: 'Replied At',
      cell: ({ row }) => (
        <div className="truncate text-sm" title={formatDate(row.original.repliedAt)}>
          {formatDate(row.original.repliedAt)}
        </div>
      ),
      size: 150,
    },
    {
      accessorKey: 'bouncedAt',
      header: 'Bounced At',
      cell: ({ row }) => (
        <div className="truncate text-sm" title={formatDate(row.original.bouncedAt)}>
          {formatDate(row.original.bouncedAt)}
        </div>
      ),
      size: 150,
    },
    {
      accessorKey: 'unsubscribedAt',
      header: 'Unsubscribed At',
      cell: ({ row }) => (
        <div className="truncate text-sm" title={formatDate(row.original.unsubscribedAt)}>
          {formatDate(row.original.unsubscribedAt)}
        </div>
      ),
      size: 150,
    },
  ], [formatDate, getContactName]);

  // Create table instance
  const table = useReactTable({
    data: filteredEmails,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: totalItems > 0 ? Math.ceil(totalItems / pagination.pageSize) : 0,
    state: {
      pagination,
    },
    onPaginationChange: setPagination,
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="!max-w-[95vw] !w-[95vw] flex flex-col" style={{ maxWidth: '95vw', width: '95vw', minHeight: '400px', maxHeight: '90vh' }}>
        <DialogHeader>
          <div className="flex items-center justify-between flex-wrap gap-4 pr-8">
            <DialogTitle>
              Email Stats {stepName ? `- ${stepName}` : ''}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Filter:</span>
              <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Events" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Events</SelectItem>
                  <SelectItem value="OPENED">Opened</SelectItem>
                  <SelectItem value="CLICKED">Clicked</SelectItem>
                  <SelectItem value="REPLIED">Replied</SelectItem>
                  <SelectItem value="BOUNCED">Bounced</SelectItem>
                  <SelectItem value="UNSUBSCRIBED">Unsubscribed</SelectItem>
                  <SelectItem value="SENT">Sent</SelectItem>
                  <SelectItem value="QUEUED">Queued</SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </DialogHeader>
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="overflow-y-auto -mx-6 px-6 flex-1" style={{ maxHeight: 'calc(90vh - 250px)' }}>
            {loading ? (
              <div className="py-8 text-center text-muted-foreground">Loading...</div>
            ) : filteredEmails.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">No emails found</div>
            ) : (
              <div className="border rounded-lg">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id}>
                          {headerGroup.headers.map((header) => (
                            <TableHead key={header.id} className="text-left">
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
                          <TableRow key={row.id}>
                            {row.getVisibleCells().map((cell) => (
                              <TableCell key={cell.id} className="text-left">
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
                            No emails found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
          {!loading && totalItems > 0 && (
            <div className="mt-4 flex-shrink-0">
              <DataTablePagination table={table} totalCount={totalItems} />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

