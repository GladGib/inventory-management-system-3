'use client';

import { useState, useMemo } from 'react';
import dayjs from 'dayjs';
import { Card, Table, InputNumber, Switch, Space, Typography, Tag, Alert } from 'antd';
import type { TableColumnsType } from 'antd';
import { useItemBatches } from '@/hooks/use-batches';
import type { Batch, AllocationMethod } from '@/lib/batch';
import { BatchStatusTag } from './BatchStatusTag';

const { Text } = Typography;

export interface BatchSelection {
  batchId: string;
  batchNumber: string;
  quantity: number;
  expiryDate: string | null;
}

interface BatchSelectorProps {
  itemId: string;
  warehouseId: string;
  requiredQuantity: number;
  onChange: (selections: BatchSelection[]) => void;
  value?: BatchSelection[];
}

export function BatchSelector({
  itemId,
  warehouseId,
  requiredQuantity,
  onChange,
  value = [],
}: BatchSelectorProps) {
  const [method, setMethod] = useState<AllocationMethod>('FEFO');

  const { data, isLoading } = useItemBatches(itemId, {
    warehouseId,
    status: 'ACTIVE',
    limit: 100,
  });

  const batches = data?.data || [];

  const sortedBatches = useMemo(() => {
    const sorted = [...batches].filter((b) => b.quantity > 0);
    if (method === 'FEFO') {
      sorted.sort((a, b) => {
        if (!a.expiryDate && !b.expiryDate) return 0;
        if (!a.expiryDate) return 1;
        if (!b.expiryDate) return -1;
        return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
      });
    } else {
      sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }
    return sorted;
  }, [batches, method]);

  const totalSelected = value.reduce((sum, s) => sum + s.quantity, 0);
  const remaining = requiredQuantity - totalSelected;

  const handleQuantityChange = (batchId: string, qty: number | null) => {
    const batch = batches.find((b) => b.id === batchId);
    if (!batch) return;

    const newVal = qty || 0;
    const existing = value.filter((v) => v.batchId !== batchId);

    if (newVal > 0) {
      existing.push({
        batchId,
        batchNumber: batch.batchNumber,
        quantity: Math.min(newVal, batch.quantity),
        expiryDate: batch.expiryDate,
      });
    }

    onChange(existing);
  };

  const getSelectedQty = (batchId: string) => {
    return value.find((v) => v.batchId === batchId)?.quantity || 0;
  };

  const columns: TableColumnsType<Batch> = [
    {
      title: 'Batch #',
      dataIndex: 'batchNumber',
      key: 'batchNumber',
      width: 150,
      render: (num: string) => <Text strong>{num}</Text>,
    },
    {
      title: 'Available Qty',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 120,
      align: 'right',
      render: (qty: number) => qty.toLocaleString(),
    },
    {
      title: 'Expiry Date',
      dataIndex: 'expiryDate',
      key: 'expiryDate',
      width: 130,
      render: (date: string | null) => {
        if (!date) return '-';
        const d = dayjs(date);
        const daysLeft = d.diff(dayjs(), 'day');
        let color = 'green';
        if (daysLeft <= 0) color = 'red';
        else if (daysLeft <= 7) color = 'red';
        else if (daysLeft <= 30) color = 'orange';
        return <Tag color={color}>{d.format('DD/MM/YYYY')}</Tag>;
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: Batch['status']) => <BatchStatusTag status={status} />,
    },
    {
      title: 'Allocate Qty',
      key: 'allocate',
      width: 140,
      render: (_, record) => (
        <InputNumber
          min={0}
          max={record.quantity}
          value={getSelectedQty(record.id)}
          onChange={(val) => handleQuantityChange(record.id, val)}
          size="small"
          style={{ width: '100%' }}
        />
      ),
    },
  ];

  return (
    <Card
      title="Batch Selection"
      size="small"
      extra={
        <Space>
          <Text type="secondary">Method:</Text>
          <Switch
            checkedChildren="FEFO"
            unCheckedChildren="FIFO"
            checked={method === 'FEFO'}
            onChange={(checked) => setMethod(checked ? 'FEFO' : 'FIFO')}
          />
        </Space>
      }
    >
      {remaining > 0 && totalSelected > 0 && (
        <Alert
          message={`${remaining} more unit${remaining === 1 ? '' : 's'} needed`}
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
        />
      )}
      {remaining <= 0 && totalSelected > 0 && (
        <Alert
          message={`All ${requiredQuantity} units allocated`}
          type="success"
          showIcon
          style={{ marginBottom: 12 }}
        />
      )}

      <Table
        columns={columns}
        dataSource={sortedBatches}
        rowKey="id"
        loading={isLoading}
        pagination={false}
        size="small"
        scroll={{ y: 300 }}
      />

      <div style={{ marginTop: 8, textAlign: 'right' }}>
        <Text type="secondary">
          Selected: <Text strong>{totalSelected}</Text> / {requiredQuantity}
        </Text>
      </div>
    </Card>
  );
}
