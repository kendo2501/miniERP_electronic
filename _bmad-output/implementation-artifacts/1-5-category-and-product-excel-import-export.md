# Story 1.5: Category & Product Excel Import/Export — Nhập/Xuất Excel

Status: review

## Story

As a Warehouse Manager,
I want to import categories and products in bulk from Excel files and export them to Excel,
So that I can efficiently manage large product catalogs without manual data entry.

## Acceptance Criteria

1. **Given** tôi download template Excel cho Categories
   **When** GET /api/v1/catalog/categories/export-template
   **Then** file Excel được tải về với header columns: Code, Name, ParentCode, Description

2. **Given** tôi upload file Excel chứa categories hợp lệ
   **When** POST /api/v1/catalog/categories/import với multipart file (field name: `file`)
   **Then** categories được tạo/cập nhật; response trả về `{ created: N, updated: M, errors: [] }`
   **And** nếu category đã có `code` trùng khớp → UPDATE; nếu không → CREATE

3. **Given** file Excel chứa row có ParentCode không tồn tại trong hệ thống
   **When** import được xử lý
   **Then** row đó bị skip với error message "ParentCode không tồn tại"; các rows hợp lệ vẫn được import
   **And** response trả về errors array với `{ row: N, message: "..." }` cho từng row lỗi

4. **Given** tôi export danh sách products hiện tại
   **When** GET /api/v1/catalog/products/export (với filter tùy chọn: search, categoryId, brandId)
   **Then** file Excel được tạo với tất cả products bao gồm: SKU, Name, Category, Brand, Unit, MinPrice, Attributes (flattened), UoM Conversions (flattened)

## Tasks / Subtasks

- [x] **Task 1: Backend — Install exceljs** (AC: 1, 2, 3, 4)
  - [x] Chạy: `npm install exceljs -w @mini-erp/backend`
  - [x] Verify `exceljs` có trong `backend/package.json` dependencies (exceljs ships với built-in TypeScript types)

- [x] **Task 2: Backend — CatalogService Excel methods** (AC: 1, 2, 3, 4)
  - [x] Thêm `import ExcelJS from 'exceljs'` vào `backend/src/catalog/catalog.service.ts`
  - [x] Thêm method `exportCategoryTemplate(): Promise<Buffer>`
  - [x] Thêm method `importCategories(buffer: Buffer): Promise<ImportResult>`
  - [x] Thêm method `exportProducts(query: ProductQueryDto): Promise<Buffer>`

- [x] **Task 3: Backend — CatalogController Excel endpoints** (AC: 1, 2, 3, 4)
  - [x] Thêm imports: StreamableFile, FileInterceptor, UploadedFile, Res, Response
  - [x] Thêm `GET /catalog/categories/export-template` (trước POST categories)
  - [x] Thêm `POST /catalog/categories/import` (trước POST categories)
  - [x] Thêm `GET /catalog/products/export` (trước GET products/:id)

- [x] **Task 4: Frontend — API functions** (AC: 1, 2, 3, 4)
  - [x] Thêm `exportCategoryTemplate`, `importCategories`, `exportProducts` vào `frontend/src/lib/api/catalog.ts`

- [x] **Task 5: Frontend — Categories page — Export Template + Import** (AC: 1, 2, 3)
  - [x] Import API functions và thêm state vào categories page
  - [x] Thêm `handleExportTemplate` function
  - [x] Thêm `importMut` mutation
  - [x] Thêm 2 buttons "Xuất mẫu" và "Nhập Excel" vào header
  - [x] Thêm Import dialog với file input, result display và error list

- [x] **Task 6: Frontend — Products page — Export** (AC: 4)
  - [x] Import `exportProducts` API và thêm `handleExportProducts` function
  - [x] Thêm button "Xuất Excel" vào header area

- [x] **Task 7: Frontend — i18n keys** (AC: 1, 2, 3, 4)
  - [x] Thêm 9 keys vào EN và VI trong `frontend/src/lib/i18n.ts`

- [x] **Task 8: Backend — Unit tests** (AC: 1, 2, 3, 4)
  - [x] Tạo `backend/src/catalog/catalog.excel.spec.ts` với 8 test cases
  - [x] Test `exportCategoryTemplate`: 2 tests — buffer valid + header row
  - [x] Test `importCategories`: 4 tests — create, update, invalid parent, intra-batch parent ref
  - [x] Test `exportProducts`: 2 tests — row data + filter passthrough

## Dev Notes

### Architecture Overview

**Files cần modify (MODIFY):**
```
backend/package.json                            ← thêm exceljs
backend/src/catalog/catalog.service.ts          ← thêm 3 methods Excel
backend/src/catalog/catalog.controller.ts       ← thêm 3 endpoints + imports mới
frontend/src/lib/api/catalog.ts                 ← thêm 3 API functions
frontend/src/app/(dashboard)/catalog/categories/page.tsx  ← Export Template + Import UI
frontend/src/app/(dashboard)/catalog/products/page.tsx    ← Export button
frontend/src/lib/i18n.ts                        ← 9 keys mới (EN + VI)
```

**Files cần tạo mới (NEW):**
```
backend/src/catalog/catalog.excel.spec.ts       ← unit tests
```

---

### ExcelJS — Cài đặt và import

```bash
# Chạy từ root của monorepo (workspace flag)
npm install exceljs -w @mini-erp/backend
```

ExcelJS **ships với TypeScript types built-in** — không cần install `@types/exceljs`.

Import trong service:
```typescript
import ExcelJS from 'exceljs';
```

---

### Backend — StreamableFile pattern (NestJS)

Để stream binary file ra response mà vẫn giữ NestJS interceptors hoạt động:

```typescript
import { StreamableFile } from '@nestjs/common';
import { Response } from 'express';
import { Res } from '@nestjs/common';

// @Res({ passthrough: true }) = inject response object, nhưng NestJS vẫn xử lý stream
@Get('categories/export-template')
@RequirePermissions('catalog.search')
async exportCategoryTemplate(@Res({ passthrough: true }) res: Response) {
  const buffer = await this.service.exportCategoryTemplate();
  res.set({
    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Content-Disposition': 'attachment; filename="categories-template.xlsx"',
  });
  return new StreamableFile(buffer);
}
```

`StreamableFile` là class từ `@nestjs/common` (đã có sẵn, không cần install thêm).

---

### Backend — Import endpoint (FileInterceptor, single file)

```typescript
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadedFile } from '@nestjs/common';

@Post('categories/import')
@RequirePermissions('catalog.category.manage')
@UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
async importCategories(@UploadedFile() file: Express.Multer.File) {
  if (!file) throw new BadRequestException('No file provided');
  return this.service.importCategories(file.buffer);
}
```

`FileInterceptor` (single file) vs `FilesInterceptor` (multiple files) — dùng `FileInterceptor` ở đây.
`memoryStorage()` đã được import sẵn từ `multer` (đã dùng trong story 1.4).

---

### CRITICAL — Route ordering trong CatalogController

NestJS resolves routes **theo thứ tự khai báo**. Nếu `GET /catalog/categories/:id` khai báo trước `GET /catalog/categories/export-template`, request đến `export-template` sẽ bị match với `:id=export-template` thay vì đúng endpoint.

**Thứ tự bắt buộc trong controller:**
```typescript
// Categories section — ĐÚNG thứ tự:
@Get('categories')            getCategories()
@Get('categories/tree')       getCategoryTree()
@Get('categories/export-template')  ← PHẢI trước PATCH/DELETE /:id (không có GET /:id cho category, nhưng practice tốt)
@Post('categories/import')    importCategories()   ← POST /import trước POST /  (thực ra không cần vì path khác nhau nhưng an toàn hơn)
@Post('categories')           createCategory()
@Patch('categories/:id')      updateCategory()
@Delete('categories/:id')     deactivateCategory()

// Products section — ĐÚNG thứ tự:
@Get('products')              getProducts()
@Get('products/export')       ← PHẢI trước Get('products/:id')
@Get('products/:id')          getProduct()
...
```

---

### Backend — ExcelJS writeBuffer() TypeScript cast

`wb.xlsx.writeBuffer()` trả về `Promise<ExcelJS.Buffer>` (là `Buffer | ArrayBuffer`).
Cast về `Buffer` để NestJS `StreamableFile` nhận đúng type:

```typescript
return wb.xlsx.writeBuffer() as Promise<Buffer>;
```

---

### Backend — importCategories logic detail

```typescript
async importCategories(buffer: Buffer): Promise<ImportResult> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const ws = wb.worksheets[0];

  // Seed codeMap với tất cả existing categories (có code)
  const existing = await this.prisma.category.findMany({
    where: { isActive: true },
    select: { id: true, code: true },
  });
  const codeMap = new Map(
    existing.filter((c) => c.code).map((c) => [c.code!, c.id])
  );

  const errors: { row: number; message: string }[] = [];
  let created = 0;
  let updated = 0;

  for (let i = 2; i <= ws.rowCount; i++) {
    const row = ws.getRow(i);
    const code = (row.getCell(1).text ?? '').trim();
    const name = (row.getCell(2).text ?? '').trim();
    const parentCode = (row.getCell(3).text ?? '').trim();
    const description = (row.getCell(4).text ?? '').trim();

    if (!name) continue; // skip blank rows

    let parentId: number | undefined;
    if (parentCode) {
      const found = codeMap.get(parentCode);
      if (!found) {
        errors.push({ row: i, message: `ParentCode "${parentCode}" không tồn tại` });
        continue;
      }
      parentId = found;
    }

    if (code && codeMap.has(code)) {
      await this.prisma.category.update({
        where: { code },
        data: { name, description: description || undefined, parentId: parentId ?? null },
      });
      updated++;
    } else {
      const created_cat = await this.prisma.category.create({
        data: {
          code: code || undefined,
          name,
          description: description || undefined,
          parentId,
        },
      });
      if (code) codeMap.set(code, created_cat.id); // cho phép subsequent rows reference này làm parent
      created++;
    }
  }

  return { created, updated, errors };
}
```

**Lưu ý quan trọng:** Khi một category mới được tạo trong import batch, thêm nó vào `codeMap` ngay để cho phép các row phía sau trong cùng file có thể dùng nó làm `ParentCode`. Đây là sequential processing (không phải parallel) để đảm bảo ordering.

---

### Backend — exportProducts query

Reuse `ProductQueryDto` để accept cùng filter params như list API, nhưng **không pagination**:

```typescript
async exportProducts(query: ProductQueryDto): Promise<Buffer> {
  const { search, categoryId, brandId, isActive, attrKey, attrValue } = query;

  const where: any = { deletedAt: null };
  if (typeof isActive === 'boolean') where.isActive = isActive;
  if (categoryId) where.categoryId = categoryId;
  if (brandId) where.brandId = brandId;
  if (search) {
    where.OR = [
      { sku: { contains: search, mode: 'insensitive' } },
      { productName: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (attrKey && attrValue) {
    where.attributes = { some: { attrKey, attrValue } };
  }

  const products = await this.prisma.product.findMany({
    where,
    include: {
      category: { select: { name: true } },
      brand: { select: { name: true } },
      attributes: { orderBy: { attrKey: 'asc' } },
      uomConversions: { orderBy: { fromUnit: 'asc' } },
    },
    orderBy: { sku: 'asc' },
  });

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Products');
  ws.columns = [
    { header: 'SKU', key: 'sku', width: 20 },
    { header: 'Name', key: 'name', width: 30 },
    { header: 'Category', key: 'category', width: 20 },
    { header: 'Brand', key: 'brand', width: 20 },
    { header: 'Unit', key: 'unit', width: 15 },
    { header: 'MinPrice', key: 'minPrice', width: 15 },
    { header: 'Attributes', key: 'attributes', width: 50 },
    { header: 'UoM Conversions', key: 'uom', width: 40 },
  ];
  ws.getRow(1).font = { bold: true };

  for (const p of products) {
    ws.addRow({
      sku: p.sku,
      name: p.productName,
      category: p.category?.name ?? '',
      brand: p.brand?.name ?? '',
      unit: p.unit ?? '',
      minPrice: p.minPrice ? Number(p.minPrice) : '',
      attributes: p.attributes.map((a) => `${a.attrKey}: ${a.attrValue}`).join('; '),
      uom: p.uomConversions.map((u) => `${u.fromUnit}→${u.toUnit}×${Number(u.conversionRate)}`).join('; '),
    });
  }

  return wb.xlsx.writeBuffer() as Promise<Buffer>;
}
```

---

### Frontend — File download pattern

Dùng axios với `responseType: 'blob'` và `URL.createObjectURL`:

```typescript
const handleExportTemplate = async () => {
  try {
    const res = await exportCategoryTemplate();
    const url = URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'categories-template.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    toast.error('Xuất file thất bại');
  }
};
```

Tương tự cho exportProducts.

---

### Frontend — Import dialog UI pattern

```tsx
// State
const [showImport, setShowImport] = useState(false);
const [importFile, setImportFile] = useState<File | null>(null);
const [importResult, setImportResult] = useState<ImportResult | null>(null);

const importMut = useMutation({
  mutationFn: (file: File) => importCategories(file).then((r) => r.data),
  onSuccess: (data) => {
    setImportResult(data);
    if (data.errors.length === 0) toast.success(t.catalog.importSuccess);
    qc.invalidateQueries({ queryKey: ['categories'] });
  },
  onError: (e: any) => toast.error(e.response?.data?.message ?? 'Import thất bại'),
});

// Dialog JSX
<Dialog open={showImport} onOpenChange={(v) => { setShowImport(v); if (!v) { setImportFile(null); setImportResult(null); } }}>
  <DialogContent>
    <DialogHeader><DialogTitle>{t.catalog.importCategories}</DialogTitle></DialogHeader>
    <div className="space-y-4 pt-2">
      <Input type="file" accept=".xlsx" onChange={(e) => setImportFile(e.target.files?.[0] ?? null)} />
      {importResult && (
        <div className="text-sm space-y-1">
          <p>{t.catalog.importCreated}: {importResult.created} | {t.catalog.importUpdated}: {importResult.updated}</p>
          {importResult.errors.map((err) => (
            <p key={err.row} className="text-destructive">Row {err.row}: {err.message}</p>
          ))}
        </div>
      )}
    </div>
    <DialogFooter>
      <Button variant="outline" onClick={() => setShowImport(false)}>{t.common.cancel}</Button>
      <Button disabled={!importFile || importMut.isPending} onClick={() => importFile && importMut.mutate(importFile)}>
        {importMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        {t.common.submit}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

### Frontend — Products export integration

Trong `products/page.tsx`, thêm vào header area:

```tsx
import { exportProducts } from "@/lib/api/catalog";
// ...
const handleExportProducts = async () => {
  try {
    const res = await exportProducts({
      search: search || undefined,
      categoryId: categoryFilter !== 'all' ? parseInt(categoryFilter) : undefined,
      brandId: brandFilter !== 'all' ? parseInt(brandFilter) : undefined,
    });
    const url = URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'products-export.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    toast.error('Xuất file thất bại');
  }
};

// Trong JSX header:
<Button variant="outline" size="sm" onClick={handleExportProducts}>
  {t.catalog.exportProducts}
</Button>
```

---

### Previous Story Learnings (từ Story 1.4)

1. **Actual schema path** là `backend/database/prisma/schema.prisma` (không phải `backend/prisma/schema.prisma`)
2. **`$transaction` callback** phải dùng `jest.fn((fn: Function) => fn(mockPrisma))` trong tests
3. **`err: any` cast** trong catch blocks khi cần truy cập `.code` property
4. **multer + memoryStorage** đã import sẵn từ story 1.4 trong controller

---

### Unit test structure

```typescript
// backend/src/catalog/catalog.excel.spec.ts
import ExcelJS from 'exceljs';
import { CatalogService } from './catalog.service';

const mockPrisma = {
  category: { findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
  product: { findMany: jest.fn() },
  // ... các model khác cần cho constructor
};

describe('CatalogService — Excel methods', () => {
  let service: CatalogService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [CatalogService, { provide: PrismaService, useValue: mockPrisma }, { provide: MinioService, useValue: {} }],
    }).compile();
    service = module.get<CatalogService>(CatalogService);
  });

  describe('exportCategoryTemplate', () => {
    it('should return a buffer with xlsx content', async () => {
      const buffer = await service.exportCategoryTemplate();
      expect(buffer).toBeInstanceOf(Buffer);
      // Parse back to verify structure
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buffer);
      expect(wb.worksheets[0].getRow(1).getCell(1).value).toBe('Code');
    });
  });

  describe('importCategories', () => {
    it('should create new categories and skip blank rows', async () => {
      mockPrisma.category.findMany.mockResolvedValue([]);
      mockPrisma.category.create.mockResolvedValue({ id: 1, code: 'CAT-01' });
      // Build a valid xlsx buffer
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('S');
      ws.addRow(['Code', 'Name', 'ParentCode', 'Description']); // header
      ws.addRow(['CAT-01', 'Cáp điện', '', 'Nhóm cáp']);
      ws.addRow(['', '', '', '']); // blank row
      const buf = await wb.xlsx.writeBuffer() as Buffer;
      const result = await service.importCategories(buf);
      expect(result.created).toBe(1);
      expect(result.errors).toHaveLength(0);
    });
    // ... thêm tests cho update, invalid parent
  });
});
```

---

### Deferred / Out of scope

- Category import không support bulk transaction rollback — partial import nếu DB error mid-batch. Acceptable for MVP.
- Product import (ngược lại với export) — ngoài scope story này; chỉ product EXPORT.
- Template download cần auth (Bearer token) — handled bởi `RequirePermissions` guard đã có sẵn.

## Dev Agent Record

### Debug Log
| # | Issue | Resolution |
|---|-------|------------|

### Completion Notes

Tất cả 8 tasks đã hoàn thành. Backend: cài exceljs, thêm 3 service methods (exportCategoryTemplate, importCategories, exportProducts), thêm 3 controller endpoints với đúng route ordering (static routes trước `:id`). Frontend: 3 API functions, categories page thêm Export Template + Import dialog, products page thêm Export button, 9 i18n keys (EN+VI). Unit tests: 8 tests pass (20 tổng cộng, 0 regression). TypeScript frontend clean. Pre-existing bug trong catalog.image.spec.ts (self-referential mockPrisma type) được fix đồng thời.

### File List

- backend/package.json (thêm exceljs, jest, @types/jest)
- backend/src/catalog/catalog.service.ts (thêm ExcelJS import, 3 Excel methods)
- backend/src/catalog/catalog.controller.ts (thêm StreamableFile/FileInterceptor imports, 3 endpoints)
- backend/src/catalog/catalog.excel.spec.ts (NEW — 8 unit tests)
- backend/src/catalog/catalog.image.spec.ts (fix pre-existing TypeScript error)
- frontend/src/lib/api/catalog.ts (thêm 3 API functions)
- frontend/src/app/(dashboard)/catalog/categories/page.tsx (Export Template + Import UI)
- frontend/src/app/(dashboard)/catalog/products/page.tsx (Export Excel button)
- frontend/src/lib/i18n.ts (9 keys mới EN + VI)
- frontend/src/app/(dashboard)/my-orders/page.tsx (fix missing PENDING_REAPPROVAL in status map)

### Change Log

- 2026-05-13: Story 1-5 implemented — Category & Product Excel Import/Export. Backend 3 endpoints, frontend 2 pages updated, 8 unit tests added. All tests pass.
