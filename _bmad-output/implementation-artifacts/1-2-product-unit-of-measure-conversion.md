# Story 1.2: Product Unit of Measure Conversion — Đơn vị tính chuyển đổi

Status: done

## Story

As a Warehouse Manager,
I want to define unit of measure conversions for products (e.g., 1 cuộn = 100m, 1 thùng = 20 cái),
So that sales and inventory can work with different units consistently.

## Acceptance Criteria

1. **Given** tôi đang ở product form tab "Đơn vị tính"
   **When** tôi thêm conversion: fromUnit="thùng", toUnit="cái", conversionRate=20 rồi Save
   **Then** record được lưu vào `uom_conversions` với productId tương ứng
   **And** `GET /api/v1/catalog/products/:id` trả về `uomConversions: [{ id, fromUnit, toUnit, conversionRate }]`

2. **Given** product có UoM conversion đã định nghĩa
   **When** `GET /api/v1/catalog/products/:id` được gọi
   **Then** response bao gồm mảng `uomConversions` đầy đủ thông tin (không null, ít nhất là `[]`)

3. **Given** tôi cập nhật conversionRate của một UoM rồi Save
   **When** `PUT /api/v1/catalog/products/:id/uom-conversions` được gọi với danh sách mới
   **Then** giá trị mới được cập nhật (delete-then-recreate atomically)
   **And** không ảnh hưởng đến bất kỳ order/quotation line nào đã tồn tại

4. **Given** product không có UoM conversion nào
   **When** `GET /api/v1/catalog/products/:id` được gọi
   **Then** response trả về `uomConversions: []` (mảng rỗng, không phải null)

## Tasks / Subtasks

- [x] **Task 1: Backend — DTO mới** (AC: 1, 2)
  - [x] Tạo `backend/src/catalog/dto/uom-conversion.dto.ts`:
    - `UomConversionDto`: `fromUnit: string` (@IsString, @IsNotEmpty, @MaxLength(50)), `toUnit: string` (@IsString, @IsNotEmpty, @MaxLength(50)), `conversionRate: number` (@IsNumber, @Min(0.000001))
    - `UpsertUomConversionsDto`: `conversions: UomConversionDto[]` (@IsArray, @ValidateNested each, @Type(() => UomConversionDto))

- [x] **Task 2: Backend — Service methods** (AC: 1, 2, 3, 4)
  - [x] Thêm method `upsertUomConversions(productId, conversions[])` vào `CatalogService` (xem pattern dưới)
  - [x] Cập nhật `getProduct(id)` — thêm `uomConversions: { orderBy: { fromUnit: 'asc' } }` vào `include`

- [x] **Task 3: Backend — Controller endpoint** (AC: 1, 3)
  - [x] Thêm endpoint vào `CatalogController`:
    - `PUT /catalog/products/:id/uom-conversions` → `@RequirePermissions('catalog.product.update')`
    - Body: `UpsertUomConversionsDto`, Return: conversions array

- [x] **Task 4: Frontend — Types & API client** (AC: 1, 3)
  - [x] Thêm `UomConversion` interface vào `frontend/src/types/catalog.ts`
  - [x] Thêm `uomConversions?: UomConversion[]` vào `Product` interface
  - [x] Thêm `updateUomConversions(productId, conversions)` vào `frontend/src/lib/api/catalog.ts`

- [x] **Task 5: Frontend — Tab "Đơn vị tính" trong Edit Product Dialog** (AC: 1, 3, 4)
  - [x] Thêm `"uom"` vào `editTab` type: `"general" | "attributes" | "uom"`
  - [x] Thêm `uomRows` state: `{ fromUnit: string; toUnit: string; conversionRate: string }[]`
  - [x] Cập nhật `openEdit()` — reset `uomRows` to `[]`
  - [x] Cập nhật `closeEdit()` — reset `uomRows` to `[]`
  - [x] Cập nhật `useEffect([editProduct?.id])` — add `setUomRows(editProduct.uomConversions?.map(...))`
  - [x] Thêm `saveUomMut` mutation gọi `updateUomConversions`
  - [x] Thêm tab button thứ 3 "Đơn vị tính" vào tab bar
  - [x] Render UoM tab: 3 cột (fromUnit, toUnit, conversionRate) + add/remove rows + save button
  - [x] Save button disabled nếu bất kỳ row nào có fromUnit hoặc toUnit rỗng, hoặc conversionRate <= 0

- [x] **Task 6: Frontend — i18n keys** (AC: 1)
  - [x] Thêm ~10 keys mới vào cả EN lẫn VI trong `frontend/src/lib/i18n.ts` (xem danh sách dưới)

### Senior Developer Review (AI)

**Ngày review:** 2026-05-13
**Kết quả:** Changes Requested

#### Action Items

- [x] [Review][Patch] NaN không bị chặn trong disabled check của save button — `!r.conversionRate || parseFloat(r.conversionRate) <= 0` để `NaN` vượt qua, gửi lên server → cần thêm `isNaN(parseFloat(r.conversionRate))` [`frontend/src/app/(dashboard)/catalog/products/page.tsx`]
- [x] [Review][Patch] `@IsNumber()` không block `Infinity/-Infinity` — `parseFloat("1e400") = Infinity` vượt `@Min(0.000001)` và crash DB — cần `@IsNumber({ allowNaN: false, allowInfinity: false })` [`backend/src/catalog/dto/uom-conversion.dto.ts`]
- [x] [Review][Patch] Indentation bug trong `getProduct` include — `inventoryStocks` thụt lề 6 spaces thay vì 8 [`backend/src/catalog/catalog.service.ts`]
- [x] [Review][Patch] i18n EN locale placeholders chứa từ tiếng Việt — `"e.g. cuộn, thùng..."` và `"e.g. m, cái..."` trong English section [`frontend/src/lib/i18n.ts`]
- [x] [Review][Patch] `saveUomMut.onSuccess` không cập nhật `uomRows` từ dữ liệu server — sau khi save, server có thể reorder rows (orderBy fromUnit asc) nhưng UI vẫn hiển thị thứ tự người dùng nhập [`frontend/src/app/(dashboard)/catalog/products/page.tsx`]
- [x] [Review][Defer] Product existence check ngoài transaction (race condition tiềm năng) — pre-existing pattern từ `upsertProductAttributes` Story 1.1 [`backend/src/catalog/catalog.service.ts`] — deferred, pre-existing
- [x] [Review][Defer] `fromUnit === toUnit` không bị validate — design decision, spec không yêu cầu constraint này
- [x] [Review][Defer] Duplicate (productId, fromUnit, toUnit) pairs — design decision, schema không có unique constraint
- [x] [Review][Defer] `conversionRate: number` type lie (Prisma Decimal serializes as string) — pre-existing pattern, nhất quán với `standardPrice?: number` trong codebase
- [x] [Review][Defer] `editId!` non-null assertion trong mutation — pre-existing pattern từ `saveAttrsMut`
- [x] [Review][Defer] Không có `@ArrayMaxSize` trên conversions array — ngoài scope story
- [x] [Review][Defer] `uomConversions?` optional type — pre-existing pattern nhất quán với `attributes?`
- [x] [Review][Defer] Empty array xóa toàn bộ conversions không có xác nhận — đúng theo replace semantics của story
- [x] [Review][Defer] Whitespace-only strings qua `@IsNotEmpty()` — frontend đã trim, direct API call là edge case
- [x] [Review][Defer] `onError` dùng `e: any` — pre-existing pattern toàn page
- [x] [Review][Defer] Không có `@Min(1)` trên controller `id` param — pre-existing pattern toàn controller

## Dev Notes

### Schema đã sẵn sàng — KHÔNG cần migration

```prisma
// backend/database/prisma/schema.prisma (đã có)
model UomConversion {
  id             Int     @id @default(autoincrement())
  productId      Int     @map("product_id")
  fromUnit       String  @map("from_unit") @db.VarChar(50)
  toUnit         String  @map("to_unit") @db.VarChar(50)
  conversionRate Decimal @map("conversion_rate") @db.Decimal(18, 6)

  product Product @relation(fields: [productId], references: [id])

  @@map("uom_conversions")
}
```
`Product` model đã có `uomConversions UomConversion[]` relation.

### Patterns Backend — tuân theo CHÍNH XÁC

**DTO pattern (từ Story 1.1 — áp dụng y chang):**
```typescript
// backend/src/catalog/dto/uom-conversion.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength, IsArray, ValidateNested, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UomConversionDto {
  @ApiProperty({ example: 'thùng' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  declare fromUnit: string;

  @ApiProperty({ example: 'cái' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  declare toUnit: string;

  @ApiProperty({ example: 20 })
  @IsNumber()
  @Min(0.000001)
  declare conversionRate: number;
}

export class UpsertUomConversionsDto {
  @ApiProperty({ type: [UomConversionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UomConversionDto)
  declare conversions: UomConversionDto[];
}
```

**Service pattern (delete-then-createMany — giống `upsertProductAttributes`):**
```typescript
async upsertUomConversions(productId: number, conversions: UomConversionDto[]) {
  const product = await this.prisma.product.findUnique({ where: { id: productId } });
  if (!product || product.deletedAt) throw new NotFoundException(`Product #${productId} not found`);

  return this.prisma.$transaction(async (tx) => {
    await tx.uomConversion.deleteMany({ where: { productId } });
    if (conversions.length > 0) {
      await tx.uomConversion.createMany({
        data: conversions.map((c) => ({
          productId,
          fromUnit: c.fromUnit,
          toUnit: c.toUnit,
          conversionRate: c.conversionRate,
        })),
      });
    }
    return tx.uomConversion.findMany({ where: { productId }, orderBy: { fromUnit: 'asc' } });
  });
}
```

**Controller pattern (thêm ngay sau `upsertProductAttributes`):**
```typescript
@Put('products/:id/uom-conversions')
@RequirePermissions('catalog.product.update')
@ApiOperation({ summary: 'Replace all UoM conversions for a product' })
upsertUomConversions(
  @Param('id', ParseIntPipe) id: number,
  @Body() dto: UpsertUomConversionsDto,
) {
  return this.service.upsertUomConversions(id, dto.conversions);
}
```

**getProduct update — thêm `uomConversions` vào include:**
```typescript
async getProduct(id: number) {
  const product = await this.prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      brand: true,
      images: { orderBy: { sortOrder: 'asc' } },
      attributes: { orderBy: { attrKey: 'asc' } },
      uomConversions: { orderBy: { fromUnit: 'asc' } },  // ← THÊM DÒNG NÀY
      inventoryStocks: {
        include: { warehouse: { select: { id: true, warehouseName: true } } },
      },
    },
  });
  if (!product || product.deletedAt) throw new NotFoundException(`Product #${id} not found`);
  return product;
}
```

### Import thêm vào controller

```typescript
// Trong catalog.controller.ts — thêm vào import hiện có
import { UpsertUomConversionsDto } from './dto/uom-conversion.dto';
```

### Decimal từ Prisma → JSON

`conversionRate` kiểu `Decimal` trong Prisma serializes thành **string** hoặc number tùy driver. Khi trả về qua API JSON, nó sẽ là number. Trong frontend, khi populate từ `editProduct.uomConversions`, dùng `String(c.conversionRate)` để lưu vào `uomRows` (input `type="number"`), và khi gọi API gửi `parseFloat(row.conversionRate)`.

### Frontend — Types & API

```typescript
// frontend/src/types/catalog.ts — thêm:
export interface UomConversion {
  id: number;
  fromUnit: string;
  toUnit: string;
  conversionRate: number; // JSON number từ API
}

// Thêm vào Product interface:
uomConversions?: UomConversion[];
```

```typescript
// frontend/src/lib/api/catalog.ts — thêm:
import type { UomConversion } from '@/types/catalog';  // nếu chưa import

export const updateUomConversions = (
  id: number,
  conversions: { fromUnit: string; toUnit: string; conversionRate: number }[],
) =>
  apiClient.put<UomConversion[]>(`/catalog/products/${id}/uom-conversions`, { conversions });
```

### Frontend — State & Logic Pattern

**Thêm vào state (ngay dưới `attrRows`):**
```tsx
const [uomRows, setUomRows] = useState<{ fromUnit: string; toUnit: string; conversionRate: string }[]>([]);
```

**Cập nhật `openEdit()` (thêm reset uomRows):**
```tsx
function openEdit(id: number) {
  setEditId(id);
  setEditTab("general");
  setAttrRows([]);
  setUomRows([]);  // ← THÊM
}
```

**Cập nhật `closeEdit()` (thêm reset uomRows):**
```tsx
function closeEdit() {
  setEditId(null);
  editForm.reset();
  setAttrRows([]);
  setUomRows([]);  // ← THÊM
}
```

**Cập nhật `useEffect([editProduct?.id])` (thêm populate uomRows):**
```tsx
useEffect(() => {
  if (!editProduct) return;
  editForm.reset({ /* ... giữ nguyên ... */ });
  setAttrRows(editProduct.attributes?.map((a) => ({ attrKey: a.attrKey, attrValue: a.attrValue })) ?? []);
  setUomRows(                                           // ← THÊM
    editProduct.uomConversions?.map((c) => ({
      fromUnit: c.fromUnit,
      toUnit: c.toUnit,
      conversionRate: String(c.conversionRate),
    })) ?? []
  );
}, [editProduct?.id]);
```

**Helper functions cho UoM rows (đặt sau `updateAttrRow`):**
```tsx
function addUomRow() {
  setUomRows((prev) => [...prev, { fromUnit: "", toUnit: "", conversionRate: "" }]);
}

function removeUomRow(idx: number) {
  setUomRows((prev) => prev.filter((_, i) => i !== idx));
}

function updateUomRow(idx: number, field: "fromUnit" | "toUnit" | "conversionRate", value: string) {
  setUomRows((prev) => prev.map((row, i) => i === idx ? { ...row, [field]: value } : row));
}
```

**saveUomMut (thêm sau `saveAttrsMut`):**
```tsx
const saveUomMut = useMutation({
  mutationFn: () =>
    updateUomConversions(
      editId!,
      uomRows.map((r) => ({ fromUnit: r.fromUnit, toUnit: r.toUnit, conversionRate: parseFloat(r.conversionRate) })),
    ).then((r) => r.data),
  onSuccess: () => {
    toast.success(t.catalog.conversionsSaved);
    qc.invalidateQueries({ queryKey: ["product", editId] });
  },
  onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed to save UoM conversions"),
});
```

### Frontend — Tab UI

**Tab bar — thêm button thứ 3 (ngay sau tab "Thuộc tính động"):**
```tsx
<button
  type="button"
  onClick={() => setEditTab("uom")}
  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
    editTab === "uom"
      ? "border-primary text-primary"
      : "border-transparent text-muted-foreground hover:text-foreground"
  }`}
>
  {t.catalog.unitConversions}
  {uomRows.length > 0 && (
    <span className="ml-1.5 rounded-full bg-primary/10 text-primary text-xs px-1.5 py-0.5">
      {uomRows.length}
    </span>
  )}
</button>
```

**Tab content "Đơn vị tính" (đặt sau tab "Thuộc tính động"):**
```tsx
{editTab === "uom" && (
  <div className="space-y-4">
    {uomRows.length === 0 ? (
      <p className="text-sm text-muted-foreground text-center py-4">{t.catalog.noConversions}</p>
    ) : (
      <div className="space-y-2">
        <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 text-xs font-medium text-muted-foreground px-1">
          <span>{t.catalog.fromUnit}</span>
          <span>{t.catalog.toUnit}</span>
          <span>{t.catalog.conversionRate}</span>
          <span />
        </div>
        {uomRows.map((row, idx) => (
          <div key={idx} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
            <Input
              placeholder={t.catalog.fromUnitPlaceholder}
              value={row.fromUnit}
              onChange={(e) => updateUomRow(idx, "fromUnit", e.target.value)}
            />
            <Input
              placeholder={t.catalog.toUnitPlaceholder}
              value={row.toUnit}
              onChange={(e) => updateUomRow(idx, "toUnit", e.target.value)}
            />
            <Input
              type="number"
              min="0.000001"
              step="any"
              placeholder={t.catalog.ratePlaceholder}
              value={row.conversionRate}
              onChange={(e) => updateUomRow(idx, "conversionRate", e.target.value)}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive"
              onClick={() => removeUomRow(idx)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    )}
    <Button type="button" variant="outline" size="sm" onClick={addUomRow} className="w-full">
      <Plus className="h-4 w-4 mr-1" />
      {t.catalog.addConversion}
    </Button>
    <DialogFooter>
      <Button type="button" variant="outline" onClick={closeEdit}>{t.common.cancel}</Button>
      <Button
        type="button"
        disabled={
          saveUomMut.isPending ||
          uomRows.some((r) => !r.fromUnit.trim() || !r.toUnit.trim() || !r.conversionRate || parseFloat(r.conversionRate) <= 0)
        }
        onClick={() => saveUomMut.mutate()}
      >
        {saveUomMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        {t.common.save}
      </Button>
    </DialogFooter>
  </div>
)}
```

### i18n Keys mới cần thêm

Thêm vào cả `en.catalog` và `vi.catalog`:

| Key | EN | VI |
|-----|----|----|
| `unitConversions` | "Unit Conversions" | "Đơn vị tính" |
| `fromUnit` | "From Unit" | "Từ đơn vị" |
| `toUnit` | "To Unit" | "Sang đơn vị" |
| `conversionRate` | "Rate" | "Tỷ lệ" |
| `addConversion` | "Add Conversion" | "Thêm chuyển đổi" |
| `noConversions` | "No conversions defined" | "Chưa có chuyển đổi đơn vị" |
| `conversionsSaved` | "Conversions saved" | "Đã lưu chuyển đổi" |
| `fromUnitPlaceholder` | "e.g. cuộn, thùng..." | "VD: cuộn, thùng..." |
| `toUnitPlaceholder` | "e.g. m, cái..." | "VD: m, cái..." |
| `ratePlaceholder` | "e.g. 100" | "VD: 100" |

### Critical Anti-patterns — KHÔNG làm

- ❌ KHÔNG dùng `Float` cho `conversionRate` — schema đã là `Decimal(18,6)`, Prisma sẽ xử lý
- ❌ KHÔNG cần `@IsInt()` cho `conversionRate` — tỷ lệ có thể là 0.001 (1kg = 1000g)
- ❌ KHÔNG thêm unique constraint `fromUnit+toUnit` — schema không có, không cần thiết cho story này
- ❌ KHÔNG import `Trash2` từ lucide-react — dùng `X` (đã có trong import hiện tại) như attributes tab
- ❌ KHÔNG gọi setState trong render body — dùng `useEffect` (lesson từ Story 1.1 CR)
- ❌ KHÔNG cần validation pipe custom — global `ValidationPipe` với `transform: true` đã bật, `@IsNumber()` sẽ auto coerce từ number trong JSON body
- ❌ KHÔNG tạo GET endpoint riêng — data UoM trả về qua `GET /products/:id` là đủ (như attributes)

### Backward Compatibility

- `getProducts` list view **KHÔNG** cần include `uomConversions` — quá nặng, không cần trong list
- Các module khác (sales, inventory) hiện không sử dụng `uomConversions` — safe to add

### File List — Cần tạo/sửa

| File | Action | Mô tả |
|------|--------|--------|
| `backend/src/catalog/dto/uom-conversion.dto.ts` | **TẠO MỚI** | DTO cho UoM conversion |
| `backend/src/catalog/catalog.service.ts` | **SỬA** | Thêm `upsertUomConversions`, cập nhật `getProduct` |
| `backend/src/catalog/catalog.controller.ts` | **SỬA** | Thêm `PUT products/:id/uom-conversions` |
| `frontend/src/types/catalog.ts` | **SỬA** | Thêm `UomConversion` interface, cập nhật `Product` |
| `frontend/src/lib/api/catalog.ts` | **SỬA** | Thêm `updateUomConversions` |
| `frontend/src/lib/i18n.ts` | **SỬA** | Thêm 10 keys EN + VI |
| `frontend/src/app/(dashboard)/catalog/products/page.tsx` | **SỬA** | Thêm tab UoM + state + mutation |

### Learnings từ Story 1.1

1. **React anti-pattern**: Không gọi `setState` trong render body → dùng `useEffect([editProduct?.id])`
2. **Unused imports**: Kiểm tra không import icon không dùng (Trash2 bị flag trong CR)
3. **DTO validation**: Phải có `@IsNotEmpty()` trên string fields — empty string pass `@IsString()`
4. **Tab system**: Dùng custom `button` state, không có `<Tabs>` component trong dự án
5. **Count badge pattern**: `{rows.length > 0 && <span>...{rows.length}</span>}` trên tab button
6. **TypeScript compile clean**: Chạy `node_modules/.bin/tsc --noEmit` từ trong `backend/` và `frontend/` để verify

### References

- Schema UomConversion: `backend/database/prisma/schema.prisma` dòng ~380-390
- Catalog Service (đã đọc): `backend/src/catalog/catalog.service.ts` — pattern `upsertProductAttributes` dòng 160-173
- Catalog Controller: `backend/src/catalog/catalog.controller.ts` — PUT attributes endpoint đã có
- Types file: `frontend/src/types/catalog.ts`
- i18n file: `frontend/src/lib/i18n.ts` — catalog section EN dòng ~184, VI dòng ~713
- Products page: `frontend/src/app/(dashboard)/catalog/products/page.tsx` — edit dialog với tabs (dòng 364+)
- Project conventions: `_bmad-output/project-context.md`

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6 (dev-story, 2026-05-13)

### Debug Log References

### Completion Notes List

- Schema `UomConversion` đã có sẵn — không cần migration
- Backend: thêm endpoint `PUT /api/v1/catalog/products/:id/uom-conversions` (delete + createMany trong transaction)
- Backend: `getProduct()` cập nhật include `uomConversions: { orderBy: { fromUnit: 'asc' } }`
- Frontend: Tab thứ 3 "Đơn vị tính" trong Edit Product Dialog với 3 cột (fromUnit, toUnit, conversionRate)
- Frontend: `uomRows` state pattern giống `attrRows` — string conversionRate, parseFloat khi gửi API
- Frontend: i18n thêm 10 keys mới (EN + VI) cho UoM UI
- TypeScript compile clean — cả backend lẫn frontend không có lỗi

### File List

- `backend/src/catalog/dto/uom-conversion.dto.ts` — TẠO MỚI
- `backend/src/catalog/catalog.service.ts` — SỬA (upsertUomConversions, getProduct include uomConversions)
- `backend/src/catalog/catalog.controller.ts` — SỬA (thêm PUT products/:id/uom-conversions)
- `frontend/src/types/catalog.ts` — SỬA (thêm UomConversion interface, cập nhật Product)
- `frontend/src/lib/api/catalog.ts` — SỬA (thêm updateUomConversions)
- `frontend/src/lib/i18n.ts` — SỬA (thêm 10 keys EN + VI)
- `frontend/src/app/(dashboard)/catalog/products/page.tsx` — SỬA (Tab UoM + state + mutation)
