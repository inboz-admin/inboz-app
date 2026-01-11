import { type ReactNode } from "react";
import AuthGuard from "./AuthGuard";

interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * Protected Route Component
 * Wraps components that require authentication
 */
export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  return <AuthGuard>{children}</AuthGuard>;
}
