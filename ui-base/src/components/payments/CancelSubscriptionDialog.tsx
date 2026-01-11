"use client";

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
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
// Date formatting helper
const formatDate = (dateString?: string) => {
  if (!dateString) return "the end of your billing period";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateString;
  }
};

interface CancelSubscriptionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason?: string) => void;
  subscriptionEndDate?: string;
  subscriptionName?: string;
}

export function CancelSubscriptionDialog({
  isOpen,
  onOpenChange,
  onConfirm,
  subscriptionEndDate,
  subscriptionName = "subscription",
}: CancelSubscriptionDialogProps) {
  const [reason, setReason] = useState("");
  const [confirmInput, setConfirmInput] = useState("");

  // Reset inputs when dialog opens/closes or subscriptionName changes
  useEffect(() => {
    if (!isOpen) {
      setReason("");
      setConfirmInput("");
    } else {
      setConfirmInput("");
    }
  }, [isOpen, subscriptionName]);

  // Check if confirmation input matches subscription name (case-sensitive)
  // Treat empty string the same as undefined/null (no input required)
  const hasSubscriptionName = subscriptionName && subscriptionName.trim() !== "";
  const isConfirmValid = hasSubscriptionName ? confirmInput === subscriptionName : true;

  const handleConfirm = () => {
    if (isConfirmValid) {
      onConfirm(reason || undefined);
      setReason("");
      setConfirmInput("");
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    setReason("");
    setConfirmInput("");
    onOpenChange(false);
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel Subscription</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Are you sure you want to cancel your {subscriptionName} subscription?
            </p>
            {subscriptionEndDate && (
              <p className="text-sm text-muted-foreground">
                Your subscription will remain active until {formatDate(subscriptionEndDate)}. 
                You will continue to have access to all features until then.
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              Please let us know why you're cancelling (optional):
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-4">
          {hasSubscriptionName && (
            <div className="space-y-2">
              <Label htmlFor="confirm-cancel-input">
                Type <span className="font-semibold">"{subscriptionName}"</span> to confirm cancellation:
              </Label>
              <Input
                id="confirm-cancel-input"
                type="text"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder={subscriptionName}
                className="w-full"
                autoComplete="off"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="cancel-reason">Cancellation Reason (Optional)</Label>
            <Textarea
              id="cancel-reason"
              placeholder="Tell us why you're cancelling..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>Keep Subscription</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleConfirm} 
            disabled={!isConfirmValid}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel Subscription
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

