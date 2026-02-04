'use client';

import { Card, Divider, Space, Typography } from 'antd';

const { Text, Title } = Typography;

interface OrderSummaryProps {
  subtotal: number;
  discount: number;
  shipping?: number;
  taxAmount: number;
  total: number;
  amountPaid?: number;
  showBalance?: boolean;
}

export function OrderSummary({
  subtotal,
  discount,
  shipping = 0,
  taxAmount,
  total,
  amountPaid = 0,
  showBalance = false,
}: OrderSummaryProps) {
  const balance = total - amountPaid;

  return (
    <Card title="Summary" size="small">
      <Space direction="vertical" style={{ width: '100%' }} size={8}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Text>Subtotal</Text>
          <Text>RM {subtotal.toFixed(2)}</Text>
        </div>

        {discount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Text>Discount</Text>
            <Text type="danger">- RM {discount.toFixed(2)}</Text>
          </div>
        )}

        {shipping > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Text>Shipping</Text>
            <Text>RM {shipping.toFixed(2)}</Text>
          </div>
        )}

        {taxAmount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Text>Tax</Text>
            <Text>RM {taxAmount.toFixed(2)}</Text>
          </div>
        )}

        <Divider style={{ margin: '8px 0' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Title level={5} style={{ margin: 0 }}>
            Total
          </Title>
          <Title level={5} style={{ margin: 0 }}>
            RM {total.toFixed(2)}
          </Title>
        </div>

        {showBalance && amountPaid > 0 && (
          <>
            <Divider style={{ margin: '8px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text>Amount Paid</Text>
              <Text type="success">RM {amountPaid.toFixed(2)}</Text>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text strong>Balance Due</Text>
              <Text strong type={balance > 0 ? 'danger' : 'success'}>
                RM {balance.toFixed(2)}
              </Text>
            </div>
          </>
        )}
      </Space>
    </Card>
  );
}
