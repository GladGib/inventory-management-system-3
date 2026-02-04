'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import {
  Card,
  Table,
  Button,
  Input,
  Space,
  Tag,
  Typography,
  Dropdown,
  Select,
  DatePicker,
  Modal,
  type MenuProps,
  type TableColumnsType,
  type TablePaginationConfig,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  FilterOutlined,
  MoreOutlined,
  EyeOutlined,
  EditOutlined,
  CheckOutlined,
  InboxOutlined,
  FileTextOutlined,
  CloseOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import {
  useSalesReturns,
  useApproveSalesReturn,
  useReceiveSalesReturn,
  useProcessSalesReturn,
  useRejectSalesReturn,
} from '@/hooks/use-sales';
import { SalesReturn, ReturnStatus, SalesReturnQueryParams } from '@/lib/sales';

const { Title } = Typography;
const { RangePicker } = DatePicker;
const { confirm } = Modal;

const statusColors: Record<ReturnStatus, string> = {
  PENDING: 'default',
  APPROVED: 'blue',
  RECEIVED: 'cyan',
  PROCESSED: 'green',
  REJECTED: 'red',
};

const reasonLabels: Record<string, string> = {
  DEFECTIVE: 'Defective',
  WRONG_ITEM: 'Wrong Item',
  CHANGED_MIND: 'Changed Mind',
  NOT_AS_DESCRIBED: 'Not as Described',
  QUALITY_ISSUE: 'Quality Issue',
  DUPLICATE_ORDER: 'Duplicate Order',
  OTHER: 'Other',
};

export default function SalesReturnsPage() {
  const router = useRouter();
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState<SalesReturnQueryParams>({
    page: 1,
    limit: 25,
  });

  const queryParams = useMemo(
    () => ({
      ...filters,
    }),
    [filters]
  );

  const { data, isLoading, isFetching } = useSalesReturns(queryParams);
  const approveReturn = useApproveSalesReturn();
  const receiveReturn = useReceiveSalesReturn();
  const processReturn = useProcessSalesReturn();
  const rejectReturn = useRejectSalesReturn();

  const handleApprove = (record: SalesReturn) => {
    confirm({
      title: 'Approve Return',
      icon: <CheckOutlined />,
      content: `Approve return ${record.returnNumber}?`,
      onOk: () => approveReturn.mutate(record.id),
    });
  };

  const handleReceive = (record: SalesReturn) => {
    confirm({
      title: 'Receive Return',
      icon: <InboxOutlined />,
      content: `Mark return ${record.returnNumber} as received? This will restore stock if enabled.`,
      onOk: () => receiveReturn.mutate(record.id),
    });
  };

  const handleProcess = (record: SalesReturn) => {
    confirm({
      title: 'Process Return',
      icon: <FileTextOutlined />,
      content: `Process return ${record.returnNumber}? This will generate a credit note.`,
      onOk: () => processReturn.mutate(record.id),
    });
  };

  const handleReject = (record: SalesReturn) => {
    confirm({
      title: 'Reject Return',
      icon: <ExclamationCircleOutlined />,
      content: `Are you sure you want to reject return ${record.returnNumber}?`,
      okText: 'Reject',
      okType: 'danger',
      onOk: () => rejectReturn.mutate(record.id),
    });
  };

  const getActionMenuItems = (record: SalesReturn): MenuProps['items'] => {
    const items: MenuProps['items'] = [
      {
        key: 'view',
        icon: <EyeOutlined />,
        label: 'View',
        onClick: () => router.push(`/sales/returns/${record.id}`),
      },
    ];

    if (record.status === 'PENDING') {
      items.push(
        {
          key: 'edit',
          icon: <EditOutlined />,
          label: 'Edit',
          onClick: () => router.push(`/sales/returns/${record.id}/edit`),
        },
        {
          key: 'approve',
          icon: <CheckOutlined />,
          label: 'Approve',
          onClick: () => handleApprove(record),
        }
      );
    }

    if (record.status === 'APPROVED') {
      items.push({
        key: 'receive',
        icon: <InboxOutlined />,
        label: 'Receive Items',
        onClick: () => handleReceive(record),
      });
    }

    if (record.status === 'RECEIVED') {
      items.push({
        key: 'process',
        icon: <FileTextOutlined />,
        label: 'Process & Generate Credit Note',
        onClick: () => handleProcess(record),
      });
    }

    if (['PENDING', 'APPROVED'].includes(record.status)) {
      items.push(
        { type: 'divider' },
        {
          key: 'reject',
          icon: <CloseOutlined />,
          label: 'Reject',
          danger: true,
          onClick: () => handleReject(record),
        }
      );
    }

    return items;
  };

  const columns: TableColumnsType<SalesReturn> = [
    {
      title: 'Return #',
      dataIndex: 'returnNumber',
      key: 'returnNumber',
      width: 130,
      render: (num: string, record: SalesReturn) => (
        <Link href={`/sales/returns/${record.id}`} style={{ fontWeight: 500 }}>
          {num}
        </Link>
      ),
    },
    {
      title: 'Customer',
      dataIndex: ['customer', 'displayName'],
      key: 'customer',
      ellipsis: true,
    },
    {
      title: 'Date',
      dataIndex: 'returnDate',
      key: 'returnDate',
      width: 110,
      render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (status: ReturnStatus) => <Tag color={statusColors[status]}>{status}</Tag>,
    },
    {
      title: 'Reason',
      dataIndex: 'reason',
      key: 'reason',
      width: 140,
      render: (reason: string) => reasonLabels[reason] || reason,
    },
    {
      title: 'Items',
      dataIndex: '_count',
      key: 'itemCount',
      width: 80,
      align: 'center',
      render: (_count: { items: number } | undefined, record: SalesReturn) =>
        _count?.items || record.items?.length || 0,
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      width: 120,
      align: 'right',
      render: (total: number) => `RM ${Number(total).toFixed(2)}`,
    },
    {
      title: 'Credit Note',
      dataIndex: 'creditNote',
      key: 'creditNote',
      width: 130,
      render: (creditNote: { id: string; creditNumber: string } | undefined) =>
        creditNote ? (
          <Link href={`/sales/credit-notes/${creditNote.id}`}>{creditNote.creditNumber}</Link>
        ) : (
          <span style={{ color: '#999' }}>-</span>
        ),
    },
    {
      title: '',
      key: 'actions',
      width: 50,
      align: 'center',
      render: (_: unknown, record: SalesReturn) => (
        <Dropdown menu={{ items: getActionMenuItems(record) }} trigger={['click']}>
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
      ),
    },
  ];

  const handleTableChange = (pagination: TablePaginationConfig) => {
    setFilters((prev) => ({
      ...prev,
      page: pagination.current || 1,
      limit: pagination.pageSize || 25,
    }));
  };

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
          Sales Returns
        </Title>
        <Link href="/sales/returns/new">
          <Button type="primary" icon={<PlusOutlined />}>
            New Return
          </Button>
        </Link>
      </div>

      <Card>
        <div style={{ marginBottom: 16 }}>
          <Space wrap>
            <Input
              placeholder="Search returns..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 250 }}
              allowClear
            />
            <Select
              placeholder="Status"
              style={{ width: 130 }}
              allowClear
              value={filters.status}
              onChange={(value) => setFilters((prev) => ({ ...prev, status: value, page: 1 }))}
              options={[
                { value: 'PENDING', label: 'Pending' },
                { value: 'APPROVED', label: 'Approved' },
                { value: 'RECEIVED', label: 'Received' },
                { value: 'PROCESSED', label: 'Processed' },
                { value: 'REJECTED', label: 'Rejected' },
              ]}
            />
            <RangePicker
              onChange={(dates) => {
                setFilters((prev) => ({
                  ...prev,
                  fromDate: dates?.[0]?.toISOString(),
                  toDate: dates?.[1]?.toISOString(),
                  page: 1,
                }));
              }}
            />
            <Button
              icon={<FilterOutlined />}
              onClick={() => {
                setSearchText('');
                setFilters({ page: 1, limit: 25 });
              }}
            >
              Reset
            </Button>
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={data?.data || []}
          rowKey="id"
          loading={isLoading || isFetching}
          onChange={handleTableChange}
          pagination={{
            current: filters.page,
            pageSize: filters.limit,
            total: data?.meta?.total || 0,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} returns`,
          }}
        />
      </Card>
    </div>
  );
}
