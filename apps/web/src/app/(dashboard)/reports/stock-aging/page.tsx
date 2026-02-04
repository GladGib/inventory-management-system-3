'use client';

import { useState, useMemo } from 'react';
import {
  Breadcrumb,
  Table,
  Card,
  Typography,
  Empty,
  Skeleton,
  Select,
  Space,
  DatePicker,
  Tag,
  Row,
  Col,
  Checkbox,
} from 'antd';
import {
  HomeOutlined,
  BarChartOutlined,
  ClockCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useStockAging } from '@/hooks/use-reports';
import { ReportSummary, ExportDropdown } from '@/components/reports';
import type { StockAgingItem, StockAgingBucket } from '@/lib/reports';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

// Age bucket colors
const BUCKET_COLORS: Record<string, string> = {
  '0-30 days': '#52c41a',
  '31-60 days': '#73d13d',
  '61-90 days': '#fadb14',
  '91-180 days': '#fa8c16',
  '181+ days': '#f5222d',
};

function getBucketColor(bucket: string): string {
  // Match the bucket label to a color
  for (const [key, color] of Object.entries(BUCKET_COLORS)) {
    if (bucket.includes(key.split(' ')[0].split('-')[0])) {
      return color;
    }
  }
  // Default colors based on days
  if (bucket.includes('0-30')) return '#52c41a';
  if (bucket.includes('31-60')) return '#73d13d';
  if (bucket.includes('61-90')) return '#fadb14';
  if (bucket.includes('91-180')) return '#fa8c16';
  return '#f5222d';
}

function AgingDistributionChart({ buckets }: { buckets: StockAgingBucket[] }) {
  const totalValue = buckets.reduce((sum, b) => sum + b.value, 0);

  return (
    <Card title="Aging Distribution by Value" size="small">
      <div style={{ display: 'flex', height: 32, borderRadius: 4, overflow: 'hidden' }}>
        {buckets.map((bucket, index) => {
          const width = totalValue > 0 ? (bucket.value / totalValue) * 100 : 0;
          if (width < 1) return null;
          return (
            <div
              key={index}
              style={{
                width: `${width}%`,
                backgroundColor: getBucketColor(bucket.label),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: 12,
                fontWeight: 500,
                minWidth: width > 5 ? 'auto' : 0,
              }}
              title={`${bucket.label}: RM ${bucket.value.toLocaleString('en-MY', { minimumFractionDigits: 2 })} (${bucket.percentOfValue.toFixed(1)}%)`}
            >
              {width > 10 ? `${bucket.percentOfValue.toFixed(0)}%` : ''}
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        {buckets.map((bucket, index) => (
          <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: 2,
                backgroundColor: getBucketColor(bucket.label),
              }}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {bucket.label}: {bucket.itemCount} items
            </Text>
          </div>
        ))}
      </div>
    </Card>
  );
}

function AgingValueCard({ buckets }: { buckets: StockAgingBucket[] }) {
  return (
    <Card title="Value by Age Bucket" size="small">
      <Row gutter={[8, 8]}>
        {buckets.map((bucket, index) => (
          <Col span={12} key={index}>
            <div
              style={{
                padding: 8,
                borderRadius: 4,
                backgroundColor: `${getBucketColor(bucket.label)}10`,
                borderLeft: `3px solid ${getBucketColor(bucket.label)}`,
              }}
            >
              <Text type="secondary" style={{ fontSize: 11 }}>
                {bucket.label}
              </Text>
              <div style={{ fontWeight: 600, fontSize: 14 }}>
                RM {bucket.value.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
              </div>
              <Text type="secondary" style={{ fontSize: 11 }}>
                {bucket.itemCount} items ({bucket.percentOfValue.toFixed(1)}%)
              </Text>
            </div>
          </Col>
        ))}
      </Row>
    </Card>
  );
}

export default function StockAgingReportPage() {
  const router = useRouter();
  const [warehouseId, setWarehouseId] = useState<string | undefined>(undefined);
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [asOfDate, setAsOfDate] = useState<dayjs.Dayjs | null>(dayjs());
  const [showSlowMovingOnly, setShowSlowMovingOnly] = useState(false);

  const filters = {
    warehouseId,
    categoryId,
    asOfDate: asOfDate?.format('YYYY-MM-DD'),
  };

  const { data, isLoading } = useStockAging(filters);

  const filteredItems = useMemo(() => {
    if (!data?.items) return [];
    if (showSlowMovingOnly) {
      return data.items.filter((item) => item.isSlowMoving);
    }
    return data.items;
  }, [data?.items, showSlowMovingOnly]);

  const formatCurrency = (value: number) => {
    return `RM ${value.toLocaleString('en-MY', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return dayjs(date).format('DD/MM/YYYY');
  };

  const columns: ColumnsType<StockAgingItem> = [
    {
      title: 'SKU',
      dataIndex: 'sku',
      key: 'sku',
      width: 120,
      sorter: (a, b) => a.sku.localeCompare(b.sku),
    },
    {
      title: 'Item Name',
      dataIndex: 'itemName',
      key: 'itemName',
      sorter: (a, b) => a.itemName.localeCompare(b.itemName),
      render: (text, record) => (
        <Link href={`/inventory/items/${record.itemId}`} onClick={(e) => e.stopPropagation()}>
          {text}
        </Link>
      ),
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      filters: data?.items
        ? Array.from(new Set(data.items.map((i) => i.category))).map((c) => ({
            text: c,
            value: c,
          }))
        : [],
      onFilter: (value, record) => record.category === value,
    },
    {
      title: 'Qty',
      dataIndex: 'quantity',
      key: 'quantity',
      align: 'right',
      width: 80,
      sorter: (a, b) => a.quantity - b.quantity,
      render: (value) => value.toLocaleString('en-MY'),
    },
    {
      title: 'Value',
      dataIndex: 'totalValue',
      key: 'totalValue',
      align: 'right',
      width: 120,
      sorter: (a, b) => a.totalValue - b.totalValue,
      render: (value) => formatCurrency(value),
    },
    {
      title: 'Age',
      dataIndex: 'ageDays',
      key: 'ageDays',
      align: 'right',
      width: 80,
      sorter: (a, b) => a.ageDays - b.ageDays,
      defaultSortOrder: 'descend',
      render: (days) => {
        let color = '#52c41a';
        if (days > 180) color = '#f5222d';
        else if (days > 90) color = '#fa8c16';
        else if (days > 60) color = '#fadb14';
        else if (days > 30) color = '#73d13d';
        return <Text style={{ color, fontWeight: 500 }}>{days} days</Text>;
      },
    },
    {
      title: 'Age Bucket',
      dataIndex: 'ageBucket',
      key: 'ageBucket',
      width: 120,
      filters: data?.buckets?.map((b) => ({ text: b.label, value: b.label })) || [],
      onFilter: (value, record) => record.ageBucket === value,
      render: (bucket) => (
        <Tag color={getBucketColor(bucket)} style={{ margin: 0 }}>
          {bucket}
        </Tag>
      ),
    },
    {
      title: 'Last Received',
      dataIndex: 'lastReceiveDate',
      key: 'lastReceiveDate',
      width: 110,
      render: formatDate,
    },
    {
      title: 'Last Sold',
      dataIndex: 'lastSaleDate',
      key: 'lastSaleDate',
      width: 110,
      render: formatDate,
    },
    {
      title: 'Days Since Sale',
      dataIndex: 'daysSinceLastSale',
      key: 'daysSinceLastSale',
      align: 'right',
      width: 100,
      render: (value) => (value !== null ? value : '-'),
    },
    {
      title: 'Status',
      key: 'status',
      width: 100,
      filters: [
        { text: 'Slow Moving', value: true },
        { text: 'Active', value: false },
      ],
      onFilter: (value, record) => record.isSlowMoving === value,
      render: (_, record) =>
        record.isSlowMoving ? (
          <Tag color="warning" icon={<WarningOutlined />}>
            Slow
          </Tag>
        ) : (
          <Tag color="success">Active</Tag>
        ),
    },
  ];

  const summaryItems = data
    ? [
        {
          title: 'Total Items',
          value: data.summary.totalItems,
        },
        {
          title: 'Total Value',
          value: formatCurrency(data.summary.totalValue),
          valueStyle: { fontWeight: 600 },
        },
        {
          title: 'Average Age',
          value: `${data.summary.avgAge} days`,
        },
        {
          title: 'Slow Moving Items',
          value: data.summary.slowMovingCount,
          valueStyle: { color: data.summary.slowMovingCount > 0 ? '#fa8c16' : '#52c41a' },
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
                <BarChartOutlined />
                <span>Reports</span>
              </>
            ),
          },
          { title: 'Stock Aging' },
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
          <ClockCircleOutlined style={{ marginRight: 8 }} />
          Stock Aging Report
        </Title>
        <ExportDropdown
          reportType="inventory/stock-aging"
          params={filters}
          reportName="stock-aging"
          disabled={isLoading || !data}
        />
      </div>

      <Card size="small" style={{ marginBottom: 16 }}>
        <Space align="center" wrap>
          <Space>
            <Text strong>As of Date:</Text>
            <DatePicker
              value={asOfDate}
              onChange={setAsOfDate}
              allowClear={false}
              disabled={isLoading}
              format="DD/MM/YYYY"
            />
          </Space>
          <Space>
            <Text strong>Warehouse:</Text>
            <Select
              style={{ width: 180 }}
              placeholder="All Warehouses"
              allowClear
              value={warehouseId}
              onChange={setWarehouseId}
              disabled={isLoading}
            >
              <Option value={undefined}>All Warehouses</Option>
            </Select>
          </Space>
          <Space>
            <Text strong>Category:</Text>
            <Select
              style={{ width: 180 }}
              placeholder="All Categories"
              allowClear
              value={categoryId}
              onChange={setCategoryId}
              disabled={isLoading}
            >
              <Option value={undefined}>All Categories</Option>
            </Select>
          </Space>
        </Space>
      </Card>

      {isLoading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : (
        <>
          <ReportSummary items={summaryItems} />

          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col xs={24} lg={12}>
              {data?.buckets && <AgingDistributionChart buckets={data.buckets} />}
            </Col>
            <Col xs={24} lg={12}>
              {data?.buckets && <AgingValueCard buckets={data.buckets} />}
            </Col>
          </Row>

          {data?.summary.slowMovingValue && data.summary.slowMovingValue > 0 && (
            <Card
              size="small"
              style={{
                marginBottom: 16,
                backgroundColor: '#fff7e6',
                borderColor: '#ffd591',
              }}
            >
              <Row align="middle" gutter={16}>
                <Col>
                  <WarningOutlined style={{ fontSize: 24, color: '#fa8c16' }} />
                </Col>
                <Col flex={1}>
                  <Text strong>Slow Moving Inventory Alert</Text>
                  <br />
                  <Text type="secondary">
                    {data.summary.slowMovingCount} items worth{' '}
                    <Text strong style={{ color: '#fa8c16' }}>
                      {formatCurrency(data.summary.slowMovingValue)}
                    </Text>{' '}
                    have not been sold in over 90 days. Consider reviewing pricing or running
                    promotions.
                  </Text>
                </Col>
              </Row>
            </Card>
          )}

          <Card
            title={
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <span>Stock Items</span>
                <Checkbox
                  checked={showSlowMovingOnly}
                  onChange={(e) => setShowSlowMovingOnly(e.target.checked)}
                >
                  Show slow moving only
                </Checkbox>
              </div>
            }
          >
            {filteredItems.length === 0 ? (
              <Empty description="No inventory items found" />
            ) : (
              <Table
                columns={columns}
                dataSource={filteredItems}
                rowKey="itemId"
                loading={isLoading}
                pagination={{
                  defaultPageSize: 20,
                  showSizeChanger: true,
                  showTotal: (total) => `Total ${total} items`,
                  pageSizeOptions: ['10', '20', '50', '100'],
                }}
                scroll={{ x: 1400 }}
                size="small"
                onRow={(record) => ({
                  onClick: () => router.push(`/inventory/items/${record.itemId}`),
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
