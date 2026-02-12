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
import { Plus, Copy, Trash2, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DataTable,
  DataTableViewOptions,
  DataTablePagination,
  DataTableColumnHeader,
} from "@/components/common";
import type { ColumnDef } from "@tanstack/react-table";
import type { Asset } from "@/api/assetTypes";
import { assetService } from "@/api/assetService";
import { toast } from "sonner";
import { ConfirmDeleteDialog } from "@/components/common";
import { AddAssetModal } from "./AddAssetModal";
import { NoDataState } from "@/components/common/NoDataState";
import { formatDateTime } from "@/utils/dateFormat";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Asset | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, typeFilter]);

  useEffect(() => {
    let isCancelled = false;

    const fetchAssets = async () => {
      try {
        setLoading(true);
        const res = await assetService.getAssets({
          page: currentPage,
          limit: pageSize,
          searchTerm: debouncedSearchTerm || undefined,
          type: typeFilter !== "all" ? typeFilter : undefined,
        });
        if (!isCancelled) {
          if (res.success && res.data) {
            setAssets(res.data.data || []);
            setTotalItems(res.data.total ?? 0);
            setTotalPages(res.data.totalPages ?? 1);
          } else {
            setAssets([]);
            setTotalItems(0);
            setTotalPages(0);
          }
        }
      } catch {
        if (!isCancelled) {
          toast.error("Failed to load assets");
          setAssets([]);
          setTotalItems(0);
          setTotalPages(0);
        }
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    fetchAssets();
    return () => {
      isCancelled = true;
    };
  }, [currentPage, pageSize, debouncedSearchTerm, typeFilter]);

  const refreshAssets = async () => {
    try {
      setLoading(true);
      const res = await assetService.getAssets({
        page: currentPage,
        limit: pageSize,
        searchTerm: debouncedSearchTerm || undefined,
        type: typeFilter !== "all" ? typeFilter : undefined,
      });
      if (res.success && res.data) {
        setAssets(res.data.data || []);
        setTotalItems(res.data.total ?? 0);
        setTotalPages(res.data.totalPages ?? 1);
      }
    } catch {
      toast.error("Failed to refresh assets");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  const handleTypeFilterChange = (value: string) => {
    setTypeFilter(value);
    setCurrentPage(1);
  };

  const handleCopyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("URL copied to clipboard");
    } catch {
      toast.error("Failed to copy URL");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await assetService.deleteAsset(deleteTarget.id);
      if (res?.success) {
        toast.success("Asset deleted");
        refreshAssets();
      } else {
        toast.error(res?.message || "Failed to delete asset");
      }
    } catch {
      toast.error("Failed to delete asset");
    } finally {
      setDeleteTarget(null);
    }
  };

  const columns: ColumnDef<Asset>[] = useMemo(
    () => [
      {
        accessorKey: "url",
        header: "Preview",
        cell: ({ row }) => {
          const url = row.original.url;
          return (
            <div className="w-12 h-12 rounded overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
              <img
                src={url}
                alt=""
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  e.currentTarget.nextElementSibling?.classList.remove("hidden");
                }}
              />
              <ImageIcon className="h-6 w-6 text-muted-foreground hidden" />
            </div>
          );
        },
        size: 80,
      },
      {
        accessorKey: "originalname",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Name" />
        ),
        cell: ({ row }) => (
          <span className="font-medium truncate max-w-[200px] block">
            {row.original.originalname}
          </span>
        ),
        size: 220,
      },
      {
        accessorKey: "type",
        header: "Type",
        cell: ({ row }) => row.original.type || "image",
        size: 80,
      },
      {
        accessorKey: "size",
        header: "Size",
        cell: ({ row }) =>
          row.original.size != null
            ? formatFileSize(row.original.size)
            : "—",
        size: 90,
      },
      {
        accessorKey: "createdAt",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Added" />
        ),
        cell: ({ row }) => formatDateTime(row.original.createdAt),
        size: 160,
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const asset = row.original;
          return (
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => handleCopyUrl(asset.url)}
                title="Copy URL"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                onClick={() => setDeleteTarget(asset)}
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        },
        size: 90,
      },
    ],
    []
  );

  const table = useReactTable({
    data: assets,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    manualPagination: true,
    pageCount: totalPages,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      pagination: {
        pageIndex: currentPage - 1,
        pageSize,
      },
    },
    onPaginationChange: (updater) => {
      if (typeof updater === "function") {
        const newState = updater({
          pageIndex: currentPage - 1,
          pageSize,
        });
        if (newState.pageSize !== pageSize) {
          setCurrentPage(1);
        } else {
          setCurrentPage(newState.pageIndex + 1);
        }
        setPageSize(newState.pageSize);
      }
    },
  });

  return (
    <div className="w-full p-4">
      <div className="space-y-4">
        <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
          {!loading && (
            <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-x-2 sm:space-y-0">
              <Input
                placeholder="Search assets..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full sm:max-w-sm"
              />
              <Select value={typeFilter} onValueChange={handleTypeFilterChange}>
                <SelectTrigger className="w-full sm:w-[180px] cursor-pointer">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="cursor-pointer">
                    All Types
                  </SelectItem>
                  <SelectItem value="image" className="cursor-pointer">
                    Image
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-x-2 sm:space-y-0">
            {!loading && totalItems > 0 && (
              <DataTableViewOptions table={table} />
            )}
            <Button
              className="cursor-pointer w-full sm:w-auto"
              onClick={() => setIsAddModalOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Add Asset</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="rounded-md border">
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="mt-2 text-sm text-muted-foreground">
                Loading assets...
              </p>
            </div>
          </div>
        ) : totalItems === 0 ? (
          <NoDataState
            title={
              debouncedSearchTerm || typeFilter !== "all"
                ? "No Assets Found"
                : "No Assets Available"
            }
            description={
              debouncedSearchTerm || typeFilter !== "all"
                ? "No assets match your current search or filter. Try adjusting your criteria."
                : "There are no assets yet. Use the Add Asset button above to add your first asset."
            }
            showAction={false}
          />
        ) : (
          <div
            className="flex flex-col"
            style={{ maxHeight: "calc(100vh - 150px)" }}
          >
            <div className="overflow-auto flex-1">
              <DataTable columns={columns} table={table} />
            </div>
            <div className="mt-4 flex-shrink-0">
              <DataTablePagination table={table} totalCount={totalItems} />
            </div>
          </div>
        )}
      </div>

      <AddAssetModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onSuccess={refreshAssets}
      />

      <ConfirmDeleteDialog
        isOpen={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        itemName={deleteTarget?.originalname}
        itemType="asset"
      />
    </div>
  );
}
