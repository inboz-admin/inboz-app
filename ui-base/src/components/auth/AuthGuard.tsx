import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks";

interface AuthGuardProps {
  children: React.ReactNode;
}

/**
 * Authentication Guard Component
 * Protects routes by checking if user is authenticated
 * Redirects to login page if not authenticated
 */
export default function AuthGuard({ children }: AuthGuardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    // If we're still loading, don't redirect yet
    if (isLoading) {
      return;
    }

    // If no user is authenticated, redirect to get-started (Google OAuth login)
    if (!user) {
      // Store the attempted location so we can redirect back after login
      const redirectTo =
        location.pathname !== "/get-started" ? location.pathname : "/dashboard";
      navigate("/get-started", {
        state: { from: redirectTo },
        replace: true,
      });
    }
  }, [user, isLoading, navigate, location.pathname]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If user is authenticated, render the protected content
  if (user) {
    return <>{children}</>;
  }

  // If no user and not loading, show nothing (redirect will happen)
  return null;
}
