"use client";

import { useState, useEffect } from "react";
import { useParams, useNavigate, Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, CreditCard, CheckCircle2, XCircle, AlertCircle, Check, Plus, Minus, Sparkles } from "lucide-react";
import { subscriptionService } from "@/api/subscriptionService";
import { userService } from "@/api/userService";
import { paymentService } from "@/api/paymentService";
import { organizationService } from "@/api/organizationService";
import { useAppStore } from "@/stores/appStore";
import { toast } from "sonner";
import type { SubscriptionPlan, Subscription, SubscriptionStatus } from "@/api/subscriptionTypes";
import { SubscriptionStatusLabels } from "@/api/subscriptionTypes";
import type { PaymentProvider } from "@/components/payments/PaymentProviderSelector";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function SubscriptionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAppStore();
  
  // Subscription data
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loadingSubscription, setLoadingSubscription] = useState(true);
  
  // Upgrade flow state
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentUserCount, setCurrentUserCount] = useState<number>(1);
  const [userCount, setUserCount] = useState<number>(1);
  const [activeUserCount, setActiveUserCount] = useState<number>(0);
  const [inactiveUserCount, setInactiveUserCount] = useState<number>(0);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("MONTHLY");
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [pricingData, setPricingData] = useState<Record<string, PricingBreakdown>>({});
  const [loadingPricing, setLoadingPricing] = useState(false);
  
  // Payment state
  const [paymentOrder, setPaymentOrder] = useState<any>(null);
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [organization, setOrganization] = useState<any>(null);
  const [paymentResult, setPaymentResult] = useState<{
    type: 'success' | 'failure' | null;
    message: string;
    details?: string;
    subscriptionId?: string;
    invoiceId?: string;
  } | null>(null);
  const [paymentProvider, setPaymentProvider] = useState<PaymentProvider | null>(null);
  const [showProviderSelector, setShowProviderSelector] = useState(true);

  // Track if initial pricing fetch has been done
  const [hasFetchedInitialPricing, setHasFetchedInitialPricing] = useState(false);

  // Helper function to calculate the actual amount to pay (considering proration)
  const getAmountToPay = (paymentOrder: any): number => {
    if (!paymentOrder) return 0;
    
    // For Stripe, use proration net charge if available
    if (paymentOrder.pricingBreakdown?.prorationDetails) {
      const proration = paymentOrder.pricingBreakdown.prorationDetails;
      // Use proratedAmount (net charge) if available, otherwise calculate from chargeAmount - creditAmount
      const netAmount = proration.proratedAmount !== undefined 
        ? proration.proratedAmount 
        : (proration.chargeAmount || 0) - (proration.creditAmount || 0);
      if (netAmount > 0) {
        return netAmount;
      }
    }
    
    // Fallback to order amount (Razorpay) or totalAmount
    return paymentOrder.order?.amount || paymentOrder.pricingBreakdown?.totalAmount || 0;
  };

  // Handle Stripe checkout success redirect
  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');

    if (canceled === 'true') {
      // User cancelled payment
      toast.error('Payment was cancelled');
      // Remove query params and clear stored payment order
      sessionStorage.removeItem('stripe_payment_order');
      setSearchParams({});
      return;
    }

    // Restore payment order from sessionStorage if not in state (page reloaded)
    const storedPaymentOrder = sessionStorage.getItem('stripe_payment_order');
    const orderToUse = paymentOrder || (storedPaymentOrder ? JSON.parse(storedPaymentOrder) : null);

    if (success === 'true' && sessionId && orderToUse) {
      // Verify Stripe payment
      const verifyStripePayment = async () => {
        try {
          setLoadingPayment(true);
          const verifyResponse = await paymentService.verifyPayment({
            orderId: sessionId, // Checkout session ID
            paymentId: sessionId, // Use session ID as payment ID for Stripe
            signature: '', // Stripe doesn't use signatures
            organizationId: user?.organizationId || "",
            pendingChanges: orderToUse.pendingChanges,
            pricingBreakdown: orderToUse.pricingBreakdown,
            paymentProvider: "STRIPE",
          });

          if (verifyResponse.success) {
            const newSubscriptionId = verifyResponse.data?.subscriptionId;
            const planName = plans.find(p => p.id === orderToUse.pendingChanges.planId)?.name || 'subscription';
            
            setPaymentResult({
              type: 'success',
              message: 'Payment Successful!',
              details: `Your ${planName} subscription has been activated successfully.`,
              subscriptionId: newSubscriptionId,
              invoiceId: verifyResponse.data?.invoiceId,
            });

            // Refresh subscription data
            if (id && user?.organizationId) {
              const subResponse = await subscriptionService.getSubscription(id, user.organizationId);
              if (subResponse.success && subResponse.data) {
                setSubscription(subResponse.data);
                if (subResponse.data.userCount) {
                  setCurrentUserCount(subResponse.data.userCount);
                  setUserCount(subResponse.data.userCount);
                }
              }
            }

            // Clear payment order and query params
            setPaymentOrder(null);
            sessionStorage.removeItem('stripe_payment_order');
            setSearchParams({});
          } else {
            setPaymentResult({
              type: 'failure',
              message: 'Payment Verification Failed',
              details: verifyResponse.message || 'Your payment was processed but verification failed. Please contact support if the amount was deducted.',
            });
            sessionStorage.removeItem('stripe_payment_order');
            setSearchParams({});
          }
        } catch (error: any) {
          console.error("Stripe payment verification error:", error);
          const errorMessage = error?.response?.data?.message || error?.message || "Payment verification failed";
          setPaymentResult({
            type: 'failure',
            message: 'Payment Verification Failed',
            details: errorMessage,
          });
          sessionStorage.removeItem('stripe_payment_order');
          setSearchParams({});
        } finally {
          setLoadingPayment(false);
        }
      };

      verifyStripePayment();
    }
  }, [searchParams, paymentOrder, user?.organizationId, id, plans, setSearchParams]);

  // Fetch subscription details
  useEffect(() => {
    const fetchSubscription = async () => {
      if (!id || !user?.organizationId) return;
      
      try {
        setLoadingSubscription(true);
        const response = await subscriptionService.getSubscription(id, user.organizationId);
        
        if (response.success && response.data) {
          const sub = response.data;
          setSubscription(sub);
          
          // Set payment provider from subscription if it exists
          if (sub.paymentProvider && sub.status === 'ACTIVE') {
            setPaymentProvider(sub.paymentProvider as PaymentProvider);
            setShowProviderSelector(false);
            console.log('Payment provider selector hidden - using existing provider:', sub.paymentProvider);
          } else {
            // TRIAL or no provider - show selector
            setShowProviderSelector(true);
            setPaymentProvider(null); // No default selection
            console.log('Payment provider selector shown - subscription status:', sub.status, 'has provider:', !!sub.paymentProvider);
          }
          
          // Set initial user count from subscription if available
          if (sub.userCount) {
            const subUserCount = sub.userCount;
            setCurrentUserCount(subUserCount);
            setUserCount(subUserCount);
          }
          // Set billing cycle from subscription
          if (sub.billingCycle) {
            setBillingCycle(sub.billingCycle as BillingCycle);
          }
        } else {
          toast.error("Subscription not found");
          navigate("/dashboard/subscriptions");
        }
      } catch (error) {
        console.error("Error fetching subscription:", error);
        toast.error("Failed to load subscription details");
        navigate("/dashboard/subscriptions");
      } finally {
        setLoadingSubscription(false);
      }
    };

    fetchSubscription();
  }, [id, user?.organizationId, navigate]);

  // Fetch plans and user count
  useEffect(() => {
    if (user?.organizationId && !loadingSubscription) {
      fetchPlansAndUserCount();
    }
  }, [user?.organizationId, loadingSubscription]);

  // Set default selected plan when subscription and plans are available
  useEffect(() => {
    if (plans.length > 0 && !selectedPlanId) {
      const selectablePlans = plans.filter(
        (plan: SubscriptionPlan) => plan.name?.toLowerCase() !== "free trial"
      );
      
      let planToSelect: SubscriptionPlan | undefined;
      
      // First priority: Select the current subscription's plan if available
      if (subscription?.planId) {
        planToSelect = selectablePlans.find(
          (plan: SubscriptionPlan) => plan.id === subscription.planId
        );
      }
      
      // Second priority: Select Starter plan if current plan not found
      if (!planToSelect) {
        planToSelect = selectablePlans.find(
          (plan: SubscriptionPlan) => plan.name?.toLowerCase() === "starter"
        );
      }
      
      // Third priority: Select first available plan
      if (!planToSelect && selectablePlans.length > 0) {
        planToSelect = selectablePlans[0];
      }
      
      if (planToSelect) {
        setSelectedPlanId(planToSelect.id);
      }
    }
  }, [subscription, plans, selectedPlanId]);

  // Fetch pricing immediately after plans and user count are loaded
  useEffect(() => {
    if (plans.length > 0 && userCount > 0 && !loadingSubscription && !hasFetchedInitialPricing) {
      fetchPricingForAllPlans();
      setHasFetchedInitialPricing(true);
    }
  }, [plans.length, userCount, loadingSubscription]);

  // Fetch pricing when user count or billing cycle changes (with debounce)
  useEffect(() => {
    if (plans.length === 0 || userCount === 0 || loadingSubscription || !hasFetchedInitialPricing) {
      return;
    }

    const timeoutId = setTimeout(() => {
      fetchPricingForAllPlans();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [userCount, billingCycle, hasFetchedInitialPricing]);

  // Clear payment order when plan, user count, or billing cycle changes
  useEffect(() => {
    if (paymentOrder) {
      setPaymentOrder(null);
    }
  }, [selectedPlanId, userCount, billingCycle]);

  // Fetch organization details
  useEffect(() => {
    const fetchOrganization = async () => {
      if (user?.organizationId) {
        try {
          const response = await organizationService.getOrganization(
            user.organizationId,
            user.organizationId
          );
          if (response.success && response.data) {
            setOrganization(response.data);
          }
        } catch (error) {
          console.error("Failed to fetch organization:", error);
        }
      }
    };

    fetchOrganization();
  }, [user?.organizationId]);

  // Load Razorpay script
  useEffect(() => {
    if (razorpayLoaded || window.Razorpay) {
      setRazorpayLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => {
      setRazorpayLoaded(true);
    };
    script.onerror = () => {
      toast.error("Failed to load Razorpay checkout");
    };

    document.body.appendChild(script);

    return () => {
      const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
      if (existingScript) {
        document.body.removeChild(existingScript);
      }
    };
  }, [razorpayLoaded]);

  const fetchPlansAndUserCount = async () => {
    try {
      // Fetch active public plans
      const plansResponse = await subscriptionService.getSubscriptionPlans({
        isActive: true,
        isPublic: true,
      });

      if (plansResponse.success && plansResponse.data) {
        const availablePlans = plansResponse.data.data || [];
        setPlans(availablePlans);
      }

      // Fetch user count breakdown (ACTIVE + INACTIVE, excluding SUSPENDED)
      if (user?.organizationId) {
        // Fetch ACTIVE users
        const activeUsersResponse = await userService.getUsers({
          organizationId: user.organizationId,
          status: "ACTIVE",
          limit: 1000,
        });

        // Fetch INACTIVE users
        const inactiveUsersResponse = await userService.getUsers({
          organizationId: user.organizationId,
          status: "INACTIVE",
          limit: 1000,
        });

        if (activeUsersResponse.success && activeUsersResponse.data) {
          const activeCount = activeUsersResponse.data.total || 0;
          setActiveUserCount(activeCount);
        }

        if (inactiveUsersResponse.success && inactiveUsersResponse.data) {
          const inactiveCount = inactiveUsersResponse.data.total || 0;
          setInactiveUserCount(inactiveCount);
        }

        // Calculate total (active + inactive, excluding suspended)
        const totalCount = (activeUsersResponse.success && activeUsersResponse.data ? activeUsersResponse.data.total || 0 : 0) +
                          (inactiveUsersResponse.success && inactiveUsersResponse.data ? inactiveUsersResponse.data.total || 0 : 0);
        
        // Only set currentUserCount if it hasn't been set from subscription yet
        // Use functional update to check current state
        setCurrentUserCount((currentCount) => {
          // If already set to a value > 1 (from subscription), keep it
          // Otherwise use organization user count (active + inactive)
          return currentCount > 1 ? currentCount : (totalCount > 0 ? totalCount : 1);
        });
        setUserCount((currentCount) => {
          // Only set if we don't have a subscription user count already
          // Default to actual org count (active + inactive)
          return currentCount > 1 ? currentCount : (totalCount > 0 ? totalCount : 1);
        });
      }
    } catch (error) {
      console.error("Error fetching plans and user count:", error);
      toast.error("Failed to load subscription plans");
    }
  };

  const fetchPricingForAllPlans = async () => {
    try {
      setLoadingPricing(true);
      const pricingPromises = plans.map(async (plan) => {
        try {
          const response = await subscriptionService.calculatePricing({
            planId: plan.id,
            userCount,
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
          pricingMap[result.planId] = result.pricing;
        }
      });

      setPricingData(pricingMap);
    } catch (error) {
      console.error("Error fetching pricing:", error);
    } finally {
      setLoadingPricing(false);
    }
  };

  // Helper to check if this is a downgrade
  const isPlanDowngrade = (): boolean => {
    if (!subscription || !selectedPlanId || !subscription.plan) return false;
    
    const currentPrice = subscription.billingCycle === "YEARLY"
      ? (subscription.plan.pricePerUserYearly || 0)
      : (subscription.plan.pricePerUserMonthly || 0);
    
    const selectedPlan = plans.find(p => p.id === selectedPlanId);
    if (!selectedPlan) return false;
    
    const newPrice = billingCycle === "YEARLY"
      ? (selectedPlan.pricePerUserYearly || 0)
      : (selectedPlan.pricePerUserMonthly || 0);
    
    return newPrice < currentPrice;
  };

  // Helper to check if user count is being reduced
  const isUserCountReduction = (): boolean => {
    if (!subscription) return false;
    return userCount < (subscription.userCount || currentUserCount);
  };

  const handleScheduleUserReduction = async () => {
    if (!id || !user?.organizationId) {
      toast.error("Missing subscription or organization information");
      return;
    }

    try {
      setLoadingPayment(true);
      const response = await subscriptionService.scheduleUserCountReduction(
        id,
        userCount,
        `User count reduction scheduled: ${subscription?.userCount || currentUserCount} → ${userCount}`
      );

      if (response.success && response.data) {
        toast.success(
          `User count reduction scheduled. Will apply on ${new Date(response.data.currentPeriodEnd || '').toLocaleDateString()}. No credit will be given.`
        );
        // Refresh subscription data
        const subResponse = await subscriptionService.getSubscription(id, user.organizationId);
        if (subResponse.success && subResponse.data) {
          setSubscription(subResponse.data);
          setCurrentUserCount(subResponse.data.userCount || userCount);
          setUserCount(subResponse.data.userCount || userCount);
        }
      } else {
        toast.error(response.message || "Failed to schedule user reduction");
      }
    } catch (error: any) {
      console.error("Schedule user reduction error:", error);
      toast.error(error?.message || "Failed to schedule user reduction");
    } finally {
      setLoadingPayment(false);
    }
  };

  const handleScheduleDowngrade = async () => {
    if (!selectedPlanId || !id || !user?.organizationId) {
      toast.error("Please select a plan");
      return;
    }

    try {
      setLoadingPayment(true);
      const selectedPlan = plans.find(p => p.id === selectedPlanId);
      const response = await subscriptionService.schedulePlanDowngrade(
        id,
        selectedPlanId,
        `Plan downgrade scheduled: ${subscription?.plan?.name || 'Current Plan'} → ${selectedPlan?.name || 'New Plan'}`
      );

      if (response.success && response.data) {
        toast.success(
          `Plan downgrade scheduled. Will apply on ${new Date(response.data.currentPeriodEnd || '').toLocaleDateString()}. No credit will be given.`
        );
        // Refresh subscription data
        const subResponse = await subscriptionService.getSubscription(id, user.organizationId);
        if (subResponse.success && subResponse.data) {
          setSubscription(subResponse.data);
        }
      } else {
        toast.error(response.message || "Failed to schedule downgrade");
      }
    } catch (error: any) {
      console.error("Schedule downgrade error:", error);
      toast.error(error?.message || "Failed to schedule downgrade");
    } finally {
      setLoadingPayment(false);
    }
  };

  const handleUpgrade = async () => {
    if (!selectedPlanId || !user?.organizationId) {
      toast.error("Please select a plan");
      return;
    }

    // Check if this is a reduction or downgrade - use scheduling instead
    if (isUserCountReduction() && !isPlanDowngrade() && subscription?.planId === selectedPlanId) {
      await handleScheduleUserReduction();
      return;
    }

    if (isPlanDowngrade()) {
      await handleScheduleDowngrade();
      return;
    }

    try {
      setLoadingPayment(true);
      const response = await paymentService.initiatePayment({
        planId: selectedPlanId,
        billingCycle,
        organizationId: user.organizationId,
        paymentProvider: paymentProvider || undefined,
        userCount,
      });

      if (response.success && response.data) {
        setPaymentOrder(response.data);
      } else {
        toast.error(response.message || "Failed to initiate payment");
      }
    } catch (error: any) {
      console.error("Payment initiation error:", error);
      toast.error(error?.message || "Failed to initiate payment");
    } finally {
      setLoadingPayment(false);
    }
  };

  const handlePayment = async () => {
    if (!paymentOrder) return;
    
    // Check payment provider from paymentOrder or current state
    const orderPaymentProvider = paymentOrder.paymentProvider || paymentProvider;
    
    // If Stripe, store payment order in sessionStorage and redirect to checkout session
    if (orderPaymentProvider === "STRIPE" && paymentOrder.checkoutSession?.url) {
      // Store payment order in sessionStorage so we can restore it after redirect
      sessionStorage.setItem('stripe_payment_order', JSON.stringify(paymentOrder));
      window.location.href = paymentOrder.checkoutSession.url;
      return;
    }
    
    // Razorpay flow
    if (!window.Razorpay) {
      toast.error("Razorpay checkout script failed to load. Please refresh the page.");
      return;
    }

    const razorpayKeyId = import.meta.env.VITE_RAZOR_PAY_KEY;
    if (!razorpayKeyId) {
      toast.error("Razorpay is not configured. Please set VITE_RAZOR_PAY_KEY in your .env file.");
      return;
    }

    setLoadingPayment(true);

    try {
      const billingEmail = organization?.billingEmail || organization?.email || user?.email || '';
      const billingPhone = organization?.phone || '';
      const userName = user?.firstName && user?.lastName 
        ? `${user.firstName} ${user.lastName}`.trim()
        : user?.email?.split('@')[0] || '';

      const options = {
        key: razorpayKeyId,
        amount: paymentOrder.order.amount * 100,
        currency: paymentOrder.order.currency,
        name: "Inboz",
        description: paymentOrder.order.planDescription || `${paymentOrder.order.billingCycle} subscription for ${paymentOrder.order.planName}`,
        order_id: paymentOrder.order.id,
        receipt: paymentOrder.order.receipt,
        prefill: {
          name: userName,
          email: billingEmail,
          contact: billingPhone,
        },
        handler: async function (response: any) {
          try {
            const verifyResponse = await paymentService.verifyPayment({
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
              organizationId: user?.organizationId || "",
              pendingChanges: paymentOrder.pendingChanges,
              pricingBreakdown: paymentOrder.pricingBreakdown,
              paymentProvider: "RAZORPAY",
            });

            if (verifyResponse.success) {
              const newSubscriptionId = verifyResponse.data?.subscriptionId;
              setPaymentResult({
                type: 'success',
                message: 'Payment Successful!',
                details: `Your ${paymentOrder.order?.planName || plans.find(p => p.id === paymentOrder.pendingChanges.planId)?.name || 'subscription'} subscription has been activated successfully.`,
                subscriptionId: newSubscriptionId,
                invoiceId: verifyResponse.data?.invoiceId,
              });
              // Refresh subscription data - use new subscription ID if available (new subscription created)
              // or use current id if subscription was updated in place
              const subscriptionIdToFetch = newSubscriptionId || id;
              if (subscriptionIdToFetch) {
                const subResponse = await subscriptionService.getSubscription(subscriptionIdToFetch, user?.organizationId);
                if (subResponse.success && subResponse.data) {
                  setSubscription(subResponse.data);
                  // Update user count from subscription after upgrade - always use subscription userCount
                  // If subscription has userCount, use it; otherwise use the actual org user count
                  const subscriptionUserCount = subResponse.data.userCount;
                  if (subscriptionUserCount !== null && subscriptionUserCount !== undefined) {
                    setCurrentUserCount(subscriptionUserCount);
                    setUserCount(subscriptionUserCount);
                  } else {
                    // If subscription doesn't have userCount set, use the actual org user count
                    const totalOrgUserCount = activeUserCount + inactiveUserCount;
                    if (totalOrgUserCount > 0) {
                      setCurrentUserCount(totalOrgUserCount);
                      setUserCount(totalOrgUserCount);
                    }
                  }
                  // Note: If a new subscription was created (ID changed), we don't navigate automatically
                  // User will navigate via the button in the success modal
                }
              }
            } else {
              const paymentId = response.razorpay_payment_id || 'N/A';
              const orderId = response.razorpay_order_id || 'N/A';
              setPaymentResult({
                type: 'failure',
                message: 'Payment Verification Failed',
                details: `Your payment was processed but verification failed. Payment ID: ${paymentId}, Order ID: ${orderId}. Please contact support with these details if the amount was deducted.`,
              });
            }
          } catch (error: any) {
            console.error("Payment verification error:", error);
            const paymentId = response?.razorpay_payment_id || 'N/A';
            const orderId = response?.razorpay_order_id || 'N/A';
            const errorMessage = error?.response?.data?.message || error?.message || "Payment verification failed";
            const errorDetails = error?.response?.data?.error?.details || error?.response?.data?.error?.code || '';
            setPaymentResult({
              type: 'failure',
              message: 'Payment Verification Failed',
              details: `${errorMessage}${errorDetails ? ` (${errorDetails})` : ''}. Payment ID: ${paymentId}, Order ID: ${orderId}. Please contact support with these details if the amount was deducted.`,
            });
          } finally {
            setLoadingPayment(false);
          }
        },
        theme: {
          color: "#6366f1",
        },
        modal: {
          ondismiss: function () {
            setLoadingPayment(false);
            setPaymentResult({
              type: 'failure',
              message: 'Payment Cancelled',
              details: 'You cancelled the payment. No charges were made.',
            });
          },
        },
      };

      // Inject CSS to ensure Razorpay modal has highest z-index
      const styleId = 'razorpay-z-index-fix';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
          .razorpay-checkout-frame,
          .razorpay-checkout-iframe,
          iframe[src*="razorpay"],
          [id*="razorpay"],
          [class*="razorpay"] {
            z-index: 999999 !important;
          }
        `;
        document.head.appendChild(style);
      }

      const razorpay = new window.Razorpay({
        ...options,
        zIndex: 999999,
      });

      razorpay.on('payment.failed', function (response: any) {
        setLoadingPayment(false);
        console.error("Razorpay payment failed:", response);
        
        let errorMessage = "Payment could not be completed";
        if (response?.error) {
          if (response.error.description) {
            errorMessage = response.error.description;
          } else if (response.error.reason) {
            errorMessage = response.error.reason;
          } else if (response.error.message) {
            errorMessage = response.error.message;
          }
        }
        
        let failureMessage = errorMessage;
        let failureDetails = "Please try again or contact support if the issue persists.";
        
        if (
          errorMessage.toLowerCase().includes("international") ||
          response?.error?.reason === "international_transaction_not_allowed"
        ) {
          failureMessage = "International Cards Not Supported";
          failureDetails = "Your Razorpay account needs to be configured to accept international cards. Please use an Indian card or contact support.";
        }
        
        setPaymentResult({
          type: 'failure',
          message: failureMessage,
          details: failureDetails,
        });
      });

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTimeout(() => {
            razorpay.open();
          }, 100);
        });
      });
    } catch (error) {
      console.error("Payment initiation error:", error);
      setPaymentResult({
        type: 'failure',
        message: 'Payment Initiation Failed',
        details: 'Failed to start the payment process. Please try again.',
      });
      setLoadingPayment(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getPricingForPlan = (planId: string) => {
    const pricing = pricingData[planId];
    if (!pricing) return null;

    if (billingCycle === "MONTHLY") {
      return pricing.monthly;
    }
    return pricing.yearly;
  };

  if (loadingSubscription) {
    return (
      <div className="w-full p-4">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Loading subscription details...</span>
        </div>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="w-full p-4">
        <div className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Subscription Not Found</h3>
          <p className="text-sm text-muted-foreground mb-4">The subscription you're looking for doesn't exist.</p>
          <Button asChild>
            <Link to="/dashboard/subscriptions">Back to Subscriptions</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="w-full p-6">
        <Card className="py-0">
          <CardContent className="p-0 py-0">
          {/* Current Subscription Section */}
          <div className="px-6 py-4 border-b border-muted">
            <h2 className="text-lg font-semibold mb-2">Current Subscription</h2>
            <div className="grid grid-cols-5 gap-6 text-sm">
              <div>
                <div className="text-muted-foreground text-xs mb-1">Plan</div>
                <div className="font-medium">{subscription.plan?.name || "N/A"}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs mb-1">Users</div>
                <div className="font-medium">{subscription.userCount || 1}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs mb-1">Billing</div>
                <div className="font-medium">{subscription.billingCycle}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs mb-1">Amount</div>
                <div className="font-medium">{formatPrice(subscription.amount || 0)}</div>
              </div>
              {subscription.currentPeriodStart && subscription.currentPeriodEnd && (
                <div>
                  <div className="text-muted-foreground text-xs mb-1">Period</div>
                  <div className="font-medium text-xs">{formatDate(subscription.currentPeriodStart)} - {formatDate(subscription.currentPeriodEnd)}</div>
                </div>
              )}
            </div>
            
            {/* Pending Changes Display */}
            {(subscription.pendingUserCount !== null && subscription.pendingUserCount !== undefined) || subscription.pendingPlanId ? (
              <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                      Pending Changes
                    </div>
                    <div className="text-xs text-yellow-700 dark:text-yellow-300 space-y-1">
                      {subscription.pendingUserCount !== null && subscription.pendingUserCount !== undefined && (
                        <div>
                          User count will reduce to {subscription.pendingUserCount} on {subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : 'next billing cycle'}
                        </div>
                      )}
                      {subscription.pendingPlanId && (() => {
                        const pendingPlan = plans.find(p => p.id === subscription.pendingPlanId);
                        return (
                          <div>
                            Plan will downgrade to {pendingPlan?.name || 'new plan'} on {subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : 'next billing cycle'}
                          </div>
                        );
                      })()}
                      <div className="text-yellow-600 dark:text-yellow-400 italic">
                        No credit will be given for these changes.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* Upgrade and Payment in 2 Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-[70%_30%] relative">
            <div className="absolute left-[70%] top-0 bottom-0 w-px bg-border hidden lg:block z-10"></div>
        {/* Upgrade Section */}
        <div className="px-6 py-4 space-y-3">
          <div>
            <h2 className="text-lg font-semibold mb-1">Upgrade Subscription</h2>
            <p className="text-sm text-muted-foreground">Select a plan and adjust user count</p>
          </div>
          
          <div className="space-y-3">
          {/* User Config and Billing Cycle in one row */}
          <div className="flex flex-col sm:flex-row gap-4 p-4 border rounded-lg">
            {/* Users Config */}
            <div className="flex-1 flex flex-col sm:flex-row gap-3 items-start sm:items-center min-w-0">
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-sm font-medium whitespace-nowrap">Users:</span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setUserCount(Math.max(1, userCount - 1))}
                    disabled={userCount <= 1}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <Input
                    type="number"
                    min={1}
                    value={userCount}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 1;
                      setUserCount(Math.max(1, value));
                    }}
                    className="w-16 text-center text-sm [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                    tabIndex={-1}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setUserCount(userCount + 1)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <span className="text-xs text-muted-foreground flex-shrink-0">
                (Current: {activeUserCount} active + {inactiveUserCount} inactive = {activeUserCount + inactiveUserCount} total)
                {subscription?.userCount && (
                  <span className="block text-xs text-muted-foreground mt-0.5">
                    Subscription limit: {subscription.userCount} users
                  </span>
                )}
              </span>
            </div>
            
            {/* Billing Cycle */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className="text-sm font-medium whitespace-nowrap">Billing:</span>
              <div className="flex items-center gap-2">
                <span className={`text-xs whitespace-nowrap ${billingCycle === "MONTHLY" ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                  Monthly
                </span>
                <button
                  type="button"
                  onClick={() => setBillingCycle(billingCycle === "MONTHLY" ? "YEARLY" : "MONTHLY")}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 flex-shrink-0 ${
                    billingCycle === "YEARLY" 
                      ? "bg-foreground focus:ring-foreground" 
                      : "bg-muted focus:ring-muted-foreground"
                  }`}
                >
                  <span
                    className={`inline-block h-3 w-3 transform rounded-full transition-transform ${
                      billingCycle === "YEARLY" 
                        ? "translate-x-5 bg-background" 
                        : "translate-x-1 bg-foreground"
                    }`}
                  />
                </button>
                <span className={`text-xs whitespace-nowrap ${billingCycle === "YEARLY" ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                  Yearly
                </span>
              </div>
            </div>
          </div>

          {/* Payment Provider Selector in separate row */}
          {showProviderSelector ? (
            <div className="p-4 border rounded-lg">
              <div className="space-y-1.5 max-w-md">
                <label className="text-xs font-medium text-foreground">Payment Provider *</label>
                <Select
                  value={paymentOrder?.paymentProvider || paymentProvider || ""}
                  onValueChange={async (value: PaymentProvider) => {
                    console.log('Payment provider selected:', value);
                    setPaymentProvider(value);
                    
                    // If paymentOrder already exists, re-initiate with new provider
                    if (selectedPlanId && user?.organizationId && paymentOrder) {
                      try {
                        setLoadingPayment(true);
                        const response = await paymentService.initiatePayment({
                          planId: selectedPlanId,
                          billingCycle,
                          organizationId: user.organizationId,
                          paymentProvider: value,
                          userCount,
                        });

                        if (response.success && response.data) {
                          setPaymentOrder(response.data);
                          toast.success(`Switched to ${value === "STRIPE" ? "Stripe" : "Razorpay"}`);
                        } else {
                          toast.error(response.message || "Failed to switch payment provider");
                          setPaymentProvider(null);
                        }
                      } catch (error: any) {
                        console.error("Payment provider switch error:", error);
                        toast.error("Failed to switch payment provider");
                        setPaymentProvider(null);
                      } finally {
                        setLoadingPayment(false);
                      }
                    }
                  }}
                >
                  <SelectTrigger className="h-9 text-sm w-full">
                    <SelectValue placeholder="Select payment provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RAZORPAY">Razorpay (Manual renewal)</SelectItem>
                    <SelectItem value="STRIPE">Stripe (Auto-renewal)</SelectItem>
                  </SelectContent>
                </Select>
                {!paymentProvider && !paymentOrder?.paymentProvider && (
                  <p className="text-xs text-muted-foreground">Please select a payment provider to continue</p>
                )}
              </div>
            </div>
          ) : subscription?.paymentProvider ? (
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Payment Provider:</span>
                <span className="text-xs font-medium">{subscription.paymentProvider}</span>
              </div>
            </div>
          ) : null}

          {/* Plans Grid */}
          {loadingPricing && plans.length === 0 ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="ml-2 text-xs text-muted-foreground">Loading plans...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {plans.map((plan) => {
                const pricing = getPricingForPlan(plan.id);
                const isSelected = selectedPlanId === plan.id;
                const isLoadingPricing = !pricing && loadingPricing;

                return (
                  <div
                    key={plan.id}
                    onClick={() => setSelectedPlanId(plan.id)}
                    className={`relative rounded-lg border p-4 cursor-pointer transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-muted hover:border-primary/30"
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-2 right-2">
                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-3 h-3 text-primary-foreground" />
                        </div>
                      </div>
                    )}

                    <h3 className="text-base font-semibold mb-1">{plan.name}</h3>
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                      {plan.description || "Premium features for your team"}
                    </p>

                    {isLoadingPricing ? (
                      <div className="flex items-center justify-center py-3">
                        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                        <span className="ml-2 text-xs text-muted-foreground">Calculating...</span>
                      </div>
                    ) : pricing ? (
                      <div className="space-y-2">
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-bold">
                            {formatPrice(pricing.discountedPricePerUser)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            /user/{billingCycle === "MONTHLY" ? "mo" : "yr"}
                          </span>
                        </div>
                        
                        <div className="mt-2 p-2 bg-muted/30 rounded text-xs">
                          <div className="flex justify-between mb-1">
                            <span className="text-muted-foreground">Base Price:</span>
                            <span>{formatPrice(pricing.basePricePerUser)} × {userCount} = {formatPrice(pricing.basePricePerUser * userCount)}</span>
                          </div>
                          {pricing.volumeDiscountPercent > 0 && (
                            <div className="flex justify-between text-green-600 dark:text-green-400 mb-1">
                              <span>Volume Discount ({pricing.volumeDiscountPercent}%):</span>
                              <span>-{formatPrice((pricing.basePricePerUser * userCount) - pricing.totalAmount)}</span>
                            </div>
                          )}
                          <div className="flex justify-between font-semibold pt-1 border-t">
                            <span>Total:</span>
                            <span>{formatPrice(pricing.totalAmount)}/{billingCycle === "MONTHLY" ? "mo" : "yr"}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground py-2">
                        Pricing unavailable
                      </div>
                    )}

                    <div className="mt-3 space-y-1">
                      {plan.dailyEmailLimit && (
                        <div className="flex items-center gap-1.5 text-xs">
                          <Check className="w-3 h-3 text-primary" />
                          <span>{plan.dailyEmailLimit} emails/day</span>
                        </div>
                      )}
                      {plan.maxContacts && (
                        <div className="flex items-center gap-1.5 text-xs">
                          <Check className="w-3 h-3 text-primary" />
                          <span>Up to {plan.maxContacts} contacts</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 pt-2">
            {/* Show scheduling message for reductions/downgrades */}
            {(isUserCountReduction() && !isPlanDowngrade() && subscription?.planId === selectedPlanId) || isPlanDowngrade() ? (
              <div className="p-3 bg-muted/50 border border-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  {isUserCountReduction() && !isPlanDowngrade() && subscription?.planId === selectedPlanId
                    ? "User count reduction will take effect at next billing cycle. No credit will be given."
                    : "Plan downgrade will take effect at next billing cycle. No credit will be given."}
                </p>
                {subscription?.currentPeriodEnd && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Will apply on {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                  </p>
                )}
              </div>
            ) : null}
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => navigate("/dashboard/subscriptions")}
                disabled={loadingPayment}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpgrade}
                disabled={!selectedPlanId || !paymentProvider || loadingPayment || loadingPricing}
              >
                {loadingPayment ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : isUserCountReduction() && !isPlanDowngrade() && subscription?.planId === selectedPlanId ? (
                  "Schedule User Reduction"
                ) : isPlanDowngrade() ? (
                  "Schedule Plan Downgrade"
                ) : (
                  "Upgrade Now"
                )}
              </Button>
            </div>
          </div>
          </div>
          </div>

          {/* Payment Checkout Section */}
          <div className="px-6 py-4 space-y-3">
            <div>
              <h2 className="text-lg font-semibold mb-1 flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Complete Payment
              </h2>
              {paymentOrder && (
                <p className="text-sm text-muted-foreground">
                  Pay ${getAmountToPay(paymentOrder).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} to activate your subscription
                </p>
              )}
            </div>
            
            {paymentOrder ? (
              <div className="space-y-3">
                {/* Pricing Breakdown */}
                <div className="space-y-2 p-3 border border-muted rounded-lg">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Plan:</span>
                      <span className="text-sm font-medium">
                        {paymentOrder.order?.planName || plans.find(p => p.id === paymentOrder.pendingChanges.planId)?.name || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Billing Cycle:</span>
                      <span className="text-sm font-medium">{paymentOrder.order?.billingCycle || paymentOrder.pendingChanges.billingCycle}</span>
                    </div>
                    {paymentOrder.pendingChanges?.userCount && (
                      <>
                        {paymentOrder.pendingChanges.operationType === 'ADD_USERS' || paymentOrder.pendingChanges.operationType === 'COMBINED' ? (
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Total Users:</span>
                            <span className="text-sm font-medium">{paymentOrder.pendingChanges.userCount} user{paymentOrder.pendingChanges.userCount !== 1 ? 's' : ''}</span>
                          </div>
                          <div className="flex justify-between pl-4">
                            <span className="text-xs text-muted-foreground">Existing:</span>
                            <span className="text-xs font-medium">{paymentOrder.pendingChanges.existingUserCount || 0} user{(paymentOrder.pendingChanges.existingUserCount || 0) !== 1 ? 's' : ''}</span>
                          </div>
                          <div className="flex justify-between pl-4">
                            <span className="text-xs text-muted-foreground">New:</span>
                            <span className="text-xs font-medium text-green-600 dark:text-green-400">
                              +{paymentOrder.pendingChanges.newUserCount || 0} user{(paymentOrder.pendingChanges.newUserCount || 0) !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Users:</span>
                          <span className="text-sm font-medium">{paymentOrder.pendingChanges.userCount} user{paymentOrder.pendingChanges.userCount !== 1 ? 's' : ''}</span>
                        </div>
                      )}
                    </>
                  )}
                  </div>
                  
                  {/* Price Breakdown */}
                  {paymentOrder.pricingBreakdown && (
                    <div className="pt-2 border-t space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Base Price:</span>
                        <span>${(paymentOrder.pricingBreakdown.basePricePerUser || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} × {paymentOrder.pendingChanges?.userCount || 1} = ${((paymentOrder.pricingBreakdown.basePricePerUser || 0) * (paymentOrder.pendingChanges?.userCount || 1)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      {paymentOrder.pricingBreakdown.volumeDiscountPercent > 0 && (
                        <div className="flex justify-between text-xs text-green-600 dark:text-green-400">
                          <span>Volume Discount ({paymentOrder.pricingBreakdown.volumeDiscountPercent}%):</span>
                          <span>-${(((paymentOrder.pricingBreakdown.basePricePerUser || 0) * (paymentOrder.pendingChanges?.userCount || 1)) - (paymentOrder.pricingBreakdown.totalAmount || 0)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      )}
                      {paymentOrder.pricingBreakdown?.prorationDetails && paymentOrder.pricingBreakdown.prorationDetails.creditAmount > 0 && (
                        <>
                          <div className="flex justify-between text-xs pt-1 border-t border-muted/50">
                            <span className="text-muted-foreground">Prorated Period:</span>
                            <span className="font-medium">
                              {paymentOrder.pricingBreakdown.prorationDetails.daysRemaining} days remaining (of {paymentOrder.pricingBreakdown.prorationDetails.totalDays} days)
                            </span>
                          </div>
                          <div className="text-xs font-medium text-muted-foreground mb-1 pt-1">
                            {paymentOrder.pendingChanges?.operationType === 'ADD_USERS' && 
                             paymentOrder.pricingBreakdown.prorationDetails.oldBillingCycle !== paymentOrder.pricingBreakdown.prorationDetails.newBillingCycle
                              ? 'Billing Cycle Change Adjustment:'
                              : 'Plan Upgrade Breakdown:'}
                          </div>
                          <div className="flex justify-between text-xs pl-2">
                            <span className="text-muted-foreground">
                              Credit ({paymentOrder.pricingBreakdown.prorationDetails.oldPlanName || 'Previous Plan'}):
                            </span>
                            <span className="font-medium text-green-600 dark:text-green-400">
                              -${paymentOrder.pricingBreakdown.prorationDetails.creditAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="flex justify-between text-xs pl-2">
                            <span className="text-muted-foreground">
                              Charge ({paymentOrder.pricingBreakdown.prorationDetails.newPlanName || 'New Plan'}):
                            </span>
                            <span className="font-medium">
                              ${paymentOrder.pricingBreakdown.prorationDetails.chargeAmount?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                            </span>
                          </div>
                        </>
                      )}
                      {paymentOrder.pricingBreakdown.totalAmount && paymentOrder.order && paymentOrder.pricingBreakdown.totalAmount !== paymentOrder.order.amount && (
                        <div className="flex justify-between text-xs pt-1 border-t border-muted/50">
                          <span className="text-muted-foreground">Full Subscription:</span>
                          <span className="font-medium">${paymentOrder.pricingBreakdown.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm font-semibold pt-2 border-t">
                        <span>Amount to Pay:</span>
                        <span className="text-lg font-bold">
                          ${getAmountToPay(paymentOrder).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Warning for Razorpay */}
                {(!paymentOrder.paymentProvider || paymentOrder.paymentProvider === "RAZORPAY") && !import.meta.env.VITE_RAZOR_PAY_KEY && (
                  <div className="rounded-md bg-yellow-50 dark:bg-yellow-900/20 p-3 text-sm text-yellow-800 dark:text-yellow-200">
                    <p className="font-medium">Razorpay not configured</p>
                    <p className="mt-1">Please set VITE_RAZOR_PAY_KEY in your .env file</p>
                  </div>
                )}

                {/* Payment Button */}
                <Button
                  onClick={handlePayment}
                  disabled={
                    loadingPayment || 
                    ((!paymentOrder.paymentProvider || paymentOrder.paymentProvider === "RAZORPAY") && (!razorpayLoaded || !import.meta.env.VITE_RAZOR_PAY_KEY || !paymentOrder.order)) ||
                    (paymentOrder.paymentProvider === "STRIPE" && !paymentOrder.checkoutSession?.url)
                  }
                  className="w-full"
                  size="lg"
                >
                  {loadingPayment ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (paymentOrder.paymentProvider === "STRIPE") ? (
                    <>
                      <CreditCard className="mr-2 h-4 w-4" />
                      Continue to Stripe
                    </>
                  ) : !import.meta.env.VITE_RAZOR_PAY_KEY ? (
                    <>
                      <CreditCard className="mr-2 h-4 w-4" />
                      Razorpay Not Configured
                    </>
                  ) : (
                    <>
                      <CreditCard className="mr-2 h-4 w-4" />
                      Pay ${getAmountToPay(paymentOrder).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground text-center py-8 border border-dashed rounded-lg">
                <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Select a plan and click "Upgrade Now" to proceed</p>
              </div>
            )}
          </div>
          </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Result Dialog - Phone Payment Style */}
      <Dialog open={!!paymentResult} onOpenChange={(open) => {
        if (!open) {
          setPaymentResult(null);
        }
      }}>
        <DialogContent className="sm:max-w-md" showCloseButton={false} onInteractOutside={(e) => e.preventDefault()}>
          {paymentResult?.type === 'success' ? (
            <>
              <div className="flex flex-col items-center text-center space-y-4 py-4">
                {/* Success Icon */}
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center animate-in zoom-in duration-300">
                    <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-500" />
                  </div>
                  <div className="absolute -top-1 -right-1">
                    <Sparkles className="w-6 h-6 text-green-500 animate-pulse" />
                  </div>
                </div>

                {/* Success Title */}
                <div className="space-y-2">
                  <DialogTitle className="text-2xl font-bold text-foreground">
                    Payment Successful!
                  </DialogTitle>
                  <DialogDescription className="text-base text-muted-foreground">
                    {paymentResult.message || "Your payment has been processed successfully"}
                  </DialogDescription>
                </div>

                {/* Payment Details */}
                {paymentOrder && (
                  <div className="w-full space-y-3 pt-4 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Plan</span>
                      <span className="text-sm font-semibold text-foreground">
                        {paymentOrder.order?.planName || plans.find(p => p.id === paymentOrder.pendingChanges.planId)?.name || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Amount Paid</span>
                      <span className="text-lg font-bold text-foreground">
                        ${(paymentOrder.order?.amount || paymentOrder.pricingBreakdown.totalAmount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Billing Cycle</span>
                      <span className="text-sm font-medium text-foreground">
                        {paymentOrder.order?.billingCycle || paymentOrder.pendingChanges.billingCycle}
                      </span>
                    </div>
                  </div>
                )}

                {/* Success Message */}
                <div className="pt-2">
                  <p className="text-sm text-muted-foreground">
                    Your subscription is now active and ready to use!
                  </p>
                </div>

                {/* Action Button */}
                <Button
                  onClick={() => {
                    setPaymentResult(null);
                    setPaymentOrder(null);
                    // Navigate to subscriptions page on button click
                    navigate("/dashboard/subscriptions");
                  }}
                  className="w-full mt-4"
                  size="lg"
                >
                  Continue
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-col items-center text-center space-y-4 py-4">
                {/* Failure Icon */}
                <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center animate-in zoom-in duration-300">
                  <XCircle className="w-12 h-12 text-red-600 dark:text-red-500" />
                </div>

                {/* Failure Title */}
                <div className="space-y-2">
                  <DialogTitle className="text-2xl font-bold text-foreground">
                    {paymentResult?.message || "Payment Failed"}
                  </DialogTitle>
                  <DialogDescription className="text-base text-muted-foreground">
                    {paymentResult?.details || "We couldn't process your payment"}
                  </DialogDescription>
                </div>

                {/* Help Section */}
                <div className="w-full pt-4 border-t space-y-3">
                  <p className="text-sm font-semibold text-foreground">What to do next?</p>
                  <div className="space-y-2 text-left">
                    <div className="flex items-start gap-3 text-sm text-muted-foreground">
                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-foreground text-xs font-bold">1</span>
                      </div>
                      <p>If payment was deducted, contact our support team with your payment ID</p>
                    </div>
                    <div className="flex items-start gap-3 text-sm text-muted-foreground">
                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-foreground text-xs font-bold">2</span>
                      </div>
                      <p>Check your payment method and ensure you have sufficient funds</p>
                    </div>
                    <div className="flex items-start gap-3 text-sm text-muted-foreground">
                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-foreground text-xs font-bold">3</span>
                      </div>
                      <p>Try again with a different payment method if the issue persists</p>
                    </div>
                  </div>
                </div>

                {/* Action Button */}
                <Button
                  onClick={() => {
                    setPaymentResult(null);
                    // Navigate to subscriptions page on button click
                    navigate("/dashboard/subscriptions");
                  }}
                  variant="outline"
                  className="w-full mt-4"
                  size="lg"
                >
                  Close
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

