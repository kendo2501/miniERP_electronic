export interface Category {
  id: number;
  name: string;
  code?: string;
  description?: string;
  parentId?: number;
  isActive: boolean;
  children?: Category[];
}

export interface Brand {
  id: number;
  name: string;
  code?: string;
  description?: string;
}

export interface Product {
  id: number;
  sku: string;
  productName: string;
  description?: string;
  unit?: string;
  standardPrice?: number;
  weight?: number;
  isActive: boolean;
  imageUrls?: string[];
  createdAt: string;
  updatedAt: string;
  category?: { id: number; name: string };
  brand?: { id: number; name: string };
  stockSummary?: { warehouseName: string; availableQuantity: number }[];
}

export interface ProductListResponse {
  items: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateProductPayload {
  sku: string;
  productName: string;
  description?: string;
  unit?: string;
  standardPrice?: string;
  weight?: string;
  categoryId?: number;
  brandId?: number;
  imageUrls?: string[];
}

export interface CreateCategoryPayload {
  name: string;
  code?: string;
  description?: string;
  parentId?: number;
}

export interface CreateBrandPayload {
  name: string;
  code?: string;
  description?: string;
}
