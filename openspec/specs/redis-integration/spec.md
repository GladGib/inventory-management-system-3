# Redis Integration (Caching & Sessions)

## Overview
Wire up the existing ioredis 5.3.2 dependency into a global NestJS module providing caching, session storage, rate limiting, and cache invalidation across the IMS API. Redis is already running in docker-compose (redis:7-alpine on port 6379) but has no application-level integration.

## Architecture

### Module Location
- `apps/api/src/common/redis/redis.module.ts` - Global module
- `apps/api/src/common/redis/redis.service.ts` - Service wrapping ioredis client
- `apps/api/src/common/redis/redis.constants.ts` - Injection tokens and default TTLs
- `apps/api/src/common/redis/redis.health.ts` - Health indicator for /health endpoint
- `apps/api/src/common/redis/cache.interceptor.ts` - HTTP response cache interceptor
- `apps/api/src/common/redis/cache-invalidate.decorator.ts` - Decorator to bust cache on writes

### Dependencies
- `ioredis` ^5.3.2 (already in `apps/api/package.json`)
- No new packages required

### Configuration
Environment variables in `.env`:
```
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_KEY_PREFIX=ims:
```

## Requirements

### REDIS-001: RedisModule (Global)
- **Priority**: P0
- **Description**: Create a global NestJS module that initializes an ioredis client and exposes RedisService.
- **Acceptance Criteria**:
  - Module is decorated with `@Global()` and registered in `AppModule.imports`
  - ioredis client is created via an async factory using `ConfigService` to read `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_DB`
  - Client instance is provided via custom injection token `REDIS_CLIENT`
  - Module exports both the raw client token and `RedisService`
  - `onModuleDestroy` lifecycle hook calls `client.quit()` for graceful shutdown
  - Connection error handler logs the error but does not crash the process

### REDIS-002: RedisService
- **Priority**: P0
- **Description**: Service class wrapping ioredis client with typed convenience methods.
- **Acceptance Criteria**:
  - `get<T>(key: string): Promise<T | null>` -- JSON.parse the stored value, return null on miss
  - `set(key: string, value: unknown, ttlSeconds?: number): Promise<void>` -- JSON.stringify, optional EX
  - `del(key: string | string[]): Promise<number>` -- delete one or many keys
  - `ttl(key: string): Promise<number>` -- returns remaining TTL in seconds
  - `exists(key: string): Promise<boolean>` -- check key existence
  - `keys(pattern: string): Promise<string[]>` -- SCAN-based key lookup (not KEYS for safety)
  - `flushByPrefix(prefix: string): Promise<number>` -- delete all keys matching prefix via SCAN + UNLINK
  - `incr(key: string): Promise<number>` -- atomic increment
  - `expire(key: string, ttlSeconds: number): Promise<void>` -- set expiry on existing key
  - `isConnected(): boolean` -- returns true if client status is 'ready'
  - All methods catch errors and log warnings; never throw to calling code when Redis is unavailable (graceful degradation)

### REDIS-003: API Response Caching (CacheInterceptor)
- **Priority**: P0
- **Description**: NestJS interceptor that caches GET endpoint responses in Redis.
- **Acceptance Criteria**:
  - Custom decorator `@Cacheable(ttlSeconds?: number, keyPrefix?: string)` to annotate controller methods
  - Cache key format: `ims:cache:{orgId}:{method}:{path}:{queryHash}` where queryHash is MD5 of sorted query params
  - Organization-scoped: cache keys include the authenticated user's `organizationId` so tenants never share cache
  - On cache hit: return cached JSON directly, set `X-Cache: HIT` response header
  - On cache miss: execute handler, store result in Redis with TTL, set `X-Cache: MISS` header
  - Bypassed for non-GET requests automatically
  - Bypassed when `Cache-Control: no-cache` header is present
  - Default TTL: 60 seconds; configurable per endpoint

#### Endpoints to Cache
| Endpoint | TTL | Key Prefix |
|----------|-----|------------|
| `GET /items` (list) | 60s | `items:list` |
| `GET /items/:id` | 120s | `items:detail` |
| `GET /inventory/stock-levels` | 30s | `stock:levels` |
| `GET /dashboard/kpis` | 300s (5 min) | `dashboard:kpis` |
| `GET /dashboard/sales-chart` | 300s | `dashboard:sales` |
| `GET /dashboard/top-customers` | 300s | `dashboard:customers` |
| `GET /dashboard/top-products` | 300s | `dashboard:products` |
| `GET /dashboard/inventory-status` | 300s | `dashboard:inventory` |
| `GET /reports/*` | 900s (15 min) | `reports:{type}` |
| `GET /categories` | 300s | `categories:list` |
| `GET /contacts` | 60s | `contacts:list` |
| `GET /tax-rates` | 600s | `tax:rates` |

### REDIS-004: Cache Invalidation
- **Priority**: P0
- **Description**: Automatically bust cached data when write operations modify related entities.
- **Acceptance Criteria**:
  - Custom decorator `@InvalidateCache(prefixes: string[])` for controller methods
  - On successful POST/PUT/PATCH/DELETE, delete all keys matching the specified prefixes for the current organization
  - Invalidation is organization-scoped: `ims:cache:{orgId}:{prefix}:*`
  - Invalidation mapping:

| Write Operation | Cache Prefixes to Invalidate |
|----------------|------------------------------|
| Create/Update/Delete Item | `items:*`, `stock:*`, `dashboard:*`, `reports:*` |
| Create/Update/Delete Contact | `contacts:*`, `dashboard:*` |
| Create/Update Sales Order | `dashboard:*`, `reports:*` |
| Create/Update Invoice | `dashboard:*`, `reports:*` |
| Create/Update Purchase Order | `dashboard:*`, `reports:*` |
| Stock Adjustment | `stock:*`, `items:*`, `dashboard:*` |
| Inventory Transfer | `stock:*`, `dashboard:*` |
| Category change | `categories:*`, `items:*` |
| Tax rate change | `tax:*` |

  - `RedisService.flushByPrefix()` used for pattern-based deletion via SCAN + UNLINK (not KEYS + DEL)

### REDIS-005: Session Store (Refresh Tokens)
- **Priority**: P1
- **Description**: Move JWT refresh token storage from PostgreSQL `RefreshToken` table to Redis for faster lookup and automatic expiry.
- **Acceptance Criteria**:
  - Key format: `ims:session:refresh:{tokenHash}` where tokenHash is SHA-256 of the refresh token
  - Value: JSON `{ userId: string, createdAt: string }`
  - TTL: matches refresh token expiry (e.g. 7 days = 604800 seconds)
  - On token refresh: delete old key, create new key (rotation)
  - On logout: delete the refresh token key
  - On login: create refresh token key in Redis
  - The existing `RefreshToken` Prisma model remains in schema but is no longer written to; migration path:
    1. New code writes to Redis only
    2. Read checks Redis first, falls back to DB for tokens created before migration
    3. After 7 days (max token lifetime), all legacy DB tokens expire naturally
  - Graceful degradation: if Redis is down during login, fall back to DB storage for refresh tokens

### REDIS-006: Rate Limiting (Redis-backed ThrottlerModule)
- **Priority**: P1
- **Description**: Replace the in-memory ThrottlerModule storage with Redis-backed storage for consistency across multiple API instances.
- **Acceptance Criteria**:
  - Install `@nestjs/throttler` storage adapter or implement custom `ThrottlerStorage` using RedisService
  - ThrottlerModule configuration in `AppModule` updated to use Redis storage
  - Rate limit state is shared across all API instances (horizontal scaling)
  - Key format: `ims:ratelimit:{ip}:{route}`
  - Existing rate limit config preserved: 100 requests per 60 seconds (global)
  - Auth endpoints (`/auth/login`, `/auth/register`, `/auth/refresh`) have stricter limits: 5 requests per 15 minutes per IP
  - Graceful degradation: if Redis is unavailable, falls back to in-memory throttling

### REDIS-007: Health Check
- **Priority**: P0
- **Description**: Include Redis connection status in the `/health` endpoint.
- **Acceptance Criteria**:
  - `AppService.healthCheck()` updated to include Redis status
  - Health response includes:
    ```json
    {
      "status": "healthy",
      "timestamp": "...",
      "uptime": 12345,
      "services": {
        "database": { "status": "up", "responseTime": 5 },
        "redis": { "status": "up", "responseTime": 2 }
      }
    }
    ```
  - Redis health check: execute `PING` command, measure round-trip time
  - If Redis is down: `redis.status` is `"down"`, overall `status` remains `"healthy"` (degraded mode, not fatal)
  - If database is down: overall `status` is `"unhealthy"`

### REDIS-008: Graceful Degradation
- **Priority**: P0
- **Description**: The application must function correctly when Redis is unavailable.
- **Acceptance Criteria**:
  - `RedisService` methods return sensible defaults on connection failure:
    - `get()` returns `null` (cache miss)
    - `set()` is a no-op (logs warning)
    - `del()` returns 0
    - `isConnected()` returns false
  - `CacheInterceptor` passes through to the handler when Redis is down (no caching, no error)
  - Refresh token operations fall back to the `RefreshToken` database table
  - Rate limiting falls back to in-memory storage
  - Warning logged once on connection loss, not on every operation (avoid log flooding)
  - Automatic reconnection when Redis becomes available again (ioredis default behavior)

## API Changes

### Updated Health Endpoint
```
GET /health
```
Response:
```typescript
interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  memory: NodeJS.MemoryUsage;
  services: {
    database: { status: 'up' | 'down'; responseTime: number };
    redis: { status: 'up' | 'down'; responseTime: number };
  };
}
```

### Cache Headers on GET Responses
```
X-Cache: HIT | MISS
X-Cache-TTL: <remaining seconds>
```

## File Structure
```
apps/api/src/common/redis/
  redis.module.ts          # @Global() module with ioredis async factory
  redis.service.ts         # Typed wrapper around ioredis client
  redis.constants.ts       # REDIS_CLIENT token, default TTLs
  redis.health.ts          # Health indicator
  cache.interceptor.ts     # CacheInterceptor for GET endpoints
  cache.decorator.ts       # @Cacheable() and @InvalidateCache() decorators
  redis-throttler.storage.ts  # ThrottlerStorage implementation backed by Redis
  __tests__/
    redis.service.spec.ts
    cache.interceptor.spec.ts
```

## Configuration Reference

### Default TTLs (redis.constants.ts)
```typescript
export const DEFAULT_CACHE_TTL = 60;           // 1 minute
export const DASHBOARD_CACHE_TTL = 300;        // 5 minutes
export const REPORT_CACHE_TTL = 900;           // 15 minutes
export const TAX_CACHE_TTL = 600;              // 10 minutes
export const CATEGORY_CACHE_TTL = 300;         // 5 minutes
export const STOCK_CACHE_TTL = 30;             // 30 seconds
export const REFRESH_TOKEN_TTL = 604800;       // 7 days
```

### Environment Variables
| Variable | Default | Description |
|----------|---------|-------------|
| `REDIS_HOST` | `localhost` | Redis server hostname |
| `REDIS_PORT` | `6379` | Redis server port |
| `REDIS_PASSWORD` | (empty) | Redis AUTH password |
| `REDIS_DB` | `0` | Redis database index |
| `REDIS_KEY_PREFIX` | `ims:` | Global key prefix for namespacing |
| `REDIS_ENABLED` | `true` | Master toggle to disable Redis entirely |

## Integration Points

### AppModule Changes
```typescript
// apps/api/src/app.module.ts
import { RedisModule } from './common/redis/redis.module';

@Module({
  imports: [
    // ... existing imports
    RedisModule,  // Add after ConfigModule, before other modules
    // ...
  ],
})
```

### Auth Module Changes
- `AuthService.login()`: Store refresh token in Redis instead of DB
- `AuthService.refreshToken()`: Look up in Redis first, fall back to DB
- `AuthService.logout()`: Delete from Redis, also delete from DB for safety

### Dashboard/Reports Controller Changes
- Add `@Cacheable(DASHBOARD_CACHE_TTL)` to dashboard GET endpoints
- Add `@Cacheable(REPORT_CACHE_TTL)` to report GET endpoints

## Testing

### Unit Tests
- `RedisService`: Mock ioredis client, verify all method behaviors including error handling
- `CacheInterceptor`: Mock RedisService, verify HIT/MISS logic, bypass conditions
- `@InvalidateCache`: Verify correct prefixes are flushed after handler execution

### Integration Tests
- Connect to test Redis instance (docker-compose)
- Verify set/get/del round-trip
- Verify TTL expiry
- Verify cache invalidation on write operations
- Verify graceful degradation when Redis is stopped
