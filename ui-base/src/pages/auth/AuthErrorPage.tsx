import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle, ArrowLeft, RefreshCw } from "lucide-react";
import { DotPattern } from "@/components/magicui/dot-pattern";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";

export default function AuthErrorPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const error = searchParams.get("error");
  const errorMessage =
    searchParams.get("message") || "An authentication error occurred";

  const getErrorMessage = (errorType: string | null) => {
    switch (errorType) {
      case "access_denied":
        return "You cancelled the Google sign-in. Please try again to continue.";
      case "consent_required":
        return "Google consent is required to sign in.";
      case "oauth_failed":
        return "Google authentication failed. Please try again.";
      case "no_code":
        return "No authorization code received from Google.";
      case "callback_failed":
        return "Failed to process Google authentication callback.";
      case "invalid_token":
        return "Invalid authentication token received.";
      case "user_creation_failed":
        return "Failed to create user account.";
      case "organization_failed":
        return "Failed to set up organization.";
      default:
        return errorMessage;
    }
  };

  const handleRetry = () => {
    navigate("/get-started");
  };

  const handleGoHome = () => {
    navigate("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-background">
      {/* Theme Toggle - Top Right */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      {/* Dot Pattern Background with Glow Effect */}
      <div className="absolute inset-0 z-0">
        <DotPattern
          glow={true}
          width={20}
          height={20}
          cx={1}
          cy={1}
          cr={1}
          className={cn(
            "[mask-image:radial-gradient(100vw_circle_at_center,white,transparent)]"
          )}
        />
      </div>

      {/* Content */}
      <div className="w-full max-w-md relative z-10">
        <Card className="w-full bg-card border-border">
          <CardHeader className="text-center px-4 sm:px-6">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="text-lg sm:text-xl">
              Authentication Error
            </CardTitle>
            <CardDescription className="text-sm sm:text-base">
              {getErrorMessage(error)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 px-4 sm:px-6">
            <div className="text-center text-sm text-muted-foreground">
              {error && (
                <p className="mb-2">
                  <strong>Error Code:</strong> {error}
                </p>
              )}
              <p>
                If this problem persists, please contact support or try again
                later.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Button onClick={handleRetry} className="w-full">
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
              <Button
                variant="outline"
                onClick={handleGoHome}
                className="w-full"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
