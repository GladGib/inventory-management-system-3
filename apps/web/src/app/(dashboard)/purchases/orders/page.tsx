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
  usePurchaseOrders,
  useIssuePurchaseOrder,
  useCancelPurchaseOrder,
  useCreateBillFromOrder,
} from '@/hooks/use-purchases';
import { PurchaseOrder, PurchaseOrderStatus, PurchaseOrderQueryParams } from '@/lib/purchases';

const { Title } = Typography;
const { RangePicker } = DatePicker;
const { confirm } = Modal;

const statusColors: Record<PurchaseOrderStatus, string> = {
  DRAFT: 'default',
  ISSUED: 'blue',
  PARTIALLY_RECEIVED: 'orange',
  RECEIVED: 'green',
  CLOSED: 'default',
  CANCELLED: 'red',
};

export default function PurchaseOrdersPage() {
  const router = useRouter();
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState<PurchaseOrderQueryParams>({
    page: 1,
    limit: 25,
  });

  const queryParams = useMemo(() => ({ ...filters }), [filters]);

  const { data, isLoading, isFetching } = usePurchaseOrders(queryParams);
  const issueOrder = useIssuePurchaseOrder();
  const cancelOrder = useCancelPurchaseOrder();
  const createBill = useCreateBillFromOrder();

  const handleIssue = (record: PurchaseOrder) => {
    confirm({
      title: 'Issue Purchase Order',
      icon: <CheckOutlined />,
      content: `Issue PO ${record.orderNumber} to vendor?`,
      onOk: () => issueOrder.mutate(record.id),
    });
  };

  const handleCancel = (record: PurchaseOrder) => {
    confirm({
      title: 'Cancel Purchase Order',
      icon: <ExclamationCircleOutlined />,
      content: `Are you sure you want to cancel PO ${record.orderNumber}?`,
      okText: 'Cancel Order',
      okType: 'danger',
      onOk: () => cancelOrder.mutate(record.id),
    });
  };

  const handleCreateBill = (record: PurchaseOrder) => {
    createBill.mutate(record.id, {
      onSuccess: (bill) => {
        router.push(`/purchases/bills/${bill.id}`);
      },
    });
  };

  const getActionMenuItems = (record: PurchaseOrder): MenuProps['items'] => {
    const items: MenuProps['items'] = [
      {
        key: 'view',
        icon: <EyeOutlined />,
        label: 'View',
        onClick: () => router.push(`/purchases/orders/${record.id}`),
      },
    ];

    if (record.status === 'DRAFT') {
      items.push(
        {
          key: 'edit',
          icon: <EditOutlined />,
          label: 'Edit',
          onClick: () => router.push(`/purchases/orders/${record.id}/edit`),
        },
        {
          key: 'issue',
          icon: <CheckOutlined />,
          label: 'Issue to Vendor',
          onClick: () => handleIssue(record),
        }
      );
    }

    if (['ISSUED', 'PARTIALLY_RECEIVED'].includes(record.status)) {
      items.push({
        key: 'receive',
        icon: <InboxOutlined />,
        label: 'Receive Goods',
        onClick: () => router.push(`/purchases/receives/new?orderId=${record.id}`),
      });
    }

    if (['ISSUED', 'PARTIALLY_RECEIVED', 'RECEIVED'].includes(record.status)) {
      items.push({
        key: 'bill',
        icon: <FileTextOutlined />,
        label: 'Create Bill',
        onClick: () => handleCreateBill(record),
      });
    }

    if (['DRAFT', 'ISSUED'].includes(record.status)) {
      items.push(
        { type: 'divider' },
        {
          key: 'cancel',
          icon: <CloseOutlined />,
          label: 'Cancel Order',
          danger: true,
          onClick: () => handleCancel(record),
        }
      );
    }

    return items;
  };

  const columns: TableColumnsType<PurchaseOrder> = [
    {
      title: 'PO #',
      dataIndex: 'orderNumber',
      key: 'orderNumber',
      width: 130,
      render: (num: string, record: PurchaseOrder) => (
        <Link href={`/purchases/orders/${record.id}`} style={{ fontWeight: 500 }}>
          {num}
        </Link>
      ),
    },
    {
      title: 'Vendor',
      dataIndex: ['vendor', 'displayName'],
      key: 'vendor',
      ellipsis: true,
    },
    {
      title: 'Date',
      dataIndex: 'orderDate',
      key: 'orderDate',
      width: 110,
      render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Expected',
      dataIndex: 'expectedDate',
      key: 'expectedDate',
      width: 110,
      render: (date: string | undefined) => (date ? dayjs(date).format('DD/MM/YYYY') : '-'),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status: PurchaseOrderStatus) => (
        <Tag color={statusColors[status]}>{status.replace('_', ' ')}</Tag>
      ),
    },
    {
      title: 'Receive',
      dataIndex: 'receiveStatus',
      key: 'receiveStatus',
      width: 130,
      render: (status: string) => {
        const colors: Record<string, string> = {
          NOT_RECEIVED: 'default',
          PARTIALLY: 'orange',
          RECEIVED: 'green',
        };
        return <Tag color={colors[status]}>{status.replace('_', ' ')}</Tag>;
      },
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
      title: '',
      key: 'actions',
      width: 50,
      align: 'center',
      render: (_: unknown, record: PurchaseOrder) => (
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
          Purchase Orders
        </Title>
        <Link href="/purchases/orders/new">
          <Button type="primary" icon={<PlusOutlined />}>
            New PO
          </Button>
        </Link>
      </div>

      <Card>
        <div style={{ marginBottom: 16 }}>
          <Space wrap>
            <Input
              placeholder="Search orders..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 250 }}
              allowClear
            />
            <Select
              placeholder="Status"
              style={{ width: 150 }}
              allowClear
              value={filters.status}
              onChange={(value) => setFilters((prev) => ({ ...prev, status: value, page: 1 }))}
              options={[
                { value: 'DRAFT', label: 'Draft' },
                { value: 'ISSUED', label: 'Issued' },
                { value: 'PARTIALLY_RECEIVED', label: 'Partial' },
                { value: 'RECEIVED', label: 'Received' },
                { value: 'CANCELLED', label: 'Cancelled' },
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
            showTotal: (total) => `Total ${total} orders`,
          }}
        />
      </Card>
    </div>
  );
}
