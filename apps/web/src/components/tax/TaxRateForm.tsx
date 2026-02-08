'use client';

import { useEffect } from 'react';
import { Modal, Form, Input, InputNumber, Select, Switch, DatePicker, Row, Col } from 'antd';
import dayjs from 'dayjs';
import {
  TaxRate,
  TAX_TYPE_LABELS,
  TAX_REGIME_LABELS,
  CreateTaxRateDto,
  UpdateTaxRateDto,
} from '@/lib/tax-rates';
import { useCreateTaxRate, useUpdateTaxRate } from '@/hooks/use-tax-rates';

const { TextArea } = Input;

interface TaxRateFormProps {
  open: boolean;
  taxRate?: TaxRate | null;
  onClose: () => void;
  onSuccess?: () => void;
}

const taxTypeOptions = Object.entries(TAX_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

const taxRegimeOptions = [
  { value: '', label: 'None' },
  ...Object.entries(TAX_REGIME_LABELS).map(([value, label]) => ({
    value,
    label,
  })),
];

export function TaxRateForm({ open, taxRate, onClose, onSuccess }: TaxRateFormProps) {
  const [form] = Form.useForm();
  const createTaxRate = useCreateTaxRate();
  const updateTaxRate = useUpdateTaxRate();
  const isEditing = !!taxRate;

  useEffect(() => {
    if (open) {
      if (taxRate) {
        form.setFieldsValue({
          ...taxRate,
          effectiveFrom: taxRate.effectiveFrom ? dayjs(taxRate.effectiveFrom) : null,
          effectiveTo: taxRate.effectiveTo ? dayjs(taxRate.effectiveTo) : null,
        });
      } else {
        form.resetFields();
        form.setFieldsValue({
          type: 'SST',
          rate: 0,
          isActive: true,
          isDefault: false,
        });
      }
    }
  }, [open, taxRate, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const data: CreateTaxRateDto | UpdateTaxRateDto = {
        ...values,
        code: values.code?.toUpperCase(),
        taxRegime: values.taxRegime || null,
        effectiveFrom: values.effectiveFrom?.toISOString(),
        effectiveTo: values.effectiveTo?.toISOString(),
      };

      if (isEditing && taxRate) {
        await updateTaxRate.mutateAsync({ id: taxRate.id, data: data as UpdateTaxRateDto });
      } else {
        await createTaxRate.mutateAsync(data as CreateTaxRateDto);
      }

      onClose();
      onSuccess?.();
    } catch (error) {
      // Form validation error - ignore
    }
  };

  return (
    <Modal
      title={isEditing ? 'Edit Tax Rate' : 'Add Tax Rate'}
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      okText={isEditing ? 'Save Changes' : 'Create Tax Rate'}
      confirmLoading={createTaxRate.isPending || updateTaxRate.isPending}
      width={600}
      destroyOnClose
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Row gutter={16}>
          <Col span={16}>
            <Form.Item
              name="name"
              label="Name"
              rules={[
                { required: true, message: 'Please enter tax rate name' },
                { max: 100, message: 'Name must be less than 100 characters' },
              ]}
            >
              <Input placeholder="e.g., Sales Tax 10%" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="code"
              label="Code"
              rules={[
                { required: true, message: 'Please enter tax code' },
                { max: 20, message: 'Code must be less than 20 characters' },
                {
                  pattern: /^[A-Za-z0-9]+$/,
                  message: 'Code must contain only letters and numbers',
                },
              ]}
              normalize={(value) => value?.toUpperCase()}
            >
              <Input placeholder="e.g., ST10" style={{ textTransform: 'uppercase' }} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              name="type"
              label="Type"
              rules={[{ required: true, message: 'Please select tax type' }]}
            >
              <Select options={taxTypeOptions} placeholder="Select tax type" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="taxRegime"
              label="Tax Regime"
              tooltip="Malaysian tax regime period this rate belongs to"
            >
              <Select
                options={taxRegimeOptions}
                placeholder="Select regime"
                allowClear
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="rate"
              label="Rate (%)"
              rules={[
                { required: true, message: 'Please enter tax rate' },
                { type: 'number', min: 0, max: 100, message: 'Rate must be between 0 and 100' },
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                max={100}
                precision={2}
                placeholder="0"
                addonAfter="%"
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="description" label="Description">
          <TextArea rows={2} placeholder="Description of this tax rate" maxLength={500} />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="effectiveFrom" label="Effective From">
              <DatePicker style={{ width: '100%' }} placeholder="Select start date" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="effectiveTo" label="Effective To">
              <DatePicker style={{ width: '100%' }} placeholder="Select end date" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={24}>
          <Col span={8}>
            <Form.Item name="isActive" label="Active" valuePropName="checked">
              <Switch checkedChildren="Yes" unCheckedChildren="No" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="isDefault" label="Default Rate" valuePropName="checked">
              <Switch checkedChildren="Yes" unCheckedChildren="No" />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
}
