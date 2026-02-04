# Payment Terms

## Overview
Configurable payment terms for customers and vendors (Net 30, Net 60, COD, etc.).

## Requirements

### PT-001: Payment Terms Configuration
- **Priority**: P1
- **Description**: Create and manage payment term presets
- **Acceptance Criteria**:
  - Predefined terms: COD, Net 7, Net 15, Net 30, Net 60, Net 90
  - Custom payment terms
  - Days field for due date calculation
  - Default term for organization
  - Active/inactive status

### PT-002: Due Date Calculation
- **Priority**: P1
- **Description**: Auto-calculate due dates based on payment terms
- **Acceptance Criteria**:
  - Invoice due date = Invoice date + Term days
  - Bill due date = Bill date + Term days
  - COD = Same day (0 days)
  - Manual override option

### PT-003: Contact Default Terms
- **Priority**: P1
- **Description**: Assign default payment terms to contacts
- **Acceptance Criteria**:
  - Customer payment term field
  - Vendor payment term field
  - Auto-apply to new invoices/bills
  - Override at transaction level

### PT-004: Payment Terms UI
- **Priority**: P1
- **Description**: Settings page for payment terms
- **Acceptance Criteria**:
  - List all payment terms
  - Create/Edit/Delete terms
  - Set organization default
  - Show usage count

## Database Schema

```prisma
model PaymentTerm {
  id              String   @id @default(cuid())
  name            String   // "Net 30"
  days            Int      // 30
  description     String?  // "Payment due within 30 days"
  isDefault       Boolean  @default(false)
  isActive        Boolean  @default(true)
  organizationId  String
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([organizationId, name])
  @@index([organizationId])
}

// Update Contact model
model Contact {
  // ... existing fields
  paymentTermId   String?
  paymentTerm     PaymentTerm? @relation(fields: [paymentTermId], references: [id])
}
```

## API Endpoints

```
GET    /api/settings/payment-terms        - List payment terms
POST   /api/settings/payment-terms        - Create payment term
GET    /api/settings/payment-terms/:id    - Get payment term
PUT    /api/settings/payment-terms/:id    - Update payment term
DELETE /api/settings/payment-terms/:id    - Delete payment term
PUT    /api/settings/payment-terms/:id/default - Set as default
```

## Default Payment Terms (Seed Data)

```typescript
const DEFAULT_PAYMENT_TERMS = [
  { name: 'COD', days: 0, description: 'Cash on Delivery' },
  { name: 'Net 7', days: 7, description: 'Payment due within 7 days' },
  { name: 'Net 15', days: 15, description: 'Payment due within 15 days' },
  { name: 'Net 30', days: 30, description: 'Payment due within 30 days' },
  { name: 'Net 60', days: 60, description: 'Payment due within 60 days' },
  { name: 'Net 90', days: 90, description: 'Payment due within 90 days' },
];
```

## UI Components

### PaymentTermsSettings Page
```tsx
// Settings > Payment Terms
- Table with columns: Name, Days, Description, Default, Actions
- Add Payment Term button
- Edit/Delete actions
- Set Default action
```

### PaymentTermSelect Component
```tsx
interface PaymentTermSelectProps {
  value?: string;
  onChange: (termId: string) => void;
  showDays?: boolean;
  allowClear?: boolean;
}
```

## Integration Points

### Invoice Form
- Payment term dropdown
- Auto-calculate due date on term change
- Show days until due

### Bill Form
- Payment term dropdown
- Auto-calculate due date
- Inherit from vendor default

### Contact Form
- Default payment term field
- Applied to new transactions
