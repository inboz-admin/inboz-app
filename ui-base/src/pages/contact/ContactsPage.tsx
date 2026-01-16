"use client";

import { useState, useMemo, useEffect } from "react";
import type {
  ColumnFiltersState,
  SortingState,
  VisibilityState,
} from "@tanstack/react-table";
import {
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { UserPlus, Download, Upload, ListPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDeleteDialog } from "@/components/common";
import {
  DataTable,
  DataTableViewOptions,
  DataTablePagination,
} from "@/components/common";
import type { Contact } from "@/api/contactTypes";
import {
  ContactStatus,
  ContactStatusLabels,
  ContactSourceLabels,
} from "@/api/contactTypes";
import { contactService } from "@/api/contactService";
import { ActionType, ModuleName } from "@/api/roleTypes";
import { toast } from "sonner";
import ContactModal from "./ContactModal";
import ExcelUploadModal from "@/components/ExcelUploadModal";
import AddToListModal from "./AddToListModal";
import { useAppStore } from "@/stores/appStore";
import { createContactColumns } from "./columns";
import { useOrganizationTimezone } from "@/hooks/useOrganizationTimezone";
import { exportToCSVWithAudit } from "@/utils/csvExport";
import { NoDataState } from "@/components/common/NoDataState";
import { useSelectionSession } from "@/hooks/useSelectionSession";
import { useContactSelectionStore } from "@/stores/contactSelectionStore";

export default function ContactsPage() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isAddToListOpen, setIsAddToListOpen] = useState(false);

  const [moduleActions, setModuleActions] = useState<ActionType[]>([]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);

  // Get user data from store
  const { user, selectedOrganizationId } = useAppStore();
  
  // Get organization timezone
  const timezone = useOrganizationTimezone();

  // Global selection store (for regular contact operations)
  const {
    selectedIds,
    addSelection,
    removeSelection,
    clearSelection: clearGlobalSelection,
  } = useContactSelectionStore();

  // Session-based selection (only if user has selected a list to manage)
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
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
  } = useSelectionSession(selectedListId || "");

  // Local row selection state for table
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});

  // Sync local row selection with EITHER session state OR global selection store
  // This runs every time the page changes or selection state updates
  useEffect(() => {
    const selection: Record<string, boolean> = {};
    
    if (selectionState) {
      // Use session-based selection (for list management)
      contacts.forEach((contact, index) => {
        if (selectionState.currentSelection.includes(contact.id)) {
          selection[index] = true;
        }
      });
    } else {
      // Use global selection store (for regular operations)
      contacts.forEach((contact, index) => {
        if (selectedIds.has(contact.id)) {
          selection[index] = true;
        }
      });
    }
    
    setRowSelection(selection);
  }, [contacts, selectionState, selectedIds, currentPage]); // Added selectedIds dependency

  // Debounce search term to prevent excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset to first page when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm]);

  // Reset to first page when status filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

  // Fetch contacts data on component mount and when pagination/filters change
  useEffect(() => {
    let isCancelled = false;

    const fetchContacts = async () => {
      try {
        setLoading(true);
        const response = await contactService.getContacts({
          page: currentPage,
          limit: pageSize,
          search: debouncedSearchTerm || undefined,
          status:
            statusFilter !== "all"
              ? (statusFilter as ContactStatus)
              : undefined,
          organizationId: user?.organizationId,
        });

        // Only update state if component is still mounted
        if (!isCancelled) {
          if (response.success && response.data) {
            setContacts(response.data.data);
            setTotalPages(response.data.totalPages);
            setTotalItems(response.data.total);
          } else {
            setContacts([]);
            setTotalPages(0);
            setTotalItems(0);
          }
        }
      } catch {
        // Fallback to sample data on error
        if (!isCancelled) {
          setContacts([]);
          setTotalPages(0);
          setTotalItems(0);
          toast.error("Error loading contacts, using sample data");
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    fetchContacts();

    return () => {
      isCancelled = true;
    };
  }, [
    currentPage,
    pageSize,
    debouncedSearchTerm,
    statusFilter,
    user?.organizationId,
    selectedOrganizationId, // Refresh when organization changes (for employees)
    user?.type, // Refresh when user type changes
  ]);

  // Fetch module actions when user is available
  useEffect(() => {
    const fetchModuleActions = async () => {
      if (!user?.role) {
        return;
      }

      try {
        // Use CONTACTS module for role-based actions
        const response = await import("@/api/roleService").then((module) =>
          module.roleService.getRoleActions(user.role, ModuleName.CONTACT)
        );

        if (response.success && response.data) {
          setModuleActions(response.data.actions || []);
        } else {
          setModuleActions([]);
          if (response.message) {
            toast.error(`Failed to fetch permissions: ${response.message}`);
          } else {
            toast.error(
              "Failed to fetch module actions - no permissions data received"
            );
          }
        }
      } catch (error) {
        setModuleActions([]);
        toast.error(
          `Failed to fetch module actions: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    };

    fetchModuleActions();
  }, [user]);

  // Refresh contacts data
  const refreshContacts = async () => {
    try {
      setLoading(true);
      const response = await contactService.getContacts({
        page: currentPage,
        limit: pageSize,
        search: searchTerm || undefined,
        status:
          statusFilter !== "all" ? (statusFilter as ContactStatus) : undefined,
        organizationId: user?.organizationId,
      });

      if (response.success && response.data) {
        setContacts(response.data.data);
        setTotalPages(response.data.totalPages);
        setTotalItems(response.data.total);
      } else {
        setContacts([]);
        setTotalPages(0);
        setTotalItems(0);
      }
    } catch {
      setContacts([]);
      setTotalPages(0);
      setTotalItems(0);
      toast.error("Error refreshing contacts data");
    } finally {
      setLoading(false);
    }
  };

  // Handle search change
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    // Page reset is handled by useEffect when debouncedSearchTerm changes
  };

  // Handle status filter change
  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1); // Reset to first page when filtering
  };

  // Handle opening modal for adding new contact
  const handleAddContact = () => {
    setIsModalOpen(true);
  };

  // Handle opening modal for editing contact
  const handleEditContact = (contact: Contact) => {
    setSelectedContact(contact);
    setIsViewMode(false);
    setIsModalOpen(true);
  };

  // Handle opening modal for viewing contact details
  const handleViewContact = (contact: Contact) => {
    setSelectedContact(contact);
    setIsViewMode(true);
    setIsModalOpen(true);
  };

  // Handle closing modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedContact(null);
    setIsViewMode(false);
  };

  // Handle successful form submission
  const handleModalSuccess = () => {
    refreshContacts();
  };

  // Handle delete confirmation
  const handleDeleteClick = (contact: Contact) => {
    setContactToDelete(contact);
    setIsDeleteDialogOpen(true);
  };

  // Handle confirmed delete
  const handleConfirmDelete = async () => {
    if (!contactToDelete) return;

    try {
      const response = await contactService.deleteContact(
        contactToDelete.id,
        user?.organizationId
      );

      if (response.success) {
        toast.success("Contact deleted successfully");
        refreshContacts();
      } else {
        toast.error("Failed to delete contact");
      }
    } catch {
      toast.error("Failed to delete contact");
    } finally {
      setIsDeleteDialogOpen(false);
      setContactToDelete(null);
    }
  };

  // Handle cancel delete
  const handleCancelDelete = () => {
    setIsDeleteDialogOpen(false);
    setContactToDelete(null);
  };


  // Handle CSV export
  const handleExportCSV = async () => {
    // Get selected contact IDs
    const selectedContactIds = sessionId 
      ? table.getFilteredSelectedRowModel().rows.map(row => row.original.id)
      : Array.from(selectedIds);
      
    if (selectedContactIds.length === 0) {
      toast.error("No contacts selected for export");
      return;
    }

    try {
      // Get all selected contacts (not just current page)
      const allSelectedContacts = contacts.filter(c => selectedContactIds.includes(c.id));
      
      // Transform data for export with proper labels
      const contactsToExport = allSelectedContacts.map((contact) => {
        return {
          ...contact,
          name: `${contact.firstName || ""} ${contact.lastName || ""}`.trim(),
          status: ContactStatusLabels[contact.status] || contact.status,
          source:
            ContactSourceLabels[contact.source || ""] ||
            contact.source ||
            "Unknown",
          subscribed: contact.subscribed ? "Yes" : "No",
          createdAt: new Date(contact.createdAt).toLocaleDateString(),
        };
      });

      // Export with audit logging
      await exportToCSVWithAudit(
        contactsToExport,
        "contacts",
        {
          module: "CONTACTS",
          organizationId: user?.organizationId || undefined,
          userId: user?.id || undefined,
          recordIds: selectedContactIds,
          description: `Exported ${contactsToExport.length} contact(s) to CSV`,
        }
      );

      toast.success(
        `Exported ${contactsToExport.length} contacts successfully`
      );
      
      // Clear global selection after successful export
      if (!sessionId) {
        clearGlobalSelection();
      }
    } catch (error) {
      toast.error("Failed to export contacts");
      console.error("Export error:", error);
    }
  };

  // Handle bulk upload
  const handleBulkUpload = () => {
    setIsBulkUploadOpen(true);
  };

  // Handle bulk upload success
  const handleBulkUploadSuccess = () => {
    setIsBulkUploadOpen(false);
    refreshContacts();
  };

  // Handle add to list (for regular contact management)
  const handleAddToList = () => {
    // Check if we have any selections (either from table or global store)
    const selectedCount = sessionId 
      ? table.getFilteredSelectedRowModel().rows.length
      : selectedIds.size;
      
    if (selectedCount === 0) {
      toast.error("No contacts selected");
      return;
    }
    setIsAddToListOpen(true);
  };

  // Handle add to list success
  const handleAddToListSuccess = () => {
    setIsAddToListOpen(false);
    // Clear global selection after successful operation
    if (!sessionId) {
      clearGlobalSelection();
    }
    refreshContacts();
  };

  // Session-based selection handlers
  const handleStartListManagement = (listId: string) => {
    setSelectedListId(listId);
    initializeSession();
  };

  const handleApplySelection = async () => {
    try {
      await applySelection();
      refreshContacts();
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const handleClearSelection = async () => {
    try {
      await resetSelectionToOriginal();
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  // Check if action is available in module actions
  const canPerformAction = useMemo(() => {
    return (action: ActionType): boolean => {
      return moduleActions.includes(action);
    };
  }, [moduleActions]);

  // Table columns definition
  const columns = useMemo(
    () =>
      createContactColumns({
        canPerformAction,
        onViewContact: handleViewContact,
        onEditContact: handleEditContact,
        onDeleteContact: handleDeleteClick,
        timezone,
      }),
    [canPerformAction, timezone]
  );

  const table = useReactTable({
    data: contacts,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: (updater) => {
      const newSelection =
        typeof updater === "function" ? updater(rowSelection) : updater;

      // Update local state immediately for UI responsiveness
      setRowSelection(newSelection);

      // Get newly selected IDs from current page
      const newlySelectedOnPage = Object.keys(newSelection)
        .filter((key) => newSelection[key])
        .map((index) => contacts[parseInt(index)]?.id)
        .filter((id): id is string => Boolean(id));

      const currentPageContactIds = new Set(contacts.map((c) => c.id));

      if (sessionId && selectionState) {
        // Session-based selection (for list management)
        const currentlySelected = selectionState.currentSelection || [];
        
        const toAdd = newlySelectedOnPage.filter(
          (id) => !currentlySelected.includes(id)
        );
        const toRemove = currentlySelected.filter(
          (id) =>
            currentPageContactIds.has(id) && !newlySelectedOnPage.includes(id)
        );

        if (toAdd.length > 0) {
          updateSelection(toAdd, "add");
        }
        if (toRemove.length > 0) {
          updateSelection(toRemove, "remove");
        }
      } else {
        // Global store selection (for regular operations)
        const currentlySelected = Array.from(selectedIds);
        
        const toAdd = newlySelectedOnPage.filter(
          (id) => !selectedIds.has(id)
        );
        const toRemove = currentlySelected.filter(
          (id) =>
            currentPageContactIds.has(id) && !newlySelectedOnPage.includes(id)
        );

        if (toAdd.length > 0) {
          addSelection(toAdd);
        }
        if (toRemove.length > 0) {
          removeSelection(toRemove);
        }
      }
    },
    enableRowSelection: true,
    // Server-side pagination configuration
    manualPagination: true,
    pageCount: totalPages,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination: {
        pageIndex: currentPage - 1, // TanStack Table uses 0-based indexing
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

  return (
    <div className="w-full p-4">
      <div className="space-y-4">
        {/* Actions */}
        <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
          {!loading && (
            <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-x-2 sm:space-y-0">
              <Input
                placeholder="Search contacts..."
                value={searchTerm}
                onChange={(event) => handleSearchChange(event.target.value)}
                className="w-full sm:max-w-sm"
              />
              <Select
                value={statusFilter}
                onValueChange={handleStatusFilterChange}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {Object.entries(ContactStatusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-x-2 sm:space-y-0">
            {!loading && totalItems > 0 && (
              <>
                <DataTableViewOptions table={table} />

                {/* Session-based selection actions */}
                {selectionState ? (
                  <>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="font-medium text-primary">
                        {selectionState.totalSelected}
                      </span>
                      <span>selected</span>
                      {selectionState.addedCount > 0 && (
                        <span className="text-green-600">
                          (+{selectionState.addedCount})
                        </span>
                      )}
                      {selectionState.removedCount > 0 && (
                        <span className="text-red-600">
                          (-{selectionState.removedCount})
                        </span>
                      )}
                    </div>

                    {(selectionState.addedCount > 0 ||
                      selectionState.removedCount > 0) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleClearSelection}
                        disabled={selectionLoading}
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
                        onClick={handleApplySelection}
                        disabled={selectionLoading}
                      >
                        {selectionLoading ? "Saving..." : "Apply Changes"}
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    {(() => {
                      const selectedCount = selectedIds.size;
                      return selectedCount > 0 && (
                        <>
                          {canPerformAction(ActionType.UPDATE) && (
                            <Button
                              variant="outline"
                              className="cursor-pointer"
                              onClick={handleAddToList}
                            >
                              <ListPlus className="mr-2 h-4 w-4" />
                              <span>Add to List</span>
                              <span className="ml-1">
                                ({selectedCount})
                              </span>
                            </Button>
                          )}
                          {canPerformAction(ActionType.READ) && (
                            <Button
                              variant="outline"
                              className="cursor-pointer"
                              onClick={handleExportCSV}
                            >
                              <Download className="mr-2 h-4 w-4" />
                              <span>Export</span>
                              <span className="ml-1">
                                ({selectedCount})
                              </span>
                            </Button>
                          )}
                        </>
                      );
                    })()}
                  </>
                )}
              </>
            )}
            {canPerformAction(ActionType.CREATE) && (
              <>
                <Button
                  variant="outline"
                  className="cursor-pointer w-full sm:w-auto"
                  onClick={handleBulkUpload}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  <span>Excel Upload</span>
                </Button>
                <Button
                  className="cursor-pointer w-full sm:w-auto"
                  onClick={handleAddContact}
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  <span>Add Contact</span>
                </Button>
              </>
            )}
          </div>
        </div>

        {loading ? (
          <div className="rounded-md border">
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="mt-2 text-sm text-muted-foreground">
                Loading contacts...
              </p>
            </div>
          </div>
        ) : totalItems === 0 ? (
          <NoDataState
            title={
              debouncedSearchTerm || statusFilter !== "all"
                ? "No Contacts Found"
                : "No Contacts Available"
            }
            description={
              debouncedSearchTerm || statusFilter !== "all"
                ? "No contacts match your current search criteria. Try adjusting your search term or filters."
                : "There are no contacts in the system yet. Use the Add Contact button above to add your first contact."
            }
            showAction={false}
          />
        ) : (
          <div className="flex flex-col" style={{ maxHeight: 'calc(100vh - 150px)' }}>
            <div className="overflow-auto flex-1">
              <DataTable columns={columns} table={table} />
            </div>
            <div className="mt-4 flex-shrink-0">
              <DataTablePagination
                table={table}
                totalCount={totalItems}
                selectedCount={
                  selectionState?.totalSelected ||
                  selectedIds.size
                }
              />
            </div>
          </div>
        )}
      </div>

      {/* Contact Modal */}
      <ContactModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        contact={selectedContact}
        onSuccess={handleModalSuccess}
        isReadOnly={isViewMode}
        userOrganizationId={user?.organizationId}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDeleteDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        itemName={contactToDelete?.email}
        itemType="contact"
      />


      {/* Excel Upload Modal */}
      <ExcelUploadModal
        isOpen={isBulkUploadOpen}
        onClose={() => setIsBulkUploadOpen(false)}
        onSuccess={handleBulkUploadSuccess}
        organizationId={user?.organizationId}
      />

      {/* Add to List Modal */}
      <AddToListModal
        isOpen={isAddToListOpen}
        onClose={() => setIsAddToListOpen(false)}
        selectedContactIds={
          sessionId 
            ? table.getFilteredSelectedRowModel().rows.map((row) => row.original.id)
            : Array.from(selectedIds)
        }
        organizationId={user?.organizationId}
        onSuccess={handleAddToListSuccess}
      />
    </div>
  );
}
