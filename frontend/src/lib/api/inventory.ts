import { apiClient } from "./client";
import type {
  Warehouse, StockListResponse, TransactionListResponse,
  AdjustStockPayload, TransferStockPayload, CreateWarehousePayload,
} from "@/types/inventory";

export const inventoryApi = {
  // Warehouses
  listWarehouses: () =>
    apiClient.get<Warehouse[]>("/inventory/warehouses").then((r) => r.data),

  createWarehouse: (data: CreateWarehousePayload) =>
    apiClient.post<Warehouse>("/inventory/warehouses", data).then((r) => r.data),

  updateWarehouse: (id: number, data: Partial<CreateWarehousePayload & { status: string }>) =>
    apiClient.patch<Warehouse>(`/inventory/warehouses/${id}`, data).then((r) => r.data),

  // Stocks
  listStocks: (params?: {
    page?: number; limit?: number; warehouseId?: number;
    productId?: number; search?: string; lowStockOnly?: boolean;
  }) => apiClient.get<StockListResponse>("/inventory/stocks", { params }).then((r) => r.data),

  getLowStock: (threshold?: number) =>
    apiClient.get<{ items: StockListResponse["items"] }>("/inventory/stocks/low-stock", {
      params: threshold ? { threshold } : undefined,
    }).then((r) => r.data),

  // Adjustments
  adjustStock: (data: AdjustStockPayload) =>
    apiClient.post("/inventory/adjustments", data).then((r) => r.data),

  // Transfers
  transferStock: (data: TransferStockPayload) =>
    apiClient.post("/inventory/transfers", data).then((r) => r.data),

  // Transactions
  listTransactions: (params?: {
    page?: number; limit?: number; warehouseId?: number;
    productId?: number; transactionType?: string;
  }) => apiClient.get<TransactionListResponse>("/inventory/transactions", { params }).then((r) => r.data),
};
