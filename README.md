# Mini-ERP Electronic V2

Production-ready Fullstack B2B Mini-ERP — NestJS · Next.js · PostgreSQL · Prisma · Redis · MinIO

---

## Stack

| Layer    | Tech                                           |
|----------|------------------------------------------------|
| Backend  | NestJS 10 · Prisma 5 · PostgreSQL · Redis      |
| Frontend | Next.js 16 · TailwindCSS 4 · Radix UI · Zustand|
| Infra    | Docker · MinIO · Mailpit · Nginx               |
| Monorepo | npm workspaces                                 |

---

## Yêu cầu cài đặt (Prerequisites)

Trước khi bắt đầu, cần cài sẵn các phần mềm sau:

| Phần mềm       | Phiên bản tối thiểu | Tải về                                      |
|----------------|---------------------|---------------------------------------------|
| Node.js        | >= 22               | https://nodejs.org                          |
| Docker Desktop | mới nhất            | https://www.docker.com/products/docker-desktop |

> Kiểm tra đã cài chưa:
> ```bash
> node -v      # phải >= v22.x.x
> docker -v    # phải có output
> ```

---

## Hướng dẫn cài đặt cho máy mới

### Bước 1 — Clone project

```bash
git clone https://github.com/kendo2501/miniERP_electronic.git
cd miniERP_electronic
```

### Bước 2 — Cài dependencies

Chạy 1 lệnh ở root, npm tự cài cho cả backend lẫn frontend:

```bash
npm install
```

### Bước 3 — Tạo file cấu hình môi trường

```bash
cp backend/.env.example backend/.env
```

File `backend/.env` đã có sẵn giá trị mặc định cho môi trường dev, **không cần chỉnh sửa gì** để chạy local.

### Bước 4 — Khởi động hạ tầng (Docker)

```bash
npm run infra:up
```

Lệnh này khởi động toàn bộ services: PostgreSQL, Redis, MinIO, Mailpit, PgAdmin.

> Lần đầu chạy Docker sẽ pull images — có thể mất vài phút tùy tốc độ mạng.

Kiểm tra services đã lên chưa:

```bash
docker ps
```

Phải thấy các container: `mini-erp-postgres`, `mini-erp-redis`, `mini-erp-minio`, `mini-erp-mailpit`, `mini-erp-pgadmin`.

### Bước 5 — Tạo bảng database (Migration)

```bash
npm run db:migrate
```

### Bước 6 — Tạo dữ liệu mẫu (Seed)

```bash
npm run db:seed
```

Lệnh này tạo: 6 tài khoản người dùng, roles, permissions, sản phẩm mẫu, kho hàng, đơn hàng, hoá đơn...

### Bước 7 — Chạy dự án

Mở **2 terminal riêng biệt**:

**Terminal 1 — Backend:**
```bash
npm run dev
```
Backend chạy tại: http://localhost:3000

**Terminal 2 — Frontend:**
```bash
npm run dev:fe
```
Frontend chạy tại: http://localhost:3001

---

## Tài khoản đăng nhập theo từng Role

Sau khi seed xong, có thể đăng nhập tại http://localhost:3001 với các tài khoản sau:

### Admin — Toàn quyền hệ thống

| Trường   | Giá trị                  |
|----------|--------------------------|
| Email    | admin@mini-erp.local     |
| Password | Admin@123456             |

Quyền hạn: quản lý users, roles, permissions, toàn bộ catalog, inventory, sales, finance, settings, audit log.

---

### Manager — Quản lý vận hành

| Trường   | Giá trị                  |
|----------|--------------------------|
| Email    | manager@mini-erp.local   |
| Password | Manager@123456           |

Quyền hạn: duyệt báo giá, duyệt đơn hàng, xem báo cáo team, xem tồn kho, xem hoá đơn & công nợ.

---

### Sales — Nhân viên kinh doanh

| Trường   | Giá trị               |
|----------|-----------------------|
| Email    | sales@mini-erp.local  |
| Password | Sales@123456          |

Quyền hạn: tạo báo giá, tạo đơn hàng, quản lý khách hàng được phân công, xem hoá đơn & thanh toán của khách hàng mình phụ trách.

---

### Customer — Khách hàng tự phục vụ

| Trường   | Giá trị                   |
|----------|---------------------------|
| Email    | customer@mini-erp.local   |
| Password | Customer@123456           |

Quyền hạn: xem đơn hàng của mình, xem báo giá của mình, xem hoá đơn & trạng thái thanh toán của mình, tải file đính kèm.

---

### Accountant — Kế toán

| Trường   | Giá trị                    |
|----------|----------------------------|
| Email    | accountant@mini-erp.local  |
| Password | Accountant@123456          |

Quyền hạn: xem & xuất hoá đơn, quản lý thanh toán, hoàn trả thanh toán, xem báo cáo tài chính, xem aging report (công nợ quá hạn).

---

### Warehouse — Thủ kho

| Trường   | Giá trị                   |
|----------|---------------------------|
| Email    | warehouse@mini-erp.local  |
| Password | Warehouse@123456          |

Quyền hạn: xem & điều chỉnh tồn kho, chuyển kho, duyệt điều chỉnh/chuyển kho, quản lý nhà kho, xem cảnh báo hàng sắp hết.

---

## Services & URLs

| Service    | URL                              | Tài khoản                        |
|------------|----------------------------------|----------------------------------|
| Frontend   | http://localhost:3001            | Xem bảng tài khoản ở trên        |
| Backend API| http://localhost:3000            | —                                |
| Swagger    | http://localhost:3000/api/docs   | —                                |
| PgAdmin    | http://localhost:5050            | admin@example.com / admin        |
| MinIO      | http://localhost:9001            | minioadmin / minioadmin          |
| Mailpit    | http://localhost:8025            | —                                |
| PostgreSQL | localhost:5433                   | postgres / postgres              |
| Redis      | localhost:6379                   | —                                |

---

## Lệnh thường dùng

```bash
# Infrastructure
npm run infra:up       # khởi động tất cả Docker services
npm run infra:down     # tắt services
npm run infra:reset    # tắt và xoá toàn bộ data volumes

# Database
npm run db:migrate     # chạy migration (tạo/cập nhật bảng)
npm run db:generate    # tái tạo Prisma client sau khi sửa schema
npm run db:seed        # seed dữ liệu mẫu

# Development
npm run dev            # chạy backend (hot-reload)
npm run dev:fe         # chạy frontend (hot-reload)

# Build
npm run build          # build backend
npm run build:fe       # build frontend

# Test & Lint
npm run test
npm run lint
```

---

## Health Check API

```
GET http://localhost:3000/health        # kiểm tra bộ nhớ
GET http://localhost:3000/health/db     # kiểm tra kết nối PostgreSQL
GET http://localhost:3000/health/redis  # kiểm tra kết nối Redis
```

---

## Cấu trúc thư mục

```
├── backend/                    NestJS API
│   ├── database/
│   │   ├── prisma/             Schema, migrations
│   │   └── seeds/              Seed data
│   ├── src/
│   │   ├── auth/               Xác thực JWT
│   │   ├── users/              Quản lý người dùng
│   │   ├── catalog/            Sản phẩm, danh mục, thương hiệu
│   │   ├── inventory/          Tồn kho, kho hàng
│   │   ├── sales/              Báo giá, đơn hàng, giao hàng
│   │   ├── finance/            Hoá đơn, thanh toán
│   │   ├── customers/          Quản lý khách hàng
│   │   ├── notifications/      Thông báo
│   │   ├── audit/              Audit log
│   │   ├── reporting/          Báo cáo & dashboard
│   │   └── common/             Guards, decorators, types dùng chung
│   └── .env                    Cấu hình môi trường
├── frontend/                   Next.js App Router
│   └── src/
│       ├── app/                Pages (dashboard, auth)
│       ├── components/         UI components
│       ├── lib/                API client, i18n, utils
│       ├── store/              Zustand state (auth)
│       └── types/              TypeScript types
├── docker-compose.yml          Dev infrastructure
├── docker-compose.prod.yml     Production deployment
└── package.json                npm workspaces root
```
