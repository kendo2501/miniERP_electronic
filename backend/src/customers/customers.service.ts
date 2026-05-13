import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto, UpdateCustomerDto, CustomerQueryDto, CreatePortalAccountDto, CreateAddressDto, UpdateAddressDto } from './dto/customer.dto';

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
        addresses: { orderBy: [{ isDefault: 'desc' }, { id: 'asc' }] },
        _count: { select: { quotations: true, salesOrders: true, invoices: true } },
      },
    });
    if (!c || c.deletedAt) throw new NotFoundException(`Customer #${id} not found`);
    return c;
  }

  async addAddress(customerId: number, dto: CreateAddressDto) {
    await this.findOne(customerId);

    if (dto.isDefault) {
      return this.prisma.$transaction(async (tx) => {
        await tx.customerAddress.updateMany({
          where: { customerId, isDefault: true },
          data: { isDefault: false },
        });
        return tx.customerAddress.create({
          data: { customerId, label: dto.label, address: dto.address, isDefault: true },
        });
      });
    }

    return this.prisma.customerAddress.create({
      data: { customerId, label: dto.label, address: dto.address, isDefault: dto.isDefault ?? false },
    });
  }

  async updateAddress(customerId: number, addressId: number, dto: UpdateAddressDto) {
    await this.findOne(customerId);
    const existing = await this.prisma.customerAddress.findFirst({ where: { id: addressId, customerId } });
    if (!existing) throw new NotFoundException(`Address #${addressId} not found for customer #${customerId}`);

    if (dto.isDefault) {
      return this.prisma.$transaction(async (tx) => {
        await tx.customerAddress.updateMany({
          where: { customerId, isDefault: true, id: { not: addressId } },
          data: { isDefault: false },
        });
        return tx.customerAddress.update({ where: { id: addressId }, data: dto });
      });
    }

    return this.prisma.customerAddress.update({ where: { id: addressId }, data: dto });
  }

  async removeAddress(customerId: number, addressId: number) {
    await this.findOne(customerId);
    const existing = await this.prisma.customerAddress.findFirst({ where: { id: addressId, customerId } });
    if (!existing) throw new NotFoundException(`Address #${addressId} not found for customer #${customerId}`);
    return this.prisma.customerAddress.delete({ where: { id: addressId } });
  }

  async create(dto: CreateCustomerDto) {
    const { password, customerCode: inputCode, ...customerData } = dto;

    // Resolve customer code
    const code = inputCode?.trim()
      ? inputCode.trim().toUpperCase()
      : await this.generateCode();

    // Uniqueness checks
    const [codeExists, emailExists] = await Promise.all([
      this.prisma.customer.findFirst({ where: { customerCode: code, deletedAt: null }, select: { id: true } }),
      this.prisma.user.findUnique({ where: { email: dto.email }, select: { id: true } }),
    ]);
    if (codeExists) throw new ConflictException(`Mã khách hàng "${code}" đã tồn tại`);
    if (emailExists) throw new ConflictException('Email đã được sử dụng bởi tài khoản khác');

    const customerRole = await this.prisma.role.findUnique({ where: { code: 'CUSTOMER' }, select: { id: true } });
    if (!customerRole) throw new BadRequestException('CUSTOMER role not found — run seed first');

    const passwordHash = await bcrypt.hash(password, 10);

    // Create customer + portal user in a transaction
    const customer = await this.prisma.$transaction(async (tx) => {
      const newCustomer = await tx.customer.create({
        data: {
          ...customerData,
          customerCode: code,
          status: 'ACTIVE',
          creditLimit: customerData.creditLimit ?? 0,
        },
        select: { id: true, companyName: true },
      });

      await tx.user.create({
        data: {
          email: dto.email,
          passwordHash,
          fullName: dto.contactName ?? dto.companyName,
          status: 'ACTIVE',
          linkedCustomerId: newCustomer.id,
          userRoles: { create: [{ roleId: customerRole.id }] },
        },
      });

      return tx.customer.findUniqueOrThrow({ where: { id: newCustomer.id }, select: SELECT_CUSTOMER });
    });

    return customer;
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
    const last = await this.prisma.customer.findFirst({
      orderBy: { id: 'desc' },
      select: { customerCode: true },
    });
    if (!last?.customerCode) return 'CUST-00001';
    const match = last.customerCode.match(/\d+$/);
    const next = match ? parseInt(match[0], 10) + 1 : 1;
    return `CUST-${String(next).padStart(5, '0')}`;
  }
}
