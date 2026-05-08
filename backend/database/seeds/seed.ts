import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// -------------------------------------------------------
// Master data — roles & permissions (unchanged)
// -------------------------------------------------------

const ROLES = [
  { code: 'ADMIN',      name: 'Administrator', description: 'Full system access' },
  { code: 'MANAGER',    name: 'Manager',       description: 'Operational management and approvals' },
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
  { code: 'finance.payment.view',              description: 'View payments' },
  { code: 'finance.payment.reverse',           description: 'Reverse payments' },
  { code: 'finance.payment_status.view_assigned', description: 'View assigned payment status' },
  { code: 'finance.payment_status.view_own',   description: 'View own payment status' },
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
    'finance.invoice.view', 'finance.payment.view', 'finance.payment.reverse',
    'finance.credit_limit.override', 'finance.report.export', 'finance.aging_report.view',
    'reporting.dashboard.view_all', 'reporting.export', 'reporting.schedule.manage', 'reporting.kpi.view',
    'settings.manage', 'feature_flags.manage', 'organization.settings.manage',
    'notification.template.manage', 'notification.retry.manage',
    'users.team.view', 'users.team.performance.view',
    'profile.view_self', 'profile.update_self',
  ],
  MANAGER: [
    'auth.password.change_self',
    'catalog.product.view', 'catalog.search',
    'inventory.stock.view', 'inventory.adjust.approve', 'inventory.transfer.approve', 'inventory.low_stock.view',
    'customer.view_assigned',
    'sales.order.view_team', 'sales.order.approve', 'sales.order.cancel_approve', 'sales.pricing.override_approve',
    'sales.delivery.view',
    'finance.invoice.view', 'finance.payment.view', 'finance.credit_limit.override_approve', 'finance.aging_report.view',
    'reporting.dashboard.view_team', 'reporting.export_team', 'reporting.kpi.view',
    'notification.view_team',
    'users.team.view', 'users.team.performance.view',
    'profile.view_self', 'profile.update_self',
  ],
  SALES: [
    'auth.password.change_self',
    'catalog.product.view', 'catalog.search',
    'inventory.stock.view', 'inventory.availability.check',
    'customer.view_assigned', 'customer.create', 'customer.update_assigned',
    'sales.quotation.create', 'sales.quotation.update_own',
    'sales.order.view_assigned', 'sales.order.cancel_request', 'sales.delivery.view',
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
    'catalog.product.view', 'catalog.search',
    'sales.order.view_all', 'sales.delivery.view',
    'finance.invoice.view', 'finance.payment.view', 'finance.payment.reverse',
    'finance.report.export', 'finance.aging_report.view',
    'reporting.dashboard.view_finance', 'reporting.kpi.view', 'reporting.export',
    'notification.preferences.manage_self',
    'profile.view_self', 'profile.update_self',
  ],
  WAREHOUSE: [
    'auth.password.change_self',
    'catalog.product.view', 'catalog.search',
    'inventory.stock.view', 'inventory.adjust', 'inventory.adjust.approve',
    'inventory.transfer', 'inventory.transfer.approve', 'inventory.warehouse.manage',
    'inventory.availability.check', 'inventory.low_stock.view',
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
    where: { code: 'DEMO_ORG' },
    update: {},
    create: {
      code: 'DEMO_ORG',
      name: 'Demo Organization',
      email: 'info@demo-org.com',
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
    // Full sync: delete existing then recreate to remove stale permissions
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    for (const permCode of permCodes) {
      const perm = await prisma.permission.findUnique({ where: { code: permCode } });
      if (!perm) continue;
      await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: perm.id } });
    }
  }

  // ── Users (4 roles) ───────────────────────────────────
  const usersToSeed = [
    { email: 'admin@mini-erp.local',      password: 'Admin@123456',      fullName: 'System Administrator', roleCode: 'ADMIN'      },
    { email: 'manager@mini-erp.local',    password: 'Manager@123456',    fullName: 'Alice Manager',        roleCode: 'MANAGER'    },
    { email: 'sales@mini-erp.local',      password: 'Sales@123456',      fullName: 'Bob Sales',            roleCode: 'SALES'      },
    { email: 'customer@mini-erp.local',   password: 'Customer@123456',   fullName: 'Carol Customer',       roleCode: 'CUSTOMER'   },
    { email: 'accountant@mini-erp.local', password: 'Accountant@123456', fullName: 'David Accountant',     roleCode: 'ACCOUNTANT' },
    { email: 'warehouse@mini-erp.local',  password: 'Warehouse@123456',  fullName: 'Eve Warehouse',        roleCode: 'WAREHOUSE'  },
  ];

  const userMap: Record<string, { id: number }> = {};
  for (const u of usersToSeed) {
    const hash = await bcrypt.hash(u.password, 12);
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        passwordHash: hash,
        status: 'ACTIVE',
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
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

  const adminId   = userMap['ADMIN'].id;
  const salesId   = userMap['SALES'].id;

  // ── Brands ────────────────────────────────────────────
  const brandsData = [
    { code: 'APPLE',   name: 'Apple',   description: 'Apple Inc.' },
    { code: 'SAMSUNG', name: 'Samsung', description: 'Samsung Electronics' },
    { code: 'DELL',    name: 'Dell',    description: 'Dell Technologies' },
  ];
  const brandMap: Record<string, { id: number }> = {};
  for (const b of brandsData) {
    brandMap[b.code] = await prisma.brand.upsert({
      where: { code: b.code },
      update: { name: b.name },
      create: b,
    });
  }

  // ── Categories ────────────────────────────────────────
  const catElec = await prisma.category.upsert({
    where: { code: 'ELEC' },
    update: {},
    create: { code: 'ELEC', name: 'Electronics', isActive: true },
  });
  const catPhones = await prisma.category.upsert({
    where: { code: 'SMARTPHONES' },
    update: {},
    create: { code: 'SMARTPHONES', name: 'Smartphones', parentId: catElec.id, isActive: true },
  });
  const catLaptops = await prisma.category.upsert({
    where: { code: 'LAPTOPS' },
    update: {},
    create: { code: 'LAPTOPS', name: 'Laptops', parentId: catElec.id, isActive: true },
  });
  const catTablets = await prisma.category.upsert({
    where: { code: 'TABLETS' },
    update: {},
    create: { code: 'TABLETS', name: 'Tablets', parentId: catElec.id, isActive: true },
  });

  // ── Products ──────────────────────────────────────────
  const productsData = [
    { sku: 'IPH-15-PRO',  productName: 'iPhone 15 Pro',   categoryId: catPhones.id,  brandId: brandMap['APPLE'].id,   standardPrice: 999.00,  unit: 'Unit', description: 'Apple iPhone 15 Pro 256GB Titanium' },
    { sku: 'SAM-S24',     productName: 'Samsung Galaxy S24', categoryId: catPhones.id, brandId: brandMap['SAMSUNG'].id, standardPrice: 899.00, unit: 'Unit', description: 'Samsung Galaxy S24 128GB' },
    { sku: 'MBP-14',      productName: 'MacBook Pro 14"', categoryId: catLaptops.id, brandId: brandMap['APPLE'].id,   standardPrice: 1999.00, unit: 'Unit', description: 'Apple MacBook Pro 14" M3 Pro 18GB' },
    { sku: 'DXP-15',      productName: 'Dell XPS 15',     categoryId: catLaptops.id, brandId: brandMap['DELL'].id,    standardPrice: 1499.00, unit: 'Unit', description: 'Dell XPS 15 Intel Core i7 RTX 4060' },
    { sku: 'SAM-TAB-S9',  productName: 'Samsung Tab S9',  categoryId: catTablets.id, brandId: brandMap['SAMSUNG'].id, standardPrice: 699.00,  unit: 'Unit', description: 'Samsung Galaxy Tab S9 256GB WiFi' },
  ];
  const productMap: Record<string, { id: number }> = {};
  for (const p of productsData) {
    productMap[p.sku] = await prisma.product.upsert({
      where: { sku: p.sku },
      update: { productName: p.productName, standardPrice: p.standardPrice },
      create: { ...p, isActive: true },
    });
  }

  // ── Warehouse ─────────────────────────────────────────
  const warehouse = await prisma.warehouse.upsert({
    where: { code: 'WH-001' },
    update: {},
    create: {
      code: 'WH-001',
      warehouseName: 'Main Warehouse',
      address: '123 Industrial Zone, Thu Duc, Ho Chi Minh City',
      status: 'ACTIVE',
    },
  });

  // ── Inventory Stock ───────────────────────────────────
  // Samsung Tab S9 is intentionally low (triggers low-stock alert on dashboard)
  const stockData = [
    { sku: 'IPH-15-PRO', qty: 50 },
    { sku: 'SAM-S24',    qty: 45 },
    { sku: 'MBP-14',     qty: 20 },
    { sku: 'DXP-15',     qty: 15 },
    { sku: 'SAM-TAB-S9', qty: 8  },
  ];
  for (const s of stockData) {
    await prisma.inventoryStock.upsert({
      where: { warehouseId_productId: { warehouseId: warehouse.id, productId: productMap[s.sku].id } },
      update: { availableQuantity: s.qty },
      create: { warehouseId: warehouse.id, productId: productMap[s.sku].id, availableQuantity: s.qty },
    });
  }

  // ── Inventory Transactions (history) ──────────────────
  // Only create if there are none yet
  const txCount = await prisma.inventoryTransaction.count({ where: { warehouseId: warehouse.id } });
  if (txCount === 0) {
    const txData = [
      { sku: 'IPH-15-PRO', qty: 60, type: 'INITIAL_IN',   notes: 'Opening stock — iPhone 15 Pro' },
      { sku: 'SAM-S24',    qty: 50, type: 'INITIAL_IN',   notes: 'Opening stock — Samsung Galaxy S24' },
      { sku: 'MBP-14',     qty: 25, type: 'INITIAL_IN',   notes: 'Opening stock — MacBook Pro 14"' },
      { sku: 'DXP-15',     qty: 18, type: 'INITIAL_IN',   notes: 'Opening stock — Dell XPS 15' },
      { sku: 'SAM-TAB-S9', qty: 15, type: 'INITIAL_IN',   notes: 'Opening stock — Samsung Tab S9' },
      { sku: 'IPH-15-PRO', qty: -2, type: 'DELIVERY_OUT', notes: 'DEL-2026-00002 — Delivery to Digital Corp' },
      { sku: 'SAM-S24',    qty: -1, type: 'DELIVERY_OUT', notes: 'DEL-2026-00002 — Delivery to Digital Corp' },
      { sku: 'MBP-14',     qty: -2, type: 'DELIVERY_OUT', notes: 'DEL-2026-00001 — Delivery to Tech Solutions Ltd' },
      { sku: 'DXP-15',     qty: -3, type: 'ADJUST_OUT',   notes: 'Inventory adjustment — damaged units' },
      { sku: 'SAM-TAB-S9', qty: -7, type: 'DELIVERY_OUT', notes: 'DEL-2026-00003 — Delivery to Smart Electronics' },
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
      customerCode: 'CUST-001', companyName: 'Tech Solutions Ltd',
      contactName: 'Nguyen Van An', phone: '0901234567', email: 'contact@techsolutions.vn',
      address: '456 Le Van Viet, District 9, Ho Chi Minh City', creditLimit: 50000, status: 'ACTIVE',
    },
    {
      customerCode: 'CUST-002', companyName: 'Digital Corp',
      contactName: 'Tran Thi Bich', phone: '0912345678', email: 'info@digitalcorp.vn',
      address: '789 Nguyen Van Linh, District 7, Ho Chi Minh City', creditLimit: 30000, status: 'ACTIVE',
    },
    {
      customerCode: 'CUST-003', companyName: 'Smart Electronics',
      contactName: 'Le Van Cuong', phone: '0923456789', email: 'contact@smartelectronics.vn',
      address: '321 Pham Van Dong, Thu Duc, Ho Chi Minh City', creditLimit: 20000, status: 'ACTIVE',
    },
  ];
  const custMap: Record<string, { id: number }> = {};
  for (const c of customersData) {
    custMap[c.customerCode] = await prisma.customer.upsert({
      where: { customerCode: c.customerCode },
      update: { companyName: c.companyName },
      create: { ...c, organizationId: org.id, assignedSalesUserId: salesId },
    });
  }

  const cust1 = custMap['CUST-001'].id;
  const cust2 = custMap['CUST-002'].id;
  const cust3 = custMap['CUST-003'].id;

  // ── Settings ──────────────────────────────────────────
  const settingsToSeed = [
    { key: 'system.company_name',             value: 'Demo Organization', category: 'system',        valueType: 'string',  isSensitive: false, isReadonly: false },
    { key: 'system.currency',                 value: 'USD',               category: 'system',        valueType: 'string',  isSensitive: false, isReadonly: false },
    { key: 'system.timezone',                 value: 'Asia/Ho_Chi_Minh',  category: 'system',        valueType: 'string',  isSensitive: false, isReadonly: false },
    { key: 'finance.default_payment_terms',   value: 30,                  category: 'finance',       valueType: 'number',  isSensitive: false, isReadonly: false },
    { key: 'finance.tax_rate_percent',        value: 10,                  category: 'finance',       valueType: 'number',  isSensitive: false, isReadonly: true  },
    { key: 'inventory.low_stock_threshold',   value: 10,                  category: 'inventory',     valueType: 'number',  isSensitive: false, isReadonly: false },
    { key: 'sales.quotation_valid_days',      value: 30,                  category: 'sales',         valueType: 'number',  isSensitive: false, isReadonly: false },
    { key: 'notifications.email_enabled',     value: true,                category: 'notifications', valueType: 'boolean', isSensitive: false, isReadonly: false },
    { key: 'auth.max_login_attempts',         value: 5,                   category: 'security',      valueType: 'number',  isSensitive: false, isReadonly: true  },
    { key: 'auth.session_secret',             value: '***',               category: 'security',      valueType: 'string',  isSensitive: true,  isReadonly: true  },
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
  const quo1 = await prisma.quotation.upsert({
    where: { quotationNumber: 'QUO-2026-00001' },
    update: {},
    create: {
      quotationNumber: 'QUO-2026-00001', customerId: cust1, salesUserId: salesId,
      subtotal: 1999.00, taxAmount: 199.90, totalAmount: 2198.90,
      status: 'SENT', validUntil: new Date('2026-03-31'),
      notes: 'Quotation for MacBook Pro upgrade',
      createdAt: new Date('2026-03-01'),
    },
  });
  await prisma.quotationItem.deleteMany({ where: { quotationId: quo1.id } });
  await prisma.quotationItem.createMany({
    data: [{ quotationId: quo1.id, productId: productMap['MBP-14'].id, quantity: 1, unitPrice: 1999.00, discountAmount: 0, totalAmount: 1999.00 }],
  });

  const quo2 = await prisma.quotation.upsert({
    where: { quotationNumber: 'QUO-2026-00002' },
    update: {},
    create: {
      quotationNumber: 'QUO-2026-00002', customerId: cust3, salesUserId: salesId,
      subtotal: 1398.00, taxAmount: 139.80, totalAmount: 1537.80,
      status: 'DRAFT', validUntil: new Date('2026-05-31'),
      notes: 'Tablet order for retail display',
      createdAt: new Date('2026-04-28'),
    },
  });
  await prisma.quotationItem.deleteMany({ where: { quotationId: quo2.id } });
  await prisma.quotationItem.createMany({
    data: [{ quotationId: quo2.id, productId: productMap['SAM-TAB-S9'].id, quantity: 2, unitPrice: 699.00, discountAmount: 0, totalAmount: 1398.00 }],
  });

  // ── Sales Orders ──────────────────────────────────────
  // SO1 — March, Customer 1, DELIVERED
  const so1 = await prisma.salesOrder.upsert({
    where: { orderNumber: 'SO-2026-00001' },
    update: {},
    create: {
      orderNumber: 'SO-2026-00001', customerId: cust1, salesUserId: salesId,
      subtotal: 3998.00, taxAmount: 399.80, totalAmount: 4397.80,
      status: 'DELIVERED', orderedAt: new Date('2026-03-01'), confirmedAt: new Date('2026-03-02'),
      notes: 'Urgent order — MacBook for new developers',
      createdAt: new Date('2026-03-01'),
    },
  });
  await prisma.salesOrderItem.deleteMany({ where: { salesOrderId: so1.id } });
  await prisma.salesOrderItem.createMany({
    data: [{ salesOrderId: so1.id, productId: productMap['MBP-14'].id, quantity: 2, deliveredQuantity: 2, unitPrice: 1999.00, discountAmount: 0, totalAmount: 3998.00 }],
  });

  // SO2 — March, Customer 2, DELIVERED
  const so2 = await prisma.salesOrder.upsert({
    where: { orderNumber: 'SO-2026-00002' },
    update: {},
    create: {
      orderNumber: 'SO-2026-00002', customerId: cust2, salesUserId: salesId,
      subtotal: 2897.00, taxAmount: 289.70, totalAmount: 3186.70,
      status: 'DELIVERED', orderedAt: new Date('2026-03-10'), confirmedAt: new Date('2026-03-11'),
      notes: 'Staff phones and laptop package',
      createdAt: new Date('2026-03-10'),
    },
  });
  await prisma.salesOrderItem.deleteMany({ where: { salesOrderId: so2.id } });
  await prisma.salesOrderItem.createMany({
    data: [
      { salesOrderId: so2.id, productId: productMap['IPH-15-PRO'].id, quantity: 2, deliveredQuantity: 2, unitPrice: 999.00, discountAmount: 0, totalAmount: 1998.00 },
      { salesOrderId: so2.id, productId: productMap['SAM-S24'].id,    quantity: 1, deliveredQuantity: 1, unitPrice: 899.00, discountAmount: 0, totalAmount: 899.00  },
    ],
  });

  // SO3 — April, Customer 3, CONFIRMED
  const so3 = await prisma.salesOrder.upsert({
    where: { orderNumber: 'SO-2026-00003' },
    update: {},
    create: {
      orderNumber: 'SO-2026-00003', customerId: cust3, salesUserId: salesId,
      subtotal: 1499.00, taxAmount: 149.90, totalAmount: 1648.90,
      status: 'CONFIRMED', orderedAt: new Date('2026-04-05'), confirmedAt: new Date('2026-04-06'),
      createdAt: new Date('2026-04-05'),
    },
  });
  await prisma.salesOrderItem.deleteMany({ where: { salesOrderId: so3.id } });
  await prisma.salesOrderItem.createMany({
    data: [{ salesOrderId: so3.id, productId: productMap['DXP-15'].id, quantity: 1, deliveredQuantity: 0, unitPrice: 1499.00, discountAmount: 0, totalAmount: 1499.00 }],
  });

  // SO4 — April, Customer 1, CONFIRMED
  const so4 = await prisma.salesOrder.upsert({
    where: { orderNumber: 'SO-2026-00004' },
    update: {},
    create: {
      orderNumber: 'SO-2026-00004', customerId: cust1, salesUserId: salesId,
      subtotal: 2797.00, taxAmount: 279.70, totalAmount: 3076.70,
      status: 'CONFIRMED', orderedAt: new Date('2026-04-15'), confirmedAt: new Date('2026-04-16'),
      notes: 'Mixed phone order for sales team',
      createdAt: new Date('2026-04-15'),
    },
  });
  await prisma.salesOrderItem.deleteMany({ where: { salesOrderId: so4.id } });
  await prisma.salesOrderItem.createMany({
    data: [
      { salesOrderId: so4.id, productId: productMap['SAM-S24'].id,    quantity: 2, deliveredQuantity: 0, unitPrice: 899.00, discountAmount: 0, totalAmount: 1798.00 },
      { salesOrderId: so4.id, productId: productMap['IPH-15-PRO'].id, quantity: 1, deliveredQuantity: 0, unitPrice: 999.00, discountAmount: 0, totalAmount: 999.00  },
    ],
  });

  // SO5 — May, Customer 2, CONFIRMED
  const so5 = await prisma.salesOrder.upsert({
    where: { orderNumber: 'SO-2026-00005' },
    update: {},
    create: {
      orderNumber: 'SO-2026-00005', customerId: cust2, salesUserId: salesId,
      subtotal: 3998.00, taxAmount: 399.80, totalAmount: 4397.80,
      status: 'CONFIRMED', orderedAt: new Date('2026-05-02'), confirmedAt: new Date('2026-05-03'),
      notes: 'MacBook order for engineering team expansion',
      createdAt: new Date('2026-05-02'),
    },
  });
  await prisma.salesOrderItem.deleteMany({ where: { salesOrderId: so5.id } });
  await prisma.salesOrderItem.createMany({
    data: [{ salesOrderId: so5.id, productId: productMap['MBP-14'].id, quantity: 2, deliveredQuantity: 0, unitPrice: 1999.00, discountAmount: 0, totalAmount: 3998.00 }],
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
    data: [{ deliveryId: del1.id, productId: productMap['MBP-14'].id, quantity: 2 }],
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
      { deliveryId: del2.id, productId: productMap['IPH-15-PRO'].id, quantity: 2 },
      { deliveryId: del2.id, productId: productMap['SAM-S24'].id,    quantity: 1 },
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
    data: [{ deliveryId: del3.id, productId: productMap['DXP-15'].id, quantity: 1 }],
  });

  // ── Invoices ──────────────────────────────────────────
  // INV1 — Customer 1, SO1, PAID
  const inv1 = await prisma.invoice.upsert({
    where: { invoiceNumber: 'INV-2026-00001' },
    update: {},
    create: {
      invoiceNumber: 'INV-2026-00001', customerId: cust1, salesOrderId: so1.id,
      subtotal: 3998.00, taxAmount: 399.80, totalAmount: 4397.80, outstandingAmount: 0,
      issueDate: new Date('2026-03-06'), dueDate: new Date('2026-04-06'),
      status: 'PAID', createdAt: new Date('2026-03-06'),
    },
  });

  // INV2 — Customer 2, SO2, SENT (overdue — dueDate in April, now May)
  const inv2 = await prisma.invoice.upsert({
    where: { invoiceNumber: 'INV-2026-00002' },
    update: {},
    create: {
      invoiceNumber: 'INV-2026-00002', customerId: cust2, salesOrderId: so2.id,
      subtotal: 2897.00, taxAmount: 289.70, totalAmount: 3186.70, outstandingAmount: 3186.70,
      issueDate: new Date('2026-03-16'), dueDate: new Date('2026-04-15'),
      status: 'SENT', createdAt: new Date('2026-03-16'),
    },
  });

  // INV3 — Customer 1, SO4, SENT
  const inv3 = await prisma.invoice.upsert({
    where: { invoiceNumber: 'INV-2026-00003' },
    update: {},
    create: {
      invoiceNumber: 'INV-2026-00003', customerId: cust1, salesOrderId: so4.id,
      subtotal: 2797.00, taxAmount: 279.70, totalAmount: 3076.70, outstandingAmount: 3076.70,
      issueDate: new Date('2026-04-17'), dueDate: new Date('2026-05-17'),
      status: 'SENT', createdAt: new Date('2026-04-17'),
    },
  });

  // INV4 — Customer 2, SO5, SENT
  const inv4 = await prisma.invoice.upsert({
    where: { invoiceNumber: 'INV-2026-00004' },
    update: {},
    create: {
      invoiceNumber: 'INV-2026-00004', customerId: cust2, salesOrderId: so5.id,
      subtotal: 3998.00, taxAmount: 399.80, totalAmount: 4397.80, outstandingAmount: 4397.80,
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
      paymentMethod: 'BANK_TRANSFER', totalAmount: 4397.80,
      paymentDate: new Date('2026-03-20'), referenceNumber: 'TRF-20260320-001',
      status: 'ALLOCATED', notes: 'Payment for MacBook Pro order',
      createdAt: new Date('2026-03-20'),
    },
  });

  // Allocation: pay1 → inv1
  const existingAlloc = await prisma.paymentAllocation.findFirst({
    where: { paymentId: pay1.id, invoiceId: inv1.id },
  });
  if (!existingAlloc) {
    await prisma.paymentAllocation.create({
      data: { paymentId: pay1.id, invoiceId: inv1.id, allocatedAmount: 4397.80 },
    });
  }

  // ── AR Ledger (immutable — skip if already exists) ───
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

  // Customer 1 (Tech Solutions)
  await ensureLedger(cust1, 'INVOICE_CREATED',     'INVOICE', inv1.id, 4397.80, 0,       4397.80, 'Invoice INV-2026-00001 created', new Date('2026-03-06'));
  await ensureLedger(cust1, 'INVOICE_CREATED',     'INVOICE', inv3.id, 3076.70, 0,       7474.50, 'Invoice INV-2026-00003 created', new Date('2026-04-17'));
  await ensureLedger(cust1, 'PAYMENT_ALLOCATED',   'PAYMENT', pay1.id, 0,       4397.80, 3076.70, 'Payment PAY-2026-00001 allocated to INV-2026-00001', new Date('2026-03-20'));

  // Customer 2 (Digital Corp)
  await ensureLedger(cust2, 'INVOICE_CREATED',     'INVOICE', inv2.id, 3186.70, 0,       3186.70, 'Invoice INV-2026-00002 created', new Date('2026-03-16'));
  await ensureLedger(cust2, 'INVOICE_CREATED',     'INVOICE', inv4.id, 4397.80, 0,       7584.50, 'Invoice INV-2026-00004 created', new Date('2026-05-04'));

  // ── Notifications ─────────────────────────────────────
  const notifsExist = await prisma.notification.count({ where: { recipientId: adminId } });
  if (notifsExist === 0) {
    await prisma.notification.createMany({
      data: [
        {
          recipientId: adminId, channel: 'IN_APP', notificationType: 'ORDER_RECEIVED',
          subject: 'New large order received',
          content: 'SO-2026-00005 from Digital Corp for $4,397.80 has been confirmed.',
          status: 'READ', priority: 'HIGH',
          createdAt: new Date('2026-05-03'), readAt: new Date('2026-05-03'),
        },
        {
          recipientId: adminId, channel: 'IN_APP', notificationType: 'LOW_STOCK_ALERT',
          subject: 'Low stock alert — Samsung Tab S9',
          content: 'Samsung Tab S9 has only 8 units in Main Warehouse (threshold: 10).',
          status: 'UNREAD', priority: 'MEDIUM',
          createdAt: new Date('2026-05-07'),
        },
        {
          recipientId: userMap['MANAGER'].id, channel: 'IN_APP', notificationType: 'APPROVAL_REQUIRED',
          subject: 'Quotation pending your approval',
          content: 'QUO-2026-00001 from Tech Solutions Ltd ($2,198.90) is awaiting approval.',
          status: 'UNREAD', priority: 'HIGH',
          createdAt: new Date('2026-03-01'),
        },
        {
          recipientId: userMap['MANAGER'].id, channel: 'IN_APP', notificationType: 'INVOICE_OVERDUE',
          subject: 'Overdue invoice — INV-2026-00002',
          content: 'Invoice INV-2026-00002 from Digital Corp ($3,186.70) is 22 days overdue.',
          status: 'UNREAD', priority: 'HIGH',
          createdAt: new Date('2026-05-07'),
        },
        {
          recipientId: salesId, channel: 'IN_APP', notificationType: 'INVOICE_OVERDUE',
          subject: 'Invoice overdue — action required',
          content: 'INV-2026-00002 ($3,186.70) from Digital Corp is overdue. Please follow up.',
          status: 'UNREAD', priority: 'HIGH',
          createdAt: new Date('2026-05-07'),
        },
        {
          recipientId: salesId, channel: 'IN_APP', notificationType: 'ORDER_CONFIRMED',
          subject: 'Order SO-2026-00005 confirmed',
          content: 'Sales order SO-2026-00005 for Digital Corp has been confirmed.',
          status: 'READ', priority: 'NORMAL',
          createdAt: new Date('2026-05-03'), readAt: new Date('2026-05-03'),
        },
        {
          recipientId: userMap['CUSTOMER'].id, channel: 'IN_APP', notificationType: 'ORDER_STATUS',
          subject: 'Welcome to miniERP Portal',
          content: 'Your account has been activated. You can now view your orders and invoices.',
          status: 'UNREAD', priority: 'NORMAL',
          createdAt: new Date('2026-05-07'),
        },
      ],
    });
  }

  // ── Summary ───────────────────────────────────────────
  console.log('\n✔ Seed complete.\n');
  console.log('  Organization : Demo Organization');
  console.log(`  Permissions  : ${PERMISSIONS.length}`);
  console.log(`  Roles        : ${ROLES.length}`);
  console.log('');
  console.log('  ┌─────────────────────────────────────────────────────────────┐');
  console.log('  │                  LOGIN CREDENTIALS                          │');
  console.log('  ├─────────────┬────────────────────────────┬──────────────────┤');
  console.log('  │ Role        │ Email                      │ Password         │');
  console.log('  ├─────────────┼────────────────────────────┼──────────────────┤');
  console.log('  │ Admin       │ admin@mini-erp.local       │ Admin@123456     │');
  console.log('  │ Manager     │ manager@mini-erp.local     │ Manager@123456   │');
  console.log('  │ Sales       │ sales@mini-erp.local       │ Sales@123456     │');
  console.log('  │ Customer    │ customer@mini-erp.local    │ Customer@123456  │');
  console.log('  │ Accountant  │ accountant@mini-erp.local  │ Accountant@123456│');
  console.log('  │ Warehouse   │ warehouse@mini-erp.local   │ Warehouse@123456 │');
  console.log('  └─────────────┴────────────────────────────┴──────────────────┘');
  console.log('');
  console.log('  Sample Data:');
  console.log('  - Brands: Apple, Samsung, Dell');
  console.log('  - Categories: Electronics > Smartphones, Laptops, Tablets');
  console.log('  - Products: 5 (iPhone 15 Pro, Galaxy S24, MacBook Pro, Dell XPS, Tab S9)');
  console.log('  - Warehouse: Main Warehouse + inventory stock');
  console.log('  - Customers: Tech Solutions Ltd, Digital Corp, Smart Electronics');
  console.log('  - Quotations: 2 (QUO-2026-00001, QUO-2026-00002)');
  console.log('  - Sales Orders: 5 (Mar–May 2026, mix of DELIVERED/CONFIRMED)');
  console.log('  - Deliveries: 3 (2 delivered, 1 pending)');
  console.log('  - Invoices: 4 (1 PAID, 3 SENT — INV-2026-00002 is overdue)');
  console.log('  - Payments: 1 (PAY-2026-00001, allocated to INV-2026-00001)');
  console.log('  - Notifications: 7 across all users');
  console.log('  - Settings: 10 system settings');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
