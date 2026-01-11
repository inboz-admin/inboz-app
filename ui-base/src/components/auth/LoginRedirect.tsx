import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAppStore } from "@/stores/appStore";
import { getDefaultRoute, hasRouteAccess } from "./rolePermissions";
import { subscriptionService } from "@/api/subscriptionService";
import { UpgradeModal } from "@/components/subscriptions/UpgradeModal";

/**
 * Login Redirect Component
 * Handles redirecting users after successful login
 * Uses role-based default routes and checks permissions
 * Shows upgrade modal for admin users without active subscription
 */
export default function LoginRedirect() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAppStore();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isCheckingSubscription, setIsCheckingSubscription] = useState(false);

  useEffect(() => {
    const handleLoginRedirect = async () => {
      if (!user) return;

      const userRole = user.role?.toUpperCase() || "";
      const isAdmin = userRole === "ADMIN"; // SUPERADMIN is only for employees, not regular users

      let shouldRedirectToSubscriptions = false;

      // Check subscription for admin users only
      if (isAdmin && user.organizationId) {
        setIsCheckingSubscription(true);
        try {
          // First check trial status
          const trialStatusResponse = await subscriptionService.getTrialStatus(
            user.organizationId
          );

          // If trial is expired, redirect to subscriptions page
          if (
            trialStatusResponse.success &&
            trialStatusResponse.data?.isTrial &&
            trialStatusResponse.data?.isExpired
          ) {
            shouldRedirectToSubscriptions = true;
          } else {
            // Check active subscription
            const response = await subscriptionService.getActiveSubscriptionByOrganization(
              user.organizationId
            );

            // If no active subscription (null or undefined), show upgrade modal
            // response.data will be Subscription | null
            if (!response.success || !response.data || response.data === null) {
              setShowUpgradeModal(true);
            } else {
              // Check if subscription status is INCOMPLETE or CANCELLED
              const subscription = response.data;
              if (
                subscription.status === "INCOMPLETE" ||
                subscription.status === "CANCELLED"
              ) {
                shouldRedirectToSubscriptions = true;
              } else if (subscription.status === "TRIAL" && subscription.trialEnd) {
                // Check if subscription is TRIAL and expired
                const trialEndDate = new Date(subscription.trialEnd);
                const now = new Date();
                if (trialEndDate < now) {
                  shouldRedirectToSubscriptions = true;
                }
              }
            }
          }
        } catch (error) {
          console.error("Failed to check subscription:", error);
          // On error, don't block navigation but log it
        } finally {
          setIsCheckingSubscription(false);
        }

        // Redirect to subscriptions if needed
        if (shouldRedirectToSubscriptions) {
          navigate("/dashboard/subscriptions", { replace: true });
          return;
        }
      }

      // Get the redirect location from navigation state
      const from = (location.state as { from?: string })?.from;
      const userRoleLower = userRole.toLowerCase();

      // Navigate after subscription check completes (or immediately for non-admin users)
      if (from && hasRouteAccess(userRoleLower, from)) {
        // If user has access to the intended route, go there
        navigate(from, { replace: true });
      } else {
        // Otherwise, redirect to role-based default route
        const defaultRoute = getDefaultRoute(userRoleLower);
        navigate(defaultRoute, { replace: true });
      }
    };

    handleLoginRedirect();
  }, [user, navigate, location.state]);

  if (isCheckingSubscription) {
    return null; // Can show a loading state here if needed
  }

  return (
    <>
      <UpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
      />
    </>
  );
}
