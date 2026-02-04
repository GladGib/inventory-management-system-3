'use client';

import { useMemo } from 'react';
import { Select, Typography } from 'antd';
import { useWarehouses } from '@/hooks/use-inventory';

const { Text } = Typography;

interface WarehouseSelectProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
  excludeId?: string; // For transfers - exclude source warehouse from destination
}

export function WarehouseSelect({
  value,
  onChange,
  placeholder = 'Select warehouse...',
  disabled,
  style,
  excludeId,
}: WarehouseSelectProps) {
  const { data: warehouses, isLoading } = useWarehouses();

  const options = useMemo(() => {
    return (warehouses || [])
      .filter((w) => w.status === 'ACTIVE' && w.id !== excludeId)
      .map((warehouse) => ({
        value: warehouse.id,
        label: (
          <div>
            <Text strong>{warehouse.name}</Text>
            <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
              ({warehouse.code})
            </Text>
          </div>
        ),
        searchLabel: `${warehouse.name} ${warehouse.code}`,
      }));
  }, [warehouses, excludeId]);

  return (
    <Select
      showSearch
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      style={style}
      loading={isLoading}
      options={options}
      optionFilterProp="searchLabel"
      notFoundContent={isLoading ? 'Loading...' : 'No warehouses found'}
    />
  );
}
