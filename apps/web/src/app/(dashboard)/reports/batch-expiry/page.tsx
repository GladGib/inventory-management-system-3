'use client';

import { useState } from 'react';
import Link from 'next/link';
import dayjs from 'dayjs';
import {
  Card,
  Table,
  Typography,
  InputNumber,
  Space,
  Button,
  Tag,
  Tabs,
  Statistic,
  Row,
  Col,
} from 'antd';
import type { TableColumnsType } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useExpiringBatches, useExpiredBatches } from '@/hooks/use-batches';
import { BatchStatusTag } from '@/components/batch';
import type { Batch } from '@/lib/batch';

const { Title, Text } = Typography;

function getExpiryColor(daysUntilExpiry: number | null | undefined) {
  if (daysUntilExpiry === null || daysUntilExpiry === undefined) return 'default';
  if (daysUntilExpiry <= 0) return '#000';
  if (daysUntilExpiry <= 7) return 'red';
  if (daysUntilExpiry <= 30) return 'orange';
  return 'green';
}

export default function BatchExpiryReportPage() {
  const [days, setDays] = useState(30);
  const { data: expiringBatches, isLoading: expiringLoading } = useExpiringBatches(days);
  const { data: expiredBatches, isLoading: expiredLoading } = useExpiredBatches();

  const expiringColumns: TableColumnsType<Batch> = [
    {
      title: 'Item',
      key: 'item',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.item.sku}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.item.name}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Batch #',
      dataIndex: 'batchNumber',
      key: 'batchNumber',
      width: 150,
      render: (num: string, record: Batch) => (
        <Link href={`/inventory/batches/${record.id}`} style={{ fontWeight: 500 }}>
          {num}
        </Link>
      ),
    },
    {
      title: 'Warehouse',
      dataIndex: ['warehouse', 'name'],
      key: 'warehouse',
      width: 150,
    },
    {
      title: 'Expiry Date',
      dataIndex: 'expiryDate',
      key: 'expiryDate',
      width: 130,
      render: (date: string | null) => (date ? dayjs(date).format('DD/MM/YYYY') : '-'),
    },
    {
      title: 'Days Until Expiry',
      dataIndex: 'daysUntilExpiry',
      key: 'daysUntilExpiry',
      width: 160,
      render: (d: number | null) => {
        if (d === null || d === undefined) return '-';
        const color = getExpiryColor(d);
        return (
          <Tag
            color={color}
            style={color === '#000' ? { color: '#fff', backgroundColor: '#000' } : {}}
          >
            {d <= 0 ? `${Math.abs(d)} days ago` : `${d} day${d === 1 ? '' : 's'}`}
          </Tag>
        );
      },
    },
    {
      title: 'Qty',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100,
      align: 'right',
      render: (qty: number) => qty.toLocaleString(),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (status: Batch['status']) => <BatchStatusTag status={status} />,
    },
  ];

  const expiredColumns: TableColumnsType<Batch> = [
    {
      title: 'Item',
      key: 'item',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.item.sku}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.item.name}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Batch #',
      dataIndex: 'batchNumber',
      key: 'batchNumber',
      width: 150,
      render: (num: string, record: Batch) => (
        <Link href={`/inventory/batches/${record.id}`} style={{ fontWeight: 500 }}>
          {num}
        </Link>
      ),
    },
    {
      title: 'Warehouse',
      dataIndex: ['warehouse', 'name'],
      key: 'warehouse',
      width: 150,
    },
    {
      title: 'Expired On',
      dataIndex: 'expiryDate',
      key: 'expiryDate',
      width: 130,
      render: (date: string | null) => (date ? dayjs(date).format('DD/MM/YYYY') : '-'),
    },
    {
      title: 'Days Expired',
      dataIndex: 'daysExpired',
      key: 'daysExpired',
      width: 130,
      render: (d: number | null) => {
        if (d === null || d === undefined) return '-';
        return (
          <Tag style={{ color: '#fff', backgroundColor: '#000' }}>
            {d} day{d === 1 ? '' : 's'} ago
          </Tag>
        );
      },
    },
    {
      title: 'Qty Remaining',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 130,
      align: 'right',
      render: (qty: number) => (
        <Text type="danger" strong>
          {qty.toLocaleString()}
        </Text>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (status: Batch['status']) => <BatchStatusTag status={status} />,
    },
  ];

  const criticalCount = (expiringBatches || []).filter(
    (b) => b.daysUntilExpiry !== undefined && b.daysUntilExpiry !== null && b.daysUntilExpiry <= 7
  ).length;
  const warningCount = (expiringBatches || []).filter(
    (b) =>
      b.daysUntilExpiry !== undefined &&
      b.daysUntilExpiry !== null &&
      b.daysUntilExpiry > 7 &&
      b.daysUntilExpiry <= 30
  ).length;

  const tabItems = [
    {
      key: 'expiring',
      label: `Expiring Soon (${(expiringBatches || []).length})`,
      children: (
        <div>
          <div style={{ marginBottom: 16 }}>
            <Space>
              <Text>Show batches expiring within</Text>
              <InputNumber
                min={1}
                max={365}
                value={days}
                onChange={(v) => setDays(v || 30)}
                style={{ width: 80 }}
              />
              <Text>days</Text>
            </Space>
          </div>

          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={8}>
              <Card size="small">
                <Statistic
                  title="Total Expiring"
                  value={(expiringBatches || []).length}
                  valueStyle={{ color: '#faad14' }}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small">
                <Statistic
                  title="Critical (< 7 days)"
                  value={criticalCount}
                  valueStyle={{ color: '#ff4d4f' }}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small">
                <Statistic
                  title="Warning (7-30 days)"
                  value={warningCount}
                  valueStyle={{ color: '#faad14' }}
                />
              </Card>
            </Col>
          </Row>

          <Table
            columns={expiringColumns}
            dataSource={expiringBatches || []}
            rowKey="id"
            loading={expiringLoading}
            pagination={{
              showSizeChanger: true,
              showTotal: (total) => `Total ${total} batches`,
            }}
          />
        </div>
      ),
    },
    {
      key: 'expired',
      label: `Expired (${(expiredBatches || []).length})`,
      children: (
        <Table
          columns={expiredColumns}
          dataSource={expiredBatches || []}
          rowKey="id"
          loading={expiredLoading}
          pagination={{
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} batches`,
          }}
        />
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Space style={{ marginBottom: 8 }}>
          <Link href="/reports">
            <Button type="text" icon={<ArrowLeftOutlined />}>
              Back to Reports
            </Button>
          </Link>
        </Space>
        <Title level={4} style={{ margin: 0 }}>
          Batch Expiry Report
        </Title>
      </div>

      <Card>
        <Tabs items={tabItems} />
      </Card>
    </div>
  );
}
