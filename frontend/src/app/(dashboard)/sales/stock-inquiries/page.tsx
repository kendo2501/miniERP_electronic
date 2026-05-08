"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2, Trash2, ClipboardCheck, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { listStockInquiries, createStockInquiry, getStockInquiry } from "@/lib/api/sales";
import { ProductSelect } from "@/components/product-select";
import { vnd } from "@/lib/format";
import type { Product } from "@/types/catalog";
import Link from "next/link";

export default function StockInquiriesPage() {
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState([{ productId: "", product: null as Product | null, quantity: "1" }]);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["stock-inquiries", page],
    queryFn: () => listStockInquiries({ page, limit: 15 }).then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const { data: detail } = useQuery({
    queryKey: ["stock-inquiry", detailId],
    queryFn: () => getStockInquiry(detailId!).then((r) => r.data),
    enabled: !!detailId,
  });

  const createMut = useMutation({
    mutationFn: () => createStockInquiry({
      notes: notes || undefined,
      items: items.filter((i) => i.productId).map((i) => ({
        productId: parseInt(i.productId),
        requestedQuantity: parseFloat(i.quantity) || 1,
      })),
    }).then((r) => r.data),
    onSuccess: () => {
      toast.success("Đã gửi yêu cầu kiểm tra tồn kho");
      qc.invalidateQueries({ queryKey: ["stock-inquiries"] });
      setShowCreate(false);
      setNotes("");
      setItems([{ productId: "", product: null, quantity: "1" }]);
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Gửi yêu cầu thất bại"),
  });

  function handleProductChange(idx: number, productId: string, product?: Product) {
    setItems((prev) => prev.map((it, i) => i === idx ? { ...it, productId, product: product ?? null } : it));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ClipboardCheck className="h-7 w-7 text-muted-foreground" />
            Kiểm tra tồn kho
          </h1>
          <p className="text-muted-foreground mt-1">Hỏi nhân viên kho trước khi tạo báo giá hoặc đơn hàng</p>
        </div>
        <div className="flex gap-2">
          <Link href="/sales/quotations"><Button variant="outline" size="sm">Báo giá</Button></Link>
          <Link href="/sales/orders"><Button variant="outline" size="sm">Đơn hàng</Button></Link>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" /> Yêu cầu mới
          </Button>
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
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">Mã yêu cầu</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">Trạng thái</th>
                    <th className="h-10 px-6 text-center font-medium text-muted-foreground">SP</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">Người phản hồi</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">Ngày tạo</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.items.map((inq: any) => (
                    <tr key={inq.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-3 font-mono text-xs font-medium">{inq.inquiryNumber}</td>
                      <td className="px-6 py-3">
                        {inq.status === "PENDING" ? (
                          <Badge variant="secondary" className="text-xs text-yellow-700 bg-yellow-50 border-yellow-200 gap-1">
                            <Clock className="h-3 w-3" /> Chờ phản hồi
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs text-green-700 bg-green-50 border-green-200 gap-1">
                            <CheckCircle className="h-3 w-3" /> Đã phản hồi
                          </Badge>
                        )}
                      </td>
                      <td className="px-6 py-3 text-center text-muted-foreground">{inq._count?.items ?? 0}</td>
                      <td className="px-6 py-3 text-muted-foreground text-xs">
                        {inq.respondedBy?.fullName ?? "—"}
                      </td>
                      <td className="px-6 py-3 text-muted-foreground text-xs">
                        {new Date(inq.createdAt).toLocaleDateString("vi-VN")}
                      </td>
                      <td className="px-6 py-3">
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs"
                          onClick={() => setDetailId(inq.id)}>
                          Xem chi tiết
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {data?.items.length === 0 && (
                    <tr><td colSpan={6} className="py-12 text-center text-muted-foreground">Chưa có yêu cầu nào</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-6 py-3">
              <span className="text-sm text-muted-foreground">Trang {data.page} / {data.totalPages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page <= 1}>Trước</Button>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= data.totalPages}>Sau</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={(v) => { setShowCreate(v); if (!v) { setNotes(""); setItems([{ productId: "", product: null, quantity: "1" }]); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Yêu cầu kiểm tra tồn kho</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Ghi chú (tùy chọn)</Label>
              <Input placeholder="VD: Cần gấp cho đơn hàng khách ABC..." value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Sản phẩm cần kiểm tra *</Label>
                <Button type="button" variant="outline" size="sm"
                  onClick={() => setItems((p) => [...p, { productId: "", product: null, quantity: "1" }])}>
                  <Plus className="h-3.5 w-3.5" /> Thêm SP
                </Button>
              </div>
              <div className="space-y-2">
                <div className="grid grid-cols-[1fr_80px_32px] gap-2">
                  <span className="text-xs text-muted-foreground font-medium">Sản phẩm</span>
                  <span className="text-xs text-muted-foreground font-medium">SL cần</span>
                  <span />
                </div>
                {items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_80px_32px] gap-2 items-center">
                    <ProductSelect value={item.productId} onChange={(pid, prod) => handleProductChange(idx, pid, prod)} />
                    <Input type="number" min="1" step="1" value={item.quantity}
                      onChange={(e) => setItems((p) => p.map((it, i) => i === idx ? { ...it, quantity: e.target.value } : it))} />
                    <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-destructive"
                      onClick={() => { if (items.length > 1) setItems((p) => p.filter((_, i) => i !== idx)); }}
                      disabled={items.length <= 1}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreate(false); setNotes(""); setItems([{ productId: "", product: null, quantity: "1" }]); }}>
              Hủy
            </Button>
            <Button disabled={items.every((i) => !i.productId) || createMut.isPending} onClick={() => createMut.mutate()}>
              {createMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Gửi yêu cầu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!detailId} onOpenChange={(v) => { if (!v) setDetailId(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chi tiết yêu cầu {detail?.inquiryNumber}</DialogTitle>
          </DialogHeader>
          {!detail ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : (
            <div className="space-y-4 pt-2">
              {detail.status === "PENDING" ? (
                <div className="rounded-md bg-yellow-50 border border-yellow-200 px-4 py-2 text-sm text-yellow-800">
                  Đang chờ nhân viên kho phản hồi...
                </div>
              ) : (
                <div className="rounded-md bg-green-50 border border-green-200 px-4 py-2 text-sm text-green-800">
                  Đã phản hồi bởi <strong>{detail.respondedBy?.fullName}</strong> lúc {new Date(detail.respondedAt).toLocaleString("vi-VN")}
                  {detail.responseNotes && <div className="mt-1 text-muted-foreground">{detail.responseNotes}</div>}
                </div>
              )}
              {detail.notes && <p className="text-sm text-muted-foreground">Ghi chú: {detail.notes}</p>}
              <div className="space-y-2">
                {detail.items.map((item: any) => (
                  <div key={item.id} className="border rounded-md p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-mono text-xs text-blue-600 bg-blue-50 px-1 rounded mr-2">{item.product.sku}</span>
                        <span className="text-sm font-medium">{item.product.productName}</span>
                      </div>
                      {detail.status === "RESPONDED" && (
                        item.isAvailable ? (
                          <Badge variant="outline" className="text-xs text-green-700 bg-green-50 border-green-200">
                            ✓ Còn hàng: {item.availableQuantity} {item.product.unit}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-red-700 bg-red-50 border-red-200">
                            ✗ Hết hàng
                          </Badge>
                        )
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground flex gap-4">
                      <span>Cần: {Number(item.requestedQuantity)} {item.product.unit}</span>
                      {item.product.minPrice && <span className="text-orange-600">Giá tối thiểu: {vnd(item.product.minPrice)}</span>}
                    </div>
                    {item.warehouseNote && (
                      <div className="text-xs text-blue-700 bg-blue-50 rounded px-2 py-1">Kho: {item.warehouseNote}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailId(null)}>Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
