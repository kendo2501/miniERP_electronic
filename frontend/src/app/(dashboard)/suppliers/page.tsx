"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Search, Plus, Loader2, Building2, Phone, Mail, Pencil, Trash2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier } from "@/lib/api/suppliers";
import type { Supplier, CreateSupplierDto, UpdateSupplierDto } from "@/types/suppliers";
import { useAuthStore } from "@/store/auth.store";
import { useLanguage } from "@/context/language-context";

const schema = z.object({
  companyName: z.string().min(1, "Bắt buộc"),
  contactName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Email không hợp lệ").optional().or(z.literal("")),
  address: z.string().optional(),
  taxCode: z.string().optional(),
  rating: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={status === "ACTIVE" ? "default" : "secondary"} className="text-xs">
      {status === "ACTIVE" ? "Hoạt động" : "Ngừng HĐ"}
    </Badge>
  );
}

function RatingStars({ rating }: { rating: number | null }) {
  if (!rating) return <span className="text-muted-foreground text-xs">—</span>;
  return (
    <span className="flex items-center gap-0.5 text-amber-500">
      {Array.from({ length: rating }).map((_, i) => (
        <Star key={i} className="h-3 w-3 fill-current" />
      ))}
    </span>
  );
}

export default function SuppliersPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Supplier | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);

  const qc = useQueryClient();
  const { hasPermission } = useAuthStore();
  const { t } = useLanguage();
  const s = t.suppliers;

  const canCreate = hasPermission("supplier.create");
  const canUpdate = hasPermission("supplier.update");
  const canDelete = hasPermission("supplier.delete");

  const { data, isLoading } = useQuery({
    queryKey: ["suppliers", page, search, statusFilter],
    queryFn: () =>
      getSuppliers({
        page,
        limit: 20,
        ...(search && { search }),
        ...(statusFilter !== "ALL" && { status: statusFilter }),
      }).then((r) => r.data),
  });

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const createMut = useMutation({
    mutationFn: (dto: CreateSupplierDto) => createSupplier(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success(s.created);
      setShowForm(false);
      reset();
    },
    onError: () => toast.error("Lỗi khi tạo nhà cung cấp"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdateSupplierDto }) => updateSupplier(id, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success(s.updated);
      setEditTarget(null);
      reset();
    },
    onError: () => toast.error("Lỗi khi cập nhật"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteSupplier(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success(s.deleted);
      setDeleteTarget(null);
    },
    onError: () => toast.error("Lỗi khi xóa"),
  });

  function openCreate() {
    reset({});
    setEditTarget(null);
    setShowForm(true);
  }

  function openEdit(supplier: Supplier) {
    reset({
      companyName: supplier.companyName,
      contactName: supplier.contactName ?? "",
      phone: supplier.phone ?? "",
      email: supplier.email ?? "",
      address: supplier.address ?? "",
      taxCode: supplier.taxCode ?? "",
      rating: supplier.rating != null ? String(supplier.rating) : "",
    });
    setEditTarget(supplier);
    setShowForm(true);
  }

  function onSubmit(values: FormValues) {
    const payload = {
      ...values,
      rating: values.rating !== "" && values.rating !== undefined ? parseInt(values.rating, 10) : undefined,
    };
    if (editTarget) {
      updateMut.mutate({ id: editTarget.id, dto: payload });
    } else {
      createMut.mutate(payload);
    }
  }

  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{s.title}</h1>
          <p className="text-muted-foreground text-sm">{s.subtitle}</p>
        </div>
        {canCreate && (
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            {s.newSupplier}
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={s.searchPlaceholder}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder={s.allStatuses} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{s.allStatuses}</SelectItem>
            <SelectItem value="ACTIVE">{s.active}</SelectItem>
            <SelectItem value="INACTIVE">{s.inactive}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">{s.noSuppliers}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium">{s.supplierCode}</th>
                    <th className="text-left px-4 py-3 font-medium">{s.companyName}</th>
                    <th className="text-left px-4 py-3 font-medium">{s.contactName}</th>
                    <th className="text-left px-4 py-3 font-medium">{s.phone}</th>
                    <th className="text-left px-4 py-3 font-medium">{s.email}</th>
                    <th className="text-left px-4 py-3 font-medium">{s.taxCode}</th>
                    <th className="text-left px-4 py-3 font-medium">{s.rating}</th>
                    <th className="text-left px-4 py-3 font-medium">{s.status}</th>
                    {(canUpdate || canDelete) && <th className="px-4 py-3" />}
                  </tr>
                </thead>
                <tbody>
                  {items.map((sup) => (
                    <tr key={sup.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{sup.supplierCode}</td>
                      <td className="px-4 py-3 font-medium">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                          {sup.companyName}
                        </div>
                      </td>
                      <td className="px-4 py-3">{sup.contactName ?? "—"}</td>
                      <td className="px-4 py-3">
                        {sup.phone ? (
                          <div className="flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                            {sup.phone}
                          </div>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {sup.email ? (
                          <div className="flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                            {sup.email}
                          </div>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{sup.taxCode ?? "—"}</td>
                      <td className="px-4 py-3"><RatingStars rating={sup.rating} /></td>
                      <td className="px-4 py-3"><StatusBadge status={sup.status} /></td>
                      {(canUpdate || canDelete) && (
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {canUpdate && (
                              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(sup)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {canDelete && (
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(sup)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            Trước
          </Button>
          <span className="text-sm text-muted-foreground">Trang {page} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
            Sau
          </Button>
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) { setShowForm(false); setEditTarget(null); reset(); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editTarget ? s.editSupplier : s.createSupplier}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>{s.companyName} *</Label>
              <Input {...register("companyName")} />
              {errors.companyName && <p className="text-xs text-destructive">{errors.companyName.message}</p>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{s.contactName} <span className="text-muted-foreground text-xs">({s.optional})</span></Label>
                <Input {...register("contactName")} />
              </div>
              <div className="space-y-1">
                <Label>{s.phone} <span className="text-muted-foreground text-xs">({s.optional})</span></Label>
                <Input {...register("phone")} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{s.email} <span className="text-muted-foreground text-xs">({s.optional})</span></Label>
                <Input {...register("email")} type="email" />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>{s.taxCode} <span className="text-muted-foreground text-xs">({s.optional})</span></Label>
                <Input {...register("taxCode")} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>{s.address} <span className="text-muted-foreground text-xs">({s.optional})</span></Label>
              <Input {...register("address")} />
            </div>
            <div className="space-y-1">
              <Label>{s.rating} <span className="text-muted-foreground text-xs">(0–5, {s.optional})</span></Label>
              <Input {...register("rating")} type="number" min={0} max={5} />
              {errors.rating && <p className="text-xs text-destructive">{errors.rating.message}</p>}
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditTarget(null); reset(); }}>
                Hủy
              </Button>
              <Button type="submit" disabled={isSubmitting || createMut.isPending || updateMut.isPending}>
                {(isSubmitting || createMut.isPending || updateMut.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editTarget ? "Lưu" : "Tạo"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Xác nhận xóa</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">{s.confirmDelete}</p>
          <p className="font-medium">{deleteTarget?.companyName}</p>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Hủy</Button>
            <Button
              variant="destructive"
              disabled={deleteMut.isPending}
              onClick={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
            >
              {deleteMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
