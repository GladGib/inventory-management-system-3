'use client';

import { useState } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Typography,
  Tag,
  Modal,
  Form,
  Input,
  InputNumber,
  Switch,
  Tooltip,
  Dropdown,
  Empty,
  Breadcrumb,
} from 'antd';
import type { MenuProps, TableColumnsType } from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  MoreOutlined,
  StarOutlined,
  StarFilled,
  HomeOutlined,
  ExclamationCircleOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import {
  usePaymentTerms,
  useCreatePaymentTerm,
  useUpdatePaymentTerm,
  useDeletePaymentTerm,
  useSetDefaultPaymentTerm,
  useSeedDefaultPaymentTerms,
} from '@/hooks/use-payment-terms';
import type { PaymentTerm } from '@/lib/payment-terms';

const { Title, Text } = Typography;
const { confirm } = Modal;

export default function PaymentTermsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTerm, setEditingTerm] = useState<PaymentTerm | null>(null);
  const [form] = Form.useForm();

  const { data: paymentTerms = [], isLoading } = usePaymentTerms();
  const createMutation = useCreatePaymentTerm();
  const updateMutation = useUpdatePaymentTerm();
  const deleteMutation = useDeletePaymentTerm();
  const setDefaultMutation = useSetDefaultPaymentTerm();
  const seedMutation = useSeedDefaultPaymentTerms();

  const handleAdd = () => {
    setEditingTerm(null);
    form.resetFields();
    form.setFieldsValue({ isActive: true, isDefault: false });
    setIsModalOpen(true);
  };

  const handleEdit = (record: PaymentTerm) => {
    setEditingTerm(record);
    form.setFieldsValue(record);
    setIsModalOpen(true);
  };

  const handleDelete = (record: PaymentTerm) => {
    confirm({
      title: 'Delete Payment Term',
      icon: <ExclamationCircleOutlined />,
      content: `Are you sure you want to delete "${record.name}"? This action cannot be undone.`,
      okText: 'Delete',
      okType: 'danger',
      onOk: () => deleteMutation.mutate(record.id),
    });
  };

  const handleSetDefault = (record: PaymentTerm) => {
    if (!record.isDefault) {
      setDefaultMutation.mutate(record.id);
    }
  };

  const handleSeedDefaults = () => {
    confirm({
      title: 'Create Default Payment Terms',
      icon: <ThunderboltOutlined />,
      content:
        'This will create standard payment terms (COD, Net 7, Net 15, Net 30, Net 60, Net 90). Continue?',
      onOk: () => seedMutation.mutate(),
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      if (editingTerm) {
        await updateMutation.mutateAsync({ id: editingTerm.id, data: values });
      } else {
        await createMutation.mutateAsync(values);
      }

      setIsModalOpen(false);
      form.resetFields();
      setEditingTerm(null);
    } catch {
      // Validation failed
    }
  };

  const getActionMenuItems = (record: PaymentTerm): MenuProps['items'] => [
    {
      key: 'edit',
      icon: <EditOutlined />,
      label: 'Edit',
      onClick: () => handleEdit(record),
    },
    {
      key: 'setDefault',
      icon: record.isDefault ? <StarFilled /> : <StarOutlined />,
      label: record.isDefault ? 'Default' : 'Set as Default',
      disabled: record.isDefault,
      onClick: () => handleSetDefault(record),
    },
    { type: 'divider' },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: 'Delete',
      danger: true,
      disabled: (record.usageCount ?? 0) > 0,
      onClick: () => handleDelete(record),
    },
  ];

  const columns: TableColumnsType<PaymentTerm> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: PaymentTerm) => (
        <Space>
          <Text strong>{name}</Text>
          {record.isDefault && (
            <Tag color="gold">
              <StarFilled style={{ marginRight: 4 }} />
              Default
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Days',
      dataIndex: 'days',
      key: 'days',
      width: 100,
      align: 'center',
      render: (days: number) => <Tag color={days === 0 ? 'green' : 'blue'}>{days} days</Tag>,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (desc: string) => desc || '-',
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      align: 'center',
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'default'}>{isActive ? 'Active' : 'Inactive'}</Tag>
      ),
    },
    {
      title: 'Used By',
      dataIndex: 'usageCount',
      key: 'usageCount',
      width: 100,
      align: 'center',
      render: (count: number) => (
        <Tooltip title="Number of contacts using this term">
          <Text type="secondary">{count || 0} contacts</Text>
        </Tooltip>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 50,
      align: 'center',
      render: (_: unknown, record: PaymentTerm) => (
        <Dropdown menu={{ items: getActionMenuItems(record) }} trigger={['click']}>
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
      ),
    },
  ];

  return (
    <div>
      <Breadcrumb
        style={{ marginBottom: 24 }}
        items={[
          {
            title: (
              <Link href="/">
                <HomeOutlined />
              </Link>
            ),
          },
          {
            title: <Link href="/settings">Settings</Link>,
          },
          {
            title: 'Payment Terms',
          },
        ]}
      />

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <Title level={4} style={{ margin: 0 }}>
          Payment Terms
        </Title>
        <Space>
          {paymentTerms.length === 0 && (
            <Button
              icon={<ThunderboltOutlined />}
              onClick={handleSeedDefaults}
              loading={seedMutation.isPending}
            >
              Create Defaults
            </Button>
          )}
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            Add Payment Term
          </Button>
        </Space>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={paymentTerms}
          rowKey="id"
          loading={isLoading}
          pagination={false}
          locale={{
            emptyText: (
              <Empty description="No payment terms configured" image={Empty.PRESENTED_IMAGE_SIMPLE}>
                <Space>
                  <Button type="primary" onClick={handleAdd}>
                    Add Payment Term
                  </Button>
                  <Button onClick={handleSeedDefaults}>Create Defaults</Button>
                </Space>
              </Empty>
            ),
          }}
        />
      </Card>

      <Modal
        title={editingTerm ? 'Edit Payment Term' : 'Add Payment Term'}
        open={isModalOpen}
        onOk={handleSubmit}
        onCancel={() => {
          setIsModalOpen(false);
          setEditingTerm(null);
          form.resetFields();
        }}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
      >
        <Form form={form} layout="vertical" initialValues={{ isActive: true, isDefault: false }}>
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: 'Please enter a name' }]}
          >
            <Input placeholder="e.g., Net 30, COD, 2/10 Net 30" />
          </Form.Item>

          <Form.Item
            name="days"
            label="Days Until Due"
            rules={[{ required: true, message: 'Please enter number of days' }]}
            extra="Enter 0 for Cash on Delivery (COD)"
          >
            <InputNumber min={0} max={365} style={{ width: '100%' }} placeholder="30" />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} placeholder="Payment due within 30 days of invoice date" />
          </Form.Item>

          <Space size="large">
            <Form.Item name="isActive" valuePropName="checked" noStyle>
              <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
            </Form.Item>

            <Form.Item name="isDefault" valuePropName="checked" noStyle>
              <Switch checkedChildren="Default" unCheckedChildren="Not Default" />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </div>
  );
}
