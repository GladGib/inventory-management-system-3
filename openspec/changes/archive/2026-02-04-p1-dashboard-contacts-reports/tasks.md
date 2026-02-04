## 1. Setup & Dependencies

- [ ] 1.1 Install `@ant-design/charts` package
- [ ] 1.2 Create `hooks/use-dashboard.ts` with dashboard query hooks
- [ ] 1.3 Create `hooks/use-reports.ts` with report query hooks
- [ ] 1.4 Create `lib/dashboard.ts` with API client functions
- [ ] 1.5 Create `lib/reports.ts` with API client functions

## 2. Dashboard Chart Components

- [ ] 2.1 Create `components/dashboard/SalesTrendChart.tsx` (DC-001)
- [ ] 2.2 Create `components/dashboard/TopItemsChart.tsx` (DC-002)
- [ ] 2.3 Create `components/dashboard/TopCustomersChart.tsx` (DC-003)
- [ ] 2.4 Create `components/dashboard/ChartPeriodSelector.tsx` (shared period picker)
- [ ] 2.5 Create `components/dashboard/index.ts` exports

## 3. Dashboard Widget Updates

- [ ] 3.1 Create `components/dashboard/PendingActionsCard.tsx` (DC-004) - replace mock data
- [ ] 3.2 Create `components/dashboard/RecentActivityCard.tsx` (DC-005) - replace mock data
- [ ] 3.3 Update dashboard page to use new chart components
- [ ] 3.4 Update dashboard page to fetch real data via hooks
- [ ] 3.5 Add loading skeletons for dashboard components

## 4. Contact Detail Components

- [ ] 4.1 Create `components/contacts/ContactHeader.tsx` (shared header)
- [ ] 4.2 Create `components/contacts/BalanceSummaryCard.tsx` (CD-004)
- [ ] 4.3 Create `components/contacts/TransactionHistory.tsx` (CD-003)
- [ ] 4.4 Create `components/contacts/index.ts` exports
- [ ] 4.5 Add contact detail hooks to `use-contacts.ts`

## 5. Contact Detail Pages

- [ ] 5.1 Create `/contacts/customers/[id]/page.tsx` (CD-001)
- [ ] 5.2 Create `/contacts/vendors/[id]/page.tsx` (CD-002)
- [ ] 5.3 Update customer list page to link to detail pages
- [ ] 5.4 Update vendor list page to link to detail pages

## 6. Report Shared Components

- [ ] 6.1 Create `components/reports/ReportFilterBar.tsx` (date range, filters)
- [ ] 6.2 Create `components/reports/DateRangePresets.tsx` (7d, 30d, 90d, YTD)
- [ ] 6.3 Create `components/reports/ReportSummary.tsx` (totals row)
- [ ] 6.4 Create `components/reports/index.ts` exports

## 7. Report Viewer Pages

- [ ] 7.1 Update `/reports/page.tsx` with card-based layout (RV-001)
- [ ] 7.2 Create `/reports/sales-by-customer/page.tsx` (RV-002)
- [ ] 7.3 Create `/reports/sales-by-item/page.tsx` (RV-003)
- [ ] 7.4 Create `/reports/receivables-aging/page.tsx` (RV-004)
- [ ] 7.5 Create `/reports/inventory-summary/page.tsx` (RV-005)
- [ ] 7.6 Create `/reports/inventory-valuation/page.tsx` (RV-006)
- [ ] 7.7 Create `/reports/payables-aging/page.tsx` (RV-007)

## 8. Integration & Testing

- [ ] 8.1 Verify all dashboard charts render with API data
- [ ] 8.2 Verify contact detail pages show correct data
- [ ] 8.3 Verify all report pages load and filter correctly
- [ ] 8.4 Test navigation between pages
- [ ] 8.5 Run TypeScript build to check for errors
