-- AddColumn: purchase_orders.sent_at, cancel_reason
ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "sent_at" TIMESTAMPTZ;
ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "cancel_reason" TEXT;

-- CreateTable: purchase_requests
CREATE TABLE IF NOT EXISTS "purchase_requests" (
    "id" SERIAL NOT NULL,
    "pr_number" VARCHAR(100) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "requested_by" INTEGER,
    "approved_by" INTEGER,
    "approved_at" TIMESTAMPTZ,
    "rejection_reason" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "purchase_requests_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "purchase_requests_pr_number_key" ON "purchase_requests"("pr_number");

-- CreateTable: purchase_request_items
CREATE TABLE IF NOT EXISTS "purchase_request_items" (
    "id" SERIAL NOT NULL,
    "purchase_request_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "quantity" DECIMAL(18,2) NOT NULL,
    "estimated_unit_price" DECIMAL(18,2),
    "notes" TEXT,
    CONSTRAINT "purchase_request_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable: rfqs
CREATE TABLE IF NOT EXISTS "rfqs" (
    "id" SERIAL NOT NULL,
    "rfq_number" VARCHAR(100) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    "winner_supplier_id" INTEGER,
    "notes" TEXT,
    "created_by" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "rfqs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "rfqs_rfq_number_key" ON "rfqs"("rfq_number");

-- CreateTable: rfq_items
CREATE TABLE IF NOT EXISTS "rfq_items" (
    "id" SERIAL NOT NULL,
    "rfq_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "quantity" DECIMAL(18,2) NOT NULL,
    CONSTRAINT "rfq_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable: rfq_supplier_quotes
CREATE TABLE IF NOT EXISTS "rfq_supplier_quotes" (
    "id" SERIAL NOT NULL,
    "rfq_id" INTEGER NOT NULL,
    "supplier_id" INTEGER NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    "total_amount" DECIMAL(18,2),
    "delivery_days" INTEGER,
    "notes" TEXT,
    "quoted_at" TIMESTAMPTZ,
    CONSTRAINT "rfq_supplier_quotes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "rfq_supplier_quotes_rfq_id_supplier_id_key" ON "rfq_supplier_quotes"("rfq_id", "supplier_id");

-- CreateTable: rfq_supplier_quote_items
CREATE TABLE IF NOT EXISTS "rfq_supplier_quote_items" (
    "id" SERIAL NOT NULL,
    "rfq_supplier_quote_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "unit_price" DECIMAL(18,2),
    "delivery_days" INTEGER,
    CONSTRAINT "rfq_supplier_quote_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable: purchase_invoices
CREATE TABLE IF NOT EXISTS "purchase_invoices" (
    "id" SERIAL NOT NULL,
    "invoice_number" VARCHAR(100) NOT NULL,
    "purchase_order_id" INTEGER,
    "supplier_id" INTEGER,
    "total_amount" DECIMAL(18,2) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    "due_date" DATE,
    "notes" TEXT,
    "matching_status" VARCHAR(50),
    "created_by" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "purchase_invoices_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "purchase_invoices_invoice_number_key" ON "purchase_invoices"("invoice_number");
CREATE INDEX IF NOT EXISTS "purchase_invoices_supplier_id_idx" ON "purchase_invoices"("supplier_id");

-- AddForeignKey: purchase_request_items
ALTER TABLE "purchase_request_items" ADD CONSTRAINT "purchase_request_items_purchase_request_id_fkey"
    FOREIGN KEY ("purchase_request_id") REFERENCES "purchase_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_request_items" ADD CONSTRAINT "purchase_request_items_product_id_fkey"
    FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: rfq_items
ALTER TABLE "rfq_items" ADD CONSTRAINT "rfq_items_rfq_id_fkey"
    FOREIGN KEY ("rfq_id") REFERENCES "rfqs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rfq_items" ADD CONSTRAINT "rfq_items_product_id_fkey"
    FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: rfq_supplier_quotes
ALTER TABLE "rfq_supplier_quotes" ADD CONSTRAINT "rfq_supplier_quotes_rfq_id_fkey"
    FOREIGN KEY ("rfq_id") REFERENCES "rfqs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rfq_supplier_quotes" ADD CONSTRAINT "rfq_supplier_quotes_supplier_id_fkey"
    FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: rfq_supplier_quote_items
ALTER TABLE "rfq_supplier_quote_items" ADD CONSTRAINT "rfq_supplier_quote_items_rfq_supplier_quote_id_fkey"
    FOREIGN KEY ("rfq_supplier_quote_id") REFERENCES "rfq_supplier_quotes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rfq_supplier_quote_items" ADD CONSTRAINT "rfq_supplier_quote_items_product_id_fkey"
    FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: purchase_invoices
ALTER TABLE "purchase_invoices" ADD CONSTRAINT "purchase_invoices_purchase_order_id_fkey"
    FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "purchase_invoices" ADD CONSTRAINT "purchase_invoices_supplier_id_fkey"
    FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
