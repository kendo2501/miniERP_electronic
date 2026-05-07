# AI Master Execution Instructions — Mini-ERP BMAD

## Mission

Build and maintain a production-ready Fullstack B2B Mini-ERP system.

AI is fully responsible for:
- backend architecture
- frontend architecture
- database architecture
- infrastructure & DevOps
- security hardening
- testing
- performance optimization
- RBAC enforcement
- UI/UX consistency
- scalable modular architecture
- production readiness

AI acts as:
- Senior Software Architect
- Senior Fullstack Engineer
- Senior Backend Engineer
- Senior Frontend Architect
- Senior DevOps Engineer
- Security Engineer
- Database Architect
- UI/UX Engineer

---

# Source Of Truth

AI MUST read all markdown files inside:

```text
_bmad/custom/**
```

Treat all markdown files as official system blueprints.

Priority:
1. security rules
2. architecture rules
3. database rules
4. module specifications
5. role specifications
6. frontend design rules

AI MUST:
- load only relevant files for current task
- avoid loading unrelated modules
- avoid reading entire repository unnecessarily

---

# Core System Architecture

## Backend Architecture

MUST use:
- Modular Monolith
- Hexagonal Architecture
- Clean Architecture
- DDD-oriented modules
- Repository abstraction
- transactional use cases
- DTO validation
- REST APIs

---

## Frontend Architecture

MUST use:
- feature-based frontend modules
- reusable UI components
- centralized API layer
- centralized state management
- role-aware rendering
- permission-aware routing
- responsive enterprise layouts

---

## Infrastructure Architecture

MUST support:
- Docker
- PostgreSQL
- Redis
- MinIO
- Mailpit
- PgAdmin
- Nginx
- CI/CD pipelines

---

# Required Stack

## Frontend
- Next.js App Router
- React
- TypeScript strict mode
- TailwindCSS
- Shadcn/UI
- TanStack Query
- Zustand
- React Hook Form
- Zod
- Recharts

---

## Backend
- Node.js
- NestJS
- PostgreSQL
- Prisma ORM
- Redis
- MinIO

---

## Infrastructure
- Docker Compose
- Nginx
- Mailpit
- PgAdmin

AI may improve stack choices if technically justified.

---

# Required Folder Structure

```text
apps/
  api/
  web/

modules/
shared/
database/
infrastructure/
tests/
```

---

# Backend Module Structure

```text
module/
  domain/
  application/
  infrastructure/
  presentation/
```

---

# Frontend Module Structure

```text
modules/
  inventory/
    components/
    pages/
    hooks/
    services/
    stores/
    schemas/
    types/
```

---

# Frontend Applications

AI MUST generate:

## Admin Dashboard
Features:
- user management
- RBAC management
- audit logs
- reporting
- system settings
- analytics
- feature flags

---

## Manager Dashboard
Features:
- approval queues
- KPIs
- operational monitoring
- inventory alerts
- finance overview
- reporting

---

## Sales Portal
Features:
- quotations
- orders
- customers
- delivery tracking
- payment tracking
- sales KPIs

---

## Customer Portal
Features:
- catalog browsing
- quotation requests
- order tracking
- invoice tracking
- attachment downloads
- profile management

---

# Design System

AI MUST follow these design rules STRICTLY.

## Theme

```yaml
name: DevFocus Dark

colors:
  primary: '#2665fd'
  secondary: '#475569'
  surface: '#0b1326'
  on-surface: '#dae2fd'
  error: '#ffb4ab'
```

---

## Typography

```yaml
font: Inter
body:
  size: 14px-16px
```

MUST:
- use Inter font
- use compact enterprise density
- maintain readability
- maintain information density

---

## UI Principles

MUST:
- minimal enterprise UI
- dark-first design
- clean spacing
- reusable components
- responsive layouts
- accessible UX
- permission-aware rendering

DO NOT:
- invent random colors
- invent random spacing systems
- mix sharp/rounded styles inconsistently

---

## Border Radius

```yaml
rounded:
  md: 8px
```

---

## Required Layout

```text
Sidebar Navigation
Topbar
Content Area
Widget Grid
Responsive Drawer
Notification Panel
```

---

# Required UI Components

AI MUST generate reusable components:

## Core Components
- Button
- Input
- Select
- Table
- DataGrid
- Modal
- Drawer
- Tabs
- Breadcrumb
- Pagination
- DatePicker
- FileUploader
- Toast
- ConfirmDialog
- LoadingOverlay

---

## Business Components
- KPI cards
- Sales charts
- Inventory tables
- Finance summary cards
- Audit log viewer
- Permission matrix
- Dashboard widgets
- Status badges

---

# Frontend Rules

AI MUST:
- reuse components
- avoid duplicated UI logic
- support loading states
- support error states
- support skeleton states
- support responsive layouts
- support permission-aware rendering

---

## Frontend Routing

MUST:
- use protected routes
- use RBAC-aware navigation
- use lazy-loaded heavy pages
- use route guards

---

## Forms

MUST:
- use React Hook Form
- use Zod validation
- support async validation
- support optimistic updates when appropriate

---

## Tables

MUST support:
- pagination
- sorting
- filtering
- export
- bulk actions
- virtualization for large datasets

---

## State Management

MUST:
- use Zustand for client state
- use TanStack Query for server state
- invalidate cache correctly
- avoid duplicated state

---

## Frontend API Integration

MUST:
- use typed API clients
- centralize API logic
- auto-refresh tokens
- standardize retries
- standardize error handling

---

# Backend Rules

AI MUST:
- keep business logic outside controllers
- use repository abstraction
- use DTO validation
- avoid fat services
- use transactions for finance flows
- enforce module isolation
- use typed contracts
- paginate APIs

---

## API Standards

MUST:
- use REST conventions
- version APIs
- standardize responses
- standardize pagination
- standardize errors

Example:

```json
{
  "success": true,
  "data": {},
  "message": "Success"
}
```

---

# Database Rules

AI MUST:
- use migrations only
- use UTC timestamps
- use NUMERIC for money
- enforce constraints
- enforce foreign keys
- index foreign keys
- create audit-ready schema

---

## Financial Rules

MUST:
- use transactions
- avoid floating point
- keep immutable ledgers
- audit all financial changes

---

## Immutable Tables

These MUST be append-only:
- audit_logs
- inventory_transactions
- accounts_receivable_ledger

---

# Security Rules

AI MUST:
- hash passwords
- hash refresh tokens
- validate all inputs
- sanitize uploads
- prevent SQL injection
- prevent mass assignment
- enforce RBAC
- enforce tenant isolation
- enforce ownership validation
- enforce audit logging

---

## AI MUST NEVER

- expose secrets
- expose sensitive data
- bypass RBAC
- bypass ownership validation
- bypass audit logging
- store raw passwords
- store raw refresh tokens
- hardcode secrets

---

# Session Rules

MUST:
- rotate refresh tokens
- revoke compromised sessions
- support concurrent session management
- detect replay attacks

---

# File Upload Rules

MUST:
- use MinIO
- validate MIME types
- validate file sizes
- use signed URLs
- enforce ownership validation

---

# Reporting Rules

MUST:
- support exports
- support scheduled reports
- support dashboard widgets
- support aggregated analytics
- support report caching

---

# Audit Rules

AI MUST log:
- authentication events
- RBAC changes
- inventory changes
- finance changes
- exports
- security events
- sensitive operations

Audit logs MUST be immutable.

---

# DevOps Rules

AI MUST support:
- Docker deployment
- health checks
- graceful shutdown
- environment configs
- CI/CD
- restart safety

---

# CI/CD Rules

MUST support:
- lint
- tests
- build validation
- migration validation
- Docker builds

---

# Testing Requirements

AI MUST generate:

## Backend Tests
- unit tests
- integration tests
- RBAC tests
- security tests

---

## Frontend Tests
- component tests
- integration tests
- E2E tests

---

## Required E2E Flows

- login
- quotation flow
- sales order flow
- payment flow
- report export
- customer portal flow

---

# Performance Rules

AI MUST:
- avoid N+1 queries
- lazy-load heavy pages
- optimize bundle size
- debounce searches
- cache heavy queries
- paginate APIs
- virtualize large tables

---

# Naming Conventions

## Backend
- snake_case database
- PascalCase classes
- camelCase variables

---

## Frontend
- PascalCase components
- kebab-case routes
- camelCase hooks/services

---

# Code Standards

AI MUST:
- use strict TypeScript
- keep functions small
- avoid duplicated logic
- use reusable abstractions
- separate concerns
- prefer composition over inheritance

---

# Context Discipline

IMPORTANT:

AI MUST:
- load only relevant markdown files
- avoid loading unrelated modules
- avoid huge responses
- avoid rewriting unchanged files

Example:

If task affects only Inventory:
ONLY load:
- Inventory.md
- related database schema
- related frontend module
- related role rules

DO NOT load:
- Finance
- Reporting
- unrelated modules

---

# Token Optimization Rules

AI MUST:
- keep answers concise
- avoid huge explanations
- avoid repeated summaries
- avoid dumping unchanged code
- batch related changes together
- summarize only critical decisions
- prefer editing existing files over rewriting

---

# Claude Code Optimization

AI MUST:
- use focused execution
- split large tasks
- avoid giant sessions
- avoid loading all modules at once
- avoid giant prompts
- use phased implementation

When context becomes too large:
- compact context
- restart session if needed

---

# Recommended Workflow

## Phase 1
Infrastructure + Database

## Phase 2
Authentication + RBAC

## Phase 3
Core Modules

## Phase 4
Business Modules

## Phase 5
Frontend Dashboards

## Phase 6
Reporting + Analytics

## Phase 7
Testing + Optimization

## Phase 8
Security Hardening

---

# Output Rules

Unless explicitly requested:

DO NOT:
- generate tutorials
- explain obvious code
- paste unchanged files
- generate verbose markdown

Return ONLY:
- changed files
- important decisions
- required commands
- relevant implementation notes

---

# Autonomous Permissions

AI MAY:
- generate code
- refactor code
- create files
- modify architecture
- optimize performance
- optimize database
- generate frontend
- generate backend
- generate tests
- create Docker setup
- improve DX

---

# AI MUST NOT

- break module boundaries
- weaken security
- remove audit logging
- violate architecture consistency
- bypass financial integrity rules

---

# Required Quality

Everything generated MUST be:
- production-ready
- secure
- typed
- scalable
- maintainable
- modular
- testable
- responsive

---

# Final Goal

```text
Production-ready Fullstack B2B Mini-ERP
```

Optimize for:
- maintainability
- scalability
- security
- low token usage
- autonomous implementation
- enterprise-grade quality
---

# Business Modules

AI MUST implement all modules as isolated bounded contexts.

Each module MUST:
- expose clear APIs
- own its domain logic
- avoid leaking internals
- communicate through application services
- maintain strict boundaries

---

# Required Modules

## Authentication & Authorization

MUST implement:
- JWT authentication
- refresh token rotation
- session tracking
- RBAC
- permission guards
- tenant isolation
- password reset
- email verification
- account locking
- MFA-ready architecture

---

## Catalog Module

MUST implement:
- products
- categories
- brands
- product images
- search/filtering
- SKU management
- product status
- inventory integration

Frontend MUST support:
- catalog tables
- product forms
- image upload
- search/filter UI

---

## Inventory Module

MUST implement:
- warehouses
- inventory stocks
- stock reservations
- inventory transactions
- transfers
- adjustments
- stock movement history
- low stock alerts

Inventory MUST:
- use immutable transaction history
- support reservation-ready architecture
- prevent negative stock unless explicitly allowed

Frontend MUST support:
- warehouse dashboard
- inventory movement timeline
- stock adjustment forms
- low stock widgets

---

## Sales Module

MUST implement:
- quotations
- quotation items
- sales orders
- sales order items
- deliveries
- delivery items
- order lifecycle
- approval flows

Sales lifecycle MUST support:
- DRAFT
- SENT
- CONFIRMED
- PARTIALLY_DELIVERED
- DELIVERED
- CANCELLED

Frontend MUST support:
- quotation builder
- order management
- delivery tracking
- customer order timeline

---

## Finance Module

MUST implement:
- invoices
- payments
- payment allocations
- AR ledger
- aging reports
- outstanding balances
- financial audit trail

Finance MUST:
- use immutable ledger architecture
- support partial payments
- support overpayments
- support reconciliation-ready design

Frontend MUST support:
- invoice dashboard
- payment allocation UI
- aging reports
- outstanding balance widgets

---

## Notification Module

MUST implement:
- email notifications
- in-app notifications
- notification templates
- queue-based delivery
- retry logic
- scheduling

Frontend MUST support:
- notification center
- toast notifications
- unread counters

---

## File Attachment Module

MUST implement:
- uploads
- downloads
- signed URLs
- ownership validation
- MIME validation
- file size validation
- attachment metadata

Supported files:
- PDFs
- images
- spreadsheets
- documents

Frontend MUST support:
- drag/drop uploads
- preview
- download
- attachment lists

---

## Audit Log Module

MUST implement:
- immutable audit logs
- security event tracking
- actor tracking
- before/after snapshots
- correlation IDs
- request tracking

Frontend MUST support:
- audit viewer
- filtering
- export
- security event timeline

---

## Reporting Module

MUST implement:
- dashboards
- exports
- scheduled reports
- aggregated analytics
- report caching

Supported exports:
- CSV
- XLSX
- PDF

Frontend MUST support:
- dashboard widgets
- charts
- report filters
- export actions

---

## Settings Module

MUST implement:
- runtime settings
- feature flags
- organization settings
- user preferences
- cache invalidation

Frontend MUST support:
- settings dashboard
- feature flag UI
- preference forms

---

# Role Specifications

AI MUST enforce strict RBAC.

---

## Admin Role

Permissions:
- full system access
- user management
- RBAC management
- settings management
- reporting access
- audit access

Frontend:
- full admin dashboard
- system analytics
- audit center

---

## Manager Role

Permissions:
- approvals
- reporting
- operational visibility
- finance visibility
- inventory visibility

Frontend:
- operational dashboards
- KPI monitoring
- approval queues

---

## Sales Role

Permissions:
- quotations
- orders
- customer management
- delivery tracking

Frontend:
- sales workspace
- customer management
- quotation builder

---

## Customer Role

Permissions:
- own quotations
- own orders
- own invoices
- attachment downloads

Frontend:
- customer portal
- order tracking
- invoice tracking

---

# Multi-Tenant Rules

AI MUST support organization-level isolation.

MUST:
- isolate tenant data
- validate tenant ownership
- prevent tenant leakage
- support tenant-specific settings

---

# API Security Rules

MUST:
- validate JWT
- validate permissions
- validate ownership
- validate organization scope

DO NOT trust frontend role claims.

---

# Frontend Permission Rules

AI MUST:
- hide unauthorized routes
- hide unauthorized actions
- hide unauthorized menu items
- validate permissions before rendering actions

Frontend permissions are UX-only.
Backend MUST still validate everything.

---

# Error Handling Rules

Backend MUST:
- standardize errors
- avoid leaking internal errors
- return typed responses

Frontend MUST:
- display friendly errors
- support retry flows
- support offline/error states

---

# Logging Rules

MUST implement:
- request logs
- security logs
- audit logs
- error logs
- performance logs

---

# Monitoring Rules

MUST support:
- health endpoints
- service monitoring
- DB monitoring
- Redis monitoring
- API latency monitoring

---

# Health Check Endpoints

MUST implement:

```text id="0eb5ea"
/health
/health/db
/health/redis
```

---

# Docker Rules

AI MUST:
- use Docker Compose
- support local development
- support production deployment
- isolate services via networks

---

# Environment Rules

MUST:
- separate dev/staging/prod configs
- use environment variables
- never hardcode secrets

---

# Secret Rules

Secrets MUST include:
- JWT secrets
- DB passwords
- MinIO credentials
- SMTP credentials

Secrets MUST NEVER:
- exist in Git
- exist in frontend bundles

---

# Prisma Rules

AI MUST:
- use Prisma migrations
- avoid raw SQL unless necessary
- use transactions correctly
- generate typed Prisma clients

---

# Redis Rules

Use Redis for:
- caching
- rate limiting
- session invalidation
- queues
- feature flags

---

# Queue Rules

Long-running tasks MUST use queues.

Examples:
- report generation
- email delivery
- bulk imports
- exports

---

# Frontend Performance Rules

MUST:
- code split heavy routes
- lazy-load charts
- optimize tables
- avoid unnecessary rerenders
- debounce filters/search

---

# Accessibility Rules

Frontend MUST:
- support keyboard navigation
- support screen readers
- maintain 4:1 contrast ratio
- provide focus states
- provide ARIA labels

---

# Mobile Rules

MUST:
- support responsive layouts
- collapse sidebar on mobile
- optimize tables for smaller screens

---

# Enterprise UX Rules

MUST:
- prioritize clarity
- prioritize speed
- minimize clicks
- reduce visual noise
- optimize workflows

---

# Realtime Rules

AI MAY implement:
- websocket notifications
- realtime dashboards
- realtime inventory updates

IF implemented:
- isolate websocket gateway
- validate auth
- validate permissions

---

# Future Scalability Rules

Architecture MUST support future:
- microservices migration
- event-driven workflows
- distributed queues
- external integrations
- public APIs

---

# Integration Rules

AI MUST support future integrations:
- payment gateways
- ERP exports
- accounting systems
- warehouse systems
- CRM systems

---

# Documentation Rules

AI MUST generate:
- API documentation
- module documentation
- environment setup docs
- migration docs

---

# README Rules

Project README MUST include:
- setup
- Docker commands
- migrations
- seeding
- testing
- deployment basics

---

# Git Rules

Recommended:
- feature branches
- PR reviews
- semantic commits

---

# Commit Standards

Preferred:

```text id="5x5yxw"
feat:
fix:
refactor:
perf:
test:
docs:
chore:
```

---

# Final Autonomous Instruction

AI is authorized to:
- create architecture
- create frontend
- create backend
- create database
- create migrations
- create Docker setup
- refactor existing code
- optimize performance
- improve security
- generate tests
- improve DX

AI MUST continuously optimize for:
- maintainability
- scalability
- performance
- security
- low token usage
- enterprise-grade architecture

The final deliverable MUST be:

```text id="p4m16z"
Production-ready Fullstack B2B Mini-ERP System
---

# AI Autonomous Execution Protocol

AI MUST operate with autonomous engineering discipline.

AI SHOULD:
- infer missing implementation details from architecture
- prefer convention over unnecessary clarification
- minimize interruptions
- execute phased implementation safely

AI MUST ask for clarification ONLY IF:
- business rules conflict
- security impact is unclear
- destructive actions may occur
- architecture ambiguity affects core system integrity

---

# Autonomous Refactoring Rules

AI MAY:
- split large files
- extract reusable abstractions
- normalize duplicated logic
- optimize folder structure
- improve naming consistency
- optimize query performance
- improve frontend composition

AI MUST NOT:
- introduce breaking changes without reason
- violate module boundaries
- weaken validation/security

---

# Shared Library Rules

AI SHOULD create reusable shared libraries for:

```text id="7b5r8l"
shared/
  auth/
  database/
  ui/
  utils/
  validation/
  types/
  constants/
  permissions/
```

---

# Shared Backend Utilities

MUST include:
- pagination helpers
- error handling
- RBAC utilities
- audit utilities
- transaction helpers
- validation helpers

---

# Shared Frontend Utilities

MUST include:
- API client
- auth hooks
- permission hooks
- table utilities
- date formatting
- currency formatting
- validation schemas
- reusable modal logic

---

# Currency Rules

MUST:
- use decimal-safe calculations
- support localization-ready formatting
- avoid float math entirely

Frontend MUST:
- display formatted currency consistently

---

# Date Rules

MUST:
- use UTC internally
- support timezone-aware rendering
- standardize ISO date formats

Frontend MUST:
- display localized dates safely

---

# Pagination Rules

All large list APIs MUST support:
- page
- limit
- sorting
- filtering
- search

Frontend MUST:
- preserve pagination state
- preserve filters
- preserve sorting

---

# Search Rules

AI SHOULD implement:
- debounced search
- indexed DB search
- scalable filtering

Heavy search MAY use:
- PostgreSQL full-text search
- Elasticsearch later if needed

---

# Import/Export Rules

AI MUST support:
- CSV import/export
- XLSX export
- PDF export

Imports MUST:
- validate schema
- validate permissions
- support partial failure reporting

---

# Data Integrity Rules

MUST:
- enforce transactional consistency
- validate references
- prevent orphaned records
- maintain auditability

---

# Soft Delete Rules

AI SHOULD use soft delete for:
- users
- products
- customers
- attachments

Soft delete MUST:
- preserve audit history
- preserve financial references

---

# Hard Delete Rules

AI MUST NEVER hard-delete:
- financial records
- audit logs
- inventory transactions

---

# Attachment Security Rules

MUST:
- scan file metadata
- validate ownership
- validate download permissions
- support signed expiration URLs

---

# Frontend Component Rules

Components MUST:
- be reusable
- avoid business coupling
- support accessibility
- support loading states
- support disabled states

---

# Modal Rules

Modals MUST:
- trap focus
- support ESC close
- support async loading
- support optimistic flows

---

# Table UX Rules

Tables MUST:
- support sticky headers
- support responsive overflow
- support keyboard navigation
- support row selection

---

# Dashboard Rules

Dashboards MUST:
- support widget composition
- support responsive grids
- support realtime-ready architecture
- support loading states

---

# Chart Rules

Charts MUST:
- use Recharts
- support tooltips
- support responsive rendering
- avoid excessive animations

---

# Notification UX Rules

Frontend MUST:
- support toast notifications
- support notification center
- support unread counts
- support priority indicators

---

# Empty State Rules

Every major page MUST include:
- empty states
- loading states
- error states

---

# Error Boundary Rules

Frontend MUST:
- isolate page crashes
- recover gracefully
- avoid full-app crashes

---

# Frontend Caching Rules

AI MUST:
- cache server state
- invalidate intelligently
- avoid stale finance data
- optimize dashboard reloads

---

# Frontend Loading Rules

MUST:
- use skeleton loaders
- avoid layout shift
- support optimistic updates carefully

---

# Optimistic Update Rules

Allowed for:
- UI preferences
- notifications
- non-critical edits

Avoid optimistic updates for:
- finance
- inventory stock changes
- payment operations

---

# Finance Integrity Rules

Finance operations MUST:
- use DB transactions
- validate balances
- prevent duplicate allocations
- preserve immutable history

---

# Inventory Integrity Rules

Inventory operations MUST:
- prevent race conditions
- lock stock correctly
- validate stock availability
- preserve transaction history

---

# RBAC Rules

Permissions MUST:
- be centralized
- be reusable
- support scoped access
- support organization boundaries

---

# Permission Naming Rules

Use format:

```text id="2xk0ww"
module.resource.action
```

Examples:

```text id="dxo9xj"
sales.order.create
sales.order.approve
finance.invoice.view
inventory.stock.adjust
```

---

# Route Naming Rules

Frontend routes SHOULD use:

```text id="a8d3jx"
/admin/users
/sales/orders
/inventory/stocks
/finance/invoices
```

---

# API Naming Rules

Use REST naming:

```text id="v6a70k"
GET /sales-orders
POST /sales-orders
PATCH /sales-orders/:id
```

Avoid:
```text id="j25jfw"
/getSalesOrders
/createSalesOrder
```

---

# Frontend Naming Rules

## Components
PascalCase:

```text id="o0x2cc"
SalesOrderTable.tsx
InventoryDashboard.tsx
```

---

## Hooks
camelCase:

```text id="tvwdr1"
useAuth.ts
useInventory.ts
```

---

## Stores
camelCase:

```text id="0z1plg"
authStore.ts
inventoryStore.ts
```

---

# Backend Naming Rules

## Services
PascalCase:

```text id="7j3yr1"
SalesOrderService
InventoryAdjustmentService
```

---

## DTOs

```text id="5nmtb5"
CreateSalesOrderDto
UpdateInvoiceDto
```

---

# Migration Rules

Every migration MUST:
- be reversible
- include indexes
- preserve data integrity
- avoid destructive changes

---

# Seed Rules

Seed data MUST:
- support local dev
- support demo environments
- include RBAC defaults
- include realistic sample data

---

# Demo Environment Rules

AI SHOULD support:
- realistic dashboards
- realistic reports
- realistic transactions
- seeded business flows

---

# Analytics Rules

AI SHOULD generate:
- revenue KPIs
- inventory KPIs
- sales KPIs
- aging analytics
- operational analytics

---

# KPI Rules

KPIs MUST:
- be cached if expensive
- support date filtering
- support organization filtering

---

# Feature Flag Rules

Feature flags MUST:
- support runtime toggles
- support organization scope
- support frontend rendering control

---

# Internationalization Rules

Architecture SHOULD support future:
- i18n
- multi-language labels
- locale-aware formatting

---

# Theme Rules

Architecture SHOULD support:
- dark mode
- future light mode
- tokenized theme variables

---

# Accessibility Standards

Frontend MUST:
- support tab navigation
- support semantic HTML
- support ARIA labels
- support visible focus indicators

---

# Browser Support Rules

Support modern browsers:
- Chrome
- Edge
- Firefox
- Safari

---

# Mobile Support Rules

Customer Portal SHOULD support:
- mobile workflows
- responsive forms
- responsive dashboards

---

# API Documentation Rules

AI MUST generate:
- OpenAPI/Swagger docs
- DTO examples
- auth examples
- error examples

---

# Swagger Rules

Backend MUST:
- expose Swagger in development
- protect Swagger in production

---

# Observability Rules

AI SHOULD support:
- structured logging
- request tracing
- correlation IDs
- error tracking

---

# Monitoring Stack Rules

Recommended:
- Prometheus
- Grafana
- Loki
- OpenTelemetry

---

# Production Deployment Rules

Production MUST support:
- reverse proxy
- HTTPS
- environment isolation
- rolling deployment
- restart safety

---

# Nginx Rules

Nginx SHOULD:
- proxy API
- serve frontend
- support gzip
- support caching headers

---

# Backup Rules

MUST support:
- PostgreSQL backups
- attachment backups
- restore workflows

---

# Disaster Recovery Rules

Architecture SHOULD support:
- DB restore
- attachment restore
- migration rollback

---

# Scalability Rules

Architecture MUST support future:
- queue workers
- horizontal scaling
- service extraction
- API gateways

---

# Monorepo Rules

AI SHOULD support:
- pnpm workspaces
- Turborepo-ready structure
- shared package reuse

---

# Package Rules

Shared packages MAY include:

```text id="zxlxij"
packages/
  ui/
  config/
  types/
  eslint-config/
  tsconfig/
```

---

# Linting Rules

MUST:
- use ESLint
- use Prettier
- enforce consistent formatting

---

# Git Ignore Rules

MUST ignore:
- node_modules
- .env
- dist
- coverage
- generated files

---

# AI Output Compression Rules

IMPORTANT:

AI MUST minimize token usage by:
- avoiding repeated explanations
- avoiding giant markdown dumps
- avoiding unchanged code output
- avoiding unnecessary summaries

Preferred response format:

```text id="5lfxq7"
Changed:
- file A
- file B

Implemented:
- feature X
- feature Y

Commands:
- npm run test
```

---

# AI Autonomous Repair Rules

If errors occur:
- diagnose root cause first
- avoid random fixes
- preserve architecture consistency
- preserve module boundaries

---

# AI Autonomous Upgrade Rules

AI MAY:
- modernize dependencies
- optimize architecture
- improve DX
- improve build performance

ONLY IF:
- backward compatibility is preserved
- security is improved
- maintainability improves

---

# Final Enterprise Instruction

The entire system MUST behave like a real enterprise-grade ERP platform.

Priorities:

1. Security
2. Financial integrity
3. Data integrity
4. Architecture consistency
5. Maintainability
6. Scalability
7. Performance
8. Developer experience
9. UI/UX quality
10. Token efficiency

The final system MUST be:

```text id="8q5s6f"
Production-ready
Enterprise-grade
Secure
Scalable
Maintainable
Autonomous-AI-friendly
---

# AI Task Planning Rules

Before implementation AI MUST:

1. identify affected modules
2. identify affected database tables
3. identify affected frontend pages
4. identify RBAC impact
5. identify API contract impact
6. identify migration requirements
7. identify testing scope
8. identify deployment impact

AI SHOULD:
- implement smallest safe change first
- avoid broad uncontrolled refactors
- preserve backward compatibility when possible

---

# Change Safety Rules

Before modifying existing code AI MUST:
- inspect dependencies
- inspect shared contracts
- inspect frontend/backend usage
- inspect database impact
- inspect RBAC impact
- inspect API consumers

AI MUST:
- avoid silent breaking changes
- avoid destructive schema changes
- avoid incompatible API changes without versioning

---

# API Versioning Rules

Use:

```text id="pklnt7"
/api/v1/
```

Future breaking changes MUST use:
- /api/v2/
- /api/v3/

AI MUST:
- preserve backward compatibility when practical
- document breaking changes

---

# Transaction Isolation Rules

Critical finance/inventory operations MUST:
- use DB transactions
- use row locking when necessary
- prevent race conditions
- prevent duplicate execution

Critical operations include:
- payments
- invoice allocations
- inventory reservations
- stock adjustments
- stock transfers

---

# Concurrency Rules

AI MUST:
- prevent double submission
- prevent duplicate financial transactions
- prevent inventory race conditions
- support idempotent APIs where necessary

---

# Idempotency Rules

Critical APIs SHOULD support idempotency.

Examples:
- payment creation
- report generation
- export generation
- bulk imports

---

# Retry Rules

AI MUST:
- retry transient failures safely
- avoid duplicate side effects
- use exponential backoff for queues

---

# Queue Reliability Rules

Queue jobs MUST:
- support retries
- support dead-letter handling
- support failure logging
- support idempotent execution

---

# AI Prompt Compression Rules

AI MUST:
- infer conventions automatically
- avoid repetitive clarification
- avoid re-reading unchanged specs
- prefer convention over confirmation
- avoid unnecessary verbosity

---

# AI Context Retention Rules

AI SHOULD:
- maintain architecture consistency across sessions
- preserve module boundaries
- preserve naming consistency
- preserve API consistency

---

# AI Refactor Discipline

AI MUST:
- refactor incrementally
- preserve existing working behavior
- update tests when behavior changes
- avoid architecture drift

---

# Enterprise Data Rules

AI MUST:
- preserve historical records
- preserve financial auditability
- preserve inventory traceability
- preserve security event traceability

---

# Audit Compliance Rules

Audit logs MUST contain:
- actor
- timestamp
- entity
- action
- before snapshot
- after snapshot
- correlation ID
- IP address if available

---

# Sensitive Action Rules

Sensitive actions MUST require:
- authentication
- authorization
- audit logging

Sensitive actions include:
- role changes
- payment actions
- inventory adjustments
- settings changes
- exports
- attachment downloads

---

# Password Rules

Passwords MUST:
- use bcrypt or argon2
- enforce secure minimum length
- support rotation
- support reset flow

---

# Session Security Rules

Sessions MUST:
- support revocation
- support expiration
- support concurrent session tracking
- support device tracking

---

# Refresh Token Rules

Refresh tokens MUST:
- be hashed
- rotate after use
- support replay detection
- support revocation chains

---

# Rate Limiting Rules

AI SHOULD implement:
- auth rate limiting
- API abuse protection
- export throttling
- upload throttling

---

# Upload Security Rules

Uploads MUST:
- validate MIME type
- validate extension
- validate size
- sanitize filename
- generate unique storage names

---

# Frontend Security Rules

Frontend MUST:
- avoid storing sensitive secrets
- avoid exposing internal configs
- avoid insecure localStorage usage for secrets
- validate permission rendering

---

# CSP Rules

Production SHOULD support:
- Content Security Policy
- secure headers
- XSS mitigation

---

# Finance Reconciliation Rules

Finance MUST support:
- reconciliation-ready design
- allocation history
- payment traceability
- immutable transaction history

---

# Inventory Reservation Rules

Inventory reservations MUST:
- support expiration
- support release
- support partial allocation
- support order linkage

---

# Delivery Rules

Deliveries MUST:
- support partial delivery
- support delivery status tracking
- support inventory deduction traceability

---

# Reporting Performance Rules

Heavy reports SHOULD:
- use caching
- use async generation
- use background jobs
- avoid blocking requests

---

# Dashboard Performance Rules

Dashboards MUST:
- lazy-load widgets
- cache expensive metrics
- avoid excessive realtime polling

---

# Frontend Bundle Rules

AI MUST:
- minimize bundle size
- avoid unnecessary dependencies
- tree-shake where possible
- lazy-load charts/editors

---

# Component Composition Rules

AI SHOULD:
- compose small reusable components
- avoid giant components
- isolate business logic from UI

---

# Form UX Rules

Forms MUST:
- preserve unsaved state when practical
- display inline validation
- support keyboard submission
- prevent accidental duplicate submit

---

# Table Performance Rules

Large tables SHOULD:
- use virtualization
- lazy-load rows
- optimize rerenders

---

# Search UX Rules

Search MUST:
- debounce requests
- preserve filters
- preserve sorting
- support server-side filtering

---

# Notification Delivery Rules

Notifications MUST:
- support retry
- support queueing
- support prioritization
- support read/unread tracking

---

# Export Rules

Exports MUST:
- validate permissions
- support async generation
- generate audit logs
- support download expiration

---

# Attachment Rules

Attachments MUST:
- preserve ownership
- preserve traceability
- support soft delete
- support secure download

---

# Tenant Isolation Rules

Tenant isolation MUST:
- apply at DB level
- apply at API level
- apply at frontend rendering level

AI MUST NEVER:
- leak tenant data
- mix tenant caches
- bypass organization validation

---

# Caching Rules

AI MUST:
- invalidate stale cache correctly
- avoid caching sensitive data insecurely
- avoid stale finance balances

---

# Redis Safety Rules

Redis MUST NOT become source of truth for:
- finance balances
- inventory balances
- immutable records

---

# Error Logging Rules

Errors MUST:
- include correlation IDs
- avoid exposing secrets
- support traceability

---

# Production Logging Rules

Production logs MUST:
- avoid sensitive data leakage
- support structured logging
- support searchable metadata

---

# Deployment Safety Rules

Deployments MUST:
- support rollback
- support migration rollback
- support restart safety

---

# Migration Safety Rules

Migrations MUST:
- avoid destructive operations
- preserve existing data
- support rollback when practical

---

# Seed Safety Rules

Seed scripts MUST:
- avoid duplicate inserts
- support repeatable local setup
- support demo environments

---

# Feature Flag Rules

Feature flags MUST:
- support gradual rollout
- support runtime toggles
- support organization targeting

---

# Integration Architecture Rules

External integrations MUST:
- isolate integration logic
- support retries
- support failure logging
- support timeout handling

---

# API Client Rules

Frontend API clients MUST:
- centralize auth handling
- centralize retry handling
- centralize error handling

---

# Realtime Architecture Rules

Realtime systems MUST:
- validate auth
- validate permissions
- throttle updates
- avoid flooding clients

---

# Mobile UX Rules

Mobile layouts MUST:
- collapse navigation
- optimize forms
- support touch interactions

---

# Accessibility Compliance Rules

Frontend MUST:
- support keyboard navigation
- support semantic HTML
- support ARIA attributes
- support screen readers

---

# Enterprise Scalability Rules

Architecture MUST support future:
- queue workers
- event-driven workflows
- service extraction
- horizontal scaling
- public APIs

---

# Public API Rules

Public APIs MUST:
- use API versioning
- support API keys/OAuth later
- support rate limiting
- support audit logging

---

# Documentation Generation Rules

AI MUST generate:
- Swagger/OpenAPI docs
- setup documentation
- deployment documentation
- migration documentation
- environment variable documentation

---

# Monorepo Optimization Rules

AI SHOULD:
- share configs
- share UI libraries
- share types
- share validation schemas

---

# DX Rules

Developer experience MUST support:
- fast local setup
- consistent scripts
- hot reload
- typed contracts
- reproducible environments

---

# AI Self-Check Rules

Before finalizing changes AI MUST verify:
- security consistency
- RBAC consistency
- architecture consistency
- DB integrity
- frontend integration
- API consistency
- test impact

---

# AI Final Verification Checklist

Before task completion AI SHOULD verify:

- migrations work
- APIs compile
- frontend compiles
- RBAC enforced
- tests updated
- no broken imports
- no duplicated logic
- no architecture violations
- no sensitive data exposure

---

# Ultimate Final Instruction

The system MUST behave like a modern enterprise-grade ERP platform.

Final priorities:

1. Security
2. Financial integrity
3. Data integrity
4. Architecture consistency
5. Maintainability
6. Scalability
7. Reliability
8. Performance
9. UI/UX quality
10. Developer experience
11. Token efficiency
12. Autonomous AI implementation quality

Final target:

```text id="d7pp12"
Production-ready
Enterprise-grade
Secure
Scalable
Maintainable
Observable
AI-autonomous
Fullstack Mini-ERP
```