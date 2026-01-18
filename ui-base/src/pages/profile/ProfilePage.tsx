"use client";

import { useState, useEffect } from "react";
import { User as UserIcon, Mail, Phone, Shield, Trash2, AlertCircle } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/stores/appStore";
import { gmailScopeService } from "@/api/gmailScopeService";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

export default function ProfilePage() {
  const { user, setUser } = useAppStore();
  const navigate = useNavigate();
  const [scopes, setScopes] = useState<{
    scopes: string[];
    hasEmail: boolean;
    hasProfile: boolean;
    hasGmailReadonly: boolean;
    hasGmailSend: boolean;
    hasAllGmailScopes: boolean;
    tokenStatus?: 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'INVALID';
    tokenEmail?: string;
    needsReAuth?: boolean;
  } | null>(null);
  const [loadingScopes, setLoadingScopes] = useState(true);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [revoking, setRevoking] = useState(false);

  useEffect(() => {
    const loadScopes = async () => {
      if (!user) {
        setLoadingScopes(false);
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
        console.error('Failed to load scopes:', error);
      } finally {
        setLoadingScopes(false);
      }
    };

    loadScopes();
  }, [user]);

  const handleRevoke = async () => {
    setRevoking(true);
    try {
      const response = await gmailScopeService.revokeTokens();
      if (response.success) {
        toast.success('All OAuth tokens have been revoked. Please sign in again.');
        // Clear user data and redirect to login
        setUser(null);
        sessionStorage.clear();
        setTimeout(() => {
          navigate('/get-started');
        }, 2000);
      } else {
        toast.error(response.message || 'Failed to revoke tokens');
      }
    } catch (error) {
      console.error('Failed to revoke tokens:', error);
      toast.error('Failed to revoke tokens. Please try again.');
    } finally {
      setRevoking(false);
      setRevokeDialogOpen(false);
    }
  };

  if (!user) {
    return (
      <div className="w-full p-4">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <UserIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-muted-foreground">
              No user data available
            </h2>
            <p className="text-sm text-muted-foreground">
              Please log in to view your profile
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Get full name from firstName and lastName, or fallback to empty string
  const fullName = user.firstName && user.lastName 
    ? `${user.firstName} ${user.lastName}` 
    : user.firstName || user.lastName || "";

  return (
    <div className="w-full px-2 py-2 space-y-12">
      <Card className="shadow-none border m-2">
        <CardHeader>
          <CardTitle>Basic Info</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <UserIcon className="h-4 w-4" />
                Name
              </label>
              <Input
                value={fullName}
                readOnly
                className="cursor-not-allowed"
              />
            </div>

            {/* Role - Read Only */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Role
              </label>
              <Input
                value={user.role || ""}
                readOnly
                className="cursor-not-allowed"
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone
              </label>
              <Input
                type="tel"
                value=""
                readOnly
                className="cursor-not-allowed"
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </label>
              <Input
                value={user.email || ""}
                readOnly
                className="cursor-not-allowed"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* OAuth Permissions Card */}
      <Card className="shadow-none border m-2">
        <CardHeader>
          <CardTitle>Google Account Permissions</CardTitle>
          <CardDescription>
            Manage your Google OAuth permissions and access scopes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingScopes ? (
            <p className="text-sm text-muted-foreground">Loading permissions...</p>
          ) : scopes ? (
            <>
              {/* Token Status Alert - Only show when refresh token failed (INVALID/REVOKED) */}
              {scopes.needsReAuth && (scopes.tokenStatus === 'INVALID' || scopes.tokenStatus === 'REVOKED') && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div>
                        <p className="text-sm font-medium text-destructive">
                          Gmail Connection Needs Re-authentication
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {scopes.tokenStatus === 'INVALID' && 
                            'Your Gmail refresh token has expired or been revoked. The system cannot automatically refresh your access token. Please re-authenticate to continue using Gmail features.'}
                          {scopes.tokenStatus === 'REVOKED' && 
                            'Your Gmail access has been revoked. Please re-authenticate to continue using Gmail features.'}
                          {!scopes.tokenStatus && 
                            'Your Gmail connection is not active. Please authenticate to use Gmail features.'}
                        </p>
                        {scopes.tokenEmail && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Connected account: {scopes.tokenEmail}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => gmailScopeService.requestGmailScopes()}
                        className="mt-2"
                      >
                        Re-authenticate Gmail
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-sm font-medium">Granted Permissions:</p>
                    {scopes.tokenStatus === 'ACTIVE' && (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800">
                        Active
                      </Badge>
                    )}
                    {scopes.tokenStatus && scopes.tokenStatus !== 'ACTIVE' && (
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800">
                        {scopes.tokenStatus}
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {scopes.hasEmail && (
                      <Badge variant="outline">Email</Badge>
                    )}
                    {scopes.hasProfile && (
                      <Badge variant="outline">Profile</Badge>
                    )}
                    {scopes.hasGmailReadonly && (
                      <Badge variant="outline">Gmail Read</Badge>
                    )}
                    {scopes.hasGmailSend && (
                      <Badge variant="outline">Gmail Send</Badge>
                    )}
                    {!scopes.hasEmail && !scopes.hasProfile && !scopes.hasGmailReadonly && !scopes.hasGmailSend && (
                      <span className="text-sm text-muted-foreground">No permissions granted</span>
                    )}
                  </div>
                  {scopes.tokenEmail && scopes.tokenStatus === 'ACTIVE' && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Connected Gmail account: {scopes.tokenEmail}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-2 sm:items-end">
                  <Button
                    variant="destructive"
                    onClick={() => setRevokeDialogOpen(true)}
                    className="w-full sm:w-auto"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Revoke All Permissions
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Revoking permissions will log you out and require you to sign in again.
                  </p>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Unable to load permissions</p>
          )}
        </CardContent>
      </Card>

      {/* Revoke Confirmation Dialog */}
      <AlertDialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Revoke All Permissions?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will revoke all Google OAuth permissions and log you out. You will need to sign in again to continue using the application.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revoking}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevoke}
              disabled={revoking}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {revoking ? 'Revoking...' : 'Revoke All'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
