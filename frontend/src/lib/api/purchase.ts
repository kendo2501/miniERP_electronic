import { apiClient } from './client';

// ─── Supplier Payments ────────────────────────────────────────────────────────

export const listSupplierPayments = (params?: Record<string, unknown>) =>
  apiClient.get<any>('/purchase/payments', { params });

export const getSupplierPayment = (id: number) =>
  apiClient.get<any>(`/purchase/payments/${id}`);

export const createSupplierPayment = (data: {
  supplierId: number;
  totalAmount: number;
  paymentDate?: string;
  referenceNumber?: string;
  notes?: string;
}) => apiClient.post<any>('/purchase/payments', data);

// ─── AP Ledger ────────────────────────────────────────────────────────────────

export const listApLedger = (params?: Record<string, unknown>) =>
  apiClient.get<any>('/finance/ap-ledger', { params });

export const getSupplierBalance = (supplierId: number) =>
  apiClient.get<any>(`/finance/suppliers/${supplierId}/balance`);
