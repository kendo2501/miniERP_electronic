# Sales Module — BMAD Spec

## 1. Mục tiêu module

Sales Module chịu trách nhiệm quản lý toàn bộ quy trình bán hàng B2B trong hệ thống Mini-ERP phân phối thiết bị điện. Module này tập trung vào quotation, tạo đơn hàng, pricing strategy, partial delivery, trạng thái đơn hàng và orchestration giữa Catalog, Inventory và Finance.

Sales Module không trực tiếp quản lý stock vật lý hay xử lý payment/accounting ledger. Các module khác chỉ tương tác với Sales thông qua use case, contract hoặc event.

## 2. Phạm vi nghiệp vụ

### In-scope

* Quản lý quotation/báo giá.
* Tạo và quản lý đơn hàng B2B.
* Quản lý order items.
* Pricing strategy theo đại lý, volume hoặc dự án.
* Quản lý trạng thái đơn hàng.
* Partial delivery/giao hàng nhiều đợt.
* Snapshot dữ liệu sản phẩm và giá tại thời điểm bán.
* Kiểm tra tồn kho trước confirm order.
* Điều phối reserve/deduct stock qua event.
* Theo dõi doanh số theo sales/customer.
* Audit các thay đổi quan trọng của đơn hàng.

### Out-of-scope

* Trừ kho trực tiếp bằng SQL.
* Thanh toán và accounting ledger.
* Quản lý tồn kho vật lý.
* Quản lý master catalog chi tiết.

## 3. Bối cảnh dự án

Dự án áp dụng Modular Monolith với bounded context tách biệt. Sales là module orchestration trung tâm trong business flow B2B, kết nối Catalog, Inventory và Finance qua event-driven communication.

Đặc thù nghiệp vụ ngành thiết bị điện:

* Giá bán biến thiên.
* Không dùng fixed price đơn giản.
* Có chính sách theo đại lý và dự án.
* Hỗ trợ giao hàng từng phần.
* Có công nợ B2B và hạn mức tín dụng.

## 4. Mục tiêu thiết kế của Sales

* Đảm bảo dữ liệu đơn hàng ổn định theo thời gian.
* Không phụ thuộc trực tiếp vào state realtime của Catalog.
* Tách snapshot giá khỏi product master.
* Hỗ trợ orchestration qua event.
* Dễ mở rộng workflow bán hàng.
* Đảm bảo audit và tracking đầy đủ.

## 5. Định nghĩa domain

### 5.1 Customer

Customer biểu diễn đối tác B2B mua hàng.

#### Thuộc tính cốt lõi

* id
* code
* companyName
* contactPerson
* email
* phone
* address
* customerTier
* creditLimit
* active
* createdAt

### 5.2 Quotation

Quotation là báo giá gửi khách hàng trước khi tạo đơn.

#### Thuộc tính cốt lõi

* id
* quotationNumber
* customerId
* status
* validUntil
* items
* totalAmount
* notes
* createdBy
* createdAt

#### Trạng thái gợi ý

* DRAFT
* SENT
* ACCEPTED
* REJECTED
* EXPIRED

### 5.3 SalesOrder

SalesOrder là aggregate root chính của Sales Module.

#### Thuộc tính cốt lõi

* id
* orderNumber
* customerId
* salesId
* status
* pricingPolicyId
* totalAmount
* subtotal
* taxAmount
* discountAmount
* orderDate
* expectedDeliveryDate
* notes
* createdAt
* updatedAt

### 5.4 OrderItem

OrderItem là snapshot sản phẩm tại thời điểm bán.

#### Thuộc tính cốt lõi

* id
* orderId
* productId
* skuSnapshot
* productNameSnapshot
* unitPriceSnapshot
* quantity
* uom
* subtotal
* attributesSnapshot

### 5.5 Delivery

Delivery quản lý giao hàng từng phần.

#### Thuộc tính cốt lõi

* id
* orderId
* deliveryNumber
* status
* deliveryDate
* deliveredItems
* notes

#### Trạng thái gợi ý

* PENDING
* PARTIALLY_DELIVERED
* DELIVERED
* CANCELLED

## 6. Business rules

* Một đơn hàng phải có ít nhất một item.
* Giá sản phẩm trong order là snapshot bất biến.
* Không đọc giá realtime từ catalog khi xem order lịch sử.
* Chỉ được confirm order nếu stock đủ theo policy.
* Không gọi trực tiếp inventory SQL từ sales.
* Partial delivery phải cập nhật delivery status đúng.
* Tổng tiền phải tính bằng decimal/numeric.
* Customer vượt credit limit phải bị chặn hoặc yêu cầu approval.
* Order đã hoàn tất không được sửa tùy tiện.
* Mọi thay đổi trạng thái phải được audit.

## 7. Pricing strategy

### Các yếu tố ảnh hưởng giá

* Customer tier.
* Dealer level.
* Volume mua.
* Project contract.
* Promotion.
* Manual override có approval.

### Nguyên tắc

* Giá final phải snapshot vào order.
* Không phụ thuộc product current price sau khi order đã tạo.
* Pricing engine phải tách khỏi controller.

## 8. Use cases

### 8.1 Create Quotation

Tạo báo giá cho khách hàng.

### 8.2 Approve Quotation

Duyệt báo giá.

### 8.3 Convert Quotation to Order

Chuyển quotation thành sales order.

### 8.4 Create Sales Order

Tạo đơn hàng.

**Preconditions**

* Customer hợp lệ.
* Có ít nhất một item.
* Product tồn tại.

**Postconditions**

* Order được tạo.
* Snapshot dữ liệu được lưu.
* Audit log được ghi.

### 8.5 Confirm Order

Xác nhận đơn hàng.

**Rules**

* Kiểm tra stock availability.
* Kiểm tra credit limit nếu policy yêu cầu.
* Gửi event reserve/deduct stock.
* Tránh double-confirm.

### 8.6 Cancel Order

Hủy đơn hàng.

**Rules**

* Nếu đã reserve stock thì phải release.
* Không cho phép hủy nếu đã hoàn tất giao hàng hoàn toàn.

### 8.7 Create Delivery

Tạo đợt giao hàng.

### 8.8 Partial Delivery

Giao một phần order.

**Rules**

* Theo dõi quantity còn lại.
* Không giao vượt số lượng order.

### 8.9 Complete Order

Đánh dấu hoàn tất đơn hàng.

### 8.10 Get Order Detail

Lấy chi tiết đơn hàng.

### 8.11 List Orders

Danh sách đơn hàng với filter/search.

## 9. API contract đề xuất

### 9.1 POST /quotations

Tạo báo giá.

### 9.2 POST /orders

Tạo đơn hàng.

**Request**

```json
{
  "customerId": 1,
  "items": [
    {
      "productId": 100,
      "quantity": 50,
      "uom": "m"
    }
  ],
  "notes": "Giao theo tiến độ công trình"
}
```

### 9.3 POST /orders/:id/confirm

Xác nhận đơn hàng.

### 9.4 POST /orders/:id/cancel

Hủy đơn hàng.

### 9.5 POST /orders/:id/deliveries

Tạo delivery.

### 9.6 GET /orders/:id

Chi tiết đơn hàng.

### 9.7 GET /orders

Danh sách đơn hàng.

### 9.8 GET /sales/reports

Báo cáo doanh số.

## 10. Input validation

* customerId: required.
* items: required, non-empty array.
* quantity: positive number.
* uom: required.
* notes: optional.
* order status transition phải hợp lệ.
* delivery quantity không vượt remaining quantity.

Validation phải thực hiện ở inbound adapter trước khi vào use case.

## 11. Domain model suggestion

### Entities / Value Objects

* Customer
* Quotation
* QuotationItem
* SalesOrder
* OrderItem
* Delivery
* Money
* Quantity
* OrderStatus
* DeliveryStatus
* PricingRule
* CreditLimit

### Domain invariants

* Order phải có item.
* TotalAmount >= 0.
* Quantity > 0.
* Delivery không vượt ordered quantity.
* Status transition hợp lệ.

## 12. Ports

### Inbound ports

* CreateQuotationUseCase
* ApproveQuotationUseCase
* CreateSalesOrderUseCase
* ConfirmOrderUseCase
* CancelOrderUseCase
* CreateDeliveryUseCase
* CompleteOrderUseCase
* GetOrderDetailUseCase
* ListOrdersUseCase

### Outbound ports

* SalesOrderRepository
* QuotationRepository
* CustomerRepository
* PricingEnginePort
* CreditCheckPort
* EventBusPort
* AuditLogPort
* OrderReadRepository

## 13. Adapters

### Inbound adapters

* HTTP Controller
* DTO validation layer
* Event consumer adapter

### Outbound adapters

* PostgreSQL repository adapter
* Redis cache adapter
* Event bus adapter
* Reporting adapter
* Logging/audit adapter

## 14. Module events

Sales Module có thể phát các events sau:

* QuotationCreated
* OrderCreated
* OrderConfirmed
* OrderCancelled
* DeliveryCreated
* PartialDeliveryCompleted
* OrderCompleted

### Event consumers

#### Inventory Module

* reserve stock
* deduct stock
* release reserved stock

#### Finance Module

* tạo invoice
* cập nhật công nợ

#### Notification Module

* gửi email/SMS/trạng thái đơn

## 15. Order lifecycle

### Trạng thái gợi ý

* DRAFT
* PENDING_APPROVAL
* CONFIRMED
* PARTIALLY_DELIVERED
* DELIVERED
* COMPLETED
* CANCELLED

### Rules

* Transition phải hợp lệ.
* Không được skip workflow trái policy.
* Completed/Cancelled thường là terminal states.

## 16. Partial delivery strategy

### Mục tiêu

* Hỗ trợ giao hàng nhiều đợt theo công trình.
* Theo dõi remaining quantity.

### Rules

* Delivery item quantity <= remaining quantity.
* Order status cập nhật theo tiến độ giao.
* Delivery history phải audit được.

## 17. Credit control strategy

### Kiểm tra credit limit

* Customer có credit limit.
* Outstanding amount + current order không được vượt policy.

### Kết quả

* reject order
* require approval
* warning only

## 18. Cache strategy

### Cache candidates

* Order detail.
* Dashboard/reports.
* Customer sales summary.

### Cache invalidation

* create/update/cancel order
* delivery update
* status change

### Cache key gợi ý

* sales:order:{id}
* sales:orders:list:{hashOfQuery}
* sales:customer-summary:{customerId}

## 19. Reporting considerations

### Báo cáo gợi ý

* doanh số theo tháng
* doanh số theo sales
* top customer
* pending delivery
* cancelled orders
* quotation conversion rate

### Yêu cầu

* Không làm nghẽn OLTP database.
* Có thể dùng CQRS/read model riêng.

## 20. Non-functional requirements

* API response ổn định.
* Snapshot dữ liệu phải chính xác.
* Workflow rõ ràng.
* Audit đầy đủ.
* Hỗ trợ scale query báo cáo.
* Tách domain khỏi framework/database.

## 21. Security requirements

* Chỉ role được phân quyền mới được tạo/confirm/cancel order.
* Customer chỉ thấy order của mình.
* Sales chỉ thấy order theo policy.
* Audit mọi thay đổi trạng thái.
* Validate toàn bộ input.

## 22. Acceptance criteria

### Create Order

* Tạo order thành công với dữ liệu hợp lệ.
* Snapshot dữ liệu đúng.
* Audit log được ghi.

### Confirm Order

* Không confirm nếu stock không đủ.
* Không double-confirm.
* Event được phát đúng.

### Partial Delivery

* Không giao vượt quantity.
* Delivery history chính xác.
* Order status cập nhật đúng.

### Cancel Order

* Release reserved stock nếu cần.
* Không cancel order đã completed.

## 23. Test strategy

### Unit tests

* create quotation success
* create order success
* pricing calculation correctness
* credit limit validation
* partial delivery flow
* invalid status transition rejected
* cancel order release stock flow

### Integration tests

* controller -> use case -> repository flow
* event dispatch flow
* reserve stock integration
* invoice trigger integration

### Edge cases

* duplicate confirm request
* partial delivery nhiều lần
* customer vượt credit limit
* product inactive
* concurrent order confirmation

## 24. Suggested folder structure

```text
modules/
  sales/
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
      reporting/
    presentation/
      http/
      validators/
      controllers/
    tests/
```

## 25. BMAD prompt guidance

Khi dùng BMAD cho module này, prompt nên nêu rõ:

* vai trò AI
* mục tiêu nghiệp vụ: bán hàng B2B
* bounded context: Sales
* constraints kiến trúc: Hexagonal, Modular Monolith
* edge cases: pricing snapshot, partial delivery, double confirm, credit limit, concurrent requests
* output mong muốn: use case, controller, repository contract, event flow, test cases

## 26. Dependencies with other modules

### Catalog

* lấy metadata product
* không sửa product master

### Inventory

* reserve/deduct/release stock qua event
* không query trực tiếp inventory tables

### Finance

* tạo invoice và công nợ qua event

## 27. Explicit anti-patterns

* Không đọc giá realtime cho order lịch sử.
* Không để sales module update stock trực tiếp bằng SQL.
* Không hardcode pricing rule trong controller.
* Không cho phép order workflow bỏ qua state machine.
* Không dùng float/double để tính tiền.

## 28. Deliverables cho Sales Module

* Domain model
* Application use cases
* HTTP API contract
* Validation rules
* Pricing strategy
* Workflow/state machine
* Repository interface
* Infrastructure adapters
* Unit tests
* Integration tests
* Event contracts
* Reporting requirements

## 29. Ghi chú triển khai

Phần database của Sales Module nên được tách thành file riêng sau khi chốt domain, pricing strategy và workflow order lifecycle. File này chỉ mô tả yêu cầu nghiệp vụ, kiến trúc và behavior để dùng làm đầu vào cho BMAD.
