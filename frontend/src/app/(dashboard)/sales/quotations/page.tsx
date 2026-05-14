"use client";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Search, Plus, Loader2, Trash2, CheckCircle, XCircle, FileText, MessageSquare, Edit2, AlertCircle } from "lucide-react";
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
  listQuotations, getQuotation, createQuotation, cancelQuotation, listCustomers,
  submitCounterOffer, acceptCounterOffer, rejectCounterOffer,
  approveQuotation, requestRevision, cancelQuotationWithReason, resubmitQuotation,
} from "@/lib/api/sales";
import { ProductSelect } from "@/components/product-select";
import type { Product } from "@/types/catalog";
import type { Quotation, QuotationStatus } from "@/types/sales";
import { vnd } from "@/lib/format";
import { useAuthStore } from "@/store/auth.store";
import { useLanguage } from "@/context/language-context";
import Link from "next/link";

// ─── Status display ──────────────────────────────────────────────────────────

const STATUS_LABELS: Record<QuotationStatus, string> = {
  PENDING_APPROVAL: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REVISION_REQUESTED: "Yêu cầu chỉnh sửa",
  SENT: "Đã gửi KH",
  CONFIRMED: "Đã xác nhận",
  CANCELLED: "Đã hủy",
};

const STATUS_CLASSES: Record<QuotationStatus, string> = {
  PENDING_APPROVAL: "bg-yellow-100 text-yellow-800 border border-yellow-300",
  APPROVED: "bg-green-100 text-green-800 border border-green-300",
  REVISION_REQUESTED: "bg-orange-100 text-orange-800 border border-orange-300",
  SENT: "bg-blue-100 text-blue-800 border border-blue-300",
  CONFIRMED: "bg-emerald-100 text-emerald-800 border border-emerald-300",
  CANCELLED: "bg-red-100 text-red-800 border border-red-300",
};

// ─── Form schema ─────────────────────────────────────────────────────────────

const itemSchema = z.object({
  productId: z.string().min(1, "Chọn sản phẩm"),
  quantity: z.string().refine((v) => Number.isInteger(Number(v)) && Number(v) > 0, "Số lượng phải là số nguyên dương"),
  unitPrice: z.string().refine((v) => Number(v) > 0, "Đơn giá phải lớn hơn 0"),
  discountPercent: z.string().optional().refine((v) => !v || (Number(v) >= 0 && Number(v) <= 100), "CK 0–100"),
});

const schema = z.object({
  customerId: z.string().min(1, "Chọn khách hàng"),
  validUntil: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(itemSchema).min(1),
});

type FormValues = z.infer<typeof schema>;

// ─── Component ───────────────────────────────────────────────────────────────

export default function QuotationsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);

  // Counter offer dialog
  const [counterOfferTarget, setCounterOfferTarget] = useState<{ id: number; original: number } | null>(null);
  const [counterAmount, setCounterAmount] = useState("");
  const [counterNote, setCounterNote] = useState("");

  // Revision request dialog (Manager)
  const [revisionTarget, setRevisionTarget] = useState<number | null>(null);
  const [revisionReason, setRevisionReason] = useState("");

  // Cancel with reason dialog
  const [cancelTarget, setCancelTarget] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  // Resubmit dialog (Sale after revision) — fetches full quotation on open
  const [resubmitTargetId, setResubmitTargetId] = useState<number | null>(null);
  const [resubmitTarget, setResubmitTarget] = useState<Quotation | null>(null);
  const [resubmitItems, setResubmitItems] = useState<Array<{ productId: number; productName: string; sku: string; quantity: number; unitPrice: number; discountPercent: number }>>([]);

  const { hasPermission } = useAuthStore();
  const qc = useQueryClient();
  const { t } = useLanguage();

  const canCreate = hasPermission("sales.quotation.create");
  const canApprove = hasPermission("sales.quotation.approve");
  const canUpdateOwn = hasPermission("sales.quotation.update_own");

  // ─── Queries ──────────────────────────────────────────────────────────────

  const { data, isLoading } = useQuery({
    queryKey: ["quotations", page, search, statusFilter],
    queryFn: () =>
      listQuotations({ page, limit: 20, search: search || undefined, status: statusFilter !== "all" ? statusFilter : undefined }).then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const { data: customers } = useQuery({
    queryKey: ["customers-list"],
    queryFn: () => listCustomers({ limit: 200 }).then((r) => r.data),
  });

  // Fetch full quotation detail for resubmit (items not in list query)
  const { data: resubmitDetail, isFetching: loadingResubmit } = useQuery({
    queryKey: ["quotation-detail-resubmit", resubmitTargetId],
    queryFn: () => getQuotation(resubmitTargetId!).then((r) => r.data),
    enabled: resubmitTargetId !== null,
  });

  useEffect(() => {
    if (resubmitDetail?.items) {
      setResubmitItems(
        resubmitDetail.items.map((i) => ({
          productId: i.product.id,
          productName: i.product.productName,
          sku: i.product.sku,
          quantity: Number(i.quantity),
          unitPrice: Number(i.unitPrice),
          discountPercent: Number((i as any).discountPercent ?? 0),
        })),
      );
      setResubmitTarget(resubmitDetail as any);
    }
  }, [resubmitDetail]);

  // ─── Form ─────────────────────────────────────────────────────────────────

  const { handleSubmit, setValue, reset, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { items: [{ productId: "", quantity: "1", unitPrice: "0" }] },
  });

  const items = watch("items");

  function handleProductChange(idx: number, productId: string, product?: Product) {
    setValue(`items.${idx}.productId`, productId);
    if (product?.standardPrice) {
      setValue(`items.${idx}.unitPrice`, String(product.standardPrice));
    }
  }

  // ─── Mutations ────────────────────────────────────────────────────────────

  const invalidate = () => qc.invalidateQueries({ queryKey: ["quotations"] });

  const createMut = useMutation({
    mutationFn: (v: FormValues) =>
      createQuotation({
        customerId: parseInt(v.customerId),
        validUntil: v.validUntil || undefined,
        notes: v.notes || undefined,
        items: v.items.map((i) => ({
          productId: parseInt(i.productId),
          quantity: parseFloat(i.quantity),
          unitPrice: parseFloat(i.unitPrice),
          discountPercent: i.discountPercent ? parseFloat(i.discountPercent) : undefined,
        })),
      }).then((r) => r.data),
    onSuccess: () => {
      toast.success("Báo giá đã gửi chờ duyệt");
      invalidate();
      setShowCreate(false);
      reset({ items: [{ productId: "", quantity: "1", unitPrice: "0" }] });
    },
    onError: (e: any) => {
      const msg = e.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? "Tạo báo giá thất bại"));
    },
  });

  // Manager actions
  const approveMut = useMutation({
    mutationFn: (id: number) => approveQuotation(id),
    onSuccess: () => {
      toast.success("Đã duyệt — đơn hàng được tạo tự động và đồng bộ cho khách hàng");
      invalidate();
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Duyệt thất bại"),
  });

  const requestRevisionMut = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => requestRevision(id, reason),
    onSuccess: () => {
      toast.success("Đã yêu cầu chỉnh sửa");
      invalidate();
      setRevisionTarget(null);
      setRevisionReason("");
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Yêu cầu chỉnh sửa thất bại"),
  });

  const cancelWithReasonMut = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => cancelQuotationWithReason(id, reason),
    onSuccess: () => {
      toast.success("Đã hủy báo giá");
      invalidate();
      setCancelTarget(null);
      setCancelReason("");
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Hủy thất bại"),
  });

  // Sale actions
  const resubmitMut = useMutation({
    mutationFn: ({ id, items }: { id: number; items: typeof resubmitItems }) =>
      resubmitQuotation(id, items.map((i) => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice, discountPercent: i.discountPercent }))),
    onSuccess: () => {
      toast.success("Đã gửi lại báo giá chờ duyệt");
      invalidate();
      setResubmitTargetId(null);
      setResubmitTarget(null);
      setResubmitItems([]);
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Gửi lại thất bại"),
  });

  // Counter offer (customer via sales rep)
  const counterOfferMut = useMutation({
    mutationFn: ({ id, proposedAmount, note }: { id: number; proposedAmount: number; note?: string }) =>
      submitCounterOffer(id, { proposedAmount, note }),
    onSuccess: () => {
      toast.success("Đã ghi nhận đề xuất giá — chờ Admin xác nhận");
      invalidate();
      setCounterOfferTarget(null);
      setCounterAmount("");
      setCounterNote("");
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Gửi đề xuất giá thất bại"),
  });

  const acceptOfferMut = useMutation({
    mutationFn: (id: number) => acceptCounterOffer(id),
    onSuccess: () => {
      toast.success("Đã chấp nhận giá đề xuất → Tạo đơn hàng thành công");
      invalidate();
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Chấp nhận giá thất bại"),
  });

  const rejectOfferMut = useMutation({
    mutationFn: (id: number) => rejectCounterOffer(id),
    onSuccess: () => { toast.success("Đã từ chối giá đề xuất"); invalidate(); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Từ chối giá thất bại"),
  });

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-7 w-7 text-muted-foreground" />
            {t.quotations.title}
          </h1>
          <p className="text-muted-foreground mt-1">{t.quotations.subtitle}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/sales/orders"><Button variant="outline" size="sm">{t.orders.title}</Button></Link>
          {canCreate && (
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4" />
              {t.quotations.newQuotation}
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder={t.quotations.searchPlaceholder} className="pl-9" value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.quotations.allStatuses}</SelectItem>
                <SelectItem value="PENDING_APPROVAL">Chờ duyệt</SelectItem>
                <SelectItem value="APPROVED">Đã duyệt</SelectItem>
                <SelectItem value="REVISION_REQUESTED">Yêu cầu chỉnh sửa</SelectItem>
                <SelectItem value="SENT">Đã gửi KH</SelectItem>
                <SelectItem value="CONFIRMED">Đã xác nhận</SelectItem>
                <SelectItem value="CANCELLED">Đã hủy</SelectItem>
              </SelectContent>
            </Select>
            {data && <span className="text-sm text-muted-foreground ml-auto">{data.total} {t.quotations.totalQuotations}</span>}
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
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">Số báo giá</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">Khách hàng</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">Trạng thái</th>
                    <th className="h-10 px-6 text-right font-medium text-muted-foreground">Tổng tiền</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">Hiệu lực đến</th>
                    <th className="h-10 px-6 text-center font-medium text-muted-foreground">SP</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">Ngày tạo</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.items.map((q) => {
                    const isExpired = q.status === "SENT" && q.validUntil && new Date(q.validUntil) < new Date();
                    return (
                      <tr key={q.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-3 font-mono text-xs font-medium">{q.quotationNumber}</td>
                        <td className="px-6 py-3">
                          <div className="font-medium">{q.customer.companyName}</div>
                          <div className="text-xs text-muted-foreground">{q.customer.customerCode}</div>
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex flex-col gap-1">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium w-fit ${STATUS_CLASSES[q.status]}`}>
                              {STATUS_LABELS[q.status]}
                            </span>
                            {q.approvalNotes && q.status === "REVISION_REQUESTED" && (
                              <span className="text-xs text-orange-700 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                {q.approvalNotes}
                              </span>
                            )}
                            {q.cancelReason && q.status === "CANCELLED" && (
                              <span className="text-xs text-red-600">Lý do: {q.cancelReason}</span>
                            )}
                            {q.negotiationStatus === "PROPOSED" && (
                              <Badge variant="secondary" className="text-xs text-purple-700 bg-purple-50 border border-purple-200 w-fit">
                                💬 Đề xuất: {vnd(Number(q.counterOfferAmount))}
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-3 text-right font-semibold tabular-nums">
                          {vnd(Number(q.totalAmount))}
                        </td>
                        <td className="px-6 py-3">
                          {q.validUntil ? (
                            <span className={isExpired ? "text-red-500 text-xs font-medium" : "text-xs text-muted-foreground"}>
                              {isExpired ? "⚠ Hết hạn " : ""}
                              {new Date(q.validUntil).toLocaleDateString("vi-VN")}
                            </span>
                          ) : "—"}
                        </td>
                        <td className="px-6 py-3 text-center text-muted-foreground">{q._count?.items ?? 0}</td>
                        <td className="px-6 py-3 text-muted-foreground text-xs">
                          {new Date(q.createdAt).toLocaleDateString("vi-VN")}
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-1 flex-wrap">
                            {/* Manager: Duyệt / Yêu cầu chỉnh sửa / Hủy khi PENDING_APPROVAL */}
                            {canApprove && q.status === "PENDING_APPROVAL" && (
                              <>
                                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1 text-green-700 hover:text-green-800"
                                  onClick={() => approveMut.mutate(q.id)} disabled={approveMut.isPending}>
                                  <CheckCircle className="h-3 w-3" /> Duyệt
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1 text-orange-600 hover:text-orange-700"
                                  onClick={() => { setRevisionTarget(q.id); setRevisionReason(""); }}>
                                  <Edit2 className="h-3 w-3" /> Yêu cầu chỉnh sửa
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1 text-red-600 hover:text-red-700"
                                  onClick={() => { setCancelTarget(q.id); setCancelReason(""); }}>
                                  <XCircle className="h-3 w-3" /> Hủy
                                </Button>
                              </>
                            )}

                            {/* Manager: xử lý đề xuất giá */}
                            {canApprove && q.negotiationStatus === "PROPOSED" && (
                              <>
                                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1 text-green-600 hover:text-green-700"
                                  onClick={() => acceptOfferMut.mutate(q.id)} disabled={acceptOfferMut.isPending}>
                                  <CheckCircle className="h-3 w-3" /> Chấp nhận giá
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1 text-orange-600 hover:text-orange-700"
                                  onClick={() => rejectOfferMut.mutate(q.id)} disabled={rejectOfferMut.isPending}>
                                  <XCircle className="h-3 w-3" /> Từ chối
                                </Button>
                              </>
                            )}

                            {/* Sale: Chỉnh sửa lại giá khi REVISION_REQUESTED */}
                            {canUpdateOwn && !canApprove && q.status === "REVISION_REQUESTED" && (
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1 text-orange-600 hover:text-orange-700"
                                onClick={() => { setResubmitItems([]); setResubmitTarget(null); setResubmitTargetId(q.id); }}>
                                <Edit2 className="h-3 w-3" /> Điều chỉnh lại giá
                              </Button>
                            )}

                            {/* Sale: Đề xuất giá khi SENT */}
                            {canUpdateOwn && q.status === "SENT" && (!q.negotiationStatus || q.negotiationStatus === "NONE" || q.negotiationStatus === "REJECTED") && (
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1 text-purple-600 hover:text-purple-700"
                                onClick={() => { setCounterOfferTarget({ id: q.id, original: Number(q.totalAmount) }); setCounterAmount(String(q.totalAmount)); setCounterNote(""); }}>
                                <MessageSquare className="h-3 w-3" /> Đề xuất giá
                              </Button>
                            )}

                            {/* Hủy có lý do — sale có thể hủy nếu chưa xác nhận */}
                            {!canApprove && canUpdateOwn && (q.status === "REVISION_REQUESTED") && (
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1 text-red-600 hover:text-red-700"
                                onClick={() => { setCancelTarget(q.id); setCancelReason(""); }}>
                                <XCircle className="h-3 w-3" /> Hủy
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {data?.items.length === 0 && (
                    <tr><td colSpan={8} className="py-12 text-center text-muted-foreground">{t.quotations.noQuotations}</td></tr>
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

      {/* ─── Revision Request Dialog (Manager) ─────────────────────────────── */}
      <Dialog open={revisionTarget !== null} onOpenChange={(v) => { if (!v) { setRevisionTarget(null); setRevisionReason(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Yêu cầu chỉnh sửa báo giá</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <Label>Lý do yêu cầu chỉnh sửa *</Label>
            <Textarea
              value={revisionReason}
              onChange={(e) => setRevisionReason(e.target.value)}
              placeholder="Nhập lý do yêu cầu chỉnh sửa..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRevisionTarget(null); setRevisionReason(""); }}>
              {t.common.cancel}
            </Button>
            <Button
              disabled={!revisionReason.trim() || requestRevisionMut.isPending}
              onClick={() => {
                if (revisionTarget === null) return;
                requestRevisionMut.mutate({ id: revisionTarget, reason: revisionReason.trim() });
              }}>
              {requestRevisionMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Gửi yêu cầu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Cancel With Reason Dialog ──────────────────────────────────────── */}
      <Dialog open={cancelTarget !== null} onOpenChange={(v) => { if (!v) { setCancelTarget(null); setCancelReason(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Hủy báo giá</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <Label>Lý do hủy *</Label>
            <Textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Nhập lý do hủy báo giá..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCancelTarget(null); setCancelReason(""); }}>
              {t.common.cancel}
            </Button>
            <Button
              variant="destructive"
              disabled={!cancelReason.trim() || cancelWithReasonMut.isPending}
              onClick={() => {
                if (cancelTarget === null) return;
                cancelWithReasonMut.mutate({ id: cancelTarget, reason: cancelReason.trim() });
              }}>
              {cancelWithReasonMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Xác nhận hủy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Resubmit Dialog (Sale edit prices) ─────────────────────────────── */}
      <Dialog open={resubmitTargetId !== null} onOpenChange={(v) => { if (!v) { setResubmitTargetId(null); setResubmitTarget(null); setResubmitItems([]); } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Điều chỉnh lại giá báo giá</DialogTitle>
            {resubmitTarget?.approvalNotes && (
              <p className="text-sm text-orange-700 bg-orange-50 border border-orange-200 rounded p-2 mt-1">
                <AlertCircle className="h-4 w-4 inline mr-1" />
                Lý do yêu cầu chỉnh sửa: <strong>{resubmitTarget.approvalNotes}</strong>
              </p>
            )}
          </DialogHeader>

          {loadingResubmit || resubmitItems.length === 0 ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Đang tải dữ liệu...</span>
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-[2fr_80px_120px_100px] gap-2 text-xs font-medium text-muted-foreground">
                <span>Sản phẩm</span>
                <span>SL</span>
                <span>Đơn giá (₫)</span>
                <span>CK (%)</span>
              </div>
              {resubmitItems.map((item, idx) => (
                <div key={idx} className="grid grid-cols-[2fr_80px_120px_100px] gap-2 items-center">
                  <div>
                    <div className="font-medium text-sm">{item.productName}</div>
                    <div className="text-xs text-muted-foreground font-mono">{item.sku}</div>
                  </div>
                  <Input
                    type="number" min="1" step="1"
                    value={item.quantity}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setResubmitItems((prev) => prev.map((it, i) => i === idx ? { ...it, quantity: Number(e.target.value) } : it))}
                  />
                  <Input
                    type="number" min="0" step="1000"
                    value={item.unitPrice}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setResubmitItems((prev) => prev.map((it, i) => i === idx ? { ...it, unitPrice: Number(e.target.value) } : it))}
                  />
                  <Input
                    type="number" min="0" max="100" step="1"
                    value={item.discountPercent}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setResubmitItems((prev) => prev.map((it, i) => i === idx ? { ...it, discountPercent: Number(e.target.value) } : it))}
                  />
                </div>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setResubmitTargetId(null); setResubmitTarget(null); setResubmitItems([]); }}>{t.common.cancel}</Button>
            <Button
              disabled={resubmitMut.isPending || resubmitItems.length === 0 || loadingResubmit}
              onClick={() => {
                if (!resubmitTarget) return;
                resubmitMut.mutate({ id: resubmitTarget.id, items: resubmitItems });
              }}>
              {resubmitMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Gửi lại chờ duyệt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Counter Offer Dialog ────────────────────────────────────────────── */}
      <Dialog open={!!counterOfferTarget} onOpenChange={(v) => { if (!v) { setCounterOfferTarget(null); setCounterAmount(""); setCounterNote(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Nhập giá đề xuất của khách hàng</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            {counterOfferTarget && (
              <p className="text-sm text-muted-foreground">
                Giá gốc: <span className="font-semibold text-foreground">{vnd(counterOfferTarget.original)}</span>
              </p>
            )}
            <div className="space-y-1.5">
              <Label>Giá đề xuất (₫) *</Label>
              <Input type="number" min="0" step="1000" value={counterAmount}
                onChange={(e) => setCounterAmount(e.target.value)}
                placeholder="Nhập số tiền khách đề xuất..." />
            </div>
            <div className="space-y-1.5">
              <Label>Ghi chú</Label>
              <Input value={counterNote} onChange={(e) => setCounterNote(e.target.value)}
                placeholder="Lý do / điều kiện khách hàng..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCounterOfferTarget(null); setCounterAmount(""); setCounterNote(""); }}>
              {t.common.cancel}
            </Button>
            <Button
              disabled={!counterAmount || Number(counterAmount) <= 0 || counterOfferMut.isPending}
              onClick={() => {
                if (!counterOfferTarget) return;
                counterOfferMut.mutate({ id: counterOfferTarget.id, proposedAmount: Number(counterAmount), note: counterNote || undefined });
              }}>
              {counterOfferMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Gửi đề xuất
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Create Dialog ───────────────────────────────────────────────────── */}
      <Dialog open={showCreate} onOpenChange={(v) => {
        setShowCreate(v);
        if (v) qc.invalidateQueries({ queryKey: ["products-select"] });
        if (!v) reset({ items: [{ productId: "", quantity: "1", unitPrice: "0" }] });
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t.quotations.createTitle}</DialogTitle></DialogHeader>
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
                <Label>Hiệu lực đến</Label>
                <Input type="date" onChange={(e) => setValue("validUntil", e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Ghi chú</Label>
              <Input placeholder="Ghi chú thêm..." onChange={(e) => setValue("notes", e.target.value)} />
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
                    <ProductSelect value={item.productId} onChange={(pid, prod) => handleProductChange(idx, pid, prod)} />
                    <Input type="number" min="1" step="1" placeholder="1"
                      onChange={(e) => setValue(`items.${idx}.quantity`, e.target.value)} defaultValue="1" />
                    <Input type="number" min="0" step="1000" placeholder="0"
                      onChange={(e) => setValue(`items.${idx}.unitPrice`, e.target.value)} value={item.unitPrice} />
                    <Input type="number" min="0" max="100" step="1" placeholder="0"
                      onChange={(e) => setValue(`items.${idx}.discountPercent`, e.target.value)} />
                    <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-destructive"
                      onClick={() => { const cur = items ?? []; if (cur.length > 1) setValue("items", cur.filter((_, i) => i !== idx)); }}
                      disabled={(items ?? []).length <= 1}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {errors.items && <p className="text-xs text-destructive">Kiểm tra lại thông tin sản phẩm</p>}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setShowCreate(false); reset({ items: [{ productId: "", quantity: "1", unitPrice: "0" }] }); }}>
                {t.common.cancel}
              </Button>
              <Button type="submit" disabled={createMut.isPending}>
                {createMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Tạo & gửi duyệt
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
