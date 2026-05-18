"use client";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, ClipboardCheck, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { listStockInquiries, getStockInquiry, respondToInquiry } from "@/lib/api/sales";
import { vnd } from "@/lib/format";
import Link from "next/link";
import { useLanguage } from "@/context/language-context";

export default function WarehouseStockInquiriesPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [respondingId, setRespondingId] = useState<number | null>(null);
  const [responseNotes, setResponseNotes] = useState("");
  const [itemResponses, setItemResponses] = useState<Record<number, { isAvailable: boolean; qty: string; note: string }>>({});
  const qc = useQueryClient();
  const { t } = useLanguage();

  const { data, isLoading } = useQuery({
    queryKey: ["wh-stock-inquiries", page, statusFilter],
    queryFn: () => listStockInquiries({ page, limit: 15, status: statusFilter !== "all" ? statusFilter : undefined }).then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const { data: detailRaw } = useQuery({
    queryKey: ["wh-stock-inquiry-detail", respondingId],
    queryFn: () => getStockInquiry(respondingId!).then((r) => r.data),
    enabled: !!respondingId,
  });
  const detail = detailRaw as any;

  useEffect(() => {
    if (detail?.items) {
      const init: Record<number, { isAvailable: boolean; qty: string; note: string }> = {};
      detail.items.forEach((item: any) => { init[item.id] = { isAvailable: true, qty: String(item.requestedQuantity), note: "" }; });
      setItemResponses(init);
    }
  }, [detail]);

  const respondMut = useMutation({
    mutationFn: () => respondToInquiry(respondingId!, {
      responseNotes: responseNotes || undefined,
      items: Object.entries(itemResponses).map(([itemId, resp]) => ({
        itemId: parseInt(itemId),
        isAvailable: resp.isAvailable,
        availableQuantity: resp.isAvailable ? parseFloat(resp.qty) || 0 : undefined,
        warehouseNote: resp.note || undefined,
      })),
    }).then((r) => r.data),
    onSuccess: () => {
      toast.success(t.stockInquiries.sendResponse);
      qc.invalidateQueries({ queryKey: ["wh-stock-inquiries"] });
      setRespondingId(null);
      setResponseNotes("");
      setItemResponses({});
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? t.stockInquiries.sendResponse),
  });

  function updateItemResp(itemId: number, field: string, value: any) {
    setItemResponses((prev) => ({ ...prev, [itemId]: { ...prev[itemId], [field]: value } }));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ClipboardCheck className="h-7 w-7 text-muted-foreground" />
            {t.stockInquiries.titleWarehouse}
          </h1>
          <p className="text-muted-foreground mt-1">{t.stockInquiries.subtitleWarehouse}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/inventory"><Button variant="outline" size="sm">{t.stockInquiries.warehouseLink}</Button></Link>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.stockInquiries.filterAll}</SelectItem>
              <SelectItem value="PENDING">{t.stockInquiries.filterPending}</SelectItem>
              <SelectItem value="RESPONDED">{t.stockInquiries.filterResponded}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.stockInquiries.reqNumber}</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.stockInquiries.salesPerson}</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.common.status}</th>
                    <th className="h-10 px-6 text-center font-medium text-muted-foreground">{t.quotations.products}</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.stockInquiries.createdDate}</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.common.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.items.map((inq: any) => (
                    <tr key={inq.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-3 font-mono text-xs font-medium">{inq.inquiryNumber}</td>
                      <td className="px-6 py-3 text-sm">{inq.requestedBy?.fullName}</td>
                      <td className="px-6 py-3">
                        {inq.status === "PENDING" ? (
                          <Badge variant="secondary" className="text-xs text-yellow-700 bg-yellow-50 border-yellow-200 gap-1">
                            <Clock className="h-3 w-3" /> {t.stockInquiries.statusPending}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs text-green-700 bg-green-50 border-green-200 gap-1">
                            <CheckCircle className="h-3 w-3" /> {t.stockInquiries.statusResponded}
                          </Badge>
                        )}
                      </td>
                      <td className="px-6 py-3 text-center text-muted-foreground">{inq._count?.items ?? 0}</td>
                      <td className="px-6 py-3 text-muted-foreground text-xs">
                        {new Date(inq.createdAt).toLocaleDateString("vi-VN")}
                      </td>
                      <td className="px-6 py-3">
                        {inq.status === "PENDING" ? (
                          <Button size="sm" variant="default" className="h-7 px-2 text-xs gap-1"
                            onClick={() => setRespondingId(inq.id)}>
                            <CheckCircle className="h-3 w-3" /> {t.stockInquiries.respondBtn}
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs"
                            onClick={() => setRespondingId(inq.id)}>
                            {t.stockInquiries.viewBtn}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {data?.items.length === 0 && (
                    <tr><td colSpan={6} className="py-12 text-center text-muted-foreground">{t.stockInquiries.noRequests}</td></tr>
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

      {/* Respond Dialog */}
      <Dialog open={!!respondingId} onOpenChange={(v) => { if (!v) { setRespondingId(null); setResponseNotes(""); setItemResponses({}); } }}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detail?.inquiryNumber}</DialogTitle>
          </DialogHeader>
          {!detail ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : (
            <div className="space-y-4 pt-2">
              {detail.notes && (
                <div className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                  {detail.notes}
                </div>
              )}
              <div className="space-y-3">
                {detail.items.map((item: any) => {
                  const resp = itemResponses[item.id] ?? { isAvailable: true, qty: String(item.requestedQuantity), note: "" };
                  return (
                    <div key={item.id} className="border rounded-md p-3 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-mono text-xs text-blue-600 bg-blue-50 px-1 rounded mr-1">{item.product.sku}</span>
                          <span className="text-sm font-medium">{item.product.productName}</span>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {Number(item.requestedQuantity)} {item.product.unit}
                            {item.product.minPrice && <span className="ml-2 text-orange-600">• {vnd(item.product.minPrice)}</span>}
                          </div>
                        </div>
                        <Select
                          value={resp.isAvailable ? "yes" : "no"}
                          onValueChange={(v) => updateItemResp(item.id, "isAvailable", v === "yes")}
                          disabled={detail.status === "RESPONDED"}
                        >
                          <SelectTrigger className={`w-32 h-8 text-xs ${resp.isAvailable ? "text-green-700 border-green-300" : "text-red-700 border-red-300"}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="yes">✓ {t.stockInquiries.inStock}</SelectItem>
                            <SelectItem value="no">✗ {t.stockInquiries.outOfStock}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {resp.isAvailable && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs">{t.inventory.quantity}</Label>
                            <Input type="number" min="0" step="1" value={resp.qty}
                              onChange={(e) => updateItemResp(item.id, "qty", e.target.value)}
                              disabled={detail.status === "RESPONDED"}
                              className="h-8 text-xs" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">{t.common.notes}</Label>
                            <Input value={resp.note}
                              onChange={(e) => updateItemResp(item.id, "note", e.target.value)}
                              disabled={detail.status === "RESPONDED"}
                              className="h-8 text-xs" />
                          </div>
                        </div>
                      )}
                      {!resp.isAvailable && (
                        <div className="space-y-1">
                          <Label className="text-xs">{t.common.notes}</Label>
                          <Input value={resp.note}
                            onChange={(e) => updateItemResp(item.id, "note", e.target.value)}
                            disabled={detail.status === "RESPONDED"}
                            className="h-8 text-xs" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {detail.status !== "RESPONDED" && (
                <div className="space-y-1.5">
                  <Label>{t.common.notes}</Label>
                  <Input value={responseNotes} onChange={(e) => setResponseNotes(e.target.value)} />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRespondingId(null); setResponseNotes(""); setItemResponses({}); }}>{t.stockInquiries.closeBtn}</Button>
            {detail?.status === "PENDING" && (
              <Button disabled={respondMut.isPending} onClick={() => respondMut.mutate()}>
                {respondMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {t.stockInquiries.sendResponse}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
