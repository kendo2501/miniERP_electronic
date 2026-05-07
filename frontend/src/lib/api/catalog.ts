import { apiClient } from './client';
import type {
  Category, Brand, Product, ProductListResponse,
  CreateProductPayload, CreateCategoryPayload, CreateBrandPayload,
} from '@/types/catalog';

// ─── Categories ───────────────────────────────────────────────────────────────

export const listCategories = () =>
  apiClient.get<Category[]>('/catalog/categories');

export const getCategoryTree = () =>
  apiClient.get<Category[]>('/catalog/categories/tree');

export const createCategory = (data: CreateCategoryPayload) =>
  apiClient.post<Category>('/catalog/categories', data);

export const updateCategory = (id: number, data: Partial<CreateCategoryPayload>) =>
  apiClient.patch<Category>(`/catalog/categories/${id}`, data);

export const deactivateCategory = (id: number) =>
  apiClient.delete(`/catalog/categories/${id}`);

// ─── Brands ───────────────────────────────────────────────────────────────────

export const listBrands = () =>
  apiClient.get<Brand[]>('/catalog/brands');

export const createBrand = (data: CreateBrandPayload) =>
  apiClient.post<Brand>('/catalog/brands', data);

export const updateBrand = (id: number, data: Partial<CreateBrandPayload>) =>
  apiClient.patch<Brand>(`/catalog/brands/${id}`, data);

// ─── Products ─────────────────────────────────────────────────────────────────

export const listProducts = (params?: Record<string, unknown>) =>
  apiClient.get<ProductListResponse>('/catalog/products', { params });

export const getProduct = (id: number) =>
  apiClient.get<Product>(`/catalog/products/${id}`);

export const createProduct = (data: CreateProductPayload) =>
  apiClient.post<Product>('/catalog/products', data);

export const updateProduct = (id: number, data: Partial<CreateProductPayload>) =>
  apiClient.patch<Product>(`/catalog/products/${id}`, data);

export const deactivateProduct = (id: number) =>
  apiClient.post(`/catalog/products/${id}/deactivate`);

export const deleteProduct = (id: number) =>
  apiClient.delete(`/catalog/products/${id}`);
