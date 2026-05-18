# Story 2.2: Customer Credit Limit & Debt Tracking — Hạn mức tín dụng

Status: review

## Story

As a Finance Manager,
I want to set credit limits for customers and track their current outstanding debt,
So that sales orders can be blocked automatically when a customer exceeds their credit limit.

## Acceptance Criteria

1. **Given** tôi muốn cập nhật creditLimit của customer thành 50,000,000
   **When** PATCH /api/v1/customers/:id/credit-limit với `{ creditLimit: 50000000 }`
   **Then** customer.creditLimit được lưu
   **And** AuditLog ghi nhận thay đổi (actor, field, old value, new value)

2. **Given** customer có creditLimit=50,000,000 và tổng AR outstanding=45,000,000
   **When** GET /api/v1/customers/:id/credit-status được gọi
   **Then** response trả về: `{ creditLimit: 50000000, outstandingDebt: 45000000, availableCredit: 5000000 }`

3. **Given** customer có creditLimit=50,000,000 và outstandingDebt=48,000,000, và sales tạo đơn mới totalAmount=5,000,000
   **When** POST /api/v1/sales/orders được gọi
   **Then** API từ chối với 400 BadRequest "Vượt hạn mức tín dụng" kèm `{ creditLimit, outstandingDebt, availableCredit }`

4. **Given** customer có creditLimit=0 (không đặt hạn mức)
   **When** sales tạo đơn hàng bất kỳ giá trị
   **Then** đơn hàng được tạo bình thường (creditLimit=0 nghĩa là không giới hạn)

5. **Given** Finance Manager đang ở trang Customers
   **When** tôi click nút "Hạn mức" của một customer row
   **Then** dialog mở ra hiển thị: creditLimit, outstandingDebt, availableCredit
   **And** có field input để nhập creditLimit mới và nút Lưu

## Tasks / Subtasks

- [ ] **Task 1: Backend — Không cần migration** (AC: 1, 2, 3, 4)
  - [ ] Verify `creditLimit` column đã tồn tại trong `customers` table (Decimal 18,2, default 0) ✓
  - [ ] Permissions đã có trong seed: `finance.credit_limit.view`, `finance.credit_limit.override` ✓

- [ ] **Task 2: Backend — CustomersService credit methods** (AC: 1, 2)
  - [ ] Thêm method `updateCreditLimit(customerId: number, creditLimit: number)` vào `customers.service.ts`
    - Get current customer (NotFoundException nếu không có)
    - `prisma.customer.update({ where: { id: customerId }, data: { creditLimit } })`
    - Ghi AuditLog: `{ action: 'UPDATE_CREDIT_LIMIT', entityType: 'Customer', entityId: customerId, changes: { creditLimit: { old, new } } }`
  - [ ] Thêm method `getCreditStatus(customerId: number)` vào `customers.service.ts`
    - Get customer với `creditLimit`
    - Query AR ledger: `outstandingDebt = SUM(debitAmount) - SUM(creditAmount)` từ `accounts_receivable_ledger` where `customerId`
    - Return `{ creditLimit: Number(customer.creditLimit), outstandingDebt, availableCredit: Number(customer.creditLimit) - outstandingDebt }`
    - Nếu `creditLimit = 0`: `availableCredit = null` (không giới hạn)

- [ ] **Task 3: Backend — CustomersController credit endpoints** (AC: 1, 2)
  - [ ] Thêm `PATCH /:id/credit-limit` với `@RequirePermissions('finance.credit_limit.override')`
  - [ ] Thêm `GET /:id/credit-status` với `@RequirePermissions('finance.credit_limit.view')`
  - [ ] Route ordering: đặt 2 routes mới **trước** `POST /:id/addresses` để tránh conflict `:id` ambiguity

- [ ] **Task 4: Backend — SalesService credit check in createOrder** (AC: 3, 4)
  - [ ] Trong `createOrder()`, sau `ensureCustomerExists()`:
    - Get customer.creditLimit
    - Nếu `creditLimit == 0` → skip (unlimited)
    - Tính `outstandingDebt` từ AR ledger (cùng query như `getCreditStatus`)
    - Tính `orderTotal = totalAmount` từ `calcTotals(items)`
    - Nếu `outstandingDebt + orderTotal > creditLimit` → throw `BadRequestException` với message "Vượt hạn mức tín dụng" và body `{ creditLimit, outstandingDebt, availableCredit }`
  - [ ] **QUAN TRỌNG**: `CustomersService` phải inject vào `SalesService` (hoặc dùng Prisma trực tiếp để tránh circular dependency)

- [ ] **Task 5: Backend — UpdateCreditLimitDto** (AC: 1)
  - [ ] Thêm `UpdateCreditLimitDto` vào `backend/src/customers/dto/customer.dto.ts`:
    ```typescript
    export class UpdateCreditLimitDto {
      @ApiProperty() @IsNumber() @Min(0) @Type(() => Number)
      creditLimit: number;
    }
    ```

- [ ] **Task 6: Frontend — API functions** (AC: 1, 2, 5)
  - [ ] Thêm vào `frontend/src/lib/api/sales.ts`:
    - `updateCreditLimit(customerId: number, creditLimit: number)`
    - `getCreditStatus(customerId: number)` → `{ creditLimit, outstandingDebt, availableCredit }`

- [ ] **Task 7: Frontend — Types** (AC: 2, 5)
  - [ ] Thêm `CreditStatus` interface vào `frontend/src/types/sales.ts`:
    ```typescript
    export interface CreditStatus {
      creditLimit: number;
      outstandingDebt: number;
      availableCredit: number | null;
    }
    ```

- [ ] **Task 8: Frontend — Customers page — Credit Limit UI** (AC: 5)
  - [ ] Import API functions, CreditStatus type, icons (CreditCard, DollarSign)
  - [ ] Thêm state: `creditCustomer`, `showCreditDialog`, `newCreditLimit`
  - [ ] Query `credit-status-{id}` (enabled khi creditCustomer set) gọi `getCreditStatus`
  - [ ] Mutation `updateCreditLimitMut` gọi `updateCreditLimit`
  - [ ] Thêm nút "Hạn mức" trong action column của mỗi customer row (chỉ hiện với permission `finance.credit_limit.view`)
  - [ ] Credit Dialog với: creditLimit display, outstandingDebt display, availableCredit display, input field nhập creditLimit mới, nút Lưu
  - [ ] Format số tiền với `toLocaleString('vi-VN')` VND

- [ ] **Task 9: Frontend — i18n keys** (AC: 5)
  - [ ] Thêm 8 keys vào `customers` block trong EN và VI:
    - `creditLimit`, `creditStatus`, `outstandingDebt`, `availableCredit`
    - `editCreditLimit`, `creditLimitUpdated`, `creditLimitExceeded`, `unlimited`

- [ ] **Task 10: Backend — Unit tests** (AC: 1, 2, 3, 4)
  - [ ] Tạo `backend/src/customers/customers.credit.spec.ts` — 6 tests:
    - `updateCreditLimit`: update thành công, 404 not found
    - `getCreditStatus`: trả về đúng availableCredit, creditLimit=0 → availableCredit null
    - `createOrder` credit check: vượt hạn mức → throw BadRequest, đúng hạn mức → pass, creditLimit=0 → pass (unlimited)

## Dev Notes

### Architecture Overview

**Files cần modify (MODIFY):**
```
backend/src/customers/customers.service.ts    ← thêm updateCreditLimit, getCreditStatus
backend/src/customers/customers.controller.ts ← thêm 2 credit endpoints
backend/src/customers/dto/customer.dto.ts     ← thêm UpdateCreditLimitDto
backend/src/sales/sales.service.ts            ← thêm credit check trong createOrder
frontend/src/lib/api/sales.ts                 ← thêm 2 API functions
frontend/src/types/sales.ts                   ← thêm CreditStatus interface
frontend/src/app/(dashboard)/customers/page.tsx ← credit limit dialog
frontend/src/lib/i18n.ts                      ← 8 i18n keys mới
```

**Files cần tạo mới (NEW):**
```
backend/src/customers/customers.credit.spec.ts ← unit tests
```

---

### Không cần DB migration

`creditLimit` field đã tồn tại trong schema và DB:
```prisma
model Customer {
  // ...
  creditLimit Decimal @default(0) @map("credit_limit") @db.Decimal(18, 2)
  // ...
  arLedger AccountsReceivableLedger[]
}
```

---

### Backend — AR Ledger query pattern

`outstandingDebt` = tổng debit - tổng credit trong bảng `accounts_receivable_ledger`:

```typescript
async getCreditStatus(customerId: number) {
  const customer = await this.prisma.customer.findUnique({
    where: { id: customerId },
    select: { id: true, companyName: true, creditLimit: true },
  });
  if (!customer) throw new NotFoundException(`Customer #${customerId} not found`);

  const agg = await this.prisma.accountsReceivableLedger.aggregate({
    where: { customerId },
    _sum: { debitAmount: true, creditAmount: true },
  });

  const totalDebit  = Number(agg._sum.debitAmount  ?? 0);
  const totalCredit = Number(agg._sum.creditAmount ?? 0);
  const outstandingDebt = Math.max(0, totalDebit - totalCredit);
  const limit = Number(customer.creditLimit);

  return {
    creditLimit: limit,
    outstandingDebt,
    availableCredit: limit === 0 ? null : limit - outstandingDebt,
  };
}
```

---

### Backend — updateCreditLimit + AuditLog

```typescript
async updateCreditLimit(customerId: number, creditLimit: number) {
  const customer = await this.prisma.customer.findUnique({
    where: { id: customerId },
    select: { id: true, creditLimit: true },
  });
  if (!customer) throw new NotFoundException(`Customer #${customerId} not found`);

  const oldValue = Number(customer.creditLimit);
  const updated = await this.prisma.customer.update({
    where: { id: customerId },
    data: { creditLimit },
    select: { id: true, companyName: true, creditLimit: true },
  });

  await this.prisma.auditLog.create({
    data: {
      action: 'UPDATE',
      entityType: 'Customer',
      entityId: customerId,
      changes: JSON.stringify({ creditLimit: { old: oldValue, new: creditLimit } }),
    },
  });

  return updated;
}
```

---

### Backend — Route ordering trong CustomersController

Thêm 2 routes mới **TRƯỚC** `POST /:id/addresses`:

```typescript
// --- Credit limit routes (đặt trước /addresses) ---
@Patch(':id/credit-limit')
@RequirePermissions('finance.credit_limit.override')
@ApiOperation({ summary: 'Update customer credit limit' })
updateCreditLimit(...) {}

@Get(':id/credit-status')
@RequirePermissions('finance.credit_limit.view')
@ApiOperation({ summary: 'Get customer credit status' })
getCreditStatus(...) {}

// --- Address routes ---
@Post(':id/addresses') ...
```

---

### Backend — Credit check trong SalesService.createOrder

**QUAN TRỌNG**: Để tránh circular dependency (SalesService → CustomersService → SalesService), dùng `this.prisma` trực tiếp thay vì inject CustomersService:

```typescript
async createOrder(dto: CreateSalesOrderDto) {
  await this.ensureCustomerExists(dto.customerId);

  // Credit limit check
  const customer = await this.prisma.customer.findUnique({
    where: { id: dto.customerId },
    select: { creditLimit: true },
  });
  const limit = Number(customer!.creditLimit);

  if (limit > 0) {
    const agg = await this.prisma.accountsReceivableLedger.aggregate({
      where: { customerId: dto.customerId },
      _sum: { debitAmount: true, creditAmount: true },
    });
    const outstandingDebt = Math.max(0, Number(agg._sum.debitAmount ?? 0) - Number(agg._sum.creditAmount ?? 0));
    const { totalAmount } = this.calcTotals(dto.items);

    if (outstandingDebt + totalAmount > limit) {
      throw new BadRequestException({
        message: 'Vượt hạn mức tín dụng',
        creditLimit: limit,
        outstandingDebt,
        availableCredit: limit - outstandingDebt,
      });
    }
  }

  // ... rest of createOrder logic
}
```

---

### Frontend — Credit dialog UI pattern

Tương tự Address Dialog (đã có trong story 2-1). Dùng Dialog từ shadcn:

```tsx
// State
const [creditCustomer, setCreditCustomer] = useState<Customer | null>(null);
const [newCreditLimit, setNewCreditLimit] = useState('');

const { data: creditStatus } = useQuery({
  queryKey: ['credit-status', creditCustomer?.id],
  queryFn: () => getCreditStatus(creditCustomer!.id).then(r => r.data),
  enabled: !!creditCustomer,
});

const updateCreditMut = useMutation({
  mutationFn: ({ id, limit }: { id: number; limit: number }) =>
    updateCreditLimit(id, limit).then(r => r.data),
  onSuccess: () => {
    toast.success(t.customers.creditLimitUpdated);
    qc.invalidateQueries({ queryKey: ['customers'] });
    qc.invalidateQueries({ queryKey: ['credit-status', creditCustomer?.id] });
  },
});

// Dialog JSX
<Dialog open={!!creditCustomer} onOpenChange={(v) => { if (!v) setCreditCustomer(null); }}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>{t.customers.creditStatus} — {creditCustomer?.companyName}</DialogTitle>
    </DialogHeader>
    {creditStatus && (
      <div className="space-y-3 pt-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t.customers.outstandingDebt}</span>
          <span className="font-medium text-red-600">
            {creditStatus.outstandingDebt.toLocaleString('vi-VN')} ₫
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t.customers.availableCredit}</span>
          <span className={cn('font-medium', (creditStatus.availableCredit ?? 1) < 0 ? 'text-red-600' : 'text-green-600')}>
            {creditStatus.availableCredit === null
              ? t.customers.unlimited
              : `${creditStatus.availableCredit.toLocaleString('vi-VN')} ₫`}
          </span>
        </div>
        <div className="border-t pt-3">
          <label className="text-sm font-medium">{t.customers.editCreditLimit}</label>
          <div className="flex gap-2 mt-1">
            <Input
              type="number"
              min={0}
              defaultValue={creditStatus.creditLimit}
              onChange={(e) => setNewCreditLimit(e.target.value)}
              placeholder="0 = không giới hạn"
            />
            <Button
              disabled={updateCreditMut.isPending || !newCreditLimit}
              onClick={() => updateCreditMut.mutate({ id: creditCustomer!.id, limit: Number(newCreditLimit) })}
            >
              {t.common.save}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">0 = không giới hạn</p>
        </div>
      </div>
    )}
  </DialogContent>
</Dialog>
```

---

### Frontend — i18n keys cần thêm

```typescript
// EN
customers: {
  ...existing,
  creditLimit: "Credit Limit",
  creditStatus: "Credit Status",
  outstandingDebt: "Outstanding Debt",
  availableCredit: "Available Credit",
  editCreditLimit: "Set Credit Limit",
  creditLimitUpdated: "Credit limit updated",
  creditLimitExceeded: "Credit limit exceeded",
  unlimited: "Unlimited",
}

// VI
customers: {
  ...existing,
  creditLimit: "Hạn mức tín dụng",
  creditStatus: "Trạng thái tín dụng",
  outstandingDebt: "Dư nợ hiện tại",
  availableCredit: "Tín dụng khả dụng",
  editCreditLimit: "Đặt hạn mức",
  creditLimitUpdated: "Đã cập nhật hạn mức tín dụng",
  creditLimitExceeded: "Vượt hạn mức tín dụng",
  unlimited: "Không giới hạn",
}
```

---

### Frontend — Kiểm tra permission trước khi hiện nút "Hạn mức"

Chỉ render nút Hạn mức khi user có `finance.credit_limit.view`. Dùng `useAuth()` hook để lấy permissions:

```tsx
const { user } = useAuth();
const canViewCredit = user?.permissions?.includes('finance.credit_limit.view');
const canEditCredit = user?.permissions?.includes('finance.credit_limit.override');

// Trong action column:
{canViewCredit && (
  <Button size="sm" variant="ghost" onClick={() => { setCreditCustomer(row); }}>
    <CreditCard className="h-3 w-3 mr-1" />
    {t.customers.creditLimit}
  </Button>
)}
```

---

### Unit test structure

```typescript
// backend/src/customers/customers.credit.spec.ts
const mockPrisma: any = {
  customer: { findUnique: jest.fn(), update: jest.fn() },
  accountsReceivableLedger: { aggregate: jest.fn() },
  auditLog: { create: jest.fn() },
};

describe('CustomersService — credit methods', () => {
  describe('getCreditStatus', () => {
    it('should compute availableCredit correctly', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue({ id: 1, companyName: 'Test', creditLimit: '50000000' });
      mockPrisma.accountsReceivableLedger.aggregate.mockResolvedValue({
        _sum: { debitAmount: '45000000', creditAmount: '5000000' },
      });
      const result = await service.getCreditStatus(1);
      expect(result.outstandingDebt).toBe(40000000); // 45M - 5M
      expect(result.availableCredit).toBe(10000000); // 50M - 40M
    });

    it('should return availableCredit=null when creditLimit=0', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue({ id: 1, companyName: 'Test', creditLimit: '0' });
      mockPrisma.accountsReceivableLedger.aggregate.mockResolvedValue({ _sum: { debitAmount: null, creditAmount: null } });
      const result = await service.getCreditStatus(1);
      expect(result.availableCredit).toBeNull();
    });
  });

  describe('updateCreditLimit', () => {
    it('should update credit limit and write audit log', async () => { ... });
    it('should throw NotFoundException for unknown customer', async () => { ... });
  });
});

// Test credit check in SalesService
describe('SalesService.createOrder — credit check', () => {
  it('should throw 400 when order would exceed credit limit', async () => { ... });
  it('should pass when creditLimit=0 (unlimited)', async () => { ... });
  it('should pass when outstanding + order <= creditLimit', async () => { ... });
});
```

---

### Previous Story Learnings (từ Story 2-1)

1. **Migration thủ công**: Không cần trong story này — `creditLimit` đã có sẵn
2. **`$transaction` trong tests**: `jest.fn((fn: Function) => fn(mockPrisma))`
3. **`mockPrisma: any`** để tránh TypeScript self-referential type lỗi
4. **Run jest từ `backend/` dir**: `npx jest` để ts-jest hoạt động đúng scope
5. **Route ordering**: `GET /:id/credit-status` phải đặt trước `POST /:id/portal-account` hoặc sau `GET /:id` — kiểm tra kỹ NestJS route resolution
6. **Circular dependency**: Dùng `this.prisma` trực tiếp trong SalesService thay vì inject CustomersService

---

### AuditLog model reference

```prisma
model AuditLog {
  id         Int      @id @default(autoincrement())
  userId     Int?     @map("user_id")
  action     String   @db.VarChar(100)
  entityType String?  @map("entity_type") @db.VarChar(100)
  entityId   Int?     @map("entity_id")
  changes    String?  @db.Text  // JSON string
  ipAddress  String?  @map("ip_address") @db.VarChar(45)
  userAgent  String?  @map("user_agent") @db.VarChar(500)
  createdAt  DateTime @default(now()) @map("created_at")
}
```

`changes` là JSON string `{ field: { old, new } }` — không có userId bắt buộc (có thể null khi system action).

## Dev Agent Record

### Debug Log
| # | Issue | Resolution |
|---|-------|------------|

### Completion Notes

### File List

### Change Log
