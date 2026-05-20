"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { inventoryApi } from "@/lib/api/inventory";
import { ProductSearch } from "@/components/product-search";
import type { ProductSearchResult } from "@/types/inventory";
import { useLanguage } from "@/context/language-context";

const schema = z.object({
  fromWarehouseId: z.string().min(1),
  toWarehouseId: z.string().min(1),
  productId: z.number().int().positive("Chọn sản phẩm"),
  quantity: z.string().refine((v) => parseFloat(v) > 0, "Quantity must be positive"),
  notes: z.string().optional(),
}).refine((d) => d.fromWarehouseId !== d.toWarehouseId, {
  message: "Source and destination must differ",
  path: ["toWarehouseId"],
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess: () => void;
}

export function TransferStockDialog({ open, onOpenChange, onSuccess }: Props) {
  const qc = useQueryClient();
  const { t } = useLanguage();
  const [selectedProduct, setSelectedProduct] = useState<ProductSearchResult | null>(null);

  const { data: warehouses } = useQuery({
    queryKey: ["warehouses"],
    queryFn: inventoryApi.listWarehouses,
    enabled: open,
  });

  const { register, handleSubmit, setValue, reset, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const fromWarehouseId = watch("fromWarehouseId");

  const handleProductSelect = (product: ProductSearchResult) => {
    setSelectedProduct(product);
    setValue("productId", product.id, { shouldValidate: true });
  };

  const handleClose = () => {
    reset();
    setSelectedProduct(null);
    onOpenChange(false);
  };

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      inventoryApi.transferStock({
        fromWarehouseId: parseInt(values.fromWarehouseId),
        toWarehouseId: parseInt(values.toWarehouseId),
        productId: values.productId,
        quantity: parseFloat(values.quantity),
        notes: values.notes,
      }),
    onSuccess: () => {
      toast.success(t.inventory.stockTransferred);
      qc.invalidateQueries({ queryKey: ["stocks"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      reset();
      setSelectedProduct(null);
      onOpenChange(false);
      onSuccess();
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Transfer failed"),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t.inventory.transferTitle}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t.inventory.fromWarehouse}</Label>
              <Select onValueChange={(v) => setValue("fromWarehouseId", v)}>
                <SelectTrigger><SelectValue placeholder={t.inventory.selectWarehouse} /></SelectTrigger>
                <SelectContent>
                  {warehouses?.map((w) => (
                    <SelectItem key={w.id} value={String(w.id)}>{w.warehouseName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t.inventory.toWarehouse}</Label>
              <Select onValueChange={(v) => setValue("toWarehouseId", v)}>
                <SelectTrigger><SelectValue placeholder={t.inventory.selectWarehouse} /></SelectTrigger>
                <SelectContent>
                  {warehouses?.map((w) => (
                    <SelectItem key={w.id} value={String(w.id)}>{w.warehouseName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.toWarehouseId && <p className="text-xs text-destructive">{errors.toWarehouseId.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t.common.product}</Label>
            <ProductSearch
              onSelect={handleProductSelect}
              warehouseId={fromWarehouseId ? parseInt(fromWarehouseId) : undefined}
              placeholder="Tìm sản phẩm..."
            />
            {selectedProduct && (
              <div className="rounded-md bg-muted px-3 py-2 text-sm flex items-center justify-between">
                <div>
                  <span className="font-medium">{selectedProduct.productName}</span>
                  <span className="text-muted-foreground ml-2 text-xs">{selectedProduct.sku}</span>
                </div>
                <span className={selectedProduct.inStock ? "text-xs text-green-600" : "text-xs text-red-500"}>
                  {selectedProduct.inStock ? `Tồn: ${selectedProduct.totalAvailable}` : "Hết hàng"}
                </span>
              </div>
            )}
            {errors.productId && <p className="text-xs text-destructive">{errors.productId.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>{t.inventory.quantity}</Label>
            <Input type="number" step="any" min="0.01" placeholder="e.g. 50" {...register("quantity")} />
            {errors.quantity && <p className="text-xs text-destructive">{errors.quantity.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>{t.common.notes} ({t.common.optional})</Label>
            <Input placeholder={t.inventory.notesPlaceholder} {...register("notes")} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={mutation.isPending || !selectedProduct}>
              {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {t.common.transfer}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
