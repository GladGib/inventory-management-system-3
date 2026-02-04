# Address Book

## Overview
Support multiple addresses per contact (customer/vendor) with billing and shipping designation.

## Requirements

### ADDR-001: Multiple Addresses per Contact
- **Priority**: P1
- **Description**: Store multiple addresses for each contact
- **Acceptance Criteria**:
  - Unlimited addresses per contact
  - Address label (Billing, Shipping, Warehouse, etc.)
  - Full Malaysian address format
  - Default address designation
  - Billing vs Shipping flags

### ADDR-002: Address CRUD
- **Priority**: P1
- **Description**: Create, read, update, delete addresses
- **Acceptance Criteria**:
  - Add address from contact detail page
  - Edit address inline or modal
  - Delete address with confirmation
  - Cannot delete if used in transactions

### ADDR-003: Address Selection in Transactions
- **Priority**: P1
- **Description**: Select address when creating sales/purchase documents
- **Acceptance Criteria**:
  - Dropdown to select from saved addresses
  - Auto-populate default billing/shipping
  - Option to enter one-time address
  - Copy billing to shipping button

### ADDR-004: Malaysian Address Format
- **Priority**: P1
- **Description**: Malaysian-specific address fields
- **Acceptance Criteria**:
  - Address Line 1 (required)
  - Address Line 2 (optional)
  - City (required)
  - State dropdown (Malaysian states)
  - Postcode (5-digit Malaysian format)
  - Country (default Malaysia)

## Database Schema

```prisma
model Address {
  id              String   @id @default(cuid())
  contactId       String
  contact         Contact  @relation(fields: [contactId], references: [id], onDelete: Cascade)
  label           String   // "Main Office", "Warehouse KL", etc.
  addressLine1    String
  addressLine2    String?
  city            String
  state           String
  postcode        String
  country         String   @default("Malaysia")
  isDefault       Boolean  @default(false)
  isBilling       Boolean  @default(true)
  isShipping      Boolean  @default(true)
  phone           String?
  attention       String?  // Contact person at address
  organizationId  String
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([contactId])
  @@index([organizationId])
}
```

## API Endpoints

```
GET    /api/contacts/:contactId/addresses        - List addresses
POST   /api/contacts/:contactId/addresses        - Create address
GET    /api/contacts/:contactId/addresses/:id    - Get address
PUT    /api/contacts/:contactId/addresses/:id    - Update address
DELETE /api/contacts/:contactId/addresses/:id    - Delete address
PUT    /api/contacts/:contactId/addresses/:id/default - Set as default
```

## UI Components

### AddressCard Component
```tsx
interface AddressCardProps {
  address: Address;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
  showActions?: boolean;
}
```

### AddressForm Component
```tsx
interface AddressFormProps {
  contactId: string;
  address?: Address;
  onSuccess: () => void;
  onCancel: () => void;
}
```

### AddressSelector Component
```tsx
interface AddressSelectorProps {
  contactId: string;
  type: 'billing' | 'shipping' | 'all';
  value?: string;
  onChange: (addressId: string) => void;
  allowCustom?: boolean;
}
```

## Malaysian States List

```typescript
const MALAYSIAN_STATES = [
  'Johor',
  'Kedah',
  'Kelantan',
  'Kuala Lumpur',
  'Labuan',
  'Melaka',
  'Negeri Sembilan',
  'Pahang',
  'Penang',
  'Perak',
  'Perlis',
  'Putrajaya',
  'Sabah',
  'Sarawak',
  'Selangor',
  'Terengganu',
];
```

## Frontend Integration

### Contact Detail Page
- Addresses tab showing all addresses
- Add Address button
- Address cards with edit/delete actions
- Default badge indicator
- Billing/Shipping badges

### Transaction Forms
- Address selector in sales order form
- Address selector in invoice form
- Address selector in purchase order form
- Inline address display with change option
