'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dayjs from 'dayjs';
import {
  Card,
  Typography,
  Button,
  Space,
  Row,
  Col,
  Tag,
  Descriptions,
  Table,
  Spin,
  Modal,
  Dropdown,
} from 'antd';
import type { MenuProps, TableColumnsType } from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  CheckOutlined,
  CloseOutlined,
  MoreOutlined,
  InboxOutlined,
  FileTextOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import {
  usePurchaseOrder,
  useIssuePurchaseOrder,
  useCancelPurchaseOrder,
  useCreateBillFromOrder,
} from '@/hooks/use-purchases';
import { PurchaseOrderSummary } from '@/components/purchases';
import { PurchaseOrderItem, PurchaseOrderStatus } from '@/lib/purchases';

const { Title, Text } = Typography;
const { confirm } = Modal;

const statusColors: Record<PurchaseOrderStatus, string> = {
  DRAFT: 'default',
  ISSUED: 'blue',
  PARTIALLY_RECEIVED: 'orange',
  RECEIVED: 'green',
  CLOSED: 'default',
  CANCELLED: 'red',
};

export default function PurchaseOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const { data: order, isLoading } = usePurchaseOrder(id);
  const issueOrder = useIssuePurchaseOrder();
  const cancelOrder = useCancelPurchaseOrder();
  const createBill = useCreateBillFromOrder();

  const handleIssue = () => {
    confirm({
      title: 'Issue Purchase Order',
      icon: <CheckOutlined />,
      content: `Issue ${order?.orderNumber} to vendor?`,
      onOk: () => issueOrder.mutate(id),
    });
  };

  const handleCancel = () => {
    confirm({
      title: 'Cancel Purchase Order',
      icon: <ExclamationCircleOutlined />,
      content: `Are you sure you want to cancel ${order?.orderNumber}?`,
      okText: 'Cancel Order',
      okType: 'danger',
      onOk: () => cancelOrder.mutate(id),
    });
  };

  const handleCreateBill = () => {
    createBill.mutate(id, {
      onSuccess: (bill) => {
        router.push(`/purchases/bills/${bill.id}`);
      },
    });
  };

  const getActionMenuItems = (): MenuProps['items'] => {
    if (!order) return [];

    const items: MenuProps['items'] = [];

    if (['ISSUED', 'PARTIALLY_RECEIVED'].includes(order.status)) {
      items.push({
        key: 'receive',
        icon: <InboxOutlined />,
        label: 'Receive Goods',
        onClick: () => router.push(`/purchases/receives/new?orderId=${order.id}`),
      });
    }

    if (['ISSUED', 'PARTIALLY_RECEIVED', 'RECEIVED'].includes(order.status)) {
      items.push({
        key: 'bill',
        icon: <FileTextOutlined />,
        label: 'Create Bill',
        onClick: handleCreateBill,
      });
    }

    return items;
  };

  const columns: TableColumnsType<PurchaseOrderItem> = [
    {
      title: 'Item',
      key: 'item',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.item.sku}</Text>
          <Text>{record.item.name}</Text>
        </Space>
      ),
    },
    {
      title: 'Qty',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100,
      render: (qty, record) => `${qty} ${record.item.unit}`,
    },
    {
      title: 'Received',
      dataIndex: 'receivedQty',
      key: 'receivedQty',
      width: 100,
      render: (qty) => qty || 0,
    },
    {
      title: 'Unit Price',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      width: 120,
      align: 'right',
      render: (price) => `RM ${Number(price).toFixed(2)}`,
    },
    {
      title: 'Tax',
      dataIndex: 'taxAmount',
      key: 'taxAmount',
      width: 100,
      align: 'right',
      render: (tax) => `RM ${Number(tax).toFixed(2)}`,
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      align: 'right',
      render: (amount) => <Text strong>RM {Number(amount).toFixed(2)}</Text>,
    },
  ];

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!order) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Text>Purchase order not found</Text>
      </div>
    );
  }

  const actionMenuItems = getActionMenuItems() ?? [];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Space style={{ marginBottom: 8 }}>
          <Link href="/purchases/orders">
            <Button type="text" icon={<ArrowLeftOutlined />}>
              Back
            </Button>
          </Link>
        </Space>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <Title level={4} style={{ margin: 0 }}>
              {order.orderNumber}
            </Title>
            <Tag color={statusColors[order.status]}>{order.status.replace('_', ' ')}</Tag>
          </Space>
          <Space>
            {order.status === 'DRAFT' && (
              <>
                <Link href={`/purchases/orders/${id}/edit`}>
                  <Button icon={<EditOutlined />}>Edit</Button>
                </Link>
                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  onClick={handleIssue}
                  loading={issueOrder.isPending}
                >
                  Issue to Vendor
                </Button>
                <Button
                  danger
                  icon={<CloseOutlined />}
                  onClick={handleCancel}
                  loading={cancelOrder.isPending}
                >
                  Cancel
                </Button>
              </>
            )}
            {order.status === 'ISSUED' && (
              <Button
                danger
                icon={<CloseOutlined />}
                onClick={handleCancel}
                loading={cancelOrder.isPending}
              >
                Cancel
              </Button>
            )}
            {actionMenuItems.length > 0 && (
              <Dropdown menu={{ items: actionMenuItems }} trigger={['click']}>
                <Button icon={<MoreOutlined />}>More</Button>
              </Dropdown>
            )}
          </Space>
        </div>
      </div>

      <Row gutter={24}>
        <Col span={16}>
          {/* Order Details */}
          <Card title="Order Details" style={{ marginBottom: 16 }}>
            <Descriptions column={2}>
              <Descriptions.Item label="Vendor">
                <Text strong>{order.vendor.displayName}</Text>
                {order.vendor.companyName && (
                  <Text type="secondary" style={{ display: 'block' }}>
                    {order.vendor.companyName}
                  </Text>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Order Date">
                {dayjs(order.orderDate).format('DD/MM/YYYY')}
              </Descriptions.Item>
              <Descriptions.Item label="Expected Delivery">
                {order.expectedDate ? dayjs(order.expectedDate).format('DD/MM/YYYY') : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Vendor Reference">
                {order.referenceNumber || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Receive Status">
                <Tag
                  color={
                    order.receiveStatus === 'RECEIVED'
                      ? 'green'
                      : order.receiveStatus === 'PARTIALLY'
                        ? 'orange'
                        : 'default'
                  }
                >
                  {order.receiveStatus.replace('_', ' ')}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Bill Status">
                <Tag
                  color={
                    order.billStatus === 'BILLED'
                      ? 'green'
                      : order.billStatus === 'PARTIALLY_BILLED'
                        ? 'orange'
                        : 'default'
                  }
                >
                  {order.billStatus.replace('_', ' ')}
                </Tag>
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* Line Items */}
          <Card title="Line Items">
            <Table
              columns={columns}
              dataSource={order.items}
              rowKey="id"
              pagination={false}
              size="small"
            />
          </Card>

          {/* Notes */}
          {order.notes && (
            <Card title="Notes" style={{ marginTop: 16 }}>
              <Text>{order.notes}</Text>
            </Card>
          )}
        </Col>

        <Col span={8}>
          <PurchaseOrderSummary
            subtotal={order.subtotal}
            discount={order.discountAmount || 0}
            shipping={order.shippingCharges || 0}
            taxAmount={order.taxAmount}
            total={order.total}
          />
        </Col>
      </Row>
    </div>
  );
}
