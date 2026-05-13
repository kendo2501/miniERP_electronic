# Story 1.1: Product Dynamic Attributes — Thuộc tính động sản phẩm

Status: done

## Story

As a Warehouse Manager,
I want to add and manage dynamic key-value attributes for each product (e.g., Công suất, Tiết diện, Điện áp),
so that I can describe technical specifications specific to each type of electrical equipment.

## Acceptance Criteria

1. **Given** tôi đang ở trang Product form (tab "Thuộc tính động")
   **When** tôi thêm một attribute row với key "Công suất" và value "18W" rồi Save
   **Then** attribute được lưu vào bảng `product_attributes` liên kết với productId
   **And** `GET /api/v1/catalog/products/:id` trả về mảng `attributes: [{ id, attrKey, attrValue }]`

2. **Given** tôi tìm kiếm sản phẩm với filter `attrKey=Công suất&attrValue=18W`
   **When** `GET /api/v1/catalog/products?attrKey=Công suất&attrValue=18W` được gọi
   **Then** chỉ trả về products có attribute đó
   **And** pagination chuẩn `{ items, total, page, limit, totalPages }` được áp dụng

3. **Given** tôi xóa một attribute khỏi product rồi Save
   **When** `PUT /api/v1/catalog/products/:id/attributes` được gọi với danh sách mới (không có attribute đó)
   **Then** record bị xóa khỏi `product_attributes`
   **And** product vẫn hoạt động bình thường (các module khác không bị ảnh hưởng)

4. **Given** product không có attribute nào
   **When** `GET /api/v1/catalog/products/:id` được gọi
   **Then** response trả về `attributes: []` (mảng rỗng, không phải null)

## Tasks / Subtasks

- [x] **Task 1: Backend — DTO mới** (AC: 1, 2)
  - [x] Tạo `backend/src/catalog/dto/product-attribute.dto.ts`:
    - `ProductAttributeDto`: `attrKey: string`, `attrValue: string`
    - `UpsertProductAttributesDto`: `attributes: ProductAttributeDto[]`
  - [x] Cập nhật `ProductQueryDto` thêm `attrKey?: string` và `attrValue?: string`

- [x] **Task 2: Backend — Service methods** (AC: 1, 2, 3, 4)
  - [x] Thêm method `upsertProductAttributes(productId, attrs[])` vào `CatalogService`:
    - Dùng transaction Prisma
    - `deleteMany` tất cả attributes cũ của productId
    - `createMany` với danh sách mới
    - Return: attributes sau khi upsert
  - [x] Cập nhật `getProduct(id)` — thêm `attributes: { orderBy: { attrKey: 'asc' } }` vào `include`
  - [x] Cập nhật `getProducts(query)` — thêm filter `attrKey` + `attrValue` vào `where`

- [x] **Task 3: Backend — Controller endpoints** (AC: 1, 2, 3)
  - [x] Thêm endpoint vào `CatalogController`:
    - `PUT /catalog/products/:id/attributes` → `@RequirePermissions('catalog.product.update')`
    - Body: `UpsertProductAttributesDto`
    - Return: attributes array

- [x] **Task 4: Frontend — Tab Thuộc tính động trong Product form** (AC: 1, 3, 4)
  - [x] Tìm file Product form trong `frontend/src/app/(dashboard)/catalog/products/`
  - [x] Thêm Edit Dialog với 2 tabs: "Thông tin chung" và "Thuộc tính động"
  - [x] Attributes tab: dynamic rows với add/remove, save button
  - [x] Khi save: gọi `PUT /api/v1/catalog/products/:id/attributes`
  - [x] Khi load product: populate attributes từ `GET /api/v1/catalog/products/:id`

- [x] **Task 5: Frontend — API client** (AC: 1, 3)
  - [x] Thêm function `updateProductAttributes(productId, attributes)` vào catalog API client
  - [x] Update type `Product` thêm `attributes?: ProductAttribute[]` và type `ProductAttribute`

## Dev Notes

### Trạng thái hiện tại của codebase

**Schema đã sẵn sàng — KHÔNG cần migration:**
```prisma
// backend/database/prisma/schema.prisma (đã có)
model ProductAttribute {
  id        Int    @id @default(autoincrement())
  productId Int    @map("product_id")
  attrKey   String @map("attr_key") @db.VarChar(100)
  attrValue String @map("attr_value") @db.Text

  product Product @relation(fields: [productId], references: [id])

  @@index([productId])
  @@map("product_attributes")
}
```
`Product` model đã có `attributes ProductAttribute[]` relation.

**Catalog service hiện tại:**
- `getProduct(id)` — dùng `include` với category, brand, images, inventoryStocks **nhưng CHƯA có `attributes`** → cần bổ sung
- `getProducts(query)` — filter theo categoryId, brandId, search **nhưng CHƯA có attrKey/attrValue** → cần bổ sung
- Không có method nào xử lý attributes

**Catalog controller hiện tại:**
- Các endpoints products: GET list, GET detail, POST create, PATCH update, POST deactivate, DELETE → **chưa có endpoint attributes**
- Permission hiện tại dùng `catalog.product.update` cho PATCH — tái sử dụng cho PUT attributes

### Patterns bắt buộc phải tuân theo

**Backend (từ `_bmad-output/project-context.md`):**
- Global prefix `/api`, versioning `/v1` → endpoint đầy đủ: `PUT /api/v1/catalog/products/:id/attributes`
- `@ApiTags('Catalog')` và `@ApiBearerAuth()` đã có trên class controller — endpoints mới tự kế thừa
- POST actions không tạo resource mới: thêm `@HttpCode(HttpStatus.OK)` — nhưng PUT replace là idempotent, không cần
- Lỗi: ném `NotFoundException` nếu product không tồn tại (từ `@nestjs/common`)
- DTOs phải dùng `class-validator` decorators, `ValidationPipe` toàn cục bật `whitelist: true`
- `async/await` nhất quán

**Prisma transaction pattern (delete-then-create):**
```typescript
async upsertProductAttributes(productId: number, attrs: { attrKey: string; attrValue: string }[]) {
  const product = await this.prisma.product.findUnique({ where: { id: productId } });
  if (!product || product.deletedAt) throw new NotFoundException(`Product #${productId} not found`);

  return this.prisma.$transaction(async (tx) => {
    await tx.productAttribute.deleteMany({ where: { productId } });
    if (attrs.length > 0) {
      await tx.productAttribute.createMany({
        data: attrs.map(a => ({ productId, attrKey: a.attrKey, attrValue: a.attrValue })),
      });
    }
    return tx.productAttribute.findMany({ where: { productId }, orderBy: { attrKey: 'asc' } });
  });
}
```

**Frontend (từ `_bmad-output/project-context.md`):**
- File component có hooks: phải có `"use client"` ở đầu
- Path alias `@/*` → `src/*`
- Dùng `toast.success/error` từ Sonner cho thông báo (import `{ toast } from 'sonner'`)
- Form: React Hook Form 7 + Zod 4 — nhưng dynamic rows có thể dùng `useFieldArray` từ RHF
- Type definitions: đặt tại `src/types/` hoặc inline nếu đơn giản

### File cần tạo/sửa

| File | Action | Mô tả |
|------|--------|--------|
| `backend/src/catalog/dto/product-attribute.dto.ts` | **TẠO MỚI** | DTO cho attribute |
| `backend/src/catalog/dto/product-query.dto.ts` | **SỬA** | Thêm `attrKey`, `attrValue` |
| `backend/src/catalog/catalog.service.ts` | **SỬA** | Thêm 3 methods, cập nhật 2 methods |
| `backend/src/catalog/catalog.controller.ts` | **SỬA** | Thêm 1 endpoint PUT attributes |
| `frontend/src/app/(dashboard)/catalog/products/` | **SỬA** | Thêm tab + logic attributes |
| `frontend/src/lib/api/catalog.ts` (hoặc tương đương) | **SỬA** | Thêm `updateProductAttributes` |
| `frontend/src/types/` | **SỬA** | Update type Product thêm `attributes` |

### Lưu ý quan trọng

1. **KHÔNG cần migration** — bảng `product_attributes` đã có trong DB (schema đã push)
2. **Chiến lược upsert = delete + createMany** (đơn giản, atomic, tránh conflict unique key nếu sau này thêm constraint)
3. **Không cần endpoint GET riêng** cho attributes — data trả về qua `GET /products/:id` là đủ
4. **Backward compatibility**: `getProducts` list chỉ return product data + 1 ảnh thumbnail — attributes không cần trong list view (quá nặng)
5. **Frontend**: Attributes chỉ load/save trong Product Form page — không cần trong Product List page

### Project Structure Notes

- Backend theo flat structure: `src/{module}/{module}.controller.ts` + `.service.ts` + `dto/` — KHÔNG tạo `domain/` hay `infrastructure/` layer
- Catalog module tại `backend/src/catalog/` — thêm file DTO mới vào `backend/src/catalog/dto/`
- Frontend: kiểm tra structure của product form hiện tại trước khi sửa (có thể đã có tabs hay chưa)

### References

- Schema ProductAttribute: `backend/database/prisma/schema.prisma` dòng 368-378
- Catalog Service hiện tại: `backend/src/catalog/catalog.service.ts`
- Catalog Controller hiện tại: `backend/src/catalog/catalog.controller.ts`
- ProductQueryDto: `backend/src/catalog/dto/product-query.dto.ts`
- Project conventions: `_bmad-output/project-context.md` sections "Framework — Backend" và "Framework — Frontend"
- Epic 1 Story 1.1: `_bmad-output/planning-artifacts/epics.md` dòng 179-200

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6 (dev-story, 2026-05-13)

### Debug Log References

### Completion Notes List

- Schema `ProductAttribute` và `UomConversion` đã có sẵn — không cần migration
- Backend: thêm endpoint `PUT /api/v1/catalog/products/:id/attributes` (delete + createMany trong transaction)
- Backend: `getProduct()` cập nhật include `attributes`, `getProducts()` cập nhật filter `attrKey/attrValue`
- Frontend: Edit Product Dialog mới với 2 tabs — "Thông tin chung" (update fields) và "Thuộc tính động" (dynamic key-value rows)
- Frontend: Nút Edit trên mỗi product row (hiện với permission `catalog.product.update`)
- Frontend: i18n thêm 12 keys mới (EN + VI) cho attributes UI
- TypeScript compile clean — cả backend lẫn frontend không có lỗi

### Senior Developer Review (AI)

**Ngày review:** 2026-05-13
**Kết quả:** Changes Requested

#### Action Items

- [x] [Review][Patch] React render-phase side effect: `setAttrRows` và `editForm.setValue` gọi trong render body, vi phạm React rules — dùng `useEffect` [`frontend/src/app/(dashboard)/catalog/products/page.tsx`]
- [x] [Review][Patch] Unused import `Trash2` từ lucide-react — xóa khỏi import [`frontend/src/app/(dashboard)/catalog/products/page.tsx`]
- [x] [Review][Patch] Missing `@IsNotEmpty()` trên `attrKey` và `attrValue` trong DTO — empty string `""` pass validation [`backend/src/catalog/dto/product-attribute.dto.ts`]
- [x] [Review][Defer] `attrKey`-only filter silently ignored khi không có `attrValue` — design decision, filter yêu cầu cả hai params [`backend/src/catalog/catalog.service.ts`] — deferred, pre-existing design choice

### File List

- `backend/src/catalog/dto/product-attribute.dto.ts` — TẠO MỚI
- `backend/src/catalog/dto/product-query.dto.ts` — SỬA (thêm attrKey, attrValue)
- `backend/src/catalog/catalog.service.ts` — SỬA (upsertProductAttributes, getProduct include attrs, getProducts filter)
- `backend/src/catalog/catalog.controller.ts` — SỬA (thêm PUT products/:id/attributes)
- `frontend/src/types/catalog.ts` — SỬA (thêm ProductAttribute interface, cập nhật Product)
- `frontend/src/lib/api/catalog.ts` — SỬA (thêm updateProductAttributes)
- `frontend/src/lib/i18n.ts` — SỬA (thêm 12 keys EN + VI)
- `frontend/src/app/(dashboard)/catalog/products/page.tsx` — SỬA (Edit Dialog với tabs)
