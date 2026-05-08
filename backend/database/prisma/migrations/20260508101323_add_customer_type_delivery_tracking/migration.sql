-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "customer_type" VARCHAR(20) DEFAULT 'RETAIL';

-- AlterTable
ALTER TABLE "deliveries" ADD COLUMN     "failed_at" TIMESTAMP(3),
ADD COLUMN     "failure_reason" TEXT,
ADD COLUMN     "tracking_code" VARCHAR(100);
