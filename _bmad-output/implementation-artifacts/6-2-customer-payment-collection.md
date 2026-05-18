# Story 6.2: Customer Payment Collection — Thu tiền khách hàng

Status: done

## Story

As an Accountant,
I want to record customer payments and allocate them to outstanding invoices using FIFO logic,
So that AR balances stay accurate and cash collection is tracked.

## Acceptance Criteria

1. Record payment: POST /api/v1/finance/payments
2. View payments: GET /api/v1/finance/payments, GET /api/v1/finance/payments/:id
3. Allocate payment to invoices: POST /api/v1/finance/payments/:id/allocate
4. Payment reduces `outstandingAmount` on invoice; AR ledger records credit entry

## Dev Agent Record

### Completion Notes

Implemented as part of `feat(finance): Finance Module + Accountant RBAC + bug fixes` (commit 92fd40f).

**Architecture:** `createPayment` records a payment receipt and AR ledger credit entry in a single `$transaction`. `allocatePayment` maps payment to specific invoices via `PaymentAllocation` table and updates `invoice.outstandingAmount`.

**Files:**
- `backend/src/finance/finance.service.ts` — `listPayments`, `getPayment`, `createPayment`, `allocatePayment`
- `backend/src/finance/finance.controller.ts`
- Frontend: finance/payments page with allocation dialog

### Change Log
- 2026-05-14 (approx): Implemented via finance module commit
