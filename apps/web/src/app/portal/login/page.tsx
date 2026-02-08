'use client';

import { useRouter } from 'next/navigation';
import { Form, Input, Button, Typography, message, Card } from 'antd';
import { MailOutlined, LockOutlined, BankOutlined } from '@ant-design/icons';
import { useMutation } from '@tanstack/react-query';
import { portalAuthService, PortalLoginCredentials } from '@/lib/portal-api';
import { usePortalAuthStore } from '@/stores/portal-auth-store';

const { Title, Text, Paragraph } = Typography;

export default function PortalLoginPage() {
  const router = useRouter();
  const [form] = Form.useForm();
  const setUser = usePortalAuthStore((state) => state.setUser);

  const loginMutation = useMutation({
    mutationFn: (credentials: PortalLoginCredentials) =>
      portalAuthService.login(credentials),
    onSuccess: (data) => {
      setUser(data.user);
      message.success('Login successful!');
      router.push('/portal/dashboard');
    },
    onError: (error: any) => {
      const errorMsg =
        error?.response?.data?.message || error?.message || 'Invalid credentials';
      message.error(errorMsg);
    },
  });

  const onFinish = (values: PortalLoginCredentials) => {
    loginMutation.mutate(values);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: 24,
      }}
    >
      <Card
        style={{
          width: 420,
          maxWidth: '100%',
          borderRadius: 12,
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
        }}
        bodyStyle={{ padding: 40 }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Title level={3} style={{ margin: 0, color: '#1890ff' }}>
            Customer Portal
          </Title>
          <Paragraph type="secondary" style={{ marginTop: 8 }}>
            Sign in to view your orders, invoices, and account information
          </Paragraph>
        </div>

        <Form
          form={form}
          name="portal-login"
          onFinish={onFinish}
          layout="vertical"
          size="large"
          requiredMark={false}
        >
          <Form.Item
            name="organizationSlug"
            label="Organization"
            rules={[{ required: true, message: 'Please enter the organization code' }]}
          >
            <Input
              prefix={<BankOutlined />}
              placeholder="Organization code (e.g., acme-parts)"
            />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Please enter your email' },
              { type: 'email', message: 'Please enter a valid email' },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="Email address" />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: 'Please enter your password' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Password" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 12 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loginMutation.isPending}
              block
              style={{ height: 44 }}
            >
              Sign In
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Contact your supplier to get portal access credentials
          </Text>
        </div>
      </Card>
    </div>
  );
}
