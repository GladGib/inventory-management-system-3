'use client';

import { useState } from 'react';
import { Breadcrumb, Table, Card, Typography, Empty, Skeleton, Tag } from 'antd';
import { HomeOutlined, BarChartOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import { useSalesByCustomer } from '@/hooks/use-reports';
import { ReportFilterBar, ReportSummary } from '@/components/reports';
import type { SalesByCustomerItem } from '@/lib/reports';
import type { ColumnsType } from 'antd/es/table';

const { Title } = Typography;

export default function SalesByCustomerPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [dateRange, setDateRange] = useState({
    fromDate: dayjs().subtract(30, 'day').format('YYYY-MM-DD'),
    toDate: dayjs().format('YYYY-MM-DD'),
  });

  const { data, isLoading } = useSalesByCustomer(dateRange, { page, limit: pageSize });

  const handleDateRangeChange = (fromDate: string, toDate: string) => {
    setDateRange({ fromDate, toDate });
    setPage(1); // Reset to first page on filter change
  };

  const handleTableChange = (pagination: any) => {
    setPage(pagination.current);
    setPageSize(pagination.pageSize);
  };

  const handleRowClick = (record: SalesByCustomerItem) => {
    router.push(`/contacts/${record.customerId}`);
  };

  const columns: ColumnsType<SalesByCustomerItem> = [
    {
      title: 'Customer',
      dataIndex: 'customerName',
      key: 'customerName',
      sorter: (a, b) => a.customerName.localeCompare(b.customerName),
      render: (text, record) => (
        <Link href={`/contacts/${record.customerId}`} onClick={(e) => e.stopPropagation()}>
          {text}
        </Link>
      ),
    },
    {
      title: 'Orders',
      dataIndex: 'orderCount',
      key: 'orderCount',
      align: 'right',
      sorter: (a, b) => a.orderCount - b.orderCount,
      width: 120,
    },
    {
      title: 'Invoices',
      dataIndex: 'invoiceCount',
      key: 'invoiceCount',
      align: 'right',
      sorter: (a, b) => a.invoiceCount - b.invoiceCount,
      width: 120,
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
      title: '% of Total',
      dataIndex: 'percentOfTotal',
      key: 'percentOfTotal',
      align: 'right',
      sorter: (a, b) => a.percentOfTotal - b.percentOfTotal,
      render: (value) => `${value.toFixed(1)}%`,
      width: 120,
    },
  ];

  const summaryItems = data?.summary
    ? [
        {
          title: 'Total Customers',
          value: data.summary.totalCustomers ?? 0,
        },
        {
          title: 'Total Sales',
          value: `RM ${(data.summary.totalSales ?? 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        },
        {
          title: 'Average per Customer',
          value: `RM ${((data.summary.totalSales ?? 0) / (data.summary.totalCustomers || 1)).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
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
            title: 'Sales by Customer',
          },
        ]}
      />

      <Title level={4} style={{ marginBottom: 16 }}>
        Sales by Customer
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
                rowKey="customerId"
                loading={isLoading}
                pagination={{
                  current: page,
                  pageSize: pageSize,
                  total: data?.meta.total || 0,
                  showSizeChanger: true,
                  showTotal: (total) => `Total ${total} customers`,
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
