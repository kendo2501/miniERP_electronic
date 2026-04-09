-- =========================================================================
-- KHỞI TẠO EXTENSION VÀ HÀM CƠ BẢN
-- =========================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================================
-- 1. PHÂN HỆ AUTH & RBAC (Phân quyền)
-- =========================================================================
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE role_permissions (
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP 
);

CREATE TABLE user_roles (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

-- Bảng Refresh Tokens được thêm mới để phục vụ xác thực
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================================
-- 2. PHÂN HỆ SYSTEM & FILES (Hệ thống & File) 
-- =========================================================================
CREATE TABLE attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50) NOT NULL, -- VD: 'Product', 'Shipment', 'Order'
    entity_id UUID NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL, -- Link S3/MinIO
    document_type VARCHAR(50), -- VD: 'CO/CQ', 'Catalog', 'Signature'
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================================
-- 3. PHÂN HỆ CATALOG (Danh mục vật tư)
-- =========================================================================
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL
);

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    base_unit VARCHAR(20) NOT NULL, 
    display_unit VARCHAR(20) NOT NULL, 
    attributes JSONB, 
    standard_cost DECIMAL(15, 2) DEFAULT 0, -- Cột mới
    list_price DECIMAL(15, 2) DEFAULT 0,    -- Cột mới
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_products_attributes_gin ON products USING GIN (attributes);

CREATE TABLE uom_conversions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    from_unit VARCHAR(20) NOT NULL,
    to_unit VARCHAR(20) NOT NULL,
    conversion_factor DECIMAL(15, 4) NOT NULL, 
    UNIQUE (product_id, from_unit, to_unit)
);

-- =========================================================================
-- 4. PHÂN HỆ PRICING (Chiến lược giá)
-- =========================================================================
CREATE TABLE price_lists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    tier VARCHAR(20), 
    valid_from TIMESTAMP,
    valid_to TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE price_list_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    price_list_id UUID REFERENCES price_lists(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE RESTRICT,
    unit_price DECIMAL(15, 2) NOT NULL,
    discount_percentage DECIMAL(5, 2) DEFAULT 0,
    UNIQUE (price_list_id, product_id)
);

-- =========================================================================
-- 5. PHÂN HỆ ĐỐI TÁC (Business Partners)
-- =========================================================================
CREATE TABLE business_partners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL, -- 'CUSTOMER', 'SUPPLIER'
    tier VARCHAR(20), 
    credit_limit DECIMAL(15, 2) DEFAULT 0, 
    current_debt DECIMAL(15, 2) DEFAULT 0, 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- =========================================================================
-- 6. PHÂN HỆ INVENTORY (Kho vật lý, Tồn kho & Sổ cái)
-- =========================================================================
CREATE TABLE warehouses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    location_address TEXT
);

CREATE TABLE warehouse_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    warehouse_id UUID REFERENCES warehouses(id) ON DELETE CASCADE,
    bin_code VARCHAR(50) NOT NULL, -- Vị trí lô/tấm
    UNIQUE (warehouse_id, bin_code)
);

CREATE TABLE inventory (
    product_id UUID REFERENCES products(id) ON DELETE RESTRICT,
    warehouse_id UUID REFERENCES warehouses(id) ON DELETE RESTRICT,
    available_quantity DECIMAL(15, 2) DEFAULT 0 CHECK (available_quantity >= 0), 
    reserved_quantity DECIMAL(15, 2) DEFAULT 0 CHECK (reserved_quantity >= 0), 
    version INT DEFAULT 1, 
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (product_id, warehouse_id)
);

CREATE TABLE stock_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE RESTRICT,
    warehouse_id UUID REFERENCES warehouses(id) ON DELETE RESTRICT,
    transaction_type VARCHAR(20) NOT NULL, 
    quantity DECIMAL(15, 2) NOT NULL,
    moving_average_cost DECIMAL(15, 2), 
    reference_id UUID, 
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================================
-- 7. PHÂN HỆ PROCUREMENT (Mua hàng & Nhập kho) 
-- =========================================================================
CREATE TABLE purchase_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pr_number VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(50) NOT NULL, -- 'DRAFT', 'APPROVED', 'CONVERTED'
    requested_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_number VARCHAR(50) UNIQUE NOT NULL,
    pr_id UUID REFERENCES purchase_requests(id),
    supplier_id UUID REFERENCES business_partners(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL, 
    total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng Chi tiết đơn mua hàng được thêm mới
CREATE TABLE purchase_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE RESTRICT,
    quantity DECIMAL(15, 2) NOT NULL,
    unit_cost DECIMAL(15, 2) NOT NULL,
    received_quantity DECIMAL(15, 2) DEFAULT 0
);

CREATE TABLE goods_receipt_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grn_number VARCHAR(50) UNIQUE NOT NULL,
    po_id UUID REFERENCES purchase_orders(id) ON DELETE SET NULL,
    warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL,
    received_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

-- =========================================================================
-- 8. PHÂN HỆ SALES & FULFILLMENT (Bán hàng & Giao nhận)
-- =========================================================================
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID REFERENCES business_partners(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL, 
    total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    final_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP 
);

CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE RESTRICT,
    quantity DECIMAL(15, 2) NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(15, 2) NOT NULL, 
    total_price DECIMAL(15, 2) NOT NULL
);

CREATE TABLE shipments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    shipment_number VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(50) NOT NULL, 
    delivery_date TIMESTAMP,
    partner_id UUID REFERENCES business_partners(id), -- Bổ sung cột partner_id
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE TABLE shipment_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shipment_id UUID REFERENCES shipments(id) ON DELETE CASCADE,
    order_item_id UUID REFERENCES order_items(id) ON DELETE RESTRICT,
    product_id UUID REFERENCES products(id) ON DELETE RESTRICT, -- Bổ sung cột product_id
    delivered_quantity DECIMAL(15, 2) NOT NULL CHECK (delivered_quantity > 0)
);

-- =========================================================================
-- 9. PHÂN HỆ FINANCE (Tài chính & Đối soát)
-- =========================================================================
CREATE TABLE accounting_periods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    period_name VARCHAR(20) UNIQUE NOT NULL, 
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_closed BOOLEAN DEFAULT FALSE, 
    closed_at TIMESTAMP,
    closed_by UUID REFERENCES users(id)
);

CREATE TABLE debt_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partner_id UUID REFERENCES business_partners(id) ON DELETE SET NULL,
    transaction_type VARCHAR(20) NOT NULL, 
    amount DECIMAL(15, 2) NOT NULL, 
    balance_after DECIMAL(15, 2) NOT NULL, 
    reference_id UUID REFERENCES orders(id) ON DELETE SET NULL, 
    period_id UUID REFERENCES accounting_periods(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_number VARCHAR(50) UNIQUE NOT NULL,
    partner_id UUID REFERENCES business_partners(id) ON DELETE SET NULL,
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(50), -- 'CASH', 'BANK_TRANSFER'
    unallocated_amount DECIMAL(15, 2) NOT NULL, -- Số tiền dư chưa phân bổ
    received_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

CREATE TABLE payment_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
    invoice_id UUID, -- Liên kết tới ID của Order hoặc Shipment đã chốt nợ
    allocated_amount DECIMAL(15, 2) NOT NULL CHECK (allocated_amount > 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================================
-- 10. PHÂN HỆ SYSTEM & CQRS (Hệ thống, Sự kiện & Dashboard)
-- =========================================================================
CREATE TABLE idempotency_keys (
    key VARCHAR(255) PRIMARY KEY,
    request_path VARCHAR(255) NOT NULL,
    response_body JSONB,
    response_status INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE outbox_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    aggregate_type VARCHAR(50) NOT NULL, 
    aggregate_id UUID NOT NULL,
    event_type VARCHAR(100) NOT NULL, 
    payload JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING', 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP
);

CREATE TABLE daily_stats (
    stat_date DATE PRIMARY KEY,
    total_revenue DECIMAL(15, 2) DEFAULT 0,
    total_debt DECIMAL(15, 2) DEFAULT 0,
    top_selling_products JSONB,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);