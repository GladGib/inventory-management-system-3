'use client';

import { Button, Tooltip } from 'antd';
import { CloseOutlined, DragOutlined } from '@ant-design/icons';
import { getWidgetDefinition } from './widget-registry';

// Widget components import
import { SalesKPIWidget } from './widgets/SalesKPIWidget';
import { InventoryWidget } from './widgets/InventoryWidget';
import { PendingOrdersWidget } from './widgets/PendingOrdersWidget';
import { ReceivablesWidget } from './widgets/ReceivablesWidget';
import { PayablesWidget } from './widgets/PayablesWidget';
import { CashFlowWidget } from './widgets/CashFlowWidget';
import { SalesChartWidget } from './widgets/SalesChartWidget';
import { TopItemsWidget } from './widgets/TopItemsWidget';
import { TopCustomersWidget } from './widgets/TopCustomersWidget';
import { PendingActionsWidget } from './widgets/PendingActionsWidget';
import { RecentActivityWidget } from './widgets/RecentActivityWidget';
import { LowStockWidget } from './widgets/LowStockWidget';
import { ReorderAlertsWidget } from './widgets/ReorderAlertsWidget';

const WIDGET_COMPONENTS: Record<string, React.ComponentType> = {
  'sales-kpi': SalesKPIWidget,
  inventory: InventoryWidget,
  'pending-orders': PendingOrdersWidget,
  receivables: ReceivablesWidget,
  payables: PayablesWidget,
  'cash-flow': CashFlowWidget,
  'sales-chart': SalesChartWidget,
  'top-items': TopItemsWidget,
  'top-customers': TopCustomersWidget,
  'pending-actions': PendingActionsWidget,
  'recent-activity': RecentActivityWidget,
  'low-stock': LowStockWidget,
  'reorder-alerts': ReorderAlertsWidget,
};

interface DashboardWidgetProps {
  id: string;
  type: string;
  editMode: boolean;
  onRemove: (id: string) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, targetId: string) => void;
}

export function DashboardWidget({
  id,
  type,
  editMode,
  onRemove,
  onDragStart,
  onDragOver,
  onDrop,
}: DashboardWidgetProps) {
  const WidgetComponent = WIDGET_COMPONENTS[type];
  const definition = getWidgetDefinition(type);

  if (!WidgetComponent) {
    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#fafafa',
          border: '1px dashed #d9d9d9',
          borderRadius: 8,
          color: '#999',
        }}
      >
        Unknown widget: {type}
      </div>
    );
  }

  return (
    <div
      draggable={editMode}
      onDragStart={(e) => onDragStart(e, id)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, id)}
      style={{
        height: '100%',
        position: 'relative',
        cursor: editMode ? 'grab' : 'default',
        borderRadius: 8,
        outline: editMode ? '2px dashed #1890ff40' : 'none',
        outlineOffset: 2,
        transition: 'outline 0.2s ease',
      }}
    >
      {editMode && (
        <div
          style={{
            position: 'absolute',
            top: 4,
            right: 4,
            zIndex: 10,
            display: 'flex',
            gap: 2,
            background: 'rgba(255,255,255,0.95)',
            borderRadius: 4,
            padding: '2px 4px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
          }}
        >
          <Tooltip title="Drag to reorder">
            <Button
              type="text"
              size="small"
              icon={<DragOutlined />}
              style={{ cursor: 'grab', color: '#1890ff' }}
            />
          </Tooltip>
          <Tooltip title={`Remove ${definition?.label || type}`}>
            <Button
              type="text"
              size="small"
              danger
              icon={<CloseOutlined />}
              onClick={() => onRemove(id)}
            />
          </Tooltip>
        </div>
      )}
      <WidgetComponent />
    </div>
  );
}
