"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, ArrowLeftRight, TrendingDown, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { inventoryApi } from "@/lib/api/inventory";
import { useAuthStore } from "@/store/auth.store";
import { AdjustStockDialog } from "./adjust-dialog";
import { TransferStockDialog } from "./transfer-dialog";
import { useLanguage } from "@/context/language-context";
import Link from "next/link";

export default function InventoryPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [warehouseId, setWarehouseId] = useState<string>("all");
  const [showAdjust, setShowAdjust] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const { hasPermission } = useAuthStore();
  const qc = useQueryClient();
  const { t } = useLanguage();

  const { data: warehouses } = useQuery({ queryKey: ["warehouses"], queryFn: inventoryApi.listWarehouses });

  const { data, isLoading } = useQuery({
    queryKey: ["stocks", page, search, warehouseId],
    queryFn: () => inventoryApi.listStocks({ page, limit: 15, search: search || undefined, warehouseId: warehouseId !== "all" ? parseInt(warehouseId) : undefined }),
    placeholderData: (prev) => prev,
  });

  const { data: lowStock } = useQuery({ queryKey: ["low-stock"], queryFn: () => inventoryApi.getLowStock(10) });

  const canAdjust = hasPermission("inventory.adjust");
  const canTransfer = hasPermission("inventory.transfer");

  const onSuccess = () => {
    qc.invalidateQueries({ queryKey: ["stocks"] });
    qc.invalidateQueries({ queryKey: ["low-stock"] });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t.inventory.title}</h1>
          <p className="text-muted-foreground mt-1">{t.inventory.subtitle}</p>
        </div>
        <div className="flex gap-2">
          {canTransfer && (
            <Button variant="outline" onClick={() => setShowTransfer(true)}>
              <ArrowLeftRight className="h-4 w-4" />
              {t.inventory.transferStock}
            </Button>
          )}
          {canAdjust && (
            <Button onClick={() => setShowAdjust(true)}>
              <TrendingDown className="h-4 w-4" />
              {t.inventory.adjustStock}
            </Button>
          )}
        </div>
      </div>

      {lowStock && lowStock.items && lowStock.items.length > 0 && (
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardHeader className="pb-3 pt-4 px-5">
            <CardTitle className="text-sm flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
              <AlertTriangle className="h-4 w-4" />
              {lowStock.items.length} {t.dashboard.lowStockItems} (≤10)
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <div className="flex flex-wrap gap-2">
              {lowStock.items.slice(0, 8).map((s) => (
                <Badge key={s.id} variant="warning" className="text-xs">
                  {s.product.sku} — {s.warehouse.warehouseName}: {Number(s.availableQuantity).toLocaleString()}
                </Badge>
              ))}
              {lowStock.items.length > 8 && (
                <Badge variant="outline" className="text-xs">+{lowStock.items.length - 8} more</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t.catalog.searchPlaceholder}
                className="pl-9"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <Select value={warehouseId} onValueChange={(v) => { setWarehouseId(v); setPage(1); }}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder={t.inventory.selectWarehouse} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.common.all} {t.inventory.warehouses}</SelectItem>
                {warehouses?.map((w) => <SelectItem key={w.id} value={String(w.id)}>{w.warehouseName}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex gap-2 ml-auto">
              <Link href="/inventory/warehouses">
                <Button variant="outline" size="sm">{t.inventory.warehouses}</Button>
              </Link>
              <Link href="/inventory/transactions">
                <Button variant="outline" size="sm">{t.inventory.transactions}</Button>
              </Link>
            </div>
            {data && <span className="text-sm text-muted-foreground">{data.total} records</span>}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.inventory.sku}</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.inventory.productName}</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.inventory.warehouseName}</th>
                    <th className="h-10 px-6 text-right font-medium text-muted-foreground">{t.inventory.available}</th>
                    <th className="h-10 px-6 text-right font-medium text-muted-foreground">{t.inventory.reserved}</th>
                    <th className="h-10 px-6 text-right font-medium text-muted-foreground">Damaged</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.common.unit}</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.items.map((s) => {
                    const available = Number(s.availableQuantity);
                    const isLow = available <= 10;
                    return (
                      <tr key={s.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-3 font-mono text-xs">{s.product.sku}</td>
                        <td className="px-6 py-3 font-medium">{s.product.productName}</td>
                        <td className="px-6 py-3 text-muted-foreground">{s.warehouse.warehouseName}</td>
                        <td className="px-6 py-3 text-right">
                          <span className={isLow ? "text-yellow-600 dark:text-yellow-400 font-semibold" : ""}>
                            {available.toLocaleString()}
                          </span>
                          {isLow && <AlertTriangle className="inline h-3 w-3 ml-1 text-yellow-500" />}
                        </td>
                        <td className="px-6 py-3 text-right text-muted-foreground">{Number(s.reservedQuantity).toLocaleString()}</td>
                        <td className="px-6 py-3 text-right text-muted-foreground">{Number(s.damagedQuantity).toLocaleString()}</td>
                        <td className="px-6 py-3 text-muted-foreground">{s.product.unit ?? "—"}</td>
                        <td className="px-6 py-3 text-muted-foreground text-xs">{new Date(s.updatedAt).toLocaleDateString()}</td>
                      </tr>
                    );
                  })}
                  {data?.items.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-muted-foreground">{t.inventory.noStock}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-6 py-3">
              <span className="text-sm text-muted-foreground">{t.common.page} {data.page} {t.common.of} {data.totalPages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page <= 1}>{t.common.previous}</Button>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= data.totalPages}>{t.common.next}</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AdjustStockDialog open={showAdjust} onOpenChange={setShowAdjust} onSuccess={onSuccess} />
      <TransferStockDialog open={showTransfer} onOpenChange={setShowTransfer} onSuccess={onSuccess} />
    </div>
  );
}
