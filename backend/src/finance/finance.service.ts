import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/types/auth-user.type';
import {
  CreateInvoiceDto, InvoiceQueryDto,
  CreatePaymentDto, PaymentQueryDto,
  AllocatePaymentDto, ArLedgerQueryDto, OutstandingQueryDto,
} from './dto/finance.dto';

const INVOICE_SELECT = {
  id: true, invoiceNumber: true, status: true,
  subtotal: true, taxAmount: true, totalAmount: true, outstandingAmount: true,
  issueDate: true, dueDate: true, createdAt: true,
  customer: { select: { id: true, companyName: true, customerCode: true } },
  salesOrder: { select: { id: true, orderNumber: true } },
  allocations: {
    select: {
      id: true, allocatedAmount: true, createdAt: true,
      payment: { select: { id: true, paymentNumber: true, paymentDate: true } },
    },
  },
};

const PAYMENT_SELECT = {
  id: true, paymentNumber: true, status: true,
  totalAmount: true, paymentMethod: true, paymentDate: true,
  referenceNumber: true, notes: true, createdAt: true,
  customer: { select: { id: true, companyName: true, customerCode: true } },
  allocations: {
    select: {
      id: true, allocatedAmount: true,
      invoice: { select: { id: true, invoiceNumber: true } },
    },
  },
};

@Injectable()
export class FinanceService {
  constructor(private prisma: PrismaService) {}

  // ─── Invoices ─────────────────────────────────────────────────────────────

  async listInvoices(query: InvoiceQueryDto, currentUser?: AuthUser) {
    const { page = 1, limit = 20, customerId, status, search } = query;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;
    if (search) where.invoiceNumber = { contains: search, mode: 'insensitive' };

    if (currentUser) {
      const perms = currentUser.permissions;
      const scope = perms.includes('finance.invoice.view') ? 'all'
        : perms.includes('finance.invoice.view_assigned') ? 'assigned'
        : 'own';

      if (scope === 'own') return { items: [], total: 0, page, limit, totalPages: 0 };
      if (scope === 'assigned') {
        const ids = await this.getAssignedCustomerIds(currentUser.id);
        where.customerId = ids.length ? { in: ids } : { in: [] };
      } else if (customerId) {
        where.customerId = customerId;
      }
    } else if (customerId) {
      where.customerId = customerId;
    }

    const [items, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where, skip, take: limit, orderBy: { createdAt: 'desc' },
        select: {
          id: true, invoiceNumber: true, status: true,
          totalAmount: true, outstandingAmount: true, issueDate: true, dueDate: true, createdAt: true,
          customer: { select: { id: true, companyName: true, customerCode: true } },
          salesOrder: { select: { id: true, orderNumber: true } },
          _count: { select: { allocations: true } },
        },
      }),
      this.prisma.invoice.count({ where }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getInvoice(id: number, currentUser?: AuthUser) {
    const inv = await this.prisma.invoice.findUnique({ where: { id }, select: INVOICE_SELECT });
    if (!inv) throw new NotFoundException(`Invoice #${id} not found`);

    if (currentUser) {
      const perms = currentUser.permissions;
      const scope = perms.includes('finance.invoice.view') ? 'all'
        : perms.includes('finance.invoice.view_assigned') ? 'assigned'
        : 'own';

      if (scope === 'own') throw new NotFoundException(`Invoice #${id} not found`);
      if (scope === 'assigned') {
        const ids = await this.getAssignedCustomerIds(currentUser.id);
        if (!ids.includes((inv as any).customer.id)) throw new NotFoundException(`Invoice #${id} not found`);
      }
    }

    return inv;
  }

  async createInvoice(dto: CreateInvoiceDto) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: dto.customerId }, select: { id: true, deletedAt: true },
    });
    if (!customer || customer.deletedAt) throw new NotFoundException(`Customer #${dto.customerId} not found`);

    const number = await this.generateInvoiceNumber();

    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber: number,
          customerId: dto.customerId,
          salesOrderId: dto.salesOrderId,
          subtotal: dto.subtotal,
          taxAmount: dto.taxAmount,
          totalAmount: dto.totalAmount,
          outstandingAmount: dto.totalAmount,
          issueDate: dto.issueDate ? new Date(dto.issueDate) : new Date(),
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
          status: 'DRAFT',
        },
        select: INVOICE_SELECT,
      });

      await tx.accountsReceivableLedger.create({
        data: {
          customerId: dto.customerId,
          transactionType: 'INVOICE_CREATED',
          referenceType: 'Invoice',
          referenceId: invoice.id,
          debitAmount: dto.totalAmount,
          creditAmount: 0,
          notes: `Invoice ${number} created`,
        },
      });

      return invoice;
    });
  }

  async sendInvoice(id: number) {
    const inv = await this.getInvoice(id);
    if (inv.status !== 'DRAFT') throw new BadRequestException('Only DRAFT invoices can be sent');
    return this.prisma.invoice.update({ where: { id }, data: { status: 'SENT' }, select: INVOICE_SELECT });
  }

  async cancelInvoice(id: number) {
    const inv = await this.getInvoice(id);
    if (['PAID', 'CANCELLED'].includes(inv.status ?? ''))
      throw new BadRequestException('Invoice cannot be cancelled');
    if (inv.allocations.length > 0)
      throw new BadRequestException('Cannot cancel invoice with existing payment allocations');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.invoice.update({
        where: { id }, data: { status: 'CANCELLED', outstandingAmount: 0 }, select: INVOICE_SELECT,
      });
      await tx.accountsReceivableLedger.create({
        data: {
          customerId: (inv as any).customer.id,
          transactionType: 'INVOICE_CANCELLED',
          referenceType: 'Invoice',
          referenceId: id,
          debitAmount: 0,
          creditAmount: Number(inv.totalAmount),
          notes: `Invoice ${inv.invoiceNumber} cancelled`,
        },
      });
      return updated;
    });
  }

  // ─── Payments ─────────────────────────────────────────────────────────────

  async listPayments(query: PaymentQueryDto) {
    const { page = 1, limit = 20, customerId, status } = query;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (customerId) where.customerId = customerId;
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      this.prisma.payment.findMany({
        where, skip, take: limit, orderBy: { createdAt: 'desc' },
        select: {
          id: true, paymentNumber: true, status: true,
          totalAmount: true, paymentMethod: true, paymentDate: true,
          referenceNumber: true, createdAt: true,
          customer: { select: { id: true, companyName: true, customerCode: true } },
          _count: { select: { allocations: true } },
        },
      }),
      this.prisma.payment.count({ where }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getPayment(id: number) {
    const p = await this.prisma.payment.findUnique({ where: { id }, select: PAYMENT_SELECT });
    if (!p) throw new NotFoundException(`Payment #${id} not found`);
    return p;
  }

  async createPayment(dto: CreatePaymentDto) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: dto.customerId }, select: { id: true, deletedAt: true },
    });
    if (!customer || customer.deletedAt) throw new NotFoundException(`Customer #${dto.customerId} not found`);

    const number = await this.generatePaymentNumber();

    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          paymentNumber: number,
          customerId: dto.customerId,
          totalAmount: dto.totalAmount,
          paymentMethod: dto.paymentMethod,
          paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : new Date(),
          referenceNumber: dto.referenceNumber,
          notes: dto.notes,
          status: 'COMPLETED',
        },
        select: PAYMENT_SELECT,
      });

      await tx.accountsReceivableLedger.create({
        data: {
          customerId: dto.customerId,
          transactionType: 'PAYMENT_RECEIVED',
          referenceType: 'Payment',
          referenceId: payment.id,
          debitAmount: 0,
          creditAmount: dto.totalAmount,
          notes: `Payment ${number} received — ${dto.paymentMethod ?? 'N/A'}`,
        },
      });

      return payment;
    });
  }

  async allocatePayment(paymentId: number, dto: AllocatePaymentDto) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { allocations: true },
    });
    if (!payment) throw new NotFoundException(`Payment #${paymentId} not found`);
    if (payment.status === 'CANCELLED') throw new BadRequestException('Cannot allocate a cancelled payment');

    const alreadyAllocated = payment.allocations.reduce(
      (s, a) => s + Number(a.allocatedAmount), 0,
    );
    const available = Number(payment.totalAmount) - alreadyAllocated;
    const requestedTotal = dto.allocations.reduce((s, a) => s + a.allocatedAmount, 0);

    if (requestedTotal > available + 0.001) {
      throw new BadRequestException(
        `Cannot allocate ${requestedTotal} — only ${available.toFixed(2)} available on this payment`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      for (const alloc of dto.allocations) {
        const invoice = await tx.invoice.findUnique({
          where: { id: alloc.invoiceId },
          select: { id: true, invoiceNumber: true, outstandingAmount: true, status: true, customerId: true },
        });
        if (!invoice) throw new NotFoundException(`Invoice #${alloc.invoiceId} not found`);
        if (invoice.status === 'CANCELLED') throw new BadRequestException(`Invoice #${alloc.invoiceId} is cancelled`);
        if (invoice.status === 'PAID') throw new BadRequestException(`Invoice #${alloc.invoiceId} is already paid`);

        const outstanding = Number(invoice.outstandingAmount);
        if (alloc.allocatedAmount > outstanding + 0.001) {
          throw new BadRequestException(
            `Cannot allocate ${alloc.allocatedAmount} to Invoice #${alloc.invoiceId} — outstanding is ${outstanding.toFixed(2)}`,
          );
        }

        await tx.paymentAllocation.create({
          data: { paymentId, invoiceId: alloc.invoiceId, allocatedAmount: alloc.allocatedAmount },
        });

        const newOutstanding = Math.max(0, outstanding - alloc.allocatedAmount);
        const newStatus = newOutstanding <= 0.001 ? 'PAID' : 'PARTIALLY_PAID';

        await tx.invoice.update({
          where: { id: alloc.invoiceId },
          data: { outstandingAmount: newOutstanding, status: newStatus },
        });

        await tx.accountsReceivableLedger.create({
          data: {
            customerId: invoice.customerId,
            transactionType: 'PAYMENT_ALLOCATED',
            referenceType: 'PaymentAllocation',
            referenceId: paymentId,
            debitAmount: 0,
            creditAmount: alloc.allocatedAmount,
            notes: `Payment ${payment.paymentNumber} allocated to Invoice ${invoice.invoiceNumber}`,
          },
        });
      }

      return this.getPayment(paymentId);
    });
  }

  // ─── AR Ledger ────────────────────────────────────────────────────────────

  async listArLedger(query: ArLedgerQueryDto) {
    const { page = 1, limit = 20, customerId, transactionType } = query;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (customerId) where.customerId = customerId;
    if (transactionType) where.transactionType = transactionType;

    const [items, total] = await Promise.all([
      this.prisma.accountsReceivableLedger.findMany({
        where, skip, take: limit, orderBy: { createdAt: 'desc' },
        include: { customer: { select: { id: true, companyName: true, customerCode: true } } },
      }),
      this.prisma.accountsReceivableLedger.count({ where }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ─── Outstanding Balances ─────────────────────────────────────────────────

  async getOutstandingBalances(query: OutstandingQueryDto) {
    const { page = 1, limit = 20, customerId } = query;
    const skip = (page - 1) * limit;
    const where: any = { status: { in: ['SENT', 'PARTIALLY_PAID'] } };
    if (customerId) where.customerId = customerId;

    const [items, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where, skip, take: limit, orderBy: { dueDate: 'asc' },
        select: {
          id: true, invoiceNumber: true, status: true,
          totalAmount: true, outstandingAmount: true, issueDate: true, dueDate: true,
          customer: { select: { id: true, companyName: true, customerCode: true } },
        },
      }),
      this.prisma.invoice.count({ where }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ─── Aging Report ─────────────────────────────────────────────────────────

  async getAgingReport() {
    const today = new Date();
    const unpaid = await this.prisma.invoice.findMany({
      where: { status: { in: ['SENT', 'PARTIALLY_PAID'] } },
      select: {
        id: true, invoiceNumber: true, outstandingAmount: true, dueDate: true,
        customer: { select: { id: true, companyName: true, customerCode: true } },
      },
    });

    const buckets = { current: 0, days1_30: 0, days31_60: 0, days61_90: 0, over90: 0 };
    const byCustomer: Record<number, any> = {};

    for (const inv of unpaid) {
      const due = inv.dueDate ? new Date(inv.dueDate) : today;
      const daysOverdue = Math.floor((today.getTime() - due.getTime()) / 86400000);
      const amount = Number(inv.outstandingAmount);

      let bucket: keyof typeof buckets;
      if (daysOverdue <= 0) bucket = 'current';
      else if (daysOverdue <= 30) bucket = 'days1_30';
      else if (daysOverdue <= 60) bucket = 'days31_60';
      else if (daysOverdue <= 90) bucket = 'days61_90';
      else bucket = 'over90';

      buckets[bucket] += amount;

      const cid = inv.customer?.id ?? 0;
      if (!byCustomer[cid]) {
        byCustomer[cid] = { customer: inv.customer, current: 0, days1_30: 0, days31_60: 0, days61_90: 0, over90: 0, total: 0 };
      }
      byCustomer[cid][bucket] += amount;
      byCustomer[cid].total += amount;
    }

    return {
      summary: {
        ...buckets,
        total: Object.values(buckets).reduce((s, v) => s + v, 0),
      },
      byCustomer: Object.values(byCustomer).sort((a, b) => b.total - a.total),
    };
  }

  // ─── Credit Limits & Debt Exposure ───────────────────────────────────────

  async getCreditLimits() {
    const customers = await this.prisma.customer.findMany({
      where: { deletedAt: null },
      orderBy: { companyName: 'asc' },
      select: {
        id: true, customerCode: true, companyName: true, creditLimit: true, status: true,
        salesOrders: {
          where: { paymentStatus: 'UNPAID', status: { notIn: ['DRAFT', 'CANCELLED'] } },
          select: { totalAmount: true },
        },
      },
    });

    return customers.map((c) => {
      const currentDebt = c.salesOrders.reduce((s, o) => s + Number(o.totalAmount ?? 0), 0);
      const limit = Number(c.creditLimit);
      const available = Math.max(0, limit - currentDebt);
      const usagePct = limit > 0 ? Math.min(100, (currentDebt / limit) * 100) : 0;
      const isOverLimit = currentDebt > limit && limit > 0;
      return {
        id: c.id,
        customerCode: c.customerCode,
        companyName: c.companyName,
        status: c.status,
        creditLimit: limit,
        currentDebt,
        availableCredit: available,
        usagePercent: Math.round(usagePct * 10) / 10,
        isOverLimit,
      };
    });
  }

  // ─── Order Summary (Finance Dashboard) ───────────────────────────────────

  async getOrderSummary() {
    const DEBT_STATUSES = ['CONFIRMED', 'PARTIALLY_DELIVERED', 'DELIVERED', 'PRICE_ADJUSTMENT_REQUESTED', 'PENDING_REAPPROVAL'];

    const [totalAgg, debtAgg, cashAgg, unpaidOrders, paidOrders] = await Promise.all([
      this.prisma.salesOrder.aggregate({
        _sum: { totalAmount: true },
        where: { status: { notIn: ['CANCELLED'] } },
      }),
      this.prisma.salesOrder.aggregate({
        _sum: { totalAmount: true },
        where: { paymentStatus: 'UNPAID', status: { in: DEBT_STATUSES } },
      }),
      this.prisma.salesOrder.aggregate({
        _sum: { totalAmount: true },
        where: { paymentStatus: 'PAID' },
      }),
      this.prisma.salesOrder.findMany({
        where: { paymentStatus: 'UNPAID', status: { in: DEBT_STATUSES } },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, orderNumber: true, totalAmount: true, createdAt: true, paymentStatus: true,
          customer: { select: { id: true, companyName: true, customerCode: true } },
        },
      }),
      this.prisma.salesOrder.findMany({
        where: { paymentStatus: 'PAID' },
        orderBy: { paidAt: 'desc' },
        select: {
          id: true, orderNumber: true, totalAmount: true, paidAt: true, paymentStatus: true,
          customer: { select: { id: true, companyName: true, customerCode: true } },
          paidByUser: { select: { id: true, fullName: true } },
        },
      }),
    ]);

    return {
      totalOrderValue: Number(totalAgg._sum.totalAmount ?? 0),
      totalDebt: Number(debtAgg._sum.totalAmount ?? 0),
      totalCash: Number(cashAgg._sum.totalAmount ?? 0),
      unpaidOrders,
      paidOrders,
    };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async getAssignedCustomerIds(salesUserId: number): Promise<number[]> {
    const customers = await this.prisma.customer.findMany({
      where: { assignedSalesUserId: salesUserId },
      select: { id: true },
    });
    return customers.map((c) => c.id);
  }

  private async generateInvoiceNumber(): Promise<string> {
    const count = await this.prisma.invoice.count();
    const year = new Date().getFullYear();
    return `INV-${year}-${String(count + 1).padStart(5, '0')}`;
  }

  private async generatePaymentNumber(): Promise<string> {
    const count = await this.prisma.payment.count();
    const year = new Date().getFullYear();
    return `PAY-${year}-${String(count + 1).padStart(5, '0')}`;
  }
}
