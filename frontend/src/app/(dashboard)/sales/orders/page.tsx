"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Loader2, CheckCircle, XCircle, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { listOrders, confirmOrder, cancelOrder } from "@/lib/api/sales";
import type { SalesOrderStatus } from "@/types/sales";
import { useAuthStore } from "@/store/auth.store";
import { useLanguage } from "@/context/language-context";
import Link from "next/link";

const STATUS_VARIANTS: Record<SalesOrderStatus, string> = {
  DRAFT: "secondary",
  CONFIRMED: "default",
  PARTIALLY_DELIVERED: "warning",
  DELIVERED: "success",
  CANCELLED: "destructive",
} as any;

export default function SalesOrdersPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const { hasPermission } = useAuthStore();
  const qc = useQueryClient();
  const { t } = useLanguage();

  const STATUS_LABELS: Record<SalesOrderStatus, string> = {
    DRAFT: t.common.draft,
    CONFIRMED: "Confirmed",
    PARTIALLY_DELIVERED: t.common.partial,
    DELIVERED: t.common.completed,
    CANCELLED: t.common.cancelled,
  };

  const { data, isLoading } = useQuery({
    queryKey: ["orders", page, search, statusFilter],
    queryFn: () =>
      listOrders({ page, limit: 20, search: search || undefined, status: statusFilter !== "all" ? statusFilter : undefined }).then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const confirmMut = useMutation({
    mutationFn: (id: number) => confirmOrder(id),
    onSuccess: () => { toast.success(t.orders.confirmed); qc.invalidateQueries({ queryKey: ["orders"] }); },
    onError: () => toast.error("Failed to confirm order"),
  });

  const cancelMut = useMutation({
    mutationFn: (id: number) => cancelOrder(id),
    onSuccess: () => { toast.success(t.orders.cancelledMsg); qc.invalidateQueries({ queryKey: ["orders"] }); },
    onError: () => toast.error("Failed to cancel order"),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t.orders.title}</h1>
          <p className="text-muted-foreground mt-1">{t.orders.subtitle}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/sales/quotations"><Button variant="outline" size="sm">{t.quotations.title}</Button></Link>
          <Link href="/sales/deliveries"><Button variant="outline" size="sm">{t.deliveries.title}</Button></Link>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder={t.orders.searchPlaceholder} className="pl-9" value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-40"><SelectValue placeholder={t.orders.allStatuses} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.orders.allStatuses}</SelectItem>
                <SelectItem value="DRAFT">{t.common.draft}</SelectItem>
                <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                <SelectItem value="PARTIALLY_DELIVERED">{t.common.partial}</SelectItem>
                <SelectItem value="DELIVERED">{t.common.completed}</SelectItem>
                <SelectItem value="CANCELLED">{t.common.cancelled}</SelectItem>
              </SelectContent>
            </Select>
            {data && <span className="text-sm text-muted-foreground ml-auto">{data.total} {t.orders.totalOrders}</span>}
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
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.orders.orderNumber}</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.orders.customer}</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.orders.status}</th>
                    <th className="h-10 px-6 text-right font-medium text-muted-foreground">{t.orders.total}</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">Quotation</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">Items</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">Deliveries</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.orders.createdAt}</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.common.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.items.map((o) => (
                    <tr key={o.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-3 font-mono text-xs font-medium">{o.orderNumber}</td>
                      <td className="px-6 py-3">
                        <div className="font-medium">{o.customer.companyName}</div>
                        <div className="text-xs text-muted-foreground">{o.customer.customerCode}</div>
                      </td>
                      <td className="px-6 py-3">
                        <Badge variant={STATUS_VARIANTS[o.status] as any}>{STATUS_LABELS[o.status]}</Badge>
                      </td>
                      <td className="px-6 py-3 text-right font-medium">
                        ${Number(o.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-3 text-muted-foreground text-xs">{o.quotation?.quotationNumber ?? "—"}</td>
                      <td className="px-6 py-3 text-muted-foreground">{o._count?.items ?? 0}</td>
                      <td className="px-6 py-3 text-muted-foreground">{o._count?.deliveries ?? 0}</td>
                      <td className="px-6 py-3 text-muted-foreground text-xs">{new Date(o.orderedAt).toLocaleDateString()}</td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-1">
                          {o.status === "DRAFT" && (
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1 text-green-600 hover:text-green-700"
                              onClick={() => confirmMut.mutate(o.id)} disabled={confirmMut.isPending}>
                              <CheckCircle className="h-3 w-3" /> {t.orders.confirm}
                            </Button>
                          )}
                          {(o.status === "CONFIRMED" || o.status === "PARTIALLY_DELIVERED") && (
                            <Link href="/sales/deliveries">
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1 text-blue-600 hover:text-blue-700">
                                <Truck className="h-3 w-3" /> Deliver
                              </Button>
                            </Link>
                          )}
                          {!["CANCELLED", "DELIVERED"].includes(o.status) && (
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1 text-red-600 hover:text-red-700"
                              onClick={() => cancelMut.mutate(o.id)} disabled={cancelMut.isPending}>
                              <XCircle className="h-3 w-3" /> {t.orders.cancel}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {data?.items.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-muted-foreground">{t.orders.noOrders}</td>
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
    </div>
  );
}
