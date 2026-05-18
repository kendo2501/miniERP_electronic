# Story 7.3: Customer Order Tracking — Theo dõi đơn hàng khách hàng

Status: done

## Story

As a Customer (portal user),
I want to view my own quotations and orders with full status tracking,
So that I can monitor my purchases without contacting sales staff.

## Acceptance Criteria

1. Customer can list own quotations: GET /api/v1/sales/quotations (scoped to own via linkedCustomerId)
2. Customer can list own orders: GET /api/v1/sales/orders (scoped to own)
3. Customer can view detail of own quotation/order
4. Customer cannot see other customers' data (403/404)
5. Delivery status (IN_TRANSIT / DELIVERED) visible on order

## Dev Agent Record

### Completion Notes

Implemented across sales module commits:
- `a59ee3c feat(sales): delivery status tracking + customer order/quotation visibility fixes`
- `e0ac54c feat(sales): customer quotation portal with counter-offer support`

**Architecture:** `linkedCustomerId` on User record is the authoritative indicator that a user is a customer portal user. All list/get endpoints filter by `linkedCustomerId` automatically via `resolveOrderScope()`.

**Files:**
- `backend/src/sales/sales.service.ts` — `resolveOrderScope`, `resolveQuotationScope` (permission-aware filtering)
- Frontend: `my-orders/page.tsx`, `my-quotations/page.tsx`

### Change Log
- 2026-05-12 (approx): Implemented via sales module commits
