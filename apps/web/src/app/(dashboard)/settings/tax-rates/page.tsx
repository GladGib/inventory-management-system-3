'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Typography,
  Dropdown,
  Modal,
  Alert,
  Empty,
  type MenuProps,
  type TableColumnsType,
} from 'antd';
import {
  PlusOutlined,
  ArrowLeftOutlined,
  MoreOutlined,
  EditOutlined,
  DeleteOutlined,
  StarOutlined,
  ExclamationCircleOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import {
  useTaxRates,
  useDeleteTaxRate,
  useSetDefaultTaxRate,
  useInitializeTaxRates,
} from '@/hooks/use-tax-rates';
import { TaxRateForm } from '@/components/tax/TaxRateForm';
import {
  TaxRate,
  TaxRegime,
  TAX_TYPE_LABELS,
  TAX_TYPE_COLORS,
  TAX_REGIME_LABELS,
  TAX_REGIME_COLORS,
  TaxType,
} from '@/lib/tax-rates';

const { Title, Text } = Typography;
const { confirm } = Modal;

export default function TaxRatesPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [selectedTaxRate, setSelectedTaxRate] = useState<TaxRate | null>(null);

  const { data, isLoading, refetch } = useTaxRates({ limit: 100 });
  const deleteTaxRate = useDeleteTaxRate();
  const setDefaultTaxRate = useSetDefaultTaxRate();
  const initializeTaxRates = useInitializeTaxRates();

  const taxRates = data?.data || [];

  const handleEdit = (record: TaxRate) => {
    setSelectedTaxRate(record);
    setFormOpen(true);
  };

  const handleCreate = () => {
    setSelectedTaxRate(null);
    setFormOpen(true);
  };

  const handleDelete = (record: TaxRate) => {
    confirm({
      title: 'Delete Tax Rate',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p>
            Are you sure you want to delete <strong>{record.name}</strong>?
          </p>
          {record.itemCount && record.itemCount > 0 && (
            <Alert
              type="warning"
              message={`This tax rate is used by ${record.itemCount} item(s). You must reassign them first.`}
              style={{ marginTop: 12 }}
            />
          )}
        </div>
      ),
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => deleteTaxRate.mutate(record.id),
    });
  };

  const handleSetDefault = (record: TaxRate) => {
    setDefaultTaxRate.mutate(record.id);
  };

  const handleInitialize = () => {
    confirm({
      title: 'Initialize Default Tax Rates',
      icon: <ThunderboltOutlined />,
      content: (
        <div>
          <p>This will create the default Malaysian SST tax rates:</p>
          <ul style={{ marginTop: 8, paddingLeft: 20 }}>
            <li>Sales Tax 10% (ST10)</li>
            <li>Service Tax 6% (ST6)</li>
            <li>Zero Rated (ZR)</li>
            <li>Tax Exempt (EX)</li>
            <li>Out of Scope (OS)</li>
          </ul>
        </div>
      ),
      okText: 'Initialize',
      cancelText: 'Cancel',
      onOk: () => initializeTaxRates.mutate(),
    });
  };

  const getActionMenuItems = (record: TaxRate): MenuProps['items'] => [
    {
      key: 'edit',
      icon: <EditOutlined />,
      label: 'Edit',
      onClick: () => handleEdit(record),
    },
    {
      key: 'setDefault',
      icon: <StarOutlined />,
      label: 'Set as Default',
      disabled: record.isDefault,
      onClick: () => handleSetDefault(record),
    },
    { type: 'divider' },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: 'Delete',
      danger: true,
      onClick: () => handleDelete(record),
    },
  ];

  const columns: TableColumnsType<TaxRate> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: TaxRate) => (
        <Space>
          <span style={{ fontWeight: 500 }}>{name}</span>
          {record.isDefault && <Tag color="gold">Default</Tag>}
        </Space>
      ),
    },
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      width: 100,
      render: (code: string) => <Tag style={{ fontFamily: 'monospace' }}>{code}</Tag>,
    },
    {
      title: 'Rate',
      dataIndex: 'rate',
      key: 'rate',
      width: 100,
      align: 'right',
      render: (rate: number) => `${rate}%`,
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type: TaxType) => <Tag color={TAX_TYPE_COLORS[type]}>{TAX_TYPE_LABELS[type]}</Tag>,
    },
    {
      title: 'Regime',
      dataIndex: 'taxRegime',
      key: 'taxRegime',
      width: 160,
      render: (regime: TaxRegime | null) =>
        regime ? (
          <Tag color={TAX_REGIME_COLORS[regime]}>{TAX_REGIME_LABELS[regime]}</Tag>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: 'Effective Period',
      key: 'effectivePeriod',
      width: 180,
      render: (_: unknown, record: TaxRate) => {
        const from = record.effectiveFrom
          ? new Date(record.effectiveFrom).toLocaleDateString('en-MY', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })
          : null;
        const to = record.effectiveTo
          ? new Date(record.effectiveTo).toLocaleDateString('en-MY', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })
          : null;
        if (!from && !to) return <Text type="secondary">No restriction</Text>;
        return (
          <Text style={{ fontSize: 12 }}>
            {from || 'Start'} - {to || 'Ongoing'}
          </Text>
        );
      },
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'default'}>{isActive ? 'Active' : 'Inactive'}</Tag>
      ),
    },
    {
      title: 'Items',
      dataIndex: 'itemCount',
      key: 'itemCount',
      width: 80,
      align: 'center',
      render: (count: number) => count || 0,
    },
    {
      title: '',
      key: 'actions',
      width: 50,
      align: 'center',
      render: (_: unknown, record: TaxRate) => (
        <Dropdown menu={{ items: getActionMenuItems(record) }} trigger={['click']}>
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
      ),
    },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Space style={{ marginBottom: 8 }}>
          <Link href="/settings">
            <Button type="text" icon={<ArrowLeftOutlined />}>
              Settings
            </Button>
          </Link>
        </Space>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={4} style={{ margin: 0 }}>
              Tax Rates
            </Title>
            <Text type="secondary">Configure SST/GST tax rates for your organization</Text>
          </div>
          <Space>
            {taxRates.length === 0 && (
              <Button
                icon={<ThunderboltOutlined />}
                onClick={handleInitialize}
                loading={initializeTaxRates.isPending}
              >
                Initialize Defaults
              </Button>
            )}
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              Add Tax Rate
            </Button>
          </Space>
        </div>
      </div>

      <Card>
        {taxRates.length === 0 && !isLoading ? (
          <Empty
            description={
              <Space direction="vertical" size={4}>
                <Text>No tax rates configured</Text>
                <Text type="secondary">
                  Click &quot;Initialize Defaults&quot; to create standard Malaysian SST rates
                </Text>
              </Space>
            }
          >
            <Space>
              <Button
                type="primary"
                icon={<ThunderboltOutlined />}
                onClick={handleInitialize}
                loading={initializeTaxRates.isPending}
              >
                Initialize Default Rates
              </Button>
              <Button icon={<PlusOutlined />} onClick={handleCreate}>
                Add Custom Rate
              </Button>
            </Space>
          </Empty>
        ) : (
          <Table
            columns={columns}
            dataSource={taxRates}
            rowKey="id"
            loading={isLoading}
            pagination={false}
          />
        )}
      </Card>

      {/* Tax Rate Form Modal */}
      <TaxRateForm
        open={formOpen}
        taxRate={selectedTaxRate}
        onClose={() => {
          setFormOpen(false);
          setSelectedTaxRate(null);
        }}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
