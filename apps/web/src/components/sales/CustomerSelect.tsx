'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Select, Space, Typography } from 'antd';
import { useCustomers } from '@/hooks/use-contacts';

const { Text } = Typography;

interface CustomerSelectProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
}

export function CustomerSelect({
  value,
  onChange,
  placeholder = 'Search customers...',
  disabled,
  style,
}: CustomerSelectProps) {
  const [searchText, setSearchText] = useState('');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { data, isLoading } = useCustomers({
    search: searchText || undefined,
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

  const options = useMemo(() => {
    return (data?.data || []).map((customer) => ({
      value: customer.id,
      label: (
        <Space direction="vertical" size={0}>
          <Text strong>{customer.displayName}</Text>
          {customer.companyName && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {customer.companyName}
            </Text>
          )}
        </Space>
      ),
      searchLabel: `${customer.displayName} ${customer.companyName || ''}`,
    }));
  }, [data?.data]);

  return (
    <Select
      showSearch
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      style={style}
      loading={isLoading}
      filterOption={false}
      onSearch={handleSearch}
      options={options}
      optionLabelProp="searchLabel"
      notFoundContent={isLoading ? 'Loading...' : 'No customers found'}
    />
  );
}
