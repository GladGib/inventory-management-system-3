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
  Alert,
  type MenuProps,
  type TableColumnsType,
  type TablePaginationConfig,
} from 'antd';
import {
  SearchOutlined,
  FilterOutlined,
  MoreOutlined,
  EyeOutlined,
  InboxOutlined,
  DollarOutlined,
  CloseOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import {
  useCoreReturns,
  useReceiveCoreReturn,
  useCreditCoreReturn,
  useRejectCoreReturn,
  useOverdueCoreReturnsCount,
} from '@/hooks/use-core-returns';
import {
  CoreReturn,
  CoreReturnStatus,
  CoreReturnQueryParams,
} from '@/lib/core-returns';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { confirm } = Modal;

const statusColors: Record<CoreReturnStatus, string> = {
  PENDING: 'default',
  RECEIVED: 'blue',
  CREDITED: 'green',
  REJECTED: 'red',
};

const statusLabels: Record<CoreReturnStatus, string> = {
  PENDING: 'Pending',
  RECEIVED: 'Received',
  CREDITED: 'Credited',
  REJECTED: 'Rejected',
};

export default function CoreReturnsPage() {
  const router = useRouter();
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState<CoreReturnQueryParams>({
    page: 1,
    limit: 25,
  });

  const queryParams = useMemo(() => ({ ...filters }), [filters]);

  const { data, isLoading, isFetching } = useCoreReturns(queryParams);
  const { data: overdueData } = useOverdueCoreReturnsCount();
  const receiveReturn = useReceiveCoreReturn();
  const creditReturn = useCreditCoreReturn();
  const rejectReturn = useRejectCoreReturn();

  const handleReceive = (record: CoreReturn) => {
    confirm({
      title: 'Receive Core Return',
      icon: <InboxOutlined />,
      content: `Mark core return ${record.returnNumber} as received? The customer has returned the core part.`,
      onOk: () => receiveReturn.mutate({ id: record.id }),
    });
  };

  const handleCredit = (record: CoreReturn) => {
    confirm({
      title: 'Issue Credit',
      icon: <DollarOutlined />,
      content: `Issue credit of RM ${Number(record.coreCharge).toFixed(2)} to customer for core return ${record.returnNumber}?`,
      onOk: () => creditReturn.mutate({ id: record.id }),
    });
  };

  const handleReject = (record: CoreReturn) => {
    confirm({
      title: 'Reject Core Return',
      icon: <ExclamationCircleOutlined />,
      content: `Reject core return ${record.returnNumber}? The core deposit will not be refunded.`,
      okText: 'Reject',
      okType: 'danger',
      onOk: () => rejectReturn.mutate({ id: record.id }),
    });
  };

  const isOverdue = (record: CoreReturn) => {
    return (
      record.status === 'PENDING' && dayjs(record.dueDate).isBefore(dayjs())
    );
  };

  const getActionMenuItems = (record: CoreReturn): MenuProps['items'] => {
    const items: MenuProps['items'] = [
      {
        key: 'view',
        icon: <EyeOutlined />,
        label: 'View',
        onClick: () => router.push(`/sales/core-returns/${record.id}`),
      },
    ];

    if (record.status === 'PENDING') {
      items.push({
        key: 'receive',
        icon: <InboxOutlined />,
        label: 'Mark as Received',
        onClick: () => handleReceive(record),
      });
    }

    if (record.status === 'RECEIVED') {
      items.push({
        key: 'credit',
        icon: <DollarOutlined />,
        label: 'Issue Credit',
        onClick: () => handleCredit(record),
      });
    }

    if (['PENDING', 'RECEIVED'].includes(record.status)) {
      items.push(
        { type: 'divider' },
        {
          key: 'reject',
          icon: <CloseOutlined />,
          label: 'Reject',
          danger: true,
          onClick: () => handleReject(record),
        },
      );
    }

    return items;
  };

  const columns: TableColumnsType<CoreReturn> = [
    {
      title: 'Return #',
      dataIndex: 'returnNumber',
      key: 'returnNumber',
      width: 120,
      render: (num: string, record: CoreReturn) => (
        <Link href={`/sales/core-returns/${record.id}`} style={{ fontWeight: 500 }}>
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
      title: 'Item',
      dataIndex: ['item', 'name'],
      key: 'item',
      ellipsis: true,
      render: (_: string, record: CoreReturn) => (
        <div>
          <Text>{record.item.name}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.item.sku}
          </Text>
        </div>
      ),
    },
    {
      title: 'Core Charge',
      dataIndex: 'coreCharge',
      key: 'coreCharge',
      width: 120,
      align: 'right',
      render: (charge: number) => `RM ${Number(charge).toFixed(2)}`,
    },
    {
      title: 'Due Date',
      dataIndex: 'dueDate',
      key: 'dueDate',
      width: 120,
      render: (date: string, record: CoreReturn) => {
        const overdue = isOverdue(record);
        return (
          <span style={{ color: overdue ? '#ff4d4f' : undefined, fontWeight: overdue ? 600 : undefined }}>
            {dayjs(date).format('DD/MM/YYYY')}
            {overdue && (
              <Tag color="red" style={{ marginLeft: 4, fontSize: 10 }}>
                OVERDUE
              </Tag>
            )}
          </span>
        );
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: CoreReturnStatus) => (
        <Tag color={statusColors[status]}>{statusLabels[status]}</Tag>
      ),
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 110,
      render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: '',
      key: 'actions',
      width: 50,
      align: 'center',
      render: (_: unknown, record: CoreReturn) => (
        <Dropdown
          menu={{ items: getActionMenuItems(record) }}
          trigger={['click']}
        >
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
          Core Returns
        </Title>
      </div>

      {overdueData && overdueData.count > 0 && (
        <Alert
          type="warning"
          icon={<WarningOutlined />}
          message={`${overdueData.count} core return${overdueData.count > 1 ? 's' : ''} overdue`}
          description="There are core returns past their due date. Customers may need to be contacted or the core deposit charged."
          showIcon
          style={{ marginBottom: 16 }}
          action={
            <Button
              size="small"
              type="text"
              onClick={() =>
                setFilters((prev) => ({
                  ...prev,
                  overdue: 'true',
                  status: undefined,
                  page: 1,
                }))
              }
            >
              Show Overdue
            </Button>
          }
        />
      )}

      <Card>
        <div style={{ marginBottom: 16 }}>
          <Space wrap>
            <Input
              placeholder="Search core returns..."
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
              onChange={(value) =>
                setFilters((prev) => ({
                  ...prev,
                  status: value,
                  overdue: undefined,
                  page: 1,
                }))
              }
              options={[
                { value: 'PENDING', label: 'Pending' },
                { value: 'RECEIVED', label: 'Received' },
                { value: 'CREDITED', label: 'Credited' },
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
            showTotal: (total) => `Total ${total} core returns`,
          }}
          rowClassName={(record) => (isOverdue(record) ? 'ant-table-row-warning' : '')}
        />
      </Card>
    </div>
  );
}
