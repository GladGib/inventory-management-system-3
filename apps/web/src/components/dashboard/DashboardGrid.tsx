'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { Row, Col, Skeleton } from 'antd';
import { DashboardWidget } from './DashboardWidget';
import { DashboardToolbar } from './DashboardToolbar';
import { WidgetDrawer } from './WidgetDrawer';
import { getWidgetDefinition } from './widget-registry';
import {
  useDashboardLayout,
  useSaveDashboardLayout,
  useResetDashboardLayout,
  DEFAULT_LAYOUT,
  type WidgetConfig,
} from '@/hooks/use-dashboard-layout';

/**
 * DashboardGrid - Main customizable dashboard grid component.
 * Uses CSS Grid via Ant Design Row/Col with drag-and-drop reordering.
 * Widgets are arranged in rows of 12 grid units.
 */
export function DashboardGrid() {
  const { data: savedLayout, isLoading } = useDashboardLayout();
  const saveMutation = useSaveDashboardLayout();
  const resetMutation = useResetDashboardLayout();

  const [editMode, setEditMode] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [layout, setLayout] = useState<WidgetConfig[]>(DEFAULT_LAYOUT);
  const [hasChanges, setHasChanges] = useState(false);
  const [dragSourceId, setDragSourceId] = useState<string | null>(null);

  // Sync from server once loaded
  useEffect(() => {
    if (savedLayout?.layoutConfig && Array.isArray(savedLayout.layoutConfig)) {
      const serverLayout = savedLayout.layoutConfig as WidgetConfig[];
      if (serverLayout.length > 0) {
        setLayout(serverLayout);
      }
    }
  }, [savedLayout]);

  // Get visible widgets sorted by position (y then x)
  const visibleWidgets = useMemo(
    () => layout.filter((w) => w.visible).sort((a, b) => a.y - b.y || a.x - b.x),
    [layout]
  );

  const visibleWidgetTypes = useMemo(
    () => new Set(visibleWidgets.map((w) => w.type)),
    [visibleWidgets]
  );

  // Group widgets into rows (widgets that share the same y value)
  const rows = useMemo(() => {
    const rowMap = new Map<number, WidgetConfig[]>();
    for (const widget of visibleWidgets) {
      const row = rowMap.get(widget.y) || [];
      row.push(widget);
      rowMap.set(widget.y, row);
    }
    return Array.from(rowMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([y, widgets]) => ({
        y,
        widgets: widgets.sort((a, b) => a.x - b.x),
      }));
  }, [visibleWidgets]);

  // Widget height mapping based on h value
  const getWidgetHeight = (h: number) => {
    if (h <= 2) return 140;
    if (h <= 3) return 240;
    return 380;
  };

  // Drag and drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    setDragSourceId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, targetId: string) => {
      e.preventDefault();
      if (!dragSourceId || dragSourceId === targetId) return;

      setLayout((prev) => {
        const newLayout = [...prev];
        const sourceIdx = newLayout.findIndex((w) => w.id === dragSourceId);
        const targetIdx = newLayout.findIndex((w) => w.id === targetId);
        if (sourceIdx === -1 || targetIdx === -1) return prev;

        // Swap positions
        const sourceWidget = { ...newLayout[sourceIdx] };
        const targetWidget = { ...newLayout[targetIdx] };

        const tempX = sourceWidget.x;
        const tempY = sourceWidget.y;
        const tempW = sourceWidget.w;
        const tempH = sourceWidget.h;

        sourceWidget.x = targetWidget.x;
        sourceWidget.y = targetWidget.y;
        sourceWidget.w = targetWidget.w;
        sourceWidget.h = targetWidget.h;

        targetWidget.x = tempX;
        targetWidget.y = tempY;
        targetWidget.w = tempW;
        targetWidget.h = tempH;

        newLayout[sourceIdx] = sourceWidget;
        newLayout[targetIdx] = targetWidget;
        return newLayout;
      });
      setDragSourceId(null);
      setHasChanges(true);
    },
    [dragSourceId]
  );

  // Remove widget
  const handleRemoveWidget = useCallback((id: string) => {
    setLayout((prev) => prev.map((w) => (w.id === id ? { ...w, visible: false } : w)));
    setHasChanges(true);
  }, []);

  // Add widget
  const handleAddWidget = useCallback((type: string) => {
    const def = getWidgetDefinition(type);
    if (!def) return;

    setLayout((prev) => {
      // Check if this widget type already exists in layout
      const existing = prev.find((w) => w.type === type);
      if (existing) {
        return prev.map((w) => (w.type === type ? { ...w, visible: true } : w));
      }

      // Find the max y to place the new widget at the bottom
      const maxY = prev.reduce((max, w) => Math.max(max, w.y + w.h), 0);

      return [
        ...prev,
        {
          id: `${type}-${Date.now()}`,
          type,
          x: 0,
          y: maxY,
          w: def.defaultW,
          h: def.defaultH,
          visible: true,
        },
      ];
    });
    setHasChanges(true);
  }, []);

  // Save layout
  const handleSaveLayout = useCallback(() => {
    saveMutation.mutate(
      {
        layoutConfig: layout,
        widgetSettings: savedLayout?.widgetSettings || {},
      },
      {
        onSuccess: () => {
          setHasChanges(false);
          setEditMode(false);
        },
      }
    );
  }, [layout, savedLayout, saveMutation]);

  // Reset layout
  const handleResetLayout = useCallback(() => {
    resetMutation.mutate(undefined, {
      onSuccess: () => {
        setLayout(DEFAULT_LAYOUT);
        setHasChanges(false);
      },
    });
  }, [resetMutation]);

  // Toggle edit mode
  const toggleEditMode = useCallback(() => {
    if (editMode && hasChanges) {
      // Auto-save on exit
      handleSaveLayout();
    } else {
      setEditMode((prev) => !prev);
    }
  }, [editMode, hasChanges, handleSaveLayout]);

  if (isLoading) {
    return (
      <div>
        <Row gutter={[24, 24]}>
          {[1, 2, 3, 4].map((i) => (
            <Col key={i} xs={24} sm={12} lg={6}>
              <Skeleton active paragraph={{ rows: 2 }} />
            </Col>
          ))}
        </Row>
      </div>
    );
  }

  return (
    <div>
      <DashboardToolbar
        editMode={editMode}
        onToggleEditMode={toggleEditMode}
        onAddWidget={() => setDrawerOpen(true)}
        onResetLayout={handleResetLayout}
        onSaveLayout={handleSaveLayout}
        isSaving={saveMutation.isPending}
        hasChanges={hasChanges}
      />

      {rows.map((row) => (
        <Row gutter={[24, 24]} key={row.y} style={{ marginBottom: 24 }}>
          {row.widgets.map((widget) => (
            <Col
              key={widget.id}
              xs={24}
              sm={widget.w <= 3 ? 12 : 24}
              lg={widget.w * 2}
              style={{ minHeight: getWidgetHeight(widget.h) }}
            >
              <DashboardWidget
                id={widget.id}
                type={widget.type}
                editMode={editMode}
                onRemove={handleRemoveWidget}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              />
            </Col>
          ))}
        </Row>
      ))}

      <WidgetDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        visibleWidgetTypes={visibleWidgetTypes}
        onAddWidget={handleAddWidget}
      />
    </div>
  );
}
