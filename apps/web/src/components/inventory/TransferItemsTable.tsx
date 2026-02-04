'use client';

import { useCallback } from 'react';
import { Table, Button, InputNumber, Space, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { ItemSelect } from '@/components/sales';
import { Item } from '@/lib/items';
import { useStockLevels } from '@/hooks/use-inventory';

const { Text } = Typography;

export interface TransferLineItem {
  key: string;
  itemId?: string;
  itemName?: string;
  itemSku?: string;
  unit?: string;
  quantity: number;
  availableStock?: number;
}

interface TransferItemsTableProps {
  items: TransferLineItem[];
  onChange: (items: TransferLineItem[]) => void;
  sourceWarehouseId?: string;
  readOnly?: boolean;
}

export function TransferItemsTable({
  items,
  onChange,
  sourceWarehouseId,
  readOnly = false,
}: TransferItemsTableProps) {
  const { data: stockLevels } = useStockLevels({ warehouseId: sourceWarehouseId });

  const getStockForItem = useCallback(
    (itemId?: string) => {
      if (!itemId || !stockLevels) return 0;
      const stock = stockLevels.find((s) => s.itemId === itemId);
      return stock?.availableStock || 0;
    },
    [stockLevels]
  );

  const handleAddItem = () => {
    const newItem: TransferLineItem = {
      key: `item-${Date.now()}`,
      quantity: 1,
    };
    onChange([...items, newItem]);
  };

  const handleRemoveItem = (key: string) => {
    onChange(items.filter((item) => item.key !== key));
  };

  const handleItemChange = (key: string, field: keyof TransferLineItem, value: unknown) => {
    onChange(
      items.map((item) => {
        if (item.key !== key) return item;
        return { ...item, [field]: value };
      })
    );
  };

  const handleItemSelect = (key: string, itemId: string, item?: Item) => {
    const availableStock = getStockForItem(itemId);
    onChange(
      items.map((lineItem) => {
        if (lineItem.key !== key) return lineItem;
        return {
          ...lineItem,
          itemId,
          itemName: item?.name,
          itemSku: item?.sku,
          unit: item?.unit,
          availableStock,
        };
      })
    );
  };

  const columns: ColumnsType<TransferLineItem> = [
    {
      title: 'Item',
      dataIndex: 'itemId',
      key: 'item',
      width: readOnly ? 250 : 280,
      render: (_: unknown, record: TransferLineItem) => {
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
      title: 'Available at Source',
      key: 'availableStock',
      width: 150,
      align: 'right',
      render: (_: unknown, record: TransferLineItem) => {
        const stock = record.availableStock ?? getStockForItem(record.itemId);
        return (
          <Text type="secondary">
            {stock} {record.unit || ''}
          </Text>
        );
      },
    },
    {
      title: 'Transfer Qty',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 140,
      render: (_: unknown, record: TransferLineItem) => {
        if (readOnly) {
          return (
            <Text strong>
              {record.quantity} {record.unit || ''}
            </Text>
          );
        }
        const maxQty = record.availableStock ?? getStockForItem(record.itemId);
        return (
          <InputNumber
            min={0.01}
            max={maxQty}
            step={1}
            value={record.quantity}
            onChange={(value) => handleItemChange(record.key, 'quantity', value || 0)}
            style={{ width: '100%' }}
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
      render: (_: unknown, record: TransferLineItem) => (
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
        scroll={{ x: 600 }}
      />
      {!readOnly && (
        <Button
          type="dashed"
          onClick={handleAddItem}
          style={{ width: '100%', marginTop: 16 }}
          icon={<PlusOutlined />}
          disabled={!sourceWarehouseId}
        >
          {sourceWarehouseId ? 'Add Item' : 'Select source warehouse first'}
        </Button>
      )}
    </div>
  );
}
