-- Migration: 20260209_add_iteration_abcd_models
-- Adds all new enums, models, columns, indexes, and constraints
-- from the latest iteration that are not covered by previous migrations.

-- ============================================
-- NEW ENUMS
-- ============================================

-- SerialStatus: Add new values (init had: IN_STOCK, SOLD, RETURNED, DAMAGED)
ALTER TYPE "SerialStatus" ADD VALUE 'DEFECTIVE';
ALTER TYPE "SerialStatus" ADD VALUE 'IN_REPAIR';
ALTER TYPE "SerialStatus" ADD VALUE 'SCRAPPED';
ALTER TYPE "SerialStatus" ADD VALUE 'IN_TRANSIT';

-- ItemType: Add COMPOSITE value (init had: INVENTORY, SERVICE, NON_INVENTORY)
ALTER TYPE "ItemType" ADD VALUE 'COMPOSITE';

-- PaymentTerm: isActive column was in init but not the isActive column on PaymentTerm
-- (already present in init table - checking...)

CREATE TYPE "SerialAction" AS ENUM ('RECEIVED', 'SOLD', 'RETURNED', 'TRANSFERRED', 'ADJUSTED', 'REPAIRED', 'SCRAPPED');

CREATE TYPE "ClaimStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'IN_PROGRESS', 'RESOLVED');

CREATE TYPE "BatchStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'DEPLETED', 'RECALLED');

CREATE TYPE "BatchTransactionType" AS ENUM ('RECEIVE', 'SALE', 'ADJUSTMENT', 'TRANSFER_IN', 'TRANSFER_OUT', 'RETURN', 'WRITE_OFF');

CREATE TYPE "AssemblyMethod" AS ENUM ('MANUAL', 'ON_SALE');

CREATE TYPE "AssemblyStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

CREATE TYPE "AlertStatus" AS ENUM ('PENDING', 'ACKNOWLEDGED', 'PO_CREATED', 'RESOLVED', 'IGNORED');

CREATE TYPE "ForecastMethod" AS ENUM ('MOVING_AVERAGE', 'EXPONENTIAL_SMOOTHING', 'SEASONAL', 'MANUAL');

CREATE TYPE "EInvoiceDocType" AS ENUM ('INVOICE', 'CREDIT_NOTE', 'DEBIT_NOTE', 'REFUND_NOTE', 'SELF_BILLED');

CREATE TYPE "EmailType" AS ENUM ('INVOICE_CREATED', 'PAYMENT_RECEIVED', 'ORDER_CONFIRMED', 'PO_ISSUED', 'CUSTOM');

CREATE TYPE "EmailStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'BOUNCED');

CREATE TYPE "ReturnStatus" AS ENUM ('PENDING', 'APPROVED', 'RECEIVED', 'PROCESSED', 'REJECTED');

CREATE TYPE "ReturnReason" AS ENUM ('DEFECTIVE', 'WRONG_ITEM', 'CHANGED_MIND', 'NOT_AS_DESCRIBED', 'QUALITY_ISSUE', 'DUPLICATE_ORDER', 'OTHER');

CREATE TYPE "ItemCondition" AS ENUM ('GOOD', 'DAMAGED', 'DEFECTIVE');

CREATE TYPE "CreditNoteStatus" AS ENUM ('OPEN', 'PARTIALLY_APPLIED', 'FULLY_APPLIED', 'VOID');

CREATE TYPE "VendorCreditStatus" AS ENUM ('OPEN', 'PARTIALLY_APPLIED', 'FULLY_APPLIED', 'VOID');

CREATE TYPE "CoreReturnStatus" AS ENUM ('PENDING', 'RECEIVED', 'CREDITED', 'REJECTED');

CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'EXPIRED', 'REJECTED', 'CONVERTED');

CREATE TYPE "BinType" AS ENUM ('STORAGE', 'PICKING', 'RECEIVING', 'SHIPPING', 'STAGING');

CREATE TYPE "AccountType" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE');

CREATE TYPE "JournalEntryStatus" AS ENUM ('DRAFT', 'POSTED');

CREATE TYPE "PaymentGateway" AS ENUM ('FPX', 'DUITNOW', 'GRABPAY', 'TNG');

CREATE TYPE "OnlinePaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED', 'EXPIRED');

-- ============================================
-- ALTER EXISTING TABLES: New columns
-- ============================================

-- Item: Add core item management columns and coreItemId self-reference
ALTER TABLE "Item" ADD COLUMN "hasCore" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Item" ADD COLUMN "coreCharge" DECIMAL(15,4) NOT NULL DEFAULT 0;
ALTER TABLE "Item" ADD COLUMN "coreItemId" TEXT;

-- Batch: Add new columns (init had: id, itemId, warehouseId, batchNumber, manufactureDate, expiryDate, quantity, status[Status enum], createdAt, updatedAt)
-- Schema now has: initialQuantity, status[BatchStatus], notes, purchaseReceiveId, supplierId, organizationId
-- We need to add new columns and change status type

-- Add new columns to Batch
ALTER TABLE "Batch" ADD COLUMN "initialQuantity" DECIMAL(15,4) NOT NULL DEFAULT 0;
ALTER TABLE "Batch" ADD COLUMN "notes" TEXT;
ALTER TABLE "Batch" ADD COLUMN "purchaseReceiveId" TEXT;
ALTER TABLE "Batch" ADD COLUMN "supplierId" TEXT;
ALTER TABLE "Batch" ADD COLUMN "organizationId" TEXT;

-- Update organizationId from Item relation for existing batches
UPDATE "Batch" SET "organizationId" = (SELECT "organizationId" FROM "Item" WHERE "Item"."id" = "Batch"."itemId") WHERE "organizationId" IS NULL;

-- Change Batch status from Status enum to BatchStatus enum
-- First add a temporary column, copy data, drop old, rename
ALTER TABLE "Batch" ADD COLUMN "statusNew" "BatchStatus" NOT NULL DEFAULT 'ACTIVE';
UPDATE "Batch" SET "statusNew" = 'ACTIVE' WHERE "status" = 'ACTIVE';
UPDATE "Batch" SET "statusNew" = 'DEPLETED' WHERE "status" = 'INACTIVE';
ALTER TABLE "Batch" DROP COLUMN "status";
ALTER TABLE "Batch" RENAME COLUMN "statusNew" TO "status";

-- Add new Batch indexes
CREATE INDEX "Batch_organizationId_idx" ON "Batch"("organizationId");
CREATE INDEX "Batch_status_idx" ON "Batch"("status");

-- SerialNumber: Add new columns (init had: id, itemId, serialNumber, warehouseId, status, soldToId, createdAt, updatedAt)
-- Schema now adds: purchaseReceiveId, purchaseDate, purchaseCost, supplierId, saleDate, warrantyMonths, warrantyStartDate, warrantyEndDate, notes, organizationId
ALTER TABLE "SerialNumber" ADD COLUMN "purchaseReceiveId" TEXT;
ALTER TABLE "SerialNumber" ADD COLUMN "purchaseDate" TIMESTAMP(3);
ALTER TABLE "SerialNumber" ADD COLUMN "purchaseCost" DECIMAL(15,4);
ALTER TABLE "SerialNumber" ADD COLUMN "supplierId" TEXT;
ALTER TABLE "SerialNumber" ADD COLUMN "saleDate" TIMESTAMP(3);
ALTER TABLE "SerialNumber" ADD COLUMN "warrantyMonths" INTEGER;
ALTER TABLE "SerialNumber" ADD COLUMN "warrantyStartDate" TIMESTAMP(3);
ALTER TABLE "SerialNumber" ADD COLUMN "warrantyEndDate" TIMESTAMP(3);
ALTER TABLE "SerialNumber" ADD COLUMN "notes" TEXT;
ALTER TABLE "SerialNumber" ADD COLUMN "organizationId" TEXT;

-- Update organizationId from Item relation for existing serial numbers
UPDATE "SerialNumber" SET "organizationId" = (SELECT "organizationId" FROM "Item" WHERE "Item"."id" = "SerialNumber"."itemId") WHERE "organizationId" IS NULL;

-- Add new SerialNumber index
CREATE INDEX "SerialNumber_organizationId_idx" ON "SerialNumber"("organizationId");

-- PaymentTerm: Add isActive column (init table didn't have isActive)
ALTER TABLE "PaymentTerm" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

-- PriceList: Add effectiveFrom and effectiveTo columns
ALTER TABLE "PriceList" ADD COLUMN "effectiveFrom" TIMESTAMP(3);
ALTER TABLE "PriceList" ADD COLUMN "effectiveTo" TIMESTAMP(3);

-- ============================================
-- NEW TABLES
-- ============================================

-- PortalUser
CREATE TABLE "PortalUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortalUser_pkey" PRIMARY KEY ("id")
);

-- CrossReference
CREATE TABLE "CrossReference" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "oemNumber" TEXT NOT NULL,
    "aftermarketNumber" TEXT,
    "brand" TEXT,
    "notes" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrossReference_pkey" PRIMARY KEY ("id")
);

-- PartSupersession
CREATE TABLE "PartSupersession" (
    "id" TEXT NOT NULL,
    "oldItemId" TEXT NOT NULL,
    "newItemId" TEXT NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartSupersession_pkey" PRIMARY KEY ("id")
);

-- SerialHistory
CREATE TABLE "SerialHistory" (
    "id" TEXT NOT NULL,
    "serialNumberId" TEXT NOT NULL,
    "action" "SerialAction" NOT NULL,
    "fromStatus" "SerialStatus",
    "toStatus" "SerialStatus" NOT NULL,
    "fromWarehouseId" TEXT,
    "toWarehouseId" TEXT,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SerialHistory_pkey" PRIMARY KEY ("id")
);

-- WarrantyClaim
CREATE TABLE "WarrantyClaim" (
    "id" TEXT NOT NULL,
    "claimNumber" TEXT NOT NULL,
    "serialNumberId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "claimDate" TIMESTAMP(3) NOT NULL,
    "issueDescription" TEXT NOT NULL,
    "status" "ClaimStatus" NOT NULL DEFAULT 'PENDING',
    "resolution" TEXT,
    "resolvedDate" TIMESTAMP(3),
    "replacementSerialId" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WarrantyClaim_pkey" PRIMARY KEY ("id")
);

-- BatchTransaction
CREATE TABLE "BatchTransaction" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "type" "BatchTransactionType" NOT NULL,
    "quantity" DECIMAL(15,4) NOT NULL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BatchTransaction_pkey" PRIMARY KEY ("id")
);

-- CompositeItem
CREATE TABLE "CompositeItem" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "assemblyMethod" "AssemblyMethod" NOT NULL DEFAULT 'MANUAL',
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompositeItem_pkey" PRIMARY KEY ("id")
);

-- BOMComponent
CREATE TABLE "BOMComponent" (
    "id" TEXT NOT NULL,
    "compositeItemId" TEXT NOT NULL,
    "componentItemId" TEXT NOT NULL,
    "quantity" DECIMAL(15,4) NOT NULL,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "BOMComponent_pkey" PRIMARY KEY ("id")
);

-- Assembly
CREATE TABLE "Assembly" (
    "id" TEXT NOT NULL,
    "assemblyNumber" TEXT NOT NULL,
    "compositeItemId" TEXT NOT NULL,
    "quantity" DECIMAL(15,4) NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "status" "AssemblyStatus" NOT NULL DEFAULT 'DRAFT',
    "assemblyDate" TIMESTAMP(3),
    "totalCost" DECIMAL(15,2),
    "notes" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assembly_pkey" PRIMARY KEY ("id")
);

-- AssemblyItem
CREATE TABLE "AssemblyItem" (
    "id" TEXT NOT NULL,
    "assemblyId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "requiredQty" DECIMAL(15,4) NOT NULL,
    "consumedQty" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "unitCost" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "totalCost" DECIMAL(15,2) NOT NULL DEFAULT 0,

    CONSTRAINT "AssemblyItem_pkey" PRIMARY KEY ("id")
);

-- ItemReorderSettings
CREATE TABLE "ItemReorderSettings" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "warehouseId" TEXT,
    "reorderLevel" DECIMAL(15,4) NOT NULL,
    "reorderQuantity" DECIMAL(15,4) NOT NULL,
    "safetyStock" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "leadTimeDays" INTEGER NOT NULL DEFAULT 0,
    "preferredVendorId" TEXT,
    "autoReorder" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemReorderSettings_pkey" PRIMARY KEY ("id")
);

-- ReorderAlert
CREATE TABLE "ReorderAlert" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "currentStock" DECIMAL(15,4) NOT NULL,
    "reorderLevel" DECIMAL(15,4) NOT NULL,
    "suggestedQty" DECIMAL(15,4) NOT NULL,
    "status" "AlertStatus" NOT NULL DEFAULT 'PENDING',
    "purchaseOrderId" TEXT,
    "notifiedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReorderAlert_pkey" PRIMARY KEY ("id")
);

-- DemandForecast
CREATE TABLE "DemandForecast" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "warehouseId" TEXT,
    "period" TIMESTAMP(3) NOT NULL,
    "forecastQty" DECIMAL(15,4) NOT NULL,
    "actualQty" DECIMAL(15,4),
    "variance" DECIMAL(15,4),
    "confidence" DECIMAL(5,4),
    "method" "ForecastMethod" NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DemandForecast_pkey" PRIMARY KEY ("id")
);

-- Address
CREATE TABLE "Address" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postcode" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'Malaysia',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isBilling" BOOLEAN NOT NULL DEFAULT true,
    "isShipping" BOOLEAN NOT NULL DEFAULT true,
    "phone" TEXT,
    "attention" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- EInvoiceSettings
CREATE TABLE "EInvoiceSettings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "tin" TEXT,
    "brn" TEXT,
    "clientId" TEXT,
    "clientSecret" TEXT,
    "certificatePath" TEXT,
    "isProduction" BOOLEAN NOT NULL DEFAULT false,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "autoSubmit" BOOLEAN NOT NULL DEFAULT false,
    "lastConnectionCheck" TIMESTAMP(3),
    "connectionStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EInvoiceSettings_pkey" PRIMARY KEY ("id")
);

-- EInvoiceSubmission
CREATE TABLE "EInvoiceSubmission" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "submissionUuid" TEXT,
    "documentUuid" TEXT,
    "longId" TEXT,
    "status" "EInvoiceStatus" NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3),
    "validatedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "rejectionReasons" JSONB,
    "qrCodeData" TEXT,
    "qrCodeUrl" TEXT,
    "rawRequest" JSONB,
    "rawResponse" JSONB,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EInvoiceSubmission_pkey" PRIMARY KEY ("id")
);

-- EInvoiceDocument
CREATE TABLE "EInvoiceDocument" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "documentType" "EInvoiceDocType" NOT NULL,
    "xmlContent" TEXT NOT NULL,
    "signedXml" TEXT,
    "hash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EInvoiceDocument_pkey" PRIMARY KEY ("id")
);

-- UserDashboardLayout
CREATE TABLE "UserDashboardLayout" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "layoutConfig" JSONB NOT NULL DEFAULT '[]',
    "widgetSettings" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserDashboardLayout_pkey" PRIMARY KEY ("id")
);

-- PriceListItem
CREATE TABLE "PriceListItem" (
    "id" TEXT NOT NULL,
    "priceListId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "customPrice" DECIMAL(15,4) NOT NULL,
    "minQuantity" DECIMAL(15,4) NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriceListItem_pkey" PRIMARY KEY ("id")
);

-- EmailLog
CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL,
    "type" "EmailType" NOT NULL,
    "to" TEXT NOT NULL,
    "cc" TEXT,
    "subject" TEXT NOT NULL,
    "body" TEXT,
    "status" "EmailStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "error" TEXT,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- OrganizationEmailSettings
CREATE TABLE "OrganizationEmailSettings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "smtpHost" TEXT,
    "smtpPort" INTEGER DEFAULT 587,
    "smtpSecure" BOOLEAN NOT NULL DEFAULT true,
    "smtpUser" TEXT,
    "smtpPass" TEXT,
    "fromName" TEXT,
    "fromEmail" TEXT,
    "replyTo" TEXT,
    "signature" TEXT,
    "autoSendInvoice" BOOLEAN NOT NULL DEFAULT false,
    "autoSendPayment" BOOLEAN NOT NULL DEFAULT false,
    "autoSendOrder" BOOLEAN NOT NULL DEFAULT false,
    "autoSendPO" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationEmailSettings_pkey" PRIMARY KEY ("id")
);

-- SalesReturn
CREATE TABLE "SalesReturn" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "returnNumber" TEXT NOT NULL,
    "invoiceId" TEXT,
    "salesOrderId" TEXT,
    "customerId" TEXT NOT NULL,
    "returnDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "ReturnStatus" NOT NULL DEFAULT 'PENDING',
    "reason" "ReturnReason" NOT NULL,
    "notes" TEXT,
    "subtotal" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "creditNoteId" TEXT,
    "warehouseId" TEXT,
    "restockItems" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "receivedById" TEXT,
    "receivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesReturn_pkey" PRIMARY KEY ("id")
);

-- SalesReturnItem
CREATE TABLE "SalesReturnItem" (
    "id" TEXT NOT NULL,
    "salesReturnId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" DECIMAL(15,4) NOT NULL,
    "unitPrice" DECIMAL(15,4) NOT NULL,
    "taxAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(15,2) NOT NULL,
    "condition" "ItemCondition" NOT NULL DEFAULT 'GOOD',
    "restocked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SalesReturnItem_pkey" PRIMARY KEY ("id")
);

-- CreditNote
CREATE TABLE "CreditNote" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "creditNumber" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "creditDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "salesReturnId" TEXT,
    "subtotal" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "balance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "status" "CreditNoteStatus" NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditNote_pkey" PRIMARY KEY ("id")
);

-- CreditNoteItem
CREATE TABLE "CreditNoteItem" (
    "id" TEXT NOT NULL,
    "creditNoteId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(15,4) NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(15,4) NOT NULL,
    "taxAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(15,2) NOT NULL,

    CONSTRAINT "CreditNoteItem_pkey" PRIMARY KEY ("id")
);

-- CreditNoteApplication
CREATE TABLE "CreditNoteApplication" (
    "id" TEXT NOT NULL,
    "creditNoteId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "appliedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "CreditNoteApplication_pkey" PRIMARY KEY ("id")
);

-- VendorCredit
CREATE TABLE "VendorCredit" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "creditNumber" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "creditDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reference" TEXT,
    "subtotal" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "balance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "status" "VendorCreditStatus" NOT NULL DEFAULT 'OPEN',
    "reason" TEXT,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorCredit_pkey" PRIMARY KEY ("id")
);

-- VendorCreditItem
CREATE TABLE "VendorCreditItem" (
    "id" TEXT NOT NULL,
    "vendorCreditId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(15,4) NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(15,4) NOT NULL,
    "taxAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(15,2) NOT NULL,

    CONSTRAINT "VendorCreditItem_pkey" PRIMARY KEY ("id")
);

-- VendorCreditApplication
CREATE TABLE "VendorCreditApplication" (
    "id" TEXT NOT NULL,
    "vendorCreditId" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "appliedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "VendorCreditApplication_pkey" PRIMARY KEY ("id")
);

-- CoreReturn
CREATE TABLE "CoreReturn" (
    "id" TEXT NOT NULL,
    "returnNumber" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "salesOrderId" TEXT,
    "invoiceId" TEXT,
    "coreCharge" DECIMAL(15,2) NOT NULL,
    "returnDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "CoreReturnStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoreReturn_pkey" PRIMARY KEY ("id")
);

-- Quote
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "quoteNumber" TEXT NOT NULL,
    "customerId" TEXT,
    "contactPersonName" TEXT,
    "quoteDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "salesPersonId" TEXT,
    "warehouseId" TEXT,
    "referenceNumber" TEXT,
    "subtotal" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "discountType" "DiscountType" NOT NULL DEFAULT 'PERCENTAGE',
    "discountValue" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "termsConditions" TEXT,
    "convertedToOrderId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- QuoteItem
CREATE TABLE "QuoteItem" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "description" TEXT,
    "quantity" DECIMAL(15,4) NOT NULL,
    "unit" TEXT NOT NULL,
    "rate" DECIMAL(15,4) NOT NULL,
    "discountType" "DiscountType" NOT NULL DEFAULT 'PERCENTAGE',
    "discountValue" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "taxRateId" TEXT,
    "taxAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "amount" DECIMAL(15,2) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "QuoteItem_pkey" PRIMARY KEY ("id")
);

-- WarehouseZone
CREATE TABLE "WarehouseZone" (
    "id" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WarehouseZone_pkey" PRIMARY KEY ("id")
);

-- Bin
CREATE TABLE "Bin" (
    "id" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "warehouseZoneId" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT,
    "type" "BinType" NOT NULL DEFAULT 'STORAGE',
    "maxCapacity" DECIMAL(15,4),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bin_pkey" PRIMARY KEY ("id")
);

-- BinStock
CREATE TABLE "BinStock" (
    "id" TEXT NOT NULL,
    "binId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "batchId" TEXT,
    "organizationId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BinStock_pkey" PRIMARY KEY ("id")
);

-- VehicleMake
CREATE TABLE "VehicleMake" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleMake_pkey" PRIMARY KEY ("id")
);

-- VehicleModel
CREATE TABLE "VehicleModel" (
    "id" TEXT NOT NULL,
    "makeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleModel_pkey" PRIMARY KEY ("id")
);

-- ItemVehicleCompatibility
CREATE TABLE "ItemVehicleCompatibility" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "vehicleMakeId" TEXT NOT NULL,
    "vehicleModelId" TEXT,
    "yearFrom" INTEGER,
    "yearTo" INTEGER,
    "notes" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemVehicleCompatibility_pkey" PRIMARY KEY ("id")
);

-- ChartOfAccount
CREATE TABLE "ChartOfAccount" (
    "id" TEXT NOT NULL,
    "accountCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AccountType" NOT NULL,
    "parentId" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChartOfAccount_pkey" PRIMARY KEY ("id")
);

-- JournalEntry
CREATE TABLE "JournalEntry" (
    "id" TEXT NOT NULL,
    "entryNumber" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "sourceType" TEXT,
    "sourceId" TEXT,
    "status" "JournalEntryStatus" NOT NULL DEFAULT 'DRAFT',
    "organizationId" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id")
);

-- JournalEntryLine
CREATE TABLE "JournalEntryLine" (
    "id" TEXT NOT NULL,
    "journalEntryId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "debit" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "credit" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "description" TEXT,

    CONSTRAINT "JournalEntryLine_pkey" PRIMARY KEY ("id")
);

-- AccountMapping
CREATE TABLE "AccountMapping" (
    "id" TEXT NOT NULL,
    "transactionType" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "AccountMapping_pkey" PRIMARY KEY ("id")
);

-- OnlinePayment
CREATE TABLE "OnlinePayment" (
    "id" TEXT NOT NULL,
    "gateway" "PaymentGateway" NOT NULL,
    "status" "OnlinePaymentStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(15,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'MYR',
    "referenceNumber" TEXT NOT NULL,
    "gatewayRef" TEXT,
    "bankCode" TEXT,
    "buyerEmail" TEXT,
    "buyerName" TEXT,
    "description" TEXT,
    "callbackPayload" JSONB,
    "errorMessage" TEXT,
    "invoiceId" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "OnlinePayment_pkey" PRIMARY KEY ("id")
);

-- BankAccount
CREATE TABLE "BankAccount" (
    "id" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "bankCode" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "accountType" TEXT NOT NULL DEFAULT 'CURRENT',
    "swiftCode" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "openingBalance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "currentBalance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);

-- BankTransaction
CREATE TABLE "BankTransaction" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "reference" TEXT,
    "reconciled" BOOLEAN NOT NULL DEFAULT false,
    "reconciledAt" TIMESTAMP(3),
    "bankAccountId" TEXT NOT NULL,
    "paymentId" TEXT,
    "vendorPaymentId" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankTransaction_pkey" PRIMARY KEY ("id")
);

-- AuditLog
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "changes" JSONB,
    "userId" TEXT,
    "userEmail" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- DeviceToken
CREATE TABLE "DeviceToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "deviceName" TEXT,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeviceToken_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- UNIQUE INDEXES
-- ============================================

CREATE UNIQUE INDEX "PortalUser_email_organizationId_key" ON "PortalUser"("email", "organizationId");

CREATE UNIQUE INDEX "WarrantyClaim_claimNumber_key" ON "WarrantyClaim"("claimNumber");

CREATE UNIQUE INDEX "CompositeItem_itemId_key" ON "CompositeItem"("itemId");

CREATE UNIQUE INDEX "Assembly_assemblyNumber_key" ON "Assembly"("assemblyNumber");

CREATE UNIQUE INDEX "ItemReorderSettings_itemId_warehouseId_key" ON "ItemReorderSettings"("itemId", "warehouseId");

CREATE UNIQUE INDEX "EInvoiceSettings_organizationId_key" ON "EInvoiceSettings"("organizationId");

CREATE UNIQUE INDEX "UserDashboardLayout_userId_key" ON "UserDashboardLayout"("userId");

CREATE UNIQUE INDEX "PriceListItem_priceListId_itemId_minQuantity_key" ON "PriceListItem"("priceListId", "itemId", "minQuantity");

CREATE UNIQUE INDEX "OrganizationEmailSettings_organizationId_key" ON "OrganizationEmailSettings"("organizationId");

CREATE UNIQUE INDEX "SalesReturn_organizationId_returnNumber_key" ON "SalesReturn"("organizationId", "returnNumber");

CREATE UNIQUE INDEX "CreditNote_organizationId_creditNumber_key" ON "CreditNote"("organizationId", "creditNumber");

CREATE UNIQUE INDEX "VendorCredit_organizationId_creditNumber_key" ON "VendorCredit"("organizationId", "creditNumber");

CREATE UNIQUE INDEX "CoreReturn_returnNumber_key" ON "CoreReturn"("returnNumber");

CREATE UNIQUE INDEX "Quote_organizationId_quoteNumber_key" ON "Quote"("organizationId", "quoteNumber");

CREATE UNIQUE INDEX "WarehouseZone_warehouseId_name_key" ON "WarehouseZone"("warehouseId", "name");

CREATE UNIQUE INDEX "Bin_warehouseId_code_key" ON "Bin"("warehouseId", "code");

CREATE UNIQUE INDEX "BinStock_binId_itemId_batchId_key" ON "BinStock"("binId", "itemId", "batchId");

CREATE UNIQUE INDEX "VehicleMake_organizationId_name_key" ON "VehicleMake"("organizationId", "name");

CREATE UNIQUE INDEX "VehicleModel_makeId_name_key" ON "VehicleModel"("makeId", "name");

CREATE UNIQUE INDEX "ChartOfAccount_organizationId_accountCode_key" ON "ChartOfAccount"("organizationId", "accountCode");

CREATE UNIQUE INDEX "JournalEntry_organizationId_entryNumber_key" ON "JournalEntry"("organizationId", "entryNumber");

CREATE UNIQUE INDEX "AccountMapping_organizationId_transactionType_key" ON "AccountMapping"("organizationId", "transactionType");

CREATE UNIQUE INDEX "OnlinePayment_referenceNumber_key" ON "OnlinePayment"("referenceNumber");

CREATE UNIQUE INDEX "DeviceToken_token_userId_key" ON "DeviceToken"("token", "userId");

-- ============================================
-- REGULAR INDEXES
-- ============================================

-- PortalUser
CREATE INDEX "PortalUser_contactId_idx" ON "PortalUser"("contactId");

-- CrossReference
CREATE INDEX "CrossReference_itemId_idx" ON "CrossReference"("itemId");
CREATE INDEX "CrossReference_organizationId_idx" ON "CrossReference"("organizationId");
CREATE INDEX "CrossReference_oemNumber_idx" ON "CrossReference"("oemNumber");
CREATE INDEX "CrossReference_aftermarketNumber_idx" ON "CrossReference"("aftermarketNumber");

-- PartSupersession
CREATE INDEX "PartSupersession_oldItemId_idx" ON "PartSupersession"("oldItemId");
CREATE INDEX "PartSupersession_newItemId_idx" ON "PartSupersession"("newItemId");
CREATE INDEX "PartSupersession_organizationId_idx" ON "PartSupersession"("organizationId");

-- SerialHistory
CREATE INDEX "SerialHistory_serialNumberId_idx" ON "SerialHistory"("serialNumberId");
CREATE INDEX "SerialHistory_referenceType_referenceId_idx" ON "SerialHistory"("referenceType", "referenceId");

-- WarrantyClaim
CREATE INDEX "WarrantyClaim_serialNumberId_idx" ON "WarrantyClaim"("serialNumberId");
CREATE INDEX "WarrantyClaim_organizationId_idx" ON "WarrantyClaim"("organizationId");
CREATE INDEX "WarrantyClaim_status_idx" ON "WarrantyClaim"("status");

-- BatchTransaction
CREATE INDEX "BatchTransaction_batchId_idx" ON "BatchTransaction"("batchId");
CREATE INDEX "BatchTransaction_referenceType_referenceId_idx" ON "BatchTransaction"("referenceType", "referenceId");

-- CompositeItem
CREATE INDEX "CompositeItem_organizationId_idx" ON "CompositeItem"("organizationId");

-- BOMComponent
CREATE INDEX "BOMComponent_compositeItemId_idx" ON "BOMComponent"("compositeItemId");
CREATE INDEX "BOMComponent_componentItemId_idx" ON "BOMComponent"("componentItemId");

-- Assembly
CREATE INDEX "Assembly_compositeItemId_idx" ON "Assembly"("compositeItemId");
CREATE INDEX "Assembly_organizationId_idx" ON "Assembly"("organizationId");
CREATE INDEX "Assembly_status_idx" ON "Assembly"("status");

-- AssemblyItem
CREATE INDEX "AssemblyItem_assemblyId_idx" ON "AssemblyItem"("assemblyId");
CREATE INDEX "AssemblyItem_itemId_idx" ON "AssemblyItem"("itemId");

-- ItemReorderSettings
CREATE INDEX "ItemReorderSettings_organizationId_idx" ON "ItemReorderSettings"("organizationId");
CREATE INDEX "ItemReorderSettings_isActive_idx" ON "ItemReorderSettings"("isActive");

-- ReorderAlert
CREATE INDEX "ReorderAlert_organizationId_idx" ON "ReorderAlert"("organizationId");
CREATE INDEX "ReorderAlert_status_idx" ON "ReorderAlert"("status");
CREATE INDEX "ReorderAlert_itemId_idx" ON "ReorderAlert"("itemId");

-- DemandForecast
CREATE INDEX "DemandForecast_itemId_idx" ON "DemandForecast"("itemId");
CREATE INDEX "DemandForecast_organizationId_idx" ON "DemandForecast"("organizationId");
CREATE INDEX "DemandForecast_period_idx" ON "DemandForecast"("period");

-- Address
CREATE INDEX "Address_contactId_idx" ON "Address"("contactId");
CREATE INDEX "Address_organizationId_idx" ON "Address"("organizationId");

-- EInvoiceSettings
CREATE INDEX "EInvoiceSettings_organizationId_idx" ON "EInvoiceSettings"("organizationId");

-- EInvoiceSubmission
CREATE INDEX "EInvoiceSubmission_invoiceId_idx" ON "EInvoiceSubmission"("invoiceId");
CREATE INDEX "EInvoiceSubmission_organizationId_idx" ON "EInvoiceSubmission"("organizationId");
CREATE INDEX "EInvoiceSubmission_status_idx" ON "EInvoiceSubmission"("status");

-- EInvoiceDocument
CREATE INDEX "EInvoiceDocument_submissionId_idx" ON "EInvoiceDocument"("submissionId");

-- UserDashboardLayout
CREATE INDEX "UserDashboardLayout_userId_idx" ON "UserDashboardLayout"("userId");

-- PriceListItem
CREATE INDEX "PriceListItem_priceListId_idx" ON "PriceListItem"("priceListId");
CREATE INDEX "PriceListItem_itemId_idx" ON "PriceListItem"("itemId");

-- EmailLog
CREATE INDEX "EmailLog_organizationId_type_idx" ON "EmailLog"("organizationId", "type");
CREATE INDEX "EmailLog_referenceType_referenceId_idx" ON "EmailLog"("referenceType", "referenceId");
CREATE INDEX "EmailLog_status_idx" ON "EmailLog"("status");

-- SalesReturn
CREATE INDEX "SalesReturn_organizationId_idx" ON "SalesReturn"("organizationId");
CREATE INDEX "SalesReturn_customerId_idx" ON "SalesReturn"("customerId");
CREATE INDEX "SalesReturn_status_idx" ON "SalesReturn"("status");
CREATE INDEX "SalesReturn_returnDate_idx" ON "SalesReturn"("returnDate");

-- SalesReturnItem
CREATE INDEX "SalesReturnItem_salesReturnId_idx" ON "SalesReturnItem"("salesReturnId");
CREATE INDEX "SalesReturnItem_itemId_idx" ON "SalesReturnItem"("itemId");

-- CreditNote
CREATE INDEX "CreditNote_organizationId_idx" ON "CreditNote"("organizationId");
CREATE INDEX "CreditNote_customerId_idx" ON "CreditNote"("customerId");
CREATE INDEX "CreditNote_status_idx" ON "CreditNote"("status");

-- CreditNoteItem
CREATE INDEX "CreditNoteItem_creditNoteId_idx" ON "CreditNoteItem"("creditNoteId");

-- CreditNoteApplication
CREATE INDEX "CreditNoteApplication_creditNoteId_idx" ON "CreditNoteApplication"("creditNoteId");
CREATE INDEX "CreditNoteApplication_invoiceId_idx" ON "CreditNoteApplication"("invoiceId");

-- VendorCredit
CREATE INDEX "VendorCredit_organizationId_idx" ON "VendorCredit"("organizationId");
CREATE INDEX "VendorCredit_vendorId_idx" ON "VendorCredit"("vendorId");
CREATE INDEX "VendorCredit_status_idx" ON "VendorCredit"("status");

-- VendorCreditItem
CREATE INDEX "VendorCreditItem_vendorCreditId_idx" ON "VendorCreditItem"("vendorCreditId");

-- VendorCreditApplication
CREATE INDEX "VendorCreditApplication_vendorCreditId_idx" ON "VendorCreditApplication"("vendorCreditId");
CREATE INDEX "VendorCreditApplication_billId_idx" ON "VendorCreditApplication"("billId");

-- CoreReturn
CREATE INDEX "CoreReturn_customerId_idx" ON "CoreReturn"("customerId");
CREATE INDEX "CoreReturn_itemId_idx" ON "CoreReturn"("itemId");
CREATE INDEX "CoreReturn_organizationId_idx" ON "CoreReturn"("organizationId");
CREATE INDEX "CoreReturn_status_idx" ON "CoreReturn"("status");

-- Quote
CREATE INDEX "Quote_organizationId_idx" ON "Quote"("organizationId");
CREATE INDEX "Quote_customerId_idx" ON "Quote"("customerId");
CREATE INDEX "Quote_status_idx" ON "Quote"("status");
CREATE INDEX "Quote_quoteDate_idx" ON "Quote"("quoteDate");

-- QuoteItem
CREATE INDEX "QuoteItem_quoteId_idx" ON "QuoteItem"("quoteId");
CREATE INDEX "QuoteItem_itemId_idx" ON "QuoteItem"("itemId");

-- WarehouseZone
CREATE INDEX "WarehouseZone_warehouseId_idx" ON "WarehouseZone"("warehouseId");
CREATE INDEX "WarehouseZone_organizationId_idx" ON "WarehouseZone"("organizationId");

-- Bin
CREATE INDEX "Bin_warehouseId_idx" ON "Bin"("warehouseId");
CREATE INDEX "Bin_warehouseZoneId_idx" ON "Bin"("warehouseZoneId");
CREATE INDEX "Bin_organizationId_idx" ON "Bin"("organizationId");
CREATE INDEX "Bin_isActive_idx" ON "Bin"("isActive");

-- BinStock
CREATE INDEX "BinStock_binId_idx" ON "BinStock"("binId");
CREATE INDEX "BinStock_itemId_idx" ON "BinStock"("itemId");
CREATE INDEX "BinStock_organizationId_idx" ON "BinStock"("organizationId");

-- VehicleMake
CREATE INDEX "VehicleMake_organizationId_idx" ON "VehicleMake"("organizationId");

-- VehicleModel
CREATE INDEX "VehicleModel_makeId_idx" ON "VehicleModel"("makeId");
CREATE INDEX "VehicleModel_organizationId_idx" ON "VehicleModel"("organizationId");

-- ItemVehicleCompatibility
CREATE INDEX "ItemVehicleCompatibility_itemId_idx" ON "ItemVehicleCompatibility"("itemId");
CREATE INDEX "ItemVehicleCompatibility_vehicleMakeId_idx" ON "ItemVehicleCompatibility"("vehicleMakeId");
CREATE INDEX "ItemVehicleCompatibility_vehicleModelId_idx" ON "ItemVehicleCompatibility"("vehicleModelId");
CREATE INDEX "ItemVehicleCompatibility_organizationId_idx" ON "ItemVehicleCompatibility"("organizationId");

-- ChartOfAccount
CREATE INDEX "ChartOfAccount_organizationId_idx" ON "ChartOfAccount"("organizationId");
CREATE INDEX "ChartOfAccount_type_idx" ON "ChartOfAccount"("type");
CREATE INDEX "ChartOfAccount_parentId_idx" ON "ChartOfAccount"("parentId");

-- JournalEntry
CREATE INDEX "JournalEntry_organizationId_idx" ON "JournalEntry"("organizationId");
CREATE INDEX "JournalEntry_date_idx" ON "JournalEntry"("date");
CREATE INDEX "JournalEntry_sourceType_sourceId_idx" ON "JournalEntry"("sourceType", "sourceId");
CREATE INDEX "JournalEntry_status_idx" ON "JournalEntry"("status");

-- JournalEntryLine
CREATE INDEX "JournalEntryLine_journalEntryId_idx" ON "JournalEntryLine"("journalEntryId");
CREATE INDEX "JournalEntryLine_accountId_idx" ON "JournalEntryLine"("accountId");

-- AccountMapping
CREATE INDEX "AccountMapping_organizationId_idx" ON "AccountMapping"("organizationId");

-- OnlinePayment
CREATE INDEX "OnlinePayment_organizationId_idx" ON "OnlinePayment"("organizationId");
CREATE INDEX "OnlinePayment_referenceNumber_idx" ON "OnlinePayment"("referenceNumber");
CREATE INDEX "OnlinePayment_invoiceId_idx" ON "OnlinePayment"("invoiceId");

-- BankAccount
CREATE INDEX "BankAccount_organizationId_idx" ON "BankAccount"("organizationId");

-- BankTransaction
CREATE INDEX "BankTransaction_bankAccountId_idx" ON "BankTransaction"("bankAccountId");
CREATE INDEX "BankTransaction_organizationId_idx" ON "BankTransaction"("organizationId");

-- AuditLog
CREATE INDEX "AuditLog_organizationId_idx" ON "AuditLog"("organizationId");
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- DeviceToken
CREATE INDEX "DeviceToken_userId_idx" ON "DeviceToken"("userId");
CREATE INDEX "DeviceToken_organizationId_idx" ON "DeviceToken"("organizationId");

-- ============================================
-- FOREIGN KEY CONSTRAINTS
-- ============================================

-- Item: coreItemId self-reference
ALTER TABLE "Item" ADD CONSTRAINT "Item_coreItemId_fkey" FOREIGN KEY ("coreItemId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- PortalUser
ALTER TABLE "PortalUser" ADD CONSTRAINT "PortalUser_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PortalUser" ADD CONSTRAINT "PortalUser_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CrossReference
ALTER TABLE "CrossReference" ADD CONSTRAINT "CrossReference_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- PartSupersession
ALTER TABLE "PartSupersession" ADD CONSTRAINT "PartSupersession_oldItemId_fkey" FOREIGN KEY ("oldItemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PartSupersession" ADD CONSTRAINT "PartSupersession_newItemId_fkey" FOREIGN KEY ("newItemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- SerialHistory
ALTER TABLE "SerialHistory" ADD CONSTRAINT "SerialHistory_serialNumberId_fkey" FOREIGN KEY ("serialNumberId") REFERENCES "SerialNumber"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- WarrantyClaim
ALTER TABLE "WarrantyClaim" ADD CONSTRAINT "WarrantyClaim_serialNumberId_fkey" FOREIGN KEY ("serialNumberId") REFERENCES "SerialNumber"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WarrantyClaim" ADD CONSTRAINT "WarrantyClaim_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WarrantyClaim" ADD CONSTRAINT "WarrantyClaim_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WarrantyClaim" ADD CONSTRAINT "WarrantyClaim_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WarrantyClaim" ADD CONSTRAINT "WarrantyClaim_replacementSerialId_fkey" FOREIGN KEY ("replacementSerialId") REFERENCES "SerialNumber"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- BatchTransaction
ALTER TABLE "BatchTransaction" ADD CONSTRAINT "BatchTransaction_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CompositeItem
ALTER TABLE "CompositeItem" ADD CONSTRAINT "CompositeItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- BOMComponent
ALTER TABLE "BOMComponent" ADD CONSTRAINT "BOMComponent_compositeItemId_fkey" FOREIGN KEY ("compositeItemId") REFERENCES "CompositeItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BOMComponent" ADD CONSTRAINT "BOMComponent_componentItemId_fkey" FOREIGN KEY ("componentItemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Assembly
ALTER TABLE "Assembly" ADD CONSTRAINT "Assembly_compositeItemId_fkey" FOREIGN KEY ("compositeItemId") REFERENCES "CompositeItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Assembly" ADD CONSTRAINT "Assembly_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Assembly" ADD CONSTRAINT "Assembly_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Assembly" ADD CONSTRAINT "Assembly_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AssemblyItem
ALTER TABLE "AssemblyItem" ADD CONSTRAINT "AssemblyItem_assemblyId_fkey" FOREIGN KEY ("assemblyId") REFERENCES "Assembly"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssemblyItem" ADD CONSTRAINT "AssemblyItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ItemReorderSettings
ALTER TABLE "ItemReorderSettings" ADD CONSTRAINT "ItemReorderSettings_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ItemReorderSettings" ADD CONSTRAINT "ItemReorderSettings_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ItemReorderSettings" ADD CONSTRAINT "ItemReorderSettings_preferredVendorId_fkey" FOREIGN KEY ("preferredVendorId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ItemReorderSettings" ADD CONSTRAINT "ItemReorderSettings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ReorderAlert
ALTER TABLE "ReorderAlert" ADD CONSTRAINT "ReorderAlert_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReorderAlert" ADD CONSTRAINT "ReorderAlert_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReorderAlert" ADD CONSTRAINT "ReorderAlert_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReorderAlert" ADD CONSTRAINT "ReorderAlert_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- DemandForecast
ALTER TABLE "DemandForecast" ADD CONSTRAINT "DemandForecast_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DemandForecast" ADD CONSTRAINT "DemandForecast_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DemandForecast" ADD CONSTRAINT "DemandForecast_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Address
ALTER TABLE "Address" ADD CONSTRAINT "Address_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- EInvoiceSettings
ALTER TABLE "EInvoiceSettings" ADD CONSTRAINT "EInvoiceSettings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- EInvoiceSubmission
ALTER TABLE "EInvoiceSubmission" ADD CONSTRAINT "EInvoiceSubmission_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EInvoiceSubmission" ADD CONSTRAINT "EInvoiceSubmission_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- EInvoiceDocument
ALTER TABLE "EInvoiceDocument" ADD CONSTRAINT "EInvoiceDocument_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "EInvoiceSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- UserDashboardLayout
ALTER TABLE "UserDashboardLayout" ADD CONSTRAINT "UserDashboardLayout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- PriceListItem
ALTER TABLE "PriceListItem" ADD CONSTRAINT "PriceListItem_priceListId_fkey" FOREIGN KEY ("priceListId") REFERENCES "PriceList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- SalesReturn
ALTER TABLE "SalesReturn" ADD CONSTRAINT "SalesReturn_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SalesReturn" ADD CONSTRAINT "SalesReturn_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "SalesOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SalesReturn" ADD CONSTRAINT "SalesReturn_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalesReturn" ADD CONSTRAINT "SalesReturn_creditNoteId_fkey" FOREIGN KEY ("creditNoteId") REFERENCES "CreditNote"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SalesReturn" ADD CONSTRAINT "SalesReturn_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SalesReturn" ADD CONSTRAINT "SalesReturn_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SalesReturn" ADD CONSTRAINT "SalesReturn_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SalesReturn" ADD CONSTRAINT "SalesReturn_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- SalesReturnItem
ALTER TABLE "SalesReturnItem" ADD CONSTRAINT "SalesReturnItem_salesReturnId_fkey" FOREIGN KEY ("salesReturnId") REFERENCES "SalesReturn"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SalesReturnItem" ADD CONSTRAINT "SalesReturnItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreditNote
ALTER TABLE "CreditNote" ADD CONSTRAINT "CreditNote_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CreditNote" ADD CONSTRAINT "CreditNote_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreditNoteItem
ALTER TABLE "CreditNoteItem" ADD CONSTRAINT "CreditNoteItem_creditNoteId_fkey" FOREIGN KEY ("creditNoteId") REFERENCES "CreditNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreditNoteApplication
ALTER TABLE "CreditNoteApplication" ADD CONSTRAINT "CreditNoteApplication_creditNoteId_fkey" FOREIGN KEY ("creditNoteId") REFERENCES "CreditNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreditNoteApplication" ADD CONSTRAINT "CreditNoteApplication_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- VendorCredit
ALTER TABLE "VendorCredit" ADD CONSTRAINT "VendorCredit_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VendorCredit" ADD CONSTRAINT "VendorCredit_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- VendorCreditItem
ALTER TABLE "VendorCreditItem" ADD CONSTRAINT "VendorCreditItem_vendorCreditId_fkey" FOREIGN KEY ("vendorCreditId") REFERENCES "VendorCredit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- VendorCreditApplication
ALTER TABLE "VendorCreditApplication" ADD CONSTRAINT "VendorCreditApplication_vendorCreditId_fkey" FOREIGN KEY ("vendorCreditId") REFERENCES "VendorCredit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VendorCreditApplication" ADD CONSTRAINT "VendorCreditApplication_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CoreReturn
ALTER TABLE "CoreReturn" ADD CONSTRAINT "CoreReturn_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CoreReturn" ADD CONSTRAINT "CoreReturn_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Quote
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- QuoteItem
ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- WarehouseZone
ALTER TABLE "WarehouseZone" ADD CONSTRAINT "WarehouseZone_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Bin
ALTER TABLE "Bin" ADD CONSTRAINT "Bin_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Bin" ADD CONSTRAINT "Bin_warehouseZoneId_fkey" FOREIGN KEY ("warehouseZoneId") REFERENCES "WarehouseZone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- BinStock
ALTER TABLE "BinStock" ADD CONSTRAINT "BinStock_binId_fkey" FOREIGN KEY ("binId") REFERENCES "Bin"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BinStock" ADD CONSTRAINT "BinStock_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- VehicleMake (no FK to Organization in schema, it's implicit through organizationId)

-- VehicleModel
ALTER TABLE "VehicleModel" ADD CONSTRAINT "VehicleModel_makeId_fkey" FOREIGN KEY ("makeId") REFERENCES "VehicleMake"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ItemVehicleCompatibility
ALTER TABLE "ItemVehicleCompatibility" ADD CONSTRAINT "ItemVehicleCompatibility_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ItemVehicleCompatibility" ADD CONSTRAINT "ItemVehicleCompatibility_vehicleMakeId_fkey" FOREIGN KEY ("vehicleMakeId") REFERENCES "VehicleMake"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ItemVehicleCompatibility" ADD CONSTRAINT "ItemVehicleCompatibility_vehicleModelId_fkey" FOREIGN KEY ("vehicleModelId") REFERENCES "VehicleModel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ChartOfAccount (self-reference)
ALTER TABLE "ChartOfAccount" ADD CONSTRAINT "ChartOfAccount_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ChartOfAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- JournalEntryLine
ALTER TABLE "JournalEntryLine" ADD CONSTRAINT "JournalEntryLine_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JournalEntryLine" ADD CONSTRAINT "JournalEntryLine_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "ChartOfAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AccountMapping
ALTER TABLE "AccountMapping" ADD CONSTRAINT "AccountMapping_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "ChartOfAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- OnlinePayment
ALTER TABLE "OnlinePayment" ADD CONSTRAINT "OnlinePayment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OnlinePayment" ADD CONSTRAINT "OnlinePayment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- BankAccount
ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- BankTransaction
ALTER TABLE "BankTransaction" ADD CONSTRAINT "BankTransaction_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BankTransaction" ADD CONSTRAINT "BankTransaction_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AuditLog
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- DeviceToken
ALTER TABLE "DeviceToken" ADD CONSTRAINT "DeviceToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeviceToken" ADD CONSTRAINT "DeviceToken_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
