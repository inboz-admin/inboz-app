"use client";

import type { ColumnDef } from "@tanstack/react-table";
import {
  ArrowUpDown,
  MoreHorizontal,
  Copy,
  X,
  Power,
  PowerOff,
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
import type { Subscription } from "@/api/subscriptionTypes";
import {
  SubscriptionStatus,
  SubscriptionStatusLabels,
  SubscriptionStatusColors,
  BillingCycle,
  BillingCycleLabels,
} from "@/api/subscriptionTypes";
import { ActionType } from "@/api/roleTypes";
import { toast } from "sonner";
import { formatDateOnly, formatDateTime } from "@/utils/dateFormat";

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
      const status = value as SubscriptionStatus;
      return (
        <Badge variant="outline" className={SubscriptionStatusColors[status]}>
          {SubscriptionStatusLabels[status]}
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

interface SubscriptionColumnsProps {
  canPerformAction: (action: ActionType) => boolean;
  onViewSubscription: (subscription: Subscription) => void;
  onEditSubscription: (subscription: Subscription) => void;
  onDeleteSubscription: (subscription: Subscription) => void;
  onViewInvoices?: (subscription: Subscription) => void;
  onToggleStatus?: (subscription: Subscription) => void;
  timezone?: string; // Organization timezone
}

export const createSubscriptionColumns = ({
  canPerformAction,
  onViewSubscription,
  onEditSubscription,
  onDeleteSubscription,
  onViewInvoices,
  onToggleStatus,
  timezone = 'UTC',
}: SubscriptionColumnsProps): ColumnDef<Subscription>[] => [
  {
    accessorKey: "plan.name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="cursor-pointer h-8 px-2"
        >
          Plan
          <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      );
    },
    cell: ({ row }) => (
      <div className="text-left">
        <div className="font-medium">
          {row.original.plan?.name || "N/A"}
        </div>
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
    cell: ({ row }) => (
      <div className="text-left">
        <TableCellViewer value={row.getValue("status")} type="status" timezone={timezone} />
      </div>
    ),
    size: 120,
    maxSize: 120,
  },
  {
    accessorKey: "userCount",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="cursor-pointer h-8 px-2"
        >
          Users
          <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const userCount = row.original.userCount;
      return (
        <div className="text-left">
          <span className="text-sm font-medium">
            {userCount ?? 1}
          </span>
        </div>
      );
    },
    size: 100,
    maxSize: 100,
  },
  {
    accessorKey: "billingCycle",
    header: "Billing Cycle",
    cell: ({ row }) => {
      const billingCycle = row.getValue("billingCycle") as BillingCycle;
      return (
        <div className="text-left">
          <span className="text-sm">
            {BillingCycleLabels[billingCycle] || billingCycle}
          </span>
        </div>
      );
    },
    size: 100,
    maxSize: 120,
  },
  {
    accessorKey: "currentPeriodStart",
    header: "Start Date",
    cell: ({ row }) => (
      <div className="text-left">
        <TableCellViewer
          value={row.getValue("currentPeriodStart")}
          type="date"
          timezone={timezone}
        />
      </div>
    ),
    size: 110,
    maxSize: 110,
  },
  {
    accessorKey: "currentPeriodEnd",
    header: "End Date",
    cell: ({ row }) => (
      <div className="text-left">
        <TableCellViewer value={row.getValue("currentPeriodEnd")} type="date" timezone={timezone} />
      </div>
    ),
    size: 110,
    maxSize: 110,
  },
  {
    accessorKey: "cancelAt",
    header: "Cancellation Date",
    cell: ({ row }) => {
      const cancelAt = row.getValue("cancelAt") as string | undefined;
      const subscription = row.original;
      if (cancelAt && subscription.status === "ACTIVE") {
        return (
          <div className="text-left">
            <div className="text-sm text-orange-600">
              {formatDateOnly(cancelAt, timezone)}
            </div>
            <div className="text-xs text-muted-foreground">Active until</div>
          </div>
        );
      }
      return <span className="text-muted-foreground">-</span>;
    },
    size: 140,
    maxSize: 140,
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
      const subscription = row.original;

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
                    await navigator.clipboard.writeText(
                      JSON.stringify(subscription, null, 2)
                    );
                    toast.success("Subscription info copied to clipboard");
                  } catch (error) {
                    toast.error("Failed to copy subscription info");
                  }
                }}
                className="cursor-pointer"
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy
              </DropdownMenuItem>
              {canPerformAction(ActionType.UPDATE) && onToggleStatus && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onToggleStatus(subscription)}
                    className="cursor-pointer"
                  >
                    {subscription.status === SubscriptionStatus.ACTIVE ? (
                      <>
                        <PowerOff className="mr-2 h-4 w-4" />
                        Disable
                      </>
                    ) : (
                      <>
                        <Power className="mr-2 h-4 w-4" />
                        Enable
                      </>
                    )}
                  </DropdownMenuItem>
                </>
              )}
              {canPerformAction(ActionType.DELETE) && subscription.status !== SubscriptionStatus.CANCELLED && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDeleteSubscription(subscription)}
                    className="text-red-600 cursor-pointer"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Cancel
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

























