# Story 3.5: Inventory Reports & Alerts — Báo cáo và cảnh báo tồn kho

Status: done

## Story

As a Warehouse Manager,
I want to view inventory reports, low-stock alerts, and replenishment suggestions,
So that I can proactively manage stock levels.

## Acceptance Criteria

1. Low stock alerts: GET /api/v1/inventory/stocks/low-stock (threshold configurable)
2. Transaction history: GET /api/v1/inventory/transactions (filterable by product/warehouse/type)
3. Replenishment suggestions + management: GET/POST/PATCH /api/v1/inventory/replenishment
4. Warehouse dashboard KPIs via reporting module: GET /api/v1/reporting/warehouse-dashboard

## Dev Agent Record

### Completion Notes

Implemented across inventory module and reporting module.

**Files:**
- `backend/src/inventory/inventory.service.ts` — `getLowStockAlerts`, `getTransactions`, replenishment methods
- `backend/src/reporting/reporting.service.ts` — `getWarehouseDashboard`
- Frontend: inventory page with low-stock section, transactions page

### Change Log
- 2026-05-14 (approx): Implemented via inventory upgrade + reporting module
