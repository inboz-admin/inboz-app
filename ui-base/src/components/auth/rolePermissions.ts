// Role-based route permissions configuration

export type UserRole =
  | "SUPERADMIN"
  | "ADMIN"
  | "USER"
  | "SUPPORT"
  | "INSTRUCTOR"
  | "STUDENT";

export interface RoutePermission {
  path: string;
  roles: UserRole[];
  description?: string;
}

// Define route permissions for different user roles
export const ROUTE_PERMISSIONS: RoutePermission[] = [
  // Organizations management
  {
    path: "/dashboard/organizations",
    roles: ["SUPERADMIN", "ADMIN", "SUPPORT"],
    description: "Organizations management - Superadmin, Admin, and Support",
  },

  // Employees management
  {
    path: "/dashboard/employees",
    roles: ["SUPERADMIN", "ADMIN", "SUPPORT"],
    description: "Employees management - Superadmin, Admin, and Support",
  },

  // Platform employees management
  {
    path: "/dashboard/platform/employees",
    roles: ["SUPERADMIN"],
    description: "Platform employees management - Superadmin only",
  },

  // Users management
  {
    path: "/dashboard/users",
    roles: ["SUPERADMIN", "ADMIN", "SUPPORT"],
    description: "Users management - Superadmin, Admin, and Support",
  },

  // Audit logs
  {
    path: "/dashboard/audit-logs",
    roles: ["SUPERADMIN", "ADMIN", "SUPPORT"],
    description: "Audit logs - Superadmin, Admin, and Support",
  },

  // Analytics
  {
    path: "/dashboard/analytics",
    roles: ["SUPERADMIN", "ADMIN", "USER"],
    description: "Analytics dashboard - Superadmin, Admin, and User",
  },

  // Campaign Management
  {
    path: "/dashboard/contacts",
    roles: ["SUPERADMIN", "ADMIN", "USER", "SUPPORT"],
    description: "Contacts management - Superadmin, Admin, User, and Support",
  },
  {
    path: "/dashboard/contact-lists",
    roles: ["SUPERADMIN", "ADMIN", "USER", "SUPPORT"],
    description: "Contact lists management - Superadmin, Admin, User, and Support",
  },
  {
    path: "/dashboard/contact-lists/:id",
    roles: ["SUPERADMIN", "ADMIN", "USER", "SUPPORT"],
    description:
      "Contact list detail and management - Superadmin, Admin, User, and Support",
  },
  {
    path: "/dashboard/templates",
    roles: ["SUPERADMIN", "ADMIN", "USER", "SUPPORT"],
    description: "Email templates management - Superadmin, Admin, User, and Support",
  },
  {
    path: "/dashboard/assets",
    roles: ["SUPERADMIN", "ADMIN", "USER", "SUPPORT"],
    description: "Assets (images/files) - Superadmin, Admin, User, and Support",
  },
  {
    path: "/dashboard/campaigns",
    roles: ["SUPERADMIN", "ADMIN", "USER", "SUPPORT"],
    description: "Email campaigns management - Superadmin, Admin, User, and Support",
  },
  {
    path: "/dashboard/campaigns/new",
    roles: ["SUPERADMIN", "ADMIN", "USER", "SUPPORT"],
    description: "Create campaign - Superadmin, Admin, User, and Support",
  },
  {
    path: "/dashboard/campaigns/:id",
    roles: ["SUPERADMIN", "ADMIN", "USER", "SUPPORT"],
    description: "Edit campaign - Superadmin, Admin, User, and Support",
  },

  // Subscription Management
  {
    path: "/dashboard/subscriptions",
    roles: ["SUPERADMIN", "ADMIN", "SUPPORT"],
    description: "Subscriptions management - Superadmin, Admin, and Support",
  },
  {
    path: "/dashboard/subscriptions/:id",
    roles: ["SUPERADMIN", "ADMIN", "SUPPORT"],
    description: "Subscription detail and upgrade - Superadmin, Admin, and Support",
  },
  {
    path: "/dashboard/invoices",
    roles: ["SUPERADMIN", "ADMIN", "SUPPORT"],
    description: "Invoices management - Superadmin, Admin, and Support",
  },

  // Common routes - Available to all authenticated users
  {
    path: "/dashboard/profile",
    roles: ["SUPERADMIN", "ADMIN", "USER", "SUPPORT", "INSTRUCTOR", "STUDENT"],
    description: "User profile - All authenticated users",
  },
];

// Helper function to check if a user role has access to a specific route
export function hasRouteAccess(userRole: string, routePath: string, userType?: string): boolean {
  // Normalize user role to uppercase for comparison
  const normalizedRole = userRole.toUpperCase() as UserRole;
  
  // Employees (SUPERADMIN) have access to all routes
  // SUPPORT employees have access to all routes except analytics
  if (userType === "employee" && normalizedRole === "SUPERADMIN") {
    return true;
  }
  
  // SUPPORT employees have access to all routes except analytics
  if (userType === "employee" && normalizedRole === "SUPPORT") {
    // Deny access to analytics for SUPPORT
    if (routePath === "/dashboard/analytics") {
      return false;
    }
    return true;
  }
  
  // First try exact match
  let permission = ROUTE_PERMISSIONS.find((p) => p.path === routePath);

  // If no exact match, try to match dynamic routes (with parameters)
  if (!permission) {
    permission = ROUTE_PERMISSIONS.find((p) => {
      // Check if this is a dynamic route pattern
      if (p.path.includes(":id")) {
        // Replace :id with a placeholder to match the pattern
        // Escape special regex characters in the path first
        const escapedPath = p.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pattern = escapedPath.replace(/:id/g, "[^/]+");
        const regex = new RegExp(`^${pattern}$`);
        return regex.test(routePath);
      }
      return false;
    });
  }

  if (!permission) {
    // If no specific permission is defined, deny access by default
    return false;
  }
  return permission.roles.includes(normalizedRole);
}

// Helper function to get all accessible routes for a user role
export function getAccessibleRoutes(userRole: string): string[] {
  const normalizedRole = userRole.toUpperCase() as UserRole;
  return ROUTE_PERMISSIONS.filter((permission) =>
    permission.roles.includes(normalizedRole)
  ).map((permission) => permission.path);
}

// Helper function to get routes that should be shown in navigation for a role
export function getNavigationRoutes(userRole: string): RoutePermission[] {
  const normalizedRole = userRole.toUpperCase() as UserRole;
  return ROUTE_PERMISSIONS.filter((permission) =>
    permission.roles.includes(normalizedRole)
  );
}

// Default route for each role after login
export function getDefaultRoute(userRole: string): string {
  const normalizedRole = userRole.toUpperCase() as UserRole;
  
  // SUPPORT role should not land on analytics (they don't have access)
  if (normalizedRole === "SUPPORT") {
    return "/dashboard/organizations";
  }
  
  // All other users land on analytics page by default
  return "/dashboard/analytics";
}
