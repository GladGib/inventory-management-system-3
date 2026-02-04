'use client';

import { useEffect } from 'react';
import { Modal, Form, Input, Select, Switch, Row, Col, Space, Typography, Divider } from 'antd';
import { EnvironmentOutlined } from '@ant-design/icons';
import type { Address, CreateAddressDto, UpdateAddressDto } from '@/lib/addresses';

const { Text } = Typography;

const MALAYSIAN_STATES = [
  'Johor',
  'Kedah',
  'Kelantan',
  'Kuala Lumpur',
  'Labuan',
  'Melaka',
  'Negeri Sembilan',
  'Pahang',
  'Penang',
  'Perak',
  'Perlis',
  'Putrajaya',
  'Sabah',
  'Sarawak',
  'Selangor',
  'Terengganu',
];

interface AddressFormProps {
  open: boolean;
  address?: Address;
  loading?: boolean;
  onSubmit: (values: CreateAddressDto | UpdateAddressDto) => void;
  onCancel: () => void;
}

export function AddressForm({
  open,
  address,
  loading = false,
  onSubmit,
  onCancel,
}: AddressFormProps) {
  const [form] = Form.useForm();
  const isEdit = !!address;

  useEffect(() => {
    if (open) {
      if (address) {
        form.setFieldsValue(address);
      } else {
        form.resetFields();
        form.setFieldsValue({
          country: 'Malaysia',
          isBilling: true,
          isShipping: true,
          isDefault: false,
        });
      }
    }
  }, [open, address, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      onSubmit(values);
    } catch {
      // Validation failed
    }
  };

  return (
    <Modal
      title={
        <Space>
          <EnvironmentOutlined />
          {isEdit ? 'Edit Address' : 'Add Address'}
        </Space>
      }
      open={open}
      onOk={handleSubmit}
      onCancel={onCancel}
      okText={isEdit ? 'Save Changes' : 'Add Address'}
      confirmLoading={loading}
      width={600}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          country: 'Malaysia',
          isBilling: true,
          isShipping: true,
          isDefault: false,
        }}
      >
        <Form.Item
          name="label"
          label="Address Label"
          rules={[{ required: true, message: 'Please enter a label' }]}
        >
          <Input placeholder="e.g., Main Office, Warehouse KL, Branch PJ" />
        </Form.Item>

        <Form.Item
          name="addressLine1"
          label="Address Line 1"
          rules={[{ required: true, message: 'Please enter address' }]}
        >
          <Input placeholder="Street address, P.O. box, company name" />
        </Form.Item>

        <Form.Item name="addressLine2" label="Address Line 2">
          <Input placeholder="Apartment, suite, unit, building, floor, etc." />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="city"
              label="City"
              rules={[{ required: true, message: 'Please enter city' }]}
            >
              <Input placeholder="City" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="state"
              label="State"
              rules={[{ required: true, message: 'Please select state' }]}
            >
              <Select placeholder="Select state" showSearch optionFilterProp="children">
                {MALAYSIAN_STATES.map((state) => (
                  <Select.Option key={state} value={state}>
                    {state}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="postcode"
              label="Postcode"
              rules={[
                { required: true, message: 'Please enter postcode' },
                {
                  pattern: /^\d{5}$/,
                  message: 'Postcode must be 5 digits',
                },
              ]}
            >
              <Input placeholder="5-digit postcode" maxLength={5} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="country" label="Country">
              <Input disabled />
            </Form.Item>
          </Col>
        </Row>

        <Divider />

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="attention" label="Attention To">
              <Input placeholder="Contact person at this address" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="phone" label="Phone">
              <Input placeholder="Phone number for this address" />
            </Form.Item>
          </Col>
        </Row>

        <Divider />

        <Row gutter={24}>
          <Col span={8}>
            <Form.Item name="isBilling" valuePropName="checked" label="Billing Address">
              <Switch checkedChildren="Yes" unCheckedChildren="No" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="isShipping" valuePropName="checked" label="Shipping Address">
              <Switch checkedChildren="Yes" unCheckedChildren="No" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="isDefault" valuePropName="checked" label="Default Address">
              <Switch checkedChildren="Yes" unCheckedChildren="No" />
            </Form.Item>
          </Col>
        </Row>

        <Text type="secondary" style={{ fontSize: 12 }}>
          Billing and shipping addresses will appear as options when creating invoices, sales
          orders, and other transactions.
        </Text>
      </Form>
    </Modal>
  );
}
