'use client';

import { useRouter } from 'next/navigation';
import {
  Card,
  Form,
  Input,
  Select,
  InputNumber,
  DatePicker,
  Switch,
  Button,
  Typography,
  Space,
  Divider,
} from 'antd';
import { SaveOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useCreatePriceList } from '@/hooks/use-price-lists';
import type { CreatePriceListDto } from '@/lib/price-lists';

const { Title } = Typography;
const { TextArea } = Input;

export default function NewPriceListPage() {
  const router = useRouter();
  const [form] = Form.useForm();
  const createMutation = useCreatePriceList();

  const markupType = Form.useWatch('markupType', form);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onFinish = async (values: Record<string, any>) => {
    const dto: CreatePriceListDto = {
      name: values.name,
      description: values.description,
      type: values.type,
      markupType: values.markupType,
      markupValue: values.markupValue || 0,
      isDefault: values.isDefault || false,
      effectiveFrom: values.effectiveDates?.[0]
        ? values.effectiveDates[0].toISOString()
        : undefined,
      effectiveTo: values.effectiveDates?.[1] ? values.effectiveDates[1].toISOString() : undefined,
    };

    try {
      const result = await createMutation.mutateAsync(dto);
      router.push(`/settings/price-lists/${result.id}`);
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <div>
      <Space style={{ marginBottom: 24 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/settings/price-lists')}>
          Back
        </Button>
        <Title level={4} style={{ margin: 0 }}>
          Create Price List
        </Title>
      </Space>

      <Card style={{ maxWidth: 700 }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            type: 'SALES',
            markupType: 'PERCENTAGE',
            markupValue: 0,
            isDefault: false,
          }}
        >
          <Form.Item
            name="name"
            label="Price List Name"
            rules={[{ required: true, message: 'Please enter a name' }]}
          >
            <Input placeholder="e.g., VIP Customer Pricing" />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <TextArea rows={3} placeholder="Optional description" />
          </Form.Item>

          <Form.Item name="type" label="Type" rules={[{ required: true }]}>
            <Select
              options={[
                { label: 'Sales', value: 'SALES' },
                { label: 'Purchase', value: 'PURCHASE' },
              ]}
            />
          </Form.Item>

          <Divider />
          <Title level={5}>Markup Settings</Title>

          <Space align="start" size={16}>
            <Form.Item name="markupType" label="Markup Type" rules={[{ required: true }]}>
              <Select
                style={{ width: 200 }}
                options={[
                  { label: 'Percentage (%)', value: 'PERCENTAGE' },
                  { label: 'Fixed Amount (RM)', value: 'FIXED' },
                ]}
              />
            </Form.Item>

            <Form.Item
              name="markupValue"
              label="Markup Value"
              rules={[{ required: true, message: 'Please enter markup value' }]}
            >
              <InputNumber
                style={{ width: 200 }}
                placeholder={markupType === 'PERCENTAGE' ? 'e.g., 10' : 'e.g., 5.00'}
                addonAfter={markupType === 'PERCENTAGE' ? '%' : 'RM'}
                step={markupType === 'PERCENTAGE' ? 1 : 0.01}
              />
            </Form.Item>
          </Space>

          <Divider />
          <Title level={5}>Effective Period</Title>

          <Form.Item
            name="effectiveDates"
            label="Effective Date Range"
            extra="Leave empty for always effective"
          >
            <DatePicker.RangePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="isDefault"
            label="Set as Default"
            valuePropName="checked"
            extra="Default price list is automatically applied when no specific list is assigned"
          >
            <Switch checkedChildren="Yes" unCheckedChildren="No" />
          </Form.Item>

          <Divider />

          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SaveOutlined />}
                loading={createMutation.isPending}
              >
                Create Price List
              </Button>
              <Button onClick={() => router.push('/settings/price-lists')}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
