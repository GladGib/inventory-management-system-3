# Error Tracking & Performance Monitoring

## Overview
Integrate Sentry for error tracking and performance monitoring across both the NestJS backend and Next.js frontend. Includes source map uploads, user/organization context, custom breadcrumbs for business operations, Web Vitals tracking, and an enhanced health check endpoint. The goal is to catch errors before users report them, monitor API and page performance, and provide actionable diagnostics for debugging production issues.

## Architecture

### Backend Integration
- `apps/api/src/common/sentry/sentry.module.ts` - Sentry NestJS module
- `apps/api/src/common/sentry/sentry.interceptor.ts` - Error capture interceptor
- `apps/api/src/common/sentry/sentry.filter.ts` - Exception filter with Sentry reporting
- `apps/api/src/main.ts` - Sentry initialization

### Frontend Integration
- `apps/web/sentry.client.config.ts` - Client-side Sentry init
- `apps/web/sentry.server.config.ts` - Server-side Sentry init (Next.js SSR)
- `apps/web/sentry.edge.config.ts` - Edge runtime Sentry init
- `apps/web/next.config.js` - withSentryConfig wrapper
- `apps/web/src/app/global-error.tsx` - Sentry-aware error boundary

### Dependencies
**Backend (apps/api/package.json):**
```json
{
  "@sentry/nestjs": "^8.40.0",
  "@sentry/profiling-node": "^8.40.0"
}
```

**Frontend (apps/web/package.json):**
```json
{
  "@sentry/nextjs": "^8.40.0"
}
```

### Configuration
Environment variables in `.env`:
```
# Backend
SENTRY_DSN=https://examplePublicKey@o0.ingest.sentry.io/0
SENTRY_ENVIRONMENT=development
SENTRY_RELEASE=                         # Auto-set from git commit hash
SENTRY_TRACES_SAMPLE_RATE=1.0          # 1.0 for dev, 0.2 for production
SENTRY_PROFILES_SAMPLE_RATE=0.1        # Profile 10% of transactions
SENTRY_ENABLED=true

# Frontend (in apps/web/.env.local)
NEXT_PUBLIC_SENTRY_DSN=https://examplePublicKey@o0.ingest.sentry.io/0
NEXT_PUBLIC_SENTRY_ENVIRONMENT=development
SENTRY_AUTH_TOKEN=                       # For source map upload in CI
SENTRY_ORG=your-org
SENTRY_PROJECT_API=ims-api
SENTRY_PROJECT_WEB=ims-web
```

## Requirements

### ETM-001: Backend Sentry Integration
- **Priority**: P0
- **Description**: Initialize Sentry in the NestJS backend with error capture and performance tracing.
- **Acceptance Criteria**:
  - Sentry initialized in `main.ts` before NestJS app creation:
    ```typescript
    import * as Sentry from '@sentry/nestjs';
    import { nodeProfilingIntegration } from '@sentry/profiling-node';

    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
      release: process.env.SENTRY_RELEASE,
      integrations: [
        nodeProfilingIntegration(),
      ],
      tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.2'),
      profilesSampleRate: parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE || '0.1'),
      enabled: process.env.SENTRY_ENABLED !== 'false',
      // Don't send errors in test environment
      beforeSend(event) {
        if (process.env.NODE_ENV === 'test') return null;
        return event;
      },
    });
    ```
  - `SentryModule` imported in `AppModule` to enable automatic instrumentation:
    ```typescript
    import { SentryModule } from '@sentry/nestjs/setup';

    @Module({
      imports: [
        SentryModule.forRoot(),
        // ... other imports
      ],
    })
    ```
  - `SentryGlobalFilter` registered to capture all unhandled exceptions:
    ```typescript
    import { SentryGlobalFilter } from '@sentry/nestjs/setup';

    // In main.ts, after app creation:
    const { httpAdapter } = app.get(HttpAdapterHost);
    app.useGlobalFilters(new SentryGlobalFilter(httpAdapter));
    ```
  - Existing `AllExceptionsFilter` updated to report to Sentry for 5xx errors before sending response
  - HTTP 4xx errors (validation, not found, auth) are NOT sent to Sentry (they are expected)
  - Sentry is disabled when `SENTRY_DSN` is empty or `SENTRY_ENABLED=false`

### ETM-002: Backend User and Organization Context
- **Priority**: P0
- **Description**: Attach authenticated user and organization context to Sentry events.
- **Acceptance Criteria**:
  - Middleware or interceptor sets Sentry user context after JWT validation:
    ```typescript
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.name,
    });
    Sentry.setTag('organizationId', user.organizationId);
    Sentry.setTag('userRole', user.role);
    ```
  - Context is set per-request (using Sentry's isolation scope with `withScope` or `requestHandler`)
  - Unauthenticated requests (login, health) have no user context
  - Organization ID is a tag (searchable/filterable in Sentry dashboard)
  - User PII: email is included for debugging; can be disabled via `sendDefaultPii: false` for compliance

### ETM-003: Backend Custom Breadcrumbs
- **Priority**: P1
- **Description**: Add custom breadcrumbs for business operations to provide debugging context.
- **Acceptance Criteria**:
  - Breadcrumb helper utility: `apps/api/src/common/sentry/breadcrumbs.ts`
    ```typescript
    export function addBusinessBreadcrumb(data: {
      category: string;
      message: string;
      level: 'info' | 'warning' | 'error';
      data?: Record<string, unknown>;
    }) {
      Sentry.addBreadcrumb({
        category: data.category,
        message: data.message,
        level: data.level,
        data: data.data,
      });
    }
    ```
  - Breadcrumbs added at key business operations:

| Operation | Category | Message Example |
|-----------|----------|-----------------|
| Sales Order created | `sales` | `"Sales Order SO-2024-0001 created for customer ABC Motors"` |
| Invoice generated | `sales` | `"Invoice INV-2024-0001 generated from SO SO-2024-0001"` |
| Payment recorded | `payment` | `"Payment PMT-2024-0001 recorded: MYR 1,500.00 via Bank Transfer"` |
| Stock adjusted | `inventory` | `"Stock adjustment ADJ-2024-0001: +50 pcs of BRK-00142"` |
| E-Invoice submitted | `einvoice` | `"E-Invoice submitted for INV-2024-0001, UUID: abc-123"` |
| E-Invoice status changed | `einvoice` | `"E-Invoice INV-2024-0001 status: VALIDATED"` |
| PDF generated | `pdf` | `"PDF generated for Invoice INV-2024-0001"` |
| Email sent | `email` | `"Email sent to customer@abc.com: Invoice INV-2024-0001"` |
| User login | `auth` | `"User john@example.com logged in"` |
| Report generated | `report` | `"Sales Summary report generated for 2024-01 to 2024-03"` |

  - Breadcrumbs do not include sensitive data (passwords, API keys, full addresses)

### ETM-004: Backend Performance Tracing
- **Priority**: P1
- **Description**: Custom performance spans for slow operations.
- **Acceptance Criteria**:
  - Automatic HTTP transaction tracing via `@sentry/nestjs` (every API request is a transaction)
  - Transaction naming: `{METHOD} {ROUTE}` (e.g., `GET /api/v1/items`, `POST /api/v1/sales-orders`)
  - Custom spans for:
    1. **Database queries**: Prisma queries automatically instrumented via Sentry's Prisma integration
    2. **External API calls (MyInvois)**: Manual span around HTTP calls to MyInvois e-Invoice API
       ```typescript
       return Sentry.startSpan({ name: 'myinvois.submit', op: 'http.client' }, async () => {
         return await this.httpService.post(myInvoisUrl, payload);
       });
       ```
    3. **PDF generation**: Span around Puppeteer PDF rendering
       ```typescript
       return Sentry.startSpan({ name: 'pdf.generate', op: 'function' }, async () => {
         return await this.puppeteerService.generatePdf(html);
       });
       ```
    4. **Redis operations**: Span around cache get/set (if not auto-instrumented)
    5. **Elasticsearch queries**: Span around search/index operations
    6. **Report aggregation queries**: Span around complex report SQL queries
  - Spans include relevant metadata (query type, entity count, etc.)
  - Slow transaction threshold: > 2 seconds (configurable)

### ETM-005: Frontend Sentry Integration
- **Priority**: P0
- **Description**: Initialize Sentry in the Next.js frontend with error capture and Web Vitals.
- **Acceptance Criteria**:
  - File: `apps/web/sentry.client.config.ts`
    ```typescript
    import * as Sentry from '@sentry/nextjs';

    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT,
      integrations: [
        Sentry.replayIntegration({
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],
      tracesSampleRate: 0.2,
      replaysSessionSampleRate: 0.1,   // 10% of sessions
      replaysOnErrorSampleRate: 1.0,   // 100% of sessions with errors
      enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
    });
    ```
  - File: `apps/web/sentry.server.config.ts`
    ```typescript
    import * as Sentry from '@sentry/nextjs';

    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT,
      tracesSampleRate: 0.2,
      enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
    });
    ```
  - `next.config.js` wrapped with `withSentryConfig`:
    ```javascript
    const { withSentryConfig } = require('@sentry/nextjs');

    const nextConfig = {
      // ... existing config
    };

    module.exports = withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT_WEB,
      silent: true,
      widenClientFileUpload: true,
      hideSourceMaps: true,
      disableLogger: true,
    });
    ```
  - Source maps uploaded automatically during `next build` when `SENTRY_AUTH_TOKEN` is set
  - Error boundary at `apps/web/src/app/global-error.tsx`:
    ```tsx
    'use client';
    import * as Sentry from '@sentry/nextjs';
    import { useEffect } from 'react';
    import { Button, Result } from 'antd';

    export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
      useEffect(() => {
        Sentry.captureException(error);
      }, [error]);

      return (
        <html>
          <body>
            <Result
              status="500"
              title="Something went wrong"
              subTitle="We have been notified and are working on a fix."
              extra={<Button type="primary" onClick={reset}>Try Again</Button>}
            />
          </body>
        </html>
      );
    }
    ```

### ETM-006: Frontend User Context
- **Priority**: P0
- **Description**: Attach authenticated user context to frontend Sentry events.
- **Acceptance Criteria**:
  - In the `AuthProvider` or `useAuthStore`, set Sentry user when user authenticates:
    ```typescript
    // On login success:
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.name,
    });
    Sentry.setTag('organizationId', user.organizationId);
    Sentry.setTag('organizationName', user.organization?.name);

    // On logout:
    Sentry.setUser(null);
    ```
  - User context persists across page navigations within the session
  - Organization ID is a tag for filtering in Sentry dashboard

### ETM-007: Frontend Web Vitals Tracking
- **Priority**: P1
- **Description**: Track Core Web Vitals and page performance metrics.
- **Acceptance Criteria**:
  - `@sentry/nextjs` automatically captures Web Vitals when `tracesSampleRate > 0`:
    - **LCP** (Largest Contentful Paint): Target < 2.5s
    - **FID** (First Input Delay): Target < 100ms
    - **CLS** (Cumulative Layout Shift): Target < 0.1
    - **TTFB** (Time to First Byte): Target < 800ms
    - **FCP** (First Contentful Paint): Target < 1.8s
  - Transaction naming for pages: Route path (e.g., `/dashboard`, `/items`, `/sales-orders/[id]`)
  - Custom performance spans for:
    1. **API calls**: Automatically instrumented by Sentry's fetch/XHR integration
    2. **Table data load**: Time from component mount to data rendered (TanStack Query integration)
    3. **PDF preview render**: Time to render PDF preview in modal
  - Alert threshold: LCP > 4s on any page triggers Sentry alert

### ETM-008: Frontend Custom Breadcrumbs
- **Priority**: P1
- **Description**: Add breadcrumbs for user interactions that provide context for error reports.
- **Acceptance Criteria**:
  - Automatic breadcrumbs (via Sentry's default integrations):
    - Click events on buttons and links
    - Navigation events (route changes)
    - Console errors and warnings
    - HTTP requests (fetch/XHR)
  - Custom breadcrumbs for business actions:

| Action | Category | Message Example |
|--------|----------|-----------------|
| Navigate to item detail | `navigation` | `"Viewed item BRK-00142 (Brake Pad Set)"` |
| Create sales order | `ui.action` | `"Created sales order with 5 items"` |
| Submit invoice | `ui.action` | `"Submitted invoice INV-2024-0001"` |
| Record payment | `ui.action` | `"Recorded payment MYR 1,500.00"` |
| Search performed | `ui.action` | `"Searched: 'brake pad toyota'"` |
| Language switched | `ui.action` | `"Language switched to Bahasa Malaysia"` |
| Dashboard widget reordered | `ui.action` | `"Dashboard layout updated"` |
| Export report | `ui.action` | `"Exported Sales Summary as PDF"` |

  - Breadcrumbs strip sensitive data (no full customer addresses, no payment details)

### ETM-009: Sentry Alert Rules
- **Priority**: P1
- **Description**: Configure Sentry alert rules for proactive error detection.
- **Acceptance Criteria**:
  - Alert rules (configured in Sentry dashboard or via Sentry API / terraform):

| Alert | Condition | Action |
|-------|-----------|--------|
| New Error | First occurrence of a new issue | Email to development team |
| High-frequency Error | Same error > 10 times in 1 hour | Email + Slack notification |
| E-Invoice Failure | Error with tag `module:einvoice` | Immediate email to admin |
| Payment Processing Error | Error with tag `module:payment` | Immediate email to admin |
| Slow Transaction | p95 transaction time > 3s | Email to development team |
| Web Vitals Regression | LCP p75 > 4s | Email to development team |
| Error Spike | Error rate > 5% of transactions | Email + Slack (urgent) |

  - Environment-specific: alerts only for `staging` and `production` (not `development`)
  - Documentation: alert configuration documented in `docs/sentry-alerts.md` (referenced, not auto-created)

### ETM-010: Enhanced Health Check Endpoint
- **Priority**: P0
- **Description**: Comprehensive health check endpoint reporting status of all services.
- **Acceptance Criteria**:
  - Updated `GET /health` response:
    ```typescript
    interface HealthCheckResponse {
      status: 'healthy' | 'degraded' | 'unhealthy';
      timestamp: string;
      uptime: number;                    // Seconds
      version: string;                   // From package.json
      environment: string;               // NODE_ENV
      services: {
        database: {
          status: 'up' | 'down';
          responseTime: number;          // Milliseconds
          connectionPool?: {
            total: number;
            idle: number;
            waiting: number;
          };
        };
        redis: {
          status: 'up' | 'down';
          responseTime: number;
          memoryUsage?: string;          // "5.2 MB"
        };
        elasticsearch: {
          status: 'up' | 'down';
          responseTime: number;
          clusterStatus?: string;        // "green", "yellow", "red"
        };
      };
      memory: {
        rss: number;                     // Bytes
        heapTotal: number;
        heapUsed: number;
        external: number;
      };
      queues?: {
        email: { waiting: number; active: number; failed: number };
        pdf: { waiting: number; active: number; failed: number };
        einvoice: { waiting: number; active: number; failed: number };
      };
    }
    ```
  - Status determination:
    - `healthy`: All services up
    - `degraded`: Database up, but Redis or Elasticsearch down
    - `unhealthy`: Database down
  - Response time for each service: measured by executing a ping/simple query
  - No authentication required (used by load balancer and monitoring)
  - Response cached for 5 seconds (avoid repeated health check queries)
  - Endpoint does NOT expose sensitive information (no connection strings, no credentials)

### ETM-011: Uptime Monitoring Configuration
- **Priority**: P2
- **Description**: External uptime monitoring setup for the health endpoint.
- **Acceptance Criteria**:
  - Recommended setup (documented, not implemented in code):
    - Use external monitoring service (UptimeRobot, Better Uptime, or Sentry Uptime)
    - Monitor URL: `https://api.yourdomain.com/health`
    - Check interval: 1 minute
    - Alert on: HTTP status != 200 or `status` != `"healthy"`
    - Alert channels: Email + Slack
    - Maintenance windows: configurable for planned downtime
  - `/health` endpoint is always accessible (no auth, no rate limit)
  - Response time of `/health` itself should be < 500ms (it queries each service)

### ETM-012: System Status Link in Frontend
- **Priority**: P2
- **Description**: Link to Sentry dashboard from the admin settings page.
- **Acceptance Criteria**:
  - In `/settings/system` page (or general settings page):
    - "Error Tracking" section with:
      - Link to Sentry dashboard (external URL, opens in new tab)
      - Current Sentry DSN status (configured / not configured)
      - Last error count (from Sentry API, if available)
    - "System Health" section with:
      - Live status of each service (calls `/health` endpoint)
      - Auto-refresh every 30 seconds
      - Visual indicators: green/yellow/red dots
  - Only visible to ADMIN users

## Source Map Upload (CI)

### Build Pipeline Integration
```yaml
# Example CI step (GitHub Actions)
- name: Build Frontend with Source Maps
  env:
    SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
    SENTRY_ORG: your-org
    SENTRY_PROJECT: ims-web
  run: |
    cd apps/web
    npm run build
    # Source maps are uploaded automatically by @sentry/nextjs during build
```

### Backend Source Maps
```yaml
- name: Build Backend
  run: |
    cd apps/api
    npm run build
    # Upload source maps to Sentry
    npx @sentry/cli sourcemaps upload \
      --org $SENTRY_ORG \
      --project ims-api \
      --release $SENTRY_RELEASE \
      ./dist
```

## File Structure

### Backend
```
apps/api/src/common/sentry/
  sentry.module.ts
  sentry.interceptor.ts
  sentry.filter.ts
  breadcrumbs.ts
  __tests__/
    sentry.filter.spec.ts
```

### Frontend
```
apps/web/
  sentry.client.config.ts
  sentry.server.config.ts
  sentry.edge.config.ts
  src/
    app/
      global-error.tsx
    components/
      SentryUserContext.tsx    # Component that sets Sentry user from auth store
    lib/
      sentry.ts               # Breadcrumb helpers for business actions
```

## Environment Variables Summary

| Variable | Location | Description |
|----------|----------|-------------|
| `SENTRY_DSN` | `apps/api/.env` | Backend Sentry DSN |
| `NEXT_PUBLIC_SENTRY_DSN` | `apps/web/.env.local` | Frontend Sentry DSN (public) |
| `SENTRY_ENVIRONMENT` | Both | Environment tag (development/staging/production) |
| `SENTRY_RELEASE` | Both | Release version (git commit hash) |
| `SENTRY_TRACES_SAMPLE_RATE` | Both | Transaction sampling rate (0.0-1.0) |
| `SENTRY_PROFILES_SAMPLE_RATE` | API only | Profiling sampling rate |
| `SENTRY_ENABLED` | API only | Master toggle |
| `SENTRY_AUTH_TOKEN` | CI only | For source map upload |
| `SENTRY_ORG` | CI only | Sentry organization slug |
| `SENTRY_PROJECT_API` | CI only | API project slug in Sentry |
| `SENTRY_PROJECT_WEB` | CI only | Web project slug in Sentry |

## Performance Monitoring Targets

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| API p95 response time | < 500ms | > 1000ms |
| API p99 response time | < 1000ms | > 3000ms |
| Frontend LCP | < 2.5s | > 4s |
| Frontend FID | < 100ms | > 300ms |
| Frontend CLS | < 0.1 | > 0.25 |
| Health check response | < 200ms | > 500ms |
| Error rate (backend) | < 0.1% | > 1% |
| Error rate (frontend) | < 0.5% | > 2% |

## Graceful Degradation
- If `SENTRY_DSN` is not configured, all Sentry calls are no-ops
- If Sentry service is unreachable, error reporting silently fails (does not impact application)
- Health check works independently of Sentry
- No application functionality depends on Sentry being available
