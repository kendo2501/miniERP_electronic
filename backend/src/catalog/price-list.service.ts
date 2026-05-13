import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePriceListDto, CreatePriceListItemDto, PriceListLookupQueryDto } from './dto/price-list.dto';

@Injectable()
export class PriceListService {
  constructor(private prisma: PrismaService) {}

  async listPriceLists() {
    return this.prisma.priceList.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { id: true, companyName: true } },
        _count: { select: { items: true } },
      },
    });
  }

  async getPriceList(id: number) {
    const pl = await this.prisma.priceList.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, companyName: true } },
        items: {
          orderBy: { id: 'asc' },
          include: {
            product: { select: { id: true, sku: true, productName: true, unit: true } },
          },
        },
      },
    });
    if (!pl) throw new NotFoundException(`Price list #${id} not found`);
    return pl;
  }

  async createPriceList(dto: CreatePriceListDto) {
    this.validateCrossFields(dto);
    this.validateDateRange(dto);
    return this.prisma.priceList.create({
      data: {
        name: dto.name,
        applyTo: dto.applyTo,
        customerTier: dto.customerTier,
        customerId: dto.customerId,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : null,
        validTo: dto.validTo ? new Date(dto.validTo) : null,
        isDefault: dto.isDefault ?? false,
      },
      include: {
        customer: { select: { id: true, companyName: true } },
        _count: { select: { items: true } },
      },
    });
  }

  async updatePriceList(id: number, dto: Partial<CreatePriceListDto>) {
    await this.ensureExists(id);
    this.validateCrossFields(dto);
    this.validateDateRange(dto);
    return this.prisma.priceList.update({
      where: { id },
      data: {
        name: dto.name,
        applyTo: dto.applyTo,
        customerTier: dto.customerTier,
        customerId: dto.customerId,
        validFrom: dto.validFrom !== undefined ? (dto.validFrom ? new Date(dto.validFrom) : null) : undefined,
        validTo: dto.validTo !== undefined ? (dto.validTo ? new Date(dto.validTo) : null) : undefined,
        isDefault: dto.isDefault,
      },
      include: {
        customer: { select: { id: true, companyName: true } },
        _count: { select: { items: true } },
      },
    });
  }

  async addItem(priceListId: number, dto: CreatePriceListItemDto) {
    await this.ensureExists(priceListId);
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.priceListItem.findFirst({
        where: { priceListId, productId: dto.productId },
      });
      if (existing) {
        return tx.priceListItem.update({
          where: { id: existing.id },
          data: {
            unitPrice: dto.unitPrice,
            minQuantity: dto.minQuantity ?? 1,
          },
          include: {
            product: { select: { id: true, sku: true, productName: true, unit: true } },
          },
        });
      }
      return tx.priceListItem.create({
        data: {
          priceListId,
          productId: dto.productId,
          unitPrice: dto.unitPrice,
          minQuantity: dto.minQuantity ?? 1,
        },
        include: {
          product: { select: { id: true, sku: true, productName: true, unit: true } },
        },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async removeItem(priceListId: number, itemId: number) {
    await this.ensureExists(priceListId);
    const { count } = await this.prisma.priceListItem.deleteMany({
      where: { id: itemId, priceListId },
    });
    if (count === 0) {
      throw new NotFoundException(`Item #${itemId} not found in price list #${priceListId}`);
    }
  }

  async lookupPrice(query: PriceListLookupQueryDto): Promise<{ unitPrice: string; source: string }> {
    const today = new Date(new Date().toISOString().substring(0, 10));
    const quantity = query.quantity ?? 1;

    const activeWhere = {
      AND: [
        { OR: [{ validFrom: null }, { validFrom: { lte: today } }] },
        { OR: [{ validTo: null }, { validTo: { gte: today } }] },
      ],
    };

    const findBestItem = (priceLists: any[]) => {
      const candidates = priceLists
        .flatMap((pl) => pl.items)
        .filter((item: any) => item.productId === query.productId && Number(item.minQuantity) <= quantity)
        .sort((a: any, b: any) => Number(b.minQuantity) - Number(a.minQuantity) || Number(a.unitPrice) - Number(b.unitPrice));
      return candidates[0] ?? null;
    };

    // 1. Customer-specific
    if (query.customerId) {
      const lists = await this.prisma.priceList.findMany({
        where: { ...activeWhere, applyTo: 'CUSTOMER', customerId: query.customerId },
        include: { items: { where: { productId: query.productId } } },
      });
      const item = findBestItem(lists);
      if (item) return { unitPrice: String(item.unitPrice), source: 'customer-specific' };
    }

    // 2. Tier-specific
    if (query.customerTier) {
      const lists = await this.prisma.priceList.findMany({
        where: { ...activeWhere, applyTo: 'TIER', customerTier: query.customerTier },
        include: { items: { where: { productId: query.productId } } },
      });
      const item = findBestItem(lists);
      if (item) return { unitPrice: String(item.unitPrice), source: 'tier' };
    }

    // 3. Default price list
    const defaultLists = await this.prisma.priceList.findMany({
      where: { ...activeWhere, isDefault: true },
      include: { items: { where: { productId: query.productId } } },
    });
    const defaultItem = findBestItem(defaultLists);
    if (defaultItem) return { unitPrice: String(defaultItem.unitPrice), source: 'default' };

    // 4. Fallback: product.minPrice
    const product = await this.prisma.product.findUnique({
      where: { id: query.productId },
      select: { minPrice: true },
    });
    if (!product) throw new NotFoundException(`Product #${query.productId} not found`);
    return { unitPrice: String(product.minPrice ?? 0), source: 'fallback-minprice' };
  }

  private validateCrossFields(dto: Partial<CreatePriceListDto>): void {
    if (dto.applyTo === 'TIER' && !dto.customerTier) {
      throw new BadRequestException('customerTier is required when applyTo is TIER');
    }
    if (dto.applyTo === 'CUSTOMER' && !dto.customerId) {
      throw new BadRequestException('customerId is required when applyTo is CUSTOMER');
    }
  }

  private validateDateRange(dto: Partial<CreatePriceListDto>): void {
    if (dto.validFrom && dto.validTo && dto.validFrom >= dto.validTo) {
      throw new BadRequestException('validFrom must be before validTo');
    }
  }

  private async ensureExists(id: number) {
    const pl = await this.prisma.priceList.findUnique({ where: { id } });
    if (!pl) throw new NotFoundException(`Price list #${id} not found`);
  }
}
