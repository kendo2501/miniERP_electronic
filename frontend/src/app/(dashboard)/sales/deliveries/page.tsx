"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Loader2, Trash2, CheckCircle, XCircle, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { listDeliveries, createDelivery, markDelivered, markDeliveryFailed } from "@/lib/api/sales";
import { inventoryApi } from "@/lib/api/inventory";
import type { DeliveryStatus } from "@/types/sales";
import { useAuthStore } from "@/store/auth.store";
import { useLanguage } from "@/context/language-context";
import Link from "next/link";

const STATUS_VARIANTS: Record<DeliveryStatus, string> = {
  PENDING: "secondary",
  DELIVERED: "success",
  FAILED: "destructive",
  CANCELLED: "destructive",
} as any;

const itemSchema = z.object({ productId: z.string().min(1), quantity: z.string().min(1) });
const schema = z.object({
  salesOrderId: z.string().min(1, "Nhập ID đơn hàng"),
  warehouseId: z.string().min(1, "Chọn kho"),
  trackingCode: z.string().optional(),
  items: z.array(itemSchema).min(1),
});
type FormValues = z.infer<typeof schema>;

export default function DeliveriesPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [failDialog, setFailDialog] = useState<{ id: number; number: string } | null>(null);
  const [failReason, setFailReason] = useState("");
  const { hasPermission } = useAuthStore();
  const qc = useQueryClient();
  const { t } = useLanguage();

  const { data, isLoading } = useQuery({
    queryKey: ["deliveries", page, statusFilter],
    queryFn: () => listDeliveries({ page, limit: 20, status: statusFilter !== "all" ? statusFilter : undefined }).then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const { data: warehouses } = useQuery({ queryKey: ["warehouses"], queryFn: inventoryApi.listWarehouses, enabled: showCreate });

  const { register, handleSubmit, setValue, reset, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { items: [{ productId: "", quantity: "1" }] },
  });

  const items = watch("items");

  const createMut = useMutation({
    mutationFn: (v: FormValues) =>
      createDelivery({
        salesOrderId: parseInt(v.salesOrderId),
        warehouseId: parseInt(v.warehouseId),
        trackingCode: v.trackingCode || undefined,
        items: v.items.map((i) => ({ productId: parseInt(i.productId), quantity: parseFloat(i.quantity) })),
      }).then((r) => r.data),
    onSuccess: () => {
      toast.success(t.deliveries.deliveryCreated);
      qc.invalidateQueries({ queryKey: ["deliveries"] });
      qc.invalidateQueries({ queryKey: ["orders"] });
      setShowCreate(false);
      reset({ items: [{ productId: "", quantity: "1" }] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Tạo phiếu giao hàng thất bại"),
  });

  const markMut = useMutation({
    mutationFn: (id: number) => markDelivered(id),
    onSuccess: () => { toast.success(t.deliveries.delivered); qc.invalidateQueries({ queryKey: ["deliveries"] }); qc.invalidateQueries({ queryKey: ["orders"] }); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Thao tác thất bại"),
  });

  const failMut = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => markDeliveryFailed(id, reason || undefined),
    onSuccess: () => {
      toast.success(t.deliveries.failedMsg);
      qc.invalidateQueries({ queryKey: ["deliveries"] });
      setFailDialog(null);
      setFailReason("");
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Thao tác thất bại"),
  });

  const canCreate = hasPermission("sales.order.create");

  const STATUS_LABELS: Partial<Record<DeliveryStatus, string>> = {
    PENDING: t.common.pending,
    DELIVERED: t.common.completed,
    FAILED: t.deliveries.failed,
    CANCELLED: t.common.cancelled,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t.deliveries.title}</h1>
          <p className="text-muted-foreground mt-1">{t.deliveries.subtitle}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/sales/quotations"><Button variant="outline" size="sm">{t.quotations.title}</Button></Link>
          <Link href="/sales/orders"><Button variant="outline" size="sm">{t.orders.title}</Button></Link>
          {canCreate && (
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4" />
              {t.deliveries.createTitle}
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-40"><SelectValue placeholder={t.deliveries.allStatuses} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.deliveries.allStatuses}</SelectItem>
                <SelectItem value="PENDING">{t.common.pending}</SelectItem>
                <SelectItem value="DELIVERED">{t.common.completed}</SelectItem>
                <SelectItem value="FAILED">{t.deliveries.failed}</SelectItem>
                <SelectItem value="CANCELLED">{t.common.cancelled}</SelectItem>
              </SelectContent>
            </Select>
            {data && <span className="text-sm text-muted-foreground ml-auto">{data.total} {t.deliveries.totalDeliveries}</span>}
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
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.deliveries.deliveryNumber}</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.deliveries.order}</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.common.warehouse}</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.deliveries.trackingCode}</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.deliveries.status}</th>
                    <th className="h-10 px-6 text-center font-medium text-muted-foreground">Items</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.deliveries.deliveredAt}</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.common.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.items.map((d) => (
                    <tr key={d.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-3 font-mono text-xs font-medium">{d.deliveryNumber}</td>
                      <td className="px-6 py-3 font-mono text-xs">{d.salesOrder.orderNumber}</td>
                      <td className="px-6 py-3 text-muted-foreground text-xs">{d.warehouse.warehouseName}</td>
                      <td className="px-6 py-3">
                        {d.trackingCode ? (
                          <span className="flex items-center gap-1 text-xs font-mono text-blue-600">
                            <Truck className="h-3 w-3" />{d.trackingCode}
                          </span>
                        ) : <span className="text-muted-foreground text-xs">—</span>}
                      </td>
                      <td className="px-6 py-3">
                        <div>
                          <Badge variant={STATUS_VARIANTS[d.status] as any}>{STATUS_LABELS[d.status] ?? d.status}</Badge>
                          {d.failureReason && (
                            <p className="text-xs text-muted-foreground mt-0.5 max-w-[120px] truncate" title={d.failureReason}>{d.failureReason}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-3 text-center text-muted-foreground">{d._count?.items ?? 0}</td>
                      <td className="px-6 py-3 text-muted-foreground text-xs">
                        {d.deliveredAt ? new Date(d.deliveredAt).toLocaleDateString("vi-VN") : "—"}
                      </td>
                      <td className="px-6 py-3">
                        {d.status === "PENDING" && (
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1 text-green-600 hover:text-green-700"
                              onClick={() => markMut.mutate(d.id)} disabled={markMut.isPending}>
                              <CheckCircle className="h-3 w-3" /> {t.deliveries.markDelivered}
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1 text-red-600 hover:text-red-700"
                              onClick={() => setFailDialog({ id: d.id, number: d.deliveryNumber })} disabled={failMut.isPending}>
                              <XCircle className="h-3 w-3" /> {t.deliveries.markFailed}
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {data?.items.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-muted-foreground">{t.deliveries.noDeliveries}</td>
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

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={(v) => { setShowCreate(v); if (!v) reset({ items: [{ productId: "", quantity: "1" }] }); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t.deliveries.createTitle}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit((v) => createMut.mutate(v))} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Sales Order ID *</Label>
                <Input type="number" placeholder="Nhập ID đơn hàng" {...register("salesOrderId")} />
                {errors.salesOrderId && <p className="text-xs text-destructive">{errors.salesOrderId.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>{t.deliveries.warehouse} *</Label>
                <Select onValueChange={(v) => setValue("warehouseId", v)}>
                  <SelectTrigger><SelectValue placeholder={t.deliveries.selectWarehouse} /></SelectTrigger>
                  <SelectContent>
                    {warehouses?.map((w) => <SelectItem key={w.id} value={String(w.id)}>{w.warehouseName}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.warehouseId && <p className="text-xs text-destructive">{errors.warehouseId.message}</p>}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t.deliveries.trackingCode}</Label>
              <Input placeholder={t.deliveries.trackingPlaceholder} {...register("trackingCode")} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>{t.deliveries.orderItems} *</Label>
                <Button type="button" variant="outline" size="sm"
                  onClick={() => setValue("items", [...(items ?? []), { productId: "", quantity: "1" }])}>
                  <Plus className="h-3.5 w-3.5" /> {t.quotations.addItem}
                </Button>
              </div>
              <div className="space-y-2">
                <div className="grid grid-cols-[1fr_80px_32px] gap-2">
                  <span className="text-xs text-muted-foreground font-medium">Product ID</span>
                  <span className="text-xs text-muted-foreground font-medium">{t.orders.quantity}</span>
                  <span />
                </div>
                {(items ?? []).map((_, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_80px_32px] gap-2 items-center">
                    <Input type="number" placeholder="ID sản phẩm" {...register(`items.${idx}.productId`)} />
                    <Input type="number" min="0.01" step="0.01" placeholder="1" {...register(`items.${idx}.quantity`)} />
                    <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-destructive"
                      onClick={() => { const cur = items ?? []; if (cur.length > 1) setValue("items", cur.filter((_, i) => i !== idx)); }}
                      disabled={(items ?? []).length <= 1}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setShowCreate(false); reset({ items: [{ productId: "", quantity: "1" }] }); }}>
                {t.common.cancel}
              </Button>
              <Button type="submit" disabled={createMut.isPending}>
                {createMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {t.common.create}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Fail Dialog */}
      <Dialog open={!!failDialog} onOpenChange={(v) => { if (!v) { setFailDialog(null); setFailReason(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              {t.deliveries.markFailed} — {failDialog?.number}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <Label>{t.deliveries.failureReason}</Label>
            <Input
              placeholder={t.deliveries.failureReasonPlaceholder}
              value={failReason}
              onChange={(e) => setFailReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setFailDialog(null); setFailReason(""); }}>{t.common.cancel}</Button>
            <Button variant="destructive" disabled={failMut.isPending}
              onClick={() => failDialog && failMut.mutate({ id: failDialog.id, reason: failReason })}>
              {failMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t.deliveries.markFailed}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
