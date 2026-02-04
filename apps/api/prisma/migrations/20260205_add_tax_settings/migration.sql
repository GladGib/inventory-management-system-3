-- AlterEnum
ALTER TYPE "TaxType" ADD VALUE 'OUT_OF_SCOPE';

-- CreateEnum
CREATE TYPE "RoundingMethod" AS ENUM ('NORMAL', 'ROUND_DOWN', 'ROUND_UP');

-- AlterTable
ALTER TABLE "TaxRate" ADD COLUMN "code" TEXT,
ADD COLUMN "effectiveFrom" TIMESTAMP(3),
ADD COLUMN "effectiveTo" TIMESTAMP(3),
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

-- Update existing tax rates with codes based on type and rate
UPDATE "TaxRate" SET "code" = 'ST10' WHERE "type" = 'SST' AND "rate" = 10 AND "code" IS NULL;
UPDATE "TaxRate" SET "code" = 'ST6' WHERE "type" = 'SERVICE_TAX' AND "rate" = 6 AND "code" IS NULL;
UPDATE "TaxRate" SET "code" = 'ZR' WHERE "type" = 'ZERO_RATED' AND "code" IS NULL;
UPDATE "TaxRate" SET "code" = 'EX' WHERE "type" = 'EXEMPT' AND "code" IS NULL;
UPDATE "TaxRate" SET "code" = CONCAT('TAX', id) WHERE "code" IS NULL;

-- Make code required and unique per organization
ALTER TABLE "TaxRate" ALTER COLUMN "code" SET NOT NULL;

-- CreateTable
CREATE TABLE "OrganizationTaxSettings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "isSstRegistered" BOOLEAN NOT NULL DEFAULT false,
    "sstRegistrationNo" TEXT,
    "sstRegisteredDate" TIMESTAMP(3),
    "sstThreshold" DECIMAL(15,2),
    "defaultSalesTaxId" TEXT,
    "defaultPurchaseTaxId" TEXT,
    "taxInclusive" BOOLEAN NOT NULL DEFAULT false,
    "roundingMethod" "RoundingMethod" NOT NULL DEFAULT 'NORMAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationTaxSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationTaxSettings_organizationId_key" ON "OrganizationTaxSettings"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationTaxSettings_organizationId_idx" ON "OrganizationTaxSettings"("organizationId");

-- CreateIndex
CREATE INDEX "TaxRate_isActive_idx" ON "TaxRate"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "TaxRate_organizationId_code_key" ON "TaxRate"("organizationId", "code");
