export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED';
export type PaymentStatus = 'COMPLETED' | 'CANCELLED';

export interface Invoice {
  id: number;
  invoiceNumber: string;
  status: InvoiceStatus;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  outstandingAmount: number;
  issueDate?: string;
  dueDate?: string;
  createdAt: string;
  customer: { id: number; companyName: string; customerCode: string };
  salesOrder?: { id: number; orderNumber: string };
  allocations?: PaymentAllocation[];
  _count?: { allocations: number };
}

export interface InvoiceListResponse {
  items: Invoice[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateInvoicePayload {
  customerId: number;
  salesOrderId?: number;
  issueDate?: string;
  dueDate?: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
}

export interface Payment {
  id: number;
  paymentNumber: string;
  status: PaymentStatus;
  totalAmount: number;
  paymentMethod?: string;
  paymentDate?: string;
  referenceNumber?: string;
  notes?: string;
  createdAt: string;
  customer: { id: number; companyName: string; customerCode: string };
  allocations?: PaymentAllocation[];
  _count?: { allocations: number };
}

export interface PaymentListResponse {
  items: Payment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreatePaymentPayload {
  customerId: number;
  totalAmount: number;
  paymentMethod?: string;
  paymentDate?: string;
  referenceNumber?: string;
  notes?: string;
}

export interface PaymentAllocation {
  id: number;
  allocatedAmount: number;
  createdAt: string;
  invoice?: { id: number; invoiceNumber: string };
  payment?: { id: number; paymentNumber: string; paymentDate?: string };
}

export interface AllocatePaymentPayload {
  allocations: { invoiceId: number; allocatedAmount: number }[];
}

export interface ArLedgerEntry {
  id: number;
  transactionType: string;
  referenceType?: string;
  referenceId?: number;
  debitAmount: number;
  creditAmount: number;
  balanceAfter?: number;
  notes?: string;
  createdAt: string;
  customer?: { id: number; companyName: string; customerCode: string };
}

export interface ArLedgerListResponse {
  items: ArLedgerEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AgingBucket {
  customer: { id: number; companyName: string; customerCode: string };
  current: number;
  days1_30: number;
  days31_60: number;
  days61_90: number;
  over90: number;
  total: number;
}

export interface CreditLimitItem {
  id: number;
  customerCode: string;
  companyName: string;
  status: string | null;
  creditLimit: number;
  currentDebt: number;
  availableCredit: number;
  usagePercent: number;
  isOverLimit: boolean;
}

export interface OrderSummaryItem {
  id: number;
  orderNumber: string;
  totalAmount: number;
  createdAt: string;
  paidAt?: string;
  paymentStatus: string;
  customer: { id: number; companyName: string; customerCode: string };
  paidByUser?: { id: number; fullName: string } | null;
}

export interface OrderSummary {
  totalOrderValue: number;
  totalDebt: number;
  totalCash: number;
  unpaidOrders: OrderSummaryItem[];
  paidOrders: OrderSummaryItem[];
}

export interface AgingReport {
  summary: {
    current: number;
    days1_30: number;
    days31_60: number;
    days61_90: number;
    over90: number;
    total: number;
  };
  byCustomer: AgingBucket[];
}
