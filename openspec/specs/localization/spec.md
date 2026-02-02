# Localization (Bilingual Support)

## Overview
English and Bahasa Malaysia bilingual support for the inventory management system.

## Requirements

### LOC-001: UI Language Switching
- **Priority**: P0
- **Description**: Toggle UI between English and Bahasa Malaysia
- **Acceptance Criteria**:
  - Language selector in header/settings
  - Persist language preference per user
  - Instant language switching
  - Default to organization preference

### LOC-002: Translation Management
- **Priority**: P0
- **Description**: Manage UI translations
- **Acceptance Criteria**:
  - Centralized translation files (JSON)
  - All UI labels translated
  - Menu items
  - Form labels
  - Button text
  - Error messages
  - Tooltips and help text

### LOC-003: Document Templates
- **Priority**: P0
- **Description**: Bilingual document generation
- **Acceptance Criteria**:
  - Invoice templates (EN/BM)
  - Sales order templates
  - Purchase order templates
  - Quotation templates
  - Receipt templates
  - Select language per document

### LOC-004: Item Names
- **Priority**: P1
- **Description**: Bilingual item names
- **Acceptance Criteria**:
  - Name field (primary)
  - nameMalay field (Bahasa Malaysia)
  - Display based on language preference
  - Search in both languages

### LOC-005: Malaysian Formatting
- **Priority**: P0
- **Description**: Malaysian locale formatting
- **Acceptance Criteria**:
  - Currency: RM (MYR)
  - Date format: DD/MM/YYYY
  - Number format: 1,234.56
  - Malaysian states dropdown
  - Postcode validation (5 digits)
  - Phone format (+60)

### LOC-006: Address Formatting
- **Priority**: P0
- **Description**: Malaysian address format
- **Acceptance Criteria**:
  - Address line 1, 2
  - City
  - Postcode (5 digits)
  - State (dropdown with all Malaysian states)
  - Country (default Malaysia)

## Translation Files

```json
// locales/en.json
{
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "search": "Search",
    "filter": "Filter",
    "export": "Export"
  },
  "nav": {
    "dashboard": "Dashboard",
    "items": "Items",
    "inventory": "Inventory",
    "sales": "Sales",
    "purchases": "Purchases",
    "contacts": "Contacts",
    "reports": "Reports",
    "settings": "Settings"
  },
  "items": {
    "title": "Items",
    "addItem": "Add Item",
    "sku": "SKU",
    "name": "Item Name",
    "category": "Category",
    "costPrice": "Cost Price",
    "sellingPrice": "Selling Price",
    "stockOnHand": "Stock on Hand"
  }
}

// locales/ms.json
{
  "common": {
    "save": "Simpan",
    "cancel": "Batal",
    "delete": "Padam",
    "edit": "Edit",
    "search": "Cari",
    "filter": "Tapis",
    "export": "Eksport"
  },
  "nav": {
    "dashboard": "Papan Pemuka",
    "items": "Barangan",
    "inventory": "Inventori",
    "sales": "Jualan",
    "purchases": "Pembelian",
    "contacts": "Kenalan",
    "reports": "Laporan",
    "settings": "Tetapan"
  },
  "items": {
    "title": "Barangan",
    "addItem": "Tambah Barangan",
    "sku": "SKU",
    "name": "Nama Barangan",
    "category": "Kategori",
    "costPrice": "Harga Kos",
    "sellingPrice": "Harga Jualan",
    "stockOnHand": "Stok di Tangan"
  }
}
```

## Malaysian States

```typescript
const MALAYSIAN_STATES = [
  { code: 'JHR', name: 'Johor', nameMalay: 'Johor' },
  { code: 'KDH', name: 'Kedah', nameMalay: 'Kedah' },
  { code: 'KTN', name: 'Kelantan', nameMalay: 'Kelantan' },
  { code: 'MLK', name: 'Melaka', nameMalay: 'Melaka' },
  { code: 'NSN', name: 'Negeri Sembilan', nameMalay: 'Negeri Sembilan' },
  { code: 'PHG', name: 'Pahang', nameMalay: 'Pahang' },
  { code: 'PNG', name: 'Penang', nameMalay: 'Pulau Pinang' },
  { code: 'PRK', name: 'Perak', nameMalay: 'Perak' },
  { code: 'PLS', name: 'Perlis', nameMalay: 'Perlis' },
  { code: 'SBH', name: 'Sabah', nameMalay: 'Sabah' },
  { code: 'SWK', name: 'Sarawak', nameMalay: 'Sarawak' },
  { code: 'SGR', name: 'Selangor', nameMalay: 'Selangor' },
  { code: 'TRG', name: 'Terengganu', nameMalay: 'Terengganu' },
  { code: 'KUL', name: 'Kuala Lumpur', nameMalay: 'Kuala Lumpur' },
  { code: 'LBN', name: 'Labuan', nameMalay: 'Labuan' },
  { code: 'PJY', name: 'Putrajaya', nameMalay: 'Putrajaya' },
];
```

## Implementation

### Frontend (Next.js)
- Use next-intl or react-i18next
- Server and client-side translations
- Dynamic locale switching
- SEO-friendly URLs (/en/..., /ms/...)

### Backend (NestJS)
- Accept-Language header support
- Localized error messages
- Document generation with locale parameter
