"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Search, Plus, Loader2, Building2, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { listCustomers, createCustomer } from "@/lib/api/sales";
import { useAuthStore } from "@/store/auth.store";
import { useLanguage } from "@/context/language-context";

const schema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  contactName: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  taxCode: z.string().optional(),
  creditLimit: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const { hasPermission } = useAuthStore();
  const qc = useQueryClient();
  const { t } = useLanguage();

  const { data, isLoading } = useQuery({
    queryKey: ["customers", page, search],
    queryFn: () => listCustomers({ page, limit: 20, search: search || undefined }).then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      createCustomer({
        companyName: values.companyName,
        contactName: values.contactName || undefined,
        email: values.email || undefined,
        phone: values.phone || undefined,
        address: values.address || undefined,
        taxCode: values.taxCode || undefined,
        creditLimit: values.creditLimit ? parseFloat(values.creditLimit) : undefined,
        notes: values.notes || undefined,
      }).then((r) => r.data),
    onSuccess: () => {
      toast.success(t.customers.customerCreated);
      qc.invalidateQueries({ queryKey: ["customers"] });
      setShowCreate(false);
      reset();
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? t.customers.errorCreate),
  });

  const canCreate = hasPermission("customers.customer.create");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t.customers.title}</h1>
          <p className="text-muted-foreground mt-1">{t.customers.subtitle}</p>
        </div>
        {canCreate && (
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" />
            {t.customers.newCustomer}
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t.customers.searchPlaceholder}
                className="pl-9"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            {data && <span className="text-sm text-muted-foreground ml-auto">{data.total} {t.customers.totalCustomers}</span>}
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
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.customers.customerCode}</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.customers.companyName}</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.customers.contactName}</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.customers.phone}</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.common.email}</th>
                    <th className="h-10 px-6 text-right font-medium text-muted-foreground">Credit Limit</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.common.date}</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.items.map((c) => (
                    <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-3 font-mono text-xs">{c.customerCode}</td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2 font-medium">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          {c.companyName}
                        </div>
                      </td>
                      <td className="px-6 py-3 text-muted-foreground">{c.contactName ?? "—"}</td>
                      <td className="px-6 py-3">
                        {c.phone ? (
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <Phone className="h-3 w-3" />{c.phone}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-6 py-3">
                        {c.email ? (
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <Mail className="h-3 w-3" />{c.email}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-6 py-3 text-right">
                        {c.creditLimit != null ? `$${Number(c.creditLimit).toLocaleString()}` : "—"}
                      </td>
                      <td className="px-6 py-3 text-muted-foreground text-xs">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                  {data?.items.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-muted-foreground">{t.customers.noCustomers}</td>
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

      <Dialog open={showCreate} onOpenChange={(v) => { setShowCreate(v); if (!v) reset(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t.customers.createTitle}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>{t.customers.companyName} *</Label>
              <Input placeholder={t.customers.companyPlaceholder} {...register("companyName")} />
              {errors.companyName && <p className="text-xs text-destructive">{errors.companyName.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t.customers.contactName}</Label>
                <Input placeholder={t.customers.contactPlaceholder} {...register("contactName")} />
              </div>
              <div className="space-y-1.5">
                <Label>{t.customers.phone}</Label>
                <Input placeholder={t.customers.phonePlaceholder} {...register("phone")} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t.common.email}</Label>
              <Input type="email" placeholder={t.customers.emailPlaceholder} {...register("email")} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Tax Code</Label>
                <Input placeholder="0123456789" {...register("taxCode")} />
              </div>
              <div className="space-y-1.5">
                <Label>Credit Limit ($)</Label>
                <Input type="number" min="0" placeholder="5000" {...register("creditLimit")} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t.common.address}</Label>
              <Input placeholder={t.customers.addressPlaceholder} {...register("address")} />
            </div>
            <div className="space-y-1.5">
              <Label>{t.common.notes}</Label>
              <Input placeholder={t.catalog.descriptionPlaceholder} {...register("notes")} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setShowCreate(false); reset(); }}>{t.common.cancel}</Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {t.customers.newCustomer}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
