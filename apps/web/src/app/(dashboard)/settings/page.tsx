'use client';

import { Card, Tabs, Typography, Form, Input, Select, Button, Divider, Space, message } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

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

export default function SettingsPage() {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const { data: organization, isLoading } = useQuery({
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

  const onFinish = (values: Record<string, unknown>) => {
    updateMutation.mutate(values);
  };

  const items = [
    {
      key: 'organization',
      label: 'Organization',
      children: (
        <Form
          form={form}
          layout="vertical"
          initialValues={organization}
          onFinish={onFinish}
          style={{ maxWidth: 600 }}
        >
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
      ),
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
      key: 'taxes',
      label: 'Taxes',
      children: (
        <div>
          <Title level={5}>Tax Configuration</Title>
          <Text type="secondary">Configure tax rates and settings. Coming soon.</Text>
        </div>
      ),
    },
    {
      key: 'templates',
      label: 'Templates',
      children: (
        <div>
          <Title level={5}>Document Templates</Title>
          <Text type="secondary">Customize invoice and document templates. Coming soon.</Text>
        </div>
      ),
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
