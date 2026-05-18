import { apiClient } from './client';
import type { Supplier, SupplierListResponse, CreateSupplierDto, UpdateSupplierDto } from '@/types/suppliers';

export const getSuppliers = (params?: Record<string, unknown>) =>
  apiClient.get<SupplierListResponse>('/suppliers', { params });

export const getSupplier = (id: number) =>
  apiClient.get<Supplier>(`/suppliers/${id}`);

export const createSupplier = (dto: CreateSupplierDto) =>
  apiClient.post<Supplier>('/suppliers', dto);

export const updateSupplier = (id: number, dto: UpdateSupplierDto) =>
  apiClient.patch<Supplier>(`/suppliers/${id}`, dto);

export const deleteSupplier = (id: number) =>
  apiClient.delete(`/suppliers/${id}`);
