"use client";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Search, Plus, Loader2, Package, Power, Pencil, X, Trash2, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  listProducts, createProduct, deactivateProduct,
  listCategories, listBrands, getProduct, updateProduct, updateProductAttributes,
  updateUomConversions, uploadProductImages, deleteProductImage, exportProducts,
} from "@/lib/api/catalog";
import type { ProductAttribute } from "@/types/catalog";
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
  const [editId, setEditId] = useState<number | null>(null);
  const [editTab, setEditTab] = useState<"general" | "attributes" | "uom" | "images">("general");
  const [attrRows, setAttrRows] = useState<{ attrKey: string; attrValue: string }[]>([]);
  const [uomRows, setUomRows] = useState<{ fromUnit: string; toUnit: string; conversionRate: string }[]>([]);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [deletingImageId, setDeletingImageId] = useState<number | null>(null);
  const { hasPermission } = useAuthStore();
  const qc = useQueryClient();
  const { t } = useLanguage();

  const handleExportProducts = async () => {
    try {
      const res = await exportProducts({
        search: search || undefined,
        categoryId: categoryFilter !== "all" ? parseInt(categoryFilter) : undefined,
        brandId: brandFilter !== "all" ? parseInt(brandFilter) : undefined,
      });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url; a.download = "products-export.xlsx"; a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Xuất file thất bại");
    }
  };

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

  const { data: editProduct, isLoading: editLoading } = useQuery({
    queryKey: ["product", editId],
    queryFn: () => getProduct(editId!).then((r) => r.data),
    enabled: editId !== null,
  });

  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const editForm = useForm<FormValues>({ resolver: zodResolver(schema) });

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

  const updateMut = useMutation({
    mutationFn: (v: FormValues) =>
      updateProduct(editId!, {
        productName: v.productName,
        description: v.description || undefined, unit: v.unit || undefined,
        standardPrice: v.standardPrice || undefined, weight: v.weight || undefined,
        categoryId: v.categoryId ? parseInt(v.categoryId) : undefined,
        brandId: v.brandId ? parseInt(v.brandId) : undefined,
      }).then((r) => r.data),
    onSuccess: () => {
      toast.success(t.catalog.productUpdated);
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["product", editId] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed to update product"),
  });

  const saveAttrsMut = useMutation({
    mutationFn: () => updateProductAttributes(editId!, attrRows).then((r) => r.data),
    onSuccess: () => {
      toast.success(t.catalog.attributesSaved);
      qc.invalidateQueries({ queryKey: ["product", editId] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed to save attributes"),
  });

  const saveUomMut = useMutation({
    mutationFn: () =>
      updateUomConversions(
        editId!,
        uomRows.map((r) => ({ fromUnit: r.fromUnit, toUnit: r.toUnit, conversionRate: parseFloat(r.conversionRate) })),
      ).then((r) => r.data),
    onSuccess: (data) => {
      toast.success(t.catalog.conversionsSaved);
      setUomRows(data.map((c) => ({ fromUnit: c.fromUnit, toUnit: c.toUnit, conversionRate: String(c.conversionRate) })));
      qc.invalidateQueries({ queryKey: ["product", editId] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed to save UoM conversions"),
  });

  const deactivateMut = useMutation({
    mutationFn: (id: number) => deactivateProduct(id),
    onSuccess: () => { toast.success(t.catalog.productDeactivated); qc.invalidateQueries({ queryKey: ["products"] }); },
    onError: () => toast.error("Failed to deactivate product"),
  });

  const uploadImagesMut = useMutation({
    mutationFn: () => uploadProductImages(editId!, uploadFiles),
    onSuccess: () => {
      toast.success(t.catalog.imageUploaded);
      qc.invalidateQueries({ queryKey: ["product", editId] });
      setUploadFiles([]);
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Lỗi upload ảnh"),
  });

  const deleteImageMut = useMutation({
    mutationFn: (imageId: number) => deleteProductImage(editId!, imageId),
    onMutate: (id) => setDeletingImageId(id),
    onSuccess: () => {
      toast.success(t.catalog.imageDeleted);
      qc.invalidateQueries({ queryKey: ["product", editId] });
    },
    onSettled: () => setDeletingImageId(null),
    onError: () => toast.error("Lỗi xoá ảnh"),
  });

  const canCreate = hasPermission("catalog.product.create");
  const canManage = hasPermission("catalog.product.deactivate");
  const canUpdate = hasPermission("catalog.product.update");

  function openEdit(id: number) {
    setEditId(id);
    setEditTab("general");
    setAttrRows([]);
    setUomRows([]);
  }

  function closeEdit() {
    setEditId(null);
    editForm.reset();
    setAttrRows([]);
    setUomRows([]);
    setUploadFiles([]);
    setDeletingImageId(null);
  }

  useEffect(() => {
    if (!editProduct) return;
    editForm.reset({
      sku: editProduct.sku,
      productName: editProduct.productName,
      description: editProduct.description ?? "",
      unit: editProduct.unit ?? "",
      standardPrice: editProduct.standardPrice != null ? String(editProduct.standardPrice) : "",
      weight: editProduct.weight != null ? String(editProduct.weight) : "",
      categoryId: editProduct.category ? String(editProduct.category.id) : "",
      brandId: editProduct.brand ? String(editProduct.brand.id) : "",
    });
    setAttrRows(editProduct.attributes?.map((a) => ({ attrKey: a.attrKey, attrValue: a.attrValue })) ?? []);
    setUomRows(
      editProduct.uomConversions?.map((c) => ({
        fromUnit: c.fromUnit,
        toUnit: c.toUnit,
        conversionRate: String(c.conversionRate),
      })) ?? []
    );
  }, [editProduct?.id]);

  function addAttrRow() {
    setAttrRows((prev) => [...prev, { attrKey: "", attrValue: "" }]);
  }

  function removeAttrRow(idx: number) {
    setAttrRows((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateAttrRow(idx: number, field: "attrKey" | "attrValue", value: string) {
    setAttrRows((prev) => prev.map((row, i) => i === idx ? { ...row, [field]: value } : row));
  }

  function addUomRow() {
    setUomRows((prev) => [...prev, { fromUnit: "", toUnit: "", conversionRate: "" }]);
  }

  function removeUomRow(idx: number) {
    setUomRows((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateUomRow(idx: number, field: "fromUnit" | "toUnit" | "conversionRate", value: string) {
    setUomRows((prev) => prev.map((row, i) => i === idx ? { ...row, [field]: value } : row));
  }

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
          <Button variant="outline" size="sm" onClick={handleExportProducts}>
            <FileDown className="h-4 w-4" />
            {t.catalog.exportProducts}
          </Button>
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
                        {(p as any).totalStock > 0 ? (
                          <Badge variant="success">Còn hàng</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-red-600 border-red-200 bg-red-50">Hết hàng</Badge>
                        )}
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-1">
                          {canUpdate && (
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1 text-muted-foreground"
                              onClick={() => openEdit(p.id)}>
                              <Pencil className="h-3 w-3" /> {t.common.edit}
                            </Button>
                          )}
                          {canManage && p.isActive && (
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-destructive"
                              onClick={() => deactivateMut.mutate(p.id)} disabled={deactivateMut.isPending}>
                              <Power className="h-3 w-3" /> {t.catalog.deactivateProduct}
                            </Button>
                          )}
                        </div>
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

      {/* ── Create Dialog ── */}
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

      {/* ── Edit Dialog with Tabs ── */}
      <Dialog open={editId !== null} onOpenChange={(v) => { if (!v) closeEdit(); }}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t.catalog.editProduct}</DialogTitle>
          </DialogHeader>

          {editLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              {/* Tab bar */}
              <div className="flex border-b">
                <button
                  type="button"
                  onClick={() => setEditTab("general")}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    editTab === "general"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.catalog.generalInfo}
                </button>
                <button
                  type="button"
                  onClick={() => setEditTab("attributes")}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    editTab === "attributes"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.catalog.dynamicAttributes}
                  {attrRows.length > 0 && (
                    <span className="ml-1.5 rounded-full bg-primary/10 text-primary text-xs px-1.5 py-0.5">
                      {attrRows.length}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setEditTab("uom")}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    editTab === "uom"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.catalog.unitConversions}
                  {uomRows.length > 0 && (
                    <span className="ml-1.5 rounded-full bg-primary/10 text-primary text-xs px-1.5 py-0.5">
                      {uomRows.length}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setEditTab("images")}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    editTab === "images"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.catalog.productImages}
                  {editProduct?.images?.length ? (
                    <span className="ml-1.5 rounded-full bg-primary/10 text-primary text-xs px-1.5 py-0.5">
                      {editProduct.images.length}
                    </span>
                  ) : null}
                </button>
              </div>

              {/* Tab: Thông tin chung */}
              {editTab === "general" && (
                <form onSubmit={editForm.handleSubmit((v) => updateMut.mutate(v))} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>{t.catalog.sku}</Label>
                      <Input {...editForm.register("sku")} disabled className="bg-muted" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t.common.unit}</Label>
                      <Input placeholder={t.catalog.unitPlaceholder} {...editForm.register("unit")} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t.catalog.productName} *</Label>
                    <Input placeholder={t.catalog.namePlaceholder} {...editForm.register("productName")} />
                    {editForm.formState.errors.productName && (
                      <p className="text-xs text-destructive">{editForm.formState.errors.productName.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t.common.description}</Label>
                    <Input placeholder={t.catalog.descriptionPlaceholder} {...editForm.register("description")} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>{t.catalog.standardPrice} ($)</Label>
                      <Input type="number" min="0" step="0.01" {...editForm.register("standardPrice")} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t.common.weight} (kg)</Label>
                      <Input type="number" min="0" step="0.001" {...editForm.register("weight")} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>{t.common.category}</Label>
                      <Select
                        value={editForm.watch("categoryId") ?? ""}
                        onValueChange={(v) => editForm.setValue("categoryId", v)}
                      >
                        <SelectTrigger><SelectValue placeholder={t.catalog.selectCategory} /></SelectTrigger>
                        <SelectContent>
                          {categories?.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t.common.brand}</Label>
                      <Select
                        value={editForm.watch("brandId") ?? ""}
                        onValueChange={(v) => editForm.setValue("brandId", v)}
                      >
                        <SelectTrigger><SelectValue placeholder={t.catalog.selectBrand} /></SelectTrigger>
                        <SelectContent>
                          {brands?.map((b) => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={closeEdit}>{t.common.cancel}</Button>
                    <Button type="submit" disabled={updateMut.isPending}>
                      {updateMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                      {t.common.save}
                    </Button>
                  </DialogFooter>
                </form>
              )}

              {/* Tab: Thuộc tính động */}
              {editTab === "attributes" && (
                <div className="space-y-4">
                  {attrRows.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">{t.catalog.noAttributes}</p>
                  ) : (
                    <div className="space-y-2">
                      <div className="grid grid-cols-[1fr_1fr_auto] gap-2 text-xs font-medium text-muted-foreground px-1">
                        <span>{t.catalog.attributeKey}</span>
                        <span>{t.catalog.attributeValue}</span>
                        <span />
                      </div>
                      {attrRows.map((row, idx) => (
                        <div key={idx} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                          <Input
                            placeholder={t.catalog.keyPlaceholder}
                            value={row.attrKey}
                            onChange={(e) => updateAttrRow(idx, "attrKey", e.target.value)}
                          />
                          <Input
                            placeholder={t.catalog.valuePlaceholder}
                            value={row.attrValue}
                            onChange={(e) => updateAttrRow(idx, "attrValue", e.target.value)}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => removeAttrRow(idx)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  <Button type="button" variant="outline" size="sm" onClick={addAttrRow} className="w-full">
                    <Plus className="h-4 w-4 mr-1" />
                    {t.catalog.addAttribute}
                  </Button>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={closeEdit}>{t.common.cancel}</Button>
                    <Button
                      type="button"
                      disabled={saveAttrsMut.isPending || attrRows.some((r) => !r.attrKey.trim())}
                      onClick={() => saveAttrsMut.mutate()}
                    >
                      {saveAttrsMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                      {t.common.save}
                    </Button>
                  </DialogFooter>
                </div>
              )}

              {/* Tab: Đơn vị tính */}
              {editTab === "uom" && (
                <div className="space-y-4">
                  {uomRows.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">{t.catalog.noConversions}</p>
                  ) : (
                    <div className="space-y-2">
                      <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 text-xs font-medium text-muted-foreground px-1">
                        <span>{t.catalog.fromUnit}</span>
                        <span>{t.catalog.toUnit}</span>
                        <span>{t.catalog.conversionRate}</span>
                        <span />
                      </div>
                      {uomRows.map((row, idx) => (
                        <div key={idx} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
                          <Input
                            placeholder={t.catalog.fromUnitPlaceholder}
                            value={row.fromUnit}
                            onChange={(e) => updateUomRow(idx, "fromUnit", e.target.value)}
                          />
                          <Input
                            placeholder={t.catalog.toUnitPlaceholder}
                            value={row.toUnit}
                            onChange={(e) => updateUomRow(idx, "toUnit", e.target.value)}
                          />
                          <Input
                            type="number"
                            min="0.000001"
                            step="any"
                            placeholder={t.catalog.ratePlaceholder}
                            value={row.conversionRate}
                            onChange={(e) => updateUomRow(idx, "conversionRate", e.target.value)}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => removeUomRow(idx)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  <Button type="button" variant="outline" size="sm" onClick={addUomRow} className="w-full">
                    <Plus className="h-4 w-4 mr-1" />
                    {t.catalog.addConversion}
                  </Button>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={closeEdit}>{t.common.cancel}</Button>
                    <Button
                      type="button"
                      disabled={
                        saveUomMut.isPending ||
                        uomRows.some((r) => !r.fromUnit.trim() || !r.toUnit.trim() || !r.conversionRate || isNaN(parseFloat(r.conversionRate)) || parseFloat(r.conversionRate) <= 0)
                      }
                      onClick={() => saveUomMut.mutate()}
                    >
                      {saveUomMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                      {t.common.save}
                    </Button>
                  </DialogFooter>
                </div>
              )}
              {/* Tab: Ảnh sản phẩm */}
              {editTab === "images" && (
                <div className="space-y-4">
                  {!editProduct?.images?.length ? (
                    <p className="text-sm text-muted-foreground text-center py-4">{t.catalog.noImages}</p>
                  ) : (
                    <div className="grid grid-cols-4 gap-3">
                      {editProduct.images.map((img) => (
                        <div key={img.id} className="relative group">
                          <img
                            src={img.imageUrl}
                            alt=""
                            className="w-full h-20 object-cover rounded-md border"
                          />
                          {canManage && (
                            <Button
                              variant="destructive"
                              size="sm"
                              className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => deleteImageMut.mutate(img.id)}
                              disabled={deletingImageId === img.id}
                            >
                              {deletingImageId === img.id
                                ? <Loader2 className="h-3 w-3 animate-spin" />
                                : <Trash2 className="h-3 w-3" />
                              }
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {canManage && (
                    <div className="border rounded-md p-3 bg-muted/20 space-y-2">
                      <p className="text-sm font-medium">{t.catalog.uploadImages}</p>
                      <div className="flex gap-2 items-center flex-wrap">
                        <input
                          type="file"
                          multiple
                          accept=".jpg,.jpeg,.png"
                          className="text-sm file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:bg-secondary file:text-secondary-foreground"
                          onChange={(e) => setUploadFiles(Array.from(e.target.files ?? []))}
                        />
                        <Button
                          type="button"
                          size="sm"
                          disabled={!uploadFiles.length || uploadImagesMut.isPending}
                          onClick={() => uploadImagesMut.mutate()}
                        >
                          {uploadImagesMut.isPending
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                            : <Plus className="h-3.5 w-3.5 mr-1" />
                          }
                          {t.catalog.uploadImages}
                        </Button>
                      </div>
                      {uploadFiles.length > 0 && (
                        <p className="text-xs text-muted-foreground">{uploadFiles.length} file được chọn</p>
                      )}
                    </div>
                  )}

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={closeEdit}>{t.common.close}</Button>
                  </DialogFooter>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
