# Finance Module — BMAD Spec

## 1. Mục tiêu module

Finance Module chịu trách nhiệm quản lý công nợ, hóa đơn, thanh toán và ledger tài chính trong hệ thống Mini-ERP B2B phân phối thiết bị điện. Đây là bounded context tập trung vào tính chính xác tài chính, tính bất biến dữ liệu và khả năng audit toàn bộ dòng tiền.

Finance Module không trực tiếp quản lý tồn kho vật lý hoặc workflow bán hàng chi tiết. Các module khác chỉ được tương tác với Finance thông qua use case, contract hoặc event đã định nghĩa.

## 2. Phạm vi nghiệp vụ

### In-scope

* Quản lý công nợ khách hàng B2B.
* Quản lý credit limit.
* Quản lý invoice/hóa đơn.
* Quản lý payment/thanh toán.
* Quản lý accounts receivable ledger.
* Theo dõi aging report/tuổi nợ.
* Theo dõi outstanding balance.
* Hỗ trợ partial payment.
* Đối soát nhiều payment cho nhiều invoice.
* Audit financial transactions.
* Immutable financial ledger.
* Financial reporting.

### Out-of-scope

* Tạo order workflow.
* Tính tồn kho.
* Product master management.
* Payment gateway integration chi tiết mức thấp.

## 3. Bối cảnh dự án

Dự án áp dụng Modular Monolith với bounded context tách biệt. Finance là module yêu cầu độ chính xác và auditability cao nhất trong hệ thống.

Đặc thù B2B ngành thiết bị điện:

* Công nợ gối đầu.
* Thanh toán nhiều đợt.
* Một payment có thể đối soát nhiều invoice.
* Khách hàng có credit limit.
* Dữ liệu tài chính phải immutable.

## 4. Mục tiêu thiết kế của Finance

* Không mất tính toàn vẹn tài chính.
* Không sửa lịch sử tài chính tùy tiện.
* Mọi thay đổi phải audit được.
* Ledger phải append-only.
* Tính toán tiền tệ chính xác bằng decimal/numeric.
* Hỗ trợ reporting lớn mà không nghẽn OLTP.

## 5. Định nghĩa domain

### 5.1 CustomerAccount

CustomerAccount quản lý trạng thái tài chính của khách hàng.

#### Thuộc tính cốt lõi

* id
* customerId
* creditLimit
* currentOutstanding
* availableCredit
* paymentTerms
* status
* createdAt

### 5.2 Invoice

Invoice biểu diễn nghĩa vụ thanh toán phát sinh từ order.

#### Thuộc tính cốt lõi

* id
* invoiceNumber
* customerId
* orderId
* subtotal
* taxAmount
* totalAmount
* outstandingAmount
* dueDate
* issueDate
* status
* createdAt

#### Trạng thái gợi ý

* DRAFT
* ISSUED
* PARTIALLY_PAID
* PAID
* OVERDUE
* CANCELLED

### 5.3 Payment

Payment biểu diễn một giao dịch thanh toán.

#### Thuộc tính cốt lõi

* id
* paymentNumber
* customerId
* paymentMethod
* totalAmount
* paymentDate
* referenceNumber
* notes
* status
* createdAt

#### Trạng thái gợi ý

* PENDING
* CONFIRMED
* FAILED
* REVERSED

### 5.4 PaymentAllocation

PaymentAllocation dùng để phân bổ một payment vào một hoặc nhiều invoice.

#### Thuộc tính cốt lõi

* id
* paymentId
* invoiceId
* allocatedAmount
* createdAt

### 5.5 AccountsReceivableLedger

AccountsReceivableLedger là financial ledger bất biến.

#### Mục tiêu

* Theo dõi mọi biến động công nợ.
* Audit đầy đủ.
* Không update/delete vật lý.

#### Thuộc tính cốt lõi

* id
* customerId
* transactionType
* referenceType
* referenceId
* debitAmount
* creditAmount
* balanceAfter
* notes
* createdAt

#### Loại transaction gợi ý

* INVOICE_ISSUED
* PAYMENT_RECEIVED
* PAYMENT_REVERSED
* CREDIT_ADJUSTMENT
* DEBIT_ADJUSTMENT
* WRITE_OFF

## 6. Business rules

* Không dùng float/double để tính tiền.
* Ledger phải append-only.
* Invoice đã paid không được sửa tùy tiện.
* Một payment có thể allocate cho nhiều invoice.
* Outstanding amount không được âm.
* Credit limit phải được kiểm tra trước confirm order nếu policy yêu cầu.
* Mọi financial transaction phải audit được.
* Reversal phải tạo transaction đảo chiều thay vì sửa record cũ.
* Dữ liệu tài chính phải immutable.

## 7. Use cases

### 7.1 Create Invoice

Tạo invoice từ order confirmed.

**Preconditions**

* Order hợp lệ.
* Customer hợp lệ.

**Postconditions**

* Invoice được tạo.
* AR ledger được ghi.
* Outstanding tăng.

### 7.2 Issue Invoice

Phát hành invoice.

### 7.3 Record Payment

Ghi nhận payment.

**Rules**

* Payment amount > 0.
* Có thể allocate nhiều invoice.
* Ledger phải cập nhật.

### 7.4 Allocate Payment

Phân bổ payment cho invoice.

### 7.5 Reverse Payment

Đảo payment.

**Rules**

* Không sửa record cũ.
* Tạo ledger transaction đảo chiều.

### 7.6 Get Customer Outstanding

Lấy công nợ hiện tại của customer.

### 7.7 Generate Aging Report

Tạo báo cáo tuổi nợ.

### 7.8 Write Off Bad Debt

Ghi nhận xóa nợ xấu.

### 7.9 Get Ledger History

Xem lịch sử ledger.

## 8. API contract đề xuất

### 8.1 POST /finance/invoices

Tạo invoice.

### 8.2 POST /finance/invoices/:id/issue

Issue invoice.

### 8.3 POST /finance/payments

Ghi nhận payment.

**Request**

```json
{
  "customerId": 1,
  "paymentMethod": "bank_transfer",
  "totalAmount": 50000000,
  "paymentDate": "2026-05-01",
  "allocations": [
    {
      "invoiceId": 100,
      "allocatedAmount": 30000000
    },
    {
      "invoiceId": 101,
      "allocatedAmount": 20000000
    }
  ]
}
```

### 8.4 POST /finance/payments/:id/reverse

Đảo payment.

### 8.5 GET /finance/customers/:id/outstanding

Lấy công nợ.

### 8.6 GET /finance/reports/aging

Báo cáo tuổi nợ.

### 8.7 GET /finance/ledger

Tra cứu ledger.

## 9. Input validation

* customerId: required.
* totalAmount: positive decimal.
* allocatedAmount: positive decimal.
* allocations total không vượt payment total.
* invoice phải tồn tại.
* payment reversal phải hợp lệ.
* dueDate phải hợp lệ.

Validation phải thực hiện ở inbound adapter trước khi vào use case.

## 10. Domain model suggestion

### Entities / Value Objects

* CustomerAccount
* Invoice
* Payment
* PaymentAllocation
* AccountsReceivableLedger
* Money
* CreditLimit
* OutstandingBalance
* PaymentStatus
* InvoiceStatus

### Domain invariants

* Outstanding >= 0.
* Allocated total <= payment total.
* Invoice total >= 0.
* Payment total > 0.
* Ledger immutable.

## 11. Ports

### Inbound ports

* CreateInvoiceUseCase
* IssueInvoiceUseCase
* RecordPaymentUseCase
* AllocatePaymentUseCase
* ReversePaymentUseCase
* GetOutstandingUseCase
* GenerateAgingReportUseCase
* GetLedgerHistoryUseCase

### Outbound ports

* InvoiceRepository
* PaymentRepository
* LedgerRepository
* CustomerAccountRepository
* ReportingReadRepository
* EventBusPort
* AuditLogPort

## 12. Adapters

### Inbound adapters

* HTTP Controller
* DTO validation layer
* Event consumer adapter

### Outbound adapters

* PostgreSQL repository adapter
* Reporting adapter
* Redis cache adapter
* Event bus adapter
* Logging/audit adapter

## 13. Module events

Finance Module có thể phát các events sau:

* InvoiceCreated
* InvoiceIssued
* PaymentRecorded
* PaymentAllocated
* PaymentReversed
* CustomerOverCreditLimit
* InvoiceOverdue

### Event consumers

#### Sales Module

* check credit limit warning
* invoice status updates

#### Notification Module

* overdue notification
* payment confirmation

#### Reporting Module

* cập nhật financial analytics

## 14. Ledger strategy

### Nguyên tắc

* Ledger là append-only.
* Không update/delete transaction cũ.
* Correction phải thông qua reversing entries.

### Mục tiêu

* Audit trail đầy đủ.
* Truy vết mọi thay đổi công nợ.
* Hỗ trợ reconciliation.

## 15. Credit limit strategy

### Kiểm tra trước confirm order

* outstanding + order amount <= credit limit.

### Kết quả

* allow
* warning
* reject
* require manager approval

## 16. Aging report strategy

### Nhóm tuổi nợ gợi ý

* Current
* 1-30 days
* 31-60 days
* 61-90 days
* 90+ days

### Yêu cầu

* Không làm nghẽn database OLTP.
* Có thể dùng CQRS/read model.

## 17. Reconciliation strategy

### Yêu cầu

* Payment allocation phải truy vết được.
* Tổng allocated không vượt invoice outstanding.
* Payment reversal phải rollback đúng logic tài chính.

## 18. Cache strategy

### Cache candidates

* customer outstanding summary
* dashboard metrics
* aging report summary

### Cache invalidation

* invoice issued
* payment recorded
* payment reversed
* write off

### Cache key gợi ý

* finance:customer-outstanding:{customerId}
* finance:aging-report:{hashOfQuery}
* finance:invoice:{invoiceId}

## 19. Reporting considerations

### Báo cáo gợi ý

* aging report
* outstanding by customer
* cash collection report
* overdue invoices
* payment history
* monthly revenue
* bad debt report

### Yêu cầu

* Query lớn không được khóa OLTP.
* Có thể dùng read model riêng.
* Hỗ trợ export.

## 20. Non-functional requirements

* Độ chính xác tài chính tuyệt đối.
* Decimal/numeric cho mọi phép tính tiền.
* Audit đầy đủ.
* Ledger immutable.
* Reporting tối ưu.
* Không mất dữ liệu transaction.

## 21. Security requirements

* Chỉ role phù hợp mới được issue invoice/reverse payment/write off.
* Audit mọi financial action.
* Không cho phép sửa ledger trực tiếp.
* Validate toàn bộ input.
* Financial reports phải kiểm soát quyền truy cập.

## 22. Acceptance criteria

### Create Invoice

* Invoice tạo đúng dữ liệu.
* Outstanding tăng đúng.
* Ledger ghi đúng transaction.

### Record Payment

* Payment ghi nhận thành công.
* Allocation chính xác.
* Outstanding giảm đúng.
* Ledger được ghi.

### Reverse Payment

* Không sửa record cũ.
* Ledger reversal đúng.
* Outstanding cập nhật đúng.

### Aging Report

* Phân bucket tuổi nợ đúng.
* Không làm chậm transaction system.

## 23. Test strategy

### Unit tests

* create invoice success
* payment allocation correctness
* reverse payment flow
* outstanding calculation
* aging bucket calculation
* credit limit validation
* write off flow

### Integration tests

* controller -> use case -> repository flow
* ledger append-only flow
* invoice/payment integration
* event dispatch flow

### Edge cases

* partial payment nhiều lần
* over allocation
* reverse payment twice
* overdue invoice
* customer vượt credit limit

## 24. Suggested folder structure

```text
modules/
  finance/
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
* mục tiêu nghiệp vụ: quản lý công nợ và tài chính B2B
* bounded context: Finance
* constraints kiến trúc: Hexagonal, Modular Monolith, immutable ledger
* edge cases: partial payment, reversal, over allocation, overdue invoice, credit limit
* output mong muốn: use case, controller, repository contract, ledger flow, test cases

## 26. Dependencies with other modules

### Sales

* nhận order confirmed để tạo invoice
* check credit limit

### Inventory

* không phụ thuộc trực tiếp

### Notification

* gửi overdue/payment notification

## 27. Explicit anti-patterns

* Không dùng float/double cho tiền.
* Không update/delete trực tiếp financial ledger.
* Không cho phép payment allocation vượt outstanding.
* Không sửa invoice paid tùy tiện.
* Không để reporting query làm nghẽn OLTP.

## 28. Deliverables cho Finance Module

* Domain model
* Application use cases
* HTTP API contract
* Validation rules
* Ledger strategy
* Credit limit strategy
* Repository interface
* Infrastructure adapters
* Unit tests
* Integration tests
* Event contracts
* Reporting requirements

## 29. Ghi chú triển khai

Phần database của Finance Module nên được tách thành file riêng sau khi chốt ledger model, payment allocation strategy và reporting requirements. File này chỉ mô tả yêu cầu nghiệp vụ, kiến trúc và behavior để dùng làm đầu vào cho BMAD.
