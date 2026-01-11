import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Eye, Edit, Trash2 } from "lucide-react";
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
import type { EmailTemplate } from "@/api/emailTemplateTypes";
import { ActionType } from "@/api/roleTypes";

interface EmailTemplateActions {
  onView: (template: EmailTemplate) => void;
  onEdit: (template: EmailTemplate) => void;
  onDelete: (template: EmailTemplate) => void;
  canPerformAction: (action: ActionType) => boolean;
}

export const createEmailTemplateColumns = (
  actions: EmailTemplateActions
): ColumnDef<EmailTemplate>[] => [
  // Helper: format name to Title Case for display
  // Note: display-only; does not mutate stored value
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => {
      const template = row.original;
      const formatTitleCase = (value?: string) =>
        (value || "").toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase());
      return (
        <span className="font-medium text-sm">{formatTitleCase(template.name)}</span>
      );
    },
    size: 200,
    minSize: 150,
  },
  // Subject column removed per request
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) => {
      const category = row.getValue("category") as string;
      const formatCategory = (value?: string) => {
        if (!value) return "";
        return value
          .toLowerCase()
          .split(" ")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");
      };
      return category ? (
        <Badge variant="secondary">{formatCategory(category)}</Badge>
      ) : (
        <span className="text-muted-foreground">-</span>
      );
    },
    size: 120,
  },
  {
    accessorKey: "type",
    header: "Visibility",
    cell: ({ row }) => {
      const type = row.getValue("type") as string;
      const isPublic = type === "PUBLIC";
      return (
        <Badge variant={isPublic ? "default" : "outline"}>
          {isPublic ? "Public" : "Private"}
        </Badge>
      );
    },
    size: 100,
  },
  {
    id: "owner",
    header: "Owner",
    cell: ({ row }) => {
      const t = row.original as EmailTemplate;
      const fullName = [t.createdByUser?.firstName, t.createdByUser?.lastName]
        .filter(Boolean)
        .join(" ");
      const ownerLabel = fullName || t.createdByUser?.email || t.createdBy || "-";
      return (
        <span className="text-sm text-muted-foreground">{ownerLabel}</span>
      );
    },
    size: 150,
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }) => {
      const createdAt = row.getValue("createdAt") as string;
      return (
        <span className="text-sm text-muted-foreground">
          {new Date(createdAt).toLocaleDateString()}
        </span>
      );
    },
    size: 110,
  },
  {
    id: "actions",
    enableHiding: false,
    size: 60,
    maxSize: 60,
    cell: ({ row }) => {
      const template = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-7 w-7 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            {actions.canPerformAction(ActionType.READ) && (
              <DropdownMenuItem onClick={() => actions.onView(template)}>
                <Eye className="mr-2 h-3 w-3" />
                View
              </DropdownMenuItem>
            )}
            {actions.canPerformAction(ActionType.UPDATE) && (
              <DropdownMenuItem onClick={() => actions.onEdit(template)}>
                <Edit className="mr-2 h-3 w-3" />
                Edit
              </DropdownMenuItem>
            )}
            {actions.canPerformAction(ActionType.DELETE) && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => actions.onDelete(template)}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-3 w-3" />
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
