'use client';

import { use } from 'react';
import Link from 'next/link';
import dayjs from 'dayjs';
import { Card, Typography, Button, Space, Row, Col, Tag, Descriptions, Table, Spin } from 'antd';
import type { TableColumnsType } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useVendorPayment } from '@/hooks/use-purchases';

const { Title, Text } = Typography;

interface PaymentAllocation {
  billId: string;
  bill: {
    id: string;
    billNumber: string;
  };
  amount: number;
}

const paymentMethodLabels: Record<string, string> = {
  CASH: 'Cash',
  BANK_TRANSFER: 'Bank Transfer',
  CHEQUE: 'Cheque',
  ONLINE_BANKING: 'Online Banking',
  CREDIT_CARD: 'Credit Card',
};

export default function VendorPaymentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { data: payment, isLoading } = useVendorPayment(id);

  const columns: TableColumnsType<PaymentAllocation> = [
    {
      title: 'Bill #',
      key: 'billNumber',
      render: (_, record) => (
        <Link href={`/purchases/bills/${record.billId}`}>
          <Text strong>{record.bill.billNumber}</Text>
        </Link>
      ),
    },
    {
      title: 'Amount Applied',
      dataIndex: 'amount',
      key: 'amount',
      width: 150,
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

  if (!payment) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Text>Payment not found</Text>
      </div>
    );
  }

  const totalAllocated = payment.allocations.reduce((sum, a) => sum + Number(a.amount), 0);
  const unallocatedAmount = Number(payment.amount) - totalAllocated;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Space style={{ marginBottom: 8 }}>
          <Link href="/purchases/payments">
            <Button type="text" icon={<ArrowLeftOutlined />}>
              Back
            </Button>
          </Link>
        </Space>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <Title level={4} style={{ margin: 0 }}>
              {payment.paymentNumber}
            </Title>
            <Tag color="green">Paid</Tag>
          </Space>
        </div>
      </div>

      <Row gutter={24}>
        <Col span={16}>
          {/* Payment Details */}
          <Card title="Payment Details" style={{ marginBottom: 16 }}>
            <Descriptions column={2}>
              <Descriptions.Item label="Vendor">
                <Text strong>{payment.vendor.displayName}</Text>
                {payment.vendor.companyName && (
                  <Text type="secondary" style={{ display: 'block' }}>
                    {payment.vendor.companyName}
                  </Text>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Payment Date">
                {dayjs(payment.paymentDate).format('DD/MM/YYYY')}
              </Descriptions.Item>
              <Descriptions.Item label="Payment Method">
                {paymentMethodLabels[payment.paymentMethod] || payment.paymentMethod}
              </Descriptions.Item>
              <Descriptions.Item label="Reference #">
                {payment.referenceNumber || '-'}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* Bill Allocations */}
          {payment.allocations.length > 0 && (
            <Card title="Applied to Bills">
              <Table
                columns={columns}
                dataSource={payment.allocations}
                rowKey="billId"
                pagination={false}
                size="small"
              />
            </Card>
          )}

          {/* Notes */}
          {payment.notes && (
            <Card title="Notes" style={{ marginTop: 16 }}>
              <Text>{payment.notes}</Text>
            </Card>
          )}
        </Col>

        <Col span={8}>
          <Card title="Payment Summary">
            <Space direction="vertical" style={{ width: '100%' }} size={16}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Title level={4} style={{ margin: 0 }}>
                  Total Amount
                </Title>
                <Title level={4} style={{ margin: 0 }}>
                  RM {Number(payment.amount).toFixed(2)}
                </Title>
              </div>

              {payment.allocations.length > 0 && (
                <>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      borderTop: '1px solid #f0f0f0',
                      paddingTop: 16,
                    }}
                  >
                    <Text>Applied to Bills</Text>
                    <Text>RM {totalAllocated.toFixed(2)}</Text>
                  </div>
                  {unallocatedAmount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text>Unallocated (Advance)</Text>
                      <Text type="warning">RM {unallocatedAmount.toFixed(2)}</Text>
                    </div>
                  )}
                </>
              )}
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
