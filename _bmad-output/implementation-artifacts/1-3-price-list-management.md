# Story 1.3: Price List Management — Quản lý bảng giá

Status: done

## Story

As a Warehouse Manager,
I want to create and manage price lists that apply to different customer tiers, quantities, or specific customers with time validity,
So that the system automatically calculates the correct selling price when creating quotations.

## Acceptance Criteria

1. **Given** tôi tạo price list với applyTo="TIER", customerTier="Cấp 1", validFrom="2026-06-01"
   **When** POST /api/v1/price-lists được gọi với payload hợp lệ
   **Then** PriceList được tạo với status active
   **And** tôi có thể thêm products vào price list với unitPrice và minQuantity

2. **Given** có price list "Cấp 1" với sản phẩm A giá 100,000 và price list "Cấp 2" với sản phẩm A giá 120,000
   **When** GET /api/v1/price-lists/lookup?customerId=X&productId=Y&quantity=5 được gọi
   **Then** API trả về unitPrice đúng dựa trên customer tier và quantity (hỗ trợ tiered pricing)

3. **Given** một price list hết hạn (validTo < ngày hôm nay)
   **When** lookup API được gọi
   **Then** price list hết hạn không được áp dụng; fallback về minPrice của Product nếu không có bảng giá hợp lệ

4. **Given** tôi xem danh sách price lists
   **When** GET /api/v1/price-lists được gọi
   **Then** trả về danh sách với thông tin: tên, applyTo, validFrom, validTo, isDefault, số sản phẩm

## Tasks / Subtasks

- [x] **Task 1: Backend — DTOs** (AC: 1, 2, 3, 4)
  - [x] Tạo `backend/src/catalog/dto/price-list.dto.ts` với:
    - `CreatePriceListDto`: name (required), applyTo?, customerTier?, customerId?, validFrom?, validTo?, isDefault?
    - `CreatePriceListItemDto`: productId (required), unitPrice (required), minQuantity (default 1)
    - `PriceListLookupQueryDto`: productId (required), quantity (optional, default 1), customerId (optional), customerTier (optional)

- [x] **Task 2: Backend — PriceListService** (AC: 1, 2, 3, 4)
  - [x] Tạo `backend/src/catalog/price-list.service.ts` với methods:
    - `listPriceLists()` — list all với item count
    - `getPriceList(id)` — detail với items + product info
    - `createPriceList(dto)` — tạo mới
    - `updatePriceList(id, dto)` — cập nhật header
    - `addItem(priceListId, dto)` — thêm item (upsert by productId)
    - `removeItem(priceListId, itemId)` — xoá item
    - `lookupPrice(query)` — lookup logic theo priority

- [x] **Task 3: Backend — PriceListController** (AC: 1, 2, 3, 4)
  - [x] Tạo `backend/src/catalog/price-list.controller.ts` với prefix `price-lists`
  - [x] Register trong `catalog.module.ts`

- [x] **Task 4: Frontend — Types và API client** (AC: 1, 4)
  - [x] Thêm `PriceList`, `PriceListItem`, `PriceListLookupResult` vào `frontend/src/types/catalog.ts`
  - [x] Tạo `frontend/src/lib/api/price-list.ts` với các hàm gọi API

- [x] **Task 5: Frontend — Price Lists page** (AC: 1, 4)
  - [x] Tạo `frontend/src/app/(dashboard)/catalog/price-lists/page.tsx`
  - [x] Table list + Create dialog + Edit dialog (2 tabs: Header info | Items)
  - [x] Thêm i18n keys vào `frontend/src/lib/i18n.ts`

## Dev Notes

### Architecture Overview

**Backend structure:**
```
backend/src/catalog/
  dto/price-list.dto.ts         ← NEW
  price-list.service.ts         ← NEW (separate service, registered in CatalogModule)
  price-list.controller.ts      ← NEW (separate controller, registered in CatalogModule)
  catalog.module.ts             ← MODIFY (add PriceListService, PriceListController)
  catalog.service.ts            ← NO CHANGE
  catalog.controller.ts         ← NO CHANGE
```

**Why separate service/controller (not extending existing):** `catalog.service.ts` is already 265 lines. PriceLists have distinct CRUD + lookup logic. Keeping separate avoids bloat and makes code reviewable. Both are still registered in `CatalogModule` — no new NestJS module needed.

**Frontend structure:**
```
frontend/src/
  types/catalog.ts                                    ← MODIFY (add types)
  lib/api/price-list.ts                               ← NEW
  app/(dashboard)/catalog/price-lists/page.tsx        ← NEW
  lib/i18n.ts                                         ← MODIFY
```

### Backend — DTOs (`price-list.dto.ts`)

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsNotEmpty, MaxLength, IsOptional, IsBoolean,
  IsInt, IsPositive, IsNumber, Min, IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePriceListDto {
  @ApiProperty({ example: 'Bảng giá Cấp 1' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  declare name: string;

  @ApiPropertyOptional({ example: 'TIER', enum: ['TIER', 'CUSTOMER', 'DEFAULT'] })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  declare applyTo?: string;

  @ApiPropertyOptional({ example: 'Cấp 1' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  declare customerTier?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @IsPositive()
  declare customerId?: number;

  @ApiPropertyOptional({ example: '2026-06-01' })
  @IsOptional()
  @IsDateString()
  declare validFrom?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  declare validTo?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  declare isDefault?: boolean;
}

export class CreatePriceListItemDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @IsPositive()
  declare productId: number;

  @ApiProperty({ example: 100000 })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  declare unitPrice: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0.000001)
  declare minQuantity?: number;
}

export class PriceListLookupQueryDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  declare productId: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0.000001)
  declare quantity?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  declare customerId?: number;

  @ApiPropertyOptional({ example: 'Cấp 1' })
  @IsOptional()
  @IsString()
  declare customerTier?: string;
}
```

**Important:** `@Type(() => Number)` từ `class-transformer` bắt buộc cho query params để convert string → number. Phải import `Transform` or `Type` decorator.

### Backend — PriceListService lookup logic

Lookup priority (most specific wins):
1. **Customer-specific** (`applyTo='CUSTOMER'`, `customerId` matches) — highest priority
2. **Tier-specific** (`applyTo='TIER'`, `customerTier` matches)
3. **Default** (`isDefault=true`)

For each priority level, filter by:
- `validFrom <= today OR validFrom IS NULL`
- `validTo >= today OR validTo IS NULL` (expired lists excluded)
- Has item for the product with `minQuantity <= requested quantity`

Among matching items in same priority, pick the one with **highest minQuantity <= quantity** (quantity break pricing — e.g., buy 10+ gets tier price vs buy 1 gets standard).

Fallback chain: if no valid price list item found → return `product.minPrice`.

```typescript
async lookupPrice(query: PriceListLookupQueryDto): Promise<{ unitPrice: string; source: string }> {
  const today = new Date();
  const quantity = query.quantity ?? 1;

  // Build base where clause for active price lists
  const activeWhere = {
    AND: [
      { OR: [{ validFrom: null }, { validFrom: { lte: today } }] },
      { OR: [{ validTo: null }, { validTo: { gte: today } }] },
    ],
  };

  // Helper: find best item from a set of priceLists for this product+quantity
  const findBestItem = (priceLists: any[]) => {
    const candidates = priceLists
      .flatMap((pl) => pl.items)
      .filter((item) => item.productId === query.productId && Number(item.minQuantity) <= quantity)
      .sort((a, b) => Number(b.minQuantity) - Number(a.minQuantity)); // highest threshold first
    return candidates[0] ?? null;
  };

  // 1. Customer-specific
  if (query.customerId) {
    const lists = await this.prisma.priceList.findMany({
      where: { ...activeWhere, applyTo: 'CUSTOMER', customerId: query.customerId },
      include: { items: { where: { productId: query.productId } } },
    });
    const item = findBestItem(lists);
    if (item) return { unitPrice: String(item.unitPrice), source: 'customer-specific' };
  }

  // 2. Tier-specific
  if (query.customerTier) {
    const lists = await this.prisma.priceList.findMany({
      where: { ...activeWhere, applyTo: 'TIER', customerTier: query.customerTier },
      include: { items: { where: { productId: query.productId } } },
    });
    const item = findBestItem(lists);
    if (item) return { unitPrice: String(item.unitPrice), source: 'tier' };
  }

  // 3. Default price list
  const defaultLists = await this.prisma.priceList.findMany({
    where: { ...activeWhere, isDefault: true },
    include: { items: { where: { productId: query.productId } } },
  });
  const defaultItem = findBestItem(defaultLists);
  if (defaultItem) return { unitPrice: String(defaultItem.unitPrice), source: 'default' };

  // 4. Fallback: product.minPrice
  const product = await this.prisma.product.findUnique({
    where: { id: query.productId },
    select: { minPrice: true },
  });
  return { unitPrice: String(product?.minPrice ?? 0), source: 'fallback-minprice' };
}
```

**IMPORTANT — Decimal serialization:** `unitPrice` and `minQuantity` từ Prisma là `Decimal` type, serialize thành **string** trong JSON response. Frontend phải dùng `String()` khi lưu state, `parseFloat()` khi gửi lên API. Đây là pattern đã học từ Story 1.2.

### Backend — PriceListController

```typescript
@ApiTags('Price Lists')
@ApiBearerAuth()
@Controller('price-lists')
export class PriceListController {
  constructor(private service: PriceListService) {}

  @Get()
  @RequirePermissions('catalog.pricelist.view')
  list() { return this.service.listPriceLists(); }

  @Get('lookup')
  @RequirePermissions('catalog.pricelist.view')
  lookup(@Query() query: PriceListLookupQueryDto) { return this.service.lookupPrice(query); }

  @Get(':id')
  @RequirePermissions('catalog.pricelist.view')
  getOne(@Param('id', ParseIntPipe) id: number) { return this.service.getPriceList(id); }

  @Post()
  @RequirePermissions('catalog.pricelist.manage')
  create(@Body() dto: CreatePriceListDto) { return this.service.createPriceList(dto); }

  @Patch(':id')
  @RequirePermissions('catalog.pricelist.manage')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: Partial<CreatePriceListDto>) {
    return this.service.updatePriceList(id, dto);
  }

  @Post(':id/items')
  @RequirePermissions('catalog.pricelist.manage')
  addItem(@Param('id', ParseIntPipe) id: number, @Body() dto: CreatePriceListItemDto) {
    return this.service.addItem(id, dto);
  }

  @Delete(':id/items/:itemId')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('catalog.pricelist.manage')
  removeItem(@Param('id', ParseIntPipe) id: number, @Param('itemId', ParseIntPipe) itemId: number) {
    return this.service.removeItem(id, itemId);
  }
}
```

**IMPORTANT:** `GET /price-lists/lookup` phải khai báo TRƯỚC `GET /price-lists/:id` trong controller. NestJS route matching là top-down — nếu `:id` khai báo trước, request "lookup" sẽ bị match như `id='lookup'` và throw 404/400. Thứ tự decorator method trong class quan trọng.

### Backend — catalog.module.ts update

```typescript
import { PriceListService } from './price-list.service';
import { PriceListController } from './price-list.controller';

@Module({
  controllers: [CatalogController, PriceListController],
  providers: [CatalogService, PriceListService],
  exports: [CatalogService, PriceListService],
})
export class CatalogModule {}
```

**Tại sao export PriceListService:** Story 5.1 (Sales) sẽ cần gọi `lookupPrice` từ module khác.

### Frontend — Types (`catalog.ts` additions)

```typescript
export interface PriceListItem {
  id: number;
  priceListId: number;
  productId: number;
  unitPrice: string;      // Decimal → serialized as string from Prisma
  minQuantity: string;    // Decimal → serialized as string from Prisma
  product?: { id: number; sku: string; productName: string; unit?: string };
}

export interface PriceList {
  id: number;
  name: string;
  applyTo?: string;
  customerTier?: string;
  customerId?: number;
  validFrom?: string;  // ISO date "YYYY-MM-DD"
  validTo?: string;
  isDefault: boolean;
  createdAt: string;
  items?: PriceListItem[];
  customer?: { id: number; name: string };
  _count?: { items: number };
}

export interface PriceListLookupResult {
  unitPrice: string;
  source: 'customer-specific' | 'tier' | 'default' | 'fallback-minprice';
}
```

### Frontend — API client (`price-list.ts`)

```typescript
import { apiClient } from './client';
import type { PriceList, PriceListItem, PriceListLookupResult } from '@/types/catalog';

export const listPriceLists = () =>
  apiClient.get<PriceList[]>('/price-lists');

export const getPriceList = (id: number) =>
  apiClient.get<PriceList>(`/price-lists/${id}`);

export const createPriceList = (data: {
  name: string; applyTo?: string; customerTier?: string;
  customerId?: number; validFrom?: string; validTo?: string; isDefault?: boolean;
}) => apiClient.post<PriceList>('/price-lists', data);

export const updatePriceList = (id: number, data: Partial<Parameters<typeof createPriceList>[0]>) =>
  apiClient.patch<PriceList>(`/price-lists/${id}`, data);

export const addPriceListItem = (priceListId: number, data: {
  productId: number; unitPrice: number; minQuantity?: number;
}) => apiClient.post<PriceListItem>(`/price-lists/${priceListId}/items`, data);

export const removePriceListItem = (priceListId: number, itemId: number) =>
  apiClient.delete(`/price-lists/${priceListId}/items/${itemId}`);

export const lookupPrice = (params: {
  productId: number; quantity?: number; customerId?: number; customerTier?: string;
}) => apiClient.get<PriceListLookupResult>('/price-lists/lookup', { params });
```

### Frontend — Page UX design

**Page layout:** Similar to brands/categories pages — a card with table + Create button. No separate detail page.

**Table columns:**
- Name
- Apply To (TIER / CUSTOMER / DEFAULT / — )
- Customer Tier / Customer (conditional)
- Valid From → Valid To
- Default badge
- Item count
- Actions: Edit, Delete (deactivate)

**Create/Edit dialog (2-tab pattern, same as product edit):**
- Tab "Thông tin" — form fields: name, applyTo (select), customerTier/customerId (conditional on applyTo), validFrom, validTo, isDefault checkbox
- Tab "Sản phẩm" — item management table: [Product (searchable select), Unit Price, Min Qty, Delete row], Save Items button

**Item management pattern (same as UoM rows in Story 1.2):**
- State: `itemRows: { productId: string; unitPrice: string; minQuantity: string }[]`
- Store unitPrice/minQuantity as strings in state; parse to number when calling API
- Load từ `editPriceList?.items` via useEffect khi mở edit dialog
- Save from individual add/remove calls (NOT batch) — each row action calls API immediately
- After add: invalidate query `['pricelist', id]` to refresh items
- After remove: same

**Import pattern for the page:**
```typescript
import { listPriceLists, createPriceList, updatePriceList, addPriceListItem, removePriceListItem, getPriceList } from "@/lib/api/price-list";
import { listProducts } from "@/lib/api/catalog";  // for product dropdown
```

**applyTo select options:**
```
"TIER"     → "Theo cấp đại lý"
"CUSTOMER" → "Theo khách hàng cụ thể"
"DEFAULT"  → "Mặc định"
```

**Date input handling:**
- Use `<input type="date">` (HTML5 native) for validFrom / validTo
- Send as string "YYYY-MM-DD" — backend accepts `@IsDateString()`
- Display: `new Date(validFrom).toLocaleDateString('vi-VN')` for formatted display in table

### Frontend — i18n keys to add (vi/EN)

Add to `catalog` section in both `en` and `vi`:

```typescript
// EN
priceLists: "Price Lists",
createPriceList: "Create Price List",
editPriceList: "Edit Price List",
priceListName: "Price List Name",
applyTo: "Apply To",
applyToTier: "By Customer Tier",
applyToCustomer: "By Specific Customer",
applyToDefault: "Default",
customerTier: "Customer Tier",
validFrom: "Valid From",
validTo: "Valid To",
isDefault: "Default Price List",
priceListItems: "Products",
addItem: "Add Product",
unitPrice: "Unit Price",
minQuantity: "Min Qty",
priceListSaved: "Price list saved",
itemAdded: "Product added",
itemRemoved: "Product removed",
noItems: "No products in this price list",
```

```typescript
// VI
priceLists: "Bảng giá",
createPriceList: "Tạo bảng giá",
editPriceList: "Chỉnh sửa bảng giá",
priceListName: "Tên bảng giá",
applyTo: "Áp dụng cho",
applyToTier: "Theo cấp đại lý",
applyToCustomer: "Theo khách hàng cụ thể",
applyToDefault: "Mặc định",
customerTier: "Cấp đại lý",
validFrom: "Hiệu lực từ",
validTo: "Hết hạn",
isDefault: "Bảng giá mặc định",
priceListItems: "Sản phẩm",
addItem: "Thêm sản phẩm",
unitPrice: "Đơn giá",
minQuantity: "Số lượng tối thiểu",
priceListSaved: "Đã lưu bảng giá",
itemAdded: "Đã thêm sản phẩm",
itemRemoved: "Đã xoá sản phẩm",
noItems: "Bảng giá chưa có sản phẩm nào",
```

### Critical Patterns & Gotchas

1. **Route order matters in NestJS:** `GET /price-lists/lookup` MUST be defined BEFORE `GET /price-lists/:id` in the controller file to avoid route conflict.

2. **Decimal as string:** `unitPrice` và `minQuantity` từ Prisma serialize thành string. Frontend state stores them as strings; parse with `parseFloat()` when sending to API.

3. **class-transformer for query params:** `@Type(() => Number)` required on number query params (productId, quantity, customerId) because express parses all query params as strings.

4. **addItem upsert pattern:** If user adds same product twice, backend should throw ConflictException or update existing item — don't create duplicate (check unique on priceListId + productId).

5. **lookupPrice called from Sales (Story 5.1):** The response shape `{ unitPrice: string; source: string }` must remain stable. Don't change it.

6. **Items tab: load items separately:** When opening edit dialog, call `getPriceList(id)` to get full detail with items. The list view only returns `_count: { items: number }` — no items array.

7. **PriceListService needs PrismaService:** Inject via constructor same as CatalogService. No additional module imports needed.

8. **Date comparison in Prisma:** Use JavaScript `new Date()` for today. Prisma Date fields are compared correctly when JS Date is passed.

9. **Frontend product select for items:** Use `listProducts()` to get product list for the dropdown in item management. Load it once when the "Sản phẩm" tab opens (`useQuery` with `enabled: showItemsTab`).

### File List

| File | Action | Notes |
|------|--------|-------|
| `backend/src/catalog/dto/price-list.dto.ts` | CREATE | 3 DTOs |
| `backend/src/catalog/price-list.service.ts` | CREATE | 7 methods |
| `backend/src/catalog/price-list.controller.ts` | CREATE | 7 endpoints |
| `backend/src/catalog/catalog.module.ts` | MODIFY | Register new service + controller |
| `frontend/src/types/catalog.ts` | MODIFY | Add PriceList, PriceListItem, PriceListLookupResult |
| `frontend/src/lib/api/price-list.ts` | CREATE | 6 API functions |
| `frontend/src/app/(dashboard)/catalog/price-lists/page.tsx` | CREATE | Full CRUD page |
| `frontend/src/lib/i18n.ts` | MODIFY | Add 19 keys EN + VI |

## Senior Developer Review (AI)

**Review Date:** 2026-05-13
**Outcome:** Changes Requested
**Layers:** Blind Hunter ✅ | Edge Case Hunter ✅ | Acceptance Auditor ✅

### Action Items

**Decision Needed (3):**
- [x] [Review][Decision] DN1: AC2 — Lookup không derive customerTier → **Defer**: Story 5.1 tự truyền customerTier khi gọi lookup
- [x] [Review][Decision] DN2: addItem 1 item/product (upsert intent) → **Defer**: tiered qty pricing để scope sau; thêm P11 fix race condition
- [x] [Review][Decision] DN3: isDefault mutual exclusivity → **Defer**: user tự quản lý, không enforce

**Patches (10):**
- [x] [Review][Patch] P1: `applyTo` không có `@IsIn(['TIER','CUSTOMER','DEFAULT'])` — bất kỳ string nào đều được lưu vào DB [price-list.dto.ts:15]
- [x] [Review][Patch] P2: Date comparison bug — `today = new Date()` (timestamp) vs `@db.Date` (date-only) — price list valid đến hôm nay bị coi là expired sau 00:00 UTC [price-list.service.ts:120]
- [x] [Review][Patch] P3: `removeItem` TOCTOU — `findUnique` rồi `delete` không atomic, concurrent delete gây P2025 → 500 thay vì 404 [price-list.service.ts:110]
- [x] [Review][Patch] P4: `ConflictException` imported nhưng không dùng [price-list.service.ts:4]
- [x] [Review][Patch] P5: `removeItemMut.isPending` disable TẤT CẢ nút Remove — nên track per-itemId [price-lists/page.tsx:185]
- [x] [Review][Patch] P6: `parseFloat(addMinQty) || 1` — user gõ "0" bị override thành 1 không báo lỗi [price-lists/page.tsx:173]
- [x] [Review][Patch] P7: `lookupPrice` non-deterministic khi 2 items có cùng `minQuantity` — thiếu secondary sort [price-list.service.ts:130]
- [x] [Review][Patch] P8: `lookupPrice` trả về `"0"` khi `productId` không tồn tại trong DB thay vì 404 [price-list.service.ts:167]
- [x] [Review][Patch] P9: Cross-field validation thiếu — `applyTo=TIER` không bắt buộc `customerTier`; `applyTo=CUSTOMER` không bắt buộc `customerId` [price-list.dto.ts + price-list.service.ts]
- [x] [Review][Patch] P10: `validFrom >= validTo` không được validate — price list ngày không hợp lệ được tạo thành công [price-list.service.ts:40]
- [x] [Review][Patch] P11: `addItem` findFirst+update/create không atomic — concurrent requests cùng (priceListId, productId) gây race condition; dùng Prisma upsert [price-list.service.ts:78]

**Deferred (8):**
- [x] [Review][Defer] D1: No explicit JwtAuthGuard at controller class level — deferred, consistent with existing catalog.controller.ts pattern [price-list.controller.ts]
- [x] [Review][Defer] D2: No pagination on listPriceLists — deferred, existing pattern in project (categories/brands also return all)
- [x] [Review][Defer] D3: ensureExists redundant DB query — deferred, optimization only, not correctness
- [x] [Review][Defer] D4: unitPrice allows 0 — deferred, business decision (may need free samples/promos)
- [x] [Review][Defer] D5: removeItem returns full deleted record — deferred, consistent with project pattern
- [x] [Review][Defer] D6: No DELETE /price-lists/:id endpoint — deferred, not required by AC4
- [x] [Review][Defer] D7: updatePriceList uses Partial<CreatePriceListDto> — deferred, consistent with updateCategory/updateBrand pattern
- [x] [Review][Defer] D8: customerId not found in DB silently falls through to default pricing — deferred, acceptable behavior for lookup endpoint

## Dev Agent Record

### Debug Log
- Fix: Customer model có field `companyName` (không phải `name`) — sửa trong `price-list.service.ts` → tất cả 4 `customer: { select }` blocks

### Completion Notes
- Backend: 3 files mới (dto, service, controller) + update catalog.module.ts; tsc --noEmit clean
- Frontend: 2 files mới (api/price-list.ts, catalog/price-lists/page.tsx) + update types/catalog.ts + i18n.ts (19 keys EN/VI); tsc --noEmit clean
- Lookup priority: customer-specific → tier → default → product.minPrice fallback
- Items tab: add/remove immediate API calls (không batch); upsert by productId (same product → update existing)
- Route order: GET /lookup trước GET /:id trong controller để tránh NestJS match 'lookup' như id
- CR follow-ups (11 patches applied 2026-05-13): P1 @IsIn enum guard, P2 date truncation midnight UTC, P3 atomic deleteMany, P4 unused import, P5 per-item remove pending state, P6 addMinQty coercion, P7 secondary sort, P8 product 404, P9 cross-field validation, P10 date range validation, P11 Serializable transaction; both tsc clean after patches

## Change Log

| Date | Change |
|------|--------|
| 2026-05-13 | Story created (CS workflow) |
| 2026-05-13 | Implementation complete — all 5 tasks done, tsc clean, status → review |
| 2026-05-13 | Applied 11 CR patches (P1–P11) — tsc clean on backend + frontend, status → done |
