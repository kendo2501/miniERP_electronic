-- AlterTable
ALTER TABLE "sales_orders" ADD COLUMN     "delivery_status" VARCHAR(20) NOT NULL DEFAULT 'PENDING';
