# Customer Role — BMAD Spec

## 1. Mục tiêu role

Customer là role đại diện cho khách hàng B2B sử dụng portal hoặc các chức năng self-service trong hệ thống Mini-ERP.

Role này cho phép khách hàng:

* xem thông tin sản phẩm
* tạo/yêu cầu quotation
* theo dõi đơn hàng
* theo dõi delivery
* xem invoice/payment status
* tải tài liệu liên quan
* quản lý profile doanh nghiệp

Customer là external-facing role nên yêu cầu bảo mật và scoped access nghiêm ngặt.

## 2. Trách nhiệm chính

### Self-service operations

* xem catalog sản phẩm
* yêu cầu quotation
* theo dõi order status
* theo dõi delivery progress
* xem invoice/payment status
* tải invoice/quotation PDF

### Account management

* cập nhật thông tin công ty
* quản lý contact information
* đổi password
* quản lý notification preferences

### Communication

* nhận notifications
* trao đổi trạng thái đơn hàng
* theo dõi overdue/payment reminders

## 3. Phạm vi quyền hạn

### In-scope permissions

* view own company data
* view assigned quotations/orders
* view own invoices
* download own attachments
* manage own profile/preferences
* track delivery/payment status

### Restricted actions

Customer thường không được:

* xem dữ liệu khách hàng khác
* chỉnh pricing policy
* modify inventory
* access internal reports
* reverse payments
* view audit logs
* manage system settings

## 4. Domain responsibilities

Customer có thể thao tác trên:

* Catalog Module (view/search)
* Sales Module (own quotations/orders)
* Finance Module (own invoices/payments)
* Notification Module
* File Attachments Module (own documents)
* Auth/Profile Module

Customer bị giới hạn nghiêm ngặt theo:

* organization/company ownership
* own records only

## 5. RBAC model

### Role name

```text
CUSTOMER
```

### Recommended permission strategy

Strict ownership-based access.

Ví dụ:

* catalog.product.view
* sales.order.view_own
* finance.invoice.view_own
* attachments.download_own

## 6. Core permissions

### Catalog

* catalog.product.view
* catalog.search

### Quotations & Orders

* sales.quotation.create_request
* sales.quotation.view_own
* sales.order.view_own
* sales.delivery.view_own

### Finance

* finance.invoice.view_own
* finance.payment_status.view_own
* finance.outstanding.view_own

### Attachments

* attachments.download_own
* attachments.view_own

### Profile

* profile.view_self
* profile.update_self
* auth.password.change_self
* notification.preferences.manage_self

### Reporting

* reporting.dashboard.view_self

## 7. Business rules

* Customer chỉ truy cập dữ liệu thuộc organization của mình.
* Customer không được bypass ownership validation.
* Download sensitive documents phải authorize.
* Session security stricter cho external access.
* Customer export data phải limited.
* Customer actions phải audit.

## 8. Customer workflows

### 8.1 View Catalog

Xem và tìm kiếm sản phẩm.

### 8.2 Request Quotation

Yêu cầu quotation.

### 8.3 View Quotation

Xem quotation của mình.

### 8.4 View Order Status

Theo dõi trạng thái order.

### 8.5 Track Delivery

Theo dõi giao hàng.

### 8.6 View Invoice Status

Xem invoice/payment status.

### 8.7 Download Documents

Tải quotation/invoice PDF.

### 8.8 Update Company Profile

Cập nhật profile doanh nghiệp.

## 9. Ownership & multi-tenant strategy

### Ownership rules

Customer chỉ thấy:

* quotations của organization mình
* orders của organization mình
* invoices của organization mình
* attachments của organization mình

### Enforcement

* query filtering
* use-case validation
* API authorization checks

## 10. Catalog visibility strategy

### Allowed visibility

* public product metadata
* pricing nếu policy cho phép
* availability summary

### Restricted visibility

* internal cost data
* warehouse internal details
* inventory reconciliation data

## 11. Order & delivery visibility strategy

### Allowed visibility

* order status
* delivery progress
* estimated delivery date
* delivered quantities

### Restricted

* internal operational comments
* warehouse internals
* other customer orders

## 12. Finance visibility strategy

### Allowed visibility

* invoice status
* outstanding balance
* payment history
* due dates

### Restricted

* company-wide financial analytics
* ledger internals
* payment reversal operations

## 13. Attachment access strategy

### Allowed files

* quotation PDF
* invoice PDF
* contracts
* delivery documents

### Security rules

* signed URL expiration
* ownership validation
* audit downloads

## 14. Security requirements

### Authentication

* secure password policy
* optional MFA
* suspicious login detection

### Authorization

* strict ownership validation
* tenant isolation
* secure document access

### Session security

* session expiration
* replay protection
* suspicious IP/device monitoring

## 15. UI/UX responsibilities

### Customer portal dashboard

* quotation status
* order status
* overdue invoices
* delivery tracking
* recent notifications

### Customer screens

* catalog browsing
* quotation requests
* order tracking
* invoice tracking
* profile management

## 16. API access expectations

### Protected endpoints

* /customer/orders
* /customer/quotations
* /customer/invoices
* /customer/profile

### Enforcement

* JWT authentication
* ownership-based RBAC
* tenant isolation checks

## 17. Audit requirements

### Audit events gợi ý

* CUSTOMER_LOGIN
* QUOTATION_REQUESTED
* DOCUMENT_DOWNLOADED
* PROFILE_UPDATED
* PASSWORD_CHANGED

### Required fields

* customerUserId
* organizationId
* targetEntity
* IP address
* timestamp

## 18. Reporting access

### Accessible reports

* own order summary
* own outstanding balance
* own payment history
* own delivery performance

### Restrictions

* không xem analytics global.
* không xem dữ liệu customer khác.

## 19. Session & security strategy

### Monitoring

* suspicious login attempts
* excessive downloads
* abnormal API usage

### Controls

* rate limiting
* session timeout
* download throttling
* tenant isolation enforcement

## 20. Integration with modules

### Catalog Module

* product browsing/search

### Sales Module

* quotation/order visibility

### Finance Module

* invoice/payment visibility

### File Attachments Module

* document downloads

### Notification Module

* order/payment notifications

## 21. Acceptance criteria

### Customer Access

* Customer chỉ xem đúng dữ liệu của mình.
* Ownership validation hoạt động.
* Tenant isolation enforced.

### Documents

* Download invoice/quotation thành công.
* Signed URL security hoạt động.

### Portal Features

* Customer theo dõi order/delivery đúng.
* Payment status hiển thị đúng.

### Security

* Unauthorized access bị chặn.
* Audit logs ghi đầy đủ.

## 22. Test strategy

### Unit tests

* ownership validation
* tenant isolation checks
* quotation request flow
* document access control

### Integration tests

* customer portal flows
* finance visibility integration
* attachment access integration
* notification integration

### Security tests

* horizontal privilege escalation attempt
* tenant isolation bypass attempt
* unauthorized document download
* session hijacking simulation

## 23. Explicit anti-patterns

* Không expose dữ liệu customer khác.
* Không bỏ ownership validation.
* Không expose internal inventory/finance details.
* Không cho unrestricted exports.
* Không expose raw attachment paths.

## 24. Deliverables cho Customer Role

* Ownership-based RBAC matrix
* Customer portal workflows
* Tenant isolation rules
* Document access rules
* Security policies
* Reporting access rules
* Audit requirements
* Test scenarios

## 25. Ghi chú triển khai

Customer role cần enforce tenant isolation và ownership validation ở mọi layer: query layer, use-case layer và API authorization layer. Các tài liệu nhạy cảm phải dùng signed URLs và audit downloads đầy đủ.
