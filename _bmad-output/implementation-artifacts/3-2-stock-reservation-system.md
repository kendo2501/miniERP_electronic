# Story 3.2: Stock Reservation System — Hệ thống đặt chỗ hàng

Status: done

## Story

As a Warehouse Manager,
I want stock to be reserved when a sales order is confirmed and released when cancelled,
So that available quantity is always accurate.

## Acceptance Criteria

1. `deductForOrder(salesOrderId)` — reserves/deducts stock when order confirmed
2. Replenishment management: GET/POST/PATCH /api/v1/inventory/replenishment
3. Stock check: availableQuantity = totalQty - reservedQuantity per product-warehouse pair
4. Low stock alerts: GET /api/v1/inventory/stocks/low-stock

## Dev Agent Record

### Completion Notes

Implemented as part of `feat(inventory): full warehouse management module upgrade` (commit 1df67e6).

**Architecture note:** Reservation is handled via `deductForOrder()` called when order is confirmed (direct service call pattern, not event-driven). Replenishment system was added to handle shortfall tracking.

**Files:**
- `backend/src/inventory/inventory.service.ts` — `deductForOrder`, `listReplenishment`, `createReplenishment`, `updateReplenishment`, `getLowStockAlerts`
- `backend/src/inventory/inventory.controller.ts` — replenishment + low-stock endpoints

### Change Log
- 2026-05-14 (approx): Implemented via inventory module upgrade commit
