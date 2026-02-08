import { SetMetadata } from '@nestjs/common';

export const CACHE_KEY_METADATA = 'custom_cache_key';
export const CACHE_TTL_METADATA = 'custom_cache_ttl';

/**
 * Decorator to set a custom cache key for a route handler.
 * Used with HttpCacheInterceptor or custom interceptors.
 * @param key - The cache key string
 */
export const CacheKey = (key: string) =>
  SetMetadata(CACHE_KEY_METADATA, key);

/**
 * Decorator to set a custom TTL (in seconds) for a cached route.
 * @param ttlSeconds - Time to live in seconds
 */
export const CacheTTL = (ttlSeconds: number) =>
  SetMetadata(CACHE_TTL_METADATA, ttlSeconds);
