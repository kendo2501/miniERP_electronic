---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
status: complete
inputDocuments:
  - '_bmad/custom/module_role.md'
  - '_bmad/custom/AI-MASTER-EXECUTION-SYSTEM.md'
  - '_bmad/custom/ARCHITECTURE_GUIDE.md'
  - '_bmad/custom/database/Mini-ERP Database Schema — PostgreSQL.md'
  - '_bmad/custom/Module/*.md'
  - '_bmad/custom/role/*.md'
  - '_bmad-output/project-context.md'
workflowType: 'architecture'
project_name: 'miniERP_electronic V2'
date: '2026-05-09'
---

# Architecture Decision Document — miniERP_electronic V2

_Tài liệu này được xây dựng từng bước qua collaborative discovery. Các section được bổ sung dần theo quy trình._

## Project Context Analysis

### Requirements Overview

**Functional Requirements — 6 Modules:**

| Module | Scope | Status hiện tại |
|--------|-------|----------------|
| Catalog (Product) | CRUD product, dynamic attributes, price list, UoM | Partial — thiếu attributes, price list, UoM |
| Partner | Customer + Supplier, credit limit, addresses | Partial — chỉ có Customer, thiếu Supplier |
| Inventory | Warehouse, stock ledger append-only, reservation, stock count | Partial — InventoryStock bị direct UPDATE |
| Purchase | PO, RFQ, GRN, purchase invoice | ❌ Toàn bộ chưa làm |
| Sales | Quotation, order, delivery, return, pricing snapshot | Substantial — thiếu Return |
| Finance | AR, AP, invoice, payment, ledger, reporting | Partial — thiếu AP, supplier payment |

**6 User Roles:** Director (dashboard/reports), Accountant (AR/AP), Warehouse Manager (catalog + inventory), Sales Staff (quotation + orders), Purchaser (PO + GRN), Customer (portal tự đặt hàng)

**Non-Functional Requirements:**
- **Concurrency safety**: Stock operations dùng SELECT FOR UPDATE — không để stock âm
- **Financial integrity**: Tất cả tiền tệ `Decimal(18,2)`, ledger append-only, không UPDATE/DELETE
- **Idempotency**: API tạo order và payment phải idempotent (idempotency key)
- **Audit trail**: Mọi thay đổi quan trọng ghi AuditLog
- **Caching**: Redis cho product reads, session, permissions (TTL 300s)
- **Event-driven**: Modules KHÔNG gọi trực tiếp nhau — giao tiếp qua internal events

### Scale & Complexity

- **Domain**: Full-stack B2B ERP — Modular Monolith
- **Complexity**: Enterprise/High
- **Modules**: 6 bounded contexts với inter-module events
- **Roles & permissions**: 6 roles, ~50+ permission codes

### Technical Constraints

- **Existing codebase**: NestJS 10, Prisma 5.22, PostgreSQL (port 5433), Redis (ioredis 5.4)
- **Frontend**: Next.js 16.2.5, React 19, Tailwind 4, Zustand 5, TanStack Query 5
- **Mandate**: Hexagonal Architecture + DDD bounded contexts (per AI-MASTER-EXECUTION-SYSTEM.md)
- **Brownfield**: ~60% codebase đã implement — không rewrite toàn bộ

### Cross-Cutting Concerns

1. **Event Bus** — `@nestjs/event-emitter` (đã cài + cấu hình trong AppModule, event types: `src/common/events/`)
2. **Permission codes** — cần chuẩn hóa cho 6 modules
3. **Decimal** — mọi field tiền/số lượng `Decimal(18,2)`, không Float
4. **Pagination** — chuẩn `{ items, total, page, limit, totalPages }` toàn bộ API
5. **Idempotency** — Sales Order + Payment APIs
6. **Stock reservation** — cần locking strategy an toàn

---

## Stack Decisions (Confirmed — Brownfield)

| Layer | Quyết định | Lý do |
|-------|-----------|-------|
| Backend runtime | Node.js + NestJS 10 (CommonJS) | Đã có, production-ready |
| ORM | Prisma 5.22 | Đã có, type-safe, migration tốt |
| Database | PostgreSQL (port 5433) | Đã có trong Docker |
| Cache | Redis / ioredis 5.4 | Đã có, dùng cho session + perms |
| File storage | MinIO | Đã có trong docker-compose.yml (port 9000/9001) |
| Email dev | Mailpit | Đã có trong docker-compose.yml (port 1025/8025) |
| Frontend | Next.js 16.2.5 App Router | Đã có |
| UI State | Zustand 5 + TanStack Query 5 | Đã có |
| Forms | React Hook Form 7 + Zod 4 | Đã có |
| Charts | Recharts | Đã install trong frontend |
| Styling | Tailwind CSS 4 + Radix UI | Đã có |

---

## System Architecture

### Architectural Style: Modular Monolith + Hexagonal

```
┌─────────────────────────────────────────────────────────┐
│                    NestJS Application                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │  Catalog │ │Inventory │ │  Sales   │ │ Finance  │  │
│  │ Module   │ │ Module   │ │ Module   │ │ Module   │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│  ┌──────────┐ ┌──────────┐                             │
│  │ Purchase │ │ Partner  │   (modules mới cần build)   │
│  │ Module   │ │ Module   │                             │
│  └──────────┘ └──────────┘                             │
│  ┌─────────────────────────────────────────────────┐   │
│  │           Shared Kernel                         │   │
│  │  Auth │ Redis │ Prisma │ EventBus │ Audit │ ...  │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
         │                              │
    PostgreSQL                        Redis
```

### Module Internal Structure (Hexagonal)

Mỗi module tuân theo cấu trúc:

```
src/{module}/
  {module}.module.ts          — NestJS module wiring
  {module}.controller.ts      — HTTP layer (presentation)
  {module}.service.ts         — Application logic
  dto/
    {module}.dto.ts           — Input/Output DTOs
```

> **Ghi chú brownfield**: Codebase hiện tại chưa có `domain/` và `infrastructure/` layer tách biệt. Các module mới (Purchase, Partner) nên giữ cấu trúc phẳng trên để nhất quán — KHÔNG refactor sang full Hexagonal trừ khi có sprint riêng.

---

## Event-Driven Communication

### Nguyên tắc
- Modules KHÔNG import service của nhau trực tiếp
- Giao tiếp qua **NestJS EventEmitter** (in-process, synchronous-capable)
- Mỗi event có interface type rõ ràng

### Event Catalog

| Event | Publisher | Subscriber | Tác dụng |
|-------|-----------|-----------|---------|
| `DeliveryConfirmedEvent` | Sales | Inventory | Trừ kho thực tế |
| `OrderConfirmedEvent` | Sales | Inventory | Reserve stock |
| `OrderCancelledEvent` | Sales | Inventory | Release reservation |
| `GoodsReceivedEvent` | Purchase | Inventory | Tăng kho |
| `SalesInvoiceCreatedEvent` | Sales | Finance | Tạo AR ledger |
| `PaymentReceivedEvent` | Finance | Finance | Cập nhật AR |
| `PurchaseInvoiceCreatedEvent` | Purchase | Finance | Tạo AP ledger |
| `StockReturnedEvent` | Sales | Inventory | Tăng kho (return) |

### Implementation Pattern

```typescript
// Publisher (sales.service.ts)
this.eventEmitter.emit('delivery.confirmed', { orderId, items, warehouseId });

// Subscriber (inventory.service.ts)
@OnEvent('delivery.confirmed')
async handleDeliveryConfirmed(event: DeliveryConfirmedEvent) { ... }
```

> Cần cài: `@nestjs/event-emitter` + `EventEmitterModule.forRoot()` trong AppModule

---

## Database Schema — Additions Required

Các models còn thiếu cần thêm vào `schema.prisma`:

### 1. Supplier (Partner Module)

```prisma
model Supplier {
  id            Int       @id @default(autoincrement())
  supplierCode  String?   @unique @map("supplier_code") @db.VarChar(100)
  companyName   String    @map("company_name") @db.VarChar(255)
  contactName   String?   @map("contact_name") @db.VarChar(255)
  phone         String?   @db.VarChar(50)
  email         String?   @db.VarChar(255)
  address       String?   @db.Text
  taxCode       String?   @map("tax_code") @db.VarChar(100)
  rating        Int?      @default(0)
  status        String?   @db.VarChar(50)
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")
  deletedAt     DateTime? @map("deleted_at")

  purchaseOrders PurchaseOrder[]
  apLedger       AccountsPayableLedger[]

  @@map("suppliers")
}
```

### 2. Product Attributes & UoM

```prisma
model ProductAttribute {
  id          Int    @id @default(autoincrement())
  productId   Int    @map("product_id")
  attrKey     String @map("attr_key") @db.VarChar(100)
  attrValue   String @map("attr_value") @db.Text

  product Product @relation(fields: [productId], references: [id])

  @@index([productId])
  @@map("product_attributes")
}

model UomConversion {
  id             Int     @id @default(autoincrement())
  productId      Int     @map("product_id")
  fromUnit       String  @map("from_unit") @db.VarChar(50)
  toUnit         String  @map("to_unit") @db.VarChar(50)
  conversionRate Decimal @map("conversion_rate") @db.Decimal(18, 6)

  product Product @relation(fields: [productId], references: [id])

  @@map("uom_conversions")
}
```

### 3. Price List

```prisma
model PriceList {
  id           Int       @id @default(autoincrement())
  name         String    @db.VarChar(255)
  applyTo      String?   @map("apply_to") @db.VarChar(50)  // ALL | TIER | CUSTOMER
  customerTier String?   @map("customer_tier") @db.VarChar(50)
  customerId   Int?      @map("customer_id")
  validFrom    DateTime? @map("valid_from") @db.Date
  validTo      DateTime? @map("valid_to") @db.Date
  isDefault    Boolean   @default(false) @map("is_default")
  createdAt    DateTime  @default(now()) @map("created_at")

  items      PriceListItem[]
  customer   Customer? @relation(fields: [customerId], references: [id])

  @@map("price_lists")
}

model PriceListItem {
  id          Int     @id @default(autoincrement())
  priceListId Int     @map("price_list_id")
  productId   Int     @map("product_id")
  unitPrice   Decimal @map("unit_price") @db.Decimal(18, 2)
  minQuantity Decimal @default(1) @map("min_quantity") @db.Decimal(18, 2)

  priceList PriceList @relation(fields: [priceListId], references: [id])
  product   Product   @relation(fields: [productId], references: [id])

  @@map("price_list_items")
}
```

### 4. Purchase Module (toàn bộ)

```prisma
model PurchaseOrder {
  id          Int       @id @default(autoincrement())
  poNumber    String    @unique @map("po_number") @db.VarChar(100)
  supplierId  Int       @map("supplier_id")
  status      String?   @db.VarChar(50)  // DRAFT | SENT | PARTIAL | COMPLETED | CANCELLED
  totalAmount Decimal?  @map("total_amount") @db.Decimal(18, 2)
  notes       String?   @db.Text
  expectedAt  DateTime? @map("expected_at") @db.Date
  createdBy   Int?      @map("created_by")
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")

  supplier      Supplier           @relation(fields: [supplierId], references: [id])
  items         PurchaseOrderItem[]
  receipts      GoodsReceipt[]

  @@map("purchase_orders")
}

model PurchaseOrderItem {
  id               Int     @id @default(autoincrement())
  purchaseOrderId  Int     @map("purchase_order_id")
  productId        Int     @map("product_id")
  quantity         Decimal @db.Decimal(18, 2)
  receivedQuantity Decimal @default(0) @map("received_quantity") @db.Decimal(18, 2)
  unitPrice        Decimal @map("unit_price") @db.Decimal(18, 2)
  totalAmount      Decimal @map("total_amount") @db.Decimal(18, 2)

  purchaseOrder PurchaseOrder @relation(fields: [purchaseOrderId], references: [id])
  product       Product       @relation(fields: [productId], references: [id])

  @@map("purchase_order_items")
}

model GoodsReceipt {
  id              Int       @id @default(autoincrement())
  grnNumber       String    @unique @map("grn_number") @db.VarChar(100)
  purchaseOrderId Int?      @map("purchase_order_id")
  warehouseId     Int?      @map("warehouse_id")
  status          String?   @db.VarChar(50)  // DRAFT | CONFIRMED
  receivedAt      DateTime? @map("received_at")
  createdAt       DateTime  @default(now()) @map("created_at")

  purchaseOrder PurchaseOrder? @relation(fields: [purchaseOrderId], references: [id])
  warehouse     Warehouse?     @relation(fields: [warehouseId], references: [id])
  items         GoodsReceiptItem[]

  @@map("goods_receipts")
}

model GoodsReceiptItem {
  id             Int     @id @default(autoincrement())
  goodsReceiptId Int     @map("goods_receipt_id")
  productId      Int     @map("product_id")
  quantity       Decimal @db.Decimal(18, 2)

  goodsReceipt GoodsReceipt @relation(fields: [goodsReceiptId], references: [id])
  product      Product      @relation(fields: [productId], references: [id])

  @@map("goods_receipt_items")
}
```

### 5. Finance AP (Accounts Payable)

```prisma
model AccountsPayableLedger {
  id              Int      @id @default(autoincrement())
  supplierId      Int?     @map("supplier_id")
  transactionType String   @map("transaction_type") @db.VarChar(100)
  referenceType   String?  @map("reference_type") @db.VarChar(100)
  referenceId     Int?     @map("reference_id")
  debitAmount     Decimal  @default(0) @map("debit_amount") @db.Decimal(18, 2)
  creditAmount    Decimal  @default(0) @map("credit_amount") @db.Decimal(18, 2)
  balanceAfter    Decimal? @map("balance_after") @db.Decimal(18, 2)
  notes           String?  @db.Text
  createdAt       DateTime @default(now()) @map("created_at")

  supplier Supplier? @relation(fields: [supplierId], references: [id])

  @@index([supplierId])
  @@map("accounts_payable_ledger")
}

model SupplierPayment {
  id              Int       @id @default(autoincrement())
  paymentNumber   String    @unique @map("payment_number") @db.VarChar(100)
  supplierId      Int?      @map("supplier_id")
  totalAmount     Decimal   @map("total_amount") @db.Decimal(18, 2)
  paymentDate     DateTime? @map("payment_date") @db.Date
  referenceNumber String?   @map("reference_number") @db.VarChar(255)
  status          String?   @db.VarChar(50)
  notes           String?   @db.Text
  createdAt       DateTime  @default(now()) @map("created_at")

  supplier Supplier? @relation(fields: [supplierId], references: [id])

  @@map("supplier_payments")
}
```

### 6. Stock Count (Inventory)

```prisma
model StockCount {
  id          Int       @id @default(autoincrement())
  countNumber String    @unique @map("count_number") @db.VarChar(100)
  warehouseId Int       @map("warehouse_id")
  status      String?   @db.VarChar(50)  // DRAFT | IN_PROGRESS | PENDING_APPROVAL | APPROVED
  createdBy   Int?      @map("created_by")
  approvedBy  Int?      @map("approved_by")
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")

  warehouse Warehouse        @relation(fields: [warehouseId], references: [id])
  items     StockCountItem[]

  @@map("stock_counts")
}

model StockCountItem {
  id             Int     @id @default(autoincrement())
  stockCountId   Int     @map("stock_count_id")
  productId      Int     @map("product_id")
  systemQuantity Decimal @map("system_quantity") @db.Decimal(18, 2)
  countedQuantity Decimal @map("counted_quantity") @db.Decimal(18, 2)
  difference     Decimal @db.Decimal(18, 2)

  stockCount StockCount @relation(fields: [stockCountId], references: [id])
  product    Product    @relation(fields: [productId], references: [id])

  @@map("stock_count_items")
}
```

### 7. Customer Addresses & Sales Return

```prisma
model CustomerAddress {
  id          Int     @id @default(autoincrement())
  customerId  Int     @map("customer_id")
  label       String? @db.VarChar(100)  // "Kho HCM", "VP Hà Nội"
  address     String  @db.Text
  isDefault   Boolean @default(false) @map("is_default")

  customer Customer @relation(fields: [customerId], references: [id])

  @@map("customer_addresses")
}

model SalesReturn {
  id           Int       @id @default(autoincrement())
  returnNumber String    @unique @map("return_number") @db.VarChar(100)
  salesOrderId Int       @map("sales_order_id")
  reason       String?   @db.Text
  status       String?   @db.VarChar(50)  // PENDING | APPROVED | REJECTED
  createdAt    DateTime  @default(now()) @map("created_at")

  salesOrder SalesOrder        @relation(fields: [salesOrderId], references: [id])
  items      SalesReturnItem[]

  @@map("sales_returns")
}

model SalesReturnItem {
  id            Int     @id @default(autoincrement())
  salesReturnId Int     @map("sales_return_id")
  productId     Int     @map("product_id")
  quantity      Decimal @db.Decimal(18, 2)

  salesReturn SalesReturn @relation(fields: [salesReturnId], references: [id])
  product     Product     @relation(fields: [productId], references: [id])

  @@map("sales_return_items")
}
```

---

## API Patterns

- **Prefix**: `/api/v1/`
- **Auth**: JWT Bearer, global `JwtAuthGuard` + `PermissionsGuard`
- **Permissions**: `@RequirePermissions()` (AND) hoặc `@AnyPermission()` (OR)
- **Public routes**: `@Public()` decorator
- **Pagination**: `{ items[], total, page, limit, totalPages }`
- **Errors**: `NotFoundException` | `BadRequestException` | `ForbiddenException`
- **POST actions** (không tạo resource): `@HttpCode(HttpStatus.OK)`
- **Swagger**: `@ApiTags()` + `@ApiBearerAuth()` bắt buộc mỗi controller

### Permission Code Convention

```
{module}.{resource}.{action}

Ví dụ:
  purchase.order.create
  purchase.order.view_all
  purchase.grn.confirm
  catalog.price_list.manage
  finance.ap.view
  partner.supplier.manage
```

---

## Frontend Architecture

### Route Structure

```
src/app/
  (auth)/
    login/page.tsx
  (dashboard)/
    layout.tsx          — AuthGuard + Sidebar + PageTransition
    loading.tsx         — Spinner toàn dashboard
    dashboard/page.tsx
    catalog/
      products/page.tsx
      categories/page.tsx
      price-lists/page.tsx    ← CẦN THÊM
    inventory/
      page.tsx
      warehouses/page.tsx
      stock-counts/page.tsx   ← CẦN THÊM
    sales/
      quotations/page.tsx
      orders/page.tsx
      deliveries/page.tsx
      returns/page.tsx        ← CẦN THÊM
    purchase/               ← CẦN THÊM TOÀN BỘ
      orders/page.tsx
      receipts/page.tsx
    finance/
      invoices/page.tsx
      payments/page.tsx
      ap/page.tsx             ← CẦN THÊM
    customers/page.tsx
    suppliers/page.tsx        ← CẦN THÊM
    my-orders/page.tsx        — Customer portal
```

### State Architecture

```
Zustand (client state):
  auth.store.ts     — user, tokens, permissions

TanStack Query (server state):
  src/lib/api/{module}.ts  — tất cả API calls
  useQuery / useMutation theo module

Không dùng Zustand cho server data (products, orders, etc.)
```

---

## Implementation Sequence

### Phase 1 — Schema Foundation (Unblocks everything)
1. Thêm `Supplier`, `CustomerAddress`, `ProductAttribute`, `UomConversion` vào schema
2. Thêm `PriceList`, `PriceListItem`
3. Thêm `PurchaseOrder`, `PurchaseOrderItem`, `GoodsReceipt`, `GoodsReceiptItem`
4. Thêm `AccountsPayableLedger`, `SupplierPayment`
5. Thêm `StockCount`, `StockCountItem`
6. Thêm `SalesReturn`, `SalesReturnItem`
7. Chạy migration + update seed

### Phase 2 — Event Bus
8. Cài `@nestjs/event-emitter`, định nghĩa event types
9. Wiring events cho Sales → Inventory, Sales → Finance

### Phase 3 — Backend APIs (theo priority)
10. Supplier/Partner API
11. Purchase module (PO, GRN)
12. Price List API
13. Sales Return API
14. Finance AP API
15. Stock Count API

### Phase 4 — Frontend
16. Purchase screens (Purchaser role)
17. Supplier screens
18. Price List management
19. Director dashboard với Recharts
20. Customer portal (cart + checkout)
21. Finance AP screens
22. Stock Count screens

### Phase 5 — Infrastructure
23. MinIO integration (file upload)
24. Mailpit/email notifications
25. Recharts install + Director dashboard

---

## Security Architecture

- **JWT**: Access token 15m, Refresh token 7d (rotation)
- **Session invalidation**: Redis key `session:{sid}` — delete để force logout
- **Permission invalidation**: Delete `user:perms:{userId}` khi thay đổi role
- **Rate limiting**: `@nestjs/throttler` (đã cài + ThrottlerGuard global trong AppModule — 60 req/phút)
- **Helmet + Compression**: Đã có trong `main.ts`
- **CORS**: Config qua `CORS_ORIGIN` env var

---

_Last Updated: 2026-05-09_

