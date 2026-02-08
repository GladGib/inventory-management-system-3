# Backup & Restore Procedures

## Overview
Establish automated and manual backup/restore procedures for the IMS database, uploaded files, and Redis data. Includes shell scripts, scheduled jobs via BullMQ, S3-compatible remote storage, a restore verification process, and an admin UI for managing backups. Targets an RTO (Recovery Time Objective) of 1 hour and RPO (Recovery Point Objective) of 24 hours.

## Architecture

### File Locations
- `scripts/backup.sh` - Database backup script
- `scripts/restore.sh` - Database restore script
- `scripts/backup-verify.sh` - Restore verification (to test database)
- `apps/api/src/modules/settings/backup/` - Backup management module
- `apps/web/src/app/(dashboard)/settings/backup/page.tsx` - Admin backup UI

### Dependencies
**System-level:**
- `pg_dump` and `pg_restore` (PostgreSQL client tools, matching server version 16)
- AWS CLI v2 or `s3cmd` for S3-compatible storage (DigitalOcean Spaces, MinIO)

**Backend (apps/api/package.json):**
```json
{
  "@aws-sdk/client-s3": "^3.500.0",
  "@aws-sdk/lib-storage": "^3.500.0"
}
```

### Configuration
Environment variables in `.env`:
```
# Backup storage
BACKUP_STORAGE=local              # local | s3
BACKUP_LOCAL_PATH=./backups       # Local backup directory
BACKUP_S3_BUCKET=ims-backups
BACKUP_S3_REGION=sgp1
BACKUP_S3_ENDPOINT=https://sgp1.digitaloceanspaces.com
BACKUP_S3_ACCESS_KEY=
BACKUP_S3_SECRET_KEY=

# Database connection (used by scripts, same as DATABASE_URL components)
PGHOST=localhost
PGPORT=5432
PGUSER=ims_user
PGPASSWORD=ims_password
PGDATABASE=ims_db

# Backup schedule
BACKUP_ENABLED=true
BACKUP_RETENTION_DAILY=7
BACKUP_RETENTION_WEEKLY=4
BACKUP_RETENTION_MONTHLY=12
```

## Requirements

### BR-001: Database Backup Script
- **Priority**: P0
- **Description**: Shell script for creating PostgreSQL database backups.
- **Acceptance Criteria**:
  - File: `scripts/backup.sh`
  - Uses `pg_dump` with `--format=custom` (compressed, supports selective restore)
  - Backup file naming: `ims_backup_YYYY-MM-DD_HH-MM.dump`
  - Script accepts options:
    ```bash
    Usage: ./scripts/backup.sh [OPTIONS]
      --output-dir DIR     Local directory for backup (default: ./backups)
      --upload-s3          Upload to S3 after local backup
      --s3-bucket BUCKET   S3 bucket name
      --compress           Additional gzip compression (on top of pg_dump custom format)
      --tables TABLE,...   Backup specific tables only
      --schema-only        Backup schema without data
      --verbose            Show detailed progress
    ```
  - Process:
    1. Verify `pg_dump` is available and correct version
    2. Create backup directory if not exists
    3. Run `pg_dump` with connection params from environment
    4. Verify backup file is non-zero size
    5. Calculate and log file size and SHA-256 checksum
    6. If `--upload-s3`: upload to S3 bucket with path `backups/daily/YYYY-MM-DD/filename.dump`
    7. Log success with timestamp, file size, and path
  - Exit codes: 0 (success), 1 (pg_dump failure), 2 (upload failure), 3 (config error)
  - Excludes tables: `_prisma_migrations` (can be regenerated)

### BR-002: Database Restore Script
- **Priority**: P0
- **Description**: Shell script for restoring PostgreSQL database from backup.
- **Acceptance Criteria**:
  - File: `scripts/restore.sh`
  - Uses `pg_restore` with `--clean --if-exists` flags
  - Script accepts options:
    ```bash
    Usage: ./scripts/restore.sh [OPTIONS] BACKUP_FILE
      --target-db DB       Restore to a specific database (default: from env)
      --from-s3 KEY        Download backup from S3 first
      --no-owner           Skip ownership restoration
      --data-only          Restore data without schema
      --schema-only        Restore schema without data
      --tables TABLE,...   Restore specific tables only
      --dry-run            Show what would be restored without executing
      --verbose            Show detailed progress
    ```
  - Safety checks:
    1. Confirm target database name (prompt unless `--force` flag)
    2. Verify backup file exists and is valid (`pg_restore --list` to check)
    3. Check target database is not the production database when running from development
    4. Display backup metadata: date, size, table count
  - Process:
    1. Download from S3 if `--from-s3` specified
    2. Display backup contents summary (`pg_restore --list`)
    3. Prompt for confirmation (unless `--force`)
    4. Run `pg_restore` against target database
    5. Run Prisma migrations to ensure schema is up to date: `npx prisma migrate deploy`
    6. Verify restoration: count rows in key tables, compare with backup metadata
    7. Log result with timestamp
  - Exit codes: 0 (success), 1 (restore failure), 2 (download failure), 3 (config error), 4 (verification failure)

### BR-003: Automated Daily Backup (BullMQ Scheduled Job)
- **Priority**: P0
- **Description**: Automated daily backup via BullMQ scheduled job (integrates with BullMQ Queue spec).
- **Acceptance Criteria**:
  - Adds a `backup` queue to the QueueModule (or reuses `cleanup` queue with a separate job type)
  - Cron schedule: `0 1 * * *` (daily at 1 AM server timezone, before cleanup at 2 AM)
  - Job processor:
    1. Executes `pg_dump` via `child_process.execFile()` (not `exec()` for security)
    2. Saves to local backup directory
    3. Uploads to S3 if configured (`BACKUP_STORAGE=s3`)
    4. Records backup metadata in database (new `BackupRecord` model)
    5. Runs retention policy cleanup (see BR-004)
    6. Sends notification email to admin on success or failure
  - Backup metadata stored in database:
    ```prisma
    model BackupRecord {
      id          String       @id @default(cuid())
      filename    String
      size        BigInt       // File size in bytes
      checksum    String       // SHA-256 hash
      type        BackupType   // DAILY, WEEKLY, MONTHLY, MANUAL
      storage     String       // local, s3
      storagePath String       // Full path or S3 key
      status      BackupStatus // COMPLETED, FAILED, DELETED
      duration    Int          // Backup duration in seconds
      tableCount  Int?         // Number of tables in backup
      error       String?      // Error message if failed
      createdAt   DateTime     @default(now())
      expiresAt   DateTime?    // When this backup should be cleaned up
    }

    enum BackupType {
      DAILY
      WEEKLY
      MONTHLY
      MANUAL
    }

    enum BackupStatus {
      IN_PROGRESS
      COMPLETED
      FAILED
      DELETED
      EXPIRED
    }
    ```
  - Graceful handling: if backup fails, log error and send alert, do not crash worker
  - Configuration: `BACKUP_ENABLED=true|false` master toggle

### BR-004: Backup Retention Policy
- **Priority**: P1
- **Description**: Automatic cleanup of old backups according to retention policy.
- **Acceptance Criteria**:
  - Retention defaults (configurable via env vars):
    - Daily backups: keep last 7
    - Weekly backups (Sunday): keep last 4
    - Monthly backups (1st of month): keep last 12
  - Promotion logic:
    - Every daily backup is stored
    - The daily backup from Sunday is also tagged as WEEKLY
    - The daily backup from the 1st of each month is also tagged as MONTHLY
    - Daily backups older than 7 days are deleted (unless they are also weekly/monthly)
    - Weekly backups older than 4 weeks are deleted (unless they are also monthly)
    - Monthly backups older than 12 months are deleted
  - Deletion process:
    1. Mark `BackupRecord.status = 'EXPIRED'`
    2. Delete local file
    3. Delete S3 object
    4. Update `BackupRecord.status = 'DELETED'`
  - Runs after each daily backup (part of the same BullMQ job)

### BR-005: File Storage Backup
- **Priority**: P1
- **Description**: Backup uploaded files (item images, documents) to S3-compatible storage.
- **Acceptance Criteria**:
  - Item images and document uploads are already stored in MinIO (S3-compatible) via docker-compose
  - For production: files should be stored directly in S3/DigitalOcean Spaces (not local MinIO)
  - Backup procedure for local MinIO (development/staging):
    - Use `mc mirror` (MinIO client) to sync MinIO bucket to S3 backup bucket
    - Or use `aws s3 sync` between MinIO endpoint and backup S3
  - Script: `scripts/backup-files.sh`
    ```bash
    # Sync MinIO uploads bucket to S3 backup
    aws s3 sync s3://ims-uploads s3://ims-backups/files/ \
      --endpoint-url http://localhost:9000 \
      --source-profile minio \
      --dest-profile backup-s3
    ```
  - Runs weekly (separate from database backup)

### BR-006: Redis Data Backup
- **Priority**: P2
- **Description**: Backup Redis data (RDB snapshot) for cache warm-up after restore.
- **Acceptance Criteria**:
  - Redis RDB file location: docker volume `redis_data`
  - Backup script: trigger `BGSAVE`, wait for completion, copy RDB file
  - Store alongside database backup in S3
  - Note: Redis data is ephemeral cache; losing it is acceptable (caches rebuild automatically). This backup is optional and low priority.
  - Primary purpose: preserve BullMQ job state across restores

### BR-007: Backup Management API
- **Priority**: P1
- **Description**: Admin-only API endpoints for managing backups.
- **Acceptance Criteria**:

#### `POST /api/v1/admin/backup/trigger`
- **Auth**: ADMIN role only
- **Body**:
  ```typescript
  interface TriggerBackupRequest {
    type?: 'MANUAL';          // Always MANUAL for API-triggered
    uploadToS3?: boolean;     // Default: use BACKUP_STORAGE setting
    description?: string;     // Optional note
  }
  ```
- **Response**: `{ id: string, status: 'IN_PROGRESS', message: 'Backup started' }`
- Adds a backup job to BullMQ queue (non-blocking)
- Rate limited: max 1 manual backup per hour

#### `GET /api/v1/admin/backup/history`
- **Auth**: ADMIN role only
- **Query Parameters**: `page`, `limit`, `type` (DAILY|WEEKLY|MONTHLY|MANUAL), `status`, `from`, `to`
- **Response**:
  ```typescript
  interface BackupHistoryResponse {
    data: Array<{
      id: string;
      filename: string;
      size: number;        // Bytes
      sizeHuman: string;   // "45.2 MB"
      type: string;
      storage: string;
      status: string;
      duration: number;    // Seconds
      checksum: string;
      createdAt: string;
      expiresAt: string | null;
    }>;
    meta: { total: number; page: number; limit: number };
    summary: {
      totalBackups: number;
      totalSize: number;
      lastSuccessful: string | null;
      lastFailed: string | null;
      nextScheduled: string;
    };
  }
  ```

#### `GET /api/v1/admin/backup/:id/download`
- **Auth**: ADMIN role only
- Returns pre-signed S3 URL (if S3 storage) or streams file (if local storage)
- URL expires after 15 minutes

#### `DELETE /api/v1/admin/backup/:id`
- **Auth**: ADMIN role only
- Deletes backup file and marks record as DELETED
- Cannot delete backup less than 24 hours old (safety measure)

### BR-008: Backup Restore Verification
- **Priority**: P1
- **Description**: Script to verify a backup is valid by restoring to a temporary database.
- **Acceptance Criteria**:
  - File: `scripts/backup-verify.sh`
  - Process:
    1. Create temporary database: `ims_db_verify_{timestamp}`
    2. Restore backup to temporary database
    3. Run verification queries:
       - Count rows in key tables (organizations, users, items, sales_orders, invoices)
       - Verify foreign key integrity (random sample of 100 records)
       - Verify data is readable (SELECT from each table)
    4. Compare row counts with backup metadata
    5. Drop temporary database
    6. Report: pass/fail with details
  - Can be run as part of monthly verification process
  - Exit code: 0 (verified), 1 (verification failed)

### BR-009: Frontend Backup Management Page
- **Priority**: P2
- **Description**: Admin settings page for viewing and managing backups.
- **Acceptance Criteria**:
  - Route: `/settings/backup` (admin-only, hidden from non-admin sidebar)
  - Layout:
    - **Summary Card**: Last successful backup (date, size), next scheduled, total storage used
    - **Trigger Button**: "Create Backup Now" button (confirms with modal, shows in-progress state)
    - **Backup History Table**: Sortable, filterable table of all backups with:
      - Columns: Date, Type (badge), Size, Duration, Status (badge), Actions
      - Actions: Download, Delete (with confirmation)
      - Filters: Type dropdown, Date range picker
      - Pagination
    - **Restore Instructions**: Expandable section with step-by-step restore documentation
      - Points to `scripts/restore.sh` usage
      - Includes emergency contact information
      - Notes about data loss window (RPO)
  - Components use Ant Design: `Card`, `Table`, `Button`, `Modal`, `Tag`, `Descriptions`
  - Loading states: skeleton while fetching, spinner during backup trigger

### BR-010: Disaster Recovery Runbook
- **Priority**: P1
- **Description**: Step-by-step disaster recovery procedure document.
- **Acceptance Criteria**:
  - File: `docs/disaster-recovery-runbook.md` (created only because this is operational documentation, not code documentation)
  - Contents:
    1. **Scenario 1: Database corruption / data loss**
       - Identify last good backup from `/settings/backup` or S3
       - Stop API servers
       - Restore database using `scripts/restore.sh`
       - Run `npx prisma migrate deploy`
       - Verify with `scripts/backup-verify.sh`
       - Restart API servers
       - Verify application functionality
       - Estimated time: 30-45 minutes
    2. **Scenario 2: Complete server failure**
       - Provision new server
       - Install dependencies (Node.js, PostgreSQL, Redis)
       - Clone repository, install packages
       - Restore database from S3 backup
       - Restore uploaded files from S3
       - Configure environment variables
       - Start services
       - Update DNS / load balancer
       - Estimated time: 60-90 minutes
    3. **Scenario 3: Redis failure**
       - Redis is non-critical (graceful degradation)
       - Restart Redis service
       - Caches rebuild automatically
       - BullMQ jobs may need re-processing
       - Estimated time: 5-10 minutes
    4. **Scenario 4: Accidental data deletion**
       - If within Redis cache TTL: data may still be in cache (not useful for DB)
       - Restore specific tables from backup: `scripts/restore.sh --tables <table>`
       - For single record: use audit log to reconstruct
       - Estimated time: 15-30 minutes
  - Includes contact information and escalation path
  - Reviewed and updated quarterly

## Recovery Targets

| Metric | Target | Description |
|--------|--------|-------------|
| RPO (Recovery Point Objective) | 24 hours | Maximum data loss window (daily backups) |
| RTO (Recovery Time Objective) | 1 hour | Time to restore full service |
| Backup window | < 10 minutes | Time to complete a database backup |
| Restore window | < 30 minutes | Time to restore from backup |

## File Structure
```
scripts/
  backup.sh                    # Database backup script
  restore.sh                   # Database restore script
  backup-verify.sh             # Restore verification
  backup-files.sh              # File storage sync
apps/api/src/modules/settings/backup/
  backup.module.ts
  backup.service.ts
  backup.controller.ts
  dto/
    trigger-backup.dto.ts
    query-backup.dto.ts
apps/web/src/app/(dashboard)/settings/backup/
  page.tsx
  components/
    BackupHistoryTable.tsx
    BackupSummaryCard.tsx
    RestoreInstructions.tsx
docs/
  disaster-recovery-runbook.md
backups/                       # Local backup directory (git-ignored)
  .gitkeep
```

## .gitignore Additions
```
# Backups
backups/*.dump
backups/*.gz
backups/*.sql
!backups/.gitkeep
```
