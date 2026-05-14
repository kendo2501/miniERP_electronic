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

export interface ProductImage {
  id: number;
  productId: number;
  imageUrl: string;
  isPrimary: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface ProductAttribute {
  id: number;
  attrKey: string;
  attrValue: string;
}

export interface UomConversion {
  id: number;
  fromUnit: string;
  toUnit: string;
  conversionRate: number;
}

export interface Product {
  id: number;
  sku: string;
  productName: string;
  description?: string;
  unit?: string;
  standardPrice?: number;
  minPrice?: number;
  weight?: number;
  isActive: boolean;
  totalStock?: number;
  imageUrls?: string[];
  createdAt: string;
  updatedAt: string;
  category?: { id: number; name: string };
  brand?: { id: number; name: string };
  images?: ProductImage[];
  attributes?: ProductAttribute[];
  uomConversions?: UomConversion[];
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

export interface PriceListItem {
  id: number;
  priceListId: number;
  productId: number;
  unitPrice: string;
  minQuantity: string;
  product?: { id: number; sku: string; productName: string; unit?: string };
}

export interface PriceList {
  id: number;
  name: string;
  applyTo?: string;
  customerTier?: string;
  customerId?: number;
  validFrom?: string;
  validTo?: string;
  isDefault: boolean;
  createdAt: string;
  items?: PriceListItem[];
  customer?: { id: number; companyName: string };
  _count?: { items: number };
}

export interface PriceListLookupResult {
  unitPrice: string;
  source: 'customer-specific' | 'tier' | 'default' | 'fallback-minprice';
}
