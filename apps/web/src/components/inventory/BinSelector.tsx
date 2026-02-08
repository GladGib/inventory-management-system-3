'use client';

import { useMemo } from 'react';
import { Select, Typography, Tag, Space } from 'antd';
import { useBins } from '@/hooks/use-bins';
import { BinType } from '@/types/enums';

const { Text } = Typography;

const BIN_TYPE_COLORS: Record<BinType, string> = {
  [BinType.STORAGE]: 'blue',
  [BinType.PICKING]: 'green',
  [BinType.RECEIVING]: 'orange',
  [BinType.SHIPPING]: 'purple',
  [BinType.STAGING]: 'cyan',
};

interface BinSelectorProps {
  warehouseId: string;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
  activeOnly?: boolean;
  filterType?: BinType;
}

export function BinSelector({
  warehouseId,
  value,
  onChange,
  placeholder = 'Select bin...',
  disabled,
  style,
  activeOnly = true,
  filterType,
}: BinSelectorProps) {
  const { data: bins, isLoading } = useBins(warehouseId, {
    isActive: activeOnly ? true : undefined,
    type: filterType,
  });

  const options = useMemo(() => {
    return (bins || []).map((bin) => ({
      value: bin.id,
      label: (
        <Space size={4}>
          <Text strong>{bin.code}</Text>
          {bin.name && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              - {bin.name}
            </Text>
          )}
          <Tag
            color={BIN_TYPE_COLORS[bin.type]}
            style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px', margin: 0 }}
          >
            {bin.type}
          </Tag>
          {bin.warehouseZone && (
            <Text type="secondary" style={{ fontSize: 11 }}>
              [{bin.warehouseZone.name}]
            </Text>
          )}
        </Space>
      ),
      searchLabel: `${bin.code} ${bin.name || ''} ${bin.type} ${bin.warehouseZone?.name || ''}`,
    }));
  }, [bins]);

  return (
    <Select
      showSearch
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled || !warehouseId}
      style={style}
      loading={isLoading}
      options={options}
      optionFilterProp="searchLabel"
      notFoundContent={
        isLoading
          ? 'Loading...'
          : !warehouseId
            ? 'Select a warehouse first'
            : 'No bins found'
      }
    />
  );
}
