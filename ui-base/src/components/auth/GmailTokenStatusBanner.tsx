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
  const [dismissed, setDismissed] = useState(() => {
    // Check localStorage for dismissed state
    if (typeof window !== 'undefined') {
      return localStorage.getItem('gmail-banner-dismissed') === 'true';
    }
    return false;
  });

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

  // Don't show if loading or dismissed
  if (loading || dismissed) {
    return null;
  }

  // Only show if refresh token failed (INVALID or REVOKED)
  if (!scopes || !scopes.needsReAuth || (scopes.tokenStatus !== 'INVALID' && scopes.tokenStatus !== 'REVOKED')) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('gmail-banner-dismissed', 'true');
    }
  };

  const handleReAuthenticate = () => {
    // Clear dismissed state when re-authenticating
    setDismissed(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('gmail-banner-dismissed');
    }
    gmailScopeService.requestGmailScopes();
  };

  return (
    <div className={cn(
      "w-full border-b",
      "bg-destructive/10 border-destructive/50",
      "dark:bg-destructive/20 dark:border-destructive/50",
      "px-4 py-2"
    )}>
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
        <p className="text-sm text-destructive flex-1">
          Gmail connection expired. Please re-authenticate.
        </p>
        <Button
          variant="default"
          size="sm"
          onClick={handleReAuthenticate}
          className="whitespace-nowrap h-7 text-xs px-3"
        >
          Re-authenticate
        </Button>
        <button
          onClick={handleDismiss}
          className="h-7 w-7 flex items-center justify-center hover:bg-destructive/20 rounded transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4 text-destructive" />
        </button>
      </div>
    </div>
  );
}
