# SST Tax Configuration UI

## Overview
Settings pages for managing Malaysian SST tax rates and organization tax settings.

## Requirements

### TAX-UI-001: Tax Rates List Page
- **Priority**: P2
- **Description**: Settings page listing all tax rates
- **Acceptance Criteria**:
  - Table with name, code, rate, type, status
  - Create new tax rate button
  - Edit/Delete actions
  - Set default action
  - Show default badge
  - Active/Inactive toggle

### TAX-UI-002: Tax Rate Form
- **Priority**: P2
- **Description**: Create/Edit tax rate form
- **Acceptance Criteria**:
  - Name field (e.g., "Sales Tax 10%")
  - Code field (e.g., "ST10")
  - Rate field (percentage)
  - Type dropdown (Sales Tax, Service Tax, Zero-rated, Exempt)
  - Description field
  - Active toggle
  - Effective date range

### TAX-UI-003: Organization SST Settings
- **Priority**: P2
- **Description**: Organization-level tax configuration
- **Acceptance Criteria**:
  - SST registration number
  - Registration date
  - Registration threshold
  - Is SST registered toggle
  - Default sales tax rate
  - Default purchase tax rate
  - Tax-inclusive pricing default
  - Rounding method

### TAX-UI-004: Tax Assignment to Items
- **Priority**: P2
- **Description**: Assign tax rates to items
- **Acceptance Criteria**:
  - Tax rate field in item form
  - Bulk update tax rate for multiple items
  - Filter items by tax rate
  - Tax override in transactions

### TAX-UI-005: Tax Display in Transactions
- **Priority**: P2
- **Description**: Show tax information in sales/purchase documents
- **Acceptance Criteria**:
  - Tax rate column in line items
  - Tax amount per line
  - Tax breakdown summary
  - Tax-inclusive toggle per document

## UI Components

### TaxRatesPage
```tsx
// /settings/tax-rates

const TaxRatesPage = () => {
  return (
    <SettingsPageContainer title="Tax Rates">
      <Card>
        <div className="flex justify-between mb-4">
          <div>
            <Typography.Text type="secondary">
              Configure SST tax rates for your organization
            </Typography.Text>
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            Add Tax Rate
          </Button>
        </div>

        <Table
          dataSource={taxRates}
          columns={[
            { title: 'Name', dataIndex: 'name' },
            { title: 'Code', dataIndex: 'code' },
            { title: 'Rate', dataIndex: 'rate', render: (v) => `${v}%` },
            { title: 'Type', dataIndex: 'type', render: renderTaxType },
            { title: 'Status', dataIndex: 'isActive', render: renderStatus },
            { title: 'Default', dataIndex: 'isDefault', render: renderDefault },
            { title: 'Actions', render: renderActions },
          ]}
        />
      </Card>
    </SettingsPageContainer>
  );
};
```

### TaxRateForm Component
```tsx
interface TaxRateFormProps {
  taxRate?: TaxRate;
  onSuccess: () => void;
  onCancel: () => void;
}

// Form fields:
// - Name (required)
// - Code (required, unique)
// - Rate (required, 0-100)
// - Type (required, dropdown)
// - Description (optional)
// - Is Active (toggle)
// - Effective From (date)
// - Effective To (date, optional)
```

### OrganizationTaxSettings Component
```tsx
// /settings/organization - Tax Settings section

const OrganizationTaxSettings = () => {
  return (
    <Card title="SST Settings">
      <Form layout="vertical">
        <Form.Item label="SST Registered" name="isSstRegistered">
          <Switch />
        </Form.Item>

        <Form.Item label="SST Registration Number" name="sstRegistrationNo">
          <Input placeholder="e.g., W10-1234-56789012" />
        </Form.Item>

        <Form.Item label="Registration Date" name="sstRegisteredDate">
          <DatePicker />
        </Form.Item>

        <Form.Item label="Default Sales Tax" name="defaultSalesTaxId">
          <TaxRateSelect type="sales" />
        </Form.Item>

        <Form.Item label="Default Purchase Tax" name="defaultPurchaseTaxId">
          <TaxRateSelect type="purchase" />
        </Form.Item>

        <Form.Item label="Pricing Mode" name="taxInclusive">
          <Radio.Group>
            <Radio value={false}>Tax Exclusive (add tax to price)</Radio>
            <Radio value={true}>Tax Inclusive (tax included in price)</Radio>
          </Radio.Group>
        </Form.Item>

        <Form.Item label="Rounding Method" name="roundingMethod">
          <Select>
            <Option value="NORMAL">Normal Rounding</Option>
            <Option value="ROUND_DOWN">Always Round Down</Option>
            <Option value="ROUND_UP">Always Round Up</Option>
          </Select>
        </Form.Item>
      </Form>
    </Card>
  );
};
```

### TaxRateSelect Component
```tsx
interface TaxRateSelectProps {
  value?: string;
  onChange?: (value: string) => void;
  type?: 'sales' | 'purchase' | 'all';
  showRate?: boolean;
  allowClear?: boolean;
}

// Dropdown showing: "Sales Tax 10% (ST10)" format
// Grouped by type if type='all'
```

### TaxBreakdown Component
```tsx
interface TaxBreakdownProps {
  items: LineItem[];
  showByRate?: boolean;
}

// Shows tax grouped by rate:
// Sales Tax 10%: RM 100.00
// Service Tax 6%: RM 30.00
// ----------------------
// Total Tax: RM 130.00
```

## Navigation

```
Settings
├── Organization
│   └── Tax Settings section
├── Tax Rates        <-- Add this page
├── Payment Terms
└── Users
```

## Seed Data for Tax Rates

```typescript
const DEFAULT_TAX_RATES = [
  { name: 'Sales Tax 10%', code: 'ST10', rate: 10, type: 'SALES_TAX', isDefault: true },
  { name: 'Service Tax 6%', code: 'ST6', rate: 6, type: 'SERVICE_TAX' },
  { name: 'Zero Rated', code: 'ZR', rate: 0, type: 'ZERO_RATED' },
  { name: 'Exempt', code: 'EX', rate: 0, type: 'EXEMPT' },
  { name: 'Out of Scope', code: 'OS', rate: 0, type: 'OUT_OF_SCOPE' },
];
```

## Tax Type Labels

```typescript
const TAX_TYPE_LABELS = {
  SALES_TAX: 'Sales Tax',
  SERVICE_TAX: 'Service Tax',
  ZERO_RATED: 'Zero Rated',
  EXEMPT: 'Exempt',
  OUT_OF_SCOPE: 'Out of Scope',
};

const TAX_TYPE_COLORS = {
  SALES_TAX: 'blue',
  SERVICE_TAX: 'green',
  ZERO_RATED: 'orange',
  EXEMPT: 'gray',
  OUT_OF_SCOPE: 'default',
};
```
