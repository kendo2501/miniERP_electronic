"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { inventoryApi } from "@/lib/api/inventory";
import { useLanguage } from "@/context/language-context";
import Link from "next/link";

const TX_TYPE_VARIANT: Record<string, "success" | "destructive" | "secondary" | "warning"> = {
  ADJUSTMENT_IN: "success",
  ADJUSTMENT_OUT: "destructive",
  TRANSFER_IN: "success",
  TRANSFER_OUT: "warning",
};

const TRANSACTION_TYPES = [
  "ADJUSTMENT_IN", "ADJUSTMENT_OUT", "TRANSFER_IN", "TRANSFER_OUT",
  "SALE_OUT", "RETURN_IN", "PURCHASE_IN",
];

export default function TransactionsPage() {
  const [page, setPage] = useState(1);
  const [warehouseId, setWarehouseId] = useState<string>("all");
  const [txType, setTxType] = useState<string>("all");
  const { t } = useLanguage();

  const { data: warehouses } = useQuery({
    queryKey: ["warehouses"],
    queryFn: inventoryApi.listWarehouses,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["transactions", page, warehouseId, txType],
    queryFn: () => inventoryApi.listTransactions({
      page,
      limit: 20,
      warehouseId: warehouseId !== "all" ? parseInt(warehouseId) : undefined,
      transactionType: txType !== "all" ? txType : undefined,
    }),
    placeholderData: (prev) => prev,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/inventory">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t.inventory.transactionsTitle}</h1>
          <p className="text-muted-foreground mt-1">{t.inventory.transactionsSubtitle}</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={warehouseId} onValueChange={(v) => { setWarehouseId(v); setPage(1); }}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder={`${t.common.all} ${t.inventory.warehouses}`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.common.all} {t.inventory.warehouses}</SelectItem>
                {warehouses?.map((w) => (
                  <SelectItem key={w.id} value={String(w.id)}>{w.warehouseName}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={txType} onValueChange={(v) => { setTxType(v); setPage(1); }}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder={`${t.common.all}`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.common.all}</SelectItem>
                {TRANSACTION_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>{type.replace("_", " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {data && (
              <span className="ml-auto text-sm text-muted-foreground">{data.total} {t.inventory.transactions}</span>
            )}
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
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.inventory.transactionDate}</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.inventory.transactionType}</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.common.product}</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.common.warehouse}</th>
                    <th className="h-10 px-6 text-right font-medium text-muted-foreground">{t.orders.quantity}</th>
                    <th className="h-10 px-6 text-right font-medium text-muted-foreground">Balance After</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.audit.actor}</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.common.notes}</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.items.map((tx) => (
                    <tr key={tx.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(tx.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-3">
                        <Badge variant={TX_TYPE_VARIANT[tx.transactionType] ?? "secondary"} className="text-xs">
                          {tx.transactionType.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="px-6 py-3">
                        {tx.product ? (
                          <div>
                            <p className="font-medium">{tx.product.productName}</p>
                            <p className="text-xs text-muted-foreground font-mono">{tx.product.sku}</p>
                          </div>
                        ) : "—"}
                      </td>
                      <td className="px-6 py-3 text-muted-foreground">
                        {tx.warehouse?.warehouseName ?? "—"}
                      </td>
                      <td className="px-6 py-3 text-right font-mono">
                        <span className={Number(tx.quantity) >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500"}>
                          {Number(tx.quantity) >= 0 ? "+" : ""}{Number(tx.quantity).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right font-mono text-muted-foreground">
                        {tx.balanceAfter ? Number(tx.balanceAfter).toLocaleString() : "—"}
                      </td>
                      <td className="px-6 py-3 text-muted-foreground text-xs">
                        {tx.creator?.fullName ?? "System"}
                      </td>
                      <td className="px-6 py-3 text-muted-foreground text-xs max-w-32 truncate">
                        {tx.notes ?? "—"}
                      </td>
                    </tr>
                  ))}
                  {data?.items.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-muted-foreground">
                        {t.inventory.noTransactions}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-6 py-3">
              <span className="text-sm text-muted-foreground">
                {t.common.page} {data.page} {t.common.of} {data.totalPages}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page <= 1}>
                  {t.common.previous}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= data.totalPages}>
                  {t.common.next}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
