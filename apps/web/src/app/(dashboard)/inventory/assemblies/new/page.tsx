'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  Typography,
  Button,
  Space,
  Form,
  Select,
  InputNumber,
  Input,
  Table,
  Statistic,
  Row,
  Col,
  Alert,
  Spin,
} from 'antd';
import { ArrowLeftOutlined, CheckOutlined } from '@ant-design/icons';
import type { TableColumnsType } from 'antd';
import { useItems } from '@/hooks/use-items';
import { useWarehouses } from '@/hooks/use-inventory';
import { useBOM, useBOMAvailability, useCreateAssembly } from '@/hooks/use-composite';
import { AvailabilityIndicator } from '@/components/composite/AvailabilityIndicator';
import type { BOMComponent } from '@/lib/composite';

const { Title, Text } = Typography;

export default function NewAssemblyPage() {
  const router = useRouter();
  const [form] = Form.useForm();

  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: itemsResponse } = useItems({
    search: searchTerm,
    type: 'COMPOSITE',
    limit: 20,
  });
  const { data: warehouses } = useWarehouses();
  const { data: bom, isLoading: bomLoading } = useBOM(selectedItemId);
  const { data: availability, isLoading: availLoading } = useBOMAvailability(
    selectedItemId,
    selectedWarehouseId
  );

  const createAssembly = useCreateAssembly();

  const compositeItems = itemsResponse?.data || [];

  const handleSubmit = async () => {
    try {
      await form.validateFields();
      await createAssembly.mutateAsync({
        compositeItemId: selectedItemId,
        quantity,
        warehouseId: selectedWarehouseId,
        notes: form.getFieldValue('notes'),
      });
      router.push('/inventory/assemblies');
    } catch {
      // Form validation will handle errors
    }
  };

  const componentColumns: TableColumnsType<BOMComponent> = [
    {
      title: 'SKU',
      key: 'sku',
      width: 120,
      render: (_, record) => record.componentItem?.sku || '-',
    },
    {
      title: 'Component',
      key: 'name',
      render: (_, record) => record.componentItem?.name || '-',
    },
    {
      title: 'Unit',
      key: 'unit',
      width: 80,
      render: (_, record) => record.componentItem?.unit || '-',
    },
    {
      title: 'Per Unit',
      key: 'perUnit',
      width: 100,
      align: 'right',
      render: (_, record) => Number(record.quantity),
    },
    {
      title: 'Required',
      key: 'required',
      width: 100,
      align: 'right',
      render: (_, record) => (Number(record.quantity) * quantity).toFixed(2),
    },
    {
      title: 'Unit Cost',
      key: 'cost',
      width: 110,
      align: 'right',
      render: (_, record) => `RM ${Number(record.componentItem?.costPrice || 0).toFixed(2)}`,
    },
    {
      title: 'Total',
      key: 'total',
      width: 120,
      align: 'right',
      render: (_, record) =>
        `RM ${(Number(record.componentItem?.costPrice || 0) * Number(record.quantity) * quantity).toFixed(2)}`,
    },
  ];

  const totalCost = bom?.components
    ? bom.components.reduce(
        (sum, c) => sum + Number(c.componentItem?.costPrice || 0) * Number(c.quantity) * quantity,
        0
      )
    : 0;

  const canAssemble = availability ? availability.availableQty >= quantity : false;

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
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/inventory/assemblies')}>
            Back
          </Button>
          <Title level={4} style={{ margin: 0 }}>
            New Assembly Order
          </Title>
        </Space>
      </div>

      <Row gutter={16}>
        <Col xs={24} md={16}>
          <Card title="Assembly Details" style={{ marginBottom: 16 }}>
            <Form form={form} layout="vertical">
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="Composite Item"
                    name="compositeItemId"
                    rules={[{ required: true, message: 'Select a composite item' }]}
                  >
                    <Select
                      showSearch
                      placeholder="Search composite items..."
                      onSearch={setSearchTerm}
                      filterOption={false}
                      value={selectedItemId || undefined}
                      onChange={(value) => {
                        setSelectedItemId(value);
                        form.setFieldValue('compositeItemId', value);
                      }}
                      options={compositeItems.map((item) => ({
                        value: item.id,
                        label: `${item.sku} - ${item.name}`,
                      }))}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="Warehouse"
                    name="warehouseId"
                    rules={[{ required: true, message: 'Select a warehouse' }]}
                  >
                    <Select
                      placeholder="Select warehouse"
                      value={selectedWarehouseId || undefined}
                      onChange={(value) => {
                        setSelectedWarehouseId(value);
                        form.setFieldValue('warehouseId', value);
                      }}
                      options={warehouses?.map((w) => ({
                        value: w.id,
                        label: w.name,
                      }))}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col xs={24} md={8}>
                  <Form.Item
                    label="Quantity to Assemble"
                    name="quantity"
                    rules={[{ required: true, message: 'Enter quantity' }]}
                    initialValue={1}
                  >
                    <InputNumber
                      min={1}
                      style={{ width: '100%' }}
                      value={quantity}
                      onChange={(val) => setQuantity(val || 1)}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={16}>
                  <Form.Item label="Notes" name="notes">
                    <Input.TextArea rows={1} placeholder="Optional notes" />
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </Card>

          {/* BOM Components */}
          {selectedItemId && (
            <Card title="Components Required" style={{ marginBottom: 16 }}>
              {bomLoading ? (
                <Spin />
              ) : bom?.components && bom.components.length > 0 ? (
                <Table
                  columns={componentColumns}
                  dataSource={bom.components}
                  rowKey="id"
                  pagination={false}
                  size="small"
                  scroll={{ x: 700 }}
                  footer={() => (
                    <div style={{ textAlign: 'right' }}>
                      <Text strong>Total Assembly Cost: RM {totalCost.toFixed(2)}</Text>
                    </div>
                  )}
                />
              ) : (
                <Alert type="warning" message="No BOM components found for this item" showIcon />
              )}
            </Card>
          )}
        </Col>

        <Col xs={24} md={8}>
          {/* Cost Summary */}
          <Card title="Cost Summary" style={{ marginBottom: 16 }}>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Statistic title="Qty to Build" value={quantity} />
              </Col>
              <Col span={12}>
                <Statistic title="Total Cost" value={totalCost} prefix="RM" precision={2} />
              </Col>
              <Col span={24}>
                <Statistic
                  title="Cost per Unit"
                  value={quantity > 0 ? totalCost / quantity : 0}
                  prefix="RM"
                  precision={2}
                />
              </Col>
            </Row>
          </Card>

          {/* Availability */}
          {selectedItemId && selectedWarehouseId && (
            <div style={{ marginBottom: 16 }}>
              <AvailabilityIndicator availability={availability} isLoading={availLoading} />
            </div>
          )}

          {/* Create Button */}
          <Button
            type="primary"
            size="large"
            block
            icon={<CheckOutlined />}
            onClick={handleSubmit}
            loading={createAssembly.isPending}
            disabled={!selectedItemId || !selectedWarehouseId || !canAssemble}
          >
            Create Assembly Order
          </Button>

          {selectedItemId && selectedWarehouseId && !canAssemble && !availLoading && (
            <Alert
              type="error"
              message="Insufficient component stock to assemble the requested quantity"
              showIcon
              style={{ marginTop: 8 }}
            />
          )}
        </Col>
      </Row>
    </div>
  );
}
