"use client";
import { useQuery } from "@tanstack/react-query";
import {
  Users, ShoppingCart, DollarSign, Package, Truck,
  TrendingUp, TrendingDown, AlertTriangle, FileText,
  ClipboardList, UserRound, Bell, BarChart3, LayoutGrid,
  CheckCircle2, Clock, CircleDollarSign, Settings,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/api/client";
import { useAuthStore } from "@/store/auth.store";
import { useLanguage } from "@/context/language-context";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminKpis {
  customers: { total: number; newThisMonth: number };
  products: { active: number; lowStock: number };
  orders: { total: number; thisMonth: number; lastMonth: number; growthPct: number | null };
  revenue: { thisMonth: number; lastMonth: number; growthPct: number | null };
  finance: { outstandingAmount: number; outstandingCount: number };
  operations: { pendingDeliveries: number };
}

interface SalesPoint { date: string; orders: number; revenue: number }

interface TopCustomer {
  customer: { id: number; companyName: string; customerCode: string } | null;
  totalRevenue: number;
  orderCount: number;
}

interface RecentOrder {
  id: number; orderNumber: string; status: string;
  totalAmount: number; createdAt: string;
  customer: { companyName: string } | null;
}

interface SalesKpis {
  myCustomers: number;
  orders: { thisMonth: number; revenueThisMonth: number };
  pendingQuotations: number;
  recentOrders: RecentOrder[];
}

// ─── Shared components ────────────────────────────────────────────────────────

function KpiCard({
  title, value, sub, icon: Icon, growth, accent, topColor,
}: {
  title: string; value: string; sub?: string;
  icon: any; growth?: number | null; accent?: string; topColor?: string;
}) {
  return (
    <Card className="overflow-hidden">
      {topColor && <div className={`h-1 w-full ${topColor}`} />}
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`h-8 w-8 rounded-lg flex items-center justify-center bg-muted/60`}>
          <Icon className={`h-4 w-4 ${accent ?? "text-muted-foreground"}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        <div className="flex items-center gap-2 mt-1">
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
          {growth != null && (
            <span className={`flex items-center text-xs font-semibold px-1.5 py-0.5 rounded-full ${growth >= 0 ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"}`}>
              {growth >= 0
                ? <TrendingUp className="h-3 w-3 mr-0.5" />
                : <TrendingDown className="h-3 w-3 mr-0.5" />}
              {Math.abs(growth).toFixed(1)}%
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function MiniBarChart({ data }: { data: SalesPoint[] }) {
  if (!data.length) return null;
  const maxRev = Math.max(...data.map((d) => d.revenue), 1);
  const last14 = data.slice(-14);
  return (
    <div className="flex items-end gap-1 h-20 w-full">
      {last14.map((d, i) => {
        const h = Math.max(4, (d.revenue / maxRev) * 80);
        const isRecent = i >= last14.length - 3;
        return (
          <div key={d.date} className="group relative flex-1 flex flex-col items-center justify-end">
            <div
              className={`w-full rounded-t-sm transition-all duration-150 cursor-pointer ${isRecent ? "bg-[#DE741C]" : "bg-[#593E67]/40"} hover:bg-[#DE741C]`}
              style={{ height: `${h}px` }}
            />
            <div className="absolute bottom-full mb-1.5 hidden group-hover:block z-10 whitespace-nowrap rounded-md bg-[#432D51] text-white px-2.5 py-1.5 text-xs shadow-lg">
              <span className="font-semibold">{d.date}</span>
              <br />${d.revenue.toLocaleString()}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const STATUS_BADGE: Record<string, "default" | "secondary" | "success" | "warning" | "destructive"> = {
  DRAFT: "secondary",
  CONFIRMED: "default",
  PARTIALLY_DELIVERED: "warning",
  DELIVERED: "success",
  CANCELLED: "destructive",
};

function RecentOrdersTable({ orders, emptyLabel }: { orders: RecentOrder[]; emptyLabel: string }) {
  if (!orders.length) return <p className="text-sm text-muted-foreground px-6 py-4">{emptyLabel}</p>;
  return (
    <table className="w-full text-sm">
      <tbody>
        {orders.map((o) => (
          <tr key={o.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
            <td className="px-6 py-3">
              <div className="font-medium text-xs">{o.orderNumber}</div>
              <div className="text-xs text-muted-foreground">{o.customer?.companyName ?? "—"}</div>
            </td>
            <td className="px-6 py-3">
              <Badge variant={STATUS_BADGE[o.status] ?? "secondary"} className="text-xs">{o.status}</Badge>
            </td>
            <td className="px-6 py-3 text-right font-medium">
              ${o.totalAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── Admin Dashboard ──────────────────────────────────────────────────────────

function AdminDashboard({ user }: { user: any }) {
  const { t } = useLanguage();
  const { data: kpis } = useQuery({
    queryKey: ["dashboard-kpis"],
    queryFn: () => apiClient.get<AdminKpis>("/reporting/dashboard").then((r) => r.data),
  });
  const { data: chart } = useQuery({
    queryKey: ["sales-chart"],
    queryFn: () => apiClient.get<SalesPoint[]>("/reporting/sales-chart", { params: { days: 30 } }).then((r) => r.data),
  });
  const { data: topCustomers } = useQuery({
    queryKey: ["top-customers"],
    queryFn: () => apiClient.get<TopCustomer[]>("/reporting/top-customers").then((r) => r.data),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t.dashboard.title}</h1>
        <p className="text-muted-foreground mt-1">
          {t.dashboard.welcome}, <span className="font-medium text-foreground">{user?.fullName}</span>
        </p>
      </div>

      {kpis && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              title={t.dashboard.revenueThisMonth}
              value={`$${kpis.revenue.thisMonth.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
              sub={`vs $${kpis.revenue.lastMonth.toLocaleString(undefined, { maximumFractionDigits: 0 })} ${t.dashboard.growth}`}
              icon={DollarSign} growth={kpis.revenue.growthPct}
              accent="text-[#DE741C]" topColor="bg-[#DE741C]"
            />
            <KpiCard
              title={`${t.dashboard.orders} (${t.common.thisMonth})`}
              value={String(kpis.orders.thisMonth)}
              sub={`${kpis.orders.total} ${t.dashboard.totalOrders.toLowerCase()}`}
              icon={ShoppingCart} growth={kpis.orders.growthPct}
              accent="text-[#B85B56]" topColor="bg-[#B85B56]"
            />
            <KpiCard
              title={t.dashboard.totalCustomers}
              value={String(kpis.customers.total)}
              sub={`+${kpis.customers.newThisMonth} ${t.dashboard.newThisMonth}`}
              icon={Users} accent="text-[#593E67]" topColor="bg-[#593E67]"
            />
            <KpiCard
              title={t.dashboard.activeListings}
              value={String(kpis.products.active)}
              sub={kpis.products.lowStock > 0 ? `${kpis.products.lowStock} ${t.dashboard.lowStock}` : "Stock OK"}
              icon={Package}
              accent={kpis.products.lowStock > 0 ? "text-[#FEA837]" : "text-muted-foreground"}
              topColor={kpis.products.lowStock > 0 ? "bg-[#FEA837]" : "bg-muted"}
            />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className={`overflow-hidden ${kpis.finance.outstandingAmount > 0 ? "border-[#DE741C]/30" : ""}`}>
              <div className="h-1 bg-[#DE741C]" />
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t.dashboard.outstandingAR}</CardTitle>
                <div className="h-8 w-8 rounded-lg bg-[#DE741C]/10 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-[#DE741C]" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight">
                  ${kpis.finance.outstandingAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{kpis.finance.outstandingCount} {t.dashboard.invoicesDue}</p>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <div className="h-1 bg-[#84495F]" />
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t.dashboard.pendingDeliveries}</CardTitle>
                <div className="h-8 w-8 rounded-lg bg-[#84495F]/10 flex items-center justify-center">
                  <Truck className="h-4 w-4 text-[#84495F]" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight">{kpis.operations.pendingDeliveries}</div>
                <p className="text-xs text-muted-foreground mt-1">awaiting dispatch</p>
              </CardContent>
            </Card>

            {kpis.products.lowStock > 0 && (
              <Card className="overflow-hidden border-[#FEA837]/40 bg-[#FEA837]/5">
                <div className="h-1 bg-[#FEA837]" />
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-medium text-[#B85B56]">{t.dashboard.lowStockAlerts}</CardTitle>
                  <div className="h-8 w-8 rounded-lg bg-[#FEA837]/20 flex items-center justify-center">
                    <AlertTriangle className="h-4 w-4 text-[#FEA837]" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold tracking-tight text-[#B85B56]">{kpis.products.lowStock}</div>
                  <p className="text-xs text-muted-foreground mt-1">products ≤10 units</p>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {chart && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center justify-between">
                    Sales — Last 30 days
                    <span className="text-sm font-normal text-muted-foreground">
                      {chart.reduce((s, d) => s + d.orders, 0)} orders
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <MiniBarChart data={chart} />
                  <div className="flex justify-between text-xs text-muted-foreground mt-2">
                    <span>{chart[0]?.date}</span>
                    <span>{chart[chart.length - 1]?.date}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {topCustomers && topCustomers.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Top {t.dashboard.customers}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <tbody>
                      {topCustomers.slice(0, 6).map((tc, idx) => (
                        <tr key={idx} className="border-b last:border-0">
                          <td className="px-6 py-2.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground w-4">{idx + 1}</span>
                              <div>
                                <div className="font-medium text-xs">{tc.customer?.companyName ?? "Unknown"}</div>
                                <div className="text-xs text-muted-foreground">{tc.orderCount} orders</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-2.5 text-right font-medium text-sm">
                            ${tc.totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Sales Dashboard ──────────────────────────────────────────────────────────

function SalesDashboard({ user }: { user: any }) {
  const { t } = useLanguage();
  const { data: kpis } = useQuery({
    queryKey: ["sales-dashboard"],
    queryFn: () => apiClient.get<SalesKpis>("/reporting/sales-dashboard").then((r) => r.data),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t.dashboard.salesDash}</h1>
        <p className="text-muted-foreground mt-1">
          {t.dashboard.welcome}, <span className="font-medium text-foreground">{user?.fullName}</span>
        </p>
      </div>

      {kpis && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              title={t.dashboard.myCustomers}
              value={String(kpis.myCustomers)}
              sub="assigned to me"
              icon={UserRound} accent="text-primary"
            />
            <KpiCard
              title={`${t.dashboard.myOrders} (${t.common.thisMonth})`}
              value={String(kpis.orders.thisMonth)}
              sub="confirmed orders"
              icon={ShoppingCart}
            />
            <KpiCard
              title={`${t.dashboard.myRevenue} (${t.common.thisMonth})`}
              value={`$${kpis.orders.revenueThisMonth.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
              icon={DollarSign} accent="text-green-500"
            />
            <KpiCard
              title={t.dashboard.pendingQuotations}
              value={String(kpis.pendingQuotations)}
              sub="DRAFT or SENT"
              icon={ClipboardList}
              accent={kpis.pendingQuotations > 0 ? "text-yellow-500" : "text-muted-foreground"}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{t.dashboard.recentOrders}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <RecentOrdersTable orders={kpis.recentOrders} emptyLabel={t.orders.noOrders} />
              </CardContent>
            </Card>

            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">{t.dashboard.quickActions}</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { href: "/customers",         icon: UserRound,    label: t.dashboard.myCustomers, color: "text-[#593E67]", bg: "bg-[#593E67]/10" },
                  { href: "/sales/quotations",  icon: ClipboardList,label: t.quotations.title,      color: "text-[#84495F]", bg: "bg-[#84495F]/10" },
                  { href: "/sales/orders",      icon: ShoppingCart, label: t.orders.title,          color: "text-[#B85B56]", bg: "bg-[#B85B56]/10" },
                  { href: "/finance",           icon: CircleDollarSign, label: t.finance.title,     color: "text-[#DE741C]", bg: "bg-[#DE741C]/10" },
                ].map(({ href, icon: Icon, label, color, bg }) => (
                  <Link key={href} href={href}>
                    <Card className="cursor-pointer hover:border-[#593E67]/40 hover:shadow-md transition-all h-full">
                      <CardContent className="p-4 flex flex-col items-center gap-3">
                        <div className={`h-10 w-10 rounded-xl ${bg} flex items-center justify-center`}>
                          <Icon className={`h-5 w-5 ${color}`} />
                        </div>
                        <span className="text-sm font-medium text-center">{label}</span>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Customer Dashboard ───────────────────────────────────────────────────────

function CustomerDashboard({ user }: { user: any }) {
  const { t } = useLanguage();

  const portalCards = [
    {
      href: "/catalog",
      icon: Package,
      label: t.catalog.title,
      description: t.catalog.subtitle,
      color: "text-[#593E67]",
      bg: "bg-[#593E67]/10",
      border: "hover:border-[#593E67]/40",
    },
    {
      href: "/notifications",
      icon: Bell,
      label: t.notifications.title,
      description: t.notifications.subtitle,
      color: "text-[#FEA837]",
      bg: "bg-[#FEA837]/15",
      border: "hover:border-[#FEA837]/50",
    },
    {
      href: "/settings",
      icon: Settings,
      label: t.dashboard.viewSettings,
      description: t.settings.subtitle,
      color: "text-[#84495F]",
      bg: "bg-[#84495F]/10",
      border: "hover:border-[#84495F]/40",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t.common.overview}</h1>
        <p className="text-muted-foreground mt-1">
          {t.dashboard.welcome}, <span className="font-medium text-foreground">{user?.fullName}</span>
        </p>
      </div>

      <Card className="border-[#593E67]/20 bg-gradient-to-r from-[#593E67]/5 to-[#FEA837]/5 overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-[#593E67] via-[#B85B56] to-[#FEA837]" />
        <CardContent className="p-6 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-[#593E67]/10 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-6 w-6 text-[#593E67]" />
          </div>
          <div>
            <p className="font-semibold">{t.common.active}</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Your account is verified and active. Contact your sales representative for new orders or inquiries.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {portalCards.map(({ href, icon: Icon, label, description, color, bg, border }) => (
          <Link key={href} href={href}>
            <Card className={`cursor-pointer transition-all hover:shadow-md h-full ${border}`}>
              <CardContent className="p-6 flex flex-col gap-3">
                <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center`}>
                  <Icon className={`h-5 w-5 ${color}`} />
                </div>
                <div>
                  <p className="font-semibold">{label}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── Accountant Dashboard ─────────────────────────────────────────────────────

interface AccountantKpis {
  invoices: {
    thisMonth: number;
    revenueThisMonth: number;
    outstandingAmount: number;
    outstandingCount: number;
    overdueCount: number;
  };
  payments: { thisMonth: number; amountThisMonth: number };
  aging: { current: number; days1_30: number; days31_60: number; days61_90: number; over90: number };
  recentInvoices: Array<{
    id: number; invoiceNumber: string; status: string;
    totalAmount: number; outstandingAmount: number; dueDate: string | null; createdAt: string;
    customer: { companyName: string } | null;
  }>;
}

const INVOICE_STATUS_BADGE: Record<string, "default" | "secondary" | "success" | "warning" | "destructive"> = {
  DRAFT: "secondary", SENT: "default", PARTIALLY_PAID: "warning", PAID: "success", CANCELLED: "destructive",
};

function AccountantDashboard({ user }: { user: any }) {
  const { t } = useLanguage();
  const { data: kpis } = useQuery({
    queryKey: ["accountant-dashboard"],
    queryFn: () => apiClient.get<AccountantKpis>("/reporting/accountant-dashboard").then((r) => r.data),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t.dashboard.accountantDash}</h1>
        <p className="text-muted-foreground mt-1">
          {t.dashboard.welcome}, <span className="font-medium text-foreground">{user?.fullName}</span>
        </p>
      </div>

      {kpis && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              title={t.dashboard.invoicesThisMonth}
              value={String(kpis.invoices.thisMonth)}
              sub={`$${kpis.invoices.revenueThisMonth.toLocaleString(undefined, { maximumFractionDigits: 0 })} total`}
              icon={FileText} accent="text-blue-500"
            />
            <KpiCard
              title={t.dashboard.outstandingAR}
              value={`$${kpis.invoices.outstandingAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
              sub={`${kpis.invoices.outstandingCount} ${t.dashboard.invoicesDue}`}
              icon={CircleDollarSign}
              accent={kpis.invoices.outstandingAmount > 0 ? "text-orange-500" : "text-muted-foreground"}
            />
            <KpiCard
              title={t.dashboard.paymentsThisMonth}
              value={String(kpis.payments.thisMonth)}
              sub={`$${kpis.payments.amountThisMonth.toLocaleString(undefined, { maximumFractionDigits: 0 })} received`}
              icon={DollarSign} accent="text-green-500"
            />
            <KpiCard
              title={t.dashboard.overdueInvoices}
              value={String(kpis.invoices.overdueCount)}
              sub="past due date"
              icon={AlertTriangle}
              accent={kpis.invoices.overdueCount > 0 ? "text-red-500" : "text-muted-foreground"}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{t.dashboard.arAging}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: t.aging.current, value: kpis.aging.current, color: "bg-green-500" },
                  { label: t.aging.days1_30, value: kpis.aging.days1_30, color: "bg-yellow-400" },
                  { label: t.aging.days31_60, value: kpis.aging.days31_60, color: "bg-orange-400" },
                  { label: t.aging.days61_90, value: kpis.aging.days61_90, color: "bg-red-400" },
                  { label: t.aging.over90, value: kpis.aging.over90, color: "bg-red-600" },
                ].map(({ label, value, color }) => {
                  const total = Object.values(kpis.aging).reduce((s, v) => s + v, 0);
                  const pct = total > 0 ? (value / total) * 100 : 0;
                  return (
                    <div key={label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-medium">${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{t.dashboard.recentInvoices}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {kpis.recentInvoices.length === 0
                  ? <p className="text-sm text-muted-foreground px-6 py-4">{t.invoices.noInvoices}</p>
                  : (
                    <table className="w-full text-sm">
                      <tbody>
                        {kpis.recentInvoices.map((inv) => (
                          <tr key={inv.id} className="border-b last:border-0 hover:bg-muted/30">
                            <td className="px-6 py-3">
                              <div className="font-medium text-xs">{inv.invoiceNumber}</div>
                              <div className="text-xs text-muted-foreground">{inv.customer?.companyName ?? "—"}</div>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant={INVOICE_STATUS_BADGE[inv.status] ?? "secondary"} className="text-xs">{inv.status}</Badge>
                            </td>
                            <td className="px-6 py-3 text-right">
                              <div className="font-medium text-xs">${inv.totalAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                              {inv.outstandingAmount > 0 && (
                                <div className="text-xs text-orange-500">
                                  ${inv.outstandingAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })} due
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
              </CardContent>
            </Card>
          </div>

          <div className="flex gap-3 flex-wrap">
            {[
              { href: "/finance", icon: BarChart3, label: t.finance.title, color: "text-primary" },
              { href: "/finance/invoices", icon: FileText, label: t.finance.invoices, color: "text-blue-500" },
              { href: "/finance/payments", icon: DollarSign, label: t.finance.payments, color: "text-green-500" },
              { href: "/finance/aging", icon: AlertTriangle, label: t.finance.agingReport, color: "text-orange-500" },
              { href: "/finance/credit-limits", icon: TrendingUp, label: "Hạn mức tín dụng", color: "text-red-500" },
              { href: "/sales/orders", icon: ShoppingCart, label: t.orders.title, color: "text-purple-500" },
            ].map(({ href, icon: Icon, label, color }) => (
              <Link key={href} href={href}>
                <Card className="cursor-pointer hover:border-primary/50 transition-colors w-40">
                  <CardContent className="p-4 flex flex-col items-center gap-2">
                    <Icon className={`h-6 w-6 ${color}`} />
                    <span className="text-sm font-medium">{label}</span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Warehouse Dashboard ──────────────────────────────────────────────────────

interface WarehouseKpis {
  stock: { totalSkus: number; lowStockCount: number };
  warehouses: Array<{ id: number; name: string; status: string | null; skuCount: number }>;
  lowStockAlerts: Array<{ sku: string; productName: string; warehouse: string; availableQuantity: number }>;
  recentTransactions: Array<{
    id: number; type: string; quantity: number; notes: string | null;
    createdAt: string; product: string | null; warehouse: string | null;
  }>;
}

const TX_COLOR: Record<string, string> = {
  IN: "text-green-500", OUT: "text-red-500",
  ADJUSTMENT: "text-yellow-500", TRANSFER_IN: "text-blue-500", TRANSFER_OUT: "text-blue-400",
};

function WarehouseDashboard({ user }: { user: any }) {
  const { t } = useLanguage();
  const { data: kpis } = useQuery({
    queryKey: ["warehouse-dashboard"],
    queryFn: () => apiClient.get<WarehouseKpis>("/reporting/warehouse-dashboard").then((r) => r.data),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t.dashboard.warehouseDash}</h1>
        <p className="text-muted-foreground mt-1">
          {t.dashboard.welcome}, <span className="font-medium text-foreground">{user?.fullName}</span>
        </p>
      </div>

      {kpis && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              title={t.dashboard.totalSKUs}
              value={String(kpis.stock.totalSkus)}
              sub="stock entries across all warehouses"
              icon={Package}
            />
            <KpiCard
              title={t.dashboard.lowStockAlerts}
              value={String(kpis.stock.lowStockCount)}
              sub="≤10 units available"
              icon={AlertTriangle}
              accent={kpis.stock.lowStockCount > 0 ? "text-yellow-500" : "text-muted-foreground"}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{t.dashboard.warehouseList}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {kpis.warehouses.map((w) => (
                  <div key={w.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium text-sm">{w.name}</p>
                      <p className="text-xs text-muted-foreground">{w.skuCount} {t.dashboard.skus}</p>
                    </div>
                    <Badge variant={w.status === "ACTIVE" ? "success" : "secondary"} className="text-xs">
                      {w.status ?? "—"}
                    </Badge>
                  </div>
                ))}
                {kpis.warehouses.length === 0 && (
                  <p className="text-sm text-muted-foreground">{t.inventory.noWarehouses}</p>
                )}
              </CardContent>
            </Card>

            <Card className={kpis.stock.lowStockCount > 0 ? "border-yellow-500/30" : ""}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className={`h-4 w-4 ${kpis.stock.lowStockCount > 0 ? "text-yellow-500" : "text-muted-foreground"}`} />
                  {t.dashboard.lowStockAlerts}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {kpis.lowStockAlerts.length === 0
                  ? <p className="text-sm text-muted-foreground px-6 py-4">All stock levels are healthy.</p>
                  : (
                    <table className="w-full text-sm">
                      <tbody>
                        {kpis.lowStockAlerts.map((s, i) => (
                          <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                            <td className="px-6 py-2.5">
                              <div className="font-medium text-xs">{s.productName}</div>
                              <div className="text-xs text-muted-foreground">{s.sku} · {s.warehouse}</div>
                            </td>
                            <td className="px-6 py-2.5 text-right">
                              <span className={`font-bold text-sm ${s.availableQuantity <= 0 ? "text-red-500" : "text-yellow-500"}`}>
                                {s.availableQuantity}
                              </span>
                              <span className="text-xs text-muted-foreground ml-1">{t.common.unit}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{t.dashboard.recentStockMovements}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {kpis.recentTransactions.length === 0
                  ? <p className="text-sm text-muted-foreground px-6 py-4">{t.inventory.noTransactions}</p>
                  : (
                    <table className="w-full text-sm">
                      <tbody>
                        {kpis.recentTransactions.map((tx) => (
                          <tr key={tx.id} className="border-b last:border-0 hover:bg-muted/30">
                            <td className="px-6 py-2.5">
                              <div className="font-medium text-xs">{tx.product ?? "—"}</div>
                              <div className="text-xs text-muted-foreground">{tx.warehouse ?? "—"} · {tx.type}</div>
                            </td>
                            <td className="px-6 py-2.5 text-right">
                              <span className={`font-bold text-sm ${TX_COLOR[tx.type] ?? "text-foreground"}`}>
                                {tx.quantity > 0 ? "+" : ""}{tx.quantity}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
              </CardContent>
            </Card>

            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">{t.dashboard.quickActions}</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { href: "/inventory",                icon: Package,    label: t.inventory.title,         color: "text-[#593E67]", bg: "bg-[#593E67]/10" },
                  { href: "/inventory/stock-inquiries", icon: ClipboardList, label: t.sidebar.stockInquiries, color: "text-[#84495F]", bg: "bg-[#84495F]/10" },
                  { href: "/catalog",                  icon: LayoutGrid, label: t.catalog.products,        color: "text-[#B85B56]", bg: "bg-[#B85B56]/10" },
                  { href: "/notifications",            icon: Bell,       label: t.notifications.title,     color: "text-[#FEA837]", bg: "bg-[#FEA837]/15" },
                ].map(({ href, icon: Icon, label, color, bg }) => (
                  <Link key={href} href={href}>
                    <Card className="cursor-pointer hover:border-[#593E67]/40 hover:shadow-md transition-all h-full">
                      <CardContent className="p-4 flex flex-col items-center gap-3">
                        <div className={`h-10 w-10 rounded-xl ${bg} flex items-center justify-center`}>
                          <Icon className={`h-5 w-5 ${color}`} />
                        </div>
                        <span className="text-sm font-medium text-center">{label}</span>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Root page — route by role ────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, hasPermission } = useAuthStore();

  if (hasPermission("reporting.dashboard.view_all")) return <AdminDashboard user={user} />;
  if (hasPermission("reporting.dashboard.view_finance")) return <AccountantDashboard user={user} />;
  if (hasPermission("reporting.dashboard.view_warehouse")) return <WarehouseDashboard user={user} />;
  if (hasPermission("reporting.dashboard.view_self") && hasPermission("reporting.sales_kpi.view_self")) return <SalesDashboard user={user} />;
  return <CustomerDashboard user={user} />;
}
