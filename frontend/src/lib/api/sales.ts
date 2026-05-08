import { apiClient } from './client';
import type {
  Customer, CustomerListResponse, CreateCustomerPayload, UpdateCustomerPayload, CustomerBalance,
  Quotation, QuotationListResponse, CreateQuotationPayload,
  SalesOrder, SalesOrderListResponse, CreateSalesOrderPayload,
  Delivery, DeliveryListResponse, CreateDeliveryPayload,
} from '@/types/sales';

// ─── Customers ────────────────────────────────────────────────────────────────

export const listCustomers = (params?: Record<string, unknown>) =>
  apiClient.get<CustomerListResponse>('/customers', { params });

export const getCustomer = (id: number) =>
  apiClient.get<Customer>(`/customers/${id}`);

export const createCustomer = (data: CreateCustomerPayload) =>
  apiClient.post<Customer>('/customers', data);

export const updateCustomer = (id: number, data: UpdateCustomerPayload) =>
  apiClient.patch<Customer>(`/customers/${id}`, data);

export const deleteCustomer = (id: number) =>
  apiClient.delete(`/customers/${id}`);

// ─── Quotations ───────────────────────────────────────────────────────────────

export const listQuotations = (params?: Record<string, unknown>) =>
  apiClient.get<QuotationListResponse>('/sales/quotations', { params });

export const getQuotation = (id: number) =>
  apiClient.get<Quotation>(`/sales/quotations/${id}`);

export const createQuotation = (data: CreateQuotationPayload) =>
  apiClient.post<Quotation>('/sales/quotations', data);

export const sendQuotation = (id: number) =>
  apiClient.post<Quotation>(`/sales/quotations/${id}/send`);

export const confirmQuotation = (id: number) =>
  apiClient.post<SalesOrder>(`/sales/quotations/${id}/confirm`);

export const cancelQuotation = (id: number) =>
  apiClient.post<Quotation>(`/sales/quotations/${id}/cancel`);

// ─── Sales Orders ─────────────────────────────────────────────────────────────

export const listOrders = (params?: Record<string, unknown>) =>
  apiClient.get<SalesOrderListResponse>('/sales/orders', { params });

export const getOrder = (id: number) =>
  apiClient.get<SalesOrder>(`/sales/orders/${id}`);

export const createOrder = (data: CreateSalesOrderPayload) =>
  apiClient.post<SalesOrder>('/sales/orders', data);

export const confirmOrder = (id: number) =>
  apiClient.post<SalesOrder>(`/sales/orders/${id}/confirm`);

export const cancelOrder = (id: number) =>
  apiClient.post<SalesOrder>(`/sales/orders/${id}/cancel`);

// ─── Deliveries ───────────────────────────────────────────────────────────────

export const listDeliveries = (params?: Record<string, unknown>) =>
  apiClient.get<DeliveryListResponse>('/sales/deliveries', { params });

export const createDelivery = (data: CreateDeliveryPayload) =>
  apiClient.post<Delivery>('/sales/deliveries', data);

export const markDelivered = (id: number) =>
  apiClient.post<Delivery>(`/sales/deliveries/${id}/deliver`);

export const markDeliveryFailed = (id: number, failureReason?: string) =>
  apiClient.patch<Delivery>(`/sales/deliveries/${id}/fail`, { failureReason });

export const getCustomerBalance = (customerId: number) =>
  apiClient.get<CustomerBalance>(`/sales/customers/${customerId}/balance`);
