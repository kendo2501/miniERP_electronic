import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/types/auth-user.type';
import { CreateStockInquiryDto, RespondStockInquiryDto, StockInquiryQueryDto } from './stock-inquiry.dto';

const INQUIRY_SELECT = {
  id: true, inquiryNumber: true, status: true, notes: true,
  responseNotes: true, respondedAt: true, createdAt: true, updatedAt: true,
  requestedBy: { select: { id: true, fullName: true, email: true } },
  respondedBy: { select: { id: true, fullName: true } },
  items: {
    select: {
      id: true, requestedQuantity: true, availableQuantity: true, isAvailable: true, warehouseNote: true,
      product: { select: { id: true, sku: true, productName: true, unit: true, minPrice: true, standardPrice: true } },
    },
  },
};

@Injectable()
export class StockInquiryService {
  constructor(private prisma: PrismaService) {}

  async listInquiries(query: StockInquiryQueryDto, currentUser: AuthUser) {
    const { page = 1, limit = 20, status } = query;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;

    // Sales sees only their own; Warehouse sees all pending + responded
    const perms = currentUser.permissions;
    if (!perms.includes('inventory.stock.respond')) {
      where.requestedById = currentUser.id;
    }

    const [items, total] = await Promise.all([
      this.prisma.stockInquiry.findMany({
        where, skip, take: limit, orderBy: { createdAt: 'desc' },
        select: {
          id: true, inquiryNumber: true, status: true, notes: true, responseNotes: true,
          respondedAt: true, createdAt: true,
          requestedBy: { select: { id: true, fullName: true } },
          respondedBy: { select: { id: true, fullName: true } },
          _count: { select: { items: true } },
        },
      }),
      this.prisma.stockInquiry.count({ where }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getInquiry(id: number) {
    const inquiry = await this.prisma.stockInquiry.findUnique({ where: { id }, select: INQUIRY_SELECT });
    if (!inquiry) throw new NotFoundException(`Stock inquiry #${id} not found`);
    return inquiry;
  }

  async createInquiry(dto: CreateStockInquiryDto, currentUser: AuthUser) {
    const count = await this.prisma.stockInquiry.count();
    const inquiryNumber = `INQ-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    return this.prisma.stockInquiry.create({
      data: {
        inquiryNumber,
        requestedById: currentUser.id,
        status: 'PENDING',
        notes: dto.notes,
        items: {
          create: dto.items.map((i) => ({
            productId: i.productId,
            requestedQuantity: i.requestedQuantity,
          })),
        },
      },
      select: INQUIRY_SELECT,
    });
  }

  async respondToInquiry(id: number, dto: RespondStockInquiryDto, currentUser: AuthUser) {
    const inquiry = await this.prisma.stockInquiry.findUnique({ where: { id }, select: { id: true, status: true } });
    if (!inquiry) throw new NotFoundException(`Stock inquiry #${id} not found`);
    if (inquiry.status === 'RESPONDED') throw new BadRequestException('Inquiry already responded');

    return this.prisma.$transaction(async (tx) => {
      for (const item of dto.items) {
        await tx.stockInquiryItem.update({
          where: { id: item.itemId },
          data: {
            isAvailable: item.isAvailable,
            availableQuantity: item.availableQuantity ?? null,
            warehouseNote: item.warehouseNote ?? null,
          },
        });
      }
      return tx.stockInquiry.update({
        where: { id },
        data: {
          status: 'RESPONDED',
          responseNotes: dto.responseNotes ?? null,
          respondedById: currentUser.id,
          respondedAt: new Date(),
        },
        select: INQUIRY_SELECT,
      });
    });
  }
}
