import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole, hasRoleOrHigher } from 'src/common/enums/roles.enum';
import { JwtPayload } from 'src/configuration/jwt/interfaces/jwt-payload.interface';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get required roles from the decorator
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no roles are required, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Get user from request (set by JWT guard)
    const request = context.switchToHttp().getRequest();
    const user: JwtPayload = request.user;

    // If no user in request, deny access
    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Check if user has any of the required roles
    const hasAccess = requiredRoles.some((requiredRole) => {
      // Use role hierarchy - admin can access user routes, but not vice versa
      return hasRoleOrHigher(user.role, requiredRole);
    });

    if (!hasAccess) {
      throw new ForbiddenException(
        `Access denied. Required roles: ${requiredRoles.join(', ')}. User role: ${user.role}`,
      );
    }

    return true;
  }
}
