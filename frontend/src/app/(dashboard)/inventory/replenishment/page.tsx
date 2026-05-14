"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ClipboardList, Loader2, AlertTriangle, CheckCircle2,
  Clock, XCircle, ArrowLeft, ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { inventoryApi } from "@/lib/api/inventory";
import type { ReplenishmentRequest, ReplenishmentStatus, ReplenishmentPriority } from "@/types/inventory";
import Link from "next/link";

const STATUS_CONFIG: Record<ReplenishmentStatus, { label: string; icon: React.ReactNode; className: string }> = {
  PENDING:     { label: "Chờ xử lý",    icon: <Clock className="h-3.5 w-3.5" />,        className: "text-yellow-700 bg-yellow-50 border-yellow-200" },
  IN_PROGRESS: { label: "Đang xử lý",   icon: <AlertTriangle className="h-3.5 w-3.5" />, className: "text-blue-700 bg-blue-50 border-blue-200" },
  COMPLETED:   { label: "Đã hoàn tất",  icon: <CheckCircle2 className="h-3.5 w-3.5" />,  className: "text-green-700 bg-green-50 border-green-200" },
  CANCELLED:   { label: "Đã hủy",       icon: <XCircle className="h-3.5 w-3.5" />,        className: "text-gray-500 bg-gray-50 border-gray-200" },
};

const PRIORITY_CONFIG: Record<ReplenishmentPriority, { label: string; className: string }> = {
  LOW:    { label: "Thấp",    className: "text-gray-600 bg-gray-50 border-gray-200" },
  NORMAL: { label: "Bình thường", className: "text-blue-600 bg-blue-50 border-blue-200" },
  HIGH:   { label: "Cao",     className: "text-orange-600 bg-orange-50 border-orange-200" },
  URGENT: { label: "Khẩn cấp", className: "text-red-700 bg-red-50 border-red-200" },
};

export default function ReplenishmentPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["replenishment", page, statusFilter, priorityFilter],
    queryFn: () =>
      inventoryApi.listReplenishment({
        page,
        limit: 20,
        status: statusFilter !== "all" ? statusFilter : undefined,
        priority: priorityFilter !== "all" ? priorityFilter : undefined,
      }),
    placeholderData: (prev) => prev,
  });

  const updateMut = useMutation({
    mutationFn: ({ id, ...data }: { id: number } & Parameters<typeof inventoryApi.updateReplenishment>[1]) =>
      inventoryApi.updateReplenishment(id, data),
    onSuccess: () => {
      toast.success("Đã cập nhật yêu cầu bổ hàng");
      qc.invalidateQueries({ queryKey: ["replenishment"] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Không thể cập nhật"),
  });

  const setStatus = (req: ReplenishmentRequest, status: ReplenishmentStatus) => {
    updateMut.mutate({ id: req.id, status });
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center gap-4">
        <Link href="/inventory">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
            Kho hàng
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ClipboardList className="h-7 w-7 text-muted-foreground" />
            Yêu cầu bổ hàng
          </h1>
          <p className="text-muted-foreground mt-0.5">Quản lý các yêu cầu bổ sung tồn kho</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            {(Object.keys(STATUS_CONFIG) as ReplenishmentStatus[]).map((s) => (
              <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={(v) => { setPriorityFilter(v); setPage(1); }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Ưu tiên" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả ưu tiên</SelectItem>
            {(Object.keys(PRIORITY_CONFIG) as ReplenishmentPriority[]).map((p) => (
              <SelectItem key={p} value={p}>{PRIORITY_CONFIG[p].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {data && <span className="text-sm text-muted-foreground self-center">{data.total} yêu cầu</span>}
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="h-10 px-5 text-left font-medium text-muted-foreground">Mã yêu cầu</th>
                    <th className="h-10 px-5 text-left font-medium text-muted-foreground">Sản phẩm</th>
                    <th className="h-10 px-5 text-right font-medium text-muted-foreground">SL thiếu</th>
                    <th className="h-10 px-5 text-left font-medium text-muted-foreground">Trạng thái</th>
                    <th className="h-10 px-5 text-left font-medium text-muted-foreground">Ưu tiên</th>
                    <th className="h-10 px-5 text-left font-medium text-muted-foreground">Đơn hàng</th>
                    <th className="h-10 px-5 text-left font-medium text-muted-foreground">Hạn</th>
                    <th className="h-10 px-5 text-left font-medium text-muted-foreground">Ngày tạo</th>
                    <th className="h-10 px-5 text-left font-medium text-muted-foreground">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.items.map((req) => {
                    const sc = STATUS_CONFIG[req.status];
                    const pc = PRIORITY_CONFIG[req.priority];
                    const isProcessing = updateMut.isPending;

                    return (
                      <tr key={req.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-5 py-3 font-mono text-xs">{req.requestNumber}</td>
                        <td className="px-5 py-3">
                          <div className="font-medium">{req.product.productName}</div>
                          <div className="text-xs text-muted-foreground">{req.product.sku}</div>
                        </td>
                        <td className="px-5 py-3 text-right font-semibold text-red-600">
                          {Number(req.shortageQuantity).toLocaleString()} {req.product.unit ?? ""}
                        </td>
                        <td className="px-5 py-3">
                          <Badge variant="outline" className={`text-xs flex w-fit items-center gap-1 ${sc.className}`}>
                            {sc.icon} {sc.label}
                          </Badge>
                        </td>
                        <td className="px-5 py-3">
                          <Badge variant="outline" className={`text-xs ${pc.className}`}>
                            {pc.label}
                          </Badge>
                        </td>
                        <td className="px-5 py-3 text-muted-foreground text-xs">
                          {req.salesOrderId ? `#${req.salesOrderId}` : "—"}
                        </td>
                        <td className="px-5 py-3 text-muted-foreground text-xs">
                          {req.dueDate ? new Date(req.dueDate).toLocaleDateString("vi-VN") : "—"}
                        </td>
                        <td className="px-5 py-3 text-muted-foreground text-xs">
                          {new Date(req.createdAt).toLocaleDateString("vi-VN")}
                        </td>
                        <td className="px-5 py-3">
                          {req.status !== "COMPLETED" && req.status !== "CANCELLED" && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" disabled={isProcessing}>
                                  Cập nhật <ChevronDown className="h-3.5 w-3.5 ml-1" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {req.status === "PENDING" && (
                                  <DropdownMenuItem onClick={() => setStatus(req, "IN_PROGRESS")}>
                                    Bắt đầu xử lý
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => setStatus(req, "COMPLETED")}>
                                  Đánh dấu hoàn tất
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => setStatus(req, "CANCELLED")}
                                >
                                  Hủy yêu cầu
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {data?.items.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-16 text-center text-muted-foreground">
                        <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p>Không có yêu cầu bổ hàng nào</p>
                      </td>
                    </tr>
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
    </div>
  );
}
