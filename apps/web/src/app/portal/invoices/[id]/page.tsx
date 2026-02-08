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
  Space,
  Row,
  Col,
  Timeline,
  Divider,
} from 'antd';
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { portalCustomerService } from '@/lib/portal-api';

const { Title, Text } = Typography;

const statusColors: Record<string, string> = {
  DRAFT: 'default',
  SENT: 'processing',
  PARTIALLY_PAID: 'orange',
  PAID: 'green',
  OVERDUE: 'red',
  VOID: 'default',
};

export default function PortalInvoiceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const invoiceId = params.id as string;

  const { data: invoice, isLoading, error } = useQuery({
    queryKey: ['portal', 'invoices', invoiceId],
    queryFn: () => portalCustomerService.getInvoiceDetail(invoiceId),
    enabled: !!invoiceId,
  });

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <Alert
        type="error"
        message="Invoice not found"
        description="The invoice you are looking for does not exist or you do not have access."
        action={
          <Button onClick={() => router.push('/portal/invoices')}>
            Back to Invoices
          </Button>
        }
        showIcon
      />
    );
  }

  const formatCurrency = (value: number) =>
    `RM ${Number(value).toLocaleString('en-MY', { minimumFractionDigits: 2 })}`;

  const isOverdue =
    new Date(invoice.dueDate) < new Date() &&
    invoice.status !== 'PAID' &&
    invoice.status !== 'VOID';

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
          { title: <a onClick={() => router.push('/portal/invoices')}>Invoices</a> },
          { title: invoice.invoiceNumber },
        ]}
        style={{ marginBottom: 16 }}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Space>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push('/portal/invoices')}
          >
            Back
          </Button>
          <Title level={4} style={{ margin: 0 }}>
            {invoice.invoiceNumber}
          </Title>
          <Tag
            color={isOverdue ? 'red' : statusColors[invoice.status] || 'default'}
            style={{ fontSize: 14 }}
          >
            {isOverdue ? 'OVERDUE' : invoice.status.replace(/_/g, ' ')}
          </Tag>
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          {/* Invoice Details */}
          <Card title="Invoice Details" style={{ marginBottom: 16 }}>
            <Descriptions column={{ xs: 1, sm: 2 }} size="small">
              <Descriptions.Item label="Invoice Number">
                {invoice.invoiceNumber}
              </Descriptions.Item>
              <Descriptions.Item label="Invoice Date">
                {new Date(invoice.invoiceDate).toLocaleDateString()}
              </Descriptions.Item>
              <Descriptions.Item label="Due Date">
                <Text type={isOverdue ? 'danger' : undefined}>
                  {new Date(invoice.dueDate).toLocaleDateString()}
                  {isOverdue && ' (Overdue)'}
                </Text>
              </Descriptions.Item>
              {invoice.salesOrder && (
                <Descriptions.Item label="Sales Order">
                  <a onClick={() => router.push(`/portal/orders/${invoice.salesOrder?.orderNumber}`)}>
                    {invoice.salesOrder.orderNumber}
                  </a>
                </Descriptions.Item>
              )}
              <Descriptions.Item label="From">
                <div>
                  <Text strong>{invoice.organization?.name}</Text>
                  {invoice.organization?.phone && (
                    <div><Text type="secondary">Tel: {invoice.organization.phone}</Text></div>
                  )}
                  {invoice.organization?.email && (
                    <div><Text type="secondary">{invoice.organization.email}</Text></div>
                  )}
                  {invoice.organization?.sstNumber && (
                    <div><Text type="secondary">SST: {invoice.organization.sstNumber}</Text></div>
                  )}
                </div>
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* Line Items */}
          <Card title="Line Items" bodyStyle={{ padding: 0 }}>
            <Table
              columns={itemColumns}
              dataSource={invoice.items}
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
                      <Text strong>{formatCurrency(Number(invoice.subtotal))}</Text>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                  {Number(invoice.taxAmount) > 0 && (
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={7} align="right">
                        Tax
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={7} align="right">
                        {formatCurrency(Number(invoice.taxAmount))}
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  )}
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={7} align="right">
                      <Text strong style={{ fontSize: 16 }}>Total</Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={7} align="right">
                      <Text strong style={{ fontSize: 16 }}>
                        {formatCurrency(Number(invoice.total))}
                      </Text>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={7} align="right">
                      Amount Paid
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={7} align="right">
                      <Text type="success">
                        ({formatCurrency(Number(invoice.amountPaid))})
                      </Text>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={7} align="right">
                      <Text strong style={{ fontSize: 16 }}>Balance Due</Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={7} align="right">
                      <Text
                        strong
                        type={Number(invoice.balance) > 0 ? 'danger' : 'success'}
                        style={{ fontSize: 16 }}
                      >
                        {formatCurrency(Number(invoice.balance))}
                      </Text>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                </Table.Summary>
              )}
            />
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          {/* Payment Summary */}
          <Card title="Payment Status" size="small" style={{ marginBottom: 16 }}>
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ fontSize: 14, color: '#8c8c8c', marginBottom: 4 }}>Balance Due</div>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: Number(invoice.balance) > 0 ? '#cf1322' : '#3f8600',
                }}
              >
                {formatCurrency(Number(invoice.balance))}
              </div>
              {Number(invoice.balance) === 0 && (
                <Tag color="green" style={{ marginTop: 8 }}>
                  <CheckCircleOutlined /> Fully Paid
                </Tag>
              )}
            </div>
            <Divider style={{ margin: '12px 0' }} />
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Total">{formatCurrency(Number(invoice.total))}</Descriptions.Item>
              <Descriptions.Item label="Paid">{formatCurrency(Number(invoice.amountPaid))}</Descriptions.Item>
              <Descriptions.Item label="Balance">{formatCurrency(Number(invoice.balance))}</Descriptions.Item>
            </Descriptions>
          </Card>

          {/* Payment History */}
          {invoice.paymentAllocations && invoice.paymentAllocations.length > 0 && (
            <Card title="Payment History" size="small">
              <Timeline
                items={invoice.paymentAllocations.map((alloc: any) => ({
                  dot: <DollarOutlined style={{ color: '#52c41a' }} />,
                  children: (
                    <div>
                      <Text strong>{alloc.payment.paymentNumber}</Text>
                      <div>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {new Date(alloc.payment.paymentDate).toLocaleDateString()} |{' '}
                          {alloc.payment.paymentMethod.replace(/_/g, ' ')}
                        </Text>
                      </div>
                      <div>
                        <Text type="success">{formatCurrency(Number(alloc.amount))}</Text>
                      </div>
                    </div>
                  ),
                }))}
              />
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
}
