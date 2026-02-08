'use client';

import { Card, Row, Col, Typography, Space, Badge, Input } from 'antd';
import {
  ShoppingCartOutlined,
  TeamOutlined,
  InboxOutlined,
  DollarOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  AppstoreOutlined,
  AlertOutlined,
  BarChartOutlined,
  RiseOutlined,
  LineChartOutlined,
  UserAddOutlined,
  TrophyOutlined,
  SwapOutlined,
  StopOutlined,
  HomeOutlined,
  PieChartOutlined,
  FundOutlined,
  AuditOutlined,
  BankOutlined,
  WalletOutlined,
  SafetyCertificateOutlined,
  FileProtectOutlined,
  FileSyncOutlined,
  CalendarOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import { useState } from 'react';

const { Title, Paragraph, Text } = Typography;

interface ReportCard {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
  color: string;
  isNew?: boolean;
}

// ============ Sales Reports ============

const salesReports: ReportCard[] = [
  {
    icon: <TeamOutlined />,
    title: 'Sales by Customer',
    description: 'View sales performance by customer with order counts and revenue totals.',
    href: '/reports/sales-by-customer',
    color: '#1890ff',
  },
  {
    icon: <AppstoreOutlined />,
    title: 'Sales by Item',
    description: 'Analyze top-selling items with quantity sold and average pricing.',
    href: '/reports/sales-by-item',
    color: '#52c41a',
  },
  {
    icon: <ClockCircleOutlined />,
    title: 'Receivables Aging',
    description: 'Track outstanding customer invoices by aging bucket.',
    href: '/reports/receivables-aging',
    color: '#faad14',
  },
  {
    icon: <TeamOutlined />,
    title: 'Sales by Salesperson',
    description: 'Group sales by salesperson with totals and performance ranking.',
    href: '/reports/sales-by-salesperson',
    color: '#2f54eb',
    isNew: true,
  },
  {
    icon: <PieChartOutlined />,
    title: 'Sales by Category',
    description: 'Analyze sales revenue grouped by product category.',
    href: '/reports/sales-by-category',
    color: '#722ed1',
    isNew: true,
  },
  {
    icon: <HomeOutlined />,
    title: 'Sales by Region',
    description: 'View sales distribution by customer state or region.',
    href: '/reports/sales-by-region',
    color: '#13c2c2',
    isNew: true,
  },
  {
    icon: <CalendarOutlined />,
    title: 'Monthly Sales Summary',
    description: '12-month summary with monthly revenue and order counts.',
    href: '/reports/monthly-sales-summary',
    color: '#1890ff',
    isNew: true,
  },
  {
    icon: <RiseOutlined />,
    title: 'Sales Growth Comparison',
    description: 'Compare current period sales against the previous equivalent period.',
    href: '/reports/sales-growth-comparison',
    color: '#52c41a',
    isNew: true,
  },
  {
    icon: <LineChartOutlined />,
    title: 'Average Order Value',
    description: 'Track the trend of average invoice value over time.',
    href: '/reports/average-order-value',
    color: '#fa8c16',
    isNew: true,
  },
  {
    icon: <UserAddOutlined />,
    title: 'Customer Acquisition',
    description: 'Track new customer acquisition trends over time.',
    href: '/reports/customer-acquisition',
    color: '#eb2f96',
    isNew: true,
  },
  {
    icon: <TrophyOutlined />,
    title: 'Top Products',
    description: 'Rank the best-selling products by revenue and quantity.',
    href: '/reports/top-products',
    color: '#f5222d',
    isNew: true,
  },
];

// ============ Inventory Reports ============

const inventoryReports: ReportCard[] = [
  {
    icon: <InboxOutlined />,
    title: 'Inventory Summary',
    description: 'Overview of on-hand, committed, and available inventory levels.',
    href: '/reports/inventory-summary',
    color: '#722ed1',
  },
  {
    icon: <DollarOutlined />,
    title: 'Inventory Valuation',
    description: 'Calculate total inventory value at cost price by warehouse.',
    href: '/reports/inventory-valuation',
    color: '#eb2f96',
  },
  {
    icon: <ClockCircleOutlined />,
    title: 'Stock Aging',
    description: 'Identify slow-moving inventory and aging stock for better management.',
    href: '/reports/stock-aging',
    color: '#fa8c16',
  },
  {
    icon: <ClockCircleOutlined />,
    title: 'Batch Expiry',
    description: 'Track batches approaching expiry and view expired stock requiring action.',
    href: '/reports/batch-expiry',
    color: '#f5222d',
  },
  {
    icon: <AlertOutlined />,
    title: 'Reorder Report',
    description: 'Items below reorder point, pending reorders, and stock coverage days.',
    href: '/reports/reorder',
    color: '#faad14',
  },
  {
    icon: <SwapOutlined />,
    title: 'Inventory Turnover',
    description: 'Analyze turnover rate per item (COGS / average inventory value).',
    href: '/reports/inventory-turnover',
    color: '#2f54eb',
    isNew: true,
  },
  {
    icon: <StopOutlined />,
    title: 'Dead Stock',
    description: 'Identify items with no sales activity in a configurable period.',
    href: '/reports/dead-stock',
    color: '#f5222d',
    isNew: true,
  },
  {
    icon: <HomeOutlined />,
    title: 'Warehouse Utilization',
    description: 'View stock value and item counts across all warehouses.',
    href: '/reports/warehouse-utilization',
    color: '#722ed1',
    isNew: true,
  },
  {
    icon: <BarChartOutlined />,
    title: 'ABC Analysis',
    description: 'Classify inventory by value: A (80%), B (15%), C (5%).',
    href: '/reports/abc-analysis',
    color: '#13c2c2',
    isNew: true,
  },
  {
    icon: <FundOutlined />,
    title: 'Item Profitability',
    description: 'Revenue minus cost of goods sold per item.',
    href: '/reports/item-profitability',
    color: '#52c41a',
    isNew: true,
  },
];

// ============ Purchase Reports ============

const purchaseReports: ReportCard[] = [
  {
    icon: <ClockCircleOutlined />,
    title: 'Payables Aging',
    description: 'Track outstanding vendor bills by aging bucket.',
    href: '/reports/payables-aging',
    color: '#fa8c16',
  },
  {
    icon: <PieChartOutlined />,
    title: 'Purchases by Category',
    description: 'View purchasing spend grouped by item category.',
    href: '/reports/purchase-by-category',
    color: '#722ed1',
    isNew: true,
  },
  {
    icon: <AppstoreOutlined />,
    title: 'Purchases by Item',
    description: 'Track individual item purchase volumes and spend.',
    href: '/reports/purchase-by-item',
    color: '#2f54eb',
    isNew: true,
  },
  {
    icon: <AuditOutlined />,
    title: 'Vendor Performance',
    description: 'Evaluate vendors by on-time delivery, lead time, and reject rate.',
    href: '/reports/vendor-performance',
    color: '#13c2c2',
    isNew: true,
  },
  {
    icon: <SwapOutlined />,
    title: 'Purchase Price Variance',
    description: 'Compare actual purchase prices against standard/cost prices.',
    href: '/reports/purchase-price-variance',
    color: '#f5222d',
    isNew: true,
  },
  {
    icon: <FileTextOutlined />,
    title: 'Outstanding POs',
    description: 'View all open and partially received purchase orders.',
    href: '/reports/outstanding-pos',
    color: '#fa8c16',
    isNew: true,
  },
];

// ============ Financial Reports ============

const financialReports: ReportCard[] = [
  {
    icon: <FundOutlined />,
    title: 'Profit & Loss',
    description: 'Revenue, COGS, expenses, and net profit summary.',
    href: '/reports/profit-and-loss',
    color: '#52c41a',
    isNew: true,
  },
  {
    icon: <BankOutlined />,
    title: 'Cash Flow Summary',
    description: 'Track cash inflows vs outflows over time.',
    href: '/reports/cash-flow-summary',
    color: '#1890ff',
    isNew: true,
  },
  {
    icon: <BarChartOutlined />,
    title: 'Revenue by Month',
    description: 'Monthly revenue breakdown for a selected year.',
    href: '/reports/revenue-by-month',
    color: '#722ed1',
    isNew: true,
  },
  {
    icon: <PieChartOutlined />,
    title: 'Expense Analysis',
    description: 'Breakdown of expenses by category from vendor bills.',
    href: '/reports/expense-analysis',
    color: '#f5222d',
    isNew: true,
  },
  {
    icon: <ClockCircleOutlined />,
    title: 'Outstanding Payments',
    description: 'All unpaid invoices and bills with aging details.',
    href: '/reports/outstanding-payments',
    color: '#fa8c16',
    isNew: true,
  },
  {
    icon: <WalletOutlined />,
    title: 'Payment Method Analysis',
    description: 'Payment distribution by method (cash, bank, e-wallet, etc).',
    href: '/reports/payment-method-analysis',
    color: '#13c2c2',
    isNew: true,
  },
  {
    icon: <TeamOutlined />,
    title: 'Customer Lifetime Value',
    description: 'Total all-time revenue per customer ranked by value.',
    href: '/reports/customer-lifetime-value',
    color: '#eb2f96',
    isNew: true,
  },
  {
    icon: <AuditOutlined />,
    title: 'Journal Entries',
    description: 'View and export all journal entries with debit/credit details.',
    href: '/reports/journal-entries',
    color: '#2f54eb',
    isNew: true,
  },
  {
    icon: <BankOutlined />,
    title: 'Trial Balance',
    description: 'Trial balance report showing debit and credit totals per account.',
    href: '/reports/trial-balance',
    color: '#722ed1',
    isNew: true,
  },
];

// ============ Compliance Reports ============

const complianceReports: ReportCard[] = [
  {
    icon: <DollarOutlined />,
    title: 'SST Tax Report (SST-03)',
    description: 'Sales & Service Tax report with output tax, input tax, and net tax payable.',
    href: '/reports/sst',
    color: '#13c2c2',
  },
  {
    icon: <SafetyCertificateOutlined />,
    title: 'SST Filing Summary',
    description: 'SST summary formatted for filing with Malaysia customs.',
    href: '/reports/sst-filing-summary',
    color: '#2f54eb',
    isNew: true,
  },
  {
    icon: <FileSyncOutlined />,
    title: 'E-Invoice Submission Log',
    description: 'Track all MyInvois e-invoice submissions and statuses.',
    href: '/reports/einvoice-submission-log',
    color: '#722ed1',
    isNew: true,
  },
  {
    icon: <FileProtectOutlined />,
    title: 'Tax Audit Trail',
    description: 'Complete audit trail of all tax-related transactions.',
    href: '/reports/tax-audit-trail',
    color: '#f5222d',
    isNew: true,
  },
  {
    icon: <CalendarOutlined />,
    title: 'Annual Tax Summary',
    description: 'Full year tax summary with monthly breakdown.',
    href: '/reports/annual-tax-summary',
    color: '#fa8c16',
    isNew: true,
  },
];

interface ReportSectionProps {
  title: string;
  icon: React.ReactNode;
  reports: ReportCard[];
  count: number;
}

function ReportSection({ title, icon, reports, count }: ReportSectionProps) {
  if (reports.length === 0) return null;

  return (
    <div style={{ marginBottom: 32 }}>
      <Space style={{ marginBottom: 16 }}>
        {icon}
        <Title level={5} style={{ margin: 0 }}>
          {title}
        </Title>
        <Badge count={count} style={{ backgroundColor: '#1890ff' }} />
      </Space>
      <Row gutter={[16, 16]}>
        {reports.map((report) => (
          <Col xs={24} sm={12} lg={8} xl={6} key={report.href}>
            <Link href={report.href} style={{ textDecoration: 'none' }}>
              <Card
                hoverable
                style={{ height: '100%' }}
                styles={{
                  body: { display: 'flex', flexDirection: 'column', height: '100%' },
                }}
              >
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div
                      style={{
                        fontSize: 28,
                        color: report.color,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      {report.icon}
                    </div>
                    {report.isNew && (
                      <Badge count="NEW" style={{ backgroundColor: '#52c41a' }} />
                    )}
                  </div>
                  <div>
                    <Title level={5} style={{ marginBottom: 8, fontSize: 14 }}>
                      {report.title}
                    </Title>
                    <Paragraph
                      type="secondary"
                      style={{ marginBottom: 0, fontSize: 13 }}
                      ellipsis={{ rows: 2 }}
                    >
                      {report.description}
                    </Paragraph>
                  </div>
                </Space>
              </Card>
            </Link>
          </Col>
        ))}
      </Row>
    </div>
  );
}

export default function ReportsPage() {
  const [searchText, setSearchText] = useState('');

  const filterReports = (reports: ReportCard[]) => {
    if (!searchText.trim()) return reports;
    const lower = searchText.toLowerCase();
    return reports.filter(
      (r) =>
        r.title.toLowerCase().includes(lower) ||
        r.description.toLowerCase().includes(lower)
    );
  };

  const filteredSales = filterReports(salesReports);
  const filteredInventory = filterReports(inventoryReports);
  const filteredPurchase = filterReports(purchaseReports);
  const filteredFinancial = filterReports(financialReports);
  const filteredCompliance = filterReports(complianceReports);

  const totalReports =
    salesReports.length +
    inventoryReports.length +
    purchaseReports.length +
    financialReports.length +
    complianceReports.length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>
            Reports
          </Title>
          <Text type="secondary">{totalReports} reports available across all categories</Text>
        </div>
        <Input
          placeholder="Search reports..."
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 300 }}
          allowClear
        />
      </div>

      <ReportSection
        title="Sales Reports"
        icon={<ShoppingCartOutlined style={{ fontSize: 20, color: '#1890ff' }} />}
        reports={filteredSales}
        count={salesReports.length}
      />

      <ReportSection
        title="Inventory Reports"
        icon={<InboxOutlined style={{ fontSize: 20, color: '#722ed1' }} />}
        reports={filteredInventory}
        count={inventoryReports.length}
      />

      <ReportSection
        title="Purchase Reports"
        icon={<FileTextOutlined style={{ fontSize: 20, color: '#fa8c16' }} />}
        reports={filteredPurchase}
        count={purchaseReports.length}
      />

      <ReportSection
        title="Financial Reports"
        icon={<DollarOutlined style={{ fontSize: 20, color: '#52c41a' }} />}
        reports={filteredFinancial}
        count={financialReports.length}
      />

      <ReportSection
        title="Compliance Reports"
        icon={<SafetyCertificateOutlined style={{ fontSize: 20, color: '#13c2c2' }} />}
        reports={filteredCompliance}
        count={complianceReports.length}
      />
    </div>
  );
}
