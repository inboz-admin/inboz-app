import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
import { authService, AuthHelpers } from "@/api/authService";
import { useAppStore } from "@/stores";

export function GetStartedForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const navigate = useNavigate();
  const { setUser } = useAppStore();
  const [isLoading, setIsLoading] = useState(false);

  const handleBrandClick = () => {
    navigate("/");
  };

  const handleGoogleLogin = () => {
    setIsLoading(true);

    // Simply redirect to server OAuth endpoint
    // Server will handle the entire OAuth flow and redirect back with JWT tokens
    authService.initiateGoogleLogin();
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 w-full max-w-sm sm:max-w-md",
        className
      )}
      {...props}
    >
      {/* Inboz Brand */}
      <div className="flex flex-col items-center gap-2 mb-2 sm:mb-4">
        <h1
          className="text-2xl font-bold text-foreground cursor-pointer hover:text-primary transition-colors duration-200 bg-transparent"
          onClick={handleBrandClick}
        >
          Inboz
        </h1>
      </div>

      <Card className="w-full bg-card border-border">
        <CardHeader className="text-center px-4 sm:px-6">
          <CardTitle className="text-lg sm:text-xl">
            Get Started with Inboz
          </CardTitle>
          <CardDescription className="text-sm sm:text-base">
            Join thousands of businesses growing with our email marketing
            platform
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <div className="grid gap-4 sm:gap-6">
            {/* Google Login Button */}
            <Button
              type="button"
              variant="outline"
              className="w-full cursor-pointer transition-all duration-200 border-border hover:bg-accent"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              aria-describedby="google-login-status"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2" />
                  Connecting...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
                </>
              )}
            </Button>

            <div
              id="google-login-status"
              className="sr-only"
              aria-live="polite"
            >
              {isLoading
                ? "Connecting to Google, please wait..."
                : "Ready to connect with Google"}
            </div>

            {/* Terms and Privacy Agreement */}
            <div className="text-center mt-4 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground">
                By logging in, you agree to our{" "}
                <a
                  href="/privacy-policy"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate("/privacy-policy");
                  }}
                  className="text-primary hover:underline font-medium transition-colors cursor-pointer"
                >
                  Privacy Policy
                </a>{" "}
                and{" "}
                <a
                  href="/terms-and-conditions"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate("/terms-and-conditions");
                  }}
                  className="text-primary hover:underline font-medium transition-colors cursor-pointer"
                >
                  Terms and Conditions
                </a>
                .
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
