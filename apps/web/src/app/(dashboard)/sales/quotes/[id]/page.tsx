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
  SendOutlined,
  SwapOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import {
  useQuote,
  useSendQuote,
  useConvertToOrder,
  useDeleteQuote,
} from '@/hooks/use-quotes';
import { LineItemsTable, LineItem, OrderSummary } from '@/components/sales';
import { QuoteStatus } from '@/lib/quotes';

const { Title, Text } = Typography;
const { confirm } = Modal;

const statusColors: Record<QuoteStatus, string> = {
  DRAFT: 'default',
  SENT: 'blue',
  ACCEPTED: 'green',
  EXPIRED: 'orange',
  REJECTED: 'red',
  CONVERTED: 'purple',
};

interface PageProps {
  params: { id: string };
}

export default function QuoteDetailPage({ params }: PageProps) {
  const { id } = params;
  const router = useRouter();

  const { data: quote, isLoading, error } = useQuote(id);
  const sendQuote = useSendQuote();
  const convertToOrder = useConvertToOrder();
  const deleteQuote = useDeleteQuote();

  const handleSend = () => {
    confirm({
      title: 'Send Quote',
      icon: <SendOutlined />,
      content: `Mark quote ${quote?.quoteNumber} as sent?`,
      onOk: () => sendQuote.mutate(id),
    });
  };

  const handleConvert = () => {
    confirm({
      title: 'Convert to Sales Order',
      icon: <SwapOutlined />,
      content: `Convert quote ${quote?.quoteNumber} to a sales order? This action cannot be undone.`,
      okText: 'Convert',
      onOk: () =>
        convertToOrder.mutate(id, {
          onSuccess: (salesOrder) => {
            router.push(`/sales/orders/${salesOrder.id}`);
          },
        }),
    });
  };

  const handleDelete = () => {
    confirm({
      title: 'Delete Quote',
      icon: <ExclamationCircleOutlined />,
      content: `Are you sure you want to delete quote ${quote?.quoteNumber}?`,
      okText: 'Delete',
      okType: 'danger',
      onOk: () =>
        deleteQuote.mutate(id, {
          onSuccess: () => {
            router.push('/sales/quotes');
          },
        }),
    });
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error || !quote) {
    return (
      <Result
        status="404"
        title="Quote not found"
        subTitle="The sales quote you're looking for doesn't exist."
        extra={
          <Link href="/sales/quotes">
            <Button type="primary">Back to Quotes</Button>
          </Link>
        }
      />
    );
  }

  // Convert quote items to LineItem format for the table
  const lineItems: LineItem[] = quote.items.map((item, index) => ({
    key: `item-${index}`,
    itemId: item.itemId,
    itemName: item.item.name,
    itemSku: item.item.sku,
    unit: item.item.unit,
    description: item.description,
    quantity: Number(item.quantity),
    unitPrice: Number(item.rate),
    discountPercent: Number(item.discountValue) || 0,
    taxRateId: item.taxRateId,
    taxRate: 0,
    amount: Number(item.amount),
    taxAmount: Number(item.taxAmount),
  }));

  const isExpired = dayjs(quote.validUntil).isBefore(dayjs(), 'day');

  const renderActionButtons = () => {
    const buttons: React.ReactNode[] = [];

    if (quote.status === 'DRAFT') {
      buttons.push(
        <Link key="edit" href={`/sales/quotes/${id}/edit`}>
          <Button icon={<EditOutlined />}>Edit</Button>
        </Link>,
        <Button
          key="send"
          type="primary"
          icon={<SendOutlined />}
          onClick={handleSend}
          loading={sendQuote.isPending}
        >
          Mark as Sent
        </Button>
      );
    }

    if (['DRAFT', 'SENT', 'ACCEPTED'].includes(quote.status)) {
      buttons.push(
        <Button
          key="convert"
          type="primary"
          icon={<SwapOutlined />}
          onClick={handleConvert}
          loading={convertToOrder.isPending}
          style={quote.status !== 'DRAFT' ? { backgroundColor: '#722ed1', borderColor: '#722ed1' } : undefined}
        >
          Convert to Order
        </Button>
      );
    }

    if (quote.status === 'CONVERTED' && quote.convertedToOrderId) {
      buttons.push(
        <Link key="view-order" href={`/sales/orders/${quote.convertedToOrderId}`}>
          <Button type="primary" icon={<SwapOutlined />}>
            View Sales Order
          </Button>
        </Link>
      );
    }

    if (quote.status === 'DRAFT') {
      buttons.push(
        <Button
          key="delete"
          danger
          icon={<DeleteOutlined />}
          onClick={handleDelete}
          loading={deleteQuote.isPending}
        >
          Delete
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
          <Link href="/sales/quotes">
            <Button type="text" icon={<ArrowLeftOutlined />}>
              Back
            </Button>
          </Link>
        </Space>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <Title level={4} style={{ margin: 0 }}>
              {quote.quoteNumber}
            </Title>
            <Tag color={statusColors[quote.status]}>{quote.status}</Tag>
            {isExpired && quote.status !== 'CONVERTED' && quote.status !== 'REJECTED' && (
              <Tag color="error">EXPIRED</Tag>
            )}
          </Space>
          <Space>{renderActionButtons()}</Space>
        </div>
      </div>

      <Row gutter={24}>
        <Col span={16}>
          {/* Quote Info */}
          <Card title="Quote Details">
            <Descriptions column={2}>
              <Descriptions.Item label="Customer">
                <Text strong>{quote.customer?.displayName || quote.contactPersonName || '-'}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Contact Person">
                {quote.contactPersonName || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Quote Date">
                {dayjs(quote.quoteDate).format('DD/MM/YYYY')}
              </Descriptions.Item>
              <Descriptions.Item label="Valid Until">
                <span style={{ color: isExpired ? '#ff4d4f' : undefined }}>
                  {dayjs(quote.validUntil).format('DD/MM/YYYY')}
                </span>
              </Descriptions.Item>
              {quote.referenceNumber && (
                <Descriptions.Item label="Reference #">
                  {quote.referenceNumber}
                </Descriptions.Item>
              )}
              {quote.convertedToOrderId && (
                <Descriptions.Item label="Converted To">
                  <Link href={`/sales/orders/${quote.convertedToOrderId}`}>
                    View Sales Order
                  </Link>
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>

          {/* Line Items */}
          <Card title="Line Items" style={{ marginTop: 16 }}>
            <LineItemsTable items={lineItems} onChange={() => {}} readOnly />
          </Card>

          {/* Notes */}
          {(quote.notes || quote.termsConditions) && (
            <Card title="Additional Information" style={{ marginTop: 16 }}>
              <Descriptions column={1}>
                {quote.notes && <Descriptions.Item label="Notes">{quote.notes}</Descriptions.Item>}
                {quote.termsConditions && (
                  <Descriptions.Item label="Terms & Conditions">
                    {quote.termsConditions}
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>
          )}
        </Col>

        <Col span={8}>
          <OrderSummary
            subtotal={Number(quote.subtotal)}
            discount={Number(quote.discountAmount)}
            taxAmount={Number(quote.taxAmount)}
            total={Number(quote.total)}
          />

          <Card title="Timeline" style={{ marginTop: 16 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text type="secondary">Created</Text>
                <br />
                <Text>{dayjs(quote.createdAt).format('DD/MM/YYYY HH:mm')}</Text>
              </div>
              <Divider style={{ margin: '8px 0' }} />
              <div>
                <Text type="secondary">Last Updated</Text>
                <br />
                <Text>{dayjs(quote.updatedAt).format('DD/MM/YYYY HH:mm')}</Text>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
