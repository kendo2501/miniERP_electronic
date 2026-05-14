import { apiClient } from "./client";
import type {
  Warehouse, StockListResponse, TransactionListResponse,
  AdjustStockPayload, TransferStockPayload, CreateWarehousePayload,
  ReplenishmentListResponse, CreateReplenishmentPayload, UpdateReplenishmentPayload,
  ProductSearchResult, ReplenishmentRequest,
} from "@/types/inventory";

export const inventoryApi = {
  // Warehouses
  listWarehouses: () =>
    apiClient.get<Warehouse[]>("/inventory/warehouses").then((r) => r.data),

  createWarehouse: (data: CreateWarehousePayload) =>
    apiClient.post<Warehouse>("/inventory/warehouses", data).then((r) => r.data),

  updateWarehouse: (id: number, data: Partial<CreateWarehousePayload & { status: string }>) =>
    apiClient.patch<Warehouse>(`/inventory/warehouses/${id}`, data).then((r) => r.data),

  // Product search
  searchProducts: (q: string, warehouseId?: number) =>
    apiClient
      .get<ProductSearchResult[]>("/inventory/products/search", {
        params: { q, ...(warehouseId ? { warehouseId } : {}) },
      })
      .then((r) => r.data),

  // Stocks
  listStocks: (params?: {
    page?: number; limit?: number; warehouseId?: number;
    productId?: number; search?: string; lowStockOnly?: boolean;
  }) => apiClient.get<StockListResponse>("/inventory/stocks", { params }).then((r) => r.data),

  getLowStock: (threshold?: number) =>
    apiClient
      .get<{ items: StockListResponse["items"] }>("/inventory/stocks/low-stock", {
        params: threshold ? { threshold } : undefined,
      })
      .then((r) => r.data),

  // Adjustments
  adjustStock: (data: AdjustStockPayload) =>
    apiClient.post("/inventory/adjustments", data).then((r) => r.data),

  // Transfers
  transferStock: (data: TransferStockPayload) =>
    apiClient.post("/inventory/transfers", data).then((r) => r.data),

  // Replenishment
  listReplenishment: (params?: {
    page?: number; limit?: number; status?: string; priority?: string; productId?: number;
  }) =>
    apiClient
      .get<ReplenishmentListResponse>("/inventory/replenishment", { params })
      .then((r) => r.data),

  createReplenishment: (data: CreateReplenishmentPayload) =>
    apiClient.post<ReplenishmentRequest>("/inventory/replenishment", data).then((r) => r.data),

  updateReplenishment: (id: number, data: UpdateReplenishmentPayload) =>
    apiClient
      .patch<ReplenishmentRequest>(`/inventory/replenishment/${id}`, data)
      .then((r) => r.data),

  // Transactions
  listTransactions: (params?: {
    page?: number; limit?: number; warehouseId?: number;
    productId?: number; transactionType?: string;
  }) =>
    apiClient.get<TransactionListResponse>("/inventory/transactions", { params }).then((r) => r.data),
};
