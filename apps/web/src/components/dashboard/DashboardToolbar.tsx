'use client';

import { Button, Space, Typography, Popconfirm } from 'antd';
import { PlusOutlined, ReloadOutlined, SaveOutlined, EditOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface DashboardToolbarProps {
  editMode: boolean;
  onToggleEditMode: () => void;
  onAddWidget: () => void;
  onResetLayout: () => void;
  onSaveLayout: () => void;
  isSaving: boolean;
  hasChanges: boolean;
}

export function DashboardToolbar({
  editMode,
  onToggleEditMode,
  onAddWidget,
  onResetLayout,
  onSaveLayout,
  isSaving,
  hasChanges,
}: DashboardToolbarProps) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        padding: editMode ? '8px 12px' : 0,
        background: editMode ? '#e6f7ff' : 'transparent',
        borderRadius: 8,
        transition: 'all 0.2s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {editMode && <Text type="secondary">Drag widgets to reorder. Click X to remove.</Text>}
      </div>

      <Space>
        {editMode && (
          <>
            <Button icon={<PlusOutlined />} onClick={onAddWidget}>
              Add Widget
            </Button>
            <Popconfirm
              title="Reset dashboard layout?"
              description="This will restore the default widget arrangement."
              onConfirm={onResetLayout}
              okText="Reset"
              cancelText="Cancel"
            >
              <Button icon={<ReloadOutlined />}>Reset Layout</Button>
            </Popconfirm>
            {hasChanges && (
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={onSaveLayout}
                loading={isSaving}
              >
                Save Layout
              </Button>
            )}
          </>
        )}
        <Button
          type={editMode ? 'primary' : 'default'}
          ghost={editMode}
          icon={<EditOutlined />}
          onClick={onToggleEditMode}
        >
          {editMode ? 'Done Editing' : 'Customize'}
        </Button>
      </Space>
    </div>
  );
}
