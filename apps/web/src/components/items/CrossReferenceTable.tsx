'use client';

import { useState } from 'react';
import { Table, Button, Space, Popconfirm, Typography, Empty } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { TableColumnsType } from 'antd';
import {
  useCrossReferences,
  useAddCrossReference,
  useUpdateCrossReference,
  useDeleteCrossReference,
} from '@/hooks/use-items';
import type { CrossReference, CreateCrossReferenceDto } from '@/lib/items';
import { AddCrossReferenceModal } from './AddCrossReferenceModal';

const { Text } = Typography;

interface CrossReferenceTableProps {
  itemId: string;
}

export function CrossReferenceTable({ itemId }: CrossReferenceTableProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<CrossReference | null>(null);

  const { data: crossReferences, isLoading } = useCrossReferences(itemId);
  const addCrossRef = useAddCrossReference();
  const updateCrossRef = useUpdateCrossReference();
  const deleteCrossRef = useDeleteCrossReference();

  const handleAdd = () => {
    setEditingRecord(null);
    setModalOpen(true);
  };

  const handleEdit = (record: CrossReference) => {
    setEditingRecord(record);
    setModalOpen(true);
  };

  const handleModalSubmit = (values: CreateCrossReferenceDto) => {
    if (editingRecord) {
      updateCrossRef.mutate(
        {
          crossRefId: editingRecord.id,
          itemId,
          data: values,
        },
        {
          onSuccess: () => setModalOpen(false),
        },
      );
    } else {
      addCrossRef.mutate(
        { itemId, data: values },
        {
          onSuccess: () => setModalOpen(false),
        },
      );
    }
  };

  const handleDelete = (record: CrossReference) => {
    deleteCrossRef.mutate({ crossRefId: record.id, itemId });
  };

  const columns: TableColumnsType<CrossReference> = [
    {
      title: 'OEM Number',
      dataIndex: 'oemNumber',
      key: 'oemNumber',
      render: (value: string) => <Text strong>{value}</Text>,
    },
    {
      title: 'Aftermarket Number',
      dataIndex: 'aftermarketNumber',
      key: 'aftermarketNumber',
      render: (value: string | null) => value || '-',
    },
    {
      title: 'Brand',
      dataIndex: 'brand',
      key: 'brand',
      render: (value: string | null) => value || '-',
    },
    {
      title: 'Notes',
      dataIndex: 'notes',
      key: 'notes',
      ellipsis: true,
      render: (value: string | null) => value || '-',
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      align: 'center',
      render: (_: unknown, record: CrossReference) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="Delete cross-reference"
            description="Are you sure you want to delete this cross-reference?"
            onConfirm={() => handleDelete(record)}
            okText="Delete"
            okType="danger"
            cancelText="Cancel"
          >
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <Text strong>Part Number Cross-References</Text>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          Add Cross-Reference
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={crossReferences || []}
        rowKey="id"
        loading={isLoading}
        pagination={false}
        size="small"
        locale={{
          emptyText: (
            <Empty
              description="No cross-references added yet"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ),
        }}
      />

      <AddCrossReferenceModal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onSubmit={handleModalSubmit}
        loading={addCrossRef.isPending || updateCrossRef.isPending}
        editingRecord={editingRecord}
      />
    </div>
  );
}
