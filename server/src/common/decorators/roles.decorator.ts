import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../enums/roles.enum';

export const ROLES_KEY = 'roles';

/**
 * Decorator to protect routes with role-based access control
 * @param roles - Array of roles that are allowed to access the route
 * @example
 * @Roles(UserRole.ADMIN)
 * @Get('admin-only')
 * adminOnlyRoute() {}
 *
 * @Roles(UserRole.ADMIN, UserRole.USER)
 * @Get('admin-or-user')
 * adminOrUserRoute() {}
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

