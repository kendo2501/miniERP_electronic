# Manager Role — BMAD Spec

## 1. Mục tiêu role

Manager là role quản lý nghiệp vụ trong hệ thống Mini-ERP B2B. Role này chịu trách nhiệm:

* quản lý team vận hành
* giám sát hoạt động Sales/Inventory/Finance theo phạm vi
* approve workflow quan trọng
* theo dõi KPI và reporting
* xử lý exception business cases

Manager đóng vai trò bridge giữa operational staff và Admin.

## 2. Trách nhiệm chính

### Team management

* quản lý sales team
* theo dõi performance
* review pending approvals
* hỗ trợ xử lý escalation

### Operational oversight

* theo dõi order flow
* theo dõi inventory status
* monitor overdue invoices
* monitor delivery progress

### Approval workflows

* approve quotation
* approve pricing override
* approve credit limit exception
* approve stock adjustment
* approve cancellation requests

### Reporting & analytics

* xem KPI dashboard
* export team reports
* monitor operational metrics

## 3. Phạm vi quyền hạn

### In-scope permissions

* quản lý dữ liệu theo business scope
* approve/reject workflows
* view analytics/reporting
* manage subordinate team
* monitor operations
* limited configuration access

### Restricted actions

Manager thường không được:

* quản trị toàn hệ thống
* sửa RBAC global
* truy cập toàn bộ audit logs
* thay đổi security settings
* manipulate immutable finance ledger trực tiếp

## 4. Domain responsibilities

Manager có thể thao tác trên:

* Sales
* Inventory
* Finance (giới hạn)
* Reporting
* Notification

Manager có thể có scope theo:

* organization
* branch
* warehouse
* sales region

## 5. RBAC model

### Role name

```text
MANAGER
```

### Recommended permission strategy

Permission theo business scope.

Ví dụ:

* sales.order.approve
* inventory.adjust.approve
* finance.credit_override.approve
* reporting.team.view

## 6. Core permissions

### Sales

* sales.order.view_team
* sales.order.approve
* sales.order.cancel_approve
* sales.pricing.override_approve
* sales.quotation.approve
* sales.delivery.view

### Inventory

* inventory.stock.view
* inventory.adjust.approve
* inventory.transfer.approve
* inventory.low_stock.view

### Finance

* finance.invoice.view
* finance.payment.view
* finance.credit_limit.override_approve
* finance.aging_report.view

### Reporting

* reporting.dashboard.view_team
* reporting.export_team
* reporting.kpi.view

### Notification

* notification.view_team

### Team management

* users.team.view
* users.team.performance.view

## 7. Business rules

* Manager chỉ xem dữ liệu trong scope được phân quyền.
* Approval actions phải audit.
* Pricing override vượt threshold có thể cần Admin.
* Credit limit override phải theo policy.
* Manager không được bypass immutable financial rules.
* Manager không được thay đổi security configuration.

## 8. Approval workflows

### 8.1 Approve Quotation

Approve quotation vượt threshold.

### 8.2 Approve Pricing Override

Approve discount hoặc override pricing.

### 8.3 Approve Stock Adjustment

Approve inventory adjustment bất thường.

### 8.4 Approve Order Cancellation

Approve cancel order sau confirm.

### 8.5 Approve Credit Exception

Approve customer vượt credit limit.

## 9. Reporting responsibilities

### KPI monitoring

* team sales performance
* conversion rates
* pending orders
* overdue invoices
* low stock items

### Operational monitoring

* delivery delays
* stock anomalies
* failed payments
* pending approvals

## 10. Security requirements

### Access control

* scoped permissions
* branch/warehouse restrictions
* least privilege

### Audit

Manager actions phải audit:

* approvals
* overrides
* exports
* escalations

### Sensitive operations

Một số action có thể yêu cầu:

* MFA
* secondary approval
* reason/justification

## 11. UI/UX responsibilities

### Manager dashboard

* pending approvals
* sales KPIs
* stock alerts
* overdue invoices
* delivery status
* team performance

### Management screens

* quotation approvals
* order oversight
* stock adjustments
* analytics dashboards

## 12. API access expectations

### Protected endpoints

Manager-only hoặc scoped endpoints:

* /manager/orders/pending
* /manager/approvals
* /manager/reports
* /manager/team-performance

### Enforcement

* JWT authentication
* scoped RBAC
* optional MFA

## 13. Audit requirements

### Audit events gợi ý

* QUOTATION_APPROVED
* PRICING_OVERRIDE_APPROVED
* CREDIT_LIMIT_EXCEPTION_APPROVED
* STOCK_ADJUSTMENT_APPROVED
* REPORT_EXPORTED

### Required fields

* managerId
* targetEntity
* reason
* timestamp
* scope info

## 14. Reporting access

### Accessible reports

* team revenue
* order pipeline
* inventory alerts
* customer outstanding
* sales conversion

### Restrictions

* không full system analytics như Admin.
* finance-sensitive data có thể mask.

## 15. Session & security strategy

### Monitoring

* suspicious approvals
* unusual export volume
* abnormal login patterns

### Controls

* scoped session restrictions
* approval threshold enforcement
* export tracking

## 16. Integration with modules

### Sales Module

* approve quotations/orders
* monitor sales KPIs

### Inventory Module

* approve adjustments/transfers
* monitor stock

### Finance Module

* approve credit exceptions
* review aging reports

### Reporting Module

* access analytics dashboards

### Notification Module

* receive operational alerts

## 17. Acceptance criteria

### Approval Workflows

* Approval hoạt động đúng.
* Audit log được ghi.
* Threshold policy enforced.

### Reporting

* Manager xem đúng scope dữ liệu.
* Export hoạt động.

### Security

* Unauthorized access bị chặn.
* Scoped RBAC enforced.
* MFA hoạt động nếu policy bật.

## 18. Test strategy

### Unit tests

* scoped permission enforcement
* approval workflow logic
* threshold validation
* team data filtering

### Integration tests

* approval flow integration
* reporting access integration
* audit logging integration
* notification integration

### Security tests

* privilege escalation attempt
* scope bypass attempt
* unauthorized export attempt
* approval abuse simulation

## 19. Explicit anti-patterns

* Không cho Manager unrestricted system access.
* Không bypass approval policies.
* Không cho access toàn bộ audit logs.
* Không hardcode branch/organization scope.
* Không bỏ audit approval actions.

## 20. Deliverables cho Manager Role

* Scoped RBAC matrix
* Approval workflow definitions
* KPI/dashboard requirements
* Reporting access rules
* Security policies
* Audit requirements
* Test scenarios

## 21. Ghi chú triển khai

Manager role nên dùng scoped RBAC thay vì global permissions. Approval workflow cần configurable theo threshold và organization policy. Các hành động override hoặc approval phải được audit đầy đủ.
