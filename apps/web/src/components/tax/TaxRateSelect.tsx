'use client';

import { Select, Tag, Space, Typography } from 'antd';
import type { SelectProps } from 'antd';
import { useActiveTaxRates } from '@/hooks/use-tax-rates';
import { TaxRate, TAX_TYPE_LABELS, TAX_TYPE_COLORS, TaxType } from '@/lib/tax-rates';

const { Text } = Typography;

interface TaxRateSelectProps extends Omit<SelectProps, 'options'> {
  value?: string;
  onChange?: (value: string | undefined) => void;
  showRate?: boolean;
  filterType?: TaxType | 'sales' | 'purchase' | 'all';
  placeholder?: string;
}

export function TaxRateSelect({
  value,
  onChange,
  showRate = true,
  filterType = 'all',
  placeholder = 'Select tax rate',
  ...props
}: TaxRateSelectProps) {
  const { data: taxRatesData, isLoading } = useActiveTaxRates();

  const taxRates = taxRatesData?.data || [];

  // Filter by type if specified
  let filteredRates = taxRates;
  if (filterType === 'sales') {
    filteredRates = taxRates.filter((r) => ['SST', 'ZERO_RATED', 'EXEMPT'].includes(r.type));
  } else if (filterType === 'purchase') {
    filteredRates = taxRates.filter((r) =>
      ['SST', 'SERVICE_TAX', 'ZERO_RATED', 'EXEMPT'].includes(r.type)
    );
  } else if (filterType !== 'all') {
    filteredRates = taxRates.filter((r) => r.type === filterType);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _options = filteredRates.map((rate) => ({
    value: rate.id,
    label: showRate ? `${rate.name} (${rate.code})` : rate.name,
    rate,
  }));

  const renderOption = (rate: TaxRate) => (
    <Space>
      <Tag color={TAX_TYPE_COLORS[rate.type]} style={{ marginRight: 0 }}>
        {TAX_TYPE_LABELS[rate.type]}
      </Tag>
      <span>{rate.name}</span>
      {showRate && (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {rate.rate}%
        </Text>
      )}
      {rate.isDefault && (
        <Tag color="gold" style={{ marginLeft: 4 }}>
          Default
        </Tag>
      )}
    </Space>
  );

  return (
    <Select
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      loading={isLoading}
      allowClear
      showSearch
      optionFilterProp="label"
      {...props}
    >
      {filteredRates.map((rate) => (
        <Select.Option key={rate.id} value={rate.id} label={`${rate.name} ${rate.code}`}>
          {renderOption(rate)}
        </Select.Option>
      ))}
    </Select>
  );
}
