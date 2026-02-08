'use client';

import { use } from 'react';
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
  Divider,
  Timeline,
} from 'antd';
import type { TableColumnsType } from 'antd';
import {
  ArrowLeftOutlined,
  DollarOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { useVendorBill } from '@/hooks/use-vendor-portal';
import type { PurchaseOrderItem } from '@/lib/purchases';

const { Title, Text } = Typography;

const statusColors: Record<string, string> = {
  DRAFT: 'default',
  RECEIVED: 'blue',
  APPROVED: 'cyan',
  PARTIALLY_PAID: 'orange',
  PAID: 'green',
  OVERDUE: 'red',
  VOID: 'default',
};

interface BillPaymentAllocation {
  id: string;
  amount: number;
  vendorPayment: {
    id: string;
    paymentNumber: string;
    paymentDate: string;
    paymentMethod: string;
  };
}

export default function VendorBillDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: bill, isLoading } = useVendorBill(id);

  const itemColumns: TableColumnsType<PurchaseOrderItem> = [
    {
      title: 'Item',
      key: 'item',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.item?.sku || '-'}</Text>
          <Text type="secondary">{record.item?.name || record.description}</Text>
        </Space>
      ),
    },
    {
      title: 'Qty',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 80,
      align: 'center',
    },
    {
      title: 'Unit Price',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      width: 120,
      align: 'right',
      render: (price: number) => `RM ${Number(price).toFixed(2)}`,
    },
    {
      title: 'Tax',
      dataIndex: 'taxAmount',
      key: 'taxAmount',
      width: 100,
      align: 'right',
      render: (tax: number) => `RM ${Number(tax).toFixed(2)}`,
    },
    {
      title: 'Amount',
      key: 'total',
      width: 120,
      align: 'right',
      render: (_: unknown, record: PurchaseOrderItem) => (
        <Text strong>
          RM {Number(record.amount || 0).toFixed(2)}
        </Text>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!bill) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Text>Bill not found</Text>
      </div>
    );
  }

  const paymentAllocations: BillPaymentAllocation[] =
    (bill as unknown as { paymentAllocations?: BillPaymentAllocation[] })
      .paymentAllocations || [];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Space style={{ marginBottom: 8 }}>
          <Link href="/portal/vendor/bills">
            <Button type="text" icon={<ArrowLeftOutlined />}>
              Back to Bills
            </Button>
          </Link>
        </Space>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Space>
            <Title level={4} style={{ margin: 0 }}>
              {bill.billNumber}
            </Title>
            <Tag color={statusColors[bill.status]}>
              {bill.status.replace(/_/g, ' ')}
            </Tag>
          </Space>
        </div>
      </div>

      <Row gutter={24}>
        <Col xs={24} lg={16}>
          {/* Bill Details */}
          <Card title="Bill Details" style={{ marginBottom: 16 }}>
            <Descriptions column={{ xs: 1, sm: 2 }}>
              <Descriptions.Item label="Bill Date">
                {dayjs(bill.billDate).format('DD/MM/YYYY')}
              </Descriptions.Item>
              <Descriptions.Item label="Due Date">
                <span
                  style={{
                    color:
                      dayjs(bill.dueDate).isBefore(dayjs()) &&
                      Number(bill.balance) > 0
                        ? '#ff4d4f'
                        : undefined,
                  }}
                >
                  {dayjs(bill.dueDate).format('DD/MM/YYYY')}
                </span>
              </Descriptions.Item>
              {bill.purchaseOrder && (
                <Descriptions.Item label="Purchase Order">
                  <Link
                    href={`/portal/vendor/purchase-orders/${bill.purchaseOrder.id}`}
                  >
                    {bill.purchaseOrder.orderNumber}
                  </Link>
                </Descriptions.Item>
              )}
              <Descriptions.Item label="Vendor Invoice #">
                {bill.vendorInvoiceNumber || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Payment Status">
                <Tag
                  color={
                    bill.status === 'PAID'
                      ? 'green'
                      : bill.status === 'PARTIALLY_PAID'
                        ? 'orange'
                        : bill.status === 'OVERDUE'
                          ? 'red'
                          : 'default'
                  }
                >
                  {Number(bill.amountPaid) > 0
                    ? `RM ${Number(bill.amountPaid).toFixed(2)} paid`
                    : 'Unpaid'}
                </Tag>
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* Line Items */}
          <Card title="Line Items">
            <Table
              columns={itemColumns}
              dataSource={bill.items}
              rowKey="id"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          {/* Bill Summary */}
          <Card title="Summary" style={{ marginBottom: 16 }}>
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
            >
              <div
                style={{ display: 'flex', justifyContent: 'space-between' }}
              >
                <Text type="secondary">Subtotal</Text>
                <Text>RM {Number(bill.subtotal).toFixed(2)}</Text>
              </div>
              {Number(bill.discount || 0) > 0 && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                >
                  <Text type="secondary">Discount</Text>
                  <Text>- RM {Number(bill.discount).toFixed(2)}</Text>
                </div>
              )}
              <div
                style={{ display: 'flex', justifyContent: 'space-between' }}
              >
                <Text type="secondary">Tax</Text>
                <Text>RM {Number(bill.taxAmount).toFixed(2)}</Text>
              </div>
              <Divider style={{ margin: '8px 0' }} />
              <div
                style={{ display: 'flex', justifyContent: 'space-between' }}
              >
                <Text strong style={{ fontSize: 16 }}>
                  Total
                </Text>
                <Text strong style={{ fontSize: 16 }}>
                  RM {Number(bill.total).toFixed(2)}
                </Text>
              </div>
              <Divider style={{ margin: '8px 0' }} />
              <div
                style={{ display: 'flex', justifyContent: 'space-between' }}
              >
                <Text type="secondary">Amount Paid</Text>
                <Text style={{ color: '#52c41a' }}>
                  RM {Number(bill.amountPaid).toFixed(2)}
                </Text>
              </div>
              <div
                style={{ display: 'flex', justifyContent: 'space-between' }}
              >
                <Text strong>Balance Due</Text>
                <Text
                  strong
                  style={{
                    color: Number(bill.balance) > 0 ? '#fa8c16' : '#52c41a',
                  }}
                >
                  RM {Number(bill.balance).toFixed(2)}
                </Text>
              </div>
            </div>
          </Card>

          {/* Payment History */}
          {paymentAllocations.length > 0 && (
            <Card
              title={
                <Space>
                  <DollarOutlined />
                  <span>Payment History</span>
                </Space>
              }
            >
              <Timeline
                items={paymentAllocations.map((alloc) => ({
                  color: 'green',
                  children: (
                    <div key={alloc.id}>
                      <div style={{ fontWeight: 500 }}>
                        {alloc.vendorPayment.paymentNumber}
                      </div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {dayjs(alloc.vendorPayment.paymentDate).format(
                          'DD/MM/YYYY',
                        )}{' '}
                        - {alloc.vendorPayment.paymentMethod.replace(/_/g, ' ')}
                      </Text>
                      <div>
                        <Text strong style={{ color: '#52c41a' }}>
                          RM {Number(alloc.amount).toFixed(2)}
                        </Text>
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
