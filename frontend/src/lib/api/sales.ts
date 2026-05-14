import { apiClient } from './client';
import type {
  Customer, CustomerListResponse, CreateCustomerPayload, UpdateCustomerPayload, CustomerBalance,
  Quotation, QuotationListResponse, CreateQuotationPayload,
  SalesOrder, SalesOrderListResponse, CreateSalesOrderPayload,
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

export const createPortalAccount = (customerId: number, data: { email: string; password: string; fullName?: string }) =>
  apiClient.post(`/customers/${customerId}/portal-account`, data);

export const unlinkPortalAccount = (customerId: number) =>
  apiClient.delete(`/customers/${customerId}/portal-account`);

export const addCustomerAddress = (customerId: number, data: { label?: string; address: string; isDefault?: boolean }) =>
  apiClient.post(`/customers/${customerId}/addresses`, data);

export const updateCustomerAddress = (customerId: number, addressId: number, data: { label?: string; address?: string; isDefault?: boolean }) =>
  apiClient.patch(`/customers/${customerId}/addresses/${addressId}`, data);

export const deleteCustomerAddress = (customerId: number, addressId: number) =>
  apiClient.delete(`/customers/${customerId}/addresses/${addressId}`);

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

export const submitCounterOffer = (id: number, data: { proposedAmount: number; note?: string }) =>
  apiClient.post<Quotation>(`/sales/quotations/${id}/counter-offer`, data);

export const acceptCounterOffer = (id: number) =>
  apiClient.post<SalesOrder>(`/sales/quotations/${id}/accept-offer`);

export const rejectCounterOffer = (id: number) =>
  apiClient.post<Quotation>(`/sales/quotations/${id}/reject-offer`);

export const approveQuotation = (id: number) =>
  apiClient.post<Quotation>(`/sales/quotations/${id}/approve`);

export const requestRevision = (id: number, reason: string) =>
  apiClient.post<Quotation>(`/sales/quotations/${id}/request-revision`, { reason });

export const cancelQuotationWithReason = (id: number, reason: string) =>
  apiClient.post<Quotation>(`/sales/quotations/${id}/cancel-with-reason`, { reason });

export const resubmitQuotation = (id: number, items: { productId: number; quantity: number; unitPrice: number; discountPercent?: number }[]) =>
  apiClient.post<Quotation>(`/sales/quotations/${id}/resubmit`, { items });

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

export const confirmPayment = (id: number) =>
  apiClient.post<SalesOrder>(`/sales/orders/${id}/confirm-payment`);

export const requestPriceAdjustment = (id: number, reason?: string) =>
  apiClient.post<SalesOrder>(`/sales/orders/${id}/request-price-adjustment`, { reason });

export const adjustOrderPrices = (id: number, items: { productId: number; quantity: number; unitPrice: number; discountPercent?: number }[]) =>
  apiClient.post<SalesOrder>(`/sales/orders/${id}/adjust-prices`, { items });

export const confirmReapproval = (id: number) =>
  apiClient.post<SalesOrder>(`/sales/orders/${id}/confirm-reapproval`);

export const startDelivery = (id: number) =>
  apiClient.post<SalesOrder>(`/sales/orders/${id}/start-delivery`);

export const completeDelivery = (id: number) =>
  apiClient.post<SalesOrder>(`/sales/orders/${id}/complete-delivery`);

// ─── Stock Inquiries ──────────────────────────────────────────────────────────

export const listStockInquiries = (params?: Record<string, unknown>) =>
  apiClient.get<any>('/stock-inquiries', { params });

export const getStockInquiry = (id: number) =>
  apiClient.get<any>(`/stock-inquiries/${id}`);

export const createStockInquiry = (data: { notes?: string; items: { productId: number; requestedQuantity: number }[] }) =>
  apiClient.post<any>('/stock-inquiries', data);

export const respondToInquiry = (id: number, data: {
  responseNotes?: string;
  items: { itemId: number; isAvailable: boolean; availableQuantity?: number; warehouseNote?: string }[];
}) => apiClient.post<any>(`/stock-inquiries/${id}/respond`, data);

export const getCustomerBalance = (customerId: number) =>
  apiClient.get<CustomerBalance>(`/sales/customers/${customerId}/balance`);
