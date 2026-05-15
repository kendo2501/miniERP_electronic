"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Search, Plus, Loader2, Send, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { listInvoices, createInvoice, sendInvoice, cancelInvoice } from "@/lib/api/finance";
import { listCustomers } from "@/lib/api/sales";
import type { InvoiceStatus } from "@/types/finance";
import { useAuthStore } from "@/store/auth.store";
import { useLanguage } from "@/context/language-context";
import Link from "next/link";

const STATUS_VARIANTS: Record<InvoiceStatus, string> = {
  DRAFT: "secondary",
  SENT: "default",
  PARTIALLY_PAID: "warning",
  PAID: "success",
  CANCELLED: "destructive",
} as any;

const schema = z.object({
  customerId: z.string().min(1, "Select a customer"),
  salesOrderId: z.string().optional(),
  issueDate: z.string().optional(),
  dueDate: z.string().optional(),
  subtotal: z.string().min(1),
  taxAmount: z.string().min(1),
});

type FormValues = z.infer<typeof schema>;

export default function InvoicesPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const { hasPermission, hasRole } = useAuthStore();
  const hideFinanceNav = hasRole("admin") || hasRole("accountant");
  const qc = useQueryClient();
  const { t } = useLanguage();

  const STATUS_LABELS = {
    DRAFT: t.common.draft,
    SENT: t.common.sent,
    PARTIALLY_PAID: t.common.partial,
    PAID: t.common.paid,
    CANCELLED: t.common.cancelled,
  };

  const { data, isLoading } = useQuery({
    queryKey: ["invoices", page, search, statusFilter],
    queryFn: () =>
      listInvoices({ page, limit: 20, search: search || undefined, status: statusFilter !== "all" ? statusFilter : undefined }).then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const { data: customers } = useQuery({
    queryKey: ["customers-list"],
    queryFn: () => listCustomers({ limit: 100 }).then((r) => r.data),
    enabled: showCreate,
  });

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { subtotal: "0", taxAmount: "0" },
  });

  const subtotalVal = watch("subtotal");
  const taxVal = watch("taxAmount");
  const total = (parseFloat(subtotalVal || "0") + parseFloat(taxVal || "0")).toFixed(2);

  const createMut = useMutation({
    mutationFn: (v: FormValues) => {
      const subtotal = parseFloat(v.subtotal);
      const taxAmount = parseFloat(v.taxAmount);
      return createInvoice({
        customerId: parseInt(v.customerId),
        salesOrderId: v.salesOrderId ? parseInt(v.salesOrderId) : undefined,
        issueDate: v.issueDate || undefined,
        dueDate: v.dueDate || undefined,
        subtotal, taxAmount, totalAmount: subtotal + taxAmount,
      }).then((r) => r.data);
    },
    onSuccess: () => {
      toast.success(t.invoices.invoiceCreated);
      qc.invalidateQueries({ queryKey: ["invoices"] });
      setShowCreate(false);
      reset({ subtotal: "0", taxAmount: "0" });
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed to create invoice"),
  });

  const sendMut = useMutation({
    mutationFn: (id: number) => sendInvoice(id),
    onSuccess: () => { toast.success(t.invoices.invoiceSent); qc.invalidateQueries({ queryKey: ["invoices"] }); },
    onError: () => toast.error("Failed to send invoice"),
  });

  const cancelMut = useMutation({
    mutationFn: (id: number) => cancelInvoice(id),
    onSuccess: () => { toast.success(t.invoices.invoiceCancelled); qc.invalidateQueries({ queryKey: ["invoices"] }); qc.invalidateQueries({ queryKey: ["outstanding"] }); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed to cancel invoice"),
  });

  const canCreate = hasPermission("finance.invoice.view");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t.invoices.title}</h1>
          <p className="text-muted-foreground mt-1">{t.invoices.subtitle}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/finance"><Button variant="outline" size="sm">{t.common.overview}</Button></Link>
          {!hideFinanceNav && (
            <Link href="/finance/payments"><Button variant="outline" size="sm">{t.finance.payments}</Button></Link>
          )}
          {canCreate && (
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4" />
              {t.invoices.newInvoice}
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder={t.invoices.searchPlaceholder} className="pl-9" value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-36"><SelectValue placeholder={t.invoices.allStatuses} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.invoices.allStatuses}</SelectItem>
                <SelectItem value="DRAFT">{t.common.draft}</SelectItem>
                <SelectItem value="SENT">{t.common.sent}</SelectItem>
                <SelectItem value="PARTIALLY_PAID">{t.common.partial}</SelectItem>
                <SelectItem value="PAID">{t.common.paid}</SelectItem>
                <SelectItem value="CANCELLED">{t.common.cancelled}</SelectItem>
              </SelectContent>
            </Select>
            {data && <span className="text-sm text-muted-foreground ml-auto">{data.total} {t.invoices.totalInvoices}</span>}
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
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.invoices.invoiceNumber}</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.invoices.customer}</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.invoices.order}</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.invoices.status}</th>
                    <th className="h-10 px-6 text-right font-medium text-muted-foreground">{t.invoices.total}</th>
                    <th className="h-10 px-6 text-right font-medium text-muted-foreground">{t.invoices.outstanding}</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.invoices.dueDate}</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.common.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.items.map((inv) => {
                    const isOverdue = inv.dueDate && new Date(inv.dueDate) < new Date() && !["PAID", "CANCELLED"].includes(inv.status);
                    return (
                      <tr key={inv.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-3 font-mono text-xs font-medium">{inv.invoiceNumber}</td>
                        <td className="px-6 py-3">
                          <div className="font-medium">{inv.customer.companyName}</div>
                          <div className="text-xs text-muted-foreground">{inv.customer.customerCode}</div>
                        </td>
                        <td className="px-6 py-3 font-mono text-xs text-muted-foreground">
                          {inv.salesOrder?.orderNumber ?? "—"}
                        </td>
                        <td className="px-6 py-3">
                          <Badge variant={STATUS_VARIANTS[inv.status] as any}>{STATUS_LABELS[inv.status]}</Badge>
                        </td>
                        <td className="px-6 py-3 text-right font-medium">
                          ${Number(inv.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-3 text-right">
                          <span className={Number(inv.outstandingAmount) > 0 ? "text-orange-500 font-medium" : "text-muted-foreground"}>
                            ${Number(inv.outstandingAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-xs">
                          <span className={isOverdue ? "text-red-500 font-medium" : "text-muted-foreground"}>
                            {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "—"}
                          </span>
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-1">
                            {inv.status === "DRAFT" && (
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1"
                                onClick={() => sendMut.mutate(inv.id)} disabled={sendMut.isPending}>
                                <Send className="h-3 w-3" /> {t.invoices.send}
                              </Button>
                            )}
                            {!["PAID", "CANCELLED"].includes(inv.status) && (
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1 text-red-600 hover:text-red-700"
                                onClick={() => cancelMut.mutate(inv.id)} disabled={cancelMut.isPending}>
                                <XCircle className="h-3 w-3" /> {t.invoices.cancel}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {data?.items.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-muted-foreground">{t.invoices.noInvoices}</td>
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

      <Dialog open={showCreate} onOpenChange={(v) => { setShowCreate(v); if (!v) reset({ subtotal: "0", taxAmount: "0" }); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{t.invoices.createTitle}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit((v) => createMut.mutate(v))} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>{t.invoices.customer} *</Label>
              <Select onValueChange={(v) => setValue("customerId", v)}>
                <SelectTrigger><SelectValue placeholder={t.invoices.selectCustomer} /></SelectTrigger>
                <SelectContent>
                  {customers?.items.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.companyName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.customerId && <p className="text-xs text-destructive">{errors.customerId.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>{t.invoices.salesOrderId}</Label>
              <Input type="number" placeholder={t.invoices.linkOrderPlaceholder} {...register("salesOrderId")} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t.invoices.issueDate}</Label>
                <Input type="date" {...register("issueDate")} />
              </div>
              <div className="space-y-1.5">
                <Label>{t.invoices.dueDate}</Label>
                <Input type="date" {...register("dueDate")} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t.invoices.subtotal} *</Label>
                <Input type="number" min="0" step="0.01" {...register("subtotal")} />
                {errors.subtotal && <p className="text-xs text-destructive">{errors.subtotal.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>{t.invoices.tax} *</Label>
                <Input type="number" min="0" step="0.01" {...register("taxAmount")} />
              </div>
            </div>

            <div className="rounded-md bg-muted/50 px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t.invoices.totalAmount}</span>
              <span className="text-lg font-bold">${total}</span>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setShowCreate(false); reset({ subtotal: "0", taxAmount: "0" }); }}>
                {t.common.cancel}
              </Button>
              <Button type="submit" disabled={createMut.isPending}>
                {createMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {t.invoices.newInvoice}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
