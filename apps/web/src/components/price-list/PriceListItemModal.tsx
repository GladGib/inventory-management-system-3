'use client';

import { useState } from 'react';
import { Modal, Table, Input, InputNumber, Button, Space, Typography, message } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAddPriceListItems } from '@/hooks/use-price-lists';

const { Text } = Typography;

interface ItemRow {
  id: string;
  sku: string;
  name: string;
  sellingPrice: number;
  costPrice: number;
  unit: string;
}

interface SelectedItem {
  itemId: string;
  customPrice: number;
  minQuantity: number;
}

interface PriceListItemModalProps {
  priceListId: string;
  open: boolean;
  onClose: () => void;
}

export function PriceListItemModal({ priceListId, open, onClose }: PriceListItemModalProps) {
  const [search, setSearch] = useState('');
  const [selectedItems, setSelectedItems] = useState<Map<string, SelectedItem>>(new Map());
  const addItemsMutation = useAddPriceListItems();

  const { data: itemsData, isLoading } = useQuery({
    queryKey: ['items', 'search', search],
    queryFn: async () => {
      const response = await api.get('/items', {
        params: { search: search || undefined, limit: 50, status: 'ACTIVE' },
      });
      return response.data;
    },
    enabled: open,
  });

  const items: ItemRow[] = (itemsData?.data || []).map((item: Record<string, unknown>) => ({
    id: item.id as string,
    sku: item.sku as string,
    name: item.name as string,
    sellingPrice: Number(item.sellingPrice),
    costPrice: Number(item.costPrice),
    unit: item.unit as string,
  }));

  const updateSelectedPrice = (itemId: string, price: number) => {
    const newSelected = new Map(selectedItems);
    const current = newSelected.get(itemId);
    if (current) {
      newSelected.set(itemId, { ...current, customPrice: price });
      setSelectedItems(newSelected);
    }
  };

  const updateSelectedQty = (itemId: string, qty: number) => {
    const newSelected = new Map(selectedItems);
    const current = newSelected.get(itemId);
    if (current) {
      newSelected.set(itemId, { ...current, minQuantity: qty });
      setSelectedItems(newSelected);
    }
  };

  const handleAdd = async () => {
    if (selectedItems.size === 0) {
      message.warning('Please select at least one item');
      return;
    }

    const itemsToAdd = Array.from(selectedItems.values());

    try {
      await addItemsMutation.mutateAsync({
        priceListId,
        items: itemsToAdd,
      });
      setSelectedItems(new Map());
      setSearch('');
      onClose();
    } catch {
      // Error handled by mutation
    }
  };

  const handleCancel = () => {
    setSelectedItems(new Map());
    setSearch('');
    onClose();
  };

  const columns: ColumnsType<ItemRow> = [
    {
      title: 'Item',
      key: 'item',
      render: (_, record) => (
        <div>
          <Text strong>{record.name}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.sku}
          </Text>
        </div>
      ),
    },
    {
      title: 'Standard Price',
      key: 'sellingPrice',
      width: 130,
      render: (_, record) => `RM ${record.sellingPrice.toFixed(2)}`,
    },
    {
      title: 'Custom Price',
      key: 'customPrice',
      width: 160,
      render: (_, record) => {
        const selected = selectedItems.get(record.id);
        if (!selected) return '-';
        return (
          <InputNumber
            size="small"
            value={selected.customPrice}
            onChange={(v) => updateSelectedPrice(record.id, v || 0)}
            min={0}
            step={0.01}
            addonBefore="RM"
            style={{ width: 140 }}
          />
        );
      },
    },
    {
      title: 'Min Qty',
      key: 'minQty',
      width: 100,
      render: (_, record) => {
        const selected = selectedItems.get(record.id);
        if (!selected) return '-';
        return (
          <InputNumber
            size="small"
            value={selected.minQuantity}
            onChange={(v) => updateSelectedQty(record.id, v || 1)}
            min={1}
            style={{ width: 80 }}
          />
        );
      },
    },
  ];

  return (
    <Modal
      title="Add Items to Price List"
      open={open}
      onCancel={handleCancel}
      width={800}
      footer={
        <Space>
          <Button onClick={handleCancel}>Cancel</Button>
          <Button
            type="primary"
            onClick={handleAdd}
            loading={addItemsMutation.isPending}
            disabled={selectedItems.size === 0}
          >
            Add {selectedItems.size} Item{selectedItems.size !== 1 ? 's' : ''}
          </Button>
        </Space>
      }
    >
      <Input
        placeholder="Search items by name or SKU..."
        prefix={<SearchOutlined />}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: 16 }}
        allowClear
      />

      <Table
        columns={columns}
        dataSource={items}
        rowKey="id"
        loading={isLoading}
        size="small"
        pagination={{ pageSize: 10 }}
        rowSelection={{
          selectedRowKeys: Array.from(selectedItems.keys()),
          onChange: (_, selectedRows) => {
            const newSelected = new Map<string, SelectedItem>();
            selectedRows.forEach((row) => {
              const existing = selectedItems.get(row.id);
              newSelected.set(
                row.id,
                existing || {
                  itemId: row.id,
                  customPrice: row.sellingPrice,
                  minQuantity: 1,
                }
              );
            });
            setSelectedItems(newSelected);
          },
        }}
      />
    </Modal>
  );
}
