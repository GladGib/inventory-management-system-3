/**
 * Core entity interfaces mirroring the Prisma schema.
 * These represent the shapes returned by the API.
 */

import type {
  Status,
  UserRole,
  Industry,
  ItemType,
  ContactType,
  SerialStatus,
  SerialAction,
  ClaimStatus,
  BatchStatus,
  BatchTransactionType,
  AssemblyMethod,
  AssemblyStatus,
  AlertStatus,
  ForecastMethod,
  AdjustmentType,
  TransferStatus,
  TransactionStatus,
  ReceiveTransactionStatus,
  SalesOrderStatus,
  InvoiceStatus,
  PaymentStatus,
  ShipmentStatus,
  PurchaseOrderStatus,
  ReceiveStatus,
  BillStatus,
  TaxType,
  RoundingMethod,
  DiscountType,
  PaymentMethod,
  PriceListType,
  EInvoiceStatus,
  EmailType,
  EmailStatus,
  ReturnStatus,
  ReturnReason,
  ItemCondition,
  CreditNoteStatus,
  VendorCreditStatus,
} from './enums';

// ============================================
// ORGANIZATION & USERS
// ============================================

export interface Organization {
  id: string;
  name: string;
  slug: string;
  industry: Industry;
  baseCurrency: string;
  timezone: string;
  sstNumber?: string | null;
  businessRegNo?: string | null;
  tin?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  logoUrl?: string | null;
  settings: Record<string, unknown>;
  address?: Record<string, unknown> | null;
  status: Status;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  avatarUrl?: string | null;
  role: UserRole;
  organizationId: string;
  organization?: Organization;
  preferences: Record<string, unknown>;
  status: Status;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// ITEMS & INVENTORY
// ============================================

export interface Item {
  id: string;
  organizationId: string;
  sku: string;
  name: string;
  nameMalay?: string | null;
  description?: string | null;
  type: ItemType;
  unit: string;
  brand?: string | null;
  partNumber?: string | null;
  crossReferences: string[];
  vehicleModels: string[];
  categoryId?: string | null;
  itemGroupId?: string | null;
  costPrice: number;
  sellingPrice: number;
  reorderLevel: number;
  reorderQty: number;
  trackInventory: boolean;
  trackBatches: boolean;
  trackSerials: boolean;
  taxable: boolean;
  taxRateId?: string | null;
  images: string[];
  status: Status;
  createdAt: string;
  updatedAt: string;
  createdById?: string | null;

  // Relations (optional, populated on demand)
  category?: Category;
  itemGroup?: ItemGroup;
  taxRate?: TaxRate;
  stockLevels?: StockLevel[];
}

export interface ItemGroup {
  id: string;
  organizationId: string;
  name: string;
  description?: string | null;
  attributes: Array<{ name: string; options: string[] }>;
  status: Status;
  createdAt: string;
  updatedAt: string;
  items?: Item[];
}

export interface Category {
  id: string;
  organizationId: string;
  name: string;
  nameMalay?: string | null;
  description?: string | null;
  parentId?: string | null;
  sortOrder: number;
  status: Status;
  createdAt: string;
  updatedAt: string;
  parent?: Category;
  children?: Category[];
}

// ============================================
// WAREHOUSES & STOCK
// ============================================

export interface Warehouse {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  address?: Record<string, unknown> | null;
  phone?: string | null;
  email?: string | null;
  isDefault: boolean;
  status: Status;
  createdAt: string;
  updatedAt: string;
}

export interface StockLevel {
  id: string;
  itemId: string;
  warehouseId: string;
  stockOnHand: number;
  committedStock: number;
  incomingStock: number;
  updatedAt: string;

  item?: Item;
  warehouse?: Warehouse;
}

export interface Batch {
  id: string;
  itemId: string;
  warehouseId: string;
  batchNumber: string;
  manufactureDate?: string | null;
  expiryDate?: string | null;
  quantity: number;
  initialQuantity: number;
  status: BatchStatus;
  notes?: string | null;
  purchaseReceiveId?: string | null;
  supplierId?: string | null;
  organizationId: string;
  createdAt: string;
  updatedAt: string;

  item?: Item;
  warehouse?: Warehouse;
}

export interface BatchTransaction {
  id: string;
  batchId: string;
  type: BatchTransactionType;
  quantity: number;
  referenceType?: string | null;
  referenceId?: string | null;
  notes?: string | null;
  createdById?: string | null;
  createdAt: string;
}

export interface SerialNumber {
  id: string;
  itemId: string;
  serialNumber: string;
  warehouseId?: string | null;
  status: SerialStatus;
  soldToId?: string | null;
  purchaseReceiveId?: string | null;
  purchaseDate?: string | null;
  purchaseCost?: number | null;
  supplierId?: string | null;
  saleDate?: string | null;
  warrantyMonths?: number | null;
  warrantyStartDate?: string | null;
  warrantyEndDate?: string | null;
  notes?: string | null;
  organizationId: string;
  createdAt: string;
  updatedAt: string;

  item?: Item;
  warehouse?: Warehouse;
  soldTo?: Contact;
}

export interface SerialHistory {
  id: string;
  serialNumberId: string;
  action: SerialAction;
  fromStatus?: SerialStatus | null;
  toStatus: SerialStatus;
  fromWarehouseId?: string | null;
  toWarehouseId?: string | null;
  referenceType?: string | null;
  referenceId?: string | null;
  notes?: string | null;
  createdById?: string | null;
  createdAt: string;
}

export interface WarrantyClaim {
  id: string;
  claimNumber: string;
  serialNumberId: string;
  customerId: string;
  claimDate: string;
  issueDescription: string;
  status: ClaimStatus;
  resolution?: string | null;
  resolvedDate?: string | null;
  replacementSerialId?: string | null;
  organizationId: string;
  createdById?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StockAdjustment {
  id: string;
  organizationId: string;
  adjustmentNumber: string;
  warehouseId: string;
  itemId?: string | null;
  type: AdjustmentType;
  quantity?: number | null;
  reason?: string | null;
  date: string;
  adjustmentDate: string;
  status: TransactionStatus;
  notes?: string | null;
  createdById?: string | null;
  createdAt: string;
  updatedAt: string;

  warehouse?: Warehouse;
  item?: Item;
  items?: StockAdjustmentItem[];
}

export interface StockAdjustmentItem {
  id: string;
  stockAdjustmentId: string;
  itemId: string;
  quantityAdjusted: number;
  reason?: string | null;

  item?: Item;
}

export interface InventoryTransfer {
  id: string;
  organizationId: string;
  transferNumber: string;
  sourceWarehouseId: string;
  targetWarehouseId: string;
  transferDate: string;
  status: TransferStatus;
  notes?: string | null;
  createdById?: string | null;
  receivedById?: string | null;
  receivedAt?: string | null;
  createdAt: string;
  updatedAt: string;

  sourceWarehouse?: Warehouse;
  targetWarehouse?: Warehouse;
  items?: InventoryTransferItem[];
}

export interface InventoryTransferItem {
  id: string;
  inventoryTransferId: string;
  itemId: string;
  quantityRequested: number;
  quantityShipped: number;
  quantityReceived: number;
  notes?: string | null;

  item?: Item;
}

// ============================================
// COMPOSITE ITEMS
// ============================================

export interface CompositeItem {
  id: string;
  itemId: string;
  assemblyMethod: AssemblyMethod;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  item?: Item;
  components?: BOMComponent[];
}

export interface BOMComponent {
  id: string;
  compositeItemId: string;
  componentItemId: string;
  quantity: number;
  notes?: string | null;
  sortOrder: number;
  componentItem?: Item;
}

export interface Assembly {
  id: string;
  assemblyNumber: string;
  compositeItemId: string;
  quantity: number;
  warehouseId: string;
  status: AssemblyStatus;
  assemblyDate?: string | null;
  totalCost?: number | null;
  notes?: string | null;
  organizationId: string;
  createdById?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// REORDER AUTOMATION
// ============================================

export interface ItemReorderSettings {
  id: string;
  itemId: string;
  warehouseId?: string | null;
  reorderLevel: number;
  reorderQuantity: number;
  safetyStock: number;
  leadTimeDays: number;
  preferredVendorId?: string | null;
  autoReorder: boolean;
  isActive: boolean;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReorderAlert {
  id: string;
  itemId: string;
  warehouseId: string;
  currentStock: number;
  reorderLevel: number;
  suggestedQty: number;
  status: AlertStatus;
  purchaseOrderId?: string | null;
  notifiedAt?: string | null;
  resolvedAt?: string | null;
  organizationId: string;
  createdAt: string;
}

export interface DemandForecast {
  id: string;
  itemId: string;
  warehouseId?: string | null;
  period: string;
  forecastQty: number;
  actualQty?: number | null;
  variance?: number | null;
  confidence?: number | null;
  method: ForecastMethod;
  organizationId: string;
  createdAt: string;
}

// ============================================
// CONTACTS
// ============================================

export interface Contact {
  id: string;
  organizationId: string;
  type: ContactType;
  companyName: string;
  displayName: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  website?: string | null;
  taxNumber?: string | null;
  creditLimit?: number | null;
  paymentTermId?: string | null;
  priceListId?: string | null;
  billingAddress?: AddressData | null;
  shippingAddress?: AddressData | null;
  notes?: string | null;
  status: Status;
  createdAt: string;
  updatedAt: string;

  paymentTerm?: PaymentTerm;
  priceList?: PriceList;
  addresses?: Address[];
}

export interface Address {
  id: string;
  contactId: string;
  label: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  postcode: string;
  country: string;
  isDefault: boolean;
  isBilling: boolean;
  isShipping: boolean;
  phone?: string | null;
  attention?: string | null;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

/** Inline address data stored as JSON in transactions */
export interface AddressData {
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
  phone?: string;
  attention?: string;
}

// ============================================
// SALES MODULE
// ============================================

export interface SalesOrder {
  id: string;
  organizationId: string;
  orderNumber: string;
  customerId: string;
  orderDate: string;
  expectedShipDate?: string | null;
  shippedDate?: string | null;
  status: SalesOrderStatus;
  invoiceStatus: InvoiceStatus;
  paymentStatus: PaymentStatus;
  shipmentStatus: ShipmentStatus;
  salesPersonId?: string | null;
  warehouseId?: string | null;
  referenceNumber?: string | null;
  shippingAddress?: AddressData | null;
  billingAddress?: AddressData | null;
  subtotal: number;
  discountType: DiscountType;
  discountValue: number;
  discountAmount: number;
  shippingCharges: number;
  taxAmount: number;
  total: number;
  notes?: string | null;
  termsConditions?: string | null;
  createdById?: string | null;
  createdAt: string;
  updatedAt: string;

  customer?: Contact;
  salesPerson?: User;
  warehouse?: Warehouse;
  items?: SalesOrderItem[];
}

export interface SalesOrderItem {
  id: string;
  salesOrderId: string;
  itemId: string;
  description?: string | null;
  quantity: number;
  invoicedQty: number;
  shippedQty: number;
  unit: string;
  rate: number;
  discountType: DiscountType;
  discountValue: number;
  discountAmount: number;
  taxRateId?: string | null;
  taxAmount: number;
  amount: number;
  sortOrder: number;

  item?: Item;
}

export interface Invoice {
  id: string;
  organizationId: string;
  invoiceNumber: string;
  salesOrderId?: string | null;
  customerId: string;
  invoiceDate: string;
  dueDate: string;
  status: InvoiceStatus;
  paymentStatus: PaymentStatus;
  subtotal: number;
  discountType: DiscountType;
  discountValue: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  balance: number;
  billingAddress?: AddressData | null;
  paymentTermDays: number;
  notes?: string | null;
  termsConditions?: string | null;
  createdById?: string | null;
  eInvoiceId?: string | null;
  eInvoiceStatus?: EInvoiceStatus | null;
  eInvoiceQrCode?: string | null;
  createdAt: string;
  updatedAt: string;

  customer?: Contact;
  salesOrder?: SalesOrder;
  items?: InvoiceItem[];
}

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  itemId: string;
  description?: string | null;
  quantity: number;
  unit: string;
  rate: number;
  discountType: DiscountType;
  discountValue: number;
  discountAmount: number;
  taxRateId?: string | null;
  taxAmount: number;
  amount: number;
  sortOrder: number;

  item?: Item;
}

export interface Payment {
  id: string;
  organizationId: string;
  paymentNumber: string;
  customerId: string;
  paymentDate: string;
  amount: number;
  paymentMethod: PaymentMethod;
  referenceNumber?: string | null;
  bankAccountId?: string | null;
  isAdvancePayment: boolean;
  notes?: string | null;
  status: TransactionStatus;
  createdAt: string;
  updatedAt: string;

  customer?: Contact;
  allocations?: PaymentAllocation[];
}

export interface PaymentAllocation {
  id: string;
  paymentId: string;
  invoiceId: string;
  amount: number;
  createdAt: string;
}

// ============================================
// PURCHASE MODULE
// ============================================

export interface PurchaseOrder {
  id: string;
  organizationId: string;
  orderNumber: string;
  vendorId: string;
  orderDate: string;
  expectedDate?: string | null;
  status: PurchaseOrderStatus;
  receiveStatus: ReceiveStatus;
  billStatus: BillStatus;
  referenceNumber?: string | null;
  warehouseId?: string | null;
  deliveryAddress?: AddressData | null;
  subtotal: number;
  discountType: DiscountType;
  discountValue: number;
  discountAmount: number;
  shippingCharges: number;
  taxAmount: number;
  total: number;
  notes?: string | null;
  termsConditions?: string | null;
  createdById?: string | null;
  createdAt: string;
  updatedAt: string;

  vendor?: Contact;
  warehouse?: Warehouse;
  items?: PurchaseOrderItem[];
}

export interface PurchaseOrderItem {
  id: string;
  purchaseOrderId: string;
  itemId: string;
  description?: string | null;
  quantity: number;
  receivedQty: number;
  billedQty: number;
  unit: string;
  unitPrice: number;
  discountType: DiscountType;
  discountPercent: number;
  discountAmount: number;
  taxRateId?: string | null;
  taxAmount: number;
  total: number;
  sortOrder: number;

  item?: Item;
}

export interface Bill {
  id: string;
  organizationId: string;
  billNumber: string;
  purchaseOrderId?: string | null;
  purchaseReceiveId?: string | null;
  vendorId: string;
  vendorBillNumber?: string | null;
  billDate: string;
  dueDate: string;
  status: BillStatus;
  paymentStatus: PaymentStatus;
  subtotal: number;
  discountType: DiscountType;
  discountValue: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  balance: number;
  notes?: string | null;
  createdById?: string | null;
  createdAt: string;
  updatedAt: string;

  vendor?: Contact;
  purchaseOrder?: PurchaseOrder;
  items?: BillItem[];
}

export interface BillItem {
  id: string;
  billId: string;
  itemId?: string | null;
  accountId?: string | null;
  description?: string | null;
  quantity: number;
  unitPrice: number;
  taxRateId?: string | null;
  taxAmount: number;
  total: number;
  sortOrder: number;

  item?: Item;
}

export interface VendorPayment {
  id: string;
  organizationId: string;
  paymentNumber: string;
  vendorId: string;
  paymentDate: string;
  amount: number;
  unallocatedAmount: number;
  paymentMethod: PaymentMethod;
  referenceNumber?: string | null;
  bankAccountId?: string | null;
  isAdvancePayment: boolean;
  notes?: string | null;
  status: TransactionStatus;
  createdById?: string | null;
  createdAt: string;
  updatedAt: string;

  vendor?: Contact;
  allocations?: VendorPaymentAllocation[];
}

export interface VendorPaymentAllocation {
  id: string;
  vendorPaymentId: string;
  billId: string;
  amount: number;
  createdAt: string;
}

export interface PurchaseReceive {
  id: string;
  organizationId: string;
  receiveNumber: string;
  purchaseOrderId?: string | null;
  vendorId: string;
  warehouseId: string;
  receiveDate: string;
  referenceNumber?: string | null;
  notes?: string | null;
  status: ReceiveTransactionStatus;
  createdById?: string | null;
  createdAt: string;
  updatedAt: string;

  purchaseOrder?: PurchaseOrder;
  vendor?: Contact;
  warehouse?: Warehouse;
  items?: PurchaseReceiveItem[];
}

export interface PurchaseReceiveItem {
  id: string;
  purchaseReceiveId: string;
  itemId: string;
  purchaseOrderItemId?: string | null;
  description?: string | null;
  orderedQty: number;
  receivedQty: number;
  acceptedQty: number;
  rejectedQty: number;
  rejectionReason?: string | null;
  unitCost: number;
  batchNumber?: string | null;
  serialNumbers: string[];

  item?: Item;
}

// ============================================
// SETTINGS & CONFIGURATION
// ============================================

export interface TaxRate {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  rate: number;
  type: TaxType;
  description?: string | null;
  isDefault: boolean;
  isActive: boolean;
  status: Status;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationTaxSettings {
  id: string;
  organizationId: string;
  isSstRegistered: boolean;
  sstRegistrationNo?: string | null;
  sstRegisteredDate?: string | null;
  sstThreshold?: number | null;
  defaultSalesTaxId?: string | null;
  defaultPurchaseTaxId?: string | null;
  taxInclusive: boolean;
  roundingMethod: RoundingMethod;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentTerm {
  id: string;
  organizationId: string;
  name: string;
  days: number;
  description?: string | null;
  isDefault: boolean;
  isActive: boolean;
  status: Status;
  createdAt: string;
  updatedAt: string;
}

export interface PriceList {
  id: string;
  organizationId: string;
  name: string;
  description?: string | null;
  type: PriceListType;
  markupType: DiscountType;
  markupValue: number;
  isDefault: boolean;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  status: Status;
  createdAt: string;
  updatedAt: string;
  items?: PriceListItem[];
}

export interface PriceListItem {
  id: string;
  priceListId: string;
  itemId: string;
  customPrice: number;
  minQuantity: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// E-INVOICE (MyInvois)
// ============================================

export interface EInvoiceSettings {
  id: string;
  organizationId: string;
  tin?: string | null;
  brn?: string | null;
  clientId?: string | null;
  clientSecret?: string | null;
  certificatePath?: string | null;
  isProduction: boolean;
  isEnabled: boolean;
  autoSubmit: boolean;
  lastConnectionCheck?: string | null;
  connectionStatus?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EInvoiceSubmission {
  id: string;
  invoiceId: string;
  submissionUuid?: string | null;
  documentUuid?: string | null;
  longId?: string | null;
  status: EInvoiceStatus;
  submittedAt?: string | null;
  validatedAt?: string | null;
  cancelledAt?: string | null;
  rejectionReasons?: Record<string, unknown> | null;
  qrCodeData?: string | null;
  qrCodeUrl?: string | null;
  retryCount: number;
  lastError?: string | null;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// EMAIL NOTIFICATIONS
// ============================================

export interface EmailLog {
  id: string;
  type: EmailType;
  to: string;
  cc?: string | null;
  subject: string;
  body?: string | null;
  status: EmailStatus;
  sentAt?: string | null;
  error?: string | null;
  referenceType?: string | null;
  referenceId?: string | null;
  organizationId: string;
  createdById?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationEmailSettings {
  id: string;
  organizationId: string;
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpSecure: boolean;
  smtpUser?: string | null;
  smtpPass?: string | null;
  fromName?: string | null;
  fromEmail?: string | null;
  replyTo?: string | null;
  signature?: string | null;
  autoSendInvoice: boolean;
  autoSendPayment: boolean;
  autoSendOrder: boolean;
  autoSendPO: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// SALES RETURNS & CREDIT NOTES
// ============================================

export interface SalesReturn {
  id: string;
  organizationId: string;
  returnNumber: string;
  invoiceId?: string | null;
  salesOrderId?: string | null;
  customerId: string;
  returnDate: string;
  status: ReturnStatus;
  reason: ReturnReason;
  notes?: string | null;
  subtotal: number;
  taxAmount: number;
  total: number;
  creditNoteId?: string | null;
  warehouseId?: string | null;
  restockItems: boolean;
  createdById?: string | null;
  approvedById?: string | null;
  approvedAt?: string | null;
  receivedById?: string | null;
  receivedAt?: string | null;
  createdAt: string;
  updatedAt: string;

  invoice?: Invoice;
  salesOrder?: SalesOrder;
  customer?: Contact;
  creditNote?: CreditNote;
  warehouse?: Warehouse;
  items?: SalesReturnItem[];
}

export interface SalesReturnItem {
  id: string;
  salesReturnId: string;
  itemId: string;
  quantity: number;
  unitPrice: number;
  taxAmount: number;
  total: number;
  condition: ItemCondition;
  restocked: boolean;

  item?: Item;
}

export interface CreditNote {
  id: string;
  organizationId: string;
  creditNumber: string;
  customerId: string;
  creditDate: string;
  salesReturnId?: string | null;
  subtotal: number;
  taxAmount: number;
  total: number;
  balance: number;
  status: CreditNoteStatus;
  notes?: string | null;
  createdById?: string | null;
  createdAt: string;
  updatedAt: string;

  customer?: Contact;
  items?: CreditNoteItem[];
  applications?: CreditNoteApplication[];
}

export interface CreditNoteItem {
  id: string;
  creditNoteId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxAmount: number;
  total: number;
}

export interface CreditNoteApplication {
  id: string;
  creditNoteId: string;
  invoiceId: string;
  amount: number;
  appliedDate: string;
  createdById?: string | null;
}

// ============================================
// VENDOR CREDITS
// ============================================

export interface VendorCredit {
  id: string;
  organizationId: string;
  creditNumber: string;
  vendorId: string;
  creditDate: string;
  reference?: string | null;
  subtotal: number;
  taxAmount: number;
  total: number;
  balance: number;
  status: VendorCreditStatus;
  reason?: string | null;
  notes?: string | null;
  createdById?: string | null;
  createdAt: string;
  updatedAt: string;

  vendor?: Contact;
  items?: VendorCreditItem[];
  applications?: VendorCreditApplication[];
}

export interface VendorCreditItem {
  id: string;
  vendorCreditId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxAmount: number;
  total: number;
}

export interface VendorCreditApplication {
  id: string;
  vendorCreditId: string;
  billId: string;
  amount: number;
  appliedDate: string;
  createdById?: string | null;
}

// ============================================
// E-INVOICE DOCUMENTS
// ============================================

export interface EInvoiceDocument {
  id: string;
  submissionId: string;
  documentType: string;
  internalId: string;
  xmlContent: string;
  organizationId: string;
  createdAt: string;
}

// ============================================
// DASHBOARD LAYOUT
// ============================================

export interface UserDashboardLayout {
  id: string;
  userId: string;
  layoutConfig: Record<string, unknown>;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}
