-- AlterTable
ALTER TABLE "inventory_stocks" ADD COLUMN     "reorder_threshold" DECIMAL(18,2) NOT NULL DEFAULT 10;

-- AlterTable
ALTER TABLE "sales_orders" ADD COLUMN     "backorder_status" VARCHAR(50),
ADD COLUMN     "inventory_deducted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paid_by_user_id" INTEGER;

-- CreateTable
CREATE TABLE "replenishment_requests" (
    "id" SERIAL NOT NULL,
    "request_number" VARCHAR(100) NOT NULL,
    "sales_order_id" INTEGER,
    "product_id" INTEGER NOT NULL,
    "warehouse_id" INTEGER,
    "shortage_quantity" DECIMAL(18,2) NOT NULL,
    "reserved_quantity" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "status" VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    "priority" VARCHAR(50) NOT NULL DEFAULT 'NORMAL',
    "requested_by" INTEGER,
    "assigned_to" INTEGER,
    "due_date" DATE,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "replenishment_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "replenishment_requests_request_number_key" ON "replenishment_requests"("request_number");

-- CreateIndex
CREATE INDEX "replenishment_requests_product_id_idx" ON "replenishment_requests"("product_id");

-- CreateIndex
CREATE INDEX "replenishment_requests_sales_order_id_idx" ON "replenishment_requests"("sales_order_id");

-- AddForeignKey
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_paid_by_user_id_fkey" FOREIGN KEY ("paid_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "replenishment_requests" ADD CONSTRAINT "replenishment_requests_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "replenishment_requests" ADD CONSTRAINT "replenishment_requests_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
