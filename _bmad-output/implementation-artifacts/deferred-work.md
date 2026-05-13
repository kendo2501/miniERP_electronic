# Deferred Work

## Deferred from: code review of 1-4-product-image-upload (2026-05-13)

- Credentials MinIO (`MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD`) dùng `config.get` với default hardcode — cân nhắc dùng `config.getOrThrow` khi setup production
- `uploadImages` không atomic — nếu DB create thất bại sau khi MinIO upload thành công, object bị orphan. Fix: upload all → transaction DB → compensate MinIO nếu fail
- Không có tenant/org isolation trong catalog image endpoints — pre-existing pattern trên tất cả catalog endpoints, cần xem xét khi implement multi-tenancy

## Deferred from: code review of 1-2-product-unit-of-measure-conversion (2026-05-13)

- Product existence check ngoài transaction trong `upsertUomConversions` (race condition tiềm năng) — pre-existing pattern từ `upsertProductAttributes`
- `fromUnit === toUnit` không bị validate — circular conversion — design decision, spec không yêu cầu
- Duplicate (productId, fromUnit, toUnit) pairs trong một request không bị reject — design decision, schema không có unique constraint
- `conversionRate: number` type không chính xác (Prisma Decimal serializes as string "20.000000") — pre-existing pattern nhất quán với `standardPrice`, `minPrice`
- `editId!` non-null assertion trong `saveUomMut` — pre-existing pattern từ `saveAttrsMut`
- Không có `@ArrayMaxSize` trên conversions array — ngoài scope story

## Deferred from: code review of 1-3-price-list-management (2026-05-13)

- D1: No explicit JwtAuthGuard at class level trong PriceListController — consistent với catalog.controller.ts, global guard applies
- D2: No pagination trên listPriceLists — existing project pattern (categories/brands cũng return all)
- D3: ensureExists double DB query — performance optimization, không ảnh hưởng correctness
- D4: unitPrice @Min(0) allows zero — business decision (có thể cần giá 0 cho promo/sample)
- D5: removeItem trả về full deleted record — consistent với project CRUD pattern
- D6: No DELETE /price-lists/:id endpoint — AC4 không yêu cầu delete; có thể thêm sau
- D7: updatePriceList dùng Partial<CreatePriceListDto> — consistent với updateCategory/updateBrand pattern
- D8: customerId không tồn tại trong DB → silently falls through to default pricing — acceptable behavior cho lookup endpoint
- `uomConversions?` optional type contradicts always-present guarantee — pre-existing pattern nhất quán với `attributes?`
- Empty `conversions: []` xóa toàn bộ UoM không có xác nhận — đúng theo replace semantics của story
- Whitespace-only strings (`"  "`) qua `@IsNotEmpty()` — frontend trim đúng, direct API call là edge case
- `onError: (e: any)` trong mutations — pre-existing pattern toàn page
- Không có `@Min(1)` trên controller `id` param cho UoM endpoint — pre-existing pattern toàn controller
