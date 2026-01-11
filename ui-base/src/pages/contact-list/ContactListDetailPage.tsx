"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { Edit, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDeleteDialog } from "@/components/common";
import { DataTable, DataTablePagination } from "@/components/common";
import { contactService } from "@/api/contactService";
import { contactListService } from "@/api/contactListService";
import type { Contact } from "@/api/contactTypes";
import type { ContactList } from "@/api/contactListTypes";
import { ContactStatusLabels, ContactStatusColors, ContactStatus } from "@/api/contactTypes";
import { toast } from "sonner";
import { useAppStore } from "@/stores/appStore";
import { ActionType, ModuleName } from "@/api/roleTypes";
import ContactListModal from "./ContactListModal";
import { useSelectionSession } from "@/hooks/useSelectionSession";

export default function ContactListDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAppStore();

  const [contactList, setContactList] = useState<ContactList | null>(null);
  const [loading, setLoading] = useState(true);
  const [allContacts, setAllContacts] = useState<Contact[]>([]); // All contacts paginated
  const [searchTerm, setSearchTerm] = useState("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalContacts, setTotalContacts] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [moduleActions, setModuleActions] = useState<ActionType[]>([]);

  // Session-based selection
  const {
    sessionId,
    selectionState,
    loading: selectionLoading,
    error: selectionError,
    initializeSession,
    updateSelection,
    applySelection,
    resetSelectionToOriginal,
    clearSession,
  } = useSelectionSession(id || "");

  // Local row selection state for table
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});

  // Fetch module actions
  useEffect(() => {
    const fetchModuleActions = async () => {
      if (!user?.role) return;

      try {
        const response = await import("@/api/roleService").then((module) =>
          module.roleService.getRoleActions(user.role, ModuleName.CONTACT)
        );

        if (response.success && response.data) {
          setModuleActions(response.data.actions || []);
        }
      } catch (error) {
        setModuleActions([]);
      }
    };

    fetchModuleActions();
  }, [user]);

  // Fetch contact list details and initialize session
  useEffect(() => {
    if (id) {
      fetchContactListDetails();
      initializeSession().catch((error) => {
        console.error("Failed to initialize session:", error);
        toast.error("Failed to initialize selection session");
      });
    }
  }, [id]);

  const fetchContactListDetails = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const response = await contactListService.getContactList(id);

      if (response.success && response.data) {
        setContactList(response.data);
        await fetchContacts(response.data);
      } else {
        toast.error("Failed to load contact list");
        navigate("/dashboard/contact-lists");
      }
    } catch (error) {
      toast.error("Error loading contact list");
      navigate("/dashboard/contact-lists");
    } finally {
      setLoading(false);
    }
  };

  // Refresh contact list data without affecting loading state
  const refreshContactListData = async () => {
    if (!id) return;

    try {
      const response = await contactListService.getContactList(id);

      if (response.success && response.data) {
        setContactList(response.data);
        await fetchContacts(response.data);
      }
    } catch (error) {
      console.error("Failed to refresh contact list:", error);
    }
  };

  const fetchContacts = async (list: ContactList) => {
    try {
      // Fetch all contacts with pagination (no need to fetch list contacts anymore)
      const allContactsResponse = await contactService.getContacts({
        organizationId: list.organizationId,
        page: currentPage,
        limit: pageSize,
      });

      if (allContactsResponse.data) {
        setAllContacts(allContactsResponse.data.data || []);
        setTotalContacts(allContactsResponse.data.total || 0);
        setTotalPages(allContactsResponse.data.totalPages || 0);
      }
    } catch (error) {
      toast.error("Failed to fetch contacts");
    }
  };

  // Fetch contacts when pagination changes
  useEffect(() => {
    if (contactList) {
      fetchContacts(contactList);
    }
  }, [currentPage, pageSize]);

  // Filter contacts based on search
  const filteredContacts = useMemo(() => {
    if (!searchTerm) return allContacts;
    const term = searchTerm.toLowerCase();
    return allContacts.filter(
      (contact) =>
        contact.email.toLowerCase().includes(term) ||
        contact.firstName?.toLowerCase().includes(term) ||
        contact.lastName?.toLowerCase().includes(term) ||
        contact.company?.toLowerCase().includes(term)
    );
  }, [allContacts, searchTerm]);

  // Sync local row selection with session state
  useEffect(() => {
    if (!selectionState) {
      setRowSelection({});
      return;
    }

    const selection: Record<string, boolean> = {};
    filteredContacts.forEach((contact, index) => {
      if (selectionState.currentSelection.includes(contact.id)) {
        selection[index] = true;
      }
    });
    setRowSelection(selection);
  }, [filteredContacts, selectionState]);

  // Update list with current selection (replace entire list membership)
  const handleUpdateSelection = async () => {
    try {
      setSubmitting(true);

      const result = await applySelection();

      // Refresh the contact list data without affecting loading state
      await refreshContactListData();

      // Small delay to ensure data is updated
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Re-initialize session to show updated state
      await initializeSession();

      toast.success("Contact list updated successfully!");
    } catch (error) {
      console.error("Failed to update selection:", error);
      toast.error("Failed to update contact list");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClearSelection = async () => {
    try {
      await resetSelectionToOriginal();
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const handleEdit = () => {
    setIsEditModalOpen(true);
  };

  const handleDelete = () => {
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!contactList) return;

    try {
      const response = await contactListService.deleteContactList(
        contactList.id
      );

      if (response.success) {
        toast.success("Contact list deleted successfully");
        navigate("/dashboard/contact-lists");
      } else {
        // Display the specific error message from the API response
        const errorMessage = response.message || response.error?.details || "Failed to delete contact list";
        toast.error(errorMessage as string);
      }
    } catch (error) {
      // Handle network errors or other exceptions
      const errorMessage = error instanceof Error ? error.message : "Error deleting contact list";
      toast.error(errorMessage);
    } finally {
      setIsDeleteDialogOpen(false);
    }
  };

  const handleEditSuccess = () => {
    setIsEditModalOpen(false);
    fetchContactListDetails();
  };

  const canPerformAction = useMemo(() => {
    return (action: ActionType): boolean => {
      return moduleActions.includes(action);
    };
  }, [moduleActions]);

  // Create columns for the contact table
  const createContactColumns = (): ColumnDef<Contact>[] => [
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
      header: "Name",
      cell: ({ row }) => (
        <div className="font-medium text-sm">
          {row.original.firstName} {row.original.lastName}
        </div>
      ),
      size: 180,
      minSize: 150,
    },
    {
      accessorKey: "email",
      header: "Email",
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
      header: "Company",
      cell: ({ row }) => (
        <div className="text-sm">{row.original.company || "-"}</div>
      ),
      size: 150,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge
          className={ContactStatusColors[row.original.status as ContactStatus]}
        >
          {ContactStatusLabels[row.original.status] || row.original.status}
        </Badge>
      ),
      size: 120,
    },
  ];

  const columns = useMemo(() => createContactColumns(), [submitting]);

  // Table for all contacts
  const table = useReactTable({
    data: filteredContacts,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: totalPages,
    onRowSelectionChange: (updater) => {
      const newSelection =
        typeof updater === "function" ? updater(rowSelection) : updater;

      // Update local state immediately for UI responsiveness
      setRowSelection(newSelection);

      // Get newly selected IDs from current page
      const newlySelectedOnPage = Object.keys(newSelection)
        .filter((key) => newSelection[key])
        .map((index) => filteredContacts[parseInt(index)]?.id)
        .filter((id): id is string => Boolean(id));

      // Get currently selected IDs from session
      const currentlySelected = selectionState?.currentSelection || [];
      const currentPageContactIds = new Set(filteredContacts.map((c) => c.id));

      // Calculate what to add and remove
      const toAdd = newlySelectedOnPage.filter(
        (id) => !currentlySelected.includes(id)
      );
      const toRemove = currentlySelected.filter(
        (id) =>
          currentPageContactIds.has(id) && !newlySelectedOnPage.includes(id)
      );

      // Update session
      if (sessionId) {
        if (toAdd.length > 0) {
          updateSelection(toAdd, "add");
        }
        if (toRemove.length > 0) {
          updateSelection(toRemove, "remove");
        }
      }
    },
    enableRowSelection: true,
    state: {
      rowSelection,
      pagination: {
        pageIndex: currentPage - 1,
        pageSize: pageSize,
      },
    },
    onPaginationChange: (updater) => {
      if (typeof updater === "function") {
        const newState = updater({
          pageIndex: currentPage - 1,
          pageSize: pageSize,
        });
        if (newState.pageSize !== pageSize) {
          setCurrentPage(1);
        } else {
          setCurrentPage(newState.pageIndex + 1);
        }
        setPageSize(newState.pageSize);
      } else {
        if (updater.pageSize !== pageSize) {
          setCurrentPage(1);
        } else {
          setCurrentPage(updater.pageIndex + 1);
        }
        setPageSize(updater.pageSize);
      }
    },
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-muted-foreground">Loading contact list...</p>
        </div>
      </div>
    );
  }

  if (!contactList) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center">
          <p className="text-muted-foreground">Contact list not found</p>
          <Button
            onClick={() => navigate("/dashboard/contact-lists")}
            className="mt-4"
          >
            Back to Lists
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="space-y-4 p-4">
        {/* Header */}
        <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
          <div>
            <h1 className="text-2xl font-bold">{contactList.name}</h1>
            {contactList.description && (
              <p className="text-muted-foreground">{contactList.description}</p>
            )}
          </div>

          <div className="flex space-x-2">
            {canPerformAction(ActionType.UPDATE) && (
              <Button
                variant="outline"
                onClick={handleEdit}
                className="cursor-pointer"
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit List
              </Button>
            )}
            {canPerformAction(ActionType.DELETE) && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                className="cursor-pointer"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            )}
          </div>
        </div>

        {/* List Info */}
        <div className="grid gap-6 md:grid-cols-3 bg-muted/50 p-4 rounded-lg">
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">
              Contacts in List
            </div>
            <div className="text-2xl font-bold">{contactList.contactCount}</div>
          </div>

          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Created</div>
            <div className="text-2xl font-bold">
              {new Date(contactList.createdAt).toLocaleDateString()}
            </div>
          </div>

          {/* Selection Summary integrated here */}
          {selectionState && (
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Selection</div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-primary">
                  {selectionState.totalSelected}
                </span>
                <span className="text-sm text-muted-foreground">selected</span>
                {selectionState.addedCount > 0 && (
                  <span className="text-xs text-green-600">
                    (+{selectionState.addedCount})
                  </span>
                )}
                {selectionState.removedCount > 0 && (
                  <span className="text-xs text-red-600">
                    (-{selectionState.removedCount})
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Search and Actions */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Selection Action Buttons */}
          {selectionState && (
            <div className="flex items-center gap-2">
              {(selectionState.addedCount > 0 ||
                selectionState.removedCount > 0) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearSelection}
                  disabled={selectionLoading || submitting}
                  className="text-red-600 hover:text-red-700"
                >
                  Reset to Original
                </Button>
              )}

              {(selectionState.addedCount > 0 ||
                selectionState.removedCount > 0) && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleUpdateSelection}
                  disabled={selectionLoading || submitting}
                  className="cursor-pointer"
                >
                  {submitting
                    ? "Saving..."
                    : selectionLoading
                    ? "Loading..."
                    : "Apply Changes"}
                </Button>
              )}
            </div>
          )}

          {/* Fallback action buttons if session is not available */}
          {!selectionState && sessionId && (
            <div className="flex items-center gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={handleUpdateSelection}
                disabled={selectionLoading || submitting}
                className="cursor-pointer"
              >
                {submitting
                  ? "Saving..."
                  : selectionLoading
                  ? "Loading..."
                  : "Save Selection"}
              </Button>
            </div>
          )}
        </div>

        {/* Contacts Table */}
        {filteredContacts.length > 0 ? (
          <>
            <div className="flex flex-col h-[calc(100vh-380px)] min-h-[550px] sm:h-[calc(100vh-360px)] md:h-[calc(100vh-340px)]">
              {/* Fixed Table Container with Scroll */}
              <div className="flex-1 overflow-hidden">
                <div className="h-full overflow-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                  <DataTable columns={columns} table={table} />
                </div>
              </div>
              
              {/* Fixed Pagination at Bottom */}
              <div className="mt-2 flex-shrink-0">
                <DataTablePagination
                  table={table}
                  totalCount={totalContacts}
                  selectedCount={selectionState?.totalSelected || 0}
                />
              </div>
            </div>
          </>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                {searchTerm
                  ? "No contacts found matching your search"
                  : "No contacts available"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Modal */}
      <ContactListModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        contactList={contactList}
        onSuccess={handleEditSuccess}
        isReadOnly={false}
        userOrganizationId={user?.organizationId}
      />

      {/* Delete Confirmation */}
      <ConfirmDeleteDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsDeleteDialogOpen(false)}
        itemName={contactList.name}
        itemType="contact list"
      />
    </div>
  );
}
