'use client';

import { useCallback } from 'react';
import { Table, InputNumber, Typography, Button } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { Bill } from '@/lib/purchases';

const { Text } = Typography;

export interface BillAllocation {
  billId: string;
  billNumber: string;
  billDate: string;
  dueDate: string;
  total: number;
  balance: number;
  amount: number;
}

interface BillAllocationTableProps {
  bills: Bill[];
  allocations: BillAllocation[];
  onChange: (allocations: BillAllocation[]) => void;
  maxAmount: number;
  readOnly?: boolean;
}

export function BillAllocationTable({
  bills,
  allocations,
  onChange,
  maxAmount,
  readOnly = false,
}: BillAllocationTableProps) {
  const handleAmountChange = useCallback(
    (billId: string, amount: number) => {
      onChange(
        allocations.map((alloc) => (alloc.billId === billId ? { ...alloc, amount } : alloc))
      );
    },
    [allocations, onChange]
  );

  const handleAutoAllocate = useCallback(() => {
    let remainingAmount = maxAmount;
    const newAllocations = allocations.map((alloc) => {
      if (remainingAmount <= 0) {
        return { ...alloc, amount: 0 };
      }
      const allocAmount = Math.min(alloc.balance, remainingAmount);
      remainingAmount -= allocAmount;
      return { ...alloc, amount: allocAmount };
    });
    onChange(newAllocations);
  }, [allocations, maxAmount, onChange]);

  const totalAllocated = allocations.reduce((sum, a) => sum + (a.amount || 0), 0);

  const columns: ColumnsType<BillAllocation> = [
    {
      title: 'Bill #',
      dataIndex: 'billNumber',
      key: 'billNumber',
      width: 130,
      render: (num) => <Text strong>{num}</Text>,
    },
    {
      title: 'Bill Date',
      dataIndex: 'billDate',
      key: 'billDate',
      width: 110,
      render: (date) => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Due Date',
      dataIndex: 'dueDate',
      key: 'dueDate',
      width: 110,
      render: (date) => {
        const isOverdue = dayjs(date).isBefore(dayjs(), 'day');
        return (
          <Text type={isOverdue ? 'danger' : undefined}>{dayjs(date).format('DD/MM/YYYY')}</Text>
        );
      },
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      width: 120,
      align: 'right',
      render: (total) => `RM ${Number(total).toFixed(2)}`,
    },
    {
      title: 'Balance',
      dataIndex: 'balance',
      key: 'balance',
      width: 120,
      align: 'right',
      render: (balance) => (
        <Text type={balance > 0 ? 'danger' : 'success'}>RM {Number(balance).toFixed(2)}</Text>
      ),
    },
    {
      title: 'Payment',
      dataIndex: 'amount',
      key: 'amount',
      width: 140,
      render: (amount, record) => {
        if (readOnly) {
          return <Text strong>RM {Number(amount || 0).toFixed(2)}</Text>;
        }
        return (
          <InputNumber
            min={0}
            max={record.balance}
            precision={2}
            value={amount || 0}
            onChange={(value) => handleAmountChange(record.billId, value || 0)}
            style={{ width: '100%' }}
            prefix="RM"
          />
        );
      },
    },
  ];

  return (
    <div>
      {!readOnly && (
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
          <Button onClick={handleAutoAllocate}>Auto-Allocate (Oldest First)</Button>
          <Text>
            Allocated: <Text strong>RM {totalAllocated.toFixed(2)}</Text> / RM{' '}
            {maxAmount.toFixed(2)}
          </Text>
        </div>
      )}
      <Table
        columns={columns}
        dataSource={allocations}
        rowKey="billId"
        pagination={false}
        size="small"
      />
    </div>
  );
}

// Helper to convert bills to allocations
export function billsToAllocations(bills: Bill[]): BillAllocation[] {
  return bills
    .filter((bill) => bill.balance > 0)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .map((bill) => ({
      billId: bill.id,
      billNumber: bill.billNumber,
      billDate: bill.billDate,
      dueDate: bill.dueDate,
      total: bill.total,
      balance: bill.balance,
      amount: 0,
    }));
}
