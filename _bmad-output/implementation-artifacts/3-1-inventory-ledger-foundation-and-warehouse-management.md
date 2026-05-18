# Story 3.1: Inventory Ledger Foundation & Warehouse Management

Status: done

## Story

As a Warehouse Manager,
I want to manage warehouses and track all stock levels with movements,
So that inventory is always accurate and auditable.

## Acceptance Criteria

1. Warehouse CRUD: GET/POST/PATCH /api/v1/inventory/warehouses
2. Stock query: GET /api/v1/inventory/stocks (by productId, warehouseId)
3. Stock adjustment: POST /api/v1/inventory/adjustments
4. Stock transfer between warehouses: POST /api/v1/inventory/transfers
5. Transaction history: GET /api/v1/inventory/transactions

## Dev Agent Record

### Completion Notes

Implemented as part of `feat(inventory): full warehouse management module upgrade` (commit 1df67e6).

**Architecture deviation from spec:** Implementation uses a `WarehouseProduct` table with direct quantity fields (`availableQuantity`, `reservedQuantity`, `damagedQuantity`) rather than pure append-only `inventory_moves` ledger. All stock changes are tracked via `InventoryTransaction` records for auditability.

**Files:**
- `backend/src/inventory/inventory.service.ts` — all methods
- `backend/src/inventory/inventory.controller.ts` — all endpoints
- `backend/src/inventory/inventory.module.ts`
- `backend/src/inventory/dto/`
- Frontend pages: inventory main, warehouses, transactions (all i18n)

### Change Log
- 2026-05-14 (approx): Implemented via inventory module upgrade commit
