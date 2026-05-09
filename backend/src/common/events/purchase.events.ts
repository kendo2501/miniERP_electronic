export const PURCHASE_EVENTS = {
  ORDER_CREATED: 'purchase.order.created',
  ORDER_APPROVED: 'purchase.order.approved',
  ORDER_SENT: 'purchase.order.sent',
  GOODS_RECEIVED: 'purchase.goods.received',
  INVOICE_RECEIVED: 'purchase.invoice.received',
} as const;

export class PurchaseOrderCreatedEvent {
  constructor(
    public readonly purchaseOrderId: string,
    public readonly supplierId: string,
    public readonly totalAmount: number,
    public readonly items: Array<{ productId: string; qty: number; unitCost: number }>,
  ) {}
}

export class PurchaseOrderApprovedEvent {
  constructor(
    public readonly purchaseOrderId: string,
    public readonly approvedBy: string,
  ) {}
}

export class PurchaseGoodsReceivedEvent {
  constructor(
    public readonly goodsReceiptId: string,
    public readonly purchaseOrderId: string,
    public readonly supplierId: string,
    public readonly items: Array<{ productId: string; qty: number; unitCost: number }>,
  ) {}
}
