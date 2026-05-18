# Story 6.1: AR Ledger & Customer Invoice Tracking — Công nợ phải thu

Status: done

## Story

As an Accountant,
I want to create invoices from sales orders and track outstanding receivables via an append-only AR ledger,
So that all customer debt is visible and auditable.

## Acceptance Criteria

1. Invoice CRUD: GET/POST /api/v1/finance/invoices, send/cancel actions
2. AR Ledger (append-only): GET /api/v1/finance/ar-ledger
3. Outstanding balances: GET /api/v1/finance/outstanding
4. Customer balance: GET /api/v1/sales/customers/:id/balance

## Dev Agent Record

### Completion Notes

Implemented as part of `feat(finance): Finance Module + Accountant RBAC + bug fixes` (commit 92fd40f).

**Architecture:** `AccountsReceivableLedger` model is append-only (INSERT only, never UPDATE/DELETE). Invoices are created with `outstandingAmount` tracking. Payment allocation reduces outstanding via transaction.

**Files:**
- `backend/src/finance/finance.service.ts` — `listInvoices`, `createInvoice`, `sendInvoice`, `cancelInvoice`, `listArLedger`, `getOutstandingBalances`
- `backend/src/finance/finance.controller.ts`
- Frontend: finance/invoices page with aging view

### Change Log
- 2026-05-14 (approx): Implemented via finance module commit
