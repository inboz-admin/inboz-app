import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAppStore } from "@/stores/appStore";
import { hasRouteAccess, getDefaultRoute } from "./rolePermissions";

interface RoleGuardProps {
  children: React.ReactNode;
}

/**
 * Role-based Route Guard Component
 * Protects routes based on user roles and permissions
 * Redirects users to appropriate default route if they don't have access
 */
export default function RoleGuard({ children }: RoleGuardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading } = useAppStore();

  useEffect(() => {
    // If we're still loading or no user, don't check roles yet
    if (isLoading || !user) {
      return;
    }

    const currentPath = location.pathname;
    const userRole = user.role?.toUpperCase() || "";
    const userType = user.type;

    // Check if user has access to the current route
    const hasAccess = hasRouteAccess(userRole, currentPath, userType);

    if (!hasAccess) {
      // Get the default route for the user's role
      const defaultRoute = getDefaultRoute(userRole);

      // Redirect to default route if no access to current route
      navigate(defaultRoute, { replace: true });
    }
  }, [user, isLoading, navigate, location.pathname]);

  // Show loading state while checking authentication and roles
  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Checking permissions...</p>
        </div>
      </div>
    );
  }

  // If user has access, render the protected content
  return <>{children}</>;
}
