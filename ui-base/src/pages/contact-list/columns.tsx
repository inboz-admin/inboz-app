"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal, Trash2, Users, Edit } from "lucide-react";
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
import type { ContactList } from "@/api/contactListTypes";
import { ContactListType } from "@/api/contactListTypes";
import { ActionType } from "@/api/roleTypes";

interface ContactListColumnsProps {
  canPerformAction: (action: ActionType) => boolean;
  onViewList: (list: ContactList) => void;
  onEditList: (list: ContactList) => void;
  onDeleteList: (list: ContactList) => void;
  onManageContacts: (list: ContactList) => void;
}

export const createContactListColumns = ({
  canPerformAction,
  onViewList,
  onEditList,
  onDeleteList,
  onManageContacts,
}: ContactListColumnsProps): ColumnDef<ContactList>[] => [
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="cursor-pointer h-8 px-2"
        >
          List Name
          <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      );
    },
    cell: ({ row }) => (
      <div>
        <div className="font-medium text-sm">{row.original.name}</div>
        {row.original.description && (
          <div className="text-xs text-muted-foreground line-clamp-1">
            {row.original.description}
          </div>
        )}
      </div>
    ),
    size: 250,
    minSize: 200,
  },
  {
    accessorKey: "contactCount",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="cursor-pointer h-8 px-2"
        >
          Contacts
          <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      );
    },
    cell: ({ row }) => (
      <Badge variant="secondary" className="font-mono">
        {row.original.contactCount}
      </Badge>
    ),
    size: 120,
    maxSize: 120,
  },
  {
    accessorKey: "type",
    header: "Visibility",
    cell: ({ row }) => {
      const type = row.getValue("type") as ContactListType;
      const isPublic = type === ContactListType.PUBLIC;
      return (
        <Badge variant={isPublic ? "default" : "outline"}>
          {isPublic ? "Public" : "Private"}
        </Badge>
      );
    },
    size: 100,
    maxSize: 120,
  },
  {
    id: "owner",
    header: "Owner",
    cell: ({ row }) => {
      const list = row.original as ContactList;
      const fullName = [list.creator?.firstName, list.creator?.lastName]
        .filter(Boolean)
        .join(" ");
      const ownerLabel = fullName || list.creator?.email || list.createdBy || "-";
      return (
        <span className="text-sm text-muted-foreground">{ownerLabel}</span>
      );
    },
    size: 150,
    maxSize: 200,
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
      const list = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-7 w-7 p-0 cursor-pointer">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canPerformAction(ActionType.READ) && (
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => onViewList(list)}
                >
                  <Users className="mr-2 h-4 w-4" />
                  Manage
                </DropdownMenuItem>
              )}
              {canPerformAction(ActionType.UPDATE) && (
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => onEditList(list)}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
              )}
              {canPerformAction(ActionType.DELETE) && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-red-600 cursor-pointer"
                    onClick={() => onDeleteList(list)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
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
