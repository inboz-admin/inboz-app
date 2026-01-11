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

interface QuotaWarningDialogProps {
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
  };
  emailsForNewStep: number;
  totalEmailsWithNewStep: number;
  estimatedDays: number;
  targetDate?: string; // Optional target date for scheduled steps
}

export function QuotaWarningDialog({
  isOpen,
  onOpenChange,
  onConfirm,
  onCancel,
  quotaStats,
  emailsForNewStep,
  totalEmailsWithNewStep,
  estimatedDays,
  targetDate,
}: QuotaWarningDialogProps) {
  const isStepExceedingQuota = emailsForNewStep > quotaStats.remaining;
  const isTotalExceedingQuota = totalEmailsWithNewStep > quotaStats.remaining;
  
  // Determine if we're showing quota for a specific day or today
  const isScheduledForFuture = targetDate && new Date(targetDate) > new Date();
  const quotaDayLabel = isScheduledForFuture 
    ? `Quota Usage for ${new Date(targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    : 'Daily Quota Usage';

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Email Quota Warning
          </AlertDialogTitle>
          <AlertDialogDescription>
                {isStepExceedingQuota ? (
                  <>
                    This step requires <strong>{emailsForNewStep.toLocaleString()} emails</strong>, 
                    but you have <strong>{quotaStats.remaining.toLocaleString()} remaining</strong> in your daily quota.
                  </>
                ) : (
                  <>
                    Adding this step will bring total campaign emails to <strong>{totalEmailsWithNewStep.toLocaleString()}</strong>, 
                    which exceeds your remaining quota of <strong>{quotaStats.remaining.toLocaleString()}</strong>.
                  </>
                )}
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
                    {(() => {
                      const resetTime = new Date(quotaStats.resetAt);
                      const now = new Date();
                      
                      // Backend sends UTC date (midnight UTC)
                      // Format it in UTC timezone
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
                        <span>
                          Resets: {resetTimeFormatted}
                          {hoursUntilReset >= 0 && (
                            <span className="block text-xs mt-0.5">
                              ({hoursUntilReset}h {minutesUntilReset}m until reset)
                            </span>
                          )}
                        </span>
                      );
                    })()}
                  </span>
                </div>
              </div>

              <Alert className="mt-4">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Auto-Spread Mode:</strong> Emails will be automatically scheduled across {estimatedDays} day{estimatedDays !== 1 ? 's' : ''} to 
                  respect quota limits. The system will automatically handle quota conflicts at send time.
                  {estimatedDays > 1 && (
                    <span className="block mt-1">
                      If quota is exceeded during sending, emails will automatically reschedule to the next available time.
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
          >
            Continue & Add Step
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

