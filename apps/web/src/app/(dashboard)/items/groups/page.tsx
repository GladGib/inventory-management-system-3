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
  Breadcrumb,
  type MenuProps,
  type TableColumnsType,
  type TablePaginationConfig,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  FilterOutlined,
  MoreOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  HomeOutlined,
  ExclamationCircleOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import { useItemGroups, useDeleteItemGroup } from '@/hooks/use-item-groups';
import type { ItemGroup, ItemGroupQueryParams } from '@/lib/item-groups';

const { Title, Text } = Typography;
const { confirm } = Modal;

export default function ItemGroupsPage() {
  const router = useRouter();
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState<ItemGroupQueryParams>({
    page: 1,
    limit: 25,
  });

  const queryParams = useMemo(
    () => ({
      ...filters,
      search: searchText || undefined,
    }),
    [filters, searchText]
  );

  const { data, isLoading, isFetching } = useItemGroups(queryParams);
  const deleteGroup = useDeleteItemGroup();

  const handleDelete = (record: ItemGroup) => {
    if (record.itemCount > 0) {
      Modal.warning({
        title: 'Cannot Delete',
        content: `This item group has ${record.itemCount} associated items. Remove the items first before deleting the group.`,
      });
      return;
    }

    confirm({
      title: 'Delete Item Group',
      icon: <ExclamationCircleOutlined />,
      content: `Are you sure you want to delete "${record.name}"? This action cannot be undone.`,
      okText: 'Delete',
      okType: 'danger',
      onOk: () => deleteGroup.mutate(record.id),
    });
  };

  const getActionMenuItems = (record: ItemGroup): MenuProps['items'] => [
    {
      key: 'view',
      icon: <EyeOutlined />,
      label: 'View Details',
      onClick: () => router.push(`/items/groups/${record.id}`),
    },
    {
      key: 'edit',
      icon: <EditOutlined />,
      label: 'Edit',
      onClick: () => router.push(`/items/groups/${record.id}/edit`),
    },
    { type: 'divider' },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: 'Delete',
      danger: true,
      disabled: record.itemCount > 0,
      onClick: () => handleDelete(record),
    },
  ];

  const columns: TableColumnsType<ItemGroup> = [
    {
      title: 'Group Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: ItemGroup) => (
        <Link href={`/items/groups/${record.id}`}>
          <Space>
            <AppstoreOutlined />
            <Text strong>{name}</Text>
          </Space>
        </Link>
      ),
    },
    {
      title: 'Attributes',
      dataIndex: 'attributes',
      key: 'attributes',
      render: (attributes: Array<{ name: string; values: string[] }>) => (
        <Space wrap>
          {attributes.map((attr) => (
            <Tag key={attr.name} color="blue">
              {attr.name}: {attr.values.length} options
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: 'Items',
      dataIndex: 'itemCount',
      key: 'itemCount',
      width: 100,
      align: 'center',
      render: (count: number) => <Tag color={count > 0 ? 'green' : 'default'}>{count} items</Tag>,
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
      render: (_: unknown, record: ItemGroup) => (
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

  return (
    <div>
      <Breadcrumb
        style={{ marginBottom: 24 }}
        items={[
          {
            title: (
              <Link href="/">
                <HomeOutlined />
              </Link>
            ),
          },
          {
            title: <Link href="/items">Items</Link>,
          },
          {
            title: 'Item Groups',
          },
        ]}
      />

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <Title level={4} style={{ margin: 0 }}>
          Item Groups
        </Title>
        <Link href="/items/groups/new">
          <Button type="primary" icon={<PlusOutlined />}>
            New Item Group
          </Button>
        </Link>
      </div>

      <Card>
        <div style={{ marginBottom: 16 }}>
          <Space wrap>
            <Input
              placeholder="Search by group name..."
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
                setFilters({ page: 1, limit: 25 });
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
            showTotal: (total) => `Total ${total} groups`,
            pageSizeOptions: ['10', '25', '50', '100'],
          }}
        />
      </Card>
    </div>
  );
}
