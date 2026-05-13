"use client";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Search, Plus, Loader2, Trash2, CheckCircle, XCircle, Truck, ShoppingCart, Edit2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  listOrders, confirmOrder, cancelOrder, createOrder, listCustomers, confirmPayment,
  requestPriceAdjustment, adjustOrderPrices, getOrder,
} from "@/lib/api/sales";
import { ProductSelect } from "@/components/product-select";
import type { Product } from "@/types/catalog";
import type { SalesOrderStatus, PaymentStatus } from "@/types/sales";
import { vnd } from "@/lib/format";
import { useAuthStore } from "@/store/auth.store";
import { useLanguage } from "@/context/language-context";
import Link from "next/link";

const STATUS_VARIANTS: Record<SalesOrderStatus, string> = {
  DRAFT: "secondary",
  CONFIRMED: "default",
  PARTIALLY_DELIVERED: "warning",
  DELIVERED: "outline",
  CANCELLED: "destructive",
  PRICE_ADJUSTMENT_REQUESTED: "warning",
} as any;

const STATUS_COLORS: Record<SalesOrderStatus, string> = {
  DRAFT: "",
  CONFIRMED: "text-blue-600",
  PARTIALLY_DELIVERED: "text-orange-600",
  DELIVERED: "text-green-600 border-green-300",
  CANCELLED: "",
  PRICE_ADJUSTMENT_REQUESTED: "text-orange-700 border-orange-300",
};

function PaymentBadge({ status }: { status?: PaymentStatus }) {
  if (!status || status === "UNPAID")
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 border border-red-200">Chưa thanh toán</span>;
  return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">Đã thanh toán</span>;
}

const itemSchema = z.object({
  productId: z.string().min(1, "Chọn sản phẩm"),
  quantity: z.string().refine((v) => Number.isInteger(Number(v)) && Number(v) > 0, "Số lượng phải là số nguyên dương"),
  unitPrice: z.string().refine((v) => Number.isInteger(Number(v)) && Number(v) > 0, "Đơn giá phải là số nguyên dương"),
  discountPercent: z.string().optional().refine((v) => !v || (Number(v) >= 0 && Number(v) <= 100), "CK 0–100"),
});

const schema = z.object({
  customerId: z.string().min(1, "Chọn khách hàng"),
  notes: z.string().optional(),
  items: z.array(itemSchema).min(1),
});

type FormValues = z.infer<typeof schema>;

type AdjustItem = {
  productId: number;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
};

export default function SalesOrdersPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);

  // Request price adjustment dialog (Manager)
  const [requestAdjustTarget, setRequestAdjustTarget] = useState<number | null>(null);
  const [requestAdjustReason, setRequestAdjustReason] = useState("");

  // Adjust prices dialog (Saler)
  const [adjustPriceOrderId, setAdjustPriceOrderId] = useState<number | null>(null);
  const [adjustPriceItems, setAdjustPriceItems] = useState<AdjustItem[]>([]);

  const { hasPermission } = useAuthStore();
  const qc = useQueryClient();
  const { t } = useLanguage();

  const canCreate = hasPermission("sales.order.create");
  const canApprove = hasPermission("sales.order.approve");

  // ─── Queries ──────────────────────────────────────────────────────────────

  const { data, isLoading } = useQuery({
    queryKey: ["orders", page, search, statusFilter],
    queryFn: () =>
      listOrders({ page, limit: 20, search: search || undefined, status: statusFilter !== "all" ? statusFilter : undefined }).then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const { data: customers } = useQuery({
    queryKey: ["customers-list"],
    queryFn: () => listCustomers({ limit: 200 }).then((r) => r.data),
    enabled: showCreate,
  });

  // Fetch full order detail when adjust-prices dialog is triggered
  const { data: adjustOrderDetail, isFetching: loadingAdjustDetail } = useQuery({
    queryKey: ["order-detail-adjust", adjustPriceOrderId],
    queryFn: () => getOrder(adjustPriceOrderId!).then((r) => r.data),
    enabled: adjustPriceOrderId !== null,
  });

  useEffect(() => {
    if (adjustOrderDetail?.items) {
      setAdjustPriceItems(
        adjustOrderDetail.items.map((i) => ({
          productId: i.product.id,
          productName: i.product.productName,
          sku: i.product.sku,
          quantity: Number(i.quantity),
          unitPrice: Number(i.unitPrice),
          discountPercent: Number((i as any).discountPercent ?? 0),
        })),
      );
    }
  }, [adjustOrderDetail]);

  // ─── Form ─────────────────────────────────────────────────────────────────

  const { handleSubmit, setValue, reset, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { items: [{ productId: "", quantity: "1", unitPrice: "0" }] },
  });

  const items = watch("items");

  // ─── Mutations ────────────────────────────────────────────────────────────

  const invalidate = () => qc.invalidateQueries({ queryKey: ["orders"] });

  const createMut = useMutation({
    mutationFn: (v: FormValues) =>
      createOrder({
        customerId: parseInt(v.customerId),
        notes: v.notes || undefined,
        items: v.items.map((i) => ({
          productId: parseInt(i.productId),
          quantity: parseInt(i.quantity, 10),
          unitPrice: parseInt(i.unitPrice, 10),
          discountPercent: i.discountPercent ? parseFloat(i.discountPercent) : undefined,
        })),
      }).then((r) => r.data),
    onSuccess: () => {
      toast.success(t.orders.orderCreated);
      invalidate();
      setShowCreate(false);
      reset({ items: [{ productId: "", quantity: "1", unitPrice: "0" }] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Tạo đơn hàng thất bại"),
  });

  const confirmMut = useMutation({
    mutationFn: (id: number) => confirmOrder(id),
    onSuccess: () => { toast.success(t.orders.confirmed); invalidate(); },
    onError: () => toast.error("Xác nhận đơn thất bại"),
  });

  const cancelMut = useMutation({
    mutationFn: (id: number) => cancelOrder(id),
    onSuccess: () => { toast.success(t.orders.cancelledMsg); invalidate(); },
    onError: () => toast.error("Hủy đơn thất bại"),
  });

  const paymentMut = useMutation({
    mutationFn: (id: number) => confirmPayment(id),
    onSuccess: () => { toast.success("Đã xác nhận thanh toán"); invalidate(); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Xác nhận thanh toán thất bại"),
  });

  const requestAdjustMut = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      requestPriceAdjustment(id, reason || undefined),
    onSuccess: () => {
      toast.success("Đã gửi yêu cầu điều chỉnh giá cho nhân viên");
      invalidate();
      setRequestAdjustTarget(null);
      setRequestAdjustReason("");
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Yêu cầu thất bại"),
  });

  const adjustPricesMut = useMutation({
    mutationFn: ({ id, items }: { id: number; items: AdjustItem[] }) =>
      adjustOrderPrices(id, items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        discountPercent: i.discountPercent,
      }))),
    onSuccess: () => {
      toast.success("Đã điều chỉnh giá — đơn hàng đang chờ quản lý xác nhận lại");
      invalidate();
      setAdjustPriceOrderId(null);
      setAdjustPriceItems([]);
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Điều chỉnh giá thất bại"),
  });

  const STATUS_LABELS: Record<SalesOrderStatus, string> = {
    DRAFT: t.common.draft,
    CONFIRMED: "Đã xác nhận",
    PARTIALLY_DELIVERED: "Giao 1 phần",
    DELIVERED: "Đã giao",
    CANCELLED: t.common.cancelled,
    PRICE_ADJUSTMENT_REQUESTED: "Chờ điều chỉnh",
  };

  function handleProductChange(idx: number, productId: string, product?: Product) {
    setValue(`items.${idx}.productId`, productId);
    if (product?.standardPrice) setValue(`items.${idx}.unitPrice`, String(product.standardPrice));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ShoppingCart className="h-7 w-7 text-muted-foreground" />
            {t.orders.title}
          </h1>
          <p className="text-muted-foreground mt-1">{t.orders.subtitle}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/sales/quotations"><Button variant="outline" size="sm">{t.quotations.title}</Button></Link>
          <Link href="/sales/deliveries"><Button variant="outline" size="sm">{t.deliveries.title}</Button></Link>
          {canCreate && (
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4" />
              {t.orders.newOrder}
            </Button>
          )}
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
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.orders.allStatuses}</SelectItem>
                <SelectItem value="DRAFT">{t.common.draft}</SelectItem>
                <SelectItem value="CONFIRMED">Đã xác nhận</SelectItem>
                <SelectItem value="PRICE_ADJUSTMENT_REQUESTED">Chờ điều chỉnh</SelectItem>
                <SelectItem value="PARTIALLY_DELIVERED">Giao 1 phần</SelectItem>
                <SelectItem value="DELIVERED">Đã giao</SelectItem>
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
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">Số đơn</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">Khách hàng</th>
                    {canApprove && <th className="h-10 px-6 text-left font-medium text-muted-foreground">Trạng thái</th>}
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">Thanh toán</th>
                    <th className="h-10 px-6 text-right font-medium text-muted-foreground">Tổng tiền</th>
                    <th className="h-10 px-6 text-center font-medium text-muted-foreground">Giao hàng</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">Ngày đặt</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.items.map((o) => (
                    <tr key={o.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-3">
                        <div className="font-mono text-xs font-medium">{o.orderNumber}</div>
                        {o.quotation && (
                          <div className="text-xs text-muted-foreground">từ {o.quotation.quotationNumber}</div>
                        )}
                        {/* Show "Chờ điều chỉnh" indicator for Saler (no status column) */}
                        {!canApprove && o.status === "PRICE_ADJUSTMENT_REQUESTED" && (
                          <div className="flex items-center gap-1 text-xs text-orange-700 mt-0.5">
                            <AlertCircle className="h-3 w-3" /> Chờ điều chỉnh
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-3">
                        <div className="font-medium">{o.customer.companyName}</div>
                        <div className="text-xs text-muted-foreground">{o.customer.customerCode}</div>
                      </td>
                      {canApprove && (
                        <td className="px-6 py-3">
                          <Badge variant={STATUS_VARIANTS[o.status as SalesOrderStatus] as any} className={STATUS_COLORS[o.status as SalesOrderStatus]}>
                            {STATUS_LABELS[o.status as SalesOrderStatus]}
                          </Badge>
                        </td>
                      )}
                      <td className="px-6 py-3">
                        <PaymentBadge status={(o as any).paymentStatus} />
                      </td>
                      <td className="px-6 py-3 text-right">
                        <div className="font-semibold tabular-nums">{vnd(Number(o.totalAmount))}</div>
                        {Number(o.subtotal) !== Number(o.totalAmount) && (
                          <div className="text-xs text-muted-foreground">Trước thuế: {vnd(Number(o.subtotal))}</div>
                        )}
                      </td>
                      <td className="px-6 py-3 text-center">
                        <span className={`text-sm font-medium ${(o._count?.deliveries ?? 0) > 0 ? "text-blue-600" : "text-muted-foreground"}`}>
                          {o._count?.deliveries ?? 0}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-muted-foreground text-xs">
                        {new Date(o.orderedAt).toLocaleDateString("vi-VN")}
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-1 flex-wrap">

                          {/* ── Manager actions ── */}
                          {canApprove && o.status === "DRAFT" && (
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1 text-green-600 hover:text-green-700"
                              onClick={() => confirmMut.mutate(o.id)} disabled={confirmMut.isPending}>
                              <CheckCircle className="h-3 w-3" /> Xác nhận
                            </Button>
                          )}

                          {canApprove && o.status === "CONFIRMED" && (
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1 text-orange-600 hover:text-orange-700"
                              onClick={() => { setRequestAdjustTarget(o.id); setRequestAdjustReason(""); }}>
                              <Edit2 className="h-3 w-3" /> Yêu cầu điều chỉnh giá
                            </Button>
                          )}

                          {/* ── Saler actions ── */}
                          {canCreate && !canApprove && o.status === "PRICE_ADJUSTMENT_REQUESTED" && (
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1 text-orange-600 hover:text-orange-700"
                              onClick={() => { setAdjustPriceItems([]); setAdjustPriceOrderId(o.id); }}>
                              <Edit2 className="h-3 w-3" /> Điều chỉnh lại
                            </Button>
                          )}

                          {/* ── Shared: Giao hàng ── */}
                          {["CONFIRMED", "PARTIALLY_DELIVERED"].includes(o.status) && (
                            <Link href="/sales/deliveries">
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1 text-blue-600 hover:text-blue-700">
                                <Truck className="h-3 w-3" /> Giao hàng
                              </Button>
                            </Link>
                          )}

                          {/* ── Shared: Xác nhận thanh toán (Manager + Saler) ── */}
                          {(canApprove || canCreate) && (o as any).paymentStatus === "UNPAID" && !["CANCELLED", "DRAFT", "PRICE_ADJUSTMENT_REQUESTED"].includes(o.status) && (
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1 text-emerald-700 hover:text-emerald-800"
                              onClick={() => paymentMut.mutate(o.id)} disabled={paymentMut.isPending}>
                              <CheckCircle className="h-3 w-3" /> Xác nhận thanh toán
                            </Button>
                          )}

                          {/* ── Shared: Hủy ── */}
                          {!["CANCELLED", "DELIVERED", "PRICE_ADJUSTMENT_REQUESTED"].includes(o.status) && (
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1 text-red-600 hover:text-red-700"
                              onClick={() => cancelMut.mutate(o.id)} disabled={cancelMut.isPending}>
                              <XCircle className="h-3 w-3" /> Hủy
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {data?.items.length === 0 && (
                    <tr><td colSpan={canApprove ? 8 : 7} className="py-12 text-center text-muted-foreground">{t.orders.noOrders}</td></tr>
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

      {/* ─── Request Price Adjustment Dialog (Manager) ─────────────────────────── */}
      <Dialog open={requestAdjustTarget !== null} onOpenChange={(v) => { if (!v) { setRequestAdjustTarget(null); setRequestAdjustReason(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Yêu cầu điều chỉnh giá đơn hàng</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <p className="text-sm text-muted-foreground">Nhân viên kinh doanh sẽ được thông báo để điều chỉnh lại giá và gửi lên duyệt.</p>
            <Label>Lý do (tuỳ chọn)</Label>
            <Textarea
              value={requestAdjustReason}
              onChange={(e) => setRequestAdjustReason(e.target.value)}
              placeholder="Nhập lý do yêu cầu điều chỉnh..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRequestAdjustTarget(null); setRequestAdjustReason(""); }}>
              {t.common.cancel}
            </Button>
            <Button
              disabled={requestAdjustMut.isPending}
              onClick={() => {
                if (requestAdjustTarget === null) return;
                requestAdjustMut.mutate({ id: requestAdjustTarget, reason: requestAdjustReason });
              }}>
              {requestAdjustMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Gửi yêu cầu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Adjust Prices Dialog (Saler) ──────────────────────────────────────── */}
      <Dialog open={adjustPriceOrderId !== null} onOpenChange={(v) => { if (!v) { setAdjustPriceOrderId(null); setAdjustPriceItems([]); } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Điều chỉnh lại giá đơn hàng</DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Sau khi điều chỉnh, đơn hàng sẽ tự động gửi lên quản lý để xét duyệt lại.
            </p>
          </DialogHeader>

          {loadingAdjustDetail || adjustPriceItems.length === 0 ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Đang tải dữ liệu...</span>
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-[2fr_80px_130px_100px] gap-2 text-xs font-medium text-muted-foreground">
                <span>Sản phẩm</span>
                <span>SL</span>
                <span>Đơn giá (₫)</span>
                <span>CK (%)</span>
              </div>
              {adjustPriceItems.map((item, idx) => (
                <div key={idx} className="grid grid-cols-[2fr_80px_130px_100px] gap-2 items-center">
                  <div>
                    <div className="font-medium text-sm">{item.productName}</div>
                    <div className="text-xs text-muted-foreground font-mono">{item.sku}</div>
                  </div>
                  <Input
                    type="number" min="1" step="1"
                    value={item.quantity}
                    onChange={(e) => setAdjustPriceItems((prev) => prev.map((it, i) => i === idx ? { ...it, quantity: Number(e.target.value) } : it))}
                  />
                  <Input
                    type="number" min="0" step="1000"
                    value={item.unitPrice}
                    onChange={(e) => setAdjustPriceItems((prev) => prev.map((it, i) => i === idx ? { ...it, unitPrice: Number(e.target.value) } : it))}
                  />
                  <Input
                    type="number" min="0" max="100" step="1"
                    value={item.discountPercent}
                    onChange={(e) => setAdjustPriceItems((prev) => prev.map((it, i) => i === idx ? { ...it, discountPercent: Number(e.target.value) } : it))}
                  />
                </div>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setAdjustPriceOrderId(null); setAdjustPriceItems([]); }}>{t.common.cancel}</Button>
            <Button
              disabled={adjustPricesMut.isPending || adjustPriceItems.length === 0 || loadingAdjustDetail}
              onClick={() => {
                if (!adjustPriceOrderId) return;
                adjustPricesMut.mutate({ id: adjustPriceOrderId, items: adjustPriceItems });
              }}>
              {adjustPricesMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Gửi lại chờ duyệt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Create Order Dialog ────────────────────────────────────────────────── */}
      <Dialog open={showCreate} onOpenChange={(v) => { setShowCreate(v); if (!v) reset({ items: [{ productId: "", quantity: "1", unitPrice: "0" }] }); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t.orders.createTitle}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit((v) => createMut.mutate(v))} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Khách hàng *</Label>
                <Select onValueChange={(v) => setValue("customerId", v)}>
                  <SelectTrigger><SelectValue placeholder="Chọn khách hàng" /></SelectTrigger>
                  <SelectContent>
                    {customers?.items.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.companyName}
                        <span className="text-xs text-muted-foreground ml-1">({c.customerCode})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.customerId && <p className="text-xs text-destructive">{errors.customerId.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Ghi chú</Label>
                <Input placeholder="Ghi chú thêm..." onChange={(e) => setValue("notes", e.target.value)} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Sản phẩm *</Label>
                <Button type="button" variant="outline" size="sm"
                  onClick={() => setValue("items", [...(items ?? []), { productId: "", quantity: "1", unitPrice: "0" }])}>
                  <Plus className="h-3.5 w-3.5" /> Thêm SP
                </Button>
              </div>
              <div className="space-y-2">
                <div className="grid grid-cols-[2fr_64px_100px_80px_32px] gap-2">
                  <span className="text-xs text-muted-foreground font-medium">Sản phẩm (SKU)</span>
                  <span className="text-xs text-muted-foreground font-medium">SL</span>
                  <span className="text-xs text-muted-foreground font-medium">Đơn giá (₫)</span>
                  <span className="text-xs text-muted-foreground font-medium">CK (%)</span>
                  <span />
                </div>
                {(items ?? []).map((item, idx) => (
                  <div key={idx} className="grid grid-cols-[2fr_64px_100px_80px_32px] gap-2 items-center">
                    <ProductSelect
                      value={item.productId}
                      onChange={(pid, prod) => handleProductChange(idx, pid, prod)}
                    />
                    <Input type="number" min="1" step="1" placeholder="1"
                      onChange={(e) => setValue(`items.${idx}.quantity`, e.target.value)}
                      defaultValue="1"
                    />
                    <Input type="number" min="1" step="1000" placeholder="0"
                      onChange={(e) => setValue(`items.${idx}.unitPrice`, e.target.value)}
                      value={item.unitPrice}
                    />
                    <Input type="number" min="0" max="100" step="1" placeholder="0"
                      onChange={(e) => setValue(`items.${idx}.discountPercent`, e.target.value)}
                    />
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
              <Button type="button" variant="outline" onClick={() => { setShowCreate(false); reset({ items: [{ productId: "", quantity: "1", unitPrice: "0" }] }); }}>
                {t.common.cancel}
              </Button>
              <Button type="submit" disabled={createMut.isPending}>
                {createMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Tạo đơn hàng
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
