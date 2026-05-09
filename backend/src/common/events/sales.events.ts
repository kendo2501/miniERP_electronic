export const SALES_EVENTS = {
  ORDER_CREATED: 'sales.order.created',
  ORDER_CONFIRMED: 'sales.order.confirmed',
  ORDER_DELIVERED: 'sales.order.delivered',
  ORDER_CANCELLED: 'sales.order.cancelled',
  QUOTATION_APPROVED: 'sales.quotation.approved',
  PAYMENT_RECEIVED: 'sales.payment.received',
} as const;

export class OrderCreatedEvent {
  constructor(
    public readonly orderId: string,
    public readonly customerId: string,
    public readonly totalAmount: number,
    public readonly items: Array<{ productId: string; qty: number; unitPrice: number }>,
  ) {}
}

export class OrderConfirmedEvent {
  constructor(
    public readonly orderId: string,
    public readonly customerId: string,
  ) {}
}

export class OrderDeliveredEvent {
  constructor(
    public readonly orderId: string,
    public readonly customerId: string,
    public readonly totalAmount: number,
  ) {}
}

export class PaymentReceivedEvent {
  constructor(
    public readonly orderId: string,
    public readonly customerId: string,
    public readonly amount: number,
    public readonly reference: string,
  ) {}
}
