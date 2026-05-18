# Story 8.1: Business KPI Dashboard — Dashboard KPI doanh nghiệp

Status: done

## Story

As a Director,
I want to view key business KPIs (revenue, purchases, inventory, AR, AP) on a single dashboard,
So that I can monitor company performance at a glance.

## Acceptance Criteria

1. Director KPI dashboard: GET /api/v1/reporting/dashboard
2. Manager dashboard: GET /api/v1/reporting/manager-dashboard
3. Sales rep dashboard: GET /api/v1/reporting/sales-dashboard
4. Accountant dashboard: GET /api/v1/reporting/accountant-dashboard
5. Warehouse dashboard: GET /api/v1/reporting/warehouse-dashboard
6. Each dashboard returns role-appropriate KPI metrics

## Dev Agent Record

### Completion Notes

Implemented as part of `feat(finance): Finance Module + Accountant RBAC + bug fixes` and inventory module.

**Files:**
- `backend/src/reporting/reporting.service.ts` — `getDashboardKpis`, `getManagerDashboard`, `getSalesDashboard`, `getAccountantDashboard`, `getWarehouseDashboard`
- `backend/src/reporting/reporting.controller.ts`
- Frontend: 6 role-specific dashboard sub-pages

### Change Log
- 2026-05-14 (approx): Implemented via reporting module
