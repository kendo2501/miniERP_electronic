import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const USERS = [
  // Customer portal — linked to Điện Nhật Minh (CUST-002)
  { email: 'nhatminh@portal.local', password: 'Customer@123456',  fullName: 'Trần Thị Bích',     roleCode: 'CUSTOMER', linkCustomerCode: 'CUST-002' },
  // Customer portal — linked to Cơ Điện Phú Long (CUST-003)
  { email: 'phulong@portal.local',  password: 'Customer@123456',  fullName: 'Lê Văn Cường',      roleCode: 'CUSTOMER', linkCustomerCode: 'CUST-003' },
];

async function main() {
  const roles = await prisma.role.findMany({ select: { id: true, code: true } });
  const roleMap: Record<string, number> = {};
  for (const r of roles) roleMap[r.code] = r.id;

  const customers = await prisma.customer.findMany({ select: { id: true, customerCode: true } });
  const custMap: Record<string, number> = {};
  for (const c of customers) if (c.customerCode) custMap[c.customerCode] = c.id;

  const results: { role: string; email: string; password: string; fullName: string; linked?: string }[] = [];

  for (const u of USERS) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (existing) {
      results.push({ role: u.roleCode, email: u.email, password: u.password, fullName: u.fullName, linked: (u as any).linkCustomerCode });
      continue;
    }

    const hash = await bcrypt.hash(u.password, 10);
    const roleId = roleMap[u.roleCode];
    const linkCustId = (u as any).linkCustomerCode ? custMap[(u as any).linkCustomerCode] : undefined;

    // Ensure customer not already linked
    if (linkCustId) {
      const already = await prisma.user.findFirst({ where: { linkedCustomerId: linkCustId } });
      if (already) {
        console.log(`  SKIP: ${u.email} — customer ${(u as any).linkCustomerCode} already linked to ${already.email}`);
        continue;
      }
    }

    await prisma.user.create({
      data: {
        email: u.email,
        passwordHash: hash,
        fullName: u.fullName,
        status: 'ACTIVE',
        ...(linkCustId ? { linkedCustomerId: linkCustId } : {}),
        userRoles: { create: [{ roleId }] },
      },
    });

    results.push({ role: u.roleCode, email: u.email, password: u.password, fullName: u.fullName, linked: (u as any).linkCustomerCode });
  }

  console.log('\n✔ Users added/verified:\n');
  console.log('Role'.padEnd(12) + 'Email'.padEnd(35) + 'Password'.padEnd(22) + 'Họ tên');
  console.log('─'.repeat(90));
  for (const r of results) {
    const link = r.linked ? ` [→ ${r.linked}]` : '';
    console.log(r.role.padEnd(12) + r.email.padEnd(35) + r.password.padEnd(22) + r.fullName + link);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
