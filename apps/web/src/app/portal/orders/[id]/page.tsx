'use client';

import { useRouter, useParams } from 'next/navigation';
import {
  Card,
  Descriptions,
  Table,
  Tag,
  Typography,
  Spin,
  Alert,
  Button,
  Breadcrumb,
  Divider,
  Space,
  Row,
  Col,
} from 'antd';
import { ArrowLeftOutlined, FileTextOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { portalCustomerService } from '@/lib/portal-api';

const { Title, Text } = Typography;

const statusColors: Record<string, string> = {
  DRAFT: 'default',
  CONFIRMED: 'processing',
  PACKED: 'cyan',
  SHIPPED: 'blue',
  DELIVERED: 'green',
  CLOSED: 'default',
  CANCELLED: 'red',
};

export default function PortalOrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;

  const { data: order, isLoading, error } = useQuery({
    queryKey: ['portal', 'orders', orderId],
    queryFn: () => portalCustomerService.getOrderDetail(orderId),
    enabled: !!orderId,
  });

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <Alert
        type="error"
        message="Order not found"
        description="The order you are looking for does not exist or you do not have access."
        action={
          <Button onClick={() => router.push('/portal/orders')}>
            Back to Orders
          </Button>
        }
        showIcon
      />
    );
  }

  const formatCurrency = (value: number) =>
    `RM ${Number(value).toLocaleString('en-MY', { minimumFractionDigits: 2 })}`;

  const itemColumns = [
    {
      title: '#',
      key: 'index',
      width: 50,
      render: (_: any, __: any, index: number) => index + 1,
    },
    {
      title: 'SKU',
      key: 'sku',
      render: (_: any, record: any) => record.item?.sku || '-',
    },
    {
      title: 'Item',
      key: 'name',
      render: (_: any, record: any) => (
        <div>
          <Text strong>{record.item?.name || record.description || '-'}</Text>
          {record.description && record.item?.name && record.description !== record.item.name && (
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {record.description}
              </Text>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Qty',
      dataIndex: 'quantity',
      key: 'quantity',
      align: 'center' as const,
      render: (qty: number, record: any) => `${Number(qty)} ${record.unit}`,
    },
    {
      title: 'Unit Price',
      dataIndex: 'rate',
      key: 'rate',
      align: 'right' as const,
      render: (rate: number) => formatCurrency(Number(rate)),
    },
    {
      title: 'Discount',
      dataIndex: 'discountAmount',
      key: 'discount',
      align: 'right' as const,
      render: (val: number) => (Number(val) > 0 ? `(${formatCurrency(Number(val))})` : '-'),
    },
    {
      title: 'Tax',
      dataIndex: 'taxAmount',
      key: 'tax',
      align: 'right' as const,
      render: (val: number) => (Number(val) > 0 ? formatCurrency(Number(val)) : '-'),
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right' as const,
      render: (amount: number) => formatCurrency(Number(amount)),
    },
  ];

  return (
    <div>
      <Breadcrumb
        items={[
          { title: <a onClick={() => router.push('/portal/orders')}>Orders</a> },
          { title: order.orderNumber },
        ]}
        style={{ marginBottom: 16 }}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Space>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push('/portal/orders')}
          >
            Back
          </Button>
          <Title level={4} style={{ margin: 0 }}>
            {order.orderNumber}
          </Title>
          <Tag color={statusColors[order.status] || 'default'} style={{ fontSize: 14 }}>
            {order.status.replace(/_/g, ' ')}
          </Tag>
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          {/* Order Details */}
          <Card title="Order Details" style={{ marginBottom: 16 }}>
            <Descriptions column={{ xs: 1, sm: 2 }} size="small">
              <Descriptions.Item label="Order Number">{order.orderNumber}</Descriptions.Item>
              <Descriptions.Item label="Order Date">
                {new Date(order.orderDate).toLocaleDateString()}
              </Descriptions.Item>
              <Descriptions.Item label="Expected Ship Date">
                {order.expectedShipDate
                  ? new Date(order.expectedShipDate).toLocaleDateString()
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Shipped Date">
                {order.shippedDate
                  ? new Date(order.shippedDate).toLocaleDateString()
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Warehouse">
                {order.warehouse?.name || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Payment Status">
                <Tag
                  color={
                    order.paymentStatus === 'PAID'
                      ? 'green'
                      : order.paymentStatus === 'PARTIALLY_PAID'
                        ? 'blue'
                        : 'orange'
                  }
                >
                  {order.paymentStatus.replace(/_/g, ' ')}
                </Tag>
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* Line Items */}
          <Card title="Line Items" bodyStyle={{ padding: 0 }}>
            <Table
              columns={itemColumns}
              dataSource={order.items}
              rowKey="id"
              pagination={false}
              size="small"
              summary={() => (
                <Table.Summary>
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={7} align="right">
                      <Text strong>Subtotal</Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={7} align="right">
                      <Text strong>{formatCurrency(Number(order.subtotal))}</Text>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                  {Number(order.discountAmount) > 0 && (
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={7} align="right">
                        Discount
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={7} align="right">
                        <Text type="success">
                          ({formatCurrency(Number(order.discountAmount))})
                        </Text>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  )}
                  {Number(order.taxAmount) > 0 && (
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={7} align="right">
                        Tax
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={7} align="right">
                        {formatCurrency(Number(order.taxAmount))}
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  )}
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={7} align="right">
                      <Text strong style={{ fontSize: 16 }}>Total</Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={7} align="right">
                      <Text strong style={{ fontSize: 16 }}>
                        {formatCurrency(Number(order.total))}
                      </Text>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                </Table.Summary>
              )}
            />
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          {/* Related Invoices */}
          {order.invoices && order.invoices.length > 0 && (
            <Card title="Related Invoices" size="small">
              {order.invoices.map((invoice: any) => (
                <div
                  key={invoice.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 0',
                    borderBottom: '1px solid #f0f0f0',
                    cursor: 'pointer',
                  }}
                  onClick={() => router.push(`/portal/invoices/${invoice.id}`)}
                >
                  <Space>
                    <FileTextOutlined />
                    <div>
                      <Text strong>{invoice.invoiceNumber}</Text>
                      <div>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {new Date(invoice.invoiceDate).toLocaleDateString()}
                        </Text>
                      </div>
                    </div>
                  </Space>
                  <div style={{ textAlign: 'right' }}>
                    <div>{formatCurrency(Number(invoice.total))}</div>
                    <Tag
                      color={
                        invoice.status === 'PAID'
                          ? 'green'
                          : invoice.status === 'OVERDUE'
                            ? 'red'
                            : 'blue'
                      }
                      style={{ fontSize: 11 }}
                    >
                      {invoice.status}
                    </Tag>
                  </div>
                </div>
              ))}
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
}
