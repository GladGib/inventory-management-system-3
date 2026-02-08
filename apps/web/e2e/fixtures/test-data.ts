/**
 * Reusable test-data helpers for E2E tests.
 *
 * Each factory function generates unique values via Date.now() so that
 * multiple test runs do not collide.
 */

const ts = () => Date.now().toString(36);

/** Generate a test item payload suitable for the create-item form / API. */
export function createTestItem(overrides: Record<string, string> = {}) {
  return {
    name: `E2E Test Item ${ts()}`,
    sku: `E2E-${ts()}`,
    sellingPrice: '100.00',
    costPrice: '50.00',
    unit: 'PCS',
    type: 'INVENTORY',
    ...overrides,
  };
}

/** Generate a test contact payload. */
export function createTestContact(overrides: Record<string, string> = {}) {
  return {
    name: `E2E Test Customer ${ts()}`,
    email: `e2e-${ts()}@test.com`,
    phone: '+60123456789',
    company: `E2E Test Company ${ts()}`,
    ...overrides,
  };
}

/** Generate a minimal sales-order line item. */
export function createTestSalesOrderLine(overrides: Record<string, unknown> = {}) {
  return {
    quantity: 2,
    unitPrice: 100,
    description: `Test line ${ts()}`,
    ...overrides,
  };
}
