"use client";
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
import { useLanguage } from "@/context/language-context";

const schema = z.object({
  fromWarehouseId: z.string().min(1),
  toWarehouseId: z.string().min(1),
  productId: z.string().min(1),
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
  const { data: warehouses } = useQuery({
    queryKey: ["warehouses"],
    queryFn: inventoryApi.listWarehouses,
    enabled: open,
  });

  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      inventoryApi.transferStock({
        fromWarehouseId: parseInt(values.fromWarehouseId),
        toWarehouseId: parseInt(values.toWarehouseId),
        productId: parseInt(values.productId),
        quantity: parseFloat(values.quantity),
        notes: values.notes,
      }),
    onSuccess: () => {
      toast.success(t.inventory.stockTransferred);
      qc.invalidateQueries({ queryKey: ["stocks"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      reset();
      onOpenChange(false);
      onSuccess();
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Transfer failed"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t.inventory.transferTitle}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
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
            <Label>{t.inventory.productId}</Label>
            <Input type="number" placeholder={t.inventory.productIdPlaceholder} {...register("productId")} />
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
            <Button type="button" variant="outline" onClick={() => { reset(); onOpenChange(false); }}>
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {t.common.transfer}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
