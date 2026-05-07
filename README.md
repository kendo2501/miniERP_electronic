# Mini-ERP Electronic V2

Production-ready Fullstack B2B Mini-ERP — NestJS · Next.js · PostgreSQL · Prisma · Redis · MinIO

---

## Stack

| Layer       | Tech                                      |
|-------------|-------------------------------------------|
| Backend     | NestJS · Prisma · PostgreSQL · Redis      |
| Frontend    | Next.js App Router · TailwindCSS · Shadcn |
| Infra       | Docker · MinIO · Mailpit · Nginx          |
| Monorepo    | npm workspaces                            |

---

## Prerequisites

- Node.js >= 22
- Docker Desktop

---

## Setup

```bash
# 1. Clone & install
cd backend && npm install
cd ../frontend && npm install

# 2. Copy env
cp backend/.env.example backend/.env
# Edit backend/.env — change secrets before running

# 3. Start infrastructure
docker compose up -d

# 4. Run migrations
cd backend && npm run db:migrate

# 5. Seed database
npm run db:seed

# 6. Start backend dev
npm run dev
```

---

## Infrastructure Services

| Service   | URL / Port                    | Credentials              |
|-----------|-------------------------------|--------------------------|
| API       | http://localhost:3000         | —                        |
| Swagger   | http://localhost:3000/api/docs| —                        |
| PgAdmin   | http://localhost:5050         | admin@example.com / admin|
| MinIO     | http://localhost:9001         | minioadmin / minioadmin  |
| Mailpit   | http://localhost:8025         | —                        |
| PostgreSQL| localhost:5432                | postgres / postgres      |
| Redis     | localhost:6379                | —                        |

---

## Useful Commands

```bash
# Infrastructure
docker compose up -d          # start all Docker services
docker compose down           # stop services
docker compose down -v        # stop + remove volumes

# Database (run from backend/)
npm run db:migrate        # run pending migrations (dev)
npm run db:generate       # regenerate Prisma client
npm run db:seed           # seed roles, permissions, admin user
npm run db:studio         # Prisma Studio UI

# Development
cd backend && npm run dev      # backend hot-reload
cd frontend && npm run dev     # frontend dev server

# Testing (run from backend/)
npm test
npm run test:cov

# Linting
npm run lint
```

---

## Health Checks

```
GET /health         # memory
GET /health/db      # PostgreSQL
GET /health/redis   # Redis
```

---

## Default Credentials (dev only)

| Role       | Email                      | Password          |
|------------|----------------------------|-------------------|
| Admin      | admin@mini-erp.local       | Admin@123456      |
| Manager    | manager@mini-erp.local     | Manager@123456    |
| Sales      | sales@mini-erp.local       | Sales@123456      |
| Customer   | customer@mini-erp.local    | Customer@123456   |
| Accountant | accountant@mini-erp.local  | Accountant@123456 |
| Warehouse  | warehouse@mini-erp.local   | Warehouse@123456  |

---

## Production Deployment

```bash
docker compose -f docker-compose.prod.yml up --build -d
```

Requires a `backend/.env` with strong secrets — never commit `.env` to Git.

---

## Database Migrations

```bash
# Create a new migration (run from backend/)
npm run db:migrate -- --name <migration-name>

# Deploy to production (no prompt)
npm run db:migrate:prod

# PostgreSQL backup
docker exec mini-erp-postgres pg_dump -U postgres mini_erp > backup.sql

# Restore
cat backup.sql | docker exec -i mini-erp-postgres psql -U postgres mini_erp
```

---

## Project Structure

```
├── backend/              NestJS API
│   ├── prisma/           Schema + migrations + seed
│   └── src/              App modules
├── frontend/             Next.js (Phase 5)
├── packages/
│   └── tsconfig/         Shared TS configs
├── infrastructure/
│   ├── nginx/            Reverse proxy config
│   └── postgres/         DB init scripts
├── database/
│   ├── seeds/            Additional SQL seeds
│   ├── views/            PostgreSQL views
│   └── functions/        DB functions
├── docker-compose.yml    Dev infra (no API)
└── docker-compose.prod.yml  Production (API + Nginx)
```
