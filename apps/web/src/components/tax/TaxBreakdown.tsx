'use client';

import { Card, Space, Typography, Divider, Tag } from 'antd';
import { TaxBreakdownItem, TAX_TYPE_COLORS, TaxType } from '@/lib/tax-rates';

const { Text } = Typography;

interface TaxBreakdownProps {
  breakdown: TaxBreakdownItem[];
  subtotal: number;
  taxAmount: number;
  total: number;
  currency?: string;
  showByRate?: boolean;
  compact?: boolean;
}

export function TaxBreakdown({
  breakdown,
  subtotal,
  taxAmount,
  total,
  currency = 'RM',
  showByRate = true,
  compact = false,
}: TaxBreakdownProps) {
  const formatAmount = (amount: number) => {
    return `${currency} ${amount.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (compact) {
    return (
      <Space direction="vertical" size={4} style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Text type="secondary">Subtotal</Text>
          <Text>{formatAmount(subtotal)}</Text>
        </div>
        {breakdown.map((item) => (
          <div key={item.taxRateId} style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Text type="secondary">
              {item.taxRateName} ({item.rate}%)
            </Text>
            <Text>{formatAmount(item.taxAmount)}</Text>
          </div>
        ))}
        <Divider style={{ margin: '8px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Text strong>Total</Text>
          <Text strong>{formatAmount(total)}</Text>
        </div>
      </Space>
    );
  }

  return (
    <Card size="small" title="Tax Summary">
      <Space direction="vertical" size={8} style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Text>Subtotal</Text>
          <Text>{formatAmount(subtotal)}</Text>
        </div>

        {showByRate && breakdown.length > 0 && (
          <>
            <Divider style={{ margin: '8px 0' }} dashed />
            <Text type="secondary" style={{ fontSize: 12 }}>
              Tax Breakdown
            </Text>
            {breakdown.map((item) => (
              <div
                key={item.taxRateId}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <Space size={4}>
                  <Tag
                    color={TAX_TYPE_COLORS[item.taxRateCode as TaxType] || 'default'}
                    style={{ marginRight: 0 }}
                  >
                    {item.taxRateCode}
                  </Tag>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {item.taxRateName} ({item.rate}%)
                  </Text>
                </Space>
                <Text>{formatAmount(item.taxAmount)}</Text>
              </div>
            ))}
          </>
        )}

        {!showByRate && taxAmount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Text type="secondary">Tax</Text>
            <Text>{formatAmount(taxAmount)}</Text>
          </div>
        )}

        <Divider style={{ margin: '8px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Text strong style={{ fontSize: 16 }}>
            Total
          </Text>
          <Text strong style={{ fontSize: 16 }}>
            {formatAmount(total)}
          </Text>
        </div>
      </Space>
    </Card>
  );
}
