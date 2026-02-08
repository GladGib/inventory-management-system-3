import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  /**
   * Retrieve a value from the cache.
   * @param key - The cache key
   * @returns The cached value or undefined if not found
   */
  async get<T>(key: string): Promise<T | undefined> {
    try {
      return await this.cacheManager.get<T>(key);
    } catch (error) {
      this.logger.warn(`Cache GET failed for key "${key}": ${error}`);
      return undefined;
    }
  }

  /**
   * Store a value in the cache.
   * @param key - The cache key
   * @param value - The value to cache
   * @param ttlSeconds - Time to live in seconds (converted to ms internally)
   */
  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    try {
      const ttlMs = ttlSeconds ? ttlSeconds * 1000 : undefined;
      await this.cacheManager.set(key, value, ttlMs);
    } catch (error) {
      this.logger.warn(`Cache SET failed for key "${key}": ${error}`);
    }
  }

  /**
   * Delete a value from the cache.
   * @param key - The cache key to delete
   */
  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
    } catch (error) {
      this.logger.warn(`Cache DEL failed for key "${key}": ${error}`);
    }
  }

  /**
   * Clear all values from the cache.
   */
  async clear(): Promise<void> {
    try {
      await this.cacheManager.clear();
    } catch (error) {
      this.logger.warn(`Cache CLEAR failed: ${error}`);
    }
  }

  /**
   * Pattern-based cache invalidation.
   * Iterates all keys in every store and deletes those matching the regex pattern.
   * @param pattern - A regex pattern string to match cache keys against
   */
  async invalidateByPattern(pattern: string): Promise<void> {
    try {
      const regex = new RegExp(pattern);
      const stores = this.cacheManager.stores;

      if (!stores || stores.length === 0) {
        return;
      }

      for (const store of stores) {
        // Keyv stores may expose an iterator or keys method via the underlying adapter
        const adapter = (store as any).store;
        if (adapter && typeof adapter.keys === 'function') {
          const keys: string[] = await adapter.keys();
          const matchingKeys = keys.filter((key: string) => regex.test(key));
          if (matchingKeys.length > 0) {
            await this.cacheManager.mdel(matchingKeys);
            this.logger.debug(
              `Invalidated ${matchingKeys.length} keys matching pattern "${pattern}"`,
            );
          }
        }
      }
    } catch (error) {
      this.logger.warn(`Cache invalidateByPattern failed for "${pattern}": ${error}`);
    }
  }

  /**
   * Build a namespaced cache key from a prefix and variable parts.
   * @param prefix - The key prefix (e.g., 'dashboard', 'reports')
   * @param parts - Additional key segments
   * @returns A colon-separated cache key
   */
  buildKey(prefix: string, ...parts: string[]): string {
    return `${prefix}:${parts.join(':')}`;
  }

  /**
   * Wrap a function call with caching. Returns the cached value if present,
   * otherwise calls the function, caches the result, and returns it.
   * Uses the native cache-manager `wrap` method for atomic get-or-set.
   * @param key - The cache key
   * @param fn - The function to call if the cache misses
   * @param ttlSeconds - Time to live in seconds
   */
  async wrap<T>(key: string, fn: () => Promise<T>, ttlSeconds?: number): Promise<T> {
    try {
      const ttlMs = ttlSeconds ? ttlSeconds * 1000 : undefined;
      return await this.cacheManager.wrap<T>(key, fn, ttlMs);
    } catch (error) {
      this.logger.warn(`Cache WRAP failed for key "${key}", executing function directly: ${error}`);
      return fn();
    }
  }
}
