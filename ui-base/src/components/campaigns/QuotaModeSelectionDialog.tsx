"use client";

import React from "react";
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
import { AlertCircle, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

interface QuotaModeSelectionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
  quotaStats: {
    used: number;
    limit: number;
    remaining: number;
    resetAt: string;
    percentUsed: number;
    targetDate?: string; // Optional target date for scheduled steps
  };
  totalEmails: number;
  estimatedDays: number;
}

export function QuotaModeSelectionDialog({
  isOpen,
  onOpenChange,
  onConfirm,
  onCancel,
  quotaStats,
  totalEmails,
  estimatedDays,
}: QuotaModeSelectionDialogProps) {
  const isQuotaInsufficient = totalEmails > quotaStats.remaining;
  
  // Determine if we're showing quota for a specific day or today
  const isScheduledForFuture = quotaStats.targetDate && new Date(quotaStats.targetDate) > new Date();
  const quotaDayLabel = isScheduledForFuture 
    ? `Quota Usage for ${new Date(quotaStats.targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    : 'Daily Quota Usage';
  
  // Backend sends UTC date (midnight UTC)
  // Format it in UTC timezone
  const resetTime = new Date(quotaStats.resetAt);
  const now = new Date();
  
  // Format the UTC date in UTC timezone
  const resetTimeFormatted = resetTime.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'UTC'
  }) + ' UTC';
  
  // Calculate time until reset
  const timeUntilReset = resetTime.getTime() - now.getTime();
  const hoursUntilReset = Math.max(0, Math.floor(timeUntilReset / (1000 * 60 * 60)));
  const minutesUntilReset = Math.max(0, Math.floor((timeUntilReset % (1000 * 60 * 60)) / (1000 * 60)));

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Email Quota Warning
          </AlertDialogTitle>
          <AlertDialogDescription>
                This campaign requires <strong>{totalEmails.toLocaleString()} emails</strong> to send, 
                but you have <strong>{quotaStats.remaining.toLocaleString()} remaining</strong> in your daily quota.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-4">
              <div className="space-y-2 p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span>{quotaDayLabel}</span>
                  <span className="font-medium">
                    {quotaStats.used.toLocaleString()} / {quotaStats.limit.toLocaleString()} (queued/limit)
                  </span>
                </div>
                <Progress value={quotaStats.percentUsed} className="h-2" />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Remaining: {quotaStats.remaining.toLocaleString()}</span>
                  <span>
                    Resets: {resetTimeFormatted}
                    {hoursUntilReset >= 0 && (
                      <span className="block text-xs mt-0.5">
                        ({hoursUntilReset}h {minutesUntilReset}m until reset)
                      </span>
                    )}
                  </span>
                </div>
              </div>

              {isQuotaInsufficient && (
                <Alert className="mt-4">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Auto-Spread Mode:</strong> Emails will be automatically scheduled across {estimatedDays} day{estimatedDays !== 1 ? 's' : ''} to 
                    respect quota limits. This ensures all emails are sent without blocking your campaign.
                    {estimatedDays > 1 && (
                      <span className="block mt-1">
                        The campaign will automatically distribute emails over the next {estimatedDays} day{estimatedDays !== 1 ? 's' : ''} based on available quota.
                      </span>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
          >
            Activate Campaign
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

