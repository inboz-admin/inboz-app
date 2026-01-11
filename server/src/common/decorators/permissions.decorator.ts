import { SetMetadata } from '@nestjs/common';
import { ActionName } from '../enums/actions.enum';
import { ResourceName } from '../enums/resources.enum';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Interface for permission metadata
 */
export interface PermissionRequirement {
  resource: ResourceName;
  action: ActionName;
}

/**
 * Decorator to protect routes with resource and action-based access control
 * @param resource - The resource being accessed
 * @param action - The action being performed
 * @example
 * @RequirePermission(ResourceName.USERS, ActionName.CREATE)
 * @Post()
 * createUser() {}
 *
 * @RequirePermission(ResourceName.USERS, ActionName.READ)
 * @Get(':id')
 * getUser() {}
 */
export const RequirePermission = (resource: ResourceName, action: ActionName) =>
  SetMetadata(PERMISSIONS_KEY, { resource, action } as PermissionRequirement);

/**
 * Decorator for routes that require multiple permissions (ANY of them)
 * @param permissions - Array of permission requirements
 * @example
 * @RequireAnyPermission([
 *   { resource: ResourceName.USERS, action: ActionName.READ },
 *   { resource: ResourceName.PROFILES, action: ActionName.READ }
 * ])
 * @Get('profile')
 * getProfile() {}
 */
export const RequireAnyPermission = (permissions: PermissionRequirement[]) =>
  SetMetadata(PERMISSIONS_KEY, { anyOf: permissions });

/**
 * Decorator for routes that require multiple permissions (ALL of them)
 * @param permissions - Array of permission requirements
 * @example
 * @RequireAllPermissions([
 *   { resource: ResourceName.USERS, action: ActionName.UPDATE },
 *   { resource: ResourceName.PROFILES, action: ActionName.UPDATE }
 * ])
 * @Put('profile')
 * updateProfile() {}
 */
export const RequireAllPermissions = (permissions: PermissionRequirement[]) =>
  SetMetadata(PERMISSIONS_KEY, { allOf: permissions });

/**
 * Type for permission metadata that can be set by decorators
 */
export type PermissionMetadata =
  | PermissionRequirement
  | { anyOf: PermissionRequirement[] }
  | { allOf: PermissionRequirement[] };
