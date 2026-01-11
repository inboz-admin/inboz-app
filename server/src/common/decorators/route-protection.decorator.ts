import { SetMetadata } from '@nestjs/common';
import { Public as JwtPublic } from 'src/configuration/jwt/public.decorator';

export const SKIP_ROUTE_PROTECTION = 'skipRouteProtection';

/**
 * Decorator to skip automatic route protection for specific routes
 * Use this for public routes or routes that need custom authorization logic
 *
 * @example
 * @SkipRouteProtection()
 * @Get('public')
 * publicRoute() {}
 */
export const SkipRouteProtection = () =>
  SetMetadata(SKIP_ROUTE_PROTECTION, true);

/**
 * Decorator to mark routes as public (works with both JWT guard and route protection)
 * More semantic name for public endpoints
 *
 * @example
 * @Public()
 * @Post('login')
 * login() {}
 */
export const Public = () => JwtPublic();

/**
 * Decorator to explicitly enable route protection (optional, enabled by default)
 * Use this for documentation purposes or when you want to be explicit
 *
 * @example
 * @RequireRouteProtection()
 * @Get('protected')
 * protectedRoute() {}
 */
export const RequireRouteProtection = () =>
  SetMetadata(SKIP_ROUTE_PROTECTION, false);
