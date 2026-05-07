# Notification Module — BMAD Spec

## 1. Mục tiêu module

Notification Module chịu trách nhiệm gửi và quản lý thông báo trong hệ thống Mini-ERP B2B. Module này hỗ trợ gửi email, in-app notification và các cảnh báo nghiệp vụ quan trọng phát sinh từ các bounded context khác.

Notification Module hoạt động theo hướng event-driven và không chứa business workflow cốt lõi của Sales, Inventory hay Finance.

## 2. Phạm vi nghiệp vụ

### In-scope

* Gửi email thông báo.
* In-app notifications.
* Template notification.
* Notification queue/retry.
* Delivery status tracking.
* Notification preferences.
* Event-driven notifications.
* Security notifications.
* Overdue/payment reminder.
* System alerts.
* Multi-channel notification abstraction.

### Out-of-scope

* Business logic của Sales/Inventory/Finance.
* Direct marketing campaign phức tạp.
* Real-time chat system.
* External CRM automation.

## 3. Bối cảnh dự án

Hệ thống Mini-ERP B2B có nhiều workflow cần gửi thông báo:

* xác minh email
* reset password
* order confirmed
* stock low warning
* overdue invoice
* payment confirmation
* delivery updates
* security alerts

Notification Module đóng vai trò infrastructure/service module dùng chung cho toàn hệ thống.

## 4. Mục tiêu thiết kế của Notification

* Tách biệt notification khỏi business logic.
* Hỗ trợ async processing.
* Retry an toàn khi external provider lỗi.
* Theo dõi trạng thái gửi.
* Dễ mở rộng nhiều channel.
* Hỗ trợ template hóa.

## 5. Định nghĩa domain

### 5.1 Notification

Notification là aggregate root chính.

#### Thuộc tính cốt lõi

* id
* recipientId
* channel
* notificationType
* subject
* content
* status
* priority
* metadata
* scheduledAt
* sentAt
* readAt
* createdAt

#### Trạng thái gợi ý

* PENDING
* QUEUED
* SENT
* DELIVERED
* READ
* FAILED
* CANCELLED

### 5.2 NotificationTemplate

Template dùng để render nội dung notification.

#### Thuộc tính cốt lõi

* id
* code
* channel
* subjectTemplate
* bodyTemplate
* variables
* active
* createdAt

### 5.3 NotificationPreference

Preference cho phép user cấu hình nhận notification.

#### Thuộc tính cốt lõi

* id
* userId
* notificationType
* channel
* enabled
* createdAt

### 5.4 DeliveryAttempt

Lưu lịch sử retry gửi notification.

#### Thuộc tính cốt lõi

* id
* notificationId
* provider
* status
* errorMessage
* attemptedAt

## 6. Business rules

* Notification phải track được trạng thái.
* Failed delivery phải retry theo policy.
* Template phải tồn tại trước khi gửi.
* User preference phải được tôn trọng.
* Security notification có thể bypass opt-out nếu policy yêu cầu.
* Không block business transaction khi gửi notification thất bại.
* Notification history phải audit được.

## 7. Notification channels

### Supported channels gợi ý

* EMAIL
* IN_APP
* SMS (optional)
* PUSH (optional)
* WEBHOOK (future)

### Channel priority

* Security alert: email + in-app
* Payment reminder: email
* Dashboard updates: in-app

## 8. Use cases

### 8.1 Send Email Notification

Gửi email notification.

### 8.2 Create In-App Notification

Tạo notification hiển thị trong hệ thống.

### 8.3 Retry Failed Notification

Retry notification failed.

### 8.4 Mark Notification As Read

Đánh dấu notification đã đọc.

### 8.5 Register Notification Template

Tạo/cập nhật template.

### 8.6 Render Notification Template

Render nội dung template với variables.

### 8.7 Get User Notifications

Lấy danh sách notification của user.

### 8.8 Schedule Notification

Lên lịch notification.

## 9. API contract đề xuất

### 9.1 POST /notifications/send

Gửi notification.

**Request**

```json
{
  "recipientId": 1,
  "channel": "EMAIL",
  "notificationType": "ORDER_CONFIRMED",
  "templateCode": "order_confirmed_email",
  "variables": {
    "orderNumber": "SO-0001",
    "customerName": "ABC Construction"
  }
}
```

### 9.2 GET /notifications

Danh sách notification.

### 9.3 PATCH /notifications/:id/read

Mark as read.

### 9.4 POST /notification-templates

Tạo template.

### 9.5 POST /notifications/schedule

Schedule notification.

## 10. Input validation

* recipientId: required.
* channel: valid enum.
* notificationType: required.
* templateCode: required nếu dùng template.
* variables phải đúng schema.
* scheduledAt hợp lệ.

Validation phải thực hiện ở inbound adapter trước khi vào use case.

## 11. Domain model suggestion

### Entities / Value Objects

* Notification
* NotificationTemplate
* NotificationPreference
* DeliveryAttempt
* NotificationStatus
* NotificationChannel
* NotificationPriority
* TemplateVariables

### Domain invariants

* Notification phải có recipient.
* Channel hợp lệ.
* Template active mới được dùng.
* Retry count không vượt policy.

## 12. Ports

### Inbound ports

* SendNotificationUseCase
* RetryNotificationUseCase
* MarkNotificationAsReadUseCase
* RegisterTemplateUseCase
* ScheduleNotificationUseCase
* GetUserNotificationsUseCase

### Outbound ports

* NotificationRepository
* NotificationTemplateRepository
* NotificationPreferenceRepository
* EmailProviderPort
* SmsProviderPort
* PushProviderPort
* QueuePort
* EventBusPort

## 13. Adapters

### Inbound adapters

* HTTP Controller
* Event consumer adapter
* Scheduler adapter

### Outbound adapters

* SMTP adapter
* Email provider adapter
* Redis/RabbitMQ queue adapter
* PostgreSQL repository adapter
* Push provider adapter
* Logging/audit adapter

## 14. Event-driven strategy

Notification Module chủ yếu consume events từ các module khác.

### Ví dụ events

#### Auth Module

* UserRegistered
* PasswordResetRequested
* AccountLocked

#### Sales Module

* OrderConfirmed
* DeliveryCreated
* OrderCancelled

#### Inventory Module

* StockLowWarning

#### Finance Module

* InvoiceOverdue
* PaymentRecorded

## 15. Template strategy

### Mục tiêu

* Không hardcode email body trong business logic.
* Dễ thay đổi nội dung.
* Hỗ trợ localization sau này.

### Template variables gợi ý

* customerName
* orderNumber
* paymentAmount
* invoiceNumber
* resetLink

## 16. Queue & retry strategy

### Yêu cầu

* Gửi async.
* Không block business transaction.
* Retry an toàn.

### Retry policy gợi ý

* exponential backoff
* max retry count
* dead-letter queue nếu fail liên tục

## 17. Delivery tracking strategy

### Tracking fields

* queuedAt
* sentAt
* deliveredAt
* failedAt
* errorMessage

### Mục tiêu

* Audit được trạng thái gửi.
* Theo dõi reliability của provider.

## 18. Notification preference strategy

### User preferences

* bật/tắt từng loại notification
* bật/tắt từng channel

### Exception

* Security alerts có thể bắt buộc.

## 19. Cache strategy

### Cache candidates

* notification template
* user notification preferences

### Cache invalidation

* template update
* preference change

### Cache key gợi ý

* notification:template:{code}
* notification:user-preferences:{userId}

## 20. Reporting considerations

### Báo cáo gợi ý

* delivery success rate
* failed notifications
* retry statistics
* notification volume by type
* unread notifications

## 21. Non-functional requirements

* Notification gửi bất đồng bộ.
* Retry ổn định.
* Không mất notification quan trọng.
* Dễ mở rộng provider.
* Theo dõi delivery đầy đủ.
* Hỗ trợ scale queue workers.

## 22. Security requirements

* Không leak sensitive information.
* Verify recipient ownership.
* Email template sanitize đúng.
* Audit security notifications.
* Protect SMTP/API credentials.

## 23. Acceptance criteria

### Send Notification

* Notification tạo thành công.
* Queue hoạt động.
* Delivery status được cập nhật.

### Retry

* Failed notification retry đúng policy.
* Retry không duplicate ngoài ý muốn.

### Preferences

* User opt-out respected.
* Security alerts vẫn gửi nếu policy yêu cầu.

### In-App Notification

* Notification hiển thị đúng user.
* Mark as read hoạt động.

## 24. Test strategy

### Unit tests

* template rendering correctness
* notification queue flow
* retry logic
* preference filtering
* delivery status update

### Integration tests

* SMTP/provider integration
* queue processing flow
* event consumer flow
* scheduler flow

### Edge cases

* invalid template variables
* provider unavailable
* retry exceeded
* duplicate event delivery
* notification preference disabled

## 25. Suggested folder structure

```text
modules/
  notification/
    domain/
      entities/
      value-objects/
      services/
      events/
      ports/
    application/
      use-cases/
      dtos/
      renderers/
    infrastructure/
      persistence/
      queue/
      mail/
      sms/
      push/
    presentation/
      http/
      validators/
      controllers/
    tests/
```

## 26. BMAD prompt guidance

Khi dùng BMAD cho module này, prompt nên nêu rõ:

* vai trò AI
* mục tiêu nghiệp vụ: notification service
* bounded context: Notification
* constraints kiến trúc: Hexagonal, event-driven
* edge cases: retry failure, duplicate event, provider outage, invalid template
* output mong muốn: use case, queue flow, retry strategy, template rendering, test cases

## 27. Dependencies with other modules

### Auth

* verify/reset/security notifications

### Sales

* order updates

### Inventory

* stock alerts

### Finance

* overdue/payment reminders

## 28. Explicit anti-patterns

* Không gửi notification sync trong critical business transaction.
* Không hardcode email body trong use case.
* Không bỏ retry strategy.
* Không để duplicate notification uncontrolled.
* Không expose SMTP credentials.

## 29. Deliverables cho Notification Module

* Domain model
* Application use cases
* HTTP API contract
* Template strategy
* Queue & retry strategy
* Delivery tracking strategy
* Repository interface
* Infrastructure adapters
* Unit tests
* Integration tests
* Event contracts
* Reporting requirements

## 30. Ghi chú triển khai

Phần database của Notification Module nên được tách thành file riêng sau khi chốt template model, queue strategy và delivery tracking requirements. File này chỉ mô tả yêu cầu nghiệp vụ, kiến trúc và behavior để dùng làm đầu vào cho BMAD.
