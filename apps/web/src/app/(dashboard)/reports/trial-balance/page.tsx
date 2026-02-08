'use client';

import { useState } from 'react';
import {
  Card,
  Table,
  DatePicker,
  Typography,
  Tag,
  Alert,
  Space,
} from 'antd';
import {
  CheckCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useTrialBalance } from '@/hooks/use-accounting';
import type { TrialBalanceRow, AccountType } from '@/lib/accounting';

const { Title, Text } = Typography;

const ACCOUNT_TYPE_COLORS: Record<AccountType, string> = {
  ASSET: 'blue',
  LIABILITY: 'orange',
  EQUITY: 'purple',
  REVENUE: 'green',
  EXPENSE: 'red',
};

function formatCurrency(value: number): string {
  return value.toLocaleString('en-MY', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function TrialBalancePage() {
  const [asOfDate, setAsOfDate] = useState<dayjs.Dayjs | null>(dayjs());

  const { data, isLoading } = useTrialBalance(
    asOfDate ? asOfDate.toISOString() : undefined,
  );

  const columns = [
    {
      title: 'Account Code',
      dataIndex: 'accountCode',
      key: 'accountCode',
      width: 140,
      sorter: (a: TrialBalanceRow, b: TrialBalanceRow) =>
        a.accountCode.localeCompare(b.accountCode),
    },
    {
      title: 'Account Name',
      dataIndex: 'accountName',
      key: 'accountName',
    },
    {
      title: 'Type',
      dataIndex: 'accountType',
      key: 'accountType',
      width: 120,
      render: (type: AccountType) => (
        <Tag color={ACCOUNT_TYPE_COLORS[type]}>{type}</Tag>
      ),
      filters: Object.entries(ACCOUNT_TYPE_COLORS).map(([key]) => ({
        text: key,
        value: key,
      })),
      onFilter: (value: any, record: TrialBalanceRow) =>
        record.accountType === value,
    },
    {
      title: 'Debit (MYR)',
      dataIndex: 'totalDebit',
      key: 'totalDebit',
      width: 160,
      align: 'right' as const,
      render: (val: number) => (
        <Text type={val > 0 ? undefined : 'secondary'}>
          {val > 0 ? formatCurrency(val) : '-'}
        </Text>
      ),
    },
    {
      title: 'Credit (MYR)',
      dataIndex: 'totalCredit',
      key: 'totalCredit',
      width: 160,
      align: 'right' as const,
      render: (val: number) => (
        <Text type={val > 0 ? undefined : 'secondary'}>
          {val > 0 ? formatCurrency(val) : '-'}
        </Text>
      ),
    },
  ];

  const totals = data?.totals;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>
          Trial Balance
        </Title>
        <Space>
          <Text type="secondary">As of:</Text>
          <DatePicker
            value={asOfDate}
            onChange={setAsOfDate}
            format="DD/MM/YYYY"
            allowClear={false}
          />
        </Space>
      </div>

      {totals && (
        <Alert
          message={
            totals.isBalanced ? (
              <Space>
                <CheckCircleOutlined />
                <span>Trial balance is balanced</span>
              </Space>
            ) : (
              <Space>
                <WarningOutlined />
                <span>
                  Trial balance is NOT balanced. Difference:{' '}
                  {formatCurrency(Math.abs(totals.totalDebit - totals.totalCredit))}
                </span>
              </Space>
            )
          }
          type={totals.isBalanced ? 'success' : 'error'}
          showIcon={false}
          style={{ marginBottom: 16 }}
        />
      )}

      <Card>
        <Table
          columns={columns}
          dataSource={data?.accounts || []}
          rowKey="accountId"
          loading={isLoading}
          size="small"
          pagination={false}
          summary={() => {
            if (!totals) return null;
            return (
              <Table.Summary.Row
                style={{ backgroundColor: '#fafafa', fontWeight: 'bold' }}
              >
                <Table.Summary.Cell index={0} colSpan={3}>
                  <Text strong>Total</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1} align="right">
                  <Text strong>{formatCurrency(totals.totalDebit)}</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} align="right">
                  <Text strong>{formatCurrency(totals.totalCredit)}</Text>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            );
          }}
        />
      </Card>
    </div>
  );
}
