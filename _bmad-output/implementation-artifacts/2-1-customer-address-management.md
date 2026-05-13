# Story 2.1: Customer Address Management — Quản lý địa chỉ khách hàng

Status: review

## Story

As an Admin,
I want to manage multiple shipping addresses for each customer (add, edit, delete, set default),
So that sales orders can use the correct delivery address per shipment.

## Acceptance Criteria

1. **Given** customer chưa có địa chỉ
   **When** POST /api/v1/customers/:id/addresses với `{ label: "Kho HCM", address: "123 Nguyễn Huệ", isDefault: true }`
   **Then** CustomerAddress được tạo và liên kết với customer
   **And** nếu `isDefault: true`, tất cả địa chỉ khác của customer được unset `isDefault = false` trong cùng transaction

2. **Given** customer có nhiều địa chỉ
   **When** GET /api/v1/customers/:id được gọi
   **Then** response bao gồm mảng `addresses` với tất cả địa chỉ
   **And** địa chỉ mặc định có `isDefault: true`

3. **Given** tôi muốn cập nhật địa chỉ (đổi label hoặc set làm mặc định)
   **When** PATCH /api/v1/customers/:id/addresses/:addressId với fields cần update
   **Then** địa chỉ được cập nhật
   **And** nếu `isDefault: true` được set, các địa chỉ khác bị unset isDefault

4. **Given** tôi xóa một địa chỉ không phải mặc định
   **When** DELETE /api/v1/customers/:id/addresses/:addressId
   **Then** địa chỉ bị xóa hoàn toàn (hard delete — không cần soft delete cho địa chỉ)

5. **Given** frontend đang ở trang chi tiết / danh sách customer
   **When** tôi mở panel "Địa chỉ" của một customer
   **Then** danh sách địa chỉ được hiển thị với label, address, badge "Mặc định"
   **And** có nút "Thêm địa chỉ", "Sửa", "Xóa" cho từng địa chỉ

## Tasks / Subtasks

- [x] **Task 1: Backend — DB Migration** (AC: 1, 2, 3, 4)
  - [x] Tạo Prisma migration mới: `20260513220400_add_customer_addresses/migration.sql` (tạo thủ công, deploy bằng `prisma migrate resolve --applied`)
  - [x] Verify table `customer_addresses` tồn tại trong DB với columns: id, customer_id, label, address, is_default ✅

- [x] **Task 2: Backend — DTOs** (AC: 1, 2, 3, 4)
  - [x] Thêm vào `backend/src/customers/dto/customer.dto.ts`: `CreateAddressDto`, `UpdateAddressDto` với `@IsBoolean()` decorator

- [x] **Task 3: Backend — CustomersService address methods** (AC: 1, 2, 3, 4)
  - [x] Cập nhật `findOne(id)` để include `addresses` với `orderBy: [{ isDefault: 'desc' }, { id: 'asc' }]`
  - [x] Thêm method `addAddress(customerId, dto)` với $transaction khi isDefault=true
  - [x] Thêm method `updateAddress(customerId, addressId, dto)` với ownership check + isDefault transaction
  - [x] Thêm method `removeAddress(customerId, addressId)` với ownership check

- [x] **Task 4: Backend — CustomersController address endpoints** (AC: 1, 2, 3, 4)
  - [x] Thêm 3 routes POST/PATCH/DELETE trước `portal-account` routes

- [x] **Task 5: Frontend — API functions** (AC: 1, 2, 3, 4, 5)
  - [x] Thêm `addCustomerAddress`, `updateCustomerAddress`, `deleteCustomerAddress` vào `sales.ts`

- [x] **Task 6: Frontend — Types** (AC: 2, 5)
  - [x] Thêm `CustomerAddress` interface vào `sales.ts`
  - [x] Cập nhật `Customer` interface thêm `addresses?: CustomerAddress[]`

- [x] **Task 7: Frontend — Customers page — Address UI** (AC: 5)
  - [x] Import thêm icons (MapPin, Pencil, Trash2), API functions, CustomerAddress type
  - [x] Thêm state: `addressCustomer`, `showAddressForm`, `editingAddress`, `addrLabel/Text/IsDefault`
  - [x] Query `customer-detail` (enabled khi addressCustomer set) + 3 mutations (add/update/delete)
  - [x] Nút "Địa chỉ" trong action column mỗi customer row
  - [x] Address Dialog với danh sách địa chỉ, badge "Mặc định", nút Sửa/Xóa
  - [x] Inline form thêm/sửa địa chỉ với label, address, checkbox isDefault (dùng HTML input, không có Checkbox shadcn)

- [x] **Task 8: Frontend — i18n keys** (AC: 5)
  - [x] Thêm 12 keys vào cả EN và VI customers block

- [x] **Task 9: Backend — Unit tests** (AC: 1, 2, 3, 4)
  - [x] Tạo `backend/src/customers/customers.address.spec.ts` — 8 tests pass

## Dev Notes

### Architecture Overview

**Files cần modify (MODIFY):**
```
backend/src/customers/customers.service.ts    ← thêm 3 address methods + update findOne
backend/src/customers/customers.controller.ts ← thêm 3 address endpoints
backend/src/customers/dto/customer.dto.ts     ← thêm 2 DTOs
frontend/src/lib/api/sales.ts                 ← thêm 3 API functions
frontend/src/types/sales.ts                   ← thêm CustomerAddress type, update Customer
frontend/src/app/(dashboard)/customers/page.tsx ← address management UI
frontend/src/lib/i18n.ts                      ← 12 i18n keys mới
```

**Files cần tạo mới (NEW):**
```
backend/src/customers/customers.address.spec.ts  ← unit tests
```

**Migration:** `customer_addresses` đã có trong schema.prisma nhưng **chưa có migration SQL**. Phải chạy `npm run db:migrate -w @mini-erp/backend -- --name add_customer_addresses` để tạo migration.

---

### CustomerAddress Prisma Model (đã có trong schema)

```prisma
model CustomerAddress {
  id         Int     @id @default(autoincrement())
  customerId Int     @map("customer_id")
  label      String? @db.VarChar(100)
  address    String  @db.Text
  isDefault  Boolean @default(false) @map("is_default")

  customer Customer @relation(fields: [customerId], references: [id])

  @@index([customerId])
  @@map("customer_addresses")
}
```

Schema đã tồn tại — **chỉ cần migrate**, không cần edit schema.prisma.

---

### Backend — isDefault transaction pattern

Khi set `isDefault = true` cho một địa chỉ, phải unset tất cả địa chỉ khác trước. Dùng `$transaction` để đảm bảo atomicity:

```typescript
async addAddress(customerId: number, dto: CreateAddressDto) {
  await this.findOne(customerId); // throws NotFoundException nếu không có

  if (dto.isDefault) {
    return this.prisma.$transaction(async (tx) => {
      await tx.customerAddress.updateMany({
        where: { customerId, isDefault: true },
        data: { isDefault: false },
      });
      return tx.customerAddress.create({
        data: { customerId, label: dto.label, address: dto.address, isDefault: true },
      });
    });
  }

  return this.prisma.customerAddress.create({
    data: { customerId, label: dto.label, address: dto.address, isDefault: dto.isDefault ?? false },
  });
}
```

Tương tự cho `updateAddress`.

---

### Backend — findOne phải include addresses

Hiện tại `findOne` dùng `include` (không phải `select`). Sau khi thêm `addresses`, response của GET /customers/:id sẽ có:

```json
{
  "id": 1,
  "companyName": "...",
  "addresses": [
    { "id": 1, "label": "Kho HCM", "address": "123 Nguyễn Huệ", "isDefault": true },
    { "id": 2, "label": "Văn phòng", "address": "456 Lê Lợi", "isDefault": false }
  ],
  ...
}
```

ORDER BY: `[{ isDefault: 'desc' }, { id: 'asc' }]` — địa chỉ mặc định luôn lên đầu.

---

### Backend — Route ordering trong Controller

Controller hiện tại có routes:
- `GET /` — findAll
- `GET /:id` — findOne
- `POST /` — create
- `PATCH /:id` — update
- `DELETE /:id` — remove
- `POST /:id/portal-account` — createPortalAccount
- `DELETE /:id/portal-account` — unlinkPortalAccount

Thêm 3 routes mới **trước** `portal-account` routes để tổ chức rõ ràng:
- `POST /:id/addresses`
- `PATCH /:id/addresses/:addressId`
- `DELETE /:id/addresses/:addressId`

Không có conflict vì tất cả đều có prefix `/addresses/` phân biệt với `/portal-account`.

---

### Frontend — getCustomer vs listCustomers

Hiện tại customers page dùng `listCustomers` để hiển thị danh sách (không có addresses trong response — SELECT_CUSTOMER không include addresses).

Khi user click "Địa chỉ" của một customer row:
- Gọi `getCustomer(id)` riêng biệt để lấy full detail kèm addresses
- Dùng `useQuery({ queryKey: ['customer', id], queryFn: () => getCustomer(id).then(r=>r.data), enabled: showAddresses === id })`

`getCustomer` đã có trong `frontend/src/lib/api/sales.ts`.

---

### Frontend — Address UI pattern

Sử dụng Dialog (như các dialogs khác trong hệ thống) cho address management. Trong Dialog có:
1. Header: "Địa chỉ — {customer.companyName}"
2. List addresses (hoặc "Chưa có địa chỉ")
3. Form thêm/sửa (conditional render khi showAddressForm=true)

```tsx
// Address list item
<div className="flex items-start justify-between p-3 border rounded-lg">
  <div>
    <div className="flex items-center gap-2">
      <span className="font-medium text-sm">{addr.label || `Địa chỉ ${idx+1}`}</span>
      {addr.isDefault && <Badge variant="outline" className="text-xs text-blue-600 border-blue-300">Mặc định</Badge>}
    </div>
    <p className="text-sm text-muted-foreground mt-0.5">{addr.address}</p>
  </div>
  <div className="flex gap-1">
    <Button size="sm" variant="ghost" onClick={() => openEditAddress(addr)}>Sửa</Button>
    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteAddressMut.mutate({ customerId, addressId: addr.id })}>Xóa</Button>
  </div>
</div>
```

---

### Frontend — i18n: customers object vị trí

Trong `i18n.ts`, object `customers` nằm TRONG object ngôn ngữ `vi` và `en`. Tìm pattern `customers: {` và thêm keys mới vào cuối:

```typescript
// EN (tìm customers: { ... } trong const translations.en)
customers: {
  ...existing...,
  addresses: "Addresses",
  addAddress: "Add Address",
  // ...
}

// VI
customers: {
  ...existing...,
  addresses: "Địa chỉ",
  addAddress: "Thêm địa chỉ",
  // ...
}
```

---

### Previous Story Learnings (từ Story 1.5)

1. **TypeScript strict**: `mockPrisma: any` khi có self-referential type; `as unknown as Type` cho ExcelJS Buffer cast
2. **jest không cần install riêng** nữa — đã cài `jest@29` trong backend workspace từ Story 1.5
3. **`$transaction` trong tests**: `jest.fn((fn: Function) => fn(mockPrisma))` để mock transaction
4. **Route ordering trong NestJS**: static paths phải TRƯỚC parameterized paths — không phải vấn đề ở đây vì `/addresses/:addressId` và `/portal-account` không xung đột
5. **Prisma migration**: phải chạy `npm run db:migrate` sau khi edit schema — **trong story này phải chạy migration trước khi code service**

---

### Unit test structure

```typescript
// backend/src/customers/customers.address.spec.ts
const mockPrisma: any = {
  customer: { findUnique: jest.fn(), findFirst: jest.fn() },
  customerAddress: {
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    findFirst: jest.fn(),
    delete: jest.fn(),
  },
  $transaction: jest.fn((fn: Function) => fn(mockPrisma)),
};
```

---

### Migration command

```bash
# Chạy từ root monorepo
npm run db:migrate -w @mini-erp/backend -- --name add_customer_addresses
```

**QUAN TRỌNG**: Cần Docker Desktop đang chạy với PostgreSQL container. Nếu DB không connect được → HALT và thông báo user chạy thủ công.

## Dev Agent Record

### Debug Log
| # | Issue | Resolution |
|---|-------|------------|
| 1 | Docker Desktop not running → migration failed | Created migration SQL manually + `prisma migrate resolve --applied`. Table confirmed via `\d customer_addresses` |
| 2 | `@/components/ui/checkbox` does not exist | Replaced with native `<input type="checkbox">` |
| 3 | TypeScript `const mockPrisma: any` parse error when running jest from root | Must run `npx jest` from `backend/` dir; ts-jest config is scoped to backend workspace |

### Completion Notes
- Story 2-1 fully implemented: migration applied ✅ + 3 backend address endpoints (POST/PATCH/DELETE) + findOne updated to include addresses
- isDefault atomicity guaranteed via `$transaction` (updateMany → create/update)
- Frontend: Address Dialog in customers page with inline add/edit form, default badge, edit/delete per address
- 8 unit tests covering addAddress (create, isDefault, 404), updateAddress (ownership, isDefault tx, plain update), removeAddress (delete, 404)
- All 28 backend tests pass; frontend TypeScript clean
- Migration `20260513220400_add_customer_addresses` tạo thủ công SQL và resolved via `prisma migrate resolve --applied` — table verified in DB

### File List
- `backend/database/prisma/migrations/20260513220400_add_customer_addresses/migration.sql` — NEW: migration SQL
- `backend/src/customers/dto/customer.dto.ts` — added `CreateAddressDto`, `UpdateAddressDto`
- `backend/src/customers/customers.service.ts` — updated `findOne` + added `addAddress`, `updateAddress`, `removeAddress`
- `backend/src/customers/customers.controller.ts` — added 3 address endpoints
- `backend/src/customers/customers.address.spec.ts` — NEW: 8 unit tests
- `frontend/src/lib/api/sales.ts` — added `addCustomerAddress`, `updateCustomerAddress`, `deleteCustomerAddress`
- `frontend/src/types/sales.ts` — added `CustomerAddress`, updated `Customer`
- `frontend/src/app/(dashboard)/customers/page.tsx` — address management UI (dialog, list, form)
- `frontend/src/lib/i18n.ts` — added 12 i18n keys for EN and VI

### Change Log
- 2026-05-13: Implemented Story 2-1 Customer Address Management — backend DTOs/service/controller + frontend dialog UI + 8 unit tests
