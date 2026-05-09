---
project_name: 'miniERP_electronic V2'
date: '2026-05-09'
sections_completed: ['technology_stack', 'language_rules', 'framework_rules', 'testing_rules', 'code_quality', 'workflow', 'critical_rules']
status: 'complete'
optimized_for_llm: true
---

# Project Context cho AI Agents

_File này chứa các quy tắc quan trọng mà AI agents PHẢI tuân theo khi implement code trong project này. Tập trung vào các chi tiết không hiển nhiên mà agents có thể bỏ qua._

---

## Technology Stack & Versions

### Monorepo
- npm workspaces: `backend` + `frontend`
- Lệnh root: `npm run dev` (backend), `npm run dev:fe` (frontend)
- Node.js >= 22

### Backend
- NestJS 10.x (CommonJS module)
- Prisma 5.22 (schema tại `backend/database/prisma/schema.prisma`)
- PostgreSQL (port 5433 theo docker-compose)
- Redis / ioredis 5.4 (cache session + permissions, TTL 300s)
- JWT (@nestjs/jwt 10.x), Swagger (@nestjs/swagger 7.4)
- TypeScript 5.6, `emitDecoratorMetadata` + `experimentalDecorators` BẮT BUỘC

### Frontend
- **Next.js 16.2.5** — App Router, có breaking changes so với phiên bản cũ; đọc `node_modules/next/dist/docs/` trước khi viết code
- **React 19.x** — API có thể khác training data
- Tailwind CSS 4.x (PostCSS config, cú pháp khác v3)
- Zustand 5.x (state management)
- TanStack Query 5.x (server state)
- React Hook Form 7.x + Zod 4.x (forms + validation)
- Axios 1.16 (HTTP client với auto-refresh interceptor)
- Sonner 2.x (toast — dùng `toast.success/error`, không dùng alert/window.confirm)
- Radix UI / shadcn-style components (trong `src/components/ui/`)

## Critical Implementation Rules

### TypeScript — Backend (NestJS)

- `tsconfig.json` kế thừa `tsconfig.base.json`, module = `commonjs`, baseUrl = `.`
- Path alias `@/*` → `src/*` — dùng thống nhất trong toàn bộ backend
- `emitDecoratorMetadata: true` và `experimentalDecorators: true` BẮT BUỘC — thiếu là decorators NestJS không hoạt động
- Tất cả DTO phải dùng `class-validator` decorators + `class-transformer`
  - ValidationPipe toàn cục bật `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`
  - Mọi field không khai báo trong DTO sẽ bị strip/reject tự động
- Dùng `async/await` nhất quán, không mix `.then()` trừ khi trong `Promise.all([])`
- Import kiểu: named import, không dùng default export cho services/controllers

### TypeScript — Frontend (Next.js)

- Tất cả component files phải có `"use client"` nếu dùng hooks, state, browser APIs
- Server Components (mặc định) không được import hooks hay browser-only code
- Path alias `@/*` → `src/*`
- Type definitions tập trung tại `src/types/` — không inline type phức tạp trong component
- Dùng `type` thay `interface` cho union types; dùng `interface` cho object shapes có thể extend

### Framework — Backend (NestJS)

#### Auth & Permissions
- `JwtAuthGuard` + `PermissionsGuard` đăng ký global trong `AppModule` — mọi route đều bảo vệ mặc định
- Route public: dùng decorator `@Public()` (từ `src/common/decorators/public.decorator`)
- Bảo vệ route: dùng `@RequirePermissions('perm.code')` (AND logic — phải có TẤT CẢ)
  hoặc `@AnyPermission('perm.a', 'perm.b')` (OR logic — có ÍT NHẤT MỘT)
- `req.user` là object `AuthUser`: `{ id, email, organizationId, roles[], permissions[], linkedCustomerId }`
- Permission cache Redis key: `user:perms:{userId}`, TTL 300s — khi thay đổi role/permission phải xóa cache

#### API Conventions
- Global prefix: `/api`, URI versioning: `/v1` → endpoint dạng `/api/v1/...`
- Health routes (`/health`, `/health/db`, `/health/redis`) exclude khỏi global prefix
- Controller: `@ApiTags()` và `@ApiBearerAuth()` bắt buộc cho Swagger
- POST actions không tạo resource mới (confirm, cancel, send...): thêm `@HttpCode(HttpStatus.OK)`
- Lỗi: ném `NotFoundException`, `BadRequestException`, `ForbiddenException` từ `@nestjs/common`

#### Prisma Conventions
- Schema path: `backend/database/prisma/schema.prisma`
- Field camelCase → DB column snake_case qua `@map("snake_case")`
- Model PascalCase → DB table snake_case qua `@@map("snake_case")`
- Kiểu tiền/số lượng: `Decimal @db.Decimal(18, 2)` — KHÔNG dùng Float
- Soft delete: field `deletedAt DateTime?` — query phải filter `where: { deletedAt: null }`
- Status fields: kiểu `String` (không phải enum Prisma) — giá trị viết HOA: "ACTIVE", "DRAFT", "PENDING"
- Sau khi sửa schema: `npm run db:generate -w @mini-erp/backend` bắt buộc trước khi dùng client mới
- Migration: `npm run db:migrate -w @mini-erp/backend`

#### Redis Caching Pattern
- Session: `session:{sessionIdentifier}`, TTL 300s
- Permissions: `user:perms:{userId}`, TTL 300s
- Set cache: `this.redis.setex(key, 300, JSON.stringify(data))`

### Framework — Frontend (Next.js App Router)

#### Routing & Layout
- Route groups: `(auth)` cho login/register, `(dashboard)` cho app chính
- Layout `(dashboard)/layout.tsx` bọc `<AuthGuard>` + `<Sidebar>` — bảo vệ tự động
- Redirect dùng `router.replace()` — không dùng `router.push()` để tránh history stack rác

#### Auth Store (Zustand)
- Store: `src/store/auth.store.ts` — `useAuthStore()`
- Tokens lưu trong Zustand persist VÀ localStorage song song
- Kiểm tra permission: `useAuthStore().hasPermission('perm.code')` → boolean
- Sidebar tự ẩn/hiện nav items theo permission — không cần kiểm tra thêm trong page

#### API Client
- Dùng `apiClient` từ `src/lib/api/client.ts` — KHÔNG tạo axios instance mới
- Base URL: `process.env.NEXT_PUBLIC_API_URL` (default `http://localhost:3000`) + `/api/v1`
- Auto token refresh: interceptor xử lý 401 tự động, retry request sau khi refresh
- Tổ chức API functions theo module: `src/lib/api/{module}.ts`

#### UI Conventions
- Components tái sử dụng: `src/components/ui/` (Button, Card, Dialog, Input, Select, Badge...)
- Toast: `toast.success()` / `toast.error()` từ `sonner` — không dùng `alert()` / `confirm()`
- Loading: TanStack Query `isLoading` / `isPending`
- Form: React Hook Form + Zod schema, resolver từ `@hookform/resolvers/zod`
- Đa ngôn ngữ: `useLanguage()` từ `src/context/language-context`
- Format tiền/ngày: `src/lib/format.ts`

### Testing Rules

#### Backend
- Test runner: Jest, config trong `backend/package.json`
- Test files: `*.spec.ts` trong `src/`, rootDir = `src`
- Transform: `ts-jest`
- E2E tests: `test/jest-e2e.json` — chạy riêng với `npm run test:e2e -w @mini-erp/backend`
- Coverage: `npm run test:cov -w @mini-erp/backend`
- Inject dependencies: `@nestjs/testing` `Test.createTestingModule()`

#### Frontend
- Test framework: **Vitest + React Testing Library** (đã cấu hình — `vitest.config.ts` + `src/test/setup.ts`)
- Chạy: `npm run test -w @mini-erp/frontend` | watch: `npm run test:watch -w @mini-erp/frontend`
- Không dùng Jest cho frontend — Next.js 16 có issues với Jest transform

#### General
- Unit test: mock `PrismaService` và `RedisService` bằng `jest.fn()`
- Integration test: dùng real database (test DB riêng), không mock Prisma
- Test naming: mô tả behavior — `it('should return 404 when order not found')`

### Code Quality & Style Rules

#### Naming Conventions — Backend
- Files: `kebab-case` — `sales.service.ts`, `auth-user.type.ts`
- Classes: PascalCase — `SalesService`, `CreateQuotationDto`
- Select objects dùng lại: UPPER_SNAKE_CASE const đầu file — `QUOTATION_SELECT`, `ORDER_SELECT`
- DTOs: suffix `Dto` — `CreateQuotationDto`, `QuotationQueryDto`

#### Naming Conventions — Frontend
- Components: PascalCase — `AuthGuard.tsx`, `Sidebar.tsx`
- Hooks: prefix `use` — `useAuthStore`, `useLanguage`
- API files: kebab-case theo module — `sales.ts`, `auth.ts`
- Store files: suffix `.store.ts` — `auth.store.ts`
- Types: `src/types/{module}.ts`

#### Code Organization — Backend
- Mỗi module: `{name}.module.ts`, `{name}.service.ts`, `{name}.controller.ts`, `dto/{name}.dto.ts`
- Prisma select objects: khai báo `const` ở đầu file service, không inline trong method
- Pagination response chuẩn: `{ items, total, page, limit, totalPages }`

#### Code Organization — Frontend
- Pages: `src/app/(dashboard)/{module}/page.tsx`
- Shared components: `src/components/`; UI primitives: `src/components/ui/`
- API calls chỉ trong `src/lib/api/` — không gọi `apiClient` trực tiếp trong component
- Server state (TanStack Query) tách biệt với client state (Zustand)

### Development Workflow Rules

#### Git
- Branch hiện tại: `main`
- Commit format: `feat:`, `fix:`, `refactor:`, `chore:`
- Scope optional: `feat(sales): customer counter-offer on quotations`

#### Chạy development
- Backend: `npm run dev` (root) hoặc `npm run dev -w @mini-erp/backend`
- Frontend: `npm run dev:fe` hoặc `npm run dev -w @mini-erp/frontend`
- Infra (docker): `npm run infra:up` — chạy trước backend
- DB migration: `npm run db:migrate -w @mini-erp/backend`
- DB seed: `npm run db:seed -w @mini-erp/backend`

#### Environment
- Backend env: `backend/.env` (Prisma + docker-compose dùng chung)
- Frontend env: `frontend/.env.local` — `NEXT_PUBLIC_API_URL=http://localhost:3000`
- `DATABASE_URL`: port **5433** (không phải 5432 mặc định PostgreSQL)

#### Docker
- Dev: `docker-compose.yml`, Prod: `docker-compose.prod.yml`
- `npm run infra:reset` xóa sạch volumes — MẤT DATA

### Critical Don't-Miss Rules

#### Anti-patterns Backend — KHÔNG làm
- ❌ KHÔNG dùng `Float` cho tiền/số lượng — dùng `Decimal @db.Decimal(18,2)`
- ❌ KHÔNG tạo Prisma enum cho status — dùng `String` và validate trong DTO
- ❌ KHÔNG query Prisma mà thiếu `where: { deletedAt: null }` cho models có soft-delete (User, Product, Customer)
- ❌ KHÔNG cập nhật inventory/finance trực tiếp từ Sales/Purchase — phải qua event-driven
- ❌ KHÔNG bỏ qua `@HttpCode(HttpStatus.OK)` cho POST action endpoints (201 sẽ sai)
- ❌ KHÔNG để route không có `@RequirePermissions`, `@AnyPermission`, hoặc `@Public()` — guard global reject tất cả

#### Anti-patterns Frontend — KHÔNG làm
- ❌ KHÔNG dùng hooks trong Server Component — gây lỗi build
- ❌ KHÔNG gọi `apiClient` trực tiếp trong component — phải qua `src/lib/api/`
- ❌ KHÔNG tạo axios instance mới — dùng `apiClient` đã có interceptor
- ❌ KHÔNG dùng `router.push()` cho redirect login/logout — dùng `router.replace()`
- ❌ KHÔNG import từ `next/router` — App Router dùng `next/navigation`

#### Business Logic Bắt buộc
- Sales Order: KHÔNG trừ kho trực tiếp — chỉ `reserve` (`reservedQuantity`), kho giảm khi giao hàng qua event
- Delivery confirmed → emit event → Inventory xử lý trừ kho
- Giá bán: snapshot vào `unitPrice` tại thời điểm tạo quotation/order — không query lại Product sau
- API tạo đơn hàng phải idempotent — tránh trùng khi retry
- Finance ledger (`AccountsReceivableLedger`): append-only — KHÔNG UPDATE/DELETE records

#### Prisma Query Gotchas
- `Decimal` từ Prisma trả về `Prisma.Decimal` — cần `.toNumber()` hoặc `.toString()` khi serialize JSON
- Dùng pattern `const CONST_SELECT = {...}` đầu file service cho nested select — tránh N+1
- Paginated queries: `Promise.all([findMany, count])` song song — không await tuần tự

#### Infra
- Redis bắt buộc — backend không start nếu Redis không chạy
- PostgreSQL port **5433** (non-standard) — hay bị nhầm với 5432
- Sau khi sửa `schema.prisma`: PHẢI chạy `db:generate` trước khi compile TypeScript

---

## Usage Guidelines

**Dành cho AI Agents:**
- Đọc file này trước khi implement bất kỳ code nào
- Tuân thủ TẤT CẢ quy tắc — đặc biệt phần Critical Don't-Miss
- Khi không chắc, chọn option chặt chẽ hơn
- Cập nhật file nếu phát hiện pattern mới quan trọng

**Dành cho Developer:**
- Giữ file ngắn gọn, tập trung vào những gì agent hay bỏ qua
- Cập nhật khi thay đổi tech stack hoặc pattern mới
- Xóa rule nào đã trở nên hiển nhiên

_Last Updated: 2026-05-09_
