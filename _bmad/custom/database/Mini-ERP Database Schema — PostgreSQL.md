# Mini-ERP Database Schema — PostgreSQL

## 1. Database Design Principles

### Architectural Principles

* PostgreSQL relational database.
* Modular Monolith aligned schema.
* Bounded-context friendly.
* Strong referential integrity.
* Soft delete where appropriate.
* Immutable ledger/audit strategy.
* UUID or BIGSERIAL primary keys.
* Decimal/Numeric for financial values.
* UTC timestamps.

### Naming Conventions

* snake_case.
* plural table names.
* singular foreign keys.
* created_at / updated_at standardized.

---

# 2. AUTH MODULE

## 2.1 users

```sql
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    failed_login_attempts INT DEFAULT 0,
    locked_until TIMESTAMP,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

## 2.2 roles

```sql
CREATE TABLE roles (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

## 2.3 permissions

```sql
CREATE TABLE permissions (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

## 2.4 user_roles

```sql
CREATE TABLE user_roles (
    user_id BIGINT NOT NULL REFERENCES users(id),
    role_id BIGINT NOT NULL REFERENCES roles(id),
    assigned_at TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY(user_id, role_id)
);
```

## 2.5 role_permissions

```sql
CREATE TABLE role_permissions (
    role_id BIGINT NOT NULL REFERENCES roles(id),
    permission_id BIGINT NOT NULL REFERENCES permissions(id),
    PRIMARY KEY(role_id, permission_id)
);
```

---

# 3. SESSION MODULE

## 3.1 sessions

```sql
CREATE TABLE sessions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    session_identifier UUID NOT NULL UNIQUE,
    status VARCHAR(50) NOT NULL,
    ip_address VARCHAR(100),
    user_agent TEXT,
    device_fingerprint TEXT,
    last_activity_at TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

## 3.2 refresh_tokens

```sql
CREATE TABLE refresh_tokens (
    id BIGSERIAL PRIMARY KEY,
    session_id BIGINT NOT NULL REFERENCES sessions(id),
    user_id BIGINT NOT NULL REFERENCES users(id),
    token_hash TEXT NOT NULL,
    status VARCHAR(50) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP,
    rotated_from BIGINT REFERENCES refresh_tokens(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

---

# 4. ORGANIZATION & CUSTOMER

## 4.1 organizations

```sql
CREATE TABLE organizations (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(100) UNIQUE,
    name VARCHAR(255) NOT NULL,
    tax_code VARCHAR(100),
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    status VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

## 4.2 customers

```sql
CREATE TABLE customers (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT REFERENCES organizations(id),
    customer_code VARCHAR(100) UNIQUE,
    company_name VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    tax_code VARCHAR(100),
    credit_limit NUMERIC(18,2) DEFAULT 0,
    status VARCHAR(50),
    assigned_sales_user_id BIGINT REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

---

# 5. CATALOG MODULE

## 5.1 categories

```sql
CREATE TABLE categories (
    id BIGSERIAL PRIMARY KEY,
    parent_id BIGINT REFERENCES categories(id),
    code VARCHAR(100) UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

## 5.2 brands

```sql
CREATE TABLE brands (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(100) UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

## 5.3 products

```sql
CREATE TABLE products (
    id BIGSERIAL PRIMARY KEY,
    category_id BIGINT REFERENCES categories(id),
    brand_id BIGINT REFERENCES brands(id),
    sku VARCHAR(100) UNIQUE NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    description TEXT,
    unit VARCHAR(50),
    standard_price NUMERIC(18,2),
    weight NUMERIC(18,2),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

## 5.4 product_images

```sql
CREATE TABLE product_images (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id),
    image_url TEXT NOT NULL,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

---

# 6. INVENTORY MODULE

## 6.1 warehouses

```sql
CREATE TABLE warehouses (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(100) UNIQUE,
    warehouse_name VARCHAR(255) NOT NULL,
    address TEXT,
    status VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

## 6.2 inventory_stocks

```sql
CREATE TABLE inventory_stocks (
    id BIGSERIAL PRIMARY KEY,
    warehouse_id BIGINT NOT NULL REFERENCES warehouses(id),
    product_id BIGINT NOT NULL REFERENCES products(id),
    available_quantity NUMERIC(18,2) DEFAULT 0,
    reserved_quantity NUMERIC(18,2) DEFAULT 0,
    damaged_quantity NUMERIC(18,2) DEFAULT 0,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(warehouse_id, product_id)
);
```

## 6.3 inventory_transactions

```sql
CREATE TABLE inventory_transactions (
    id BIGSERIAL PRIMARY KEY,
    warehouse_id BIGINT REFERENCES warehouses(id),
    product_id BIGINT REFERENCES products(id),
    transaction_type VARCHAR(50) NOT NULL,
    reference_type VARCHAR(50),
    reference_id BIGINT,
    quantity NUMERIC(18,2) NOT NULL,
    balance_after NUMERIC(18,2),
    notes TEXT,
    created_by BIGINT REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

---

# 7. SALES MODULE

## 7.1 quotations

```sql
CREATE TABLE quotations (
    id BIGSERIAL PRIMARY KEY,
    quotation_number VARCHAR(100) UNIQUE NOT NULL,
    customer_id BIGINT NOT NULL REFERENCES customers(id),
    sales_user_id BIGINT REFERENCES users(id),
    subtotal NUMERIC(18,2),
    tax_amount NUMERIC(18,2),
    total_amount NUMERIC(18,2),
    status VARCHAR(50),
    valid_until DATE,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

## 7.2 quotation_items

```sql
CREATE TABLE quotation_items (
    id BIGSERIAL PRIMARY KEY,
    quotation_id BIGINT NOT NULL REFERENCES quotations(id),
    product_id BIGINT NOT NULL REFERENCES products(id),
    quantity NUMERIC(18,2) NOT NULL,
    unit_price NUMERIC(18,2) NOT NULL,
    discount_amount NUMERIC(18,2) DEFAULT 0,
    total_amount NUMERIC(18,2) NOT NULL
);
```

## 7.3 sales_orders

```sql
CREATE TABLE sales_orders (
    id BIGSERIAL PRIMARY KEY,
    order_number VARCHAR(100) UNIQUE NOT NULL,
    customer_id BIGINT NOT NULL REFERENCES customers(id),
    quotation_id BIGINT REFERENCES quotations(id),
    sales_user_id BIGINT REFERENCES users(id),
    subtotal NUMERIC(18,2),
    tax_amount NUMERIC(18,2),
    total_amount NUMERIC(18,2),
    status VARCHAR(50),
    ordered_at TIMESTAMP,
    confirmed_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

## 7.4 sales_order_items

```sql
CREATE TABLE sales_order_items (
    id BIGSERIAL PRIMARY KEY,
    sales_order_id BIGINT NOT NULL REFERENCES sales_orders(id),
    product_id BIGINT NOT NULL REFERENCES products(id),
    quantity NUMERIC(18,2) NOT NULL,
    delivered_quantity NUMERIC(18,2) DEFAULT 0,
    unit_price NUMERIC(18,2) NOT NULL,
    discount_amount NUMERIC(18,2) DEFAULT 0,
    total_amount NUMERIC(18,2) NOT NULL
);
```

## 7.5 deliveries

```sql
CREATE TABLE deliveries (
    id BIGSERIAL PRIMARY KEY,
    delivery_number VARCHAR(100) UNIQUE NOT NULL,
    sales_order_id BIGINT REFERENCES sales_orders(id),
    warehouse_id BIGINT REFERENCES warehouses(id),
    status VARCHAR(50),
    delivered_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

## 7.6 delivery_items

```sql
CREATE TABLE delivery_items (
    id BIGSERIAL PRIMARY KEY,
    delivery_id BIGINT REFERENCES deliveries(id),
    product_id BIGINT REFERENCES products(id),
    quantity NUMERIC(18,2) NOT NULL
);
```

---

# 8. FINANCE MODULE

## 8.1 invoices

```sql
CREATE TABLE invoices (
    id BIGSERIAL PRIMARY KEY,
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    customer_id BIGINT REFERENCES customers(id),
    sales_order_id BIGINT REFERENCES sales_orders(id),
    subtotal NUMERIC(18,2),
    tax_amount NUMERIC(18,2),
    total_amount NUMERIC(18,2),
    outstanding_amount NUMERIC(18,2),
    issue_date DATE,
    due_date DATE,
    status VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

## 8.2 payments

```sql
CREATE TABLE payments (
    id BIGSERIAL PRIMARY KEY,
    payment_number VARCHAR(100) UNIQUE NOT NULL,
    customer_id BIGINT REFERENCES customers(id),
    payment_method VARCHAR(50),
    total_amount NUMERIC(18,2) NOT NULL,
    payment_date DATE,
    reference_number VARCHAR(255),
    status VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

## 8.3 payment_allocations

```sql
CREATE TABLE payment_allocations (
    id BIGSERIAL PRIMARY KEY,
    payment_id BIGINT NOT NULL REFERENCES payments(id),
    invoice_id BIGINT NOT NULL REFERENCES invoices(id),
    allocated_amount NUMERIC(18,2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

## 8.4 accounts_receivable_ledger

```sql
CREATE TABLE accounts_receivable_ledger (
    id BIGSERIAL PRIMARY KEY,
    customer_id BIGINT REFERENCES customers(id),
    transaction_type VARCHAR(100) NOT NULL,
    reference_type VARCHAR(100),
    reference_id BIGINT,
    debit_amount NUMERIC(18,2) DEFAULT 0,
    credit_amount NUMERIC(18,2) DEFAULT 0,
    balance_after NUMERIC(18,2),
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

---

# 9. NOTIFICATION MODULE

## 9.1 notifications

```sql
CREATE TABLE notifications (
    id BIGSERIAL PRIMARY KEY,
    recipient_id BIGINT REFERENCES users(id),
    channel VARCHAR(50),
    notification_type VARCHAR(100),
    subject VARCHAR(255),
    content TEXT,
    status VARCHAR(50),
    priority VARCHAR(50),
    metadata JSONB,
    scheduled_at TIMESTAMP,
    sent_at TIMESTAMP,
    read_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

## 9.2 notification_templates

```sql
CREATE TABLE notification_templates (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(100) UNIQUE NOT NULL,
    channel VARCHAR(50),
    subject_template TEXT,
    body_template TEXT,
    variables JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

---

# 10. FILE ATTACHMENTS MODULE

## 10.1 attachments

```sql
CREATE TABLE attachments (
    id BIGSERIAL PRIMARY KEY,
    owner_type VARCHAR(100),
    owner_id BIGINT,
    file_name VARCHAR(255),
    original_file_name VARCHAR(255),
    mime_type VARCHAR(255),
    file_size BIGINT,
    storage_path TEXT,
    storage_provider VARCHAR(50),
    checksum TEXT,
    visibility VARCHAR(50),
    uploaded_by BIGINT REFERENCES users(id),
    status VARCHAR(50),
    metadata JSONB,
    uploaded_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP
);
```

---

# 11. SETTINGS MODULE

## 11.1 settings

```sql
CREATE TABLE settings (
    id BIGSERIAL PRIMARY KEY,
    category VARCHAR(100),
    key VARCHAR(255) NOT NULL,
    value JSONB,
    value_type VARCHAR(50),
    scope VARCHAR(50),
    organization_id BIGINT REFERENCES organizations(id),
    environment VARCHAR(50),
    is_sensitive BOOLEAN DEFAULT FALSE,
    is_readonly BOOLEAN DEFAULT FALSE,
    version INT DEFAULT 1,
    updated_by BIGINT REFERENCES users(id),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

---

# 12. AUDIT LOGS MODULE

## 12.1 audit_logs

```sql
CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    event_type VARCHAR(100),
    category VARCHAR(100),
    actor_id BIGINT REFERENCES users(id),
    actor_type VARCHAR(50),
    entity_type VARCHAR(100),
    entity_id BIGINT,
    action VARCHAR(100),
    status VARCHAR(50),
    correlation_id UUID,
    request_id UUID,
    ip_address VARCHAR(100),
    user_agent TEXT,
    metadata JSONB,
    before_snapshot JSONB,
    after_snapshot JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

---

# 13. REPORTING MODULE

## 13.1 generated_reports

```sql
CREATE TABLE generated_reports (
    id BIGSERIAL PRIMARY KEY,
    report_type VARCHAR(100),
    title VARCHAR(255),
    filters JSONB,
    generated_by BIGINT REFERENCES users(id),
    generated_at TIMESTAMP,
    format VARCHAR(50),
    status VARCHAR(50),
    file_path TEXT,
    metadata JSONB
);
```

## 13.2 scheduled_reports

```sql
CREATE TABLE scheduled_reports (
    id BIGSERIAL PRIMARY KEY,
    report_type VARCHAR(100),
    cron_expression VARCHAR(255),
    recipients JSONB,
    format VARCHAR(50),
    active BOOLEAN DEFAULT TRUE,
    created_by BIGINT REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

---

# 14. INDEX STRATEGY

## Recommended Indexes

```sql
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_inventory_product ON inventory_stocks(product_id);
CREATE INDEX idx_sales_orders_customer ON sales_orders(customer_id);
CREATE INDEX idx_invoices_customer ON invoices(customer_id);
CREATE INDEX idx_payments_customer ON payments(customer_id);
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_notifications_recipient ON notifications(recipient_id);
```

---

# 15. SOFT DELETE STRATEGY

## Recommended Soft Delete Columns

```sql
ALTER TABLE products ADD COLUMN deleted_at TIMESTAMP;
ALTER TABLE customers ADD COLUMN deleted_at TIMESTAMP;
ALTER TABLE attachments ADD COLUMN deleted_at TIMESTAMP;
```

---

# 16. AUDIT & IMMUTABILITY RULES

## Immutable Tables

Các bảng sau nên append-only:

* accounts_receivable_ledger
* audit_logs
* inventory_transactions

Không cho UPDATE/DELETE trực tiếp ngoại trừ admin maintenance policy.

---

# 17. MULTI-TENANT STRATEGY

## Organization Isolation

Các bảng business nên có:

```sql
organization_id BIGINT REFERENCES organizations(id)
```

Ví dụ:

* users
* customers
* sales_orders
* invoices
* settings

---

# 18. FUTURE TABLES (OPTIONAL)

## Optional Extensions

* warehouses_zones
* stock_reservations
* purchase_orders
* suppliers
* pricing_rules
* tax_rules
* integration_webhooks
* api_keys
* background_jobs
* dead_letter_queue

---

# 19. DATABASE BEST PRACTICES

## Financial

* dùng NUMERIC(18,2)
* không dùng FLOAT/DOUBLE

## Security

* hash refresh tokens
* không lưu secrets raw

## Performance

* index foreign keys
* partition audit_logs nếu lớn
* partition ledger nếu cần

## Reliability

* transactions cho financial flows
* optimistic locking nếu cần
* backup & PITR enabled

---

# 20. RECOMMENDED POSTGRESQL EXTENSIONS

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

---

# 21. SUGGESTED DATABASE MODULE STRUCTURE

```text
/database
  /migrations
  /seeds
  /views
  /functions
  /triggers
  /partitions
  /indexes
```

---

# 22. FINAL NOTES

Schema này là nền tảng cho:

* Modular Monolith ERP
* Hexagonal Architecture
* BMAD code generation
* CQRS reporting expansion
* Multi-tenant B2B ERP

Sau bước này nên tiếp tục:

1. viết migration strategy
2. viết seed data
3. tạo ERD
4. tạo indexes nâng cao
5. tạo PostgreSQL views/materialized views
6. tạo partitioning strategy
7. tạo DB constraints/check constraints
8. tạo trigger/audit functions
    