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
  reorderThreshold: string;
  updatedAt: string;
  product: { id: number; sku: string; productName: string; unit: string | null };
  warehouse: { id: number; code: string; warehouseName: string };
  stockStatus?: "IN_STOCK" | "OUT_OF_STOCK";
  isLowStock?: boolean;
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

export type ReplenishmentStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type ReplenishmentPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export interface ReplenishmentRequest {
  id: number;
  requestNumber: string;
  salesOrderId: number | null;
  productId: number;
  warehouseId: number | null;
  shortageQuantity: string;
  reservedQuantity: string;
  status: ReplenishmentStatus;
  priority: ReplenishmentPriority;
  requestedBy: number | null;
  assignedTo: number | null;
  dueDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  product: { id: number; sku: string; productName: string; unit: string | null };
  requester: { id: number; fullName: string } | null;
}

export interface ProductSearchResult {
  id: number;
  sku: string;
  productName: string;
  unit: string | null;
  standardPrice: string | null;
  totalAvailable: number;
  inStock: boolean;
  stocks: Array<{
    warehouseId: number;
    availableQuantity: string;
    reservedQuantity: string;
    reorderThreshold: string;
    warehouse: { id: number; code: string; warehouseName: string };
  }>;
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

export interface ReplenishmentListResponse {
  items: ReplenishmentRequest[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AdjustStockPayload {
  warehouseId: number;
  productId: number;
  quantity: number;
  adjustmentType: "IN" | "OUT" | "DAMAGE" | "RETURN" | "CORRECTION";
  reason?: string;
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

export interface CreateReplenishmentPayload {
  productId: number;
  warehouseId?: number;
  salesOrderId?: number;
  shortageQuantity: number;
  priority?: ReplenishmentPriority;
  dueDate?: string;
  notes?: string;
}

export interface UpdateReplenishmentPayload {
  status?: ReplenishmentStatus;
  priority?: ReplenishmentPriority;
  assignedTo?: number;
  dueDate?: string;
  notes?: string;
}
