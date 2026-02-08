'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
  Switch,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  BankOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  StarOutlined,
  StarFilled,
} from '@ant-design/icons';
import { useBankAccounts, useUpdateBankAccount } from '@/hooks/use-banking';
import type { BankAccount } from '@/lib/banking';

const { Title, Text } = Typography;

export default function BankingSettingsPage() {
  const router = useRouter();
  const { data: accounts, isLoading } = useBankAccounts();
  const updateAccount = useUpdateBankAccount();

  const totalBalance = (accounts || [])
    .filter((a) => a.isActive)
    .reduce((sum, a) => sum + Number(a.currentBalance), 0);

  const activeCount = (accounts || []).filter((a) => a.isActive).length;
  const totalTransactions = (accounts || []).reduce(
    (sum, a) => sum + (a._count?.transactions || 0),
    0,
  );

  const handleToggleDefault = (account: BankAccount) => {
    updateAccount.mutate({
      id: account.id,
      data: { isDefault: !account.isDefault },
    });
  };

  const handleToggleActive = (account: BankAccount, checked: boolean) => {
    updateAccount.mutate({
      id: account.id,
      data: { isActive: checked },
    });
  };

  const columns = [
    {
      title: 'Default',
      dataIndex: 'isDefault',
      key: 'isDefault',
      width: 70,
      render: (isDefault: boolean, record: BankAccount) => (
        <Tooltip title={isDefault ? 'Default account' : 'Set as default'}>
          <Button
            type="text"
            icon={isDefault ? <StarFilled style={{ color: '#faad14' }} /> : <StarOutlined />}
            onClick={() => handleToggleDefault(record)}
            size="small"
          />
        </Tooltip>
      ),
    },
    {
      title: 'Bank',
      key: 'bank',
      render: (_: unknown, record: BankAccount) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.bankName}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.bankCode}
          </Text>
        </div>
      ),
    },
    {
      title: 'Account',
      key: 'account',
      render: (_: unknown, record: BankAccount) => (
        <div>
          <div>{record.accountName}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.accountNumber}
          </Text>
        </div>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'accountType',
      key: 'accountType',
      width: 100,
      render: (type: string) => (
        <Tag color={type === 'CURRENT' ? 'blue' : 'green'}>
          {type}
        </Tag>
      ),
    },
    {
      title: 'Balance (MYR)',
      dataIndex: 'currentBalance',
      key: 'currentBalance',
      width: 150,
      align: 'right' as const,
      render: (balance: number) => (
        <Text strong style={{ color: Number(balance) >= 0 ? '#52c41a' : '#ff4d4f' }}>
          {Number(balance).toLocaleString('en-MY', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </Text>
      ),
    },
    {
      title: 'Transactions',
      key: 'transactions',
      width: 100,
      align: 'center' as const,
      render: (_: unknown, record: BankAccount) => record._count?.transactions || 0,
    },
    {
      title: 'Active',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 80,
      render: (isActive: boolean, record: BankAccount) => (
        <Switch
          checked={isActive}
          size="small"
          onChange={(checked) => handleToggleActive(record, checked)}
        />
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_: unknown, record: BankAccount) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => router.push(`/settings/banking/${record.id}`)}
            size="small"
          >
            View
          </Button>
          <Button
            type="text"
            icon={<CheckCircleOutlined />}
            onClick={() => router.push(`/settings/banking/${record.id}/reconcile`)}
            size="small"
          >
            Reconcile
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={4} style={{ margin: 0 }}>
          <BankOutlined style={{ marginRight: 8 }} />
          Bank Accounts
        </Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => router.push('/settings/banking/new')}
        >
          Add Bank Account
        </Button>
      </div>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="Total Balance (MYR)"
              value={totalBalance}
              precision={2}
              prefix="RM"
              valueStyle={{ color: totalBalance >= 0 ? '#3f8600' : '#cf1322' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Active Accounts"
              value={activeCount}
              suffix={`/ ${(accounts || []).length}`}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Total Transactions"
              value={totalTransactions}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <Table
          columns={columns}
          dataSource={accounts || []}
          rowKey="id"
          loading={isLoading}
          size="middle"
          pagination={{ pageSize: 20, showSizeChanger: false }}
          locale={{ emptyText: 'No bank accounts yet. Add your first bank account to get started.' }}
        />
      </Card>
    </div>
  );
}
