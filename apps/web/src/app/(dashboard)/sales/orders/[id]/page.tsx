'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dayjs from 'dayjs';
import {
  Card,
  Typography,
  Button,
  Space,
  Tag,
  Descriptions,
  Divider,
  Spin,
  Result,
  Modal,
  Row,
  Col,
} from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  CheckOutlined,
  CloseOutlined,
  FileTextOutlined,
  ExclamationCircleOutlined,
  TruckOutlined,
} from '@ant-design/icons';
import {
  useSalesOrder,
  useConfirmSalesOrder,
  useShipSalesOrder,
  useCancelSalesOrder,
  useCreateInvoiceFromOrder,
} from '@/hooks/use-sales';
import { LineItemsTable, LineItem, OrderSummary } from '@/components/sales';
import { SalesOrderStatus } from '@/lib/sales';

const { Title, Text } = Typography;
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

interface PageProps {
  params: { id: string };
}

export default function SalesOrderDetailPage({ params }: PageProps) {
  const { id } = params;
  const router = useRouter();

  const { data: order, isLoading, error } = useSalesOrder(id);
  const confirmOrder = useConfirmSalesOrder();
  const shipOrder = useShipSalesOrder();
  const cancelOrder = useCancelSalesOrder();
  const createInvoice = useCreateInvoiceFromOrder();

  const handleConfirm = () => {
    confirm({
      title: 'Confirm Order',
      icon: <CheckOutlined />,
      content: `Confirm order ${order?.orderNumber}?`,
      onOk: () => confirmOrder.mutate(id),
    });
  };

  const handleShip = () => {
    confirm({
      title: 'Ship Order',
      icon: <TruckOutlined />,
      content: `Mark order ${order?.orderNumber} as shipped?`,
      onOk: () => shipOrder.mutate(id),
    });
  };

  const handleCancel = () => {
    confirm({
      title: 'Cancel Order',
      icon: <ExclamationCircleOutlined />,
      content: `Are you sure you want to cancel order ${order?.orderNumber}?`,
      okText: 'Cancel Order',
      okType: 'danger',
      onOk: () => cancelOrder.mutate(id),
    });
  };

  const handleCreateInvoice = () => {
    createInvoice.mutate(id, {
      onSuccess: (invoice) => {
        router.push(`/sales/invoices/${invoice.id}`);
      },
    });
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <Result
        status="404"
        title="Order not found"
        subTitle="The sales order you're looking for doesn't exist."
        extra={
          <Link href="/sales/orders">
            <Button type="primary">Back to Orders</Button>
          </Link>
        }
      />
    );
  }

  // Convert order items to LineItem format for the table
  // Note: API uses 'rate' for unitPrice and 'discountValue' for discountPercent
  const lineItems: LineItem[] = order.items.map((item, index) => ({
    key: `item-${index}`,
    itemId: item.itemId,
    itemName: item.item.name,
    itemSku: item.item.sku,
    unit: item.item.unit,
    description: item.description,
    quantity: Number(item.quantity),
    unitPrice: Number(item.unitPrice),
    discountPercent: Number(item.discountPercent) || 0,
    taxRateId: item.taxRateId,
    taxRate: Number(item.taxRate?.rate) || 0,
    amount: Number(item.amount),
    taxAmount: Number(item.taxAmount),
  }));

  const renderActionButtons = () => {
    const buttons: React.ReactNode[] = [];

    if (order.status === 'DRAFT') {
      buttons.push(
        <Link key="edit" href={`/sales/orders/${id}/edit`}>
          <Button icon={<EditOutlined />}>Edit</Button>
        </Link>,
        <Button
          key="confirm"
          type="primary"
          icon={<CheckOutlined />}
          onClick={handleConfirm}
          loading={confirmOrder.isPending}
        >
          Confirm Order
        </Button>
      );
    }

    if (order.status === 'CONFIRMED') {
      buttons.push(
        <Button
          key="ship"
          type="primary"
          icon={<TruckOutlined />}
          onClick={handleShip}
          loading={shipOrder.isPending}
        >
          Ship Order
        </Button>
      );
    }

    if (['CONFIRMED', 'SHIPPED', 'DELIVERED'].includes(order.status)) {
      buttons.push(
        <Button
          key="invoice"
          icon={<FileTextOutlined />}
          onClick={handleCreateInvoice}
          loading={createInvoice.isPending}
        >
          Create Invoice
        </Button>
      );
    }

    if (['DRAFT', 'CONFIRMED'].includes(order.status)) {
      buttons.push(
        <Button
          key="cancel"
          danger
          icon={<CloseOutlined />}
          onClick={handleCancel}
          loading={cancelOrder.isPending}
        >
          Cancel Order
        </Button>
      );
    }

    return buttons;
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Space style={{ marginBottom: 8 }}>
          <Link href="/sales/orders">
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
            <Tag color={statusColors[order.status]}>{order.status}</Tag>
          </Space>
          <Space>{renderActionButtons()}</Space>
        </div>
      </div>

      <Row gutter={24}>
        <Col span={16}>
          {/* Order Info */}
          <Card title="Order Details">
            <Descriptions column={2}>
              <Descriptions.Item label="Customer">
                <Text strong>{order.customer.displayName}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Order Date">
                {dayjs(order.orderDate).format('DD/MM/YYYY')}
              </Descriptions.Item>
              <Descriptions.Item label="Expected Ship Date">
                {order.expectedShipDate ? dayjs(order.expectedShipDate).format('DD/MM/YYYY') : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Invoice Status">
                <Tag
                  color={
                    order.invoiceStatus === 'INVOICED'
                      ? 'green'
                      : order.invoiceStatus === 'PARTIALLY'
                        ? 'orange'
                        : 'default'
                  }
                >
                  {order.invoiceStatus.replace('_', ' ')}
                </Tag>
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* Line Items */}
          <Card title="Line Items" style={{ marginTop: 16 }}>
            <LineItemsTable items={lineItems} onChange={() => {}} readOnly />
          </Card>

          {/* Notes */}
          {(order.notes || order.termsConditions) && (
            <Card title="Additional Information" style={{ marginTop: 16 }}>
              <Descriptions column={1}>
                {order.notes && <Descriptions.Item label="Notes">{order.notes}</Descriptions.Item>}
                {order.termsConditions && (
                  <Descriptions.Item label="Terms & Conditions">
                    {order.termsConditions}
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>
          )}
        </Col>

        <Col span={8}>
          <OrderSummary
            subtotal={Number(order.subtotal)}
            discount={Number(order.discount)}
            shipping={Number(order.shippingCharges || 0)}
            taxAmount={Number(order.taxAmount)}
            total={Number(order.total)}
          />

          <Card title="Timeline" style={{ marginTop: 16 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text type="secondary">Created</Text>
                <br />
                <Text>{dayjs(order.createdAt).format('DD/MM/YYYY HH:mm')}</Text>
              </div>
              <Divider style={{ margin: '8px 0' }} />
              <div>
                <Text type="secondary">Last Updated</Text>
                <br />
                <Text>{dayjs(order.updatedAt).format('DD/MM/YYYY HH:mm')}</Text>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
