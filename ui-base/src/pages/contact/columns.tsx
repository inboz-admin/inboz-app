"use client";

import type { ColumnDef } from "@tanstack/react-table";
import {
  ArrowUpDown,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Copy,
  Mail,
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
import type { Contact } from "@/api/contactTypes";
import {
  ContactStatus,
  ContactStatusLabels,
  ContactStatusColors,
} from "@/api/contactTypes";
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
        <Badge className={ContactStatusColors[value as ContactStatus]}>
          {ContactStatusLabels[value as ContactStatus]}
        </Badge>
      );
    case "company":
      return (value as string) || "N/A";
    default:
      return (value as string) || "N/A";
  }
};

interface ContactColumnsProps {
  canPerformAction: (action: ActionType) => boolean;
  onViewContact: (contact: Contact) => void;
  onEditContact: (contact: Contact) => void;
  onDeleteContact: (contact: Contact) => void;
}

export const createContactColumns = ({
  canPerformAction,
  onViewContact,
  onEditContact,
  onDeleteContact,
}: ContactColumnsProps): ColumnDef<Contact>[] => [
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
    cell: ({ row }) => (
      <div className="font-medium text-sm">
        {`${row.original.firstName || ""} ${row.original.lastName || ""}`.trim() || "Unknown"}
      </div>
    ),
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
    accessorKey: "company",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="cursor-pointer h-8 px-2"
        >
          Company
          <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      );
    },
    cell: ({ row }) => (
      <TableCellViewer value={row.getValue("company")} type="company" />
    ),
    size: 150,
    maxSize: 150,
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
      const status = row.getValue("status") as ContactStatus;
      return (
        <Badge
          className={ContactStatusColors[status] || "text-gray-600 bg-gray-50"}
        >
          {ContactStatusLabels[status] || status}
        </Badge>
      );
    },
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
      const contact = row.original;

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
                    await navigator.clipboard.writeText(contact.email);
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
              {/* Commented out send email option */}
              {/* <DropdownMenuItem
                onClick={async () => {
                  try {
                    const mailtoLink = `mailto:${contact.email}`;
                    window.open(mailtoLink, "_blank");
                  } catch {
                    toast.error("Failed to open email client");
                  }
                }}
                className="cursor-pointer"
              >
                <Mail className="mr-2 h-4 w-4" />
                Send email
              </DropdownMenuItem> */}
              <DropdownMenuSeparator />
              {canPerformAction(ActionType.READ) && (
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => onViewContact(contact)}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  View details
                </DropdownMenuItem>
              )}
              {canPerformAction(ActionType.UPDATE) && (
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => onEditContact(contact)}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit contact
                </DropdownMenuItem>
              )}
              {canPerformAction(ActionType.DELETE) && (
                <DropdownMenuItem
                  className="text-red-600 cursor-pointer"
                  onClick={() => onDeleteContact(contact)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete contact
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
        </DropdownMenu>
      );
    },
    size: 60,
    maxSize: 60,
  },
];
