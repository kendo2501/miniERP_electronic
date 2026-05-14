import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWarehouseDto, UpdateWarehouseDto } from './dto/warehouse.dto';
import { AdjustStockDto, TransferStockDto, AdjustmentType } from './dto/adjustment.dto';
import { StockQueryDto, TransactionQueryDto } from './dto/stock-query.dto';
import {
  CreateReplenishmentDto,
  UpdateReplenishmentDto,
  ReplenishmentQueryDto,
} from './dto/replenishment.dto';

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

  // ─── Product Search ───────────────────────────────────────────────────────

  async searchProducts(q: string, warehouseId?: number) {
    if (!q || q.trim().length < 1) return [];

    const term = q.trim();

    const products = await this.prisma.product.findMany({
      where: {
        deletedAt: null,
        OR: [
          { productName: { contains: term, mode: 'insensitive' } },
          { sku: { contains: term, mode: 'insensitive' } },
          { description: { contains: term, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true, sku: true, productName: true, unit: true, standardPrice: true,
        inventoryStocks: {
          where: warehouseId ? { warehouseId } : {},
          select: {
            warehouseId: true, availableQuantity: true, reservedQuantity: true,
            reorderThreshold: true,
            warehouse: { select: { id: true, code: true, warehouseName: true } },
          },
        },
      },
      take: 20,
      orderBy: { productName: 'asc' },
    });

    return products.map((p) => {
      const totalAvailable = p.inventoryStocks.reduce(
        (sum: number, s: { availableQuantity: any }) => sum + Number(s.availableQuantity),
        0,
      );
      return {
        id: p.id,
        sku: p.sku,
        productName: p.productName,
        unit: p.unit,
        standardPrice: p.standardPrice,
        totalAvailable,
        inStock: totalAvailable > 0,
        stocks: p.inventoryStocks,
      };
    });
  }

  // ─── Stocks ───────────────────────────────────────────────────────────────

  async getStocks(query: StockQueryDto) {
    const { page = 1, limit = 20, warehouseId, productId, search, lowStockOnly } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (warehouseId) where.warehouseId = warehouseId;
    if (productId) where.productId = productId;
    if (lowStockOnly) {
      where.availableQuantity = { lte: 10 };
    }
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

    const enriched = items.map((s) => ({
      ...s,
      stockStatus: Number(s.availableQuantity) <= 0 ? 'OUT_OF_STOCK' : 'IN_STOCK',
      isLowStock: Number(s.availableQuantity) > 0 && Number(s.availableQuantity) <= Number(s.reorderThreshold),
    }));

    return { items: enriched, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getLowStockAlerts(threshold = 10) {
    const stocks = await this.prisma.inventoryStock.findMany({
      where: { availableQuantity: { lte: threshold } },
      include: {
        product: { select: { id: true, sku: true, productName: true, unit: true } },
        warehouse: { select: { id: true, code: true, warehouseName: true } },
      },
      orderBy: { availableQuantity: 'asc' },
    });

    return stocks.map((s) => ({
      ...s,
      stockStatus: Number(s.availableQuantity) <= 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK',
    }));
  }

  // ─── Adjustments ──────────────────────────────────────────────────────────

  async adjustStock(dto: AdjustStockDto, userId: number) {
    const { warehouseId, productId, quantity, adjustmentType, reason, notes } = dto;

    if (quantity <= 0) throw new BadRequestException('Quantity must be positive');

    await this.ensureWarehouseExists(warehouseId);
    await this.ensureProductExists(productId);

    const isDeduction = [AdjustmentType.OUT, AdjustmentType.DAMAGE].includes(adjustmentType);
    const delta = isDeduction ? -Math.abs(quantity) : Math.abs(quantity);

    const txTypeMap: Record<AdjustmentType, string> = {
      [AdjustmentType.IN]: 'ADJUSTMENT_IN',
      [AdjustmentType.OUT]: 'ADJUSTMENT_OUT',
      [AdjustmentType.DAMAGE]: 'DAMAGE_WRITE_OFF',
      [AdjustmentType.RETURN]: 'RETURN_IN',
      [AdjustmentType.CORRECTION]: delta >= 0 ? 'CORRECTION_IN' : 'CORRECTION_OUT',
    };

    return this.prisma.$transaction(async (tx) => {
      const stock = await tx.inventoryStock.findUnique({
        where: { warehouseId_productId: { warehouseId, productId } },
      });

      const currentQty = stock ? Number(stock.availableQuantity) : 0;
      const newQty = currentQty + delta;

      if (newQty < 0) {
        throw new BadRequestException(
          `Insufficient stock. Available: ${currentQty}, requested: ${Math.abs(delta)}`,
        );
      }

      const updated = await tx.inventoryStock.upsert({
        where: { warehouseId_productId: { warehouseId, productId } },
        create: { warehouseId, productId, availableQuantity: newQty, reservedQuantity: 0, damagedQuantity: adjustmentType === AdjustmentType.DAMAGE ? quantity : 0 },
        update: {
          availableQuantity: newQty,
          ...(adjustmentType === AdjustmentType.DAMAGE && {
            damagedQuantity: { increment: quantity },
          }),
        },
        include: {
          product: { select: { id: true, sku: true, productName: true, unit: true } },
          warehouse: { select: { id: true, code: true, warehouseName: true } },
        },
      });

      await tx.inventoryTransaction.create({
        data: {
          warehouseId, productId,
          transactionType: txTypeMap[adjustmentType],
          quantity: delta,
          balanceAfter: newQty,
          notes: [reason, notes].filter(Boolean).join(' — ') || undefined,
          createdBy: userId,
        },
      });

      return {
        ...updated,
        stockStatus: newQty <= 0 ? 'OUT_OF_STOCK' : 'IN_STOCK',
        isLowStock: newQty > 0 && newQty <= Number(updated.reorderThreshold),
      };
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
          { warehouseId: fromWarehouseId, productId, transactionType: 'TRANSFER_OUT', referenceType: 'TRANSFER', quantity: -quantity, balanceAfter: newFromQty, notes, createdBy: userId },
          { warehouseId: toWarehouseId, productId, transactionType: 'TRANSFER_IN', referenceType: 'TRANSFER', quantity, balanceAfter: newToQty, notes, createdBy: userId },
        ],
      });

      return { fromWarehouseId, toWarehouseId, productId, quantity, newFromQty, newToQty };
    });
  }

  // ─── Inventory Deduction for Orders ──────────────────────────────────────

  async deductForOrder(salesOrderId: number, userId: number) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.salesOrder.findUnique({
        where: { id: salesOrderId },
        select: {
          id: true, orderNumber: true, inventoryDeducted: true,
          items: {
            select: { productId: true, quantity: true },
          },
        },
      });

      if (!order) throw new NotFoundException(`Order #${salesOrderId} not found`);
      if (order.inventoryDeducted) return { alreadyDeducted: true, salesOrderId };

      const replenishmentNeeded: { productId: number; shortageQty: number; reservedQty: number }[] = [];

      for (const item of order.items) {
        const productId = item.productId;
        const needed = Number(item.quantity);

        // Sum available stock across all warehouses
        const stocks = await tx.inventoryStock.findMany({
          where: { productId, availableQuantity: { gt: 0 } },
          orderBy: { availableQuantity: 'desc' },
        });

        let remaining = needed;

        for (const stock of stocks) {
          if (remaining <= 0) break;
          const available = Number(stock.availableQuantity);
          const deduct = Math.min(available, remaining);
          const newQty = available - deduct;

          await tx.inventoryStock.update({
            where: { warehouseId_productId: { warehouseId: stock.warehouseId, productId } },
            data: { availableQuantity: newQty },
          });

          await tx.inventoryTransaction.create({
            data: {
              warehouseId: stock.warehouseId, productId,
              transactionType: 'SALE_OUT',
              referenceType: 'SALES_ORDER',
              referenceId: salesOrderId,
              quantity: -deduct,
              balanceAfter: newQty,
              notes: `Order ${order.orderNumber}`,
              createdBy: userId,
            },
          });

          remaining -= deduct;
        }

        if (remaining > 0) {
          // Calculate how much was actually reserved
          const reserved = needed - remaining;
          replenishmentNeeded.push({ productId, shortageQty: remaining, reservedQty: reserved });
        }
      }

      await tx.salesOrder.update({
        where: { id: salesOrderId },
        data: {
          inventoryDeducted: true,
          backorderStatus: replenishmentNeeded.length > 0 ? 'PARTIAL' : null,
        },
      });

      // Create replenishment requests for shortages
      for (const { productId, shortageQty } of replenishmentNeeded) {
        const rNumber = await this.generateReplenishmentNumber(tx);
        await tx.replenishmentRequest.create({
          data: {
            requestNumber: rNumber,
            salesOrderId,
            productId,
            shortageQuantity: shortageQty,
            reservedQuantity: 0,
            status: 'PENDING',
            priority: 'HIGH',
            requestedBy: userId,
          },
        });
      }

      return {
        alreadyDeducted: false,
        salesOrderId,
        backorders: replenishmentNeeded,
      };
    });
  }

  // ─── Replenishment Requests ───────────────────────────────────────────────

  async listReplenishment(query: ReplenishmentQueryDto) {
    const { page = 1, limit = 20, status, priority, productId } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (productId) where.productId = productId;

    const [items, total] = await Promise.all([
      this.prisma.replenishmentRequest.findMany({
        where,
        skip,
        take: limit,
        include: {
          product: { select: { id: true, sku: true, productName: true, unit: true } },
          requester: { select: { id: true, fullName: true, email: true } },
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.replenishmentRequest.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async createReplenishment(dto: CreateReplenishmentDto, userId: number) {
    await this.ensureProductExists(dto.productId);
    const requestNumber = await this.generateReplenishmentNumber(this.prisma);
    return this.prisma.replenishmentRequest.create({
      data: {
        requestNumber,
        productId: dto.productId,
        warehouseId: dto.warehouseId,
        salesOrderId: dto.salesOrderId,
        shortageQuantity: dto.shortageQuantity,
        status: 'PENDING',
        priority: dto.priority ?? 'NORMAL',
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        notes: dto.notes,
        requestedBy: userId,
      },
      include: {
        product: { select: { id: true, sku: true, productName: true, unit: true } },
        requester: { select: { id: true, fullName: true } },
      },
    });
  }

  async updateReplenishment(id: number, dto: UpdateReplenishmentDto) {
    const req = await this.prisma.replenishmentRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException(`Replenishment request #${id} not found`);

    return this.prisma.replenishmentRequest.update({
      where: { id },
      data: {
        ...(dto.status && { status: dto.status }),
        ...(dto.priority && { priority: dto.priority }),
        ...(dto.assignedTo !== undefined && { assignedTo: dto.assignedTo }),
        ...(dto.dueDate && { dueDate: new Date(dto.dueDate) }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
      include: {
        product: { select: { id: true, sku: true, productName: true, unit: true } },
        requester: { select: { id: true, fullName: true } },
      },
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

  private async generateReplenishmentNumber(tx: any) {
    const prefix = `RPL-${new Date().getFullYear()}`;
    const last = await tx.replenishmentRequest.findFirst({
      where: { requestNumber: { startsWith: prefix } },
      orderBy: { id: 'desc' },
      select: { requestNumber: true },
    });
    const seq = last ? parseInt(last.requestNumber.split('-').pop() ?? '0', 10) + 1 : 1;
    return `${prefix}-${String(seq).padStart(5, '0')}`;
  }
}
