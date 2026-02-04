'use client';

import Link from 'next/link';
import dayjs from 'dayjs';
import {
  Card,
  Typography,
  Button,
  Space,
  Descriptions,
  Spin,
  Result,
  Row,
  Col,
  Table,
  Tag,
} from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { usePayment } from '@/hooks/use-sales';

const { Title, Text } = Typography;

const paymentMethodLabels: Record<string, string> = {
  CASH: 'Cash',
  BANK_TRANSFER: 'Bank Transfer',
  CHECK: 'Check',
  CREDIT_CARD: 'Credit Card',
  OTHER: 'Other',
};

interface PageProps {
  params: { id: string };
}

export default function PaymentDetailPage({ params }: PageProps) {
  const { id } = params;

  const { data: payment, isLoading, error } = usePayment(id);

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error || !payment) {
    return (
      <Result
        status="404"
        title="Payment not found"
        subTitle="The payment you're looking for doesn't exist."
        extra={
          <Link href="/sales/payments">
            <Button type="primary">Back to Payments</Button>
          </Link>
        }
      />
    );
  }

  const allocationColumns = [
    {
      title: 'Invoice #',
      dataIndex: ['invoice', 'invoiceNumber'],
      key: 'invoiceNumber',
      render: (num: string, record: { invoiceId: string }) => (
        <Link href={`/sales/invoices/${record.invoiceId}`}>{num}</Link>
      ),
    },
    {
      title: 'Amount Applied',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right' as const,
      render: (amount: number) => `RM ${Number(amount).toFixed(2)}`,
    },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Space style={{ marginBottom: 8 }}>
          <Link href="/sales/payments">
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
            <Tag color="green">Recorded</Tag>
          </Space>
        </div>
      </div>

      <Row gutter={24}>
        <Col span={16}>
          {/* Payment Info */}
          <Card title="Payment Details">
            <Descriptions column={2}>
              <Descriptions.Item label="Customer">
                <Text strong>{payment.customer.displayName}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Payment Date">
                {dayjs(payment.paymentDate).format('DD/MM/YYYY')}
              </Descriptions.Item>
              <Descriptions.Item label="Amount">
                <Text strong style={{ fontSize: 18 }}>
                  RM {Number(payment.amount).toFixed(2)}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Payment Method">
                {paymentMethodLabels[payment.paymentMethod] || payment.paymentMethod}
              </Descriptions.Item>
              {payment.referenceNumber && (
                <Descriptions.Item label="Reference Number">
                  {payment.referenceNumber}
                </Descriptions.Item>
              )}
            </Descriptions>

            {payment.notes && (
              <>
                <Title level={5} style={{ marginTop: 16 }}>
                  Notes
                </Title>
                <Text>{payment.notes}</Text>
              </>
            )}
          </Card>

          {/* Allocations */}
          <Card title="Invoice Allocations" style={{ marginTop: 16 }}>
            <Table
              columns={allocationColumns}
              dataSource={payment.allocations}
              rowKey="invoiceId"
              pagination={false}
              size="small"
              summary={() => (
                <Table.Summary>
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0}>
                      <Text strong>Total</Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1} align="right">
                      <Text strong>RM {Number(payment.amount).toFixed(2)}</Text>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                </Table.Summary>
              )}
            />
          </Card>
        </Col>

        <Col span={8}>
          <Card title="Timeline">
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text type="secondary">Recorded</Text>
                <br />
                <Text>{dayjs(payment.createdAt).format('DD/MM/YYYY HH:mm')}</Text>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
