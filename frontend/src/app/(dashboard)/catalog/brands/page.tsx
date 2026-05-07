"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { listBrands, createBrand, updateBrand } from "@/lib/api/catalog";
import { useAuthStore } from "@/store/auth.store";
import { useLanguage } from "@/context/language-context";
import type { Brand } from "@/types/catalog";
import Link from "next/link";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().optional(),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function BrandsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [editBrand, setEditBrand] = useState<Brand | null>(null);
  const { hasPermission } = useAuthStore();
  const qc = useQueryClient();
  const { t } = useLanguage();

  const { data: brands, isLoading } = useQuery({
    queryKey: ["brands"],
    queryFn: () => listBrands().then((r) => r.data),
  });

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const openEdit = (b: Brand) => {
    setEditBrand(b);
    setValue("name", b.name);
    setValue("code", b.code ?? "");
    setValue("description", b.description ?? "");
  };

  const createMut = useMutation({
    mutationFn: (v: FormValues) =>
      createBrand({ name: v.name, code: v.code || undefined, description: v.description || undefined }).then((r) => r.data),
    onSuccess: () => {
      toast.success(t.catalog.brandCreated);
      qc.invalidateQueries({ queryKey: ["brands"] });
      setShowCreate(false);
      reset();
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed to create brand"),
  });

  const updateMut = useMutation({
    mutationFn: (v: FormValues) =>
      updateBrand(editBrand!.id, { name: v.name, code: v.code || undefined, description: v.description || undefined }).then((r) => r.data),
    onSuccess: () => {
      toast.success(t.catalog.brandCreated);
      qc.invalidateQueries({ queryKey: ["brands"] });
      setEditBrand(null);
      reset();
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed to update brand"),
  });

  const canManage = hasPermission("catalog.category.manage");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t.catalog.brands}</h1>
          <p className="text-muted-foreground mt-1">{t.catalog.subtitle}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/catalog/products"><Button variant="outline" size="sm">{t.catalog.products}</Button></Link>
          <Link href="/catalog/categories"><Button variant="outline" size="sm">{t.catalog.categories}</Button></Link>
          {canManage && (
            <Button onClick={() => { setShowCreate(true); reset(); }}>
              <Plus className="h-4 w-4" />
              {t.catalog.newBrand}
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-muted-foreground font-normal">
            {brands?.length ?? 0} {t.catalog.totalBrands}
          </CardTitle>
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
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.common.name}</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.common.code}</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.common.description}</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.common.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {brands?.map((b) => (
                    <tr key={b.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-3 font-medium">{b.name}</td>
                      <td className="px-6 py-3 font-mono text-xs text-muted-foreground">{b.code ?? "—"}</td>
                      <td className="px-6 py-3 text-muted-foreground max-w-sm truncate">{b.description ?? "—"}</td>
                      <td className="px-6 py-3">
                        {canManage && (
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1" onClick={() => openEdit(b)}>
                            <Pencil className="h-3 w-3" /> {t.common.edit}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {brands?.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-muted-foreground">{t.catalog.noBrands}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showCreate} onOpenChange={(v) => { setShowCreate(v); if (!v) reset(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t.catalog.newBrand}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit((v) => createMut.mutate(v))} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>{t.common.name} *</Label>
              <Input placeholder="Samsung" {...register("name")} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>{t.common.code}</Label>
              <Input placeholder="SAM" {...register("code")} />
            </div>
            <div className="space-y-1.5">
              <Label>{t.common.description}</Label>
              <Input placeholder={t.catalog.descriptionPlaceholder} {...register("description")} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setShowCreate(false); reset(); }}>{t.common.cancel}</Button>
              <Button type="submit" disabled={createMut.isPending}>
                {createMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {t.catalog.newBrand}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editBrand !== null} onOpenChange={(v) => { if (!v) { setEditBrand(null); reset(); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t.common.edit}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit((v) => updateMut.mutate(v))} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>{t.common.name} *</Label>
              <Input placeholder="Samsung" {...register("name")} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>{t.common.code}</Label>
              <Input placeholder="SAM" {...register("code")} />
            </div>
            <div className="space-y-1.5">
              <Label>{t.common.description}</Label>
              <Input placeholder={t.catalog.descriptionPlaceholder} {...register("description")} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setEditBrand(null); reset(); }}>{t.common.cancel}</Button>
              <Button type="submit" disabled={updateMut.isPending}>
                {updateMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {t.common.save}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
