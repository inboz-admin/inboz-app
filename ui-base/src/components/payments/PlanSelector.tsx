"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import type { SubscriptionPlan, BillingCycle } from "@/api/subscriptionTypes";
import { BillingCycleLabels } from "@/api/subscriptionTypes";

interface PlanSelectorProps {
  plans: SubscriptionPlan[];
  selectedPlanId?: string;
  selectedBillingCycle?: BillingCycle;
  onSelectPlan: (planId: string, billingCycle: BillingCycle) => void;
  loading?: boolean;
}

export function PlanSelector({
  plans,
  selectedPlanId,
  selectedBillingCycle = "MONTHLY",
  onSelectPlan,
  loading = false,
}: PlanSelectorProps) {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(selectedBillingCycle);
  const [selectedPlan, setSelectedPlan] = useState<string>(selectedPlanId || "");

  const getPlanPrice = (plan: SubscriptionPlan) => {
    // Use per-user pricing
    if (billingCycle === "YEARLY") {
      return plan.pricePerUserYearly || (plan.pricePerUserMonthly ? plan.pricePerUserMonthly * 12 : 0);
    }
    return plan.pricePerUserMonthly || 0;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  const activePlans = plans.filter((plan) => plan.isActive && plan.isPublic);

  const handleSubmit = () => {
    if (!selectedPlan) {
      return;
    }
    onSelectPlan(selectedPlan, billingCycle);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading plans...</span>
      </div>
    );
  }

  if (activePlans.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-sm text-muted-foreground">No subscription plans available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Billing Cycle Toggle */}
      <div className="flex items-center justify-center gap-4">
        <Button
          variant={billingCycle === "MONTHLY" ? "default" : "outline"}
          size="sm"
          onClick={() => setBillingCycle("MONTHLY")}
        >
          Monthly
        </Button>
        <Button
          variant={billingCycle === "YEARLY" ? "default" : "outline"}
          size="sm"
          onClick={() => setBillingCycle("YEARLY")}
          className="relative"
        >
          Yearly
          <Badge variant="secondary" className="ml-2 text-xs">
            Save up to 20%
          </Badge>
        </Button>
      </div>

      {/* Plan Selector */}
      <div className="space-y-4">
        <Select value={selectedPlan} onValueChange={setSelectedPlan}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a plan" />
          </SelectTrigger>
          <SelectContent>
            {activePlans.map((plan) => {
              const price = getPlanPrice(plan);
              return (
                <SelectItem key={plan.id} value={plan.id}>
                  <div className="flex items-center justify-between w-full">
                    <span className="font-medium">{plan.name}</span>
                    <span className="ml-4 text-sm text-muted-foreground">
                      {formatPrice(price)}/user/{BillingCycleLabels[billingCycle].toLowerCase()}
                    </span>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        {/* Submit Button */}
        <Button
          className="w-full"
          onClick={handleSubmit}
          disabled={!selectedPlan || loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            "Continue to Payment"
          )}
        </Button>
      </div>
    </div>
  );
}



