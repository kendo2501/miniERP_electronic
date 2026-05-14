"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Package, CheckCircle, Clock, XCircle, Loader2, Truck, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { listOrders } from "@/lib/api/sales";
import { vnd } from "@/lib/format";
import type { SalesOrderStatus, DeliveryStatus } from "@/types/sales";

const ORDER_STATUS_CONFIG: Record<SalesOrderStatus, { label: string; icon: React.ReactNode; className: string }> = {
  DRAFT:                       { label: "Chờ xác nhận",    icon: <Clock className="h-3.5 w-3.5" />,        className: "text-yellow-700 bg-yellow-50 border-yellow-200" },
  CONFIRMED:                   { label: "Đã xác nhận giá", icon: <CheckCircle className="h-3.5 w-3.5" />,  className: "text-blue-700 bg-blue-50 border-blue-200" },
  PARTIALLY_DELIVERED:         { label: "Đang giao",       icon: <Clock className="h-3.5 w-3.5" />,        className: "text-orange-700 bg-orange-50 border-orange-200" },
  DELIVERED:                   { label: "Đã giao hàng",    icon: <CheckCircle className="h-3.5 w-3.5" />,  className: "text-green-700 bg-green-50 border-green-200" },
  CANCELLED:                   { label: "Đã hủy",          icon: <XCircle className="h-3.5 w-3.5" />,      className: "text-red-700 bg-red-50 border-red-200" },
  PRICE_ADJUSTMENT_REQUESTED:  { label: "Đang điều chỉnh giá", icon: <Clock className="h-3.5 w-3.5" />,   className: "text-orange-700 bg-orange-50 border-orange-200" },
  PENDING_REAPPROVAL:          { label: "Chờ xác nhận lại", icon: <Clock className="h-3.5 w-3.5" />,       className: "text-purple-700 bg-purple-50 border-purple-200" },
};

const DELIVERY_CONFIG: Record<DeliveryStatus, { label: string; icon: React.ReactNode; className: string }> = {
  PENDING:    { label: "Chưa giao",  icon: <Package className="h-3.5 w-3.5" />,  className: "text-gray-600 bg-gray-50 border-gray-200" },
  IN_TRANSIT: { label: "Đang giao", icon: <Truck className="h-3.5 w-3.5" />,     className: "text-orange-700 bg-orange-50 border-orange-200" },
  DELIVERED:  { label: "Đã giao",   icon: <CheckCircle className="h-3.5 w-3.5" />, className: "text-green-700 bg-green-50 border-green-200" },
};

export default function MyOrdersPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["my-orders", page],
    queryFn: () => listOrders({ page, limit: 10 }).then((r) => r.data),
    placeholderData: (prev) => prev,
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
      ) : isError ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-red-400" />
            <p className="font-medium text-red-600">Không thể tải danh sách đơn hàng</p>
            <p className="text-sm mt-1">Nếu báo giá của bạn đã được duyệt nhưng đơn hàng chưa hiển thị, vui lòng tải lại trang hoặc liên hệ nhân viên kinh doanh.</p>
            <Button
              variant="outline" size="sm" className="mt-4"
              onClick={() => window.location.reload()}
            >
              Tải lại trang
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {data?.items.length === 0 && (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p>Chưa có đơn hàng nào</p>
              </CardContent>
            </Card>
          )}

          {data?.items.map((order) => {
            const cfg = ORDER_STATUS_CONFIG[order.status];
            const delivery = DELIVERY_CONFIG[order.deliveryStatus ?? 'PENDING'];

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
                        <Badge variant="outline" className={`text-xs flex items-center gap-1 ${delivery.className}`}>
                          {delivery.icon}
                          {delivery.label}
                        </Badge>
                        {order.quotation && (
                          <span className="text-xs text-muted-foreground">từ báo giá {order.quotation.quotationNumber}</span>
                        )}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Đặt ngày: {order.orderedAt ? new Date(order.orderedAt).toLocaleDateString("vi-VN") : "—"}
                      </div>
                    </div>

                    {/* Total */}
                    <div className="text-right shrink-0">
                      <div className="font-semibold tabular-nums">{vnd(Number(order.totalAmount))}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{order._count?.items ?? 0} sản phẩm</div>
                    </div>
                  </div>
                </CardHeader>
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
