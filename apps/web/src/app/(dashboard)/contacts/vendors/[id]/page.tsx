'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Breadcrumb, Space, Tabs, Result, Button } from 'antd';
import { HomeOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useContact } from '@/hooks/use-contacts';
import { contactsService } from '@/lib/contacts';
import { ContactHeader, BalanceSummaryCard, TransactionHistory } from '@/components/contacts';

export default function VendorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const vendorId = params.id as string;

  const { data: contact, isLoading, error } = useContact(vendorId);

  const { data: balanceData, isLoading: balanceLoading } = useQuery({
    queryKey: ['contact-balance', vendorId],
    queryFn: () => contactsService.getContactBalance(vendorId),
    enabled: !!vendorId,
  });

  // Handle 404
  if (error || (contact && contact.type !== 'VENDOR' && contact.type !== 'BOTH')) {
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
              title: <Link href="/contacts/vendors">Vendors</Link>,
            },
            {
              title: 'Not Found',
            },
          ]}
        />
        <Result
          status="404"
          title="Vendor Not Found"
          subTitle="The vendor you are looking for does not exist or has been deleted."
          extra={
            <Button type="primary" onClick={() => router.push('/contacts/vendors')}>
              Back to Vendors
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
            title: <Link href="/contacts/vendors">Vendors</Link>,
          },
          {
            title: isLoading ? 'Loading...' : contact?.displayName || 'Vendor',
          },
        ]}
      />

      <ContactHeader
        contact={contact}
        loading={isLoading}
        onEdit={() => router.push(`/contacts/vendors/${vendorId}/edit`)}
        onNewBill={() => router.push(`/purchases/bills/new?vendorId=${vendorId}`)}
        onNewPayment={() => router.push(`/purchases/payments/new?vendorId=${vendorId}`)}
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
                  <p>Additional vendor overview information coming soon...</p>
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
