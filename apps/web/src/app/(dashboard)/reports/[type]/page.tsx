'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  Breadcrumb,
  Table,
  Card,
  Typography,
  Empty,
  Skeleton,
  Tag,
  InputNumber,
  Space,
  Statistic,
  Row,
  Col,
  Descriptions,
} from 'antd';
import {
  HomeOutlined,
  BarChartOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import dayjs from 'dayjs';
import { useReport } from '@/hooks/use-reports';
import { ReportFilterBar, ReportSummary, ExportDropdown } from '@/components/reports';
import { reportRegistry } from '@/lib/report-registry';
import type { ReportConfig, ReportColumnConfig } from '@/lib/report-registry';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '-';
  return `RM ${Number(value).toLocaleString('en-MY', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatPercent(value: number | null | undefined): string {
  if (value == null) return '-';
  return `${Number(value).toFixed(2)}%`;
}

function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '-';
  return dayjs(value).format('YYYY-MM-DD');
}

// Safely get nested object value by dot-path
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((acc, part) => acc?.[part], obj);
}

function buildTableColumns(config: ReportConfig): ColumnsType<Record<string, unknown>> {
  return config.columns.map((col: ReportColumnConfig) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const column: any = {
      key: col.key,
      title: col.title,
      dataIndex: col.dataIndex.includes('.') ? col.dataIndex.split('.') : col.dataIndex,
      align: col.align || 'left',
      width: col.width,
    };

    if (col.sorter) {
      column.sorter = (a: Record<string, unknown>, b: Record<string, unknown>) => {
        const aVal = getNestedValue(a, col.dataIndex);
        const bVal = getNestedValue(b, col.dataIndex);
        if (typeof aVal === 'number' && typeof bVal === 'number') return aVal - bVal;
        if (typeof aVal === 'string' && typeof bVal === 'string') return aVal.localeCompare(bVal);
        return 0;
      };
    }

    // For nested dataIndex, use a custom render
    if (col.dataIndex.includes('.')) {
      const originalRender = col.render;
      column.dataIndex = undefined;
      column.render = (_: unknown, record: Record<string, unknown>) => {
        const val = getNestedValue(record, col.dataIndex);
        if (originalRender === 'currency') return formatCurrency(val);
        if (originalRender === 'percent') return formatPercent(val);
        if (originalRender === 'date') return formatDate(val);
        if (originalRender === 'boolean') return val ? <Tag color="red">Yes</Tag> : <Tag color="green">No</Tag>;
        if (originalRender === 'number') return val != null ? Number(val).toLocaleString() : '-';
        return val ?? '-';
      };
    } else {
      if (col.render === 'currency') {
        column.render = (val: number) => formatCurrency(val);
      } else if (col.render === 'percent') {
        column.render = (val: number) => formatPercent(val);
      } else if (col.render === 'date') {
        column.render = (val: string | null) => formatDate(val);
      } else if (col.render === 'boolean') {
        column.render = (val: boolean) =>
          val ? <Tag color="red">Yes</Tag> : <Tag color="green">No</Tag>;
      } else if (col.render === 'number') {
        column.render = (val: number | null) => val != null ? Number(val).toLocaleString() : '-';
      }
    }

    return column;
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildSummaryItems(config: ReportConfig, summary: any) {
  if (!summary) return [];
  return config.summaryFields.map((field) => {
    const val = summary[field.key];
    if (field.render === 'currency') {
      return { title: field.title, value: formatCurrency(val) };
    }
    if (field.render === 'percent') {
      return { title: field.title, value: formatPercent(val) };
    }
    if (field.render === 'number') {
      return { title: field.title, value: val != null ? Number(val).toLocaleString() : '0' };
    }
    return { title: field.title, value: val ?? '-' };
  });
}

// Custom renderer for P&L report
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ProfitAndLossView({ data }: { data: any }) {
  if (!data) return <Empty />;
  return (
    <Card>
      <Descriptions title="Profit & Loss Statement" bordered column={2}>
        <Descriptions.Item label="Period">
          {formatDate(data.period?.fromDate)} to {formatDate(data.period?.toDate)}
        </Descriptions.Item>
        <Descriptions.Item label="Invoices">{data.revenue?.invoiceCount ?? 0}</Descriptions.Item>
        <Descriptions.Item label="Revenue (Net)">{formatCurrency(data.revenue?.subtotal)}</Descriptions.Item>
        <Descriptions.Item label="Tax Collected">{formatCurrency(data.revenue?.taxCollected)}</Descriptions.Item>
        <Descriptions.Item label="Cost of Goods Sold">{formatCurrency(data.costOfGoodsSold)}</Descriptions.Item>
        <Descriptions.Item label="Gross Profit">
          <Text strong style={{ color: (data.grossProfit ?? 0) >= 0 ? '#52c41a' : '#ff4d4f' }}>
            {formatCurrency(data.grossProfit)}
          </Text>
        </Descriptions.Item>
        <Descriptions.Item label="Gross Margin">{formatPercent(data.grossMargin)}</Descriptions.Item>
        <Descriptions.Item label="Bills Count">{data.expenses?.billCount ?? 0}</Descriptions.Item>
        <Descriptions.Item label="Operating Expenses">{formatCurrency(data.expenses?.subtotal)}</Descriptions.Item>
        <Descriptions.Item label="Tax Paid">{formatCurrency(data.expenses?.taxPaid)}</Descriptions.Item>
        <Descriptions.Item label="Net Profit" span={2}>
          <Text strong style={{ fontSize: 18, color: (data.netProfit ?? 0) >= 0 ? '#52c41a' : '#ff4d4f' }}>
            {formatCurrency(data.netProfit)} ({formatPercent(data.netMargin)} margin)
          </Text>
        </Descriptions.Item>
      </Descriptions>
    </Card>
  );
}

// Custom renderer for Sales Growth
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SalesGrowthView({ data }: { data: any }) {
  if (!data) return <Empty />;
  const isPositive = (data.growth?.percent ?? 0) >= 0;
  return (
    <Card>
      <Row gutter={[24, 24]}>
        <Col xs={24} md={8}>
          <Card>
            <Statistic
              title="Current Period Revenue"
              value={data.currentPeriod?.revenue ?? 0}
              precision={2}
              prefix="RM"
              suffix={<Text type="secondary">({data.currentPeriod?.invoiceCount} invoices)</Text>}
            />
            <Text type="secondary">
              {formatDate(data.currentPeriod?.fromDate)} to {formatDate(data.currentPeriod?.toDate)}
            </Text>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Statistic
              title="Previous Period Revenue"
              value={data.previousPeriod?.revenue ?? 0}
              precision={2}
              prefix="RM"
              suffix={<Text type="secondary">({data.previousPeriod?.invoiceCount} invoices)</Text>}
            />
            <Text type="secondary">
              {formatDate(data.previousPeriod?.fromDate)} to {formatDate(data.previousPeriod?.toDate)}
            </Text>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Statistic
              title="Growth"
              value={data.growth?.percent ?? 0}
              precision={2}
              prefix={isPositive ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
              suffix="%"
              valueStyle={{ color: isPositive ? '#52c41a' : '#ff4d4f' }}
            />
            <Text type="secondary">
              {isPositive ? '+' : ''}{formatCurrency(data.growth?.amount)}
            </Text>
          </Card>
        </Col>
      </Row>
    </Card>
  );
}

// Custom renderer for Outstanding Payments
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function OutstandingPaymentsView({ data }: { data: any }) {
  if (!data) return <Empty />;

  const receivableColumns: ColumnsType<Record<string, unknown>> = [
    { title: 'Invoice #', dataIndex: 'number', key: 'number' },
    { title: 'Customer', dataIndex: 'contact', key: 'contact' },
    { title: 'Due Date', dataIndex: 'dueDate', key: 'dueDate', render: (v) => formatDate(v as string) },
    { title: 'Balance', dataIndex: 'balance', key: 'balance', align: 'right', render: (v) => formatCurrency(v as number) },
    { title: 'Days Overdue', dataIndex: 'daysOverdue', key: 'daysOverdue', align: 'right' },
    { title: 'Overdue', dataIndex: 'isOverdue', key: 'isOverdue', render: (v) => (v ? <Tag color="red">Overdue</Tag> : <Tag color="green">Current</Tag>) },
  ];

  const payableColumns: ColumnsType<Record<string, unknown>> = [
    { title: 'Bill #', dataIndex: 'number', key: 'number' },
    { title: 'Vendor', dataIndex: 'contact', key: 'contact' },
    { title: 'Due Date', dataIndex: 'dueDate', key: 'dueDate', render: (v) => formatDate(v as string) },
    { title: 'Balance', dataIndex: 'balance', key: 'balance', align: 'right', render: (v) => formatCurrency(v as number) },
    { title: 'Days Overdue', dataIndex: 'daysOverdue', key: 'daysOverdue', align: 'right' },
    { title: 'Overdue', dataIndex: 'isOverdue', key: 'isOverdue', render: (v) => (v ? <Tag color="red">Overdue</Tag> : <Tag color="green">Current</Tag>) },
  ];

  return (
    <>
      <ReportSummary
        items={[
          { title: 'Total Receivables', value: formatCurrency(data.summary?.totalReceivables) },
          { title: 'Total Payables', value: formatCurrency(data.summary?.totalPayables) },
          { title: 'Overdue Receivables', value: data.summary?.overdueReceivables ?? 0, valueStyle: { color: '#ff4d4f' } },
          { title: 'Overdue Payables', value: data.summary?.overduePayables ?? 0, valueStyle: { color: '#ff4d4f' } },
        ]}
      />
      <Card title="Receivables (Unpaid Invoices)" style={{ marginBottom: 16 }}>
        <Table
          columns={receivableColumns}
          dataSource={data.receivables || []}
          rowKey="number"
          pagination={{ pageSize: 10 }}
          size="small"
        />
      </Card>
      <Card title="Payables (Unpaid Bills)">
        <Table
          columns={payableColumns}
          dataSource={data.payables || []}
          rowKey="number"
          pagination={{ pageSize: 10 }}
          size="small"
        />
      </Card>
    </>
  );
}

export default function DynamicReportPage() {
  const params = useParams();
  const reportType = params.type as string;
  const config = reportRegistry[reportType];

  const [dateRange, setDateRange] = useState({
    fromDate: dayjs().subtract(30, 'day').format('YYYY-MM-DD'),
    toDate: dayjs().format('YYYY-MM-DD'),
  });
  const [year, setYear] = useState(dayjs().year());
  const [daysSinceLastSale, setDaysSinceLastSale] = useState(90);
  const [limit, setLimit] = useState(20);

  // Build API params based on config filters
  const apiParams = useMemo(() => {
    if (!config) return {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p: Record<string, any> = {};
    if (config.filters.includes('dateRange')) {
      p.fromDate = dateRange.fromDate;
      p.toDate = dateRange.toDate;
    }
    if (config.filters.includes('year')) {
      p.year = year;
    }
    if (config.filters.includes('daysSinceLastSale')) {
      p.daysSinceLastSale = daysSinceLastSale;
    }
    if (config.filters.includes('limit')) {
      p.limit = limit;
    }
    return p;
  }, [config, dateRange, year, daysSinceLastSale, limit]);

  const { data: reportData, isLoading } = useReport(
    config?.apiEndpoint || '',
    apiParams,
    !!config
  );

  const handleDateRangeChange = useCallback((fromDate: string, toDate: string) => {
    setDateRange({ fromDate, toDate });
  }, []);

  // Extract data array from response based on config.dataPath
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tableData: any[] = useMemo(() => {
    if (!reportData || !config) return [];
    const path = config.dataPath || 'data';
    if (path.startsWith('_custom')) return [];
    return getNestedValue(reportData, path) || [];
  }, [reportData, config]);

  const columns = useMemo(() => {
    if (!config) return [];
    return buildTableColumns(config);
  }, [config]);

  const summaryItems = useMemo(() => {
    if (!config || !reportData?.summary) return [];
    return buildSummaryItems(config, reportData.summary);
  }, [config, reportData]);

  // Not found
  if (!config) {
    return (
      <div>
        <Breadcrumb
          style={{ marginBottom: 16 }}
          items={[
            { href: '/', title: <HomeOutlined /> },
            { href: '/reports', title: <><BarChartOutlined /><span>Reports</span></> },
            { title: 'Not Found' },
          ]}
        />
        <Empty description={`Report type "${reportType}" not found. Check the reports index page for available reports.`} />
      </div>
    );
  }

  const isCustomView = config.dataPath?.startsWith('_custom');

  return (
    <div>
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { href: '/', title: <HomeOutlined /> },
          {
            href: '/reports',
            title: (
              <>
                <BarChartOutlined />
                <span>Reports</span>
              </>
            ),
          },
          { title: config.title },
        ]}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          {config.title}
        </Title>
        <ExportDropdown
          reportType={config.apiEndpoint}
          params={apiParams}
          reportName={config.key}
          disabled={isLoading}
        />
      </div>

      {/* Filter controls */}
      {config.filters.includes('dateRange') && (
        <ReportFilterBar
          fromDate={dateRange.fromDate}
          toDate={dateRange.toDate}
          onChange={handleDateRangeChange}
          loading={isLoading}
        />
      )}

      {config.filters.includes('year') && (
        <Card size="small" style={{ marginBottom: 16 }}>
          <Space align="center">
            <Text strong>Year:</Text>
            <InputNumber
              value={year}
              onChange={(val) => val && setYear(val)}
              min={2020}
              max={2030}
              disabled={isLoading}
            />
          </Space>
        </Card>
      )}

      {config.filters.includes('daysSinceLastSale') && (
        <Card size="small" style={{ marginBottom: 16 }}>
          <Space align="center">
            <Text strong>Days Since Last Sale:</Text>
            <InputNumber
              value={daysSinceLastSale}
              onChange={(val) => val && setDaysSinceLastSale(val)}
              min={1}
              max={999}
              disabled={isLoading}
            />
          </Space>
        </Card>
      )}

      {config.filters.includes('limit') && (
        <Card size="small" style={{ marginBottom: 16 }}>
          <Space align="center">
            <Text strong>Top N Items:</Text>
            <InputNumber
              value={limit}
              onChange={(val) => val && setLimit(val)}
              min={5}
              max={100}
              disabled={isLoading}
            />
          </Space>
        </Card>
      )}

      {/* Report content */}
      {isLoading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : (
        <>
          {/* Custom views for special reports */}
          {config.dataPath === '_custom_pnl' && <ProfitAndLossView data={reportData} />}
          {config.dataPath === '_custom_growth' && <SalesGrowthView data={reportData} />}
          {config.dataPath === '_custom_outstanding' && <OutstandingPaymentsView data={reportData} />}
          {config.dataPath === '_custom_sst' && (
            <>
              <ReportSummary
                items={[
                  { title: 'Output Tax', value: formatCurrency(reportData?.summary?.totalOutputTax) },
                  { title: 'Input Tax', value: formatCurrency(reportData?.summary?.totalInputTax) },
                  {
                    title: 'Net Tax Payable',
                    value: formatCurrency(reportData?.summary?.netTaxPayable),
                    valueStyle: { color: (reportData?.summary?.netTaxPayable ?? 0) >= 0 ? '#ff4d4f' : '#52c41a' },
                  },
                  { title: 'SST Registered', value: reportData?.isSstRegistered ? 'Yes' : 'No' },
                ]}
              />
              <Card title="SST Filing Details">
                <Descriptions bordered column={2}>
                  <Descriptions.Item label="SST Registration No">{reportData?.sstRegistrationNo || 'N/A'}</Descriptions.Item>
                  <Descriptions.Item label="Taxable Supplies">{formatCurrency(reportData?.outputTax?.taxableSupplies)}</Descriptions.Item>
                  <Descriptions.Item label="Exempt Supplies">{formatCurrency(reportData?.outputTax?.exemptSupplies)}</Descriptions.Item>
                  <Descriptions.Item label="Zero-Rated Supplies">{formatCurrency(reportData?.outputTax?.zeroRatedSupplies)}</Descriptions.Item>
                  <Descriptions.Item label="Total Invoiced">{formatCurrency(reportData?.outputTax?.totalInvoiced)}</Descriptions.Item>
                  <Descriptions.Item label="Total Billed">{formatCurrency(reportData?.inputTax?.totalBilled)}</Descriptions.Item>
                </Descriptions>
              </Card>
            </>
          )}

          {/* Standard table view */}
          {!isCustomView && (
            <>
              {summaryItems.length > 0 && <ReportSummary items={summaryItems} />}
              <Card>
                {tableData.length === 0 ? (
                  <Empty description="No data available for the selected filters" />
                ) : (
                  <Table
                    columns={columns}
                    dataSource={tableData}
                    rowKey={(_, index) => String(index)}
                    pagination={{
                      showSizeChanger: true,
                      showTotal: (total) => `Total ${total} records`,
                      pageSizeOptions: ['10', '20', '50', '100'],
                    }}
                    size="small"
                    scroll={{ x: 'max-content' }}
                  />
                )}
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}
