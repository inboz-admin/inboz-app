"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Loader2, CreditCard, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import type { InitiatePaymentResponse } from "@/api/paymentService";
import { paymentService } from "@/api/paymentService";
import { useAppStore } from "@/stores/appStore";
import { organizationService } from "@/api/organizationService";
import { PaymentProviderSelector } from "./PaymentProviderSelector";
import type { PaymentProvider } from "./PaymentProviderSelector";
import { StripeCheckout } from "./StripeCheckout";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface PaymentCheckoutProps {
  order?: InitiatePaymentResponse["order"];
  checkoutSession?: InitiatePaymentResponse["checkoutSession"];
  subscription?: InitiatePaymentResponse["subscription"];
  pricingBreakdown: InitiatePaymentResponse["pricingBreakdown"];
  pendingChanges: InitiatePaymentResponse["pendingChanges"];
  organizationId: string;
  paymentProvider?: PaymentProvider;
  onPaymentSuccess?: () => void;
  onPaymentFailure?: () => void;
  onRazorpayOpen?: () => void; // Callback to close parent dialog when Razorpay opens
  razorpayKeyId?: string;
}

export function PaymentCheckout({
  order,
  checkoutSession,
  subscription,
  pricingBreakdown,
  pendingChanges,
  organizationId,
  paymentProvider: initialPaymentProvider,
  onPaymentSuccess,
  onPaymentFailure,
  onRazorpayOpen,
  razorpayKeyId,
}: PaymentCheckoutProps) {
  const [loading, setLoading] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [paymentProvider, setPaymentProvider] = useState<PaymentProvider>(
    initialPaymentProvider || (order ? "RAZORPAY" : "STRIPE")
  );
  const { user } = useAppStore();
  const [organization, setOrganization] = useState<any>(null);
  const [paymentResult, setPaymentResult] = useState<{
    type: 'success' | 'failure' | null;
    message: string;
    details?: string;
    subscriptionId?: string;
    invoiceId?: string;
  } | null>(null);

  // Fetch organization details for billing information
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
      // Cleanup script on unmount
      const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
      if (existingScript) {
        document.body.removeChild(existingScript);
      }
    };
  }, [razorpayLoaded]);

  const handlePayment = async () => {
    if (!window.Razorpay) {
      toast.error("Razorpay checkout script failed to load. Please refresh the page.");
      return;
    }

    if (!razorpayKeyId) {
      console.error("VITE_RAZOR_PAY_KEY is not set in environment variables");
      toast.error("Razorpay is not configured. Please set VITE_RAZOR_PAY_KEY in your .env file.");
      return;
    }

    setLoading(true);

    try {
      // Prepare user details for prefill
      // Use organization billing email if available, otherwise user email
      const billingEmail = organization?.billingEmail || organization?.email || user?.email || '';
      
      // Use organization phone if available
      const billingPhone = organization?.phone || '';
      
      // Use user's full name if available
      const userName = user?.firstName && user?.lastName 
        ? `${user.firstName} ${user.lastName}`.trim()
        : user?.email?.split('@')[0] || '';

      const options = {
        key: razorpayKeyId,
        amount: order.amount * 100, // Convert to paise
        currency: order.currency,
        name: "Inboz", // Organization name taking payment
        description: order.planDescription || `${order.billingCycle} subscription for ${order.planName}`,
        order_id: order.id,
        receipt: order.receipt,
        prefill: {
          name: userName,
          email: billingEmail,
          contact: billingPhone,
        },
        handler: async function (response: any) {
          try {
            // Verify payment with new signature
            const verifyResponse = await paymentService.verifyPayment({
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
              organizationId,
              paymentProvider: "RAZORPAY",
              pendingChanges,
              pricingBreakdown,
            });

            if (verifyResponse.success) {
              setPaymentResult({
                type: 'success',
                message: 'Payment Successful!',
                details: `Your ${order.planName} subscription has been activated successfully.`,
                subscriptionId: verifyResponse.data?.subscriptionId,
                invoiceId: verifyResponse.data?.invoiceId,
              });
            } else {
              setPaymentResult({
                type: 'failure',
                message: 'Payment Verification Failed',
                  details: 'Your payment was processed but verification failed. Please contact support if the amount was deducted.',
                });
            }
          } catch (error: any) {
            console.error("Payment verification error:", error);
            const errorMessage = error?.response?.data?.message || error?.message || "Payment verification failed";
            setPaymentResult({
              type: 'failure',
              message: 'Payment Verification Failed',
                details: errorMessage,
              });
          } finally {
            setLoading(false);
          }
        },
        theme: {
          color: "#6366f1",
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
            setPaymentResult({
              type: 'failure',
              message: 'Payment Cancelled',
                details: 'You cancelled the payment. No charges were made.',
              });
          },
        },
      };

      // Force close parent dialog immediately by manipulating DOM directly
      // This ensures the dialog closes before Razorpay opens
      const closeDialog = () => {
        // Find and close all open dialogs by setting their data-state to closed
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
        
        // Also call the callback to update React state
        onRazorpayOpen?.();
      };
      
      // Close dialog immediately
      closeDialog();
      
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
          .razorpay-checkout-frame {
            z-index: 999999 !important;
          }
        `;
        document.head.appendChild(style);
      }
      
      // Create Razorpay instance with higher z-index
      const razorpay = new window.Razorpay({
        ...options,
        // Increase z-index to ensure Razorpay modal appears above all dialogs
        zIndex: 999999,
      });
      
      // Handle payment failures (e.g., international cards not supported)
      razorpay.on('payment.failed', function (response: any) {
        setLoading(false);
        console.error("Razorpay payment failed:", response);
        
        // Extract error message from Razorpay response
        let errorMessage = "Payment could not be completed";
        if (response?.error) {
          // Razorpay error structure: error.description, error.reason, error.code
          if (response.error.description) {
            errorMessage = response.error.description;
          } else if (response.error.reason) {
            errorMessage = response.error.reason;
          } else if (response.error.message) {
            errorMessage = response.error.message;
          }
        }
        
        // Show specific message for international cards
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
      
      // Use double requestAnimationFrame to ensure DOM updates complete
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // Small delay to ensure dialog is fully closed
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
        setLoading(false);
    }
  };

  const handleCloseResultModal = () => {
    setPaymentResult(null);
  };

  const amount = order?.amount || pricingBreakdown?.totalAmount || 0;
  const planName = order?.planName || "Subscription";
  const billingCycle = order?.billingCycle || pendingChanges.billingCycle;

  return (
    <>
      <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Complete Payment
        </CardTitle>
        <CardDescription>
          Pay ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} to activate your {billingCycle.toLowerCase()} subscription
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Payment Provider Selection */}
          {(!order && !checkoutSession && !subscription) && (
            <PaymentProviderSelector
              selectedProvider={paymentProvider}
              onProviderChange={setPaymentProvider}
            />
          )}
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Plan:</span>
              <span className="text-sm font-medium">{planName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Billing Cycle:</span>
              <span className="text-sm font-medium">{billingCycle}</span>
            </div>
            {pendingChanges?.userCount && (
              <>
                {pendingChanges.operationType === 'ADD_USERS' || pendingChanges.operationType === 'COMBINED' ? (
                  // Show breakdown for adding users
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total Users:</span>
                      <span className="text-sm font-medium">{pendingChanges.userCount} user{pendingChanges.userCount !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex justify-between pl-4 border-l-2 border-muted">
                      <span className="text-xs text-muted-foreground">Existing:</span>
                      <span className="text-xs font-medium">{pendingChanges.existingUserCount || 0} user{(pendingChanges.existingUserCount || 0) !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex justify-between pl-4 border-l-2 border-muted">
                      <span className="text-xs text-muted-foreground">New:</span>
                      <span className="text-xs font-medium text-green-600 dark:text-green-400">
                        +{pendingChanges.newUserCount || 0} user{(pendingChanges.newUserCount || 0) !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                ) : (
                  // Show simple count for new subscriptions or upgrades
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Users:</span>
                    <span className="text-sm font-medium">{pendingChanges.userCount} user{pendingChanges.userCount !== 1 ? 's' : ''}</span>
                  </div>
                )}
              </>
            )}
            {pricingBreakdown?.prorationDetails && (
              <>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Prorated Period:</span>
                  <span className="text-sm font-medium">
                    {pricingBreakdown.prorationDetails.daysRemaining} / {pricingBreakdown.prorationDetails.totalDays} days
                  </span>
                </div>
                {(pendingChanges?.operationType === 'UPGRADE' || pendingChanges?.operationType === 'COMBINED') && 
                 pricingBreakdown.prorationDetails.creditAmount && 
                 pricingBreakdown.prorationDetails.creditAmount > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-muted">
                    <div className="text-xs font-medium text-muted-foreground mb-1">Plan Upgrade Breakdown:</div>
                    <div className="flex justify-between text-xs pl-2">
                      <span className="text-muted-foreground">
                        Credit ({pricingBreakdown.prorationDetails.oldPlanName || 'Old Plan'}):
                      </span>
                      <span className="font-medium text-green-600 dark:text-green-400">
                        -${pricingBreakdown.prorationDetails.creditAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs pl-2">
                      <span className="text-muted-foreground">
                        Charge ({pricingBreakdown.prorationDetails.newPlanName || planName}):
                      </span>
                      <span className="font-medium">
                        ${pricingBreakdown.prorationDetails.chargeAmount?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs pl-2 pt-1 border-t border-muted/50">
                      <span className="text-muted-foreground">Net Amount:</span>
                      <span className="font-medium">
                        ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}
            {pricingBreakdown?.totalAmount && pricingBreakdown.totalAmount !== amount && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Full Subscription:</span>
                <span className="text-sm font-medium">${pricingBreakdown.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-2">
              <span className="text-sm font-medium">Amount to Pay:</span>
              <span className="text-sm font-bold">${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
          
          {/* Stripe Checkout */}
          {paymentProvider === "STRIPE" && (checkoutSession || subscription) && (
            <StripeCheckout
              checkoutSessionUrl={checkoutSession?.url}
              clientSecret={subscription?.clientSecret || undefined}
              onSuccess={() => {
                setPaymentResult({
                  type: 'success',
                  message: 'Payment Successful!',
                  details: `Your ${planName} subscription has been activated successfully.`,
                });
                onPaymentSuccess?.();
              }}
              onError={(error) => {
                setPaymentResult({
                  type: 'failure',
                  message: 'Payment Failed',
                  details: error,
                });
                onPaymentFailure?.();
              }}
            />
          )}

          {/* Razorpay Checkout */}
          {paymentProvider === "RAZORPAY" && order && (
            <>
              {!razorpayKeyId && (
                <div className="rounded-md bg-yellow-50 dark:bg-yellow-900/20 p-3 text-sm text-yellow-800 dark:text-yellow-200">
                  <p className="font-medium">Razorpay not configured</p>
                  <p className="mt-1">Please set VITE_RAZOR_PAY_KEY in your .env file</p>
                </div>
              )}
              <Button
                onClick={handlePayment}
                disabled={loading || !razorpayLoaded || !razorpayKeyId}
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : !razorpayKeyId ? (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Razorpay Not Configured
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Pay ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>

    {/* Payment Result Modal */}
    <Dialog open={!!paymentResult} onOpenChange={(open) => !open && handleCloseResultModal()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            {paymentResult?.type === 'success' ? (
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-500" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-600 dark:text-red-500" />
              </div>
            )}
            <DialogTitle className="text-xl">
              {paymentResult?.message}
            </DialogTitle>
          </div>
          <DialogDescription className="text-base pt-2">
            {paymentResult?.details}
          </DialogDescription>
        </DialogHeader>
        
        {paymentResult?.type === 'success' && (
          <div className="space-y-3 py-4">
            <div className="p-4 bg-green-50 dark:bg-green-900/10 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Plan:</span>
                <span className="font-medium">{planName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount Paid:</span>
                <span className="font-medium">${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Billing Cycle:</span>
                <span className="font-medium">{billingCycle}</span>
              </div>
              {paymentResult.subscriptionId && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subscription ID:</span>
                  <span className="font-mono text-xs">{paymentResult.subscriptionId.substring(0, 8)}...</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>Your subscription is now active and ready to use!</span>
            </div>
          </div>
        )}

        {paymentResult?.type === 'failure' && (
          <div className="space-y-3 py-4">
            <div className="p-4 bg-red-50 dark:bg-red-900/10 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-500 mt-0.5 flex-shrink-0" />
                <div className="space-y-1 text-sm">
                  <p className="font-medium text-red-900 dark:text-red-200">
                    What to do next?
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-red-800 dark:text-red-300">
                    <li>If payment was deducted, contact support with your payment ID</li>
                    <li>Check your payment method and try again</li>
                    <li>Ensure you have sufficient funds</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            onClick={handleCloseResultModal}
            className="w-full"
            variant={paymentResult?.type === 'success' ? 'default' : 'outline'}
          >
            {paymentResult?.type === 'success' ? 'Continue to Dashboard' : 'Close'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}



