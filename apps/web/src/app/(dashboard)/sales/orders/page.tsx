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
  SendOutlined,
  CloseOutlined,
  FileTextOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import {
  useSalesOrders,
  useConfirmSalesOrder,
  useShipSalesOrder,
  useCancelSalesOrder,
  useCreateInvoiceFromOrder,
} from '@/hooks/use-sales';
import { SalesOrder, SalesOrderStatus, SalesOrderQueryParams } from '@/lib/sales';

const { Title } = Typography;
const { RangePicker } = DatePicker;
const { confirm } = Modal;

const statusColors: Record<SalesOrderStatus, string> = {
  DRAFT: 'default',
  CONFIRMED: 'blue',
  PACKED: 'cyan',
  SHIPPED: 'orange',
  DELIVERED: 'green',
  CLOSED: 'default',
  CANCELLED: 'red',
};

export default function SalesOrdersPage() {
  const router = useRouter();
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState<SalesOrderQueryParams>({
    page: 1,
    limit: 25,
  });

  const queryParams = useMemo(
    () => ({
      ...filters,
    }),
    [filters]
  );

  const { data, isLoading, isFetching } = useSalesOrders(queryParams);
  const confirmOrder = useConfirmSalesOrder();
  const shipOrder = useShipSalesOrder();
  const cancelOrder = useCancelSalesOrder();
  const createInvoice = useCreateInvoiceFromOrder();

  const handleConfirm = (record: SalesOrder) => {
    confirm({
      title: 'Confirm Order',
      icon: <CheckOutlined />,
      content: `Confirm order ${record.orderNumber}?`,
      onOk: () => confirmOrder.mutate(record.id),
    });
  };

  const handleShip = (record: SalesOrder) => {
    confirm({
      title: 'Ship Order',
      icon: <SendOutlined />,
      content: `Mark order ${record.orderNumber} as shipped?`,
      onOk: () => shipOrder.mutate(record.id),
    });
  };

  const handleCancel = (record: SalesOrder) => {
    confirm({
      title: 'Cancel Order',
      icon: <ExclamationCircleOutlined />,
      content: `Are you sure you want to cancel order ${record.orderNumber}?`,
      okText: 'Cancel Order',
      okType: 'danger',
      onOk: () => cancelOrder.mutate(record.id),
    });
  };

  const handleCreateInvoice = (record: SalesOrder) => {
    createInvoice.mutate(record.id, {
      onSuccess: (invoice) => {
        router.push(`/sales/invoices/${invoice.id}`);
      },
    });
  };

  const getActionMenuItems = (record: SalesOrder): MenuProps['items'] => {
    const items: MenuProps['items'] = [
      {
        key: 'view',
        icon: <EyeOutlined />,
        label: 'View',
        onClick: () => router.push(`/sales/orders/${record.id}`),
      },
    ];

    if (record.status === 'DRAFT') {
      items.push(
        {
          key: 'edit',
          icon: <EditOutlined />,
          label: 'Edit',
          onClick: () => router.push(`/sales/orders/${record.id}/edit`),
        },
        {
          key: 'confirm',
          icon: <CheckOutlined />,
          label: 'Confirm Order',
          onClick: () => handleConfirm(record),
        }
      );
    }

    if (record.status === 'CONFIRMED') {
      items.push({
        key: 'ship',
        icon: <SendOutlined />,
        label: 'Ship Order',
        onClick: () => handleShip(record),
      });
    }

    if (['CONFIRMED', 'SHIPPED', 'DELIVERED'].includes(record.status)) {
      items.push({
        key: 'invoice',
        icon: <FileTextOutlined />,
        label: 'Create Invoice',
        onClick: () => handleCreateInvoice(record),
      });
    }

    if (['DRAFT', 'CONFIRMED'].includes(record.status)) {
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

  const columns: TableColumnsType<SalesOrder> = [
    {
      title: 'Order #',
      dataIndex: 'orderNumber',
      key: 'orderNumber',
      width: 130,
      render: (num: string, record: SalesOrder) => (
        <Link href={`/sales/orders/${record.id}`} style={{ fontWeight: 500 }}>
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
      dataIndex: 'orderDate',
      key: 'orderDate',
      width: 110,
      render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (status: SalesOrderStatus) => <Tag color={statusColors[status]}>{status}</Tag>,
    },
    {
      title: 'Invoice',
      dataIndex: 'invoiceStatus',
      key: 'invoiceStatus',
      width: 120,
      render: (status: string) => {
        const colors: Record<string, string> = {
          NOT_INVOICED: 'default',
          PARTIALLY: 'orange',
          INVOICED: 'green',
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
      render: (_: unknown, record: SalesOrder) => (
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
          Sales Orders
        </Title>
        <Link href="/sales/orders/new">
          <Button type="primary" icon={<PlusOutlined />}>
            New Order
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
              style={{ width: 130 }}
              allowClear
              value={filters.status}
              onChange={(value) => setFilters((prev) => ({ ...prev, status: value, page: 1 }))}
              options={[
                { value: 'DRAFT', label: 'Draft' },
                { value: 'CONFIRMED', label: 'Confirmed' },
                { value: 'SHIPPED', label: 'Shipped' },
                { value: 'DELIVERED', label: 'Delivered' },
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
