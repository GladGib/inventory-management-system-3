'use client';

import { Select, Tag, Space } from 'antd';
import type { SelectProps } from 'antd';
import { usePriceLists } from '@/hooks/use-price-lists';
import type { PriceListType } from '@/lib/price-lists';

interface PriceListSelectProps extends Omit<SelectProps, 'options' | 'loading'> {
  filterType?: PriceListType;
}

/**
 * PriceListSelect - Dropdown to select a price list.
 * Used in contact forms for assigning price lists.
 *
 * Usage:
 * <PriceListSelect filterType="SALES" value={value} onChange={onChange} />
 */
export function PriceListSelect({ filterType, ...props }: PriceListSelectProps) {
  const { data, isLoading } = usePriceLists({
    type: filterType,
    status: 'ACTIVE',
    limit: 100,
  });

  const options = (data?.data || []).map((pl) => ({
    label: (
      <Space size={4}>
        <span>{pl.name}</span>
        <Tag
          color={pl.type === 'SALES' ? 'blue' : 'green'}
          style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px' }}
        >
          {pl.type}
        </Tag>
        {pl.isDefault && (
          <Tag color="gold" style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px' }}>
            Default
          </Tag>
        )}
      </Space>
    ),
    value: pl.id,
    searchLabel: pl.name,
  }));

  return (
    <Select
      placeholder="Select price list"
      showSearch
      allowClear
      loading={isLoading}
      optionFilterProp="searchLabel"
      options={options}
      {...props}
    />
  );
}
