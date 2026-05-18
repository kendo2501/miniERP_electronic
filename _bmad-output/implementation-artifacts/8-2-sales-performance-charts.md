# Story 8.2: Sales Performance Charts — Biểu đồ hiệu suất bán hàng

Status: done

## Story

As a Director,
I want to see sales trend charts (6-month revenue) and top products/customers,
So that I can identify growth opportunities and performance issues.

## Acceptance Criteria

1. Sales chart data: GET /api/v1/reporting/sales-chart?days=180
2. Top customers by revenue: GET /api/v1/reporting/top-customers?limit=10
3. Frontend renders Recharts LineChart (revenue trend) + BarChart (top products, top customers)

## Dev Agent Record

### Completion Notes

Implemented as part of reporting module.

**Files:**
- `backend/src/reporting/reporting.service.ts` — `getSalesChart`, `getTopCustomers`
- `backend/src/reporting/reporting.controller.ts`
- Frontend: dashboard charts using Recharts (installed earlier)

### Change Log
- 2026-05-14 (approx): Implemented via reporting module
