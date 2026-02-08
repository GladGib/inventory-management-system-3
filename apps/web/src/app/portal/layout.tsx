'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Layout,
  Menu,
  Button,
  Typography,
  Avatar,
  Dropdown,
  Spin,
  Space,
} from 'antd';
import {
  DashboardOutlined,
  ShoppingCartOutlined,
  FileTextOutlined,
  DollarOutlined,
  BarChartOutlined,
  UserOutlined,
  LogoutOutlined,
  MenuOutlined,
} from '@ant-design/icons';
import { usePortalAuthStore } from '@/stores/portal-auth-store';
import { portalAuthService } from '@/lib/portal-api';

const { Header, Content, Sider } = Layout;
const { Text, Title } = Typography;

const portalPublicPaths = ['/portal/login'];

const menuItems = [
  {
    key: '/portal/dashboard',
    icon: <DashboardOutlined />,
    label: 'Dashboard',
  },
  {
    key: '/portal/orders',
    icon: <ShoppingCartOutlined />,
    label: 'Orders',
  },
  {
    key: '/portal/invoices',
    icon: <FileTextOutlined />,
    label: 'Invoices',
  },
  {
    key: '/portal/payments',
    icon: <DollarOutlined />,
    label: 'Payments',
  },
  {
    key: '/portal/statement',
    icon: <BarChartOutlined />,
    label: 'Statement',
  },
];

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, setUser, setLoading, logout } = usePortalAuthStore();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isPublicPath = portalPublicPaths.some((path) => pathname.startsWith(path));

  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (portalAuthService.isAuthenticated()) {
          const profile = await portalAuthService.getProfile();
          setUser({
            id: profile.id,
            email: profile.email,
            contactId: profile.contactId,
            organizationId: profile.organizationId,
            contact: profile.contact,
          });
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      }
    };

    checkAuth();
  }, [setUser]);

  useEffect(() => {
    if (!isLoading) {
      if (!user && !isPublicPath) {
        router.push('/portal/login');
      } else if (user && isPublicPath) {
        router.push('/portal/dashboard');
      }
    }
  }, [user, isLoading, isPublicPath, pathname, router]);

  // Loading state
  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  // Public pages (login) - render without layout
  if (isPublicPath) {
    return <>{children}</>;
  }

  // Authenticated portal pages - render with portal layout
  if (!user) {
    return null;
  }

  const handleLogout = () => {
    portalAuthService.logout();
    logout();
    router.push('/portal/login');
  };

  const handleMenuClick = (e: { key: string }) => {
    router.push(e.key);
    setMobileMenuOpen(false);
  };

  const selectedKey = menuItems.find((item) => pathname.startsWith(item.key))?.key || '/portal/dashboard';

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: user.contact.displayName,
      disabled: true,
    },
    { type: 'divider' as const },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Sign Out',
      onClick: handleLogout,
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        breakpoint="lg"
        collapsedWidth={80}
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 100,
          background: '#fff',
          borderRight: '1px solid #f0f0f0',
        }}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          {collapsed ? (
            <Title level={4} style={{ margin: 0, color: '#1890ff' }}>
              P
            </Title>
          ) : (
            <Title level={4} style={{ margin: 0, color: '#1890ff' }}>
              Customer Portal
            </Title>
          )}
        </div>

        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={handleMenuClick}
          style={{ border: 'none' }}
        />
      </Sider>

      <Layout
        style={{
          marginLeft: collapsed ? 80 : 200,
          transition: 'margin-left 0.2s',
        }}
      >
        <Header
          style={{
            padding: '0 24px',
            background: '#fff',
            borderBottom: '1px solid #f0f0f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 99,
          }}
        >
          <Space>
            <Text strong>{user.contact.companyName || user.contact.displayName}</Text>
          </Space>

          <Dropdown menu={{ items: userMenuItems }} trigger={['click']}>
            <Button type="text" style={{ height: 'auto', padding: '4px 8px' }}>
              <Space>
                <Avatar size="small" icon={<UserOutlined />} />
                <Text>{user.email}</Text>
              </Space>
            </Button>
          </Dropdown>
        </Header>

        <Content
          style={{
            margin: 24,
            minHeight: 280,
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
