"use client";
import { useQuery } from "@tanstack/react-query";
import { Loader2, AlertTriangle, CheckCircle2, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCreditLimits } from "@/lib/api/finance";
import Link from "next/link";
import { useLanguage } from "@/context/language-context";

function fmt(v: number) {
  return v.toLocaleString("vi-VN") + " ₫";
}

export default function CreditLimitsPage() {
  const { t } = useLanguage();
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["credit-limits"],
    queryFn: () => getCreditLimits().then((r) => r.data),
    refetchInterval: 30000,
  });

  const overLimitCount = items.filter((i) => i.isOverLimit).length;
  const totalDebt = items.reduce((s, i) => s + i.currentDebt, 0);
  const totalLimit = items.reduce((s, i) => s + i.creditLimit, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Hạn mức tín dụng</h1>
          <p className="text-muted-foreground mt-1">Theo dõi dư nợ và hạn mức tín dụng khách hàng</p>
        </div>
        <Link href="/finance">
          <Button variant="outline" size="sm">{t.finance.title}</Button>
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tổng hạn mức</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? "…" : fmt(totalLimit)}</div>
            <p className="text-xs text-muted-foreground mt-1">{items.length} khách hàng</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tổng dư nợ hiện tại</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{isLoading ? "…" : fmt(totalDebt)}</div>
            <p className="text-xs text-muted-foreground mt-1">Đơn chưa thanh toán đã duyệt</p>
          </CardContent>
        </Card>
        <Card className={overLimitCount > 0 ? "border-red-300" : ""}>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">Vượt hạn mức</CardTitle>
            {overLimitCount > 0
              ? <AlertTriangle className="h-4 w-4 text-red-500" />
              : <CheckCircle2 className="h-4 w-4 text-green-500" />}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${overLimitCount > 0 ? "text-red-600" : "text-green-600"}`}>
              {isLoading ? "…" : overLimitCount} khách hàng
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {overLimitCount > 0 ? "Cần xử lý ngay" : "Tất cả trong hạn mức"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detail table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Chi tiết hạn mức tín dụng</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="h-9 px-6 text-left font-medium text-muted-foreground">Khách hàng</th>
                  <th className="h-9 px-6 text-right font-medium text-muted-foreground">Hạn mức</th>
                  <th className="h-9 px-6 text-right font-medium text-muted-foreground">Dư nợ</th>
                  <th className="h-9 px-6 text-right font-medium text-muted-foreground">Còn lại</th>
                  <th className="h-9 px-6 text-left font-medium text-muted-foreground">Sử dụng</th>
                  <th className="h-9 px-6 text-left font-medium text-muted-foreground">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className={`border-b last:border-0 hover:bg-muted/30 ${item.isOverLimit ? "bg-red-50/50" : ""}`}>
                    <td className="px-6 py-3">
                      <div className="font-medium">{item.companyName}</div>
                      <div className="text-xs text-muted-foreground">{item.customerCode}</div>
                    </td>
                    <td className="px-6 py-3 text-right font-medium">{fmt(item.creditLimit)}</td>
                    <td className={`px-6 py-3 text-right font-medium ${item.currentDebt > 0 ? "text-red-600" : "text-muted-foreground"}`}>
                      {fmt(item.currentDebt)}
                    </td>
                    <td className={`px-6 py-3 text-right font-medium ${item.isOverLimit ? "text-red-600" : "text-green-600"}`}>
                      {item.isOverLimit ? `-${fmt(item.currentDebt - item.creditLimit)}` : fmt(item.availableCredit)}
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden min-w-[60px]">
                          <div
                            className={`h-full rounded-full transition-all ${
                              item.isOverLimit ? "bg-red-500" :
                              item.usagePercent >= 80 ? "bg-orange-400" :
                              item.usagePercent >= 50 ? "bg-yellow-400" : "bg-green-500"
                            }`}
                            style={{ width: `${Math.min(100, item.usagePercent)}%` }}
                          />
                        </div>
                        <span className={`text-xs font-medium w-10 text-right ${item.isOverLimit ? "text-red-600" : ""}`}>
                          {item.usagePercent}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      {item.isOverLimit
                        ? <Badge variant="destructive" className="text-xs">Vượt hạn mức</Badge>
                        : item.usagePercent >= 80
                        ? <Badge variant="warning" className="text-xs">Gần giới hạn</Badge>
                        : <Badge variant="success" className="text-xs">Trong hạn mức</Badge>}
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      Không có dữ liệu khách hàng
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
