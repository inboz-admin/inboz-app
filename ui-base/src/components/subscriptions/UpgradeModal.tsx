"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { AlertCircle, ArrowRight, Check, Loader2, Plus, Minus } from "lucide-react";
import { subscriptionService } from "@/api/subscriptionService";
import { userService } from "@/api/userService";
import { paymentService } from "@/api/paymentService";
import { useAppStore } from "@/stores/appStore";
import { toast } from "sonner";
import type { SubscriptionPlan } from "@/api/subscriptionTypes";
import { PaymentCheckout } from "@/components/payments";
import { PaymentProviderSelector } from "@/components/payments/PaymentProviderSelector";
import type { PaymentProvider } from "@/components/payments/PaymentProviderSelector";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PricingBreakdown {
  planId: string;
  planName: string;
  userCount: number;
  monthly: {
    basePricePerUser: number;
    volumeDiscountPercent: number;
    discountedPricePerUser: number;
    totalAmount: number;
  };
  yearly: {
    basePricePerUser: number;
    volumeDiscountPercent: number;
    discountedPricePerUser: number;
    totalAmount: number;
  };
  requiresContactSales: boolean;
}

type BillingCycle = "MONTHLY" | "YEARLY";

export function UpgradeModal({ open, onOpenChange }: UpgradeModalProps) {
  const navigate = useNavigate();
  const { user } = useAppStore();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentUserCount, setCurrentUserCount] = useState<number>(1);
  const [userCount, setUserCount] = useState<number>(1);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("MONTHLY");
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [pricingData, setPricingData] = useState<Record<string, PricingBreakdown>>({});
  const [loading, setLoading] = useState(false);
  const [loadingPricing, setLoadingPricing] = useState(false);
  const [paymentOrder, setPaymentOrder] = useState<any>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [paymentProvider, setPaymentProvider] = useState<PaymentProvider | null>(null);
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);
  const [showProviderSelector, setShowProviderSelector] = useState(true);

  // Track if initial pricing fetch has been done
  const [hasFetchedInitialPricing, setHasFetchedInitialPricing] = useState(false);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setPlans([]);
      setCurrentUserCount(1);
      setUserCount(1);
      setSelectedPlanId(null);
      setPricingData({});
      setLoading(false);
      setLoadingPricing(false);
      setHasFetchedInitialPricing(false);
      setCurrentSubscription(null);
      setShowProviderSelector(true);
      setPaymentProvider(null); // Reset to no selection
    }
  }, [open]);

  // Fetch plans, user count, and current subscription when modal opens
  useEffect(() => {
    if (open && user?.organizationId) {
      fetchPlansAndUserCount();
      fetchCurrentSubscription();
    }
  }, [open, user?.organizationId]);

  // Fetch pricing immediately after plans and user count are loaded (initial load)
  useEffect(() => {
    if (open && plans.length > 0 && userCount > 0 && !loading && !hasFetchedInitialPricing) {
      // Initial fetch when modal opens and data is ready
      fetchPricingForAllPlans();
      setHasFetchedInitialPricing(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, plans.length, userCount, loading]);

  // Fetch pricing when user count or billing cycle changes (with debounce)
  useEffect(() => {
    // Skip if modal is closed, no plans, or still loading initial data
    if (!open || plans.length === 0 || userCount === 0 || loading || !hasFetchedInitialPricing) {
      return;
    }

    // Debounce user count and billing cycle changes to prevent multiple API calls
    const timeoutId = setTimeout(() => {
      fetchPricingForAllPlans();
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userCount, billingCycle, hasFetchedInitialPricing]);

  const fetchCurrentSubscription = async () => {
    try {
      if (!user?.organizationId) return;

      // Fetch current subscription (ACTIVE, TRIAL, etc.) - don't filter by status
      const response = await subscriptionService.getSubscriptions({
        organizationId: user.organizationId,
        // Don't filter by status - get any existing subscription
        limit: 10, // Get more to find the most recent one
      });

      if (response.success && response.data?.data && response.data.data.length > 0) {
        // Find the most recent subscription (ACTIVE or TRIAL)
        const subscription = response.data.data.find(
          (sub: any) => sub.status === 'ACTIVE' || sub.status === 'TRIAL' || sub.status === 'TRIALING'
        ) || response.data.data[0];
        
        setCurrentSubscription(subscription);

        // ALWAYS show selector for TRIAL subscriptions (they need to choose provider)
        // Only hide selector if subscription is ACTIVE and already has a payment provider
        if (subscription.status === 'ACTIVE' && subscription.paymentProvider) {
          setPaymentProvider(subscription.paymentProvider as PaymentProvider);
          setShowProviderSelector(false);
          console.log('Payment provider selector hidden - using existing provider:', subscription.paymentProvider);
        } else {
          // TRIAL, no provider, or other status - ALWAYS show selector
          setShowProviderSelector(true);
          setPaymentProvider(null); // No default selection
          console.log('Payment provider selector shown - subscription status:', subscription.status, 'has provider:', !!subscription.paymentProvider);
        }
      } else {
        // No existing subscription - show selector for new subscription
        setCurrentSubscription(null);
        setShowProviderSelector(true);
        setPaymentProvider(null); // No default selection
        console.log('Payment provider selector shown - no existing subscription');
      }
    } catch (error) {
      console.error("Error fetching current subscription:", error);
          // On error, default to showing selector
          setShowProviderSelector(true);
          setPaymentProvider(null); // No default selection
          console.log('Payment provider selector shown - error occurred');
    }
  };

  const fetchPlansAndUserCount = async () => {
    try {
      setLoading(true);
      
      // Fetch active public plans
      const plansResponse = await subscriptionService.getSubscriptionPlans({
        isActive: true,
        isPublic: true,
      });

      if (plansResponse.success && plansResponse.data) {
        // Include all plans including Free Trial
        const availablePlans = plansResponse.data.data || [];
        setPlans(availablePlans);
        
        // Set default selected plan: Starter plan, or first available
        if (!selectedPlanId) {
          const selectablePlans = availablePlans.filter(
            (plan: SubscriptionPlan) => plan.name?.toLowerCase() !== "free trial"
          );
          
          // First priority: Select Starter plan
          let planToSelect = selectablePlans.find(
            (plan: SubscriptionPlan) => plan.name?.toLowerCase() === "starter"
          );
          
          // Second priority: Select first available plan
          if (!planToSelect && selectablePlans.length > 0) {
            planToSelect = selectablePlans[0];
          }
          
          if (planToSelect) {
            setSelectedPlanId(planToSelect.id);
          }
        }
      }

      // Fetch user count
      if (user?.organizationId) {
        const usersResponse = await userService.getUsers({
          organizationId: user.organizationId,
          status: "ACTIVE",
          limit: 1000, // Get all active users
        });

        if (usersResponse.success && usersResponse.data) {
          const count = usersResponse.data.total || 1;
          console.log(`Fetched user count: ${count}`);
          setCurrentUserCount(count);
          setUserCount(count); // Initialize with current count
        } else {
          console.warn("Failed to fetch user count, using default: 1");
          setCurrentUserCount(1);
          setUserCount(1);
        }
      }
    } catch (error) {
      console.error("Error fetching plans and user count:", error);
      toast.error("Failed to load subscription plans");
    } finally {
      setLoading(false);
    }
  };

  const fetchPricingForAllPlans = async () => {
    try {
      setLoadingPricing(true);
      const pricingPromises = plans.map(async (plan) => {
        try {
          // Call API without billingCycle to get both monthly and yearly pricing
          const response = await subscriptionService.calculatePricing({
            planId: plan.id,
            userCount,
            // Don't pass billingCycle to get both monthly and yearly
          });

          if (response.success && response.data) {
            return { planId: plan.id, pricing: response.data };
          }
          return null;
        } catch (error) {
          console.error(`Error fetching pricing for plan ${plan.id}:`, error);
          return null;
        }
      });

      const results = await Promise.all(pricingPromises);
      const pricingMap: Record<string, PricingBreakdown> = {};

      results.forEach((result) => {
        if (result) {
          console.log(`Pricing for plan ${result.planId}:`, result.pricing);
          pricingMap[result.planId] = result.pricing;
        }
      });

      console.log(`Fetched pricing for ${Object.keys(pricingMap).length} plans with user count: ${userCount}`);
      setPricingData(pricingMap);
    } catch (error) {
      console.error("Error fetching pricing:", error);
    } finally {
      setLoadingPricing(false);
    }
  };

  const handleUpgrade = async () => {
    if (!selectedPlanId || !user?.organizationId) {
      toast.error("Please select a plan");
      return;
    }

    if (!paymentProvider) {
      toast.error("Please select a payment provider");
      return;
    }

    try {
      setLoading(true);
      const response = await paymentService.initiatePayment({
        planId: selectedPlanId,
        billingCycle,
        organizationId: user.organizationId,
        paymentProvider,
        userCount, // Pass user count
      });

      if (response.success && response.data) {
        setPaymentOrder(response.data);
        setIsPaymentDialogOpen(true);
      } else {
        toast.error(response.message || "Failed to initiate payment");
      }
    } catch (error: any) {
      console.error("Payment initiation error:", error);
      toast.error(error?.message || "Failed to initiate payment");
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    // Close payment dialog - success modal already shown in PaymentCheckout
    setIsPaymentDialogOpen(false);
    setPaymentOrder(null);
    // Page will reload automatically from PaymentCheckout
  };

  const handlePaymentFailure = () => {
    // Keep payment dialog open so user can see the error modal
    // User can manually close or retry payment
  };

  const handleDismiss = () => {
    onOpenChange(false);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price);
  };

  const getPricingForPlan = (planId: string) => {
    const pricing = pricingData[planId];
    if (!pricing) return null;

    if (billingCycle === "MONTHLY") {
      return pricing.monthly;
    }
    return pricing.yearly;
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto" showCloseButton={false}>
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-500" />
            </div>
              <DialogTitle className="text-xl">Upgrade Your Subscription</DialogTitle>
          </div>
          <DialogDescription className="text-base pt-2">
              Choose a plan that fits your needs. Adjust the user count to see pricing for your team size.
          </DialogDescription>
        </DialogHeader>
            
        {/* Payment Provider Selector - Show first for new subscriptions */}
        {/* DEBUG: Always show for now to test visibility */}
        <div className="px-6 py-4 bg-primary/5 rounded-lg border-2 border-primary/30 mb-4">
          <div className="mb-3 text-sm font-semibold text-foreground">
            Choose Payment Provider {showProviderSelector ? '(SHOWING)' : '(HIDDEN)'}
          </div>
          {showProviderSelector ? (
            <PaymentProviderSelector
              selectedProvider={paymentProvider}
              onProviderChange={(provider) => {
                console.log('Payment provider changed to:', provider);
                setPaymentProvider(provider);
              }}
            />
          ) : (
            <div className="p-3 bg-muted rounded-md text-sm">
              <span className="text-muted-foreground">Payment Provider: </span>
              <span className="font-medium">{currentSubscription?.paymentProvider || paymentProvider}</span>
            </div>
          )}
        </div>

        <div className="px-6">
            {/* User Count Selector */}
            <div className="mt-4 p-4 bg-muted/50 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium mb-1">Number of Users</p>
                  <p className="text-xs text-muted-foreground">
                    Current: {currentUserCount} {currentUserCount === 1 ? "user" : "users"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setUserCount(Math.max(currentUserCount, userCount - 1))}
                    disabled={userCount <= currentUserCount}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    type="number"
                    min={currentUserCount}
                    value={userCount}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || currentUserCount;
                      setUserCount(Math.max(currentUserCount, value));
                    }}
                    className="w-20 text-center [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                    tabIndex={-1}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setUserCount(userCount + 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {userCount !== currentUserCount && (
                <div className="text-xs text-muted-foreground">
                  <span>Adding {userCount - currentUserCount} more {userCount - currentUserCount === 1 ? "user" : "users"} to your organization</span>
                </div>
              )}
              {userCount === currentUserCount && currentUserCount > 1 && (
                <div className="text-xs text-muted-foreground">
                  Minimum: {currentUserCount} {currentUserCount === 1 ? "user" : "users"} (current organization size)
                </div>
              )}
              {userCount >= 5 && (
                <div className="text-xs text-green-600 dark:text-green-400 font-medium">
                  {userCount >= 5 && userCount <= 10 ? "10%" : userCount >= 11 && userCount <= 25 ? "15%" : userCount >= 26 && userCount <= 50 ? "20%" : ""} volume discount applied
                </div>
              )}
            </div>
        </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Loading plans...</span>
            </div>
          ) : (
            <>
              {/* Billing Cycle Toggle */}
              <div className="flex items-center justify-center gap-4 py-4">
                <span className={`text-sm font-medium ${billingCycle === "MONTHLY" ? "text-foreground" : "text-muted-foreground"}`}>
                  Monthly
                </span>
                <button
                  type="button"
                  onClick={() => setBillingCycle(billingCycle === "MONTHLY" ? "YEARLY" : "MONTHLY")}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    billingCycle === "YEARLY" 
                      ? "bg-foreground focus:ring-foreground" 
                      : "bg-muted focus:ring-muted-foreground"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full transition-transform ${
                      billingCycle === "YEARLY" 
                        ? "translate-x-6 bg-background" 
                        : "translate-x-1 bg-foreground"
                    }`}
                  />
                </button>
                <span className={`text-sm font-medium ${billingCycle === "YEARLY" ? "text-foreground" : "text-muted-foreground"}`}>
                  Yearly
                </span>
                {billingCycle === "YEARLY" && (
                  <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                    Save 2 months
                  </span>
                )}
              </div>

              {/* Plans Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
                {plans.map((plan) => {
                  const pricing = getPricingForPlan(plan.id);
                  const isSelected = selectedPlanId === plan.id;
                  const isLoadingPricing = !pricing && loadingPricing;

                  return (
                    <div
                      key={plan.id}
                      onClick={() => setSelectedPlanId(plan.id)}
                      className={`relative rounded-lg border-2 p-6 cursor-pointer transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-4 right-4">
                          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                            <Check className="w-4 h-4 text-primary-foreground" />
                          </div>
                        </div>
                      )}

                      <h3 className="text-lg font-semibold mb-2">{plan.name}</h3>
                      <p className="text-sm text-muted-foreground mb-4 min-h-[40px]">
                        {plan.description || "Premium features for your team"}
                      </p>

                      {isLoadingPricing ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          <span className="ml-2 text-xs text-muted-foreground">Calculating pricing...</span>
                        </div>
                      ) : pricing ? (
                        <div className="space-y-2">
                          <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold">
                              {formatPrice(pricing.discountedPricePerUser)}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              /user/{billingCycle === "MONTHLY" ? "month" : "year"}
                            </span>
                          </div>
                          
                          {/* Pricing Breakdown */}
                          <div className="mt-3 p-3 bg-muted/30 rounded-md space-y-1.5 text-xs">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Base price:</span>
                              <span className="font-medium">{formatPrice(pricing.basePricePerUser)} × {userCount} users</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Subtotal:</span>
                              <span>{formatPrice(pricing.basePricePerUser * userCount)}</span>
                            </div>
                            {pricing.volumeDiscountPercent > 0 && (
                              <>
                                <div className="flex justify-between text-green-600 dark:text-green-400">
                                  <span>Volume discount ({pricing.volumeDiscountPercent}%):</span>
                                  <span className="font-medium">
                                    -{formatPrice((pricing.basePricePerUser * userCount) - pricing.totalAmount)}
                                  </span>
                                </div>
                                <div className="border-t border-border pt-1.5 mt-1.5"></div>
                              </>
                            )}
                            <div className="flex justify-between font-semibold text-foreground">
                              <span>Total:</span>
                              <span>{formatPrice(pricing.totalAmount)}/{billingCycle === "MONTHLY" ? "month" : "year"}</span>
                            </div>
                            {billingCycle === "YEARLY" && (
                              <div className="text-muted-foreground italic">
                                Billed annually
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground py-4">
                          Pricing unavailable
                        </div>
                      )}

                      {/* Plan Features */}
                      <div className="mt-4 space-y-2">
                        {plan.dailyEmailLimit && (
                          <div className="flex items-center gap-2 text-sm">
                            <Check className="w-4 h-4 text-primary" />
                            <span>{plan.dailyEmailLimit} emails/day</span>
                          </div>
                        )}
                        {plan.maxContacts && (
                          <div className="flex items-center gap-2 text-sm">
                            <Check className="w-4 h-4 text-primary" />
                            <span>Up to {plan.maxContacts} contacts</span>
                          </div>
                        )}
                        {plan.maxCampaigns && (
                          <div className="flex items-center gap-2 text-sm">
                            <Check className="w-4 h-4 text-primary" />
                            <span>Up to {plan.maxCampaigns} campaigns</span>
                          </div>
                        )}
          </div>
                    </div>
                  );
                })}
        </div>

        <DialogFooter className="flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-2 w-full">
            <Button
              variant="outline"
              onClick={handleDismiss}
              className="w-full sm:w-auto"
              disabled={loading}
            >
              Maybe Later
            </Button>
            <Button
              onClick={handleUpgrade}
              className="w-full sm:w-auto"
              disabled={!selectedPlanId || !paymentProvider || loading || loadingPricing}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Upgrade Now
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Checkout Dialog */}
      {paymentOrder && (
        <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Complete Payment</DialogTitle>
              <DialogDescription>
                Complete your payment to activate your subscription
              </DialogDescription>
            </DialogHeader>
            <PaymentCheckout
              order={paymentOrder.order}
              checkoutSession={paymentOrder.checkoutSession}
              subscription={paymentOrder.subscription}
              pricingBreakdown={paymentOrder.pricingBreakdown}
              pendingChanges={paymentOrder.pendingChanges}
              organizationId={user?.organizationId || ""}
              paymentProvider={paymentOrder.paymentProvider || paymentProvider}
              onPaymentSuccess={handlePaymentSuccess}
              onPaymentFailure={handlePaymentFailure}
              onRazorpayOpen={() => {
                // Close payment dialog immediately when Razorpay opens to prevent overlay blocking
                setIsPaymentDialogOpen(false);
                
                // Also force close via DOM manipulation for immediate effect
                const dialogOverlays = document.querySelectorAll('[data-slot="dialog-overlay"]');
                const dialogContents = document.querySelectorAll('[data-slot="dialog-content"]');
                
                dialogOverlays.forEach((overlay) => {
                  (overlay as HTMLElement).style.display = 'none';
                  (overlay as HTMLElement).style.pointerEvents = 'none';
                  overlay.setAttribute('data-state', 'closed');
                });
                
                dialogContents.forEach((content) => {
                  (content as HTMLElement).style.display = 'none';
                  (content as HTMLElement).style.pointerEvents = 'none';
                  content.setAttribute('data-state', 'closed');
                });
              }}
              razorpayKeyId={import.meta.env.VITE_RAZOR_PAY_KEY}
            />
      </DialogContent>
    </Dialog>
      )}
    </>
  );
}
