# Catalog Module — BMAD Spec

## 1. Mục tiêu module

Catalog Module chịu trách nhiệm quản lý danh mục thiết bị điện trong hệ thống Mini-ERP B2B. Đây là bounded context độc lập, tập trung vào dữ liệu sản phẩm, thuộc tính động, phân loại, trạng thái kích hoạt, và các quy tắc nghiệp vụ liên quan đến danh mục hàng hóa.

Catalog Module không chứa logic kho, đơn hàng, công nợ hay thanh toán. Các module khác chỉ được tương tác với Catalog thông qua contract/service interface hoặc event đã định nghĩa.

## 2. Phạm vi nghiệp vụ

### In-scope

* Quản lý sản phẩm thiết bị điện.
* Quản lý SKU/mã hàng.
* Quản lý tên sản phẩm, mô tả, trạng thái active/inactive.
* Quản lý thuộc tính động của sản phẩm theo ngành điện.
* Hỗ trợ tìm kiếm/lọc theo thuộc tính động.
* Hỗ trợ cache cho truy vấn đọc thường xuyên.
* Hỗ trợ audit trail cho các thay đổi quan trọng.

### Out-of-scope

* Tồn kho, nhập/xuất kho, deduct stock.
* Đơn hàng, order items, pricing final trong sales flow.
* Công nợ, hóa đơn, thanh toán.
* Quản lý người dùng/role/permission.

## 3. Bối cảnh dự án

Dự án dùng kiến trúc Modular Monolith, tách module theo Bounded Context và giao tiếp giữa module bằng event-driven nội bộ. Domain layer phải độc lập với framework, ORM và database. Kiến trúc tổng thể áp dụng Hexagonal Architecture với ports & adapters. Tài liệu gốc của dự án xác định rõ Catalog là một trong 4 module lõi cùng với Inventory, Sales và Finance.

## 4. Mục tiêu thiết kế của Catalog

* Tách biệt domain logic khỏi persistence.
* Hỗ trợ thuộc tính sản phẩm thay đổi theo loại thiết bị điện.
* Không hardcode schema cho mọi biến thể sản phẩm.
* Tối ưu truy vấn sản phẩm phổ biến bằng cache.
* Đảm bảo dữ liệu đủ chuẩn để dùng lại ở Sales/Inventory.
* Dễ mở rộng khi thêm loại thiết bị mới.

## 5. Định nghĩa domain

### 5.1 Product

Product là aggregate root của Catalog Module.

#### Thuộc tính cốt lõi

* id
* sku
* name
* description
* categoryId hoặc categoryCode
* brand
* active
* attributes
* createdAt
* updatedAt

#### Ý nghĩa

* `sku` phải duy nhất.
* `name` là tên hiển thị cho nghiệp vụ.
* `attributes` chứa dữ liệu động theo loại hàng hóa.
* `active` dùng để ẩn/hiện sản phẩm khỏi các quy trình nghiệp vụ.

### 5.2 Product Attributes

Thuộc tính động dùng để mô tả đặc thù thiết bị điện, ví dụ:

* cáp điện: tiết diện lõi, số lõi, đơn vị tính, chiều dài cuộn
* đèn: công suất, loại chip, nhiệt độ màu
* thiết bị đóng cắt: dòng định mức, số cực, dòng ngắn mạch
* tủ điện: kích thước, vật liệu, cấp bảo vệ

Thuộc tính động phải:

* có khả năng mở rộng
* không làm phình schema quan hệ
* có thể lọc/tìm kiếm theo key/value phổ biến

## 6. Business rules

* SKU là duy nhất trong toàn hệ thống.
* Product phải có `name` và `sku` hợp lệ trước khi lưu.
* `attributes` chỉ chứa dữ liệu hợp lệ theo schema động đã định nghĩa hoặc policy của module.
* Sản phẩm inactive không được chọn trong các luồng nghiệp vụ mới nếu rule nghiệp vụ yêu cầu.
* Khi cập nhật product, các trường giá trị lịch sử của đơn hàng cũ không được bị ảnh hưởng bởi thay đổi sau này ở Catalog.
* Truy vấn đọc phổ biến phải ưu tiên cache.

## 7. Use cases

### 7.1 Create Product

Tạo sản phẩm mới với SKU, tên, mô tả, danh mục, brand và attributes.

**Preconditions**

* User có quyền phù hợp.
* SKU chưa tồn tại.
* Input hợp lệ.

**Postconditions**

* Product được tạo thành công.
* Cache liên quan được làm mới hoặc xóa.
* Audit log được ghi nhận.

### 7.2 Update Product

Cập nhật thông tin sản phẩm và/hoặc attributes.

**Rules**

* Không được làm mất tính toàn vẹn của dữ liệu lịch sử.
* Nếu thay đổi ảnh hưởng đến tìm kiếm, cache phải invalidated.

### 7.3 Get Product by ID

Lấy chi tiết sản phẩm theo id.

**Behavior**

* Ưu tiên cache nếu có.
* Nếu cache miss thì đọc từ repository.

### 7.4 List Products

Lấy danh sách sản phẩm có phân trang, filter, sort.

**Filters gợi ý**

* keyword
* sku
* brand
* category
* active
* attributes dynamic filters

### 7.5 Search Products by Dynamic Attributes

Tìm sản phẩm theo thuộc tính động, ví dụ công suất, tiết diện, số lõi.

**Ví dụ**

* đèn có `power = 18W`
* cáp có `crossSection = 2.5mm2`

### 7.6 Deactivate Product

Đánh dấu inactive thay vì xóa vật lý nếu cần giữ lịch sử.

## 8. API contract đề xuất

### 8.1 POST /products

Tạo sản phẩm.

**Request**

```json
{
  "sku": "CAP-DV-2X2.5",
  "name": "Cáp điện 2x2.5",
  "description": "Cáp điện dân dụng",
  "categoryCode": "CABLE",
  "brand": "Cadivi",
  "attributes": {
    "cores": 2,
    "crossSection": "2.5mm2",
    "unit": "m",
    "coilLength": 1000
  }
}
```

### 8.2 PUT /products/:id

Cập nhật sản phẩm.

### 8.3 GET /products/:id

Lấy chi tiết sản phẩm.

### 8.4 GET /products

Danh sách sản phẩm với filter, sort, pagination.

### 8.5 GET /products/search

Tìm kiếm theo keyword/attributes.

### 8.6 PATCH /products/:id/deactivate

Vô hiệu hóa sản phẩm.

## 9. Input validation

* `sku`: required, non-empty, unique, normalized.
* `name`: required, non-empty.
* `description`: optional.
* `attributes`: required object theo schema động.
* `categoryCode`: optional hoặc required tùy policy.
* `brand`: optional.

Validation phải thực hiện ở inbound adapter trước khi vào use case.

## 10. Domain model suggestion

### Entities / Value Objects

* Product
* ProductSku
* ProductName
* ProductAttributes
* ProductStatus
* CategoryCode
* BrandName

### Domain invariants

* ProductSku không rỗng.
* ProductName không rỗng.
* attributes không chứa key bị cấm.
* attributes phải pass schema validation.

## 11. Ports

### Inbound ports

* CreateProductUseCase
* UpdateProductUseCase
* GetProductDetailUseCase
* ListProductsUseCase
* SearchProductsUseCase
* DeactivateProductUseCase

### Outbound ports

* ProductRepository
* ProductReadRepository
* ProductCachePort
* AuditLogPort
* EventBusPort

## 12. Adapters

### Inbound adapters

* HTTP Controller
* DTO validation layer

### Outbound adapters

* PostgreSQL repository adapter
* Redis cache adapter
* In-memory event bus adapter
* Logging/audit adapter

## 13. Module events

Catalog Module có thể phát các domain/integration events sau:

* ProductCreated
* ProductUpdated
* ProductDeactivated
* ProductCacheInvalidated

### Event consumers

* Sales Module có thể dùng product metadata để hiển thị trên đơn hàng.
* Search/read model có thể đồng bộ dữ liệu đọc.
* Cache layer có thể xóa key tương ứng.

## 14. Cache strategy

Áp dụng Cache-Aside cho các API đọc sản phẩm phổ biến.

### Cache candidates

* GET /products/:id
* GET /products
* các query list/search phổ biến

### Cache invalidation

* khi create/update/deactivate product
* khi attributes thay đổi
* khi có event ảnh hưởng đến product view

### Cache key gợi ý

* catalog:product:{id}
* catalog:product:sku:{sku}
* catalog:products:list:{hashOfQuery}

## 15. Search strategy

* Hỗ trợ search theo keyword trên sku/name/brand.
* Hỗ trợ filter attributes động.
* Các thuộc tính động phổ biến cần được index phù hợp khi chuyển sang phần database riêng.

## 16. Non-functional requirements

* Domain không phụ thuộc framework hoặc ORM.
* API validation rõ ràng, trả lỗi chuẩn.
* Read performance tốt cho danh sách sản phẩm.
* Cache phải có chiến lược invalidation rõ.
* Logging/audit đầy đủ.
* Dễ test unit và integration.

## 17. Security requirements

* Chỉ role được phân quyền mới được tạo/sửa/xóa product.
* Input phải được sanitize/validate.
* Không cho phép payload attributes chứa dữ liệu trái policy.
* Audit mọi thay đổi trên product master data.

## 18. Acceptance criteria

### Create Product

* Tạo mới thành công khi dữ liệu hợp lệ.
* SKU trùng phải bị từ chối.
* attributes không hợp lệ phải bị từ chối.
* Audit log được ghi.
* Cache liên quan được invalidate.

### Update Product

* Sửa thành công khi product tồn tại.
* Không ghi đè dữ liệu invalid.
* Cache được refresh hoặc xóa.

### List/Search Product

* Phân trang hoạt động đúng.
* Filter theo attributes hoạt động đúng.
* Active/inactive được xử lý theo rule.

### Get Product

* Trả dữ liệu đúng schema.
* Cache hit/miss hoạt động đúng.

## 19. Test strategy

### Unit tests

* create product success
* duplicate sku rejected
* invalid attributes rejected
* update product success
* deactivate product success
* search by dynamic attributes

### Integration tests

* controller -> use case -> repository flow
* cache invalidation flow
* event dispatch flow

### Edge cases

* sku trimming/normalization
* empty attributes object
* null brand
* inactive product in downstream use
* concurrent update request

## 20. Suggested folder structure

```text
modules/
  catalog/
    domain/
      entities/
      value-objects/
      services/
      events/
      ports/
    application/
      use-cases/
      dtos/
      mappers/
    infrastructure/
      persistence/
      cache/
      messaging/
    presentation/
      http/
      validators/
      controllers/
    tests/
```

## 21. BMAD prompt guidance

Khi dùng BMAD cho module này, prompt nên nêu rõ:

* vai trò AI
* mục tiêu nghiệp vụ
* bounded context: Catalog
* constraints kiến trúc: Hexagonal, Modular Monolith, domain sạch
* edge cases: duplicate SKU, invalid attributes, inactive product, cache invalidation
* output mong muốn: use case, controller, repository contract, test cases

## 22. Dependencies with other modules

### Inventory

* dùng product identity để tham chiếu hàng tồn
* không gọi trực tiếp logic kho

### Sales

* dùng product data để build order items và pricing snapshot

### Finance

* không truy cập trực tiếp catalog master trừ khi cần hiển thị tham chiếu

## 23. Explicit anti-patterns

* Không để controller chứa business logic.
* Không để domain import ORM/database library.
* Không query SQL trực tiếp từ use case.
* Không hardcode attribute schema trong nhiều nơi khác nhau.
* Không xóa vật lý product nếu cần giữ lịch sử nghiệp vụ.

## 24. Deliverables cho Catalog Module

* Domain model
* Application use cases
* HTTP API contract
* Validation rules
* Repository interface
* Infrastructure adapters
* Unit tests
* Integration tests
* Cache strategy
* Event contracts

## 25. Ghi chú triển khai

Phần database của Catalog Module nên được tách thành file riêng sau khi chốt domain và API contract. File này chỉ mô tả yêu cầu nghiệp vụ, kiến trúc và behavior để dùng làm đầu vào cho BMAD.
