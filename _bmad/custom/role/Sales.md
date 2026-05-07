# Sales Role — BMAD Spec

## 1. Mục tiêu role

Sales là role vận hành bán hàng trực tiếp trong hệ thống Mini-ERP B2B. Role này chịu trách nhiệm:

* quản lý khách hàng
* tạo quotation
* tạo và theo dõi đơn hàng
* theo dõi delivery
* hỗ trợ thu hồi công nợ
* chăm sóc customer relationship

Sales là role operational core trong quy trình bán hàng.

## 2. Trách nhiệm chính

### Customer management

* quản lý khách hàng phụ trách
* cập nhật thông tin customer
* theo dõi lịch sử giao dịch
* chăm sóc khách hàng

### Sales operations

* tạo quotation
* tạo sales order
* theo dõi order status
* phối hợp giao hàng
* theo dõi payment status

### Sales pipeline

* theo dõi lead/opportunity nếu có
* theo dõi conversion
* follow-up quotation
* xử lý pending orders

### Reporting & KPI

* xem KPI cá nhân
* theo dõi doanh số
* theo dõi collection progress

## 3. Phạm vi quyền hạn

### In-scope permissions

* tạo/sửa quotation
* tạo order
* xem customer assigned
* xem inventory availability
* theo dõi delivery
* xem payment status customer phụ trách
* export dữ liệu trong scope

### Restricted actions

Sales thường không được:

* approve pricing override lớn
* reverse payment
* inventory adjustment
* modify global settings
* access full finance reports
* view toàn bộ system analytics

## 4. Domain responsibilities

Sales có thể thao tác trên:

* Sales Module
* Catalog Module
* Inventory Module (view-only limited)
* Finance Module (view-only limited)
* Notification Module

Sales thường bị giới hạn theo:

* assigned customers
* branch
* sales territory
* organization scope

## 5. RBAC model

### Role name

```text
SALES
```

### Recommended permission strategy

Scoped operational permissions.

Ví dụ:

* sales.order.create
* sales.order.view_assigned
* sales.quotation.create
* finance.invoice.view_assigned
* inventory.stock.view

## 6. Core permissions

### Customer management

* customer.view_assigned
* customer.create
* customer.update_assigned

### Sales operations

* sales.quotation.create
* sales.quotation.update_own
* sales.order.create
* sales.order.view_assigned
* sales.order.cancel_request
* sales.delivery.view

### Catalog

* catalog.product.view
* catalog.search

### Inventory

* inventory.stock.view
* inventory.availability.check

### Finance

* finance.invoice.view_assigned
* finance.payment_status.view_assigned
* finance.outstanding.view_assigned

### Reporting

* reporting.dashboard.view_self
* reporting.sales_kpi.view_self
* reporting.export_self

## 7. Business rules

* Sales chỉ xem customer/order trong scope được giao.
* Discount vượt threshold cần approval.
* Không được sửa immutable order snapshots.
* Không được chỉnh stock trực tiếp.
* Không được reverse payment.
* Export dữ liệu phải audit.
* Cancel order sau confirm có thể cần approval.

## 8. Sales workflows

### 8.1 Create Customer

Tạo customer mới.

### 8.2 Create Quotation

Tạo báo giá.

### 8.3 Update Quotation

Cập nhật quotation trước approval.

### 8.4 Convert Quotation To Order

Chuyển quotation thành order.

### 8.5 Create Sales Order

Tạo sales order.

### 8.6 Request Pricing Override

Yêu cầu override pricing.

### 8.7 Follow Delivery Status

Theo dõi giao hàng.

### 8.8 Follow Outstanding Balance

Theo dõi công nợ customer.

## 9. Customer management strategy

### Responsibilities

* maintain relationship
* update contact information
* follow overdue invoices
* manage sales pipeline

### Restrictions

* không xem customer ngoài scope.
* sensitive finance data có thể restricted.

## 10. Pricing & discount strategy

### Rules

* default pricing theo policy.
* manual discount có threshold.
* large override cần Manager/Admin.

### Audit

Mọi pricing override request phải log.

## 11. Inventory visibility strategy

### Allowed visibility

* available stock
* estimated availability
* delivery status

### Restricted

* inventory adjustment
* warehouse config
* internal stock reconciliation

## 12. Finance visibility strategy

### Allowed visibility

* invoice status
* payment status
* customer outstanding

### Restricted

* payment reversal
* financial ledger
* company-wide financial reports

## 13. Security requirements

### Access control

* scoped RBAC.
* customer ownership enforcement.
* branch restrictions.

### Audit

Sales actions cần audit:

* quotation creation
* order creation
* export actions
* pricing override requests

### Session security

* suspicious login monitoring.
* optional MFA.

## 14. UI/UX responsibilities

### Sales dashboard

* personal KPIs
* pending quotations
* pending orders
* overdue invoices
* delivery tracking
* low stock warnings

### Sales screens

* customer management
* quotation management
* order tracking
* payment status tracking

## 15. API access expectations

### Protected endpoints

* /sales/orders
* /sales/quotations
* /sales/customers
* /sales/dashboard

### Enforcement

* JWT authentication
* scoped RBAC
* customer ownership validation

## 16. Audit requirements

### Audit events gợi ý

* QUOTATION_CREATED
* ORDER_CREATED
* PRICING_OVERRIDE_REQUESTED
* CUSTOMER_UPDATED
* REPORT_EXPORTED

### Required fields

* salesUserId
* customerId
* orderId
* quotationId
* timestamp

## 17. Reporting access

### Accessible reports

* personal sales KPIs
* assigned customer revenue
* quotation conversion
* collection progress
* delivery performance

### Restrictions

* không xem toàn bộ company financial analytics.
* sensitive margin data có thể restricted.

## 18. Session & security strategy

### Monitoring

* unusual export volume
* suspicious login
* abnormal quotation activity

### Controls

* session expiration
* export auditing
* scoped query filtering

## 19. Integration with modules

### Sales Module

* quotation/order workflows

### Catalog Module

* product search/view

### Inventory Module

* stock availability lookup

### Finance Module

* invoice/payment visibility

### Notification Module

* delivery/payment reminders

## 20. Acceptance criteria

### Sales Operations

* Sales tạo quotation/order thành công.
* Scoped visibility enforced.
* Approval workflow hoạt động.

### Inventory Visibility

* Sales xem đúng stock availability.
* Không chỉnh stock trực tiếp.

### Finance Visibility

* Sales xem đúng invoice/payment status.
* Restricted finance actions blocked.

### Security

* Unauthorized access bị chặn.
* Audit logs ghi đầy đủ.

## 21. Test strategy

### Unit tests

* scoped permission checks
* quotation/order creation flow
* pricing threshold validation
* customer ownership validation

### Integration tests

* quotation -> order flow
* inventory visibility integration
* finance visibility integration
* reporting access integration

### Security tests

* scope bypass attempt
* unauthorized finance access
* export abuse attempt
* privilege escalation attempt

## 22. Explicit anti-patterns

* Không cho Sales unrestricted finance access.
* Không cho direct stock modification.
* Không bypass pricing approval workflow.
* Không expose customer data ngoài scope.
* Không bỏ audit pricing overrides.

## 23. Deliverables cho Sales Role

* Scoped RBAC matrix
* Sales workflows
* Pricing approval rules
* Customer ownership rules
* Reporting access rules
* Security policies
* Audit requirements
* Test scenarios

## 24. Ghi chú triển khai

Sales role nên enforce ownership/scoped access ở query layer và use-case layer. Pricing overrides và order cancellation cần configurable approval workflow theo organization policy.
