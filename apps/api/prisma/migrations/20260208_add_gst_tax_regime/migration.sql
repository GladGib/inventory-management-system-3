-- AlterEnum: Add GST to TaxType
ALTER TYPE "TaxType" ADD VALUE 'GST';

-- CreateEnum: TaxRegime
CREATE TYPE "TaxRegime" AS ENUM ('GST', 'TAX_HOLIDAY', 'SST');

-- AlterTable: Add taxRegime column to TaxRate
ALTER TABLE "TaxRate" ADD COLUMN "taxRegime" "TaxRegime";
