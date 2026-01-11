"use client";

import type { ColumnDef } from "@tanstack/react-table";
import {
  ArrowUpDown,
  MoreHorizontal,
  Eye,
  Copy,
  Activity,
  Calendar,
  User,
  Database,
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
import type { AuditLog } from "@/api/auditTypes";
import {
  AuditAction,
  AuditModule,
  AuditActionLabels,
  AuditModuleLabels,
  AuditActionColors,
} from "@/api/auditTypes";
import { ActionType } from "@/api/roleTypes";
import { toast } from "sonner";

// Table cell viewer component
const TableCellViewer = ({ value, type }: { value: unknown; type: string }) => {
  switch (type) {
    case "action":
      const action = value as string;
      const actionKey = action as AuditAction;
      return (
        <Badge
          variant="outline"
          className={`cursor-pointer ${
            AuditActionColors[actionKey] || "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
          }`}
        >
          {AuditActionLabels[actionKey] || action}
        </Badge>
      );
    case "module":
      const module = value as AuditModule;
      return (
        <Badge
          variant="outline"
          className="cursor-pointer bg-blue-100 text-blue-800 hover:bg-blue-200"
        >
          {AuditModuleLabels[module] || module}
        </Badge>
      );
    case "date":
      return (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="text-sm">
            {new Date(value as string).toLocaleString()}
          </span>
        </div>
      );
    case "time":
      return (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="text-sm">
            {new Date(value as string).toLocaleTimeString()}
          </span>
        </div>
      );
    case "employee":
      return (
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="text-sm truncate" title={value as string}>
            {value as string}
          </span>
        </div>
      );
    case "center":
      return (
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="text-sm truncate" title={value as string}>
            {value as string}
          </span>
        </div>
      );
    default:
      return <span className="text-sm">{String(value || "")}</span>;
  }
};

interface AuditLogColumnsProps {
  canPerformAction: (action: ActionType) => boolean;
  onViewAuditLog: (auditLog: AuditLog) => void;
}

export const createAuditLogColumns = ({
  canPerformAction,
  onViewAuditLog,
}: AuditLogColumnsProps): ColumnDef<AuditLog>[] => [
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
    accessorKey: "action",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium hover:bg-transparent"
        >
          Action
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => (
      <div className="text-left min-w-[120px]">
        <TableCellViewer value={row.getValue("action")} type="action" />
      </div>
    ),
  },
  {
    accessorKey: "module",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium hover:bg-transparent"
        >
          Module
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => (
      <div className="text-left min-w-[120px]">
        <TableCellViewer value={row.getValue("module")} type="module" />
      </div>
    ),
  },
  {
    accessorKey: "performedByUser",
    header: "Performed By",
    cell: ({ row }) => {
      const user = row.original.performedByUser;
      const userName = user?.name || user?.email || "System";
      return (
        <div className="text-left min-w-[150px]">
          <TableCellViewer value={userName} type="employee" />
        </div>
      );
    },
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => {
      const description = row.getValue("description") as string;
      return (
        <div className="text-left min-w-[200px] max-w-[300px]">
          <div className="text-sm truncate" title={description}>
            {description || "No description"}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "eventTimestamp",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium hover:bg-transparent"
        >
          Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const timestamp = row.getValue("eventTimestamp") as string;
      return (
        <div className="text-left min-w-[120px]">
          <TableCellViewer value={timestamp} type="date" />
        </div>
      );
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const auditLog = row.original;

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
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  navigator.clipboard.writeText(auditLog.id.toString());
                  toast.success("Audit log ID copied to clipboard");
                }}
                className="cursor-pointer"
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy ID
              </DropdownMenuItem>
              {canPerformAction("READ") && (
                <DropdownMenuItem
                  onClick={() => onViewAuditLog(auditLog)}
                  className="cursor-pointer"
                >
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
    enableSorting: false,
    enableHiding: false,
    size: 80,
    maxSize: 80,
  },
];
