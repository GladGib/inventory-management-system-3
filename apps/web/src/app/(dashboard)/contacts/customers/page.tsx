'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Card,
  Table,
  Button,
  Input,
  Space,
  Tag,
  Typography,
  Dropdown,
  Select,
  Modal,
  type MenuProps,
  type TableColumnsType,
  type TablePaginationConfig,
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
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useCustomers, useDeleteContact } from '@/hooks/use-contacts';
import { Contact, ContactQueryParams } from '@/lib/contacts';
import { TableSkeleton } from '@/components/skeletons';

const { Title } = Typography;
const { confirm } = Modal;

export default function CustomersPage() {
  const router = useRouter();
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState<Omit<ContactQueryParams, 'type'>>({
    page: 1,
    limit: 25,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  const queryParams = useMemo(
    () => ({
      ...filters,
      search: searchText || undefined,
    }),
    [filters, searchText]
  );

  const { data, isLoading, isFetching } = useCustomers(queryParams);
  const deleteContact = useDeleteContact();

  const handleDelete = (record: Contact) => {
    confirm({
      title: 'Delete Customer',
      icon: <ExclamationCircleOutlined />,
      content: `Are you sure you want to delete "${record.displayName}"? This action cannot be undone.`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => deleteContact.mutate(record.id),
    });
  };

  const getActionMenuItems = (record: Contact): MenuProps['items'] => [
    {
      key: 'edit',
      icon: <EditOutlined />,
      label: 'Edit',
      onClick: () => router.push(`/contacts/customers/${record.id}/edit`),
    },
    {
      key: 'email',
      icon: <MailOutlined />,
      label: 'Send Email',
      disabled: !record.email,
    },
    { type: 'divider' },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: 'Delete',
      danger: true,
      onClick: () => handleDelete(record),
    },
  ];

  const columns: TableColumnsType<Contact> = [
    {
      title: 'Display Name',
      dataIndex: 'displayName',
      key: 'displayName',
      sorter: true,
      render: (name: string, record: Contact) => (
        <Link href={`/contacts/customers/${record.id}`} style={{ fontWeight: 500 }}>
          {name}
        </Link>
      ),
    },
    {
      title: 'Company Name',
      dataIndex: 'companyName',
      key: 'companyName',
      ellipsis: true,
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (email: string | undefined) => email || '-',
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
      width: 140,
      render: (phone: string | undefined) => phone || '-',
    },
    {
      title: 'Outstanding Balance',
      dataIndex: 'outstandingBalance',
      key: 'outstandingBalance',
      width: 160,
      align: 'right',
      sorter: true,
      render: (balance: number) => (
        <span
          style={{
            color: balance > 0 ? '#ff4d4f' : undefined,
            fontWeight: balance > 0 ? 600 : undefined,
          }}
        >
          RM {Number(balance || 0).toFixed(2)}
        </span>
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
      render: (_: unknown, record: Contact) => (
        <Dropdown menu={{ items: getActionMenuItems(record) }} trigger={['click']}>
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
      ),
    },
  ];

  const handleTableChange = (pagination: TablePaginationConfig) => {
    setFilters((prev) => ({
      ...prev,
      page: pagination.current || 1,
      limit: pagination.pageSize || 25,
    }));
  };

  if (isLoading) {
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
          <TableSkeleton rows={10} columns={6} />
        </Card>
      </div>
    );
  }

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
          <Space wrap>
            <Input
              placeholder="Search customers..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setFilters((prev) => ({ ...prev, page: 1 }));
              }}
              style={{ width: 300 }}
              allowClear
            />
            <Select
              placeholder="Status"
              style={{ width: 120 }}
              allowClear
              value={filters.status}
              onChange={(value) => setFilters((prev) => ({ ...prev, status: value, page: 1 }))}
              options={[
                { value: 'ACTIVE', label: 'Active' },
                { value: 'INACTIVE', label: 'Inactive' },
              ]}
            />
            <Button
              icon={<FilterOutlined />}
              onClick={() => {
                setSearchText('');
                setFilters({
                  page: 1,
                  limit: 25,
                  sortBy: 'createdAt',
                  sortOrder: 'desc',
                });
              }}
            >
              Reset
            </Button>
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={data?.data || []}
          rowKey="id"
          loading={isLoading || isFetching}
          onChange={handleTableChange}
          pagination={{
            current: filters.page,
            pageSize: filters.limit,
            total: data?.meta?.total || 0,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `Total ${total} customers`,
            pageSizeOptions: ['10', '25', '50', '100'],
          }}
        />
      </Card>
    </div>
  );
}
