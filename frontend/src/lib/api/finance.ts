import { apiClient } from './client';
import type {
  Invoice, InvoiceListResponse, CreateInvoicePayload,
  Payment, PaymentListResponse, CreatePaymentPayload,
  AllocatePaymentPayload, ArLedgerListResponse, AgingReport, OrderSummary, CreditLimitItem,
} from '@/types/finance';

// ─── Invoices ─────────────────────────────────────────────────────────────────

export const listInvoices = (params?: Record<string, unknown>) =>
  apiClient.get<InvoiceListResponse>('/finance/invoices', { params });

export const getInvoice = (id: number) =>
  apiClient.get<Invoice>(`/finance/invoices/${id}`);

export const createInvoice = (data: CreateInvoicePayload) =>
  apiClient.post<Invoice>('/finance/invoices', data);

export const sendInvoice = (id: number) =>
  apiClient.post<Invoice>(`/finance/invoices/${id}/send`);

export const cancelInvoice = (id: number) =>
  apiClient.post<Invoice>(`/finance/invoices/${id}/cancel`);

// ─── Payments ─────────────────────────────────────────────────────────────────

export const listPayments = (params?: Record<string, unknown>) =>
  apiClient.get<PaymentListResponse>('/finance/payments', { params });

export const getPayment = (id: number) =>
  apiClient.get<Payment>(`/finance/payments/${id}`);

export const createPayment = (data: CreatePaymentPayload) =>
  apiClient.post<Payment>('/finance/payments', data);

export const allocatePayment = (id: number, data: AllocatePaymentPayload) =>
  apiClient.post<Payment>(`/finance/payments/${id}/allocate`, data);

// ─── AR Ledger ────────────────────────────────────────────────────────────────

export const listArLedger = (params?: Record<string, unknown>) =>
  apiClient.get<ArLedgerListResponse>('/finance/ar-ledger', { params });

// ─── Outstanding / Aging ──────────────────────────────────────────────────────

export const getOutstanding = (params?: Record<string, unknown>) =>
  apiClient.get<InvoiceListResponse>('/finance/outstanding', { params });

export const getAgingReport = () =>
  apiClient.get<AgingReport>('/finance/aging');

export const getOrderSummary = () =>
  apiClient.get<OrderSummary>('/finance/order-summary');

export const getCreditLimits = () =>
  apiClient.get<CreditLimitItem[]>('/finance/credit-limits');
