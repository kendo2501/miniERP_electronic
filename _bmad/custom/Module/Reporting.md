# Reporting Module — BMAD Spec

## 1. Mục tiêu module

Reporting Module chịu trách nhiệm tổng hợp, phân tích và cung cấp báo cáo nghiệp vụ cho hệ thống Mini-ERP B2B.

Module này tập trung vào:

* business reporting
* KPI dashboards
* analytics queries
* aggregated read models
* export reports
* scheduled reports
* reporting performance optimization

Reporting Module là read-heavy module và không nên trực tiếp xử lý business transactions.

## 2. Phạm vi nghiệp vụ

### In-scope

* Sales reports.
* Inventory reports.
* Finance reports.
* Dashboard KPIs.
* Aggregated analytics.
* Export Excel/PDF/CSV.
* Scheduled reports.
* Read models.
* CQRS reporting views.
* Historical trends.
* Filtering/grouping.
* Reporting cache.

### Out-of-scope

* OLTP business transaction.
* Real-time BI platform phức tạp.
* ML forecasting.
* External data warehouse.

## 3. Bối cảnh dự án

Hệ thống Mini-ERP B2B cần nhiều loại báo cáo:

* doanh số
* công nợ
* tồn kho
* aging report
* top customers
* low stock alerts
* order conversion
* payment collection

Các query báo cáo thường nặng và không được làm nghẽn transactional database.

## 4. Mục tiêu thiết kế của Reporting

* Tách reporting khỏi OLTP workload.
* Hỗ trợ aggregated read models.
* Query nhanh cho dashboard.
* Hỗ trợ export lớn.
* Cache hiệu quả.
* Hỗ trợ scheduled reporting.
* Dễ mở rộng analytics.

## 5. Định nghĩa domain

### 5.1 Report

Report là aggregate root chính.

#### Thuộc tính cốt lõi

* id
* reportType
* title
* filters
* generatedBy
* generatedAt
* format
* status
* filePath
* metadata

#### Trạng thái gợi ý

* PENDING
* GENERATING
* COMPLETED
* FAILED
* EXPIRED

### 5.2 DashboardWidget

Widget dashboard hiển thị KPI.

#### Ví dụ

* monthly revenue
* low stock items
* overdue invoices
* top customers

### 5.3 ScheduledReport

ScheduledReport dùng để chạy report định kỳ.

#### Thuộc tính cốt lõi

* id
* reportType
* cronExpression
* recipients
* format
* active
* createdAt

### 5.4 ReportingReadModel

Read model tổng hợp dữ liệu phục vụ analytics.

## 6. Business rules

* Reporting query không được làm nghẽn OLTP.
* Report export lớn phải async.
* Dashboard KPI phải phản hồi nhanh.
* Scheduled report phải retry nếu fail.
* Data aggregation phải consistent theo policy.
* User chỉ xem report được phân quyền.
* Report cache phải invalidate đúng.

## 7. Report categories

### Sales reports

* doanh số theo tháng
* top sales
* quotation conversion
* order status summary

### Inventory reports

* stock summary
* low stock
* stock movement trends
* warehouse utilization

### Finance reports

* aging report
* outstanding balances
* payment collection
* revenue reports

### System reports

* active users
* login activity
* audit activity

## 8. Use cases

### 8.1 Generate Report

Sinh report.

### 8.2 Export Report

Export report.

### 8.3 Get Dashboard KPIs

Lấy KPI dashboard.

### 8.4 Schedule Report

Lên lịch report.

### 8.5 Run Scheduled Report

Chạy scheduled report.

### 8.6 Refresh Reporting Read Models

Refresh aggregated views.

### 8.7 Get Historical Trends

Lấy historical trends.

### 8.8 Download Generated Report

Download exported report.

## 9. API contract đề xuất

### 9.1 POST /reports/generate

Generate report.

**Request**

```json
{
  "reportType": "SALES_MONTHLY",
  "filters": {
    "fromDate": "2026-01-01",
    "toDate": "2026-01-31"
  },
  "format": "XLSX"
}
```

### 9.2 GET /reports/:id

Get report status.

### 9.3 GET /reports/:id/download

Download report.

### 9.4 GET /dashboard/kpis

Dashboard KPIs.

### 9.5 POST /reports/schedule

Schedule report.

## 10. Input validation

* reportType required.
* filters hợp lệ.
* date range hợp lệ.
* export format supported.
* cron expression hợp lệ.
* recipients valid.

Validation phải thực hiện ở inbound adapter trước khi vào use case.

## 11. Domain model suggestion

### Entities / Value Objects

* Report
* ScheduledReport
* DashboardWidget
* ReportingReadModel
* ReportFilter
* ReportFormat
* ReportStatus

### Domain invariants

* Report type hợp lệ.
* Export format supported.
* Filters sanitized.
* Scheduled cron hợp lệ.

## 12. Ports

### Inbound ports

* GenerateReportUseCase
* ExportReportUseCase
* GetDashboardKpisUseCase
* ScheduleReportUseCase
* RefreshReadModelsUseCase

### Outbound ports

* ReportingRepository
* ReadModelRepository
* ExportPort
* QueuePort
* CachePort
* EventBusPort
* StoragePort

## 13. Adapters

### Inbound adapters

* HTTP Controller
* Scheduler adapter
* Dashboard adapter

### Outbound adapters

* PostgreSQL read model adapter
* Redis cache adapter
* Export adapter
* Queue adapter
* File storage adapter
* Event consumer adapter

## 14. CQRS & read model strategy

### Mục tiêu

* Tách reporting khỏi transactional queries.
* Query optimized.
* Aggregated data.

### Sources

* Sales events
* Inventory events
* Finance events
* Audit events

### Refresh strategy

* event-driven updates
* scheduled rebuild
* incremental aggregation

## 15. Dashboard strategy

### KPI examples

* daily revenue
* outstanding debt
* stock alerts
* pending deliveries
* active users

### Requirements

* fast response.
* cache heavily.
* aggregated queries.

## 16. Export strategy

### Supported formats

* XLSX
* CSV
* PDF

### Rules

* export lớn chạy async.
* download URL có expiration.
* generated file cleanup policy.

## 17. Scheduled reporting strategy

### Use cases

* monthly sales report
* weekly stock report
* overdue invoice report

### Retry strategy

* retry failed jobs.
* notification on failure.

## 18. Reporting cache strategy

### Cache candidates

* dashboard KPIs
* common reports
* aggregated summaries

### Cache invalidation

* read model refresh
* scheduled rebuild
* major business events

### Cache key gợi ý

* reporting:kpi:{dashboard}
* reporting:report:{hashOfFilters}
* reporting:summary:{type}

## 19. Historical analytics strategy

### Trends gợi ý

* revenue trends
* stock trends
* payment trends
* order conversion trends

### Goals

* compare periods.
* growth analysis.
* operational insights.

## 20. Security & access control strategy

### Rules

* User chỉ xem report được phân quyền.
* Sensitive finance reports restricted.
* Export action phải audit.
* Shared report URLs có expiration.

## 21. Reporting performance strategy

### Optimization goals

* tránh full-table scan lớn.
* dùng materialized views/read models.
* cache dashboard.
* async export.

### Scalability

* partition reporting tables nếu cần.
* archive historical data.

## 22. Audit strategy

### Audit events gợi ý

* report generated
* report exported
* dashboard viewed
* scheduled report executed

### Audit fields

* actorId
* reportType
* filters
* exportFormat
* timestamp

## 23. Non-functional requirements

* Dashboard phản hồi nhanh.
* Reporting không block OLTP.
* Export ổn định.
* Scale reporting workload.
* Cache hiệu quả.
* Hỗ trợ historical analytics.

## 24. Security requirements

* Report access control.
* Sensitive data masking nếu cần.
* Signed download URLs.
* Audit report exports.
* Query filters sanitize.

## 25. Acceptance criteria

### Generate Report

* Report generate đúng.
* Async flow hoạt động.
* Export file accessible.

### Dashboard KPIs

* KPI chính xác.
* Response nhanh.
* Cache hoạt động.

### Scheduled Reports

* Cron execution đúng.
* Retry hoạt động.
* Notification gửi đúng.

### Security

* Unauthorized report access bị chặn.
* Sensitive reports protected.

## 26. Test strategy

### Unit tests

* report aggregation logic
* dashboard KPI calculation
* export formatting
* cache invalidation
* scheduled report logic

### Integration tests

* read model refresh flow
* export integration
* scheduler integration
* queue processing flow

### Performance tests

* large report generation
* dashboard response time
* concurrent report requests
* export scalability

### Security tests

* unauthorized report access
* export URL abuse
* filter injection attempt
* sensitive data leakage

## 27. Suggested folder structure

```text
modules/
  reporting/
    domain/
      entities/
      value-objects/
      services/
      events/
      ports/
    application/
      use-cases/
      dtos/
      aggregators/
    infrastructure/
      persistence/
      cache/
      export/
      queue/
      scheduler/
    presentation/
      http/
      dashboard/
      controllers/
    tests/
```

## 28. BMAD prompt guidance

Khi dùng BMAD cho module này, prompt nên nêu rõ:

* vai trò AI
* mục tiêu nghiệp vụ: analytics & reporting
* bounded context: Reporting
* constraints kiến trúc: CQRS, read-heavy, async export
* edge cases: huge exports, stale cache, read model lag, unauthorized access
* output mong muốn: reporting flow, aggregation strategy, dashboard strategy, export flow, test cases

## 29. Dependencies with other modules

### Sales

* sales analytics

### Inventory

* stock analytics

### Finance

* finance analytics

### Audit

* audit reporting

### Notification

* scheduled report delivery

## 30. Explicit anti-patterns

* Không query OLTP tables trực tiếp cho heavy analytics.
* Không generate huge reports sync.
* Không bỏ cache dashboard.
* Không expose unrestricted exports.
* Không để stale read models quá lâu.

## 31. Deliverables cho Reporting Module

* Domain model
* Application use cases
* HTTP API contract
* CQRS/read model strategy
* Dashboard strategy
* Export strategy
* Scheduled reporting strategy
* Reporting cache strategy
* Repository interface
* Infrastructure adapters
* Unit tests
* Integration tests
* Performance tests
* Security tests

## 32. Ghi chú triển khai

Phần database của Reporting Module nên được tách thành file riêng sau khi chốt read model architecture, aggregation strategy và export requirements. File này chỉ mô tả yêu cầu nghiệp vụ, kiến trúc và behavior để dùng làm đầu vào cho BMAD.
