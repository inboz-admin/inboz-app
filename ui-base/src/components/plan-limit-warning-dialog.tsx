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
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PlanLimitWarningDialogProps {
  isOpen: boolean;
  onClose: () => void;
  limitType: "users" | "contacts";
  currentCount: number;
  maxLimit: number;
  planName: string;
  subscriptionId?: string;
  onUpgrade?: () => void;
}

export function PlanLimitWarningDialog({
  isOpen,
  onClose,
  limitType,
  currentCount,
  maxLimit,
  planName,
  subscriptionId,
  onUpgrade,
}: PlanLimitWarningDialogProps) {
  const limitTypeLabel = limitType === "users" ? "users" : "contacts";
  const limitTypeLabelCapitalized =
    limitType === "users" ? "Users" : "Contacts";

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/20">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <AlertDialogTitle className="text-xl">
              Plan Limit Reached
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="pt-4">
              You have reached the maximum number of {limitTypeLabel} allowed
              by your <strong>{planName}</strong> plan.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-3">
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Current {limitTypeLabelCapitalized}:
                </span>
                <span className="font-semibold">{currentCount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Maximum {limitTypeLabelCapitalized}:
                </span>
                <span className="font-semibold">{maxLimit.toLocaleString()}</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              To add more {limitTypeLabel}, please upgrade your subscription
              plan.
            </p>
        </div>
        <AlertDialogFooter>
          {onUpgrade ? (
            <>
              <AlertDialogCancel onClick={onClose}>Close</AlertDialogCancel>
              <Button onClick={onUpgrade} className="cursor-pointer">
                Upgrade Plan
              </Button>
            </>
          ) : (
            <AlertDialogAction onClick={onClose} className="cursor-pointer">
              Close
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

