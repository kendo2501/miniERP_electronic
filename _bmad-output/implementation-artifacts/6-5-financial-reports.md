# Story 6.5: Financial Reports — Báo cáo tài chính

Status: done

## Story

As an Accountant,
I want to view aging reports, outstanding balances, credit limits, and finance dashboard KPIs,
So that I can monitor the financial health of the business.

## Acceptance Criteria

1. Aging report: GET /api/v1/finance/aging (buckets: 0-30, 31-60, 61-90, 90+ days)
2. Outstanding invoices: GET /api/v1/finance/outstanding
3. Credit limits overview: GET /api/v1/finance/credit-limits
4. Finance order summary: GET /api/v1/finance/order-summary
5. Accountant dashboard: GET /api/v1/reporting/accountant-dashboard

## Dev Agent Record

### Completion Notes

Implemented as part of `feat(finance): Finance Module + Accountant RBAC + bug fixes` (commit 92fd40f).

**Files:**
- `backend/src/finance/finance.service.ts` — `getAgingReport`, `getOutstandingBalances`, `getCreditLimits`, `getOrderSummary`
- `backend/src/reporting/reporting.service.ts` — `getAccountantDashboard`
- Frontend: finance/aging page with aging table UI

### Change Log
- 2026-05-14 (approx): Implemented via finance module + reporting module
