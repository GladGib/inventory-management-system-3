'use client';

import { useState } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  DatePicker,
  Select,
  Typography,
  Dropdown,
  Descriptions,
} from 'antd';
import type { MenuProps } from 'antd';
import {
  DownloadOutlined,
  FileExcelOutlined,
  FileTextOutlined,
  ExpandOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  useJournalEntries,
  useExportJournalEntries,
} from '@/hooks/use-accounting';
import type {
  JournalEntry,
  JournalEntryLine,
  JournalEntryStatus,
} from '@/lib/accounting';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const SOURCE_TYPE_OPTIONS = [
  { value: '', label: 'All Sources' },
  { value: 'INVOICE', label: 'Invoice' },
  { value: 'PAYMENT', label: 'Payment' },
  { value: 'BILL', label: 'Bill' },
  { value: 'VENDOR_PAYMENT', label: 'Vendor Payment' },
  { value: 'ADJUSTMENT', label: 'Adjustment' },
  { value: 'MANUAL', label: 'Manual' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'POSTED', label: 'Posted' },
];

function formatCurrency(value: number): string {
  return value.toLocaleString('en-MY', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getStatusColor(status: JournalEntryStatus): string {
  return status === 'POSTED' ? 'green' : 'gold';
}

function getSourceTypeColor(sourceType: string | null | undefined): string {
  const colors: Record<string, string> = {
    INVOICE: 'blue',
    PAYMENT: 'green',
    BILL: 'orange',
    VENDOR_PAYMENT: 'purple',
    ADJUSTMENT: 'gold',
    MANUAL: 'default',
  };
  return colors[sourceType || ''] || 'default';
}

export default function JournalEntriesPage() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([null, null]);
  const [sourceType, setSourceType] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);

  const exportMutation = useExportJournalEntries();

  const queryParams = {
    page,
    limit: pageSize,
    ...(dateRange[0] && { dateFrom: dateRange[0].toISOString() }),
    ...(dateRange[1] && { dateTo: dateRange[1].toISOString() }),
    ...(sourceType && { sourceType }),
    ...(status && { status: status as JournalEntryStatus }),
  };

  const { data, isLoading } = useJournalEntries(queryParams);

  const handleExport = (format: 'csv' | 'excel') => {
    exportMutation.mutate({
      format,
      dateFrom: dateRange[0]?.toISOString(),
      dateTo: dateRange[1]?.toISOString(),
    });
  };

  const exportMenuItems: MenuProps['items'] = [
    {
      key: 'excel',
      label: 'Export to Excel',
      icon: <FileExcelOutlined />,
      onClick: () => handleExport('excel'),
    },
    {
      key: 'csv',
      label: 'Export to CSV',
      icon: <FileTextOutlined />,
      onClick: () => handleExport('csv'),
    },
  ];

  const toggleExpand = (id: string) => {
    setExpandedRowKeys((prev) =>
      prev.includes(id) ? prev.filter((k) => k !== id) : [...prev, id],
    );
  };

  const columns = [
    {
      title: '',
      key: 'expand',
      width: 40,
      render: (_: any, record: JournalEntry) => (
        <Button
          type="text"
          size="small"
          icon={<ExpandOutlined />}
          onClick={() => toggleExpand(record.id)}
        />
      ),
    },
    {
      title: 'Entry #',
      dataIndex: 'entryNumber',
      key: 'entryNumber',
      width: 120,
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      width: 120,
      render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
      sorter: (a: JournalEntry, b: JournalEntry) =>
        dayjs(a.date).unix() - dayjs(b.date).unix(),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'Source',
      dataIndex: 'sourceType',
      key: 'sourceType',
      width: 130,
      render: (val: string | null) => (
        <Tag color={getSourceTypeColor(val)}>{val || 'MANUAL'}</Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (val: JournalEntryStatus) => (
        <Tag color={getStatusColor(val)}>{val}</Tag>
      ),
    },
    {
      title: 'Total Debit',
      key: 'totalDebit',
      width: 140,
      align: 'right' as const,
      render: (_: any, record: JournalEntry) => {
        const total = (record.lines || []).reduce(
          (sum, line) => sum + Number(line.debit),
          0,
        );
        return <Text strong>{formatCurrency(total)}</Text>;
      },
    },
    {
      title: 'Total Credit',
      key: 'totalCredit',
      width: 140,
      align: 'right' as const,
      render: (_: any, record: JournalEntry) => {
        const total = (record.lines || []).reduce(
          (sum, line) => sum + Number(line.credit),
          0,
        );
        return <Text strong>{formatCurrency(total)}</Text>;
      },
    },
  ];

  const expandedRowRender = (record: JournalEntry) => {
    const lineColumns = [
      {
        title: 'Account Code',
        key: 'accountCode',
        width: 120,
        render: (_: any, line: JournalEntryLine) => line.account?.accountCode || '-',
      },
      {
        title: 'Account Name',
        key: 'accountName',
        render: (_: any, line: JournalEntryLine) => line.account?.name || '-',
      },
      {
        title: 'Description',
        dataIndex: 'description',
        key: 'description',
        ellipsis: true,
      },
      {
        title: 'Debit (MYR)',
        dataIndex: 'debit',
        key: 'debit',
        width: 140,
        align: 'right' as const,
        render: (val: number) => (
          <Text type={Number(val) > 0 ? undefined : 'secondary'}>
            {Number(val) > 0 ? formatCurrency(Number(val)) : '-'}
          </Text>
        ),
      },
      {
        title: 'Credit (MYR)',
        dataIndex: 'credit',
        key: 'credit',
        width: 140,
        align: 'right' as const,
        render: (val: number) => (
          <Text type={Number(val) > 0 ? undefined : 'secondary'}>
            {Number(val) > 0 ? formatCurrency(Number(val)) : '-'}
          </Text>
        ),
      },
    ];

    return (
      <Table
        columns={lineColumns}
        dataSource={record.lines || []}
        rowKey="id"
        pagination={false}
        size="small"
        style={{ margin: '0 0 0 40px' }}
      />
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>
          Journal Entries
        </Title>
        <Dropdown menu={{ items: exportMenuItems }} placement="bottomRight">
          <Button icon={<DownloadOutlined />} loading={exportMutation.isPending}>
            Export
          </Button>
        </Dropdown>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Space wrap size="middle">
          <div>
            <Text type="secondary" style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>
              Date Range
            </Text>
            <RangePicker
              value={dateRange}
              onChange={(values) =>
                setDateRange(values ? [values[0], values[1]] : [null, null])
              }
              format="DD/MM/YYYY"
              allowClear
            />
          </div>
          <div>
            <Text type="secondary" style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>
              Source Type
            </Text>
            <Select
              value={sourceType}
              onChange={setSourceType}
              options={SOURCE_TYPE_OPTIONS}
              style={{ width: 160 }}
            />
          </div>
          <div>
            <Text type="secondary" style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>
              Status
            </Text>
            <Select
              value={status}
              onChange={setStatus}
              options={STATUS_OPTIONS}
              style={{ width: 130 }}
            />
          </div>
        </Space>
      </Card>

      <Card>
        <Table
          columns={columns}
          dataSource={data?.data || []}
          rowKey="id"
          loading={isLoading}
          size="small"
          expandable={{
            expandedRowRender,
            expandedRowKeys,
            showExpandColumn: false,
          }}
          pagination={{
            current: page,
            pageSize,
            total: data?.meta?.total || 0,
            showTotal: (total) => `Total ${total} entries`,
            onChange: (p) => setPage(p),
          }}
        />
      </Card>
    </div>
  );
}
