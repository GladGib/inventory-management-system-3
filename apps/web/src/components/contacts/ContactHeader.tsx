import { Button, Space, Tag, Typography, Skeleton } from 'antd';
import {
  EditOutlined,
  FileTextOutlined,
  DollarOutlined,
  MailOutlined,
  PhoneOutlined,
} from '@ant-design/icons';
import { Contact } from '@/lib/contacts';

const { Title, Text } = Typography;

interface ContactHeaderProps {
  contact: Contact | undefined;
  loading?: boolean;
  onEdit?: () => void;
  onNewInvoice?: () => void;
  onNewBill?: () => void;
  onNewPayment?: () => void;
}

/**
 * ContactHeader - Header component for contact detail pages
 *
 * Displays contact name, company, email, phone and action buttons
 * Shows customer-specific actions (New Invoice) or vendor-specific (New Bill)
 *
 * @example
 * <ContactHeader
 *   contact={contact}
 *   loading={isLoading}
 *   onEdit={() => router.push(`/contacts/customers/${id}/edit`)}
 *   onNewInvoice={() => router.push(`/sales/invoices/new?customerId=${id}`)}
 *   onNewPayment={() => router.push(`/sales/payments/new?customerId=${id}`)}
 * />
 */
export function ContactHeader({
  contact,
  loading,
  onEdit,
  onNewInvoice,
  onNewBill,
  onNewPayment,
}: ContactHeaderProps) {
  if (loading || !contact) {
    return (
      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 16,
          }}
        >
          <div style={{ flex: 1 }}>
            <Skeleton.Input active style={{ width: 300, marginBottom: 8 }} />
            <Skeleton.Input active style={{ width: 200, marginBottom: 8 }} />
            <Skeleton.Input active style={{ width: 250 }} />
          </div>
          <Skeleton.Button active style={{ width: 100 }} />
        </div>
      </div>
    );
  }

  const isCustomer = contact.type === 'CUSTOMER' || contact.type === 'BOTH';
  const isVendor = contact.type === 'VENDOR' || contact.type === 'BOTH';

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 24,
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <Title level={3} style={{ margin: 0 }}>
            {contact.displayName}
          </Title>
          <Tag color={contact.status === 'ACTIVE' ? 'green' : 'default'}>{contact.status}</Tag>
          {contact.type === 'BOTH' && <Tag color="blue">Customer & Vendor</Tag>}
        </div>

        <div style={{ marginBottom: 4 }}>
          <Text type="secondary" style={{ fontSize: 15 }}>
            {contact.companyName}
          </Text>
        </div>

        <Space size={16} wrap>
          {contact.email && (
            <Space size={4}>
              <MailOutlined style={{ color: '#8c8c8c' }} />
              <Text>{contact.email}</Text>
            </Space>
          )}
          {contact.phone && (
            <Space size={4}>
              <PhoneOutlined style={{ color: '#8c8c8c' }} />
              <Text>{contact.phone}</Text>
            </Space>
          )}
        </Space>
      </div>

      <Space>
        {onEdit && (
          <Button icon={<EditOutlined />} onClick={onEdit}>
            Edit
          </Button>
        )}
        {isCustomer && onNewInvoice && (
          <Button type="primary" icon={<FileTextOutlined />} onClick={onNewInvoice}>
            New Invoice
          </Button>
        )}
        {isVendor && onNewBill && (
          <Button type="primary" icon={<FileTextOutlined />} onClick={onNewBill}>
            New Bill
          </Button>
        )}
        {onNewPayment && (
          <Button icon={<DollarOutlined />} onClick={onNewPayment}>
            New Payment
          </Button>
        )}
      </Space>
    </div>
  );
}
