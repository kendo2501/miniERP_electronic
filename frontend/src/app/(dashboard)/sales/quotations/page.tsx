"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Search, Plus, Loader2, Trash2, Send, CheckCircle, XCircle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  listQuotations, createQuotation, sendQuotation, confirmQuotation, cancelQuotation, listCustomers,
} from "@/lib/api/sales";
import { ProductSelect } from "@/components/product-select";
import type { Product } from "@/types/catalog";
import type { QuotationStatus } from "@/types/sales";
import { vnd } from "@/lib/format";
import { useAuthStore } from "@/store/auth.store";
import { useLanguage } from "@/context/language-context";
import Link from "next/link";

const STATUS_VARIANTS: Record<QuotationStatus, "secondary" | "default" | "outline" | "destructive"> = {
  DRAFT: "secondary",
  SENT: "default",
  CONFIRMED: "outline",
  CANCELLED: "destructive",
};

const STATUS_COLORS: Record<QuotationStatus, string> = {
  DRAFT: "",
  SENT: "text-blue-600",
  CONFIRMED: "text-green-600 border-green-300",
  CANCELLED: "",
};

const itemSchema = z.object({
  productId: z.string().min(1, "Chọn sản phẩm"),
  quantity: z.string().min(1, "Bắt buộc"),
  unitPrice: z.string().min(1, "Bắt buộc"),
  discountAmount: z.string().optional(),
});

const schema = z.object({
  customerId: z.string().min(1, "Chọn khách hàng"),
  validUntil: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(itemSchema).min(1),
});

type FormValues = z.infer<typeof schema>;

export default function QuotationsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const { hasPermission } = useAuthStore();
  const qc = useQueryClient();
  const { t } = useLanguage();

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

  const { handleSubmit, setValue, reset, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { items: [{ productId: "", quantity: "1", unitPrice: "0" }] },
  });

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
          discountAmount: i.discountAmount ? parseFloat(i.discountAmount) : undefined,
        })),
      }).then((r) => r.data),
    onSuccess: () => {
      toast.success(t.quotations.quotationCreated);
      qc.invalidateQueries({ queryKey: ["quotations"] });
      setShowCreate(false);
      reset({ items: [{ productId: "", quantity: "1", unitPrice: "0" }] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Tạo báo giá thất bại"),
  });

  const sendMut = useMutation({
    mutationFn: (id: number) => sendQuotation(id),
    onSuccess: () => { toast.success(t.quotations.sent); qc.invalidateQueries({ queryKey: ["quotations"] }); },
    onError: () => toast.error("Gửi báo giá thất bại"),
  });

  const confirmMut = useMutation({
    mutationFn: (id: number) => confirmQuotation(id),
    onSuccess: () => {
      toast.success(t.quotations.approved + " → Đã tạo đơn hàng");
      qc.invalidateQueries({ queryKey: ["quotations"] });
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: () => toast.error("Duyệt báo giá thất bại"),
  });

  const cancelMut = useMutation({
    mutationFn: (id: number) => cancelQuotation(id),
    onSuccess: () => { toast.success(t.quotations.rejected); qc.invalidateQueries({ queryKey: ["quotations"] }); },
    onError: () => toast.error("Hủy báo giá thất bại"),
  });

  const canCreate = hasPermission("sales.quotation.create");
  const items = watch("items");

  function handleProductChange(idx: number, productId: string, product?: Product) {
    setValue(`items.${idx}.productId`, productId);
    if (product?.standardPrice) {
      setValue(`items.${idx}.unitPrice`, String(product.standardPrice));
    }
  }

  const STATUS_LABELS: Record<QuotationStatus, string> = {
    DRAFT: t.common.draft,
    SENT: "Đã gửi",
    CONFIRMED: "Đã duyệt",
    CANCELLED: t.common.cancelled,
  };

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
          <Link href="/sales/deliveries"><Button variant="outline" size="sm">{t.deliveries.title}</Button></Link>
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
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.quotations.allStatuses}</SelectItem>
                <SelectItem value="DRAFT">{t.common.draft}</SelectItem>
                <SelectItem value="SENT">Đã gửi</SelectItem>
                <SelectItem value="CONFIRMED">Đã duyệt</SelectItem>
                <SelectItem value="CANCELLED">{t.common.cancelled}</SelectItem>
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
                          <Badge variant={STATUS_VARIANTS[q.status]} className={STATUS_COLORS[q.status]}>
                            {STATUS_LABELS[q.status]}
                          </Badge>
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
                            {q.status === "DRAFT" && (
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1"
                                onClick={() => sendMut.mutate(q.id)} disabled={sendMut.isPending}>
                                <Send className="h-3 w-3" /> Gửi KH
                              </Button>
                            )}
                            {(q.status === "DRAFT" || q.status === "SENT") && (
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1 text-green-600 hover:text-green-700"
                                onClick={() => confirmMut.mutate(q.id)} disabled={confirmMut.isPending}>
                                <CheckCircle className="h-3 w-3" /> Tạo đơn
                              </Button>
                            )}
                            {q.status !== "CANCELLED" && q.status !== "CONFIRMED" && (
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1 text-red-600 hover:text-red-700"
                                onClick={() => cancelMut.mutate(q.id)} disabled={cancelMut.isPending}>
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

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={(v) => { setShowCreate(v); if (!v) reset({ items: [{ productId: "", quantity: "1", unitPrice: "0" }] }); }}>
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

            {/* Line items */}
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
                  <span className="text-xs text-muted-foreground font-medium">CK (₫)</span>
                  <span />
                </div>
                {(items ?? []).map((item, idx) => (
                  <div key={idx} className="grid grid-cols-[2fr_64px_100px_80px_32px] gap-2 items-center">
                    <ProductSelect
                      value={item.productId}
                      onChange={(pid, prod) => handleProductChange(idx, pid, prod)}
                    />
                    <Input type="number" min="0.01" step="1" placeholder="1"
                      onChange={(e) => setValue(`items.${idx}.quantity`, e.target.value)}
                      defaultValue="1"
                    />
                    <Input type="number" min="0" step="1000" placeholder="0"
                      onChange={(e) => setValue(`items.${idx}.unitPrice`, e.target.value)}
                      value={item.unitPrice}
                    />
                    <Input type="number" min="0" step="1000" placeholder="0"
                      onChange={(e) => setValue(`items.${idx}.discountAmount`, e.target.value)}
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
                Tạo báo giá
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
