/**
 * Document translations for PDF generation.
 * Supports English (en) and Bahasa Malaysia (ms).
 */

export interface DocumentTranslations {
  // Common
  date: string;
  dueDate: string;
  number: string;
  description: string;
  quantity: string;
  unitPrice: string;
  amount: string;
  subtotal: string;
  discount: string;
  tax: string;
  taxSst: string;
  total: string;
  notes: string;
  termsAndConditions: string;
  thankYou: string;
  computerGenerated: string;
  page: string;
  of: string;
  currency: string;
  generatedOn: string;
  sku: string;
  itemDescription: string;
  unit: string;
  discountPercent: string;
  shipping: string;
  amountPaid: string;
  balanceDue: string;

  // Registration
  regNo: string;
  sstNo: string;
  tinLabel: string;
  tel: string;
  emailLabel: string;
  web: string;

  // Sales
  salesOrder: string;
  invoice: string;
  quote: string;
  quotation: string;
  creditNote: string;
  billTo: string;
  shipTo: string;
  paymentTerms: string;
  paymentTermsNet: string;
  salesperson: string;
  invoiceDate: string;
  orderDate: string;
  expectedShipDate: string;
  orderStatus: string;
  paymentStatus: string;
  paymentDetails: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  paymentReference: string;
  customerSstNo: string;
  eInvoiceVerification: string;
  authorizedSignature: string;
  customerSignature: string;

  // Purchase
  purchaseOrder: string;
  bill: string;
  vendor: string;
  vendorBillNo: string;
  deliverTo: string;
  expectedDate: string;
  deliveryInstructions: string;
  poReference: string;
  billDate: string;
  vendorSstNo: string;

  // Status
  draft: string;
  confirmed: string;
  paid: string;
  paidStatus: string;
  unpaid: string;
  partial: string;
  overdue: string;
  issued: string;
  sent: string;
  void: string;
  cancelled: string;
}

export const documentTranslations: Record<string, DocumentTranslations> = {
  en: {
    // Common
    date: 'Date',
    dueDate: 'Due Date',
    number: 'Number',
    description: 'Description',
    quantity: 'Qty',
    unitPrice: 'Unit Price',
    amount: 'Amount',
    subtotal: 'Subtotal',
    discount: 'Discount',
    tax: 'Tax',
    taxSst: 'Tax (SST)',
    total: 'Total',
    notes: 'Notes',
    termsAndConditions: 'Terms & Conditions',
    thankYou: 'Thank you for your business!',
    computerGenerated: 'This is a computer-generated document. No signature is required.',
    page: 'Page',
    of: 'of',
    currency: 'RM',
    generatedOn: 'Generated on',
    sku: 'SKU',
    itemDescription: 'Item Description',
    unit: 'Unit',
    discountPercent: 'Disc %',
    shipping: 'Shipping',
    amountPaid: 'Amount Paid',
    balanceDue: 'Balance Due',

    // Registration
    regNo: 'Reg No',
    sstNo: 'SST No',
    tinLabel: 'TIN',
    tel: 'Tel',
    emailLabel: 'Email',
    web: 'Web',

    // Sales
    salesOrder: 'Sales Order',
    invoice: 'Invoice',
    quote: 'Quote',
    quotation: 'Quotation',
    creditNote: 'Credit Note',
    billTo: 'Bill To',
    shipTo: 'Ship To',
    paymentTerms: 'Payment Terms',
    paymentTermsNet: 'Net',
    salesperson: 'Salesperson',
    invoiceDate: 'Invoice Date',
    orderDate: 'Order Date',
    expectedShipDate: 'Expected Ship Date',
    orderStatus: 'Order Status',
    paymentStatus: 'Payment Status',
    paymentDetails: 'Payment Details',
    bankName: 'Bank Name',
    accountName: 'Account Name',
    accountNumber: 'Account Number',
    paymentReference: 'Please use invoice number as payment reference.',
    customerSstNo: 'Customer SST No',
    eInvoiceVerification: 'Scan for e-Invoice verification',
    authorizedSignature: 'Authorized Signature',
    customerSignature: 'Customer Signature',

    // Purchase
    purchaseOrder: 'Purchase Order',
    bill: 'Bill',
    vendor: 'Vendor',
    vendorBillNo: 'Vendor Bill No',
    deliverTo: 'Deliver To',
    expectedDate: 'Expected Date',
    deliveryInstructions: 'Delivery Instructions',
    poReference: 'PO Reference',
    billDate: 'Bill Date',
    vendorSstNo: 'Vendor SST No',

    // Status
    draft: 'DRAFT',
    confirmed: 'CONFIRMED',
    paid: 'PAID',
    paidStatus: 'PAID',
    unpaid: 'UNPAID',
    partial: 'PARTIAL',
    overdue: 'OVERDUE',
    issued: 'ISSUED',
    sent: 'SENT',
    void: 'VOID',
    cancelled: 'CANCELLED',
  },
  ms: {
    // Common
    date: 'Tarikh',
    dueDate: 'Tarikh Tamat Tempoh',
    number: 'Nombor',
    description: 'Penerangan',
    quantity: 'Kuantiti',
    unitPrice: 'Harga Seunit',
    amount: 'Jumlah',
    subtotal: 'Jumlah Kecil',
    discount: 'Diskaun',
    tax: 'Cukai',
    taxSst: 'Cukai (SST)',
    total: 'Jumlah Besar',
    notes: 'Nota',
    termsAndConditions: 'Terma & Syarat',
    thankYou: 'Terima kasih atas urusan perniagaan anda!',
    computerGenerated: 'Ini adalah dokumen yang dijana oleh komputer. Tiada tandatangan diperlukan.',
    page: 'Halaman',
    of: 'daripada',
    currency: 'RM',
    generatedOn: 'Dijana pada',
    sku: 'SKU',
    itemDescription: 'Penerangan Item',
    unit: 'Unit',
    discountPercent: 'Diskaun %',
    shipping: 'Penghantaran',
    amountPaid: 'Jumlah Dibayar',
    balanceDue: 'Baki Tertunggak',

    // Registration
    regNo: 'No Pendaftaran',
    sstNo: 'No SST',
    tinLabel: 'TIN',
    tel: 'Tel',
    emailLabel: 'E-mel',
    web: 'Web',

    // Sales
    salesOrder: 'Pesanan Jualan',
    invoice: 'Invois',
    quote: 'Sebut Harga',
    quotation: 'Sebut Harga',
    creditNote: 'Nota Kredit',
    billTo: 'Bil Kepada',
    shipTo: 'Hantar Kepada',
    paymentTerms: 'Terma Pembayaran',
    paymentTermsNet: 'Bersih',
    salesperson: 'Jurujual',
    invoiceDate: 'Tarikh Invois',
    orderDate: 'Tarikh Pesanan',
    expectedShipDate: 'Tarikh Penghantaran Dijangka',
    orderStatus: 'Status Pesanan',
    paymentStatus: 'Status Pembayaran',
    paymentDetails: 'Butiran Pembayaran',
    bankName: 'Nama Bank',
    accountName: 'Nama Akaun',
    accountNumber: 'Nombor Akaun',
    paymentReference: 'Sila gunakan nombor invois sebagai rujukan pembayaran.',
    customerSstNo: 'No SST Pelanggan',
    eInvoiceVerification: 'Imbas untuk pengesahan e-Invois',
    authorizedSignature: 'Tandatangan Sah',
    customerSignature: 'Tandatangan Pelanggan',

    // Purchase
    purchaseOrder: 'Pesanan Belian',
    bill: 'Bil',
    vendor: 'Pembekal',
    vendorBillNo: 'No Bil Pembekal',
    deliverTo: 'Hantar Kepada',
    expectedDate: 'Tarikh Dijangka',
    deliveryInstructions: 'Arahan Penghantaran',
    poReference: 'Rujukan PO',
    billDate: 'Tarikh Bil',
    vendorSstNo: 'No SST Pembekal',

    // Status
    draft: 'DRAF',
    confirmed: 'DISAHKAN',
    paid: 'DIBAYAR',
    paidStatus: 'DIBAYAR',
    unpaid: 'BELUM DIBAYAR',
    partial: 'SEPARA',
    overdue: 'TERTUNGGAK',
    issued: 'DIKELUARKAN',
    sent: 'DIHANTAR',
    void: 'BATAL',
    cancelled: 'DIBATALKAN',
  },
};

/**
 * Get translations for a given locale.
 * Falls back to English if the locale is not supported.
 */
export function getDocumentTranslations(locale: string = 'en'): DocumentTranslations {
  return documentTranslations[locale] || documentTranslations.en;
}

/**
 * Supported document locales.
 */
export const SUPPORTED_DOCUMENT_LOCALES = ['en', 'ms'] as const;
export type DocumentLocale = (typeof SUPPORTED_DOCUMENT_LOCALES)[number];
