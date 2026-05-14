"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText, MessageSquare, CheckCircle, XCircle, Clock,
  Loader2, ChevronDown, ChevronUp, Tag, ShoppingBag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { listQuotations, submitCounterOffer } from "@/lib/api/sales";
import { vnd } from "@/lib/format";
import type { QuotationStatus } from "@/types/sales";

// ─── Status config (ngôn ngữ khách hàng) ────────────────────────────────────

const STATUS_CONFIG: Record<QuotationStatus, { label: string; icon: React.ReactNode; className: string }> = {
  PENDING_APPROVAL:   { label: "Đang xem xét",   icon: <Clock className="h-3.5 w-3.5" />,        className: "text-yellow-700 bg-yellow-50 border-yellow-200" },
  REVISION_REQUESTED: { label: "Đang xem xét",   icon: <Clock className="h-3.5 w-3.5" />,        className: "text-orange-700 bg-orange-50 border-orange-200" },
  APPROVED:           { label: "Đã duyệt",        icon: <CheckCircle className="h-3.5 w-3.5" />, className: "text-blue-700 bg-blue-50 border-blue-200" },
  SENT:               { label: "Chờ xác nhận",   icon: <FileText className="h-3.5 w-3.5" />,     className: "text-purple-700 bg-purple-50 border-purple-200" },
  CONFIRMED:          { label: "Đã xác nhận",    icon: <CheckCircle className="h-3.5 w-3.5" />, className: "text-green-700 bg-green-50 border-green-200" },
  CANCELLED:          { label: "Đã hủy",          icon: <XCircle className="h-3.5 w-3.5" />,     className: "text-red-700 bg-red-50 border-red-200" },
};

const NEGOTIATION_CONFIG = {
  PROPOSED: { label: "Đã đề xuất giá",  className: "text-purple-700 bg-purple-50 border-purple-200" },
  ACCEPTED: { label: "Giá được chấp nhận", className: "text-green-700 bg-green-50 border-green-200" },
  REJECTED: { label: "Giá bị từ chối",  className: "text-red-700 bg-red-50 border-red-200" },
} as const;

// ─── Component ───────────────────────────────────────────────────────────────

export default function MyQuotationsPage() {
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [offerTarget, setOfferTarget] = useState<{ id: number; quoNum: string; originalAmount: number } | null>(null);
  const [offerAmount, setOfferAmount] = useState("");
  const [offerNote, setOfferNote] = useState("");

  const qc = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["my-quotations", page],
    queryFn: () => listQuotations({ page, limit: 10 } as any).then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const counterMut = useMutation({
    mutationFn: ({ id, amount, note }: { id: number; amount: number; note?: string }) =>
      submitCounterOffer(id, { proposedAmount: amount, note }),
    onSuccess: () => {
      toast.success("Đã gửi đề xuất giá — chúng tôi sẽ phản hồi sớm nhất");
      qc.invalidateQueries({ queryKey: ["my-quotations"] });
      setOfferTarget(null);
      setOfferAmount("");
      setOfferNote("");
    },
    onError: (e: any) => {
      const msg = e.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? "Gửi đề xuất thất bại"));
    },
  });

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <FileText className="h-7 w-7 text-muted-foreground" />
          Báo giá của tôi
        </h1>
        <p className="text-muted-foreground mt-1">
          Xem trạng thái báo giá và đề xuất giá nếu cần thương lượng
        </p>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : isError ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <p>Không thể tải danh sách báo giá. Vui lòng thử lại.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {data?.items.length === 0 && (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                Chưa có báo giá nào
              </CardContent>
            </Card>
          )}

          {data?.items.map((q) => {
            const cfg = STATUS_CONFIG[q.status as QuotationStatus] ?? STATUS_CONFIG.PENDING_APPROVAL;
            const isExpanded = expandedId === q.id;
            const nego = (q as any).negotiationStatus as string | undefined;
            const negoCfg = nego && nego !== "NONE" ? NEGOTIATION_CONFIG[nego as keyof typeof NEGOTIATION_CONFIG] : null;
            const canOffer = q.status === "SENT" && (!nego || nego === "NONE" || nego === "REJECTED");

            return (
              <Card key={q.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    {/* Info left */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-semibold text-foreground">{q.quotationNumber}</span>
                        <Badge variant="outline" className={`text-xs flex items-center gap-1 ${cfg.className}`}>
                          {cfg.icon}
                          {cfg.label}
                        </Badge>
                        {negoCfg && (
                          <Badge variant="outline" className={`text-xs ${negoCfg.className}`}>
                            <Tag className="h-3 w-3 mr-1" />
                            {negoCfg.label}
                          </Badge>
                        )}
                      </div>

                      <div className="text-xs text-muted-foreground">
                        Ngày tạo: {new Date(q.createdAt).toLocaleDateString("vi-VN")}
                        {(q as any).validUntil && (
                          <span className="ml-3">
                            Hiệu lực đến: {new Date((q as any).validUntil).toLocaleDateString("vi-VN")}
                          </span>
                        )}
                      </div>

                      {/* Counter offer info */}
                      {nego === "PROPOSED" && (
                        <div className="mt-1 text-sm text-purple-700 bg-purple-50 border border-purple-200 rounded-md px-3 py-2">
                          <span className="font-medium">Đề xuất của bạn:</span>{" "}
                          {vnd(Number((q as any).counterOfferAmount))}
                          {(q as any).counterOfferNote && (
                            <span className="text-xs text-purple-600 block mt-0.5">"{(q as any).counterOfferNote}"</span>
                          )}
                        </div>
                      )}
                      {nego === "ACCEPTED" && (
                        <p className="text-xs text-green-700">
                          Giá đề xuất {vnd(Number((q as any).counterOfferAmount))} đã được chấp nhận → đơn hàng đã tạo.
                        </p>
                      )}
                      {nego === "REJECTED" && (
                        <p className="text-xs text-red-600">
                          Giá đề xuất {vnd(Number((q as any).counterOfferAmount))} bị từ chối. Bạn có thể đề xuất lại.
                        </p>
                      )}
                    </div>

                    {/* Total right */}
                    <div className="text-right shrink-0 space-y-1">
                      {(q.status === "PENDING_APPROVAL" || q.status === "REVISION_REQUESTED") ? (
                        <div className="text-xs text-muted-foreground italic">Đang xem xét</div>
                      ) : (
                        <div className="font-semibold tabular-nums text-sm">{vnd(Number(q.totalAmount))}</div>
                      )}
                      <div className="text-xs text-muted-foreground">{(q as any)._count?.items ?? 0} sản phẩm</div>
                    </div>
                  </div>

                  {/* Actions row */}
                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    {/* Toggle items — chỉ hiển thị khi giá đã được duyệt */}
                    {((q as any)._count?.items ?? 0) > 0 && q.status !== "PENDING_APPROVAL" && q.status !== "REVISION_REQUESTED" && (
                      <Button
                        variant="ghost" size="sm"
                        className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700"
                        onClick={() => setExpandedId(isExpanded ? null : q.id)}
                      >
                        {isExpanded ? <ChevronUp className="h-3.5 w-3.5 mr-1" /> : <ChevronDown className="h-3.5 w-3.5 mr-1" />}
                        {isExpanded ? "Ẩn sản phẩm" : "Xem sản phẩm"}
                      </Button>
                    )}

                    {/* Hướng dẫn xem đơn hàng khi báo giá đã được duyệt */}
                    {(q.status === "APPROVED" || q.status === "CONFIRMED") && (
                      <Link href="/my-orders">
                        <Button variant="outline" size="sm" className="h-7 px-3 text-xs gap-1.5 text-blue-700 border-blue-300 hover:bg-blue-50">
                          <ShoppingBag className="h-3.5 w-3.5" />
                          Xem đơn hàng
                        </Button>
                      </Link>
                    )}

                    {/* Counter offer button */}
                    {canOffer && (
                      <Button
                        variant="outline" size="sm"
                        className="h-7 px-3 text-xs gap-1.5 text-purple-700 border-purple-300 hover:bg-purple-50"
                        onClick={() => {
                          setOfferTarget({ id: q.id, quoNum: q.quotationNumber, originalAmount: Number(q.totalAmount) });
                          setOfferAmount(String(q.totalAmount));
                          setOfferNote("");
                        }}
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        Đề xuất giá
                      </Button>
                    )}
                  </div>
                </CardHeader>

                {/* Expanded: item list */}
                {isExpanded && (
                  <CardContent className="pt-0 border-t bg-muted/20">
                    <QuotationItemsSection quotationId={q.id} />
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Trang {data.page} / {data.totalPages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page <= 1}>Trước</Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= data.totalPages}>Sau</Button>
          </div>
        </div>
      )}

      {/* ─── Counter Offer Dialog ────────────────────────────────────────────── */}
      <Dialog open={!!offerTarget} onOpenChange={(v) => { if (!v) { setOfferTarget(null); setOfferAmount(""); setOfferNote(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-purple-600" />
              Đề xuất giá — {offerTarget?.quoNum}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {offerTarget && (
              <div className="rounded-md bg-muted/50 px-3 py-2 text-sm">
                <span className="text-muted-foreground">Giá gốc:</span>{" "}
                <span className="font-semibold">{vnd(offerTarget.originalAmount)}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Giá đề xuất của bạn (₫) *</Label>
              <Input
                type="number" min="0" step="1000"
                value={offerAmount}
                onChange={(e) => setOfferAmount(e.target.value)}
                placeholder="Nhập mức giá bạn mong muốn..."
              />
              {offerTarget && Number(offerAmount) > 0 && Number(offerAmount) !== offerTarget.originalAmount && (
                <p className={`text-xs ${Number(offerAmount) < offerTarget.originalAmount ? "text-orange-600" : "text-blue-600"}`}>
                  {Number(offerAmount) < offerTarget.originalAmount
                    ? `Thấp hơn ${vnd(offerTarget.originalAmount - Number(offerAmount))} so với giá gốc`
                    : `Cao hơn ${vnd(Number(offerAmount) - offerTarget.originalAmount)} so với giá gốc`}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Ghi chú (không bắt buộc)</Label>
              <Input
                value={offerNote}
                onChange={(e) => setOfferNote(e.target.value)}
                placeholder="Lý do, điều kiện, số lượng mua thêm..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setOfferTarget(null); setOfferAmount(""); setOfferNote(""); }}>
              Hủy
            </Button>
            <Button
              className="bg-purple-600 hover:bg-purple-700 text-white"
              disabled={!offerAmount || Number(offerAmount) <= 0 || counterMut.isPending}
              onClick={() => {
                if (!offerTarget) return;
                counterMut.mutate({ id: offerTarget.id, amount: Number(offerAmount), note: offerNote || undefined });
              }}
            >
              {counterMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Gửi đề xuất
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Sub-component: quotation items (lazy fetch) ─────────────────────────────

function QuotationItemsSection({ quotationId }: { quotationId: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ["quotation-detail-customer", quotationId],
    queryFn: () => import("@/lib/api/sales").then((m) => m.getQuotation(quotationId)).then((r) => r.data),
    staleTime: 60_000,
  });

  if (isLoading) return (
    <div className="py-4 flex justify-center">
      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
    </div>
  );

  if (!data?.items?.length) return (
    <p className="py-4 text-sm text-muted-foreground text-center">Không có sản phẩm</p>
  );

  return (
    <div className="py-3 space-y-1">
      {data.items.map((item) => {
        const disc = Number((item as any).discountPercent ?? 0);
        return (
          <div key={item.id} className="flex items-center justify-between text-sm py-2 px-3 bg-background rounded-md border">
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{item.product.productName}</div>
              <div className="text-xs text-muted-foreground font-mono">{item.product.sku}</div>
            </div>
            <div className="text-right ml-4 shrink-0 space-y-0.5">
              <div className="text-xs text-muted-foreground">
                {Number(item.quantity)} {item.product.unit} × {vnd(Number(item.unitPrice))}
                {disc > 0 && <span className="ml-1 text-orange-600">−{disc}%</span>}
              </div>
              <div className="font-semibold tabular-nums">{vnd(Number(item.totalAmount))}</div>
            </div>
          </div>
        );
      })}

      {/* Total row */}
      <div className="flex justify-between items-center pt-2 px-3 border-t">
        <span className="text-xs text-muted-foreground">Tổng cộng (đã VAT)</span>
        <span className="font-bold tabular-nums">
          {vnd(data.items.reduce((s, i) => s + Number(i.totalAmount), 0) * 1.1)}
        </span>
      </div>
    </div>
  );
}
