"use client";

import type { ColumnDef } from "@tanstack/react-table";
import {
  ArrowUpDown,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Copy,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import type { Organization } from "@/api/organizationTypes";
import {
  OrganizationStatus,
  OrganizationStatusLabels,
  OrganizationStatusColors,
} from "@/api/organizationTypes";
import { ActionType } from "@/api/roleTypes";
import { toast } from "sonner";

// Table cell viewer component
const TableCellViewer = ({ value, type }: { value: unknown; type: string }) => {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground">-</span>;
  }

  switch (type) {
    case "date":
      return (
        <span className="text-sm">
          {new Date(value as string).toLocaleDateString()}
        </span>
      );
    case "email":
      return (
        <span className="text-sm text-muted-foreground">{value as string}</span>
      );
    case "status": {
      const status = value as OrganizationStatus;
      return (
        <Badge variant="outline" className={OrganizationStatusColors[status]}>
          {OrganizationStatusLabels[status]}
        </Badge>
      );
    }
    case "text":
    default:
      return <span className="text-sm">{value as string}</span>;
  }
};

interface OrganizationColumnsProps {
  canPerformAction: (action: ActionType) => boolean;
  onViewOrganization: (organization: Organization) => void;
  onEditOrganization: (organization: Organization) => void;
  onDeleteOrganization: (organization: Organization) => void;
  onManageSubscription?: (organization: Organization) => void;
  isSuperAdmin?: boolean;
}

export const createOrganizationColumns = ({
  canPerformAction,
  onViewOrganization,
  onEditOrganization,
  onDeleteOrganization,
  onManageSubscription,
  isSuperAdmin = false,
}: OrganizationColumnsProps): ColumnDef<Organization>[] => [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
        className="cursor-pointer"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="cursor-pointer"
      />
    ),
    enableSorting: false,
    enableHiding: false,
    size: 40,
    maxSize: 40,
  },
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="cursor-pointer h-8 px-2"
        >
          Name
          <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      );
    },
    cell: ({ row }) => (
      <div className="font-medium text-sm">{row.getValue("name")}</div>
    ),
    size: 200,
    minSize: 150,
  },
  {
    accessorKey: "billingEmail",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="cursor-pointer h-8 px-2"
        >
          Billing Email
          <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      );
    },
    cell: ({ row }) => (
      <div className="text-sm text-muted-foreground">
        {row.original.billingEmail || "No billing email"}
      </div>
    ),
    size: 220,
    minSize: 180,
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
      <TableCellViewer value={row.getValue("status")} type="status" />
    ),
    size: 100,
    maxSize: 100,
  },
  {
    accessorKey: "slug",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="cursor-pointer h-8 px-2"
        >
          Slug
          <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const slug = row.getValue("slug") as string;
      return (
        <div className="max-w-[200px]">
          <span className="text-sm block truncate" title={slug}>
            {slug}
          </span>
        </div>
      );
    },
    size: 200,
    minSize: 150,
    maxSize: 250,
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
      const date = new Date(row.getValue("createdAt"));
      return <div className="text-sm">{date.toLocaleDateString()}</div>;
    },
    size: 110,
    maxSize: 110,
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const organization = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-7 w-7 p-0 cursor-pointer">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(
                      JSON.stringify(organization, null, 2)
                    );
                    toast.success("Organization info copied to clipboard");
                  } catch (error) {
                    toast.error("Failed to copy organization info");
                  }
                }}
                className="cursor-pointer"
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy info
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {canPerformAction(ActionType.READ) && (
                <DropdownMenuItem
                  onClick={() => onViewOrganization(organization)}
                  className="cursor-pointer"
                >
                  <Eye className="mr-2 h-4 w-4" />
                  View details
                </DropdownMenuItem>
              )}
              {canPerformAction(ActionType.UPDATE) && (
                <DropdownMenuItem
                  onClick={() => onEditOrganization(organization)}
                  className="cursor-pointer"
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit organization
                </DropdownMenuItem>
              )}
              {isSuperAdmin && onManageSubscription && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onManageSubscription(organization)}
                    className="cursor-pointer"
                  >
                    <CreditCard className="mr-2 h-4 w-4" />
                    Manage Subscription
                  </DropdownMenuItem>
                </>
              )}
              {/* Commented out delete organization option */}
              {/* {canPerformAction(ActionType.DELETE) && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDeleteOrganization(organization)}
                    className="text-red-600 cursor-pointer"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete organization
                  </DropdownMenuItem>
                </>
              )} */}
            </DropdownMenuContent>
        </DropdownMenu>
      );
    },
    size: 60,
    maxSize: 60,
  },
];
