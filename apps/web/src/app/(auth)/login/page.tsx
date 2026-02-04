'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Form, Input, Button, Typography, message, Divider } from 'antd';
import { MailOutlined, LockOutlined } from '@ant-design/icons';
import { useMutation } from '@tanstack/react-query';
import { authService, LoginCredentials } from '@/lib/auth';
import { useAuthStore } from '@/stores/auth-store';

const { Title, Text } = Typography;

export default function LoginPage() {
  const router = useRouter();
  const [form] = Form.useForm();
  const setUser = useAuthStore((state) => state.setUser);

  const loginMutation = useMutation({
    mutationFn: (credentials: LoginCredentials) => authService.login(credentials),
    onSuccess: (data) => {
      setUser(data.user);
      message.success('Login successful!');
      router.push('/dashboard');
    },
    onError: (error: Error) => {
      message.error(error.message || 'Invalid email or password');
    },
  });

  const onFinish = (values: LoginCredentials) => {
    loginMutation.mutate(values);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">
          <Title level={2} style={{ margin: 0, color: '#1890ff' }}>
            IMS
          </Title>
        </div>

        <Title level={4} className="auth-title">
          Welcome Back
        </Title>
        <Text type="secondary" className="auth-subtitle" style={{ display: 'block' }}>
          Sign in to your account
        </Text>

        <Form
          form={form}
          name="login"
          onFinish={onFinish}
          layout="vertical"
          size="large"
          requiredMark={false}
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: 'Please enter your email' },
              { type: 'email', message: 'Please enter a valid email' },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="Email address" />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Please enter your password' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Password" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loginMutation.isPending} block>
              Sign In
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center' }}>
          <Link href="/forgot-password">
            <Text type="secondary">Forgot password?</Text>
          </Link>
        </div>

        <Divider>
          <Text type="secondary">New to IMS?</Text>
        </Divider>

        <Link href="/register" style={{ display: 'block' }}>
          <Button block>Create an account</Button>
        </Link>
      </div>
    </div>
  );
}
