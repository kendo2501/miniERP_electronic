"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Loader2, Pencil, Trash2, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  listPriceLists, getPriceList, createPriceList, updatePriceList,
  addPriceListItem, removePriceListItem,
} from "@/lib/api/price-list";
import { listProducts } from "@/lib/api/catalog";
import { useAuthStore } from "@/store/auth.store";
import { useLanguage } from "@/context/language-context";
import type { PriceList } from "@/types/catalog";
import Link from "next/link";

const headerSchema = z.object({
  name: z.string().min(1, "Tên bảng giá là bắt buộc"),
  applyTo: z.string().optional(),
  customerTier: z.string().optional(),
  validFrom: z.string().optional(),
  validTo: z.string().optional(),
  isDefault: z.boolean().optional(),
});

type HeaderValues = z.infer<typeof headerSchema>;

function applyToLabel(applyTo?: string, t?: any): string {
  if (!applyTo || applyTo === "DEFAULT") return t?.catalog?.applyToDefault ?? "Mặc định";
  if (applyTo === "TIER") return t?.catalog?.applyToTier ?? "Theo cấp đại lý";
  if (applyTo === "CUSTOMER") return t?.catalog?.applyToCustomer ?? "Theo KH cụ thể";
  return applyTo;
}

function formatDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("vi-VN");
}

export default function PriceListsPage() {
  const qc = useQueryClient();
  const { t } = useLanguage();
  const { hasPermission } = useAuthStore();

  const canManage = hasPermission("catalog.pricelist.manage");

  // ─── List ────────────────────────────────────────────────────────────────────
  const { data: priceLists, isLoading } = useQuery({
    queryKey: ["price-lists"],
    queryFn: () => listPriceLists().then((r) => r.data),
  });

  // ─── Create dialog ───────────────────────────────────────────────────────────
  const [showCreate, setShowCreate] = useState(false);

  const {
    register: regCreate,
    handleSubmit: hsCreate,
    reset: resetCreate,
    watch: watchCreate,
    setValue: setValueCreate,
    formState: { errors: errorsCreate },
  } = useForm<HeaderValues>({ resolver: zodResolver(headerSchema) });

  const createApplyTo = watchCreate("applyTo");

  const createMut = useMutation({
    mutationFn: (v: HeaderValues) =>
      createPriceList({
        name: v.name,
        applyTo: v.applyTo || undefined,
        customerTier: v.customerTier || undefined,
        validFrom: v.validFrom || undefined,
        validTo: v.validTo || undefined,
        isDefault: v.isDefault ?? false,
      }).then((r) => r.data),
    onSuccess: () => {
      toast.success(t.catalog.priceListSaved);
      qc.invalidateQueries({ queryKey: ["price-lists"] });
      setShowCreate(false);
      resetCreate();
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Lỗi tạo bảng giá"),
  });

  // ─── Edit dialog ─────────────────────────────────────────────────────────────
  const [editId, setEditId] = useState<number | null>(null);
  const [editTab, setEditTab] = useState<"header" | "items">("header");

  const {
    register: regEdit,
    handleSubmit: hsEdit,
    reset: resetEdit,
    watch: watchEdit,
    setValue: setValueEdit,
    formState: { errors: errorsEdit },
  } = useForm<HeaderValues>({ resolver: zodResolver(headerSchema) });

  const editApplyTo = watchEdit("applyTo");

  const { data: editDetail, isLoading: loadingDetail } = useQuery({
    queryKey: ["price-list", editId],
    queryFn: () => getPriceList(editId!).then((r) => r.data),
    enabled: editId !== null,
  });

  // Product list for item dropdown
  const { data: productsData } = useQuery({
    queryKey: ["products-all"],
    queryFn: () => listProducts({ limit: 500 }).then((r) => r.data),
    enabled: editId !== null && editTab === "items",
  });
  const allProducts = productsData?.items ?? [];

  const openEdit = (pl: PriceList) => {
    setEditId(pl.id);
    setEditTab("header");
    resetEdit({
      name: pl.name,
      applyTo: pl.applyTo ?? "",
      customerTier: pl.customerTier ?? "",
      validFrom: pl.validFrom ? pl.validFrom.substring(0, 10) : "",
      validTo: pl.validTo ? pl.validTo.substring(0, 10) : "",
      isDefault: pl.isDefault,
    });
  };

  const closeEdit = () => {
    setEditId(null);
    resetEdit();
    setAddProductId("");
    setAddUnitPrice("");
    setAddMinQty("1");
  };

  const updateMut = useMutation({
    mutationFn: (v: HeaderValues) =>
      updatePriceList(editId!, {
        name: v.name,
        applyTo: v.applyTo || undefined,
        customerTier: v.customerTier || undefined,
        validFrom: v.validFrom || undefined,
        validTo: v.validTo || undefined,
        isDefault: v.isDefault ?? false,
      }).then((r) => r.data),
    onSuccess: () => {
      toast.success(t.catalog.priceListSaved);
      qc.invalidateQueries({ queryKey: ["price-lists"] });
      qc.invalidateQueries({ queryKey: ["price-list", editId] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Lỗi cập nhật bảng giá"),
  });

  // ─── Add item form state ─────────────────────────────────────────────────────
  const [addProductId, setAddProductId] = useState("");
  const [addUnitPrice, setAddUnitPrice] = useState("");
  const [addMinQty, setAddMinQty] = useState("1");

  const addItemMut = useMutation({
    mutationFn: () =>
      addPriceListItem(editId!, {
        productId: parseInt(addProductId),
        unitPrice: parseFloat(addUnitPrice),
        minQuantity: parseFloat(addMinQty),
      }).then((r) => r.data),
    onSuccess: () => {
      toast.success(t.catalog.itemAdded);
      qc.invalidateQueries({ queryKey: ["price-list", editId] });
      setAddProductId("");
      setAddUnitPrice("");
      setAddMinQty("1");
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Lỗi thêm sản phẩm"),
  });

  const [removingId, setRemovingId] = useState<number | null>(null);

  const removeItemMut = useMutation({
    mutationFn: (itemId: number) => removePriceListItem(editId!, itemId),
    onMutate: (itemId) => setRemovingId(itemId),
    onSuccess: () => {
      toast.success(t.catalog.itemRemoved);
      qc.invalidateQueries({ queryKey: ["price-list", editId] });
    },
    onSettled: () => setRemovingId(null),
    onError: () => toast.error("Lỗi xoá sản phẩm"),
  });

  const addDisabled =
    addItemMut.isPending ||
    !addProductId ||
    !addUnitPrice ||
    isNaN(parseFloat(addUnitPrice)) ||
    parseFloat(addUnitPrice) < 0 ||
    isNaN(parseFloat(addMinQty)) ||
    parseFloat(addMinQty) <= 0;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t.catalog.priceLists}</h1>
          <p className="text-muted-foreground mt-1">{t.catalog.subtitle}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/catalog/products"><Button variant="outline" size="sm">{t.catalog.products}</Button></Link>
          <Link href="/catalog/categories"><Button variant="outline" size="sm">{t.catalog.categories}</Button></Link>
          <Link href="/catalog/brands"><Button variant="outline" size="sm">{t.catalog.brands}</Button></Link>
          {canManage && (
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4 mr-1" />
              {t.catalog.createPriceList}
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            {priceLists ? `${priceLists.length} ${t.catalog.priceLists.toLowerCase()}` : t.catalog.priceLists}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : !priceLists?.length ? (
            <div className="text-center py-12 text-muted-foreground">{t.common.noData}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-6 py-3 text-left font-medium">{t.catalog.priceListName}</th>
                    <th className="px-6 py-3 text-left font-medium">{t.catalog.applyTo}</th>
                    <th className="px-6 py-3 text-left font-medium">{t.catalog.customerTier}</th>
                    <th className="px-6 py-3 text-left font-medium">{t.catalog.validFrom}</th>
                    <th className="px-6 py-3 text-left font-medium">{t.catalog.validTo}</th>
                    <th className="px-6 py-3 text-center font-medium">{t.catalog.isDefault}</th>
                    <th className="px-6 py-3 text-center font-medium">{t.catalog.priceListItems}</th>
                    {canManage && <th className="px-6 py-3 text-right font-medium">{t.common.actions}</th>}
                  </tr>
                </thead>
                <tbody>
                  {priceLists.map((pl) => (
                    <tr key={pl.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-3 font-medium">{pl.name}</td>
                      <td className="px-6 py-3 text-muted-foreground">{applyToLabel(pl.applyTo, t)}</td>
                      <td className="px-6 py-3 text-muted-foreground">
                        {pl.applyTo === "TIER" ? (pl.customerTier ?? "—") :
                         pl.applyTo === "CUSTOMER" ? (pl.customer?.companyName ?? `#${pl.customerId}`) : "—"}
                      </td>
                      <td className="px-6 py-3 text-muted-foreground">{formatDate(pl.validFrom)}</td>
                      <td className="px-6 py-3 text-muted-foreground">{formatDate(pl.validTo)}</td>
                      <td className="px-6 py-3 text-center">
                        {pl.isDefault && <Badge variant="secondary">✓</Badge>}
                      </td>
                      <td className="px-6 py-3 text-center">
                        <Badge variant="outline">{pl._count?.items ?? 0}</Badge>
                      </td>
                      {canManage && (
                        <td className="px-6 py-3 text-right">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(pl)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Create Dialog ─────────────────────────────────────────────────────── */}
      <Dialog open={showCreate} onOpenChange={(o) => { if (!o) { setShowCreate(false); resetCreate(); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t.catalog.createPriceList}</DialogTitle>
          </DialogHeader>
          <form onSubmit={hsCreate((v) => createMut.mutate(v))} className="space-y-4">
            <div>
              <Label>{t.catalog.priceListName} *</Label>
              <Input {...regCreate("name")} placeholder="Bảng giá Cấp 1" className="mt-1" />
              {errorsCreate.name && <p className="text-xs text-destructive mt-1">{errorsCreate.name.message}</p>}
            </div>

            <div>
              <Label>{t.catalog.applyTo}</Label>
              <Select onValueChange={(v) => setValueCreate("applyTo", v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Chọn loại" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DEFAULT">{t.catalog.applyToDefault}</SelectItem>
                  <SelectItem value="TIER">{t.catalog.applyToTier}</SelectItem>
                  <SelectItem value="CUSTOMER">{t.catalog.applyToCustomer}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {createApplyTo === "TIER" && (
              <div>
                <Label>{t.catalog.customerTier}</Label>
                <Input {...regCreate("customerTier")} placeholder="Cấp 1, Cấp 2..." className="mt-1" />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t.catalog.validFrom}</Label>
                <Input type="date" {...regCreate("validFrom")} className="mt-1" />
              </div>
              <div>
                <Label>{t.catalog.validTo}</Label>
                <Input type="date" {...regCreate("validTo")} className="mt-1" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="isDefault-create" {...regCreate("isDefault")} className="h-4 w-4" />
              <Label htmlFor="isDefault-create">{t.catalog.isDefault}</Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setShowCreate(false); resetCreate(); }}>{t.common.cancel}</Button>
              <Button type="submit" disabled={createMut.isPending}>
                {createMut.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {t.common.create}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── Edit Dialog ───────────────────────────────────────────────────────── */}
      <Dialog open={editId !== null} onOpenChange={(o) => { if (!o) closeEdit(); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t.catalog.editPriceList}</DialogTitle>
          </DialogHeader>

          {/* Tabs */}
          <div className="flex gap-1 border-b mb-4">
            <button
              type="button"
              onClick={() => setEditTab("header")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${editTab === "header" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              Thông tin
            </button>
            <button
              type="button"
              onClick={() => setEditTab("items")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${editTab === "items" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              {t.catalog.priceListItems}
              {editDetail?.items && (
                <span className="ml-1.5 text-xs bg-muted px-1.5 py-0.5 rounded-full">{editDetail.items.length}</span>
              )}
            </button>
          </div>

          {/* Tab: Header */}
          {editTab === "header" && (
            <form onSubmit={hsEdit((v) => updateMut.mutate(v))} className="space-y-4">
              <div>
                <Label>{t.catalog.priceListName} *</Label>
                <Input {...regEdit("name")} placeholder="Bảng giá Cấp 1" className="mt-1" />
                {errorsEdit.name && <p className="text-xs text-destructive mt-1">{errorsEdit.name.message}</p>}
              </div>

              <div>
                <Label>{t.catalog.applyTo}</Label>
                <Select
                  value={editApplyTo ?? ""}
                  onValueChange={(v) => setValueEdit("applyTo", v)}
                >
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Chọn loại" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DEFAULT">{t.catalog.applyToDefault}</SelectItem>
                    <SelectItem value="TIER">{t.catalog.applyToTier}</SelectItem>
                    <SelectItem value="CUSTOMER">{t.catalog.applyToCustomer}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {editApplyTo === "TIER" && (
                <div>
                  <Label>{t.catalog.customerTier}</Label>
                  <Input {...regEdit("customerTier")} placeholder="Cấp 1, Cấp 2..." className="mt-1" />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t.catalog.validFrom}</Label>
                  <Input type="date" {...regEdit("validFrom")} className="mt-1" />
                </div>
                <div>
                  <Label>{t.catalog.validTo}</Label>
                  <Input type="date" {...regEdit("validTo")} className="mt-1" />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" id="isDefault-edit" {...regEdit("isDefault")} className="h-4 w-4" />
                <Label htmlFor="isDefault-edit">{t.catalog.isDefault}</Label>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeEdit}>{t.common.cancel}</Button>
                <Button type="submit" disabled={updateMut.isPending}>
                  {updateMut.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {t.common.save}
                </Button>
              </DialogFooter>
            </form>
          )}

          {/* Tab: Items */}
          {editTab === "items" && (
            <div className="space-y-4">
              {loadingDetail ? (
                <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : (
                <>
                  {/* Existing items */}
                  {!editDetail?.items?.length ? (
                    <p className="text-sm text-muted-foreground text-center py-4">{t.catalog.noItems}</p>
                  ) : (
                    <div className="border rounded-md overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-muted/30 border-b">
                            <th className="px-3 py-2 text-left font-medium">SKU</th>
                            <th className="px-3 py-2 text-left font-medium">{t.common.product}</th>
                            <th className="px-3 py-2 text-right font-medium">{t.catalog.unitPrice}</th>
                            <th className="px-3 py-2 text-right font-medium">{t.catalog.minQuantity}</th>
                            <th className="px-3 py-2 w-10"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {editDetail.items.map((item) => (
                            <tr key={item.id} className="border-b last:border-0 hover:bg-muted/20">
                              <td className="px-3 py-2 text-muted-foreground font-mono text-xs">{item.product?.sku}</td>
                              <td className="px-3 py-2">{item.product?.productName}</td>
                              <td className="px-3 py-2 text-right font-medium">
                                {Number(item.unitPrice).toLocaleString("vi-VN")}
                              </td>
                              <td className="px-3 py-2 text-right text-muted-foreground">{item.minQuantity}</td>
                              <td className="px-3 py-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                  onClick={() => removeItemMut.mutate(item.id)}
                                  disabled={removingId === item.id}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Add item form */}
                  {canManage && (
                    <div className="border rounded-md p-3 bg-muted/20 space-y-3">
                      <p className="text-sm font-medium">{t.catalog.addItem}</p>
                      <div className="grid grid-cols-12 gap-2">
                        <div className="col-span-5">
                          <Label className="text-xs">{t.common.product}</Label>
                          <select
                            value={addProductId}
                            onChange={(e) => setAddProductId(e.target.value)}
                            className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                          >
                            <option value="">— Chọn sản phẩm —</option>
                            {allProducts.map((p) => (
                              <option key={p.id} value={String(p.id)}>
                                {p.sku} — {p.productName}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="col-span-4">
                          <Label className="text-xs">{t.catalog.unitPrice}</Label>
                          <Input
                            type="number"
                            min="0"
                            step="1000"
                            placeholder="100000"
                            value={addUnitPrice}
                            onChange={(e) => setAddUnitPrice(e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs">{t.catalog.minQuantity}</Label>
                          <Input
                            type="number"
                            min="0.000001"
                            step="1"
                            placeholder="1"
                            value={addMinQty}
                            onChange={(e) => setAddMinQty(e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        <div className="col-span-1 flex items-end">
                          <Button
                            type="button"
                            size="sm"
                            className="w-full"
                            onClick={() => addItemMut.mutate()}
                            disabled={addDisabled}
                          >
                            {addItemMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeEdit}>{t.common.close}</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
