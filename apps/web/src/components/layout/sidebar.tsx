'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Layout, Menu, type MenuProps } from 'antd';
import {
  DashboardOutlined,
  ShoppingOutlined,
  InboxOutlined,
  ShoppingCartOutlined,
  TeamOutlined,
  BarChartOutlined,
  SettingOutlined,
  SwapOutlined,
} from '@ant-design/icons';

const { Sider } = Layout;

type MenuItem = Required<MenuProps>['items'][number];

function getItem(
  label: React.ReactNode,
  key: string,
  icon?: React.ReactNode,
  children?: MenuItem[]
): MenuItem {
  return {
    key,
    icon,
    children,
    label: children ? label : <Link href={key}>{label}</Link>,
  } as MenuItem;
}

const menuItems: MenuItem[] = [
  getItem('Dashboard', '/dashboard', <DashboardOutlined />),
  getItem('Items', '/items', <ShoppingOutlined />, [
    getItem('All Items', '/items'),
    getItem('Item Groups', '/items/groups'),
    getItem('Categories', '/items/categories'),
  ]),
  getItem('Inventory', '/inventory', <InboxOutlined />, [
    getItem('Stock Summary', '/inventory'),
    getItem('Adjustments', '/inventory/adjustments'),
    getItem('Transfers', '/inventory/transfers'),
    getItem('Warehouses', '/inventory/warehouses'),
  ]),
  getItem('Sales', '/sales', <ShoppingCartOutlined />, [
    getItem('Sales Orders', '/sales/orders'),
    getItem('Invoices', '/sales/invoices'),
    getItem('Payments Received', '/sales/payments'),
    getItem('Sales Returns', '/sales/returns'),
  ]),
  getItem('Purchases', '/purchases', <SwapOutlined />, [
    getItem('Purchase Orders', '/purchases/orders'),
    getItem('Purchase Receives', '/purchases/receives'),
    getItem('Bills', '/purchases/bills'),
    getItem('Payments Made', '/purchases/payments'),
  ]),
  getItem('Contacts', '/contacts', <TeamOutlined />, [
    getItem('Customers', '/contacts/customers'),
    getItem('Vendors', '/contacts/vendors'),
  ]),
  getItem('Reports', '/reports', <BarChartOutlined />),
  getItem('Settings', '/settings', <SettingOutlined />, [
    getItem('Organization', '/settings'),
    getItem('Tax Rates', '/settings/tax-rates'),
  ]),
];

interface SidebarProps {
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
}

export function Sidebar({ collapsed, onCollapse }: SidebarProps) {
  const pathname = usePathname();

  // Find the active key and open keys based on current pathname
  const getSelectedKeys = () => {
    // Match exact path or parent path for nested routes
    const matchingItem = menuItems.find((item) => {
      if (!item || typeof item !== 'object' || !('key' in item)) return false;
      const key = item.key as string;
      if (pathname === key) return true;
      if ('children' in item && item.children) {
        return item.children.some((child) => {
          if (!child || typeof child !== 'object' || !('key' in child)) return false;
          return pathname.startsWith(child.key as string);
        });
      }
      return pathname.startsWith(key);
    });

    if (matchingItem && 'children' in matchingItem && matchingItem.children) {
      const matchingChild = matchingItem.children.find((child) => {
        if (!child || typeof child !== 'object' || !('key' in child)) return false;
        return pathname.startsWith(child.key as string);
      });
      if (matchingChild && 'key' in matchingChild) {
        return [matchingChild.key as string];
      }
    }

    return [pathname];
  };

  const getOpenKeys = () => {
    const openKeys: string[] = [];
    menuItems.forEach((item) => {
      if (!item || typeof item !== 'object' || !('key' in item) || !('children' in item)) return;
      const key = item.key as string;
      if (item.children && pathname.startsWith(key)) {
        openKeys.push(key);
      }
    });
    return openKeys;
  };

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={onCollapse}
      width={260}
      style={{
        overflow: 'auto',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 100,
      }}
    >
      <div
        style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <h1
          style={{
            color: '#fff',
            fontSize: collapsed ? 20 : 24,
            fontWeight: 700,
            margin: 0,
            transition: 'font-size 0.2s',
          }}
        >
          {collapsed ? 'IMS' : 'IMS Pro'}
        </h1>
      </div>

      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={getSelectedKeys()}
        defaultOpenKeys={collapsed ? [] : getOpenKeys()}
        items={menuItems}
        style={{ borderRight: 0 }}
      />
    </Sider>
  );
}
