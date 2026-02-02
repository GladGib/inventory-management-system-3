'use client';

import { useRouter } from 'next/navigation';
import { Layout, Dropdown, Avatar, Space, Typography, Badge, Button, type MenuProps } from 'antd';
import {
  UserOutlined,
  LogoutOutlined,
  SettingOutlined,
  BellOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '@/stores/auth-store';
import { authService } from '@/lib/auth';

const { Header: AntHeader } = Layout;
const { Text } = Typography;

interface HeaderProps {
  collapsed: boolean;
}

export function Header({ collapsed }: HeaderProps) {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    try {
      await authService.logout();
    } finally {
      logout();
      router.push('/login');
    }
  };

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'My Profile',
      onClick: () => router.push('/settings/profile'),
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Settings',
      onClick: () => router.push('/settings'),
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Sign Out',
      onClick: handleLogout,
    },
  ];

  return (
    <AntHeader
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 99,
        width: '100%',
        marginLeft: collapsed ? 80 : 260,
        transition: 'margin-left 0.2s',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <div style={{ flex: 1 }} />

      <Space size="middle">
        <Button type="text" icon={<QuestionCircleOutlined />} style={{ color: '#666' }} />

        <Badge count={3} size="small">
          <Button type="text" icon={<BellOutlined />} style={{ color: '#666' }} />
        </Badge>

        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={['click']}>
          <Space style={{ cursor: 'pointer' }}>
            <Avatar size="small" icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />
            <div style={{ lineHeight: 1.2 }}>
              <Text strong style={{ display: 'block', fontSize: 13 }}>
                {user?.name || 'User'}
              </Text>
              <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>
                {user?.organization?.name || 'Organization'}
              </Text>
            </div>
          </Space>
        </Dropdown>
      </Space>
    </AntHeader>
  );
}
