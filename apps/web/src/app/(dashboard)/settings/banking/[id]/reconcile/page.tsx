'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Typography,
  Statistic,
  Row,
  Col,
  Spin,
  Alert,
  Divider,
} from 'antd';
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  BankOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  useBankAccount,
  useReconciliationSummary,
  useReconcileTransactions,
} from '@/hooks/use-banking';
import type { BankTransaction, TransactionType } from '@/lib/banking';

const { Title, Text } = Typography;

const TYPE_COLORS: Record<string, string> = {
  DEPOSIT: 'green',
  WITHDRAWAL: 'red',
  TRANSFER: 'blue',
  FEE: 'orange',
  INTEREST: 'cyan',
};

export default function ReconcilePage() {
  const params = useParams();
  const router = useRouter();
  const accountId = params.id as string;

  const { data: account, isLoading: accountLoading } = useBankAccount(accountId);
  const { data: summary, isLoading: summaryLoading } = useReconciliationSummary(accountId);
  const reconcileMutation = useReconcileTransactions();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const isLoading = accountLoading || summaryLoading;

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!account || !summary) {
    return (
      <Alert
        message="Bank Account Not Found"
        description="The requested bank account could not be found."
        type="error"
        showIcon
      />
    );
  }

  const handleReconcile = async () => {
    if (selectedIds.length === 0) return;
    await reconcileMutation.mutateAsync({ transactionIds: selectedIds });
    setSelectedIds([]);
  };

  const handleSelectAll = () => {
    const allIds = summary.unreconciledTransactions.map((t) => t.id);
    setSelectedIds(allIds);
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  // Calculate selected totals
  const selectedTransactions = summary.unreconciledTransactions.filter((t) =>
    selectedIds.includes(t.id),
  );
  let selectedDeposits = 0;
  let selectedWithdrawals = 0;
  for (const txn of selectedTransactions) {
    const amount = Number(txn.amount);
    if (txn.type === 'DEPOSIT' || txn.type === 'INTEREST') {
      selectedDeposits += amount;
    } else {
      selectedWithdrawals += amount;
    }
  }
  const selectedNet = selectedDeposits - selectedWithdrawals;

  const columns = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      width: 120,
      render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
      sorter: (a: BankTransaction, b: BankTransaction) =>
        new Date(a.date).getTime() - new Date(b.date).getTime(),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 110,
      render: (type: string) => <Tag color={TYPE_COLORS[type] || 'default'}>{type}</Tag>,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (desc: string | null) => desc || '-',
    },
    {
      title: 'Reference',
      dataIndex: 'reference',
      key: 'reference',
      width: 150,
      ellipsis: true,
      render: (ref: string | null) => ref || '-',
    },
    {
      title: 'Amount (MYR)',
      dataIndex: 'amount',
      key: 'amount',
      width: 140,
      align: 'right' as const,
      render: (amount: number, record: BankTransaction) => {
        const isCredit = record.type === 'DEPOSIT' || record.type === 'INTEREST';
        return (
          <Text strong style={{ color: isCredit ? '#52c41a' : '#ff4d4f' }}>
            {isCredit ? '+' : '-'}
            {Number(amount).toLocaleString('en-MY', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>
        );
      },
    },
  ];

  const rowSelection = {
    selectedRowKeys: selectedIds,
    onChange: (selectedRowKeys: React.Key[]) => {
      setSelectedIds(selectedRowKeys as string[]);
    },
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => router.push(`/settings/banking/${accountId}`)}
        />
        <div>
          <Title level={4} style={{ margin: 0 }}>
            <CheckCircleOutlined style={{ marginRight: 8, color: '#52c41a' }} />
            Bank Reconciliation
          </Title>
          <Text type="secondary">
            {account.bankName} - {account.accountNumber}
          </Text>
        </div>
      </div>

      {/* Summary Stats */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Current Balance"
              value={summary.currentBalance}
              precision={2}
              prefix="RM"
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Reconciled Balance"
              value={summary.reconciledBalance}
              precision={2}
              prefix="RM"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Unreconciled Items"
              value={summary.unreconciledCount}
              valueStyle={{
                color: summary.unreconciledCount > 0 ? '#faad14' : '#52c41a',
              }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Unreconciled Net"
              value={summary.unreconciledNet}
              precision={2}
              prefix="RM"
              valueStyle={{
                color: summary.unreconciledNet >= 0 ? '#52c41a' : '#ff4d4f',
              }}
            />
          </Card>
        </Col>
      </Row>

      {/* Unreconciled breakdown */}
      {summary.unreconciledCount > 0 && (
        <Card style={{ marginBottom: 24 }}>
          <Row gutter={32}>
            <Col>
              <Text type="secondary">Unreconciled Deposits:</Text>{' '}
              <Text strong style={{ color: '#52c41a' }}>
                RM {summary.unreconciledDeposits.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
              </Text>
            </Col>
            <Col>
              <Text type="secondary">Unreconciled Withdrawals:</Text>{' '}
              <Text strong style={{ color: '#ff4d4f' }}>
                RM {summary.unreconciledWithdrawals.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
              </Text>
            </Col>
            <Col>
              <Text type="secondary">Difference:</Text>{' '}
              <Text strong>
                RM {Math.abs(summary.currentBalance - summary.reconciledBalance).toLocaleString('en-MY', { minimumFractionDigits: 2 })}
              </Text>
            </Col>
          </Row>
        </Card>
      )}

      {/* Unreconciled Transactions */}
      <Card
        title={`Unreconciled Transactions (${summary.unreconciledCount})`}
        extra={
          <Space>
            {selectedIds.length > 0 && (
              <Text type="secondary">
                Selected: {selectedIds.length} | Net: RM{' '}
                {selectedNet.toLocaleString('en-MY', {
                  minimumFractionDigits: 2,
                })}
              </Text>
            )}
            <Button size="small" onClick={handleSelectAll}>
              Select All
            </Button>
            <Button
              size="small"
              onClick={handleClearSelection}
              disabled={selectedIds.length === 0}
            >
              Clear
            </Button>
            <Button
              type="primary"
              icon={<CheckOutlined />}
              onClick={handleReconcile}
              disabled={selectedIds.length === 0}
              loading={reconcileMutation.isPending}
            >
              Reconcile Selected ({selectedIds.length})
            </Button>
          </Space>
        }
      >
        {summary.unreconciledCount === 0 ? (
          <Alert
            message="All Caught Up"
            description="All transactions for this account have been reconciled."
            type="success"
            showIcon
          />
        ) : (
          <Table
            rowSelection={rowSelection}
            columns={columns}
            dataSource={summary.unreconciledTransactions}
            rowKey="id"
            size="small"
            pagination={{
              pageSize: 50,
              showTotal: (total) => `${total} unreconciled transactions`,
            }}
          />
        )}
      </Card>
    </div>
  );
}
