'use client';

import { useEffect } from 'react';
import { Modal, Form, Input } from 'antd';
import type { CrossReference, CreateCrossReferenceDto } from '@/lib/items';

interface AddCrossReferenceModalProps {
  open: boolean;
  onCancel: () => void;
  onSubmit: (values: CreateCrossReferenceDto) => void;
  loading?: boolean;
  /** If provided, the modal will be in edit mode */
  editingRecord?: CrossReference | null;
}

export function AddCrossReferenceModal({
  open,
  onCancel,
  onSubmit,
  loading = false,
  editingRecord,
}: AddCrossReferenceModalProps) {
  const [form] = Form.useForm<CreateCrossReferenceDto>();

  useEffect(() => {
    if (open && editingRecord) {
      form.setFieldsValue({
        oemNumber: editingRecord.oemNumber,
        aftermarketNumber: editingRecord.aftermarketNumber || undefined,
        brand: editingRecord.brand || undefined,
        notes: editingRecord.notes || undefined,
      });
    } else if (open) {
      form.resetFields();
    }
  }, [open, editingRecord, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      onSubmit(values);
    } catch {
      // validation errors shown by form
    }
  };

  return (
    <Modal
      title={editingRecord ? 'Edit Cross-Reference' : 'Add Cross-Reference'}
      open={open}
      onOk={handleOk}
      onCancel={onCancel}
      okText={editingRecord ? 'Update' : 'Add'}
      confirmLoading={loading}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        style={{ marginTop: 16 }}
      >
        <Form.Item
          name="oemNumber"
          label="OEM Number"
          rules={[
            { required: true, message: 'OEM Number is required' },
            { max: 100, message: 'Maximum 100 characters' },
          ]}
        >
          <Input placeholder="e.g. 04465-0D150" />
        </Form.Item>

        <Form.Item
          name="aftermarketNumber"
          label="Aftermarket Number"
          rules={[{ max: 100, message: 'Maximum 100 characters' }]}
        >
          <Input placeholder="e.g. DB1802" />
        </Form.Item>

        <Form.Item
          name="brand"
          label="Brand"
          rules={[{ max: 100, message: 'Maximum 100 characters' }]}
        >
          <Input placeholder="e.g. Bosch, TRW, Brembo" />
        </Form.Item>

        <Form.Item
          name="notes"
          label="Notes"
          rules={[{ max: 500, message: 'Maximum 500 characters' }]}
        >
          <Input.TextArea rows={3} placeholder="Additional notes about this cross-reference" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
