"use client";

import type { ColumnDef } from "@tanstack/react-table";
import {
  ArrowUpDown,
  MoreHorizontal,
  Download,
  Copy,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import type { Invoice } from "@/api/invoiceTypes";
import {
  InvoiceStatus,
  InvoiceStatusLabels,
  InvoiceStatusColors,
} from "@/api/invoiceTypes";
import { ActionType } from "@/api/roleTypes";
import { toast } from "sonner";
import { invoiceService } from "@/api/invoiceService";
import { formatDateTime } from "@/utils/dateFormat";

// Table cell viewer component
const TableCellViewer = ({ value, type, timezone }: { value: unknown; type: string; timezone: string }) => {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground">-</span>;
  }

  switch (type) {
    case "date":
      return (
        <span className="text-sm">
          {formatDateOnly(value as string, timezone)}
        </span>
      );
    case "status": {
      const status = value as InvoiceStatus;
      return (
        <Badge variant="outline" className={InvoiceStatusColors[status]}>
          {InvoiceStatusLabels[status]}
        </Badge>
      );
    }
    case "currency":
      return (
        <span className="text-sm">
          ${(value as number).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      );
    case "text":
    default:
      return <span className="text-sm">{value as string}</span>;
  }
};

interface InvoiceColumnsProps {
  canPerformAction: (action: ActionType) => boolean;
  onDownloadInvoice: (invoice: Invoice) => void;
  onPayInvoice?: (invoice: Invoice) => void;
  timezone?: string; // Organization timezone
}

export const createInvoiceColumns = ({
  canPerformAction,
  onDownloadInvoice,
  onPayInvoice,
  timezone = 'UTC',
}: InvoiceColumnsProps): ColumnDef<Invoice>[] => [
  {
    accessorKey: "invoiceNumber",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="cursor-pointer h-8 px-2"
        >
          Invoice Number
          <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      );
    },
    cell: ({ row }) => (
      <div className="text-left">
        <div className="font-medium">{row.getValue("invoiceNumber")}</div>
      </div>
    ),
    size: 150,
    minSize: 120,
  },
  {
    accessorKey: "status",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="cursor-pointer h-8 px-2"
        >
          Status
          <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      );
    },
    cell: ({ row }) => {
      return (
        <div className="text-left">
          <TableCellViewer value={row.getValue("status")} type="status" timezone={timezone} />
        </div>
      );
    },
    size: 140,
    maxSize: 140,
  },
  {
    accessorKey: "total",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="cursor-pointer h-8 px-2"
        >
          Amount
          <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      );
    },
    cell: ({ row }) => (
      <div className="text-left">
        <TableCellViewer value={row.getValue("total")} type="currency" />
      </div>
    ),
    size: 120,
    maxSize: 120,
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="cursor-pointer h-8 px-2"
        >
          Created
          <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const dateValue = row.getValue("createdAt") as string;
      return (
        <div className="text-left" title={`Created: ${formatDateTime(dateValue, timezone)} (${timezone})`}>
          {formatDateTime(dateValue, timezone)}
        </div>
      );
    },
    size: 110,
    maxSize: 110,
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const invoice = row.original;

      return (
        <div className="text-left">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-7 w-7 p-0 cursor-pointer">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(invoice.id);
                    toast.success("Invoice ID copied to clipboard");
                  } catch (error) {
                    toast.error("Failed to copy invoice ID");
                  }
                }}
                className="cursor-pointer"
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {canPerformAction(ActionType.READ) && (
                <DropdownMenuItem
                  onClick={() => onDownloadInvoice(invoice)}
                  className="cursor-pointer"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download Invoice
                </DropdownMenuItem>
              )}
              {onPayInvoice && invoice.status === "OPEN" && invoice.amountDue > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onPayInvoice(invoice)}
                    className="cursor-pointer text-green-600"
                  >
                    <CreditCard className="mr-2 h-4 w-4" />
                    Pay Now
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
    size: 60,
    maxSize: 60,
  },
];

























