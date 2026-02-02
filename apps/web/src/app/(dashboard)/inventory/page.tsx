'use client';

import { Card, Table, Typography, Tag, Input, Space, Button, Select } from 'antd';
import { SearchOutlined, FilterOutlined, DownloadOutlined } from '@ant-design/icons';
import type { TableColumnsType } from 'antd';

const { Title } = Typography;

interface StockLevel {
  id: string;
  itemSku: string;
  itemName: string;
  warehouse: string;
  stockOnHand: number;
  committedStock: number;
  availableStock: number;
  reorderLevel: number;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
}

// Mock data
const mockStockLevels: StockLevel[] = [
  {
    id: '1',
    itemSku: 'BRK-001',
    itemName: 'Brake Pad Set - Toyota Vios',
    warehouse: 'Main Warehouse',
    stockOnHand: 45,
    committedStock: 5,
    availableStock: 40,
    reorderLevel: 10,
    status: 'IN_STOCK',
  },
  {
    id: '2',
    itemSku: 'OIL-001',
    itemName: 'Engine Oil 5W-30 4L',
    warehouse: 'Main Warehouse',
    stockOnHand: 120,
    committedStock: 20,
    availableStock: 100,
    reorderLevel: 25,
    status: 'IN_STOCK',
  },
  {
    id: '3',
    itemSku: 'FLT-001',
    itemName: 'Air Filter - Honda City',
    warehouse: 'Main Warehouse',
    stockOnHand: 8,
    committedStock: 2,
    availableStock: 6,
    reorderLevel: 15,
    status: 'LOW_STOCK',
  },
  {
    id: '4',
    itemSku: 'BLT-001',
    itemName: 'Timing Belt - Proton Saga',
    warehouse: 'Main Warehouse',
    stockOnHand: 0,
    committedStock: 0,
    availableStock: 0,
    reorderLevel: 5,
    status: 'OUT_OF_STOCK',
  },
];

export default function InventoryPage() {
  const columns: TableColumnsType<StockLevel> = [
    {
      title: 'SKU',
      dataIndex: 'itemSku',
      key: 'itemSku',
      width: 120,
      render: (sku: string) => <span style={{ fontWeight: 500 }}>{sku}</span>,
    },
    {
      title: 'Item Name',
      dataIndex: 'itemName',
      key: 'itemName',
      ellipsis: true,
    },
    {
      title: 'Warehouse',
      dataIndex: 'warehouse',
      key: 'warehouse',
      width: 150,
    },
    {
      title: 'On Hand',
      dataIndex: 'stockOnHand',
      key: 'stockOnHand',
      width: 100,
      align: 'right',
    },
    {
      title: 'Committed',
      dataIndex: 'committedStock',
      key: 'committedStock',
      width: 100,
      align: 'right',
    },
    {
      title: 'Available',
      dataIndex: 'availableStock',
      key: 'availableStock',
      width: 100,
      align: 'right',
    },
    {
      title: 'Reorder Level',
      dataIndex: 'reorderLevel',
      key: 'reorderLevel',
      width: 120,
      align: 'right',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => {
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
          <Space>
            <Input
              placeholder="Search items..."
              prefix={<SearchOutlined />}
              style={{ width: 300 }}
            />
            <Select
              placeholder="Warehouse"
              style={{ width: 200 }}
              options={[
                { value: 'all', label: 'All Warehouses' },
                { value: 'main', label: 'Main Warehouse' },
              ]}
            />
            <Select
              placeholder="Status"
              style={{ width: 150 }}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'IN_STOCK', label: 'In Stock' },
                { value: 'LOW_STOCK', label: 'Low Stock' },
                { value: 'OUT_OF_STOCK', label: 'Out of Stock' },
              ]}
            />
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={mockStockLevels}
          rowKey="id"
          pagination={{
            total: mockStockLevels.length,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} items`,
          }}
        />
      </Card>
    </div>
  );
}
