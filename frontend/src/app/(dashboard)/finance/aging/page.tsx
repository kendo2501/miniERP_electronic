"use client";
import { useQuery } from "@tanstack/react-query";
import { Loader2, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getAgingReport } from "@/lib/api/finance";
import Link from "next/link";
import { useLanguage } from "@/context/language-context";

function fmt(v: number) {
  return `$${v.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
}

function AgingBar({ value, total, color }: { value: number; total: number; color: string }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="w-full bg-muted rounded-full h-1.5 mt-1">
      <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function AgingPage() {
  const { t } = useLanguage();

  const { data, isLoading } = useQuery({
    queryKey: ["aging"],
    queryFn: () => getAgingReport().then((r) => r.data),
  });

  const buckets = [
    { key: "current" as const, label: t.aging.current, color: "bg-green-500", textColor: "text-green-500" },
    { key: "days1_30" as const, label: t.aging.days1_30, color: "bg-yellow-500", textColor: "text-yellow-500" },
    { key: "days31_60" as const, label: t.aging.days31_60, color: "bg-orange-500", textColor: "text-orange-500" },
    { key: "days61_90" as const, label: t.aging.days61_90, color: "bg-red-400", textColor: "text-red-400" },
    { key: "over90" as const, label: t.aging.over90, color: "bg-red-600", textColor: "text-red-600" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t.aging.title}</h1>
          <p className="text-muted-foreground mt-1">{t.aging.subtitle}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/finance"><Button variant="outline" size="sm">{t.common.overview}</Button></Link>
          <Link href="/finance/invoices"><Button variant="outline" size="sm">{t.finance.invoices}</Button></Link>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-5 gap-3">
            {buckets.map(({ key, label, color, textColor }) => (
              <Card key={key}>
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <p className={`text-xl font-bold ${textColor}`}>{fmt(data.summary[key])}</p>
                  <AgingBar value={data.summary[key]} total={data.summary.total} color={color} />
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="flex items-center justify-between py-4 px-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <span className="font-semibold">{t.aging.totalOutstanding}</span>
              </div>
              <span className="text-2xl font-bold">{fmt(data.summary.total)}</span>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t.aging.byCustomer} ({data.byCustomer.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.common.customer}</th>
                      <th className="h-10 px-4 text-right font-medium text-green-600">{t.aging.current}</th>
                      <th className="h-10 px-4 text-right font-medium text-yellow-600">{t.aging.days1_30}</th>
                      <th className="h-10 px-4 text-right font-medium text-orange-600">{t.aging.days31_60}</th>
                      <th className="h-10 px-4 text-right font-medium text-red-400">{t.aging.days61_90}</th>
                      <th className="h-10 px-4 text-right font-medium text-red-600">{t.aging.over90}</th>
                      <th className="h-10 px-6 text-right font-medium text-muted-foreground">{t.common.total}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byCustomer.map((row) => (
                      <tr key={row.customer.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-3">
                          <div className="font-medium">{row.customer.companyName}</div>
                          <div className="text-xs text-muted-foreground">{row.customer.customerCode}</div>
                        </td>
                        <td className="px-4 py-3 text-right text-green-600">{row.current > 0 ? fmt(row.current) : "—"}</td>
                        <td className="px-4 py-3 text-right text-yellow-600">{row.days1_30 > 0 ? fmt(row.days1_30) : "—"}</td>
                        <td className="px-4 py-3 text-right text-orange-600">{row.days31_60 > 0 ? fmt(row.days31_60) : "—"}</td>
                        <td className="px-4 py-3 text-right text-red-400">{row.days61_90 > 0 ? fmt(row.days61_90) : "—"}</td>
                        <td className="px-4 py-3 text-right text-red-600">{row.over90 > 0 ? fmt(row.over90) : "—"}</td>
                        <td className="px-6 py-3 text-right font-semibold">{fmt(row.total)}</td>
                      </tr>
                    ))}
                    {data.byCustomer.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-muted-foreground">{t.aging.noOutstanding}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
