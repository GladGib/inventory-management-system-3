'use client';

import { useState } from 'react';
import {
  Card,
  Tabs,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  Typography,
  Popconfirm,
  Switch,
  Alert,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';
import {
  useChartOfAccounts,
  useCreateAccount,
  useUpdateAccount,
  useDeleteAccount,
  useSeedDefaultAccounts,
  useAccountMappings,
  useUpdateAccountMappings,
} from '@/hooks/use-accounting';
import type {
  ChartOfAccount,
  AccountType,
  CreateAccountDto,
  UpdateAccountDto,
  AccountMappingItem,
} from '@/lib/accounting';

const { Title } = Typography;
const { TabPane } = Tabs;

const ACCOUNT_TYPE_OPTIONS: { value: AccountType; label: string; color: string }[] = [
  { value: 'ASSET', label: 'Asset', color: 'blue' },
  { value: 'LIABILITY', label: 'Liability', color: 'orange' },
  { value: 'EQUITY', label: 'Equity', color: 'purple' },
  { value: 'REVENUE', label: 'Revenue', color: 'green' },
  { value: 'EXPENSE', label: 'Expense', color: 'red' },
];

const TRANSACTION_TYPES = [
  { key: 'SALES', label: 'Sales Revenue', description: 'Default account for sales/revenue recognition' },
  { key: 'PURCHASE', label: 'Purchases / COGS', description: 'Default account for purchases and cost of goods' },
  { key: 'PAYMENT_RECEIVED', label: 'Cash / Bank (Received)', description: 'Account for cash and bank receipts' },
  { key: 'PAYMENT_MADE', label: 'Accounts Payable', description: 'Account for vendor payables' },
  { key: 'INVENTORY_ADJUSTMENT', label: 'Inventory Adjustment', description: 'Account for inventory value adjustments' },
  { key: 'TAX_OUTPUT', label: 'Tax Payable (Output)', description: 'SST/GST output tax payable' },
  { key: 'TAX_INPUT', label: 'Tax Receivable (Input)', description: 'SST/GST input tax receivable' },
];

function getTypeColor(type: AccountType): string {
  return ACCOUNT_TYPE_OPTIONS.find((o) => o.value === type)?.color || 'default';
}

// ============ Chart of Accounts Tab ============

function ChartOfAccountsTab() {
  const { data: accounts, isLoading } = useChartOfAccounts();
  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();
  const deleteAccount = useDeleteAccount();
  const seedAccounts = useSeedDefaultAccounts();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<ChartOfAccount | null>(null);
  const [form] = Form.useForm();

  const handleCreate = () => {
    setEditingAccount(null);
    form.resetFields();
    setModalOpen(true);
  };

  const handleEdit = (account: ChartOfAccount) => {
    setEditingAccount(account);
    form.setFieldsValue({
      accountCode: account.accountCode,
      name: account.name,
      type: account.type,
      parentId: account.parentId,
      isActive: account.isActive,
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      if (editingAccount) {
        await updateAccount.mutateAsync({
          id: editingAccount.id,
          data: {
            name: values.name,
            type: values.type,
            parentId: values.parentId || null,
            isActive: values.isActive,
          } as UpdateAccountDto,
        });
      } else {
        await createAccount.mutateAsync({
          accountCode: values.accountCode,
          name: values.name,
          type: values.type,
          parentId: values.parentId || undefined,
        } as CreateAccountDto);
      }

      setModalOpen(false);
      form.resetFields();
    } catch {
      // Validation errors handled by form
    }
  };

  const handleSeed = () => {
    seedAccounts.mutate();
  };

  const columns = [
    {
      title: 'Account Code',
      dataIndex: 'accountCode',
      key: 'accountCode',
      width: 140,
      sorter: (a: ChartOfAccount, b: ChartOfAccount) =>
        a.accountCode.localeCompare(b.accountCode),
    },
    {
      title: 'Account Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type: AccountType) => (
        <Tag color={getTypeColor(type)}>{type}</Tag>
      ),
      filters: ACCOUNT_TYPE_OPTIONS.map((o) => ({ text: o.label, value: o.value })),
      onFilter: (value: any, record: ChartOfAccount) => record.type === value,
    },
    {
      title: 'Parent',
      key: 'parent',
      width: 200,
      render: (_: any, record: ChartOfAccount) =>
        record.parent ? `${record.parent.accountCode} - ${record.parent.name}` : '-',
    },
    {
      title: 'System',
      dataIndex: 'isSystem',
      key: 'isSystem',
      width: 80,
      render: (val: boolean) => (val ? <Tag color="blue">Yes</Tag> : '-'),
    },
    {
      title: 'Active',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 80,
      render: (val: boolean) => (
        <Tag color={val ? 'green' : 'default'}>{val ? 'Yes' : 'No'}</Tag>
      ),
    },
    {
      title: 'Entries',
      key: 'entries',
      width: 80,
      render: (_: any, record: ChartOfAccount) => record._count?.journalEntryLines || 0,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_: any, record: ChartOfAccount) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            disabled={record.isSystem}
            size="small"
          />
          <Popconfirm
            title="Delete this account?"
            description="This action cannot be undone."
            onConfirm={() => deleteAccount.mutate(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              disabled={record.isSystem || (record._count?.journalEntryLines || 0) > 0}
              size="small"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const parentOptions = (accounts || [])
    .filter((a) => a.isActive && (!editingAccount || a.id !== editingAccount.id))
    .map((a) => ({
      value: a.id,
      label: `${a.accountCode} - ${a.name}`,
    }));

  return (
    <>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            Add Account
          </Button>
          {(!accounts || accounts.length === 0) && (
            <Button
              icon={<DatabaseOutlined />}
              onClick={handleSeed}
              loading={seedAccounts.isPending}
            >
              Seed Default Accounts
            </Button>
          )}
        </Space>
        <span style={{ color: '#999' }}>
          {accounts?.length || 0} accounts
        </span>
      </div>

      <Table
        columns={columns}
        dataSource={accounts || []}
        rowKey="id"
        loading={isLoading}
        size="small"
        pagination={{ pageSize: 50, showSizeChanger: false }}
      />

      <Modal
        title={editingAccount ? 'Edit Account' : 'Create Account'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => {
          setModalOpen(false);
          form.resetFields();
        }}
        confirmLoading={createAccount.isPending || updateAccount.isPending}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="accountCode"
            label="Account Code"
            rules={[{ required: true, message: 'Account code is required' }]}
          >
            <Input
              placeholder="e.g. 1000"
              maxLength={20}
              disabled={!!editingAccount}
            />
          </Form.Item>

          <Form.Item
            name="name"
            label="Account Name"
            rules={[{ required: true, message: 'Account name is required' }]}
          >
            <Input placeholder="e.g. Cash" maxLength={200} />
          </Form.Item>

          <Form.Item
            name="type"
            label="Account Type"
            rules={[{ required: true, message: 'Account type is required' }]}
          >
            <Select
              placeholder="Select type"
              options={ACCOUNT_TYPE_OPTIONS.map((o) => ({
                value: o.value,
                label: o.label,
              }))}
            />
          </Form.Item>

          <Form.Item name="parentId" label="Parent Account">
            <Select
              placeholder="None (top level)"
              allowClear
              options={parentOptions}
              showSearch
              filterOption={(input, option) =>
                (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>

          {editingAccount && (
            <Form.Item name="isActive" label="Active" valuePropName="checked">
              <Switch />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </>
  );
}

// ============ Account Mappings Tab ============

function AccountMappingsTab() {
  const { data: accounts, isLoading: accountsLoading } = useChartOfAccounts();
  const { data: mappings, isLoading: mappingsLoading } = useAccountMappings();
  const updateMappings = useUpdateAccountMappings();
  const [form] = Form.useForm();

  const isLoading = accountsLoading || mappingsLoading;

  // Set form values when data loads
  const initialValues: Record<string, string> = {};
  if (mappings) {
    for (const mapping of mappings) {
      initialValues[mapping.transactionType] = mapping.accountId;
    }
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const mappingItems: AccountMappingItem[] = [];

      for (const txType of TRANSACTION_TYPES) {
        if (values[txType.key]) {
          mappingItems.push({
            transactionType: txType.key,
            accountId: values[txType.key],
          });
        }
      }

      if (mappingItems.length === 0) {
        return;
      }

      await updateMappings.mutateAsync({ mappings: mappingItems });
    } catch {
      // Validation errors handled by form
    }
  };

  const accountOptions = (accounts || [])
    .filter((a) => a.isActive)
    .map((a) => ({
      value: a.id,
      label: `${a.accountCode} - ${a.name} (${a.type})`,
    }));

  if (!accounts || accounts.length === 0) {
    return (
      <Alert
        message="No Chart of Accounts"
        description="Please create a chart of accounts first, or seed the default accounts in the Chart of Accounts tab."
        type="info"
        showIcon
      />
    );
  }

  return (
    <div>
      <Alert
        message="Account Mappings"
        description="Map transaction types to their default accounts. These mappings are used when auto-generating journal entries from invoices, payments, and bills."
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Form
        form={form}
        layout="vertical"
        initialValues={initialValues}
        key={JSON.stringify(initialValues)}
      >
        {TRANSACTION_TYPES.map((txType) => (
          <Form.Item
            key={txType.key}
            name={txType.key}
            label={txType.label}
            extra={txType.description}
          >
            <Select
              placeholder="Select account"
              allowClear
              loading={isLoading}
              options={accountOptions}
              showSearch
              filterOption={(input, option) =>
                (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>
        ))}

        <Form.Item>
          <Button
            type="primary"
            onClick={handleSave}
            loading={updateMappings.isPending}
          >
            Save Mappings
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}

// ============ Main Page ============

export default function AccountingSettingsPage() {
  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>
        Accounting Settings
      </Title>

      <Card>
        <Tabs defaultActiveKey="chart-of-accounts">
          <TabPane tab="Chart of Accounts" key="chart-of-accounts">
            <ChartOfAccountsTab />
          </TabPane>
          <TabPane tab="Account Mappings" key="account-mappings">
            <AccountMappingsTab />
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
}
