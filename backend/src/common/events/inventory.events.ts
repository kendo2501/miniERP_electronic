export const INVENTORY_EVENTS = {
  STOCK_UPDATED: 'inventory.stock.updated',
  STOCK_LOW: 'inventory.stock.low',
  GOODS_RECEIVED: 'inventory.goods.received',
  STOCK_COUNT_COMPLETED: 'inventory.stock_count.completed',
} as const;

export class StockUpdatedEvent {
  constructor(
    public readonly productId: string,
    public readonly warehouseId: string,
    public readonly previousQty: number,
    public readonly newQty: number,
    public readonly reason: string,
  ) {}
}

export class StockLowEvent {
  constructor(
    public readonly productId: string,
    public readonly warehouseId: string,
    public readonly currentQty: number,
    public readonly minQty: number,
  ) {}
}

export class GoodsReceivedEvent {
  constructor(
    public readonly goodsReceiptId: string,
    public readonly purchaseOrderId: string,
    public readonly items: Array<{ productId: string; qty: number; unitCost: number }>,
  ) {}
}
