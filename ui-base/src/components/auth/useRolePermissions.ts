import { useAppStore } from "@/stores/appStore";
import {
  hasRouteAccess,
  getAccessibleRoutes,
  getDefaultRoute,
} from "./rolePermissions";

/**
 * Custom hook for role-based permissions
 * Provides utilities for checking user permissions and accessible routes
 */
export function useRolePermissions() {
  const { user } = useAppStore();
  const userRole = user?.role?.toLowerCase() || "";

  return {
    // User info
    user,
    userRole,
    isAdmin: userRole === "admin",
    isInstructor: userRole === "instructor",
    isStudent: userRole === "student",

    // Permission checks
    hasRouteAccess: (routePath: string) => hasRouteAccess(userRole, routePath),

    // Get accessible routes and default route
    accessibleRoutes: getAccessibleRoutes(userRole),
    defaultRoute: getDefaultRoute(userRole),

    // Helper functions
    canAccessAnalytics: () =>
      hasRouteAccess(userRole, "/dashboard/organizations"),
    canAccessInstructorDashboard: () =>
      hasRouteAccess(userRole, "/dashboard/instructor"),
    canAccessStudentDashboard: () =>
      hasRouteAccess(userRole, "/dashboard/student"),
    canAccessOrganizations: () =>
      hasRouteAccess(userRole, "/dashboard/organizations"),
    canAccessCenters: () => hasRouteAccess(userRole, "/dashboard/centers"),
    canAccessEmployees: () => hasRouteAccess(userRole, "/dashboard/employees"),
    canAccessStudents: () => hasRouteAccess(userRole, "/dashboard/students"),
    canAccessCourses: () => hasRouteAccess(userRole, "/dashboard/courses"),
    canAccessCourseDetails: (courseId: string) =>
      hasRouteAccess(userRole, `/dashboard/courses/${courseId}`),
    canAccessCohorts: () => hasRouteAccess(userRole, "/dashboard/cohorts"),
    canAccessCohortDetails: (cohortId: string) =>
      hasRouteAccess(userRole, `/dashboard/cohorts/${cohortId}`),
    canAccessClasses: () => hasRouteAccess(userRole, "/dashboard/classes"),
    canAccessEnrollments: () =>
      hasRouteAccess(userRole, "/dashboard/enrollments"),
    canAccessEnquiries: () => hasRouteAccess(userRole, "/dashboard/enquiries"),
    canAccessPayments: () => hasRouteAccess(userRole, "/dashboard/payments"),
    canAccessFeedbacks: () => hasRouteAccess(userRole, "/dashboard/feedbacks"),
    canAccessExpenses: () => hasRouteAccess(userRole, "/dashboard/expenses"),
    canAccessAuditLogs: () => hasRouteAccess(userRole, "/dashboard/audit-logs"),
  };
}
