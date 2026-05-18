# Story 2.3: Supplier Management — Quản lý nhà cung cấp

Status: ready-for-dev

## Story

As an Admin,
I want to create and manage suppliers with contact information and ratings,
So that purchasers can select suppliers when creating purchase orders.

## Acceptance Criteria

1. **Given** tôi tạo supplier với companyName, phone, email, taxCode
   **When** POST /api/v1/suppliers với payload hợp lệ
   **Then** Supplier được tạo với supplierCode tự sinh (SUP-XXXXX), status="ACTIVE"

2. **Given** có danh sách suppliers
   **When** GET /api/v1/suppliers?search=ABB&page=1&limit=20
   **Then** trả về suppliers khớp keyword với pagination chuẩn `{ items, total, page, limit, totalPages }`
   **And** mỗi supplier bao gồm: supplierCode, companyName, contactName, phone, email, rating, status

3. **Given** tôi cập nhật thông tin supplier
   **When** PATCH /api/v1/suppliers/:id với fields cần update
   **Then** thông tin được cập nhật
   **And** AuditLog ghi nhận thay đổi

4. **Given** tôi cập nhật rating của supplier sau khi nhận hàng
   **When** PATCH /api/v1/suppliers/:id với `{ rating: 4 }`
   **Then** rating được lưu (scale 0-5)

5. **Given** tôi soft-delete một supplier không còn hợp tác
   **When** DELETE /api/v1/suppliers/:id
   **Then** `supplier.deletedAt` được set; không còn xuất hiện trong danh sách
   **And** PurchaseOrders cũ vẫn tham chiếu được supplier này

6. **Given** Finance/Admin đang ở trang Suppliers
   **When** trang mở ra
   **Then** danh sách suppliers hiển thị với supplierCode, companyName, rating (5 sao), status badge, actions

## Tasks / Subtasks

- [ ] **Task 1: Backend — Không cần migration** (AC: 1–5)
  - [ ] Verify `suppliers` table tồn tại trong DB (Supplier model có sẵn trong schema.prisma) ✓
  - [ ] Schema: `id, supplierCode, companyName, contactName, phone, email, address, taxCode, rating, status, createdAt, updatedAt, deletedAt`

- [ ] **Task 2: Backend — Add permissions to seed** (AC: 1–5)
  - [ ] Thêm vào mảng `PERMISSIONS` trong `backend/database/seeds/seed.ts`:
    ```typescript
    { code: 'supplier.view',   description: 'View suppliers' },
    { code: 'supplier.create', description: 'Create suppliers' },
    { code: 'supplier.update', description: 'Update suppliers' },
    { code: 'supplier.delete', description: 'Delete suppliers' },
    ```
  - [ ] Thêm permissions vào ROLE_PERMISSIONS cho ADMIN và ACCOUNTANT (ACCOUNTANT chỉ view)
  - [ ] Chạy seed để apply: `npm run db:seed -w @mini-erp/backend`

- [ ] **Task 3: Backend — SuppliersModule scaffold** (AC: 1–5)
  - [ ] Tạo `backend/src/suppliers/` với các files:
    - `suppliers.module.ts`
    - `suppliers.service.ts`
    - `suppliers.controller.ts`
    - `dto/supplier.dto.ts`
  - [ ] Register `SuppliersModule` trong `AppModule`

- [ ] **Task 4: Backend — SuppliersService** (AC: 1–5)
  - [ ] `findAll(query: SupplierQueryDto)` — pagination + search + status filter
  - [ ] `findOne(id)` — with NotFoundException
  - [ ] `create(dto)` — generate supplierCode (SUP-XXXXX), status='ACTIVE'
  - [ ] `update(id, dto)` — merge update; skip undefined fields
  - [ ] `remove(id)` — soft delete: `{ deletedAt: new Date() }`
  - [ ] `generateCode()` — private method, format `SUP-` + last 5 digits of id sequence (chờ sau create rồi update code)

- [ ] **Task 5: Backend — SuppliersController** (AC: 1–5)
  - [ ] `GET /suppliers` — `@RequirePermissions('supplier.view')`
  - [ ] `GET /suppliers/:id` — `@RequirePermissions('supplier.view')`
  - [ ] `POST /suppliers` — `@RequirePermissions('supplier.create')`
  - [ ] `PATCH /suppliers/:id` — `@RequirePermissions('supplier.update')`
  - [ ] `DELETE /suppliers/:id` — `@RequirePermissions('supplier.delete')`

- [ ] **Task 6: Backend — DTOs** (AC: 1–5)
  - [ ] `CreateSupplierDto`: companyName (required), contactName?, phone?, email?, address?, taxCode?, rating?
  - [ ] `UpdateSupplierDto`: all optional (Partial)
  - [ ] `SupplierQueryDto`: search?, status?, page, limit

- [ ] **Task 7: Frontend — API functions** (AC: 6)
  - [ ] Tạo `frontend/src/lib/api/suppliers.ts` với: `listSuppliers`, `getSupplier`, `createSupplier`, `updateSupplier`, `deleteSupplier`

- [ ] **Task 8: Frontend — Types** (AC: 6)
  - [ ] Tạo `frontend/src/types/suppliers.ts`:
    ```typescript
    export interface Supplier {
      id: number;
      supplierCode: string | null;
      companyName: string;
      contactName: string | null;
      phone: string | null;
      email: string | null;
      address: string | null;
      taxCode: string | null;
      rating: number;
      status: string;
      createdAt: string;
    }
    ```

- [ ] **Task 9: Frontend — Suppliers page** (AC: 6)
  - [ ] Tạo `frontend/src/app/(dashboard)/suppliers/page.tsx`
  - [ ] Dùng pattern tương tự `customers/page.tsx`:
    - DataTable với columns: supplierCode, companyName, phone, email, rating (star display), status badge, actions
    - Search input, status filter
    - Create dialog (form: companyName required, contactName, phone, email, address, taxCode)
    - Edit dialog (pre-fill từ existing supplier)
    - Delete confirmation (soft delete)
  - [ ] Thêm "Nhà cung cấp" link vào sidebar (chỉ hiện với supplier.view permission)

- [ ] **Task 10: Frontend — i18n keys** (AC: 6)
  - [ ] Thêm `suppliers` block vào EN và VI trong `frontend/src/lib/i18n.ts` (~10 keys)

- [ ] **Task 11: Backend — Unit tests** (AC: 1–5)
  - [ ] Tạo `backend/src/suppliers/suppliers.service.spec.ts` — 6 tests:
    - `findAll`: pagination + search filter
    - `create`: success + supplierCode generated
    - `update`: success + 404
    - `remove`: soft delete + 404

## Dev Notes

### Architecture Overview

**Files cần tạo mới (NEW):**
```
backend/src/suppliers/suppliers.module.ts
backend/src/suppliers/suppliers.service.ts
backend/src/suppliers/suppliers.controller.ts
backend/src/suppliers/dto/supplier.dto.ts
backend/src/suppliers/suppliers.service.spec.ts
frontend/src/lib/api/suppliers.ts
frontend/src/types/suppliers.ts
frontend/src/app/(dashboard)/suppliers/page.tsx
```

**Files cần modify (MODIFY):**
```
backend/src/app.module.ts             ← register SuppliersModule
backend/database/seeds/seed.ts        ← thêm 4 permissions + role assignments
frontend/src/components/layout/sidebar.tsx  ← thêm Suppliers link
frontend/src/lib/i18n.ts              ← thêm suppliers block
```

---

### Supplier model (đã có trong schema.prisma, không cần migration)

```prisma
model Supplier {
  id           Int       @id @default(autoincrement())
  supplierCode String?   @unique @map("supplier_code") @db.VarChar(100)
  companyName  String    @map("company_name") @db.VarChar(255)
  contactName  String?   @map("contact_name") @db.VarChar(255)
  phone        String?   @db.VarChar(50)
  email        String?   @db.VarChar(255)
  address      String?   @db.Text
  taxCode      String?   @map("tax_code") @db.VarChar(100)
  rating       Int?      @default(0)
  status       String?   @db.VarChar(50)
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")
  deletedAt    DateTime? @map("deleted_at")

  purchaseOrders   PurchaseOrder[]
  apLedger         AccountsPayableLedger[]
  supplierPayments SupplierPayment[]

  @@map("suppliers")
}
```

---

### Backend — supplierCode generation pattern

Follow pattern của `customers.service.ts` `generateCode()`. Chạy sau khi create để lấy `id`:

```typescript
private async generateCode(id: number): Promise<string> {
  return `SUP-${String(id).padStart(5, '0')}`;
}

async create(dto: CreateSupplierDto) {
  const supplier = await this.prisma.supplier.create({
    data: { ...dto, status: 'ACTIVE' },
  });
  const code = await this.generateCode(supplier.id);
  return this.prisma.supplier.update({
    where: { id: supplier.id },
    data: { supplierCode: code },
  });
}
```

---

### Backend — findAll với soft delete filter

```typescript
async findAll(query: SupplierQueryDto) {
  const { search, status, page = 1, limit = 20 } = query;
  const where: any = { deletedAt: null };

  if (status) where.status = status;
  if (search) {
    where.OR = [
      { companyName: { contains: search, mode: 'insensitive' } },
      { supplierCode: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { taxCode: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [items, total] = await Promise.all([
    this.prisma.supplier.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    this.prisma.supplier.count({ where }),
  ]);

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}
```

---

### Backend — Permissions mới cần thêm vào seed

```typescript
// Thêm vào mảng PERMISSIONS:
{ code: 'supplier.view',   description: 'View suppliers' },
{ code: 'supplier.create', description: 'Create suppliers' },
{ code: 'supplier.update', description: 'Update suppliers' },
{ code: 'supplier.delete', description: 'Delete suppliers' },

// ROLE_PERMISSIONS:
ADMIN: [...existing, 'supplier.view', 'supplier.create', 'supplier.update', 'supplier.delete'],
ACCOUNTANT: [...existing, 'supplier.view'],
// WAREHOUSE có thể thêm supplier.view để xem khi nhận hàng
WAREHOUSE: [...existing, 'supplier.view'],
```

---

### Backend — SuppliersModule

```typescript
@Module({
  imports: [PrismaModule],
  controllers: [SuppliersController],
  providers: [SuppliersService],
  exports: [SuppliersService],  // export để Purchase module dùng sau
})
export class SuppliersModule {}
```

---

### Frontend — Star rating display

```tsx
// Hiển thị rating dạng số + (rating)/5 label, hoặc filled stars
function StarRating({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-1 text-sm">
      <span className="text-yellow-500">★</span>
      <span>{rating || 0}/5</span>
    </span>
  );
}
```

---

### Frontend — Sidebar link

Tìm phần customers trong sidebar và thêm suppliers ngay sau:

```tsx
// Tìm trong sidebar component
{ href: '/customers', label: t.nav.customers, permission: 'customer.view_assigned' },
{ href: '/suppliers', label: t.nav.suppliers, permission: 'supplier.view' },
```

Thêm `suppliers` key vào `nav` block trong `i18n.ts`: EN: "Suppliers", VI: "Nhà cung cấp"

---

### Frontend — API pattern (từ customers/page.tsx)

```typescript
// frontend/src/lib/api/suppliers.ts
import api from './client';
import type { Supplier } from '@/types/suppliers';

export const listSuppliers = (params?: Record<string, any>) =>
  api.get<{ items: Supplier[]; total: number; page: number; limit: number; totalPages: number }>('/suppliers', { params });

export const getSupplier = (id: number) => api.get<Supplier>(`/suppliers/${id}`);
export const createSupplier = (data: Partial<Supplier>) => api.post<Supplier>('/suppliers', data);
export const updateSupplier = (id: number, data: Partial<Supplier>) => api.patch<Supplier>(`/suppliers/${id}`, data);
export const deleteSupplier = (id: number) => api.delete(`/suppliers/${id}`);
```

---

### i18n keys cần thêm

```typescript
// Thêm vào cả EN và VI:
suppliers: {
  title: "Suppliers" / "Nhà cung cấp",
  addSupplier: "Add Supplier" / "Thêm nhà cung cấp",
  editSupplier: "Edit Supplier" / "Sửa nhà cung cấp",
  deleteSupplier: "Delete Supplier" / "Xóa nhà cung cấp",
  supplierCode: "Supplier Code" / "Mã NCC",
  contactName: "Contact Name" / "Người liên hệ",
  taxCode: "Tax Code" / "Mã số thuế",
  rating: "Rating" / "Đánh giá",
  active: "Active" / "Hoạt động",
  inactive: "Inactive" / "Không hoạt động",
},
nav: {
  ...existing,
  suppliers: "Suppliers" / "Nhà cung cấp",
}
```

---

### Previous Story Learnings (từ Story 2-2)

1. **Circular dependency**: Export `SuppliersService` từ module để Purchase module dùng sau
2. **No migration needed**: Supplier model đã có trong schema — chỉ cần verify table tồn tại trong DB
3. **Seed update bắt buộc**: Phải thêm permissions mới vào seed + chạy lại để RBAC hoạt động
4. **Pattern reference**: Follow `customers.service.ts` cho CRUD pattern, `catalog.service.ts` cho code generation

## Dev Agent Record

### Debug Log
| # | Issue | Resolution |
|---|-------|------------|

### Completion Notes

### File List

### Change Log
