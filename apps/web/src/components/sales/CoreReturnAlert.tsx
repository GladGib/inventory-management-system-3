'use client';

import Link from 'next/link';
import dayjs from 'dayjs';
import { Alert, Table, Tag, Typography } from 'antd';
import { WarningOutlined, SyncOutlined } from '@ant-design/icons';
import { useCustomerPendingCoreReturns } from '@/hooks/use-core-returns';
import { CoreReturn } from '@/lib/core-returns';

const { Text } = Typography;

interface CoreReturnAlertProps {
  customerId: string;
}

/**
 * Alert banner showing pending core returns for a customer.
 * Displayed on customer detail pages.
 */
export function CoreReturnAlert({ customerId }: CoreReturnAlertProps) {
  const { data: pendingReturns, isLoading } =
    useCustomerPendingCoreReturns(customerId);

  if (isLoading || !pendingReturns || pendingReturns.length === 0) {
    return null;
  }

  const overdueCount = pendingReturns.filter((r) =>
    dayjs(r.dueDate).isBefore(dayjs()),
  ).length;

  const totalCoreCharge = pendingReturns.reduce(
    (sum, r) => sum + Number(r.coreCharge),
    0,
  );

  const columns = [
    {
      title: 'Return #',
      dataIndex: 'returnNumber',
      key: 'returnNumber',
      width: 110,
      render: (num: string, record: CoreReturn) => (
        <Link href={`/sales/core-returns/${record.id}`}>{num}</Link>
      ),
    },
    {
      title: 'Item',
      dataIndex: ['item', 'name'],
      key: 'item',
      ellipsis: true,
    },
    {
      title: 'Core Charge',
      dataIndex: 'coreCharge',
      key: 'coreCharge',
      width: 110,
      align: 'right' as const,
      render: (charge: number) => `RM ${Number(charge).toFixed(2)}`,
    },
    {
      title: 'Due Date',
      dataIndex: 'dueDate',
      key: 'dueDate',
      width: 120,
      render: (date: string) => {
        const overdue = dayjs(date).isBefore(dayjs());
        return (
          <span style={{ color: overdue ? '#ff4d4f' : undefined }}>
            {dayjs(date).format('DD/MM/YYYY')}
            {overdue && (
              <Tag color="red" style={{ marginLeft: 4, fontSize: 10 }}>
                OVERDUE
              </Tag>
            )}
          </span>
        );
      },
    },
  ];

  return (
    <Alert
      type={overdueCount > 0 ? 'warning' : 'info'}
      icon={overdueCount > 0 ? <WarningOutlined /> : <SyncOutlined />}
      message={
        <span>
          <strong>
            {pendingReturns.length} pending core return
            {pendingReturns.length > 1 ? 's' : ''}
          </strong>
          {' '}
          (Total: RM {totalCoreCharge.toFixed(2)})
          {overdueCount > 0 && (
            <Tag color="red" style={{ marginLeft: 8 }}>
              {overdueCount} overdue
            </Tag>
          )}
        </span>
      }
      description={
        <Table
          columns={columns}
          dataSource={pendingReturns}
          rowKey="id"
          size="small"
          pagination={false}
          style={{ marginTop: 8 }}
        />
      }
      showIcon
      style={{ marginBottom: 16 }}
    />
  );
}
