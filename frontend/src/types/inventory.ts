export interface Warehouse {
  id: number;
  code: string;
  warehouseName: string;
  address: string | null;
  status: string | null;
  createdAt: string;
  _count?: { inventoryStocks: number };
}

export interface InventoryStock {
  id: number;
  warehouseId: number;
  productId: number;
  availableQuantity: string;
  reservedQuantity: string;
  damagedQuantity: string;
  updatedAt: string;
  product: { id: number; sku: string; productName: string; unit: string | null };
  warehouse: { id: number; code: string; warehouseName: string };
}

export interface InventoryTransaction {
  id: number;
  warehouseId: number | null;
  productId: number | null;
  transactionType: string;
  referenceType: string | null;
  referenceId: number | null;
  quantity: string;
  balanceAfter: string | null;
  notes: string | null;
  createdBy: number | null;
  createdAt: string;
  product: { id: number; sku: string; productName: string } | null;
  warehouse: { id: number; code: string; warehouseName: string } | null;
  creator: { id: number; fullName: string; email: string } | null;
}

export interface StockListResponse {
  items: InventoryStock[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TransactionListResponse {
  items: InventoryTransaction[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AdjustStockPayload {
  warehouseId: number;
  productId: number;
  quantity: number;
  notes?: string;
}

export interface TransferStockPayload {
  fromWarehouseId: number;
  toWarehouseId: number;
  productId: number;
  quantity: number;
  notes?: string;
}

export interface CreateWarehousePayload {
  code: string;
  warehouseName: string;
  address?: string;
}
