import { CacheInterceptor } from '@nestjs/cache-manager';
import { Injectable, ExecutionContext, Inject } from '@nestjs/common';
import { CacheService } from './cache.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { HttpAdapterHost, Reflector } from '@nestjs/core';

@Injectable()
export class HttpCacheInterceptor extends CacheInterceptor {
  constructor(
    private readonly cacheService: CacheService,
    @Inject(CACHE_MANAGER) cacheManager: Cache,
    reflector: Reflector,
    protected readonly httpAdapterHost: HttpAdapterHost,
  ) {
    super(cacheManager, reflector);
  }

  async intercept(context: ExecutionContext, next: any) {
    const request = context.switchToHttp().getRequest();
    const { httpAdapter } = this.httpAdapterHost;

    // For non-GET methods, invalidate the cache for this URL
    if (!this.isRequestCacheable(context)) {
      const key = httpAdapter.getRequestUrl(request);
      await this.cacheService.invalidateKey(key);
      return next.handle();
    }

    return super.intercept(context, next);
  }

  trackBy(context: ExecutionContext): string | undefined {
    const request = context.switchToHttp().getRequest();
    const { httpAdapter } = this.httpAdapterHost;

    // Don't cache POST/PUT/DELETE requests
    if (!this.isRequestCacheable(context)) {
      return undefined;
    }

    // Create cache key from request path and query params
    const key = httpAdapter.getRequestUrl(request);
    return key;
  }

  protected isRequestCacheable(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    return request.method === 'GET';
  }
}
