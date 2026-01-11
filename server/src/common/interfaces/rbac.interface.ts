import { ActionName } from '../enums/actions.enum';
import { ResourceName } from '../enums/resources.enum';

/**
 * Type-safe permission structure for roles
 */
export type PermissionStructure = {
  [K in ResourceName]?: ActionName[];
};

/**
 * Helper interface for role permission validation
 */
export interface RolePermission {
  roleName: string;
  resourceName: ResourceName;
  actionName: ActionName;
}

/**
 * Interface for dynamic permission checking
 */
export interface PermissionChecker {
  hasPermission(
    rolePermissions: PermissionStructure,
    resourceName: ResourceName,
    actionName: ActionName,
  ): boolean;

  getActionsForResource(
    rolePermissions: PermissionStructure,
    resourceName: ResourceName,
  ): ActionName[];

  getAllPermissions(rolePermissions: PermissionStructure): RolePermission[];
}

/**
 * Utility class for RBAC permission operations
 */
export class RBACUtils implements PermissionChecker {
  /**
   * Check if a role has permission to perform an action on a resource
   * @param rolePermissions - The role's permission structure
   * @param resourceName - The resource to check
   * @param actionName - The action to check
   * @returns true if permission exists, false otherwise
   */
  hasPermission(
    rolePermissions: PermissionStructure,
    resourceName: ResourceName,
    actionName: ActionName,
  ): boolean {
    // Check if role has ALL resource permission
    if (rolePermissions[ResourceName.ALL]?.includes(actionName)) {
      return true;
    }

    // Check specific resource permission
    return rolePermissions[resourceName]?.includes(actionName) || false;
  }

  /**
   * Get all actions allowed for a specific resource
   * @param rolePermissions - The role's permission structure
   * @param resourceName - The resource to get actions for
   * @returns Array of allowed actions
   */
  getActionsForResource(
    rolePermissions: PermissionStructure,
    resourceName: ResourceName,
  ): ActionName[] {
    // If role has ALL resource permission, return those actions
    if (rolePermissions[ResourceName.ALL]) {
      return rolePermissions[ResourceName.ALL];
    }

    // Return actions for the specific resource
    return rolePermissions[resourceName] || [];
  }

  /**
   * Get all permissions for a role in a structured format
   * @param rolePermissions - The role's permission structure
   * @returns Array of all permissions
   */
  getAllPermissions(rolePermissions: PermissionStructure): RolePermission[] {
    const permissions: RolePermission[] = [];

    Object.entries(rolePermissions).forEach(([resource, actions]) => {
      const resourceName = resource as ResourceName;
      actions?.forEach((action) => {
        permissions.push({
          roleName: '', // This would be filled by the caller
          resourceName,
          actionName: action,
        });
      });
    });

    return permissions;
  }

  /**
   * Validate permission structure
   * @param permissions - The permissions object to validate
   * @returns true if valid, false otherwise
   */
  static isValidPermissionStructure(
    permissions: any,
  ): permissions is PermissionStructure {
    if (!permissions || typeof permissions !== 'object') {
      return false;
    }

    for (const [resource, actions] of Object.entries(permissions)) {
      if (!Object.values(ResourceName).includes(resource as ResourceName)) {
        return false;
      }

      if (!Array.isArray(actions)) {
        return false;
      }

      for (const action of actions as string[]) {
        if (!Object.values(ActionName).includes(action as ActionName)) {
          return false;
        }
      }
    }

    return true;
  }
}
