# ARCHITECTURE_GUIDE.md

# Kiến trúc dự án Mini ERP

Tài liệu này dùng để hướng dẫn AI (ChatGPT, Claude, Cursor, Copilot...) tổ chức hoặc refactor source code theo đúng kiến trúc chuẩn của dự án Mini ERP.

---

# Mục tiêu kiến trúc

- Tách biệt domain/business logic khỏi framework
- Dễ scale theo module nghiệp vụ
- Dễ test
- Dễ maintain
- Hạn chế coupling giữa các module
- Có thể mở rộng thành microservices trong tương lai

---

# Cấu trúc thư mục chuẩn

```txt
mini-erp/
├── src/
│
│   ├── modules/                     # Tất cả module nghiệp vụ
│   │
│   │   ├── inventory/              # Quản lý kho
│   │   ├── sales/                  # Bán hàng
│   │   ├── accounting/             # Kế toán
│   │   ├── hr/                     # Nhân sự
│   │   ├── crm/                    # Quản lý khách hàng
│   │
│   ├── shared/                     # Shared kernel
│   │
│   │   ├── domain/                 # Base entity, value object, domain primitives
│   │   ├── events/                 # Event bus, domain events
│   │   ├── infrastructure/         # Logger, auth, cache, database, utils
│
│   ├── config/                     # Config hệ thống
│
│   └── main.ts                     # Entry point
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── scripts/                        # Migration, seed, CLI
├── docs/                           # ADR, tài liệu kiến trúc
└── docker-compose.yml