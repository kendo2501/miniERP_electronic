"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Warehouse, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { inventoryApi } from "@/lib/api/inventory";
import { useAuthStore } from "@/store/auth.store";
import { useLanguage } from "@/context/language-context";
import Link from "next/link";

const schema = z.object({
  code: z.string().min(1).max(100),
  warehouseName: z.string().min(1).max(255),
  address: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export default function WarehousesPage() {
  const [showCreate, setShowCreate] = useState(false);
  const { hasPermission } = useAuthStore();
  const qc = useQueryClient();
  const { t } = useLanguage();

  const { data: warehouses, isLoading } = useQuery({
    queryKey: ["warehouses"],
    queryFn: inventoryApi.listWarehouses,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const createMutation = useMutation({
    mutationFn: inventoryApi.createWarehouse,
    onSuccess: () => {
      toast.success(t.inventory.warehouseCreated);
      qc.invalidateQueries({ queryKey: ["warehouses"] });
      reset();
      setShowCreate(false);
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed to create warehouse"),
  });

  const canManage = hasPermission("inventory.warehouse.manage");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/inventory">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t.inventory.warehouses}</h1>
            <p className="text-muted-foreground mt-1">{t.inventory.manageLocations}</p>
          </div>
        </div>
        {canManage && (
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" />
            {t.inventory.addWarehouse}
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {warehouses?.map((w) => (
            <Card key={w.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Warehouse className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-base">{w.warehouseName}</CardTitle>
                  </div>
                  <Badge variant={w.status === "ACTIVE" ? "success" : "secondary"} className="text-xs">
                    {w.status ?? "ACTIVE"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-1.5 text-sm text-muted-foreground">
                <p><span className="font-medium text-foreground">{t.common.code}:</span> {w.code}</p>
                {w.address && <p><span className="font-medium text-foreground">{t.common.address}:</span> {w.address}</p>}
                {w._count && (
                  <p><span className="font-medium text-foreground">{t.common.stockLines}:</span> {w._count.inventoryStocks}</p>
                )}
              </CardContent>
            </Card>
          ))}
          {warehouses?.length === 0 && (
            <div className="col-span-3 py-12 text-center text-muted-foreground">
              {t.inventory.noWarehouses}
            </div>
          )}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.inventory.createWarehouse}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit((v) => createMutation.mutate(v))} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>{t.inventory.warehouseCode}</Label>
              <Input placeholder={t.inventory.warehouseCodePlaceholder} {...register("code")} />
              {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>{t.common.name}</Label>
              <Input placeholder={t.inventory.warehouseNamePlaceholder} {...register("warehouseName")} />
              {errors.warehouseName && <p className="text-xs text-destructive">{errors.warehouseName.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>{t.common.address} ({t.common.optional})</Label>
              <Input placeholder={t.inventory.addressPlaceholder} {...register("address")} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => { reset(); setShowCreate(false); }}>
                {t.common.cancel}
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {t.common.create}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
