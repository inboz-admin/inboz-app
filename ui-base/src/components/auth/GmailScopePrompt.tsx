import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, Shield, AlertCircle } from "lucide-react";
import { gmailScopeService } from "@/api/gmailScopeService";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface GmailScopePromptProps {
  onAuthorize?: () => void;
}

export function GmailScopePrompt({ onAuthorize }: GmailScopePromptProps) {
  const handleAuthorize = () => {
    if (onAuthorize) {
      onAuthorize();
    }
    gmailScopeService.requestGmailScopes();
  };

  return (
    <Card className="w-full border-yellow-200 dark:border-yellow-900 bg-yellow-50/50 dark:bg-yellow-950/20">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
            <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">Gmail Authorization Required</CardTitle>
            <CardDescription className="mt-1">
              To use campaign features, you need to grant Gmail access permissions.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 w-full">
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Campaign features require the following Gmail permissions:
          </p>
          <ul className="space-y-2 text-sm w-full">
            <li className="flex items-start gap-2 w-full">
              <Mail className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <span className="flex-1">
                <strong>Read Gmail:</strong> To track email opens, clicks, and replies
              </span>
            </li>
            <li className="flex items-start gap-2 w-full">
              <Shield className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <span className="flex-1">
                <strong>Send Gmail:</strong> To send campaign emails on your behalf
              </span>
            </li>
          </ul>
        </div>
        <div className="pt-2">
          <Button onClick={handleAuthorize} className="w-full sm:w-auto">
            Grant Gmail Access
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          You'll be redirected to Google to authorize these permissions. Your data is secure and only used for campaign functionality.
        </p>
      </CardContent>
    </Card>
  );
}

interface GmailScopeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hasScopes: boolean;
  onAuthorize?: () => void;
}

export function GmailScopeModal({ open, onOpenChange, hasScopes, onAuthorize }: GmailScopeModalProps) {
  const handleAuthorize = () => {
    if (onAuthorize) {
      onAuthorize();
    }
    gmailScopeService.requestGmailScopes();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-lg">Gmail Authorization</DialogTitle>
              <DialogDescription className="mt-1">
                {hasScopes 
                  ? "You have granted Gmail access permissions. You can use all campaign features."
                  : "To use campaign features, you need to grant Gmail access permissions."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Campaign features require the following Gmail permissions:
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <Mail className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <span className="flex-1">
                  <strong>Read Gmail:</strong> To track email opens, clicks, and replies
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Shield className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <span className="flex-1">
                  <strong>Send Gmail:</strong> To send campaign emails on your behalf
                </span>
              </li>
            </ul>
          </div>
          {!hasScopes && (
            <>
              <div className="pt-2">
                <Button onClick={handleAuthorize} className="w-full">
                  Grant Gmail Access
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                You'll be redirected to Google to authorize these permissions. Your data is secure and only used for campaign functionality.
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
