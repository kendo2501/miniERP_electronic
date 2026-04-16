-- Generated from schema.prisma
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE "roles" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    "name" VARCHAR(50) NOT NULL UNIQUE,
    "description" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT now()
);

CREATE TABLE "permissions" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    "code" VARCHAR(50) NOT NULL UNIQUE,
    "description" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT now()
);

CREATE TABLE "role_permissions" (
    "role_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,
    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id", "permission_id")
);

CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    "username" VARCHAR(50) NOT NULL UNIQUE,
    "password_hash" VARCHAR(255) NOT NULL,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT now(),
    "deleted_at" TIMESTAMP(6)
);

CREATE TABLE "user_roles" (
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id", "role_id")
);

CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    "user_id" UUID,
    "token_hash" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMP(6) NOT NULL,
    "revoked_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) DEFAULT now()
);

CREATE TABLE "attachments" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" UUID NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_url" TEXT NOT NULL,
    "document_type" VARCHAR(50),
    "uploaded_by" UUID,
    "created_at" TIMESTAMP(6) DEFAULT now()
);

CREATE TABLE "categories" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    "name" VARCHAR(100) NOT NULL,
    "parent_id" UUID
);

CREATE TABLE "products" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    "sku" VARCHAR(50) NOT NULL UNIQUE,
    "name" VARCHAR(255) NOT NULL,
    "category_id" UUID,
    "base_unit" VARCHAR(20) NOT NULL,
    "display_unit" VARCHAR(20) NOT NULL,
    "attributes" JSONB,
    "standard_cost" NUMERIC(15, 2) DEFAULT 0,
    "list_price" NUMERIC(15, 2) DEFAULT 0,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT now(),
    "updated_at" TIMESTAMP(6) DEFAULT now()
);

CREATE TABLE "uom_conversions" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    "product_id" UUID,
    "from_unit" VARCHAR(20) NOT NULL,
    "to_unit" VARCHAR(20) NOT NULL,
    "conversion_factor" NUMERIC(15, 4) NOT NULL,
    CONSTRAINT "uom_conversions_productId_fromUnit_toUnit_key" UNIQUE ("product_id", "from_unit", "to_unit")
);

CREATE TABLE "price_lists" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    "code" VARCHAR(50) NOT NULL UNIQUE,
    "name" VARCHAR(100) NOT NULL,
    "tier" VARCHAR(20),
    "valid_from" TIMESTAMP(6),
    "valid_to" TIMESTAMP(6),
    "is_active" BOOLEAN DEFAULT true
);

CREATE TABLE "price_list_items" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    "price_list_id" UUID,
    "product_id" UUID,
    "unit_price" NUMERIC(15, 2) NOT NULL,
    "discount_percentage" NUMERIC(5, 2) DEFAULT 0,
    CONSTRAINT "price_list_items_priceListId_productId_key" UNIQUE ("price_list_id", "product_id")
);

CREATE TABLE "business_partners" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    "code" VARCHAR(50) NOT NULL UNIQUE,
    "name" VARCHAR(255) NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "tier" VARCHAR(20),
    "credit_limit" NUMERIC(15, 2) DEFAULT 0,
    "current_debt" NUMERIC(15, 2) DEFAULT 0,
    "created_at" TIMESTAMP(6) DEFAULT now(),
    "deleted_at" TIMESTAMP(6),
    "tax_code" VARCHAR(50)
);

CREATE TABLE "warehouses" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    "code" VARCHAR(50) NOT NULL UNIQUE,
    "name" VARCHAR(255) NOT NULL,
    "location_address" TEXT
);

CREATE TABLE "warehouse_locations" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    "warehouse_id" UUID,
    "bin_code" VARCHAR(50) NOT NULL,
    CONSTRAINT "warehouse_locations_warehouseId_binCode_key" UNIQUE ("warehouse_id", "bin_code")
);

CREATE TABLE "inventory" (
    "product_id" UUID NOT NULL,
    "warehouse_id" UUID NOT NULL,
    "available_quantity" NUMERIC(15, 2) DEFAULT 0,
    "reserved_quantity" NUMERIC(15, 2) DEFAULT 0,
    "version" INTEGER DEFAULT 1,
    "updated_at" TIMESTAMP(6) DEFAULT now(),
    CONSTRAINT "inventory_pkey" PRIMARY KEY ("product_id", "warehouse_id")
);

CREATE TABLE "stock_ledger" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    "product_id" UUID,
    "warehouse_id" UUID,
    "transaction_type" VARCHAR(20) NOT NULL,
    "quantity" NUMERIC(15, 2) NOT NULL,
    "moving_average_cost" NUMERIC(15, 2),
    "reference_id" UUID,
    "created_by" UUID,
    "created_at" TIMESTAMP(6) DEFAULT now()
);

CREATE TABLE "purchase_requests" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    "pr_number" VARCHAR(50) NOT NULL UNIQUE,
    "status" VARCHAR(50) NOT NULL,
    "requested_by" UUID,
    "created_at" TIMESTAMP(6) DEFAULT now()
);

CREATE TABLE "purchase_orders" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    "po_number" VARCHAR(50) NOT NULL UNIQUE,
    "pr_id" UUID,
    "supplier_id" UUID,
    "status" VARCHAR(50) NOT NULL,
    "total_amount" NUMERIC(15, 2) NOT NULL DEFAULT 0,
    "created_by" UUID,
    "created_at" TIMESTAMP(6) DEFAULT now()
);

CREATE TABLE "purchase_order_items" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    "purchase_order_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "quantity" NUMERIC(15,2) NOT NULL,
    "unit_cost" NUMERIC(15,2) NOT NULL,
    "received_quantity" NUMERIC(15,2) NOT NULL DEFAULT 0
);

CREATE TABLE "goods_receipt_notes" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    "grn_number" VARCHAR(50) NOT NULL UNIQUE,
    "po_id" UUID,
    "warehouse_id" UUID,
    "status" VARCHAR(50) NOT NULL,
    "received_date" TIMESTAMP(6) DEFAULT now(),
    "created_by" UUID
);

CREATE TABLE "orders" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    "order_number" VARCHAR(50) NOT NULL UNIQUE,
    "customer_id" UUID,
    "status" VARCHAR(50) NOT NULL,
    "total_amount" NUMERIC(15, 2) NOT NULL DEFAULT 0,
    "tax_amount" NUMERIC(15, 2) NOT NULL DEFAULT 0,
    "discount_amount" NUMERIC(15, 2) NOT NULL DEFAULT 0,
    "final_amount" NUMERIC(15, 2) NOT NULL DEFAULT 0,
    "created_by" UUID,
    "created_at" TIMESTAMP(6) DEFAULT now(),
    "updated_at" TIMESTAMP(6) DEFAULT now(),
    "deleted_at" TIMESTAMP(6)
);

CREATE TABLE "order_items" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    "order_id" UUID,
    "product_id" UUID,
    "quantity" NUMERIC(15, 2) NOT NULL,
    "unit_price" NUMERIC(15, 2) NOT NULL,
    "total_price" NUMERIC(15, 2) NOT NULL
);

CREATE TABLE "shipments" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    "order_id" UUID,
    "shipment_number" VARCHAR(50) NOT NULL UNIQUE,
    "status" VARCHAR(50) NOT NULL,
    "delivery_date" TIMESTAMP(6),
    "partner_id" UUID,
    "created_at" TIMESTAMP(6) DEFAULT now(),
    "deleted_at" TIMESTAMP(6)
);

CREATE TABLE "shipment_items" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    "shipment_id" UUID,
    "order_item_id" UUID,
    "product_id" UUID,
    "delivered_quantity" NUMERIC(15, 2) NOT NULL
);

CREATE TABLE "accounting_periods" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    "period_name" VARCHAR(20) NOT NULL UNIQUE,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "is_closed" BOOLEAN DEFAULT false,
    "closed_at" TIMESTAMP(6),
    "closed_by" UUID
);

CREATE TABLE "debt_ledger" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    "partner_id" UUID,
    "transaction_type" VARCHAR(20) NOT NULL,
    "amount" NUMERIC(15, 2) NOT NULL,
    "balance_after" NUMERIC(15, 2) NOT NULL,
    "reference_id" UUID,
    "period_id" UUID,
    "created_at" TIMESTAMP(6) DEFAULT now()
);

CREATE TABLE "payments" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    "payment_number" VARCHAR(50) NOT NULL UNIQUE,
    "partner_id" UUID,
    "amount" NUMERIC(15, 2) NOT NULL,
    "payment_method" VARCHAR(50),
    "unallocated_amount" NUMERIC(15, 2) NOT NULL,
    "received_date" TIMESTAMP(6) DEFAULT now(),
    "created_by" UUID
);

CREATE TABLE "payment_allocations" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    "payment_id" UUID,
    "invoice_id" UUID,
    "allocated_amount" NUMERIC(15, 2) NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT now()
);

CREATE TABLE "idempotency_keys" (
    "key" VARCHAR(255) NOT NULL PRIMARY KEY,
    "request_path" VARCHAR(255) NOT NULL,
    "response_body" JSONB,
    "response_status" INTEGER,
    "created_at" TIMESTAMP(6) DEFAULT now()
);

CREATE TABLE "outbox_events" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    "aggregate_type" VARCHAR(50) NOT NULL,
    "aggregate_id" UUID NOT NULL,
    "event_type" VARCHAR(100) NOT NULL,
    "payload" JSONB NOT NULL,
    "status" VARCHAR(20) DEFAULT 'PENDING',
    "created_at" TIMESTAMP(6) DEFAULT now(),
    "processed_at" TIMESTAMP(6)
);

CREATE TABLE "daily_stats" (
    "stat_date" DATE NOT NULL PRIMARY KEY,
    "total_revenue" NUMERIC(15, 2) DEFAULT 0,
    "total_debt" NUMERIC(15, 2) DEFAULT 0,
    "top_selling_products" JSONB,
    "updated_at" TIMESTAMP(6) DEFAULT now()
);

ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "uom_conversions" ADD CONSTRAINT "uom_conversions_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "price_list_items" ADD CONSTRAINT "price_list_items_price_list_id_fkey" FOREIGN KEY ("price_list_id") REFERENCES "price_lists"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "price_list_items" ADD CONSTRAINT "price_list_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "warehouse_locations" ADD CONSTRAINT "warehouse_locations_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "stock_ledger" ADD CONSTRAINT "stock_ledger_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "stock_ledger" ADD CONSTRAINT "stock_ledger_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "stock_ledger" ADD CONSTRAINT "stock_ledger_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_pr_id_fkey" FOREIGN KEY ("pr_id") REFERENCES "purchase_requests"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "business_partners"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "goods_receipt_notes" ADD CONSTRAINT "goods_receipt_notes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "goods_receipt_notes" ADD CONSTRAINT "goods_receipt_notes_po_id_fkey" FOREIGN KEY ("po_id") REFERENCES "purchase_orders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "goods_receipt_notes" ADD CONSTRAINT "goods_receipt_notes_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "orders" ADD CONSTRAINT "orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "business_partners"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "business_partners"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "shipment_items" ADD CONSTRAINT "shipment_items_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "shipment_items" ADD CONSTRAINT "shipment_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "shipment_items" ADD CONSTRAINT "shipment_items_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "accounting_periods" ADD CONSTRAINT "accounting_periods_closed_by_fkey" FOREIGN KEY ("closed_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "debt_ledger" ADD CONSTRAINT "debt_ledger_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "business_partners"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "debt_ledger" ADD CONSTRAINT "debt_ledger_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "accounting_periods"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "debt_ledger" ADD CONSTRAINT "debt_ledger_reference_id_fkey" FOREIGN KEY ("reference_id") REFERENCES "orders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "payments" ADD CONSTRAINT "payments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "payments" ADD CONSTRAINT "payments_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "business_partners"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

CREATE INDEX "idx_products_attributes_gin" ON "products" USING GIN ("attributes");
