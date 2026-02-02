'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Card,
  Typography,
  Descriptions,
  Tag,
  Space,
  Button,
  Table,
  Spin,
  Result,
  Tabs,
  Statistic,
  Row,
  Col,
  Dropdown,
  Modal,
} from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  DeleteOutlined,
  MoreOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useItem, useDeleteItem } from '@/hooks/use-items';
import { ItemType } from '@/lib/items';
import type { TableColumnsType, MenuProps } from 'antd';

const { Title, Text } = Typography;
const { confirm } = Modal;

interface StockLevel {
  warehouseId: string;
  warehouse: {
    id: string;
    name: string;
    code: string;
  };
  stockOnHand: number;
  committedStock: number;
}

export default function ItemDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: item, isLoading, error } = useItem(id);
  const deleteItem = useDeleteItem();

  const handleDelete = () => {
    confirm({
      title: 'Delete Item',
      icon: <ExclamationCircleOutlined />,
      content: `Are you sure you want to delete "${item?.name}"? This action cannot be undone.`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => {
        deleteItem.mutate(id, {
          onSuccess: () => router.push('/items'),
        });
      },
    });
  };

  const moreMenuItems: MenuProps['items'] = [
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: 'Delete',
      danger: true,
      onClick: handleDelete,
    },
  ];

  const stockColumns: TableColumnsType<StockLevel> = [
    {
      title: 'Warehouse',
      dataIndex: ['warehouse', 'name'],
      key: 'warehouse',
      render: (name: string, record: StockLevel) => (
        <span>
          {name} <Text type="secondary">({record.warehouse.code})</Text>
        </span>
      ),
    },
    {
      title: 'Stock on Hand',
      dataIndex: 'stockOnHand',
      key: 'stockOnHand',
      align: 'right',
    },
    {
      title: 'Committed',
      dataIndex: 'committedStock',
      key: 'committedStock',
      align: 'right',
    },
    {
      title: 'Available',
      key: 'available',
      align: 'right',
      render: (_: unknown, record: StockLevel) => record.stockOnHand - record.committedStock,
    },
  ];

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 100 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error || !item) {
    return (
      <Result
        status="404"
        title="Item Not Found"
        subTitle="The item you're looking for doesn't exist or has been deleted."
        extra={
          <Link href="/items">
            <Button type="primary">Back to Items</Button>
          </Link>
        }
      />
    );
  }

  const typeColors: Record<ItemType, string> = {
    INVENTORY: 'blue',
    SERVICE: 'purple',
    NON_INVENTORY: 'cyan',
  };

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 24,
        }}
      >
        <div>
          <Space style={{ marginBottom: 8 }}>
            <Link href="/items">
              <Button type="text" icon={<ArrowLeftOutlined />}>
                Back
              </Button>
            </Link>
          </Space>
          <Title level={4} style={{ margin: 0 }}>
            {item.name}
          </Title>
          <Space style={{ marginTop: 8 }}>
            <Text type="secondary">SKU: {item.sku}</Text>
            <Tag color={typeColors[item.type]}>{item.type.replace('_', ' ')}</Tag>
            <Tag color={item.status === 'ACTIVE' ? 'green' : 'default'}>{item.status}</Tag>
            {item.isLowStock && <Tag color="red">Low Stock</Tag>}
          </Space>
        </div>
        <Space>
          <Link href={`/items/${id}/edit`}>
            <Button icon={<EditOutlined />}>Edit</Button>
          </Link>
          <Dropdown menu={{ items: moreMenuItems }} trigger={['click']}>
            <Button icon={<MoreOutlined />} />
          </Dropdown>
        </Space>
      </div>

      {/* Stats */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Stock on Hand"
              value={item.stockOnHand}
              suffix={item.unit}
              valueStyle={item.isLowStock ? { color: '#ff4d4f' } : undefined}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Committed Stock" value={item.committedStock} suffix={item.unit} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Available Stock"
              value={item.availableStock}
              suffix={item.unit}
              valueStyle={item.availableStock < 0 ? { color: '#ff4d4f' } : undefined}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Stock Value" value={item.stockValue} prefix="RM" precision={2} />
          </Card>
        </Col>
      </Row>

      {/* Tabs */}
      <Card>
        <Tabs
          defaultActiveKey="details"
          items={[
            {
              key: 'details',
              label: 'Details',
              children: (
                <Descriptions bordered column={2}>
                  <Descriptions.Item label="SKU">{item.sku}</Descriptions.Item>
                  <Descriptions.Item label="Name">{item.name}</Descriptions.Item>
                  {item.nameMalay && (
                    <Descriptions.Item label="Name (BM)">{item.nameMalay}</Descriptions.Item>
                  )}
                  <Descriptions.Item label="Type">
                    <Tag color={typeColors[item.type]}>{item.type.replace('_', ' ')}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="Unit">{item.unit}</Descriptions.Item>
                  <Descriptions.Item label="Brand">{item.brand || '-'}</Descriptions.Item>
                  <Descriptions.Item label="Category">
                    {item.category?.name || '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Part Number">
                    {item.partNumber || '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Cross References" span={2}>
                    {item.crossReferences?.length
                      ? item.crossReferences.map((ref) => <Tag key={ref}>{ref}</Tag>)
                      : '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Vehicle Models" span={2}>
                    {item.vehicleModels?.length
                      ? item.vehicleModels.map((model) => <Tag key={model}>{model}</Tag>)
                      : '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Description" span={2}>
                    {item.description || '-'}
                  </Descriptions.Item>
                </Descriptions>
              ),
            },
            {
              key: 'pricing',
              label: 'Pricing & Tax',
              children: (
                <Descriptions bordered column={2}>
                  <Descriptions.Item label="Cost Price">
                    RM {Number(item.costPrice).toFixed(2)}
                  </Descriptions.Item>
                  <Descriptions.Item label="Selling Price">
                    RM {Number(item.sellingPrice).toFixed(2)}
                  </Descriptions.Item>
                  <Descriptions.Item label="Margin">
                    {(
                      ((Number(item.sellingPrice) - Number(item.costPrice)) /
                        Number(item.costPrice)) *
                      100
                    ).toFixed(1)}
                    %
                  </Descriptions.Item>
                  <Descriptions.Item label="Taxable">
                    {item.taxable ? 'Yes' : 'No'}
                  </Descriptions.Item>
                  {item.taxRate && (
                    <Descriptions.Item label="Tax Rate">
                      {item.taxRate.name} ({Number(item.taxRate.rate)}%)
                    </Descriptions.Item>
                  )}
                </Descriptions>
              ),
            },
            {
              key: 'stock',
              label: 'Stock Levels',
              children: (
                <div>
                  <Descriptions bordered column={3} style={{ marginBottom: 16 }}>
                    <Descriptions.Item label="Reorder Level">
                      {item.reorderLevel || 'Not set'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Reorder Qty">
                      {item.reorderQty || 'Not set'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Track Inventory">
                      {item.trackInventory ? 'Yes' : 'No'}
                    </Descriptions.Item>
                  </Descriptions>

                  <Title level={5} style={{ marginTop: 16, marginBottom: 12 }}>
                    Warehouse Stock
                  </Title>
                  <Table
                    columns={stockColumns}
                    dataSource={item.stockLevels}
                    rowKey="warehouseId"
                    pagination={false}
                    size="small"
                  />
                </div>
              ),
            },
            {
              key: 'tracking',
              label: 'Tracking',
              children: (
                <Descriptions bordered column={2}>
                  <Descriptions.Item label="Track Batches">
                    {item.trackBatches ? 'Yes' : 'No'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Track Serial Numbers">
                    {item.trackSerials ? 'Yes' : 'No'}
                  </Descriptions.Item>
                </Descriptions>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
