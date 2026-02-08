# BullMQ Background Job Queue

## Overview
Add BullMQ-powered background job processing for CPU-intensive, time-sensitive, and scheduled operations. This decouples email sending, PDF generation, e-Invoice submissions, reorder checks, report generation, and cleanup tasks from the HTTP request lifecycle. BullMQ uses the same Redis instance already configured in docker-compose (and wired up by the Redis Integration spec).

## Architecture

### Module Location
- `apps/api/src/common/queue/queue.module.ts` - Global module registering all queues
- `apps/api/src/common/queue/queue.service.ts` - Service for adding jobs and checking status
- `apps/api/src/common/queue/processors/` - Queue processor classes (one per queue)
- `apps/api/src/common/queue/bull-board.controller.ts` - Bull Board dashboard route

### Dependencies
**Backend (apps/api/package.json):**
```json
{
  "bullmq": "^5.4.0",
  "@bull-board/api": "^5.14.0",
  "@bull-board/express": "^5.14.0",
  "@bull-board/nestjs": "^5.14.0"
}
```

### Configuration
Uses existing Redis configuration from the Redis Integration spec:
```
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

Additional queue-specific environment variables:
```
QUEUE_DEFAULT_CONCURRENCY=3
QUEUE_PDF_CONCURRENCY=2
QUEUE_EINVOICE_CONCURRENCY=1
QUEUE_EMAIL_CONCURRENCY=5
QUEUE_REPORT_CONCURRENCY=1
BULL_BOARD_ENABLED=true
```

## Requirements

### BQ-001: QueueModule (Global)
- **Priority**: P0
- **Description**: Create a global NestJS module that registers all BullMQ queues, their processors, and the Bull Board dashboard.
- **Acceptance Criteria**:
  - Module is decorated with `@Global()` and registered in `AppModule.imports`
  - Creates BullMQ `Queue` instances for each queue type, all sharing the same Redis connection
  - Each queue has a corresponding `Worker` with configurable concurrency
  - Redis connection options read from `ConfigService` (same `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` as Redis module)
  - Connection prefix: `ims:queue:` to namespace queue keys away from cache keys
  - Module exports `QueueService` for other modules to add jobs
  - Workers are started on module init, stopped on module destroy
  - Global error handler on each worker: logs failed jobs, increments failure metrics

### BQ-002: QueueService
- **Priority**: P0
- **Description**: Service class providing a typed interface to add jobs to any queue and check job status.
- **Acceptance Criteria**:
  - `addEmailJob(data: EmailJobData, opts?: JobOptions): Promise<string>` -- returns job ID
  - `addPdfJob(data: PdfJobData, opts?: JobOptions): Promise<string>`
  - `addEInvoiceJob(data: EInvoiceJobData, opts?: JobOptions): Promise<string>`
  - `addReorderCheckJob(data: ReorderCheckJobData, opts?: JobOptions): Promise<string>`
  - `addReportJob(data: ReportJobData, opts?: JobOptions): Promise<string>`
  - `addCleanupJob(data: CleanupJobData, opts?: JobOptions): Promise<string>`
  - `getJobStatus(queueName: string, jobId: string): Promise<JobStatus>`
  - `getQueueStats(queueName: string): Promise<QueueStats>`

```typescript
interface JobStatus {
  id: string;
  state: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'unknown';
  progress: number;      // 0-100
  result?: unknown;
  error?: string;
  attemptsMade: number;
  addedAt: number;
  processedAt?: number;
  finishedAt?: number;
}

interface QueueStats {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}
```

### BQ-003: Email Queue
- **Priority**: P0
- **Description**: Background queue for sending emails, decoupled from the request lifecycle.
- **Acceptance Criteria**:
  - Queue name: `email`
  - Concurrency: 5 (configurable via `QUEUE_EMAIL_CONCURRENCY`)
  - Job data:
    ```typescript
    interface EmailJobData {
      to: string;
      cc?: string;
      subject: string;
      template: string;       // Template name from apps/api/src/templates/
      context: Record<string, unknown>;  // Template variables
      attachments?: Array<{ filename: string; content: Buffer | string; contentType: string }>;
      organizationId: string;
      referenceType?: string;
      referenceId?: string;
      createdById?: string;
    }
    ```
  - Processor:
    1. Render template using Handlebars (existing template engine)
    2. Send via nodemailer (existing email module)
    3. Update `EmailLog` record: set status to `SENT` or `FAILED`
  - Retry strategy: 3 attempts with exponential backoff (30s, 120s, 300s)
  - On final failure: log error, update `EmailLog` status to `FAILED` with error message
  - Integration: `EmailService.sendEmail()` updated to add job to queue instead of sending inline

### BQ-004: PDF Queue
- **Priority**: P0
- **Description**: Background queue for generating PDF documents (invoices, POs, reports) using Puppeteer.
- **Acceptance Criteria**:
  - Queue name: `pdf`
  - Concurrency: 2 (configurable via `QUEUE_PDF_CONCURRENCY`; Puppeteer is memory-intensive)
  - Job data:
    ```typescript
    interface PdfJobData {
      type: 'invoice' | 'sales-order' | 'purchase-order' | 'bill' | 'credit-note' | 'vendor-credit' | 'report';
      entityId: string;
      organizationId: string;
      templateOverride?: string;
      locale?: 'en' | 'ms';
      requestedById: string;
    }
    ```
  - Processor:
    1. Fetch entity data from database
    2. Render HTML template with Handlebars
    3. Generate PDF via Puppeteer
    4. Store PDF in file storage (MinIO/S3)
    5. Return `{ url: string, size: number, pageCount: number }`
  - Retry strategy: 2 attempts with 60s delay
  - Job timeout: 60 seconds (kill Puppeteer if hung)
  - Worker reports progress: 0% (started), 50% (template rendered), 100% (PDF stored)

### BQ-005: E-Invoice Queue
- **Priority**: P0
- **Description**: Background queue for submitting e-Invoices to MyInvois (LHDN) with retry and rate limiting.
- **Acceptance Criteria**:
  - Queue name: `einvoice`
  - Concurrency: 1 (configurable via `QUEUE_EINVOICE_CONCURRENCY`; MyInvois has rate limits)
  - Job data:
    ```typescript
    interface EInvoiceJobData {
      invoiceId: string;
      submissionId: string;
      organizationId: string;
      action: 'submit' | 'check-status' | 'cancel';
      attempt?: number;
    }
    ```
  - Processor:
    1. Fetch invoice and e-Invoice settings
    2. Build XML document per MyInvois spec
    3. Submit to MyInvois API
    4. Update `EInvoiceSubmission` record with response
    5. If status is `PENDING` (MyInvois processing), add a delayed job to check status in 30 seconds
  - Retry strategy: 5 attempts with exponential backoff (60s, 300s, 900s, 1800s, 3600s)
  - Rate limiting: max 10 jobs per minute (use BullMQ rate limiter)
  - On final failure: update `EInvoiceSubmission.status` to `REJECTED`, set `lastError`
  - Integration: `EInvoiceService.submitInvoice()` adds job to queue instead of direct API call

### BQ-006: Reorder Check Queue (Scheduled)
- **Priority**: P1
- **Description**: Periodic cron job that checks stock levels against reorder points and generates alerts.
- **Acceptance Criteria**:
  - Queue name: `reorder`
  - Concurrency: 1
  - Scheduled: repeatable job with cron `0 */6 * * *` (every 6 hours)
  - Job data:
    ```typescript
    interface ReorderCheckJobData {
      organizationId?: string;  // null = all organizations
      warehouseId?: string;     // null = all warehouses
    }
    ```
  - Processor:
    1. For each organization (or specified org):
    2. Query all `ItemReorderSettings` where `isActive = true`
    3. Compare current `StockLevel.stockOnHand` against `reorderLevel`
    4. For items below reorder point, create `ReorderAlert` if none exists with status `PENDING`
    5. For items with `autoReorder = true`, generate draft Purchase Order grouped by preferred vendor
    6. Send email notification to org admins summarizing new alerts
  - Retry strategy: 2 attempts with 300s delay
  - Worker reports progress based on organizations processed
  - Integration: existing `ReorderService.checkReorderLevels()` becomes the processor logic

### BQ-007: Report Queue
- **Priority**: P1
- **Description**: Background queue for generating large or computationally expensive reports.
- **Acceptance Criteria**:
  - Queue name: `report`
  - Concurrency: 1 (configurable via `QUEUE_REPORT_CONCURRENCY`)
  - Job data:
    ```typescript
    interface ReportJobData {
      type: 'sales-summary' | 'purchase-summary' | 'stock-valuation' | 'inventory-movement'
            | 'aging-receivables' | 'aging-payables' | 'purchase-by-vendor' | 'stock-aging'
            | 'profit-loss';
      params: Record<string, unknown>;  // Date range, filters, etc.
      format: 'json' | 'pdf' | 'xlsx';
      organizationId: string;
      requestedById: string;
    }
    ```
  - Processor:
    1. Execute report query (calls existing `ReportsService` methods)
    2. If format is `pdf`: add sub-job to PDF queue
    3. If format is `xlsx`: generate Excel file via `exceljs` (already in deps)
    4. Cache result in Redis with 15-minute TTL (key: `ims:report:{orgId}:{type}:{paramsHash}`)
    5. Return `{ data?: unknown, fileUrl?: string, cachedUntil: string }`
  - Retry strategy: 2 attempts with 120s delay
  - Job timeout: 120 seconds
  - Worker reports progress: 0% (querying), 50% (processing), 100% (complete)
  - Integration: `ReportsController` updated to return job ID for large reports, redirect to cache for small ones

### BQ-008: Cleanup Queue (Scheduled)
- **Priority**: P2
- **Description**: Daily cleanup of expired or stale data.
- **Acceptance Criteria**:
  - Queue name: `cleanup`
  - Concurrency: 1
  - Scheduled: repeatable job with cron `0 2 * * *` (daily at 2 AM, server timezone)
  - Job data:
    ```typescript
    interface CleanupJobData {
      tasks: Array<'expired-quotes' | 'stale-drafts' | 'old-logs' | 'expired-tokens' | 'temp-files'>;
    }
    ```
  - Processor tasks:
    1. **Expired quotes**: Delete sales quotes older than 90 days with status DRAFT
    2. **Stale drafts**: Auto-close sales orders and POs in DRAFT status older than 60 days (update status, do not delete)
    3. **Old email logs**: Delete `EmailLog` records older than 90 days with status SENT
    4. **Expired refresh tokens**: Clean up `RefreshToken` records with `expiresAt` in the past (DB legacy tokens)
    5. **Temp files**: Delete temporary uploaded files older than 24 hours from MinIO temp bucket
  - Each task logs count of affected records
  - Retry strategy: 1 attempt (no retry, will run again next day)

### BQ-009: Job Status API
- **Priority**: P1
- **Description**: REST API endpoint for clients to check the status of async jobs.
- **Acceptance Criteria**:

#### `GET /api/v1/jobs/:queueName/:jobId`
Response:
```typescript
interface JobStatusResponse {
  id: string;
  queue: string;
  state: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed';
  progress: number;
  result?: unknown;
  error?: string;
  attemptsMade: number;
  timestamps: {
    added: string;
    processed?: string;
    finished?: string;
  };
}
```

  - Requires authentication (any authenticated user)
  - Organization check: job data must contain matching `organizationId` (users cannot see other orgs' jobs)
  - 404 if job not found

### BQ-010: Bull Board Dashboard
- **Priority**: P2
- **Description**: Admin-only web UI for monitoring and managing queues.
- **Acceptance Criteria**:
  - Mounted at `/admin/queues` via `@bull-board/express` adapter
  - Protected by JWT auth middleware + role check (`ADMIN` only)
  - Shows all 6 queues with:
    - Waiting / Active / Completed / Failed / Delayed counts
    - Job list with details
    - Retry failed jobs
    - Clean completed/failed jobs
  - Enabled only when `BULL_BOARD_ENABLED=true`
  - Not available in production unless explicitly enabled

### BQ-011: Dead Letter Queue Handling
- **Priority**: P1
- **Description**: Handle jobs that exhaust all retry attempts.
- **Acceptance Criteria**:
  - When a job fails all retries, BullMQ moves it to the failed state
  - A global `failed` event listener on each worker:
    1. Logs the failure with full context (job data, error, attempt count)
    2. For `einvoice` queue: update `EInvoiceSubmission.status = 'REJECTED'`
    3. For `email` queue: update `EmailLog.status = 'FAILED'`
    4. For critical queues (`einvoice`, `email`): send notification email to org admin
    5. Increment a `dead_letter_count` metric (for future monitoring integration)
  - Admin can retry failed jobs via Bull Board UI or API endpoint

### BQ-012: Frontend AsyncJobIndicator Component
- **Priority**: P1
- **Description**: Reusable frontend component that polls job status and shows progress.
- **Acceptance Criteria**:
  - Component: `apps/web/src/components/AsyncJobIndicator.tsx`
  - Props:
    ```typescript
    interface AsyncJobIndicatorProps {
      queueName: string;
      jobId: string;
      title: string;          // e.g. "Generating Invoice PDF..."
      onComplete?: (result: unknown) => void;
      onError?: (error: string) => void;
      pollInterval?: number;  // default 2000ms
    }
    ```
  - Behavior:
    - Shows Ant Design `Spin` with title while job is `waiting` or `active`
    - Shows `Progress` bar when `progress` is available (0-100)
    - Shows `Result` (success) when job completes, calls `onComplete`
    - Shows `Alert` (error) when job fails, calls `onError`
    - Stops polling when job reaches terminal state
  - Usage pattern:
    ```tsx
    // After submitting a report request
    const { jobId } = await requestReport(params);
    // Render:
    <AsyncJobIndicator
      queueName="report"
      jobId={jobId}
      title="Generating report..."
      onComplete={(result) => router.push(result.fileUrl)}
    />
    ```
  - Hook: `apps/web/src/hooks/use-job-status.ts` wrapping `@tanstack/react-query` with polling

## Queue Configuration Summary

| Queue | Concurrency | Retry | Backoff | Rate Limit | Schedule |
|-------|------------|-------|---------|------------|----------|
| `email` | 5 | 3x | 30s, 120s, 300s | - | On demand |
| `pdf` | 2 | 2x | 60s | - | On demand |
| `einvoice` | 1 | 5x | 60s-3600s exponential | 10/min | On demand |
| `reorder` | 1 | 2x | 300s | - | Every 6 hours |
| `report` | 1 | 2x | 120s | - | On demand |
| `cleanup` | 1 | 0 | - | - | Daily 2 AM |

## File Structure

### Backend
```
apps/api/src/common/queue/
  queue.module.ts
  queue.service.ts
  queue.constants.ts         # Queue names, default options
  bull-board.controller.ts   # Admin dashboard mount
  processors/
    email.processor.ts
    pdf.processor.ts
    einvoice.processor.ts
    reorder.processor.ts
    report.processor.ts
    cleanup.processor.ts
  dto/
    job-data.dto.ts          # All job data interfaces
    job-status.dto.ts
  __tests__/
    queue.service.spec.ts
    email.processor.spec.ts
    einvoice.processor.spec.ts
```

### Frontend
```
apps/web/src/
  components/AsyncJobIndicator.tsx
  hooks/use-job-status.ts
  lib/jobs.ts               # API client for job status
```

## Integration Points

### AppModule Changes
```typescript
import { QueueModule } from './common/queue/queue.module';

@Module({
  imports: [
    // ... existing imports
    RedisModule,    // Must be imported before QueueModule
    QueueModule,
    // ...
  ],
})
```

### EmailModule Changes
- `EmailService.sendEmail()`: instead of sending inline via nodemailer, calls `QueueService.addEmailJob()`
- `EmailService.sendEmailSync()`: retained for critical auth emails (password reset) that must be sent immediately

### EInvoiceModule Changes
- `EInvoiceService.submitInvoice()`: adds job to `einvoice` queue instead of making direct HTTP call
- `EInvoiceService.checkSubmissionStatus()`: adds delayed status-check job

### ReportsModule Changes
- Large reports (> configurable threshold): return `{ jobId, status: 'processing' }` and add to `report` queue
- Small reports (< threshold): execute inline and return data directly
- Frontend checks response: if `jobId` is present, renders `AsyncJobIndicator`; otherwise displays data

### ReorderModule Changes
- `ReorderModule` registers the cron job on init via `QueueService`
- Manual trigger via existing API endpoint also adds to queue

## Error Handling

### Retry Strategy Details
```typescript
// Default retry options used per queue
const DEFAULT_JOB_OPTIONS: DefaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 30000, // 30 seconds initial
  },
  removeOnComplete: {
    age: 86400,   // 24 hours
    count: 1000,  // Keep last 1000
  },
  removeOnFail: {
    age: 604800,  // 7 days
    count: 5000,  // Keep last 5000
  },
};
```

### E-Invoice Specific Retry
```typescript
const EINVOICE_JOB_OPTIONS: DefaultJobOptions = {
  attempts: 5,
  backoff: {
    type: 'exponential',
    delay: 60000,   // 1 minute initial, grows to ~1 hour
  },
  rateLimiter: {
    max: 10,
    duration: 60000, // 10 per minute
  },
};
```
