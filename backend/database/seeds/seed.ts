import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// -------------------------------------------------------
// Master data — roles & permissions (unchanged)
// -------------------------------------------------------

const ROLES = [
  { code: 'ADMIN',      name: 'Administrator', description: 'Full system access' },
  { code: 'SALES',      name: 'Sales',         description: 'Sales operations' },
  { code: 'CUSTOMER',   name: 'Customer',      description: 'Customer self-service portal' },
  { code: 'ACCOUNTANT', name: 'Accountant',    description: 'Finance and accounting operations' },
  { code: 'WAREHOUSE',  name: 'Warehouse',     description: 'Inventory and warehouse operations' },
];

const PERMISSIONS = [
  { code: 'auth.user.read',                    description: 'View user list' },
  { code: 'auth.user.create',                  description: 'Create users' },
  { code: 'auth.user.update',                  description: 'Update users' },
  { code: 'auth.user.lock',                    description: 'Lock user accounts' },
  { code: 'auth.user.unlock',                  description: 'Unlock user accounts' },
  { code: 'auth.user.assign_roles',            description: 'Assign roles to users' },
  { code: 'auth.role.assign',                  description: 'Assign roles' },
  { code: 'auth.permission.manage',            description: 'Manage permissions' },
  { code: 'auth.password.change_self',         description: 'Change own password' },
  { code: 'session.revoke',                    description: 'Revoke a session' },
  { code: 'session.revoke_all',                description: 'Revoke all user sessions' },
  { code: 'audit.security.view',               description: 'View security audit logs' },
  { code: 'catalog.product.view',              description: 'View products' },
  { code: 'catalog.product.create',            description: 'Create products' },
  { code: 'catalog.product.update',            description: 'Update products' },
  { code: 'catalog.product.deactivate',        description: 'Deactivate products' },
  { code: 'catalog.category.manage',           description: 'Manage categories' },
  { code: 'catalog.search',                    description: 'Search catalog' },
  { code: 'inventory.stock.view',              description: 'View inventory stock' },
  { code: 'inventory.adjust',                  description: 'Adjust inventory' },
  { code: 'inventory.adjust.approve',          description: 'Approve inventory adjustments' },
  { code: 'inventory.transfer',                description: 'Transfer inventory' },
  { code: 'inventory.transfer.approve',        description: 'Approve inventory transfers' },
  { code: 'inventory.warehouse.manage',        description: 'Manage warehouses' },
  { code: 'inventory.availability.check',      description: 'Check inventory availability' },
  { code: 'inventory.low_stock.view',          description: 'View low stock alerts' },
  { code: 'customer.view_assigned',            description: 'View assigned customers' },
  { code: 'customer.create',                   description: 'Create customers' },
  { code: 'customer.update_assigned',          description: 'Update assigned customers' },
  { code: 'sales.quotation.create',            description: 'Create quotations' },
  { code: 'sales.quotation.create_request',    description: 'Request a quotation (customer)' },
  { code: 'sales.quotation.update_own',        description: 'Update own quotations' },
  { code: 'sales.quotation.approve',           description: 'Approve quotations' },
  { code: 'sales.quotation.view_own',          description: 'View own quotations' },
  { code: 'sales.order.create',               description: 'Create sales orders' },
  { code: 'sales.order.view_assigned',         description: 'View assigned orders' },
  { code: 'sales.order.view_all',              description: 'View all orders' },
  { code: 'sales.order.view_own',              description: 'View own orders' },
  { code: 'sales.order.view_team',             description: 'View team orders' },
  { code: 'sales.order.approve',               description: 'Approve orders' },
  { code: 'sales.order.cancel',               description: 'Cancel orders' },
  { code: 'sales.order.cancel_request',        description: 'Request order cancellation' },
  { code: 'sales.order.cancel_approve',        description: 'Approve order cancellation' },
  { code: 'sales.order.override',              description: 'Override order constraints' },
  { code: 'sales.pricing.manage',              description: 'Manage pricing' },
  { code: 'sales.pricing.override_approve',    description: 'Approve pricing overrides' },
  { code: 'sales.delivery.view',               description: 'View deliveries' },
  { code: 'sales.delivery.view_own',           description: 'View own deliveries' },
  { code: 'finance.invoice.view',              description: 'View invoices' },
  { code: 'finance.invoice.view_assigned',     description: 'View assigned invoices' },
  { code: 'finance.invoice.view_own',          description: 'View own invoices' },
  { code: 'finance.invoice.create',            description: 'Create and manage invoices' },
  { code: 'finance.payment.view',              description: 'View payments' },
  { code: 'finance.payment.create',            description: 'Record and manage payments' },
  { code: 'finance.payment.reverse',           description: 'Reverse payments' },
  { code: 'finance.payment_status.view_assigned', description: 'View assigned payment status' },
  { code: 'finance.payment_status.view_own',   description: 'View own payment status' },
  { code: 'finance.credit_limit.view',          description: 'View customer credit limits and debt exposure' },
  { code: 'finance.credit_limit.override',     description: 'Override credit limits' },
  { code: 'finance.credit_limit.override_approve', description: 'Approve credit limit overrides' },
  { code: 'finance.outstanding.view_assigned', description: 'View assigned outstanding balances' },
  { code: 'finance.outstanding.view_own',      description: 'View own outstanding balance' },
  { code: 'finance.report.export',             description: 'Export finance reports' },
  { code: 'finance.aging_report.view',         description: 'View aging reports' },
  { code: 'reporting.dashboard.view_all',      description: 'View all dashboards' },
  { code: 'reporting.dashboard.view_team',     description: 'View team dashboards' },
  { code: 'reporting.dashboard.view_self',     description: 'View own dashboard' },
  { code: 'reporting.export',                  description: 'Export reports (all)' },
  { code: 'reporting.export_team',             description: 'Export team reports' },
  { code: 'reporting.export_self',             description: 'Export own reports' },
  { code: 'reporting.schedule.manage',         description: 'Manage scheduled reports' },
  { code: 'reporting.kpi.view',                description: 'View KPIs' },
  { code: 'reporting.sales_kpi.view_self',     description: 'View own sales KPIs' },
  { code: 'settings.manage',                   description: 'Manage system settings' },
  { code: 'feature_flags.manage',              description: 'Manage feature flags' },
  { code: 'organization.settings.manage',      description: 'Manage organization settings' },
  { code: 'notification.template.manage',      description: 'Manage notification templates' },
  { code: 'notification.retry.manage',         description: 'Manage notification retries' },
  { code: 'notification.view_team',            description: 'View team notifications' },
  { code: 'notification.preferences.manage_self', description: 'Manage own notification preferences' },
  { code: 'attachments.download_own',          description: 'Download own attachments' },
  { code: 'attachments.view_own',              description: 'View own attachments' },
  { code: 'profile.view_self',                 description: 'View own profile' },
  { code: 'profile.update_self',               description: 'Update own profile' },
  { code: 'users.team.view',                   description: 'View team members' },
  { code: 'users.team.performance.view',       description: 'View team performance' },
  { code: 'reporting.dashboard.view_finance',  description: 'View finance/accountant dashboard' },
  { code: 'reporting.dashboard.view_warehouse',description: 'View warehouse dashboard' },
  { code: 'inventory.stock.request',          description: 'Create stock availability requests' },
  { code: 'inventory.stock.respond',          description: 'Respond to stock availability requests' },
];

const ROLE_PERMISSIONS: Record<string, string[]> = {
  ADMIN: [
    'auth.user.read', 'auth.user.create', 'auth.user.update', 'auth.user.lock', 'auth.user.unlock', 'auth.user.assign_roles',
    'auth.role.assign', 'auth.permission.manage', 'auth.password.change_self',
    'session.revoke', 'session.revoke_all',
    'audit.security.view',
    'catalog.product.view', 'catalog.product.create', 'catalog.product.update',
    'catalog.product.deactivate', 'catalog.category.manage', 'catalog.search',
    'inventory.stock.view', 'inventory.adjust', 'inventory.adjust.approve',
    'inventory.transfer', 'inventory.transfer.approve', 'inventory.warehouse.manage',
    'inventory.availability.check', 'inventory.low_stock.view',
    'customer.view_assigned', 'customer.create', 'customer.update_assigned',
    'sales.quotation.create', 'sales.quotation.approve', 'sales.quotation.update_own',
    'sales.order.create', 'sales.order.view_all', 'sales.order.cancel', 'sales.order.approve',
    'sales.order.override', 'sales.pricing.manage', 'sales.delivery.view',
    'finance.invoice.view', 'finance.invoice.create',
    'finance.payment.view', 'finance.payment.create', 'finance.payment.reverse',
    'finance.credit_limit.override', 'finance.report.export', 'finance.aging_report.view',
    'reporting.dashboard.view_all', 'reporting.export', 'reporting.schedule.manage', 'reporting.kpi.view',
    'settings.manage', 'feature_flags.manage', 'organization.settings.manage',
    'notification.template.manage', 'notification.retry.manage',
    'users.team.view', 'users.team.performance.view',
    'profile.view_self', 'profile.update_self',
  ],
  SALES: [
    'auth.password.change_self',
    'catalog.product.view', 'catalog.search',
    'inventory.stock.view', 'inventory.availability.check',
    'customer.view_assigned', 'customer.create', 'customer.update_assigned',
    'sales.quotation.create', 'sales.quotation.update_own',
    'sales.order.create', 'sales.order.view_assigned', 'sales.order.cancel_request', 'sales.delivery.view',
    'inventory.stock.request',
    'finance.invoice.view_assigned', 'finance.payment_status.view_assigned', 'finance.outstanding.view_assigned',
    'reporting.dashboard.view_self', 'reporting.sales_kpi.view_self', 'reporting.export_self',
    'notification.preferences.manage_self',
    'profile.view_self', 'profile.update_self',
  ],
  CUSTOMER: [
    'auth.password.change_self',
    'catalog.product.view', 'catalog.search',
    'sales.quotation.create_request', 'sales.quotation.view_own', 'sales.order.view_own', 'sales.delivery.view_own',
    'finance.invoice.view_own', 'finance.payment_status.view_own', 'finance.outstanding.view_own',
    'attachments.download_own', 'attachments.view_own',
    'profile.view_self', 'profile.update_self', 'notification.preferences.manage_self',
    'reporting.dashboard.view_self',
  ],
  ACCOUNTANT: [
    'auth.password.change_self',
    // ── Read-only cross-domain access (no write) ──────────────────────────────
    'catalog.product.view', 'catalog.search',
    'sales.order.view_all',       // read-only: view order totals & payment status
    'sales.delivery.view',        // read-only: delivery records for invoice matching
    // ── Finance domain (full CRUD within scope) ───────────────────────────────
    'finance.invoice.view',
    'finance.payment.view',
    'finance.payment.reverse',    // payment allocation / reconciliation
    'finance.credit_limit.view',  // customer credit limit + debt exposure monitoring
    'finance.aging_report.view',
    'finance.report.export',
    'finance.outstanding.view_assigned',
    // ── Reporting / dashboard ─────────────────────────────────────────────────
    'reporting.dashboard.view_finance',
    'reporting.kpi.view',
    'reporting.export',
    // ── Self-service ──────────────────────────────────────────────────────────
    'notification.preferences.manage_self',
    'profile.view_self', 'profile.update_self',
  ],
  WAREHOUSE: [
    'auth.password.change_self',
    'catalog.product.view', 'catalog.search',
    'inventory.stock.view', 'inventory.adjust', 'inventory.adjust.approve',
    'inventory.transfer', 'inventory.transfer.approve', 'inventory.warehouse.manage',
    'inventory.availability.check', 'inventory.low_stock.view',
    'inventory.stock.respond',
    'sales.delivery.view',
    'reporting.dashboard.view_warehouse', 'reporting.kpi.view',
    'notification.preferences.manage_self',
    'profile.view_self', 'profile.update_self',
  ],
};

// -------------------------------------------------------
// Main
// -------------------------------------------------------

async function main() {
  console.log('Seeding database...');

  // ── Organization ──────────────────────────────────────
  const org = await prisma.organization.upsert({
    where: { code: 'MINHERP' },
    update: {},
    create: {
      code: 'MINHERP',
      name: 'Công ty TNHH Thiết Bị Điện Minh Phát',
      email: 'info@minhphatelectric.vn',
      status: 'ACTIVE',
    },
  });

  // ── Permissions ───────────────────────────────────────
  for (const perm of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: { description: perm.description },
      create: perm,
    });
  }

  // ── Roles + RolePermissions ───────────────────────────
  const createdRoles: Record<string, { id: number }> = {};
  for (const role of ROLES) {
    const r = await prisma.role.upsert({
      where: { code: role.code },
      update: { name: role.name, description: role.description },
      create: role,
    });
    createdRoles[role.code] = r;
  }

  for (const [roleCode, permCodes] of Object.entries(ROLE_PERMISSIONS)) {
    const role = createdRoles[roleCode];
    if (!role) continue;
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    for (const permCode of permCodes) {
      const perm = await prisma.permission.findUnique({ where: { code: permCode } });
      if (!perm) continue;
      await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: perm.id } });
    }
  }

  // ── Users ─────────────────────────────────────────────
  const usersToSeed = [
    { email: 'admin@mini-erp.local',      password: 'Admin@123456',      fullName: 'Quản Trị Hệ Thống',   roleCode: 'ADMIN'      },
    { email: 'sales@mini-erp.local',      password: 'Sales@123456',      fullName: 'Trần Văn Bình',        roleCode: 'SALES'      },
    { email: 'customer@mini-erp.local',   password: 'Customer@123456',   fullName: 'Lê Văn Thắng',         roleCode: 'CUSTOMER'   },
    { email: 'accountant@mini-erp.local', password: 'Accountant@123456', fullName: 'Phạm Thị Lan',         roleCode: 'ACCOUNTANT' },
    { email: 'warehouse@mini-erp.local',  password: 'Warehouse@123456',  fullName: 'Hoàng Văn Đức',        roleCode: 'WAREHOUSE'  },
  ];

  const userMap: Record<string, { id: number }> = {};
  for (const u of usersToSeed) {
    const hash = await bcrypt.hash(u.password, 12);
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { passwordHash: hash, status: 'ACTIVE', failedLoginAttempts: 0, lockedUntil: null },
      create: {
        organizationId: org.id,
        email: u.email,
        passwordHash: hash,
        fullName: u.fullName,
        status: 'ACTIVE',
        isVerified: true,
      },
    });
    userMap[u.roleCode] = user;

    const roleRecord = createdRoles[u.roleCode];
    if (roleRecord) {
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId: roleRecord.id } },
        update: {},
        create: { userId: user.id, roleId: roleRecord.id },
      });
    }
  }

  const adminId = userMap['ADMIN'].id;
  const salesId = userMap['SALES'].id;

  // ── Brands ────────────────────────────────────────────
  const brandsData = [
    { code: 'SCHNEIDER', name: 'Schneider Electric', description: 'Thiết bị điện công nghiệp và dân dụng Pháp' },
    { code: 'ABB',       name: 'ABB',               description: 'Thiết bị điện công nghiệp Thụy Điển' },
    { code: 'SIEMENS',   name: 'Siemens',            description: 'Thiết bị điện & tự động hóa Đức' },
    { code: 'CADIVI',    name: 'CADIVI',             description: 'Dây & cáp điện Việt Nam' },
    { code: 'RANGDONG',  name: 'Rạng Đông',          description: 'Thiết bị chiếu sáng Việt Nam' },
  ];
  const brandMap: Record<string, { id: number }> = {};
  for (const b of brandsData) {
    brandMap[b.code] = await prisma.brand.upsert({
      where: { code: b.code },
      update: { name: b.name, description: b.description },
      create: b,
    });
  }

  // ── Categories ────────────────────────────────────────
  const catRoot = await prisma.category.upsert({
    where: { code: 'THIET_BI_DIEN' },
    update: {},
    create: { code: 'THIET_BI_DIEN', name: 'Thiết bị điện', isActive: true },
  });
  const catDongCat = await prisma.category.upsert({
    where: { code: 'DONG_CAT' },
    update: {},
    create: { code: 'DONG_CAT', name: 'Thiết bị đóng cắt', parentId: catRoot.id, isActive: true },
  });
  const catCapDien = await prisma.category.upsert({
    where: { code: 'CAP_DIEN' },
    update: {},
    create: { code: 'CAP_DIEN', name: 'Cáp & dây điện', parentId: catRoot.id, isActive: true },
  });
  const catChieuSang = await prisma.category.upsert({
    where: { code: 'CHIEU_SANG' },
    update: {},
    create: { code: 'CHIEU_SANG', name: 'Chiếu sáng', parentId: catRoot.id, isActive: true },
  });

  // ── Products ──────────────────────────────────────────
  // Prices in VND
  const productsData = [
    {
      sku: 'MCB-SCH-1P-16A',
      productName: 'Aptomat MCB 1P 16A Schneider iC60N',
      categoryId: catDongCat.id, brandId: brandMap['SCHNEIDER'].id,
      standardPrice: 185000, minPrice: 155000, unit: 'Cái',
      description: 'Cầu dao tự động 1 pha 16A Schneider iC60N — cắt ngắn mạch 6kA',
    },
    {
      sku: 'MCCB-ABB-3P-100A',
      productName: 'MCCB 3P 100A ABB Tmax T3',
      categoryId: catDongCat.id, brandId: brandMap['ABB'].id,
      standardPrice: 3200000, minPrice: 2800000, unit: 'Cái',
      description: 'Cầu dao khối MCCB 3 pha 100A ABB Tmax T3 — Icu 36kA',
    },
    {
      sku: 'CAP-CADIVI-CVV-2x2.5',
      productName: 'Cáp điện CVV 2×2,5mm² CADIVI',
      categoryId: catCapDien.id, brandId: brandMap['CADIVI'].id,
      standardPrice: 28000, minPrice: 22000, unit: 'Mét',
      description: 'Cáp điện lực hạ thế CVV 2×2,5mm² CADIVI — vỏ PVC chịu nhiệt 70°C',
    },
    {
      sku: 'CONT-SIE-3RT-22A',
      productName: 'Khởi động từ Siemens 3RT 22A',
      categoryId: catDongCat.id, brandId: brandMap['SIEMENS'].id,
      standardPrice: 450000, minPrice: 380000, unit: 'Cái',
      description: 'Contactor 3 pha 22A Siemens 3RT2026 — cuộn dây 220VAC',
    },
    {
      sku: 'DEN-LED-RD-18W',
      productName: 'Đèn LED Panel 18W Rạng Đông',
      categoryId: catChieuSang.id, brandId: brandMap['RANGDONG'].id,
      standardPrice: 145000, minPrice: 115000, unit: 'Cái',
      description: 'Đèn LED âm trần panel vuông 18W Rạng Đông — 4000K, CRI>80, tuổi thọ 25.000h',
    },
  ];
  const productMap: Record<string, { id: number }> = {};
  for (const p of productsData) {
    productMap[p.sku] = await prisma.product.upsert({
      where: { sku: p.sku },
      update: { productName: p.productName, standardPrice: p.standardPrice, minPrice: p.minPrice },
      create: { ...p, isActive: true },
    });
  }

  // ── Warehouse ─────────────────────────────────────────
  const warehouse = await prisma.warehouse.upsert({
    where: { code: 'WH-001' },
    update: {},
    create: {
      code: 'WH-001',
      warehouseName: 'Kho Thiết Bị Điện Chính',
      address: '123 Đường Tân Thới Nhất, KCN Tân Bình, Quận 12, TP. Hồ Chí Minh',
      status: 'ACTIVE',
    },
  });

  // ── Inventory Stock ───────────────────────────────────
  // Đèn LED 18W tồn kho thấp (8 cái < ngưỡng cảnh báo 10) → kích hoạt cảnh báo
  const stockData = [
    { sku: 'MCB-SCH-1P-16A',      qty: 530 },
    { sku: 'MCCB-ABB-3P-100A',    qty: 25  },
    { sku: 'CAP-CADIVI-CVV-2x2.5', qty: 1000 },
    { sku: 'CONT-SIE-3RT-22A',    qty: 75  },
    { sku: 'DEN-LED-RD-18W',      qty: 8   },
  ];
  for (const s of stockData) {
    await prisma.inventoryStock.upsert({
      where: { warehouseId_productId: { warehouseId: warehouse.id, productId: productMap[s.sku].id } },
      update: { availableQuantity: s.qty },
      create: { warehouseId: warehouse.id, productId: productMap[s.sku].id, availableQuantity: s.qty },
    });
  }

  // ── Inventory Transactions ─────────────────────────────
  const txCount = await prisma.inventoryTransaction.count({ where: { warehouseId: warehouse.id } });
  if (txCount === 0) {
    const txData = [
      { sku: 'MCB-SCH-1P-16A',       qty:  600, type: 'INITIAL_IN',   notes: 'Nhập kho ban đầu — Aptomat MCB 1P 16A Schneider' },
      { sku: 'MCCB-ABB-3P-100A',     qty:   35, type: 'INITIAL_IN',   notes: 'Nhập kho ban đầu — MCCB 3P 100A ABB Tmax T3' },
      { sku: 'CAP-CADIVI-CVV-2x2.5', qty: 1200, type: 'INITIAL_IN',   notes: 'Nhập kho ban đầu — Cáp CVV 2×2,5mm² CADIVI' },
      { sku: 'CONT-SIE-3RT-22A',     qty:   80, type: 'INITIAL_IN',   notes: 'Nhập kho ban đầu — Khởi động từ Siemens 3RT 22A' },
      { sku: 'DEN-LED-RD-18W',       qty:   20, type: 'INITIAL_IN',   notes: 'Nhập kho ban đầu — Đèn LED Panel 18W Rạng Đông' },
      // DEL-2026-00001: SO1 → Xây Dựng Hoàng Phát
      { sku: 'MCCB-ABB-3P-100A',     qty:  -10, type: 'DELIVERY_OUT', notes: 'DEL-2026-00001 — Xuất kho cho Xây Dựng Hoàng Phát' },
      { sku: 'MCB-SCH-1P-16A',       qty:  -50, type: 'DELIVERY_OUT', notes: 'DEL-2026-00001 — Xuất kho cho Xây Dựng Hoàng Phát' },
      // DEL-2026-00002: SO2 → Điện Nhật Minh
      { sku: 'CAP-CADIVI-CVV-2x2.5', qty: -200, type: 'DELIVERY_OUT', notes: 'DEL-2026-00002 — Xuất kho cho Điện Nhật Minh' },
      { sku: 'MCB-SCH-1P-16A',       qty:  -20, type: 'DELIVERY_OUT', notes: 'DEL-2026-00002 — Xuất kho cho Điện Nhật Minh' },
      // Kiểm kê điều chỉnh
      { sku: 'CONT-SIE-3RT-22A',     qty:   -5, type: 'ADJUST_OUT',   notes: 'Điều chỉnh kiểm kê — Khởi động từ bị hỏng' },
      { sku: 'DEN-LED-RD-18W',       qty:  -12, type: 'ADJUST_OUT',   notes: 'Điều chỉnh kiểm kê — Đèn LED hỏng vỡ' },
    ];
    for (const t of txData) {
      await prisma.inventoryTransaction.create({
        data: {
          warehouseId: warehouse.id,
          productId: productMap[t.sku].id,
          transactionType: t.type,
          quantity: t.qty,
          balanceAfter: stockData.find(s => s.sku === t.sku)!.qty,
          notes: t.notes,
          createdBy: adminId,
          createdAt: new Date('2026-03-01'),
        },
      });
    }
  }

  // ── Customers ─────────────────────────────────────────
  const customersData = [
    {
      customerCode: 'CUST-001',
      companyName: 'Công ty TNHH Xây Dựng Hoàng Phát',
      contactName: 'Nguyễn Văn Thắng',
      phone: '0901234567',
      email: 'hoangphat@xaydunghoangphat.vn',
      address: '456 Lê Văn Việt, Phường Hiệp Phú, TP. Thủ Đức, TP. Hồ Chí Minh',
      creditLimit: 150000000, status: 'ACTIVE',
      customerType: 'WHOLESALE',
    },
    {
      customerCode: 'CUST-002',
      companyName: 'Công ty CP Điện Nhật Minh',
      contactName: 'Trần Thị Thanh',
      phone: '0912345678',
      email: 'nhatminh@diennhatminh.vn',
      address: '789 Nguyễn Văn Linh, Phường Tân Phong, Quận 7, TP. Hồ Chí Minh',
      creditLimit: 100000000, status: 'ACTIVE',
      customerType: 'WHOLESALE',
    },
    {
      customerCode: 'CUST-003',
      companyName: 'Công ty TNHH Cơ Điện Phú Long',
      contactName: 'Lê Văn Bình',
      phone: '0923456789',
      email: 'phulong@codienphulong.vn',
      address: '321 Phạm Văn Đồng, Phường Hiệp Bình Chánh, TP. Thủ Đức, TP. Hồ Chí Minh',
      creditLimit: 80000000, status: 'ACTIVE',
      customerType: 'RETAIL',
    },
  ];
  const custMap: Record<string, { id: number }> = {};
  for (const c of customersData) {
    custMap[c.customerCode] = await prisma.customer.upsert({
      where: { customerCode: c.customerCode },
      update: { companyName: c.companyName, email: c.email },
      create: { ...c, organizationId: org.id, assignedSalesUserId: salesId },
    });
  }

  const cust1 = custMap['CUST-001'].id;
  const cust2 = custMap['CUST-002'].id;
  const cust3 = custMap['CUST-003'].id;

  // Link customer portal user (customer@mini-erp.local) to CUST-001
  await prisma.user.update({
    where: { id: userMap['CUSTOMER'].id },
    data: { linkedCustomerId: cust1 },
  });

  // ── Settings ──────────────────────────────────────────
  const settingsToSeed = [
    { key: 'system.company_name',           value: 'Thiết Bị Điện Minh Phát',  category: 'system',        valueType: 'string',  isSensitive: false, isReadonly: false },
    { key: 'system.currency',               value: 'VND',                      category: 'system',        valueType: 'string',  isSensitive: false, isReadonly: false },
    { key: 'system.timezone',               value: 'Asia/Ho_Chi_Minh',         category: 'system',        valueType: 'string',  isSensitive: false, isReadonly: false },
    { key: 'finance.default_payment_terms', value: 30,                         category: 'finance',       valueType: 'number',  isSensitive: false, isReadonly: false },
    { key: 'finance.tax_rate_percent',      value: 10,                         category: 'finance',       valueType: 'number',  isSensitive: false, isReadonly: true  },
    { key: 'inventory.low_stock_threshold', value: 10,                         category: 'inventory',     valueType: 'number',  isSensitive: false, isReadonly: false },
    { key: 'sales.quotation_valid_days',    value: 30,                         category: 'sales',         valueType: 'number',  isSensitive: false, isReadonly: false },
    { key: 'notifications.email_enabled',   value: true,                       category: 'notifications', valueType: 'boolean', isSensitive: false, isReadonly: false },
    { key: 'auth.max_login_attempts',       value: 5,                          category: 'security',      valueType: 'number',  isSensitive: false, isReadonly: true  },
    { key: 'auth.session_secret',           value: '***',                      category: 'security',      valueType: 'string',  isSensitive: true,  isReadonly: true  },
  ];
  for (const s of settingsToSeed) {
    const existing = await prisma.setting.findFirst({ where: { key: s.key } });
    if (!existing) {
      await prisma.setting.create({
        data: {
          key: s.key, value: s.value, category: s.category,
          valueType: s.valueType, scope: 'global',
          isSensitive: s.isSensitive, isReadonly: s.isReadonly,
          updatedBy: adminId,
        },
      });
    }
  }

  // ── Quotations ────────────────────────────────────────
  // QUO-001: CUST-001 xin báo giá MCCB số lượng lớn, trạng thái SENT
  const quo1 = await prisma.quotation.upsert({
    where: { quotationNumber: 'QUO-2026-00001' },
    update: {},
    create: {
      quotationNumber: 'QUO-2026-00001', customerId: cust1, salesUserId: salesId,
      subtotal: 64000000, taxAmount: 6400000, totalAmount: 70400000,
      status: 'SENT', validUntil: new Date('2026-04-30'),
      notes: 'Báo giá MCCB 100A cho dự án tòa nhà văn phòng Q.9',
      createdAt: new Date('2026-03-01'),
    },
  });
  await prisma.quotationItem.deleteMany({ where: { quotationId: quo1.id } });
  await prisma.quotationItem.createMany({
    data: [
      { quotationId: quo1.id, productId: productMap['MCCB-ABB-3P-100A'].id, quantity: 20, unitPrice: 3200000, discountAmount: 0, totalAmount: 64000000 },
    ],
  });

  // QUO-002: CUST-003 xin báo giá đèn LED + cáp, trạng thái DRAFT
  const quo2 = await prisma.quotation.upsert({
    where: { quotationNumber: 'QUO-2026-00002' },
    update: {},
    create: {
      quotationNumber: 'QUO-2026-00002', customerId: cust3, salesUserId: salesId,
      subtotal: 10050000, taxAmount: 1005000, totalAmount: 11055000,
      status: 'DRAFT', validUntil: new Date('2026-06-30'),
      notes: 'Báo giá chiếu sáng + cáp điện cho xưởng sản xuất',
      createdAt: new Date('2026-04-28'),
    },
  });
  await prisma.quotationItem.deleteMany({ where: { quotationId: quo2.id } });
  await prisma.quotationItem.createMany({
    data: [
      { quotationId: quo2.id, productId: productMap['DEN-LED-RD-18W'].id,       quantity: 50,  unitPrice: 145000, discountAmount: 0, totalAmount: 7250000 },
      { quotationId: quo2.id, productId: productMap['CAP-CADIVI-CVV-2x2.5'].id, quantity: 100, unitPrice: 28000,  discountAmount: 0, totalAmount: 2800000 },
    ],
  });

  // ── Sales Orders ──────────────────────────────────────

  // SO1 — Tháng 3, CUST-001, DELIVERED — MCCB + MCB
  // Subtotal: 10×3,200,000 + 50×185,000 = 32,000,000 + 9,250,000 = 41,250,000
  const so1 = await prisma.salesOrder.upsert({
    where: { orderNumber: 'SO-2026-00001' },
    update: {},
    create: {
      orderNumber: 'SO-2026-00001', customerId: cust1, salesUserId: salesId,
      subtotal: 41250000, taxAmount: 4125000, totalAmount: 45375000,
      status: 'DELIVERED', orderedAt: new Date('2026-03-01'), confirmedAt: new Date('2026-03-02'),
      notes: 'Cung cấp thiết bị đóng cắt cho dự án tòa nhà Q.9',
      createdAt: new Date('2026-03-01'),
    },
  });
  await prisma.salesOrderItem.deleteMany({ where: { salesOrderId: so1.id } });
  await prisma.salesOrderItem.createMany({
    data: [
      { salesOrderId: so1.id, productId: productMap['MCCB-ABB-3P-100A'].id, quantity: 10, deliveredQuantity: 10, unitPrice: 3200000, discountAmount: 0, totalAmount: 32000000 },
      { salesOrderId: so1.id, productId: productMap['MCB-SCH-1P-16A'].id,   quantity: 50, deliveredQuantity: 50, unitPrice: 185000,  discountAmount: 0, totalAmount: 9250000  },
    ],
  });

  // SO2 — Tháng 3, CUST-002, DELIVERED — Cáp + MCB
  // Subtotal: 200×28,000 + 20×185,000 = 5,600,000 + 3,700,000 = 9,300,000
  const so2 = await prisma.salesOrder.upsert({
    where: { orderNumber: 'SO-2026-00002' },
    update: {},
    create: {
      orderNumber: 'SO-2026-00002', customerId: cust2, salesUserId: salesId,
      subtotal: 9300000, taxAmount: 930000, totalAmount: 10230000,
      status: 'DELIVERED', orderedAt: new Date('2026-03-10'), confirmedAt: new Date('2026-03-11'),
      notes: 'Cung cấp cáp điện + aptomat cho kho xưởng mới',
      createdAt: new Date('2026-03-10'),
    },
  });
  await prisma.salesOrderItem.deleteMany({ where: { salesOrderId: so2.id } });
  await prisma.salesOrderItem.createMany({
    data: [
      { salesOrderId: so2.id, productId: productMap['CAP-CADIVI-CVV-2x2.5'].id, quantity: 200, deliveredQuantity: 200, unitPrice: 28000, discountAmount: 0, totalAmount: 5600000 },
      { salesOrderId: so2.id, productId: productMap['MCB-SCH-1P-16A'].id,        quantity: 20,  deliveredQuantity: 20,  unitPrice: 185000, discountAmount: 0, totalAmount: 3700000 },
    ],
  });

  // SO3 — Tháng 4, CUST-003, CONFIRMED — MCCB + Contactor
  // Subtotal: 5×3,200,000 + 10×450,000 = 16,000,000 + 4,500,000 = 20,500,000
  const so3 = await prisma.salesOrder.upsert({
    where: { orderNumber: 'SO-2026-00003' },
    update: {},
    create: {
      orderNumber: 'SO-2026-00003', customerId: cust3, salesUserId: salesId,
      subtotal: 20500000, taxAmount: 2050000, totalAmount: 22550000,
      status: 'CONFIRMED', orderedAt: new Date('2026-04-05'), confirmedAt: new Date('2026-04-06'),
      notes: 'Cung cấp thiết bị tủ điện công nghiệp cho nhà máy',
      createdAt: new Date('2026-04-05'),
    },
  });
  await prisma.salesOrderItem.deleteMany({ where: { salesOrderId: so3.id } });
  await prisma.salesOrderItem.createMany({
    data: [
      { salesOrderId: so3.id, productId: productMap['MCCB-ABB-3P-100A'].id, quantity: 5,  deliveredQuantity: 0, unitPrice: 3200000, discountAmount: 0, totalAmount: 16000000 },
      { salesOrderId: so3.id, productId: productMap['CONT-SIE-3RT-22A'].id, quantity: 10, deliveredQuantity: 0, unitPrice: 450000,  discountAmount: 0, totalAmount: 4500000  },
    ],
  });

  // SO4 — Tháng 4, CUST-001, CONFIRMED — Đèn LED + Cáp
  // Subtotal: 100×145,000 + 200×28,000 = 14,500,000 + 5,600,000 = 20,100,000
  const so4 = await prisma.salesOrder.upsert({
    where: { orderNumber: 'SO-2026-00004' },
    update: {},
    create: {
      orderNumber: 'SO-2026-00004', customerId: cust1, salesUserId: salesId,
      subtotal: 20100000, taxAmount: 2010000, totalAmount: 22110000,
      status: 'CONFIRMED', orderedAt: new Date('2026-04-15'), confirmedAt: new Date('2026-04-16'),
      notes: 'Chiếu sáng + cáp điện cho khu văn phòng tầng 5-8',
      createdAt: new Date('2026-04-15'),
    },
  });
  await prisma.salesOrderItem.deleteMany({ where: { salesOrderId: so4.id } });
  await prisma.salesOrderItem.createMany({
    data: [
      { salesOrderId: so4.id, productId: productMap['DEN-LED-RD-18W'].id,       quantity: 100, deliveredQuantity: 0, unitPrice: 145000, discountAmount: 0, totalAmount: 14500000 },
      { salesOrderId: so4.id, productId: productMap['CAP-CADIVI-CVV-2x2.5'].id, quantity: 200, deliveredQuantity: 0, unitPrice: 28000,  discountAmount: 0, totalAmount: 5600000  },
    ],
  });

  // SO5 — Tháng 5, CUST-002, CONFIRMED — MCCB + Contactor số lượng lớn
  // Subtotal: 15×3,200,000 + 30×450,000 = 48,000,000 + 13,500,000 = 61,500,000
  const so5 = await prisma.salesOrder.upsert({
    where: { orderNumber: 'SO-2026-00005' },
    update: {},
    create: {
      orderNumber: 'SO-2026-00005', customerId: cust2, salesUserId: salesId,
      subtotal: 61500000, taxAmount: 6150000, totalAmount: 67650000,
      status: 'CONFIRMED', orderedAt: new Date('2026-05-02'), confirmedAt: new Date('2026-05-03'),
      notes: 'Cung cấp tủ MCC cho nhà máy sản xuất mở rộng — đợt 2',
      createdAt: new Date('2026-05-02'),
    },
  });
  await prisma.salesOrderItem.deleteMany({ where: { salesOrderId: so5.id } });
  await prisma.salesOrderItem.createMany({
    data: [
      { salesOrderId: so5.id, productId: productMap['MCCB-ABB-3P-100A'].id, quantity: 15, deliveredQuantity: 0, unitPrice: 3200000, discountAmount: 0, totalAmount: 48000000 },
      { salesOrderId: so5.id, productId: productMap['CONT-SIE-3RT-22A'].id, quantity: 30, deliveredQuantity: 0, unitPrice: 450000,  discountAmount: 0, totalAmount: 13500000 },
    ],
  });

  // ── Deliveries ────────────────────────────────────────
  const del1 = await prisma.delivery.upsert({
    where: { deliveryNumber: 'DEL-2026-00001' },
    update: {},
    create: {
      deliveryNumber: 'DEL-2026-00001', salesOrderId: so1.id, warehouseId: warehouse.id,
      status: 'DELIVERED', deliveredAt: new Date('2026-03-05'),
      createdAt: new Date('2026-03-04'),
    },
  });
  await prisma.deliveryItem.deleteMany({ where: { deliveryId: del1.id } });
  await prisma.deliveryItem.createMany({
    data: [
      { deliveryId: del1.id, productId: productMap['MCCB-ABB-3P-100A'].id, quantity: 10 },
      { deliveryId: del1.id, productId: productMap['MCB-SCH-1P-16A'].id,   quantity: 50 },
    ],
  });

  const del2 = await prisma.delivery.upsert({
    where: { deliveryNumber: 'DEL-2026-00002' },
    update: {},
    create: {
      deliveryNumber: 'DEL-2026-00002', salesOrderId: so2.id, warehouseId: warehouse.id,
      status: 'DELIVERED', deliveredAt: new Date('2026-03-15'),
      createdAt: new Date('2026-03-14'),
    },
  });
  await prisma.deliveryItem.deleteMany({ where: { deliveryId: del2.id } });
  await prisma.deliveryItem.createMany({
    data: [
      { deliveryId: del2.id, productId: productMap['CAP-CADIVI-CVV-2x2.5'].id, quantity: 200 },
      { deliveryId: del2.id, productId: productMap['MCB-SCH-1P-16A'].id,        quantity: 20  },
    ],
  });

  const del3 = await prisma.delivery.upsert({
    where: { deliveryNumber: 'DEL-2026-00003' },
    update: {},
    create: {
      deliveryNumber: 'DEL-2026-00003', salesOrderId: so3.id, warehouseId: warehouse.id,
      status: 'PENDING',
      createdAt: new Date('2026-04-07'),
    },
  });
  await prisma.deliveryItem.deleteMany({ where: { deliveryId: del3.id } });
  await prisma.deliveryItem.createMany({
    data: [{ deliveryId: del3.id, productId: productMap['MCCB-ABB-3P-100A'].id, quantity: 5 }],
  });

  // ── Invoices ──────────────────────────────────────────
  // INV1 — CUST-001, SO1, PAID
  const inv1 = await prisma.invoice.upsert({
    where: { invoiceNumber: 'INV-2026-00001' },
    update: {},
    create: {
      invoiceNumber: 'INV-2026-00001', customerId: cust1, salesOrderId: so1.id,
      subtotal: 41250000, taxAmount: 4125000, totalAmount: 45375000, outstandingAmount: 0,
      issueDate: new Date('2026-03-06'), dueDate: new Date('2026-04-06'),
      status: 'PAID', createdAt: new Date('2026-03-06'),
    },
  });

  // INV2 — CUST-002, SO2, SENT (quá hạn — hạn tháng 4, nay tháng 5)
  const inv2 = await prisma.invoice.upsert({
    where: { invoiceNumber: 'INV-2026-00002' },
    update: {},
    create: {
      invoiceNumber: 'INV-2026-00002', customerId: cust2, salesOrderId: so2.id,
      subtotal: 9300000, taxAmount: 930000, totalAmount: 10230000, outstandingAmount: 10230000,
      issueDate: new Date('2026-03-16'), dueDate: new Date('2026-04-15'),
      status: 'SENT', createdAt: new Date('2026-03-16'),
    },
  });

  // INV3 — CUST-001, SO4, SENT
  const inv3 = await prisma.invoice.upsert({
    where: { invoiceNumber: 'INV-2026-00003' },
    update: {},
    create: {
      invoiceNumber: 'INV-2026-00003', customerId: cust1, salesOrderId: so4.id,
      subtotal: 20100000, taxAmount: 2010000, totalAmount: 22110000, outstandingAmount: 22110000,
      issueDate: new Date('2026-04-17'), dueDate: new Date('2026-05-17'),
      status: 'SENT', createdAt: new Date('2026-04-17'),
    },
  });

  // INV4 — CUST-002, SO5, SENT
  const inv4 = await prisma.invoice.upsert({
    where: { invoiceNumber: 'INV-2026-00004' },
    update: {},
    create: {
      invoiceNumber: 'INV-2026-00004', customerId: cust2, salesOrderId: so5.id,
      subtotal: 61500000, taxAmount: 6150000, totalAmount: 67650000, outstandingAmount: 67650000,
      issueDate: new Date('2026-05-04'), dueDate: new Date('2026-06-03'),
      status: 'SENT', createdAt: new Date('2026-05-04'),
    },
  });

  // ── Payments ──────────────────────────────────────────
  const pay1 = await prisma.payment.upsert({
    where: { paymentNumber: 'PAY-2026-00001' },
    update: {},
    create: {
      paymentNumber: 'PAY-2026-00001', customerId: cust1,
      paymentMethod: 'BANK_TRANSFER', totalAmount: 45375000,
      paymentDate: new Date('2026-03-20'), referenceNumber: 'CK-VCB-20260320-001',
      status: 'ALLOCATED', notes: 'Thanh toán đơn hàng SO-2026-00001 — Xây Dựng Hoàng Phát',
      createdAt: new Date('2026-03-20'),
    },
  });

  const existingAlloc = await prisma.paymentAllocation.findFirst({
    where: { paymentId: pay1.id, invoiceId: inv1.id },
  });
  if (!existingAlloc) {
    await prisma.paymentAllocation.create({
      data: { paymentId: pay1.id, invoiceId: inv1.id, allocatedAmount: 45375000 },
    });
  }

  // ── AR Ledger ─────────────────────────────────────────
  async function ensureLedger(
    customerId: number, transactionType: string, refType: string, refId: number,
    debit: number, credit: number, balance: number, notes: string, createdAt: Date,
  ) {
    const exists = await prisma.accountsReceivableLedger.findFirst({
      where: { customerId, transactionType, referenceType: refType, referenceId: refId },
    });
    if (!exists) {
      await prisma.accountsReceivableLedger.create({
        data: { customerId, transactionType, referenceType: refType, referenceId: refId, debitAmount: debit, creditAmount: credit, balanceAfter: balance, notes, createdAt },
      });
    }
  }

  // CUST-001 (Xây Dựng Hoàng Phát)
  await ensureLedger(cust1, 'INVOICE_CREATED',   'INVOICE', inv1.id, 45375000, 0,        45375000, 'Phát sinh INV-2026-00001', new Date('2026-03-06'));
  await ensureLedger(cust1, 'INVOICE_CREATED',   'INVOICE', inv3.id, 22110000, 0,        67485000, 'Phát sinh INV-2026-00003', new Date('2026-04-17'));
  await ensureLedger(cust1, 'PAYMENT_ALLOCATED', 'PAYMENT', pay1.id, 0,        45375000, 22110000, 'Thanh toán PAY-2026-00001 → INV-2026-00001', new Date('2026-03-20'));

  // CUST-002 (Điện Nhật Minh)
  await ensureLedger(cust2, 'INVOICE_CREATED',   'INVOICE', inv2.id, 10230000, 0,        10230000, 'Phát sinh INV-2026-00002', new Date('2026-03-16'));
  await ensureLedger(cust2, 'INVOICE_CREATED',   'INVOICE', inv4.id, 67650000, 0,        77880000, 'Phát sinh INV-2026-00004', new Date('2026-05-04'));

  // ── Notifications ─────────────────────────────────────
  const notifsExist = await prisma.notification.count({ where: { recipientId: adminId } });
  if (notifsExist === 0) {
    await prisma.notification.createMany({
      data: [
        {
          recipientId: adminId, channel: 'IN_APP', notificationType: 'ORDER_RECEIVED',
          subject: 'Đơn hàng lớn mới — Điện Nhật Minh',
          content: 'SO-2026-00005 từ Công ty CP Điện Nhật Minh — 67.650.000 ₫ đã được xác nhận.',
          status: 'READ', priority: 'HIGH',
          createdAt: new Date('2026-05-03'), readAt: new Date('2026-05-03'),
        },
        {
          recipientId: adminId, channel: 'IN_APP', notificationType: 'LOW_STOCK_ALERT',
          subject: 'Cảnh báo tồn kho thấp — Đèn LED Panel 18W',
          content: 'Đèn LED Panel 18W Rạng Đông chỉ còn 8 cái tại Kho Thiết Bị Điện Chính (ngưỡng: 10).',
          status: 'UNREAD', priority: 'MEDIUM',
          createdAt: new Date('2026-05-07'),
        },
        {
          recipientId: adminId, channel: 'IN_APP', notificationType: 'APPROVAL_REQUIRED',
          subject: 'Báo giá chờ duyệt — QUO-2026-00001',
          content: 'Báo giá QUO-2026-00001 từ Xây Dựng Hoàng Phát (70.400.000 ₫) đang chờ duyệt.',
          status: 'UNREAD', priority: 'HIGH',
          createdAt: new Date('2026-03-01'),
        },
        {
          recipientId: adminId, channel: 'IN_APP', notificationType: 'INVOICE_OVERDUE',
          subject: 'Hóa đơn quá hạn — INV-2026-00002',
          content: 'Hóa đơn INV-2026-00002 từ Điện Nhật Minh (10.230.000 ₫) đã quá hạn 28 ngày.',
          status: 'UNREAD', priority: 'HIGH',
          createdAt: new Date('2026-05-07'),
        },
        {
          recipientId: salesId, channel: 'IN_APP', notificationType: 'INVOICE_OVERDUE',
          subject: 'Hóa đơn quá hạn — cần xử lý ngay',
          content: 'INV-2026-00002 (10.230.000 ₫) từ Điện Nhật Minh đã quá hạn. Vui lòng liên hệ khách hàng.',
          status: 'UNREAD', priority: 'HIGH',
          createdAt: new Date('2026-05-07'),
        },
        {
          recipientId: salesId, channel: 'IN_APP', notificationType: 'ORDER_CONFIRMED',
          subject: 'Đơn hàng SO-2026-00005 đã xác nhận',
          content: 'Đơn hàng SO-2026-00005 từ Điện Nhật Minh đã được xác nhận thành công.',
          status: 'READ', priority: 'NORMAL',
          createdAt: new Date('2026-05-03'), readAt: new Date('2026-05-03'),
        },
        {
          recipientId: userMap['CUSTOMER'].id, channel: 'IN_APP', notificationType: 'ORDER_STATUS',
          subject: 'Chào mừng đến miniERP Portal',
          content: 'Tài khoản của bạn đã được kích hoạt. Bạn có thể xem đơn hàng và hóa đơn trên hệ thống.',
          status: 'UNREAD', priority: 'NORMAL',
          createdAt: new Date('2026-05-07'),
        },
      ],
    });
  }

  // ── Summary ───────────────────────────────────────────
  console.log('\n✔ Seed hoàn tất.\n');
  console.log('  Công ty      : Công ty TNHH Thiết Bị Điện Minh Phát');
  console.log(`  Permissions  : ${PERMISSIONS.length}`);
  console.log(`  Roles        : ${ROLES.length}`);
  console.log('');
  console.log('  ┌─────────────────────────────────────────────────────────────┐');
  console.log('  │                  TÀI KHOẢN ĐĂNG NHẬP                       │');
  console.log('  ├─────────────┬────────────────────────────┬──────────────────┤');
  console.log('  │ Role        │ Email                      │ Password         │');
  console.log('  ├─────────────┼────────────────────────────┼──────────────────┤');
  console.log('  │ Admin       │ admin@mini-erp.local       │ Admin@123456     │');
  console.log('  │ Sales       │ sales@mini-erp.local       │ Sales@123456     │');
  console.log('  │ Customer    │ customer@mini-erp.local    │ Customer@123456  │');
  console.log('  │ Accountant  │ accountant@mini-erp.local  │ Accountant@123456│');
  console.log('  │ Warehouse   │ warehouse@mini-erp.local   │ Warehouse@123456 │');
  console.log('  └─────────────┴────────────────────────────┴──────────────────┘');
  console.log('');
  console.log('  Dữ liệu mẫu:');
  console.log('  - Thương hiệu: Schneider Electric, ABB, Siemens, CADIVI, Rạng Đông');
  console.log('  - Danh mục: Thiết bị điện > Đóng cắt, Cáp & dây, Chiếu sáng');
  console.log('  - Sản phẩm: 5 (MCB Schneider, MCCB ABB, Cáp CADIVI, Contactor Siemens, Đèn LED Rạng Đông)');
  console.log('  - Kho: Kho Thiết Bị Điện Chính + tồn kho (Đèn LED tồn kho thấp: 8 cái)');
  console.log('  - Khách hàng: Xây Dựng Hoàng Phát, Điện Nhật Minh, Cơ Điện Phú Long');
  console.log('  - Báo giá: 2 (QUO-2026-00001, QUO-2026-00002)');
  console.log('  - Đơn hàng: 5 (Mar–May 2026, 2 DELIVERED / 3 CONFIRMED)');
  console.log('  - Xuất kho: 3 (2 đã giao, 1 đang chờ)');
  console.log('  - Hóa đơn: 4 (1 PAID, 3 SENT — INV-2026-00002 quá hạn 28 ngày)');
  console.log('  - Thanh toán: 1 (PAY-2026-00001, đã phân bổ vào INV-2026-00001)');
  console.log('  - Thông báo: 7 cho các user');
  console.log('  - Cài đặt: 10 (tiền tệ VND)');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
