'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Timeline,
  Typography,
  Tag,
  Space,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Spin,
  Empty,
} from 'antd';
import {
  SwapOutlined,
  ArrowRightOutlined,
  PlusOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useSupersessionChain, useSupersedeItem, useItems } from '@/hooks/use-items';
import type { SupersessionChainNode } from '@/lib/items';

const { Text, Title } = Typography;

export interface SupersessionChainProps {
  /** Current item ID */
  itemId: string;
  /** Whether to show the "Supersede This Part" button */
  showSupersedeButton?: boolean;
}

/**
 * Visual chain/timeline showing supersession history for an item.
 * Each node shows the SKU, name, effective date, and reason.
 * The current item is highlighted.
 */
export function SupersessionChain({
  itemId,
  showSupersedeButton = true,
}: SupersessionChainProps) {
  const { data, isLoading, error } = useSupersessionChain(itemId);
  const [supersedeModalOpen, setSupersedeModalOpen] = useState(false);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
        <Spin />
      </div>
    );
  }

  if (error) {
    return (
      <Empty description="Failed to load supersession chain" />
    );
  }

  const chain = data?.chain || [];
  const hasChain = chain.length > 1;

  return (
    <div>
      {hasChain ? (
        <div>
          <Title level={5} style={{ marginBottom: 16 }}>
            <SwapOutlined style={{ marginRight: 8 }} />
            Supersession History
          </Title>
          <Timeline
            items={chain.map((node, index) => ({
              color: node.isCurrent ? 'blue' : index < chain.findIndex((n) => n.isCurrent) ? 'gray' : 'green',
              dot: node.isCurrent ? (
                <CheckCircleOutlined style={{ fontSize: 16, color: '#1677ff' }} />
              ) : undefined,
              children: (
                <ChainNode
                  node={node}
                  isLast={index === chain.length - 1}
                  currentItemId={itemId}
                />
              ),
            }))}
          />
        </div>
      ) : (
        <Empty
          description="No supersession history"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      )}

      {showSupersedeButton && (
        <div style={{ marginTop: hasChain ? 0 : 16, textAlign: hasChain ? 'left' : 'center' }}>
          <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={() => setSupersedeModalOpen(true)}
          >
            Supersede This Part
          </Button>
        </div>
      )}

      <SupersedeModal
        itemId={itemId}
        open={supersedeModalOpen}
        onClose={() => setSupersedeModalOpen(false)}
      />
    </div>
  );
}

function ChainNode({
  node,
  isLast,
  currentItemId,
}: {
  node: SupersessionChainNode;
  isLast: boolean;
  currentItemId: string;
}) {
  const isLink = node.id !== currentItemId;

  return (
    <div
      style={{
        padding: '4px 0',
        ...(node.isCurrent
          ? {
              background: '#e6f4ff',
              borderRadius: 6,
              padding: '8px 12px',
              margin: '-4px -12px',
            }
          : {}),
      }}
    >
      <Space>
        {isLink ? (
          <Link href={`/items/${node.id}`}>
            <Text strong style={{ color: '#1677ff' }}>
              {node.sku}
            </Text>
          </Link>
        ) : (
          <Text strong>{node.sku}</Text>
        )}
        {node.isCurrent && (
          <Tag color="blue" bordered={false}>
            Current
          </Tag>
        )}
      </Space>
      <div>
        <Text type="secondary" style={{ fontSize: 13 }}>
          {node.name}
        </Text>
      </div>
      {node.effectiveDate && (
        <div style={{ marginTop: 2 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {node.isCurrent ? 'Effective' : 'Superseded'}: {dayjs(node.effectiveDate).format('DD MMM YYYY')}
          </Text>
          {node.reason && (
            <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
              - {node.reason}
            </Text>
          )}
        </div>
      )}
      {!isLast && !node.isCurrent && (
        <ArrowRightOutlined
          style={{
            position: 'absolute',
            right: -20,
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#bbb',
            fontSize: 10,
          }}
        />
      )}
    </div>
  );
}

function SupersedeModal({
  itemId,
  open,
  onClose,
}: {
  itemId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [form] = Form.useForm();
  const [searchText, setSearchText] = useState('');
  const { data: itemsData, isLoading: itemsLoading } = useItems({
    search: searchText,
    limit: 20,
    status: 'ACTIVE',
  });
  const supersedeItem = useSupersedeItem();

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      await supersedeItem.mutateAsync({
        itemId,
        data: {
          newItemId: values.newItemId,
          reason: values.reason || undefined,
        },
      });
      form.resetFields();
      onClose();
    } catch {
      // Form validation or mutation error handled by hook
    }
  };

  const itemOptions = (itemsData?.data || [])
    .filter((item) => item.id !== itemId)
    .map((item) => ({
      value: item.id,
      label: `${item.sku} - ${item.name}`,
    }));

  return (
    <Modal
      title="Supersede This Part"
      open={open}
      onCancel={() => {
        form.resetFields();
        onClose();
      }}
      onOk={handleSubmit}
      okText="Create Supersession"
      okButtonProps={{
        loading: supersedeItem.isPending,
        icon: <SwapOutlined />,
      }}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="newItemId"
          label="New Item (Replacement)"
          rules={[{ required: true, message: 'Please select the replacement item' }]}
        >
          <Select
            showSearch
            placeholder="Search for replacement item..."
            filterOption={false}
            onSearch={setSearchText}
            loading={itemsLoading}
            options={itemOptions}
            notFoundContent={
              itemsLoading ? (
                <Spin size="small" />
              ) : searchText ? (
                'No items found'
              ) : (
                'Type to search items'
              )
            }
          />
        </Form.Item>

        <Form.Item name="reason" label="Reason (Optional)">
          <Input.TextArea
            placeholder="e.g., Updated design, manufacturer discontinued, improved version..."
            rows={3}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
