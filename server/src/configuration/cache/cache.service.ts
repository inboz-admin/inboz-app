import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Injectable, Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';

@Injectable()
export class CacheService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async get<T>(key: string): Promise<T | undefined> {
    return await this.cacheManager.get<T>(key);
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    await this.cacheManager.set(key, value, ttl);
  }

  async del(key: string): Promise<void> {
    await this.cacheManager.del(key);
  }

  async reset(): Promise<void> {
    await this.cacheManager.clear();
  }

  async wrap<T>(key: string, fn: () => Promise<T>, ttl?: number): Promise<T> {
    return await this.cacheManager.wrap(key, fn, ttl);
  }

  async invalidateKey(key: string): Promise<void> {
    await this.cacheManager.del(key);
  }

  async invalidatePattern(pattern: string): Promise<void> {
    const store = (this.cacheManager as any).store;
    const keys = await store.keys(`*${pattern}*`);
    await Promise.all(keys.map((key) => this.cacheManager.del(key)));
  }

  async invalidateGroup(group: string): Promise<void> {
    await this.invalidatePattern(`group:${group}:`);
  }

  async invalidateEntity(
    entityType: string,
    entityId: string | number,
  ): Promise<void> {
    await this.invalidatePattern(`${entityType}:${entityId}`);
  }

  async invalidateMany(keys: string[]): Promise<void> {
    await Promise.all(keys.map((key) => this.cacheManager.del(key)));
  }

  async clearAll(): Promise<void> {
    await this.cacheManager.clear();
  }

  async updateTTL(key: string, ttl: number): Promise<void> {
    const value = await this.get(key);
    if (value) {
      await this.set(key, value, ttl);
    }
  }

  async setVersioned(
    key: string,
    value: any,
    version: number,
    ttl?: number,
  ): Promise<void> {
    await this.set(`${key}:v${version}`, value, ttl);
  }

  async getVersioned<T>(key: string, version: number): Promise<T | undefined> {
    return await this.get<T>(`${key}:v${version}`);
  }
}
