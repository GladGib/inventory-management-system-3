## Why

The IMS dashboard currently shows basic KPI widgets with static mock data for recent activity and pending actions. Backend APIs exist for dashboard analytics, reports, and contact details, but no frontend UI consumes them. Users cannot visualize sales trends, view detailed reports, or access full customer/vendor profiles, limiting the system's business intelligence value.

## What Changes

- Add interactive charts to the dashboard (sales trends, top items, top customers)
- Replace static mock data with real API data for recent activity and pending actions
- Create report viewer pages that display tabular report data with filtering
- Add customer and vendor detail pages with transaction history and balance tracking
- Add period selection and filtering controls to dashboard widgets

## Capabilities

### New Capabilities
- `dashboard-charts`: Interactive chart components for sales trends, top items, and top customers using existing dashboard APIs
- `contact-detail-pages`: Customer and vendor detail pages showing profile, transaction history, and account balance
- `report-viewer-pages`: Report display pages for sales, inventory, and purchase reports with date filtering and pagination

### Modified Capabilities
- `dashboard-analytics`: Add frontend components to consume existing dashboard APIs (DA-001 through DA-005)

## Impact

- **Frontend**: New pages and components in `apps/web/src/app/(dashboard)/`
  - Dashboard page updates with chart components
  - New report viewer pages under `/reports/`
  - New contact detail pages at `/contacts/customers/[id]` and `/contacts/vendors/[id]`
- **Components**: New chart components using a charting library (Ant Design Charts or Recharts)
- **Hooks**: New hooks for dashboard data, reports, and contact details
- **Dependencies**: May need to add a charting library (e.g., `@ant-design/charts`)
- **Backend**: No changes required - all APIs already exist
