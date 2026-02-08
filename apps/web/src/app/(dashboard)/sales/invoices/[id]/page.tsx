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
  Table,
  Progress,
} from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  SendOutlined,
  CloseOutlined,
  DollarOutlined,
  ExclamationCircleOutlined,
  BankOutlined,
} from '@ant-design/icons';
import { useInvoice, useSendInvoice, useVoidInvoice } from '@/hooks/use-sales';
import { LineItemsTable, LineItem, OrderSummary } from '@/components/sales';
import { InvoiceStatus } from '@/lib/sales';

const { Title, Text } = Typography;
const { confirm } = Modal;

const statusColors: Record<InvoiceStatus, string> = {
  DRAFT: 'default',
  SENT: 'blue',
  PARTIALLY_PAID: 'orange',
  PAID: 'green',
  OVERDUE: 'red',
  VOID: 'default',
};

interface PageProps {
  params: { id: string };
}

export default function InvoiceDetailPage({ params }: PageProps) {
  const { id } = params;
  const router = useRouter();

  const { data: invoice, isLoading, error } = useInvoice(id);
  const sendInvoice = useSendInvoice();
  const voidInvoice = useVoidInvoice();

  const handleSend = () => {
    confirm({
      title: 'Send Invoice',
      icon: <SendOutlined />,
      content: `Mark invoice ${invoice?.invoiceNumber} as sent?`,
      onOk: () => sendInvoice.mutate(id),
    });
  };

  const handleVoid = () => {
    confirm({
      title: 'Void Invoice',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p>Are you sure you want to void invoice {invoice?.invoiceNumber}?</p>
          {Number(invoice?.amountPaid) > 0 && (
            <p style={{ color: '#ff4d4f' }}>
              Warning: This invoice has payments recorded. Voiding will not reverse payments.
            </p>
          )}
        </div>
      ),
      okText: 'Void Invoice',
      okType: 'danger',
      onOk: () => voidInvoice.mutate(id),
    });
  };

  const handleRecordPayment = () => {
    router.push(`/sales/payments/new?invoiceId=${id}`);
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <Result
        status="404"
        title="Invoice not found"
        subTitle="The invoice you're looking for doesn't exist."
        extra={
          <Link href="/sales/invoices">
            <Button type="primary">Back to Invoices</Button>
          </Link>
        }
      />
    );
  }

  // Convert invoice items to LineItem format for the table
  // Note: API uses 'rate' for unitPrice and 'discountValue' for discountPercent
  const lineItems: LineItem[] = invoice.items.map((item, index) => ({
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

  const paymentProgress =
    invoice.total > 0 ? Math.round((Number(invoice.amountPaid) / Number(invoice.total)) * 100) : 0;

  const renderActionButtons = () => {
    const buttons: React.ReactNode[] = [];

    if (invoice.status === 'DRAFT') {
      buttons.push(
        <Link key="edit" href={`/sales/invoices/${id}/edit`}>
          <Button icon={<EditOutlined />}>Edit</Button>
        </Link>,
        <Button
          key="send"
          type="primary"
          icon={<SendOutlined />}
          onClick={handleSend}
          loading={sendInvoice.isPending}
        >
          Send Invoice
        </Button>
      );
    }

    if (['SENT', 'PARTIALLY_PAID', 'OVERDUE'].includes(invoice.status)) {
      buttons.push(
        <Link key="pay-online" href={`/sales/invoices/${id}/pay`}>
          <Button type="primary" icon={<BankOutlined />}>
            Pay Online (FPX)
          </Button>
        </Link>,
        <Button
          key="payment"
          icon={<DollarOutlined />}
          onClick={handleRecordPayment}
        >
          Record Payment
        </Button>
      );
    }

    if (['DRAFT', 'SENT', 'PARTIALLY_PAID', 'OVERDUE'].includes(invoice.status)) {
      buttons.push(
        <Button
          key="void"
          danger
          icon={<CloseOutlined />}
          onClick={handleVoid}
          loading={voidInvoice.isPending}
        >
          Void Invoice
        </Button>
      );
    }

    return buttons;
  };

  // Mock payments data - in real app, this would come from the invoice
  const paymentsColumns = [
    {
      title: 'Payment #',
      dataIndex: 'paymentNumber',
      key: 'paymentNumber',
      render: (num: string, record: { id: string }) => (
        <Link href={`/sales/payments/${record.id}`}>{num}</Link>
      ),
    },
    {
      title: 'Date',
      dataIndex: 'paymentDate',
      key: 'paymentDate',
      render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => `RM ${Number(amount).toFixed(2)}`,
    },
    {
      title: 'Method',
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
    },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Space style={{ marginBottom: 8 }}>
          <Link href="/sales/invoices">
            <Button type="text" icon={<ArrowLeftOutlined />}>
              Back
            </Button>
          </Link>
        </Space>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <Title level={4} style={{ margin: 0 }}>
              {invoice.invoiceNumber}
            </Title>
            <Tag color={statusColors[invoice.status]}>{invoice.status.replace('_', ' ')}</Tag>
          </Space>
          <Space>{renderActionButtons()}</Space>
        </div>
      </div>

      <Row gutter={24}>
        <Col span={16}>
          {/* Invoice Info */}
          <Card title="Invoice Details">
            <Descriptions column={2}>
              <Descriptions.Item label="Customer">
                <Text strong>{invoice.customer.displayName}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Invoice Date">
                {dayjs(invoice.invoiceDate).format('DD/MM/YYYY')}
              </Descriptions.Item>
              <Descriptions.Item label="Due Date">
                {dayjs(invoice.dueDate).format('DD/MM/YYYY')}
              </Descriptions.Item>
              {invoice.salesOrder && (
                <Descriptions.Item label="From Order">
                  <Link href={`/sales/orders/${invoice.salesOrderId}`}>
                    {invoice.salesOrder.orderNumber}
                  </Link>
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>

          {/* Line Items */}
          <Card title="Line Items" style={{ marginTop: 16 }}>
            <LineItemsTable items={lineItems} onChange={() => {}} readOnly />
          </Card>

          {/* Payments */}
          <Card title="Payments" style={{ marginTop: 16 }}>
            {Number(invoice.amountPaid) > 0 ? (
              <Table
                columns={paymentsColumns}
                dataSource={[]} // Would come from API
                rowKey="id"
                pagination={false}
                size="small"
                locale={{ emptyText: 'Payment details not available' }}
              />
            ) : (
              <Text type="secondary">No payments recorded</Text>
            )}
          </Card>
        </Col>

        <Col span={8}>
          {/* Payment Status */}
          <Card title="Payment Status">
            <Space direction="vertical" style={{ width: '100%' }} size={16}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text>Payment Progress</Text>
                  <Text>{paymentProgress}%</Text>
                </div>
                <Progress
                  percent={paymentProgress}
                  status={invoice.status === 'PAID' ? 'success' : 'active'}
                  showInfo={false}
                />
              </div>
              <Divider style={{ margin: 0 }} />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text>Amount Paid</Text>
                <Text type="success">RM {Number(invoice.amountPaid).toFixed(2)}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text strong>Balance Due</Text>
                <Text strong type={Number(invoice.balance) > 0 ? 'danger' : 'success'}>
                  RM {Number(invoice.balance).toFixed(2)}
                </Text>
              </div>
            </Space>
          </Card>

          <div style={{ marginTop: 16 }}>
            <OrderSummary
              subtotal={Number(invoice.subtotal)}
              discount={Number(invoice.discount)}
              taxAmount={Number(invoice.taxAmount)}
              total={Number(invoice.total)}
              amountPaid={Number(invoice.amountPaid)}
              showBalance
            />
          </div>

          <Card title="Timeline" style={{ marginTop: 16 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text type="secondary">Created</Text>
                <br />
                <Text>{dayjs(invoice.createdAt).format('DD/MM/YYYY HH:mm')}</Text>
              </div>
              <Divider style={{ margin: '8px 0' }} />
              <div>
                <Text type="secondary">Last Updated</Text>
                <br />
                <Text>{dayjs(invoice.updatedAt).format('DD/MM/YYYY HH:mm')}</Text>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
