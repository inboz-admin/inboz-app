import { Module, Global } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { CacheService } from './cache.service';
import { HttpCacheInterceptor } from './cache.interceptor';
import { APP_INTERCEPTOR } from '@nestjs/core';

@Global()
@Module({
  imports: [
    NestCacheModule.registerAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        // Use individual variables for consistency with all other Redis connections
        const redisPassword = (configService.get('REDIS_PASSWORD') || '').trim();
        
        const config: any = {
          store: 'redis',
          host: configService.get('REDIS_HOST') || 'localhost',
          port: configService.get('REDIS_PORT') || 6379,
          ttl: 60 * 60 * 1000, // 1 hour
          ...(redisPassword && { password: redisPassword }),
        };
        
        return config;
      },
    }),
  ],
  providers: [
    CacheService,
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpCacheInterceptor,
    },
  ],
  exports: [CacheService],
})
export class CacheModule {}
