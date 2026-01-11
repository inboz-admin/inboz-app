"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { ContactList } from "@/api/contactListTypes";
import { ContactListType } from "@/api/contactListTypes";
import { contactListService } from "@/api/contactListService";
import type { BaseResponse } from "@/api/types";

interface ContactListModalProps {
  isOpen: boolean;
  onClose: () => void;
  contactList?: ContactList | null;
  onSuccess: (newListId?: string) => void;
  isReadOnly?: boolean;
  userOrganizationId?: string;
}

export default function ContactListModal({
  isOpen,
  onClose,
  contactList,
  onSuccess,
  isReadOnly = false,
  userOrganizationId,
}: ContactListModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: ContactListType.PRIVATE,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (contactList) {
      setFormData({
        name: contactList.name || "",
        description: contactList.description || "",
        type: contactList.type || ContactListType.PRIVATE,
      });
    } else {
      setFormData({
        name: "",
        description: "",
        type: ContactListType.PRIVATE,
      });
    }
  }, [contactList, isOpen]);

  // Helper function to extract error message from API response
  const getErrorMessage = (
    response: BaseResponse<any>,
    defaultMessage: string
  ): string => {
    if (response?.message) {
      return response.message;
    }
    if (
      response?.error?.details &&
      typeof response.error.details === "object" &&
      "message" in response.error.details
    ) {
      const details = response.error.details as { message?: string };
      if (details.message) {
        return details.message;
      }
    }
    if (typeof response?.error?.details === "string") {
      return response.error.details;
    }
    return defaultMessage;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Please enter a list name");
      return;
    }

    setIsSubmitting(true);

    try {
      if (contactList) {
        // Update existing list
        const response = await contactListService.updateContactList(
          contactList.id,
          formData
        );

        if (response.success) {
          toast.success("Contact list updated successfully");
          onSuccess();
          onClose();
        } else {
          const errorMessage = getErrorMessage(
            response,
            "Failed to update contact list"
          );
          toast.error(errorMessage);
        }
      } else {
        // Create new list
        const response = await contactListService.createContactList({
          ...formData,
          organizationId: userOrganizationId,
        });

        if (response.success) {
          toast.success("Contact list created successfully");
          // Pass the new list ID to the success callback
          onSuccess(response.data?.id);
          onClose();
        } else {
          const errorMessage = getErrorMessage(
            response,
            "Failed to create contact list"
          );
          toast.error(errorMessage);
        }
      }
    } catch (error: any) {
      // Handle unexpected errors
      const errorMessage =
        error?.response?.message ||
        error?.message ||
        (contactList
          ? "Failed to update contact list"
          : "Failed to create contact list");
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: "",
      description: "",
      type: ContactListType.PRIVATE,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isReadOnly
                ? "View Contact List"
                : contactList
                ? "Edit Contact List"
                : "Create Contact List"}
            </DialogTitle>
            <DialogDescription>
              {isReadOnly
                ? "View contact list details"
                : contactList
                ? "Update the contact list information below"
                : "Create a new contact list to organize your contacts"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">
                List Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., Newsletter Subscribers"
                disabled={isReadOnly}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Describe the purpose of this list..."
                rows={4}
                disabled={isReadOnly}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="type">Visibility</Label>
              <Select
                value={formData.type}
                onValueChange={(value) =>
                  setFormData({ ...formData, type: value as ContactListType })
                }
                disabled={isReadOnly}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {formData.type === ContactListType.PUBLIC ? "Public" : "Private"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ContactListType.PRIVATE}>Private</SelectItem>
                  <SelectItem value={ContactListType.PUBLIC}>Public</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {contactList && (
              <div className="grid gap-2">
                <Label>Contact Count</Label>
                <div className="text-sm text-muted-foreground">
                  {contactList.contactCount} contacts in this list
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              {isReadOnly ? "Close" : "Cancel"}
            </Button>
            {!isReadOnly && (
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? "Saving..."
                  : contactList
                  ? "Update List"
                  : "Create List"}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
