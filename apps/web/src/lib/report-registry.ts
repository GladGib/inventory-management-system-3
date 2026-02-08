export interface ReportColumnConfig {
  key: string;
  title: string;
  dataIndex: string;
  sorter?: boolean;
  align?: 'left' | 'right' | 'center';
  width?: number;
  render?: 'currency' | 'percent' | 'number' | 'date' | 'boolean';
}

export interface ReportSummaryField {
  key: string;
  title: string;
  render?: 'currency' | 'percent' | 'number';
}

export interface ReportConfig {
  key: string;
  title: string;
  category: 'sales' | 'inventory' | 'purchase' | 'financial' | 'compliance';
  description: string;
  apiEndpoint: string;
  filters: ('dateRange' | 'year' | 'warehouseId' | 'categoryId' | 'daysSinceLastSale' | 'limit' | 'itemId')[];
  columns: ReportColumnConfig[];
  summaryFields: ReportSummaryField[];
  dataPath?: string; // Path to data array in response, defaults to 'data'
  hasChart?: boolean;
  chartType?: 'bar' | 'line' | 'pie' | 'area';
  chartConfig?: {
    xField: string;
    yField: string;
    seriesField?: string;
  };
}

export const reportRegistry: Record<string, ReportConfig> = {
  // ============ Sales Reports ============
  'sales-by-salesperson': {
    key: 'sales-by-salesperson',
    title: 'Sales by Salesperson',
    category: 'sales',
    description: 'View sales performance grouped by salesperson with totals and percentages.',
    apiEndpoint: '/reports/sales/by-salesperson',
    filters: ['dateRange'],
    columns: [
      { key: 'name', title: 'Salesperson', dataIndex: 'salesperson.name', sorter: true },
      { key: 'email', title: 'Email', dataIndex: 'salesperson.email' },
      { key: 'orderCount', title: 'Orders', dataIndex: 'orderCount', align: 'right', sorter: true, render: 'number' },
      { key: 'totalSales', title: 'Total Sales', dataIndex: 'totalSales', align: 'right', sorter: true, render: 'currency' },
      { key: 'percentOfTotal', title: '% of Total', dataIndex: 'percentOfTotal', align: 'right', sorter: true, render: 'percent' },
    ],
    summaryFields: [
      { key: 'totalSalespersons', title: 'Total Salespersons', render: 'number' },
      { key: 'totalSales', title: 'Total Sales', render: 'currency' },
    ],
    hasChart: true,
    chartType: 'bar',
    chartConfig: { xField: 'salesperson.name', yField: 'totalSales' },
  },

  'sales-by-category': {
    key: 'sales-by-category',
    title: 'Sales by Category',
    category: 'sales',
    description: 'Analyze sales revenue grouped by product category.',
    apiEndpoint: '/reports/sales/by-category',
    filters: ['dateRange'],
    columns: [
      { key: 'category', title: 'Category', dataIndex: 'category', sorter: true },
      { key: 'itemCount', title: 'Line Items', dataIndex: 'itemCount', align: 'right', render: 'number' },
      { key: 'quantity', title: 'Quantity Sold', dataIndex: 'quantity', align: 'right', sorter: true, render: 'number' },
      { key: 'revenue', title: 'Revenue', dataIndex: 'revenue', align: 'right', sorter: true, render: 'currency' },
      { key: 'percentOfTotal', title: '% of Total', dataIndex: 'percentOfTotal', align: 'right', sorter: true, render: 'percent' },
    ],
    summaryFields: [
      { key: 'totalCategories', title: 'Categories', render: 'number' },
      { key: 'totalRevenue', title: 'Total Revenue', render: 'currency' },
    ],
    hasChart: true,
    chartType: 'pie',
    chartConfig: { xField: 'category', yField: 'revenue' },
  },

  'sales-by-region': {
    key: 'sales-by-region',
    title: 'Sales by Region',
    category: 'sales',
    description: 'View sales distribution by customer state or region.',
    apiEndpoint: '/reports/sales/by-region',
    filters: ['dateRange'],
    columns: [
      { key: 'region', title: 'Region/State', dataIndex: 'region', sorter: true },
      { key: 'customerCount', title: 'Customers', dataIndex: 'customerCount', align: 'right', render: 'number' },
      { key: 'invoiceCount', title: 'Invoices', dataIndex: 'invoiceCount', align: 'right', render: 'number' },
      { key: 'totalSales', title: 'Total Sales', dataIndex: 'totalSales', align: 'right', sorter: true, render: 'currency' },
      { key: 'percentOfTotal', title: '% of Total', dataIndex: 'percentOfTotal', align: 'right', sorter: true, render: 'percent' },
    ],
    summaryFields: [
      { key: 'totalRegions', title: 'Regions', render: 'number' },
      { key: 'totalSales', title: 'Total Sales', render: 'currency' },
    ],
    hasChart: true,
    chartType: 'bar',
    chartConfig: { xField: 'region', yField: 'totalSales' },
  },

  'monthly-sales-summary': {
    key: 'monthly-sales-summary',
    title: 'Monthly Sales Summary',
    category: 'sales',
    description: 'View 12-month sales summary with monthly revenue and order counts.',
    apiEndpoint: '/reports/sales/monthly-summary',
    filters: ['year'],
    columns: [
      { key: 'label', title: 'Month', dataIndex: 'label' },
      { key: 'orderCount', title: 'Orders', dataIndex: 'orderCount', align: 'right', render: 'number' },
      { key: 'invoiceCount', title: 'Invoices', dataIndex: 'invoiceCount', align: 'right', render: 'number' },
      { key: 'revenue', title: 'Revenue', dataIndex: 'revenue', align: 'right', sorter: true, render: 'currency' },
      { key: 'taxCollected', title: 'Tax Collected', dataIndex: 'taxCollected', align: 'right', render: 'currency' },
    ],
    summaryFields: [
      { key: 'totalRevenue', title: 'Total Revenue', render: 'currency' },
      { key: 'totalOrders', title: 'Total Orders', render: 'number' },
      { key: 'totalInvoices', title: 'Total Invoices', render: 'number' },
      { key: 'avgMonthlyRevenue', title: 'Avg Monthly Revenue', render: 'currency' },
    ],
    hasChart: true,
    chartType: 'area',
    chartConfig: { xField: 'label', yField: 'revenue' },
  },

  'sales-growth-comparison': {
    key: 'sales-growth-comparison',
    title: 'Sales Growth Comparison',
    category: 'sales',
    description: 'Compare current period sales against the previous equivalent period.',
    apiEndpoint: '/reports/sales/growth-comparison',
    filters: ['dateRange'],
    columns: [],
    summaryFields: [],
    dataPath: '_custom_growth',
  },

  'average-order-value': {
    key: 'average-order-value',
    title: 'Average Order Value',
    category: 'sales',
    description: 'Track the trend of average invoice value over time.',
    apiEndpoint: '/reports/sales/average-order-value',
    filters: ['dateRange'],
    columns: [
      { key: 'month', title: 'Month', dataIndex: 'month' },
      { key: 'invoiceCount', title: 'Invoices', dataIndex: 'invoiceCount', align: 'right', render: 'number' },
      { key: 'totalValue', title: 'Total Value', dataIndex: 'totalValue', align: 'right', render: 'currency' },
      { key: 'averageOrderValue', title: 'Avg Order Value', dataIndex: 'averageOrderValue', align: 'right', sorter: true, render: 'currency' },
    ],
    summaryFields: [
      { key: 'totalInvoices', title: 'Total Invoices', render: 'number' },
      { key: 'totalRevenue', title: 'Total Revenue', render: 'currency' },
      { key: 'overallAverageOrderValue', title: 'Overall AOV', render: 'currency' },
    ],
    hasChart: true,
    chartType: 'line',
    chartConfig: { xField: 'month', yField: 'averageOrderValue' },
  },

  'customer-acquisition': {
    key: 'customer-acquisition',
    title: 'Customer Acquisition',
    category: 'sales',
    description: 'Track new customer acquisition trends over time.',
    apiEndpoint: '/reports/sales/customer-acquisition',
    filters: ['dateRange'],
    columns: [
      { key: 'month', title: 'Month', dataIndex: 'month' },
      { key: 'newCustomers', title: 'New Customers', dataIndex: 'newCustomers', align: 'right', sorter: true, render: 'number' },
    ],
    summaryFields: [
      { key: 'totalNewCustomers', title: 'New Customers (Period)', render: 'number' },
      { key: 'totalActiveCustomers', title: 'Total Active Customers', render: 'number' },
    ],
    hasChart: true,
    chartType: 'bar',
    chartConfig: { xField: 'month', yField: 'newCustomers' },
  },

  'top-products': {
    key: 'top-products',
    title: 'Top Products',
    category: 'sales',
    description: 'Rank the best-selling products by revenue and quantity.',
    apiEndpoint: '/reports/sales/top-products',
    filters: ['dateRange', 'limit'],
    columns: [
      { key: 'rank', title: '#', dataIndex: 'rank', width: 60 },
      { key: 'sku', title: 'SKU', dataIndex: 'item.sku', width: 120 },
      { key: 'name', title: 'Product', dataIndex: 'item.name', sorter: true },
      { key: 'category', title: 'Category', dataIndex: 'item.category' },
      { key: 'quantitySold', title: 'Qty Sold', dataIndex: 'quantitySold', align: 'right', sorter: true, render: 'number' },
      { key: 'revenue', title: 'Revenue', dataIndex: 'revenue', align: 'right', sorter: true, render: 'currency' },
      { key: 'estimatedProfit', title: 'Est. Profit', dataIndex: 'estimatedProfit', align: 'right', sorter: true, render: 'currency' },
    ],
    summaryFields: [
      { key: 'totalRevenue', title: 'Total Revenue', render: 'currency' },
      { key: 'totalQuantity', title: 'Total Quantity', render: 'number' },
    ],
    hasChart: true,
    chartType: 'bar',
    chartConfig: { xField: 'item.name', yField: 'revenue' },
  },

  // ============ Inventory Reports ============
  'inventory-turnover': {
    key: 'inventory-turnover',
    title: 'Inventory Turnover',
    category: 'inventory',
    description: 'Analyze turnover rate per item (COGS / average inventory value).',
    apiEndpoint: '/reports/inventory/turnover',
    filters: ['dateRange'],
    columns: [
      { key: 'sku', title: 'SKU', dataIndex: 'item.sku', width: 120 },
      { key: 'name', title: 'Item', dataIndex: 'item.name', sorter: true },
      { key: 'category', title: 'Category', dataIndex: 'item.category' },
      { key: 'currentStock', title: 'Stock', dataIndex: 'currentStock', align: 'right', render: 'number' },
      { key: 'cogs', title: 'COGS', dataIndex: 'cogs', align: 'right', render: 'currency' },
      { key: 'avgInventoryValue', title: 'Avg Inventory Value', dataIndex: 'avgInventoryValue', align: 'right', render: 'currency' },
      { key: 'turnoverRate', title: 'Turnover Rate', dataIndex: 'turnoverRate', align: 'right', sorter: true, render: 'number' },
      { key: 'daysOfStock', title: 'Days of Stock', dataIndex: 'daysOfStock', align: 'right', sorter: true, render: 'number' },
    ],
    summaryFields: [
      { key: 'totalItems', title: 'Items', render: 'number' },
      { key: 'avgTurnover', title: 'Avg Turnover Rate', render: 'number' },
    ],
  },

  'dead-stock': {
    key: 'dead-stock',
    title: 'Dead Stock',
    category: 'inventory',
    description: 'Identify items with no sales activity in a specified period.',
    apiEndpoint: '/reports/inventory/dead-stock',
    filters: ['daysSinceLastSale'],
    columns: [
      { key: 'sku', title: 'SKU', dataIndex: 'item.sku', width: 120 },
      { key: 'name', title: 'Item', dataIndex: 'item.name', sorter: true },
      { key: 'category', title: 'Category', dataIndex: 'item.category' },
      { key: 'stockOnHand', title: 'Stock', dataIndex: 'stockOnHand', align: 'right', render: 'number' },
      { key: 'stockValue', title: 'Stock Value', dataIndex: 'stockValue', align: 'right', sorter: true, render: 'currency' },
      { key: 'lastSaleDate', title: 'Last Sale', dataIndex: 'lastSaleDate', render: 'date' },
      { key: 'daysSinceLastSale', title: 'Days Since Sale', dataIndex: 'daysSinceLastSale', align: 'right', sorter: true, render: 'number' },
      { key: 'neverSold', title: 'Never Sold', dataIndex: 'neverSold', render: 'boolean' },
    ],
    summaryFields: [
      { key: 'totalDeadItems', title: 'Dead Stock Items', render: 'number' },
      { key: 'totalDeadStockValue', title: 'Dead Stock Value', render: 'currency' },
      { key: 'neverSoldCount', title: 'Never Sold', render: 'number' },
    ],
  },

  'warehouse-utilization': {
    key: 'warehouse-utilization',
    title: 'Warehouse Utilization',
    category: 'inventory',
    description: 'View stock value and item counts across all warehouses.',
    apiEndpoint: '/reports/inventory/warehouse-utilization',
    filters: [],
    columns: [
      { key: 'name', title: 'Warehouse', dataIndex: 'warehouse.name', sorter: true },
      { key: 'code', title: 'Code', dataIndex: 'warehouse.code', width: 100 },
      { key: 'uniqueItems', title: 'Unique Items', dataIndex: 'uniqueItems', align: 'right', render: 'number' },
      { key: 'totalQuantity', title: 'Total Qty', dataIndex: 'totalQuantity', align: 'right', render: 'number' },
      { key: 'totalCostValue', title: 'Cost Value', dataIndex: 'totalCostValue', align: 'right', sorter: true, render: 'currency' },
      { key: 'totalSellingValue', title: 'Selling Value', dataIndex: 'totalSellingValue', align: 'right', render: 'currency' },
      { key: 'potentialProfit', title: 'Potential Profit', dataIndex: 'potentialProfit', align: 'right', render: 'currency' },
    ],
    summaryFields: [
      { key: 'totalWarehouses', title: 'Warehouses', render: 'number' },
      { key: 'totalCostValue', title: 'Total Cost Value', render: 'currency' },
      { key: 'totalSellingValue', title: 'Total Selling Value', render: 'currency' },
    ],
    hasChart: true,
    chartType: 'bar',
    chartConfig: { xField: 'warehouse.name', yField: 'totalCostValue' },
  },

  'abc-analysis': {
    key: 'abc-analysis',
    title: 'ABC Analysis',
    category: 'inventory',
    description: 'Classify inventory items by value: A (80%), B (15%), C (5%).',
    apiEndpoint: '/reports/inventory/abc-analysis',
    filters: [],
    columns: [
      { key: 'classification', title: 'Class', dataIndex: 'classification', width: 80, sorter: true },
      { key: 'sku', title: 'SKU', dataIndex: 'item.sku', width: 120 },
      { key: 'name', title: 'Item', dataIndex: 'item.name', sorter: true },
      { key: 'category', title: 'Category', dataIndex: 'item.category' },
      { key: 'stockOnHand', title: 'Stock', dataIndex: 'stockOnHand', align: 'right', render: 'number' },
      { key: 'totalValue', title: 'Total Value', dataIndex: 'totalValue', align: 'right', sorter: true, render: 'currency' },
      { key: 'percentOfTotal', title: '% of Total', dataIndex: 'percentOfTotal', align: 'right', render: 'percent' },
      { key: 'cumulativePercent', title: 'Cumulative %', dataIndex: 'cumulativePercent', align: 'right', render: 'percent' },
    ],
    summaryFields: [
      { key: 'totalItems', title: 'Total Items', render: 'number' },
      { key: 'totalValue', title: 'Total Value', render: 'currency' },
    ],
  },

  'item-profitability': {
    key: 'item-profitability',
    title: 'Item Profitability',
    category: 'inventory',
    description: 'Analyze revenue minus cost of goods sold per item.',
    apiEndpoint: '/reports/inventory/item-profitability',
    filters: ['dateRange'],
    columns: [
      { key: 'sku', title: 'SKU', dataIndex: 'item.sku', width: 120 },
      { key: 'name', title: 'Item', dataIndex: 'item.name', sorter: true },
      { key: 'category', title: 'Category', dataIndex: 'item.category' },
      { key: 'quantitySold', title: 'Qty Sold', dataIndex: 'quantitySold', align: 'right', render: 'number' },
      { key: 'revenue', title: 'Revenue', dataIndex: 'revenue', align: 'right', sorter: true, render: 'currency' },
      { key: 'cost', title: 'Cost', dataIndex: 'cost', align: 'right', render: 'currency' },
      { key: 'profit', title: 'Profit', dataIndex: 'profit', align: 'right', sorter: true, render: 'currency' },
      { key: 'margin', title: 'Margin %', dataIndex: 'margin', align: 'right', sorter: true, render: 'percent' },
    ],
    summaryFields: [
      { key: 'totalItems', title: 'Items', render: 'number' },
      { key: 'totalRevenue', title: 'Total Revenue', render: 'currency' },
      { key: 'totalCost', title: 'Total Cost', render: 'currency' },
      { key: 'totalProfit', title: 'Total Profit', render: 'currency' },
      { key: 'overallMargin', title: 'Overall Margin', render: 'percent' },
    ],
    hasChart: true,
    chartType: 'bar',
    chartConfig: { xField: 'item.name', yField: 'profit' },
  },

  // ============ Purchase Reports ============
  'purchase-by-category': {
    key: 'purchase-by-category',
    title: 'Purchases by Category',
    category: 'purchase',
    description: 'View purchasing spend grouped by item category.',
    apiEndpoint: '/reports/purchases/by-category',
    filters: ['dateRange'],
    columns: [
      { key: 'category', title: 'Category', dataIndex: 'category', sorter: true },
      { key: 'lineCount', title: 'Line Items', dataIndex: 'lineCount', align: 'right', render: 'number' },
      { key: 'quantity', title: 'Quantity', dataIndex: 'quantity', align: 'right', render: 'number' },
      { key: 'totalPurchases', title: 'Total Purchases', dataIndex: 'totalPurchases', align: 'right', sorter: true, render: 'currency' },
      { key: 'percentOfTotal', title: '% of Total', dataIndex: 'percentOfTotal', align: 'right', render: 'percent' },
    ],
    summaryFields: [
      { key: 'totalCategories', title: 'Categories', render: 'number' },
      { key: 'totalPurchases', title: 'Total Purchases', render: 'currency' },
    ],
    hasChart: true,
    chartType: 'pie',
    chartConfig: { xField: 'category', yField: 'totalPurchases' },
  },

  'purchase-by-item': {
    key: 'purchase-by-item',
    title: 'Purchases by Item',
    category: 'purchase',
    description: 'Track individual item purchase volumes and spend.',
    apiEndpoint: '/reports/purchases/by-item',
    filters: ['dateRange'],
    columns: [
      { key: 'sku', title: 'SKU', dataIndex: 'item.sku', width: 120 },
      { key: 'name', title: 'Item', dataIndex: 'item.name', sorter: true },
      { key: 'category', title: 'Category', dataIndex: 'item.category' },
      { key: 'quantityPurchased', title: 'Qty Purchased', dataIndex: 'quantityPurchased', align: 'right', sorter: true, render: 'number' },
      { key: 'totalPurchases', title: 'Total Purchases', dataIndex: 'totalPurchases', align: 'right', sorter: true, render: 'currency' },
    ],
    summaryFields: [],
  },

  'vendor-performance': {
    key: 'vendor-performance',
    title: 'Vendor Performance',
    category: 'purchase',
    description: 'Evaluate vendors by on-time delivery, lead time, and reject rate.',
    apiEndpoint: '/reports/purchases/vendor-performance',
    filters: ['dateRange'],
    columns: [
      { key: 'vendor', title: 'Vendor', dataIndex: 'vendor.displayName', sorter: true },
      { key: 'poCount', title: 'POs', dataIndex: 'poCount', align: 'right', render: 'number' },
      { key: 'totalPurchases', title: 'Total Purchases', dataIndex: 'totalPurchases', align: 'right', sorter: true, render: 'currency' },
      { key: 'onTimeDeliveryRate', title: 'On-Time %', dataIndex: 'onTimeDeliveryRate', align: 'right', sorter: true, render: 'percent' },
      { key: 'avgLeadTimeDays', title: 'Avg Lead Time (Days)', dataIndex: 'avgLeadTimeDays', align: 'right', sorter: true, render: 'number' },
      { key: 'rejectRate', title: 'Reject Rate %', dataIndex: 'rejectRate', align: 'right', sorter: true, render: 'percent' },
    ],
    summaryFields: [
      { key: 'totalVendors', title: 'Vendors', render: 'number' },
      { key: 'avgOnTimeRate', title: 'Avg On-Time Rate', render: 'percent' },
    ],
  },

  'purchase-price-variance': {
    key: 'purchase-price-variance',
    title: 'Purchase Price Variance',
    category: 'purchase',
    description: 'Compare actual purchase prices against standard/cost prices.',
    apiEndpoint: '/reports/purchases/price-variance',
    filters: ['dateRange'],
    columns: [
      { key: 'sku', title: 'SKU', dataIndex: 'item.sku', width: 120 },
      { key: 'name', title: 'Item', dataIndex: 'item.name', sorter: true },
      { key: 'standardPrice', title: 'Std Price', dataIndex: 'standardPrice', align: 'right', render: 'currency' },
      { key: 'avgActualPrice', title: 'Avg Actual', dataIndex: 'avgActualPrice', align: 'right', render: 'currency' },
      { key: 'totalQty', title: 'Qty', dataIndex: 'totalQty', align: 'right', render: 'number' },
      { key: 'variance', title: 'Variance (RM)', dataIndex: 'variance', align: 'right', sorter: true, render: 'currency' },
      { key: 'variancePercent', title: 'Variance %', dataIndex: 'variancePercent', align: 'right', sorter: true, render: 'percent' },
    ],
    summaryFields: [
      { key: 'totalItems', title: 'Items', render: 'number' },
      { key: 'totalVariance', title: 'Total Variance', render: 'currency' },
      { key: 'itemsAboveStandard', title: 'Above Standard', render: 'number' },
      { key: 'itemsBelowStandard', title: 'Below Standard', render: 'number' },
    ],
  },

  'outstanding-pos': {
    key: 'outstanding-pos',
    title: 'Outstanding Purchase Orders',
    category: 'purchase',
    description: 'View all open and partially received purchase orders.',
    apiEndpoint: '/reports/purchases/outstanding-pos',
    filters: [],
    columns: [
      { key: 'poNumber', title: 'PO Number', dataIndex: 'poNumber' },
      { key: 'vendor', title: 'Vendor', dataIndex: 'vendor.displayName', sorter: true },
      { key: 'orderDate', title: 'Order Date', dataIndex: 'orderDate', render: 'date' },
      { key: 'expectedDate', title: 'Expected', dataIndex: 'expectedDate', render: 'date' },
      { key: 'status', title: 'Status', dataIndex: 'status' },
      { key: 'pendingQuantity', title: 'Pending Qty', dataIndex: 'pendingQuantity', align: 'right', render: 'number' },
      { key: 'totalValue', title: 'Total Value', dataIndex: 'totalValue', align: 'right', sorter: true, render: 'currency' },
      { key: 'daysOutstanding', title: 'Days Out', dataIndex: 'daysOutstanding', align: 'right', sorter: true, render: 'number' },
      { key: 'isOverdue', title: 'Overdue', dataIndex: 'isOverdue', render: 'boolean' },
    ],
    summaryFields: [
      { key: 'totalOutstandingPOs', title: 'Outstanding POs', render: 'number' },
      { key: 'totalOutstandingValue', title: 'Outstanding Value', render: 'currency' },
      { key: 'overdueCount', title: 'Overdue', render: 'number' },
    ],
  },

  // ============ Financial Reports ============
  'profit-and-loss': {
    key: 'profit-and-loss',
    title: 'Profit & Loss',
    category: 'financial',
    description: 'Revenue, cost of goods sold, expenses, and net profit summary.',
    apiEndpoint: '/reports/financial/profit-and-loss',
    filters: ['dateRange'],
    columns: [],
    summaryFields: [],
    dataPath: '_custom_pnl',
  },

  'cash-flow-summary': {
    key: 'cash-flow-summary',
    title: 'Cash Flow Summary',
    category: 'financial',
    description: 'Track cash inflows (payments received) vs outflows (payments made).',
    apiEndpoint: '/reports/financial/cash-flow',
    filters: ['dateRange'],
    columns: [
      { key: 'month', title: 'Month', dataIndex: 'month' },
      { key: 'inflow', title: 'Inflow', dataIndex: 'inflow', align: 'right', render: 'currency' },
      { key: 'outflow', title: 'Outflow', dataIndex: 'outflow', align: 'right', render: 'currency' },
      { key: 'netCashFlow', title: 'Net Cash Flow', dataIndex: 'netCashFlow', align: 'right', sorter: true, render: 'currency' },
    ],
    summaryFields: [
      { key: 'totalInflow', title: 'Total Inflow', render: 'currency' },
      { key: 'totalOutflow', title: 'Total Outflow', render: 'currency' },
      { key: 'netCashFlow', title: 'Net Cash Flow', render: 'currency' },
    ],
    hasChart: true,
    chartType: 'bar',
    chartConfig: { xField: 'month', yField: 'inflow' },
  },

  'revenue-by-month': {
    key: 'revenue-by-month',
    title: 'Revenue by Month',
    category: 'financial',
    description: 'Monthly revenue breakdown for a selected year.',
    apiEndpoint: '/reports/financial/revenue-by-month',
    filters: ['year'],
    columns: [
      { key: 'label', title: 'Month', dataIndex: 'label' },
      { key: 'invoiceCount', title: 'Invoices', dataIndex: 'invoiceCount', align: 'right', render: 'number' },
      { key: 'revenue', title: 'Revenue', dataIndex: 'revenue', align: 'right', sorter: true, render: 'currency' },
    ],
    summaryFields: [
      { key: 'totalRevenue', title: 'Total Revenue', render: 'currency' },
      { key: 'totalInvoices', title: 'Total Invoices', render: 'number' },
      { key: 'avgMonthlyRevenue', title: 'Avg Monthly Revenue', render: 'currency' },
    ],
    hasChart: true,
    chartType: 'area',
    chartConfig: { xField: 'label', yField: 'revenue' },
  },

  'expense-analysis': {
    key: 'expense-analysis',
    title: 'Expense Analysis',
    category: 'financial',
    description: 'Breakdown of expenses by category from vendor bills.',
    apiEndpoint: '/reports/financial/expense-analysis',
    filters: ['dateRange'],
    columns: [
      { key: 'category', title: 'Category', dataIndex: 'category', sorter: true },
      { key: 'lineCount', title: 'Line Items', dataIndex: 'lineCount', align: 'right', render: 'number' },
      { key: 'total', title: 'Total', dataIndex: 'total', align: 'right', sorter: true, render: 'currency' },
      { key: 'percentOfTotal', title: '% of Total', dataIndex: 'percentOfTotal', align: 'right', render: 'percent' },
    ],
    summaryFields: [
      { key: 'totalExpenses', title: 'Total Expenses', render: 'currency' },
      { key: 'totalCategories', title: 'Categories', render: 'number' },
    ],
    hasChart: true,
    chartType: 'pie',
    chartConfig: { xField: 'category', yField: 'total' },
  },

  'outstanding-payments': {
    key: 'outstanding-payments',
    title: 'Outstanding Payments',
    category: 'financial',
    description: 'View all unpaid invoices and bills with aging details.',
    apiEndpoint: '/reports/financial/outstanding-payments',
    filters: [],
    columns: [],
    summaryFields: [],
    dataPath: '_custom_outstanding',
  },

  'payment-method-analysis': {
    key: 'payment-method-analysis',
    title: 'Payment Method Analysis',
    category: 'financial',
    description: 'Analyze payment distribution by method (cash, bank, e-wallet, etc).',
    apiEndpoint: '/reports/financial/payment-method-analysis',
    filters: ['dateRange'],
    columns: [
      { key: 'method', title: 'Payment Method', dataIndex: 'method', sorter: true },
      { key: 'count', title: 'Transactions', dataIndex: 'count', align: 'right', render: 'number' },
      { key: 'total', title: 'Total', dataIndex: 'total', align: 'right', sorter: true, render: 'currency' },
      { key: 'percentOfTotal', title: '% of Total', dataIndex: 'percentOfTotal', align: 'right', render: 'percent' },
    ],
    summaryFields: [
      { key: 'totalReceived', title: 'Total Received', render: 'currency' },
      { key: 'totalPaid', title: 'Total Paid', render: 'currency' },
    ],
    dataPath: 'received',
    hasChart: true,
    chartType: 'pie',
    chartConfig: { xField: 'method', yField: 'total' },
  },

  'customer-lifetime-value': {
    key: 'customer-lifetime-value',
    title: 'Customer Lifetime Value',
    category: 'financial',
    description: 'Total all-time revenue per customer, ranked by value.',
    apiEndpoint: '/reports/financial/customer-lifetime-value',
    filters: [],
    columns: [
      { key: 'displayName', title: 'Customer', dataIndex: 'customer.displayName', sorter: true },
      { key: 'companyName', title: 'Company', dataIndex: 'customer.companyName' },
      { key: 'invoiceCount', title: 'Invoices', dataIndex: 'invoiceCount', align: 'right', sorter: true, render: 'number' },
      { key: 'totalRevenue', title: 'Lifetime Revenue', dataIndex: 'totalRevenue', align: 'right', sorter: true, render: 'currency' },
      { key: 'avgOrderValue', title: 'Avg Order Value', dataIndex: 'avgOrderValue', align: 'right', render: 'currency' },
      { key: 'firstInvoiceDate', title: 'First Invoice', dataIndex: 'firstInvoiceDate', render: 'date' },
      { key: 'lastInvoiceDate', title: 'Last Invoice', dataIndex: 'lastInvoiceDate', render: 'date' },
      { key: 'customerAgeDays', title: 'Customer Age (Days)', dataIndex: 'customerAgeDays', align: 'right', render: 'number' },
    ],
    summaryFields: [
      { key: 'totalCustomers', title: 'Customers', render: 'number' },
      { key: 'totalLifetimeRevenue', title: 'Total Lifetime Revenue', render: 'currency' },
      { key: 'avgLifetimeValue', title: 'Avg Lifetime Value', render: 'currency' },
    ],
  },

  // ============ Compliance Reports ============
  'sst-filing-summary': {
    key: 'sst-filing-summary',
    title: 'SST Filing Summary',
    category: 'compliance',
    description: 'SST summary formatted for filing with Malaysia customs.',
    apiEndpoint: '/reports/compliance/sst-filing',
    filters: ['dateRange'],
    columns: [],
    summaryFields: [],
    dataPath: '_custom_sst',
  },

  'einvoice-submission-log': {
    key: 'einvoice-submission-log',
    title: 'E-Invoice Submission Log',
    category: 'compliance',
    description: 'Track all MyInvois e-invoice submissions and their statuses.',
    apiEndpoint: '/reports/compliance/einvoice-log',
    filters: ['dateRange'],
    columns: [
      { key: 'invoiceNumber', title: 'Invoice #', dataIndex: 'invoiceNumber' },
      { key: 'customer', title: 'Customer', dataIndex: 'customer' },
      { key: 'total', title: 'Total', dataIndex: 'total', align: 'right', render: 'currency' },
      { key: 'status', title: 'Status', dataIndex: 'status' },
      { key: 'submittedAt', title: 'Submitted', dataIndex: 'submittedAt', render: 'date' },
      { key: 'validatedAt', title: 'Validated', dataIndex: 'validatedAt', render: 'date' },
      { key: 'retryCount', title: 'Retries', dataIndex: 'retryCount', align: 'right', render: 'number' },
      { key: 'lastError', title: 'Error', dataIndex: 'lastError' },
    ],
    summaryFields: [
      { key: 'total', title: 'Total Submissions', render: 'number' },
      { key: 'VALIDATED', title: 'Validated', render: 'number' },
      { key: 'REJECTED', title: 'Rejected', render: 'number' },
      { key: 'successRate', title: 'Success Rate', render: 'percent' },
    ],
  },

  'tax-audit-trail': {
    key: 'tax-audit-trail',
    title: 'Tax Audit Trail',
    category: 'compliance',
    description: 'Complete audit trail of all tax-related transactions.',
    apiEndpoint: '/reports/compliance/tax-audit-trail',
    filters: ['dateRange'],
    columns: [
      { key: 'type', title: 'Type', dataIndex: 'type', width: 100 },
      { key: 'documentNumber', title: 'Document #', dataIndex: 'documentNumber' },
      { key: 'date', title: 'Date', dataIndex: 'date', render: 'date', sorter: true },
      { key: 'party', title: 'Party', dataIndex: 'party' },
      { key: 'partyTaxNumber', title: 'Tax No', dataIndex: 'partyTaxNumber' },
      { key: 'subtotal', title: 'Subtotal', dataIndex: 'subtotal', align: 'right', render: 'currency' },
      { key: 'taxAmount', title: 'Tax Amount', dataIndex: 'taxAmount', align: 'right', sorter: true, render: 'currency' },
      { key: 'total', title: 'Total', dataIndex: 'total', align: 'right', render: 'currency' },
      { key: 'status', title: 'Status', dataIndex: 'status' },
    ],
    summaryFields: [
      { key: 'totalTransactions', title: 'Total Transactions', render: 'number' },
      { key: 'totalOutputTax', title: 'Output Tax', render: 'currency' },
      { key: 'totalInputTax', title: 'Input Tax', render: 'currency' },
      { key: 'netTax', title: 'Net Tax', render: 'currency' },
    ],
  },

  'annual-tax-summary': {
    key: 'annual-tax-summary',
    title: 'Annual Tax Summary',
    category: 'compliance',
    description: 'Full year tax summary with monthly output and input tax breakdown.',
    apiEndpoint: '/reports/compliance/annual-tax-summary',
    filters: ['year'],
    columns: [
      { key: 'label', title: 'Month', dataIndex: 'label' },
      { key: 'outputTax', title: 'Output Tax', dataIndex: 'outputTax', align: 'right', render: 'currency' },
      { key: 'inputTax', title: 'Input Tax', dataIndex: 'inputTax', align: 'right', render: 'currency' },
      { key: 'netTax', title: 'Net Tax', dataIndex: 'netTax', align: 'right', sorter: true, render: 'currency' },
    ],
    summaryFields: [
      { key: 'totalOutputTax', title: 'Total Output Tax', render: 'currency' },
      { key: 'totalInputTax', title: 'Total Input Tax', render: 'currency' },
      { key: 'netTaxPayable', title: 'Net Tax Payable', render: 'currency' },
    ],
    hasChart: true,
    chartType: 'bar',
    chartConfig: { xField: 'label', yField: 'netTax' },
  },
};

// Helper to get all reports in a category
export function getReportsByCategory(category: ReportConfig['category']): ReportConfig[] {
  return Object.values(reportRegistry).filter((r) => r.category === category);
}

// Get all categories
export function getReportCategories(): ReportConfig['category'][] {
  return ['sales', 'inventory', 'purchase', 'financial', 'compliance'];
}
