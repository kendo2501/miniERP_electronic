export interface Supplier {
  id: number;
  supplierCode: string;
  companyName: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  taxCode: string | null;
  rating: number | null;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

export interface SupplierListResponse {
  items: Supplier[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateSupplierDto {
  companyName: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  taxCode?: string;
  rating?: number;
}

export interface UpdateSupplierDto extends Partial<CreateSupplierDto> {
  status?: 'ACTIVE' | 'INACTIVE';
}
