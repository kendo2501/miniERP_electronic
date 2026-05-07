# Audit Logs Module — BMAD Spec

## 1. Mục tiêu module

Audit Logs Module chịu trách nhiệm ghi nhận, lưu trữ và truy vết toàn bộ hoạt động quan trọng trong hệ thống Mini-ERP B2B. Module này đảm bảo khả năng audit, forensic investigation, compliance và truy vết thay đổi dữ liệu nghiệp vụ.

Audit Logs là foundational cross-cutting module phục vụ cho tất cả bounded context khác.

## 2. Phạm vi nghiệp vụ

### In-scope

* Ghi audit logs cho business events.
* Ghi security audit events.
* Track user actions.
* Track entity changes.
* Immutable audit trail.
* Log search/filter.
* Correlation tracing.
* Compliance logging.
* API access logging.
* Authentication/authorization logging.
* Data change tracking.
* Export audit reports.

### Out-of-scope

* Real-time analytics phức tạp.
* Infrastructure/server monitoring.
* Full observability platform.
* Distributed tracing enterprise-level.

## 3. Bối cảnh dự án

Hệ thống Mini-ERP B2B xử lý:

* tài chính
* tồn kho
* đơn hàng
* authentication
* phân quyền

Do đó mọi thay đổi quan trọng phải audit được.

Audit Logs hỗ trợ:

* điều tra sự cố
* truy vết user actions
* kiểm toán nội bộ
* compliance
* forensic analysis

## 4. Mục tiêu thiết kế của Audit Logs

* Immutable audit trail.
* Truy vết đầy đủ.
* Không ảnh hưởng business transaction.
* Dễ tìm kiếm.
* Hỗ trợ correlation giữa modules.
* Dễ export/report.
* Hỗ trợ scale lớn.

## 5. Định nghĩa domain

### 5.1 AuditLog

AuditLog là aggregate root chính.

#### Thuộc tính cốt lõi

* id
* eventType
* category
* actorId
* actorType
* entityType
* entityId
* action
* status
* correlationId
* requestId
* ipAddress
* userAgent
* metadata
* beforeSnapshot
* afterSnapshot
* createdAt

### 5.2 AuditCategory

#### Nhóm gợi ý

* AUTHENTICATION
* AUTHORIZATION
* SALES
* INVENTORY
* FINANCE
* SYSTEM
* SECURITY
* CONFIGURATION

### 5.3 AuditEvent

#### Ví dụ events

* USER_LOGIN
* USER_LOGOUT
* PASSWORD_CHANGED
* ORDER_CREATED
* ORDER_CONFIRMED
* STOCK_DEDUCTED
* PAYMENT_RECORDED
* ROLE_ASSIGNED
* ACCOUNT_LOCKED

## 6. Business rules

* Audit logs phải immutable.
* Không update/delete logs tùy tiện.
* Security events phải luôn được log.
* Financial actions phải có audit đầy đủ.
* CorrelationId phải theo xuyên suốt request chain nếu có.
* Sensitive data phải mask/redact.
* Logging failure không được làm crash business flow.

## 7. Audit event categories

### Authentication

* login success/failure
* password reset
* MFA events
* token revoke

### Authorization

* role assignment
* permission denied
* privilege escalation attempts

### Sales

* order create/update/cancel
* quotation approval
* delivery updates

### Inventory

* stock deduct
* stock adjustment
* transfer stock

### Finance

* invoice issued
* payment recorded
* payment reversed
* write off

### System

* config changes
* deployment events
* integration failures

## 8. Use cases

### 8.1 Create Audit Log

Ghi audit log.

### 8.2 Search Audit Logs

Tìm kiếm logs.

### 8.3 Get Audit Timeline

Lấy timeline cho entity.

### 8.4 Export Audit Logs

Export logs.

### 8.5 Mask Sensitive Data

Mask dữ liệu nhạy cảm.

### 8.6 Archive Old Logs

Archive logs cũ.

### 8.7 Correlate Request Logs

Liên kết logs theo correlationId.

## 9. API contract đề xuất

### 9.1 POST /audit-logs

Tạo audit log.

**Request**

```json
{
  "eventType": "ORDER_CONFIRMED",
  "category": "SALES",
  "actorId": 10,
  "entityType": "SalesOrder",
  "entityId": 100,
  "action": "CONFIRM_ORDER",
  "correlationId": "corr-12345",
  "metadata": {
    "orderNumber": "SO-0001"
  }
}
```

### 9.2 GET /audit-logs

Search audit logs.

### 9.3 GET /audit-logs/entity/:entityType/:entityId

Timeline entity.

### 9.4 GET /audit-logs/export

Export logs.

## 10. Input validation

* eventType: required.
* category: valid enum.
* action: required.
* entityType/entityId hợp lệ.
* metadata phải sanitize.
* correlationId optional nhưng đúng format nếu có.

Validation phải thực hiện ở inbound adapter trước khi vào use case.

## 11. Domain model suggestion

### Entities / Value Objects

* AuditLog
* AuditCategory
* AuditEventType
* CorrelationId
* RequestId
* AuditMetadata
* SnapshotData

### Domain invariants

* Audit log immutable.
* Timestamp required.
* EventType hợp lệ.
* Metadata sanitized.

## 12. Ports

### Inbound ports

* CreateAuditLogUseCase
* SearchAuditLogsUseCase
* ExportAuditLogsUseCase
* GetAuditTimelineUseCase
* ArchiveAuditLogsUseCase

### Outbound ports

* AuditLogRepository
* AuditArchiveRepository
* EventBusPort
* StoragePort
* ExportPort

## 13. Adapters

### Inbound adapters

* HTTP Controller
* Event consumer adapter
* Middleware/interceptor adapter

### Outbound adapters

* PostgreSQL repository adapter
* File storage adapter
* Queue adapter
* Export adapter
* Logging adapter

## 14. Event-driven strategy

Audit Module chủ yếu consume events từ các module khác.

### Ví dụ events

#### Auth Module

* UserLoggedIn
* AccountLocked

#### Sales Module

* OrderConfirmed
* DeliveryCreated

#### Inventory Module

* StockAdjusted

#### Finance Module

* PaymentRecorded
* InvoiceIssued

## 15. Correlation strategy

### CorrelationId

* Theo dõi toàn bộ flow request.
* Trace multi-module workflow.

### Ví dụ

OrderConfirmed -> StockReserved -> InvoiceCreated -> NotificationSent

Tất cả dùng cùng correlationId.

## 16. Snapshot strategy

### Before snapshot

State trước thay đổi.

### After snapshot

State sau thay đổi.

### Rules

* Snapshot phải mask sensitive data.
* Không lưu secrets/password/token raw.

## 17. Sensitive data masking strategy

### Dữ liệu cần mask

* password
* token
* secret
* credit card info
* personal sensitive info

### Ví dụ

```json
{
  "password": "***MASKED***"
}
```

## 18. Retention & archive strategy

### Retention policy gợi ý

* hot logs: 6-12 tháng
* archive logs: nhiều năm tùy compliance

### Archive goals

* giảm tải database chính
* vẫn searchable khi cần

## 19. Search & reporting strategy

### Filters gợi ý

* actorId
* eventType
* category
* entityType/entityId
* date range
* correlationId
* status

### Reports gợi ý

* failed login attempts
* privilege changes
* stock adjustments
* payment reversals
* suspicious activity

## 20. Cache strategy

### Cache candidates

* recent audit timeline
* frequent search filters

### Cache invalidation

* new audit event
* archive operations

### Cache key gợi ý

* audit:entity:{entityType}:{entityId}
* audit:search:{hashOfQuery}

## 21. Non-functional requirements

* Audit logging không làm chậm business flow đáng kể.
* Immutable storage.
* Query/search hiệu quả.
* Dễ export.
* Hỗ trợ scale lớn.
* Correlation tracing rõ ràng.

## 22. Security requirements

* Audit logs không bị sửa/xóa trái phép.
* Chỉ role phù hợp mới được xem/export logs.
* Sensitive data phải mask.
* Audit chính audit module actions nếu cần.
* Logs phải integrity-protected.

## 23. Acceptance criteria

### Create Audit Log

* Log được ghi đúng.
* Metadata đầy đủ.
* CorrelationId đúng.

### Search Logs

* Filter hoạt động đúng.
* Timeline chính xác.
* Pagination hoạt động.

### Masking

* Sensitive data không lộ.
* Password/token không xuất hiện raw.

### Export

* Export đúng dữ liệu.
* Quyền export được enforce.

## 24. Test strategy

### Unit tests

* audit log creation
* metadata masking
* correlation handling
* timeline generation
* archive flow

### Integration tests

* event consumer flow
* middleware logging flow
* export integration
* archive integration

### Security tests

* unauthorized log access
* sensitive data exposure
* tampering attempts
* privilege escalation attempts

## 25. Suggested folder structure

```text
modules/
  audit/
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
      archive/
      export/
      queue/
    presentation/
      http/
      middleware/
      validators/
      controllers/
    tests/
```

## 26. BMAD prompt guidance

Khi dùng BMAD cho module này, prompt nên nêu rõ:

* vai trò AI
* mục tiêu nghiệp vụ: immutable audit logging
* bounded context: Audit Logs
* constraints kiến trúc: Hexagonal, append-only
* edge cases: sensitive masking, correlation tracing, archive flow, export permissions
* output mong muốn: use case, middleware/interceptor flow, archive strategy, test cases

## 27. Dependencies with other modules

### Auth

* security events

### Sales

* order workflow logs

### Inventory

* stock movement logs

### Finance

* financial audit trail

### Notification

* notification delivery logs

## 28. Explicit anti-patterns

* Không lưu password/token raw.
* Không cho phép update/delete audit logs tùy tiện.
* Không block business transaction nếu audit fail.
* Không hardcode masking rules nhiều nơi.
* Không bỏ correlation tracing.

## 29. Deliverables cho Audit Logs Module

* Domain model
* Application use cases
* HTTP API contract
* Correlation strategy
* Masking strategy
* Archive strategy
* Search/reporting strategy
* Repository interface
* Infrastructure adapters
* Unit tests
* Integration tests
* Security tests
* Event contracts

## 30. Ghi chú triển khai

Phần database của Audit Logs Module nên được tách thành file riêng sau khi chốt retention policy, masking strategy và archive requirements. File này chỉ mô tả yêu cầu nghiệp vụ, kiến trúc và behavior để dùng làm đầu vào
