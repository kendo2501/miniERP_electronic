import { apiClient } from './client';
import type { PriceList, PriceListItem, PriceListLookupResult } from '@/types/catalog';

export const listPriceLists = () =>
  apiClient.get<PriceList[]>('/price-lists');

export const getPriceList = (id: number) =>
  apiClient.get<PriceList>(`/price-lists/${id}`);

export const createPriceList = (data: {
  name: string;
  applyTo?: string;
  customerTier?: string;
  customerId?: number;
  validFrom?: string;
  validTo?: string;
  isDefault?: boolean;
}) => apiClient.post<PriceList>('/price-lists', data);

export const updatePriceList = (
  id: number,
  data: {
    name?: string;
    applyTo?: string;
    customerTier?: string;
    customerId?: number;
    validFrom?: string;
    validTo?: string;
    isDefault?: boolean;
  },
) => apiClient.patch<PriceList>(`/price-lists/${id}`, data);

export const addPriceListItem = (
  priceListId: number,
  data: { productId: number; unitPrice: number; minQuantity?: number },
) => apiClient.post<PriceListItem>(`/price-lists/${priceListId}/items`, data);

export const removePriceListItem = (priceListId: number, itemId: number) =>
  apiClient.delete(`/price-lists/${priceListId}/items/${itemId}`);

export const lookupPrice = (params: {
  productId: number;
  quantity?: number;
  customerId?: number;
  customerTier?: string;
}) => apiClient.get<PriceListLookupResult>('/price-lists/lookup', { params });
