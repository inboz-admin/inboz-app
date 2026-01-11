export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
  SUPPORT = 'SUPPORT',
  SUPERADMIN = 'SUPERADMIN',
}

/**
 * Role hierarchy mapping - higher roles can access lower role routes
 */
const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.USER]: 1,
  [UserRole.ADMIN]: 2,
  [UserRole.SUPPORT]: 2.5,
  [UserRole.SUPERADMIN]: 3,
};

/**
 * Check if a user role has access to a required role or higher
 * @param userRole - The user's current role
 * @param requiredRole - The minimum required role
 * @returns true if user has access, false otherwise
 */
export function hasRoleOrHigher(
  userRole: UserRole,
  requiredRole: UserRole,
): boolean {
  const userLevel = ROLE_HIERARCHY[userRole];
  const requiredLevel = ROLE_HIERARCHY[requiredRole];

  return userLevel >= requiredLevel;
}

/**
 * Get all roles that are at or below the given role level
 * @param role - The role to get accessible roles for
 * @returns Array of roles accessible by the given role
 */
export function getAccessibleRoles(role: UserRole): UserRole[] {
  const userLevel = ROLE_HIERARCHY[role];
  return Object.entries(ROLE_HIERARCHY)
    .filter(([, level]) => level <= userLevel)
    .map(([roleName]) => roleName as UserRole);
}

/**
 * Check if a role exists in the enum
 * @param role - The role string to validate
 * @returns true if role exists, false otherwise
 */
export function isValidRole(role: string): role is UserRole {
  return Object.values(UserRole).includes(role as UserRole);
}
