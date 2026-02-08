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
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Upload,
  Descriptions,
  Spin,
  Alert,
  Tabs,
} from 'antd';
import {
  ArrowLeftOutlined,
  PlusOutlined,
  UploadOutlined,
  BankOutlined,
  EditOutlined,
  CheckCircleOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  useBankAccount,
  useBankTransactions,
  useRecordTransaction,
  useUpdateBankAccount,
  useImportBankStatement,
} from '@/hooks/use-banking';
import type {
  BankTransaction,
  CreateTransactionDto,
  TransactionType,
  UpdateBankAccountDto,
} from '@/lib/banking';

const { Title, Text } = Typography;

const TRANSACTION_TYPE_OPTIONS: { value: TransactionType; label: string; color: string }[] = [
  { value: 'DEPOSIT', label: 'Deposit', color: 'green' },
  { value: 'WITHDRAWAL', label: 'Withdrawal', color: 'red' },
  { value: 'TRANSFER', label: 'Transfer', color: 'blue' },
  { value: 'FEE', label: 'Bank Fee', color: 'orange' },
  { value: 'INTEREST', label: 'Interest', color: 'cyan' },
];

function getTypeColor(type: string): string {
  return TRANSACTION_TYPE_OPTIONS.find((o) => o.value === type)?.color || 'default';
}

export default function BankAccountDetailPage() {
  const params = useParams();
  const router = useRouter();
  const accountId = params.id as string;

  const { data: account, isLoading: accountLoading } = useBankAccount(accountId);
  const [txnPage, setTxnPage] = useState(1);
  const [txnFilters, setTxnFilters] = useState<{
    dateFrom?: string;
    dateTo?: string;
    type?: TransactionType;
  }>({});
  const { data: transactionsData, isLoading: txnLoading } = useBankTransactions(accountId, {
    ...txnFilters,
    page: txnPage,
    limit: 25,
  });

  const recordTransaction = useRecordTransaction();
  const updateAccount = useUpdateBankAccount();
  const importStatement = useImportBankStatement();

  const [txnModalOpen, setTxnModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [txnForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [importFormat, setImportFormat] = useState<'CSV' | 'OFX'>('CSV');
  const [importContent, setImportContent] = useState('');

  if (accountLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!account) {
    return (
      <Alert
        message="Bank Account Not Found"
        description="The requested bank account could not be found."
        type="error"
        showIcon
      />
    );
  }

  const handleRecordTransaction = async () => {
    try {
      const values = await txnForm.validateFields();
      const dto: CreateTransactionDto = {
        type: values.type,
        amount: values.amount,
        date: values.date.format('YYYY-MM-DD'),
        description: values.description,
        reference: values.reference,
      };
      await recordTransaction.mutateAsync({ accountId, data: dto });
      setTxnModalOpen(false);
      txnForm.resetFields();
    } catch {
      // Validation errors handled by form
    }
  };

  const handleUpdateAccount = async () => {
    try {
      const values = await editForm.validateFields();
      const dto: UpdateBankAccountDto = {};
      if (values.accountName) dto.accountName = values.accountName;
      if (values.accountType) dto.accountType = values.accountType;
      if (values.swiftCode !== undefined) dto.swiftCode = values.swiftCode;

      await updateAccount.mutateAsync({ id: accountId, data: dto });
      setEditModalOpen(false);
    } catch {
      // Validation errors handled by form
    }
  };

  const handleImport = async () => {
    if (!importContent.trim()) {
      return;
    }
    await importStatement.mutateAsync({
      accountId,
      data: { format: importFormat, content: importContent },
    });
    setImportModalOpen(false);
    setImportContent('');
  };

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setImportContent(content);
      // Auto-detect format from file extension
      if (file.name.toLowerCase().endsWith('.ofx') || file.name.toLowerCase().endsWith('.qfx')) {
        setImportFormat('OFX');
      } else {
        setImportFormat('CSV');
      }
    };
    reader.readAsText(file);
    return false; // Prevent default upload
  };

  const openEditModal = () => {
    editForm.setFieldsValue({
      accountName: account.accountName,
      accountType: account.accountType,
      swiftCode: account.swiftCode || '',
    });
    setEditModalOpen(true);
  };

  const transactionColumns = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      width: 120,
      render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 110,
      render: (type: string) => <Tag color={getTypeColor(type)}>{type}</Tag>,
      filters: TRANSACTION_TYPE_OPTIONS.map((o) => ({ text: o.label, value: o.value })),
      onFilter: (value: unknown, record: BankTransaction) => record.type === value,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
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
    {
      title: 'Reconciled',
      dataIndex: 'reconciled',
      key: 'reconciled',
      width: 100,
      align: 'center' as const,
      render: (reconciled: boolean) =>
        reconciled ? (
          <Tag icon={<CheckCircleOutlined />} color="success">
            Yes
          </Tag>
        ) : (
          <Tag color="default">No</Tag>
        ),
    },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push('/settings/banking')}
          />
          <div>
            <Title level={4} style={{ margin: 0 }}>
              <BankOutlined style={{ marginRight: 8 }} />
              {account.bankName}
            </Title>
            <Text type="secondary">{account.accountNumber}</Text>
          </div>
        </div>
        <Space>
          <Button icon={<EditOutlined />} onClick={openEditModal}>
            Edit
          </Button>
          <Button
            icon={<CheckCircleOutlined />}
            onClick={() => router.push(`/settings/banking/${accountId}/reconcile`)}
          >
            Reconcile
          </Button>
        </Space>
      </div>

      {/* Account Info */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="Current Balance"
              value={Number(account.currentBalance)}
              precision={2}
              prefix="RM"
              valueStyle={{
                color: Number(account.currentBalance) >= 0 ? '#3f8600' : '#cf1322',
              }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Opening Balance"
              value={Number(account.openingBalance)}
              precision={2}
              prefix="RM"
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Total Transactions"
              value={account._count?.transactions || 0}
            />
          </Card>
        </Col>
      </Row>

      {/* Account Details */}
      <Card style={{ marginBottom: 24 }}>
        <Descriptions bordered size="small" column={2}>
          <Descriptions.Item label="Account Name">{account.accountName}</Descriptions.Item>
          <Descriptions.Item label="Account Type">
            <Tag color={account.accountType === 'CURRENT' ? 'blue' : 'green'}>
              {account.accountType}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Bank Code">{account.bankCode}</Descriptions.Item>
          <Descriptions.Item label="SWIFT Code">{account.swiftCode || '-'}</Descriptions.Item>
          <Descriptions.Item label="Default">
            {account.isDefault ? <Tag color="gold">Default</Tag> : 'No'}
          </Descriptions.Item>
          <Descriptions.Item label="Status">
            <Tag color={account.isActive ? 'green' : 'default'}>
              {account.isActive ? 'Active' : 'Inactive'}
            </Tag>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Transactions */}
      <Card
        title="Transactions"
        extra={
          <Space>
            <Button
              icon={<UploadOutlined />}
              onClick={() => setImportModalOpen(true)}
            >
              Import Statement
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                txnForm.resetFields();
                txnForm.setFieldsValue({ date: dayjs() });
                setTxnModalOpen(true);
              }}
            >
              Record Transaction
            </Button>
          </Space>
        }
      >
        <Table
          columns={transactionColumns}
          dataSource={transactionsData?.data || []}
          rowKey="id"
          loading={txnLoading}
          size="small"
          pagination={{
            current: txnPage,
            pageSize: 25,
            total: transactionsData?.meta?.total || 0,
            showTotal: (total) => `${total} transactions`,
            onChange: (page) => setTxnPage(page),
          }}
        />
      </Card>

      {/* Record Transaction Modal */}
      <Modal
        title="Record Transaction"
        open={txnModalOpen}
        onOk={handleRecordTransaction}
        onCancel={() => {
          setTxnModalOpen(false);
          txnForm.resetFields();
        }}
        confirmLoading={recordTransaction.isPending}
        width={500}
      >
        <Form form={txnForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="type"
            label="Transaction Type"
            rules={[{ required: true, message: 'Transaction type is required' }]}
          >
            <Select
              placeholder="Select type"
              options={TRANSACTION_TYPE_OPTIONS.map((o) => ({
                value: o.value,
                label: o.label,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="amount"
            label="Amount (MYR)"
            rules={[
              { required: true, message: 'Amount is required' },
              { type: 'number', min: 0.01, message: 'Amount must be positive' },
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              prefix="RM"
              precision={2}
              min={0.01}
              placeholder="0.00"
            />
          </Form.Item>

          <Form.Item
            name="date"
            label="Date"
            rules={[{ required: true, message: 'Date is required' }]}
          >
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <Input.TextArea
              placeholder="e.g. Customer payment - INV-001"
              rows={2}
              maxLength={500}
            />
          </Form.Item>

          <Form.Item name="reference" label="Reference">
            <Input placeholder="e.g. REF-20260208-001" maxLength={100} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Account Modal */}
      <Modal
        title="Edit Bank Account"
        open={editModalOpen}
        onOk={handleUpdateAccount}
        onCancel={() => setEditModalOpen(false)}
        confirmLoading={updateAccount.isPending}
        width={500}
      >
        <Form form={editForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="accountName"
            label="Account Holder Name"
            rules={[{ required: true, message: 'Account name is required' }]}
          >
            <Input maxLength={200} />
          </Form.Item>

          <Form.Item name="accountType" label="Account Type">
            <Select
              options={[
                { value: 'CURRENT', label: 'Current Account' },
                { value: 'SAVINGS', label: 'Savings Account' },
              ]}
            />
          </Form.Item>

          <Form.Item name="swiftCode" label="SWIFT Code">
            <Input maxLength={20} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Import Statement Modal */}
      <Modal
        title="Import Bank Statement"
        open={importModalOpen}
        onOk={handleImport}
        onCancel={() => {
          setImportModalOpen(false);
          setImportContent('');
        }}
        confirmLoading={importStatement.isPending}
        okText="Import"
        okButtonProps={{ disabled: !importContent.trim() }}
        width={600}
      >
        <div style={{ marginTop: 16 }}>
          <Alert
            message="Supported Formats"
            description={
              <div>
                <div><strong>CSV:</strong> Expected columns: Date, Description, Reference, Debit, Credit</div>
                <div><strong>OFX/QFX:</strong> Standard Open Financial Exchange format</div>
                <div style={{ marginTop: 8 }}>
                  <Text type="secondary">
                    Date formats supported: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD
                  </Text>
                </div>
              </div>
            }
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />

          <Form.Item label="File Format" style={{ marginBottom: 16 }}>
            <Select
              value={importFormat}
              onChange={setImportFormat}
              options={[
                { value: 'CSV', label: 'CSV (Comma-Separated Values)' },
                { value: 'OFX', label: 'OFX / QFX (Open Financial Exchange)' },
              ]}
            />
          </Form.Item>

          <Form.Item label="Upload Statement File" style={{ marginBottom: 16 }}>
            <Upload
              accept=".csv,.ofx,.qfx"
              beforeUpload={handleFileUpload}
              maxCount={1}
              showUploadList={true}
            >
              <Button icon={<UploadOutlined />}>Select File</Button>
            </Upload>
          </Form.Item>

          {importContent && (
            <Alert
              message={`File loaded (${importContent.length.toLocaleString()} characters)`}
              type="success"
              showIcon
            />
          )}
        </div>
      </Modal>
    </div>
  );
}
