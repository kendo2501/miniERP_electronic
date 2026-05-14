import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { InventoryService } from '../inventory/inventory.service';
import { AuthUser } from '../common/types/auth-user.type';
import {
  CreateQuotationDto, QuotationQueryDto,
  CreateSalesOrderDto, SalesOrderQueryDto,
  SubmitCounterOfferDto,
  CancelWithReasonDto, RequestRevisionDto, UpdateQuotationItemsDto,
  RequestPriceAdjustmentDto, AdjustOrderPricesDto,
} from './dto/sales.dto';

const QUOTATION_SELECT = {
  id: true, quotationNumber: true, status: true, subtotal: true,
  taxAmount: true, totalAmount: true, validUntil: true, notes: true,
  approvalNotes: true, cancelReason: true, salesUserId: true,
  negotiationStatus: true, counterOfferAmount: true, counterOfferNote: true, counterOfferAt: true,
  createdAt: true, updatedAt: true,
  customer: { select: { id: true, companyName: true, customerCode: true } },
  items: {
    select: {
      id: true, quantity: true, unitPrice: true, discountPercent: true, discountAmount: true, totalAmount: true,
      product: { select: { id: true, sku: true, productName: true, unit: true } },
    },
  },
};

const ORDER_SELECT = {
  id: true, orderNumber: true, status: true, paymentStatus: true, deliveryStatus: true, paidAt: true, subtotal: true,
  taxAmount: true, totalAmount: true, orderedAt: true, confirmedAt: true, notes: true,
  salesUserId: true,
  createdAt: true, updatedAt: true,
  customer: { select: { id: true, companyName: true, customerCode: true } },
  quotation: { select: { id: true, quotationNumber: true } },
  items: {
    select: {
      id: true, quantity: true, deliveredQuantity: true, unitPrice: true, discountPercent: true, discountAmount: true, totalAmount: true,
      product: { select: { id: true, sku: true, productName: true, unit: true } },
    },
  },
};

@Injectable()
export class SalesService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private inventory: InventoryService,
  ) {}

  // ─── Quotations ───────────────────────────────────────────────────────────

  async listQuotations(query: QuotationQueryDto, currentUser?: AuthUser) {
    const { page = 1, limit = 20, customerId, status, search } = query;
    const skip = (page - 1) * limit;
    const where: any = {};

    // Customer portal: linkedCustomerId presence is the authoritative check
    if (currentUser?.linkedCustomerId) {
      where.customerId = currentUser.linkedCustomerId;
    } else {
      if (customerId) where.customerId = customerId;
    }

    if (status) where.status = status;
    if (search) where.quotationNumber = { contains: search, mode: 'insensitive' };

    const [items, total] = await Promise.all([
      this.prisma.quotation.findMany({
        where, skip, take: limit, orderBy: { createdAt: 'desc' },
        select: {
          id: true, quotationNumber: true, status: true, totalAmount: true, validUntil: true, createdAt: true,
          approvalNotes: true, cancelReason: true,
          negotiationStatus: true, counterOfferAmount: true, counterOfferNote: true,
          customer: { select: { id: true, companyName: true, customerCode: true } },
          _count: { select: { items: true } },
        },
      }),
      this.prisma.quotation.count({ where }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getQuotation(id: number, currentUser?: AuthUser) {
    const q = await this.prisma.quotation.findUnique({ where: { id }, select: QUOTATION_SELECT });
    if (!q) throw new NotFoundException(`Quotation #${id} not found`);
    // Customer ownership check — 403-safe: return 404 to avoid leaking existence
    if (currentUser?.linkedCustomerId && (q as any).customer.id !== currentUser.linkedCustomerId)
      throw new NotFoundException(`Quotation #${id} not found`);
    return q;
  }

  async createQuotation(dto: CreateQuotationDto) {
    await this.ensureCustomerExists(dto.customerId);
    await this.ensureProductsExist(dto.items.map((i) => i.productId));
    const number = await this.generateQuotationNumber();
    const { items, ...data } = dto;
    const { subtotal, taxAmount, totalAmount } = this.calcTotals(items);

    const quotation = await this.prisma.quotation.create({
      data: {
        ...data,
        quotationNumber: number,
        status: 'PENDING_APPROVAL',
        subtotal, taxAmount, totalAmount,
        validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
        items: {
          create: items.map((i) => {
            const pct = i.discountPercent ?? 0;
            const disc = this.lineDiscount(i.quantity, i.unitPrice, pct);
            return {
              productId: i.productId,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              discountPercent: pct,
              discountAmount: disc,
              totalAmount: i.quantity * i.unitPrice - disc,
            };
          }),
        },
      },
      select: QUOTATION_SELECT,
    });

    this.notifyManagers(
      `Báo giá mới cần duyệt: ${number}`,
      `Báo giá ${number} đã được tạo và đang chờ phê duyệt.`,
    ).catch(() => {});

    return quotation;
  }

  async sendQuotation(id: number) {
    const q = await this.getQuotation(id);
    if (!['APPROVED'].includes(q.status ?? '')) throw new BadRequestException('Only APPROVED quotations can be sent to customer');
    return this.prisma.quotation.update({ where: { id }, data: { status: 'SENT' }, select: QUOTATION_SELECT });
  }

  async confirmQuotation(id: number) {
    const q = await this.getQuotation(id);

    // Idempotency: return existing order if quotation already has an order (CONFIRMED or APPROVED)
    if (['CONFIRMED', 'APPROVED'].includes(q.status ?? '')) {
      const existing = await this.prisma.salesOrder.findFirst({ where: { quotationId: id }, select: ORDER_SELECT });
      if (existing) return existing;
    }

    if (!['SENT', 'APPROVED'].includes(q.status ?? '')) throw new BadRequestException('Quotation cannot be confirmed');

    const orderNumber = await this.generateOrderNumber();
    const { subtotal, taxAmount, totalAmount } = this.calcTotals(q.items.map((i) => ({
      quantity: Number(i.quantity), unitPrice: Number(i.unitPrice), discountPercent: Number((i as any).discountPercent ?? 0),
    })));

    return this.prisma.$transaction(async (tx) => {
      await tx.quotation.update({ where: { id }, data: { status: 'CONFIRMED' } });
      return tx.salesOrder.create({
        data: {
          orderNumber,
          customerId: (q as any).customer.id,
          quotationId: id,
          status: 'CONFIRMED',
          subtotal, taxAmount, totalAmount,
          salesUserId: (q as any).salesUserId ?? undefined,
          orderedAt: new Date(),
          confirmedAt: new Date(),
          items: {
            create: q.items.map((i) => ({
              productId: i.product.id,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              discountPercent: (i as any).discountPercent ?? 0,
              discountAmount: i.discountAmount,
              totalAmount: i.totalAmount,
              deliveredQuantity: 0,
            })),
          },
        },
        select: ORDER_SELECT,
      });
    });
  }

  async cancelQuotation(id: number) {
    const q = await this.getQuotation(id);
    if (q.status === 'CANCELLED') throw new BadRequestException('Quotation already cancelled');
    return this.prisma.quotation.update({ where: { id }, data: { status: 'CANCELLED' }, select: QUOTATION_SELECT });
  }

  async approveQuotation(id: number, actorId?: number) {
    const q = await this.getQuotation(id);

    // Idempotency: nếu đã APPROVED và đơn hàng đã tồn tại, trả về đơn hàng đó
    if (q.status === 'APPROVED') {
      const existing = await this.prisma.salesOrder.findFirst({ where: { quotationId: id }, select: ORDER_SELECT });
      if (existing) return existing;
    }

    if (q.status !== 'PENDING_APPROVAL') throw new BadRequestException('Only PENDING_APPROVAL quotations can be approved');

    const orderNumber = await this.generateOrderNumber();
    const { subtotal, taxAmount, totalAmount } = this.calcTotals(q.items.map((i) => ({
      quantity: Number(i.quantity), unitPrice: Number(i.unitPrice), discountPercent: Number((i as any).discountPercent ?? 0),
    })));

    const order = await this.prisma.$transaction(async (tx) => {
      await tx.quotation.update({ where: { id }, data: { status: 'APPROVED', approvalNotes: null } });
      return tx.salesOrder.create({
        data: {
          orderNumber,
          customerId: (q as any).customer.id,
          quotationId: id,
          status: 'CONFIRMED',
          subtotal, taxAmount, totalAmount,
          salesUserId: (q as any).salesUserId ?? undefined,
          orderedAt: new Date(),
          confirmedAt: new Date(),
          items: {
            create: q.items.map((i) => ({
              productId: i.product.id,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              discountPercent: (i as any).discountPercent ?? 0,
              discountAmount: i.discountAmount,
              totalAmount: i.totalAmount,
              deliveredQuantity: 0,
            })),
          },
        },
        select: ORDER_SELECT,
      });
    });

    // Idempotent inventory deduction — fire-and-forget, backorders created automatically
    this.inventory.deductForOrder(order.id, actorId ?? 0).catch(() => {});

    if ((q as any).salesUserId) {
      this.notifyUser(
        (q as any).salesUserId,
        `Báo giá ${(q as any).quotationNumber} đã được duyệt`,
        `Báo giá ${(q as any).quotationNumber} đã được phê duyệt. Đơn hàng ${order.orderNumber} đã được tạo tự động.`,
      ).catch(() => {});
    }

    // Thông báo cho khách hàng portal
    const customerPortalUser = await this.prisma.user.findFirst({
      where: { linkedCustomerId: (q as any).customer.id, deletedAt: null },
      select: { id: true },
    });
    if (customerPortalUser) {
      this.notifyUser(
        customerPortalUser.id,
        `Đơn hàng của bạn đã được tạo`,
        `Báo giá ${(q as any).quotationNumber} đã được duyệt. Đơn hàng ${order.orderNumber} đã được tạo với giá đã xác nhận.`,
      ).catch(() => {});
    }

    return order;
  }

  async requestRevision(id: number, dto: RequestRevisionDto) {
    const q = await this.getQuotation(id);
    if (q.status !== 'PENDING_APPROVAL') throw new BadRequestException('Only PENDING_APPROVAL quotations can request revision');
    const result = await this.prisma.quotation.update({
      where: { id },
      data: { status: 'REVISION_REQUESTED', approvalNotes: dto.reason },
      select: QUOTATION_SELECT,
    });

    if ((q as any).salesUserId) {
      this.notifyUser(
        (q as any).salesUserId,
        `Báo giá ${(q as any).quotationNumber} yêu cầu chỉnh sửa`,
        `Lý do: ${dto.reason}`,
      ).catch(() => {});
    }

    return result;
  }

  async cancelWithReason(id: number, dto: CancelWithReasonDto) {
    const q = await this.getQuotation(id);
    if (q.status === 'CANCELLED') throw new BadRequestException('Quotation already cancelled');
    if (q.status === 'CONFIRMED') throw new BadRequestException('Confirmed quotations cannot be cancelled');
    const result = await this.prisma.quotation.update({
      where: { id },
      data: { status: 'CANCELLED', cancelReason: dto.reason },
      select: QUOTATION_SELECT,
    });

    if ((q as any).salesUserId) {
      this.notifyUser(
        (q as any).salesUserId,
        `Báo giá ${(q as any).quotationNumber} đã bị hủy`,
        `Lý do: ${dto.reason}`,
      ).catch(() => {});
    }

    return result;
  }

  async resubmitQuotation(id: number, dto: UpdateQuotationItemsDto) {
    const q = await this.getQuotation(id);
    if (q.status !== 'REVISION_REQUESTED') throw new BadRequestException('Only REVISION_REQUESTED quotations can be resubmitted');
    await this.ensureProductsExist(dto.items.map((i) => i.productId));
    const { subtotal, taxAmount, totalAmount } = this.calcTotals(dto.items);

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.quotationItem.deleteMany({ where: { quotationId: id } });
      return tx.quotation.update({
        where: { id },
        data: {
          status: 'PENDING_APPROVAL',
          approvalNotes: null,
          subtotal, taxAmount, totalAmount,
          items: {
            create: dto.items.map((i) => {
              const pct = i.discountPercent ?? 0;
              const disc = this.lineDiscount(i.quantity, i.unitPrice, pct);
              return {
                productId: i.productId,
                quantity: i.quantity,
                unitPrice: i.unitPrice,
                discountPercent: pct,
                discountAmount: disc,
                totalAmount: i.quantity * i.unitPrice - disc,
              };
            }),
          },
        },
        select: QUOTATION_SELECT,
      });
    });

    this.notifyManagers(
      `Báo giá ${(q as any).quotationNumber} đã được chỉnh sửa lại`,
      `Báo giá ${(q as any).quotationNumber} đã được điều chỉnh và đang chờ phê duyệt lại.`,
    ).catch(() => {});

    return result;
  }

  async requestPriceAdjustment(id: number, dto: RequestPriceAdjustmentDto, actorId?: number) {
    const o = await this.getOrder(id);
    if (!['DRAFT', 'CONFIRMED', 'PENDING_REAPPROVAL'].includes(o.status as string))
      throw new BadRequestException('Only DRAFT, CONFIRMED or PENDING_REAPPROVAL orders can request price adjustment');

    const result = await this.prisma.salesOrder.update({
      where: { id },
      data: { status: 'PRICE_ADJUSTMENT_REQUESTED' },
      select: ORDER_SELECT,
    });

    await this.prisma.auditLog.create({
      data: {
        eventType: 'ORDER_PRICE_ADJUSTMENT_REQUESTED',
        category: 'sales',
        actorId: actorId ?? null,
        entityType: 'SalesOrder',
        entityId: id,
        action: 'REQUEST_PRICE_ADJUSTMENT',
        status: 'SUCCESS',
        metadata: { orderNumber: (o as any).orderNumber, reason: dto.reason ?? null },
        beforeSnapshot: { status: o.status, totalAmount: (o as any).totalAmount },
      },
    }).catch(() => {});

    const salesUserId = (o as any).salesUserId;
    if (salesUserId) {
      this.notifyUser(
        salesUserId,
        `Đơn hàng ${(o as any).orderNumber} cần điều chỉnh giá`,
        `Admin yêu cầu điều chỉnh giá.${dto.reason ? ` Lý do: ${dto.reason}` : ''}`,
      ).catch(() => {});
    }

    const customerPortalUser = await this.prisma.user.findFirst({
      where: { linkedCustomerId: (o as any).customer.id, deletedAt: null },
      select: { id: true },
    });
    if (customerPortalUser) {
      this.notifyUser(
        customerPortalUser.id,
        `Đơn hàng ${(o as any).orderNumber} đang điều chỉnh giá`,
        `Đơn hàng của bạn đang trong quá trình điều chỉnh giá. Vui lòng chờ nhân viên kinh doanh cập nhật.`,
      ).catch(() => {});
    }

    return result;
  }

  async adjustOrderPrices(id: number, dto: AdjustOrderPricesDto, actorId?: number) {
    const o = await this.getOrder(id);
    if (o.status !== 'PRICE_ADJUSTMENT_REQUESTED')
      throw new BadRequestException('Only PRICE_ADJUSTMENT_REQUESTED orders can have prices adjusted');

    const { subtotal, taxAmount, totalAmount } = this.calcTotals(dto.items);

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.salesOrderItem.deleteMany({ where: { salesOrderId: id } });
      return tx.salesOrder.update({
        where: { id },
        data: {
          status: 'PENDING_REAPPROVAL',
          subtotal, taxAmount, totalAmount,
          items: {
            create: dto.items.map((i) => {
              const pct = i.discountPercent ?? 0;
              const disc = this.lineDiscount(i.quantity, i.unitPrice, pct);
              return {
                productId: i.productId,
                quantity: i.quantity,
                unitPrice: i.unitPrice,
                discountPercent: pct,
                discountAmount: disc,
                totalAmount: i.quantity * i.unitPrice - disc,
                deliveredQuantity: 0,
              };
            }),
          },
        },
        select: ORDER_SELECT,
      });
    });

    await this.prisma.auditLog.create({
      data: {
        eventType: 'ORDER_PRICES_ADJUSTED',
        category: 'sales',
        actorId: actorId ?? null,
        entityType: 'SalesOrder',
        entityId: id,
        action: 'ADJUST_PRICES',
        status: 'SUCCESS',
        metadata: { orderNumber: (o as any).orderNumber, newTotal: totalAmount, itemCount: dto.items.length },
        beforeSnapshot: { status: o.status, totalAmount: (o as any).totalAmount },
      },
    }).catch(() => {});

    this.notifyManagers(
      `Đơn hàng ${(o as any).orderNumber} đã điều chỉnh giá`,
      `Đơn hàng ${(o as any).orderNumber} đã được điều chỉnh giá và đang chờ xác nhận lại.`,
    ).catch(() => {});

    return result;
  }

  async confirmReapproval(id: number, actorId?: number) {
    const o = await this.getOrder(id);
    if (o.status !== 'PENDING_REAPPROVAL')
      throw new BadRequestException('Only PENDING_REAPPROVAL orders can be re-approved');

    const result = await this.prisma.salesOrder.update({
      where: { id },
      data: { status: 'CONFIRMED' },
      select: ORDER_SELECT,
    });

    await this.prisma.auditLog.create({
      data: {
        eventType: 'ORDER_REAPPROVAL_CONFIRMED',
        category: 'sales',
        actorId: actorId ?? null,
        entityType: 'SalesOrder',
        entityId: id,
        action: 'CONFIRM_REAPPROVAL',
        status: 'SUCCESS',
        metadata: { orderNumber: (o as any).orderNumber, totalAmount: (o as any).totalAmount },
        beforeSnapshot: { status: o.status },
      },
    }).catch(() => {});

    const salesUserId = (o as any).salesUserId;
    if (salesUserId) {
      this.notifyUser(
        salesUserId,
        `Đơn hàng ${(o as any).orderNumber} đã được duyệt lại`,
        `Quản lý đã xác nhận giá mới. Đơn hàng tiếp tục xử lý.`,
      ).catch(() => {});
    }

    return result;
  }

  async confirmPayment(id: number, actorId?: number) {
    const o = await this.getOrder(id);
    if (o.status === 'CANCELLED') throw new BadRequestException('Cannot confirm payment for a cancelled order');
    if ((o as any).paymentStatus === 'PAID') throw new BadRequestException('Order already marked as paid');

    const result = await this.prisma.salesOrder.update({
      where: { id },
      data: { paymentStatus: 'PAID', paidAt: new Date(), paidByUserId: actorId ?? null },
      select: ORDER_SELECT,
    });

    await this.prisma.auditLog.create({
      data: {
        eventType: 'ORDER_PAYMENT_CONFIRMED',
        category: 'sales',
        actorId: actorId ?? null,
        entityType: 'SalesOrder',
        entityId: id,
        action: 'CONFIRM_PAYMENT',
        status: 'SUCCESS',
        metadata: { orderNumber: (o as any).orderNumber, totalAmount: (o as any).totalAmount },
      },
    }).catch(() => {});

    return result;
  }

  async submitCounterOffer(id: number, dto: SubmitCounterOfferDto, currentUser?: AuthUser) {
    // getQuotation already enforces customer ownership via linkedCustomerId
    const q = await this.getQuotation(id, currentUser);

    if (currentUser?.linkedCustomerId) {
      // Customer: can only counter-offer when SENT
      if (q.status !== 'SENT')
        throw new BadRequestException('Chỉ có thể đề xuất giá khi báo giá ở trạng thái "Đã gửi"');
    } else {
      if (!['DRAFT', 'SENT'].includes(q.status ?? ''))
        throw new BadRequestException('Counter offer only allowed on DRAFT or SENT quotations');
    }

    return this.prisma.quotation.update({
      where: { id },
      data: {
        negotiationStatus: 'PROPOSED',
        counterOfferAmount: dto.proposedAmount,
        counterOfferNote: dto.note ?? null,
        counterOfferAt: new Date(),
      },
      select: QUOTATION_SELECT,
    });
  }

  async acceptCounterOffer(id: number) {
    const q = await this.getQuotation(id);

    // Idempotency: return existing order if already accepted
    if ((q as any).negotiationStatus === 'ACCEPTED') {
      const existing = await this.prisma.salesOrder.findFirst({ where: { quotationId: id }, select: ORDER_SELECT });
      if (existing) return existing;
    }

    if ((q as any).negotiationStatus !== 'PROPOSED') throw new BadRequestException('No pending counter offer to accept');

    const orderNumber = await this.generateOrderNumber();
    const acceptedTotal = (q as any).counterOfferAmount;

    return this.prisma.$transaction(async (tx) => {
      await tx.quotation.update({
        where: { id },
        data: { status: 'CONFIRMED', negotiationStatus: 'ACCEPTED' },
      });
      return tx.salesOrder.create({
        data: {
          orderNumber,
          customerId: (q as any).customer.id,
          quotationId: id,
          status: 'CONFIRMED',
          subtotal: acceptedTotal,
          taxAmount: 0,
          totalAmount: acceptedTotal,
          orderedAt: new Date(),
          confirmedAt: new Date(),
          notes: `Giá được xác nhận theo đề xuất: ${acceptedTotal}`,
          items: {
            create: q.items.map((i) => ({
              productId: i.product.id,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              discountPercent: (i as any).discountPercent ?? 0,
              discountAmount: i.discountAmount,
              totalAmount: i.totalAmount,
              deliveredQuantity: 0,
            })),
          },
        },
        select: ORDER_SELECT,
      });
    });
  }

  async rejectCounterOffer(id: number) {
    const q = await this.getQuotation(id);
    if ((q as any).negotiationStatus !== 'PROPOSED') throw new BadRequestException('No pending counter offer to reject');
    return this.prisma.quotation.update({
      where: { id },
      data: { negotiationStatus: 'REJECTED' },
      select: QUOTATION_SELECT,
    });
  }

  // ─── Sales Orders ─────────────────────────────────────────────────────────

  async listOrders(query: SalesOrderQueryDto, currentUser?: AuthUser) {
    const { page = 1, limit = 20, customerId, status, search } = query;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;
    if (search) where.orderNumber = { contains: search, mode: 'insensitive' };

    const scope = this.resolveOrderScope(currentUser);
    if (scope === 'own') {
      // Customer portal: only their own orders
      const cid = currentUser?.linkedCustomerId;
      if (!cid) return { items: [], total: 0, page, limit, totalPages: 0 };
      where.customerId = cid;
    } else if (scope === 'assigned') {
      // Sales staff: orders they created OR orders for their assigned customers
      const assignedCustomerIds = await this.getAssignedCustomerIds(currentUser!.id);
      const conditions: any[] = [{ salesUserId: currentUser!.id }];
      if (assignedCustomerIds.length) conditions.push({ customerId: { in: assignedCustomerIds } });
      where.OR = conditions;
    } else {
      // Admin/Manager: all orders, optional customer filter
      if (customerId) where.customerId = customerId;
    }

    const [items, total] = await Promise.all([
      this.prisma.salesOrder.findMany({
        where, skip, take: limit, orderBy: { createdAt: 'desc' },
        select: {
          id: true, orderNumber: true, status: true, paymentStatus: true, deliveryStatus: true,
          totalAmount: true, subtotal: true, taxAmount: true, orderedAt: true, confirmedAt: true, createdAt: true,
          customer: { select: { id: true, companyName: true, customerCode: true } },
          quotation: { select: { id: true, quotationNumber: true } },
          _count: { select: { items: true } },
        },
      }),
      this.prisma.salesOrder.count({ where }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getOrder(id: number, currentUser?: AuthUser) {
    const o = await this.prisma.salesOrder.findUnique({ where: { id }, select: ORDER_SELECT });
    if (!o) throw new NotFoundException(`Sales Order #${id} not found`);

    // Customer: can only view their own orders
    if (currentUser?.linkedCustomerId) {
      if ((o as any).customer.id !== currentUser.linkedCustomerId)
        throw new NotFoundException(`Sales Order #${id} not found`);
      return o;
    }

    const scope = this.resolveOrderScope(currentUser);
    if (scope === 'assigned') {
      const ids = await this.getAssignedCustomerIds(currentUser!.id);
      const ownOrder = (o as any).salesUserId === currentUser!.id;
      if (!ownOrder && !ids.includes((o as any).customer.id))
        throw new NotFoundException(`Sales Order #${id} not found`);
    }

    return o;
  }

  async createOrder(dto: CreateSalesOrderDto) {
    await this.ensureCustomerExists(dto.customerId);
    const orderNumber = await this.generateOrderNumber();
    const { items, ...data } = dto;
    const { subtotal, taxAmount, totalAmount } = this.calcTotals(items);

    return this.prisma.salesOrder.create({
      data: {
        ...data,
        orderNumber,
        status: 'DRAFT',
        subtotal, taxAmount, totalAmount,
        orderedAt: new Date(),
        items: {
          create: items.map((i) => {
            const pct = i.discountPercent ?? 0;
            const disc = this.lineDiscount(i.quantity, i.unitPrice, pct);
            return {
              productId: i.productId,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              discountPercent: pct,
              discountAmount: disc,
              totalAmount: i.quantity * i.unitPrice - disc,
              deliveredQuantity: 0,
            };
          }),
        },
      },
      select: ORDER_SELECT,
    });
  }

  async confirmOrder(id: number) {
    const o = await this.getOrder(id);
    if (o.status !== 'DRAFT') throw new BadRequestException('Only DRAFT orders can be confirmed');
    return this.prisma.salesOrder.update({
      where: { id }, data: { status: 'CONFIRMED', confirmedAt: new Date() }, select: ORDER_SELECT,
    });
  }

  async cancelOrder(id: number) {
    const o = await this.getOrder(id);
    if (['CANCELLED', 'DELIVERED'].includes(o.status ?? '')) throw new BadRequestException('Order cannot be cancelled');
    return this.prisma.salesOrder.update({ where: { id }, data: { status: 'CANCELLED' }, select: ORDER_SELECT });
  }

  async startDelivery(id: number) {
    const o = await this.getOrder(id);
    if (o.status === 'CANCELLED') throw new BadRequestException('Không thể giao đơn hàng đã hủy');
    if ((o as any).deliveryStatus === 'IN_TRANSIT') throw new BadRequestException('Đơn hàng đang trong quá trình giao hàng');
    if ((o as any).deliveryStatus === 'DELIVERED') throw new BadRequestException('Đơn hàng đã được giao');
    return this.prisma.salesOrder.update({
      where: { id },
      data: { deliveryStatus: 'IN_TRANSIT' },
      select: ORDER_SELECT,
    });
  }

  async completeDelivery(id: number) {
    const o = await this.getOrder(id);
    if ((o as any).deliveryStatus !== 'IN_TRANSIT') throw new BadRequestException('Đơn hàng chưa ở trạng thái đang giao');
    return this.prisma.salesOrder.update({
      where: { id },
      data: { deliveryStatus: 'DELIVERED' },
      select: ORDER_SELECT,
    });
  }

  async getCustomerBalance(customerId: number) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true, companyName: true, customerCode: true, creditLimit: true },
    });
    if (!customer) throw new NotFoundException(`Customer #${customerId} not found`);

    const invoices = await this.prisma.invoice.findMany({
      where: { customerId },
      select: {
        id: true, invoiceNumber: true, status: true,
        totalAmount: true, outstandingAmount: true,
        issueDate: true, dueDate: true,
        salesOrder: { select: { id: true, orderNumber: true } },
      },
      orderBy: { issueDate: 'desc' },
    });

    const totalDebt = invoices.reduce((s, i) => s + Number(i.outstandingAmount ?? 0), 0);
    const overdueDebt = invoices
      .filter((i) => i.status !== 'PAID' && i.dueDate && new Date(i.dueDate) < new Date())
      .reduce((s, i) => s + Number(i.outstandingAmount ?? 0), 0);

    return { customer, invoices, totalDebt, overdueDebt };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private resolveOrderScope(user?: AuthUser): 'all' | 'assigned' | 'own' {
    if (!user) return 'all'; // internal service call
    if (user.linkedCustomerId) return 'own'; // customer portal always filters by own
    const perms = user.permissions;
    if (perms.includes('sales.order.view_all') || perms.includes('sales.order.view_team')) return 'all';
    if (perms.includes('sales.order.view_assigned') || perms.includes('sales.order.create')) return 'assigned';
    return 'own';
  }

  private async getAssignedCustomerIds(salesUserId: number): Promise<number[]> {
    const customers = await this.prisma.customer.findMany({
      where: { assignedSalesUserId: salesUserId },
      select: { id: true },
    });
    return customers.map((c) => c.id);
  }

  private async ensureCustomerExists(id: number) {
    const c = await this.prisma.customer.findUnique({ where: { id }, select: { id: true, deletedAt: true } });
    if (!c || c.deletedAt) throw new NotFoundException(`Customer #${id} not found`);
  }

  private async ensureProductsExist(productIds: number[]) {
    const unique = [...new Set(productIds)];
    const found = await this.prisma.product.findMany({
      where: { id: { in: unique }, deletedAt: null },
      select: { id: true },
    });
    if (found.length !== unique.length) {
      const missing = unique.filter((id) => !found.some((p) => p.id === id));
      throw new BadRequestException(`Sản phẩm không tồn tại hoặc đã bị xóa: ID [${missing.join(', ')}]. Vui lòng tải lại trang.`);
    }
  }

  private lineDiscount(qty: number, price: number, pct: number): number {
    return Math.round(qty * price * pct / 100);
  }

  private calcTotals(items: { quantity: number; unitPrice: number; discountPercent?: number }[]) {
    const subtotal = items.reduce((s, i) => {
      const disc = this.lineDiscount(i.quantity, i.unitPrice, i.discountPercent ?? 0);
      return s + i.quantity * i.unitPrice - disc;
    }, 0);
    const taxAmount = Math.round(subtotal * 0.1 * 100) / 100;
    const totalAmount = Math.round((subtotal + taxAmount) * 100) / 100;
    return { subtotal, taxAmount, totalAmount };
  }

  private async generateQuotationNumber(): Promise<string> {
    const count = await this.prisma.quotation.count();
    const year = new Date().getFullYear();
    return `QUO-${year}-${String(count + 1).padStart(5, '0')}`;
  }

  private async generateOrderNumber(): Promise<string> {
    const count = await this.prisma.salesOrder.count();
    const year = new Date().getFullYear();
    return `SO-${year}-${String(count + 1).padStart(5, '0')}`;
  }

  private async notifyManagers(subject: string, content: string): Promise<void> {
    const managers = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        userRoles: {
          some: {
            role: {
              rolePermissions: {
                some: { permission: { code: 'sales.quotation.approve' } },
              },
            },
          },
        },
      },
      select: { id: true },
    });
    await Promise.all(
      managers.map((u) =>
        this.notifications.create({
          recipientId: u.id,
          channel: 'IN_APP',
          notificationType: 'QUOTATION_EVENT',
          subject,
          content,
          priority: 'NORMAL',
        }),
      ),
    );
  }

  private async notifyUser(userId: number, subject: string, content: string): Promise<void> {
    await this.notifications.create({
      recipientId: userId,
      channel: 'IN_APP',
      notificationType: 'QUOTATION_EVENT',
      subject,
      content,
      priority: 'NORMAL',
    });
  }
}
