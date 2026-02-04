'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Card,
  Form,
  Input,
  Button,
  Space,
  Typography,
  Breadcrumb,
  Divider,
  Tag,
  Empty,
  Alert,
} from 'antd';
import {
  HomeOutlined,
  PlusOutlined,
  MinusCircleOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import { useCreateItemGroup } from '@/hooks/use-item-groups';
import { countPossibleVariants, type Attribute } from '@/lib/item-groups';

const { Title, Text, Paragraph } = Typography;

interface FormValues {
  name: string;
  description?: string;
  attributes: Array<{
    name: string;
    valuesText: string;
  }>;
}

export default function NewItemGroupPage() {
  const router = useRouter();
  const [form] = Form.useForm<FormValues>();
  const createMutation = useCreateItemGroup();

  const [attributes, setAttributes] = useState<Attribute[]>([]);

  const handleAttributeChange = () => {
    const formAttrs = form.getFieldValue('attributes') || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsed: Attribute[] = formAttrs
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((attr: any) => attr?.name && attr?.valuesText)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((attr: any) => ({
        name: attr.name.trim(),
        values: attr.valuesText
          .split(',')
          .map((v: string) => v.trim())
          .filter(Boolean),
      }))
      .filter((attr: Attribute) => attr.values.length > 0);
    setAttributes(parsed);
  };

  const handleSubmit = async (values: FormValues) => {
    const parsedAttributes: Attribute[] = (values.attributes || [])
      .filter((attr) => attr?.name && attr?.valuesText)
      .map((attr) => ({
        name: attr.name.trim(),
        values: attr.valuesText
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean),
      }))
      .filter((attr) => attr.values.length > 0);

    try {
      const result = await createMutation.mutateAsync({
        name: values.name,
        description: values.description,
        attributes: parsedAttributes,
      });
      router.push(`/items/groups/${result.id}`);
    } catch {
      // Error handled by mutation
    }
  };

  const variantCount = countPossibleVariants(attributes);

  return (
    <div>
      <Breadcrumb
        style={{ marginBottom: 24 }}
        items={[
          {
            title: (
              <Link href="/">
                <HomeOutlined />
              </Link>
            ),
          },
          {
            title: <Link href="/items">Items</Link>,
          },
          {
            title: <Link href="/items/groups">Item Groups</Link>,
          },
          {
            title: 'New Group',
          },
        ]}
      />

      <Title level={4} style={{ marginBottom: 24 }}>
        <Space>
          <AppstoreOutlined />
          Create Item Group
        </Space>
      </Title>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        onValuesChange={handleAttributeChange}
        initialValues={{ attributes: [{ name: '', valuesText: '' }] }}
      >
        <Card title="Basic Information" style={{ marginBottom: 24 }}>
          <Form.Item
            name="name"
            label="Group Name"
            rules={[{ required: true, message: 'Please enter a group name' }]}
          >
            <Input placeholder="e.g., T-Shirts, Motor Oil, Brake Pads" />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} placeholder="Describe this item group and its variants" />
          </Form.Item>
        </Card>

        <Card title="Variant Attributes" style={{ marginBottom: 24 }}>
          <Paragraph type="secondary" style={{ marginBottom: 16 }}>
            Define the attributes that make up your variants. For example, Size (S, M, L) and Color
            (Red, Blue). Each unique combination of attribute values will create a variant.
          </Paragraph>

          <Form.List name="attributes">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Space key={key} style={{ display: 'flex', marginBottom: 12 }} align="start">
                    <Form.Item
                      {...restField}
                      name={[name, 'name']}
                      rules={[{ required: true, message: 'Enter attribute name' }]}
                      style={{ marginBottom: 0, width: 200 }}
                    >
                      <Input placeholder="Attribute name (e.g., Size)" />
                    </Form.Item>

                    <Form.Item
                      {...restField}
                      name={[name, 'valuesText']}
                      rules={[{ required: true, message: 'Enter values' }]}
                      style={{ marginBottom: 0, flex: 1, minWidth: 300 }}
                      extra="Comma-separated values"
                    >
                      <Input placeholder="Values (e.g., S, M, L, XL)" />
                    </Form.Item>

                    {fields.length > 1 && (
                      <Button
                        type="text"
                        danger
                        icon={<MinusCircleOutlined />}
                        onClick={() => remove(name)}
                      />
                    )}
                  </Space>
                ))}

                <Form.Item>
                  <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                    Add Attribute
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>

          <Divider />

          <Title level={5}>Preview</Title>

          {attributes.length > 0 ? (
            <>
              <Space direction="vertical" style={{ width: '100%' }}>
                {attributes.map((attr) => (
                  <div key={attr.name}>
                    <Text strong>{attr.name}: </Text>
                    <Space wrap>
                      {attr.values.map((value) => (
                        <Tag key={value} color="blue">
                          {value}
                        </Tag>
                      ))}
                    </Space>
                  </div>
                ))}
              </Space>

              <Alert
                type="info"
                showIcon
                style={{ marginTop: 16 }}
                message={
                  <span>
                    This configuration will generate{' '}
                    <strong>{variantCount} possible variants</strong> when you create items for this
                    group.
                  </span>
                }
              />
            </>
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="Enter attributes above to see preview"
            />
          )}
        </Card>

        <Card>
          <Space>
            <Button
              type="primary"
              htmlType="submit"
              loading={createMutation.isPending}
              disabled={attributes.length === 0}
            >
              Create Item Group
            </Button>
            <Button onClick={() => router.push('/items/groups')}>Cancel</Button>
          </Space>
        </Card>
      </Form>
    </div>
  );
}
