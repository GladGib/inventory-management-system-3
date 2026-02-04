'use client';

import { Select, Space, Tag, Typography, Spin } from 'antd';
import { StarFilled } from '@ant-design/icons';
import { usePaymentTerms } from '@/hooks/use-payment-terms';
import type { PaymentTerm } from '@/lib/payment-terms';

const { Text } = Typography;

interface PaymentTermSelectProps {
  value?: string;
  onChange: (termId: string | undefined, term?: PaymentTerm) => void;
  showDays?: boolean;
  allowClear?: boolean;
  disabled?: boolean;
  placeholder?: string;
  onDueDateChange?: (dueDate: Date) => void;
  invoiceDate?: Date;
}

export function PaymentTermSelect({
  value,
  onChange,
  showDays = true,
  allowClear = true,
  disabled = false,
  placeholder = 'Select payment term',
}: PaymentTermSelectProps) {
  const { data: paymentTerms = [], isLoading } = usePaymentTerms();

  // Filter to only show active terms
  const activeTerms = paymentTerms.filter((term) => term.isActive);

  const selectedTerm = activeTerms.find((term) => term.id === value);

  const handleChange = (selectedId: string | undefined) => {
    const term = selectedId ? activeTerms.find((t) => t.id === selectedId) : undefined;
    onChange(selectedId, term);
  };

  if (isLoading) {
    return <Spin size="small" />;
  }

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Select
        value={value}
        onChange={handleChange}
        disabled={disabled}
        placeholder={placeholder}
        allowClear={allowClear}
        style={{ width: '100%' }}
        loading={isLoading}
        options={activeTerms.map((term) => ({
          value: term.id,
          label: (
            <Space>
              <span>{term.name}</span>
              {term.isDefault && <StarFilled style={{ color: '#faad14', fontSize: 12 }} />}
              {showDays && (
                <Tag color={term.days === 0 ? 'green' : 'blue'} style={{ marginLeft: 8 }}>
                  {term.days} days
                </Tag>
              )}
            </Space>
          ),
        }))}
      />
      {selectedTerm && selectedTerm.description && (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {selectedTerm.description}
        </Text>
      )}
    </Space>
  );
}
