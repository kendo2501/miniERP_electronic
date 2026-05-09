export const FINANCE_EVENTS = {
  AR_ENTRY_CREATED: 'finance.ar.created',
  AP_ENTRY_CREATED: 'finance.ap.created',
  PAYMENT_RECONCILED: 'finance.payment.reconciled',
} as const;

export class ArEntryCreatedEvent {
  constructor(
    public readonly ledgerId: string,
    public readonly orderId: string,
    public readonly customerId: string,
    public readonly amount: number,
    public readonly dueDate: Date,
  ) {}
}

export class ApEntryCreatedEvent {
  constructor(
    public readonly ledgerId: string,
    public readonly purchaseOrderId: string,
    public readonly supplierId: string,
    public readonly amount: number,
    public readonly dueDate: Date,
  ) {}
}
