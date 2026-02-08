# Performance Testing

## Overview
Establish a k6-based performance testing suite that validates API response times, throughput, and stability under load. Tests cover five scenarios (smoke, load, stress, spike, soak) against a realistically seeded database with 10,000 items, 5,000 contacts, and 50,000 transactions. Results inform capacity planning and identify bottlenecks before production deployment.

## Architecture

### Test Location
- `tests/performance/` - All performance test scripts and utilities
- `tests/performance/scenarios/` - k6 test scenario files
- `tests/performance/helpers/` - Shared utilities (auth, data generators)
- `tests/performance/seed.ts` - Database seed script for performance data
- `tests/performance/k6.config.js` - Shared k6 configuration

### Dependencies
**System-level (not in package.json):**
- [k6](https://k6.io/) v0.49+ installed globally or via Docker
- Docker image: `grafana/k6:latest`

**Project (root package.json devDependencies):**
```json
{
  "@types/k6": "^0.49.0"
}
```

**Seed script (uses existing project deps):**
- `@prisma/client` (already available)
- `faker` / `@faker-js/faker` for realistic data generation

### Configuration
Environment variables for k6 scripts:
```
K6_API_BASE_URL=http://localhost:3001/api/v1
K6_ADMIN_EMAIL=perf-admin@test.com
K6_ADMIN_PASSWORD=PerfTest123!
K6_VUS=50
K6_DURATION=5m
```

## Requirements

### PT-001: Performance Test Seed Script
- **Priority**: P0
- **Description**: Script to populate the database with realistic volume data for load testing.
- **Acceptance Criteria**:
  - File: `tests/performance/seed.ts`
  - Executable: `npx ts-node tests/performance/seed.ts`
  - Creates a dedicated performance test organization
  - Data volumes:

| Entity | Count | Notes |
|--------|-------|-------|
| Organization | 1 | "Performance Test Org" |
| Users | 10 | 1 admin, 3 managers, 6 staff |
| Warehouses | 3 | Main, Branch KL, Branch JB |
| Categories | 50 | 10 top-level, 40 sub-categories |
| Items | 10,000 | Mix of inventory/service/composite types |
| Item Groups | 200 | ~50 items per group |
| Contacts (Customers) | 3,000 | With Malaysian addresses |
| Contacts (Vendors) | 2,000 | With Malaysian addresses |
| Stock Levels | 30,000 | 10,000 items x 3 warehouses |
| Sales Orders | 20,000 | Spanning 12 months |
| Invoices | 15,000 | ~75% of sales orders invoiced |
| Payments | 10,000 | Mix of payment methods |
| Purchase Orders | 10,000 | Spanning 12 months |
| Bills | 8,000 | |
| Tax Rates | 5 | SST 10%, Service 6%, Zero-rated, Exempt, Out of scope |
| Price Lists | 5 | Retail, Wholesale, VIP, Cost, Special |

  - Data characteristics:
    - Item names use realistic auto parts terminology (brake pads, oil filters, spark plugs, etc.)
    - Part numbers follow OEM patterns (e.g., "04152-YZZA1", "15400-RTA-003")
    - SKUs follow format: `{CATEGORY}-{SEQUENTIAL}` (e.g., "BRK-00142")
    - Prices in MYR range: cost RM 5-500, selling RM 10-1000
    - Sales orders distributed with seasonal patterns (higher in Q4)
    - Payment methods weighted: Bank Transfer 40%, Cash 25%, Cheque 15%, FPX 10%, DuitNow 5%, Other 5%
  - Script is idempotent: can be re-run safely (drops and recreates perf org)
  - Runs in ~2 minutes
  - Outputs summary: entity counts and total time

### PT-002: Smoke Test
- **Priority**: P0
- **Description**: Single-user test verifying all critical endpoints respond within acceptable time.
- **Acceptance Criteria**:
  - File: `tests/performance/scenarios/smoke.js`
  - Configuration: 1 virtual user, 1 iteration
  - Tests all endpoints listed in PT-007
  - Thresholds:
    - Every request completes in < 500ms
    - 0% error rate
    - All expected HTTP status codes returned (200, 201)
  - Flow:
    1. Login (POST /auth/login)
    2. Get dashboard KPIs
    3. List items (page 1, 20 per page)
    4. Search items
    5. Get single item detail
    6. Get stock levels
    7. List contacts
    8. List sales orders
    9. Create a sales order
    10. Get single sales order
    11. Create an invoice from the sales order
    12. Get reports (sales summary)
    13. Health check
  - Output: Pass/fail per endpoint with response time

### PT-003: Load Test
- **Priority**: P0
- **Description**: Sustained load test simulating normal peak traffic.
- **Acceptance Criteria**:
  - File: `tests/performance/scenarios/load.js`
  - Configuration:
    ```
    stages: [
      { duration: '1m',  target: 25 },   // Ramp up
      { duration: '5m',  target: 50 },   // Sustained load
      { duration: '1m',  target: 0 },    // Ramp down
    ]
    ```
  - Thresholds:
    - p95 response time < 1000ms
    - p99 response time < 2000ms
    - Error rate < 1%
    - Throughput > 100 requests/second
  - Traffic distribution (weighted random):
    | Endpoint | Weight | Notes |
    |----------|--------|-------|
    | GET /dashboard/kpis | 15% | Most visited page |
    | GET /items (list) | 20% | Frequent browsing |
    | GET /items/:id | 10% | Item detail views |
    | GET /items (search) | 10% | Search queries |
    | GET /stock-levels | 10% | Inventory checks |
    | GET /contacts | 5% | Contact lookups |
    | GET /sales-orders | 10% | Order management |
    | POST /sales-orders | 5% | New order creation |
    | POST /invoices | 3% | Invoice creation |
    | GET /reports/* | 5% | Report viewing |
    | POST /auth/login | 2% | Login events |
    | GET /health | 5% | Health checks |
  - Each VU maintains its own auth session (login at start, reuse token)

### PT-004: Stress Test
- **Priority**: P1
- **Description**: Ramp beyond expected capacity to find the breaking point.
- **Acceptance Criteria**:
  - File: `tests/performance/scenarios/stress.js`
  - Configuration:
    ```
    stages: [
      { duration: '2m', target: 25 },    // Normal load
      { duration: '2m', target: 50 },    // Expected peak
      { duration: '2m', target: 75 },    // Above peak
      { duration: '2m', target: 100 },   // Stress
      { duration: '2m', target: 0 },     // Recovery
    ]
    ```
  - Thresholds (relaxed compared to load test):
    - p95 response time < 3000ms at 50 VUs
    - Error rate < 5% at 100 VUs
    - System recovers to normal response times during ramp-down
  - Identifies:
    - Breaking point (VU count where error rate exceeds 5%)
    - Maximum throughput before degradation
    - Recovery time after load drops

### PT-005: Spike Test
- **Priority**: P1
- **Description**: Sudden burst of traffic followed by return to normal.
- **Acceptance Criteria**:
  - File: `tests/performance/scenarios/spike.js`
  - Configuration:
    ```
    stages: [
      { duration: '2m',  target: 10 },   // Normal load
      { duration: '10s', target: 200 },   // Sudden spike
      { duration: '2m',  target: 200 },   // Sustained spike
      { duration: '10s', target: 10 },    // Drop back
      { duration: '2m',  target: 10 },    // Recovery
      { duration: '30s', target: 0 },     // Ramp down
    ]
    ```
  - Thresholds:
    - System does not crash during spike
    - Error rate returns to < 1% within 30 seconds of load drop
    - No memory leaks detected (memory usage returns to baseline)
  - Focus endpoints: GET /items, GET /dashboard/kpis (read-heavy spike)

### PT-006: Soak Test
- **Priority**: P2
- **Description**: Extended duration test to detect memory leaks and resource exhaustion.
- **Acceptance Criteria**:
  - File: `tests/performance/scenarios/soak.js`
  - Configuration:
    ```
    stages: [
      { duration: '2m',  target: 30 },   // Ramp up
      { duration: '30m', target: 30 },   // Sustained
      { duration: '2m',  target: 0 },    // Ramp down
    ]
    ```
  - Thresholds:
    - p95 response time remains < 1000ms throughout (no gradual degradation)
    - Error rate remains < 1% throughout
    - Memory usage does not grow > 20% from initial baseline
  - Monitoring during soak:
    - API server memory usage (via /health endpoint memory field)
    - Database connection pool utilization
    - Redis memory usage
  - Output includes memory trend chart data

### PT-007: Endpoint Coverage
- **Priority**: P0
- **Description**: All endpoints tested across performance scenarios.
- **Acceptance Criteria**:
  - Shared helper: `tests/performance/helpers/endpoints.js`

| Endpoint | Method | Auth | Test Data |
|----------|--------|------|-----------|
| `/auth/login` | POST | No | `{ email, password }` |
| `/items` | GET | Yes | `?page=1&limit=20` |
| `/items?search=brake` | GET | Yes | Random search terms from item corpus |
| `/items/:id` | GET | Yes | Random item ID from seeded data |
| `/inventory/stock-levels` | GET | Yes | `?warehouseId=...` |
| `/contacts` | GET | Yes | `?type=CUSTOMER&page=1` |
| `/contacts/:id` | GET | Yes | Random contact ID |
| `/sales-orders` | GET | Yes | `?page=1&limit=20&status=CONFIRMED` |
| `/sales-orders` | POST | Yes | Valid sales order payload (1-5 items) |
| `/sales-orders/:id` | GET | Yes | Random SO ID |
| `/invoices` | POST | Yes | Invoice from existing SO |
| `/dashboard/kpis` | GET | Yes | - |
| `/dashboard/sales-chart` | GET | Yes | `?period=30d` |
| `/dashboard/top-customers` | GET | Yes | - |
| `/dashboard/top-products` | GET | Yes | - |
| `/dashboard/inventory-status` | GET | Yes | - |
| `/reports/sales-summary` | GET | Yes | `?from=...&to=...` |
| `/reports/stock-valuation` | GET | Yes | - |
| `/health` | GET | No | - |

### PT-008: Test Helpers
- **Priority**: P0
- **Description**: Shared k6 utility functions for authentication, data generation, and assertions.
- **Acceptance Criteria**:
  - File: `tests/performance/helpers/auth.js`
    ```javascript
    // Authenticates a virtual user and returns the JWT token
    export function login(baseUrl, email, password) { ... }
    // Returns default headers with auth token
    export function authHeaders(token) { ... }
    ```
  - File: `tests/performance/helpers/data.js`
    ```javascript
    // Returns a random item ID from the seeded dataset
    export function randomItemId() { ... }
    // Returns a random contact ID
    export function randomContactId() { ... }
    // Generates a valid sales order payload
    export function generateSalesOrderPayload(customerId, itemIds) { ... }
    // Generates a valid invoice payload from a sales order
    export function generateInvoicePayload(salesOrderId) { ... }
    ```
  - File: `tests/performance/helpers/checks.js`
    ```javascript
    // Standard response checks
    export function checkResponse(res, expectedStatus = 200) { ... }
    // Timing checks
    export function checkTiming(res, maxDuration = 1000) { ... }
    ```
  - Pre-loaded data: The seed script writes a `tests/performance/data/seeded-ids.json` file containing arrays of item IDs, contact IDs, SO IDs for random selection in tests

### PT-009: Results Output
- **Priority**: P1
- **Description**: Performance test results in both machine-readable and human-readable formats.
- **Acceptance Criteria**:
  - k6 outputs:
    - JSON summary: `tests/performance/results/{scenario}_{timestamp}.json`
    - HTML report: `tests/performance/results/{scenario}_{timestamp}.html` (via `k6-reporter` extension or `handleSummary`)
    - Console summary with pass/fail thresholds
  - Custom `handleSummary` function in each scenario that writes both formats
  - Results include:
    - HTTP request duration: min, max, avg, med, p90, p95, p99
    - HTTP request rate (requests/second)
    - HTTP failure rate
    - VU count over time
    - Per-endpoint breakdown
  - Git-ignored: `tests/performance/results/` added to `.gitignore`

### PT-010: CI Integration
- **Priority**: P2
- **Description**: Integrate performance tests into CI pipeline.
- **Acceptance Criteria**:
  - Smoke tests: Run on every pull request
    - Uses Docker k6 image
    - Requires API server + PostgreSQL + Redis running (docker-compose)
    - Seed script runs before tests
    - Fails PR if any smoke threshold breached
  - Load tests: Run nightly (scheduled)
    - Results stored as CI artifact
    - Alert (Slack/email) if thresholds breached
  - CI script: `tests/performance/ci/run-smoke.sh`
    ```bash
    #!/bin/bash
    # Start services
    docker-compose up -d postgres redis
    # Wait for DB
    # Run migrations
    # Seed performance data
    npx ts-node tests/performance/seed.ts
    # Start API server
    # Run k6 smoke test
    k6 run tests/performance/scenarios/smoke.js
    # Capture exit code
    # Cleanup
    ```

## Thresholds Summary

| Scenario | p95 Latency | p99 Latency | Error Rate | Throughput |
|----------|-------------|-------------|------------|------------|
| Smoke | < 500ms | < 800ms | 0% | N/A |
| Load | < 1000ms | < 2000ms | < 1% | > 100 req/s |
| Stress | < 3000ms | < 5000ms | < 5% | > 50 req/s |
| Spike | (measured) | (measured) | Recovery < 1% | (measured) |
| Soak | < 1000ms | < 2000ms | < 1% | > 80 req/s |

## File Structure
```
tests/performance/
  seed.ts                         # Database seed script
  k6.config.js                    # Shared k6 configuration
  scenarios/
    smoke.js                      # 1 VU, all endpoints
    load.js                       # 50 VUs, 5 min
    stress.js                     # 0-100 VUs ramp, 10 min
    spike.js                      # Normal -> 200 VUs spike
    soak.js                       # 30 VUs, 30 min
  helpers/
    auth.js                       # Login and auth header helpers
    data.js                       # Random data generators
    checks.js                     # Response assertion helpers
    endpoints.js                  # Endpoint definitions and weights
  data/
    seeded-ids.json               # Generated by seed script
    search-terms.json             # Realistic search queries
  results/                        # Git-ignored output directory
    .gitkeep
  ci/
    run-smoke.sh                  # CI smoke test runner
    run-load.sh                   # CI load test runner (nightly)
```

## Running Tests

### Prerequisites
```bash
# Install k6 (macOS)
brew install k6

# Install k6 (Windows via Chocolatey)
choco install k6

# Or use Docker
docker pull grafana/k6
```

### Commands
```bash
# Seed the database
npx ts-node tests/performance/seed.ts

# Run individual scenarios
k6 run tests/performance/scenarios/smoke.js
k6 run tests/performance/scenarios/load.js
k6 run tests/performance/scenarios/stress.js
k6 run tests/performance/scenarios/spike.js
k6 run tests/performance/scenarios/soak.js

# Run with custom VUs and duration
k6 run --vus 100 --duration 10m tests/performance/scenarios/load.js

# Run with environment variables
k6 run -e K6_API_BASE_URL=http://staging:3001/api/v1 tests/performance/scenarios/load.js

# Run via Docker
docker run --rm -v $(pwd)/tests/performance:/scripts \
  --network=ims-network \
  grafana/k6 run /scripts/scenarios/smoke.js

# Generate HTML report
k6 run --out json=results.json tests/performance/scenarios/load.js
```
