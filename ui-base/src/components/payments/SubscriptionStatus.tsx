"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, AlertCircle, CheckCircle2 } from "lucide-react";
import type { Subscription } from "@/api/subscriptionTypes";
import { SubscriptionStatusLabels, SubscriptionStatusColors } from "@/api/subscriptionTypes";
import { format } from "date-fns";

interface SubscriptionStatusProps {
  subscription: Subscription;
}

export function SubscriptionStatus({ subscription }: SubscriptionStatusProps) {
  const statusColor = SubscriptionStatusColors[subscription.status] || "text-gray-600 bg-gray-50";
  const statusLabel = SubscriptionStatusLabels[subscription.status] || subscription.status;

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), "MMM dd, yyyy");
    } catch {
      return dateString;
    }
  };


  const isCancelledButActive = subscription.cancelAt && subscription.status === "ACTIVE";
  const cancelDate = subscription.cancelAt ? formatDate(subscription.cancelAt) : null;
  const expiryDate = subscription.currentPeriodEnd ? formatDate(subscription.currentPeriodEnd) : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Subscription Status</CardTitle>
          <Badge className={statusColor}>{statusLabel}</Badge>
        </div>
        <CardDescription>
          {subscription.plan?.name} - {subscription.billingCycle}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Period */}
        {subscription.currentPeriodStart && subscription.currentPeriodEnd && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Current Period</span>
            </div>
            <div className="text-sm">
              {formatDate(subscription.currentPeriodStart)} - {formatDate(subscription.currentPeriodEnd)}
            </div>
          </div>
        )}

        {/* Trial Period */}
        {subscription.trialStart && subscription.trialEnd && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Trial Period</span>
            </div>
            <div className="text-sm">
              {formatDate(subscription.trialStart)} - {formatDate(subscription.trialEnd)}
            </div>
          </div>
        )}

        {/* Cancellation Notice */}
        {isCancelledButActive && cancelDate && (
          <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm font-medium text-orange-900">
                  Subscription will be cancelled
                </div>
                <div className="text-xs text-orange-700 mt-1">
                  Active until {cancelDate}
                </div>
                {subscription.cancelReason && (
                  <div className="text-xs text-orange-600 mt-1">
                    Reason: {subscription.cancelReason}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Expiry Warning */}
        {subscription.status === "ACTIVE" && expiryDate && !isCancelledButActive && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm font-medium text-blue-900">
                  Subscription Active
                </div>
                <div className="text-xs text-blue-700 mt-1">
                  Renews on {expiryDate}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Amount */}
        <div className="pt-2 border-t">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Amount:</span>
            <span className="font-medium">
              ${subscription.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {subscription.currency}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

