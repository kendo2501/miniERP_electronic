# Accountant Role

## Role Overview

Accountant role manages:
- invoices
- payments
- allocations
- aging reports
- financial reconciliation
- finance reporting

This role focuses on financial operations and accounting integrity.

---

# Permissions

## Finance

Allowed:
- finance.invoice.view
- finance.invoice.manage
- finance.payment.manage
- finance.ledger.view
- finance.report.view

Restricted:
- RBAC management
- system settings
- infrastructure settings

---

## Sales

Allowed:
- sales.order.view
- sales.quotation.view

Restricted:
- sales.order.approve

---

# Frontend Access

Accountant dashboard MUST include:
- invoice dashboard
- payment dashboard
- AR aging
- outstanding balances
- reconciliation tools
- finance reports

---

# UI Permissions

Accountants MUST NOT see:
- RBAC management
- system infrastructure settings
- developer tools

---

# Finance Rules

Accountants MUST:
- preserve immutable ledger integrity
- prevent duplicate allocations
- validate balances before allocation

---

# Payment Rules

Payment operations MUST:
- use DB transactions
- support reconciliation
- generate audit logs
- support allocation history

---

# Security Rules

Accountants MUST:
- never delete financial history
- never bypass audit logging
- never bypass payment validation

---

# Audit Rules

All finance actions MUST log:
- actor
- invoice/payment reference
- amount changes
- allocation changes
- timestamps
- before/after state

---

# Reporting Access

Accountants SHOULD access:
- aging reports
- payment reports
- invoice reports
- outstanding balance reports
- reconciliation reports

---

# Export Rules

Accountants MAY export:
- invoices
- payment reports
- aging reports

Exports MUST generate audit logs.