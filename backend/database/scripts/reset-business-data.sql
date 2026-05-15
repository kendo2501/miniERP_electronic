-- =============================================================
-- miniERP_electronic V2 — Business Data Reset
-- =============================================================
-- GIỮ LẠI:
--   users, roles, permissions, role_permissions, user_roles
--   sessions, refresh_tokens (xem ghi chú cuối)
--   organizations, warehouses, settings, notification_templates
--   categories, brands, products, product_attributes,
--   uom_conversions, product_images, inventory_stocks (reset về 0)
--
-- XÓA:
--   Finance  : invoices, payments, payment_allocations,
--              accounts_receivable_ledger, accounts_payable_ledger,
--              supplier_payments
--   Purchase : purchase_orders, purchase_order_items,
--              goods_receipts, goods_receipt_items, suppliers
--   Sales    : quotations, quotation_items, sales_orders,
--              sales_order_items, deliveries, delivery_items,
--              sales_returns, sales_return_items,
--              replenishment_requests, stock_inquiries,
--              stock_inquiry_items
--   Inventory: inventory_transactions, stock_counts,
--              stock_count_items
--   Customer : customers không linked với user account,
--              customer_addresses tương ứng, price_lists,
--              price_list_items
--   Logs     : audit_logs, notifications, attachments,
--              generated_reports, scheduled_reports
-- =============================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- KIỂM TRA TRƯỚC KHI XÓA (chỉ để xem trước, không thực thi)
-- Bỏ comment để xem số lượng rows sẽ bị xóa:
-- ─────────────────────────────────────────────────────────────
-- SELECT 'payment_allocations'        AS tbl, COUNT(*) FROM payment_allocations;
-- SELECT 'invoices'                   AS tbl, COUNT(*) FROM invoices;
-- SELECT 'payments'                   AS tbl, COUNT(*) FROM payments;
-- SELECT 'accounts_receivable_ledger' AS tbl, COUNT(*) FROM accounts_receivable_ledger;
-- SELECT 'accounts_payable_ledger'    AS tbl, COUNT(*) FROM accounts_payable_ledger;
-- SELECT 'supplier_payments'          AS tbl, COUNT(*) FROM supplier_payments;
-- SELECT 'goods_receipt_items'        AS tbl, COUNT(*) FROM goods_receipt_items;
-- SELECT 'goods_receipts'             AS tbl, COUNT(*) FROM goods_receipts;
-- SELECT 'purchase_order_items'       AS tbl, COUNT(*) FROM purchase_order_items;
-- SELECT 'purchase_orders'            AS tbl, COUNT(*) FROM purchase_orders;
-- SELECT 'suppliers'                  AS tbl, COUNT(*) FROM suppliers;
-- SELECT 'delivery_items'             AS tbl, COUNT(*) FROM delivery_items;
-- SELECT 'deliveries'                 AS tbl, COUNT(*) FROM deliveries;
-- SELECT 'sales_return_items'         AS tbl, COUNT(*) FROM sales_return_items;
-- SELECT 'sales_returns'              AS tbl, COUNT(*) FROM sales_returns;
-- SELECT 'replenishment_requests'     AS tbl, COUNT(*) FROM replenishment_requests;
-- SELECT 'stock_inquiry_items'        AS tbl, COUNT(*) FROM stock_inquiry_items;
-- SELECT 'stock_inquiries'            AS tbl, COUNT(*) FROM stock_inquiries;
-- SELECT 'sales_order_items'          AS tbl, COUNT(*) FROM sales_order_items;
-- SELECT 'sales_orders'               AS tbl, COUNT(*) FROM sales_orders;
-- SELECT 'quotation_items'            AS tbl, COUNT(*) FROM quotation_items;
-- SELECT 'quotations'                 AS tbl, COUNT(*) FROM quotations;
-- SELECT 'stock_count_items'          AS tbl, COUNT(*) FROM stock_count_items;
-- SELECT 'stock_counts'               AS tbl, COUNT(*) FROM stock_counts;
-- SELECT 'inventory_transactions'     AS tbl, COUNT(*) FROM inventory_transactions;
-- SELECT 'price_list_items'           AS tbl, COUNT(*) FROM price_list_items;
-- SELECT 'price_lists'                AS tbl, COUNT(*) FROM price_lists;
-- SELECT 'customer_addresses'         AS tbl, COUNT(*) FROM customer_addresses;
-- SELECT 'customers (to delete)'      AS tbl, COUNT(*) FROM customers
--   WHERE id NOT IN (SELECT linked_customer_id FROM users WHERE linked_customer_id IS NOT NULL);
-- SELECT 'customers (to keep)'        AS tbl, COUNT(*) FROM customers
--   WHERE id IN (SELECT linked_customer_id FROM users WHERE linked_customer_id IS NOT NULL);
-- SELECT 'notifications'              AS tbl, COUNT(*) FROM notifications;
-- SELECT 'attachments'                AS tbl, COUNT(*) FROM attachments;
-- SELECT 'audit_logs'                 AS tbl, COUNT(*) FROM audit_logs;
-- SELECT 'generated_reports'          AS tbl, COUNT(*) FROM generated_reports;
-- SELECT 'scheduled_reports'          AS tbl, COUNT(*) FROM scheduled_reports;


-- =============================================================
-- STEP 1 — FINANCE
-- Thứ tự: payment_allocations → payments/invoices → AR/AP ledger
-- =============================================================

-- Leaf: payment allocations tham chiếu tới payments và invoices
DELETE FROM payment_allocations;

-- AR/AP ledger (không có children)
DELETE FROM accounts_receivable_ledger;
DELETE FROM accounts_payable_ledger;

-- Invoices (tham chiếu customers và sales_orders — cả 2 đều nullable)
-- Xóa trước sales_orders để tránh conflict
DELETE FROM invoices;

-- Payments (tham chiếu customers — nullable)
DELETE FROM payments;

-- Supplier payments (tham chiếu suppliers — nullable)
DELETE FROM supplier_payments;


-- =============================================================
-- STEP 2 — PURCHASE / GRN
-- Thứ tự: goods_receipt_items → goods_receipts → po_items → purchase_orders → suppliers
-- =============================================================

DELETE FROM goods_receipt_items;
DELETE FROM goods_receipts;
DELETE FROM purchase_order_items;
DELETE FROM purchase_orders;
DELETE FROM suppliers;


-- =============================================================
-- STEP 3 — SALES
-- Thứ tự: leaf items → parent tables → orders → quotations
-- =============================================================

-- Delivery items trước deliveries
DELETE FROM delivery_items;
DELETE FROM deliveries;

-- Return items trước returns
DELETE FROM sales_return_items;
DELETE FROM sales_returns;

-- Replenishment (FK tới products — giữ; FK tới users — giữ; salesOrderId không có FK constraint)
DELETE FROM replenishment_requests;

-- Stock inquiries
DELETE FROM stock_inquiry_items;
DELETE FROM stock_inquiries;

-- Order items trước orders
DELETE FROM sales_order_items;
DELETE FROM sales_orders;

-- Quotation items trước quotations
DELETE FROM quotation_items;
DELETE FROM quotations;


-- =============================================================
-- STEP 4 — INVENTORY TRANSACTIONAL DATA
-- Giữ: inventory_stocks (bảng master tồn kho) → RESET về 0
-- Xóa: inventory_transactions, stock_counts, stock_count_items
-- =============================================================

DELETE FROM stock_count_items;
DELETE FROM stock_counts;
DELETE FROM inventory_transactions;

-- inventory_stocks: GIỮ NGUYÊN (tồn kho thực tế không bị xóa)


-- =============================================================
-- STEP 5 — PRICE LISTS (business data)
-- =============================================================

DELETE FROM price_list_items;
DELETE FROM price_lists;


-- =============================================================
-- STEP 6 — CUSTOMERS
-- Giữ: customers có users.linked_customer_id trỏ tới (customer portal accounts)
-- Xóa: customers demo/test không có user account gắn liền
-- =============================================================

-- Customer addresses của customers sẽ bị xóa
DELETE FROM customer_addresses
  WHERE customer_id NOT IN (
    SELECT linked_customer_id
    FROM users
    WHERE linked_customer_id IS NOT NULL
  );

-- Xóa customers không linked với bất kỳ user nào
DELETE FROM customers
  WHERE id NOT IN (
    SELECT linked_customer_id
    FROM users
    WHERE linked_customer_id IS NOT NULL
  );


-- =============================================================
-- STEP 7 — LOGS, NOTIFICATIONS, ATTACHMENTS, REPORTS
-- =============================================================

DELETE FROM notifications;
DELETE FROM attachments;
DELETE FROM audit_logs;
DELETE FROM generated_reports;
DELETE FROM scheduled_reports;


-- =============================================================
-- STEP 8 — SESSIONS / REFRESH TOKENS
-- Users sẽ cần đăng nhập lại sau reset.
-- Comment block dưới nếu muốn giữ session hiện tại.
-- =============================================================

-- Xóa self-reference trong refresh_tokens trước (rotated_from → id)
UPDATE refresh_tokens SET rotated_from = NULL;
DELETE FROM refresh_tokens;
DELETE FROM sessions;


-- =============================================================
-- XONG
-- =============================================================

COMMIT;

-- Kiểm tra sau khi chạy:
SELECT 'users'             AS kept_table, COUNT(*) AS rows FROM users
UNION ALL
SELECT 'roles',            COUNT(*) FROM roles
UNION ALL
SELECT 'permissions',      COUNT(*) FROM permissions
UNION ALL
SELECT 'products',         COUNT(*) FROM products
UNION ALL
SELECT 'categories',       COUNT(*) FROM categories
UNION ALL
SELECT 'brands',           COUNT(*) FROM brands
UNION ALL
SELECT 'inventory_stocks', COUNT(*) FROM inventory_stocks
UNION ALL
SELECT 'customers (kept)', COUNT(*) FROM customers
UNION ALL
SELECT '--- deleted below ---', 0
UNION ALL
SELECT 'sales_orders',     COUNT(*) FROM sales_orders
UNION ALL
SELECT 'quotations',       COUNT(*) FROM quotations
UNION ALL
SELECT 'invoices',         COUNT(*) FROM invoices
UNION ALL
SELECT 'payments',         COUNT(*) FROM payments
UNION ALL
SELECT 'audit_logs',       COUNT(*) FROM audit_logs
UNION ALL
SELECT 'notifications',    COUNT(*) FROM notifications;
