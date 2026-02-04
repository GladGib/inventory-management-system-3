import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Card, Table, Tag, Space, Select, DatePicker, type TableColumnsType } from 'antd';
import { salesService, type Invoice, type Payment, type SalesOrder } from '@/lib/sales';
import {
  purchasesService,
  type Bill,
  type VendorPayment,
  type PurchaseOrder,
} from '@/lib/purchases';
import { Contact } from '@/lib/contacts';
import dayjs, { type Dayjs } from 'dayjs';

const { RangePicker } = DatePicker;

type TransactionType =
  | 'SALES_ORDER'
  | 'INVOICE'
  | 'PAYMENT'
  | 'PURCHASE_ORDER'
  | 'BILL'
  | 'VENDOR_PAYMENT';

interface Transaction {
  id: string;
  date: string;
  type: TransactionType;
  number: string;
  amount: number;
  status: string;
  href: string;
}

interface TransactionHistoryProps {
  contact: Contact;
}

/**
 * TransactionHistory - Table of all transactions for a contact
 *
 * Fetches and displays:
 * - Customers: Sales Orders, Invoices, Payments
 * - Vendors: Purchase Orders, Bills, Payments
 *
 * Features:
 * - Filter by transaction type
 * - Filter by date range
 * - Sort by date, amount
 * - Click to view transaction details
 *
 * @example
 * <TransactionHistory contact={contact} />
 */
export function TransactionHistory({ contact }: TransactionHistoryProps) {
  const [typeFilter, setTypeFilter] = useState<TransactionType | undefined>();
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);

  const isCustomer = contact.type === 'CUSTOMER' || contact.type === 'BOTH';
  const isVendor = contact.type === 'VENDOR' || contact.type === 'BOTH';

  // Fetch customer transactions
  const { data: salesOrders, isLoading: loadingSalesOrders } = useQuery({
    queryKey: ['sales-orders', contact.id],
    queryFn: () =>
      salesService.getOrders({
        customerId: contact.id,
        limit: 100,
      }),
    enabled: isCustomer,
  });

  const { data: invoices, isLoading: loadingInvoices } = useQuery({
    queryKey: ['invoices', contact.id],
    queryFn: () =>
      salesService.getInvoices({
        customerId: contact.id,
        limit: 100,
      }),
    enabled: isCustomer,
  });

  const { data: payments, isLoading: loadingPayments } = useQuery({
    queryKey: ['payments', contact.id],
    queryFn: () =>
      salesService.getPayments({
        customerId: contact.id,
        limit: 100,
      }),
    enabled: isCustomer,
  });

  // Fetch vendor transactions
  const { data: purchaseOrders, isLoading: loadingPurchaseOrders } = useQuery({
    queryKey: ['purchase-orders', contact.id],
    queryFn: () =>
      purchasesService.getOrders({
        vendorId: contact.id,
        limit: 100,
      }),
    enabled: isVendor,
  });

  const { data: bills, isLoading: loadingBills } = useQuery({
    queryKey: ['bills', contact.id],
    queryFn: () =>
      purchasesService.getBills({
        vendorId: contact.id,
        limit: 100,
      }),
    enabled: isVendor,
  });

  const { data: vendorPayments, isLoading: loadingVendorPayments } = useQuery({
    queryKey: ['vendor-payments', contact.id],
    queryFn: () =>
      purchasesService.getPayments({
        vendorId: contact.id,
        limit: 100,
      }),
    enabled: isVendor,
  });

  // Combine all transactions
  const transactions = useMemo(() => {
    const result: Transaction[] = [];

    // Sales Orders
    if (salesOrders?.data) {
      salesOrders.data.forEach((order: SalesOrder) => {
        result.push({
          id: order.id,
          date: order.orderDate,
          type: 'SALES_ORDER',
          number: order.orderNumber,
          amount: order.total,
          status: order.status,
          href: `/sales/orders/${order.id}`,
        });
      });
    }

    // Invoices
    if (invoices?.data) {
      invoices.data.forEach((invoice: Invoice) => {
        result.push({
          id: invoice.id,
          date: invoice.invoiceDate,
          type: 'INVOICE',
          number: invoice.invoiceNumber,
          amount: invoice.total,
          status: invoice.status,
          href: `/sales/invoices/${invoice.id}`,
        });
      });
    }

    // Payments
    if (payments?.data) {
      payments.data.forEach((payment: Payment) => {
        result.push({
          id: payment.id,
          date: payment.paymentDate,
          type: 'PAYMENT',
          number: payment.paymentNumber,
          amount: payment.amount,
          status: 'RECEIVED',
          href: `/sales/payments/${payment.id}`,
        });
      });
    }

    // Purchase Orders
    if (purchaseOrders?.data) {
      purchaseOrders.data.forEach((order: PurchaseOrder) => {
        result.push({
          id: order.id,
          date: order.orderDate,
          type: 'PURCHASE_ORDER',
          number: order.orderNumber,
          amount: order.total,
          status: order.status,
          href: `/purchases/orders/${order.id}`,
        });
      });
    }

    // Bills
    if (bills?.data) {
      bills.data.forEach((bill: Bill) => {
        result.push({
          id: bill.id,
          date: bill.billDate,
          type: 'BILL',
          number: bill.billNumber,
          amount: bill.total,
          status: bill.status,
          href: `/purchases/bills/${bill.id}`,
        });
      });
    }

    // Vendor Payments
    if (vendorPayments?.data) {
      vendorPayments.data.forEach((payment: VendorPayment) => {
        result.push({
          id: payment.id,
          date: payment.paymentDate,
          type: 'VENDOR_PAYMENT',
          number: payment.paymentNumber,
          amount: payment.amount,
          status: 'PAID',
          href: `/purchases/payments/${payment.id}`,
        });
      });
    }

    // Sort by date descending
    return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [salesOrders, invoices, payments, purchaseOrders, bills, vendorPayments]);

  // Apply filters
  const filteredTransactions = useMemo(() => {
    let filtered = transactions;

    if (typeFilter) {
      filtered = filtered.filter((t) => t.type === typeFilter);
    }

    if (dateRange[0] && dateRange[1]) {
      const startDate = dateRange[0].startOf('day');
      const endDate = dateRange[1].endOf('day');
      filtered = filtered.filter((t) => {
        const date = dayjs(t.date);
        return date.isAfter(startDate) && date.isBefore(endDate);
      });
    }

    return filtered;
  }, [transactions, typeFilter, dateRange]);

  const loading =
    loadingSalesOrders ||
    loadingInvoices ||
    loadingPayments ||
    loadingPurchaseOrders ||
    loadingBills ||
    loadingVendorPayments;

  const getTypeLabel = (type: TransactionType) => {
    const labels: Record<TransactionType, string> = {
      SALES_ORDER: 'Sales Order',
      INVOICE: 'Invoice',
      PAYMENT: 'Payment',
      PURCHASE_ORDER: 'Purchase Order',
      BILL: 'Bill',
      VENDOR_PAYMENT: 'Payment',
    };
    return labels[type];
  };

  const getTypeColor = (type: TransactionType) => {
    const colors: Record<TransactionType, string> = {
      SALES_ORDER: 'blue',
      INVOICE: 'purple',
      PAYMENT: 'green',
      PURCHASE_ORDER: 'cyan',
      BILL: 'orange',
      VENDOR_PAYMENT: 'green',
    };
    return colors[type];
  };

  const getStatusColor = (status: string) => {
    const statusColors: Record<string, string> = {
      DRAFT: 'default',
      CONFIRMED: 'blue',
      ISSUED: 'blue',
      SENT: 'blue',
      PAID: 'green',
      RECEIVED: 'green',
      APPROVED: 'green',
      PARTIALLY_PAID: 'orange',
      OVERDUE: 'red',
      CANCELLED: 'default',
      VOID: 'default',
    };
    return statusColors[status] || 'default';
  };

  const columns: TableColumnsType<Transaction> = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      width: 120,
      sorter: (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      render: (date: string) => dayjs(date).format('DD MMM YYYY'),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 140,
      render: (type: TransactionType) => <Tag color={getTypeColor(type)}>{getTypeLabel(type)}</Tag>,
    },
    {
      title: 'Number',
      dataIndex: 'number',
      key: 'number',
      width: 160,
      render: (number: string, record: Transaction) => (
        <Link href={record.href} style={{ fontWeight: 500 }}>
          {number}
        </Link>
      ),
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      width: 140,
      align: 'right',
      sorter: (a, b) => a.amount - b.amount,
      render: (amount: number) => (
        <span style={{ fontWeight: 500 }}>
          RM{' '}
          {Number(amount || 0).toLocaleString('en-MY', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>{status.replace(/_/g, ' ')}</Tag>
      ),
    },
  ];

  const typeOptions = [
    ...(isCustomer
      ? [
          { value: 'SALES_ORDER', label: 'Sales Order' },
          { value: 'INVOICE', label: 'Invoice' },
          { value: 'PAYMENT', label: 'Payment' },
        ]
      : []),
    ...(isVendor
      ? [
          { value: 'PURCHASE_ORDER', label: 'Purchase Order' },
          { value: 'BILL', label: 'Bill' },
          { value: 'VENDOR_PAYMENT', label: 'Payment' },
        ]
      : []),
  ];

  return (
    <Card
      title="Transaction History"
      extra={
        <Space>
          <Select
            placeholder="Type"
            style={{ width: 150 }}
            allowClear
            value={typeFilter}
            onChange={setTypeFilter}
            options={typeOptions}
          />
          <RangePicker
            value={dateRange}
            onChange={(dates) => setDateRange(dates || [null, null])}
            format="DD MMM YYYY"
          />
        </Space>
      }
    >
      <Table
        columns={columns}
        dataSource={filteredTransactions}
        rowKey="id"
        loading={loading}
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `Total ${total} transactions`,
          pageSizeOptions: ['10', '20', '50', '100'],
        }}
      />
    </Card>
  );
}
