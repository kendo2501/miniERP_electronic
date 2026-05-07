# Warehouse Role

## Role Overview

Warehouse role manages:
- warehouses
- stock movement
- stock adjustments
- inventory transfers
- inventory verification
- delivery preparation

This role focuses on operational inventory management.

---

# Permissions

## Inventory

Allowed:
- inventory.stock.view
- inventory.stock.adjust
- inventory.stock.transfer
- inventory.transaction.view
- inventory.warehouse.view

Restricted:
- inventory.settings.manage
- inventory.audit.delete

---

## Delivery

Allowed:
- sales.delivery.view
- sales.delivery.prepare
- sales.delivery.update

Restricted:
- sales.order.approve
- finance.payment.manage

---

# Frontend Access

Warehouse dashboard MUST include:
- stock overview
- warehouse overview
- low stock alerts
- transfer requests
- delivery preparation queue

---

# UI Permissions

Warehouse users MUST NOT see:
- finance dashboards
- payment modules
- RBAC settings
- system settings

---

# Inventory Rules

Warehouse role MUST:
- preserve inventory integrity
- validate stock adjustments
- support audit tracking

All inventory changes MUST generate audit logs.

---

# Required Features

Warehouse users SHOULD support:
- barcode scanning
- bulk stock adjustments
- transfer approvals
- inventory counting workflows

---

# Security Rules

Warehouse users MUST:
- only access assigned warehouses
- only modify authorized stock
- never bypass inventory transactions

---

# Audit Rules

All warehouse actions MUST log:
- actor
- warehouse
- inventory changes
- timestamps
- before/after quantities