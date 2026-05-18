"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, Loader2, Plus, DollarSign } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { listSupplierPayments, createSupplierPayment } from "@/lib/api/purchase";
import { getSuppliers } from "@/lib/api/suppliers";
import { vnd } from "@/lib/format";
import { useAuthStore } from "@/store/auth.store";
import { useLanguage } from "@/context/language-context";

const schema = z.object({
  supplierId: z.string().min(1, "Required"),
  totalAmount: z.string().min(1, "Required"),
  paymentDate: z.string().optional(),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function SupplierPaymentsPage() {
  const { hasPermission } = useAuthStore();
  const { t } = useLanguage();
  const qc = useQueryClient();

  const [page] = useState(1);
  const [supplierFilter, setSupplierFilter] = useState("ALL");
  const [createOpen, setCreateOpen] = useState(false);

  const canCreate = hasPermission("purchase.invoice.manage");

  const params: Record<string, unknown> = { page, limit: 20 };
  if (supplierFilter !== "ALL") params.supplierId = supplierFilter;

  const { data, isLoading } = useQuery({
    queryKey: ["supplier-payments", params],
    queryFn: () => listSupplierPayments(params),
  });

  const { data: suppliersData } = useQuery({
    queryKey: ["suppliers-list"],
    queryFn: () => getSuppliers({ limit: 100 }),
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const createMut = useMutation({
    mutationFn: (values: FormValues) =>
      createSupplierPayment({
        supplierId: parseInt(values.supplierId, 10),
        totalAmount: parseFloat(values.totalAmount),
        paymentDate: values.paymentDate || undefined,
        referenceNumber: values.referenceNumber || undefined,
        notes: values.notes || undefined,
      }),
    onSuccess: () => {
      toast.success(t.supplierPayments.created);
      qc.invalidateQueries({ queryKey: ["supplier-payments"] });
      setCreateOpen(false);
      reset();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? "Error"),
  });

  const items = (data as any)?.items ?? [];
  const total = (data as any)?.total ?? 0;
  const suppliers = (suppliersData as any)?.items ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t.supplierPayments.title}</h1>
          <p className="text-muted-foreground mt-1">{t.supplierPayments.subtitle}</p>
        </div>
        {canCreate && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t.supplierPayments.createPayment}
          </Button>
        )}
      </div>

      {/* Filter */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-3">
            <Select value={supplierFilter} onValueChange={setSupplierFilter}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder={t.supplierPayments.selectSupplier} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Suppliers</SelectItem>
                {suppliers.map((s: any) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.companyName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground ml-auto">
              {total} {t.supplierPayments.totalPayments}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <span className="font-semibold">{t.supplierPayments.title}</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <DollarSign className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>{t.supplierPayments.noPayments}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">{t.supplierPayments.paymentNumber}</th>
                    <th className="px-4 py-3 text-left font-medium">{t.supplierPayments.supplier}</th>
                    <th className="px-4 py-3 text-right font-medium">{t.supplierPayments.amount}</th>
                    <th className="px-4 py-3 text-left font-medium">{t.supplierPayments.paymentDate}</th>
                    <th className="px-4 py-3 text-left font-medium">{t.supplierPayments.reference}</th>
                    <th className="px-4 py-3 text-left font-medium">{t.common.status}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((p: any) => (
                    <tr key={p.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs">{p.paymentNumber}</td>
                      <td className="px-4 py-3">{p.supplier?.companyName ?? "-"}</td>
                      <td className="px-4 py-3 text-right font-medium">{vnd(p.totalAmount)}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {p.paymentDate ? new Date(p.paymentDate).toLocaleDateString() : "-"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{p.referenceNumber ?? "-"}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                          {p.status ?? "COMPLETED"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t.supplierPayments.createTitle}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit((v) => createMut.mutate(v))} className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t.supplierPayments.supplier} *</Label>
              <Select
                value={watch("supplierId") ?? ""}
                onValueChange={(v) => setValue("supplierId", v, { shouldValidate: true })}
              >
                <SelectTrigger className={errors.supplierId ? "border-destructive" : ""}>
                  <SelectValue placeholder={t.supplierPayments.selectSupplier} />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s: any) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.companyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>{t.supplierPayments.amount} *</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                {...register("totalAmount")}
                className={errors.totalAmount ? "border-destructive" : ""}
              />
            </div>

            <div className="space-y-1.5">
              <Label>{t.supplierPayments.paymentDate}</Label>
              <Input type="date" {...register("paymentDate")} />
            </div>

            <div className="space-y-1.5">
              <Label>{t.supplierPayments.reference}</Label>
              <Input placeholder="Bank transfer ref, check #..." {...register("referenceNumber")} />
            </div>

            <div className="space-y-1.5">
              <Label>{t.supplierPayments.notes}</Label>
              <Textarea rows={2} placeholder="Optional notes..." {...register("notes")} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setCreateOpen(false); reset(); }}>
                {t.common.cancel}
              </Button>
              <Button type="submit" disabled={createMut.isPending}>
                {createMut.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {t.supplierPayments.creating}
                  </>
                ) : t.supplierPayments.createPayment}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
