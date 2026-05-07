# Inventory Module — BMAD Spec

## 1. Mục tiêu module

Inventory Module chịu trách nhiệm quản lý tồn kho và mọi biến động stock trong hệ thống Mini-ERP B2B phân phối thiết bị điện. Đây là bounded context độc lập, tập trung vào sự toàn vẹn dữ liệu kho, xử lý đồng thời, quy đổi đơn vị tính và lưu vết biến động.

Inventory Module không xử lý pricing, order lifecycle, công nợ hay payment. Các module khác chỉ được tương tác với Inventory thông qua use case/port hoặc event đã định nghĩa.

## 2. Phạm vi nghiệp vụ

### In-scope

* Quản lý tồn kho theo kho vật lý và theo sản phẩm.
* Quản lý unit of measure (UoM) và quy đổi đơn vị tính.
* Nhập kho, xuất kho, điều chỉnh kho, giữ chỗ kho.
* Deduct stock an toàn trong môi trường concurrent.
* Ghi nhận stock movement/ledger bất biến.
* Hỗ trợ audit trail cho các thao tác kho.
* Hỗ trợ tra cứu nhanh số lượng tồn hiện tại.
* Phát event khi stock thay đổi.

### Out-of-scope

* Tạo đơn hàng và chốt đơn.
* Hóa đơn, thanh toán, công nợ.
* Quản lý danh mục sản phẩm chi tiết.
* Chính sách giá bán.

## 3. Bối cảnh dự án

Dự án áp dụng Modular Monolith, tách module theo bounded context và giao tiếp giữa module bằng event-driven nội bộ. Domain layer phải độc lập với framework, ORM và database. Inventory là module trọng yếu vì liên quan trực tiếp đến tính toàn vẹn dữ liệu và race conditions trong môi trường nhiều request đồng thời.

## 4. Mục tiêu thiết kế của Inventory

* Không để stock âm trong mọi tình huống.
* Hỗ trợ quy đổi đơn vị tính linh hoạt cho ngành điện.
* Tách biệt stock hiện tại và stock ledger lịch sử.
* Giao dịch phải an toàn, idempotent khi cần.
* Dữ liệu lịch sử phải append-only.
* Dễ audit, dễ test, dễ mở rộng.

## 5. Định nghĩa domain

### 5.1 Warehouse

Warehouse là kho vật lý hoặc điểm lưu trữ hàng hóa.

#### Thuộc tính cốt lõi

* id
* code
* name
* location
* active
* createdAt
* updatedAt

### 5.2 InventoryItem

InventoryItem biểu diễn số lượng tồn hiện tại của một product tại một warehouse.

#### Thuộc tính cốt lõi

* id
* warehouseId
* productId
* onHandQuantity
* reservedQuantity
* availableQuantity
* version
* createdAt
* updatedAt

### 5.3 StockMovement

StockMovement là bản ghi biến động kho bất biến, dùng để audit và truy vết lịch sử.

#### Loại biến động gợi ý

* INBOUND
* OUTBOUND
* RESERVE
* RELEASE
* ADJUSTMENT
* TRANSFER
* STOCKTAKE

#### Thuộc tính cốt lõi

* id
* movementType
* warehouseId
* productId
* quantityDelta
* uom
* referenceType
* referenceId
* idempotencyKey
* metadata
* createdAt

### 5.4 UoM Conversion

UoM Conversion quản lý quy đổi giữa đơn vị nhập kho và đơn vị hiển thị/bán hàng.

#### Ví dụ

* 1 cuộn = 1000 mét
* 1 thùng = 20 cái
* 1 bó = 50 mét

#### Mục tiêu

* Không hardcode phép quy đổi trong application code.
* Cho phép thay đổi hệ số qua dữ liệu cấu hình.

## 6. Business rules

* Không được có tồn kho âm.
* Stock movement lịch sử không được UPDATE/DELETE vật lý nếu có thể tránh.
* Stock hiện tại phải được cập nhật trong transaction an toàn.
* Mọi thao tác thay đổi stock phải có lý do/reference rõ ràng.
* Nếu quantity yêu cầu lớn hơn số lượng khả dụng thì phải từ chối.
* Tách rõ onHand, reserved và available nếu nghiệp vụ có giữ chỗ.
* Một product tại một warehouse chỉ có một bản ghi tồn hiện tại.
* Tất cả stock movement phải có khả năng truy vết về nguồn phát sinh.
* Nếu API bị gọi lặp do retry mạng, cùng một idempotency key chỉ được xử lý một lần.

## 7. Use cases

### 7.1 Get Stock Summary

Lấy số lượng tồn hiện tại theo product/warehouse.

**Behavior**

* Trả onHand, reserved, available.
* Có thể filter theo warehouse.

### 7.2 Receive Stock

Nhập kho từ mua hàng, điều chỉnh tăng hoặc hàng trả lại.

**Preconditions**

* Input hợp lệ.
* Warehouse và product tồn tại.

**Postconditions**

* onHand tăng.
* StockMovement được ghi.
* Event được phát.

### 7.3 Deduct Stock

Trừ kho khi đơn hàng được xác nhận hoặc hàng xuất đi.

**Rules**

* Phải khóa dữ liệu đúng cách.
* Không cho phép trừ nếu không đủ available.
* Không dùng logic read-then-write đơn giản trong code ứng dụng khi môi trường concurrent.

### 7.4 Reserve Stock

Giữ chỗ tồn kho cho đơn chưa xuất hàng.

**Rules**

* reserved tăng.
* available giảm tương ứng.
* Có thể release nếu đơn hủy hoặc hết hạn giữ chỗ.

### 7.5 Release Reserved Stock

Giải phóng stock đã giữ chỗ.

### 7.6 Transfer Stock

Chuyển stock giữa hai warehouse.

**Rules**

* Trừ kho nguồn và cộng kho đích trong cùng transaction.
* Nếu một bước fail thì rollback toàn bộ.

### 7.7 Adjust Stock

Điều chỉnh tồn theo kiểm kê hoặc nghiệp vụ đặc biệt.

**Rules**

* Phải ghi lý do điều chỉnh.
* Phải tạo stock movement audit.

### 7.8 Get Movement History

Xem lịch sử biến động của một product hoặc warehouse.

## 8. API contract đề xuất

### 8.1 GET /inventory/summary

Lấy tồn hiện tại.

### 8.2 POST /inventory/receive

Nhập kho.

**Request**

```json
{
  "warehouseId": 1,
  "productId": 100,
  "quantity": 50,
  "uom": "m",
  "referenceType": "purchase_receipt",
  "referenceId": "PR-0001"
}
```

### 8.3 POST /inventory/deduct

Trừ kho.

**Request**

```json
{
  "warehouseId": 1,
  "productId": 100,
  "quantity": 20,
  "uom": "m",
  "referenceType": "sales_order",
  "referenceId": "SO-0009",
  "idempotencyKey": "8f5a2d2e-3f0f-4f5f-9e1a-123456789abc"
}
```

### 8.4 POST /inventory/reserve

Giữ chỗ kho.

### 8.5 POST /inventory/release

Hủy giữ chỗ.

### 8.6 POST /inventory/transfer

Chuyển kho.

### 8.7 POST /inventory/adjust

Điều chỉnh kho.

### 8.8 GET /inventory/movements

Tra cứu lịch sử biến động.

## 9. Input validation

* warehouseId: required, positive integer.
* productId: required, positive integer.
* quantity: required, positive number theo UoM.
* uom: required, non-empty.
* referenceType/referenceId: required cho các thao tác thay đổi kho.
* idempotencyKey: required cho các API có thể retry.
* metadata: optional object.

Validation phải thực hiện ở inbound adapter trước khi vào use case.

## 10. Domain model suggestion

### Entities / Value Objects

* Warehouse
* InventoryItem
* StockMovement
* Quantity
* Uom
* UomConversionRule
* StockReference
* IdempotencyKey

### Domain invariants

* onHandQuantity không âm.
* reservedQuantity không âm.
* availableQuantity = onHandQuantity - reservedQuantity.
* product/warehouse pair là duy nhất.
* movementType phải nằm trong enum/domain set hợp lệ.

## 11. Ports

### Inbound ports

* GetStockSummaryUseCase
* ReceiveStockUseCase
* DeductStockUseCase
* ReserveStockUseCase
* ReleaseStockUseCase
* TransferStockUseCase
* AdjustStockUseCase
* GetMovementHistoryUseCase

### Outbound ports

* InventoryRepository
* StockMovementRepository
* UomConversionRepository
* InventoryCachePort
* EventBusPort
* DistributedLockPort
* IdempotencyStorePort

## 12. Adapters

### Inbound adapters

* HTTP Controller
* DTO validation layer
* Event consumer adapter nếu nhận event từ Sales/Procurement

### Outbound adapters

* PostgreSQL repository adapter
* Redis cache adapter
* Redis/distributed lock adapter
* In-memory event bus adapter
* Logging/audit adapter

## 13. Module events

Inventory Module có thể phát các domain/integration events sau:

* StockReceived
* StockDeducted
* StockReserved
* StockReleased
* StockTransferred
* StockAdjusted
* StockLowWarning

### Event consumers

* Sales Module có thể nghe StockLowWarning hoặc kiểm tra available trước khi confirm order.
* Reporting/BI có thể dùng movement history để dựng read model.
* Notification Module có thể gửi cảnh báo khi stock thấp.

## 14. Transaction & concurrency strategy

### Yêu cầu cốt lõi

* Mọi thay đổi stock phải chạy trong transaction.
* Phải chống race condition.
* Không dùng kiểm tra tồn kho kiểu read-then-write thuần application.

### Cách tiếp cận đề xuất

#### Pessimistic locking

* Khóa dòng inventory bằng transaction row lock.
* Phù hợp với luồng deduct stock có xung đột cao.

#### Optimistic locking

* Dùng cột version.
* Phù hợp khi tần suất tranh chấp thấp hơn.

### Quy tắc thực thi

* Chọn 1 chiến lược chính cho deduct stock.
* Nếu dùng lock, mọi thao tác phải theo đúng thứ tự khóa để giảm deadlock.
* Nếu update thất bại vì version mismatch, retry có kiểm soát.

## 15. Cache strategy

### Cache candidates

* Stock summary theo product/warehouse.
* UoM conversion rules.
* Low-stock dashboard queries.

### Cache invalidation

* Khi receive/deduct/reserve/release/transfer/adjust.
* Khi thay đổi rule quy đổi UoM.

### Cache key gợi ý

* inventory:summary:{warehouseId}:{productId}
* inventory:uom:{productId}
* inventory:movements:{warehouseId}:{productId}:{hashOfQuery}

## 16. Immutability strategy

* StockMovement là append-only.
* Không sửa lịch sử giao dịch kho nếu không thật sự cần.
* Nếu có correction, tạo movement đảo chiều hoặc movement điều chỉnh mới.
* Không xóa vật lý lịch sử để bảo toàn audit trail.

## 17. Search/reporting considerations

* Summary tồn kho phải phục vụ nhanh cho dashboard và sales flow.
* History movement nên tách khỏi query summary để tránh ảnh hưởng hiệu năng.
* Các báo cáo lớn nên đọc từ read model riêng nếu cần.

## 18. Non-functional requirements

* Độ trễ thấp cho tra cứu tồn kho.
* Tính đúng đắn ưu tiên hơn tốc độ thuần.
* Transaction phải an toàn với concurrency cao.
* Dữ liệu lịch sử phải audit được.
* Mọi thay đổi phải test được bằng unit và integration test.

## 19. Security requirements

* Chỉ role được cấp quyền mới được thao tác nhập/xuất/điều chỉnh kho.
* API deduct/reserve/transfer phải có kiểm tra quyền rõ ràng.
* Idempotency key phải được bảo vệ khỏi reuse trái phép trong phạm vi hợp lệ.
* Log đầy đủ thao tác thay đổi kho.

## 20. Acceptance criteria

### Receive Stock

* Tăng tồn thành công khi input hợp lệ.
* Movement được ghi.
* Cache được invalidate.

### Deduct Stock

* Không làm stock âm.
* Có lock/optimistic check đúng.
* Retry không tạo trừ kho trùng nếu dùng idempotency key.

### Reserve/Release

* Reserved và available thay đổi đúng.
* Không vượt quá stock khả dụng.

### Transfer Stock

* Chuyển kho nguyên tử trong cùng transaction.
* Nếu bước nào fail thì rollback.

### Movement History

* Trả đúng lịch sử biến động.
* Không làm ảnh hưởng dữ liệu hiện tại.

## 21. Test strategy

### Unit tests

* receive stock success
* deduct stock success
* deduct stock insufficient stock rejected
* reserve stock success
* release reserved stock success
* transfer stock atomicity
* adjustment with reason required
* uom conversion correctness

### Integration tests

* controller -> use case -> repository flow
* transaction rollback on failure
* lock/version conflict flow
* idempotency repeated request flow

### Concurrency tests

* nhiều request đồng thời deduct cùng 1 product
* đảm bảo không stock âm
* đảm bảo không double-process cùng idempotency key

## 22. Suggested folder structure

```text
modules/
  inventory/
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
      locking/
      messaging/
      idempotency/
    presentation/
      http/
      validators/
      controllers/
    tests/
```

## 23. BMAD prompt guidance

Khi dùng BMAD cho module này, prompt nên nêu rõ:

* vai trò AI
* mục tiêu nghiệp vụ: quản lý kho an toàn
* bounded context: Inventory
* constraints kiến trúc: Hexagonal, Modular Monolith, domain sạch
* edge cases: stock âm, concurrent requests, lock conflict, idempotency, transfer atomicity, UoM conversion
* output mong muốn: use case, controller, repository contract, locking strategy, test cases

## 24. Dependencies with other modules

### Catalog

* dùng product identity và metadata sản phẩm
* không sửa catalog trực tiếp từ inventory

### Sales

* nhận event từ sales khi order confirmed hoặc reserve stock
* không để sales gọi trực tiếp SQL vào kho

### Finance

* không liên quan trực tiếp, chỉ tham chiếu nếu cần báo cáo

## 25. Explicit anti-patterns

* Không kiểm tra tồn kho bằng if đơn giản trong application code.
* Không cập nhật stock mà không có transaction.
* Không cho phép history table bị update/delete vật lý nếu không có lý do đặc biệt.
* Không để controller nắm business logic deduct/reserve.
* Không gọi trực tiếp logic sales từ inventory.

## 26. Deliverables cho Inventory Module

* Domain model
* Application use cases
* HTTP API contract
* Validation rules
* Repository interface
* Locking strategy
* Idempotency handling
* Infrastructure adapters
* Unit tests
* Integration tests
* Concurrency tests
* Event contracts

## 27. Ghi chú triển khai

Phần database của Inventory Module nên được tách thành file riêng sau khi chốt domain, rule đồng thời và API contract. File này chỉ mô tả yêu cầu nghiệp vụ, kiến trúc và behavior để dùng làm đầu vào cho BMAD.
