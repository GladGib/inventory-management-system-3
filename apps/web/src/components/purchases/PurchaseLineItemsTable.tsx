'use client';

import { useCallback } from 'react';
import { Table, Button, InputNumber, Space, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { PurchaseItemSelect } from './PurchaseItemSelect';
import { Item } from '@/lib/items';

const { Text } = Typography;

export interface PurchaseLineItem {
  key: string;
  itemId?: string;
  itemName?: string;
  itemSku?: string;
  unit?: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  taxRateId?: string;
  taxRate?: number;
  amount: number;
  taxAmount: number;
}

interface PurchaseLineItemsTableProps {
  items: PurchaseLineItem[];
  onChange: (items: PurchaseLineItem[]) => void;
  readOnly?: boolean;
}

export function PurchaseLineItemsTable({
  items,
  onChange,
  readOnly = false,
}: PurchaseLineItemsTableProps) {
  const calculateLineAmount = useCallback(
    (quantity: number, unitPrice: number, discountPercent: number, taxRate: number) => {
      const subtotal = quantity * unitPrice;
      const discount = subtotal * (discountPercent / 100);
      const taxableAmount = subtotal - discount;
      const taxAmount = taxableAmount * (taxRate / 100);
      return {
        amount: taxableAmount,
        taxAmount,
      };
    },
    []
  );

  const handleAddItem = () => {
    const newItem: PurchaseLineItem = {
      key: `item-${Date.now()}`,
      quantity: 1,
      unitPrice: 0,
      discountPercent: 0,
      taxRate: 0,
      amount: 0,
      taxAmount: 0,
    };
    onChange([...items, newItem]);
  };

  const handleRemoveItem = (key: string) => {
    onChange(items.filter((item) => item.key !== key));
  };

  const handleItemChange = (key: string, field: keyof PurchaseLineItem, value: unknown) => {
    onChange(
      items.map((item) => {
        if (item.key !== key) return item;

        const updatedItem = { ...item, [field]: value };

        // Recalculate amounts
        const { amount, taxAmount } = calculateLineAmount(
          updatedItem.quantity,
          updatedItem.unitPrice,
          updatedItem.discountPercent,
          updatedItem.taxRate || 0
        );

        return {
          ...updatedItem,
          amount,
          taxAmount,
        };
      })
    );
  };

  const handleItemSelect = (key: string, itemId: string, item?: Item) => {
    onChange(
      items.map((lineItem) => {
        if (lineItem.key !== key) return lineItem;

        // Use costPrice for purchases instead of sellingPrice
        const unitPrice = item?.costPrice || 0;
        const { amount, taxAmount } = calculateLineAmount(
          lineItem.quantity,
          unitPrice,
          lineItem.discountPercent,
          item?.taxRate?.rate || 0
        );

        return {
          ...lineItem,
          itemId,
          itemName: item?.name,
          itemSku: item?.sku,
          unit: item?.unit,
          unitPrice,
          taxRateId: item?.taxRateId,
          taxRate: item?.taxRate?.rate || 0,
          amount,
          taxAmount,
        };
      })
    );
  };

  const columns: ColumnsType<PurchaseLineItem> = [
    {
      title: 'Item',
      dataIndex: 'itemId',
      key: 'item',
      width: readOnly ? 250 : 280,
      render: (_: unknown, record: PurchaseLineItem) => {
        if (readOnly) {
          return (
            <Space direction="vertical" size={0}>
              <Text strong>{record.itemSku}</Text>
              <Text>{record.itemName}</Text>
            </Space>
          );
        }
        return (
          <PurchaseItemSelect
            value={record.itemId}
            onChange={(id, item) => handleItemSelect(record.key, id, item)}
            style={{ width: '100%' }}
          />
        );
      },
    },
    {
      title: 'Qty',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100,
      render: (_: unknown, record: PurchaseLineItem) => {
        if (readOnly) {
          return `${record.quantity} ${record.unit || ''}`;
        }
        return (
          <InputNumber
            min={0.01}
            step={1}
            value={record.quantity}
            onChange={(value) => handleItemChange(record.key, 'quantity', value || 0)}
            style={{ width: '100%' }}
          />
        );
      },
    },
    {
      title: 'Unit Price',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      width: 120,
      render: (_: unknown, record: PurchaseLineItem) => {
        if (readOnly) {
          return `RM ${Number(record.unitPrice).toFixed(2)}`;
        }
        return (
          <InputNumber
            min={0}
            precision={2}
            value={record.unitPrice}
            onChange={(value) => handleItemChange(record.key, 'unitPrice', value || 0)}
            style={{ width: '100%' }}
            prefix="RM"
          />
        );
      },
    },
    {
      title: 'Disc %',
      dataIndex: 'discountPercent',
      key: 'discountPercent',
      width: 90,
      render: (_: unknown, record: PurchaseLineItem) => {
        if (readOnly) {
          return record.discountPercent > 0 ? `${record.discountPercent}%` : '-';
        }
        return (
          <InputNumber
            min={0}
            max={100}
            precision={2}
            value={record.discountPercent}
            onChange={(value) => handleItemChange(record.key, 'discountPercent', value || 0)}
            style={{ width: '100%' }}
            suffix="%"
          />
        );
      },
    },
    {
      title: 'Tax',
      dataIndex: 'taxAmount',
      key: 'taxAmount',
      width: 100,
      align: 'right' as const,
      render: (_: unknown, record: PurchaseLineItem) => (
        <Text type="secondary">RM {Number(record.taxAmount).toFixed(2)}</Text>
      ),
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      align: 'right' as const,
      render: (_: unknown, record: PurchaseLineItem) => (
        <Text strong>RM {Number(record.amount).toFixed(2)}</Text>
      ),
    },
  ];

  if (!readOnly) {
    columns.push({
      title: '',
      dataIndex: 'actions',
      key: 'actions',
      width: 50,
      align: 'center' as const,
      render: (_: unknown, record: PurchaseLineItem) => (
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
        >
          Add Item
        </Button>
      )}
    </div>
  );
}

// Helper function to calculate totals from line items
export function calculatePurchaseOrderTotals(
  items: PurchaseLineItem[],
  discountAmount?: number,
  shippingCharges?: number
) {
  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const lineTaxAmount = items.reduce((sum, item) => sum + item.taxAmount, 0);
  const discount = discountAmount || 0;
  const shipping = shippingCharges || 0;
  const total = subtotal - discount + shipping + lineTaxAmount;

  return {
    subtotal,
    discount,
    shipping,
    taxAmount: lineTaxAmount,
    total,
  };
}
