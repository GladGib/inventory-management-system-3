'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import {
  Card,
  Tabs,
  Typography,
  Form,
  Input,
  Select,
  Button,
  Divider,
  Space,
  Switch,
  DatePicker,
  InputNumber,
  Radio,
  message,
  Alert,
} from 'antd';
import { SaveOutlined, RightOutlined, SettingOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { api } from '@/lib/api';
import { useTaxSettings, useUpdateTaxSettings, useActiveTaxRates } from '@/hooks/use-tax-rates';
import { TaxRateSelect } from '@/components/tax';
import { ROUNDING_METHOD_LABELS } from '@/lib/tax-rates';

const { Title, Text } = Typography;

const industries = [
  { value: 'AUTO_PARTS', label: 'Auto Parts' },
  { value: 'HARDWARE', label: 'Hardware' },
  { value: 'SPARE_PARTS', label: 'Spare Parts' },
  { value: 'GENERAL', label: 'General' },
];

const currencies = [
  { value: 'MYR', label: 'Malaysian Ringgit (MYR)' },
  { value: 'SGD', label: 'Singapore Dollar (SGD)' },
  { value: 'USD', label: 'US Dollar (USD)' },
];

const timezones = [
  { value: 'Asia/Kuala_Lumpur', label: 'Asia/Kuala_Lumpur (GMT+8)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (GMT+8)' },
];

const roundingMethodOptions = Object.entries(ROUNDING_METHOD_LABELS).map(([value, label]) => ({
  value,
  label,
}));

function OrganizationTab() {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const { data: organization } = useQuery({
    queryKey: ['organization'],
    queryFn: async () => {
      const response = await api.get('/organizations/current');
      return response.data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const response = await api.put('/organizations/current', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization'] });
      message.success('Settings saved successfully');
    },
    onError: () => {
      message.error('Failed to save settings');
    },
  });

  useEffect(() => {
    if (organization) {
      form.setFieldsValue(organization);
    }
  }, [organization, form]);

  const onFinish = (values: Record<string, unknown>) => {
    updateMutation.mutate(values);
  };

  return (
    <Form form={form} layout="vertical" onFinish={onFinish} style={{ maxWidth: 600 }}>
      <Title level={5}>Basic Information</Title>

      <Form.Item
        name="name"
        label="Organization Name"
        rules={[{ required: true, message: 'Please enter organization name' }]}
      >
        <Input />
      </Form.Item>

      <Form.Item name="industry" label="Industry">
        <Select options={industries} />
      </Form.Item>

      <Divider />
      <Title level={5}>Regional Settings</Title>

      <Form.Item name="baseCurrency" label="Base Currency">
        <Select options={currencies} />
      </Form.Item>

      <Form.Item name="timezone" label="Timezone">
        <Select options={timezones} />
      </Form.Item>

      <Divider />
      <Title level={5}>Tax Information</Title>

      <Form.Item name="businessRegNo" label="SSM Registration Number">
        <Input placeholder="e.g., 123456-A" />
      </Form.Item>

      <Form.Item name="sstNumber" label="SST Registration Number">
        <Input placeholder="e.g., B10-1234-56789012" />
      </Form.Item>

      <Form.Item name="tin" label="Tax Identification Number (TIN)">
        <Input placeholder="e.g., C1234567890" />
      </Form.Item>

      <Divider />
      <Title level={5}>Contact Information</Title>

      <Form.Item name="email" label="Email">
        <Input type="email" />
      </Form.Item>

      <Form.Item name="phone" label="Phone">
        <Input placeholder="+60312345678" />
      </Form.Item>

      <Form.Item name="website" label="Website">
        <Input placeholder="https://example.com" />
      </Form.Item>

      <Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          icon={<SaveOutlined />}
          loading={updateMutation.isPending}
        >
          Save Changes
        </Button>
      </Form.Item>
    </Form>
  );
}

function TaxSettingsTab() {
  const [form] = Form.useForm();
  const { data: taxSettings } = useTaxSettings();
  const { data: taxRatesData } = useActiveTaxRates();
  const updateTaxSettings = useUpdateTaxSettings();

  const taxRates = taxRatesData?.data || [];
  const hasNoTaxRates = taxRates.length === 0;

  useEffect(() => {
    if (taxSettings) {
      form.setFieldsValue({
        ...taxSettings,
        sstRegisteredDate: taxSettings.sstRegisteredDate
          ? dayjs(taxSettings.sstRegisteredDate)
          : null,
      });
    }
  }, [taxSettings, form]);

  const onFinish = (values: Record<string, unknown>) => {
    const data = {
      ...values,
      sstRegisteredDate: values.sstRegisteredDate
        ? (values.sstRegisteredDate as dayjs.Dayjs).toISOString()
        : undefined,
    };
    updateTaxSettings.mutate(data);
  };

  const isSstRegistered = Form.useWatch('isSstRegistered', form);

  return (
    <div style={{ maxWidth: 600 }}>
      {hasNoTaxRates && (
        <Alert
          type="warning"
          message="No Tax Rates Configured"
          description={
            <Space direction="vertical" size={4}>
              <Text>You need to configure tax rates before setting up SST settings.</Text>
              <Link href="/settings/tax-rates">
                <Button type="link" style={{ padding: 0 }}>
                  Go to Tax Rates <RightOutlined />
                </Button>
              </Link>
            </Space>
          }
          style={{ marginBottom: 24 }}
        />
      )}

      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Title level={5}>SST Registration</Title>

        <Form.Item name="isSstRegistered" label="SST Registered" valuePropName="checked">
          <Switch checkedChildren="Yes" unCheckedChildren="No" />
        </Form.Item>

        {isSstRegistered && (
          <>
            <Form.Item
              name="sstRegistrationNo"
              label="SST Registration Number"
              rules={[
                {
                  pattern: /^[A-Z]\d{2}-\d{4}-\d{8}$/,
                  message: 'Please enter a valid SST number (e.g., W10-1234-56789012)',
                },
              ]}
            >
              <Input placeholder="e.g., W10-1234-56789012" />
            </Form.Item>

            <Form.Item name="sstRegisteredDate" label="Registration Date">
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item name="sstThreshold" label="Annual Threshold (RM)">
              <InputNumber style={{ width: '100%' }} min={0} placeholder="500000" />
            </Form.Item>
          </>
        )}

        <Divider />
        <Title level={5}>Default Tax Rates</Title>

        <Form.Item
          name="defaultSalesTaxId"
          label="Default Sales Tax"
          extra="Applied to new sales invoices"
        >
          <TaxRateSelect filterType="sales" disabled={hasNoTaxRates} />
        </Form.Item>

        <Form.Item
          name="defaultPurchaseTaxId"
          label="Default Purchase Tax"
          extra="Applied to new purchase bills"
        >
          <TaxRateSelect filterType="purchase" disabled={hasNoTaxRates} />
        </Form.Item>

        <Divider />
        <Title level={5}>Tax Calculation Settings</Title>

        <Form.Item
          name="taxInclusive"
          label="Default Pricing Mode"
          extra="How prices are displayed by default"
        >
          <Radio.Group>
            <Space direction="vertical">
              <Radio value={false}>Tax Exclusive (add tax to price)</Radio>
              <Radio value={true}>Tax Inclusive (tax included in price)</Radio>
            </Space>
          </Radio.Group>
        </Form.Item>

        <Form.Item
          name="roundingMethod"
          label="Rounding Method"
          extra="How to round calculated tax amounts"
        >
          <Select options={roundingMethodOptions} />
        </Form.Item>

        <Divider />

        <Form.Item>
          <Space>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={updateTaxSettings.isPending}
            >
              Save Tax Settings
            </Button>
            <Link href="/settings/tax-rates">
              <Button icon={<SettingOutlined />}>Manage Tax Rates</Button>
            </Link>
          </Space>
        </Form.Item>
      </Form>
    </div>
  );
}

const documentLanguages = [
  { value: 'en', label: 'English' },
  { value: 'ms', label: 'Bahasa Malaysia' },
];

function DocumentSettingsTab() {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ['organization-settings'],
    queryFn: async () => {
      const response = await api.get('/organizations/current/settings');
      return response.data;
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const response = await api.put('/organizations/current/settings', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-settings'] });
      queryClient.invalidateQueries({ queryKey: ['organization'] });
      message.success('Document settings saved successfully');
    },
    onError: () => {
      message.error('Failed to save document settings');
    },
  });

  useEffect(() => {
    if (settings) {
      form.setFieldsValue({
        documentLanguage: settings.documentLanguage || 'en',
      });
    }
  }, [settings, form]);

  const onFinish = (values: Record<string, unknown>) => {
    updateSettingsMutation.mutate(values);
  };

  return (
    <div style={{ maxWidth: 600 }}>
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Title level={5}>Document Settings</Title>
        <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
          Configure default settings for generated PDF documents such as invoices,
          sales orders, purchase orders, and bills.
        </Text>

        <Form.Item
          name="documentLanguage"
          label="Default Document Language"
          extra="This sets the default language for PDF documents. You can also choose a language when downloading individual documents."
        >
          <Select options={documentLanguages} style={{ width: 300 }} />
        </Form.Item>

        <Alert
          type="info"
          message="Bilingual Support"
          description="Documents can be generated in English or Bahasa Malaysia (BM). All labels, headings, and status text will be translated. User-entered content (notes, terms, item names) will remain as entered."
          style={{ marginBottom: 24 }}
        />

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            icon={<SaveOutlined />}
            loading={updateSettingsMutation.isPending}
          >
            Save Document Settings
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}

export default function SettingsPage() {
  const items = [
    {
      key: 'organization',
      label: 'Organization',
      children: <OrganizationTab />,
    },
    {
      key: 'taxes',
      label: 'SST Settings',
      children: <TaxSettingsTab />,
    },
    {
      key: 'users',
      label: 'Users',
      children: (
        <div>
          <Title level={5}>User Management</Title>
          <Text type="secondary">Manage users and their roles. Coming soon.</Text>
        </div>
      ),
    },
    {
      key: 'documents',
      label: 'Documents',
      children: <DocumentSettingsTab />,
    },
  ];

  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>
        Settings
      </Title>

      <Card>
        <Tabs items={items} tabPosition="left" />
      </Card>
    </div>
  );
}
