import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { GoodsReceivedInventoryEvent } from '../common/events/inventory.events';
import {
  CreatePurchaseRequestDto, PRQueryDto, RejectPRDto,
  CreateRFQDto, RFQQueryDto, SubmitRFQQuoteDto, SelectRFQWinnerDto,
  CreatePurchaseOrderDto, POQueryDto, CancelPODto,
  CreateGoodsReceiptDto, GRNQueryDto,
  CreatePurchaseInvoiceDto, PurchaseInvoiceQueryDto,
  CreateSupplierPaymentDto, SupplierPaymentQueryDto,
} from './dto/purchase.dto';

@Injectable()
export class PurchaseService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  // ─── Purchase Requests ───────────────────────────────────────────────────

  async listPRs(query: PRQueryDto) {
    const { page = 1, limit = 20, status } = query;
    const where: any = {};
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      this.prisma.purchaseRequest.findMany({
        where, skip: (page - 1) * limit, take: limit,
        include: { items: { include: { product: { select: { id: true, sku: true, productName: true, unit: true } } } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.purchaseRequest.count({ where }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getPR(id: number) {
    const pr = await this.prisma.purchaseRequest.findUnique({
      where: { id },
      include: {
        items: { include: { product: { select: { id: true, sku: true, productName: true, unit: true } } } },
      },
    });
    if (!pr) throw new NotFoundException(`PurchaseRequest #${id} not found`);
    return pr;
  }

  async createPR(dto: CreatePurchaseRequestDto, userId: number) {
    const prNumber = await this.generatePRNumber();
    return this.prisma.$transaction(async (tx) => {
      const pr = await tx.purchaseRequest.create({
        data: { prNumber, status: 'DRAFT', notes: dto.notes, requestedBy: userId },
      });
      for (const item of dto.items) {
        await tx.purchaseRequestItem.create({
          data: {
            purchaseRequestId: pr.id,
            productId: item.productId,
            quantity: item.quantity,
            estimatedUnitPrice: item.estimatedUnitPrice,
            notes: item.notes,
          },
        });
      }
      return tx.purchaseRequest.findUniqueOrThrow({
        where: { id: pr.id },
        include: { items: { include: { product: { select: { id: true, sku: true, productName: true, unit: true } } } } },
      });
    });
  }

  async submitPR(id: number) {
    const pr = await this.getPR(id);
    if (pr.status !== 'DRAFT') throw new BadRequestException('Only DRAFT PRs can be submitted');
    return this.prisma.purchaseRequest.update({
      where: { id }, data: { status: 'PENDING_APPROVAL' },
      select: { id: true, prNumber: true, status: true },
    });
  }

  async approvePR(id: number, userId: number) {
    const pr = await this.getPR(id);
    if (pr.status !== 'PENDING_APPROVAL') throw new BadRequestException('Only PENDING_APPROVAL PRs can be approved');
    return this.prisma.purchaseRequest.update({
      where: { id },
      data: { status: 'APPROVED', approvedBy: userId, approvedAt: new Date() },
      select: { id: true, prNumber: true, status: true, approvedBy: true, approvedAt: true },
    });
  }

  async rejectPR(id: number, dto: RejectPRDto) {
    const pr = await this.getPR(id);
    if (pr.status !== 'PENDING_APPROVAL') throw new BadRequestException('Only PENDING_APPROVAL PRs can be rejected');
    return this.prisma.purchaseRequest.update({
      where: { id },
      data: { status: 'REJECTED', rejectionReason: dto.reason },
      select: { id: true, prNumber: true, status: true, rejectionReason: true },
    });
  }

  async getLowStockSuggestions() {
    // Find stocks where availableQuantity <= reorderThreshold
    const stocks = await this.prisma.inventoryStock.findMany({
      where: {
        product: { deletedAt: null },
      },
      include: {
        product: { select: { id: true, sku: true, productName: true, unit: true } },
      },
    });

    // Group by product, sum quantities
    const byProduct = new Map<number, { product: any; totalAvailable: number; reorderThreshold: number }>();
    for (const s of stocks) {
      const threshold = Number(s.reorderThreshold ?? 0);
      const existing = byProduct.get(s.productId);
      if (existing) {
        existing.totalAvailable += Number(s.availableQuantity);
        existing.reorderThreshold = Math.max(existing.reorderThreshold, threshold);
      } else {
        byProduct.set(s.productId, {
          product: s.product,
          totalAvailable: Number(s.availableQuantity),
          reorderThreshold: threshold,
        });
      }
    }

    return Array.from(byProduct.values())
      .filter(({ reorderThreshold, totalAvailable }) => reorderThreshold > 0 && totalAvailable <= reorderThreshold)
      .map(({ product, totalAvailable, reorderThreshold }) => ({
        productId: product.id,
        sku: product.sku,
        productName: product.productName,
        unit: product.unit,
        currentStock: totalAvailable,
        reorderThreshold,
        suggestedQuantity: reorderThreshold - totalAvailable,
      }));
  }

  // ─── RFQ ─────────────────────────────────────────────────────────────────

  async listRFQs(query: RFQQueryDto) {
    const { page = 1, limit = 20, status } = query;
    const where: any = {};
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      this.prisma.rFQ.findMany({
        where, skip: (page - 1) * limit, take: limit,
        include: {
          items: { include: { product: { select: { id: true, sku: true, productName: true } } } },
          supplierQuotes: { select: { id: true, supplierId: true, status: true, supplier: { select: { id: true, companyName: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.rFQ.count({ where }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getRFQ(id: number) {
    const rfq = await this.prisma.rFQ.findUnique({
      where: { id },
      include: {
        items: { include: { product: { select: { id: true, sku: true, productName: true, unit: true } } } },
        supplierQuotes: {
          include: {
            supplier: { select: { id: true, companyName: true } },
            items: { include: { product: { select: { id: true, sku: true, productName: true } } } },
          },
        },
      },
    });
    if (!rfq) throw new NotFoundException(`RFQ #${id} not found`);
    return rfq;
  }

  async createRFQ(dto: CreateRFQDto, userId: number) {
    const rfqNumber = await this.generateRFQNumber();
    return this.prisma.$transaction(async (tx) => {
      const rfq = await tx.rFQ.create({
        data: { rfqNumber, status: 'DRAFT', notes: dto.notes, createdBy: userId },
      });
      for (const item of dto.items) {
        await tx.rFQItem.create({ data: { rfqId: rfq.id, productId: item.productId, quantity: item.quantity } });
      }
      for (const supplierId of dto.supplierIds) {
        await tx.rFQSupplierQuote.create({ data: { rfqId: rfq.id, supplierId, status: 'PENDING' } });
      }
      return tx.rFQ.findUniqueOrThrow({
        where: { id: rfq.id },
        include: {
          items: { include: { product: { select: { id: true, sku: true, productName: true, unit: true } } } },
          supplierQuotes: { select: { id: true, supplierId: true, status: true, supplier: { select: { id: true, companyName: true } } } },
        },
      });
    });
  }

  async submitRFQQuote(id: number, dto: SubmitRFQQuoteDto) {
    const rfq = await this.getRFQ(id);
    const quote = rfq.supplierQuotes.find((q) => q.supplierId === dto.supplierId);
    if (!quote) throw new NotFoundException(`Supplier #${dto.supplierId} is not part of RFQ #${id}`);

    const totalAmount = dto.items.reduce((sum, i) => {
      const rfqItem = rfq.items.find((ri) => ri.productId === i.productId);
      if (!rfqItem || !i.unitPrice) return sum;
      return sum + Number(rfqItem.quantity) * i.unitPrice;
    }, 0);

    return this.prisma.$transaction(async (tx) => {
      await tx.rFQSupplierQuoteItem.deleteMany({ where: { rfqSupplierQuoteId: quote.id } });
      await tx.rFQSupplierQuote.update({
        where: { id: quote.id },
        data: { status: 'QUOTED', totalAmount, notes: dto.notes, quotedAt: new Date() },
      });
      for (const item of dto.items) {
        await tx.rFQSupplierQuoteItem.create({
          data: {
            rfqSupplierQuoteId: quote.id,
            productId: item.productId,
            unitPrice: item.unitPrice,
            deliveryDays: item.deliveryDays,
          },
        });
      }
      return tx.rFQ.findUniqueOrThrow({
        where: { id },
        include: {
          items: { include: { product: { select: { id: true, sku: true, productName: true, unit: true } } } },
          supplierQuotes: {
            include: {
              supplier: { select: { id: true, companyName: true } },
              items: true,
            },
          },
        },
      });
    });
  }

  async getRFQComparison(id: number) {
    const rfq = await this.getRFQ(id);

    return rfq.items.map((rfqItem) => {
      const quotes = rfq.supplierQuotes.map((sq) => {
        const qItem = sq.items.find((qi) => qi.productId === rfqItem.productId);
        return {
          supplierId: sq.supplierId,
          supplierName: (sq as any).supplier?.companyName,
          unitPrice: qItem?.unitPrice ? Number(qItem.unitPrice) : null,
          deliveryDays: qItem?.deliveryDays ?? null,
          isBestPrice: false,
        };
      }).filter((q) => q.unitPrice !== null);

      const prices = quotes.map((q) => q.unitPrice as number);
      const bestPrice = prices.length > 0 ? Math.min(...prices) : null;
      const result = quotes.map((q) => ({ ...q, isBestPrice: q.unitPrice === bestPrice }));

      return {
        productId: rfqItem.productId,
        productName: (rfqItem as any).product?.productName,
        quantity: Number(rfqItem.quantity),
        quotes: result,
      };
    });
  }

  async selectRFQWinner(id: number, dto: SelectRFQWinnerDto) {
    const rfq = await this.getRFQ(id);
    if (rfq.status === 'AWARDED') throw new BadRequestException('RFQ already awarded');
    const quote = rfq.supplierQuotes.find((q) => q.supplierId === dto.supplierId);
    if (!quote) throw new NotFoundException(`Supplier #${dto.supplierId} is not part of RFQ #${id}`);

    return this.prisma.rFQ.update({
      where: { id },
      data: { status: 'AWARDED', winnerSupplierId: dto.supplierId },
      select: { id: true, rfqNumber: true, status: true, winnerSupplierId: true },
    });
  }

  // ─── Purchase Orders ─────────────────────────────────────────────────────

  async listPOs(query: POQueryDto) {
    const { page = 1, limit = 20, status, supplierId } = query;
    const where: any = {};
    if (status) where.status = status;
    if (supplierId) where.supplierId = supplierId;

    const [items, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where, skip: (page - 1) * limit, take: limit,
        include: {
          supplier: { select: { id: true, companyName: true, supplierCode: true } },
          _count: { select: { items: true, receipts: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getPO(id: number) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: { select: { id: true, companyName: true, supplierCode: true, email: true } },
        items: { include: { product: { select: { id: true, sku: true, productName: true, unit: true } } } },
        receipts: { select: { id: true, grnNumber: true, status: true, receivedAt: true } },
      },
    });
    if (!po) throw new NotFoundException(`PurchaseOrder #${id} not found`);
    return po;
  }

  async createPO(dto: CreatePurchaseOrderDto, userId: number) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id: dto.supplierId }, select: { id: true, deletedAt: true } });
    if (!supplier || supplier.deletedAt) throw new NotFoundException(`Supplier #${dto.supplierId} not found`);

    const totalAmount = dto.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
    const poNumber = await this.generatePONumber();

    return this.prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.create({
        data: {
          poNumber,
          supplierId: dto.supplierId,
          status: 'DRAFT',
          totalAmount,
          notes: dto.notes,
          expectedAt: dto.expectedAt ? new Date(dto.expectedAt) : undefined,
          createdBy: userId,
        },
      });
      for (const item of dto.items) {
        await tx.purchaseOrderItem.create({
          data: {
            purchaseOrderId: po.id,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalAmount: item.quantity * item.unitPrice,
          },
        });
      }
      return tx.purchaseOrder.findUniqueOrThrow({
        where: { id: po.id },
        include: {
          supplier: { select: { id: true, companyName: true, supplierCode: true } },
          items: { include: { product: { select: { id: true, sku: true, productName: true, unit: true } } } },
        },
      });
    });
  }

  async sendPO(id: number) {
    const po = await this.getPO(id);
    if (po.status !== 'DRAFT') throw new BadRequestException('Only DRAFT POs can be sent');
    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'SENT', sentAt: new Date() },
      select: { id: true, poNumber: true, status: true, sentAt: true },
    });
  }

  async cancelPO(id: number, dto: CancelPODto) {
    const po = await this.getPO(id);
    if (!['DRAFT', 'SENT'].includes(po.status ?? '')) throw new BadRequestException('Only DRAFT or SENT POs can be cancelled');
    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'CANCELLED', cancelReason: dto.reason },
      select: { id: true, poNumber: true, status: true, cancelReason: true },
    });
  }

  // ─── Goods Receipts ──────────────────────────────────────────────────────

  async listGRNs(query: GRNQueryDto) {
    const { page = 1, limit = 20, purchaseOrderId, status } = query;
    const where: any = {};
    if (purchaseOrderId) where.purchaseOrderId = purchaseOrderId;
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      this.prisma.goodsReceipt.findMany({
        where, skip: (page - 1) * limit, take: limit,
        include: {
          purchaseOrder: { select: { id: true, poNumber: true, supplier: { select: { id: true, companyName: true } } } },
          warehouse: { select: { id: true, code: true, warehouseName: true } },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.goodsReceipt.count({ where }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getGRN(id: number) {
    const grn = await this.prisma.goodsReceipt.findUnique({
      where: { id },
      include: {
        purchaseOrder: { select: { id: true, poNumber: true } },
        warehouse: { select: { id: true, code: true, warehouseName: true } },
        items: { include: { product: { select: { id: true, sku: true, productName: true, unit: true } } } },
      },
    });
    if (!grn) throw new NotFoundException(`GoodsReceipt #${id} not found`);
    return grn;
  }

  async createGRN(dto: CreateGoodsReceiptDto, userId: number) {
    const po = await this.getPO(dto.purchaseOrderId);
    if (!['SENT', 'PARTIAL'].includes(po.status ?? '')) {
      throw new BadRequestException('GRN can only be created for SENT or PARTIAL POs');
    }

    const grnNumber = await this.generateGRNNumber();
    return this.prisma.$transaction(async (tx) => {
      const grn = await tx.goodsReceipt.create({
        data: {
          grnNumber,
          purchaseOrderId: dto.purchaseOrderId,
          warehouseId: dto.warehouseId,
          status: 'DRAFT',
        },
      });
      for (const item of dto.items) {
        await tx.goodsReceiptItem.create({
          data: { goodsReceiptId: grn.id, productId: item.productId, quantity: item.quantity },
        });
      }
      return tx.goodsReceipt.findUniqueOrThrow({
        where: { id: grn.id },
        include: {
          items: { include: { product: { select: { id: true, sku: true, productName: true, unit: true } } } },
          warehouse: { select: { id: true, code: true, warehouseName: true } },
        },
      });
    });
  }

  async confirmGRN(id: number) {
    const grn = await this.getGRN(id);
    if (grn.status !== 'DRAFT') throw new BadRequestException('Only DRAFT GRNs can be confirmed');
    if (!grn.warehouseId) throw new BadRequestException('GRN has no warehouse assigned');

    return this.prisma.$transaction(async (tx) => {
      await tx.goodsReceipt.update({
        where: { id },
        data: { status: 'CONFIRMED', receivedAt: new Date() },
      });

      const po = await tx.purchaseOrder.findUnique({
        where: { id: grn.purchaseOrderId! },
        include: { items: true },
      });

      if (po) {
        for (const grnItem of grn.items) {
          const poItem = po.items.find((i) => i.productId === grnItem.productId);
          if (poItem) {
            await tx.purchaseOrderItem.update({
              where: { id: poItem.id },
              data: { receivedQuantity: { increment: Number(grnItem.quantity) } },
            });
          }
        }

        // Determine if PO is fully received
        const updatedItems = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId: po.id } });
        const allReceived = updatedItems.every((i) => Number(i.receivedQuantity) >= Number(i.quantity));
        await tx.purchaseOrder.update({
          where: { id: po.id },
          data: { status: allReceived ? 'COMPLETED' : 'PARTIAL' },
        });
      }

      // Emit event for inventory
      if (grn.warehouseId) {
        this.eventEmitter.emit(
          'inventory.goods.received',
          new GoodsReceivedInventoryEvent(
            id,
            grn.warehouseId,
            grn.items.map((i) => ({ productId: i.productId!, quantity: Number(i.quantity) })),
          ),
        );
      }

      return { id, grnNumber: grn.grnNumber, status: 'CONFIRMED' };
    });
  }

  // ─── Purchase Invoices ───────────────────────────────────────────────────

  async listInvoices(query: PurchaseInvoiceQueryDto) {
    const { page = 1, limit = 20, status, supplierId } = query;
    const where: any = {};
    if (status) where.status = status;
    if (supplierId) where.supplierId = supplierId;

    const [items, total] = await Promise.all([
      this.prisma.purchaseInvoice.findMany({
        where, skip: (page - 1) * limit, take: limit,
        include: {
          supplier: { select: { id: true, companyName: true } },
          purchaseOrder: { select: { id: true, poNumber: true, totalAmount: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.purchaseInvoice.count({ where }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getInvoice(id: number) {
    const inv = await this.prisma.purchaseInvoice.findUnique({
      where: { id },
      include: {
        supplier: { select: { id: true, companyName: true } },
        purchaseOrder: {
          include: {
            items: { include: { product: { select: { id: true, sku: true, productName: true } } } },
            receipts: { include: { items: true } },
          },
        },
      },
    });
    if (!inv) throw new NotFoundException(`PurchaseInvoice #${id} not found`);
    return inv;
  }

  async createInvoice(dto: CreatePurchaseInvoiceDto, userId: number) {
    const po = await this.getPO(dto.purchaseOrderId);
    const supplierId = po.supplierId;

    // Auto-run 3-way matching
    const poTotal = Number(po.totalAmount ?? 0);
    const invoiceTotal = dto.totalAmount;
    const tolerance = 0.01;
    const matchingStatus = Math.abs(poTotal - invoiceTotal) / (poTotal || 1) <= tolerance ? 'MATCHED' : 'MISMATCH';

    return this.prisma.purchaseInvoice.create({
      data: {
        invoiceNumber: dto.invoiceNumber,
        purchaseOrderId: dto.purchaseOrderId,
        supplierId,
        totalAmount: dto.totalAmount,
        status: 'DRAFT',
        matchingStatus,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        notes: dto.notes,
        createdBy: userId,
      },
      include: {
        supplier: { select: { id: true, companyName: true } },
        purchaseOrder: { select: { id: true, poNumber: true, totalAmount: true } },
      },
    });
  }

  async getMatchingReport(id: number) {
    const inv = await this.getInvoice(id);
    const po = inv.purchaseOrder;
    if (!po) return { matchingStatus: 'NO_PO', details: [] };

    const poTotal = Number((po as any).totalAmount ?? 0);
    const invoiceTotal = Number(inv.totalAmount);
    const difference = invoiceTotal - poTotal;
    const tolerancePct = poTotal > 0 ? Math.abs(difference) / poTotal : 0;

    const receivedQty = (po as any).receipts?.reduce((sum: number, grn: any) => {
      return sum + grn.items.reduce((s: number, i: any) => s + Number(i.quantity), 0);
    }, 0) ?? 0;

    return {
      matchingStatus: inv.matchingStatus,
      poAmount: poTotal,
      invoiceAmount: invoiceTotal,
      difference,
      tolerancePct: (tolerancePct * 100).toFixed(2) + '%',
      totalReceivedQuantity: receivedQty,
      details: (po as any).items?.map((item: any) => ({
        productId: item.productId,
        productName: item.product?.productName,
        orderedQty: Number(item.quantity),
        receivedQty: Number(item.receivedQuantity),
        unitPrice: Number(item.unitPrice),
        totalAmount: Number(item.totalAmount),
      })),
    };
  }

  async submitInvoiceForPayment(id: number) {
    const inv = await this.getInvoice(id);
    if (inv.status !== 'DRAFT') throw new BadRequestException('Only DRAFT invoices can be submitted for payment');

    const updated = await this.prisma.purchaseInvoice.update({
      where: { id },
      data: { status: 'PENDING_PAYMENT' },
      select: { id: true, invoiceNumber: true, status: true, supplierId: true, totalAmount: true },
    });

    // Create AP ledger entry
    await this.prisma.accountsPayableLedger.create({
      data: {
        supplierId: updated.supplierId,
        transactionType: 'INVOICE',
        referenceType: 'PURCHASE_INVOICE',
        referenceId: id,
        debitAmount: Number(updated.totalAmount),
        creditAmount: 0,
        notes: `Invoice ${inv.invoiceNumber}`,
      },
    });

    return updated;
  }

  // ─── Purchase Reports ────────────────────────────────────────────────────

  async getInboundReport(dateFrom?: string, dateTo?: string) {
    const where: any = { status: 'CONFIRMED' };
    if (dateFrom || dateTo) {
      where.receivedAt = {};
      if (dateFrom) where.receivedAt.gte = new Date(dateFrom);
      if (dateTo) where.receivedAt.lte = new Date(dateTo);
    }

    const grns = await this.prisma.goodsReceipt.findMany({
      where,
      include: {
        purchaseOrder: { include: { supplier: { select: { id: true, companyName: true } } } },
        items: {
          include: { product: { select: { id: true, sku: true, productName: true } } },
        },
      },
    });

    const bySupplier = new Map<number, { supplierId: number; supplierName: string; totalValue: number; grnCount: number }>();
    for (const grn of grns) {
      const supplierId = grn.purchaseOrder?.supplierId;
      const supplierName = grn.purchaseOrder?.supplier?.companyName ?? 'Unknown';
      if (!supplierId) continue;

      const grnTotal = grn.items.reduce((sum, i) => {
        const poItem = (grn.purchaseOrder as any)?.items?.find((pi: any) => pi.productId === i.productId);
        return sum + Number(i.quantity) * Number(poItem?.unitPrice ?? 0);
      }, 0);

      const existing = bySupplier.get(supplierId);
      if (existing) {
        existing.totalValue += grnTotal;
        existing.grnCount += 1;
      } else {
        bySupplier.set(supplierId, { supplierId, supplierName, totalValue: grnTotal, grnCount: 1 });
      }
    }

    return { bySupplier: Array.from(bySupplier.values()), totalGRNs: grns.length };
  }

  async getSupplierDebtReport() {
    const suppliers = await this.prisma.supplier.findMany({
      where: { deletedAt: null },
      select: { id: true, supplierCode: true, companyName: true },
    });

    const result = await Promise.all(
      suppliers.map(async (sup) => {
        const agg = await this.prisma.accountsPayableLedger.aggregate({
          where: { supplierId: sup.id },
          _sum: { debitAmount: true, creditAmount: true },
        });
        const totalDebt = Math.max(0, Number(agg._sum.debitAmount ?? 0) - Number(agg._sum.creditAmount ?? 0));
        return { ...sup, totalDebt };
      }),
    );

    return result.filter((s) => s.totalDebt > 0);
  }

  async getSupplierPerformance(supplierId: number) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id: supplierId, deletedAt: null }, select: { id: true, companyName: true, rating: true } });
    if (!supplier) throw new NotFoundException(`Supplier #${supplierId} not found`);

    const pos = await this.prisma.purchaseOrder.findMany({
      where: { supplierId },
      include: { _count: { select: { receipts: true } } },
    });

    const totalOrders = pos.length;
    const totalValue = pos.reduce((sum, po) => sum + Number(po.totalAmount ?? 0), 0);
    const onTimeDeliveries = pos.filter((po) => {
      if (!po.expectedAt || !po.sentAt) return false;
      return new Date(po.sentAt) <= new Date(po.expectedAt);
    }).length;

    return {
      supplierId,
      supplierName: supplier.companyName,
      totalOrders,
      totalValue,
      onTimeRate: totalOrders > 0 ? ((onTimeDeliveries / totalOrders) * 100).toFixed(1) + '%' : '0%',
      rating: supplier.rating,
    };
  }

  // ─── Supplier Payments ───────────────────────────────────────────────────

  async listSupplierPayments(query: SupplierPaymentQueryDto) {
    const { page = 1, limit = 20, supplierId, status } = query;
    const where: any = {};
    if (supplierId) where.supplierId = supplierId;
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      this.prisma.supplierPayment.findMany({
        where, skip: (page - 1) * limit, take: limit,
        orderBy: { createdAt: 'desc' },
        include: { supplier: { select: { id: true, companyName: true, supplierCode: true } } },
      }),
      this.prisma.supplierPayment.count({ where }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getSupplierPayment(id: number) {
    const p = await this.prisma.supplierPayment.findUnique({
      where: { id },
      include: { supplier: { select: { id: true, companyName: true, supplierCode: true } } },
    });
    if (!p) throw new NotFoundException(`SupplierPayment #${id} not found`);
    return p;
  }

  async createSupplierPayment(dto: CreateSupplierPaymentDto) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id: dto.supplierId, deletedAt: null }, select: { id: true } });
    if (!supplier) throw new NotFoundException(`Supplier #${dto.supplierId} not found`);

    const paymentNumber = await this.generateSupplierPaymentNumber();

    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.supplierPayment.create({
        data: {
          paymentNumber,
          supplierId: dto.supplierId,
          totalAmount: dto.totalAmount,
          paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : new Date(),
          referenceNumber: dto.referenceNumber,
          notes: dto.notes,
          status: 'COMPLETED',
        },
      });

      await tx.accountsPayableLedger.create({
        data: {
          supplierId: dto.supplierId,
          transactionType: 'PAYMENT',
          referenceType: 'SupplierPayment',
          referenceId: payment.id,
          debitAmount: 0,
          creditAmount: dto.totalAmount,
          notes: `Payment ${paymentNumber}`,
        },
      });

      return tx.supplierPayment.findUniqueOrThrow({
        where: { id: payment.id },
        include: { supplier: { select: { id: true, companyName: true, supplierCode: true } } },
      });
    });
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private async generatePRNumber() {
    const last = await this.prisma.purchaseRequest.findFirst({ orderBy: { id: 'desc' }, select: { prNumber: true } });
    if (!last?.prNumber) return 'PR-00001';
    const match = last.prNumber.match(/\d+$/);
    return `PR-${String(match ? parseInt(match[0], 10) + 1 : 1).padStart(5, '0')}`;
  }

  private async generateRFQNumber() {
    const last = await this.prisma.rFQ.findFirst({ orderBy: { id: 'desc' }, select: { rfqNumber: true } });
    if (!last?.rfqNumber) return 'RFQ-00001';
    const match = last.rfqNumber.match(/\d+$/);
    return `RFQ-${String(match ? parseInt(match[0], 10) + 1 : 1).padStart(5, '0')}`;
  }

  private async generatePONumber() {
    const year = new Date().getFullYear();
    const prefix = `PO-${year}`;
    const last = await this.prisma.purchaseOrder.findFirst({
      where: { poNumber: { startsWith: prefix } },
      orderBy: { id: 'desc' },
      select: { poNumber: true },
    });
    const seq = last ? parseInt(last.poNumber.split('-').pop() ?? '0', 10) + 1 : 1;
    return `${prefix}-${String(seq).padStart(5, '0')}`;
  }

  private async generateGRNNumber() {
    const year = new Date().getFullYear();
    const prefix = `GRN-${year}`;
    const last = await this.prisma.goodsReceipt.findFirst({
      where: { grnNumber: { startsWith: prefix } },
      orderBy: { id: 'desc' },
      select: { grnNumber: true },
    });
    const seq = last ? parseInt(last.grnNumber.split('-').pop() ?? '0', 10) + 1 : 1;
    return `${prefix}-${String(seq).padStart(5, '0')}`;
  }

  private async generateSupplierPaymentNumber() {
    const year = new Date().getFullYear();
    const prefix = `SPAY-${year}`;
    const last = await this.prisma.supplierPayment.findFirst({
      where: { paymentNumber: { startsWith: prefix } },
      orderBy: { id: 'desc' },
      select: { paymentNumber: true },
    });
    const seq = last ? parseInt(last.paymentNumber.split('-').pop() ?? '0', 10) + 1 : 1;
    return `${prefix}-${String(seq).padStart(5, '0')}`;
  }
}
