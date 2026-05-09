---
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - '_bmad-output/planning-artifacts/architecture.md'
  - '_bmad/custom/module_role.md'
  - '_bmad/custom/Module/Catalog.md'
  - '_bmad/custom/AI-MASTER-EXECUTION-SYSTEM.md'
  - '_bmad-output/project-context.md'
---

# miniERP_electronic V2 - Epic Breakdown

## Overview

Tài liệu này phân rã các yêu cầu từ Architecture, Module Specs và Role Requirements thành các epic và story có thể triển khai cho hệ thống Mini-ERP B2B phân phối thiết bị điện.

**Trạng thái hiện tại (brownfield):**
- ✅ Đã xong: Auth, Users, Catalog (CRUD cơ bản), Frontend tất cả pages (với i18n EN/VI)
- ❌ Còn thiếu backend: Supplier/Partner, Inventory (append-only), Purchase, Sales Return, Finance AP, Price List, Stock Count, Customer Portal API

---

## Requirements Inventory

### Functional Requirements

**Catalog & Product:**
- FR1: Quản lý danh mục sản phẩm (Category) — CRUD, cây phân cấp, import/export Excel, tìm kiếm
- FR2: Quản lý sản phẩm (Product) — CRUD, thuộc tính động (ProductAttribute), upload nhiều ảnh, UoM & chuyển đổi, tìm kiếm nâng cao, import/export
- FR3: Quản lý bảng giá (Price List) — tạo bảng giá theo cấp đại lý/số lượng/khách hàng cụ thể, hiệu lực thời gian (valid from/to), lịch sử giá, API tính giá cho Sales

**Partner (Customer & Supplier):**
- FR4: Quản lý khách hàng (Customer) — CRUD nâng cao: phân cấp đại lý, nhiều địa chỉ (CustomerAddress), lịch sử giao dịch, import/export
- FR5: Quản lý hạn mức tín dụng — thiết lập hạn mức, theo dõi dư nợ, tính hạn mức khả dụng, cảnh báo vượt hạn
- FR6: Quản lý nhà cung cấp (Supplier) — CRUD, đánh giá (rating), lịch sử mua hàng

**Inventory:**
- FR7: Quản lý kho (Warehouse) — CRUD kho, phân loại, quản lý vị trí
- FR8: Inventory Ledger append-only — ghi tất cả biến động qua inventory_moves, tính tồn kho từ SUM(moves), KHÔNG UPDATE/DELETE
- FR9: Xem tồn kho — theo sản phẩm/kho, total_qty / reserved_qty / available_qty
- FR10: Nhận hàng qua event GoodsReceivedEvent — tạo inventory_moves với (+qty)
- FR11: Xuất kho qua event DeliveryConfirmedEvent — tạo inventory_moves với (-qty)
- FR12: Đặt chỗ hàng (Reservation) — reserve stock khi đơn hàng xác nhận, release khi hủy
- FR13: Kiểm kê (Stock Count) — tạo phiếu kiểm kê, nhập số lượng thực tế, tạo adjustment move trong inventory_moves, bước duyệt khi chênh lệch lớn
- FR14: Báo cáo kho — tồn theo sản phẩm, nhập/xuất/tồn, hàng tồn lâu (aging), cảnh báo tồn tối thiểu

**Purchase:**
- FR15: Purchase Request — tạo, duyệt, chuyển thành PO; hệ thống tự sinh từ cảnh báo tồn thấp
- FR16: RFQ (Request for Quotation) — gửi cho nhiều NCC, nhập báo giá, so sánh, chọn NCC thắng
- FR17: Purchase Order — CRUD, gửi PO (email), trạng thái Draft/Sent/Partial/Completed/Cancelled, lịch sử
- FR18: Goods Receipt (GRN) — tạo từ PO, nhận từng phần (partial), emit GoodsReceivedEvent
- FR19: Purchase Invoice — 3-way matching (PO+GRN+Invoice), phát hiện mismatch giá/số lượng, trình duyệt thanh toán
- FR20: Báo cáo mua hàng — nhập hàng, công nợ NCC, hiệu suất NCC

**Sales (bổ sung):**
- FR21: Báo giá bán (Quotation) — tính giá tự động theo cấp đại lý/số lượng/bảng giá, chiết khấu, lưu version
- FR22: Sales Order — kiểm tra credit limit + tồn kho, giữ hàng (reserve), trạng thái đầy đủ
- FR23: Giao hàng (Delivery) — giao từng phần, emit DeliveryConfirmedEvent
- FR24: Trả hàng (Sales Return) — tạo đơn trả, emit StockReturnedEvent + Finance điều chỉnh AR
- FR25: Pricing Snapshot — lưu unitPrice tại thời điểm tạo quotation/order vào line item

**Finance (bổ sung):**
- FR26: Finance Ledger append-only — bảng AccountsReceivableLedger, KHÔNG UPDATE/DELETE
- FR27: Công nợ phải thu (AR) — tạo từ SalesInvoiceCreatedEvent, theo dõi, báo cáo tuổi nợ
- FR28: Công nợ phải trả (AP) — tạo từ PurchaseInvoiceCreatedEvent, theo dõi, báo cáo tuổi nợ
- FR29: Thu tiền khách hàng — ghi phiếu thu, phân bổ FIFO vào nhiều invoice (payment_allocations)
- FR30: Trả tiền nhà cung cấp — ghi phiếu chi, phân bổ thanh toán
- FR31: Báo cáo tài chính — công nợ khách/NCC, dòng tiền, lợi nhuận (Revenue - COGS)

**Customer Portal:**
- FR32: Customer đăng nhập và xem catalog sản phẩm (duyệt theo danh mục, tìm kiếm, xem chi tiết)
- FR33: Shopping cart — thêm sản phẩm, xem tổng, checkout với kiểm tra credit limit
- FR34: Quản lý đơn hàng cá nhân — xem lịch sử, theo dõi trạng thái, huỷ đơn pending, reorder
- FR35: Quản lý hồ sơ khách hàng — cập nhật thông tin, quản lý địa chỉ, đổi mật khẩu

**Director Dashboard:**
- FR36: Director Dashboard — KPI cards (doanh thu, mua hàng, tồn kho, AR, AP), biểu đồ doanh thu 6 tháng, top 5 sản phẩm/khách hàng (Recharts), recent orders, low stock alerts

### NonFunctional Requirements

- NFR1: **Concurrency safety** — Stock operations dùng SELECT FOR UPDATE; không để stock âm
- NFR2: **Financial integrity** — Tất cả tiền tệ Decimal(18,2); ledger append-only, không UPDATE/DELETE
- NFR3: **Idempotency** — API tạo Sales Order và Payment phải idempotent (idempotency key)
- NFR4: **Audit trail** — Mọi thay đổi quan trọng ghi AuditLog (ai, khi nào, thay đổi gì)
- NFR5: **Caching** — Redis Cache-Aside cho product reads, session, permissions (TTL 300s)
- NFR6: **Event-driven** — Modules KHÔNG gọi service nhau trực tiếp; giao tiếp qua NestJS EventEmitter
- NFR7: **Rate limiting** — ThrottlerGuard global 60 req/phút (đã cài trong AppModule)
- NFR8: **Security** — JWT 15m access / 7d refresh (rotation), RBAC ~50+ permission codes, input sanitization
- NFR9: **Pagination chuẩn** — `{ items, total, page, limit, totalPages }` toàn bộ API
- NFR10: **Soft delete** — filter `deletedAt: null` cho User, Product, Customer trong mọi query

### Additional Requirements (từ Architecture)

- AR1: **Schema Foundation** — Thêm 16 model mới vào schema.prisma: Supplier, CustomerAddress, ProductAttribute, UomConversion, PriceList, PriceListItem, PurchaseOrder, PurchaseOrderItem, GoodsReceipt, GoodsReceiptItem, AccountsPayableLedger, SupplierPayment, StockCount, StockCountItem, SalesReturn, SalesReturnItem
- AR2: **Event Bus wiring** — Định nghĩa event types đầy đủ trong `src/common/events/`; wiring: Sales→Inventory, Sales→Finance, Purchase→Inventory, Purchase→Finance
- AR3: **Permission codes** — Chuẩn hóa theo convention `{module}.{resource}.{action}` cho tất cả 6 modules mới; seed vào DB
- AR4: **Frontend missing pages** — Cần thêm/implement backend API cho: price-lists, stock-counts, sales/returns, purchase/orders, purchase/receipts, finance/ap, suppliers
- AR5: **MinIO integration** — File upload service cho product images và attachments
- AR6: **Email notifications** — Mailpit integration cho PO gửi NCC, thông báo trạng thái đơn hàng
- AR7: **Recharts** — Đã install; cần implement cho Director dashboard (revenue trend, top products, top customers)

### UX Design Requirements

*(Không có file UX riêng — trích từ module_role.md frontend requirements)*

- UX-DR1: **Director Dashboard** — Layout KPI cards (6 metrics), Recharts: LineChart doanh thu 6 tháng + BarChart top 5 sản phẩm + BarChart top 5 khách hàng, DataTable recent orders/purchases, Alert list low stock
- UX-DR2: **Accountant AR/AP Aging** — Aging table chia cột 1-30 / 31-60 / 61-90 / 90+ days; payment allocation dialog (chọn invoice + nhập số tiền phân bổ)
- UX-DR3: **Warehouse Manager Product Form** — Tabs: Thông tin chung | Đơn vị tính (conversion table) | Thuộc tính động (dynamic add rows key/value) | Giá & Tồn kho; drag-and-drop image upload
- UX-DR4: **Category Tree** — Hiển thị dạng cây có thể mở/đóng node; drag-and-drop để thay đổi parent-child
- UX-DR5: **Purchaser RFQ Comparison** — Bảng so sánh báo giá nhiều NCC side-by-side; highlight giá thấp nhất; select winning supplier
- UX-DR6: **3-Way Matching** — PO vs GRN vs Invoice: highlight màu đỏ khi mismatch giá/số lượng
- UX-DR7: **Customer Portal** — Giao diện riêng biệt (không dùng sidebar ERP chính); product grid với filter; cart sidebar; checkout flow với credit limit warning
- UX-DR8: **Quotation auto-pricing** — Khi chọn sản phẩm, hệ thống tự lookup giá theo customer tier + price list và điền vào; cho phép override với lý do

### FR Coverage Map

| FR | Epic | Tóm tắt |
|----|------|---------|
| FR1-3 | Epic 1 | Catalog: Category tree+Excel (1.5), Product attributes/UoM (1.1-1.2)/ảnh (1.4), Price List (1.3) |
| FR4-6 | Epic 2 | Partner: Customer enhanced + địa chỉ, Credit Limit, Supplier |
| FR7-14 | Epic 3 | Inventory: Warehouse, Ledger append-only, Reservation, Stock Count, Reports |
| FR15-20 | Epic 4 | Purchase: Request (4.1), RFQ (4.2), PO (4.3), GRN (4.4), Invoice (4.5), Reports (4.6) |
| FR21-25 | Epic 5 | Sales: Auto-pricing, Return, Delivery events, Pricing Snapshot |
| FR26-31 | Epic 6 | Finance: AR, AP, Payments thu/chi, Financial Reports |
| FR32-35 | Epic 7 | Customer Portal: Catalog browse, Cart, Checkout, Order tracking |
| FR36 | Epic 8 | Director Dashboard: KPIs, Recharts, Executive reports |

---

## Epic List

### Epic 1: Catalog Enhancement — Quản lý sản phẩm đầy đủ
Warehouse Manager có thể quản lý sản phẩm với thuộc tính động, đơn vị tính, upload ảnh, và bảng giá theo cấp đại lý/số lượng/thời gian.
**FRs covered:** FR1, FR2, FR3
**Schema mới:** ProductAttribute, UomConversion, PriceList, PriceListItem

### Epic 2: Partner & Credit Management — Quản lý đối tác
Admin/Manager có thể quản lý khách hàng đầy đủ (nhiều địa chỉ, phân cấp đại lý) + toàn bộ nhà cung cấp + hạn mức tín dụng.
**FRs covered:** FR4, FR5, FR6
**Schema mới:** Supplier, CustomerAddress

### Epic 3: Inventory Operations — Vận hành kho hàng
Warehouse Manager có thể theo dõi toàn bộ biến động kho qua ledger append-only, quản lý đặt chỗ hàng, và thực hiện kiểm kê.
**FRs covered:** FR7, FR8, FR9, FR10, FR11, FR12, FR13, FR14
**Schema mới:** StockCount, StockCountItem
**Event subscribers:** GoodsReceivedEvent, DeliveryConfirmedEvent

### Epic 4: Purchase Operations — Chu trình mua hàng
Purchaser có thể quản lý toàn bộ chu trình: Purchase Request → RFQ → PO → GRN → Invoice (3-way matching).
**FRs covered:** FR15, FR16, FR17, FR18, FR19, FR20
**Schema mới:** PurchaseOrder, PurchaseOrderItem, GoodsReceipt, GoodsReceiptItem
**Emits:** GoodsReceivedEvent → Inventory

### Epic 5: Sales Completion — Hoàn thiện bán hàng
Sales Staff có thể tính giá tự động từ bảng giá, xử lý trả hàng, với pricing snapshot đầy đủ.
**FRs covered:** FR21, FR22, FR23, FR24, FR25
**Schema mới:** SalesReturn, SalesReturnItem
**Emits:** DeliveryConfirmedEvent → Inventory; SalesInvoiceCreatedEvent → Finance

### Epic 6: Finance Management — Quản lý tài chính
Kế toán có thể quản lý AR/AP đầy đủ, thu/chi tiền, phân bổ FIFO vào invoice, và xem báo cáo tài chính.
**FRs covered:** FR26, FR27, FR28, FR29, FR30, FR31
**Schema mới:** AccountsPayableLedger, SupplierPayment

### Epic 7: Customer Self-Service Portal — Cổng tự phục vụ khách hàng
Khách hàng có thể đăng nhập, duyệt catalog, đặt hàng (kiểm tra credit limit), theo dõi đơn hàng của mình.
**FRs covered:** FR32, FR33, FR34, FR35

### Epic 8: Executive Dashboard — Bảng điều hành
Director có thể theo dõi KPI toàn công ty, biểu đồ doanh thu, top sản phẩm/khách hàng bằng Recharts.
**FRs covered:** FR36

---

## Epic 1: Catalog Enhancement — Quản lý sản phẩm đầy đủ

Warehouse Manager có thể quản lý sản phẩm với thuộc tính động, đơn vị tính, và bảng giá linh hoạt theo cấp đại lý/số lượng/thời gian hiệu lực.

### Story 1.1: Product Dynamic Attributes — Thuộc tính động sản phẩm

As a Warehouse Manager,
I want to add and manage dynamic key-value attributes for each product (e.g., power, cross-section, voltage),
So that I can describe technical specifications specific to each type of electrical equipment.

**Acceptance Criteria:**

**Given** tôi đang ở trang Product form (tab Thuộc tính động)
**When** tôi thêm một attribute row với key "Công suất" và value "18W" rồi lưu
**Then** attribute được lưu vào bảng `product_attributes` liên kết với product
**And** GET /api/v1/products/:id trả về danh sách attributes trong response

**Given** tôi tìm kiếm sản phẩm với filter `attrKey=Công suất&attrValue=18W`
**When** API GET /api/v1/products?attrKey=Công suất&attrValue=18W được gọi
**Then** chỉ trả về sản phẩm có attribute đó
**And** pagination chuẩn `{ items, total, page, limit, totalPages }` được áp dụng

**Given** tôi xóa một attribute khỏi product
**When** lưu thay đổi
**Then** record trong `product_attributes` bị xóa
**And** product vẫn hoạt động bình thường trong Sales/Inventory

### Story 1.2: Product Unit of Measure Conversion — Đơn vị tính và chuyển đổi

As a Warehouse Manager,
I want to define unit of measure conversions for products (e.g., 1 cuộn = 100m, 1 thùng = 20 cái),
So that sales and inventory can work with different units consistently.

**Acceptance Criteria:**

**Given** tôi đang ở product form tab "Đơn vị tính"
**When** tôi thêm conversion: fromUnit="thùng", toUnit="cái", conversionRate=20
**Then** record được lưu vào `uom_conversions` với productId tương ứng

**Given** product có UoM conversion được định nghĩa
**When** GET /api/v1/products/:id được gọi
**Then** response bao gồm mảng `uomConversions` với đầy đủ thông tin chuyển đổi

**Given** tôi cập nhật conversionRate của một UoM
**When** lưu thay đổi
**Then** giá trị mới được cập nhật, không ảnh hưởng đến các order line đã có

### Story 1.3: Price List Management — Quản lý bảng giá

As a Warehouse Manager,
I want to create and manage price lists that apply to different customer tiers, quantities, or specific customers with time validity,
So that the system automatically calculates the correct selling price when creating quotations.

**Acceptance Criteria:**

**Given** tôi tạo price list với applyTo="TIER", customerTier="Cấp 1", validFrom="2026-06-01"
**When** POST /api/v1/price-lists được gọi với payload hợp lệ
**Then** PriceList được tạo với status active
**And** tôi có thể thêm products vào price list với unitPrice và minQuantity

**Given** có price list "Cấp 1" với sản phẩm A giá 100,000 và price list "Cấp 2" với sản phẩm A giá 120,000
**When** GET /api/v1/price-lists/lookup?customerId=X&productId=Y&quantity=5 được gọi
**Then** API trả về unitPrice đúng dựa trên customer tier và quantity (hỗ trợ tiered pricing)

**Given** một price list hết hạn (validTo < ngày hôm nay)
**When** lookup API được gọi
**Then** price list hết hạn không được áp dụng; fallback về minPrice của Product nếu không có bảng giá hợp lệ

**Given** tôi xem danh sách price lists
**When** GET /api/v1/price-lists được gọi
**Then** trả về danh sách với thông tin: tên, applyTo, validFrom, validTo, isDefault, số sản phẩm

### Story 1.4: Product Image Upload — Upload ảnh sản phẩm

As a Warehouse Manager,
I want to upload multiple images for each product and have them stored securely,
So that customers and sales staff can see product photos when browsing the catalog.

**Acceptance Criteria:**

**Given** tôi đang ở product form tab "Thông tin chung"
**When** tôi upload 3 ảnh (JPG/PNG, mỗi file < 5MB) cho sản phẩm
**Then** mỗi ảnh được upload lên MinIO bucket `product-images` với key `products/{productId}/{uuid}.jpg`
**And** URL public của ảnh được lưu vào bảng `product_images` liên kết với productId

**Given** product có images đã upload
**When** GET /api/v1/products/:id được gọi
**Then** response bao gồm mảng `images: [{ id, url, isPrimary }]`

**Given** tôi xóa một ảnh không còn cần thiết
**When** DELETE /api/v1/products/:id/images/:imageId
**Then** file bị xóa khỏi MinIO, record bị xóa khỏi DB

**Given** upload file vượt quá 5MB hoặc không phải image
**When** POST /api/v1/products/:id/images được gọi
**Then** API trả về 400 BadRequest với message mô tả lý do

### Story 1.5: Category & Product Excel Import/Export — Nhập/Xuất Excel

As a Warehouse Manager,
I want to import categories and products in bulk from Excel files and export them to Excel,
So that I can efficiently manage large product catalogs without manual data entry.

**Acceptance Criteria:**

**Given** tôi download template Excel cho Categories
**When** GET /api/v1/catalog/categories/export-template
**Then** file Excel được tải về với header columns: Code, Name, ParentCode, Description

**Given** tôi upload file Excel chứa 50 categories hợp lệ
**When** POST /api/v1/catalog/categories/import với multipart file
**Then** tất cả 50 categories được tạo/cập nhật; response trả về { created: N, updated: M, errors: [] }

**Given** file Excel chứa row có ParentCode không tồn tại
**When** import được xử lý
**Then** row đó bị skip với error message "ParentCode không tồn tại"; các rows hợp lệ vẫn được import

**Given** tôi export danh sách products hiện tại
**When** GET /api/v1/catalog/products/export với filter tùy chọn
**Then** file Excel được tạo với tất cả products bao gồm: SKU, Name, Category, Brand, Attributes (flattened), UoM, MinPrice

---

## Epic 2: Partner & Credit Management — Quản lý đối tác

Admin/Manager có thể quản lý khách hàng đầy đủ với nhiều địa chỉ, phân cấp đại lý, hạn mức tín dụng, và toàn bộ nhà cung cấp.

### Story 2.1: Customer Address Management — Quản lý địa chỉ khách hàng

As an Admin,
I want to manage multiple shipping addresses for each customer (add, edit, delete, set default),
So that sales orders can use the correct delivery address per shipment.

**Acceptance Criteria:**

**Given** customer có customerId=1 chưa có địa chỉ
**When** POST /api/v1/customers/1/addresses với { label: "Kho HCM", address: "...", isDefault: true }
**Then** CustomerAddress được tạo và liên kết với customer
**And** nếu isDefault=true, các địa chỉ khác của customer bị unset isDefault

**Given** customer có nhiều địa chỉ
**When** GET /api/v1/customers/1 được gọi
**Then** response bao gồm mảng `addresses` với tất cả địa chỉ
**And** địa chỉ mặc định được đánh dấu `isDefault: true`

**Given** tôi xóa một địa chỉ không phải mặc định
**When** DELETE /api/v1/customers/1/addresses/5
**Then** địa chỉ bị xóa, các order cũ vẫn giữ nguyên dữ liệu (địa chỉ snapshot trong order)

### Story 2.2: Customer Credit Limit & Debt Tracking — Hạn mức tín dụng

As a Finance Manager,
I want to set credit limits for customers and track their current outstanding debt,
So that sales orders can be blocked automatically when a customer exceeds their credit limit.

**Acceptance Criteria:**

**Given** tôi cập nhật creditLimit của customer thành 50,000,000
**When** PATCH /api/v1/customers/:id/credit-limit với { creditLimit: 50000000 }
**Then** creditLimit được lưu, AuditLog ghi nhận thay đổi

**Given** customer có creditLimit=50,000,000 và tổng AR outstanding=45,000,000
**When** GET /api/v1/customers/:id/credit-status được gọi
**Then** response trả về: creditLimit, outstandingDebt, availableCredit=5,000,000

**Given** Sales tạo đơn hàng mới với totalAmount làm tổng AR vượt creditLimit
**When** POST /api/v1/sales/orders được gọi
**Then** API từ chối với 400 BadRequest "Vượt hạn mức tín dụng" và creditAvailable hiện tại

### Story 2.3: Supplier Management — Quản lý nhà cung cấp

As an Admin,
I want to create and manage suppliers with contact information and ratings,
So that purchasers can select suppliers when creating purchase orders.

**Acceptance Criteria:**

**Given** tôi tạo supplier với companyName, phone, email, taxCode
**When** POST /api/v1/suppliers với payload hợp lệ
**Then** Supplier được tạo với supplierCode tự sinh (SUP-XXXXX), status="ACTIVE"

**Given** có danh sách suppliers
**When** GET /api/v1/suppliers?search=ABB&page=1&limit=20
**Then** trả về danh sách suppliers khớp keyword với pagination chuẩn
**And** mỗi supplier bao gồm: supplierCode, companyName, phone, email, rating, status

**Given** tôi cập nhật rating của supplier sau khi nhận hàng
**When** PATCH /api/v1/suppliers/:id với { rating: 4 }
**Then** rating được lưu (1-5 scale)
**And** AuditLog ghi nhận thay đổi

**Given** tôi soft-delete một supplier không còn hợp tác
**When** DELETE /api/v1/suppliers/:id
**Then** supplier.deletedAt được set; không còn xuất hiện trong danh sách
**And** PurchaseOrders cũ vẫn tham chiếu được supplier này

---

## Epic 3: Inventory Operations — Vận hành kho hàng

Warehouse Manager có thể theo dõi toàn bộ biến động kho qua ledger append-only, quản lý đặt chỗ hàng, kiểm kê, và xem báo cáo tồn kho đầy đủ.

### Story 3.1: Inventory Ledger Foundation & Warehouse Management

As a Warehouse Manager,
I want the inventory system to track all stock movements via an append-only ledger (not direct updates), and manage warehouses,
So that stock history is always accurate and auditable.

**Acceptance Criteria:**

**Given** schema `inventory_moves` tồn tại với fields: id, productId, warehouseId, moveType, quantity, referenceType, referenceId, createdAt
**When** bất kỳ stock movement nào xảy ra
**Then** một record mới được INSERT vào `inventory_moves` (không bao giờ UPDATE/DELETE)

**Given** tôi query tồn kho của product A tại warehouse W
**When** GET /api/v1/inventory/stock?productId=A&warehouseId=W
**Then** totalQty = SUM(quantity) từ inventory_moves; reservedQty = tổng đặt chỗ; availableQty = total - reserved

**Given** tôi tạo warehouse mới với code "WH-HCM", name "Kho HCM", address, type="MAIN"
**When** POST /api/v1/inventory/warehouses
**Then** warehouse được tạo và xuất hiện trong danh sách

**Given** tôi xem danh sách tồn kho
**When** GET /api/v1/inventory/stock với filter productId hoặc warehouseId
**Then** trả về danh sách với totalQty, reservedQty, availableQty cho từng product-warehouse pair

### Story 3.2: Stock Reservation System — Hệ thống đặt chỗ hàng

As a Warehouse Manager,
I want stock to be automatically reserved when a sales order is confirmed and released when cancelled,
So that available quantity is always accurate for new orders.

**Acceptance Criteria:**

**Given** Inventory module subscribe event `order.confirmed` (OrderConfirmedEvent)
**When** Sales emits OrderConfirmedEvent với { orderId, items: [{ productId, warehouseId, quantity }] }
**Then** reservedQty tăng lên cho từng item trong inventory stock
**And** availableQty = totalQty - reservedQty được tính lại đúng

**Given** Inventory module subscribe event `order.cancelled` (OrderCancelledEvent)
**When** Sales emits OrderCancelledEvent
**Then** reservedQty giảm xuống (reservation được release)

**Given** Sales muốn kiểm tra tồn kho khả dụng trước khi tạo đơn
**When** GET /api/v1/inventory/stock/check?productId=X&warehouseId=Y&quantity=10
**Then** API trả về { available: true/false, availableQty: N }

### Story 3.3: Inventory Event Handlers — Xử lý nhập/xuất kho qua events

As a Warehouse Manager,
I want stock to automatically increase when goods are received from purchase and decrease when delivery is confirmed to customer,
So that inventory reflects actual physical stock without manual intervention.

**Acceptance Criteria:**

**Given** Inventory subscribe event `goods.received` (GoodsReceivedEvent từ Purchase)
**When** Purchase emits GoodsReceivedEvent với { grnId, items: [{ productId, warehouseId, quantity }] }
**Then** INSERT vào inventory_moves với moveType="IN", quantity=+N, referenceType="GRN", referenceId=grnId

**Given** Inventory subscribe event `delivery.confirmed` (DeliveryConfirmedEvent từ Sales)
**When** Sales emits DeliveryConfirmedEvent với { deliveryId, items: [{ productId, warehouseId, quantity }] }
**Then** INSERT vào inventory_moves với moveType="OUT", quantity=-N, referenceType="DELIVERY", referenceId=deliveryId
**And** reservedQty giảm tương ứng (reservation fulfilled)

**Given** tôi xem lịch sử nhập/xuất của product A
**When** GET /api/v1/inventory/moves?productId=A&warehouseId=W
**Then** trả về danh sách moves với: ngày, moveType, quantity, referenceType, referenceId, người tạo

### Story 3.4: Stock Count Management — Kiểm kê kho

As a Warehouse Manager,
I want to create stock count sessions, enter actual counted quantities, and get the system to create adjustment movements after approval,
So that inventory records stay accurate after physical counts.

**Acceptance Criteria:**

**Given** tôi tạo phiếu kiểm kê cho warehouse W
**When** POST /api/v1/inventory/stock-counts với { warehouseId, productIds[] }
**Then** StockCount được tạo với status="DRAFT", countNumber tự sinh (CNT-XXXXX)
**And** hệ thống populate systemQuantity từ tồn kho hiện tại cho từng product

**Given** tôi nhập countedQuantity cho từng product trong phiếu kiểm kê
**When** PATCH /api/v1/inventory/stock-counts/:id/items với countedQuantity
**Then** difference = countedQuantity - systemQuantity được tính và lưu

**Given** phiếu kiểm kê có difference > threshold (ví dụ 5%)
**When** tôi submit phiếu kiểm kê (status → PENDING_APPROVAL)
**Then** phiếu cần được Director/Manager approve trước khi áp dụng

**Given** Manager approve phiếu kiểm kê
**When** POST /api/v1/inventory/stock-counts/:id/approve
**Then** hệ thống INSERT adjustment moves vào inventory_moves cho các sản phẩm có difference != 0
**And** status → APPROVED, approvedBy được set

### Story 3.5: Inventory Reports & Alerts — Báo cáo và cảnh báo tồn kho

As a Warehouse Manager,
I want to view inventory reports including current stock levels, movement history, slow-moving items, and minimum stock alerts,
So that I can make informed decisions about reordering and warehouse operations.

**Acceptance Criteria:**

**Given** tôi mở báo cáo "Tồn kho theo sản phẩm"
**When** GET /api/v1/inventory/reports/stock-summary
**Then** trả về danh sách với: productCode, productName, totalQty, reservedQty, availableQty, warehouseName

**Given** tôi xem báo cáo "Hàng tồn lâu" với threshold=30 ngày
**When** GET /api/v1/inventory/reports/slow-moving?days=30
**Then** trả về sản phẩm không có movement OUT trong 30 ngày qua

**Given** product có minStockLevel được set và availableQty < minStockLevel
**When** GET /api/v1/inventory/reports/low-stock-alerts
**Then** product xuất hiện trong danh sách cảnh báo với currentQty và minStockLevel

---

## Epic 4: Purchase Operations — Chu trình mua hàng

Purchaser có thể quản lý toàn bộ chu trình mua hàng: Purchase Request → RFQ → Purchase Order → Goods Receipt → Invoice matching.

### Story 4.1: Purchase Request Management — Quản lý đề nghị mua hàng

As a Purchaser,
I want to create purchase requests for products that need restocking and get them approved before creating purchase orders,
So that procurement has proper approval before committing to purchases.

**Acceptance Criteria:**

**Given** tôi tạo purchase request với danh sách products và quantities
**When** POST /api/v1/purchase/requests với payload hợp lệ
**Then** PurchaseRequest được tạo với status="DRAFT", prNumber tự sinh

**Given** purchase request ở trạng thái DRAFT
**When** tôi submit để duyệt (POST /api/v1/purchase/requests/:id/submit)
**Then** status → "PENDING_APPROVAL"

**Given** Manager approve purchase request
**When** POST /api/v1/purchase/requests/:id/approve
**Then** status → "APPROVED", approvedBy/approvedAt được set
**And** tôi có thể convert thành Purchase Order

**Given** system phát hiện product có availableQty < minStockLevel
**When** GET /api/v1/purchase/requests/low-stock-suggestions
**Then** trả về danh sách products cần mua kèm suggestedQuantity = minStockLevel - availableQty

### Story 4.2: RFQ Management — Báo giá mua hàng (Request for Quotation)

As a Purchaser,
I want to send request for quotations to multiple suppliers, enter their quotes, compare them side by side, and select the winning supplier,
So that I get the best price and terms before creating a purchase order.

**Acceptance Criteria:**

**Given** tôi tạo RFQ với danh sách products và quantities cần mua
**When** POST /api/v1/purchase/rfqs với { items: [{ productId, quantity }], supplierIds: [1, 2, 3] }
**Then** RFQ được tạo với rfqNumber tự sinh; RFQSupplier records được tạo cho từng supplier

**Given** tôi nhập báo giá từ supplier A với giá và delivery time
**When** PATCH /api/v1/purchase/rfqs/:id/quotes với { supplierId, items: [{ productId, unitPrice, deliveryDays }], notes }
**Then** báo giá được lưu vào RFQSupplierQuote records

**Given** tất cả suppliers đã gửi báo giá
**When** GET /api/v1/purchase/rfqs/:id/comparison
**Then** response trả về bảng so sánh: mỗi product × mỗi supplier với unitPrice, deliveryDays
**And** giá thấp nhất cho mỗi product được đánh dấu `isBestPrice: true`

**Given** tôi chọn supplier thắng thầu
**When** POST /api/v1/purchase/rfqs/:id/select-winner với { supplierId }
**Then** RFQ.status → "AWARDED", winnerSupplierId được set
**And** tôi có thể convert RFQ thành Purchase Order cho supplier đó

### Story 4.3: Purchase Order Management — Quản lý đơn đặt hàng mua

As a Purchaser,
I want to create and manage purchase orders with supplier and product details, and send them to suppliers,
So that suppliers know what to deliver and by when.

**Acceptance Criteria:**

**Given** tôi tạo PO với supplierId, danh sách products, unitPrice, expectedAt
**When** POST /api/v1/purchase/orders với payload hợp lệ
**Then** PurchaseOrder được tạo với status="DRAFT", poNumber tự sinh (PO-YYYY-XXXXX)
**And** totalAmount = SUM(quantity * unitPrice) được tính tự động

**Given** PO ở trạng thái DRAFT
**When** tôi gửi PO (POST /api/v1/purchase/orders/:id/send)
**Then** status → "SENT", sentAt được ghi nhận
**And** email notification được gửi qua Mailpit (nếu supplier.email có)

**Given** tôi xem danh sách POs
**When** GET /api/v1/purchase/orders với filter status, supplierId, dateRange
**Then** trả về danh sách POs với pagination, bao gồm: poNumber, supplier, totalAmount, status, expectedAt

**Given** tôi hủy PO ở trạng thái DRAFT hoặc SENT
**When** POST /api/v1/purchase/orders/:id/cancel với { reason }
**Then** status → "CANCELLED", reason được lưu

### Story 4.4: Goods Receipt (GRN) — Nhận hàng nhập kho

As a Purchaser,
I want to create goods receipts from purchase orders confirming actual quantities received (including partial receipts), triggering inventory updates,
So that stock levels are updated when goods physically arrive.

**Acceptance Criteria:**

**Given** PO ở trạng thái SENT
**When** POST /api/v1/purchase/receipts với { purchaseOrderId, warehouseId, items: [{ productId, quantity }] }
**Then** GoodsReceipt được tạo với grnNumber tự sinh (GRN-YYYY-XXXXX), status="DRAFT"

**Given** GRN ở trạng thái DRAFT
**When** POST /api/v1/purchase/receipts/:id/confirm
**Then** status → "CONFIRMED"
**And** GoodsReceivedEvent được emit với { grnId, items } → Inventory tăng stock
**And** PO.receivedQuantity được cập nhật; nếu fully received → PO.status="COMPLETED"

**Given** PO có 10 units nhưng chỉ nhận được 6 units
**When** GRN confirm với quantity=6
**Then** PO.status → "PARTIAL" (chưa nhận đủ)
**And** có thể tạo GRN thứ hai cho 4 units còn lại

### Story 4.5: Purchase Invoice & 3-Way Matching — Hóa đơn và đối chiếu

As a Purchaser,
I want to enter supplier invoices and verify them against purchase orders and goods receipts (3-way matching),
So that I only pay for what was ordered and actually received at the agreed price.

**Acceptance Criteria:**

**Given** tôi nhập invoice từ NCC với purchaseOrderId, totalAmount, invoiceNumber
**When** POST /api/v1/purchase/invoices với payload
**Then** PurchaseInvoice được tạo với status="DRAFT"
**And** hệ thống tự động so sánh với PO và GRN liên quan

**Given** invoice amount khác với PO totalAmount hơn 1%
**When** GET /api/v1/purchase/invoices/:id/matching-report
**Then** response đánh dấu "MISMATCH" kèm chi tiết: PO amount vs Invoice amount vs GRN quantity

**Given** 3-way matching hợp lệ (không có mismatch)
**When** POST /api/v1/purchase/invoices/:id/submit-for-payment
**Then** status → "PENDING_PAYMENT"
**And** PurchaseInvoiceCreatedEvent được emit → Finance tạo AP record

### Story 4.6: Purchase Reports — Báo cáo mua hàng

As a Purchaser,
I want to view purchase history, supplier debt, and supplier performance reports,
So that I can evaluate suppliers and manage procurement budgets.

**Acceptance Criteria:**

**Given** tôi mở báo cáo "Lịch sử nhập hàng"
**When** GET /api/v1/purchase/reports/inbound?dateFrom=X&dateTo=Y
**Then** trả về tổng nhập theo nhà cung cấp, theo sản phẩm, theo khoảng thời gian

**Given** tôi xem báo cáo "Công nợ nhà cung cấp"
**When** GET /api/v1/purchase/reports/supplier-debt
**Then** trả về danh sách suppliers với totalDebt, overdueAmount

**Given** tôi xem báo cáo "Hiệu suất nhà cung cấp"
**When** GET /api/v1/purchase/reports/supplier-performance?supplierId=X
**Then** trả về: tổng đơn, tỷ lệ giao đúng hạn, rating trung bình, tổng giá trị mua

---

## Epic 5: Sales Completion — Hoàn thiện bán hàng

Sales Staff có thể tính giá tự động từ bảng giá khi tạo báo giá, xử lý trả hàng, với toàn bộ events cần thiết cho Inventory và Finance.

### Story 5.1: Price List Auto-Pricing for Quotations — Tính giá tự động từ bảng giá

As a Sales Staff,
I want the quotation system to automatically calculate the correct unit price based on the customer's tier and applicable price lists when I add a product,
So that pricing is consistent and I don't need to manually look up prices.

**Acceptance Criteria:**

**Given** customer thuộc tier "Cấp 1" và có price list "Bảng giá Cấp 1" active với sản phẩm A giá 100,000
**When** tôi thêm sản phẩm A vào quotation cho customer này
**Then** unitPrice tự động điền 100,000 từ price list (gọi Price List lookup API)
**And** tôi vẫn có thể override giá thủ công nếu cần (với trường discountReason)

**Given** không có price list phù hợp cho customer (tier không match hoặc đã hết hạn)
**When** thêm sản phẩm vào quotation
**Then** unitPrice fallback về Product.minPrice
**And** UI hiển thị indicator "giá mặc định" để sales staff biết

**Given** quotation được chuyển thành Sales Order
**When** order được tạo
**Then** unitPrice trong order line = unitPrice tại thời điểm tạo quotation (pricing snapshot, không thay đổi dù price list thay đổi sau)

### Story 5.2: Sales Return Management — Quản lý trả hàng

As a Sales Staff,
I want to create return requests for delivered sales orders and have inventory automatically updated when the return is approved,
So that returned goods are tracked and customer accounts are adjusted.

**Acceptance Criteria:**

**Given** sales order đã có ít nhất một delivery CONFIRMED
**When** POST /api/v1/sales/returns với { salesOrderId, items: [{ productId, quantity, reason }] }
**Then** SalesReturn được tạo với returnNumber tự sinh (RET-YYYY-XXXXX), status="PENDING"

**Given** Manager approve return request
**When** POST /api/v1/sales/returns/:id/approve
**Then** status → "APPROVED"
**And** StockReturnedEvent được emit → Inventory tạo inventory_moves với moveType="RETURN", quantity=+N
**And** SalesReturnApprovedEvent được emit → Finance điều chỉnh AR (credit note)

**Given** return request bị từ chối
**When** POST /api/v1/sales/returns/:id/reject với { reason }
**Then** status → "REJECTED", lý do được lưu
**And** không có event nào được emit

---

## Epic 6: Finance Management — Quản lý tài chính

Kế toán có thể quản lý toàn bộ AR/AP, ghi nhận thu/chi tiền với phân bổ FIFO, và xem báo cáo tài chính đầy đủ.

### Story 6.1: AR Ledger & Customer Invoice Tracking — Công nợ phải thu

As an Accountant,
I want the system to automatically create accounts receivable records when sales invoices are created, and track payment status,
So that I always know how much each customer owes.

**Acceptance Criteria:**

**Given** Sales emits SalesInvoiceCreatedEvent với { invoiceId, customerId, amount, dueDate }
**When** Finance nhận event
**Then** INSERT vào AccountsReceivableLedger với transactionType="INVOICE", debitAmount=amount (append-only)
**And** Invoice record được tạo/cập nhật với status="UNPAID"

**Given** tôi xem danh sách công nợ khách hàng
**When** GET /api/v1/finance/ar với filter customerId, status, overdue
**Then** trả về: customerId, customerName, totalDebt, overdueAmount theo nhóm 1-30/31-60/61-90/90+ ngày

**Given** customer có invoice quá hạn hơn 30 ngày
**When** GET /api/v1/finance/ar/overdue-alerts
**Then** invoice đó xuất hiện trong danh sách cảnh báo với số ngày quá hạn

### Story 6.2: Customer Payment Collection — Thu tiền khách hàng

As an Accountant,
I want to record customer payments and allocate them to specific invoices using FIFO,
So that customer balances are accurate and payment tracking is complete.

**Acceptance Criteria:**

**Given** tôi tạo phiếu thu với customerId, totalAmount, paymentDate, referenceNumber
**When** POST /api/v1/finance/customer-payments với payload
**Then** Payment record được tạo với paymentNumber tự sinh
**And** INSERT vào AccountsReceivableLedger với transactionType="PAYMENT", creditAmount=totalAmount

**Given** tôi phân bổ payment vào các invoices cụ thể
**When** POST /api/v1/finance/customer-payments/:id/allocate với { allocations: [{ invoiceId, amount }] }
**Then** payment_allocations records được tạo
**And** mỗi invoice.paidAmount được cập nhật; nếu paidAmount >= totalAmount → invoice.status="PAID"

**Given** hệ thống đề xuất phân bổ FIFO
**When** GET /api/v1/finance/customer-payments/suggest-allocation?customerId=X&amount=Y
**Then** trả về danh sách invoices gợi ý phân bổ theo thứ tự oldest invoice first

### Story 6.3: AP Ledger & Supplier Invoice Tracking — Công nợ phải trả

As an Accountant,
I want the system to automatically create accounts payable records when purchase invoices are submitted for payment,
So that I always know how much the company owes each supplier.

**Acceptance Criteria:**

**Given** Purchase emits PurchaseInvoiceCreatedEvent với { invoiceId, supplierId, amount, dueDate }
**When** Finance nhận event
**Then** INSERT vào AccountsPayableLedger với transactionType="INVOICE", creditAmount=amount (append-only)

**Given** tôi xem danh sách công nợ nhà cung cấp
**When** GET /api/v1/finance/ap với filter supplierId, overdue
**Then** trả về: supplierId, supplierName, totalDebt, overdueAmount theo aging buckets

### Story 6.4: Supplier Payment Management — Trả tiền nhà cung cấp

As an Accountant,
I want to record payments to suppliers and allocate them to specific purchase invoices,
So that supplier balances are accurate and payment obligations are tracked.

**Acceptance Criteria:**

**Given** tôi tạo phiếu chi với supplierId, totalAmount, paymentDate
**When** POST /api/v1/finance/supplier-payments với payload
**Then** SupplierPayment được tạo với paymentNumber tự sinh (PAY-SUP-XXXXX)
**And** INSERT vào AccountsPayableLedger với transactionType="PAYMENT", debitAmount=totalAmount

**Given** tôi phân bổ payment vào các purchase invoices
**When** POST /api/v1/finance/supplier-payments/:id/allocate với allocations
**Then** purchase invoices được cập nhật paidAmount; fully paid invoices → status="PAID"

### Story 6.5: Financial Reports — Báo cáo tài chính

As an Accountant,
I want to view comprehensive financial reports including aging, cash flow, and profit & loss,
So that management has accurate financial visibility.

**Acceptance Criteria:**

**Given** tôi mở báo cáo "Tuổi nợ khách hàng"
**When** GET /api/v1/finance/reports/ar-aging
**Then** trả về bảng aging với cột: Customer, 1-30 days, 31-60 days, 61-90 days, 90+ days, Total

**Given** tôi mở báo cáo "Dòng tiền"
**When** GET /api/v1/finance/reports/cash-flow?month=2026-05
**Then** trả về: tổng thu (customer payments), tổng chi (supplier payments), net cash flow theo tháng

**Given** tôi mở báo cáo "Lợi nhuận"
**When** GET /api/v1/finance/reports/profit-loss?dateFrom=X&dateTo=Y
**Then** trả về: Revenue (tổng sales invoices), COGS (tổng purchase cost của hàng đã bán), GrossProfit = Revenue - COGS

---

## Epic 7: Customer Self-Service Portal — Cổng tự phục vụ khách hàng

Khách hàng có thể đăng nhập, duyệt catalog, đặt hàng với kiểm tra credit limit, theo dõi đơn hàng, và quản lý hồ sơ cá nhân.

### Story 7.1: Customer Product Catalog & Browsing — Duyệt catalog sản phẩm

As a Customer,
I want to browse and search available products with my specific pricing based on my customer tier,
So that I can see products I can order and their prices.

**Acceptance Criteria:**

**Given** tôi đăng nhập với role CUSTOMER
**When** GET /api/v1/portal/products?category=CABLE&search=cadivi
**Then** trả về danh sách products active, bao gồm: name, images, description, attributes, stockAvailable
**And** unitPrice được tính từ price list phù hợp với customer tier của tôi

**Given** tôi xem chi tiết sản phẩm
**When** GET /api/v1/portal/products/:id
**Then** trả về: tất cả attributes động, images, UoM, unitPrice với customer tier của tôi, stockAvailable (boolean)

**Given** tôi lọc sản phẩm theo category
**When** GET /api/v1/portal/products?categoryId=X
**Then** chỉ hiển thị products thuộc category đó (và subcategories)

### Story 7.2: Customer Order Placement — Đặt hàng (Giỏ hàng & Checkout)

As a Customer,
I want to add products to a cart and place an order with credit limit validation,
So that I can buy products through the self-service portal.

**Acceptance Criteria:**

**Given** tôi thêm sản phẩm vào giỏ hàng
**When** POST /api/v1/portal/cart/items với { productId, quantity }
**Then** cart item được lưu (theo session/user), totalAmount được tính

**Given** tôi checkout với giỏ hàng
**When** POST /api/v1/portal/orders với { deliveryAddressId, items[] }
**Then** hệ thống kiểm tra credit limit: nếu (outstandingDebt + orderTotal) > creditLimit → 400 "Vượt hạn mức"

**Given** credit limit hợp lệ
**When** order được submit
**Then** SalesOrder được tạo với status="PENDING", orderNumber tự sinh
**And** pricing snapshot được lưu vào order lines (unitPrice tại thời điểm đặt)
**And** stock reservation được thực hiện (OrderConfirmedEvent emit)

### Story 7.3: Customer Order Tracking — Theo dõi đơn hàng

As a Customer,
I want to view all my orders, track their status, and cancel pending orders,
So that I can monitor my purchases and take action when needed.

**Acceptance Criteria:**

**Given** tôi vào trang "Đơn hàng của tôi"
**When** GET /api/v1/portal/orders với filter status
**Then** chỉ trả về orders của customer đang đăng nhập
**And** danh sách hiển thị: orderNumber, createdAt, status, totalAmount

**Given** tôi click vào một order
**When** GET /api/v1/portal/orders/:id
**Then** trả về chi tiết: products, quantities, prices, deliveryAddress, deliveryStatus, payment status

**Given** order có status="PENDING"
**When** tôi huỷ đơn (POST /api/v1/portal/orders/:id/cancel)
**Then** status → "CANCELLED"
**And** OrderCancelledEvent được emit → Inventory release reservation

### Story 7.4: Customer Profile & Address Management — Hồ sơ khách hàng

As a Customer,
I want to view and update my profile information and manage my delivery addresses,
So that my account information is always current.

**Acceptance Criteria:**

**Given** tôi vào trang hồ sơ cá nhân
**When** GET /api/v1/portal/profile
**Then** trả về: name, email, phone, customerTier, creditLimit, outstandingDebt, availableCredit

**Given** tôi thêm địa chỉ nhận hàng mới
**When** POST /api/v1/portal/addresses với { label, address, isDefault }
**Then** CustomerAddress được tạo liên kết với customerId của tôi

**Given** tôi đổi mật khẩu
**When** POST /api/v1/portal/change-password với { currentPassword, newPassword }
**Then** mật khẩu được cập nhật nếu currentPassword đúng
**And** tất cả sessions khác bị invalidate

---

## Epic 8: Executive Dashboard — Bảng điều hành

Director có thể theo dõi KPI toàn công ty, biểu đồ doanh thu theo thời gian, và top sản phẩm/khách hàng bằng Recharts.

### Story 8.1: Business KPI Dashboard — Dashboard KPI doanh nghiệp

As a Director,
I want to see key business metrics on a single dashboard including revenue, purchases, AR, AP, and inventory value,
So that I have a complete business overview without accessing operational screens.

**Acceptance Criteria:**

**Given** tôi đăng nhập với role DIRECTOR và vào dashboard
**When** GET /api/v1/reports/dashboard/kpis?period=MONTH
**Then** trả về: totalRevenue (tháng này vs tháng trước), totalPurchases, totalInventoryValue, totalAR, totalAP, newOrders, pendingDeliveries

**Given** tôi muốn xem doanh thu 6 tháng gần nhất
**When** GET /api/v1/reports/dashboard/revenue-trend?months=6
**Then** trả về array 6 datapoints: { month, revenue, purchases } để vẽ LineChart bằng Recharts

**Given** tôi muốn xem danh sách low stock alerts
**When** GET /api/v1/reports/dashboard/low-stock
**Then** trả về sản phẩm có availableQty < minStockLevel kèm productName, availableQty, minStockLevel

### Story 8.2: Sales Performance Charts — Biểu đồ hiệu suất bán hàng

As a Director,
I want to see top performing products and customers as charts, and access profit reports,
So that I can make strategic business decisions based on data.

**Acceptance Criteria:**

**Given** tôi xem biểu đồ "Top 5 sản phẩm bán chạy"
**When** GET /api/v1/reports/dashboard/top-products?limit=5&period=MONTH
**Then** trả về array: { productId, productName, totalQuantity, totalRevenue } sorted by totalRevenue DESC
**And** frontend render BarChart bằng Recharts

**Given** tôi xem biểu đồ "Top 5 khách hàng"
**When** GET /api/v1/reports/dashboard/top-customers?limit=5&period=MONTH
**Then** trả về array: { customerId, customerName, totalOrders, totalRevenue } sorted by totalRevenue DESC

**Given** tôi xem báo cáo lợi nhuận
**When** GET /api/v1/reports/profit-loss?dateFrom=X&dateTo=Y
**Then** trả về: revenue, cogs, grossProfit, grossMarginPercent
**And** recent 10 sales orders và 10 purchase orders được hiển thị trên dashboard
