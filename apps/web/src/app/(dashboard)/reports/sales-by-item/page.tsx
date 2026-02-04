'use client';

import { useState } from 'react';
import { Breadcrumb, Table, Card, Typography, Empty, Skeleton, Tag } from 'antd';
import { HomeOutlined, BarChartOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import { useSalesByItem } from '@/hooks/use-reports';
import { ReportFilterBar, ReportSummary } from '@/components/reports';
import type { SalesByItemItem } from '@/lib/reports';
import type { ColumnsType } from 'antd/es/table';

const { Title } = Typography;

export default function SalesByItemPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [dateRange, setDateRange] = useState({
    fromDate: dayjs().subtract(30, 'day').format('YYYY-MM-DD'),
    toDate: dayjs().format('YYYY-MM-DD'),
  });

  const { data, isLoading } = useSalesByItem(dateRange, { page, limit: pageSize });

  const handleDateRangeChange = (fromDate: string, toDate: string) => {
    setDateRange({ fromDate, toDate });
    setPage(1);
  };

  const handleTableChange = (pagination: any) => {
    setPage(pagination.current);
    setPageSize(pagination.pageSize);
  };

  const handleRowClick = (record: SalesByItemItem) => {
    router.push(`/inventory/items/${record.itemId}`);
  };

  const columns: ColumnsType<SalesByItemItem> = [
    {
      title: 'SKU',
      dataIndex: 'sku',
      key: 'sku',
      sorter: (a, b) => a.sku.localeCompare(b.sku),
      width: 150,
    },
    {
      title: 'Item Name',
      dataIndex: 'itemName',
      key: 'itemName',
      sorter: (a, b) => a.itemName.localeCompare(b.itemName),
      render: (text, record) => (
        <Link href={`/inventory/items/${record.itemId}`} onClick={(e) => e.stopPropagation()}>
          {text}
        </Link>
      ),
    },
    {
      title: 'Quantity Sold',
      dataIndex: 'quantitySold',
      key: 'quantitySold',
      align: 'right',
      sorter: (a, b) => a.quantitySold - b.quantitySold,
      width: 150,
    },
    {
      title: 'Total Sales',
      dataIndex: 'totalSales',
      key: 'totalSales',
      align: 'right',
      sorter: (a, b) => a.totalSales - b.totalSales,
      render: (value) =>
        `RM ${value.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      width: 180,
    },
    {
      title: 'Avg Price',
      dataIndex: 'averagePrice',
      key: 'averagePrice',
      align: 'right',
      sorter: (a, b) => a.averagePrice - b.averagePrice,
      render: (value) =>
        `RM ${value.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      width: 150,
    },
  ];

  const summaryItems = data
    ? [
        {
          title: 'Total Items',
          value: data.summary.totalItems,
        },
        {
          title: 'Total Quantity',
          value: data.summary.totalQuantity.toLocaleString('en-MY'),
        },
        {
          title: 'Total Sales',
          value: `RM ${data.summary.totalSales.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        },
      ]
    : [];

  return (
    <div>
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          {
            href: '/',
            title: <HomeOutlined />,
          },
          {
            href: '/reports',
            title: (
              <>
                <BarChartOutlined />
                <span>Reports</span>
              </>
            ),
          },
          {
            title: 'Sales by Item',
          },
        ]}
      />

      <Title level={4} style={{ marginBottom: 16 }}>
        Sales by Item
      </Title>

      <ReportFilterBar
        fromDate={dateRange.fromDate}
        toDate={dateRange.toDate}
        onChange={handleDateRangeChange}
        loading={isLoading}
      />

      {isLoading ? (
        <Skeleton active paragraph={{ rows: 4 }} />
      ) : (
        <>
          <ReportSummary items={summaryItems} />

          <Card>
            {data?.data.length === 0 ? (
              <Empty description="No sales data for the selected period" />
            ) : (
              <Table
                columns={columns}
                dataSource={data?.data}
                rowKey="itemId"
                loading={isLoading}
                pagination={{
                  current: page,
                  pageSize: pageSize,
                  total: data?.meta.total || 0,
                  showSizeChanger: true,
                  showTotal: (total) => `Total ${total} items`,
                  pageSizeOptions: ['10', '20', '50', '100'],
                }}
                onChange={handleTableChange}
                onRow={(record) => ({
                  onClick: () => handleRowClick(record),
                  style: { cursor: 'pointer' },
                })}
              />
            )}
          </Card>
        </>
      )}
    </div>
  );
}
