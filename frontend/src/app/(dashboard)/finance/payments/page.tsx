"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Loader2, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { listPayments, createPayment, allocatePayment } from "@/lib/api/finance";
import { listCustomers } from "@/lib/api/sales";
import { useAuthStore } from "@/store/auth.store";
import { useLanguage } from "@/context/language-context";
import Link from "next/link";

const PAYMENT_METHODS = ["BANK_TRANSFER", "CASH", "CREDIT_CARD", "CHEQUE", "OTHER"];

const createSchema = z.object({
  customerId: z.string().min(1, "Select a customer"),
  totalAmount: z.string().min(1),
  paymentMethod: z.string().optional(),
  paymentDate: z.string().optional(),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
});

const allocateSchema = z.object({
  invoiceId: z.string().min(1),
  allocatedAmount: z.string().min(1),
});

type CreateValues = z.infer<typeof createSchema>;
type AllocateValues = z.infer<typeof allocateSchema>;

export default function PaymentsPage() {
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [allocatePaymentId, setAllocatePaymentId] = useState<number | null>(null);
  const { hasPermission, hasRole } = useAuthStore();
  const hideFinanceNav = hasRole("admin") || hasRole("accountant");
  const qc = useQueryClient();
  const { t } = useLanguage();

  const { data, isLoading } = useQuery({
    queryKey: ["payments", page],
    queryFn: () => listPayments({ page, limit: 20 }).then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const { data: customers } = useQuery({
    queryKey: ["customers-list"],
    queryFn: () => listCustomers({ limit: 100 }).then((r) => r.data),
    enabled: showCreate,
  });

  const createForm = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { totalAmount: "" },
  });

  const allocateForm = useForm<AllocateValues>({
    resolver: zodResolver(allocateSchema),
    defaultValues: { invoiceId: "", allocatedAmount: "" },
  });

  const createMut = useMutation({
    mutationFn: (v: CreateValues) =>
      createPayment({
        customerId: parseInt(v.customerId),
        totalAmount: parseFloat(v.totalAmount),
        paymentMethod: v.paymentMethod || undefined,
        paymentDate: v.paymentDate || undefined,
        referenceNumber: v.referenceNumber || undefined,
        notes: v.notes || undefined,
      }).then((r) => r.data),
    onSuccess: () => {
      toast.success(t.payments.paymentRecorded);
      qc.invalidateQueries({ queryKey: ["payments"] });
      setShowCreate(false);
      createForm.reset({ totalAmount: "" });
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed to record payment"),
  });

  const allocateMut = useMutation({
    mutationFn: (v: AllocateValues) =>
      allocatePayment(allocatePaymentId!, {
        allocations: [{ invoiceId: parseInt(v.invoiceId), allocatedAmount: parseFloat(v.allocatedAmount) }],
      }).then((r) => r.data),
    onSuccess: () => {
      toast.success(t.payments.paymentAllocated);
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["outstanding"] });
      setAllocatePaymentId(null);
      allocateForm.reset();
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed to allocate payment"),
  });

  const canCreate = hasPermission("finance.payment.view");
  const canAllocate = hasPermission("finance.payment.reverse");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t.payments.title}</h1>
          <p className="text-muted-foreground mt-1">{t.payments.subtitle}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/finance"><Button variant="outline" size="sm">{t.common.overview}</Button></Link>
          {!hideFinanceNav && (
            <Link href="/finance/invoices"><Button variant="outline" size="sm">{t.finance.invoices}</Button></Link>
          )}
          {canCreate && (
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4" />
              {t.payments.recordPayment}
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          {data && <span className="text-sm text-muted-foreground">{data.total} {t.payments.totalPayments}</span>}
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
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.payments.paymentNumber}</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.payments.customer}</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.payments.method}</th>
                    <th className="h-10 px-6 text-right font-medium text-muted-foreground">{t.payments.amount}</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.payments.reference}</th>
                    <th className="h-10 px-6 text-center font-medium text-muted-foreground">{t.payments.allocations}</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.payments.date}</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.common.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.items.map((p) => (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-3 font-mono text-xs font-medium">{p.paymentNumber}</td>
                      <td className="px-6 py-3">
                        <div className="font-medium">{p.customer.companyName}</div>
                        <div className="text-xs text-muted-foreground">{p.customer.customerCode}</div>
                      </td>
                      <td className="px-6 py-3">
                        <Badge variant="outline" className="text-xs">{p.paymentMethod ?? "—"}</Badge>
                      </td>
                      <td className="px-6 py-3 text-right font-medium text-green-600">
                        ${Number(p.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-3 text-muted-foreground text-xs">{p.referenceNumber ?? "—"}</td>
                      <td className="px-6 py-3 text-center text-muted-foreground">{p._count?.allocations ?? 0}</td>
                      <td className="px-6 py-3 text-muted-foreground text-xs">
                        {p.paymentDate ? new Date(p.paymentDate).toLocaleDateString() : new Date(p.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-3">
                        {canAllocate && (
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1 text-blue-600 hover:text-blue-700"
                            onClick={() => { setAllocatePaymentId(p.id); allocateForm.reset(); }}>
                            <Link2 className="h-3 w-3" /> {t.payments.allocate}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {data?.items.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-muted-foreground">{t.payments.noPayments}</td>
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

      <Dialog open={showCreate} onOpenChange={(v) => { setShowCreate(v); if (!v) createForm.reset({ totalAmount: "" }); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{t.payments.recordTitle}</DialogTitle></DialogHeader>
          <form onSubmit={createForm.handleSubmit((v) => createMut.mutate(v))} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>{t.payments.customer} *</Label>
              <Select onValueChange={(v) => createForm.setValue("customerId", v)}>
                <SelectTrigger><SelectValue placeholder={t.payments.selectCustomer} /></SelectTrigger>
                <SelectContent>
                  {customers?.items.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.companyName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {createForm.formState.errors.customerId && (
                <p className="text-xs text-destructive">{createForm.formState.errors.customerId.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t.payments.amount} ($) *</Label>
                <Input type="number" min="0.01" step="0.01" placeholder={t.payments.amountPlaceholder} {...createForm.register("totalAmount")} />
              </div>
              <div className="space-y-1.5">
                <Label>{t.payments.paymentMethod}</Label>
                <Select onValueChange={(v) => createForm.setValue("paymentMethod", v)}>
                  <SelectTrigger><SelectValue placeholder={t.payments.selectMethod} /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m.replace("_", " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t.payments.paymentDate}</Label>
                <Input type="date" {...createForm.register("paymentDate")} />
              </div>
              <div className="space-y-1.5">
                <Label>{t.payments.referenceNumber}</Label>
                <Input placeholder={t.payments.refPlaceholder} {...createForm.register("referenceNumber")} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>{t.common.notes}</Label>
              <Input placeholder={t.payments.notesPlaceholder} {...createForm.register("notes")} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setShowCreate(false); createForm.reset({ totalAmount: "" }); }}>
                {t.common.cancel}
              </Button>
              <Button type="submit" disabled={createMut.isPending}>
                {createMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {t.payments.recordPayment}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={allocatePaymentId !== null} onOpenChange={(v) => { if (!v) { setAllocatePaymentId(null); allocateForm.reset(); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t.payments.allocateTitle}</DialogTitle></DialogHeader>
          <form onSubmit={allocateForm.handleSubmit((v) => allocateMut.mutate(v))} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>{t.payments.invoiceId} *</Label>
              <Input type="number" placeholder={t.payments.invoiceIdPlaceholder} {...allocateForm.register("invoiceId")} />
            </div>
            <div className="space-y-1.5">
              <Label>{t.payments.allocateAmount} *</Label>
              <Input type="number" min="0.01" step="0.01" placeholder="0.00" {...allocateForm.register("allocatedAmount")} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setAllocatePaymentId(null); allocateForm.reset(); }}>
                {t.common.cancel}
              </Button>
              <Button type="submit" disabled={allocateMut.isPending}>
                {allocateMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {t.payments.allocate}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
