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

| Phần mềm       | Phiên bản tối thiểu | Tải về                                         |
|----------------|---------------------|------------------------------------------------|
| Node.js        | >= 22               | https://nodejs.org                             |
| Docker Desktop | mới nhất            | https://www.docker.com/products/docker-desktop |
| Git            | mới nhất            | https://git-scm.com                            |

Kiểm tra đã cài đúng chưa (chạy trong terminal):

```powershell
node -v     # phải in ra v22.x.x trở lên
docker -v   # phải in ra Docker version ...
git --version
```

---

## Hướng dẫn cài đặt cho máy mới (từng bước chi tiết)

### Bước 1 — Mở Docker Desktop

**Quan trọng:** Docker Desktop phải đang **chạy** (không chỉ cài), biểu tượng Docker phải xuất hiện ở system tray (góc dưới bên phải màn hình Windows).

Nếu chưa mở: tìm **Docker Desktop** trong Start Menu và mở lên, chờ đến khi icon Docker không còn loading.

---

### Bước 2 — Clone project

```powershell
git clone https://github.com/kendo2501/miniERP_electronic.git
cd miniERP_electronic
```

---

### Bước 3 — Cài dependencies

Chạy 1 lệnh ở root, npm tự cài cho cả backend lẫn frontend:

```powershell
npm install
```

> Quá trình này mất 1–3 phút lần đầu.

---

### Bước 4 — Khởi động hạ tầng (Docker)

```powershell
npm run infra:up
```

Lệnh này pull images (lần đầu) và khởi động: PostgreSQL · Redis · MinIO · Mailpit · PgAdmin.

> **Lần đầu chạy** Docker sẽ tải images về — có thể mất 3–10 phút tùy tốc độ mạng.

Kiểm tra tất cả containers đã lên và **healthy** chưa:

```powershell
docker ps
```

Chờ đến khi cột `STATUS` của `mini-erp-postgres` hiển thị `healthy` (không phải `starting`):

```
CONTAINER ID   IMAGE              ...   STATUS
xxxxxxxxxxxx   postgres:16-alpine ...   Up 30 seconds (healthy)   ← phải thấy (healthy)
xxxxxxxxxxxx   redis:7-alpine     ...   Up 30 seconds (healthy)
...
```

> Nếu PostgreSQL vẫn `starting` sau 30 giây, chạy `docker ps` lại sau vài giây.

---

### Bước 5 — Tạo bảng database (Migration)

**Chỉ chạy bước này sau khi `mini-erp-postgres` đã `healthy`.**

```powershell
npm run db:migrate
```

Prisma sẽ tạo toàn bộ bảng trong database `mini_erp`.

---

### Bước 6 — Tạo dữ liệu mẫu (Seed)

```powershell
npm run db:seed
```

Lệnh này tạo: 6 tài khoản người dùng, roles, permissions, sản phẩm mẫu, kho hàng, đơn hàng, hoá đơn...

---

### Bước 7 — Chạy dự án

Mở **2 terminal riêng biệt** (cả 2 đều ở thư mục root của project):

**Terminal 1 — Backend:**
```powershell
npm run dev
```
Backend chạy tại: http://localhost:3001

**Terminal 2 — Frontend:**
```powershell
npm run dev:fe
```
Frontend chạy tại: http://localhost:3000

---

## Xử lý lỗi thường gặp khi cài máy mới

### Lỗi: `P1000: Authentication failed` khi chạy `db:migrate`

**Nguyên nhân:** Docker chưa chạy hoặc container PostgreSQL chưa healthy.

**Cách fix:**
1. Kiểm tra Docker Desktop đang mở
2. Chạy `docker ps` — xem `mini-erp-postgres` có STATUS `healthy` chưa
3. Nếu chưa có container nào, chạy lại: `npm run infra:up`
4. Chờ healthy rồi mới chạy `npm run db:migrate`

---

### Lỗi: `address already in use` hoặc port conflict khi `infra:up`

**Nguyên nhân:** Máy đang có PostgreSQL local hoặc dịch vụ khác chiếm port 5433.

**Cách kiểm tra (PowerShell):**
```powershell
netstat -ano | findstr :5433
netstat -ano | findstr :6379
```

Nếu có process lạ giữ port, dừng dịch vụ đó hoặc báo lại với team để chỉnh port trong `docker-compose.yml` và `backend/.env`.

---

### Lỗi: `Cannot find module` sau khi `npm install`

```powershell
npm run db:generate
```

Lệnh này tái tạo Prisma client. Chạy lại `npm run dev` sau đó.

---

### Reset hoàn toàn (khi muốn làm mới từ đầu)

```powershell
npm run infra:reset   # xoá toàn bộ Docker volumes (mất data)
npm run infra:up      # khởi động lại
# chờ postgres healthy
npm run db:migrate
npm run db:seed
```

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
| Liên kết | Xây Dựng Hoàng Phát (CUST-001) |

| Trường      | Giá trị                             |
|-------------|-------------------------------------|
| Email       | nhatminh@portal.local               |
| Password    | Customer@123456                     |
| Họ tên      | Trần Thị Bích                       |
| Liên kết    | Điện Nhật Minh (CUST-002)           |

| Trường      | Giá trị                             |
|-------------|-------------------------------------|
| Email       | phulong@portal.local                |
| Password    | Customer@123456                     |
| Họ tên      | Lê Văn Cường                        |
| Liên kết    | Cơ Điện Phú Long (CUST-003)         |

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
| Frontend   | http://localhost:3000            | Xem bảng tài khoản ở trên        |
| Backend API| http://localhost:3001            | —                                |
| Swagger    | http://localhost:3001/api/docs   | —                                |
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
GET http://localhost:3001/health        # kiểm tra bộ nhớ
GET http://localhost:3001/health/db     # kiểm tra kết nối PostgreSQL
GET http://localhost:3001/health/redis  # kiểm tra kết nối Redis
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
