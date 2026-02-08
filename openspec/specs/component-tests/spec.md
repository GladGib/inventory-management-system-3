# Component Tests (React Testing Library)

## Overview
Establish a component testing infrastructure for the Next.js frontend application using React Testing Library, with custom render utilities that include all required providers (QueryClient, Ant Design ConfigProvider, LocaleProvider, AuthProvider). Test critical interactive components and custom hooks to achieve 60% component coverage and 80% hook coverage.

## Architecture

### Test Location
- `apps/web/src/__tests__/` - Test directory mirroring component structure
- `apps/web/src/__tests__/helpers/` - Shared test utilities and mocks
- `apps/web/jest.config.ts` - Jest configuration for the web app

### Dependencies
**Frontend (apps/web/package.json devDependencies):**
```json
{
  "@testing-library/react": "^16.1.0",
  "@testing-library/jest-dom": "^6.6.0",
  "@testing-library/user-event": "^14.5.2",
  "jest": "^29.7.0",
  "jest-environment-jsdom": "^29.7.0",
  "ts-jest": "^29.2.0",
  "@types/jest": "^29.5.14",
  "identity-obj-proxy": "^3.0.0",
  "msw": "^2.6.0"
}
```

### Configuration

#### `apps/web/jest.config.ts`
```typescript
import type { Config } from 'jest';
import nextJest from 'next/jest';

const createJestConfig = nextJest({
  dir: './',
});

const config: Config = {
  displayName: 'web',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.test.{ts,tsx}',
    '**/*.test.{ts,tsx}',
  ],
  setupFilesAfterSetup: ['<rootDir>/src/__tests__/helpers/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  collectCoverageFrom: [
    'src/components/**/*.{ts,tsx}',
    'src/hooks/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
  ],
  coverageThresholds: {
    global: {
      branches: 50,
      functions: 50,
      lines: 60,
      statements: 60,
    },
    './src/hooks/': {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(@ant-design|antd|rc-.*|@babel/runtime)/)',
  ],
};

export default createJestConfig(config);
```

#### `apps/web/src/__tests__/helpers/setup.ts`
```typescript
import '@testing-library/jest-dom';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    prefetch: jest.fn(),
    pathname: '/',
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

// Suppress Ant Design console warnings in tests
const originalWarn = console.warn;
console.warn = (...args: unknown[]) => {
  const message = typeof args[0] === 'string' ? args[0] : '';
  if (message.includes('[antd:') || message.includes('findDOMNode')) return;
  originalWarn(...args);
};

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
```

## Requirements

### CT-001: Custom Render Utility
- **Priority**: P0
- **Description**: Custom render function that wraps components with all required providers.
- **Acceptance Criteria**:
  - File: `apps/web/src/__tests__/helpers/render.tsx`
  - Wraps component with:
    1. `QueryClientProvider` with a fresh `QueryClient` per test (no cache sharing)
    2. Ant Design `ConfigProvider` with default theme
    3. `LocaleProvider` with English locale
    4. Auth context mock (configurable via render options)
  - Exports:
    ```typescript
    interface RenderOptions extends Omit<RTLRenderOptions, 'wrapper'> {
      user?: Partial<User>;           // Mock authenticated user
      isAuthenticated?: boolean;      // Default true
      locale?: 'en' | 'ms';          // Default 'en'
      queryClient?: QueryClient;      // Override QueryClient
      initialEntries?: string[];      // For testing URL-dependent components
    }

    function renderWithProviders(
      ui: React.ReactElement,
      options?: RenderOptions,
    ): ReturnType<typeof render> & { queryClient: QueryClient };
    ```
  - Each test gets an isolated `QueryClient` with `retry: false` and `cacheTime: 0`

### CT-002: Mock Data and API Mocks
- **Priority**: P0
- **Description**: Shared mock data factories and API response mocks.
- **Acceptance Criteria**:
  - File: `apps/web/src/__tests__/helpers/mocks.ts`
  - Factory functions for all major entity types:
    ```typescript
    function createMockUser(overrides?: Partial<User>): User;
    function createMockItem(overrides?: Partial<Item>): Item;
    function createMockContact(overrides?: Partial<Contact>): Contact;
    function createMockSalesOrder(overrides?: Partial<SalesOrder>): SalesOrder;
    function createMockInvoice(overrides?: Partial<Invoice>): Invoice;
    function createMockTaxRate(overrides?: Partial<TaxRate>): TaxRate;
    function createMockOrganization(overrides?: Partial<Organization>): Organization;
    ```
  - Each factory returns complete objects with sensible Malaysian-context defaults (MYR currency, SST tax, etc.)
  - File: `apps/web/src/__tests__/helpers/msw-handlers.ts` - MSW (Mock Service Worker) request handlers:
    ```typescript
    export const handlers = [
      http.get('/api/v1/items', () => HttpResponse.json({ data: [...], meta: { total: 10 } })),
      http.get('/api/v1/contacts', () => HttpResponse.json({ data: [...], meta: { total: 5 } })),
      http.get('/api/v1/tax-rates', () => HttpResponse.json({ data: [...] })),
      // ... etc
    ];
    ```
  - File: `apps/web/src/__tests__/helpers/server.ts` - MSW server setup for tests

### CT-003: LineItemsTable Component Tests
- **Priority**: P0
- **Description**: Tests for the line items table used in sales orders, invoices, and purchase orders.
- **Acceptance Criteria**:
  - File: `apps/web/src/__tests__/components/sales/LineItemsTable.test.tsx`
  - Test cases:
    1. **Renders empty state**: Table with "Add Item" button when no items
    2. **Add item row**: Click "Add Item", new empty row appears
    3. **Remove item row**: Click delete button on a row, row is removed
    4. **Quantity change updates total**: Change quantity from 1 to 5, verify row total = quantity * rate
    5. **Rate change updates total**: Change unit rate, verify row total recalculates
    6. **Discount applied correctly**: Set percentage discount, verify discount amount and final total
    7. **Tax calculation**: Item with 10% SST, verify tax amount displayed correctly
    8. **Order summary totals**: Subtotal, discount, tax, and grand total computed correctly across all rows
    9. **Multiple items**: Add 3 items, verify all totals aggregate correctly
    10. **Item selection**: Select item from dropdown, verify rate and description auto-populate
    11. **Validation**: Cannot save with zero quantity, shows validation message
    12. **Sort order**: Drag to reorder items (or verify sortOrder property updates)

### CT-004: TaxBreakdown Component Tests
- **Priority**: P0
- **Description**: Tests for the tax breakdown display component.
- **Acceptance Criteria**:
  - File: `apps/web/src/__tests__/components/tax/TaxBreakdown.test.tsx`
  - Test cases:
    1. **SST 10% display**: Items with SST show "SST (10%)" label and correct amount
    2. **Service Tax 6% display**: Items with service tax show "Service Tax (6%)" and correct amount
    3. **Tax exempt display**: Items marked exempt show "Tax Exempt" with RM 0.00
    4. **Zero-rated display**: Zero-rated items show "Zero Rated (0%)" with RM 0.00
    5. **Mixed tax rates**: Multiple items with different tax rates, each rate grouped with subtotal
    6. **Tax inclusive mode**: When organization uses tax-inclusive pricing, breakdown shows tax extracted from total
    7. **No tax items**: When all items are non-taxable, section is hidden or shows "No tax applicable"
    8. **Currency formatting**: All amounts formatted as MYR with 2 decimal places
    9. **Rounding**: Verify rounding matches organization's rounding method (NORMAL, ROUND_UP, ROUND_DOWN)

### CT-005: CustomerSelect Component Tests
- **Priority**: P0
- **Description**: Tests for the customer/vendor selection dropdown with search and create-new functionality.
- **Acceptance Criteria**:
  - File: `apps/web/src/__tests__/components/sales/CustomerSelect.test.tsx`
  - Test cases:
    1. **Renders with placeholder**: Shows "Select a customer" placeholder
    2. **Search contacts**: Type "ABC", verify API called with search query, dropdown shows matching results
    3. **Select contact**: Click on a contact in dropdown, verify `onChange` called with contact ID
    4. **Display selected**: After selection, shows contact display name
    5. **Clear selection**: Click clear button, `onChange` called with null
    6. **Create new customer**: Click "Create New" option, verify modal/drawer opens
    7. **Filter by type**: When `contactType="CUSTOMER"`, only customers shown
    8. **Loading state**: Shows spinner while fetching contacts
    9. **Empty search results**: Shows "No contacts found" when search returns empty
    10. **Disabled state**: When `disabled` prop is true, cannot interact

### CT-006: BarcodeScanner Component Tests
- **Priority**: P1
- **Description**: Tests for the barcode scanner component that detects rapid keyboard input.
- **Acceptance Criteria**:
  - File: `apps/web/src/__tests__/components/items/BarcodeScanner.test.tsx`
  - Test cases:
    1. **Detects barcode input**: Simulate rapid keystrokes (< 50ms apart) ending with Enter, verify `onScan` callback
    2. **Ignores normal typing**: Simulate slow keystrokes (> 200ms apart), verify `onScan` NOT called
    3. **Item lookup after scan**: After barcode detected, verify item lookup API called with scanned value
    4. **Found item**: When item found by SKU/barcode, `onItemFound` callback invoked with item data
    5. **Item not found**: When no matching item, shows "Item not found" notification
    6. **Focus handling**: Scanner active when designated input is focused
    7. **Disabled state**: When `disabled` prop, ignores all input

### CT-007: DashboardGrid Component Tests
- **Priority**: P1
- **Description**: Tests for the customizable dashboard grid layout.
- **Acceptance Criteria**:
  - File: `apps/web/src/__tests__/components/dashboard/DashboardGrid.test.tsx`
  - Test cases:
    1. **Renders default widgets**: All default widgets render without errors
    2. **Widget content**: KPI widget shows sales/purchases/receivables numbers
    3. **Widget loading state**: Shows skeleton while data is loading
    4. **Widget error state**: Shows error message when API fails
    5. **Add widget**: Open widget drawer, select a widget, verify it appears in grid
    6. **Remove widget**: Click remove on a widget, verify it disappears
    7. **Drag and drop reorder**: Simulate DnD interaction, verify layout order changes
    8. **Save layout**: After reorder, verify save API called with new layout
    9. **Reset layout**: Click reset, verify default layout restored

### CT-008: ErrorBoundary Component Tests
- **Priority**: P0
- **Description**: Tests for the global error boundary component.
- **Acceptance Criteria**:
  - File: `apps/web/src/__tests__/components/ErrorBoundary.test.tsx`
  - Test cases:
    1. **Renders children normally**: When no error, renders child components
    2. **Catches render error**: When child throws during render, shows fallback UI
    3. **Fallback UI content**: Error fallback shows error message and "Try Again" / "Go Home" buttons
    4. **Try Again button**: Clicking "Try Again" resets error state, attempts re-render
    5. **Go Home button**: Clicking "Go Home" navigates to dashboard
    6. **Nested error**: Error in deeply nested component still caught
    7. **Error logging**: Verify `componentDidCatch` logs the error (console.error or reporting service)

### CT-009: LanguageSwitcher Component Tests
- **Priority**: P1
- **Description**: Tests for the locale toggle between English and Bahasa Malaysia.
- **Acceptance Criteria**:
  - File: `apps/web/src/__tests__/components/LanguageSwitcher.test.tsx`
  - Test cases:
    1. **Renders current locale**: Shows "EN" or "BM" based on current locale
    2. **Toggle locale**: Click switcher, verify locale changes from EN to BM
    3. **Updates translations**: After switching to BM, verify a known translated string appears in Malay
    4. **Persists preference**: After toggle, verify preference saved (localStorage or API call)
    5. **Ant Design locale updates**: Ant Design components (DatePicker, Table pagination) show localized text

### CT-010: Skeleton Components Tests
- **Priority**: P1
- **Description**: Verify all skeleton/loading components render without errors.
- **Acceptance Criteria**:
  - File: `apps/web/src/__tests__/components/skeletons.test.tsx`
  - Test cases (one per skeleton component):
    1. Renders `ItemsTableSkeleton` without error
    2. Renders `DashboardSkeleton` without error
    3. Renders `ContactDetailSkeleton` without error
    4. Renders `SalesOrderFormSkeleton` without error
    5. Renders `ReportViewerSkeleton` without error
  - Snapshot tests for visual regression detection
  - Each skeleton should render some Ant Design `Skeleton` components

### CT-011: useItems Hook Tests
- **Priority**: P0
- **Description**: Tests for the items data fetching hook.
- **Acceptance Criteria**:
  - File: `apps/web/src/__tests__/hooks/useItems.test.ts`
  - Test cases:
    1. **Fetches items list**: Hook returns items array from API
    2. **Pagination params**: Passing page/limit params includes them in API call
    3. **Search filter**: Passing search string includes `search` query param
    4. **Category filter**: Passing categoryId includes it in API call
    5. **Status filter**: Passing status includes it in API call
    6. **Loading state**: `isLoading` is true during fetch, false after
    7. **Error state**: When API returns error, `error` is populated
    8. **Cache key includes params**: Different params produce different cache keys
    9. **Refetch**: Calling `refetch()` triggers a new API call
    10. **Create item mutation**: `useCreateItem` calls POST /items and invalidates list cache
    11. **Update item mutation**: `useUpdateItem` calls PUT /items/:id and invalidates relevant caches
    12. **Delete item mutation**: `useDeleteItem` calls DELETE /items/:id and invalidates list cache

### CT-012: useSales Hook Tests
- **Priority**: P0
- **Description**: Tests for the sales module data fetching hooks.
- **Acceptance Criteria**:
  - File: `apps/web/src/__tests__/hooks/useSales.test.ts`
  - Test cases:
    1. **Fetches sales orders list**: Hook returns paginated sales orders
    2. **Fetches single sales order**: `useSalesOrder(id)` returns full order with items
    3. **Create sales order mutation**: Calls POST endpoint, invalidates list cache
    4. **Update sales order mutation**: Calls PUT endpoint, invalidates list and detail caches
    5. **Confirm sales order mutation**: Calls PATCH /sales-orders/:id/confirm
    6. **Optimistic update on status change**: UI updates immediately before server confirmation
    7. **Rollback on mutation error**: When mutation fails, reverts to previous state
    8. **Invoice creation from SO**: `useCreateInvoiceFromSO` mutation creates invoice, invalidates SO and invoice caches
    9. **Loading states**: Each query and mutation has correct loading state
    10. **Error handling**: API errors populate `error` field, do not crash

## Test Utilities Reference

### Custom Render
```typescript
// apps/web/src/__tests__/helpers/render.tsx
import { render, RenderOptions as RTLRenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import enUS from 'antd/locale/en_US';

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
    logger: { log: console.log, warn: console.warn, error: () => {} },
  });
}

interface RenderOptions extends Omit<RTLRenderOptions, 'wrapper'> {
  user?: Partial<User>;
  isAuthenticated?: boolean;
  queryClient?: QueryClient;
}

export function renderWithProviders(
  ui: React.ReactElement,
  { user, isAuthenticated = true, queryClient, ...renderOptions }: RenderOptions = {},
) {
  const testQueryClient = queryClient || createTestQueryClient();
  const mockUser = { id: 'test-user-1', name: 'Test User', email: 'test@example.com', role: 'ADMIN', ...user };

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={testQueryClient}>
        <ConfigProvider locale={enUS}>
          <MockAuthProvider user={isAuthenticated ? mockUser : null}>
            {children}
          </MockAuthProvider>
        </ConfigProvider>
      </QueryClientProvider>
    );
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient: testQueryClient,
  };
}
```

### Mock Data Factory Example
```typescript
// apps/web/src/__tests__/helpers/mocks.ts
let counter = 0;
const uniqueId = () => `test-${++counter}`;

export function createMockItem(overrides?: Partial<Item>): Item {
  return {
    id: uniqueId(),
    organizationId: 'org-1',
    sku: `SKU-${counter}`,
    name: `Test Item ${counter}`,
    nameMalay: null,
    description: 'A test item',
    type: 'INVENTORY',
    unit: 'pcs',
    brand: 'TestBrand',
    partNumber: `PN-${counter}`,
    crossReferences: [],
    vehicleModels: [],
    categoryId: null,
    costPrice: 10.00,
    sellingPrice: 25.00,
    reorderLevel: 5,
    reorderQty: 10,
    trackInventory: true,
    trackBatches: false,
    trackSerials: false,
    taxable: true,
    taxRateId: null,
    images: [],
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function createMockTaxRate(overrides?: Partial<TaxRate>): TaxRate {
  return {
    id: uniqueId(),
    organizationId: 'org-1',
    name: 'SST 10%',
    code: 'ST10',
    rate: 10,
    type: 'SST',
    description: 'Sales and Service Tax',
    isDefault: true,
    isActive: true,
    status: 'ACTIVE',
    effectiveFrom: null,
    effectiveTo: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}
```

## npm Scripts

Add to `apps/web/package.json`:
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --reporters=default --reporters=jest-junit"
  }
}
```

## Coverage Targets

| Category | Target | Measurement |
|----------|--------|-------------|
| Components (overall) | 60% lines | `src/components/**/*.tsx` |
| Hooks (overall) | 80% lines | `src/hooks/**/*.ts` |
| Sales components | 70% lines | `src/components/sales/**/*.tsx` |
| Dashboard components | 60% lines | `src/components/dashboard/**/*.tsx` |
| Tax components | 80% lines | `src/components/tax/**/*.tsx` |

## File Structure
```
apps/web/
  jest.config.ts
  src/
    __tests__/
      helpers/
        render.tsx           # Custom render with providers
        mocks.ts             # Mock data factories
        msw-handlers.ts      # MSW API handlers
        server.ts            # MSW server setup
        setup.ts             # Jest setup (jest-dom, global mocks)
      components/
        sales/
          LineItemsTable.test.tsx
          CustomerSelect.test.tsx
        tax/
          TaxBreakdown.test.tsx
        items/
          BarcodeScanner.test.tsx
        dashboard/
          DashboardGrid.test.tsx
        ErrorBoundary.test.tsx
        LanguageSwitcher.test.tsx
        skeletons.test.tsx
      hooks/
        useItems.test.ts
        useSales.test.ts
```
