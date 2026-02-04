'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Breadcrumb, Space, Tabs, Result, Button } from 'antd';
import { HomeOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useContact } from '@/hooks/use-contacts';
import { contactsService } from '@/lib/contacts';
import { ContactHeader, BalanceSummaryCard, TransactionHistory } from '@/components/contacts';

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.id as string;

  const { data: contact, isLoading, error } = useContact(customerId);

  const { data: balanceData, isLoading: balanceLoading } = useQuery({
    queryKey: ['contact-balance', customerId],
    queryFn: () => contactsService.getContactBalance(customerId),
    enabled: !!customerId,
  });

  // Handle 404
  if (error || (contact && contact.type !== 'CUSTOMER' && contact.type !== 'BOTH')) {
    return (
      <div>
        <Breadcrumb
          style={{ marginBottom: 24 }}
          items={[
            {
              title: (
                <Link href="/">
                  <HomeOutlined />
                </Link>
              ),
            },
            {
              title: <Link href="/contacts/customers">Customers</Link>,
            },
            {
              title: 'Not Found',
            },
          ]}
        />
        <Result
          status="404"
          title="Customer Not Found"
          subTitle="The customer you are looking for does not exist or has been deleted."
          extra={
            <Button type="primary" onClick={() => router.push('/contacts/customers')}>
              Back to Customers
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <Breadcrumb
        style={{ marginBottom: 24 }}
        items={[
          {
            title: (
              <Link href="/">
                <HomeOutlined />
              </Link>
            ),
          },
          {
            title: <Link href="/contacts/customers">Customers</Link>,
          },
          {
            title: isLoading ? 'Loading...' : contact?.displayName || 'Customer',
          },
        ]}
      />

      <ContactHeader
        contact={contact}
        loading={isLoading}
        onEdit={() => router.push(`/contacts/customers/${customerId}/edit`)}
        onNewInvoice={() => router.push(`/sales/invoices/new?customerId=${customerId}`)}
        onNewPayment={() => router.push(`/sales/payments/new?customerId=${customerId}`)}
      />

      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <BalanceSummaryCard
          contact={contact}
          loading={isLoading}
          balanceData={balanceData}
          balanceLoading={balanceLoading}
        />

        <Tabs
          defaultActiveKey="transactions"
          items={[
            {
              key: 'transactions',
              label: 'Transactions',
              children: contact ? (
                <TransactionHistory contact={contact} />
              ) : (
                <div style={{ padding: 24, textAlign: 'center' }}>Loading...</div>
              ),
            },
            {
              key: 'overview',
              label: 'Overview',
              children: (
                <div style={{ padding: 24 }}>
                  <p>Additional customer overview information coming soon...</p>
                  {contact?.notes && (
                    <div>
                      <strong>Notes:</strong>
                      <p>{contact.notes}</p>
                    </div>
                  )}
                </div>
              ),
            },
          ]}
        />
      </Space>
    </div>
  );
}
