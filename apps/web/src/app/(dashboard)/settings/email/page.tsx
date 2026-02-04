'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  InputNumber,
  Switch,
  Button,
  Space,
  message,
  Breadcrumb,
  Typography,
  Row,
  Col,
  Alert,
  Table,
  Tag,
  Modal,
  Tabs,
  Skeleton,
} from 'antd';
import {
  HomeOutlined,
  SettingOutlined,
  MailOutlined,
  SendOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import {
  useEmailSettings,
  useUpdateEmailSettings,
  useTestEmailConnection,
  useSendTestEmail,
  useEmailLogs,
} from '@/hooks/use-email';
import type { EmailSettings, EmailLog } from '@/lib/email';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

function SmtpConfigurationForm({
  loading,
  onTestConnection,
  testingConnection,
}: {
  loading: boolean;
  onTestConnection: () => void;
  testingConnection: boolean;
}) {
  return (
    <Card title="SMTP Configuration" style={{ marginBottom: 16 }}>
      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Form.Item label="SMTP Host" name="smtpHost" rules={[{ required: false }]}>
            <Input placeholder="smtp.gmail.com" disabled={loading} />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item label="SMTP Port" name="smtpPort">
            <InputNumber
              placeholder="587"
              style={{ width: '100%' }}
              min={1}
              max={65535}
              disabled={loading}
            />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Form.Item label="Username" name="smtpUser">
            <Input placeholder="user@example.com" disabled={loading} />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item label="Password" name="smtpPass">
            <Input.Password placeholder="App password" disabled={loading} />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Form.Item label="Use SSL/TLS" name="smtpSecure" valuePropName="checked">
            <Switch disabled={loading} />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item>
            <Button onClick={onTestConnection} loading={testingConnection} disabled={loading}>
              Test Connection
            </Button>
          </Form.Item>
        </Col>
      </Row>
      <Alert
        type="info"
        showIcon
        message="Gmail Users"
        description="If using Gmail, enable 2-factor authentication and create an App Password. Use the App Password in the password field above."
        style={{ marginTop: 8 }}
      />
    </Card>
  );
}

function SenderInfoForm({ loading }: { loading: boolean }) {
  return (
    <Card title="Sender Information" style={{ marginBottom: 16 }}>
      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Form.Item label="From Name" name="fromName">
            <Input placeholder="Your Company Name" disabled={loading} />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            label="From Email"
            name="fromEmail"
            rules={[{ type: 'email', message: 'Please enter a valid email' }]}
          >
            <Input placeholder="invoices@yourcompany.com" disabled={loading} />
          </Form.Item>
        </Col>
      </Row>
      <Form.Item
        label="Reply-To Email"
        name="replyTo"
        rules={[{ type: 'email', message: 'Please enter a valid email' }]}
      >
        <Input placeholder="support@yourcompany.com" disabled={loading} />
      </Form.Item>
      <Form.Item
        label="Email Signature"
        name="signature"
        extra="HTML is supported for rich text signatures"
      >
        <TextArea
          rows={4}
          placeholder="Best regards,&#10;Your Company Name&#10;Phone: +60 12 345 6789"
          disabled={loading}
        />
      </Form.Item>
    </Card>
  );
}

function AutoSendSettings({ loading }: { loading: boolean }) {
  return (
    <Card title="Automatic Email Notifications" style={{ marginBottom: 16 }}>
      <Paragraph type="secondary" style={{ marginBottom: 16 }}>
        Enable these options to automatically send emails when documents are created.
      </Paragraph>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12}>
          <Form.Item name="autoSendInvoice" valuePropName="checked" style={{ marginBottom: 0 }}>
            <Space>
              <Switch disabled={loading} />
              <Text>Auto-send invoice on creation</Text>
            </Space>
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item name="autoSendPayment" valuePropName="checked" style={{ marginBottom: 0 }}>
            <Space>
              <Switch disabled={loading} />
              <Text>Auto-send payment receipt</Text>
            </Space>
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item name="autoSendOrder" valuePropName="checked" style={{ marginBottom: 0 }}>
            <Space>
              <Switch disabled={loading} />
              <Text>Auto-send order confirmation</Text>
            </Space>
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item name="autoSendPO" valuePropName="checked" style={{ marginBottom: 0 }}>
            <Space>
              <Switch disabled={loading} />
              <Text>Auto-send PO to vendor</Text>
            </Space>
          </Form.Item>
        </Col>
      </Row>
    </Card>
  );
}

function EmailLogsTable() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedLog, setSelectedLog] = useState<EmailLog | null>(null);

  const { data, isLoading } = useEmailLogs({ page, limit: pageSize });

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'SENT':
        return (
          <Tag icon={<CheckCircleOutlined />} color="success">
            Sent
          </Tag>
        );
      case 'FAILED':
        return (
          <Tag icon={<CloseCircleOutlined />} color="error">
            Failed
          </Tag>
        );
      case 'PENDING':
        return (
          <Tag icon={<ClockCircleOutlined />} color="processing">
            Pending
          </Tag>
        );
      case 'BOUNCED':
        return (
          <Tag icon={<CloseCircleOutlined />} color="warning">
            Bounced
          </Tag>
        );
      default:
        return <Tag>{status}</Tag>;
    }
  };

  const getTypeTag = (type: string) => {
    const typeColors: Record<string, string> = {
      INVOICE_CREATED: 'blue',
      PAYMENT_RECEIVED: 'green',
      ORDER_CONFIRMED: 'purple',
      PO_ISSUED: 'orange',
      CUSTOM: 'default',
    };
    const typeLabels: Record<string, string> = {
      INVOICE_CREATED: 'Invoice',
      PAYMENT_RECEIVED: 'Payment',
      ORDER_CONFIRMED: 'Order',
      PO_ISSUED: 'PO',
      CUSTOM: 'Custom',
    };
    return <Tag color={typeColors[type] || 'default'}>{typeLabels[type] || type}</Tag>;
  };

  const columns: ColumnsType<EmailLog> = [
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (date) => dayjs(date).format('DD/MM/YYYY HH:mm'),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: getTypeTag,
    },
    {
      title: 'To',
      dataIndex: 'to',
      key: 'to',
      ellipsis: true,
    },
    {
      title: 'Subject',
      dataIndex: 'subject',
      key: 'subject',
      ellipsis: true,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: getStatusTag,
    },
    {
      title: 'Action',
      key: 'action',
      width: 80,
      render: (_, record) => (
        <Button
          type="text"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => setSelectedLog(record)}
        />
      ),
    },
  ];

  return (
    <>
      <Table
        columns={columns}
        dataSource={data?.data}
        rowKey="id"
        loading={isLoading}
        pagination={{
          current: page,
          pageSize: pageSize,
          total: data?.meta.total || 0,
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
          },
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} emails`,
        }}
        size="small"
      />

      <Modal
        title="Email Details"
        open={!!selectedLog}
        onCancel={() => setSelectedLog(null)}
        footer={null}
        width={600}
      >
        {selectedLog && (
          <div>
            <Paragraph>
              <Text strong>To:</Text> {selectedLog.to}
            </Paragraph>
            {selectedLog.cc && (
              <Paragraph>
                <Text strong>CC:</Text> {selectedLog.cc}
              </Paragraph>
            )}
            <Paragraph>
              <Text strong>Subject:</Text> {selectedLog.subject}
            </Paragraph>
            <Paragraph>
              <Text strong>Type:</Text> {getTypeTag(selectedLog.type)}
            </Paragraph>
            <Paragraph>
              <Text strong>Status:</Text> {getStatusTag(selectedLog.status)}
            </Paragraph>
            <Paragraph>
              <Text strong>Sent At:</Text>{' '}
              {selectedLog.sentAt ? dayjs(selectedLog.sentAt).format('DD/MM/YYYY HH:mm:ss') : '-'}
            </Paragraph>
            {selectedLog.error && (
              <Alert type="error" message="Error" description={selectedLog.error} />
            )}
          </div>
        )}
      </Modal>
    </>
  );
}

export default function EmailSettingsPage() {
  const [form] = Form.useForm();
  const [testEmailModal, setTestEmailModal] = useState(false);
  const [testEmail, setTestEmail] = useState('');

  const { data: settings, isLoading } = useEmailSettings();
  const updateSettings = useUpdateEmailSettings();
  const testConnection = useTestEmailConnection();
  const sendTestEmail = useSendTestEmail();

  useEffect(() => {
    if (settings) {
      form.setFieldsValue(settings);
    }
  }, [settings, form]);

  const handleSave = async (values: EmailSettings) => {
    try {
      await updateSettings.mutateAsync(values);
      message.success('Email settings saved successfully');
    } catch (error) {
      message.error('Failed to save email settings');
    }
  };

  const handleTestConnection = async () => {
    try {
      const result = await testConnection.mutateAsync();
      if (result.success) {
        message.success('SMTP connection successful');
      } else {
        message.error(result.error || 'Connection test failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection test failed';
      message.error(errorMessage);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmail) {
      message.error('Please enter an email address');
      return;
    }

    try {
      const result = await sendTestEmail.mutateAsync(testEmail);
      if (result.success) {
        message.success('Test email sent successfully');
        setTestEmailModal(false);
        setTestEmail('');
      } else {
        message.error(result.error || 'Failed to send test email');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send test email';
      message.error(errorMessage);
    }
  };

  const tabItems = [
    {
      key: 'settings',
      label: 'Settings',
      children: (
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
          initialValues={{
            smtpPort: 587,
            smtpSecure: true,
            autoSendInvoice: false,
            autoSendPayment: false,
            autoSendOrder: false,
            autoSendPO: false,
          }}
        >
          {isLoading ? (
            <Skeleton active paragraph={{ rows: 10 }} />
          ) : (
            <>
              <SmtpConfigurationForm
                loading={updateSettings.isPending}
                onTestConnection={handleTestConnection}
                testingConnection={testConnection.isPending}
              />
              <SenderInfoForm loading={updateSettings.isPending} />
              <AutoSendSettings loading={updateSettings.isPending} />

              <Card>
                <Space>
                  <Button type="primary" htmlType="submit" loading={updateSettings.isPending}>
                    Save Settings
                  </Button>
                  <Button onClick={() => setTestEmailModal(true)}>
                    <SendOutlined /> Send Test Email
                  </Button>
                </Space>
              </Card>
            </>
          )}
        </Form>
      ),
    },
    {
      key: 'logs',
      label: 'Email Logs',
      children: <EmailLogsTable />,
    },
  ];

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
          { title: 'Email' },
        ]}
      />

      <Title level={4} style={{ marginBottom: 24 }}>
        <MailOutlined style={{ marginRight: 8 }} />
        Email Settings
      </Title>

      <Tabs items={tabItems} />

      <Modal
        title="Send Test Email"
        open={testEmailModal}
        onCancel={() => setTestEmailModal(false)}
        onOk={handleSendTestEmail}
        confirmLoading={sendTestEmail.isPending}
        okText="Send"
      >
        <Form layout="vertical">
          <Form.Item label="Email Address" required>
            <Input
              type="email"
              placeholder="test@example.com"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
