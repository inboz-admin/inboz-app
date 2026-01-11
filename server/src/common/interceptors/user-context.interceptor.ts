import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { JwtPayload } from 'src/configuration/jwt/interfaces/jwt-payload.interface';
import { UserContextService } from '../services/user-context.service';
import { IS_PUBLIC_KEY } from 'src/configuration/jwt/public.decorator';

/**
 * Interceptor that captures the current user from the request and stores it
 * in AsyncLocalStorage for use throughout the request lifecycle
 *
 * This interceptor is applied globally but skips user context for public routes.
 */

@Injectable()
export class UserContextInterceptor implements NestInterceptor {
  constructor(
    private readonly userContextService: UserContextService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // Skip user context for public routes
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      // For public routes, run without user context
      return this.userContextService.run(undefined, () => next.handle());
    }

    const request = context.switchToHttp().getRequest();
    const user: JwtPayload | undefined = request.user;

    // Store user context for authenticated routes
    return this.userContextService.run(user, () => next.handle());
  }
}
