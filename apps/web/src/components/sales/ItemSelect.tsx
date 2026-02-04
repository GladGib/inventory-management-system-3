'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Select, Space, Typography } from 'antd';
import { useItems } from '@/hooks/use-items';
import { Item } from '@/lib/items';

const { Text } = Typography;

interface ItemSelectProps {
  value?: string;
  onChange?: (value: string, item?: Item) => void;
  placeholder?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
}

export function ItemSelect({
  value,
  onChange,
  placeholder = 'Search items...',
  disabled,
  style,
}: ItemSelectProps) {
  const [searchText, setSearchText] = useState('');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { data, isLoading } = useItems({
    search: searchText || undefined,
    status: 'ACTIVE',
    limit: 20,
  });

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleSearch = useCallback((text: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setSearchText(text);
    }, 300);
  }, []);

  const handleChange = (selectedValue: string) => {
    const selectedItem = data?.data.find((item) => item.id === selectedValue);
    onChange?.(selectedValue, selectedItem);
  };

  const options = useMemo(() => {
    return (data?.data || []).map((item) => ({
      value: item.id,
      label: (
        <Space direction="vertical" size={0}>
          <Space>
            <Text strong>{item.sku}</Text>
            <Text type="secondary">-</Text>
            <Text>{item.name}</Text>
          </Space>
          <Text type="secondary" style={{ fontSize: 12 }}>
            RM {Number(item.sellingPrice).toFixed(2)} / {item.unit}
          </Text>
        </Space>
      ),
      searchLabel: `${item.sku} - ${item.name}`,
      item,
    }));
  }, [data?.data]);

  return (
    <Select
      showSearch
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      disabled={disabled}
      style={style}
      loading={isLoading}
      filterOption={false}
      onSearch={handleSearch}
      options={options}
      optionLabelProp="searchLabel"
      notFoundContent={isLoading ? 'Loading...' : 'No items found'}
    />
  );
}
