'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Switch,
  Button,
  Space,
  message,
  Breadcrumb,
  Typography,
  Row,
  Col,
  Alert,
  Skeleton,
  Tag,
} from 'antd';
import {
  HomeOutlined,
  SettingOutlined,
  SafetyCertificateOutlined,
  ApiOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SaveOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import {
  useEInvoiceSettings,
  useUpdateEInvoiceSettings,
  useTestEInvoiceConnection,
} from '@/hooks/use-einvoice';
import type { UpdateEInvoiceSettingsPayload } from '@/lib/einvoice';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

export default function EInvoiceSettingsPage() {
  const [form] = Form.useForm();
  const [connectionResult, setConnectionResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const { data: settings, isLoading } = useEInvoiceSettings();
  const updateSettings = useUpdateEInvoiceSettings();
  const testConnection = useTestEInvoiceConnection();

  useEffect(() => {
    if (settings) {
      form.setFieldsValue({
        tin: settings.tin || '',
        brn: settings.brn || '',
        clientId: settings.clientId || '',
        clientSecret: settings.clientSecret || '',
        isProduction: settings.isProduction,
        isEnabled: settings.isEnabled,
        autoSubmit: settings.autoSubmit,
      });
    }
  }, [settings, form]);

  const handleSave = async (values: UpdateEInvoiceSettingsPayload) => {
    try {
      await updateSettings.mutateAsync(values);
      message.success('e-Invoice settings saved successfully');
    } catch (error) {
      message.error('Failed to save e-Invoice settings');
    }
  };

  const handleTestConnection = async () => {
    setConnectionResult(null);
    try {
      const result = await testConnection.mutateAsync();
      setConnectionResult(result);
      if (result.success) {
        message.success('Successfully connected to MyInvois API');
      } else {
        message.error(result.message || 'Connection test failed');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Connection test failed';
      setConnectionResult({ success: false, message: errorMsg });
      message.error(errorMsg);
    }
  };

  const isProduction = Form.useWatch('isProduction', form);

  return (
    <div>
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { href: '/', title: <HomeOutlined /> },
          {
            href: '/settings',
            title: (
              <>
                <SettingOutlined /> <span>Settings</span>
              </>
            ),
          },
          { title: 'e-Invoice (MyInvois)' },
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
          <SafetyCertificateOutlined style={{ marginRight: 8 }} />
          e-Invoice Settings (MyInvois)
        </Title>
        <Link href="/settings/einvoice/dashboard">
          <Button type="link" icon={<LinkOutlined />}>
            Compliance Dashboard
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <Skeleton active paragraph={{ rows: 12 }} />
      ) : (
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
          initialValues={{
            isProduction: false,
            isEnabled: false,
            autoSubmit: false,
          }}
        >
          {/* Tax Identification */}
          <Card title="Tax Identification" style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Tax Identification Number (TIN)"
                  name="tin"
                  extra="Your company TIN issued by LHDN"
                  rules={[{ required: true, message: 'TIN is required for e-Invoice' }]}
                >
                  <Input placeholder="e.g., C1234567890" disabled={updateSettings.isPending} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Business Registration Number (BRN)"
                  name="brn"
                  extra="SSM Registration Number"
                >
                  <Input placeholder="e.g., 202001012345" disabled={updateSettings.isPending} />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          {/* API Credentials */}
          <Card title="MyInvois API Credentials" style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Client ID"
                  name="clientId"
                  rules={[{ required: true, message: 'Client ID is required' }]}
                >
                  <Input
                    placeholder="Your MyInvois Client ID"
                    disabled={updateSettings.isPending}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Client Secret"
                  name="clientSecret"
                  rules={[{ required: true, message: 'Client Secret is required' }]}
                >
                  <Input.Password
                    placeholder="Your MyInvois Client Secret"
                    disabled={updateSettings.isPending}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Alert
              type="info"
              showIcon
              message="Where to get API credentials"
              description="Register your application on the MyInvois Portal (https://myinvois.hasil.gov.my) to obtain your Client ID and Client Secret. Start with sandbox credentials for testing."
              style={{ marginBottom: 16 }}
            />

            <Space wrap>
              <Button
                icon={<ApiOutlined />}
                onClick={handleTestConnection}
                loading={testConnection.isPending}
                disabled={updateSettings.isPending}
              >
                Test Connection
              </Button>

              {connectionResult && (
                <Tag
                  icon={
                    connectionResult.success ? <CheckCircleOutlined /> : <CloseCircleOutlined />
                  }
                  color={connectionResult.success ? 'success' : 'error'}
                >
                  {connectionResult.success ? 'Connected' : 'Failed'}
                </Tag>
              )}

              {settings?.lastConnectionCheck && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Last checked: {dayjs(settings.lastConnectionCheck).format('DD/MM/YYYY HH:mm')}
                  {settings.connectionStatus && ` - ${settings.connectionStatus}`}
                </Text>
              )}
            </Space>

            {connectionResult && !connectionResult.success && (
              <Alert
                type="error"
                message="Connection Failed"
                description={connectionResult.message}
                style={{ marginTop: 12 }}
                showIcon
              />
            )}
          </Card>

          {/* Environment & Automation */}
          <Card title="Environment & Automation" style={{ marginBottom: 16 }}>
            <Row gutter={[16, 16]}>
              <Col xs={24} md={8}>
                <Form.Item name="isProduction" valuePropName="checked" style={{ marginBottom: 0 }}>
                  <Space>
                    <Switch
                      disabled={updateSettings.isPending}
                      checkedChildren="Production"
                      unCheckedChildren="Sandbox"
                    />
                    <Text>
                      {isProduction ? (
                        <Tag color="red">Production</Tag>
                      ) : (
                        <Tag color="blue">Sandbox</Tag>
                      )}
                    </Text>
                  </Space>
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item name="isEnabled" valuePropName="checked" style={{ marginBottom: 0 }}>
                  <Space>
                    <Switch disabled={updateSettings.isPending} />
                    <Text>Enable e-Invoice</Text>
                  </Space>
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item name="autoSubmit" valuePropName="checked" style={{ marginBottom: 0 }}>
                  <Space>
                    <Switch disabled={updateSettings.isPending} />
                    <Text>Auto-submit on invoice creation</Text>
                  </Space>
                </Form.Item>
              </Col>
            </Row>

            {isProduction && (
              <Alert
                type="warning"
                message="Production Mode"
                description="You are using the production MyInvois API. All submissions will be sent to LHDN for actual validation."
                style={{ marginTop: 16 }}
                showIcon
              />
            )}
          </Card>

          {/* Save */}
          <Card>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SaveOutlined />}
                loading={updateSettings.isPending}
              >
                Save Settings
              </Button>
              <Link href="/settings/einvoice/dashboard">
                <Button>View Compliance Dashboard</Button>
              </Link>
            </Space>
          </Card>
        </Form>
      )}
    </div>
  );
}
