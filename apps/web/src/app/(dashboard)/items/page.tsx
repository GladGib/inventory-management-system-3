'use client';

import React, { useState, useMemo } from 'react';
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
  WarningOutlined,
  SwapOutlined,
  PrinterOutlined,
} from '@ant-design/icons';
import { useItems, useDeleteItem, useSearchByPartNumber } from '@/hooks/use-items';
import { useVehicleSearch } from '@/hooks/use-vehicles';
import { Item, ItemStatus, ItemType, ItemQueryParams, PartNumberSearchResult } from '@/lib/items';
import { VehicleSearchFilter } from '@/components/items/VehicleSearchFilter';
import { BarcodeLabelPrint } from '@/components/items/BarcodeLabelPrint';
import { TableSkeleton } from '@/components/skeletons';

const { Title } = Typography;
const { confirm } = Modal;

export default function ItemsPage() {
  const router = useRouter();
  const [searchText, setSearchText] = useState('');
  const [partNumberSearchMode, setPartNumberSearchMode] = useState(false);
  const [partNumberQuery, setPartNumberQuery] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [selectedItems, setSelectedItems] = useState<Item[]>([]);
  const [vehicleFilters, setVehicleFilters] = useState<{
    makeId?: string;
    modelId?: string;
    year?: number;
  }>({});
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
  const {
    data: partNumberResults,
    isLoading: isPartNumberLoading,
    isFetching: isPartNumberFetching,
  } = useSearchByPartNumber(partNumberSearchMode ? partNumberQuery : '');
  const {
    data: vehicleSearchResults,
    isLoading: isVehicleSearchLoading,
    isFetching: isVehicleSearchFetching,
  } = useVehicleSearch({
    makeId: vehicleFilters.makeId,
    modelId: vehicleFilters.modelId,
    year: vehicleFilters.year,
    page: filters.page,
    limit: filters.limit,
  });
  const deleteItem = useDeleteItem();

  const isVehicleFilterActive = !!vehicleFilters.makeId;

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
          COMPOSITE: 'green',
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
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          {stock}
          {record.isLowStock && <WarningOutlined style={{ fontSize: 12 }} />}
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
          <TableSkeleton rows={10} columns={9} />
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
          Items
        </Title>
        <Space>
          {selectedRowKeys.length > 0 && (
            <BarcodeLabelPrint
              items={selectedItems.map((i) => ({
                id: i.id,
                sku: i.sku,
                name: i.name,
                sellingPrice: Number(i.sellingPrice),
              }))}
              trigger={
                <Button icon={<PrinterOutlined />}>
                  Print Labels ({selectedRowKeys.length})
                </Button>
              }
            />
          )}
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
            {partNumberSearchMode ? (
              <Input
                placeholder="Search by part number across all references..."
                prefix={<SwapOutlined />}
                value={partNumberQuery}
                onChange={(e) => setPartNumberQuery(e.target.value)}
                style={{ width: 380 }}
                allowClear
              />
            ) : (
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
            )}
            <Button
              type={partNumberSearchMode ? 'primary' : 'default'}
              icon={<SwapOutlined />}
              onClick={() => {
                setPartNumberSearchMode((prev) => !prev);
                setPartNumberQuery('');
                setSearchText('');
              }}
            >
              Part No. Search
            </Button>
            {!partNumberSearchMode && (
              <>
                <Select
                  placeholder="Status"
                  style={{ width: 120 }}
                  allowClear
                  value={filters.status}
                  onChange={(value) =>
                    setFilters((prev) => ({ ...prev, status: value, page: 1 }))
                  }
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
                  onChange={(value) =>
                    setFilters((prev) => ({ ...prev, type: value, page: 1 }))
                  }
                  options={[
                    { value: 'INVENTORY', label: 'Inventory' },
                    { value: 'SERVICE', label: 'Service' },
                    { value: 'NON_INVENTORY', label: 'Non-Inventory' },
                  ]}
                />
              </>
            )}
            <Button
              icon={<FilterOutlined />}
              onClick={() => {
                setSearchText('');
                setPartNumberQuery('');
                setPartNumberSearchMode(false);
                setVehicleFilters({});
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
          {!partNumberSearchMode && (
            <div style={{ marginTop: 8 }}>
              <VehicleSearchFilter
                onFilterChange={(vf) => {
                  setVehicleFilters(vf);
                  setFilters((prev) => ({ ...prev, page: 1 }));
                }}
              />
            </div>
          )}
        </div>

        {partNumberSearchMode ? (
          <Table<PartNumberSearchResult>
            columns={[
              ...(columns.slice(0, -1) as TableColumnsType<PartNumberSearchResult>),
              {
                title: 'Matched On',
                key: 'matchedOn',
                width: 250,
                ellipsis: true,
                render: (_: unknown, record: PartNumberSearchResult) =>
                  record.matchedOn?.length ? (
                    <span style={{ fontSize: 12, color: '#1677ff' }}>
                      {record.matchedOn.join('; ')}
                    </span>
                  ) : (
                    '-'
                  ),
              },
              ...(columns.slice(-1) as TableColumnsType<PartNumberSearchResult>),
            ]}
            dataSource={partNumberResults?.data || []}
            rowKey="id"
            loading={isPartNumberLoading || isPartNumberFetching}
            pagination={false}
            scroll={{ x: 1400 }}
            locale={{
              emptyText: partNumberQuery
                ? 'No items found matching this part number'
                : 'Enter a part number to search',
            }}
          />
        ) : isVehicleFilterActive ? (
          <Table
            columns={columns}
            dataSource={(vehicleSearchResults?.data as Item[]) || []}
            rowKey="id"
            loading={isVehicleSearchLoading || isVehicleSearchFetching}
            onChange={handleTableChange}
            pagination={{
              current: filters.page,
              pageSize: filters.limit,
              total: vehicleSearchResults?.meta?.total || 0,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `Total ${total} compatible items`,
              pageSizeOptions: ['10', '25', '50', '100'],
            }}
            scroll={{ x: 1200 }}
          />
        ) : (
          <Table
            columns={columns}
            dataSource={data?.data || []}
            rowKey="id"
            loading={isLoading || isFetching}
            onChange={handleTableChange}
            rowSelection={{
              selectedRowKeys,
              onChange: (keys, rows) => {
                setSelectedRowKeys(keys);
                setSelectedItems(rows as Item[]);
              },
              preserveSelectedRowKeys: true,
            }}
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
        )}
      </Card>
    </div>
  );
}
