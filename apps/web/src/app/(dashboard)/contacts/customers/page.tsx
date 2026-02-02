'use client';

import Link from 'next/link';
import {
  Card,
  Table,
  Button,
  Input,
  Space,
  Tag,
  Typography,
  Dropdown,
  type MenuProps,
  type TableColumnsType,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  FilterOutlined,
  DownloadOutlined,
  MoreOutlined,
  EditOutlined,
  DeleteOutlined,
  MailOutlined,
} from '@ant-design/icons';

const { Title } = Typography;

interface Customer {
  id: string;
  companyName: string;
  displayName: string;
  email: string;
  phone: string;
  outstandingBalance: number;
  status: 'ACTIVE' | 'INACTIVE';
}

// Mock data
const mockCustomers: Customer[] = [
  {
    id: '1',
    companyName: 'ABC Auto Parts Sdn Bhd',
    displayName: 'ABC Auto Parts',
    email: 'sales@abcauto.com.my',
    phone: '+60312345678',
    outstandingBalance: 5250.0,
    status: 'ACTIVE',
  },
  {
    id: '2',
    companyName: 'Kedai Hardware Berjaya',
    displayName: 'Hardware Berjaya',
    email: 'info@berjaya.com.my',
    phone: '+60387654321',
    outstandingBalance: 0,
    status: 'ACTIVE',
  },
  {
    id: '3',
    companyName: 'XYZ Spare Parts Trading',
    displayName: 'XYZ Trading',
    email: 'contact@xyztrading.com',
    phone: '+60356789012',
    outstandingBalance: 1800.5,
    status: 'ACTIVE',
  },
];

export default function CustomersPage() {
  const actionMenuItems: MenuProps['items'] = [
    { key: 'edit', icon: <EditOutlined />, label: 'Edit' },
    { key: 'email', icon: <MailOutlined />, label: 'Send Email' },
    { type: 'divider' },
    { key: 'delete', icon: <DeleteOutlined />, label: 'Delete', danger: true },
  ];

  const columns: TableColumnsType<Customer> = [
    {
      title: 'Display Name',
      dataIndex: 'displayName',
      key: 'displayName',
      render: (name: string, record: Customer) => (
        <Link href={`/contacts/customers/${record.id}`} style={{ fontWeight: 500 }}>
          {name}
        </Link>
      ),
    },
    {
      title: 'Company Name',
      dataIndex: 'companyName',
      key: 'companyName',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
      width: 140,
    },
    {
      title: 'Outstanding Balance',
      dataIndex: 'outstandingBalance',
      key: 'outstandingBalance',
      width: 160,
      align: 'right',
      render: (balance: number) => (
        <span style={{ color: balance > 0 ? '#ff4d4f' : undefined }}>RM {balance.toFixed(2)}</span>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={status === 'ACTIVE' ? 'green' : 'default'}>{status}</Tag>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 50,
      align: 'center',
      render: (_: unknown, record: Customer) => (
        <Dropdown menu={{ items: actionMenuItems }} trigger={['click']}>
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
      ),
    },
  ];

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <Title level={4} style={{ margin: 0 }}>
          Customers
        </Title>
        <Space>
          <Button icon={<DownloadOutlined />}>Export</Button>
          <Link href="/contacts/customers/new">
            <Button type="primary" icon={<PlusOutlined />}>
              New Customer
            </Button>
          </Link>
        </Space>
      </div>

      <Card>
        <div style={{ marginBottom: 16 }}>
          <Space>
            <Input
              placeholder="Search customers..."
              prefix={<SearchOutlined />}
              style={{ width: 300 }}
            />
            <Button icon={<FilterOutlined />}>Filters</Button>
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={mockCustomers}
          rowKey="id"
          pagination={{
            total: mockCustomers.length,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} customers`,
          }}
        />
      </Card>
    </div>
  );
}
