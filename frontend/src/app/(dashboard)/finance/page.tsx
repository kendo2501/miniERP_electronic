"use client";
import { useQuery } from "@tanstack/react-query";
import { Loader2, FileText, CreditCard, AlertTriangle, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getOutstanding, getAgingReport } from "@/lib/api/finance";
import Link from "next/link";
import { useLanguage } from "@/context/language-context";

function StatCard({ title, value, sub, icon: Icon, accent }: { title: string; value: string; sub?: string; icon: any; accent?: string }) {
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

  const { data: outstanding, isLoading: loadOut } = useQuery({
    queryKey: ["outstanding"],
    queryFn: () => getOutstanding({ limit: 5 }).then((r) => r.data),
  });

  const { data: aging, isLoading: loadAging } = useQuery({
    queryKey: ["aging"],
    queryFn: () => getAgingReport().then((r) => r.data),
  });

  const totalOutstanding = aging?.summary.total ?? 0;
  const overdue = (aging?.summary.days1_30 ?? 0) + (aging?.summary.days31_60 ?? 0) +
    (aging?.summary.days61_90 ?? 0) + (aging?.summary.over90 ?? 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t.finance.title}</h1>
          <p className="text-muted-foreground mt-1">{t.finance.subtitle}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/finance/invoices"><Button variant="outline" size="sm">{t.finance.invoices}</Button></Link>
          <Link href="/finance/payments"><Button variant="outline" size="sm">{t.finance.payments}</Button></Link>
          <Link href="/finance/aging"><Button variant="outline" size="sm">{t.finance.agingReport}</Button></Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={t.finance.totalOutstanding}
          value={loadAging ? "…" : `$${totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          sub={t.finance.unpaidInvoicesSub}
          icon={TrendingUp}
          accent="text-primary"
        />
        <StatCard
          title={t.finance.overdue}
          value={loadAging ? "…" : `$${overdue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          sub={t.finance.pastDue}
          icon={AlertTriangle}
          accent="text-yellow-500"
        />
        <StatCard
          title={t.finance.unpaidInvoices}
          value={loadOut ? "…" : String(outstanding?.total ?? 0)}
          sub={t.finance.unpaidInvoicesSub}
          icon={FileText}
        />
        <StatCard
          title={t.finance.currentNotDue}
          value={loadAging ? "…" : `$${(aging?.summary.current ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          sub={t.finance.withinTerms}
          icon={CreditCard}
          accent="text-green-500"
        />
      </div>

      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base">{t.finance.outstandingInvoices}</CardTitle>
          <Link href="/finance/invoices?status=SENT">
            <Button variant="ghost" size="sm" className="text-xs">{t.common.viewAll}</Button>
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {loadOut ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="h-9 px-6 text-left font-medium text-muted-foreground">{t.invoices.invoiceNumber}</th>
                  <th className="h-9 px-6 text-left font-medium text-muted-foreground">{t.common.customer}</th>
                  <th className="h-9 px-6 text-left font-medium text-muted-foreground">{t.common.status}</th>
                  <th className="h-9 px-6 text-right font-medium text-muted-foreground">{t.invoices.outstanding}</th>
                  <th className="h-9 px-6 text-left font-medium text-muted-foreground">{t.invoices.dueDate}</th>
                </tr>
              </thead>
              <tbody>
                {outstanding?.items.map((inv) => {
                  const isOverdue = inv.dueDate && new Date(inv.dueDate) < new Date();
                  return (
                    <tr key={inv.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-6 py-3 font-mono text-xs font-medium">{inv.invoiceNumber}</td>
                      <td className="px-6 py-3 font-medium">{inv.customer.companyName}</td>
                      <td className="px-6 py-3">
                        <Badge variant={inv.status === "PARTIALLY_PAID" ? "warning" : "default"}>
                          {inv.status === "PARTIALLY_PAID" ? t.common.partial : inv.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-3 text-right font-medium">
                        ${Number(inv.outstandingAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-3 text-xs">
                        <span className={isOverdue ? "text-red-500 font-medium" : "text-muted-foreground"}>
                          {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "—"}
                          {isOverdue && ` (${t.common.overdue})`}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {outstanding?.items.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">{t.finance.noOutstanding}</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {!loadAging && aging && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t.finance.agingSummary}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-4 text-center">
              {[
                { label: t.aging.current, value: aging.summary.current, color: "text-green-500" },
                { label: t.aging.days1_30, value: aging.summary.days1_30, color: "text-yellow-500" },
                { label: t.aging.days31_60, value: aging.summary.days31_60, color: "text-orange-500" },
                { label: t.aging.days61_90, value: aging.summary.days61_90, color: "text-red-400" },
                { label: t.aging.over90, value: aging.summary.over90, color: "text-red-600" },
              ].map(({ label, value, color }) => (
                <div key={label} className="space-y-1">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className={`text-lg font-bold ${color}`}>
                    ${value.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4 text-right">
              <Link href="/finance/aging">
                <Button variant="outline" size="sm" className="text-xs">{t.finance.agingReport}</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
