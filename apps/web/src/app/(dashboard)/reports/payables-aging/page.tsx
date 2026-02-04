'use client';

import { Breadcrumb, Table, Card, Typography, Empty, Skeleton, Space, Tag } from 'antd';
import { HomeOutlined, BarChartOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePayablesAging } from '@/hooks/use-reports';
import { ReportSummary } from '@/components/reports';
import type { PayablesAgingItem } from '@/lib/reports';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;

export default function PayablesAgingPage() {
  const router = useRouter();
  const { data, isLoading } = usePayablesAging();

  const handleRowClick = (record: PayablesAgingItem) => {
    router.push(`/contacts/${record.vendorId}`);
  };

  const formatCurrency = (value: number) => {
    return `RM ${value.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getAmountColor = (column: string): string => {
    switch (column) {
      case 'over90':
        return '#ff4d4f'; // red
      case 'days61to90':
        return '#fa8c16'; // orange
      case 'days31to60':
        return '#faad14'; // yellow/gold
      case 'days1to30':
        return '#1890ff'; // blue
      default:
        return 'inherit';
    }
  };

  const columns: ColumnsType<PayablesAgingItem> = [
    {
      title: 'Vendor',
      dataIndex: 'vendorName',
      key: 'vendorName',
      fixed: 'left',
      sorter: (a, b) => a.vendorName.localeCompare(b.vendorName),
      render: (text, record) => (
        <Link href={`/contacts/${record.vendorId}`} onClick={(e) => e.stopPropagation()}>
          {text}
        </Link>
      ),
    },
    {
      title: 'Current',
      dataIndex: 'current',
      key: 'current',
      align: 'right',
      sorter: (a, b) => a.current - b.current,
      render: (value) => <Text>{formatCurrency(value)}</Text>,
      width: 150,
    },
    {
      title: '1-30 Days',
      dataIndex: 'days1to30',
      key: 'days1to30',
      align: 'right',
      sorter: (a, b) => a.days1to30 - b.days1to30,
      render: (value) => (
        <Text style={{ color: value > 0 ? getAmountColor('days1to30') : 'inherit' }}>
          {formatCurrency(value)}
        </Text>
      ),
      width: 150,
    },
    {
      title: '31-60 Days',
      dataIndex: 'days31to60',
      key: 'days31to60',
      align: 'right',
      sorter: (a, b) => a.days31to60 - b.days31to60,
      render: (value) => (
        <Text
          style={{
            color: value > 0 ? getAmountColor('days31to60') : 'inherit',
            fontWeight: value > 0 ? 500 : 'normal',
          }}
        >
          {formatCurrency(value)}
        </Text>
      ),
      width: 150,
    },
    {
      title: '61-90 Days',
      dataIndex: 'days61to90',
      key: 'days61to90',
      align: 'right',
      sorter: (a, b) => a.days61to90 - b.days61to90,
      render: (value) => (
        <Text
          style={{
            color: value > 0 ? getAmountColor('days61to90') : 'inherit',
            fontWeight: value > 0 ? 600 : 'normal',
          }}
        >
          {formatCurrency(value)}
        </Text>
      ),
      width: 150,
    },
    {
      title: '> 90 Days',
      dataIndex: 'over90',
      key: 'over90',
      align: 'right',
      sorter: (a, b) => a.over90 - b.over90,
      render: (value) => (
        <Text strong style={{ color: value > 0 ? getAmountColor('over90') : 'inherit' }}>
          {formatCurrency(value)}
        </Text>
      ),
      width: 150,
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      align: 'right',
      fixed: 'right',
      sorter: (a, b) => a.total - b.total,
      render: (value) => <Text strong>{formatCurrency(value)}</Text>,
      width: 180,
    },
  ];

  const summaryItems = data?.summary
    ? [
        {
          title: 'Current',
          value: formatCurrency(data.summary.current),
        },
        {
          title: '1-30 Days',
          value: formatCurrency(data.summary.days1to30),
          valueStyle: { color: getAmountColor('days1to30') },
        },
        {
          title: '31-60 Days',
          value: formatCurrency(data.summary.days31to60),
          valueStyle: { color: getAmountColor('days31to60') },
        },
        {
          title: '61-90 Days',
          value: formatCurrency(data.summary.days61to90),
          valueStyle: { color: getAmountColor('days61to90') },
        },
        {
          title: '> 90 Days',
          value: formatCurrency(data.summary.over90),
          valueStyle: { color: getAmountColor('over90') },
        },
        {
          title: 'Total Outstanding',
          value: formatCurrency(data.summary.total),
          valueStyle: { fontWeight: 600 },
        },
      ]
    : [];

  return (
    <div>
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          {
            href: '/',
            title: <HomeOutlined />,
          },
          {
            href: '/reports',
            title: (
              <>
                <BarChartOutlined />
                <span>Reports</span>
              </>
            ),
          },
          {
            title: 'Payables Aging',
          },
        ]}
      />

      <Title level={4} style={{ marginBottom: 16 }}>
        Payables Aging
      </Title>

      <Space direction="vertical" size="small" style={{ marginBottom: 16 }}>
        <Text type="secondary">Outstanding vendor bills grouped by aging period</Text>
        <Space>
          <Tag color="default">Current</Tag>
          <Tag color="blue">1-30 Days</Tag>
          <Tag color="gold">31-60 Days</Tag>
          <Tag color="orange">61-90 Days</Tag>
          <Tag color="red">Over 90 Days</Tag>
        </Space>
      </Space>

      {isLoading ? (
        <Skeleton active paragraph={{ rows: 4 }} />
      ) : (
        <>
          <ReportSummary items={summaryItems} />

          <Card>
            {data?.data.length === 0 ? (
              <Empty description="No outstanding payables" />
            ) : (
              <Table
                columns={columns}
                dataSource={data?.data}
                rowKey="vendorId"
                loading={isLoading}
                pagination={false}
                scroll={{ x: 1200 }}
                onRow={(record) => ({
                  onClick: () => handleRowClick(record),
                  style: { cursor: 'pointer' },
                })}
              />
            )}
          </Card>
        </>
      )}
    </div>
  );
}
