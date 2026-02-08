export interface WidgetDefinition {
  type: string;
  label: string;
  description: string;
  defaultW: number;
  defaultH: number;
  minW?: number;
  minH?: number;
  category: 'kpi' | 'chart' | 'table' | 'feed';
}

export const WIDGET_DEFINITIONS: Record<string, WidgetDefinition> = {
  'sales-kpi': {
    type: 'sales-kpi',
    label: 'Sales KPIs',
    description: 'Monthly and year-to-date sales figures',
    defaultW: 6,
    defaultH: 2,
    category: 'kpi',
  },
  inventory: {
    type: 'inventory',
    label: 'Low Stock Count',
    description: 'Number of items below reorder level',
    defaultW: 3,
    defaultH: 2,
    category: 'kpi',
  },
  'pending-orders': {
    type: 'pending-orders',
    label: 'Pending Orders',
    description: 'Count of pending sales orders',
    defaultW: 3,
    defaultH: 2,
    category: 'kpi',
  },
  receivables: {
    type: 'receivables',
    label: 'Receivables',
    description: 'Outstanding customer receivables',
    defaultW: 3,
    defaultH: 2,
    category: 'kpi',
  },
  payables: {
    type: 'payables',
    label: 'Payables',
    description: 'Outstanding vendor payables',
    defaultW: 3,
    defaultH: 2,
    category: 'kpi',
  },
  'cash-flow': {
    type: 'cash-flow',
    label: 'Cash Flow',
    description: 'Net cash position and invoice/bill counts',
    defaultW: 6,
    defaultH: 2,
    category: 'kpi',
  },
  'sales-chart': {
    type: 'sales-chart',
    label: 'Sales Trend',
    description: 'Monthly sales trend line chart',
    defaultW: 6,
    defaultH: 4,
    category: 'chart',
  },
  'top-items': {
    type: 'top-items',
    label: 'Top Selling Items',
    description: 'Top selling items by revenue',
    defaultW: 6,
    defaultH: 4,
    category: 'chart',
  },
  'top-customers': {
    type: 'top-customers',
    label: 'Top Customers',
    description: 'Top customers by spending',
    defaultW: 6,
    defaultH: 4,
    category: 'chart',
  },
  'pending-actions': {
    type: 'pending-actions',
    label: 'Action Required',
    description: 'Pending alerts and actions',
    defaultW: 6,
    defaultH: 4,
    category: 'feed',
  },
  'recent-activity': {
    type: 'recent-activity',
    label: 'Recent Activity',
    description: 'Recent invoices and orders',
    defaultW: 12,
    defaultH: 4,
    category: 'feed',
  },
  'low-stock': {
    type: 'low-stock',
    label: 'Low Stock Items',
    description: 'Table of items below reorder level',
    defaultW: 6,
    defaultH: 4,
    category: 'table',
  },
  'reorder-alerts': {
    type: 'reorder-alerts',
    label: 'Reorder Alerts',
    description: 'Active reorder alerts',
    defaultW: 6,
    defaultH: 4,
    category: 'feed',
  },
};

export function getWidgetDefinition(type: string): WidgetDefinition | undefined {
  return WIDGET_DEFINITIONS[type];
}

export function getAllWidgetDefinitions(): WidgetDefinition[] {
  return Object.values(WIDGET_DEFINITIONS);
}
