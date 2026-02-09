'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Breadcrumb, Space, Tabs, Result, Button, Descriptions, Tag, Typography } from 'antd';
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
              children: contact ? (
                <div style={{ padding: 24 }}>
                  <Descriptions bordered column={{ xs: 1, sm: 2 }} size="small">
                    <Descriptions.Item label="Company Name">{contact.companyName || '—'}</Descriptions.Item>
                    <Descriptions.Item label="Display Name">{contact.displayName}</Descriptions.Item>
                    <Descriptions.Item label="Email">{contact.email || '—'}</Descriptions.Item>
                    <Descriptions.Item label="Phone">{contact.phone || '—'}</Descriptions.Item>
                    <Descriptions.Item label="Mobile">{contact.mobile || '—'}</Descriptions.Item>
                    <Descriptions.Item label="Website">{contact.website || '—'}</Descriptions.Item>
                    <Descriptions.Item label="Tax Number">{contact.taxNumber || '—'}</Descriptions.Item>
                    <Descriptions.Item label="Status">
                      <Tag color={contact.status === 'ACTIVE' ? 'green' : 'default'}>{contact.status}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Credit Limit">
                      {contact.creditLimit ? `RM ${Number(contact.creditLimit).toLocaleString('en-MY', { minimumFractionDigits: 2 })}` : '—'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Payment Terms">{contact.paymentTerm?.name || '—'}</Descriptions.Item>
                    <Descriptions.Item label="Price List">{contact.priceListId || '—'}</Descriptions.Item>
                    <Descriptions.Item label="Created">{new Date(contact.createdAt).toLocaleDateString('en-MY')}</Descriptions.Item>
                  </Descriptions>
                  {contact.notes && (
                    <div style={{ marginTop: 16 }}>
                      <Typography.Title level={5}>Notes</Typography.Title>
                      <Typography.Paragraph>{contact.notes}</Typography.Paragraph>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ padding: 24, textAlign: 'center' }}>Loading...</div>
              ),
            },
          ]}
        />
      </Space>
    </div>
  );
}
