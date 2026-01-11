"use client";

import { useState, useEffect } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ConfirmDeleteDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  description?: string;
  itemName?: string;
  itemType?: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
}

export function ConfirmDeleteDialog({
  isOpen,
  onOpenChange,
  onConfirm,
  onCancel,
  title = "Are you sure?",
  description,
  itemName,
  itemType = "item",
  confirmButtonText = "Delete",
  cancelButtonText = "Cancel",
}: ConfirmDeleteDialogProps) {
  const [inputValue, setInputValue] = useState("");

  // Reset input when dialog opens/closes or itemName changes
  useEffect(() => {
    if (!isOpen) {
      setInputValue("");
    } else {
      setInputValue("");
    }
  }, [isOpen, itemName]);

  const defaultDescription = `The ${itemType}${
    itemName ? ` "${itemName}"` : ""
  } and all associated data will be permanently removed from the system.`;

  // Check if input matches itemName (case-sensitive)
  // Treat empty string the same as undefined/null (no input required)
  const hasItemName = itemName && itemName.trim() !== "";
  const isInputValid = hasItemName ? inputValue === itemName : true;
  const showInputField = hasItemName;

  const handleConfirm = () => {
    if (isInputValid) {
      onConfirm();
      setInputValue("");
    }
  };

  const handleCancel = () => {
    setInputValue("");
    onCancel();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {description || defaultDescription}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {showInputField && (
          <div className="space-y-2">
            <Label htmlFor="confirm-delete-input">
              Type <span className="font-semibold">"{itemName}"</span> to confirm deletion:
            </Label>
            <Input
              id="confirm-delete-input"
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={itemName}
              className="w-full"
              autoComplete="off"
            />
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel} className="cursor-pointer">
            {cancelButtonText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!isInputValid}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {confirmButtonText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
