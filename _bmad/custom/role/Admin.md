# Admin Role — BMAD Spec

## 1. Mục tiêu role

Admin là role có quyền quản trị cao nhất trong hệ thống Mini-ERP B2B. Role này chịu trách nhiệm:

* quản lý hệ thống
* quản lý user & permissions
* quản lý cấu hình
* giám sát hoạt động hệ thống
* audit & security oversight
* quản trị business master data

Admin không phải superuser unrestricted tuyệt đối ở mọi môi trường production. Một số hành động nhạy cảm vẫn cần audit, approval hoặc dual-control policy.

## 2. Trách nhiệm chính

### System administration

* quản lý users
* quản lý roles & permissions
* quản lý organization settings
* cấu hình feature flags
* cấu hình notification
* session/security management

### Business administration

* quản lý catalog master data
* quản lý warehouse master data
* quản lý pricing policies
* quản lý finance settings
* quản lý numbering rules

### Security & audit

* xem audit logs
* revoke sessions
* lock/unlock accounts
* monitor suspicious activities
* export compliance reports

### Operational oversight

* xem reporting dashboards
* monitor failed jobs
* monitor notifications
* monitor integrations

## 3. Phạm vi quyền hạn

### In-scope permissions

* full CRUD với system configuration
* user/role management
* feature flag management
* audit log access
* reporting access
* inventory adjustment approval
* finance reversal approval
* force session revoke
* export system reports

### Restricted actions

Một số action dù Admin vẫn có thể yêu cầu:

* MFA confirmation
* secondary approval
* immutable audit logging
* dual authorization

## 4. Domain responsibilities

Admin có thể thao tác trên các bounded contexts:

* Auth
* Session
* Settings
* Notification
* Audit Logs
* Catalog
* Inventory
* Sales
* Finance
* Reporting

Nhưng không được bypass business invariants.

## 5. RBAC model

### Role name

```text
ADMIN
```

### Permission model

Admin thường được map tới:

```text
*.*
```

hoặc explicit permission groups.

### Recommended approach

Ưu tiên explicit permissions thay vì wildcard tuyệt đối.

Ví dụ:

* user.create
* user.update
* role.assign
* settings.update
* audit.export
* finance.reverse_payment
* inventory.adjust

## 6. Core permissions

### Authentication & Security

* auth.user.create
* auth.user.update
* auth.user.lock
* auth.user.unlock
* auth.role.assign
* auth.permission.manage
* session.revoke
* session.revoke_all
* audit.security.view

### Catalog

* catalog.product.create
* catalog.product.update
* catalog.product.deactivate
* catalog.category.manage

### Inventory

* inventory.adjust
* inventory.transfer
* inventory.warehouse.manage
* inventory.stock.view

### Sales

* sales.order.view_all
* sales.order.cancel
* sales.order.override
* sales.pricing.manage

### Finance

* finance.invoice.view
* finance.payment.reverse
* finance.credit_limit.override
* finance.report.export

### Reporting

* reporting.dashboard.view_all
* reporting.export
* reporting.schedule.manage

### Settings

* settings.manage
* feature_flags.manage
* organization.settings.manage

### Notification

* notification.template.manage
* notification.retry.manage

## 7. Business rules

* Admin actions phải audit đầy đủ.
* Sensitive actions yêu cầu MFA nếu policy bật.
* Admin không được sửa immutable financial ledger trực tiếp.
* Admin không được bypass security logging.
* Session hijacking detection phải áp dụng cả cho Admin.
* Admin export dữ liệu phải được track.

## 8. Admin workflows

### 8.1 Create User

Admin tạo user mới.

### 8.2 Assign Role

Admin gán role.

### 8.3 Lock User Account

Khóa tài khoản nghi ngờ.

### 8.4 Revoke Active Sessions

Force logout user.

### 8.5 Update System Settings

Cập nhật business/system config.

### 8.6 Review Audit Logs

Xem security/business logs.

### 8.7 Override Credit Limit

Override credit policy.

### 8.8 Reverse Financial Transaction

Thực hiện reversal theo policy.

### 8.9 Export Reports

Export sensitive reports.

## 9. Security requirements

### MFA

Admin nên bắt buộc MFA.

### Session controls

* shorter session timeout
* device monitoring
* suspicious login detection

### Audit

Mọi hành động Admin phải log:

* actorId
* action
* target entity
* timestamp
* IP address
* before/after snapshots nếu cần

### Access restrictions

* principle of least privilege
* production environment restrictions nếu cần

## 10. UI/UX responsibilities

### Admin dashboard

* system health
* active users
* failed logins
* low stock alerts
* overdue invoices
* notification failures

### Admin management screens

* user management
* RBAC management
* settings management
* audit log viewer
* reporting console

## 11. API access expectations

### Protected endpoints

Admin-only endpoints:

* /admin/users
* /admin/roles
* /admin/settings
* /admin/audit
* /admin/reports

### Enforcement

* JWT authentication
* RBAC authorization
* optional MFA enforcement

## 12. Audit requirements

### Audit events gợi ý

* USER_CREATED
* ROLE_ASSIGNED
* SETTINGS_UPDATED
* PAYMENT_REVERSED
* SESSION_REVOKED
* REPORT_EXPORTED

### Export auditing

Export sensitive data phải log đầy đủ.

## 13. Reporting access

### Full visibility

Admin có thể xem:

* sales analytics
* inventory analytics
* finance analytics
* security analytics
* audit analytics

### Restrictions

Có thể cần masking một số sensitive fields tùy compliance.

## 14. Session & security strategy

### Security monitoring

* suspicious IP changes
* concurrent sessions
* brute-force attempts
* privilege escalation attempts

### Emergency actions

* revoke all sessions
* disable user
* disable feature flags
* freeze integrations

## 15. Integration with modules

### Auth Module

* manage users/roles
* revoke sessions

### Inventory Module

* inventory adjustments
* warehouse management

### Sales Module

* pricing overrides
* order oversight

### Finance Module

* credit override
* payment reversal approval

### Audit Module

* forensic investigation

### Settings Module

* runtime config management

## 16. Acceptance criteria

### User Management

* Admin tạo/sửa/lock user thành công.
* Role assignment đúng.

### Security

* MFA enforced nếu policy bật.
* Audit logs ghi đầy đủ.
* Session revoke hoạt động.

### Settings

* Runtime settings update hoạt động.
* Cache invalidation đúng.

### Reporting

* Admin export report thành công.
* Access control enforced.

## 17. Test strategy

### Unit tests

* permission enforcement
* admin workflow validation
* role assignment logic
* session revoke logic

### Integration tests

* RBAC enforcement flow
* audit logging flow
* settings update flow
* reporting export flow

### Security tests

* privilege escalation attempt
* admin session hijack simulation
* unauthorized admin endpoint access
* MFA bypass attempt

## 18. Explicit anti-patterns

* Không dùng hardcoded super-admin bypass.
* Không bypass audit logging.
* Không cho phép direct DB manipulation từ UI.
* Không cấp unrestricted wildcard permissions trong production nếu tránh được.
* Không bỏ MFA cho Admin accounts.

## 19. Deliverables cho Admin Role

* RBAC permission matrix
* Admin workflows
* Security policy
* Audit policy
* Admin dashboard requirements
* API access rules
* Integration responsibilities
* Test scenarios

## 20. Ghi chú triển khai

Admin role nên được quản lý bằng RBAC explicit permissions thay vì hardcoded logic trong application. Các hành động nhạy cảm cần audit đầy đủ và có thể yêu cầu MFA hoặc approval flow tùy policy môi trường production.
