'use client';

import {
  Drawer,
  Table,
  Tag,
  Typography,
  Space,
  Button,
  Descriptions,
  Empty,
  Spin,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
} from 'antd';
import {
  ImportOutlined,
  ExportOutlined,
} from '@ant-design/icons';
import { useState } from 'react';
import { useBinStock, usePutAway, usePick } from '@/hooks/use-bins';
import { useStockLevels } from '@/hooks/use-inventory';
import type { Bin, BinStock } from '@/types/models';
import { BinType } from '@/types/enums';
import type { TableColumnsType } from 'antd';

const { Title, Text } = Typography;

const BIN_TYPE_LABELS: Record<BinType, string> = {
  [BinType.STORAGE]: 'Storage',
  [BinType.PICKING]: 'Picking',
  [BinType.RECEIVING]: 'Receiving',
  [BinType.SHIPPING]: 'Shipping',
  [BinType.STAGING]: 'Staging',
};

interface BinStockDrawerProps {
  bin: Bin | null;
  warehouseId: string;
  open: boolean;
  onClose: () => void;
}

export function BinStockDrawer({
  bin,
  warehouseId,
  open,
  onClose,
}: BinStockDrawerProps) {
  const [putAwayModalOpen, setPutAwayModalOpen] = useState(false);
  const [pickModalOpen, setPickModalOpen] = useState(false);
  const [form] = Form.useForm();

  const { data: binStockDetail, isLoading } = useBinStock(bin?.id || '');
  const { data: stockLevels } = useStockLevels({ warehouseId });
  const putAwayMutation = usePutAway(warehouseId);
  const pickMutation = usePick(warehouseId);

  const stockColumns: TableColumnsType<BinStock> = [
    {
      title: 'SKU',
      key: 'sku',
      width: 120,
      render: (_, record) => (
        <Text code style={{ fontSize: 12 }}>
          {record.item?.sku}
        </Text>
      ),
    },
    {
      title: 'Item Name',
      key: 'name',
      ellipsis: true,
      render: (_, record) => record.item?.name || '-',
    },
    {
      title: 'Unit',
      key: 'unit',
      width: 70,
      render: (_, record) => record.item?.unit || '-',
    },
    {
      title: 'Quantity',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100,
      align: 'right',
      render: (qty: number) => <Text strong>{qty}</Text>,
    },
    {
      title: 'Value',
      key: 'value',
      width: 120,
      align: 'right',
      render: (_, record) => {
        const value = record.quantity * (record.item?.costPrice || 0);
        return `RM ${value.toFixed(2)}`;
      },
    },
  ];

  const handlePutAway = async (values: { itemId: string; quantity: number }) => {
    if (!bin) return;
    await putAwayMutation.mutateAsync({
      binId: bin.id,
      itemId: values.itemId,
      quantity: values.quantity,
    });
    setPutAwayModalOpen(false);
    form.resetFields();
  };

  const handlePick = async (values: { itemId: string; quantity: number }) => {
    if (!bin) return;
    await pickMutation.mutateAsync({
      binId: bin.id,
      itemId: values.itemId,
      quantity: values.quantity,
    });
    setPickModalOpen(false);
    form.resetFields();
  };

  const itemOptions = (stockLevels || [])
    .filter((sl) => Number(sl.stockOnHand) > 0)
    .map((sl) => ({
      value: sl.item.id,
      label: `${sl.item.sku} - ${sl.item.name}`,
    }));

  const binStockItemOptions = (binStockDetail?.stocks || [])
    .filter((bs) => bs.quantity > 0)
    .map((bs) => ({
      value: bs.itemId,
      label: `${bs.item?.sku} - ${bs.item?.name} (Qty: ${bs.quantity})`,
      maxQty: bs.quantity,
    }));

  return (
    <>
      <Drawer
        title={
          <Space>
            <span>Bin Details</span>
            {bin && (
              <Tag color="blue" style={{ marginLeft: 8 }}>
                {bin.code}
              </Tag>
            )}
          </Space>
        }
        placement="right"
        width={600}
        open={open}
        onClose={onClose}
        extra={
          bin?.isActive && (
            <Space>
              <Button
                type="primary"
                icon={<ImportOutlined />}
                onClick={() => setPutAwayModalOpen(true)}
                size="small"
              >
                Put Away
              </Button>
              <Button
                icon={<ExportOutlined />}
                onClick={() => setPickModalOpen(true)}
                size="small"
                disabled={!binStockDetail?.stocks?.length}
              >
                Pick
              </Button>
            </Space>
          )
        }
      >
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin size="large" />
          </div>
        ) : binStockDetail ? (
          <>
            <Descriptions
              column={2}
              size="small"
              style={{ marginBottom: 24 }}
            >
              <Descriptions.Item label="Code">
                <Text strong>{binStockDetail.bin.code}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Type">
                <Tag>{BIN_TYPE_LABELS[binStockDetail.bin.type]}</Tag>
              </Descriptions.Item>
              {binStockDetail.bin.name && (
                <Descriptions.Item label="Name" span={2}>
                  {binStockDetail.bin.name}
                </Descriptions.Item>
              )}
              <Descriptions.Item label="Total Items">
                {binStockDetail.totalItems}
              </Descriptions.Item>
              <Descriptions.Item label="Total Quantity">
                {binStockDetail.totalQuantity}
              </Descriptions.Item>
              {binStockDetail.bin.maxCapacity && (
                <Descriptions.Item label="Max Capacity">
                  {binStockDetail.bin.maxCapacity}
                </Descriptions.Item>
              )}
              <Descriptions.Item label="Status">
                <Tag color={binStockDetail.bin.isActive ? 'green' : 'red'}>
                  {binStockDetail.bin.isActive ? 'Active' : 'Inactive'}
                </Tag>
              </Descriptions.Item>
            </Descriptions>

            <Title level={5} style={{ marginBottom: 12 }}>
              Stock in Bin
            </Title>

            {binStockDetail.stocks.length > 0 ? (
              <Table
                columns={stockColumns}
                dataSource={binStockDetail.stocks}
                rowKey="id"
                size="small"
                pagination={false}
                summary={(data) => {
                  const totalQty = data.reduce((sum, r) => sum + r.quantity, 0);
                  const totalValue = data.reduce(
                    (sum, r) => sum + r.quantity * (r.item?.costPrice || 0),
                    0,
                  );
                  return (
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={3}>
                        <Text strong>Total</Text>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={1} align="right">
                        <Text strong>{totalQty}</Text>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={2} align="right">
                        <Text strong>RM {totalValue.toFixed(2)}</Text>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  );
                }}
              />
            ) : (
              <Empty description="No items in this bin" />
            )}
          </>
        ) : (
          <Empty description="Select a bin to view details" />
        )}
      </Drawer>

      {/* Put Away Modal */}
      <Modal
        title="Put Away Item"
        open={putAwayModalOpen}
        onCancel={() => {
          setPutAwayModalOpen(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        confirmLoading={putAwayMutation.isPending}
      >
        <Form form={form} layout="vertical" onFinish={handlePutAway}>
          <Form.Item
            name="itemId"
            label="Item"
            rules={[{ required: true, message: 'Please select an item' }]}
          >
            <Select
              showSearch
              placeholder="Select item..."
              options={itemOptions}
              optionFilterProp="label"
            />
          </Form.Item>
          <Form.Item
            name="quantity"
            label="Quantity"
            rules={[
              { required: true, message: 'Please enter quantity' },
              { type: 'number', min: 0.0001, message: 'Quantity must be positive' },
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0.0001}
              step={1}
              placeholder="Enter quantity"
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Pick Modal */}
      <Modal
        title="Pick Item"
        open={pickModalOpen}
        onCancel={() => {
          setPickModalOpen(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        confirmLoading={pickMutation.isPending}
      >
        <Form form={form} layout="vertical" onFinish={handlePick}>
          <Form.Item
            name="itemId"
            label="Item"
            rules={[{ required: true, message: 'Please select an item' }]}
          >
            <Select
              showSearch
              placeholder="Select item from bin..."
              options={binStockItemOptions}
              optionFilterProp="label"
            />
          </Form.Item>
          <Form.Item
            name="quantity"
            label="Quantity"
            rules={[
              { required: true, message: 'Please enter quantity' },
              { type: 'number', min: 0.0001, message: 'Quantity must be positive' },
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0.0001}
              step={1}
              placeholder="Enter quantity to pick"
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
