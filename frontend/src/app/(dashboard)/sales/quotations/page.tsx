"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Search, Plus, Loader2, Trash2, Send, CheckCircle, XCircle } from "lucide-react";
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
import type { QuotationStatus } from "@/types/sales";
import { useAuthStore } from "@/store/auth.store";
import { useLanguage } from "@/context/language-context";
import Link from "next/link";

const STATUS_VARIANTS: Record<QuotationStatus, string> = {
  DRAFT: "secondary",
  SENT: "default",
  CONFIRMED: "success",
  CANCELLED: "destructive",
} as any;

const itemSchema = z.object({
  productId: z.string().min(1, "Required"),
  quantity: z.string().min(1, "Required"),
  unitPrice: z.string().min(1, "Required"),
  discountAmount: z.string().optional(),
});

const schema = z.object({
  customerId: z.string().min(1, "Select a customer"),
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
      listQuotations({
        page, limit: 20,
        search: search || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
      }).then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const { data: customers } = useQuery({
    queryKey: ["customers-list"],
    queryFn: () => listCustomers({ limit: 100 }).then((r) => r.data),
  });

  const { register, handleSubmit, setValue, reset, watch, formState: { errors } } = useForm<FormValues>({
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
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed to create quotation"),
  });

  const sendMut = useMutation({
    mutationFn: (id: number) => sendQuotation(id),
    onSuccess: () => { toast.success(t.quotations.sent); qc.invalidateQueries({ queryKey: ["quotations"] }); },
    onError: () => toast.error("Failed to send quotation"),
  });

  const confirmMut = useMutation({
    mutationFn: (id: number) => confirmQuotation(id),
    onSuccess: () => {
      toast.success(t.quotations.approved);
      qc.invalidateQueries({ queryKey: ["quotations"] });
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: () => toast.error("Failed to confirm quotation"),
  });

  const cancelMut = useMutation({
    mutationFn: (id: number) => cancelQuotation(id),
    onSuccess: () => { toast.success(t.quotations.rejected); qc.invalidateQueries({ queryKey: ["quotations"] }); },
    onError: () => toast.error("Failed to cancel quotation"),
  });

  const canCreate = hasPermission("sales.quotation.create");
  const items = watch("items");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t.quotations.title}</h1>
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
              <Input
                placeholder={t.quotations.searchPlaceholder}
                className="pl-9"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-36"><SelectValue placeholder={t.quotations.allStatuses} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.quotations.allStatuses}</SelectItem>
                <SelectItem value="DRAFT">{t.common.draft}</SelectItem>
                <SelectItem value="SENT">{t.common.sent}</SelectItem>
                <SelectItem value="CONFIRMED">{t.common.completed}</SelectItem>
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
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.quotations.quotationNumber}</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.quotations.customer}</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.quotations.status}</th>
                    <th className="h-10 px-6 text-right font-medium text-muted-foreground">{t.quotations.total}</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.quotations.validUntil}</th>
                    <th className="h-10 px-6 text-center font-medium text-muted-foreground">Items</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.common.date}</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.common.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.items.map((q) => (
                    <tr key={q.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-3 font-mono text-xs font-medium">{q.quotationNumber}</td>
                      <td className="px-6 py-3">
                        <div className="font-medium">{q.customer.companyName}</div>
                        <div className="text-xs text-muted-foreground">{q.customer.customerCode}</div>
                      </td>
                      <td className="px-6 py-3">
                        <Badge variant={STATUS_VARIANTS[q.status] as any}>{q.status}</Badge>
                      </td>
                      <td className="px-6 py-3 text-right font-medium">
                        ${Number(q.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-3 text-muted-foreground">
                        {q.validUntil ? new Date(q.validUntil).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-6 py-3 text-center text-muted-foreground">{q._count?.items ?? 0}</td>
                      <td className="px-6 py-3 text-muted-foreground text-xs">
                        {new Date(q.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-1">
                          {q.status === "DRAFT" && (
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1"
                              onClick={() => sendMut.mutate(q.id)} disabled={sendMut.isPending}>
                              <Send className="h-3 w-3" /> {t.quotations.send}
                            </Button>
                          )}
                          {(q.status === "DRAFT" || q.status === "SENT") && (
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1 text-green-600 hover:text-green-700"
                              onClick={() => confirmMut.mutate(q.id)} disabled={confirmMut.isPending}>
                              <CheckCircle className="h-3 w-3" /> {t.common.confirm}
                            </Button>
                          )}
                          {q.status !== "CANCELLED" && q.status !== "CONFIRMED" && (
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1 text-red-600 hover:text-red-700"
                              onClick={() => cancelMut.mutate(q.id)} disabled={cancelMut.isPending}>
                              <XCircle className="h-3 w-3" /> {t.common.cancel}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {data?.items.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-muted-foreground">{t.quotations.noQuotations}</td>
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
      <Dialog open={showCreate} onOpenChange={(v) => { setShowCreate(v); if (!v) reset({ items: [{ productId: "", quantity: "1", unitPrice: "0" }] }); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t.quotations.createTitle}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit((v) => createMut.mutate(v))} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t.common.customer} *</Label>
                <Select onValueChange={(v) => setValue("customerId", v)}>
                  <SelectTrigger><SelectValue placeholder={t.orders.selectCustomer} /></SelectTrigger>
                  <SelectContent>
                    {customers?.items.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.companyName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.customerId && <p className="text-xs text-destructive">{errors.customerId.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>{t.quotations.validUntil}</Label>
                <Input type="date" {...register("validUntil")} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>{t.common.notes}</Label>
              <Input placeholder={t.payments.notesPlaceholder} {...register("notes")} />
            </div>

            {/* Line items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>{t.orders.orderItems} *</Label>
                <Button type="button" variant="outline" size="sm"
                  onClick={() => setValue("items", [...(items ?? []), { productId: "", quantity: "1", unitPrice: "0" }])}>
                  <Plus className="h-3.5 w-3.5" /> {t.quotations.addItem}
                </Button>
              </div>
              <div className="space-y-2">
                <div className="grid grid-cols-[1fr_72px_96px_80px_32px] gap-2">
                  <span className="text-xs text-muted-foreground font-medium">{t.inventory.productId}</span>
                  <span className="text-xs text-muted-foreground font-medium">{t.orders.quantity}</span>
                  <span className="text-xs text-muted-foreground font-medium">{t.orders.unitPrice}</span>
                  <span className="text-xs text-muted-foreground font-medium">{t.orders.discount}</span>
                  <span />
                </div>
                {(items ?? []).map((_, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_72px_96px_80px_32px] gap-2 items-center">
                    <Input type="number" placeholder={t.inventory.productId} {...register(`items.${idx}.productId`)} />
                    <Input type="number" min="0.01" step="0.01" placeholder="1" {...register(`items.${idx}.quantity`)} />
                    <Input type="number" min="0" step="0.01" placeholder="0.00" {...register(`items.${idx}.unitPrice`)} />
                    <Input type="number" min="0" step="0.01" placeholder="0" {...register(`items.${idx}.discountAmount`)} />
                    <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-destructive"
                      onClick={() => {
                        const cur = items ?? [];
                        if (cur.length > 1) setValue("items", cur.filter((_, i) => i !== idx));
                      }}
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
                {t.quotations.newQuotation}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
