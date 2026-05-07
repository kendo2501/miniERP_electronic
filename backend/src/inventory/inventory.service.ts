import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWarehouseDto, UpdateWarehouseDto } from './dto/warehouse.dto';
import { AdjustStockDto, TransferStockDto } from './dto/adjustment.dto';
import { StockQueryDto, TransactionQueryDto } from './dto/stock-query.dto';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  // ─── Warehouses ───────────────────────────────────────────────────────────

  async getWarehouses() {
    return this.prisma.warehouse.findMany({
      where: { status: { not: 'DELETED' } },
      select: {
        id: true, code: true, warehouseName: true, address: true, status: true, createdAt: true,
        _count: { select: { inventoryStocks: true } },
      },
      orderBy: { warehouseName: 'asc' },
    });
  }

  async getWarehouse(id: number) {
    const wh = await this.prisma.warehouse.findUnique({
      where: { id },
      include: {
        _count: { select: { inventoryStocks: true, inventoryTransactions: true } },
      },
    });
    if (!wh || wh.status === 'DELETED') throw new NotFoundException(`Warehouse #${id} not found`);
    return wh;
  }

  async createWarehouse(dto: CreateWarehouseDto) {
    const exists = await this.prisma.warehouse.findUnique({ where: { code: dto.code } });
    if (exists) throw new ConflictException(`Warehouse code '${dto.code}' already exists`);
    return this.prisma.warehouse.create({
      data: { code: dto.code, warehouseName: dto.warehouseName, address: dto.address, status: 'ACTIVE' },
    });
  }

  async updateWarehouse(id: number, dto: UpdateWarehouseDto) {
    await this.getWarehouse(id);
    return this.prisma.warehouse.update({ where: { id }, data: dto });
  }

  // ─── Stocks ───────────────────────────────────────────────────────────────

  async getStocks(query: StockQueryDto) {
    const { page = 1, limit = 20, warehouseId, productId, search, lowStockOnly, lowStockThreshold = 10 } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (warehouseId) where.warehouseId = warehouseId;
    if (productId) where.productId = productId;
    if (lowStockOnly) where.availableQuantity = { lte: lowStockThreshold };
    if (search) {
      where.product = {
        OR: [
          { productName: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.inventoryStock.findMany({
        where,
        skip,
        take: limit,
        include: {
          product: { select: { id: true, sku: true, productName: true, unit: true } },
          warehouse: { select: { id: true, code: true, warehouseName: true } },
        },
        orderBy: { product: { productName: 'asc' } },
      }),
      this.prisma.inventoryStock.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getLowStockAlerts(threshold = 10) {
    return this.prisma.inventoryStock.findMany({
      where: { availableQuantity: { lte: threshold } },
      include: {
        product: { select: { id: true, sku: true, productName: true, unit: true } },
        warehouse: { select: { id: true, code: true, warehouseName: true } },
      },
      orderBy: { availableQuantity: 'asc' },
    });
  }

  // ─── Adjustments ──────────────────────────────────────────────────────────

  async adjustStock(dto: AdjustStockDto, userId: number) {
    const { warehouseId, productId, quantity, notes } = dto;

    await this.ensureWarehouseExists(warehouseId);
    await this.ensureProductExists(productId);

    return this.prisma.$transaction(async (tx) => {
      const stock = await tx.inventoryStock.findUnique({
        where: { warehouseId_productId: { warehouseId, productId } },
      });

      const currentQty = stock ? Number(stock.availableQuantity) : 0;
      const newQty = currentQty + quantity;

      if (newQty < 0) {
        throw new BadRequestException(
          `Insufficient stock. Available: ${currentQty}, requested adjustment: ${quantity}`,
        );
      }

      const updated = await tx.inventoryStock.upsert({
        where: { warehouseId_productId: { warehouseId, productId } },
        create: {
          warehouseId,
          productId,
          availableQuantity: newQty,
          reservedQuantity: 0,
          damagedQuantity: 0,
        },
        update: { availableQuantity: newQty },
      });

      await tx.inventoryTransaction.create({
        data: {
          warehouseId,
          productId,
          transactionType: quantity >= 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT',
          quantity,
          balanceAfter: newQty,
          notes,
          createdBy: userId,
        },
      });

      return updated;
    });
  }

  // ─── Transfers ────────────────────────────────────────────────────────────

  async transferStock(dto: TransferStockDto, userId: number) {
    const { fromWarehouseId, toWarehouseId, productId, quantity, notes } = dto;

    if (fromWarehouseId === toWarehouseId) {
      throw new BadRequestException('Source and destination warehouse must differ');
    }
    if (quantity <= 0) {
      throw new BadRequestException('Transfer quantity must be positive');
    }

    await this.ensureWarehouseExists(fromWarehouseId);
    await this.ensureWarehouseExists(toWarehouseId);
    await this.ensureProductExists(productId);

    return this.prisma.$transaction(async (tx) => {
      const fromStock = await tx.inventoryStock.findUnique({
        where: { warehouseId_productId: { warehouseId: fromWarehouseId, productId } },
      });

      const fromQty = fromStock ? Number(fromStock.availableQuantity) : 0;
      if (fromQty < quantity) {
        throw new BadRequestException(
          `Insufficient stock in source warehouse. Available: ${fromQty}, requested: ${quantity}`,
        );
      }

      const toStock = await tx.inventoryStock.findUnique({
        where: { warehouseId_productId: { warehouseId: toWarehouseId, productId } },
      });
      const toQty = toStock ? Number(toStock.availableQuantity) : 0;

      const newFromQty = fromQty - quantity;
      const newToQty = toQty + quantity;

      await tx.inventoryStock.upsert({
        where: { warehouseId_productId: { warehouseId: fromWarehouseId, productId } },
        create: { warehouseId: fromWarehouseId, productId, availableQuantity: newFromQty, reservedQuantity: 0, damagedQuantity: 0 },
        update: { availableQuantity: newFromQty },
      });

      await tx.inventoryStock.upsert({
        where: { warehouseId_productId: { warehouseId: toWarehouseId, productId } },
        create: { warehouseId: toWarehouseId, productId, availableQuantity: newToQty, reservedQuantity: 0, damagedQuantity: 0 },
        update: { availableQuantity: newToQty },
      });

      await tx.inventoryTransaction.createMany({
        data: [
          {
            warehouseId: fromWarehouseId, productId,
            transactionType: 'TRANSFER_OUT',
            referenceType: 'TRANSFER', quantity: -quantity,
            balanceAfter: newFromQty, notes, createdBy: userId,
          },
          {
            warehouseId: toWarehouseId, productId,
            transactionType: 'TRANSFER_IN',
            referenceType: 'TRANSFER', quantity,
            balanceAfter: newToQty, notes, createdBy: userId,
          },
        ],
      });

      return { fromWarehouseId, toWarehouseId, productId, quantity, newFromQty, newToQty };
    });
  }

  // ─── Transactions ─────────────────────────────────────────────────────────

  async getTransactions(query: TransactionQueryDto) {
    const { page = 1, limit = 20, warehouseId, productId, transactionType } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (warehouseId) where.warehouseId = warehouseId;
    if (productId) where.productId = productId;
    if (transactionType) where.transactionType = transactionType;

    const [items, total] = await Promise.all([
      this.prisma.inventoryTransaction.findMany({
        where,
        skip,
        take: limit,
        include: {
          product: { select: { id: true, sku: true, productName: true } },
          warehouse: { select: { id: true, code: true, warehouseName: true } },
          creator: { select: { id: true, fullName: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.inventoryTransaction.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async ensureWarehouseExists(id: number) {
    const wh = await this.prisma.warehouse.findUnique({ where: { id }, select: { id: true, status: true } });
    if (!wh || wh.status === 'DELETED') throw new NotFoundException(`Warehouse #${id} not found`);
  }

  private async ensureProductExists(id: number) {
    const p = await this.prisma.product.findUnique({ where: { id }, select: { id: true, deletedAt: true } });
    if (!p || p.deletedAt) throw new NotFoundException(`Product #${id} not found`);
  }
}
