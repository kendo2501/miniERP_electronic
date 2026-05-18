import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { DeliveryConfirmedEvent } from '../common/events/sales.events';
import { GoodsReceivedInventoryEvent } from '../common/events/inventory.events';

@Injectable()
export class InventoryEventsListener {
  private readonly logger = new Logger(InventoryEventsListener.name);

  constructor(private prisma: PrismaService) {}

  @OnEvent('sales.order.delivered')
  async handleDeliveryConfirmed(event: DeliveryConfirmedEvent) {
    try {
      // Find existing SALE_OUT transactions for this order to record DELIVERY_CONFIRMED audit entries
      const saleOutTxs = await this.prisma.inventoryTransaction.findMany({
        where: { referenceType: 'SALES_ORDER', referenceId: event.orderId, transactionType: 'SALE_OUT' },
        select: { warehouseId: true, productId: true, quantity: true, balanceAfter: true },
      });

      if (saleOutTxs.length === 0) {
        this.logger.warn(`No SALE_OUT transactions found for order #${event.orderId} — skipping DELIVERY_CONFIRMED records`);
        return;
      }

      await this.prisma.inventoryTransaction.createMany({
        data: saleOutTxs.map((tx) => ({
          warehouseId: tx.warehouseId,
          productId: tx.productId,
          transactionType: 'DELIVERY_CONFIRMED',
          referenceType: 'SALES_ORDER',
          referenceId: event.orderId,
          quantity: tx.quantity,
          balanceAfter: tx.balanceAfter,
          notes: `Delivery confirmed: ${event.orderNumber}`,
        })),
      });

      this.logger.log(`DELIVERY_CONFIRMED recorded for order #${event.orderId} (${saleOutTxs.length} items)`);
    } catch (err) {
      this.logger.error(`Failed to record DELIVERY_CONFIRMED for order #${event.orderId}`, err);
    }
  }

  @OnEvent('inventory.goods.received')
  async handleGoodsReceived(event: GoodsReceivedInventoryEvent) {
    try {
      await this.prisma.$transaction(async (tx) => {
        for (const item of event.items) {
          const stock = await tx.inventoryStock.findUnique({
            where: { warehouseId_productId: { warehouseId: event.warehouseId, productId: item.productId } },
          });
          const currentQty = stock ? Number(stock.availableQuantity) : 0;
          const newQty = currentQty + item.quantity;

          await tx.inventoryStock.upsert({
            where: { warehouseId_productId: { warehouseId: event.warehouseId, productId: item.productId } },
            create: { warehouseId: event.warehouseId, productId: item.productId, availableQuantity: newQty, reservedQuantity: 0, damagedQuantity: 0 },
            update: { availableQuantity: newQty },
          });

          await tx.inventoryTransaction.create({
            data: {
              warehouseId: event.warehouseId,
              productId: item.productId,
              transactionType: 'GOODS_IN',
              referenceType: 'GRN',
              referenceId: event.grnId,
              quantity: item.quantity,
              balanceAfter: newQty,
              notes: `Goods receipt #${event.grnId}`,
            },
          });
        }
      });

      this.logger.log(`GOODS_IN recorded for GRN #${event.grnId} (${event.items.length} items)`);
    } catch (err) {
      this.logger.error(`Failed to record GOODS_IN for GRN #${event.grnId}`, err);
    }
  }
}
