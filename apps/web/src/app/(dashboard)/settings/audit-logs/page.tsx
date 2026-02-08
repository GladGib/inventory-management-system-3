'use client';

import { useState } from 'react';
import {
  Card,
  Table,
  Typography,
  Space,
  Select,
  DatePicker,
  Input,
  Tag,
  Button,
  Drawer,
  Descriptions,
  Empty,
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  EyeOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { api } from '@/lib/api';
import type { ColumnsType } from 'antd/es/table';

dayjs.extend(relativeTime);

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  changes: Record<string, unknown> | null;
  userId: string | null;
  userEmail: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  organizationId: string;
  createdAt: string;
}

interface AuditLogResponse {
  data: AuditLog[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'green',
  UPDATE: 'blue',
  DELETE: 'red',
  LOGIN: 'purple',
  LOGOUT: 'default',
  EXPORT: 'orange',
};

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [entityType, setEntityType] = useState<string | undefined>();
  const [action, setAction] = useState<string | undefined>();
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data: auditLogs, isLoading, refetch } = useQuery<AuditLogResponse>({
    queryKey: ['audit-logs', page, limit, entityType, action, search, dateRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', String(limit));
      if (entityType) params.append('entityType', entityType);
      if (action) params.append('action', action);
      if (search) params.append('search', search);
      if (dateRange?.[0]) params.append('startDate', dateRange[0].toISOString());
      if (dateRange?.[1]) params.append('endDate', dateRange[1].toISOString());
      const response = await api.get(`/audit-logs?${params.toString()}`);
      return response.data;
    },
  });

  const { data: entityTypes } = useQuery<string[]>({
    queryKey: ['audit-log-entity-types'],
    queryFn: async () => {
      const response = await api.get('/audit-logs/entity-types');
      return response.data;
    },
  });

  const { data: actions } = useQuery<string[]>({
    queryKey: ['audit-log-actions'],
    queryFn: async () => {
      const response = await api.get('/audit-logs/actions');
      return response.data;
    },
  });

  const handleViewDetails = (record: AuditLog) => {
    setSelectedLog(record);
    setDrawerOpen(true);
  };

  const handleClearFilters = () => {
    setEntityType(undefined);
    setAction(undefined);
    setSearch('');
    setDateRange(null);
    setPage(1);
  };

  const columns: ColumnsType<AuditLog> = [
    {
      title: 'Time',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (val: string) => (
        <Space direction="vertical" size={0}>
          <Text style={{ fontSize: 13 }}>{dayjs(val).format('YYYY-MM-DD HH:mm:ss')}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>{dayjs(val).fromNow()}</Text>
        </Space>
      ),
    },
    {
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
      width: 100,
      render: (val: string) => (
        <Tag color={ACTION_COLORS[val] || 'default'}>{val}</Tag>
      ),
    },
    {
      title: 'Entity Type',
      dataIndex: 'entityType',
      key: 'entityType',
      width: 140,
      render: (val: string) => <Text strong>{val}</Text>,
    },
    {
      title: 'Entity ID',
      dataIndex: 'entityId',
      key: 'entityId',
      width: 200,
      ellipsis: true,
      render: (val: string | null) =>
        val ? (
          <Text code style={{ fontSize: 12 }}>
            {val}
          </Text>
        ) : (
          <Text type="secondary">--</Text>
        ),
    },
    {
      title: 'User',
      dataIndex: 'userEmail',
      key: 'userEmail',
      width: 200,
      ellipsis: true,
      render: (val: string | null) => val || <Text type="secondary">System</Text>,
    },
    {
      title: 'IP Address',
      dataIndex: 'ipAddress',
      key: 'ipAddress',
      width: 130,
      render: (val: string | null) =>
        val ? <Text style={{ fontSize: 12 }}>{val}</Text> : <Text type="secondary">--</Text>,
    },
    {
      title: '',
      key: 'actions',
      width: 60,
      render: (_: unknown, record: AuditLog) => (
        <Button
          type="text"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => handleViewDetails(record)}
        />
      ),
    },
  ];

  const renderChanges = (changes: Record<string, unknown> | null) => {
    if (!changes) return <Empty description="No change data recorded" />;

    return (
      <pre
        style={{
          background: '#f5f5f5',
          padding: 12,
          borderRadius: 6,
          maxHeight: 400,
          overflow: 'auto',
          fontSize: 12,
          lineHeight: 1.5,
        }}
      >
        {JSON.stringify(changes, null, 2)}
      </pre>
    );
  };

  return (
    <div>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={4} style={{ margin: 0 }}>
            Audit Logs
          </Title>
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
            Refresh
          </Button>
        </div>

        <Card size="small">
          <Space wrap size="middle">
            <Input
              placeholder="Search logs..."
              prefix={<SearchOutlined />}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              style={{ width: 220 }}
              allowClear
            />

            <Select
              placeholder="Entity Type"
              value={entityType}
              onChange={(val) => {
                setEntityType(val);
                setPage(1);
              }}
              style={{ width: 160 }}
              allowClear
              options={(entityTypes || []).map((t) => ({ value: t, label: t }))}
            />

            <Select
              placeholder="Action"
              value={action}
              onChange={(val) => {
                setAction(val);
                setPage(1);
              }}
              style={{ width: 130 }}
              allowClear
              options={(actions || []).map((a) => ({ value: a, label: a }))}
            />

            <RangePicker
              value={dateRange}
              onChange={(val) => {
                setDateRange(val as [dayjs.Dayjs, dayjs.Dayjs] | null);
                setPage(1);
              }}
              showTime
            />

            <Button
              icon={<FilterOutlined />}
              onClick={handleClearFilters}
            >
              Clear Filters
            </Button>
          </Space>
        </Card>

        <Card>
          <Table
            columns={columns}
            dataSource={auditLogs?.data || []}
            rowKey="id"
            loading={isLoading}
            pagination={{
              current: page,
              pageSize: limit,
              total: auditLogs?.meta?.total || 0,
              showTotal: (total) => `Total ${total} entries`,
              showSizeChanger: false,
              onChange: (p) => setPage(p),
            }}
            size="small"
            scroll={{ x: 1000 }}
          />
        </Card>
      </Space>

      <Drawer
        title="Audit Log Details"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={560}
      >
        {selectedLog && (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="ID">
                <Text code style={{ fontSize: 11 }}>{selectedLog.id}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Action">
                <Tag color={ACTION_COLORS[selectedLog.action] || 'default'}>
                  {selectedLog.action}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Entity Type">
                <Text strong>{selectedLog.entityType}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Entity ID">
                {selectedLog.entityId ? (
                  <Text code>{selectedLog.entityId}</Text>
                ) : (
                  <Text type="secondary">--</Text>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="User Email">
                {selectedLog.userEmail || 'System'}
              </Descriptions.Item>
              <Descriptions.Item label="User ID">
                {selectedLog.userId ? (
                  <Text code style={{ fontSize: 11 }}>{selectedLog.userId}</Text>
                ) : (
                  <Text type="secondary">--</Text>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="IP Address">
                {selectedLog.ipAddress || '--'}
              </Descriptions.Item>
              <Descriptions.Item label="User Agent">
                <Text style={{ fontSize: 11, wordBreak: 'break-all' }}>
                  {selectedLog.userAgent || '--'}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Timestamp">
                {dayjs(selectedLog.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                <Text type="secondary" style={{ marginLeft: 8 }}>
                  ({dayjs(selectedLog.createdAt).fromNow()})
                </Text>
              </Descriptions.Item>
            </Descriptions>

            <div>
              <Title level={5}>Changes</Title>
              {renderChanges(selectedLog.changes)}
            </div>
          </Space>
        )}
      </Drawer>
    </div>
  );
}
