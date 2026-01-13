"use client";

import { useEffect, useState } from "react";
import { DateTime } from "luxon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { userService } from "@/api/userService";
import { subscriptionService } from "@/api/subscriptionService";
import type { User } from "@/api/userTypes";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface QuotaData {
  used: number;
  limit: number;
  remaining: number;
  resetAt: string;
  percentUsed: number;
}

interface UserQuotaCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
}

export default function UserQuotaCalendarModal({
  isOpen,
  onClose,
  user,
}: UserQuotaCalendarModalProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [quotaData, setQuotaData] = useState<QuotaData | null>(null);
  const [planName, setPlanName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Reset state when modal closes or user changes
  useEffect(() => {
    if (!isOpen) {
      setSelectedDate(undefined);
      setQuotaData(null);
      setPlanName(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id || !user?.organizationId) {
        return;
      }

      // If no date selected, don't fetch
      if (!selectedDate) {
        setQuotaData(null);
        return;
      }

      try {
        setLoading(true);

        // Convert selected calendar date to UTC midnight using Luxon
        // Extract date components (year, month, day) from selected date
        // and create a UTC date with those components, ignoring timezone
        // This ensures "Jan 13th" in calendar = "Jan 13th UTC" for quota check
        const selectedDateTime = DateTime.fromJSDate(selectedDate);
        const dateForQuota = DateTime.utc(
          selectedDateTime.year,
          selectedDateTime.month,
          selectedDateTime.day
        ).startOf('day').toJSDate();

        // Fetch quota for selected date and subscription in parallel
        const [quotaResponse, subscriptionResponse] = await Promise.all([
          userService.getQuotaStats(user.id, dateForQuota),
          subscriptionService.getActiveSubscriptionByOrganization(
            user.organizationId
          ),
        ]);

        if (quotaResponse.success && quotaResponse.data) {
          setQuotaData(quotaResponse.data);
        } else {
          setQuotaData(null);
          toast.error(
            quotaResponse.message || "Failed to fetch quota data for this date"
          );
        }

        if (subscriptionResponse.success && subscriptionResponse.data?.plan) {
          setPlanName(subscriptionResponse.data.plan.name);
        }
      } catch (err) {
        console.error("Failed to fetch quota/subscription:", err);
        toast.error("An error occurred while fetching quota data");
        setQuotaData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.id, user?.organizationId, selectedDate]);

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
  };

  // Disable dates beyond 30 days in the future using Luxon
  // Allow all past dates (no minimum limit) and current date
  const isDateDisabled = (date: Date) => {
    const now = DateTime.now().startOf('day');
    const dateTime = DateTime.fromJSDate(date).startOf('day');
    const maxDate = now.plus({ days: 30 });
    // Disable dates that are more than 30 days in the future
    return dateTime > maxDate;
  };

  if (!user) {
    return null;
  }

  const { used, limit, remaining } = quotaData || {
    used: 0,
    limit: 0,
    remaining: 0,
  };
  const percentUsed = limit > 0 ? (used / limit) * 100 : 0;

  // Determine text color based on usage percentage
  const getTextColor = () => {
    if (percentUsed >= 90) return "text-destructive";
    if (percentUsed >= 75) return "text-orange-500 dark:text-orange-400";
    if (percentUsed >= 50) return "text-yellow-500 dark:text-yellow-400";
    return "text-muted-foreground";
  };

  const userFullName =
    user.firstName || user.lastName
      ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
      : "N/A";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] p-4 sm:p-6">
        <DialogHeader className="pb-3 space-y-1">
          <DialogTitle className="text-lg">Quota Usage Calendar</DialogTitle>
          <DialogDescription className="text-xs">
            {userFullName} ({user.email})
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
          {/* Calendar on the left */}
          <div className="flex-shrink-0">
            <p className="text-xs font-medium mb-2 text-muted-foreground">
              Select a date:
            </p>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              disabled={isDateDisabled}
              initialFocus
            />
          </div>

          {/* Quota usage on the right */}
          <div className="flex-1 min-w-0">
            {!selectedDate ? (
              <div className="flex items-center justify-center h-full min-h-[300px]">
                <p className="text-sm text-muted-foreground text-center">
                  Select a date to view quota usage
                </p>
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center h-full min-h-[300px]">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary mb-2"></div>
                  <p className="text-xs text-muted-foreground">Loading...</p>
                </div>
              </div>
            ) : quotaData ? (
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">
                    {DateTime.fromJSDate(selectedDate).toFormat(
                      "MMM dd, yyyy"
                    )}
                  </span>
                  {planName && (
                    <Badge variant="outline" className="text-xs">
                      {planName}
                    </Badge>
                  )}
                </div>
                <div className="flex items-baseline gap-2">
                  <span className={cn("text-lg font-mono font-semibold", getTextColor())}>
                    {used}/{limit}
                  </span>
                  <span className={cn("text-xs", getTextColor())}>
                    ({remaining} remaining)
                  </span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div
                    className={cn(
                      "h-2 rounded-full transition-all",
                      percentUsed >= 90
                        ? "bg-destructive"
                        : percentUsed >= 75
                        ? "bg-orange-500"
                        : percentUsed >= 50
                        ? "bg-yellow-500"
                        : "bg-primary"
                    )}
                    style={{ width: `${Math.min(percentUsed, 100)}%` }}
                  />
                </div>
                <div className={cn("text-xs font-medium", getTextColor())}>
                  {percentUsed.toFixed(1)}% of daily quota used
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full min-h-[300px]">
                <p className="text-sm text-muted-foreground text-center">
                  No quota data available for this date
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
