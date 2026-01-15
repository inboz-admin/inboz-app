import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAppStore } from "@/stores";
import { apiService } from "@/api/apiService";
import { AuthHelpers } from "@/api/authService";
import { getDefaultRoute } from "@/components/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { DotPattern } from "@/components/magicui/dot-pattern";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";

export default function OAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setUser } = useAppStore();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [message, setMessage] = useState("Processing authentication...");

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const token = searchParams.get("token");
        const refreshToken = searchParams.get("refresh");
        const error = searchParams.get("error");
        const gmailAuthorized = searchParams.get("gmail_authorized");

        // If this is a Gmail authorization callback, redirect to campaigns
        if (gmailAuthorized === "true") {
          setStatus("success");
          setMessage("Gmail access granted! Redirecting to campaigns...");
          setTimeout(() => navigate("/dashboard/campaigns?gmail_authorized=true"), 1500);
          return;
        }

        if (error) {
          setStatus("error");
          setMessage("Authentication failed. Please try again.");
          setTimeout(() => navigate("/get-started"), 3000);
          return;
        }

        if (!token || !refreshToken) {
          setStatus("error");
          setMessage("Invalid authentication response. Please try again.");
          setTimeout(() => navigate("/get-started"), 3000);
          return;
        }

        // Store tokens in the application (same pattern as login form)
        apiService.setAuthToken(token);
        sessionStorage.setItem("refresh_token", refreshToken);

        // Decode JWT token to get user info
        try {
          const payload = JSON.parse(atob(token.split(".")[1]));
          const userData = {
            id: payload.sub,
            email: payload.email,
            role: payload.role,
            firstName: payload.firstName,
            lastName: payload.lastName,
            avatarUrl: payload.avatarUrl,
            organizationId: payload.organizationId,
            organization: payload.organization,
            accessToken: token,
            refreshToken: refreshToken,
          };

          // Set user in the store (same pattern as login form)
          setUser(userData);

          // Show success message (same pattern as login form)
          toast.success("Google authentication successful! Welcome back.");

          setStatus("success");
          setMessage("Authentication successful! Redirecting to dashboard...");

          // Get role-based default route
          const defaultRoute = getDefaultRoute(userData.role);

          // Wait a bit longer to ensure authentication state is properly set
          setTimeout(() => {
            navigate(defaultRoute);
          }, 2000);
        } catch (decodeError) {
          console.error("Failed to decode JWT token:", decodeError);
          setStatus("error");
          setMessage(
            "Failed to process authentication data. Please try again."
          );
          setTimeout(() => navigate("/get-started"), 3000);
        }
      } catch (error) {
        console.error("OAuth callback error:", error);
        setStatus("error");
        setMessage(
          "An error occurred during authentication. Please try again."
        );
        setTimeout(() => navigate("/get-started"), 3000);
      }
    };

    handleCallback();
  }, [searchParams, navigate, setUser]);

  const getStatusIcon = () => {
    switch (status) {
      case "loading":
        return <Loader2 className="h-8 w-8 animate-spin text-blue-500" />;
      case "success":
        return <CheckCircle className="h-8 w-8 text-green-500" />;
      case "error":
        return <XCircle className="h-8 w-8 text-red-500" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "loading":
        return "text-blue-600";
      case "success":
        return "text-green-600";
      case "error":
        return "text-red-600";
    }
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
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              {getStatusIcon()}
            </div>
            <CardTitle className="text-lg sm:text-xl">Authentication</CardTitle>
            <CardDescription
              className={`${getStatusColor()} text-sm sm:text-base`}
            >
              {message}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center px-4 sm:px-6">
            {status === "loading" && (
              <p className="text-sm text-muted-foreground">
                Please wait while we process your authentication...
              </p>
            )}
            {status === "success" && (
              <p className="text-sm text-muted-foreground">
                Welcome! You will be redirected to your dashboard shortly.
              </p>
            )}
            {status === "error" && (
              <p className="text-sm text-muted-foreground">
                You will be redirected to the login page to try again.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
