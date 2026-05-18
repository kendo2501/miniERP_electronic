"use client";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search, Loader2, ShoppingCart,
  CheckCircle2, CheckCircle, XCircle, Edit2, AlertCircle, Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  listOrders, confirmPayment,
  confirmOrder, cancelOrder, requestPriceAdjustment, adjustOrderPrices, getOrder, confirmReapproval,
  startDelivery, completeDelivery,
} from "@/lib/api/sales";
import type { SalesOrderStatus, PaymentStatus, DeliveryStatus } from "@/types/sales";
import { vnd } from "@/lib/format";
import { useAuthStore } from "@/store/auth.store";
import { useLanguage } from "@/context/language-context";
import Link from "next/link";

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_VARIANTS: Record<SalesOrderStatus, string> = {
  DRAFT: "secondary",
  CONFIRMED: "default",
  PARTIALLY_DELIVERED: "warning",
  DELIVERED: "outline",
  CANCELLED: "destructive",
  PRICE_ADJUSTMENT_REQUESTED: "warning",
  PENDING_REAPPROVAL: "warning",
} as any;

const STATUS_COLORS: Record<SalesOrderStatus, string> = {
  DRAFT: "",
  CONFIRMED: "text-blue-600",
  PARTIALLY_DELIVERED: "text-orange-600",
  DELIVERED: "text-green-600 border-green-300",
  CANCELLED: "",
  PRICE_ADJUSTMENT_REQUESTED: "text-orange-700 border-orange-300",
  PENDING_REAPPROVAL: "text-purple-700 border-purple-300",
};

// ─── Payment badge ─────────────────────────────────────────────────────────────

function PaymentBadge({ status, unpaidLabel, paidLabel }: { status?: PaymentStatus; unpaidLabel: string; paidLabel: string }) {
  if (!status || status === "UNPAID")
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 border border-red-200">
        {unpaidLabel}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">
      <CheckCircle2 className="h-3 w-3" /> {paidLabel}
    </span>
  );
}

// ─── Delivery badge ────────────────────────────────────────────────────────────

function DeliveryBadge({ status, pendingLabel, inTransitLabel, doneLabel }: { status?: DeliveryStatus; pendingLabel: string; inTransitLabel: string; doneLabel: string }) {
  if (!status || status === "PENDING")
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
        {pendingLabel}
      </span>
    );
  if (status === "IN_TRANSIT")
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200">
        <Truck className="h-3 w-3" /> {inTransitLabel}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700 border border-green-200">
      <CheckCircle2 className="h-3 w-3" /> {doneLabel}
    </span>
  );
}

type AdjustItem = {
  productId: number;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
};

// Trạng thái chặn xác nhận thanh toán
const NO_PAYMENT_STATUSES: SalesOrderStatus[] = [
  "CANCELLED", "DRAFT", "PRICE_ADJUSTMENT_REQUESTED", "PENDING_REAPPROVAL",
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SalesOrdersPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");

  // Admin: yêu cầu điều chỉnh giá
  const [requestAdjustTarget, setRequestAdjustTarget] = useState<{ id: number; status: SalesOrderStatus } | null>(null);
  const [requestAdjustReason, setRequestAdjustReason] = useState("");

  // Sale: điều chỉnh lại giá
  const [adjustPriceOrderId, setAdjustPriceOrderId] = useState<number | null>(null);
  const [adjustPriceItems, setAdjustPriceItems] = useState<AdjustItem[]>([]);

  const { hasPermission, hasRole } = useAuthStore();
  const qc = useQueryClient();
  const { t } = useLanguage();

  const canCreate = hasPermission("sales.order.create");
  const canApprove = hasPermission("sales.order.approve");
  const canShowRestrictedActions = !hasRole("admin") && !hasRole("saler");

  // ─── Queries ──────────────────────────────────────────────────────────────

  const { data, isLoading } = useQuery({
    queryKey: ["orders", page, search, statusFilter],
    queryFn: () =>
      listOrders({
        page, limit: 20,
        search: search || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
      }).then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const { data: adjustOrderDetail, isFetching: loadingAdjustDetail } = useQuery({
    queryKey: ["order-detail-adjust", adjustPriceOrderId],
    queryFn: () => getOrder(adjustPriceOrderId!).then((r) => r.data),
    enabled: adjustPriceOrderId !== null,
  });

  useEffect(() => {
    if (adjustOrderDetail?.items) {
      setAdjustPriceItems(
        adjustOrderDetail.items.map((i: any) => ({
          productId: i.product.id,
          productName: i.product.productName,
          sku: i.product.sku,
          quantity: Number(i.quantity),
          unitPrice: Number(i.unitPrice),
          discountPercent: Number(i.discountPercent ?? 0),
        })),
      );
    }
  }, [adjustOrderDetail]);

  // ─── Mutations ────────────────────────────────────────────────────────────

  const invalidate = () => qc.invalidateQueries({ queryKey: ["orders"] });

  // Admin: xác nhận giá (DRAFT → CONFIRMED hoặc PENDING_REAPPROVAL → CONFIRMED)
  const confirmPriceMut = useMutation({
    mutationFn: ({ id, orderStatus }: { id: number; orderStatus: SalesOrderStatus }) =>
      orderStatus === "PENDING_REAPPROVAL" ? confirmReapproval(id) : confirmOrder(id),
    onSuccess: () => { toast.success(t.orders.confirmed); invalidate(); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? t.orders.confirmPrice),
  });

  // Admin: hủy đơn (chỉ khi CONFIRMED)
  const cancelMut = useMutation({
    mutationFn: (id: number) => cancelOrder(id),
    onSuccess: () => { toast.success(t.orders.cancelledMsg); invalidate(); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? t.orders.cancelledMsg),
  });

  // Admin: gửi yêu cầu điều chỉnh giá
  const requestAdjustMut = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      requestPriceAdjustment(id, reason || undefined),
    onSuccess: () => {
      toast.success(t.orders.requestAdjust);
      invalidate();
      setRequestAdjustTarget(null);
      setRequestAdjustReason("");
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? t.orders.requestAdjust),
  });

  // Sale: điều chỉnh lại giá
  const adjustPricesMut = useMutation({
    mutationFn: ({ id, items }: { id: number; items: AdjustItem[] }) =>
      adjustOrderPrices(id, items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        discountPercent: i.discountPercent,
      }))),
    onSuccess: () => {
      toast.success(t.orders.adjustPriceBtn);
      invalidate();
      setAdjustPriceOrderId(null);
      setAdjustPriceItems([]);
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? t.orders.adjustPriceBtn),
  });

  const paymentMut = useMutation({
    mutationFn: (id: number) => confirmPayment(id),
    onSuccess: () => { toast.success(t.orders.confirmPaymentBtn); invalidate(); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? t.orders.confirmPaymentBtn),
  });

  const startDeliveryMut = useMutation({
    mutationFn: (id: number) => startDelivery(id),
    onSuccess: () => { toast.success(t.orders.startDeliveryBtn); invalidate(); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? t.orders.startDeliveryBtn),
  });

  const completeDeliveryMut = useMutation({
    mutationFn: (id: number) => completeDelivery(id),
    onSuccess: () => { toast.success(t.orders.completeDeliveryBtn); invalidate(); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? t.orders.completeDeliveryBtn),
  });

  // ─── Status labels ─────────────────────────────────────────────────────────

  const STATUS_LABELS: Record<SalesOrderStatus, string> = {
    DRAFT: t.common.draft,
    CONFIRMED: t.orders.statusConfirmed,
    PARTIALLY_DELIVERED: t.orders.statusPartialDelivery,
    DELIVERED: t.orders.statusDelivered,
    CANCELLED: t.common.cancelled,
    PRICE_ADJUSTMENT_REQUESTED: t.orders.statusPriceAdj,
    PENDING_REAPPROVAL: t.orders.statusPendingReapproval,
  };

  function calcAdjustTotal() {
    return adjustPriceItems.reduce((sum, i) => {
      const disc = i.quantity * i.unitPrice * (i.discountPercent / 100);
      return sum + i.quantity * i.unitPrice - disc;
    }, 0);
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
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
        </div>
      </div>

      {/* ── Table card ── */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t.orders.searchPlaceholder}
                className="pl-9"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.orders.allStatuses}</SelectItem>
                <SelectItem value="DRAFT">{t.common.draft}</SelectItem>
                <SelectItem value="CONFIRMED">{t.orders.statusConfirmed}</SelectItem>
                <SelectItem value="PRICE_ADJUSTMENT_REQUESTED">{t.orders.statusPriceAdj}</SelectItem>
                <SelectItem value="PENDING_REAPPROVAL">{t.orders.statusPendingReapproval}</SelectItem>
                <SelectItem value="PARTIALLY_DELIVERED">{t.orders.statusPartialDelivery}</SelectItem>
                <SelectItem value="DELIVERED">{t.orders.statusDelivered}</SelectItem>
                <SelectItem value="CANCELLED">{t.common.cancelled}</SelectItem>
              </SelectContent>
            </Select>
            {data && (
              <span className="text-sm text-muted-foreground ml-auto">
                {data.total} {t.orders.totalOrders}
              </span>
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
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.orders.orderNumber}</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.common.customer}</th>
                    {canApprove && (
                      <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.common.status}</th>
                    )}
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.orders.deliveryHeader}</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.orders.paymentStatus}</th>
                    <th className="h-10 px-6 text-right font-medium text-muted-foreground">{t.orders.total}</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.orders.orderDateHeader}</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.common.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.items.map((o) => {
                    const orderStatus = o.status as SalesOrderStatus;
                    const payStatus = (o as any).paymentStatus as PaymentStatus | undefined;
                    const delivStatus = (o as any).deliveryStatus as DeliveryStatus | undefined;
                    const isUnpaid = !payStatus || payStatus === "UNPAID";
                    const canPay = (canApprove || canCreate)
                      && isUnpaid
                      && !NO_PAYMENT_STATUSES.includes(orderStatus);
                    const canStartDelivery = (canApprove || canCreate)
                      && orderStatus === "CONFIRMED"
                      && (!delivStatus || delivStatus === "PENDING");
                    const canCompleteDelivery = (canApprove || canCreate)
                      && delivStatus === "IN_TRANSIT";

                    return (
                      <tr key={o.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-3">
                          <div className="font-mono text-xs font-medium">{o.orderNumber}</div>
                          {o.quotation && (
                            <div className="text-xs text-muted-foreground">{t.orders.fromQuotation} {o.quotation.quotationNumber}</div>
                          )}
                          {!canApprove && orderStatus === "PRICE_ADJUSTMENT_REQUESTED" && (
                            <div className="inline-flex items-center gap-1 text-xs mt-1 px-1.5 py-0.5 rounded text-orange-700 bg-orange-50 border border-orange-200">
                              <AlertCircle className="h-3 w-3" /> {t.orders.needsAdjustment}
                            </div>
                          )}
                        </td>

                        {/* Khách hàng */}
                        <td className="px-6 py-3">
                          <div className="font-medium">{o.customer.companyName}</div>
                          <div className="text-xs text-muted-foreground">{o.customer.customerCode}</div>
                        </td>

                        {/* Trạng thái — Admin only */}
                        {canApprove && (
                          <td className="px-6 py-3">
                            <Badge
                              variant={STATUS_VARIANTS[orderStatus] as any}
                              className={STATUS_COLORS[orderStatus]}
                            >
                              {STATUS_LABELS[orderStatus]}
                            </Badge>
                          </td>
                        )}

                        <td className="px-6 py-3">
                          <DeliveryBadge
                            status={delivStatus}
                            pendingLabel={t.orders.deliveryPending}
                            inTransitLabel={t.orders.deliveryInTransit}
                            doneLabel={t.orders.deliveryDone}
                          />
                        </td>

                        <td className="px-6 py-3">
                          <PaymentBadge
                            status={payStatus}
                            unpaidLabel={t.orders.paymentUnpaid}
                            paidLabel={t.orders.paymentPaid}
                          />
                          {payStatus === "PAID" && (o as any).paidAt && (
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {new Date((o as any).paidAt).toLocaleDateString("vi-VN")}
                            </div>
                          )}
                        </td>

                        <td className="px-6 py-3 text-right">
                          <div className="font-semibold tabular-nums">{vnd(Number(o.totalAmount))}</div>
                          {Number(o.subtotal) !== Number(o.totalAmount) && (
                            <div className="text-xs text-muted-foreground">
                              {t.orders.preTaxLabel}: {vnd(Number(o.subtotal))}
                            </div>
                          )}
                        </td>

                        <td className="px-6 py-3 text-muted-foreground text-xs">
                          {new Date(o.orderedAt).toLocaleDateString("vi-VN")}
                        </td>

                        <td className="px-6 py-3">
                          <div className="flex items-center gap-1 flex-wrap">

                            {canApprove && ["DRAFT", "PENDING_REAPPROVAL"].includes(orderStatus) && (
                              <Button
                                size="sm" variant="ghost"
                                className="h-7 px-2 text-xs gap-1 text-green-600 hover:text-green-700"
                                onClick={() => confirmPriceMut.mutate({ id: o.id, orderStatus })}
                                disabled={confirmPriceMut.isPending}
                              >
                                <CheckCircle className="h-3 w-3" /> {t.orders.confirmPrice}
                              </Button>
                            )}

                            {canApprove && canShowRestrictedActions && ["DRAFT", "CONFIRMED", "PENDING_REAPPROVAL"].includes(orderStatus) && (
                              <Button
                                size="sm" variant="ghost"
                                className="h-7 px-2 text-xs gap-1 text-orange-600 hover:text-orange-700"
                                onClick={() => { setRequestAdjustTarget({ id: o.id, status: orderStatus }); setRequestAdjustReason(""); }}
                              >
                                <Edit2 className="h-3 w-3" /> {t.orders.requestAdjust}
                              </Button>
                            )}

                            {canApprove && canShowRestrictedActions && orderStatus === "CONFIRMED" && (
                              <Button
                                size="sm" variant="ghost"
                                className="h-7 px-2 text-xs gap-1 text-red-600 hover:text-red-700"
                                onClick={() => cancelMut.mutate(o.id)}
                                disabled={cancelMut.isPending}
                              >
                                <XCircle className="h-3 w-3" /> {t.common.cancel}
                              </Button>
                            )}

                            {canCreate && !canApprove && orderStatus === "PRICE_ADJUSTMENT_REQUESTED" && (
                              <Button
                                size="sm" variant="ghost"
                                className="h-7 px-2 text-xs gap-1 text-orange-600 hover:text-orange-700 border border-orange-200 bg-orange-50"
                                onClick={() => { setAdjustPriceItems([]); setAdjustPriceOrderId(o.id); }}
                              >
                                <Edit2 className="h-3 w-3" /> {t.orders.adjustPriceBtn}
                              </Button>
                            )}

                            {canStartDelivery && (
                              <Button
                                size="sm" variant="ghost"
                                className="h-7 px-2 text-xs gap-1 text-orange-600 hover:text-orange-700"
                                onClick={() => startDeliveryMut.mutate(o.id)}
                                disabled={startDeliveryMut.isPending}
                              >
                                <Truck className="h-3 w-3" /> {t.orders.startDeliveryBtn}
                              </Button>
                            )}

                            {canCompleteDelivery && (
                              <Button
                                size="sm" variant="ghost"
                                className="h-7 px-2 text-xs gap-1 text-green-600 hover:text-green-700"
                                onClick={() => completeDeliveryMut.mutate(o.id)}
                                disabled={completeDeliveryMut.isPending}
                              >
                                <CheckCircle className="h-3 w-3" /> {t.orders.completeDeliveryBtn}
                              </Button>
                            )}

                            {canPay && (
                              <Button
                                size="sm"
                                className="h-7 px-2.5 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm"
                                onClick={() => paymentMut.mutate(o.id)}
                                disabled={paymentMut.isPending}
                              >
                                {paymentMut.isPending
                                  ? <Loader2 className="h-3 w-3 animate-spin" />
                                  : <CheckCircle2 className="h-3 w-3" />
                                }
                                {t.orders.confirmPaymentBtn}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {data?.items.length === 0 && (
                    <tr>
                      <td
                        colSpan={canApprove ? 8 : 7}
                        className="py-12 text-center text-muted-foreground"
                      >
                        {t.orders.noOrders}
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

      {/* ─── Dialog: Yêu cầu điều chỉnh giá (Admin) — không render với Admin & Saler ── */}
      <Dialog
        open={requestAdjustTarget !== null && canShowRestrictedActions}
        onOpenChange={(v) => { if (!v) { setRequestAdjustTarget(null); setRequestAdjustReason(""); } }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Yêu cầu điều chỉnh giá</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <p className="text-sm text-muted-foreground">
              Nhân viên kinh doanh và khách hàng sẽ được thông báo để điều chỉnh lại giá.
            </p>
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
                if (!requestAdjustTarget) return;
                requestAdjustMut.mutate({ id: requestAdjustTarget.id, reason: requestAdjustReason });
              }}
            >
              {requestAdjustMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Gửi yêu cầu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Dialog: Điều chỉnh lại giá (Sale) ────────────────────────────────── */}
      <Dialog
        open={adjustPriceOrderId !== null}
        onOpenChange={(v) => { if (!v) { setAdjustPriceOrderId(null); setAdjustPriceItems([]); } }}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Điều chỉnh lại giá đơn hàng</DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Sau khi điều chỉnh, đơn hàng sẽ tự động chờ Admin xác nhận lại.
            </p>
          </DialogHeader>

          {loadingAdjustDetail || adjustPriceItems.length === 0 ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Đang tải dữ liệu...</span>
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-[2fr_80px_130px_100px] gap-2 text-xs font-medium text-muted-foreground border-b pb-2">
                <span>Sản phẩm</span>
                <span>Số lượng</span>
                <span>Đơn giá (₫)</span>
                <span>Chiết khấu (%)</span>
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
                    onChange={(e) =>
                      setAdjustPriceItems((prev) =>
                        prev.map((it, i) => i === idx ? { ...it, quantity: Number(e.target.value) } : it))
                    }
                  />
                  <Input
                    type="number" min="0" step="1000"
                    value={item.unitPrice}
                    onChange={(e) =>
                      setAdjustPriceItems((prev) =>
                        prev.map((it, i) => i === idx ? { ...it, unitPrice: Number(e.target.value) } : it))
                    }
                  />
                  <Input
                    type="number" min="0" max="100" step="1"
                    value={item.discountPercent}
                    onChange={(e) =>
                      setAdjustPriceItems((prev) =>
                        prev.map((it, i) => i === idx ? { ...it, discountPercent: Number(e.target.value) } : it))
                    }
                  />
                </div>
              ))}

              <div className="border-t pt-3 flex justify-end gap-2 items-center">
                <span className="text-sm text-muted-foreground">Tổng ước tính:</span>
                <span className="font-semibold text-base tabular-nums">{vnd(calcAdjustTotal())}</span>
              </div>

              {adjustPriceItems.some((i) => i.unitPrice <= 0 || i.quantity <= 0) && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Đơn giá và số lượng phải lớn hơn 0
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setAdjustPriceOrderId(null); setAdjustPriceItems([]); }}
            >
              {t.common.cancel}
            </Button>
            <Button
              disabled={
                adjustPricesMut.isPending
                || adjustPriceItems.length === 0
                || loadingAdjustDetail
                || adjustPriceItems.some((i) => i.unitPrice <= 0 || i.quantity <= 0)
              }
              onClick={() => {
                if (!adjustPriceOrderId) return;
                adjustPricesMut.mutate({ id: adjustPriceOrderId, items: adjustPriceItems });
              }}
            >
              {adjustPricesMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Gửi lại chờ duyệt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
