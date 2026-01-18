"use client";

import { useEffect, useState } from "react";
import { AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { gmailScopeService, type UserScopes } from "@/api/gmailScopeService";
import { useAppStore } from "@/stores/appStore";
import { cn } from "@/lib/utils";

export function GmailTokenStatusBanner() {
  const { user } = useAppStore();
  const [scopes, setScopes] = useState<UserScopes | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const checkTokenStatus = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const response = await gmailScopeService.checkGmailScopes();
        if (response.success && response.data) {
          // Handle nested response structure from SuccessInterceptor
          const data = response.data as any;
          const scopeData = data?.success !== undefined && data?.data 
            ? data.data 
            : response.data;
          if (scopeData) {
            setScopes(scopeData);
          }
        }
      } catch (error) {
        console.error('Failed to check token status:', error);
      } finally {
        setLoading(false);
      }
    };

    checkTokenStatus();
    // Check every 5 minutes
    const interval = setInterval(checkTokenStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user]);

  // Only show if refresh token failed (INVALID or REVOKED)
  // Don't show for EXPIRED (access token can auto-refresh)
  // Don't show if loading, dismissed, or token is active
  if (loading || dismissed || !scopes || !scopes.needsReAuth) {
    return null;
  }

  // Only show alert when refresh token itself is invalid/revoked
  // EXPIRED status means access token expired but refresh token is still valid (can auto-refresh)
  if (scopes.tokenStatus !== 'INVALID' && scopes.tokenStatus !== 'REVOKED') {
    return null;
  }

  const getStatusMessage = () => {
    if (scopes.tokenStatus === 'INVALID') {
      return 'Your Gmail refresh token has expired or been revoked. The system cannot automatically refresh your access token. Please re-authenticate to continue using Gmail features.';
    }
    if (scopes.tokenStatus === 'REVOKED') {
      return 'Your Gmail access has been revoked. Please re-authenticate to continue using Gmail features.';
    }
    return 'Your Gmail connection needs to be re-authenticated. Please connect your Gmail account to continue.';
  };

  return (
    <div className={cn(
      "fixed top-0 left-0 right-0 z-50 border-b",
      "bg-destructive/10 border-destructive/50",
      "dark:bg-destructive/20 dark:border-destructive/50",
      "lg:left-64" // Account for sidebar width on desktop
    )}>
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-destructive">
              Gmail Connection Issue
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {getStatusMessage()}
            </p>
            {scopes.tokenEmail && (
              <p className="text-xs text-muted-foreground mt-1">
                Account: {scopes.tokenEmail}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="default"
              size="sm"
              onClick={() => gmailScopeService.requestGmailScopes()}
              className="whitespace-nowrap"
            >
              Re-authenticate
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDismissed(true)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
