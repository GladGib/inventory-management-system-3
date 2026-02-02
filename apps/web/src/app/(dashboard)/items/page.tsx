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
import type { SorterResult, FilterValue } from 'antd/es/table/interface';
import {
  PlusOutlined,
  SearchOutlined,
  FilterOutlined,
  DownloadOutlined,
  MoreOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useItems, useDeleteItem } from '@/hooks/use-items';
import { Item, ItemStatus, ItemType, ItemQueryParams } from '@/lib/items';

const { Title } = Typography;
const { confirm } = Modal;

export default function ItemsPage() {
  const router = useRouter();
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState<ItemQueryParams>({
    page: 1,
    limit: 25,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  // Debounced search params
  const queryParams = useMemo(
    () => ({
      ...filters,
      search: searchText || undefined,
    }),
    [filters, searchText]
  );

  const { data, isLoading, isFetching } = useItems(queryParams);
  const deleteItem = useDeleteItem();

  const handleDelete = (record: Item) => {
    confirm({
      title: 'Delete Item',
      icon: <ExclamationCircleOutlined />,
      content: `Are you sure you want to delete "${record.name}"? This action cannot be undone.`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => deleteItem.mutate(record.id),
    });
  };

  const handleEdit = (record: Item) => {
    router.push(`/items/${record.id}/edit`);
  };

  const getActionMenuItems = (record: Item): MenuProps['items'] => [
    {
      key: 'edit',
      icon: <EditOutlined />,
      label: 'Edit',
      onClick: () => handleEdit(record),
    },
    {
      key: 'duplicate',
      icon: <CopyOutlined />,
      label: 'Duplicate',
      onClick: () => router.push(`/items/new?duplicate=${record.id}`),
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

  const columns: TableColumnsType<Item> = [
    {
      title: 'SKU',
      dataIndex: 'sku',
      key: 'sku',
      width: 120,
      sorter: true,
      render: (sku: string, record: Item) => (
        <Link href={`/items/${record.id}`} style={{ fontWeight: 500 }}>
          {sku}
        </Link>
      ),
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
      sorter: true,
    },
    {
      title: 'Category',
      dataIndex: ['category', 'name'],
      key: 'category',
      width: 140,
      render: (name: string | undefined) => name || '-',
    },
    {
      title: 'Brand',
      dataIndex: 'brand',
      key: 'brand',
      width: 100,
      render: (brand: string | undefined) => brand || '-',
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 110,
      render: (type: ItemType) => {
        const colors: Record<ItemType, string> = {
          INVENTORY: 'blue',
          SERVICE: 'purple',
          NON_INVENTORY: 'cyan',
        };
        return <Tag color={colors[type]}>{type.replace('_', ' ')}</Tag>;
      },
    },
    {
      title: 'Cost Price',
      dataIndex: 'costPrice',
      key: 'costPrice',
      width: 120,
      align: 'right',
      sorter: true,
      render: (price: number) => `RM ${Number(price).toFixed(2)}`,
    },
    {
      title: 'Selling Price',
      dataIndex: 'sellingPrice',
      key: 'sellingPrice',
      width: 120,
      align: 'right',
      sorter: true,
      render: (price: number) => `RM ${Number(price).toFixed(2)}`,
    },
    {
      title: 'Stock',
      dataIndex: 'stockOnHand',
      key: 'stockOnHand',
      width: 100,
      align: 'right',
      sorter: true,
      render: (stock: number, record: Item) => (
        <span
          style={{
            color: record.isLowStock ? '#ff4d4f' : undefined,
            fontWeight: record.isLowStock ? 600 : undefined,
          }}
        >
          {stock}
          {record.isLowStock && ' ⚠'}
        </span>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: ItemStatus) => (
        <Tag color={status === 'ACTIVE' ? 'green' : 'default'}>{status}</Tag>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 50,
      align: 'center',
      render: (_: unknown, record: Item) => (
        <Dropdown menu={{ items: getActionMenuItems(record) }} trigger={['click']}>
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
      ),
    },
  ];

  const handleTableChange = (
    pagination: TablePaginationConfig,
    _filters: Record<string, FilterValue | null>,
    sorter: SorterResult<Item> | SorterResult<Item>[]
  ) => {
    const sort = Array.isArray(sorter) ? sorter[0] : sorter;
    setFilters((prev) => ({
      ...prev,
      page: pagination.current || 1,
      limit: pagination.pageSize || 25,
      sortBy: (sort?.field as string) || 'createdAt',
      sortOrder: sort?.order === 'ascend' ? 'asc' : 'desc',
    }));
  };

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
          Items
        </Title>
        <Space>
          <Button icon={<DownloadOutlined />}>Export</Button>
          <Link href="/items/new">
            <Button type="primary" icon={<PlusOutlined />}>
              New Item
            </Button>
          </Link>
        </Space>
      </div>

      <Card>
        <div style={{ marginBottom: 16 }}>
          <Space wrap>
            <Input
              placeholder="Search by SKU, name, or part number..."
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
            <Select
              placeholder="Type"
              style={{ width: 140 }}
              allowClear
              value={filters.type}
              onChange={(value) => setFilters((prev) => ({ ...prev, type: value, page: 1 }))}
              options={[
                { value: 'INVENTORY', label: 'Inventory' },
                { value: 'SERVICE', label: 'Service' },
                { value: 'NON_INVENTORY', label: 'Non-Inventory' },
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
            showTotal: (total) => `Total ${total} items`,
            pageSizeOptions: ['10', '25', '50', '100'],
          }}
          scroll={{ x: 1200 }}
        />
      </Card>
    </div>
  );
}
