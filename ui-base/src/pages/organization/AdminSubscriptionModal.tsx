"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, CreditCard } from "lucide-react";
import { toast } from "sonner";
import type { Organization } from "@/api/organizationTypes";
import type { SubscriptionPlan, Subscription, BillingCycle } from "@/api/subscriptionTypes";
import { subscriptionService } from "@/api/subscriptionService";
import { BillingCycleLabels } from "@/api/subscriptionTypes";

const upgradeSchema = z.object({
  planId: z.string().min(1, "Plan is required"),
  userCount: z.number().min(1, "User count must be at least 1"),
  billingCycle: z.enum(["MONTHLY", "YEARLY"]).optional(),
});

const userCountSchema = z.object({
  userCount: z.number().min(1, "User count must be at least 1"),
});

interface AdminSubscriptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organization: Organization;
  onSuccess?: () => void;
}

export default function AdminSubscriptionModal({
  open,
  onOpenChange,
  organization,
  onSuccess,
}: AdminSubscriptionModalProps) {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [loadingSubscription, setLoadingSubscription] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [updatingUserCount, setUpdatingUserCount] = useState(false);
  const [activeTab, setActiveTab] = useState<"upgrade" | "userCount">("upgrade");

  const upgradeForm = useForm<{
    planId: string;
    userCount: number;
    billingCycle?: BillingCycle;
  }>({
    resolver: zodResolver(upgradeSchema),
    defaultValues: {
      planId: "",
      userCount: 1,
      billingCycle: "MONTHLY",
    },
  });

  const userCountForm = useForm<{
    userCount: number;
  }>({
    resolver: zodResolver(userCountSchema),
    defaultValues: {
      userCount: 1,
    },
  });

  // Fetch plans and current subscription
  useEffect(() => {
    if (open && organization?.id) {
      fetchPlans();
      fetchCurrentSubscription();
    }
  }, [open, organization?.id]);

  // Update form when subscription loads
  useEffect(() => {
    if (currentSubscription) {
      upgradeForm.setValue("planId", currentSubscription.planId);
      upgradeForm.setValue("userCount", currentSubscription.userCount || 1);
      upgradeForm.setValue("billingCycle", currentSubscription.billingCycle || "MONTHLY");
      userCountForm.setValue("userCount", currentSubscription.userCount || 1);
    }
  }, [currentSubscription]);

  const fetchPlans = async () => {
    try {
      setLoadingPlans(true);
      const response = await subscriptionService.getSubscriptionPlans({
        isActive: true,
        isPublic: true,
      });

      if (response.success && response.data) {
        setPlans(response.data.data || []);
      }
    } catch (error) {
      console.error("Error fetching plans:", error);
      toast.error("Failed to load subscription plans");
    } finally {
      setLoadingPlans(false);
    }
  };

  const fetchCurrentSubscription = async () => {
    try {
      setLoadingSubscription(true);
      const response = await subscriptionService.getActiveSubscriptionByOrganization(
        organization.id,
      );

      if (response.success && response.data) {
        setCurrentSubscription(response.data);
      } else {
        setCurrentSubscription(null);
      }
    } catch (error) {
      console.error("Error fetching subscription:", error);
      setCurrentSubscription(null);
    } finally {
      setLoadingSubscription(false);
    }
  };

  const handleUpgrade = async (data: {
    planId: string;
    userCount: number;
    billingCycle?: BillingCycle;
  }) => {
    try {
      setUpgrading(true);
      const response = await subscriptionService.adminUpgradeSubscription({
        organizationId: organization.id,
        planId: data.planId,
        userCount: data.userCount,
        billingCycle: data.billingCycle,
      });

      if (response.success) {
        toast.success("Subscription upgraded successfully");
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(response.message || "Failed to upgrade subscription");
      }
    } catch (error: any) {
      console.error("Error upgrading subscription:", error);
      toast.error(error?.message || "Failed to upgrade subscription");
    } finally {
      setUpgrading(false);
    }
  };

  const handleUpdateUserCount = async (data: { userCount: number }) => {
    try {
      setUpdatingUserCount(true);
      const response = await subscriptionService.adminUpdateUserCount({
        organizationId: organization.id,
        userCount: data.userCount,
      });

      if (response.success) {
        toast.success("User count updated successfully");
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(response.message || "Failed to update user count");
      }
    } catch (error: any) {
      console.error("Error updating user count:", error);
      toast.error(error?.message || "Failed to update user count");
    } finally {
      setUpdatingUserCount(false);
    }
  };

  const handleClose = () => {
    upgradeForm.reset();
    userCountForm.reset();
    setActiveTab("upgrade");
    onOpenChange(false);
  };

  const selectedPlan = plans.find((p) => p.id === upgradeForm.watch("planId"));

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage Subscription</DialogTitle>
          <DialogDescription>
            Upgrade subscription plan or update user count for {organization.name}
          </DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-2 border-b">
          <button
            type="button"
            onClick={() => setActiveTab("upgrade")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "upgrade"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Upgrade Plan
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("userCount")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "userCount"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Update User Count
          </button>
        </div>

        {/* Current Subscription Info */}
        {loadingSubscription ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="ml-2 text-sm text-muted-foreground">Loading subscription...</span>
          </div>
        ) : currentSubscription ? (
          <div className="bg-muted/50 p-4 rounded-lg space-y-1">
            <div className="text-sm font-medium">Current Subscription</div>
            <div className="text-sm text-muted-foreground">
              Plan: {currentSubscription.plan?.name || "Unknown"} | Users:{" "}
              {currentSubscription.userCount || 1} | Billing:{" "}
              {BillingCycleLabels[currentSubscription.billingCycle] || currentSubscription.billingCycle}
            </div>
          </div>
        ) : (
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="text-sm text-muted-foreground">No active subscription found</div>
          </div>
        )}

        {/* Upgrade Plan Form */}
        {activeTab === "upgrade" && (
          <Form {...upgradeForm}>
            <form onSubmit={upgradeForm.handleSubmit(handleUpgrade)} className="space-y-4">
              <FormField
                control={upgradeForm.control}
                name="planId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subscription Plan</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={loadingPlans}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a plan" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {plans.map((plan) => (
                          <SelectItem key={plan.id} value={plan.id}>
                            {plan.name}
                            {plan.pricePerUserMonthly && (
                              <span className="text-muted-foreground ml-2">
                                (${plan.pricePerUserMonthly}/user/month)
                              </span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={upgradeForm.control}
                name="userCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>User Count</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={upgradeForm.control}
                name="billingCycle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Billing Cycle</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || "MONTHLY"}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="MONTHLY">Monthly</SelectItem>
                        <SelectItem value="YEARLY">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={upgrading}>
                  {upgrading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Upgrading...
                    </>
                  ) : (
                    <>
                      <CreditCard className="mr-2 h-4 w-4" />
                      Upgrade Subscription
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}

        {/* Update User Count Form */}
        {activeTab === "userCount" && (
          <Form {...userCountForm}>
            <form
              onSubmit={userCountForm.handleSubmit(handleUpdateUserCount)}
              className="space-y-4"
            >
              <FormField
                control={userCountForm.control}
                name="userCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>User Count</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updatingUserCount}>
                  {updatingUserCount ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update User Count"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
