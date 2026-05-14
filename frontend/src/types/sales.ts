export type CustomerType = 'RETAIL' | 'WHOLESALE';

export interface CustomerAddress {
  id: number;
  customerId: number;
  label?: string;
  address: string;
  isDefault: boolean;
}

export interface Customer {
  id: number;
  customerCode: string;
  companyName: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  taxCode?: string;
  creditLimit?: number;
  customerType?: CustomerType;
  status?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  linkedUser?: { id: number; fullName: string; email: string; status: string } | null;
  addresses?: CustomerAddress[];
}

export interface CustomerBalanceInvoice {
  id: number;
  invoiceNumber: string;
  status: string;
  totalAmount: number;
  outstandingAmount: number;
  issueDate: string;
  dueDate?: string;
  salesOrder?: { id: number; orderNumber: string };
}

export interface CustomerBalance {
  customer: Pick<Customer, 'id' | 'companyName' | 'customerCode' | 'creditLimit'>;
  invoices: CustomerBalanceInvoice[];
  totalDebt: number;
  overdueDebt: number;
}

export interface CustomerListResponse {
  items: Customer[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateCustomerPayload {
  customerCode?: string;
  companyName: string;
  email: string;
  password: string;
  contactName?: string;
  phone?: string;
  address?: string;
  taxCode?: string;
  creditLimit?: number;
  customerType?: CustomerType;
}

export interface UpdateCustomerPayload {
  companyName?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  taxCode?: string;
  creditLimit?: number;
  customerType?: CustomerType;
  status?: string;
}

// ─── Quotation ────────────────────────────────────────────────────────────────

export type QuotationStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REVISION_REQUESTED' | 'SENT' | 'CONFIRMED' | 'CANCELLED';
export type NegotiationStatus = 'NONE' | 'PROPOSED' | 'ACCEPTED' | 'REJECTED';

export interface QuotationItem {
  id: number;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  discountAmount: number;
  totalAmount: number;
  product: { id: number; sku: string; productName: string; unit: string };
}

export interface Quotation {
  id: number;
  quotationNumber: string;
  status: QuotationStatus;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  validUntil?: string;
  notes?: string;
  approvalNotes?: string;
  cancelReason?: string;
  negotiationStatus?: NegotiationStatus;
  counterOfferAmount?: number;
  counterOfferNote?: string;
  counterOfferAt?: string;
  createdAt: string;
  updatedAt: string;
  customer: { id: number; companyName: string; customerCode: string };
  items?: QuotationItem[];
  _count?: { items: number };
}

export interface QuotationListResponse {
  items: Quotation[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface QuotationItemPayload {
  productId: number;
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
}

export interface CreateQuotationPayload {
  customerId: number;
  salesUserId?: number;
  validUntil?: string;
  notes?: string;
  items: QuotationItemPayload[];
}

// ─── Sales Order ──────────────────────────────────────────────────────────────

export type SalesOrderStatus =
  | 'DRAFT'
  | 'CONFIRMED'
  | 'PARTIALLY_DELIVERED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'PRICE_ADJUSTMENT_REQUESTED'
  | 'PENDING_REAPPROVAL';

export interface SalesOrderItem {
  id: number;
  quantity: number;
  deliveredQuantity: number;
  unitPrice: number;
  discountPercent: number;
  discountAmount: number;
  totalAmount: number;
  product: { id: number; sku: string; productName: string; unit: string };
}

export type PaymentStatus = 'UNPAID' | 'PAID';
export type DeliveryStatus = 'PENDING' | 'IN_TRANSIT' | 'DELIVERED';

export interface SalesOrder {
  id: number;
  orderNumber: string;
  status: SalesOrderStatus;
  paymentStatus: PaymentStatus;
  deliveryStatus: DeliveryStatus;
  paidAt?: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  orderedAt: string;
  confirmedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  customer: { id: number; companyName: string; customerCode: string };
  quotation?: { id: number; quotationNumber: string };
  items?: SalesOrderItem[];
  _count?: { items: number };
}

export interface SalesOrderListResponse {
  items: SalesOrder[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SalesOrderItemPayload {
  productId: number;
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
}

export interface CreateSalesOrderPayload {
  customerId: number;
  quotationId?: number;
  salesUserId?: number;
  notes?: string;
  items: SalesOrderItemPayload[];
}

