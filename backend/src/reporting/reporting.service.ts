import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportingService {
  constructor(private prisma: PrismaService) {}

  async getDashboardKpis() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const [
      totalCustomers,
      newCustomersThisMonth,
      activeProducts,
      totalOrders,
      ordersThisMonth,
      ordersLastMonth,
      revenueThisMonth,
      revenueLastMonth,
      outstandingInvoices,
      pendingDeliveries,
      lowStockCount,
    ] = await Promise.all([
      this.prisma.customer.count({ where: { deletedAt: null } }),
      this.prisma.customer.count({ where: { deletedAt: null, createdAt: { gte: startOfMonth } } }),
      this.prisma.product.count({ where: { isActive: true, deletedAt: null } }),
      this.prisma.salesOrder.count({ where: { status: { not: 'CANCELLED' } } }),
      this.prisma.salesOrder.count({
        where: { status: { not: 'CANCELLED' }, createdAt: { gte: startOfMonth } },
      }),
      this.prisma.salesOrder.count({
        where: { status: { not: 'CANCELLED' }, createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } },
      }),
      this.prisma.salesOrder.aggregate({
        where: { status: { not: 'CANCELLED' }, createdAt: { gte: startOfMonth } },
        _sum: { totalAmount: true },
      }),
      this.prisma.salesOrder.aggregate({
        where: { status: { not: 'CANCELLED' }, createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } },
        _sum: { totalAmount: true },
      }),
      this.prisma.invoice.aggregate({
        where: { status: { in: ['SENT', 'PARTIALLY_PAID'] } },
        _sum: { outstandingAmount: true },
        _count: { id: true },
      }),
      this.prisma.delivery.count({ where: { status: 'PENDING' } }),
      this.prisma.inventoryStock.count({ where: { availableQuantity: { lte: 10 } } }),
    ]);

    const rev = Number(revenueThisMonth._sum.totalAmount ?? 0);
    const revLast = Number(revenueLastMonth._sum.totalAmount ?? 0);
    const revGrowth = revLast > 0 ? ((rev - revLast) / revLast) * 100 : null;
    const orderGrowth = ordersLastMonth > 0 ? ((ordersThisMonth - ordersLastMonth) / ordersLastMonth) * 100 : null;

    return {
      customers: {
        total: totalCustomers,
        newThisMonth: newCustomersThisMonth,
      },
      products: {
        active: activeProducts,
        lowStock: lowStockCount,
      },
      orders: {
        total: totalOrders,
        thisMonth: ordersThisMonth,
        lastMonth: ordersLastMonth,
        growthPct: orderGrowth,
      },
      revenue: {
        thisMonth: rev,
        lastMonth: revLast,
        growthPct: revGrowth,
      },
      finance: {
        outstandingAmount: Number(outstandingInvoices._sum.outstandingAmount ?? 0),
        outstandingCount: outstandingInvoices._count.id,
      },
      operations: {
        pendingDeliveries,
      },
    };
  }

  async getSalesChart(days: number = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const orders = await this.prisma.salesOrder.findMany({
      where: { createdAt: { gte: since }, status: { not: 'CANCELLED' } },
      select: { createdAt: true, totalAmount: true },
      orderBy: { createdAt: 'asc' },
    });

    // Group by date
    const byDate = new Map<string, { orders: number; revenue: number }>();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      byDate.set(key, { orders: 0, revenue: 0 });
    }

    for (const o of orders) {
      const key = new Date(o.createdAt).toISOString().slice(0, 10);
      const entry = byDate.get(key);
      if (entry) {
        entry.orders += 1;
        entry.revenue += Number(o.totalAmount);
      }
    }

    return Array.from(byDate.entries()).map(([date, data]) => ({ date, ...data }));
  }

  async getManagerDashboard() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      ordersThisMonth,
      revenueThisMonth,
      outstandingInvoices,
      pendingDeliveries,
      pendingQuotations,
      recentOrders,
    ] = await Promise.all([
      this.prisma.salesOrder.count({ where: { status: { not: 'CANCELLED' }, createdAt: { gte: startOfMonth } } }),
      this.prisma.salesOrder.aggregate({
        where: { status: { not: 'CANCELLED' }, createdAt: { gte: startOfMonth } },
        _sum: { totalAmount: true },
      }),
      this.prisma.invoice.aggregate({
        where: { status: { in: ['SENT', 'PARTIALLY_PAID'] } },
        _sum: { outstandingAmount: true },
        _count: { id: true },
      }),
      this.prisma.delivery.count({ where: { status: 'PENDING' } }),
      this.prisma.quotation.count({ where: { status: 'SENT' } }),
      this.prisma.salesOrder.findMany({
        where: { status: { not: 'CANCELLED' } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true, orderNumber: true, status: true, totalAmount: true, createdAt: true,
          customer: { select: { companyName: true } },
        },
      }),
    ]);

    return {
      orders: { thisMonth: ordersThisMonth, revenueThisMonth: Number(revenueThisMonth._sum.totalAmount ?? 0) },
      finance: { outstandingAmount: Number(outstandingInvoices._sum.outstandingAmount ?? 0), outstandingCount: outstandingInvoices._count.id },
      operations: { pendingDeliveries, pendingQuotations },
      recentOrders: recentOrders.map((o) => ({
        ...o,
        totalAmount: Number(o.totalAmount),
      })),
    };
  }

  async getSalesDashboard(userId: number) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      myCustomers,
      myOrdersThisMonth,
      myRevenueThisMonth,
      myPendingQuotations,
      myRecentOrders,
    ] = await Promise.all([
      this.prisma.customer.count({ where: { assignedSalesUserId: userId, deletedAt: null } }),
      this.prisma.salesOrder.count({ where: { salesUserId: userId, status: { not: 'CANCELLED' }, createdAt: { gte: startOfMonth } } }),
      this.prisma.salesOrder.aggregate({
        where: { salesUserId: userId, status: { not: 'CANCELLED' }, createdAt: { gte: startOfMonth } },
        _sum: { totalAmount: true },
      }),
      this.prisma.quotation.count({ where: { salesUserId: userId, status: { in: ['DRAFT', 'SENT'] } } }),
      this.prisma.salesOrder.findMany({
        where: { salesUserId: userId, status: { not: 'CANCELLED' } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true, orderNumber: true, status: true, totalAmount: true, createdAt: true,
          customer: { select: { companyName: true } },
        },
      }),
    ]);

    return {
      myCustomers,
      orders: { thisMonth: myOrdersThisMonth, revenueThisMonth: Number(myRevenueThisMonth._sum.totalAmount ?? 0) },
      pendingQuotations: myPendingQuotations,
      recentOrders: myRecentOrders.map((o) => ({ ...o, totalAmount: Number(o.totalAmount) })),
    };
  }

  async getAccountantDashboard() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const today = now;

    const [
      invoicesThisMonth,
      revenueThisMonth,
      outstandingInvoices,
      paymentsThisMonth,
      overdueInvoices,
      recentInvoices,
    ] = await Promise.all([
      this.prisma.invoice.count({ where: { createdAt: { gte: startOfMonth } } }),
      this.prisma.invoice.aggregate({
        where: { status: { not: 'CANCELLED' }, createdAt: { gte: startOfMonth } },
        _sum: { totalAmount: true },
      }),
      this.prisma.invoice.aggregate({
        where: { status: { in: ['SENT', 'PARTIALLY_PAID'] } },
        _sum: { outstandingAmount: true },
        _count: { id: true },
      }),
      this.prisma.payment.aggregate({
        where: { status: 'COMPLETED', createdAt: { gte: startOfMonth } },
        _sum: { totalAmount: true },
        _count: { id: true },
      }),
      this.prisma.invoice.count({
        where: { status: { in: ['SENT', 'PARTIALLY_PAID'] }, dueDate: { lt: today } },
      }),
      this.prisma.invoice.findMany({
        where: { status: { not: 'CANCELLED' } },
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: {
          id: true, invoiceNumber: true, status: true,
          totalAmount: true, outstandingAmount: true, dueDate: true, createdAt: true,
          customer: { select: { companyName: true } },
        },
      }),
    ]);

    // Aging buckets
    const unpaidInvoices = await this.prisma.invoice.findMany({
      where: { status: { in: ['SENT', 'PARTIALLY_PAID'] } },
      select: { outstandingAmount: true, dueDate: true },
    });

    const aging = { current: 0, days1_30: 0, days31_60: 0, days61_90: 0, over90: 0 };
    for (const inv of unpaidInvoices) {
      const due = inv.dueDate ? new Date(inv.dueDate) : today;
      const daysOverdue = Math.floor((today.getTime() - due.getTime()) / 86400000);
      const amt = Number(inv.outstandingAmount);
      if (daysOverdue <= 0) aging.current += amt;
      else if (daysOverdue <= 30) aging.days1_30 += amt;
      else if (daysOverdue <= 60) aging.days31_60 += amt;
      else if (daysOverdue <= 90) aging.days61_90 += amt;
      else aging.over90 += amt;
    }

    return {
      invoices: {
        thisMonth: invoicesThisMonth,
        revenueThisMonth: Number(revenueThisMonth._sum.totalAmount ?? 0),
        outstandingAmount: Number(outstandingInvoices._sum.outstandingAmount ?? 0),
        outstandingCount: outstandingInvoices._count.id,
        overdueCount: overdueInvoices,
      },
      payments: {
        thisMonth: paymentsThisMonth._count.id,
        amountThisMonth: Number(paymentsThisMonth._sum.totalAmount ?? 0),
      },
      aging,
      recentInvoices: recentInvoices.map((i) => ({
        ...i,
        totalAmount: Number(i.totalAmount),
        outstandingAmount: Number(i.outstandingAmount),
      })),
    };
  }

  async getWarehouseDashboard() {
    const [
      totalProducts,
      lowStockItems,
      pendingDeliveries,
      deliveredToday,
      warehouses,
      recentTransactions,
    ] = await Promise.all([
      this.prisma.inventoryStock.count(),
      this.prisma.inventoryStock.count({ where: { availableQuantity: { lte: 10 } } }),
      this.prisma.delivery.count({ where: { status: 'PENDING' } }),
      this.prisma.delivery.count({
        where: {
          status: 'DELIVERED',
          deliveredAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      this.prisma.warehouse.findMany({
        select: {
          id: true, warehouseName: true, status: true,
          _count: { select: { inventoryStocks: true } },
        },
      }),
      this.prisma.inventoryTransaction.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: {
          id: true, transactionType: true, quantity: true, createdAt: true, notes: true,
          product: { select: { sku: true, productName: true } },
          warehouse: { select: { warehouseName: true } },
        },
      }),
    ]);

    const lowStockList = await this.prisma.inventoryStock.findMany({
      where: { availableQuantity: { lte: 10 } },
      orderBy: { availableQuantity: 'asc' },
      take: 8,
      select: {
        availableQuantity: true,
        product: { select: { sku: true, productName: true } },
        warehouse: { select: { warehouseName: true } },
      },
    });

    return {
      stock: {
        totalSkus: totalProducts,
        lowStockCount: lowStockItems,
      },
      deliveries: {
        pending: pendingDeliveries,
        deliveredToday,
      },
      warehouses: warehouses.map((w) => ({
        id: w.id,
        name: w.warehouseName,
        status: w.status,
        skuCount: w._count.inventoryStocks,
      })),
      lowStockAlerts: lowStockList.map((s) => ({
        sku: s.product?.sku,
        productName: s.product?.productName,
        warehouse: s.warehouse?.warehouseName,
        availableQuantity: Number(s.availableQuantity),
      })),
      recentTransactions: recentTransactions.map((t) => ({
        id: t.id,
        type: t.transactionType,
        quantity: Number(t.quantity),
        notes: t.notes,
        createdAt: t.createdAt,
        product: t.product?.productName,
        warehouse: t.warehouse?.warehouseName,
      })),
    };
  }

  async getTopCustomers(limit: number = 10) {
    const result = await this.prisma.salesOrder.groupBy({
      by: ['customerId'],
      where: { status: { not: 'CANCELLED' } },
      _sum: { totalAmount: true },
      _count: { id: true },
      orderBy: { _sum: { totalAmount: 'desc' } },
      take: limit,
    });

    const customerIds = result.map((r) => r.customerId).filter(Boolean) as number[];
    const customers = await this.prisma.customer.findMany({
      where: { id: { in: customerIds } },
      select: { id: true, companyName: true, customerCode: true },
    });
    const customerMap = new Map(customers.map((c) => [c.id, c]));

    return result.map((r) => ({
      customer: customerMap.get(r.customerId!) ?? null,
      totalRevenue: Number(r._sum.totalAmount ?? 0),
      orderCount: r._count.id,
    }));
  }
}
