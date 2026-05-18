-- AddColumns: sales_returns
ALTER TABLE "sales_returns" ADD COLUMN IF NOT EXISTS "approved_by" INTEGER;
ALTER TABLE "sales_returns" ADD COLUMN IF NOT EXISTS "approved_at" TIMESTAMPTZ;
ALTER TABLE "sales_returns" ADD COLUMN IF NOT EXISTS "rejection_reason" TEXT;

-- AddColumns: sales_return_items
ALTER TABLE "sales_return_items" ADD COLUMN IF NOT EXISTS "reason" TEXT;
ALTER TABLE "sales_return_items" ADD COLUMN IF NOT EXISTS "warehouse_id" INTEGER;
