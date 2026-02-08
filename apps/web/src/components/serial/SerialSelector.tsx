'use client';

import { useState, useMemo } from 'react';
import { Card, Table, Checkbox, Input, Typography, Space, Alert } from 'antd';
import type { TableColumnsType } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useAvailableSerials } from '@/hooks/use-serials';
import type { Serial } from '@/lib/serial';

const { Text } = Typography;

interface SerialSelectorProps {
  itemId: string;
  warehouseId: string;
  requiredCount: number;
  onChange: (selectedIds: string[]) => void;
  value?: string[];
}

export function SerialSelector({
  itemId,
  warehouseId,
  requiredCount,
  onChange,
  value = [],
}: SerialSelectorProps) {
  const [searchText, setSearchText] = useState('');

  const { data: serials, isLoading } = useAvailableSerials(itemId, warehouseId);

  const filteredSerials = useMemo(() => {
    if (!serials) return [];
    if (!searchText) return serials;
    return serials.filter((s) => s.serialNumber.toLowerCase().includes(searchText.toLowerCase()));
  }, [serials, searchText]);

  const handleToggle = (serialId: string, checked: boolean) => {
    if (checked) {
      if (value.length < requiredCount) {
        onChange([...value, serialId]);
      }
    } else {
      onChange(value.filter((id) => id !== serialId));
    }
  };

  const columns: TableColumnsType<Serial> = [
    {
      title: '',
      key: 'select',
      width: 50,
      render: (_, record) => (
        <Checkbox
          checked={value.includes(record.id)}
          onChange={(e) => handleToggle(record.id, e.target.checked)}
          disabled={!value.includes(record.id) && value.length >= requiredCount}
        />
      ),
    },
    {
      title: 'Serial Number',
      dataIndex: 'serialNumber',
      key: 'serialNumber',
      render: (sn: string) => <Text strong>{sn}</Text>,
    },
    {
      title: 'Item',
      key: 'item',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text>{record.item.sku}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.item.name}
          </Text>
        </Space>
      ),
    },
  ];

  return (
    <Card title="Serial Number Selection" size="small">
      <Space direction="vertical" style={{ width: '100%' }}>
        <Input
          placeholder="Search serial numbers..."
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
        />

        {value.length < requiredCount && value.length > 0 && (
          <Alert
            message={`${requiredCount - value.length} more serial${requiredCount - value.length === 1 ? '' : 's'} needed`}
            type="warning"
            showIcon
          />
        )}
        {value.length >= requiredCount && (
          <Alert message={`All ${requiredCount} serials selected`} type="success" showIcon />
        )}

        <Table
          columns={columns}
          dataSource={filteredSerials}
          rowKey="id"
          loading={isLoading}
          pagination={false}
          size="small"
          scroll={{ y: 300 }}
        />

        <div style={{ textAlign: 'right' }}>
          <Text type="secondary">
            Selected: <Text strong>{value.length}</Text> / {requiredCount}
          </Text>
        </div>
      </Space>
    </Card>
  );
}
