"use client";
import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
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

const ADJUSTMENT_TYPES = [
  { value: "IN", label: "Nhập kho" },
  { value: "OUT", label: "Xuất kho" },
  { value: "DAMAGE", label: "Hàng hỏng / ghi giảm" },
  { value: "RETURN", label: "Hàng trả lại" },
  { value: "CORRECTION", label: "Kiểm kê điều chỉnh" },
] as const;

const schema = z.object({
  warehouseId: z.string().min(1, "Chọn kho"),
  productId: z.number().int().positive("Chọn sản phẩm"),
  quantity: z.number().positive("Số lượng phải > 0"),
  adjustmentType: z.enum(["IN", "OUT", "DAMAGE", "RETURN", "CORRECTION"]),
  reason: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess: () => void;
  preSelectedWarehouseId?: number;
}

export function AdjustStockDialog({ open, onOpenChange, onSuccess, preSelectedWarehouseId }: Props) {
  const qc = useQueryClient();
  const { t } = useLanguage();
  const [selectedProduct, setSelectedProduct] = useState<ProductSearchResult | null>(null);

  const { data: warehouses } = useQuery({
    queryKey: ["warehouses"],
    queryFn: inventoryApi.listWarehouses,
    enabled: open,
  });

  const { register, handleSubmit, setValue, control, reset, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      warehouseId: preSelectedWarehouseId ? String(preSelectedWarehouseId) : "",
      adjustmentType: "IN",
    },
  });

  const selectedWarehouseId = watch("warehouseId");

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      inventoryApi.adjustStock({
        warehouseId: parseInt(values.warehouseId),
        productId: values.productId,
        quantity: values.quantity,
        adjustmentType: values.adjustmentType,
        reason: values.reason,
        notes: values.notes,
      }),
    onSuccess: () => {
      toast.success("Đã điều chỉnh tồn kho");
      qc.invalidateQueries({ queryKey: ["stocks"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      reset({ adjustmentType: "IN", warehouseId: selectedWarehouseId });
      setSelectedProduct(null);
      onSuccess();
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Không thể điều chỉnh tồn kho"),
  });

  const handleProductSelect = (product: ProductSearchResult) => {
    setSelectedProduct(product);
    setValue("productId", product.id, { shouldValidate: true });
  };

  const handleClose = () => {
    reset({ adjustmentType: "IN" });
    setSelectedProduct(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Điều chỉnh tồn kho</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4 pt-2">
          {/* Warehouse */}
          <div className="space-y-1.5">
            <Label>Kho hàng</Label>
            <Controller
              control={control}
              name="warehouseId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn kho" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses?.map((w) => (
                      <SelectItem key={w.id} value={String(w.id)}>{w.warehouseName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.warehouseId && <p className="text-xs text-destructive">{errors.warehouseId.message}</p>}
          </div>

          {/* Product search */}
          <div className="space-y-1.5">
            <Label>Sản phẩm</Label>
            <ProductSearch
              onSelect={handleProductSelect}
              warehouseId={selectedWarehouseId ? parseInt(selectedWarehouseId) : undefined}
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
            {errors.productId && <p className="text-xs text-destructive">Vui lòng chọn sản phẩm</p>}
          </div>

          {/* Adjustment type */}
          <div className="space-y-1.5">
            <Label>Loại điều chỉnh</Label>
            <Controller
              control={control}
              name="adjustmentType"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ADJUSTMENT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Quantity */}
          <div className="space-y-1.5">
            <Label>Số lượng</Label>
            <Input type="number" step="any" min="0.01" placeholder="VD: 10" {...register("quantity", { valueAsNumber: true })} />
            {errors.quantity && <p className="text-xs text-destructive">{errors.quantity.message}</p>}
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <Label>Lý do <span className="text-muted-foreground text-xs">(tuỳ chọn)</span></Label>
            <Input placeholder="Nhập lý do điều chỉnh..." {...register("reason")} />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Ghi chú <span className="text-muted-foreground text-xs">(tuỳ chọn)</span></Label>
            <Input placeholder="Ghi chú thêm..." {...register("notes")} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>Hủy</Button>
            <Button type="submit" disabled={mutation.isPending || !selectedProduct}>
              {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Điều chỉnh
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
