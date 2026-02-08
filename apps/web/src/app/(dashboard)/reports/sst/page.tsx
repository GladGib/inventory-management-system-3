'use client';

import { useState } from 'react';
import {
  Card,
  Table,
  Typography,
  Breadcrumb,
  Row,
  Col,
  Statistic,
  Skeleton,
  Empty,
  Tag,
  Alert,
  Divider,
} from 'antd';
import {
  HomeOutlined,
  BarChartOutlined,
  DollarOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useSSTReport } from '@/hooks/use-reports';
import { ReportFilterBar, ReportSummary, ExportDropdown } from '@/components/reports';
import type { SSTTaxByRate } from '@/lib/reports';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;

function formatRM(value: number) {
  return `RM ${value.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function SSTReportPage() {
  const [dateRange, setDateRange] = useState({
    fromDate: dayjs().startOf('month').format('YYYY-MM-DD'),
    toDate: dayjs().endOf('month').format('YYYY-MM-DD'),
  });

  const { data, isLoading } = useSSTReport(dateRange);

  const handleDateRangeChange = (fromDate: string, toDate: string) => {
    setDateRange({ fromDate, toDate });
  };

  const outputTaxColumns: ColumnsType<SSTTaxByRate> = [
    {
      title: 'Tax Code',
      dataIndex: 'rateCode',
      key: 'rateCode',
      width: 100,
      render: (code) => <Tag>{code}</Tag>,
    },
    {
      title: 'Tax Rate Name',
      dataIndex: 'rateName',
      key: 'rateName',
    },
    {
      title: 'Rate (%)',
      dataIndex: 'ratePercent',
      key: 'ratePercent',
      width: 100,
      align: 'right',
      render: (val) => `${val}%`,
    },
    {
      title: 'Type',
      dataIndex: 'taxType',
      key: 'taxType',
      width: 120,
      render: (type) => {
        const colors: Record<string, string> = {
          SST: 'blue',
          SERVICE_TAX: 'purple',
          EXEMPT: 'default',
          ZERO_RATED: 'green',
          OUT_OF_SCOPE: 'default',
        };
        return <Tag color={colors[type] || 'default'}>{type.replace(/_/g, ' ')}</Tag>;
      },
    },
    {
      title: 'Taxable Supplies',
      dataIndex: 'taxableSupplies',
      key: 'taxableSupplies',
      width: 160,
      align: 'right',
      render: (val) => formatRM(val || 0),
    },
    {
      title: 'Tax Amount',
      dataIndex: 'taxAmount',
      key: 'taxAmount',
      width: 160,
      align: 'right',
      render: (val) => formatRM(val || 0),
    },
    {
      title: 'Transactions',
      dataIndex: 'transactionCount',
      key: 'transactionCount',
      width: 110,
      align: 'right',
    },
  ];

  const inputTaxColumns: ColumnsType<SSTTaxByRate> = [
    {
      title: 'Tax Code',
      dataIndex: 'rateCode',
      key: 'rateCode',
      width: 100,
      render: (code) => <Tag>{code}</Tag>,
    },
    {
      title: 'Tax Rate Name',
      dataIndex: 'rateName',
      key: 'rateName',
    },
    {
      title: 'Rate (%)',
      dataIndex: 'ratePercent',
      key: 'ratePercent',
      width: 100,
      align: 'right',
      render: (val) => `${val}%`,
    },
    {
      title: 'Taxable Inputs',
      dataIndex: 'taxableInputs',
      key: 'taxableInputs',
      width: 160,
      align: 'right',
      render: (val) => formatRM(val || 0),
    },
    {
      title: 'Tax Amount',
      dataIndex: 'taxAmount',
      key: 'taxAmount',
      width: 160,
      align: 'right',
      render: (val) => formatRM(val || 0),
    },
    {
      title: 'Transactions',
      dataIndex: 'transactionCount',
      key: 'transactionCount',
      width: 110,
      align: 'right',
    },
  ];

  const summaryItems = data?.summary
    ? [
        {
          title: 'Total Output Tax (Collected)',
          value: formatRM(data.summary.totalOutputTax),
          valueStyle: { color: '#1677ff' },
        },
        {
          title: 'Total Input Tax (Paid)',
          value: formatRM(data.summary.totalInputTax),
          valueStyle: { color: '#722ed1' },
        },
        {
          title: data.summary.isRefundDue ? 'Tax Refund Due' : 'Net Tax Payable',
          value: formatRM(Math.abs(data.summary.netTaxPayable)),
          valueStyle: {
            color: data.summary.isRefundDue ? '#52c41a' : '#ff4d4f',
          },
        },
      ]
    : [];

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
                <BarChartOutlined /> <span>Reports</span>
              </>
            ),
          },
          { title: 'SST Tax Report' },
        ]}
      />

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <Title level={4} style={{ margin: 0 }}>
          <DollarOutlined style={{ marginRight: 8 }} />
          SST Tax Report (SST-03)
        </Title>
        <ExportDropdown
          reportType="sst"
          params={{ fromDate: dateRange.fromDate, toDate: dateRange.toDate }}
          reportName="sst-report"
          disabled={isLoading || !data}
        />
      </div>

      <ReportFilterBar
        fromDate={dateRange.fromDate}
        toDate={dateRange.toDate}
        onChange={handleDateRangeChange}
        loading={isLoading}
      />

      {isLoading ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : !data ? (
        <Empty description="No data available for the selected period" />
      ) : (
        <>
          {/* SST Registration Info */}
          {!data.isSstRegistered && (
            <Alert
              type="warning"
              message="SST Not Registered"
              description="This organization is not marked as SST registered. Tax reporting may not be applicable."
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          {data.sstRegistrationNo && (
            <Alert
              type="info"
              message={`SST Registration No: ${data.sstRegistrationNo}`}
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          {/* Summary Cards */}
          <ReportSummary items={summaryItems} />

          {/* Section A: Output Tax */}
          <Card
            title={
              <span>
                <ArrowUpOutlined style={{ color: '#1677ff', marginRight: 8 }} />
                Section A: Output Tax (Sales)
              </span>
            }
            style={{ marginBottom: 16 }}
          >
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
              <Col xs={12} sm={6}>
                <Statistic
                  title="Taxable Supplies"
                  value={data.outputTax.taxableSupplies}
                  prefix="RM"
                  precision={2}
                  valueStyle={{ fontSize: 16 }}
                />
              </Col>
              <Col xs={12} sm={6}>
                <Statistic
                  title="Exempt Supplies"
                  value={data.outputTax.exemptSupplies}
                  prefix="RM"
                  precision={2}
                  valueStyle={{ fontSize: 16 }}
                />
              </Col>
              <Col xs={12} sm={6}>
                <Statistic
                  title="Zero-Rated Supplies"
                  value={data.outputTax.zeroRatedSupplies}
                  prefix="RM"
                  precision={2}
                  valueStyle={{ fontSize: 16 }}
                />
              </Col>
              <Col xs={12} sm={6}>
                <Statistic
                  title="Total Output Tax"
                  value={data.outputTax.totalOutputTax}
                  prefix="RM"
                  precision={2}
                  valueStyle={{ fontSize: 16, color: '#1677ff', fontWeight: 'bold' }}
                />
              </Col>
            </Row>

            <Divider style={{ margin: '12px 0' }} />

            <Text type="secondary" style={{ marginBottom: 8, display: 'block' }}>
              {data.outputTax.invoiceCount} invoices | Total Invoiced:{' '}
              {formatRM(data.outputTax.totalInvoiced)}
            </Text>

            {data.outputTax.byRate.length > 0 ? (
              <Table
                columns={outputTaxColumns}
                dataSource={data.outputTax.byRate}
                rowKey="rateCode"
                pagination={false}
                size="small"
              />
            ) : (
              <Empty description="No output tax data" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>

          {/* Section B: Input Tax */}
          <Card
            title={
              <span>
                <ArrowDownOutlined style={{ color: '#722ed1', marginRight: 8 }} />
                Section B: Input Tax (Purchases)
              </span>
            }
            style={{ marginBottom: 16 }}
          >
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
              <Col xs={12} sm={8}>
                <Statistic
                  title="Taxable Inputs"
                  value={data.inputTax.taxableInputs}
                  prefix="RM"
                  precision={2}
                  valueStyle={{ fontSize: 16 }}
                />
              </Col>
              <Col xs={12} sm={8}>
                <Statistic
                  title="Total Input Tax"
                  value={data.inputTax.totalInputTax}
                  prefix="RM"
                  precision={2}
                  valueStyle={{ fontSize: 16, color: '#722ed1', fontWeight: 'bold' }}
                />
              </Col>
              <Col xs={12} sm={8}>
                <Statistic
                  title="Bills Processed"
                  value={data.inputTax.billCount}
                  valueStyle={{ fontSize: 16 }}
                />
              </Col>
            </Row>

            <Divider style={{ margin: '12px 0' }} />

            <Text type="secondary" style={{ marginBottom: 8, display: 'block' }}>
              {data.inputTax.billCount} bills | Total Billed: {formatRM(data.inputTax.totalBilled)}
            </Text>

            {data.inputTax.byRate.length > 0 ? (
              <Table
                columns={inputTaxColumns}
                dataSource={data.inputTax.byRate}
                rowKey="rateCode"
                pagination={false}
                size="small"
              />
            ) : (
              <Empty description="No input tax data" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>

          {/* Section C: Summary / Net Tax */}
          <Card
            title={
              <span>
                <DollarOutlined style={{ marginRight: 8 }} />
                Section C: Tax Summary
              </span>
            }
          >
            <Row gutter={[24, 24]} justify="center">
              <Col xs={24} sm={8} style={{ textAlign: 'center' }}>
                <Statistic
                  title="Total Output Tax"
                  value={data.summary.totalOutputTax}
                  prefix="RM"
                  precision={2}
                  valueStyle={{ color: '#1677ff' }}
                />
              </Col>
              <Col
                xs={24}
                sm={2}
                style={{
                  textAlign: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 24, fontWeight: 'bold' }}>-</Text>
              </Col>
              <Col xs={24} sm={8} style={{ textAlign: 'center' }}>
                <Statistic
                  title="Total Input Tax"
                  value={data.summary.totalInputTax}
                  prefix="RM"
                  precision={2}
                  valueStyle={{ color: '#722ed1' }}
                />
              </Col>
              <Col
                xs={24}
                sm={2}
                style={{
                  textAlign: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 24, fontWeight: 'bold' }}>=</Text>
              </Col>
              <Col xs={24} sm={4} style={{ textAlign: 'center' }}>
                <Statistic
                  title={data.summary.isRefundDue ? 'Tax Refund Due' : 'Net Tax Payable'}
                  value={Math.abs(data.summary.netTaxPayable)}
                  prefix="RM"
                  precision={2}
                  valueStyle={{
                    color: data.summary.isRefundDue ? '#52c41a' : '#ff4d4f',
                    fontWeight: 'bold',
                  }}
                />
              </Col>
            </Row>

            {data.summary.isRefundDue && (
              <Alert
                type="success"
                message="Tax Refund Due"
                description={`Your input tax credits exceed output tax. You are eligible for a refund of ${formatRM(Math.abs(data.summary.netTaxPayable))}.`}
                showIcon
                style={{ marginTop: 16 }}
              />
            )}
          </Card>
        </>
      )}
    </div>
  );
}
