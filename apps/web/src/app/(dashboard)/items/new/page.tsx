'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Card,
  Typography,
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  Button,
  Space,
  Row,
  Col,
  Divider,
} from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useCreateItem } from '@/hooks/use-items';
import { CreateItemDto } from '@/lib/items';
import { TaxRateSelect } from '@/components/tax';

const { Title, Text } = Typography;
const { TextArea } = Input;

export default function NewItemPage() {
  const router = useRouter();
  const [form] = Form.useForm();
  const createItem = useCreateItem();

  const handleSubmit = async (values: CreateItemDto) => {
    createItem.mutate(values, {
      onSuccess: (item) => {
        router.push(`/items/${item.id}`);
      },
    });
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Space style={{ marginBottom: 8 }}>
          <Link href="/items">
            <Button type="text" icon={<ArrowLeftOutlined />}>
              Back
            </Button>
          </Link>
        </Space>
        <Title level={4} style={{ margin: 0 }}>
          New Item
        </Title>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          type: 'INVENTORY',
          unit: 'PCS',
          taxable: true,
          trackInventory: true,
          trackBatches: false,
          trackSerials: false,
        }}
      >
        <Row gutter={24}>
          {/* Main Info */}
          <Col span={16}>
            <Card title="Basic Information">
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item
                    name="sku"
                    label="SKU"
                    rules={[{ required: true, message: 'Please enter SKU' }]}
                  >
                    <Input placeholder="e.g., BRK-001" maxLength={50} />
                  </Form.Item>
                </Col>
                <Col span={16}>
                  <Form.Item
                    name="name"
                    label="Name"
                    rules={[{ required: true, message: 'Please enter item name' }]}
                  >
                    <Input placeholder="Item name" maxLength={200} />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="nameMalay" label="Name (Bahasa Malaysia)">
                <Input placeholder="Nama item dalam Bahasa Malaysia" maxLength={200} />
              </Form.Item>

              <Form.Item name="description" label="Description">
                <TextArea rows={3} placeholder="Item description" maxLength={1000} />
              </Form.Item>

              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item
                    name="type"
                    label="Type"
                    rules={[{ required: true, message: 'Please select type' }]}
                  >
                    <Select
                      options={[
                        { value: 'INVENTORY', label: 'Inventory' },
                        { value: 'SERVICE', label: 'Service' },
                        { value: 'NON_INVENTORY', label: 'Non-Inventory' },
                      ]}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="unit"
                    label="Unit"
                    rules={[{ required: true, message: 'Please enter unit' }]}
                  >
                    <Select
                      showSearch
                      placeholder="Select or enter unit"
                      options={[
                        { value: 'PCS', label: 'Pieces (PCS)' },
                        { value: 'SET', label: 'Set (SET)' },
                        { value: 'BOX', label: 'Box (BOX)' },
                        { value: 'L', label: 'Liter (L)' },
                        { value: 'KG', label: 'Kilogram (KG)' },
                        { value: 'M', label: 'Meter (M)' },
                        { value: 'ROLL', label: 'Roll (ROLL)' },
                        { value: 'PAIR', label: 'Pair (PAIR)' },
                      ]}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="brand" label="Brand">
                    <Input placeholder="Brand name" maxLength={100} />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            <Card title="Part Information" style={{ marginTop: 16 }}>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="partNumber" label="Part Number">
                    <Input placeholder="OEM/Aftermarket part number" maxLength={50} />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="crossReferences" label="Cross References">
                <Select
                  mode="tags"
                  placeholder="Enter alternative part numbers"
                  tokenSeparators={[',']}
                />
              </Form.Item>

              <Form.Item name="vehicleModels" label="Vehicle Models">
                <Select
                  mode="tags"
                  placeholder="Enter compatible vehicle models"
                  tokenSeparators={[',']}
                />
              </Form.Item>
            </Card>

            <Card title="Pricing" style={{ marginTop: 16 }}>
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item
                    name="costPrice"
                    label="Cost Price (RM)"
                    rules={[{ required: true, message: 'Please enter cost price' }]}
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      min={0}
                      precision={2}
                      placeholder="0.00"
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="sellingPrice"
                    label="Selling Price (RM)"
                    rules={[{ required: true, message: 'Please enter selling price' }]}
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      min={0}
                      precision={2}
                      placeholder="0.00"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16} align="middle">
                <Col span={8}>
                  <Form.Item name="taxable" label="Taxable" valuePropName="checked">
                    <Switch checkedChildren="Yes" unCheckedChildren="No" />
                  </Form.Item>
                </Col>
                <Col span={16}>
                  <Form.Item
                    name="taxRateId"
                    label="Tax Rate"
                    extra="Default tax rate for this item"
                  >
                    <TaxRateSelect placeholder="Select tax rate (optional)" />
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          </Col>

          {/* Sidebar */}
          <Col span={8}>
            <Card title="Inventory Settings">
              <Form.Item name="trackInventory" label="Track Inventory" valuePropName="checked">
                <Switch checkedChildren="Yes" unCheckedChildren="No" />
              </Form.Item>

              <Divider />

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="reorderLevel" label="Reorder Level">
                    <InputNumber style={{ width: '100%' }} min={0} placeholder="0" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="reorderQty" label="Reorder Qty">
                    <InputNumber style={{ width: '100%' }} min={0} placeholder="0" />
                  </Form.Item>
                </Col>
              </Row>

              <Divider />

              <Form.Item name="trackBatches" label="Track Batches" valuePropName="checked">
                <Switch checkedChildren="Yes" unCheckedChildren="No" />
              </Form.Item>
              <Text type="secondary">
                Enable to track items by batch/lot numbers with expiry dates
              </Text>

              <Divider />

              <Form.Item name="trackSerials" label="Track Serial Numbers" valuePropName="checked">
                <Switch checkedChildren="Yes" unCheckedChildren="No" />
              </Form.Item>
              <Text type="secondary">
                Enable to track individual units by unique serial numbers
              </Text>
            </Card>

            <Card title="Opening Stock" style={{ marginTop: 16 }}>
              <Form.Item name="openingStock" label="Quantity">
                <InputNumber style={{ width: '100%' }} min={0} placeholder="0" />
              </Form.Item>
              <Text type="secondary">
                Enter opening stock quantity. Stock will be added to the default warehouse.
              </Text>
            </Card>
          </Col>
        </Row>

        {/* Actions */}
        <div
          style={{
            marginTop: 24,
            padding: '16px 0',
            borderTop: '1px solid #f0f0f0',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
          }}
        >
          <Link href="/items">
            <Button>Cancel</Button>
          </Link>
          <Button type="primary" htmlType="submit" loading={createItem.isPending}>
            Create Item
          </Button>
        </div>
      </Form>
    </div>
  );
}
