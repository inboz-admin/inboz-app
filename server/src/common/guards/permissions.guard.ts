import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  PERMISSIONS_KEY,
  PermissionMetadata,
} from '../decorators/permissions.decorator';
import { RBACUtils, PermissionStructure } from '../interfaces/rbac.interface';
import { JwtPayload } from 'src/configuration/jwt/interfaces/jwt-payload.interface';
import { RoleService } from 'src/resources/rbac/services/role.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  private rbacUtils = new RBACUtils();

  constructor(
    private reflector: Reflector,
    private roleService: RoleService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get permission requirements from the decorator
    const permissionMeta = this.reflector.getAllAndOverride<PermissionMetadata>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no permissions are required, allow access
    if (!permissionMeta) {
      return true;
    }

    // Get user from request (set by JWT guard)
    const request = context.switchToHttp().getRequest();
    const user: JwtPayload = request.user;

    // If no user in request, deny access
    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    try {
      // Get user's role and permissions
      const role = await this.roleService.findByName(user.role);
      const permissions = role.permissions as PermissionStructure;

      // Check permissions based on metadata type
      const hasAccess = await this.checkPermissions(
        permissions,
        permissionMeta,
      );

      if (!hasAccess) {
        throw new ForbiddenException(
          `Access denied. Insufficient permissions for the requested operation.`,
        );
      }

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new ForbiddenException('Permission check failed');
    }
  }

  private async checkPermissions(
    userPermissions: PermissionStructure,
    permissionMeta: PermissionMetadata,
  ): Promise<boolean> {
    // Single permission requirement
    if ('resource' in permissionMeta && 'action' in permissionMeta) {
      return this.rbacUtils.hasPermission(
        userPermissions,
        permissionMeta.resource,
        permissionMeta.action,
      );
    }

    // Any of the permissions (OR logic)
    if ('anyOf' in permissionMeta) {
      return permissionMeta.anyOf.some((permission) =>
        this.rbacUtils.hasPermission(
          userPermissions,
          permission.resource,
          permission.action,
        ),
      );
    }

    // All of the permissions (AND logic)
    if ('allOf' in permissionMeta) {
      return permissionMeta.allOf.every((permission) =>
        this.rbacUtils.hasPermission(
          userPermissions,
          permission.resource,
          permission.action,
        ),
      );
    }

    return false;
  }
}
