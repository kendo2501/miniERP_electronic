<div align="center">

# miniERP Electronic V2

**Production-ready B2B Mini-ERP for electronic goods distribution**

![Node.js](https://img.shields.io/badge/Node.js-22+-339933?logo=node.js&logoColor=white)
![NestJS](https://img.shields.io/badge/NestJS-10-E0234E?logo=nestjs&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=next.js&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?logo=prisma&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)

</div>

---

## Tech Stack

| Layer     | Technologies                                              |
|-----------|-----------------------------------------------------------|
| Backend   | NestJS 10 · Prisma 5 · PostgreSQL 16 · Redis 7           |
| Frontend  | Next.js 16 · TailwindCSS 4 · Radix UI · Zustand          |
| Infra     | Docker · MinIO · Mailpit · PgAdmin · Nginx                |
| Monorepo  | npm workspaces                                            |

---

## Modules

| Module       | Features                                                                 |
|--------------|--------------------------------------------------------------------------|
| Auth         | JWT + refresh tokens · RBAC (roles & permissions) · session management  |
| Users        | User management · role assignment · account lock/unlock                  |
| Catalog      | Products · categories · brands · UOM conversions · product images        |
| Inventory    | Stock tracking · warehouse management · transfers · stock counts         |
| Sales        | Quotations · customer counter-offers · sales orders · deliveries · returns |
| Finance      | Invoices · payments · AR/AP ledger · supplier payments                   |
| Customers    | Customer portal · self-service order/quotation/invoice view              |
| Reporting    | Dashboard · aging report · financial summaries                           |

---

## Prerequisites

| Software       | Minimum version | Download                                          |
|----------------|-----------------|---------------------------------------------------|
| Node.js        | 22+             | https://nodejs.org                                |
| Docker Desktop | latest          | https://www.docker.com/products/docker-desktop    |
| Git            | latest          | https://git-scm.com                               |

Verify your setup:

```powershell
node -v      # must be v22.x.x or higher
docker -v    # must show Docker version
git --version
```

---

## Setup (Fresh Machine)

### Step 1 — Start Docker Desktop

Docker Desktop must be **running** — the Docker icon should appear in the Windows system tray. Find it in the Start Menu if it's not open. Wait until the icon stops loading before continuing.

### Step 2 — Clone the repository

```powershell
git clone https://github.com/kendo2501/miniERP_electronic.git
cd miniERP_electronic
```

### Step 3 — Install dependencies

```powershell
npm install
```

> This installs dependencies for both backend and frontend. Takes 1–3 minutes on first run.

### Step 4 — Start infrastructure

```powershell
npm run infra:up
```

This pulls Docker images (first time only) and starts: PostgreSQL · Redis · MinIO · Mailpit · PgAdmin.

> First run may take 3–10 minutes depending on network speed.

Verify all containers are **healthy**:

```powershell
docker ps
```

Wait until `mini-erp-postgres` shows `(healthy)` in the STATUS column:

```
CONTAINER ID   IMAGE              STATUS
xxxxxxxxxxxx   postgres:16-alpine Up 30 seconds (healthy)   ← required
xxxxxxxxxxxx   redis:7-alpine     Up 30 seconds (healthy)
```

### Step 5 — Run database migrations

```powershell
npm run db:migrate
```

> Only run this after `mini-erp-postgres` is healthy. Prisma will create all tables in the `mini_erp` database.

### Step 6 — Seed sample data

```powershell
npm run db:seed
```

Creates: 6 user accounts · roles · permissions · sample products · warehouse · orders · invoices.

### Step 7 — Start the application

Open **two separate terminals** in the project root:

**Terminal 1 — Backend:**
```powershell
npm run dev
```
Backend API: http://localhost:3001

**Terminal 2 — Frontend:**
```powershell
npm run dev:fe
```
Frontend: http://localhost:3000

---

## Login Credentials

After seeding, log in at http://localhost:3000 with any of the following accounts:

| Role        | Email                      | Password          | Access                                                      |
|-------------|----------------------------|-------------------|-------------------------------------------------------------|
| Admin       | admin@mini-erp.local       | Admin@123456      | Full system access — users, RBAC, catalog, inventory, finance |
| Sales       | sales@mini-erp.local       | Sales@123456      | Quotations, orders, assigned customers, related invoices     |
| Accountant  | accountant@mini-erp.local  | Accountant@123456 | Invoices, payments, AR/AP, financial reports, aging report   |
| Warehouse   | warehouse@mini-erp.local   | Warehouse@123456  | Stock management, transfers, adjustments, warehouse config   |

**Customer portal accounts** (linked to specific companies):

| Email                     | Password        | Linked Company              |
|---------------------------|-----------------|-----------------------------|
| customer@mini-erp.local   | Customer@123456 | Xây Dựng Hoàng Phát (CUST-001) |
| nhatminh@portal.local     | Customer@123456 | Điện Nhật Minh (CUST-002)      |
| phulong@portal.local      | Customer@123456 | Cơ Điện Phú Long (CUST-003)    |

Customer access: view own quotations · orders · invoices · payment status · attachments.

---

## Services & Ports

| Service      | URL                             | Credentials                    |
|--------------|---------------------------------|--------------------------------|
| Frontend     | http://localhost:3000           | See table above                |
| Backend API  | http://localhost:3001           | —                              |
| Swagger Docs | http://localhost:3001/api/docs  | —                              |
| PgAdmin      | http://localhost:5050           | admin@example.com / admin      |
| MinIO        | http://localhost:9001           | minioadmin / minioadmin        |
| Mailpit      | http://localhost:8025           | —                              |
| PostgreSQL   | localhost:5433                  | postgres / postgres            |
| Redis        | localhost:6379                  | —                              |

---

## Scripts

```bash
# Infrastructure
npm run infra:up          # start all Docker services
npm run infra:down        # stop services
npm run infra:reset       # stop and delete all data volumes (destructive)

# Database
npm run db:migrate        # apply schema migrations
npm run db:generate       # regenerate Prisma client after schema changes
npm run db:seed           # seed sample data
npm run db:reset          # delete all transactional data (keep users/catalog/inventory)
npm run db:studio         # open Prisma Studio at http://localhost:5555

# Development
npm run dev               # start backend with hot-reload
npm run dev:fe            # start frontend with hot-reload

# Build
npm run build             # build backend
npm run build:fe          # build frontend

# Quality
npm run test              # run backend unit tests
npm run lint              # lint and auto-fix backend
```

---

## Health Check

```
GET http://localhost:3001/health        # memory/process health
GET http://localhost:3001/health/db     # PostgreSQL connectivity
GET http://localhost:3001/health/redis  # Redis connectivity
```

---

## Project Structure

```
├── backend/                    NestJS REST API
│   ├── database/
│   │   ├── prisma/             Schema & migrations
│   │   ├── seeds/              Sample data seeder
│   │   └── scripts/            Utility scripts (reset, etc.)
│   └── src/
│       ├── auth/               JWT auth, refresh tokens, sessions
│       ├── users/              User management, RBAC
│       ├── catalog/            Products, categories, brands, UOM
│       ├── inventory/          Stock, warehouses, transfers
│       ├── sales/              Quotations, orders, deliveries, returns
│       ├── finance/            Invoices, payments, AR/AP ledger
│       ├── customers/          Customer portal API
│       ├── notifications/      In-app notifications
│       ├── audit/              Audit logging
│       ├── reporting/          Reports & dashboard data
│       └── common/             Guards, decorators, shared types
├── frontend/                   Next.js App Router (TypeScript)
│   └── src/
│       ├── app/                Pages — dashboard, auth, portal
│       ├── components/         Shared UI components (shadcn/ui)
│       ├── lib/                API client, i18n (EN/VI), utilities
│       ├── store/              Zustand state (auth, permissions)
│       └── types/              TypeScript type definitions
├── docker-compose.yml          Development infrastructure
├── docker-compose.prod.yml     Production deployment
└── package.json                npm workspaces root
```

---

## Troubleshooting

**`P1000: Authentication failed` on `db:migrate`**
PostgreSQL is not ready yet. Run `docker ps` and wait for `mini-erp-postgres` to show `(healthy)`, then retry.

**`address already in use` on `infra:up`**
Another process is using port 5433 or 6379. Check with:
```powershell
netstat -ano | findstr :5433
netstat -ano | findstr :6379
```
Stop the conflicting process or adjust ports in `docker-compose.yml` and `backend/.env`.

**`Cannot find module` after `npm install`**
Regenerate the Prisma client:
```powershell
npm run db:generate
```
Then restart the backend.

**Full reset (start from scratch)**
```powershell
npm run infra:reset
npm run infra:up
# wait for postgres (healthy)
npm run db:migrate
npm run db:seed
```

**Reset business data only (keep users, catalog, inventory)**
```powershell
npm run db:reset
```
