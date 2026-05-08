-- AlterTable
ALTER TABLE "quotations" ADD COLUMN     "counter_offer_amount" DECIMAL(18,2),
ADD COLUMN     "counter_offer_at" TIMESTAMP(3),
ADD COLUMN     "counter_offer_note" TEXT,
ADD COLUMN     "negotiation_status" VARCHAR(20) DEFAULT 'NONE';
