# Email Notifications

## Overview
Automated email notifications for key business transactions.

## Requirements

### EMAIL-001: Email Service Setup
- **Priority**: P1
- **Description**: Configure email sending infrastructure
- **Acceptance Criteria**:
  - SMTP configuration in environment
  - Nodemailer integration
  - Email queue for reliability
  - Retry logic for failures
  - HTML email templates

### EMAIL-002: Invoice Notifications
- **Priority**: P1
- **Description**: Email invoices to customers
- **Acceptance Criteria**:
  - Send on invoice creation (manual trigger)
  - Include invoice PDF attachment
  - Professional HTML template
  - Payment link (future)
  - Company branding

### EMAIL-003: Payment Confirmations
- **Priority**: P1
- **Description**: Notify on payment received
- **Acceptance Criteria**:
  - Send when payment recorded
  - Receipt details
  - Updated balance
  - Thank you message

### EMAIL-004: Order Confirmations
- **Priority**: P1
- **Description**: Confirm sales orders to customers
- **Acceptance Criteria**:
  - Send on order confirmation
  - Order details summary
  - Expected delivery date
  - SO PDF attachment (optional)

### EMAIL-005: Purchase Order to Vendor
- **Priority**: P1
- **Description**: Send PO to vendors
- **Acceptance Criteria**:
  - Send on PO issue
  - PO PDF attachment
  - Delivery expectations
  - Reply-to address

### EMAIL-006: Email Settings
- **Priority**: P1
- **Description**: Organization email configuration
- **Acceptance Criteria**:
  - SMTP settings page
  - From name and email
  - Reply-to address
  - Email signature
  - Test email button

### EMAIL-007: Notification Preferences
- **Priority**: P2
- **Description**: Control which emails are sent
- **Acceptance Criteria**:
  - Toggle per notification type
  - Auto-send vs manual send
  - CC/BCC settings

## Database Schema

```prisma
model EmailLog {
  id              String   @id @default(cuid())
  type            EmailType
  to              String
  cc              String?
  subject         String
  status          EmailStatus @default(PENDING)
  sentAt          DateTime?
  error           String?
  referenceType   String?  // 'invoice', 'payment', etc.
  referenceId     String?
  organizationId  String
  createdById     String
  createdAt       DateTime @default(now())

  @@index([organizationId, type])
  @@index([referenceType, referenceId])
}

model OrganizationEmailSettings {
  id              String   @id @default(cuid())
  organizationId  String   @unique
  smtpHost        String?
  smtpPort        Int?
  smtpSecure      Boolean  @default(true)
  smtpUser        String?
  smtpPass        String?  // Encrypted
  fromName        String?
  fromEmail       String?
  replyTo         String?
  signature       String?
  autoSendInvoice Boolean  @default(false)
  autoSendPayment Boolean  @default(false)
  autoSendOrder   Boolean  @default(false)
  autoSendPO      Boolean  @default(false)
}

enum EmailType {
  INVOICE_CREATED
  PAYMENT_RECEIVED
  ORDER_CONFIRMED
  PO_ISSUED
  CUSTOM
}

enum EmailStatus {
  PENDING
  SENT
  FAILED
  BOUNCED
}
```

## API Endpoints

```
POST   /api/emails/send                    - Send ad-hoc email
POST   /api/sales/invoices/:id/send        - Send invoice email
POST   /api/sales/payments/:id/send        - Send payment receipt
POST   /api/sales/orders/:id/send          - Send order confirmation
POST   /api/purchases/orders/:id/send      - Send PO to vendor
GET    /api/emails/logs                    - Email history
GET    /api/settings/email                 - Get email settings
PUT    /api/settings/email                 - Update email settings
POST   /api/settings/email/test            - Send test email
```

## Email Service Implementation

```typescript
// apps/api/src/modules/email/email.service.ts

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(
    private readonly configService: ConfigService,
    private readonly templateService: TemplateService,
    @InjectQueue('email') private emailQueue: Queue,
  ) {
    this.initTransporter();
  }

  async sendInvoiceEmail(invoice: Invoice, options?: EmailOptions): Promise<void> {
    const html = await this.templateService.render('invoice-email', {
      invoice,
      organization: invoice.organization,
    });

    const pdfBuffer = await this.pdfService.generateInvoicePdf(invoice.id);

    await this.emailQueue.add('send', {
      to: invoice.customer.email,
      subject: `Invoice ${invoice.invoiceNumber} from ${invoice.organization.name}`,
      html,
      attachments: [
        {
          filename: `${invoice.invoiceNumber}.pdf`,
          content: pdfBuffer,
        },
      ],
      type: 'INVOICE_CREATED',
      referenceType: 'invoice',
      referenceId: invoice.id,
    });
  }

  async sendPaymentReceipt(payment: Payment): Promise<void> {
    const html = await this.templateService.render('payment-receipt', {
      payment,
      customer: payment.customer,
    });

    await this.emailQueue.add('send', {
      to: payment.customer.email,
      subject: `Payment Receipt from ${payment.organization.name}`,
      html,
      type: 'PAYMENT_RECEIVED',
      referenceType: 'payment',
      referenceId: payment.id,
    });
  }
}
```

## Email Templates

### Invoice Email Template
```handlebars
{{!-- templates/email/invoice-email.hbs --}}
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .invoice-details { background: #f5f5f5; padding: 15px; border-radius: 4px; }
    .amount { font-size: 24px; font-weight: bold; color: #1890ff; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; }
    .btn { display: inline-block; padding: 10px 20px; background: #1890ff; color: white; text-decoration: none; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>{{organization.name}}</h2>
    </div>

    <p>Dear {{customer.displayName}},</p>

    <p>Please find attached invoice <strong>{{invoice.invoiceNumber}}</strong> for your recent purchase.</p>

    <div class="invoice-details">
      <p><strong>Invoice Number:</strong> {{invoice.invoiceNumber}}</p>
      <p><strong>Invoice Date:</strong> {{formatDate invoice.invoiceDate}}</p>
      <p><strong>Due Date:</strong> {{formatDate invoice.dueDate}}</p>
      <p class="amount">Amount Due: RM {{formatCurrency invoice.balance}}</p>
    </div>

    <p>The invoice is attached to this email as a PDF document.</p>

    <p>If you have any questions, please don't hesitate to contact us.</p>

    <div class="footer">
      <p>{{organization.name}}<br>
      {{organization.address}}<br>
      {{organization.phone}}</p>
      {{#if organization.signature}}
        {{{organization.signature}}}
      {{/if}}
    </div>
  </div>
</body>
</html>
```

## UI Components

### EmailSettingsPage
```tsx
// /settings/email

const EmailSettingsPage = () => {
  return (
    <SettingsPageContainer title="Email Settings">
      <Card title="SMTP Configuration">
        <Form layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="SMTP Host" name="smtpHost">
                <Input placeholder="smtp.example.com" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="SMTP Port" name="smtpPort">
                <InputNumber placeholder="587" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Username" name="smtpUser">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Password" name="smtpPass">
                <Input.Password />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item>
            <Button onClick={handleTestEmail}>Send Test Email</Button>
          </Form.Item>
        </Form>
      </Card>

      <Card title="Sender Information">
        <Form layout="vertical">
          <Form.Item label="From Name" name="fromName">
            <Input placeholder="Your Company Name" />
          </Form.Item>
          <Form.Item label="From Email" name="fromEmail">
            <Input placeholder="invoices@yourcompany.com" />
          </Form.Item>
          <Form.Item label="Reply To" name="replyTo">
            <Input placeholder="support@yourcompany.com" />
          </Form.Item>
          <Form.Item label="Email Signature" name="signature">
            <Input.TextArea rows={4} />
          </Form.Item>
        </Form>
      </Card>

      <Card title="Auto-Send Settings">
        <Form.Item label="Auto-send invoice on creation">
          <Switch />
        </Form.Item>
        <Form.Item label="Auto-send payment receipt">
          <Switch />
        </Form.Item>
        <Form.Item label="Auto-send order confirmation">
          <Switch />
        </Form.Item>
      </Card>
    </SettingsPageContainer>
  );
};
```

### SendEmailButton Component
```tsx
interface SendEmailButtonProps {
  documentType: 'invoice' | 'payment' | 'order' | 'po';
  documentId: string;
  recipientEmail?: string;
}

const SendEmailButton: React.FC<SendEmailButtonProps> = ({
  documentType,
  documentId,
  recipientEmail,
}) => {
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    setSending(true);
    try {
      await api.post(`/${getEndpoint(documentType)}/${documentId}/send`);
      message.success('Email sent successfully');
    } catch (error) {
      message.error('Failed to send email');
    } finally {
      setSending(false);
    }
  };

  return (
    <Button
      icon={<MailOutlined />}
      onClick={handleSend}
      loading={sending}
    >
      Send Email
    </Button>
  );
};
```

## Environment Variables

```env
# Email Configuration
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=true
SMTP_USER=your-email@example.com
SMTP_PASS=your-password
SMTP_FROM_NAME=Your Company
SMTP_FROM_EMAIL=noreply@example.com
```

## Dependencies

```json
{
  "nodemailer": "^6.9.0",
  "@nestjs/bull": "^10.0.0",
  "bull": "^4.12.0"
}
```
