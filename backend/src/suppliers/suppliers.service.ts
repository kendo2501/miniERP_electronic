import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupplierDto, UpdateSupplierDto, SupplierQueryDto } from './dto/supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: SupplierQueryDto) {
    const { page = 1, limit = 20, search, status } = query;
    const where: any = { deletedAt: null };
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: 'insensitive' } },
        { supplierCode: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { taxCode: { contains: search, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where, orderBy: { companyName: 'asc' },
        skip: (page - 1) * limit, take: limit,
      }),
      this.prisma.supplier.count({ where }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: number) {
    const s = await this.prisma.supplier.findUnique({ where: { id } });
    if (!s || s.deletedAt) throw new NotFoundException(`Supplier #${id} not found`);
    return s;
  }

  async create(dto: CreateSupplierDto) {
    const supplier = await this.prisma.supplier.create({
      data: { ...dto, status: 'ACTIVE' },
    });
    const code = `SUP-${String(supplier.id).padStart(5, '0')}`;
    return this.prisma.supplier.update({ where: { id: supplier.id }, data: { supplierCode: code } });
  }

  async update(id: number, dto: UpdateSupplierDto) {
    await this.findOne(id);
    return this.prisma.supplier.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.supplier.update({ where: { id }, data: { deletedAt: new Date() }, select: { id: true } });
  }
}
