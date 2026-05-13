"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Loader2, ChevronRight, FolderOpen, Trash2, FileDown, Upload, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { listCategories, createCategory, deactivateCategory, exportCategoryTemplate, importCategories } from "@/lib/api/catalog";
import { useAuthStore } from "@/store/auth.store";
import { useLanguage } from "@/context/language-context";
import type { Category } from "@/types/catalog";
import Link from "next/link";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().optional(),
  description: z.string().optional(),
  parentId: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function CategoryRow({ cat, onDeactivate, canManage, depth = 0, t }: {
  cat: Category; onDeactivate: (id: number) => void; canManage: boolean; depth?: number; t: any;
}) {
  return (
    <>
      <tr className="border-b last:border-0 hover:bg-muted/30 transition-colors">
        <td className="px-6 py-3">
          <div className="flex items-center gap-2" style={{ paddingLeft: `${depth * 20}px` }}>
            {depth > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />}
            <FolderOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="font-medium">{cat.name}</span>
          </div>
        </td>
        <td className="px-6 py-3 font-mono text-xs text-muted-foreground">{cat.code ?? "—"}</td>
        <td className="px-6 py-3 text-muted-foreground text-sm max-w-xs truncate">{cat.description ?? "—"}</td>
        <td className="px-6 py-3">
          <Badge variant={cat.isActive ? "success" : "secondary"}>
            {cat.isActive ? t.common.active : t.common.inactive}
          </Badge>
        </td>
        <td className="px-6 py-3">
          {canManage && cat.isActive && (
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-destructive"
              onClick={() => onDeactivate(cat.id)}>
              <Trash2 className="h-3 w-3" /> {t.common.remove}
            </Button>
          )}
        </td>
      </tr>
      {cat.children?.map((child) => (
        <CategoryRow key={child.id} cat={child} onDeactivate={onDeactivate} canManage={canManage} depth={depth + 1} t={t} />
      ))}
    </>
  );
}

type ImportResult = { created: number; updated: number; errors: { row: number; message: string }[] };

export default function CategoriesPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const { hasPermission } = useAuthStore();
  const qc = useQueryClient();
  const { t } = useLanguage();

  const { data: categories, isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: () => listCategories().then((r) => r.data),
  });

  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const createMut = useMutation({
    mutationFn: (v: FormValues) =>
      createCategory({ name: v.name, code: v.code || undefined, description: v.description || undefined, parentId: v.parentId ? parseInt(v.parentId) : undefined }).then((r) => r.data),
    onSuccess: () => {
      toast.success(t.catalog.categoryCreated);
      qc.invalidateQueries({ queryKey: ["categories"] });
      setShowCreate(false);
      reset();
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed to create category"),
  });

  const deactivateMut = useMutation({
    mutationFn: (id: number) => deactivateCategory(id),
    onSuccess: () => { toast.success(t.catalog.categoryRemoved); qc.invalidateQueries({ queryKey: ["categories"] }); },
    onError: () => toast.error("Failed to remove category"),
  });

  const importMut = useMutation({
    mutationFn: (file: File) => importCategories(file).then((r) => r.data),
    onSuccess: (data) => {
      setImportResult(data);
      if (data.errors.length === 0) toast.success(t.catalog.importSuccess);
      qc.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Import thất bại"),
  });

  const handleExportTemplate = async () => {
    try {
      const res = await exportCategoryTemplate();
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url; a.download = "categories-template.xlsx"; a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Xuất file thất bại");
    }
  };

  const canManage = hasPermission("catalog.category.manage");

  const buildTree = (cats: Category[]): Category[] => {
    const map = new Map(cats.map((c) => [c.id, { ...c, children: [] as Category[] }]));
    const roots: Category[] = [];
    map.forEach((cat) => {
      if (cat.parentId && map.has(cat.parentId)) {
        map.get(cat.parentId)!.children!.push(cat);
      } else {
        roots.push(cat);
      }
    });
    return roots;
  };

  const tree = categories ? buildTree(categories) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t.catalog.categories}</h1>
          <p className="text-muted-foreground mt-1">{t.catalog.title}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/catalog/products"><Button variant="outline" size="sm">{t.catalog.products}</Button></Link>
          <Link href="/catalog/brands"><Button variant="outline" size="sm">{t.catalog.brands}</Button></Link>
          <Button variant="outline" size="sm" onClick={handleExportTemplate}>
            <FileDown className="h-4 w-4" />
            {t.catalog.exportTemplate}
          </Button>
          {canManage && (
            <Button variant="outline" size="sm" onClick={() => { setShowImport(true); setImportFile(null); setImportResult(null); }}>
              <Upload className="h-4 w-4" />
              {t.catalog.importExcel}
            </Button>
          )}
          {canManage && (
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4" />
              {t.catalog.newCategory}
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-muted-foreground font-normal">
            {categories?.length ?? 0} {t.catalog.totalCategories}
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
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.common.status}</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.common.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {tree.map((cat) => (
                    <CategoryRow key={cat.id} cat={cat} onDeactivate={(id) => deactivateMut.mutate(id)} canManage={canManage} t={t} />
                  ))}
                  {tree.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-muted-foreground">{t.catalog.noCategories}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Import Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={showImport} onOpenChange={(v) => { setShowImport(v); if (!v) { setImportFile(null); setImportResult(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t.catalog.importCategories}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Upload file Excel (.xlsx) theo mẫu. Nếu code đã tồn tại → cập nhật; nếu chưa → tạo mới.
            </p>
            <div className="space-y-1.5">
              <Label>{t.catalog.selectFile}</Label>
              <Input
                type="file"
                accept=".xlsx"
                onChange={(e) => { setImportFile(e.target.files?.[0] ?? null); setImportResult(null); }}
              />
            </div>
            {importResult && (
              <div className="rounded-md border p-3 space-y-1 text-sm">
                <p className="font-medium">{t.catalog.importSuccess}</p>
                <p className="text-muted-foreground">
                  {t.catalog.importCreated}: <span className="font-semibold text-green-600">{importResult.created}</span>
                  {" · "}
                  {t.catalog.importUpdated}: <span className="font-semibold text-blue-600">{importResult.updated}</span>
                </p>
                {importResult.errors.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="text-destructive font-medium flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" /> {t.catalog.importErrors} ({importResult.errors.length})
                    </p>
                    {importResult.errors.map((err) => (
                      <p key={err.row} className="text-xs text-destructive pl-5">
                        Row {err.row}: {err.message}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImport(false)}>{t.common.cancel}</Button>
            <Button
              disabled={!importFile || importMut.isPending}
              onClick={() => importFile && importMut.mutate(importFile)}
            >
              {importMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t.catalog.importExcel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCreate} onOpenChange={(v) => { setShowCreate(v); if (!v) reset(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t.catalog.newCategory}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit((v) => createMut.mutate(v))} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>{t.common.name} *</Label>
              <Input placeholder="Electronics" {...register("name")} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>{t.common.code}</Label>
              <Input placeholder="ELEC" {...register("code")} />
            </div>
            <div className="space-y-1.5">
              <Label>{t.common.description}</Label>
              <Input placeholder={t.catalog.descriptionPlaceholder} {...register("description")} />
            </div>
            <div className="space-y-1.5">
              <Label>{t.catalog.parentCategory}</Label>
              <Select onValueChange={(v) => setValue("parentId", v)}>
                <SelectTrigger><SelectValue placeholder={t.catalog.topLevel} /></SelectTrigger>
                <SelectContent>
                  {categories?.filter((c) => c.isActive).map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setShowCreate(false); reset(); }}>{t.common.cancel}</Button>
              <Button type="submit" disabled={createMut.isPending}>
                {createMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {t.catalog.newCategory}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
