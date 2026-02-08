# Security Audit Procedures

## Overview
Comprehensive security hardening and audit procedures for the IMS application, covering the OWASP Top 10, middleware configuration, audit logging, dependency scanning, and security testing scripts. The system handles financial transactions and PII (customer/vendor data) for Malaysian SMEs, making security a regulatory and business requirement.

## Architecture

### New Files
- `apps/api/src/common/audit/audit.module.ts` - Audit logging module
- `apps/api/src/common/audit/audit.service.ts` - Audit trail service
- `apps/api/src/common/audit/audit.interceptor.ts` - Auto-capture interceptor
- `apps/api/src/common/audit/audit.controller.ts` - Admin audit log viewer API
- `apps/api/src/common/security/` - Security middleware and utilities
- `scripts/security-audit.sh` - Dependency and configuration audit script
- `scripts/security-headers-test.ts` - HTTP security headers verification

### Database Addition
New Prisma model for audit trail (added to `apps/api/prisma/schema.prisma`).

## Requirements

### SEC-001: OWASP #1 - Injection Prevention
- **Priority**: P0
- **Description**: Verify and enforce injection prevention across all data paths.
- **Acceptance Criteria**:
  - **SQL Injection**: All database queries use Prisma Client (parameterized by default). Audit for any usage of `$queryRaw` or `$executeRaw`:
    - If found, verify parameters are passed as template literals (Prisma's tagged template parameterization), never string concatenation
    - Add ESLint rule or grep script to flag `$queryRaw` / `$executeRaw` with string concatenation
  - **NoSQL Injection**: Not applicable (PostgreSQL only)
  - **Command Injection**: No `child_process.exec()` or `eval()` in codebase. If Puppeteer shell commands are needed, use `execFile()` with explicit arguments
  - **Template Injection**: Handlebars templates for email/PDF use triple-brace `{{{safe}}}` only for pre-sanitized HTML; all user data uses double-brace `{{escaped}}`
  - **Validation**: All controller DTOs use `class-validator` decorators (already enforced via global `ValidationPipe` with `whitelist: true, forbidNonWhitelisted: true`)
  - **Audit script**: `scripts/security-audit.sh` includes a grep for raw query usage, eval, exec patterns

### SEC-002: OWASP #2 - Broken Authentication
- **Priority**: P0
- **Description**: Harden authentication mechanisms against common attacks.
- **Acceptance Criteria**:
  - **JWT Access Token**: 15-minute expiry (already implemented in auth module)
  - **Refresh Token Rotation**: On each refresh, old token is invalidated (already implemented)
  - **Brute Force Protection**: Rate limit on auth endpoints:
    - `POST /auth/login`: 5 attempts per 15 minutes per IP
    - `POST /auth/register`: 3 attempts per 15 minutes per IP
    - `POST /auth/refresh`: 10 attempts per 15 minutes per IP
    - Implemented via `@Throttle()` decorator with custom limits on auth controller
  - **Password Requirements**: Minimum 8 characters, must contain uppercase, lowercase, and number (enforce in RegisterDto)
  - **Password Hashing**: bcryptjs with salt rounds >= 10 (already using bcryptjs)
  - **Account Lockout**: After 10 consecutive failed login attempts, lock account for 30 minutes
    - Add `failedLoginAttempts: number` and `lockedUntil: DateTime?` fields to User model
    - Reset on successful login
    - Return generic "Invalid credentials" message (do not reveal if account exists)
  - **Token Storage**: Frontend stores tokens in memory (Zustand store) with persistence to localStorage; consider HttpOnly cookies for production
  - **Logout**: Invalidates refresh token in Redis/DB, clears client-side tokens

### SEC-003: OWASP #3 - Sensitive Data Exposure
- **Priority**: P0
- **Description**: Protect sensitive data at rest and in transit.
- **Acceptance Criteria**:
  - **Encryption at Rest**:
    - `EInvoiceSettings.clientSecret`: Encrypt before storing in DB using AES-256-GCM
    - `OrganizationEmailSettings.smtpPass`: Encrypt before storing
    - Utility: `apps/api/src/common/security/encryption.service.ts`
      ```typescript
      class EncryptionService {
        encrypt(plaintext: string): string;   // Returns base64(iv:ciphertext:tag)
        decrypt(ciphertext: string): string;
      }
      ```
    - Encryption key: `ENCRYPTION_KEY` env var (32-byte hex string)
  - **No Secrets in Logs**: Scrub sensitive fields from log output:
    - Password, token, secret, apiKey, creditCard fields masked in any log output
    - `AllExceptionsFilter` does not log request body for auth endpoints
    - Prisma query logs (if enabled in development) do not include sensitive field values
  - **API Response Sanitization**:
    - User `passwordHash` field excluded from all API responses (already via Prisma select/exclude)
    - `EInvoiceSettings.clientSecret` returned as masked `"****"` in GET responses
    - `OrganizationEmailSettings.smtpPass` returned as masked in GET responses
  - **HTTPS**: Enforce in production (handled by reverse proxy/load balancer; add `X-Forwarded-Proto` check)
  - **Environment Variables**: `.env` file in `.gitignore` (already there); `.env.example` contains only placeholder values, no real secrets

### SEC-004: OWASP #4 - XXE (XML External Entity)
- **Priority**: P1
- **Description**: Prevent XXE attacks in XML processing.
- **Acceptance Criteria**:
  - The only XML processing in the application is e-Invoice XML generation for MyInvois
  - XML is **generated** (not parsed from user input), so XXE risk is minimal
  - If any future XML parsing is added (e.g., importing vendor XML catalogs):
    - Use a safe XML parser with external entity resolution disabled
    - Document this requirement in the e-Invoice module README
  - Verify: no `xml2js`, `libxmljs`, or other XML parsers in `package.json` that accept external input
  - If XML parsing is needed: use `fast-xml-parser` with `{ ignoreAttributes: false, parseTagValue: false }` and explicit entity rejection

### SEC-005: OWASP #5 - Broken Access Control
- **Priority**: P0
- **Description**: Enforce authorization on every API endpoint with organization-level data isolation.
- **Acceptance Criteria**:
  - **Authentication Guard**: Every endpoint (except `/health`, `/auth/login`, `/auth/register`, `/api/docs`) requires a valid JWT
    - Global `JwtAuthGuard` already applied via `APP_GUARD`
    - Public endpoints use `@Public()` decorator to bypass
  - **Role-Based Access Control (RBAC)**:
    - `@Roles('ADMIN')` decorator on admin-only endpoints
    - `RolesGuard` checks `user.role` from JWT payload
    - Role hierarchy: `ADMIN > MANAGER > STAFF > VIEWER`
    - Viewer role: read-only access (GET endpoints only)
  - **Organization Isolation (Tenant Isolation)**:
    - Every data query MUST include `organizationId` filter matching the authenticated user's organization
    - Middleware or interceptor injects `organizationId` from JWT into service calls
    - Audit: review all Prisma queries to ensure `organizationId` is included in WHERE clause
    - No endpoint allows accessing data from another organization
  - **Object-Level Authorization**:
    - When accessing a specific resource (e.g., `GET /items/:id`), verify the item belongs to the user's organization
    - Return 404 (not 403) for resources in other organizations (prevent enumeration)
  - **Endpoint Authorization Matrix**:

| Endpoint Group | ADMIN | MANAGER | STAFF | VIEWER |
|---------------|-------|---------|-------|--------|
| Settings, Users, Audit | Full | Read | None | None |
| Items, Contacts | Full | Full | Create/Edit | Read |
| Sales, Purchases | Full | Full | Create/Edit | Read |
| Reports, Dashboard | Full | Full | Read | Read |
| E-Invoice | Full | Full | Submit | Read |
| Backup | Full | None | None | None |

### SEC-006: OWASP #6 - Security Misconfiguration
- **Priority**: P0
- **Description**: Harden server configuration and remove development artifacts from production.
- **Acceptance Criteria**:
  - **Helmet Middleware** (already in `main.ts`):
    - Verify `helmet()` is called with recommended defaults
    - Add explicit Content-Security-Policy for API responses:
      ```typescript
      app.use(helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "blob:"],
          },
        },
        crossOriginEmbedderPolicy: false, // Allow Swagger UI in dev
      }));
      ```
  - **CORS Configuration** (already in `main.ts`):
    - Production: whitelist only the specific frontend domain
    - Development: allow `http://localhost:3000`
    - No wildcard `*` origin
    - `credentials: true` (already set)
  - **Disable X-Powered-By**: Helmet does this by default, verify
  - **Swagger UI**: Only available when `NODE_ENV !== 'production'` (already implemented)
  - **Error Messages**: Production error responses do not include stack traces or internal details
    - `AllExceptionsFilter` already handles this; verify no stack leak in 500 responses
  - **Default Accounts**: No default admin passwords in production seed
  - **Debug Mode**: Ensure `NestJS` debug logging is disabled in production
  - **File Upload Limits**: Max 10MB per file, validated in Multer config
  - **API Request Size**: Max 1MB JSON body (default Express limit is 100KB; already configured to 10MB for file uploads -- tighten for non-file endpoints)
    ```typescript
    // For non-file routes
    app.use(express.json({ limit: '1mb' }));
    // File upload routes use Multer with 10MB limit
    ```

### SEC-007: OWASP #7 - Cross-Site Scripting (XSS)
- **Priority**: P1
- **Description**: Prevent XSS in both frontend and API.
- **Acceptance Criteria**:
  - **React Auto-escaping**: React/Next.js escapes JSX expressions by default. Audit for `dangerouslySetInnerHTML` usage:
    - If found, verify input is sanitized with DOMPurify before rendering
    - Search highlight rendering (`<em>` tags from Elasticsearch) should use a whitelist sanitizer that allows only `<em>` and `<mark>`
  - **CSP Headers**: Content-Security-Policy header on API responses (via Helmet, see SEC-006)
  - **Frontend CSP**: Add CSP meta tag or headers in Next.js config:
    ```javascript
    // next.config.js
    async headers() {
      return [{
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '0' }, // Rely on CSP instead
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      }];
    }
    ```
  - **Rich Text Fields**: If any field accepts HTML (e.g., `termsConditions`, `notes`):
    - Sanitize on input (API DTO transform) using a library like `sanitize-html`
    - Allow only safe tags: `<p>, <br>, <strong>, <em>, <ul>, <ol>, <li>, <a>`
    - Strip all event handlers, scripts, and iframes
  - **Stored XSS Prevention**: Validate and sanitize all text fields that are rendered in the UI

### SEC-008: OWASP #8 - Insecure Deserialization
- **Priority**: P0
- **Description**: Validate all incoming request data.
- **Acceptance Criteria**:
  - **DTO Validation**: Every controller method accepts a typed DTO class with `class-validator` decorators
  - **Global Validation Pipe**: Already configured with:
    - `whitelist: true` -- strips properties not in the DTO
    - `forbidNonWhitelisted: true` -- rejects requests with unknown properties
    - `transform: true` -- auto-transforms payload to DTO class instance
  - **Array Validation**: DTOs containing arrays use `@ValidateNested({ each: true })` and `@Type()`
  - **Numeric Validation**: All numeric fields use `@IsNumber()` or `@IsDecimal()` with appropriate constraints
  - **String Length**: All string fields have `@MaxLength()` to prevent oversized payloads
  - **JSON Fields**: Prisma `Json` type fields (addresses, settings) validated with custom validators or Zod schemas before storage
  - **Audit**: Review all DTO files for completeness; flag any controller method accepting `@Body() body: any`

### SEC-009: OWASP #9 - Vulnerable Dependencies
- **Priority**: P0
- **Description**: Automated dependency vulnerability scanning.
- **Acceptance Criteria**:
  - **npm audit**: Run `npm audit --production` in CI pipeline
  - **Script**: `scripts/security-audit.sh`
    ```bash
    #!/bin/bash
    echo "=== Dependency Audit ==="
    cd apps/api && pnpm audit --production 2>&1
    cd ../web && pnpm audit --production 2>&1

    echo "=== High/Critical Vulnerabilities ==="
    cd ../api && pnpm audit --production --audit-level=high 2>&1
    EXIT_CODE=$?

    echo "=== Raw Query Audit ==="
    grep -rn '\$queryRaw\|\$executeRaw' apps/api/src/ || echo "No raw queries found"

    echo "=== Eval/Exec Audit ==="
    grep -rn 'eval(\|new Function(\|child_process' apps/api/src/ || echo "No eval/exec found"

    exit $EXIT_CODE
    ```
  - **CI Integration**: Security audit runs on every PR; fails if high/critical vulnerabilities found
  - **Snyk (optional)**: If Snyk token is available, run `snyk test` for deeper analysis
  - **Dependabot / Renovate**: Enable automated dependency update PRs on the repository
  - **Lock File**: `pnpm-lock.yaml` always committed; verify integrity in CI

### SEC-010: OWASP #10 - Insufficient Logging & Monitoring
- **Priority**: P0
- **Description**: Comprehensive audit trail for all financial transactions and security events.
- **Acceptance Criteria**:
  - **Audit Log Model** (Prisma schema addition):
    ```prisma
    model AuditLog {
      id             String   @id @default(cuid())
      userId         String?
      userName       String?
      action         String   // CREATE, UPDATE, DELETE, LOGIN, LOGOUT, EXPORT, etc.
      entityType     String   // Item, SalesOrder, Invoice, Contact, User, etc.
      entityId       String?
      oldValues      Json?    // Previous state (for UPDATE)
      newValues      Json?    // New state (for CREATE, UPDATE)
      changes        Json?    // Diff of changed fields only
      ipAddress      String?
      userAgent      String?
      organizationId String
      metadata       Json?    // Additional context
      createdAt      DateTime @default(now())

      @@index([organizationId, createdAt])
      @@index([entityType, entityId])
      @@index([userId])
      @@index([action])
    }
    ```
  - **AuditService**:
    ```typescript
    class AuditService {
      log(entry: {
        userId?: string;
        userName?: string;
        action: AuditAction;
        entityType: string;
        entityId?: string;
        oldValues?: Record<string, unknown>;
        newValues?: Record<string, unknown>;
        ipAddress?: string;
        userAgent?: string;
        organizationId: string;
        metadata?: Record<string, unknown>;
      }): Promise<void>;
    }
    ```
  - **Automatic Diffing**: When `oldValues` and `newValues` are both provided, service computes `changes` (diff of modified fields only)
  - **AuditInterceptor**: Optional decorator-based interceptor `@Auditable(entityType, action)` that:
    1. Captures request IP and user agent
    2. For UPDATE: fetches current entity state before handler (oldValues)
    3. After handler: captures new state (newValues)
    4. Writes audit log entry
  - **Mandatory Audit Events**:

| Event | Entity Type | Action | Priority |
|-------|-------------|--------|----------|
| User login (success/failure) | User | LOGIN / LOGIN_FAILED | P0 |
| User logout | User | LOGOUT | P0 |
| Sales Order created | SalesOrder | CREATE | P0 |
| Sales Order confirmed | SalesOrder | CONFIRM | P0 |
| Invoice created | Invoice | CREATE | P0 |
| Payment recorded | Payment | CREATE | P0 |
| Purchase Order created | PurchaseOrder | CREATE | P0 |
| Bill recorded | Bill | CREATE | P0 |
| Stock adjustment | StockAdjustment | CREATE | P0 |
| Inventory transfer | InventoryTransfer | CREATE | P0 |
| Item created/updated/deleted | Item | CREATE/UPDATE/DELETE | P1 |
| Contact created/updated | Contact | CREATE/UPDATE | P1 |
| Price change | Item | PRICE_CHANGE | P0 |
| User role changed | User | ROLE_CHANGE | P0 |
| E-Invoice submitted | EInvoiceSubmission | SUBMIT | P0 |
| Data export | Report | EXPORT | P1 |
| Settings changed | Settings | UPDATE | P1 |
| Backup triggered | Backup | CREATE | P0 |

  - **Retention**: Audit logs retained for 2 years minimum (Malaysian regulatory requirement for business records)

### SEC-011: Audit Log API
- **Priority**: P1
- **Description**: Admin-only API to view audit logs.
- **Acceptance Criteria**:

#### `GET /api/v1/admin/audit-log`
- **Auth**: Required, ADMIN role only
- **Query Parameters**:
  | Param | Type | Default | Description |
  |-------|------|---------|-------------|
  | `page` | number | 1 | Page number |
  | `limit` | number | 50 | Results per page (max 100) |
  | `userId` | string | - | Filter by user |
  | `action` | string | - | Filter by action type |
  | `entityType` | string | - | Filter by entity type |
  | `entityId` | string | - | Filter by specific entity |
  | `from` | ISO date | - | Start date |
  | `to` | ISO date | - | End date |
  | `search` | string | - | Search in userName or entityType |

- **Response**:
  ```typescript
  interface AuditLogResponse {
    data: Array<{
      id: string;
      userId: string | null;
      userName: string | null;
      action: string;
      entityType: string;
      entityId: string | null;
      changes: Record<string, { old: unknown; new: unknown }> | null;
      ipAddress: string | null;
      organizationId: string;
      createdAt: string;
    }>;
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }
  ```

#### `GET /api/v1/admin/audit-log/:entityType/:entityId`
- Returns audit history for a specific entity (e.g., all changes to item X)
- Sorted by `createdAt DESC`

### SEC-012: Security Headers Test Script
- **Priority**: P1
- **Description**: Automated script to verify security headers on API responses.
- **Acceptance Criteria**:
  - File: `scripts/security-headers-test.ts`
  - Tests:
    1. `X-Content-Type-Options: nosniff` is present
    2. `X-Frame-Options: DENY` or `SAMEORIGIN` is present
    3. `Strict-Transport-Security` header present (in production)
    4. `X-Powered-By` header is absent
    5. `Content-Security-Policy` header is present
    6. `X-XSS-Protection: 0` header present (modern CSP approach)
    7. `Referrer-Policy` header present
    8. CORS headers: `Access-Control-Allow-Origin` is not `*`
    9. `Cache-Control: no-store` on auth endpoints
    10. No sensitive information in error responses (test 404, 500 responses)
  - Output: pass/fail for each header check
  - Run: `npx ts-node scripts/security-headers-test.ts --url http://localhost:3001`

### SEC-013: Request Size Limits
- **Priority**: P1
- **Description**: Enforce appropriate request size limits to prevent denial of service.
- **Acceptance Criteria**:
  - Default JSON body limit: 1MB for all API routes
  - File upload limit: 10MB per file (via Multer configuration)
  - Total upload size per request: 50MB (for batch image uploads)
  - URL-encoded body limit: 1MB
  - Query string length limit: 2048 characters
  - Configuration in `main.ts`:
    ```typescript
    app.use(express.json({ limit: '1mb' }));
    app.use(express.urlencoded({ limit: '1mb', extended: true }));
    ```
  - Multer configuration on file upload routes:
    ```typescript
    MulterModule.register({
      limits: {
        fileSize: 10 * 1024 * 1024,  // 10MB per file
        files: 10,                     // Max 10 files per request
      },
      fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
        cb(null, allowed.includes(file.mimetype));
      },
    });
    ```

## File Structure
```
apps/api/src/common/
  audit/
    audit.module.ts
    audit.service.ts
    audit.interceptor.ts
    audit.controller.ts
    dto/
      query-audit-log.dto.ts
    __tests__/
      audit.service.spec.ts
  security/
    encryption.service.ts
    sanitize.util.ts            # HTML sanitization for rich text fields
    __tests__/
      encryption.service.spec.ts

scripts/
  security-audit.sh             # Dependency and code pattern audit
  security-headers-test.ts      # HTTP header verification
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `ENCRYPTION_KEY` | 32-byte hex key for AES-256-GCM | Yes (production) |
| `JWT_SECRET` | JWT signing secret | Yes (existing) |
| `JWT_REFRESH_SECRET` | Refresh token signing secret | Yes (existing) |
| `FRONTEND_URL` | Allowed CORS origin | Yes (existing) |
| `NODE_ENV` | Environment identifier | Yes (existing) |

## Implementation Priority

1. **Immediate (P0)**: SEC-001 (injection audit), SEC-002 (auth hardening), SEC-005 (RBAC verification), SEC-008 (DTO audit), SEC-010 (audit logging)
2. **Short-term (P1)**: SEC-003 (encryption), SEC-006 (Helmet config), SEC-007 (XSS), SEC-009 (dep scanning), SEC-011 (audit API), SEC-012 (headers test)
3. **Ongoing**: SEC-004 (XXE awareness), SEC-013 (request limits), dependency updates
