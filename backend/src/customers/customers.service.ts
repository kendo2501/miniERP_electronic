import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto, UpdateCustomerDto, CustomerQueryDto, CreatePortalAccountDto } from './dto/customer.dto';

const SELECT_CUSTOMER = {
  id: true, customerCode: true, companyName: true, contactName: true,
  phone: true, email: true, address: true, taxCode: true,
  creditLimit: true, customerType: true, status: true, createdAt: true, updatedAt: true,
  organizationId: true, assignedSalesUserId: true,
  assignedSales: { select: { id: true, fullName: true, email: true } },
  linkedUser: { select: { id: true, fullName: true, email: true, status: true } },
};

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: CustomerQueryDto) {
    const { page = 1, limit = 20, search, status, assignedSalesUserId } = query;
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };
    if (status) where.status = status;
    if (assignedSalesUserId) where.assignedSalesUserId = assignedSalesUserId;
    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: 'insensitive' } },
        { customerCode: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.customer.findMany({ where, skip, take: limit, select: SELECT_CUSTOMER, orderBy: { companyName: 'asc' } }),
      this.prisma.customer.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: number) {
    const c = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        assignedSales: { select: { id: true, fullName: true, email: true } },
        _count: { select: { quotations: true, salesOrders: true, invoices: true } },
      },
    });
    if (!c || c.deletedAt) throw new NotFoundException(`Customer #${id} not found`);
    return c;
  }

  async create(dto: CreateCustomerDto) {
    const code = await this.generateCode();
    return this.prisma.customer.create({
      data: { ...dto, customerCode: code, status: 'ACTIVE', creditLimit: dto.creditLimit ?? 0 },
      select: SELECT_CUSTOMER,
    });
  }

  async update(id: number, dto: UpdateCustomerDto) {
    await this.findOne(id);
    return this.prisma.customer.update({ where: { id }, data: dto, select: SELECT_CUSTOMER });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.customer.update({ where: { id }, data: { deletedAt: new Date() }, select: { id: true } });
  }

  async createPortalAccount(customerId: number, dto: CreatePortalAccountDto) {
    const customer = await this.findOne(customerId);
    if ((customer as any).linkedUser) {
      throw new ConflictException('Customer already has a linked portal account');
    }

    const existing = await this.prisma.user.findUnique({ where: { email: dto.email }, select: { id: true } });
    if (existing) throw new ConflictException('Email đã được sử dụng');

    const customerRole = await this.prisma.role.findUnique({ where: { code: 'CUSTOMER' }, select: { id: true } });
    if (!customerRole) throw new BadRequestException('CUSTOMER role not found — run seed first');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        fullName: dto.fullName ?? customer.companyName,
        status: 'ACTIVE',
        linkedCustomerId: customerId,
        userRoles: { create: [{ roleId: customerRole.id }] },
      },
      select: { id: true, email: true, fullName: true, status: true },
    });

    return user;
  }

  async unlinkPortalAccount(customerId: number) {
    const customer = await this.findOne(customerId);
    const linked = (customer as any).linkedUser as { id: number } | null;
    if (!linked) throw new NotFoundException('Customer has no linked portal account');

    await this.prisma.user.update({
      where: { id: linked.id },
      data: { linkedCustomerId: null },
    });
    return { unlinked: true };
  }

  private async generateCode(): Promise<string> {
    const count = await this.prisma.customer.count();
    return `CUST-${String(count + 1).padStart(5, '0')}`;
  }
}
