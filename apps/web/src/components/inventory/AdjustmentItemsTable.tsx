'use client';

import { useCallback } from 'react';
import { Table, Button, InputNumber, Select, Input, Space, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { ItemSelect } from '@/components/sales';
import { Item } from '@/lib/items';
import { useStockLevels } from '@/hooks/use-inventory';
import { AdjustmentReason } from '@/lib/inventory';

const { Text } = Typography;

const reasonOptions = [
  { value: 'OPENING_STOCK', label: 'Opening Stock' },
  { value: 'DAMAGE', label: 'Damage' },
  { value: 'LOSS', label: 'Loss' },
  { value: 'RETURN', label: 'Return' },
  { value: 'FOUND', label: 'Found' },
  { value: 'CORRECTION', label: 'Correction' },
  { value: 'OTHER', label: 'Other' },
];

export interface AdjustmentLineItem {
  key: string;
  itemId?: string;
  itemName?: string;
  itemSku?: string;
  unit?: string;
  quantity: number;
  reason: AdjustmentReason;
  notes?: string;
  currentStock?: number;
}

interface AdjustmentItemsTableProps {
  items: AdjustmentLineItem[];
  onChange: (items: AdjustmentLineItem[]) => void;
  warehouseId?: string;
  readOnly?: boolean;
}

export function AdjustmentItemsTable({
  items,
  onChange,
  warehouseId,
  readOnly = false,
}: AdjustmentItemsTableProps) {
  const { data: stockLevels } = useStockLevels({ warehouseId });

  const getStockForItem = useCallback(
    (itemId?: string) => {
      if (!itemId || !stockLevels) return 0;
      const stock = stockLevels.find((s) => s.itemId === itemId);
      return stock?.stockOnHand || 0;
    },
    [stockLevels]
  );

  const handleAddItem = () => {
    const newItem: AdjustmentLineItem = {
      key: `item-${Date.now()}`,
      quantity: 0,
      reason: 'CORRECTION',
    };
    onChange([...items, newItem]);
  };

  const handleRemoveItem = (key: string) => {
    onChange(items.filter((item) => item.key !== key));
  };

  const handleItemChange = (key: string, field: keyof AdjustmentLineItem, value: unknown) => {
    onChange(
      items.map((item) => {
        if (item.key !== key) return item;
        return { ...item, [field]: value };
      })
    );
  };

  const handleItemSelect = (key: string, itemId: string, item?: Item) => {
    const currentStock = getStockForItem(itemId);
    onChange(
      items.map((lineItem) => {
        if (lineItem.key !== key) return lineItem;
        return {
          ...lineItem,
          itemId,
          itemName: item?.name,
          itemSku: item?.sku,
          unit: item?.unit,
          currentStock,
        };
      })
    );
  };

  const columns: ColumnsType<AdjustmentLineItem> = [
    {
      title: 'Item',
      dataIndex: 'itemId',
      key: 'item',
      width: readOnly ? 250 : 280,
      render: (_: unknown, record: AdjustmentLineItem) => {
        if (readOnly) {
          return (
            <Space direction="vertical" size={0}>
              <Text strong>{record.itemSku}</Text>
              <Text>{record.itemName}</Text>
            </Space>
          );
        }
        return (
          <ItemSelect
            value={record.itemId}
            onChange={(id, item) => handleItemSelect(record.key, id, item)}
            style={{ width: '100%' }}
          />
        );
      },
    },
    {
      title: 'Current Stock',
      key: 'currentStock',
      width: 120,
      align: 'right',
      render: (_: unknown, record: AdjustmentLineItem) => {
        const stock = record.currentStock ?? getStockForItem(record.itemId);
        return (
          <Text type="secondary">
            {stock} {record.unit || ''}
          </Text>
        );
      },
    },
    {
      title: 'Adjustment Qty',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 140,
      render: (_: unknown, record: AdjustmentLineItem) => {
        if (readOnly) {
          const isPositive = record.quantity > 0;
          return (
            <Text type={isPositive ? 'success' : 'danger'}>
              {isPositive ? '+' : ''}
              {record.quantity} {record.unit || ''}
            </Text>
          );
        }
        return (
          <InputNumber
            value={record.quantity}
            onChange={(value) => handleItemChange(record.key, 'quantity', value || 0)}
            style={{ width: '100%' }}
          />
        );
      },
    },
    {
      title: 'Reason',
      dataIndex: 'reason',
      key: 'reason',
      width: 150,
      render: (_: unknown, record: AdjustmentLineItem) => {
        if (readOnly) {
          return reasonOptions.find((r) => r.value === record.reason)?.label || record.reason;
        }
        return (
          <Select
            value={record.reason}
            onChange={(value) => handleItemChange(record.key, 'reason', value)}
            style={{ width: '100%' }}
            options={reasonOptions}
          />
        );
      },
    },
    {
      title: 'Notes',
      dataIndex: 'notes',
      key: 'notes',
      render: (_: unknown, record: AdjustmentLineItem) => {
        if (readOnly) {
          return record.notes || '-';
        }
        return (
          <Input
            value={record.notes}
            onChange={(e) => handleItemChange(record.key, 'notes', e.target.value)}
            placeholder="Optional notes"
          />
        );
      },
    },
  ];

  if (!readOnly) {
    columns.push({
      title: '',
      dataIndex: 'actions',
      key: 'actions',
      width: 50,
      align: 'center',
      render: (_: unknown, record: AdjustmentLineItem) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleRemoveItem(record.key)}
        />
      ),
    });
  }

  return (
    <div>
      <Table
        columns={columns}
        dataSource={items}
        rowKey="key"
        pagination={false}
        size="small"
        scroll={{ x: 800 }}
      />
      {!readOnly && (
        <Button
          type="dashed"
          onClick={handleAddItem}
          style={{ width: '100%', marginTop: 16 }}
          icon={<PlusOutlined />}
          disabled={!warehouseId}
        >
          {warehouseId ? 'Add Item' : 'Select a warehouse first'}
        </Button>
      )}
    </div>
  );
}
