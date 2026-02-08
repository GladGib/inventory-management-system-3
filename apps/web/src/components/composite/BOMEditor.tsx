'use client';

import { useState } from 'react';
import { Table, Button, InputNumber, Input, Space, Popconfirm, Select, Typography } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useItems } from '@/hooks/use-items';
import type { TableColumnsType } from 'antd';

const { Text } = Typography;

export interface BOMComponentRow {
  key: string;
  componentItemId: string;
  componentSku?: string;
  componentName?: string;
  componentUnit?: string;
  componentCostPrice?: number;
  quantity: number;
  notes?: string;
  sortOrder: number;
}

interface BOMEditorProps {
  components: BOMComponentRow[];
  onChange: (components: BOMComponentRow[]) => void;
  excludeItemId?: string;
}

export function BOMEditor({ components, onChange, excludeItemId }: BOMEditorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const { data: itemsResponse } = useItems({ search: searchTerm, limit: 20 });

  const items = itemsResponse?.data || [];
  const filteredItems = items.filter(
    (item) => item.id !== excludeItemId && !components.some((c) => c.componentItemId === item.id)
  );

  const handleAddComponent = (itemId: string) => {
    const selectedItem = items.find((i) => i.id === itemId);
    if (!selectedItem) return;

    const newComponent: BOMComponentRow = {
      key: `comp-${Date.now()}`,
      componentItemId: selectedItem.id,
      componentSku: selectedItem.sku,
      componentName: selectedItem.name,
      componentUnit: selectedItem.unit,
      componentCostPrice: selectedItem.costPrice,
      quantity: 1,
      notes: '',
      sortOrder: components.length,
    };

    onChange([...components, newComponent]);
    setSearchTerm('');
  };

  const handleUpdateQuantity = (key: string, quantity: number | null) => {
    onChange(components.map((c) => (c.key === key ? { ...c, quantity: quantity || 0 } : c)));
  };

  const handleUpdateNotes = (key: string, notes: string) => {
    onChange(components.map((c) => (c.key === key ? { ...c, notes } : c)));
  };

  const handleRemove = (key: string) => {
    onChange(components.filter((c) => c.key !== key));
  };

  const columns: TableColumnsType<BOMComponentRow> = [
    {
      title: '#',
      key: 'index',
      width: 50,
      render: (_, __, index) => index + 1,
    },
    {
      title: 'SKU',
      dataIndex: 'componentSku',
      key: 'sku',
      width: 120,
    },
    {
      title: 'Component Item',
      dataIndex: 'componentName',
      key: 'name',
      ellipsis: true,
    },
    {
      title: 'Unit',
      dataIndex: 'componentUnit',
      key: 'unit',
      width: 80,
    },
    {
      title: 'Qty Required',
      key: 'quantity',
      width: 130,
      render: (_, record) => (
        <InputNumber
          min={0.0001}
          step={1}
          value={record.quantity}
          onChange={(val) => handleUpdateQuantity(record.key, val)}
          style={{ width: '100%' }}
          size="small"
        />
      ),
    },
    {
      title: 'Unit Cost',
      key: 'unitCost',
      width: 110,
      align: 'right',
      render: (_, record) => <Text>RM {(record.componentCostPrice || 0).toFixed(2)}</Text>,
    },
    {
      title: 'Total Cost',
      key: 'totalCost',
      width: 110,
      align: 'right',
      render: (_, record) => (
        <Text strong>RM {((record.componentCostPrice || 0) * record.quantity).toFixed(2)}</Text>
      ),
    },
    {
      title: 'Notes',
      key: 'notes',
      width: 150,
      render: (_, record) => (
        <Input
          value={record.notes}
          onChange={(e) => handleUpdateNotes(record.key, e.target.value)}
          size="small"
          placeholder="Optional notes"
        />
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 60,
      render: (_, record) => (
        <Popconfirm title="Remove this component?" onConfirm={() => handleRemove(record.key)}>
          <Button type="text" danger icon={<DeleteOutlined />} size="small" />
        </Popconfirm>
      ),
    },
  ];

  const totalCost = components.reduce(
    (sum, c) => sum + (c.componentCostPrice || 0) * c.quantity,
    0
  );

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Select<string>
            showSearch
            placeholder="Search and add component item..."
            style={{ width: 400 }}
            onSearch={setSearchTerm}
            onSelect={handleAddComponent}
            filterOption={false}
            value={undefined}
            notFoundContent={searchTerm ? 'No items found' : 'Type to search'}
            options={filteredItems.map((item) => ({
              value: item.id,
              label: `${item.sku} - ${item.name}`,
            }))}
          />
          <Text type="secondary">or</Text>
          <Button
            icon={<PlusOutlined />}
            disabled={filteredItems.length === 0}
            onClick={() => {
              if (filteredItems.length > 0) {
                handleAddComponent(filteredItems[0].id);
              }
            }}
          >
            Add First Match
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={components}
        rowKey="key"
        pagination={false}
        size="small"
        scroll={{ x: 900 }}
        footer={() => (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 24 }}>
            <Text>
              Components: <Text strong>{components.length}</Text>
            </Text>
            <Text>
              Total Component Cost: <Text strong>RM {totalCost.toFixed(2)}</Text>
            </Text>
          </div>
        )}
      />
    </div>
  );
}
