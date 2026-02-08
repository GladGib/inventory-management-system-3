'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Card, Table, Typography, Tag, Input, Space, Button, Select } from 'antd';
import { SearchOutlined, FilterOutlined, DownloadOutlined } from '@ant-design/icons';
import type { TableColumnsType } from 'antd';
import { useStockLevels, useWarehouses } from '@/hooks/use-inventory';
import { StockLevel, StockQueryParams } from '@/lib/inventory';
import { TableSkeleton } from '@/components/skeletons';

const { Title } = Typography;

export default function InventoryPage() {
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState<StockQueryParams>({});

  const { data: stockLevels, isLoading, isFetching } = useStockLevels(filters);
  const { data: warehouses } = useWarehouses();

  // Filter stock levels by search text (client-side for now)
  const filteredData = useMemo(() => {
    if (!stockLevels) return [];
    if (!searchText) return stockLevels;

    const search = searchText.toLowerCase();
    return stockLevels.filter(
      (stock) =>
        stock.item.sku.toLowerCase().includes(search) ||
        stock.item.name.toLowerCase().includes(search)
    );
  }, [stockLevels, searchText]);

  const getStockStatus = (stock: StockLevel): 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' => {
    if (Number(stock.stockOnHand) === 0) return 'OUT_OF_STOCK';
    if (stock.isLowStock) return 'LOW_STOCK';
    return 'IN_STOCK';
  };

  const columns: TableColumnsType<StockLevel> = [
    {
      title: 'SKU',
      dataIndex: ['item', 'sku'],
      key: 'sku',
      width: 130,
      render: (sku: string, record: StockLevel) => (
        <Link href={`/items/${record.itemId}`} style={{ fontWeight: 500 }}>
          {sku}
        </Link>
      ),
    },
    {
      title: 'Item Name',
      dataIndex: ['item', 'name'],
      key: 'name',
      ellipsis: true,
    },
    {
      title: 'Warehouse',
      dataIndex: ['warehouse', 'name'],
      key: 'warehouse',
      width: 150,
    },
    {
      title: 'On Hand',
      dataIndex: 'stockOnHand',
      key: 'stockOnHand',
      width: 100,
      align: 'right',
      render: (stock: number) => Number(stock).toLocaleString(),
    },
    {
      title: 'Committed',
      dataIndex: 'committedStock',
      key: 'committedStock',
      width: 100,
      align: 'right',
      render: (stock: number) => Number(stock).toLocaleString(),
    },
    {
      title: 'Available',
      dataIndex: 'availableStock',
      key: 'availableStock',
      width: 100,
      align: 'right',
      render: (stock: number) => Number(stock).toLocaleString(),
    },
    {
      title: 'Reorder Level',
      dataIndex: ['item', 'reorderLevel'],
      key: 'reorderLevel',
      width: 120,
      align: 'right',
      render: (level: number) => Number(level).toLocaleString(),
    },
    {
      title: 'Stock Value',
      dataIndex: 'stockValue',
      key: 'stockValue',
      width: 130,
      align: 'right',
      render: (value: number) => `RM ${Number(value).toFixed(2)}`,
    },
    {
      title: 'Status',
      key: 'status',
      width: 120,
      render: (_: unknown, record: StockLevel) => {
        const status = getStockStatus(record);
        const colorMap: Record<string, string> = {
          IN_STOCK: 'green',
          LOW_STOCK: 'orange',
          OUT_OF_STOCK: 'red',
        };
        const labelMap: Record<string, string> = {
          IN_STOCK: 'In Stock',
          LOW_STOCK: 'Low Stock',
          OUT_OF_STOCK: 'Out of Stock',
        };
        return <Tag color={colorMap[status]}>{labelMap[status]}</Tag>;
      },
    },
  ];

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
            Stock Summary
          </Title>
          <Button icon={<DownloadOutlined />}>Export</Button>
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
          Stock Summary
        </Title>
        <Button icon={<DownloadOutlined />}>Export</Button>
      </div>

      <Card>
        <div style={{ marginBottom: 16 }}>
          <Space wrap>
            <Input
              placeholder="Search by SKU or item name..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 300 }}
              allowClear
            />
            <Select
              placeholder="Warehouse"
              style={{ width: 200 }}
              allowClear
              value={filters.warehouseId}
              onChange={(value) => setFilters((prev) => ({ ...prev, warehouseId: value }))}
              options={[
                { value: undefined, label: 'All Warehouses' },
                ...(warehouses?.map((w) => ({ value: w.id, label: w.name })) || []),
              ]}
            />
            <Select
              placeholder="Stock Status"
              style={{ width: 150 }}
              allowClear
              value={filters.lowStockOnly ? 'LOW_STOCK' : undefined}
              onChange={(value) =>
                setFilters((prev) => ({ ...prev, lowStockOnly: value === 'LOW_STOCK' }))
              }
              options={[
                { value: undefined, label: 'All Status' },
                { value: 'LOW_STOCK', label: 'Low Stock Only' },
              ]}
            />
            <Button
              icon={<FilterOutlined />}
              onClick={() => {
                setSearchText('');
                setFilters({});
              }}
            >
              Reset
            </Button>
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={filteredData}
          rowKey="id"
          loading={isLoading || isFetching}
          pagination={{
            total: filteredData.length,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} items`,
            pageSizeOptions: ['10', '25', '50', '100'],
          }}
          scroll={{ x: 1200 }}
        />
      </Card>
    </div>
  );
}
