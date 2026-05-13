"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Package, Truck, CheckCircle, Clock, XCircle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { listOrders, listDeliveries } from "@/lib/api/sales";
import { vnd } from "@/lib/format";
import type { SalesOrderStatus, DeliveryStatus } from "@/types/sales";

const ORDER_STATUS_CONFIG: Record<SalesOrderStatus, { label: string; icon: React.ReactNode; className: string }> = {
  DRAFT:                       { label: "Chờ xác nhận",    icon: <Clock className="h-3.5 w-3.5" />,        className: "text-yellow-700 bg-yellow-50 border-yellow-200" },
  CONFIRMED:                   { label: "Đã xác nhận",     icon: <CheckCircle className="h-3.5 w-3.5" />,  className: "text-blue-700 bg-blue-50 border-blue-200" },
  PARTIALLY_DELIVERED:         { label: "Đang giao",       icon: <Truck className="h-3.5 w-3.5" />,        className: "text-orange-700 bg-orange-50 border-orange-200" },
  DELIVERED:                   { label: "Đã giao hàng",    icon: <CheckCircle className="h-3.5 w-3.5" />,  className: "text-green-700 bg-green-50 border-green-200" },
  CANCELLED:                   { label: "Đã hủy",          icon: <XCircle className="h-3.5 w-3.5" />,      className: "text-red-700 bg-red-50 border-red-200" },
  PRICE_ADJUSTMENT_REQUESTED:  { label: "Đang xử lý",      icon: <Clock className="h-3.5 w-3.5" />,        className: "text-orange-700 bg-orange-50 border-orange-200" },
};

const DELIVERY_STATUS_CONFIG: Record<DeliveryStatus, { label: string; className: string }> = {
  PENDING:   { label: "Đang vận chuyển", className: "text-blue-700 bg-blue-50 border-blue-200" },
  DELIVERED: { label: "Đã nhận hàng",   className: "text-green-700 bg-green-50 border-green-200" },
  FAILED:    { label: "Giao thất bại",   className: "text-red-700 bg-red-50 border-red-200" },
  CANCELLED: { label: "Đã hủy",         className: "text-gray-700 bg-gray-50 border-gray-200" },
};

export default function MyOrdersPage() {
  const [page, setPage] = useState(1);
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["my-orders", page],
    queryFn: () => listOrders({ page, limit: 10 }).then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const { data: deliveriesData } = useQuery({
    queryKey: ["my-deliveries", expandedOrderId],
    queryFn: () => listDeliveries({ salesOrderId: expandedOrderId! } as any).then((r) => r.data),
    enabled: !!expandedOrderId,
  });

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Package className="h-7 w-7 text-muted-foreground" />
          Đơn hàng của tôi
        </h1>
        <p className="text-muted-foreground mt-1">Xem trạng thái và lịch sử đơn hàng</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-3">
          {data?.items.length === 0 && (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                Chưa có đơn hàng nào
              </CardContent>
            </Card>
          )}

          {data?.items.map((order) => {
            const cfg = ORDER_STATUS_CONFIG[order.status];
            const isExpanded = expandedOrderId === order.id;

            return (
              <Card key={order.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    {/* Order info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-semibold">{order.orderNumber}</span>
                        <Badge variant="outline" className={`text-xs flex items-center gap-1 ${cfg.className}`}>
                          {cfg.icon}
                          {cfg.label}
                        </Badge>
                        {order.quotation && (
                          <span className="text-xs text-muted-foreground">từ báo giá {order.quotation.quotationNumber}</span>
                        )}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Đặt ngày: {order.orderedAt ? new Date(order.orderedAt).toLocaleDateString("vi-VN") : "—"}
                      </div>
                    </div>

                    {/* Total + delivery count */}
                    <div className="text-right shrink-0">
                      <div className="font-semibold tabular-nums">{vnd(Number(order.totalAmount))}</div>
                      {(order._count?.deliveries ?? 0) > 0 && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {order._count?.deliveries} lần giao
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Expand deliveries */}
                  {(order._count?.deliveries ?? 0) > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs mt-2 text-blue-600 hover:text-blue-700 w-fit"
                      onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                    >
                      <Truck className="h-3.5 w-3.5 mr-1" />
                      {isExpanded ? "Ẩn thông tin giao hàng" : "Xem thông tin giao hàng"}
                    </Button>
                  )}
                </CardHeader>

                {/* Delivery details (expanded) */}
                {isExpanded && (
                  <CardContent className="pt-0 border-t bg-muted/20">
                    {!deliveriesData ? (
                      <div className="py-4 flex justify-center"><Loader2 className="h-4 w-4 animate-spin" /></div>
                    ) : deliveriesData.items.length === 0 ? (
                      <p className="py-4 text-sm text-muted-foreground text-center">Chưa có thông tin giao hàng</p>
                    ) : (
                      <div className="space-y-2 py-3">
                        {deliveriesData.items.map((d) => {
                          const dcfg = DELIVERY_STATUS_CONFIG[d.status as DeliveryStatus];
                          return (
                            <div key={d.id} className="flex items-center justify-between text-sm py-2 px-3 bg-background rounded-md border">
                              <div className="flex items-center gap-3">
                                <Truck className="h-4 w-4 text-muted-foreground shrink-0" />
                                <div>
                                  <div className="font-mono text-xs font-medium">{d.deliveryNumber}</div>
                                  {(d as any).trackingCode && (
                                    <div className="text-xs text-blue-600">Mã vận đơn: {(d as any).trackingCode}</div>
                                  )}
                                  {(d as any).deliveredAt && (
                                    <div className="text-xs text-muted-foreground">
                                      Ngày giao: {new Date((d as any).deliveredAt).toLocaleDateString("vi-VN")}
                                    </div>
                                  )}
                                  {(d as any).failureReason && (
                                    <div className="text-xs text-red-600">Lý do: {(d as any).failureReason}</div>
                                  )}
                                </div>
                              </div>
                              <Badge variant="outline" className={`text-xs ${dcfg?.className}`}>
                                {dcfg?.label ?? d.status}
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Trang {data.page} / {data.totalPages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page <= 1}>Trước</Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= data.totalPages}>Sau</Button>
          </div>
        </div>
      )}
    </div>
  );
}
