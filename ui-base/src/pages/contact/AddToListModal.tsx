"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { contactListService } from "@/api/contactListService";
import type { ContactList } from "@/api/contactListTypes";
import { toast } from "sonner";
import { ListPlus } from "lucide-react";

interface AddToListModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedContactIds: string[];
  organizationId?: string;
  onSuccess?: () => void;
}

export default function AddToListModal({
  isOpen,
  onClose,
  selectedContactIds,
  organizationId,
  onSuccess,
}: AddToListModalProps) {
  const [contactLists, setContactLists] = useState<ContactList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Fetch contact lists when modal opens
  useEffect(() => {
    if (isOpen && organizationId) {
      fetchContactLists();
    }
  }, [isOpen, organizationId]);

  // Reset selected list when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedListId("");
    }
  }, [isOpen]);

  const fetchContactLists = async () => {
    try {
      setLoading(true);
      const response = await contactListService.getContactLists({
        organizationId,
        limit: 100, // Get all lists
      });

      if (response.success && response.data) {
        setContactLists(response.data.data);
      } else {
        setContactLists([]);
        toast.error("Failed to load contact lists");
      }
    } catch (error) {
      toast.error("Error loading contact lists");
      setContactLists([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedListId) {
      toast.error("Please select a contact list");
      return;
    }

    if (selectedContactIds.length === 0) {
      toast.error("No contacts selected");
      return;
    }

    try {
      setSubmitting(true);
      const response = await contactListService.addContactsToList(
        selectedListId,
        {
          contactIds: selectedContactIds,
        }
      );

      if (response.success) {
        toast.success(
          `Successfully added ${selectedContactIds.length} contact${
            selectedContactIds.length > 1 ? "s" : ""
          } to list`
        );
        onSuccess?.();
        onClose();
      } else {
        toast.error(response.message || "Failed to add contacts to list");
      }
    } catch (error) {
      toast.error(
        `Error adding contacts to list: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListPlus className="h-5 w-5" />
            Add Contacts to List
          </DialogTitle>
          <DialogDescription>
            Select a contact list to add {selectedContactIds.length} selected
            contact{selectedContactIds.length > 1 ? "s" : ""} to.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : contactLists.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No contact lists available.</p>
              <p className="text-sm mt-2">
                Please create a contact list first.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Contact List</label>
              <Select value={selectedListId} onValueChange={setSelectedListId}>
                <SelectTrigger className="w-full cursor-pointer">
                  <SelectValue placeholder="Choose a list..." />
                </SelectTrigger>
                <SelectContent>
                  {contactLists.map((list) => (
                    <SelectItem
                      key={list.id}
                      value={list.id}
                      className="cursor-pointer"
                    >
                      {list.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedListId && (
                <p className="text-sm text-muted-foreground">
                  {contactLists.find((list) => list.id === selectedListId)
                    ?.contactCount || 0}{" "}
                  contacts currently in this list
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={submitting}
            className="cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              !selectedListId ||
              submitting ||
              loading ||
              contactLists.length === 0
            }
            className="cursor-pointer"
          >
            {submitting ? (
              <>
                <div className="mr-2 inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Adding...
              </>
            ) : (
              <>Add to List</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
