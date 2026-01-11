import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowUpDown, MoreHorizontal, Eye, Edit, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { PlatformEmployee } from "@/api";
import {
  PlatformEmployeeRoleLabels,
  PlatformEmployeeStatusLabels,
  PlatformEmployeeStatusColors,
} from "@/api";

interface CreatePlatformEmployeeColumnsProps {
  isSuperAdmin: boolean;
  onView: (employee: PlatformEmployee) => void;
  onEdit: (employee: PlatformEmployee) => void;
  onDelete: (employee: PlatformEmployee) => void;
}

export function createPlatformEmployeeColumns({
  isSuperAdmin,
  onView,
  onEdit,
  onDelete,
}: CreatePlatformEmployeeColumnsProps): ColumnDef<PlatformEmployee>[] {
  return [
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
          {row.getValue("email")}
        </div>
      ),
      size: 220,
      minSize: 180,
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
      cell: ({ row }) => {
        const role = row.getValue("role") as string;
        return (
          <Badge variant="outline">
            {PlatformEmployeeRoleLabels[role as keyof typeof PlatformEmployeeRoleLabels] || role}
          </Badge>
        );
      },
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
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        const statusColor = PlatformEmployeeStatusColors[status as keyof typeof PlatformEmployeeStatusColors] || "";
        return (
          <Badge className={statusColor}>
            {PlatformEmployeeStatusLabels[status as keyof typeof PlatformEmployeeStatusLabels] || status}
          </Badge>
        );
      },
      size: 100,
      maxSize: 100,
    },
    {
      accessorKey: "lastLoginAt",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="cursor-pointer h-8 px-2"
          >
            Last Login
            <ArrowUpDown className="ml-2 h-3 w-3" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const lastLogin = row.getValue("lastLoginAt") as string | undefined;
        return (
          <div className="text-sm">
            {lastLogin
              ? new Date(lastLogin).toLocaleDateString()
              : "Never"}
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
        const employee = row.original;

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
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => onView(employee)}
              >
                <Eye className="mr-2 h-4 w-4" />
                View details
              </DropdownMenuItem>
              {isSuperAdmin && (
                <>
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => onEdit(employee)}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit employee
                  </DropdownMenuItem>
                  {/* Don't allow deletion of SUPERADMIN employees */}
                  {employee.role !== "SUPERADMIN" && (
                    <DropdownMenuItem
                      className="text-red-600 cursor-pointer"
                      onClick={() => onDelete(employee)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete employee
                    </DropdownMenuItem>
                  )}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
      size: 60,
      maxSize: 60,
    },
  ];
}

