"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RotateCcw, Loader2, Search, CheckCircle2, XCircle, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { listReturns, approveReturn, rejectReturn, createReturn } from "@/lib/api/sales";
import { listOrders } from "@/lib/api/sales";
import { useAuthStore } from "@/store/auth.store";
import { useLanguage } from "@/context/language-context";

const STATUS_VARIANTS: Record<string, string> = {
  PENDING: "warning",
  APPROVED: "default",
  REJECTED: "destructive",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "text-orange-600 border-orange-300",
  APPROVED: "text-green-600 border-green-300",
  REJECTED: "text-red-600 border-red-300",
};

export default function SalesReturnsPage() {
  const { hasPermission } = useAuthStore();
  const { t } = useLanguage();
  const qc = useQueryClient();

  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page] = useState(1);

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [orderSearch, setOrderSearch] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [returnReason, setReturnReason] = useState("");
  const [returnItems, setReturnItems] = useState<{ productId: number; quantity: number; reason: string }[]>([]);
  const [newItem, setNewItem] = useState({ productId: "", quantity: "", reason: "" });

  const canApprove = hasPermission("sales.order.approve");
  const canCreate = hasPermission("sales.order.create");

  const params: Record<string, unknown> = { page, limit: 20 };
  if (statusFilter !== "ALL") params.status = statusFilter;

  const { data, isLoading } = useQuery({
    queryKey: ["sales-returns", params],
    queryFn: () => listReturns(params),
  });

  const { data: ordersData } = useQuery({
    queryKey: ["orders-for-return", orderSearch],
    queryFn: () => listOrders({ search: orderSearch, limit: 20 }),
    enabled: createOpen,
  });

  const approveMut = useMutation({
    mutationFn: (id: number) => approveReturn(id),
    onSuccess: () => {
      toast.success(t.salesReturns.approved);
      qc.invalidateQueries({ queryKey: ["sales-returns"] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? "Error"),
  });

  const rejectMut = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => rejectReturn(id, reason),
    onSuccess: () => {
      toast.success(t.salesReturns.rejected);
      qc.invalidateQueries({ queryKey: ["sales-returns"] });
      setRejectOpen(false);
      setRejectReason("");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? "Error"),
  });

  const createMut = useMutation({
    mutationFn: (payload: { salesOrderId: number; items: { productId: number; quantity: number; reason?: string }[]; reason?: string }) =>
      createReturn(payload),
    onSuccess: () => {
      toast.success(t.salesReturns.created);
      qc.invalidateQueries({ queryKey: ["sales-returns"] });
      setCreateOpen(false);
      setReturnItems([]);
      setSelectedOrderId(null);
      setReturnReason("");
      setNewItem({ productId: "", quantity: "", reason: "" });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? "Error"),
  });

  const items = (data as any)?.items ?? [];
  const total = (data as any)?.total ?? 0;
  const deliveredOrders = (ordersData as any)?.items?.filter((o: any) => o.deliveryStatus === "DELIVERED") ?? [];

  function addItem() {
    const productId = parseInt(newItem.productId, 10);
    const quantity = parseFloat(newItem.quantity);
    if (!productId || !quantity || quantity <= 0) return;
    setReturnItems((prev) => [...prev, { productId, quantity, reason: newItem.reason }]);
    setNewItem({ productId: "", quantity: "", reason: "" });
  }

  function submitCreate() {
    if (!selectedOrderId) return toast.error("Please select an order");
    if (returnItems.length === 0) return toast.error("Please add at least one item");
    createMut.mutate({ salesOrderId: selectedOrderId, items: returnItems, reason: returnReason || undefined });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t.salesReturns.title}</h1>
          <p className="text-muted-foreground mt-1">{t.salesReturns.subtitle}</p>
        </div>
        {canCreate && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t.salesReturns.createReturn}
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t.salesReturns.allStatuses}</SelectItem>
                <SelectItem value="PENDING">{t.salesReturns.pending}</SelectItem>
                <SelectItem value="APPROVED">{t.common.approve}</SelectItem>
                <SelectItem value="REJECTED">{t.common.reject}</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground ml-auto">
              {total} {t.salesReturns.totalReturns}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-muted-foreground" />
            <span className="font-semibold">{t.salesReturns.title}</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <RotateCcw className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>{t.salesReturns.noReturns}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">{t.salesReturns.returnNumber}</th>
                    <th className="px-4 py-3 text-left font-medium">{t.salesReturns.salesOrder}</th>
                    <th className="px-4 py-3 text-left font-medium">{t.salesReturns.reason}</th>
                    <th className="px-4 py-3 text-left font-medium">{t.salesReturns.status}</th>
                    <th className="px-4 py-3 text-left font-medium">{t.salesReturns.returnDate}</th>
                    <th className="px-4 py-3 text-right font-medium">{t.common.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((r: any) => (
                    <tr key={r.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs">{r.returnNumber}</td>
                      <td className="px-4 py-3 font-mono text-xs">{r.salesOrder?.orderNumber ?? "-"}</td>
                      <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">{r.reason ?? "-"}</td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={STATUS_VARIANTS[r.status] as any ?? "secondary"}
                          className={STATUS_COLORS[r.status]}
                        >
                          {r.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "-"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {canApprove && r.status === "PENDING" && (
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-green-700 border-green-300 hover:bg-green-50"
                              disabled={approveMut.isPending}
                              onClick={() => {
                                if (confirm(t.salesReturns.confirmApprove)) approveMut.mutate(r.id);
                              }}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                              {t.common.approve}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-red-700 border-red-300 hover:bg-red-50"
                              onClick={() => { setRejectId(r.id); setRejectOpen(true); }}
                            >
                              <XCircle className="h-3.5 w-3.5 mr-1" />
                              {t.common.reject}
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.salesReturns.rejectTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label>{t.salesReturns.rejectReason}</Label>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              placeholder="..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>{t.common.cancel}</Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim() || rejectMut.isPending}
              onClick={() => rejectId && rejectMut.mutate({ id: rejectId, reason: rejectReason })}
            >
              {rejectMut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {t.common.reject}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t.salesReturns.createTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Order search */}
            <div className="space-y-1.5">
              <Label>{t.salesReturns.selectOrder}</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Search order number..."
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  className="flex-1"
                />
                <Search className="h-4 w-4 self-center text-muted-foreground" />
              </div>
              {deliveredOrders.length > 0 && (
                <div className="border rounded-md divide-y max-h-40 overflow-y-auto">
                  {deliveredOrders.map((o: any) => (
                    <button
                      key={o.id}
                      className={`w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors ${selectedOrderId === o.id ? "bg-primary/10 font-medium" : ""}`}
                      onClick={() => setSelectedOrderId(o.id)}
                    >
                      <span className="font-mono">{o.orderNumber}</span>
                      <span className="ml-2 text-muted-foreground">{o.customer?.companyName}</span>
                    </button>
                  ))}
                </div>
              )}
              {selectedOrderId && (
                <p className="text-xs text-green-700">Order #{selectedOrderId} selected</p>
              )}
            </div>

            {/* Overall reason */}
            <div className="space-y-1.5">
              <Label>{t.salesReturns.reason} <span className="text-muted-foreground text-xs">({t.common.optional})</span></Label>
              <Textarea
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                rows={2}
                placeholder="General return reason..."
              />
            </div>

            {/* Items */}
            <div className="space-y-2">
              <Label>{t.salesReturns.items}</Label>
              <div className="border rounded-md p-3 space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="Product ID"
                    value={newItem.productId}
                    onChange={(e) => setNewItem((p) => ({ ...p, productId: e.target.value }))}
                    className="w-28"
                    type="number"
                  />
                  <Input
                    placeholder="Quantity"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem((p) => ({ ...p, quantity: e.target.value }))}
                    className="w-24"
                    type="number"
                    min="0.001"
                    step="0.001"
                  />
                  <Input
                    placeholder="Item reason (optional)"
                    value={newItem.reason}
                    onChange={(e) => setNewItem((p) => ({ ...p, reason: e.target.value }))}
                    className="flex-1"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={addItem}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {returnItems.length > 0 && (
                  <div className="space-y-1">
                    {returnItems.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm py-1 border-t">
                        <span className="font-mono text-xs w-20">ID: {item.productId}</span>
                        <span className="w-16">× {item.quantity}</span>
                        <span className="flex-1 text-muted-foreground truncate">{item.reason || "-"}</span>
                        <Button
                          variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-500"
                          onClick={() => setReturnItems((p) => p.filter((_, i) => i !== idx))}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>{t.common.cancel}</Button>
            <Button
              disabled={createMut.isPending || !selectedOrderId || returnItems.length === 0}
              onClick={submitCreate}
            >
              {createMut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {createMut.isPending ? t.salesReturns.creating : t.common.create}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
