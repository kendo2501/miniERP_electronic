import { apiClient } from './client';
import type {
  Category, Brand, Product, ProductAttribute, UomConversion, ProductListResponse,
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

export const updateProductAttributes = (
  id: number,
  attributes: { attrKey: string; attrValue: string }[],
) =>
  apiClient.put<ProductAttribute[]>(`/catalog/products/${id}/attributes`, { attributes });

export const updateUomConversions = (
  id: number,
  conversions: { fromUnit: string; toUnit: string; conversionRate: number }[],
) =>
  apiClient.put<UomConversion[]>(`/catalog/products/${id}/uom-conversions`, { conversions });

// ─── Excel Import / Export ────────────────────────────────────────────────────

export const exportCategoryTemplate = () =>
  apiClient.get('/catalog/categories/export-template', { responseType: 'blob' });

export const importCategories = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return apiClient.post<{ created: number; updated: number; errors: { row: number; message: string }[] }>(
    '/catalog/categories/import', formData,
  );
};

export const exportProducts = (params?: Record<string, unknown>) =>
  apiClient.get('/catalog/products/export', { params, responseType: 'blob' });

// ─── Product Images ───────────────────────────────────────────────────────────

export const uploadProductImages = (productId: number, files: File[]) => {
  const formData = new FormData();
  files.forEach((f) => formData.append('files', f));
  return apiClient.post(`/catalog/products/${productId}/images`, formData);
};

export const deleteProductImage = (productId: number, imageId: number) =>
  apiClient.delete(`/catalog/products/${productId}/images/${imageId}`);
