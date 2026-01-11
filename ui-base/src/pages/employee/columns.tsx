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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Employee } from "@/api/employeeTypes";
import {
  EmployeeRole,
  EmployeeStatus,
  EmployeeRoleLabels,
  EmployeeStatusLabels,
  EmployeeStatusColors,
} from "@/api/employeeTypes";
import { ActionType } from "@/api/roleTypes";
import { toast } from "sonner";

// Table cell viewer component
const TableCellViewer = ({ value, type }: { value: unknown; type: string }) => {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground">-</span>;
  }

  switch (type) {
    case "avatar":
      return (
        <Avatar className="h-8 w-8">
          <AvatarImage src={value as string} alt="Employee" />
          <AvatarFallback className="bg-primary text-primary-foreground">
            EM
          </AvatarFallback>
        </Avatar>
      );
    case "status":
      return (
        <Badge className={EmployeeStatusColors[value as EmployeeStatus]}>
          {EmployeeStatusLabels[value as EmployeeStatus]}
        </Badge>
      );
    case "role":
      return (
        <Badge variant="outline">
          {EmployeeRoleLabels[value as EmployeeRole]}
        </Badge>
      );
    case "salary":
      return value ? `$${(value as number).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "N/A";
    case "phone":
      return (value as string) || "N/A";
    case "location": {
      const locationValue = value as {
        city?: string;
        state?: string;
        country?: string;
      };
      const parts = [
        locationValue.city,
        locationValue.state,
        locationValue.country,
      ].filter(Boolean);
      return parts.length > 0 ? parts.join(", ") : "N/A";
    }
    default:
      return (value as string) || "N/A";
  }
};

interface EmployeeColumnsProps {
  canPerformAction: (action: ActionType) => boolean;
  onViewEmployee: (employee: Employee) => void;
  onEditEmployee: (employee: Employee) => void;
  onDeleteEmployee: (employee: Employee) => void;
}

export const createEmployeeColumns = ({
  canPerformAction,
  onViewEmployee,
  onEditEmployee,
  onDeleteEmployee,
}: EmployeeColumnsProps): ColumnDef<Employee>[] => [
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
      <div className="text-left">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          className="cursor-pointer"
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
    size: 50,
    maxSize: 50,
  },
  {
    id: "avatar",
    accessorFn: (row) => row.name,
    header: "Avatar",
    cell: ({ row }) => {
      const name = row.getValue("name") as string;
      const initials = name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
      return (
        <div className="text-left">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs bg-primary text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>
      );
    },
    enableSorting: false,
    size: 60,
    maxSize: 60,
  },
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="cursor-pointer"
        >
          Name
          <ArrowUpDown className="ml-2 h-2 w-2" />
        </Button>
      );
    },
    cell: ({ row }) => (
      <div className="text-left">
        <div className="flex flex-col">
          <div className="font-medium">{row.getValue("name")}</div>
          <div className="text-sm text-muted-foreground">
            {row.original.email}
          </div>
        </div>
      </div>
    ),
    size: 200,
    minSize: 150,
  },
  {
    accessorKey: "role",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="cursor-pointer"
        >
          Role
          <ArrowUpDown className="ml-2 h-2 w-2" />
        </Button>
      );
    },
    cell: ({ row }) => (
      <div className="text-left">
        <TableCellViewer value={row.getValue("role")} type="role" />
      </div>
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
          className="cursor-pointer"
        >
          Status
          <ArrowUpDown className="ml-2 h-2 w-2" />
        </Button>
      );
    },
    cell: ({ row }) => (
      <div className="text-left">
        <TableCellViewer value={row.getValue("status")} type="status" />
      </div>
    ),
    size: 100,
    maxSize: 100,
  },
  {
    accessorKey: "phone",
    header: "Phone",
    cell: ({ row }) => (
      <div className="text-left">
        <TableCellViewer value={row.getValue("phone")} type="phone" />
      </div>
    ),
    size: 130,
    maxSize: 130,
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="cursor-pointer"
        >
          Created
          <ArrowUpDown className="ml-2 h-2 w-2" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const date = new Date(row.getValue("createdAt"));
      return <div className="text-left">{date.toLocaleDateString()}</div>;
    },
    size: 110,
    maxSize: 110,
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const employee = row.original;

      return (
        <div className="text-left">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0 cursor-pointer">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(employee.email);
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
                  onClick={() => onViewEmployee(employee)}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  View details
                </DropdownMenuItem>
              )}
              {canPerformAction(ActionType.UPDATE) && (
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => onEditEmployee(employee)}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit employee
                </DropdownMenuItem>
              )}
              {canPerformAction(ActionType.DELETE) && (
                <DropdownMenuItem
                  className="text-red-600 cursor-pointer"
                  onClick={() => onDeleteEmployee(employee)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete employee
                </DropdownMenuItem>
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
