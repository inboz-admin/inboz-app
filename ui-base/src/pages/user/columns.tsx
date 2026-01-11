"use client";

import type { ColumnDef } from "@tanstack/react-table";
import {
  ArrowUpDown,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Copy,
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
import type { User } from "@/api/userTypes";
import {
  UserRole,
  UserStatus,
  UserRoleLabels,
  UserStatusLabels,
  UserStatusColors,
} from "@/api/userTypes";
import { ActionType } from "@/api/roleTypes";
import { toast } from "sonner";

// Table cell viewer component
const TableCellViewer = ({ value, type }: { value: unknown; type: string }) => {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground">-</span>;
  }

  switch (type) {
    case "status":
      return (
        <Badge className={UserStatusColors[value as UserStatus]}>
          {UserStatusLabels[value as UserStatus]}
        </Badge>
      );
    case "role":
      return (
        <Badge variant="outline">{UserRoleLabels[value as UserRole]}</Badge>
      );
    case "organization":
      return (value as { name?: string })?.name || "N/A";
    default:
      return (value as string) || "N/A";
  }
};

interface UserColumnsProps {
  canPerformAction: (action: ActionType) => boolean;
  onViewUser: (user: User) => void;
  onEditUser: (user: User) => void;
  onDeleteUser: (user: User) => void;
}

export const createUserColumns = ({
  canPerformAction,
  onViewUser,
  onEditUser,
  onDeleteUser,
}: UserColumnsProps): ColumnDef<User>[] => [
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
    accessorKey: "firstName",
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
    cell: ({ row }) => {
      const firstName = row.original.firstName;
      const lastName = row.original.lastName;
      const fullName = firstName || lastName 
        ? `${firstName || ""} ${lastName || ""}`.trim()
        : "NA";
      
      return (
        <div className="font-medium text-sm">
          {fullName}
        </div>
      );
    },
    size: 180,
    minSize: 150,
  },
  {
    accessorKey: "email",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="cursor-pointer h-8 px-2"
        >
          Email
          <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      );
    },
    cell: ({ row }) => (
      <div className="text-sm text-muted-foreground">
        {row.original.email}
      </div>
    ),
    size: 220,
    minSize: 180,
  },
  {
    accessorKey: "role",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="cursor-pointer h-8 px-2"
        >
          Role
          <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      );
    },
    cell: ({ row }) => (
      <TableCellViewer value={row.getValue("role")} type="role" />
    ),
    size: 120,
    maxSize: 120,
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
      const user = row.original;

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
                    await navigator.clipboard.writeText(user.email);
                    toast.success("Email copied to clipboard");
                  } catch {
                    toast.error("Failed to copy email");
                  }
                }}
                className="cursor-pointer"
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy email
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {canPerformAction(ActionType.READ) && (
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => onViewUser(user)}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  View details
                </DropdownMenuItem>
              )}
              {canPerformAction(ActionType.UPDATE) && (
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => onEditUser(user)}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit user
                </DropdownMenuItem>
              )}
              {/* {canPerformAction(ActionType.DELETE) && (
                <DropdownMenuItem
                  className="text-red-600 cursor-pointer"
                  onClick={() => onDeleteUser(user)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete user
                </DropdownMenuItem>
              )} */}
            </DropdownMenuContent>
        </DropdownMenu>
      );
    },
    size: 60,
    maxSize: 60,
  },
];
