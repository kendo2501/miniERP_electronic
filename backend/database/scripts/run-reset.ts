/**
 * Business Data Reset Runner
 * Chạy: npx ts-node database/scripts/run-reset.ts
 *
 * Xóa toàn bộ dữ liệu nghiệp vụ, GIỮ:
 *   - users / roles / permissions / RBAC
 *   - products / categories / brands / product catalog
 *   - warehouses, organizations, settings
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('⚠️  miniERP — Business Data Reset');
  console.log('   Giữ: users, RBAC, product catalog');
  console.log('   Xóa: sales, finance, inventory tx, logs\n');

  // ─── Đếm trước để hiển thị báo cáo ──────────────────────────
  const before = await countAll();
  printReport('TRƯỚC KHI RESET', before);

  await prisma.$transaction(
    async (tx) => {
      // ── STEP 1: Finance ──────────────────────────────────────
      await tx.paymentAllocation.deleteMany();
      await tx.accountsReceivableLedger.deleteMany();
      await tx.accountsPayableLedger.deleteMany();
      await tx.invoice.deleteMany();
      await tx.payment.deleteMany();
      await tx.supplierPayment.deleteMany();
      console.log('✓ Finance cleared');

      // ── STEP 2: Purchase / GRN ───────────────────────────────
      await tx.goodsReceiptItem.deleteMany();
      await tx.goodsReceipt.deleteMany();
      await tx.purchaseOrderItem.deleteMany();
      await tx.purchaseOrder.deleteMany();
      await tx.supplier.deleteMany();
      console.log('✓ Purchase / GRN cleared');

      // ── STEP 3: Sales ────────────────────────────────────────
      await tx.deliveryItem.deleteMany();
      await tx.delivery.deleteMany();
      await tx.salesReturnItem.deleteMany();
      await tx.salesReturn.deleteMany();
      await tx.replenishmentRequest.deleteMany();
      await tx.stockInquiryItem.deleteMany();
      await tx.stockInquiry.deleteMany();
      await tx.salesOrderItem.deleteMany();
      await tx.salesOrder.deleteMany();
      await tx.quotationItem.deleteMany();
      await tx.quotation.deleteMany();
      console.log('✓ Sales cleared');

      // ── STEP 4: Inventory transactions ───────────────────────
      await tx.stockCountItem.deleteMany();
      await tx.stockCount.deleteMany();
      await tx.inventoryTransaction.deleteMany();
      // inventory_stocks: GIỮ NGUYÊN — tồn kho thực tế không bị xóa
      console.log('✓ Inventory transactions cleared (stocks preserved)');

      // ── STEP 5: Price lists ──────────────────────────────────
      await tx.priceListItem.deleteMany();
      await tx.priceList.deleteMany();
      console.log('✓ Price lists cleared');

      // ── STEP 6: Customers (giữ linked accounts) ──────────────
      const linkedIds = (
        await tx.user.findMany({
          where: { linkedCustomerId: { not: null } },
          select: { linkedCustomerId: true },
        })
      ).map((u) => u.linkedCustomerId as number);

      await tx.customerAddress.deleteMany({
        where:
          linkedIds.length > 0
            ? { customerId: { notIn: linkedIds } }
            : undefined,
      });
      await tx.customer.deleteMany({
        where:
          linkedIds.length > 0
            ? { id: { notIn: linkedIds } }
            : undefined,
      });
      console.log(
        `✓ Customers cleared (kept ${linkedIds.length} linked to user accounts)`,
      );

      // ── STEP 7: Logs, notifications, attachments ─────────────
      await tx.notification.deleteMany();
      await tx.attachment.deleteMany();
      await tx.auditLog.deleteMany();
      await tx.generatedReport.deleteMany();
      await tx.scheduledReport.deleteMany();
      console.log('✓ Audit logs / notifications / attachments cleared');

      // ── STEP 8: Sessions (users cần đăng nhập lại) ───────────
      // Xóa self-reference trước
      await tx.$executeRawUnsafe(
        'UPDATE refresh_tokens SET rotated_from = NULL',
      );
      await tx.refreshToken.deleteMany();
      await tx.session.deleteMany();
      console.log('✓ Sessions cleared (users will need to log in again)');
    },
    { timeout: 60_000 },
  );

  // ─── Báo cáo sau reset ───────────────────────────────────────
  const after = await countAll();
  printReport('SAU KHI RESET', after);
  console.log('\n✅ Reset hoàn tất thành công!');
}

async function countAll() {
  const [
    users, roles, permissions, products, categories, brands,
    inventoryStocks, customers,
    salesOrders, quotations, invoices, payments, auditLogs, notifications,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.role.count(),
    prisma.permission.count(),
    prisma.product.count(),
    prisma.category.count(),
    prisma.brand.count(),
    prisma.inventoryStock.count(),
    prisma.customer.count(),
    prisma.salesOrder.count(),
    prisma.quotation.count(),
    prisma.invoice.count(),
    prisma.payment.count(),
    prisma.auditLog.count(),
    prisma.notification.count(),
  ]);
  return {
    users, roles, permissions, products, categories, brands,
    inventoryStocks, customers,
    salesOrders, quotations, invoices, payments, auditLogs, notifications,
  };
}

function printReport(label: string, counts: Record<string, number>) {
  console.log(`\n── ${label} ──────────────────────`);
  const kept = ['users', 'roles', 'permissions', 'products', 'categories', 'brands', 'inventoryStocks', 'customers'];
  const deleted = ['salesOrders', 'quotations', 'invoices', 'payments', 'auditLogs', 'notifications'];
  console.log('  [GIỮ LẠI]');
  kept.forEach((k) => console.log(`    ${k.padEnd(18)} ${counts[k]}`));
  console.log('  [NGHIỆP VỤ]');
  deleted.forEach((k) => console.log(`    ${k.padEnd(18)} ${counts[k]}`));
}

main()
  .catch((e) => {
    console.error('\n❌ Reset thất bại:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
