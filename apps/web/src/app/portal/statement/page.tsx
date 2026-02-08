'use client';

import { useState } from 'react';
import {
  Card,
  Table,
  Tag,
  Typography,
  DatePicker,
  Space,
  Spin,
  Alert,
  Descriptions,
  Row,
  Col,
  Statistic,
  Divider,
  Button,
} from 'antd';
import { PrinterOutlined, DownloadOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { portalCustomerService, StatementEntry, Statement } from '@/lib/portal-api';
import dayjs, { Dayjs } from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const entryTypeColors: Record<string, string> = {
  INVOICE: 'blue',
  PAYMENT: 'green',
  CREDIT_NOTE: 'orange',
};

export default function PortalStatementPage() {
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);

  const startDate = dateRange?.[0]?.format('YYYY-MM-DD');
  const endDate = dateRange?.[1]?.format('YYYY-MM-DD');

  const { data, isLoading, error } = useQuery({
    queryKey: ['portal', 'statement', startDate, endDate],
    queryFn: () =>
      portalCustomerService.getStatement({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      }),
  });

  const formatCurrency = (value: number) =>
    `RM ${value.toLocaleString('en-MY', { minimumFractionDigits: 2 })}`;

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        type="error"
        message="Failed to load statement"
        description="Please try refreshing the page."
        showIcon
      />
    );
  }

  const statement = data as Statement;

  const columns = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      width: 120,
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type: string) => (
        <Tag color={entryTypeColors[type] || 'default'}>
          {type.replace(/_/g, ' ')}
        </Tag>
      ),
    },
    {
      title: 'Reference',
      dataIndex: 'reference',
      key: 'reference',
      render: (ref: string) => <Text strong>{ref}</Text>,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'Debit',
      dataIndex: 'debit',
      key: 'debit',
      align: 'right' as const,
      render: (val: number) =>
        val > 0 ? (
          <Text>{formatCurrency(val)}</Text>
        ) : (
          '-'
        ),
    },
    {
      title: 'Credit',
      dataIndex: 'credit',
      key: 'credit',
      align: 'right' as const,
      render: (val: number) =>
        val > 0 ? (
          <Text type="success">{formatCurrency(val)}</Text>
        ) : (
          '-'
        ),
    },
    {
      title: 'Balance',
      dataIndex: 'balance',
      key: 'balance',
      align: 'right' as const,
      render: (balance: number) => (
        <Text strong type={balance > 0 ? 'danger' : 'success'}>
          {formatCurrency(balance)}
        </Text>
      ),
    },
  ];

  const outstandingColumns = [
    {
      title: 'Invoice #',
      dataIndex: 'invoiceNumber',
      key: 'invoiceNumber',
    },
    {
      title: 'Due Date',
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: (date: string) => {
        const d = new Date(date);
        const isOverdue = d < new Date();
        return (
          <Text type={isOverdue ? 'danger' : undefined}>
            {d.toLocaleDateString()}
          </Text>
        );
      },
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      align: 'right' as const,
      render: (val: number) => formatCurrency(Number(val)),
    },
    {
      title: 'Balance',
      dataIndex: 'balance',
      key: 'balance',
      align: 'right' as const,
      render: (val: number) => (
        <Text strong type="danger">
          {formatCurrency(Number(val))}
        </Text>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>
          Account Statement
        </Title>
        <Space>
          <RangePicker
            value={dateRange}
            onChange={(dates) => setDateRange(dates)}
            format="DD/MM/YYYY"
            placeholder={['Start Date', 'End Date']}
          />
        </Space>
      </div>

      {/* Customer Info & Summary */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="Account Information" size="small">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Company">
                {statement.contact?.companyName || statement.contact?.displayName}
              </Descriptions.Item>
              <Descriptions.Item label="Contact">
                {statement.contact?.displayName}
              </Descriptions.Item>
              {statement.contact?.email && (
                <Descriptions.Item label="Email">
                  {statement.contact.email}
                </Descriptions.Item>
              )}
              <Descriptions.Item label="Period">
                {new Date(statement.period.startDate).toLocaleDateString()} -{' '}
                {new Date(statement.period.endDate).toLocaleDateString()}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card size="small">
            <Row gutter={16}>
              <Col span={12}>
                <Statistic
                  title="Total Invoiced"
                  value={statement.summary.totalInvoiced}
                  precision={2}
                  prefix="RM"
                  valueStyle={{ fontSize: 18 }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Total Paid"
                  value={statement.summary.totalPaid}
                  precision={2}
                  prefix="RM"
                  valueStyle={{ fontSize: 18, color: '#3f8600' }}
                />
              </Col>
              <Col span={12} style={{ marginTop: 16 }}>
                <Statistic
                  title="Credits"
                  value={statement.summary.totalCredits}
                  precision={2}
                  prefix="RM"
                  valueStyle={{ fontSize: 18 }}
                />
              </Col>
              <Col span={12} style={{ marginTop: 16 }}>
                <Statistic
                  title="Total Outstanding"
                  value={statement.summary.totalOutstanding}
                  precision={2}
                  prefix="RM"
                  valueStyle={{
                    fontSize: 18,
                    color: statement.summary.totalOutstanding > 0 ? '#cf1322' : '#3f8600',
                  }}
                />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* Statement Entries */}
      <Card
        title="Statement Transactions"
        bodyStyle={{ padding: 0 }}
        style={{ marginBottom: 24 }}
      >
        <Table
          columns={columns}
          dataSource={statement.entries}
          rowKey={(record, index) => `${record.reference}-${index}`}
          pagination={false}
          size="small"
          scroll={{ x: 800 }}
          summary={() => (
            <Table.Summary>
              <Table.Summary.Row style={{ background: '#fafafa' }}>
                <Table.Summary.Cell index={0} colSpan={4}>
                  <Text strong>Closing Balance</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={4} align="right">
                  <Text strong>{formatCurrency(statement.summary.totalInvoiced)}</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={5} align="right">
                  <Text strong type="success">
                    {formatCurrency(statement.summary.totalPaid + statement.summary.totalCredits)}
                  </Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={6} align="right">
                  <Text
                    strong
                    type={statement.summary.closingBalance > 0 ? 'danger' : 'success'}
                    style={{ fontSize: 16 }}
                  >
                    {formatCurrency(statement.summary.closingBalance)}
                  </Text>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          )}
        />
      </Card>

      {/* Outstanding Invoices */}
      {statement.outstandingInvoices.length > 0 && (
        <Card title="Outstanding Invoices" bodyStyle={{ padding: 0 }}>
          <Table
            columns={outstandingColumns}
            dataSource={statement.outstandingInvoices}
            rowKey="invoiceNumber"
            pagination={false}
            size="small"
            summary={() => (
              <Table.Summary>
                <Table.Summary.Row style={{ background: '#fafafa' }}>
                  <Table.Summary.Cell index={0} colSpan={3}>
                    <Text strong>Total Outstanding</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={3} align="right">
                    <Text strong type="danger" style={{ fontSize: 16 }}>
                      {formatCurrency(statement.summary.totalOutstanding)}
                    </Text>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              </Table.Summary>
            )}
          />
        </Card>
      )}
    </div>
  );
}
