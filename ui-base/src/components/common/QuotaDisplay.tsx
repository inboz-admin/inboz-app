"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { userService } from "@/api/userService";
import { subscriptionService } from "@/api/subscriptionService";
import { useAppStore } from "@/stores/appStore";
import { cn } from "@/lib/utils";
import { Mail } from "lucide-react";

interface QuotaData {
  used: number;
  limit: number;
  remaining: number;
  resetAt: string;
  percentUsed: number;
}

export function QuotaDisplay() {
  const { user } = useAppStore();
  const [quotaData, setQuotaData] = useState<QuotaData | null>(null);
  const [planName, setPlanName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id || !user?.organizationId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Fetch quota and subscription in parallel
        const [quotaResponse, subscriptionResponse] = await Promise.all([
          userService.getQuotaStats(user.id),
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

    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [user?.id, user?.organizationId]);

  if (!user || loading || !quotaData) {
    return null;
  }

  const { used, limit, remaining } = quotaData;
  const percentUsed = limit > 0 ? (used / limit) * 100 : 0;
  const isExceeded = used >= limit;
  const isCloseToLimit = percentUsed >= 75;
  
  // Determine badge variant and colors based on usage percentage
  const getBadgeVariant = () => {
    if (isExceeded) return "destructive";
    if (percentUsed >= 90) return "destructive";
    if (percentUsed >= 75) return "default";
    return "outline";
  };

  // Check if badge has destructive/red background (needs white text)
  const hasDestructiveBackground = isExceeded || percentUsed >= 90;
  
  const getTextColor = () => {
    // White text for destructive backgrounds (theme-aware)
    if (hasDestructiveBackground) return "text-white dark:text-white";
    if (percentUsed >= 75) return "text-orange-600 dark:text-orange-400";
    if (percentUsed >= 50) return "text-yellow-600 dark:text-yellow-400";
    return "text-foreground dark:text-foreground";
  };

  const getBackgroundColor = () => {
    if (hasDestructiveBackground) return "bg-destructive";
    if (percentUsed >= 75) return "bg-orange-500/10 border-orange-500 dark:bg-orange-500/20";
    if (percentUsed >= 50) return "bg-yellow-500/10 border-yellow-500 dark:bg-yellow-500/20";
    return "bg-background border-border";
  };

  return (
    <Badge
      variant={getBadgeVariant()}
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-normal",
        !isExceeded && !isCloseToLimit && "border-border bg-background",
        isCloseToLimit && !isExceeded && getBackgroundColor(),
        isExceeded && "animate-pulse"
      )}
    >
      {planName && (
        <span className={cn(
          "font-medium",
          hasDestructiveBackground 
            ? "text-white dark:text-white" 
            : "text-foreground dark:text-foreground"
        )}>
          {planName}
        </span>
      )}
      <Mail className={cn("h-3 w-3", getTextColor())} />
      <span className={cn("font-mono font-semibold", getTextColor())}>
        {used}/{limit}
      </span>
      {(isExceeded || isCloseToLimit) && (
        <span className={cn("text-[10px]", getTextColor())}>
          ({remaining} left)
        </span>
      )}
    </Badge>
  );
}

