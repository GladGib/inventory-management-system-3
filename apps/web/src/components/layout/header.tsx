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
import { GlobalSearch } from './GlobalSearch';

const { Header: AntHeader } = Layout;
const { Text } = Typography;

interface HeaderProps {
  collapsed: boolean;
}

export function Header(_props: HeaderProps) {
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
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#fff',
        borderBottom: '1px solid #f0f0f0',
      }}
    >
      <div style={{ flex: 1 }}>
        <GlobalSearch />
      </div>

      <Space size="middle">
        <Button
          type="text"
          icon={<QuestionCircleOutlined style={{ fontSize: 18 }} />}
          style={{ color: '#595959', width: 40, height: 40 }}
        />

        <Badge count={3} size="small">
          <Button
            type="text"
            icon={<BellOutlined style={{ fontSize: 18 }} />}
            style={{ color: '#595959', width: 40, height: 40 }}
          />
        </Badge>

        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={['click']}>
          <Space
            style={{ cursor: 'pointer', padding: '4px 8px', borderRadius: 8 }}
            className="header-user-dropdown"
          >
            <Avatar size={36} icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />
            <div style={{ lineHeight: 1.3 }}>
              <Text strong style={{ display: 'block', fontSize: 14 }}>
                {user?.name || 'User'}
              </Text>
              <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                {user?.organization?.name || 'Organization'}
              </Text>
            </div>
          </Space>
        </Dropdown>
      </Space>
    </AntHeader>
  );
}
