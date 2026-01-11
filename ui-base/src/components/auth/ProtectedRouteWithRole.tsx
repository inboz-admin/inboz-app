import { type ReactNode } from "react";
import AuthGuard from "./AuthGuard";
import RoleGuard from "./RoleGuard";

interface ProtectedRouteWithRoleProps {
  children: ReactNode;
}

/**
 * Combined Authentication and Role-based Route Protection
 * First checks if user is authenticated, then checks role-based permissions
 */
export default function ProtectedRouteWithRole({
  children,
}: ProtectedRouteWithRoleProps) {
  return (
    <AuthGuard>
      <RoleGuard>{children}</RoleGuard>
    </AuthGuard>
  );
}
