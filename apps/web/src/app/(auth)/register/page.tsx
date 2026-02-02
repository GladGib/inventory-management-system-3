'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Form, Input, Button, Select, Typography, message, Divider } from 'antd';
import { UserOutlined, MailOutlined, LockOutlined, ShopOutlined } from '@ant-design/icons';
import { useMutation } from '@tanstack/react-query';
import { authService, RegisterData } from '@/lib/auth';
import { useAuthStore } from '@/stores/auth-store';

const { Title, Text } = Typography;

const industries = [
  { value: 'AUTO_PARTS', label: 'Auto Parts' },
  { value: 'HARDWARE', label: 'Hardware' },
  { value: 'SPARE_PARTS', label: 'Spare Parts' },
  { value: 'GENERAL', label: 'General' },
];

export default function RegisterPage() {
  const router = useRouter();
  const [form] = Form.useForm();
  const setUser = useAuthStore((state) => state.setUser);

  const registerMutation = useMutation({
    mutationFn: (data: RegisterData) => authService.register(data),
    onSuccess: (data) => {
      setUser(data.user);
      message.success('Account created successfully!');
      router.push('/dashboard');
    },
    onError: (error: Error) => {
      message.error(error.message || 'Registration failed. Please try again.');
    },
  });

  const onFinish = (values: RegisterData & { confirmPassword: string }) => {
    const { confirmPassword, ...registerData } = values;
    registerMutation.mutate(registerData);
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
          Create Account
        </Title>
        <Text type="secondary" className="auth-subtitle" style={{ display: 'block' }}>
          Start managing your inventory today
        </Text>

        <Form
          form={form}
          name="register"
          onFinish={onFinish}
          layout="vertical"
          size="large"
          requiredMark={false}
        >
          <Form.Item name="name" rules={[{ required: true, message: 'Please enter your name' }]}>
            <Input prefix={<UserOutlined />} placeholder="Your name" />
          </Form.Item>

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
            name="organizationName"
            rules={[{ required: true, message: 'Please enter your company name' }]}
          >
            <Input prefix={<ShopOutlined />} placeholder="Company name" />
          </Form.Item>

          <Form.Item
            name="industry"
            rules={[{ required: true, message: 'Please select your industry' }]}
          >
            <Select placeholder="Select industry" options={industries} />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: 'Please enter a password' },
              { min: 8, message: 'Password must be at least 8 characters' },
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Password" />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            dependencies={['password']}
            rules={[
              { required: true, message: 'Please confirm your password' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Passwords do not match'));
                },
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Confirm password" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={registerMutation.isPending} block>
              Create Account
            </Button>
          </Form.Item>
        </Form>

        <Divider>
          <Text type="secondary">Already have an account?</Text>
        </Divider>

        <Link href="/login" style={{ display: 'block' }}>
          <Button block>Sign In</Button>
        </Link>
      </div>
    </div>
  );
}
