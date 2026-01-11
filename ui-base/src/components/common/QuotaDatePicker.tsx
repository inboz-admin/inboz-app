"use client";

import { useEffect, useState } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { userService } from "@/api/userService";
import { subscriptionService } from "@/api/subscriptionService";
import { useAppStore } from "@/stores/appStore";
import { cn } from "@/lib/utils";

interface QuotaData {
  used: number;
  limit: number;
  remaining: number;
  resetAt: string;
  percentUsed: number;
}

export function QuotaDatePicker() {
  const { user } = useAppStore();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [quotaData, setQuotaData] = useState<QuotaData | null>(null);
  const [planName, setPlanName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

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
        
        // Convert selected date to UTC midnight to avoid timezone issues
        // Extract date components from local date and create UTC date
        // This ensures "Jan 9th" in calendar = "Jan 9th UTC" for quota check
        const year = selectedDate.getFullYear();
        const month = selectedDate.getMonth();
        const day = selectedDate.getDate();
        const dateForQuota = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
        
        // Fetch quota for selected date and subscription in parallel
        const [quotaResponse, subscriptionResponse] = await Promise.all([
          userService.getQuotaStats(user.id, dateForQuota),
          subscriptionService.getActiveSubscriptionByOrganization(user.organizationId),
        ]);
        
        if (quotaResponse.success && quotaResponse.data) {
          setQuotaData(quotaResponse.data);
        }
        
        if (subscriptionResponse.success && subscriptionResponse.data?.plan) {
          setPlanName(subscriptionResponse.data.plan.name);
        }
      } catch (err) {
        console.error("Failed to fetch quota/subscription:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.id, user?.organizationId, selectedDate]);

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    // Keep popover open so user can see the quota info
  };

  // Disable dates before today
  const getTodayAtMidnight = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  };

  if (!user) {
    return null;
  }

  const { used, limit, remaining } = quotaData || { used: 0, limit: 0, remaining: 0 };
  const percentUsed = limit > 0 ? (used / limit) * 100 : 0;
  
  // Determine text color based on usage percentage
  const getTextColor = () => {
    if (percentUsed >= 90) return "text-destructive";
    if (percentUsed >= 75) return "text-orange-500 dark:text-orange-400";
    if (percentUsed >= 50) return "text-yellow-500 dark:text-yellow-400";
    return "text-muted-foreground";
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9"
          title="Check quota for a specific date"
        >
          <CalendarIcon className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <div className="p-3">
          <div className="mb-3">
            <p className="text-sm font-medium mb-2">Select a date to check quota:</p>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              disabled={(date) => {
                const today = getTodayAtMidnight();
                const dateToCheck = new Date(date);
                dateToCheck.setHours(0, 0, 0, 0);
                return dateToCheck < today;
              }}
              initialFocus
            />
          </div>
          
          {selectedDate && (
            <div className="border-t pt-3 mt-3">
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : quotaData ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {format(selectedDate, "MMM dd, yyyy")}
                    </span>
                    {planName && (
                      <Badge variant="outline" className="text-xs">
                        {planName}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn("text-sm font-mono", getTextColor())}>
                      {used}/{limit}
                    </span>
                    <span className="text-xs text-muted-foreground">
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
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No quota data available
                </p>
              )}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

