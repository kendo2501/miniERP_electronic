"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Search, Plus, Loader2, Package, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { listProducts, createProduct, deactivateProduct, listCategories, listBrands } from "@/lib/api/catalog";
import { useAuthStore } from "@/store/auth.store";
import { useLanguage } from "@/context/language-context";
import Link from "next/link";

const schema = z.object({
  sku: z.string().min(1, "SKU is required"),
  productName: z.string().min(1, "Product name is required"),
  description: z.string().optional(),
  unit: z.string().optional(),
  standardPrice: z.string().optional(),
  weight: z.string().optional(),
  categoryId: z.string().optional(),
  brandId: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function ProductsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [brandFilter, setBrandFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const { hasPermission } = useAuthStore();
  const qc = useQueryClient();
  const { t } = useLanguage();

  const { data, isLoading } = useQuery({
    queryKey: ["products", page, search, categoryFilter, brandFilter],
    queryFn: () =>
      listProducts({
        page, limit: 20,
        search: search || undefined,
        categoryId: categoryFilter !== "all" ? parseInt(categoryFilter) : undefined,
        brandId: brandFilter !== "all" ? parseInt(brandFilter) : undefined,
      }).then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: () => listCategories().then((r) => r.data) });
  const { data: brands } = useQuery({ queryKey: ["brands"], queryFn: () => listBrands().then((r) => r.data) });

  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const createMut = useMutation({
    mutationFn: (v: FormValues) =>
      createProduct({
        sku: v.sku, productName: v.productName,
        description: v.description || undefined, unit: v.unit || undefined,
        standardPrice: v.standardPrice || undefined, weight: v.weight || undefined,
        categoryId: v.categoryId ? parseInt(v.categoryId) : undefined,
        brandId: v.brandId ? parseInt(v.brandId) : undefined,
      }).then((r) => r.data),
    onSuccess: () => {
      toast.success(t.catalog.productCreated);
      qc.invalidateQueries({ queryKey: ["products"] });
      setShowCreate(false);
      reset();
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed to create product"),
  });

  const deactivateMut = useMutation({
    mutationFn: (id: number) => deactivateProduct(id),
    onSuccess: () => { toast.success(t.catalog.productDeactivated); qc.invalidateQueries({ queryKey: ["products"] }); },
    onError: () => toast.error("Failed to deactivate product"),
  });

  const canCreate = hasPermission("catalog.product.create");
  const canManage = hasPermission("catalog.product.deactivate");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t.catalog.products}</h1>
          <p className="text-muted-foreground mt-1">{t.catalog.subtitle}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/catalog/categories"><Button variant="outline" size="sm">{t.catalog.categories}</Button></Link>
          <Link href="/catalog/brands"><Button variant="outline" size="sm">{t.catalog.brands}</Button></Link>
          {canCreate && (
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4" />
              {t.catalog.newProduct}
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder={t.catalog.searchPlaceholder} className="pl-9" value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1); }}>
              <SelectTrigger className="w-40"><SelectValue placeholder={t.catalog.allCategories} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.catalog.allCategories}</SelectItem>
                {categories?.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={brandFilter} onValueChange={(v) => { setBrandFilter(v); setPage(1); }}>
              <SelectTrigger className="w-36"><SelectValue placeholder={t.catalog.allBrands} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.catalog.allBrands}</SelectItem>
                {brands?.map((b) => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {data && <span className="text-sm text-muted-foreground ml-auto">{data.total} {t.catalog.totalProducts}</span>}
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
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.catalog.sku}</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.catalog.productName}</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.common.category}</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.common.brand}</th>
                    <th className="h-10 px-6 text-right font-medium text-muted-foreground">{t.common.price}</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.common.unit}</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.common.status}</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.common.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.items.map((p) => (
                    <tr key={p.id} className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${!p.isActive ? "opacity-50" : ""}`}>
                      <td className="px-6 py-3 font-mono text-xs font-medium">{p.sku}</td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2 font-medium">
                          <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          {p.productName}
                        </div>
                        {p.description && <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-xs">{p.description}</p>}
                      </td>
                      <td className="px-6 py-3 text-muted-foreground">{p.category?.name ?? "—"}</td>
                      <td className="px-6 py-3 text-muted-foreground">{p.brand?.name ?? "—"}</td>
                      <td className="px-6 py-3 text-right">
                        {p.standardPrice != null ? `$${Number(p.standardPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "—"}
                      </td>
                      <td className="px-6 py-3 text-muted-foreground">{p.unit ?? "—"}</td>
                      <td className="px-6 py-3">
                        <Badge variant={p.isActive ? "success" : "secondary"}>
                          {p.isActive ? t.common.active : t.common.inactive}
                        </Badge>
                      </td>
                      <td className="px-6 py-3">
                        {canManage && p.isActive && (
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-destructive"
                            onClick={() => deactivateMut.mutate(p.id)} disabled={deactivateMut.isPending}>
                            <Power className="h-3 w-3" /> {t.catalog.deactivateProduct}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {data?.items.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-muted-foreground">{t.catalog.noProducts}</td>
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t.catalog.newProduct}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit((v) => createMut.mutate(v))} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t.catalog.sku} *</Label>
                <Input placeholder={t.catalog.skuPlaceholder} {...register("sku")} />
                {errors.sku && <p className="text-xs text-destructive">{errors.sku.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>{t.common.unit}</Label>
                <Input placeholder={t.catalog.unitPlaceholder} {...register("unit")} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>{t.catalog.productName} *</Label>
              <Input placeholder={t.catalog.namePlaceholder} {...register("productName")} />
              {errors.productName && <p className="text-xs text-destructive">{errors.productName.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>{t.common.description}</Label>
              <Input placeholder={t.catalog.descriptionPlaceholder} {...register("description")} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t.catalog.standardPrice} ($)</Label>
                <Input type="number" min="0" step="0.01" placeholder={t.catalog.pricePlaceholder} {...register("standardPrice")} />
              </div>
              <div className="space-y-1.5">
                <Label>{t.common.weight} (kg)</Label>
                <Input type="number" min="0" step="0.001" placeholder={t.catalog.weightPlaceholder} {...register("weight")} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t.common.category}</Label>
                <Select onValueChange={(v) => setValue("categoryId", v)}>
                  <SelectTrigger><SelectValue placeholder={t.catalog.selectCategory} /></SelectTrigger>
                  <SelectContent>
                    {categories?.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t.common.brand}</Label>
                <Select onValueChange={(v) => setValue("brandId", v)}>
                  <SelectTrigger><SelectValue placeholder={t.catalog.selectBrand} /></SelectTrigger>
                  <SelectContent>
                    {brands?.map((b) => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setShowCreate(false); reset(); }}>{t.common.cancel}</Button>
              <Button type="submit" disabled={createMut.isPending}>
                {createMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {t.catalog.newProduct}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
