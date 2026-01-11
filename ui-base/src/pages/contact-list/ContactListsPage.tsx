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
import { ListPlus } from "lucide-react";
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
import type { ContactList } from "@/api/contactListTypes";
import { ContactListType } from "@/api/contactListTypes";
import { contactListService } from "@/api/contactListService";
import { ActionType, ModuleName } from "@/api/roleTypes";
import { toast } from "sonner";
import ContactListModal from "./ContactListModal";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/stores/appStore";
import { createContactListColumns } from "./columns";
import { NoDataState } from "@/components/common/NoDataState";

export default function ContactListsPage() {
  const navigate = useNavigate();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [contactLists, setContactLists] = useState<ContactList[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedList, setSelectedList] = useState<ContactList | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [listToDelete, setListToDelete] = useState<ContactList | null>(null);

  const [moduleActions, setModuleActions] = useState<ActionType[]>([]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);

  // Get user data from store
  const { user, selectedOrganizationId } = useAppStore();

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset to first page when search term or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, typeFilter]);

  // Fetch contact lists
  useEffect(() => {
    let isCancelled = false;

    const fetchContactLists = async () => {
      try {
        setLoading(true);
        const response = await contactListService.getContactLists({
          page: currentPage,
          limit: pageSize,
          search: debouncedSearchTerm || undefined,
          organizationId: user?.organizationId,
          type: typeFilter !== "all" ? (typeFilter as ContactListType) : undefined,
        });

        if (!isCancelled) {
          if (response.success && response.data) {
            setContactLists(response.data.data);
            setTotalPages(response.data.totalPages);
            setTotalItems(response.data.total);
          } else {
            setContactLists([]);
            setTotalPages(0);
            setTotalItems(0);
          }
        }
      } catch {
        if (!isCancelled) {
          setContactLists([]);
          setTotalPages(0);
          setTotalItems(0);
          toast.error("Error loading contact lists");
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    fetchContactLists();

    return () => {
      isCancelled = true;
    };
  }, [currentPage, pageSize, debouncedSearchTerm, typeFilter, user?.organizationId, selectedOrganizationId, user?.type]);

  // Fetch module actions
  useEffect(() => {
    const fetchModuleActions = async () => {
      if (!user?.role) {
        return;
      }

      try {
        const response = await import("@/api/roleService").then((module) =>
          module.roleService.getRoleActions(user.role, ModuleName.CONTACT)
        );

        if (response.success && response.data) {
          setModuleActions(response.data.actions || []);
        } else {
          setModuleActions([]);
        }
      } catch (error) {
        setModuleActions([]);
        toast.error("Failed to fetch module actions");
      }
    };

    fetchModuleActions();
  }, [user]);

  // Refresh contact lists
  const refreshContactLists = async () => {
    try {
      setLoading(true);
      const response = await contactListService.getContactLists({
        page: currentPage,
        limit: pageSize,
        search: searchTerm || undefined,
        organizationId: user?.organizationId,
        type: typeFilter !== "all" ? (typeFilter as ContactListType) : undefined,
      });

      if (response.success && response.data) {
        setContactLists(response.data.data);
        setTotalPages(response.data.totalPages);
        setTotalItems(response.data.total);
      } else {
        setContactLists([]);
        setTotalPages(0);
        setTotalItems(0);
      }
    } catch {
      setContactLists([]);
      setTotalPages(0);
      setTotalItems(0);
      toast.error("Error refreshing contact lists");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  const handleAddList = () => {
    setSelectedList(null);
    setIsViewMode(false);
    setIsModalOpen(true);
  };

  const handleEditList = (list: ContactList) => {
    setSelectedList(list);
    setIsViewMode(false);
    setIsModalOpen(true);
  };

  const handleViewList = (list: ContactList) => {
    navigate(`/dashboard/contact-lists/${list.id}`);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedList(null);
    setIsViewMode(false);
  };

  const handleModalSuccess = (newListId?: string) => {
    if (newListId) {
      // Navigate to the newly created list
      navigate(`/dashboard/contact-lists/${newListId}`);
    } else {
      refreshContactLists();
    }
  };

  const handleDeleteClick = (list: ContactList) => {
    setListToDelete(list);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!listToDelete) return;

    try {
      const response = await contactListService.deleteContactList(
        listToDelete.id
      );

      if (response.success) {
        toast.success("Contact list deleted successfully");
        refreshContactLists();
      } else {
        // Display the specific error message from the API response
        const errorMessage = response.message || response.error?.details || "Failed to delete contact list";
        toast.error(errorMessage);
      }
    } catch (error) {
      // Handle network errors or other exceptions
      const errorMessage = error instanceof Error ? error.message : "Failed to delete contact list";
      toast.error(errorMessage);
    } finally {
      setIsDeleteDialogOpen(false);
      setListToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setIsDeleteDialogOpen(false);
    setListToDelete(null);
  };

  const canPerformAction = useMemo(() => {
    return (action: ActionType): boolean => {
      return moduleActions.includes(action);
    };
  }, [moduleActions]);

  const columns = useMemo(
    () =>
      createContactListColumns({
        canPerformAction,
        onViewList: handleViewList,
        onEditList: handleEditList,
        onDeleteList: handleDeleteClick,
        onManageContacts: handleViewList,
      }),
    [canPerformAction]
  );

  const table = useReactTable({
    data: contactLists,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    manualPagination: true,
    pageCount: totalPages,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
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

  return (
    <div className="w-full p-4">
      <div className="space-y-4">
        {/* Actions */}
        <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
          {!loading && (
            <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-x-2 sm:space-y-0">
              <Input
                placeholder="Search lists..."
                value={searchTerm}
                onChange={(event) => handleSearchChange(event.target.value)}
                className="w-full sm:max-w-sm"
              />
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Lists" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Lists</SelectItem>
                  <SelectItem value={ContactListType.PUBLIC}>Public</SelectItem>
                  <SelectItem value={ContactListType.PRIVATE}>Private</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-x-2 sm:space-y-0">
            {!loading && totalItems > 0 && (
              <DataTableViewOptions table={table} />
            )}
            {canPerformAction(ActionType.CREATE) && (
              <Button
                className="cursor-pointer w-full sm:w-auto"
                onClick={handleAddList}
              >
                <ListPlus className="mr-2 h-4 w-4" />
                <span>Create List</span>
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="rounded-md border">
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="mt-2 text-sm text-muted-foreground">
                Loading contact lists...
              </p>
            </div>
          </div>
        ) : totalItems === 0 ? (
          <NoDataState
            title={
              debouncedSearchTerm
                ? "No Contact Lists Found"
                : "No Contact Lists Available"
            }
            description={
              debouncedSearchTerm
                ? "No contact lists match your current search criteria."
                : "There are no contact lists yet. Create your first contact list to organize your contacts."
            }
            showAction={false}
          />
        ) : (
          <div className="flex flex-col" style={{ maxHeight: 'calc(100vh - 150px)' }}>
            <div className="overflow-auto flex-1">
              <DataTable columns={columns} table={table} />
            </div>
            <div className="mt-4 flex-shrink-0">
              <DataTablePagination table={table} />
            </div>
          </div>
        )}
      </div>

      {/* Contact List Modal */}
      <ContactListModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        contactList={selectedList}
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
        itemName={listToDelete?.name || ""}
        itemType="contact list"
      />
    </div>
  );
}
