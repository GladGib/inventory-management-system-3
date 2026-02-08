'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Card,
  Typography,
  Button,
  Space,
  Table,
  Row,
  Col,
  Statistic,
  Popconfirm,
  Select,
} from 'antd';
import {
  AlertOutlined,
  ShoppingCartOutlined,
  SettingOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import type { TableColumnsType } from 'antd';
import {
  useReorderSuggestions,
  useReorderAlerts,
  useCheckReorderPoints,
  useCreateAutoReorderPO,
  useBulkCreatePOs,
  useAcknowledgeAlert,
  useResolveAlert,
} from '@/hooks/use-reorder';
import { ReorderAlertBadge } from '@/components/reorder/ReorderAlertBadge';
import { StockCoverageBar } from '@/components/reorder/StockCoverageBar';
import type { ReorderSuggestion, ReorderAlert, AlertStatus } from '@/lib/reorder';

const { Title, Text } = Typography;

export default function ReorderDashboardPage() {
  const [selectedAlertIds, setSelectedAlertIds] = useState<string[]>([]);
  const [alertFilters, setAlertFilters] = useState<{ status?: AlertStatus }>({});

  const { data: suggestions, isLoading: suggestionsLoading } = useReorderSuggestions();
  const { data: alertsResponse, isLoading: alertsLoading } = useReorderAlerts(alertFilters);

  const checkReorder = useCheckReorderPoints();
  const createPO = useCreateAutoReorderPO();
  const bulkCreatePOs = useBulkCreatePOs();
  const acknowledgeAlert = useAcknowledgeAlert();
  const resolveAlert = useResolveAlert();

  const alerts = alertsResponse?.data || [];
  const pendingCount = alerts.filter((a) => a.status === 'PENDING').length;

  // Suggestion table columns
  const suggestionColumns: TableColumnsType<ReorderSuggestion> = [
    {
      title: 'SKU',
      dataIndex: 'sku',
      key: 'sku',
      width: 120,
      render: (sku: string, record) => (
        <Link href={`/items/${record.itemId}`} style={{ fontWeight: 500 }}>
          {sku}
        </Link>
      ),
    },
    {
      title: 'Item Name',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
    },
    {
      title: 'Current Stock',
      key: 'currentStock',
      width: 120,
      align: 'right',
      render: (_, record) => (
        <StockCoverageBar currentStock={record.currentStock} reorderLevel={record.reorderLevel} />
      ),
    },
    {
      title: 'Reorder Level',
      dataIndex: 'reorderLevel',
      key: 'reorderLevel',
      width: 120,
      align: 'right',
    },
    {
      title: 'Suggested Qty',
      dataIndex: 'suggestedQty',
      key: 'suggestedQty',
      width: 120,
      align: 'right',
      render: (qty: number) => <Text strong>{qty}</Text>,
    },
    {
      title: 'Est. Cost',
      dataIndex: 'estimatedCost',
      key: 'estimatedCost',
      width: 120,
      align: 'right',
      render: (cost: number) => `RM ${cost.toFixed(2)}`,
    },
    {
      title: 'Preferred Vendor',
      key: 'vendor',
      width: 150,
      ellipsis: true,
      render: (_, record) =>
        record.preferredVendor?.displayName || <Text type="secondary">Not set</Text>,
    },
  ];

  // Alert table columns
  const alertColumns: TableColumnsType<ReorderAlert> = [
    {
      title: 'Item',
      key: 'item',
      render: (_, record) =>
        record.item ? `${record.item.sku} - ${record.item.name}` : record.itemId,
      ellipsis: true,
    },
    {
      title: 'Warehouse',
      key: 'warehouse',
      width: 130,
      render: (_, record) => record.warehouse?.name || '-',
    },
    {
      title: 'Stock',
      key: 'stock',
      width: 90,
      align: 'right',
      render: (_, record) => record.currentStock,
    },
    {
      title: 'Reorder At',
      key: 'reorderLevel',
      width: 100,
      align: 'right',
      render: (_, record) => record.reorderLevel,
    },
    {
      title: 'Suggested Qty',
      key: 'suggestedQty',
      width: 110,
      align: 'right',
      render: (_, record) => record.suggestedQty,
    },
    {
      title: 'Status',
      key: 'status',
      width: 130,
      render: (_, record) => <ReorderAlertBadge status={record.status} />,
    },
    {
      title: 'Created',
      key: 'createdAt',
      width: 100,
      render: (_, record) => new Date(record.createdAt).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      render: (_, record) => (
        <Space size="small">
          {record.status === 'PENDING' && (
            <>
              <Button type="link" size="small" onClick={() => acknowledgeAlert.mutate(record.id)}>
                Acknowledge
              </Button>
              <Popconfirm
                title="Create PO from this alert?"
                onConfirm={() => createPO.mutate({ alertId: record.id })}
              >
                <Button type="link" size="small">
                  Create PO
                </Button>
              </Popconfirm>
            </>
          )}
          {record.status === 'ACKNOWLEDGED' && (
            <Popconfirm
              title="Create PO from this alert?"
              onConfirm={() => createPO.mutate({ alertId: record.id })}
            >
              <Button type="link" size="small">
                Create PO
              </Button>
            </Popconfirm>
          )}
          {(record.status === 'PENDING' || record.status === 'ACKNOWLEDGED') && (
            <Button type="link" size="small" onClick={() => resolveAlert.mutate(record.id)}>
              Resolve
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <Title level={4} style={{ margin: 0 }}>
          Reorder Management
        </Title>
        <Space>
          <Link href="/inventory/reorder/settings">
            <Button icon={<SettingOutlined />}>Settings</Button>
          </Link>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => checkReorder.mutate()}
            loading={checkReorder.isPending}
          >
            Check Reorder Points
          </Button>
        </Space>
      </div>

      {/* KPI Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Items Below Reorder"
              value={suggestions?.length || 0}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: (suggestions?.length || 0) > 0 ? '#cf1322' : '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Pending Alerts"
              value={pendingCount}
              prefix={<AlertOutlined />}
              valueStyle={{ color: pendingCount > 0 ? '#faad14' : '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Total Alert Count"
              value={alertsResponse?.meta?.total || 0}
              prefix={<ShoppingCartOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Reorder Suggestions */}
      <Card
        title="Reorder Suggestions"
        style={{ marginBottom: 24 }}
        extra={
          <Space>
            {selectedAlertIds.length > 0 && (
              <Popconfirm
                title={`Create POs for ${selectedAlertIds.length} selected alerts?`}
                onConfirm={() => bulkCreatePOs.mutate(selectedAlertIds)}
              >
                <Button type="primary" size="small" loading={bulkCreatePOs.isPending}>
                  Bulk Create POs ({selectedAlertIds.length})
                </Button>
              </Popconfirm>
            )}
          </Space>
        }
      >
        <Table
          columns={suggestionColumns}
          dataSource={suggestions || []}
          rowKey="itemId"
          loading={suggestionsLoading}
          pagination={{ pageSize: 10, showSizeChanger: true }}
          scroll={{ x: 900 }}
          size="small"
        />
      </Card>

      {/* Reorder Alerts */}
      <Card
        title="Reorder Alerts"
        extra={
          <Select
            placeholder="Filter by status"
            style={{ width: 160 }}
            allowClear
            value={alertFilters.status}
            onChange={(value) => setAlertFilters({ status: value })}
            options={[
              { value: 'PENDING', label: 'Pending' },
              { value: 'ACKNOWLEDGED', label: 'Acknowledged' },
              { value: 'PO_CREATED', label: 'PO Created' },
              { value: 'RESOLVED', label: 'Resolved' },
            ]}
          />
        }
      >
        <Table
          columns={alertColumns}
          dataSource={alerts}
          rowKey="id"
          loading={alertsLoading}
          rowSelection={{
            type: 'checkbox',
            selectedRowKeys: selectedAlertIds,
            onChange: (keys) => setSelectedAlertIds(keys as string[]),
            getCheckboxProps: (record) => ({
              disabled: record.status === 'RESOLVED' || record.status === 'PO_CREATED',
            }),
          }}
          pagination={{
            current: alertsResponse?.meta?.page || 1,
            total: alertsResponse?.meta?.total || 0,
            pageSize: alertsResponse?.meta?.limit || 25,
            showSizeChanger: true,
          }}
          scroll={{ x: 1000 }}
          size="small"
        />
      </Card>
    </div>
  );
}
