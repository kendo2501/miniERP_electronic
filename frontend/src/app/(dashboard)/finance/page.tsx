"use client";
import { useQuery } from "@tanstack/react-query";
import { Loader2, TrendingUp, AlertCircle, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getOrderSummary } from "@/lib/api/finance";
import { useAuthStore } from "@/store/auth.store";
import Link from "next/link";
import { useLanguage } from "@/context/language-context";

function fmt(value: number) {
  return value.toLocaleString("vi-VN") + " ₫";
}

function StatCard({
  title, value, sub, icon: Icon, accent,
}: {
  title: string; value: string; sub?: string; icon: any; accent?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${accent ?? "text-muted-foreground"}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function FinancePage() {
  const { t } = useLanguage();
  const { hasPermission, hasRole } = useAuthStore();
  const hideFinanceNav = hasRole("admin") || hasRole("accountant");

  const { data: summary, isLoading } = useQuery({
    queryKey: ["finance-order-summary"],
    queryFn: () => getOrderSummary().then((r) => r.data),
    refetchInterval: 30000,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t.finance.title}</h1>
          <p className="text-muted-foreground mt-1">{t.finance.subtitle}</p>
        </div>
        <div className="flex gap-2">
          {!hideFinanceNav && (
            <>
              <Link href="/finance/invoices">
                <Button variant="outline" size="sm">{t.finance.invoices}</Button>
              </Link>
              <Link href="/finance/payments">
                <Button variant="outline" size="sm">{t.finance.payments}</Button>
              </Link>
            </>
          )}
          {hasPermission("finance.credit_limit.view") && (
            <Link href="/finance/credit-limits">
              <Button variant="outline" size="sm">Hạn mức tín dụng</Button>
            </Link>
          )}
        </div>
      </div>

      {/* ── 3 Metric Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title={t.finance.totalOrderValue}
          value={isLoading ? "…" : fmt(summary?.totalOrderValue ?? 0)}
          sub={t.finance.totalOrderValueSub}
          icon={TrendingUp}
          accent="text-primary"
        />
        <StatCard
          title={t.finance.totalDebt}
          value={isLoading ? "…" : fmt(summary?.totalDebt ?? 0)}
          sub={t.finance.totalDebtSub}
          icon={AlertCircle}
          accent="text-red-500"
        />
        <StatCard
          title={t.finance.totalCash}
          value={isLoading ? "…" : fmt(summary?.totalCash ?? 0)}
          sub={t.finance.totalCashSub}
          icon={DollarSign}
          accent="text-green-500"
        />
      </div>

      {/* ── Debt Table ── */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base">{t.finance.debtList}</CardTitle>
          <Badge variant="destructive" className="text-xs">
            {isLoading ? "…" : summary?.unpaidOrders.length ?? 0} {"đơn"}
          </Badge>
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
                  <th className="h-9 px-6 text-left font-medium text-muted-foreground">{"Mã đơn hàng"}</th>
                  <th className="h-9 px-6 text-left font-medium text-muted-foreground">{t.common.customer}</th>
                  <th className="h-9 px-6 text-right font-medium text-muted-foreground">{t.common.total}</th>
                  <th className="h-9 px-6 text-left font-medium text-muted-foreground">{t.finance.orderDate}</th>
                  <th className="h-9 px-6 text-left font-medium text-muted-foreground">{t.common.status}</th>
                </tr>
              </thead>
              <tbody>
                {summary?.unpaidOrders.map((order) => (
                  <tr key={order.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-6 py-3 font-mono text-xs font-medium">{order.orderNumber}</td>
                    <td className="px-6 py-3 font-medium">{order.customer.companyName}</td>
                    <td className="px-6 py-3 text-right font-medium text-red-600">
                      {fmt(Number(order.totalAmount))}
                    </td>
                    <td className="px-6 py-3 text-xs text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString("vi-VN")}
                    </td>
                    <td className="px-6 py-3">
                      <Badge variant="destructive" className="text-xs">Chưa thanh toán</Badge>
                    </td>
                  </tr>
                ))}
                {!summary?.unpaidOrders.length && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">{t.finance.noDebt}</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* ── Paid Orders Table ── */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base">{t.finance.cashList}</CardTitle>
          <Badge variant="default" className="text-xs bg-green-600 hover:bg-green-700">
            {isLoading ? "…" : summary?.paidOrders.length ?? 0} {"đơn"}
          </Badge>
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
                  <th className="h-9 px-6 text-left font-medium text-muted-foreground">{"Mã đơn hàng"}</th>
                  <th className="h-9 px-6 text-left font-medium text-muted-foreground">{t.common.customer}</th>
                  <th className="h-9 px-6 text-right font-medium text-muted-foreground">{t.common.total}</th>
                  <th className="h-9 px-6 text-left font-medium text-muted-foreground">{t.finance.paidDate}</th>
                  <th className="h-9 px-6 text-left font-medium text-muted-foreground">{t.finance.confirmedBy}</th>
                </tr>
              </thead>
              <tbody>
                {summary?.paidOrders.map((order) => (
                  <tr key={order.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-6 py-3 font-mono text-xs font-medium">{order.orderNumber}</td>
                    <td className="px-6 py-3 font-medium">{order.customer.companyName}</td>
                    <td className="px-6 py-3 text-right font-medium text-green-600">
                      {fmt(Number(order.totalAmount))}
                    </td>
                    <td className="px-6 py-3 text-xs text-muted-foreground">
                      {order.paidAt ? new Date(order.paidAt).toLocaleDateString("vi-VN") : "—"}
                    </td>
                    <td className="px-6 py-3 text-xs">
                      {order.paidByUser?.fullName ?? "—"}
                    </td>
                  </tr>
                ))}
                {!summary?.paidOrders.length && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">{t.finance.noCash}</td>
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
