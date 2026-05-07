"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Shield, Search, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiClient } from "@/lib/api/client";
import { useLanguage } from "@/context/language-context";

interface AuditLog {
  id: number;
  eventType?: string;
  category?: string;
  action?: string;
  status?: string;
  entityType?: string;
  entityId?: number;
  ipAddress?: string;
  createdAt: string;
  actor?: { id: number; fullName: string; email: string };
  metadata?: any;
}

interface AuditStats {
  total: number;
  recent24h: number;
  byCategory: { category: string; _count: { id: number } }[];
  byStatus: { status: string; _count: { id: number } }[];
}

const STATUS_VARIANTS: Record<string, string> = {
  SUCCESS: "success",
  FAILURE: "destructive",
  ERROR: "destructive",
};

export default function AuditPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const { t } = useLanguage();

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", page, search, categoryFilter, statusFilter],
    queryFn: () =>
      apiClient.get<{ items: AuditLog[]; total: number; page: number; totalPages: number }>("/audit/logs", {
        params: {
          page, limit: 30,
          eventType: search || undefined,
          category: categoryFilter !== "all" ? categoryFilter : undefined,
          status: statusFilter !== "all" ? statusFilter : undefined,
        },
      }).then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const { data: stats } = useQuery({
    queryKey: ["audit-stats"],
    queryFn: () => apiClient.get<AuditStats>("/audit/stats").then((r) => r.data),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t.audit.title}</h1>
          <p className="text-muted-foreground mt-1">{t.audit.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Read-only immutable log</span>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">Total Events</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-2xl font-bold">{stats.total.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">Last 24 Hours</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                <p className="text-2xl font-bold">{stats.recent24h.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
          {stats.byStatus.map((s) => (
            <Card key={s.status}>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground">{s.status ?? "Unknown"}</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <p className={`text-2xl font-bold ${s.status === "FAILURE" || s.status === "ERROR" ? "text-destructive" : "text-green-500"}`}>
                  {s._count.id.toLocaleString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={`${t.common.search}...`}
                className="pl-9"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1); }}>
              <SelectTrigger className="w-36"><SelectValue placeholder={t.common.all} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.common.all}</SelectItem>
                {stats?.byCategory.map((c) => (
                  <SelectItem key={c.category} value={c.category}>{c.category} ({c._count.id})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-32"><SelectValue placeholder={t.common.all} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.common.all}</SelectItem>
                <SelectItem value="SUCCESS">Success</SelectItem>
                <SelectItem value="FAILURE">Failure</SelectItem>
              </SelectContent>
            </Select>
            {data && <span className="text-sm text-muted-foreground ml-auto">{data.total} {t.audit.totalLogs}</span>}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">Event</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">Category</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.audit.actor}</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.audit.resource}</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.common.status}</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.audit.ipAddress}</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.audit.timestamp}</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.items.map((log) => (
                    <tr key={log.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-3 font-mono text-xs">{log.eventType ?? "—"}</td>
                      <td className="px-6 py-3 text-muted-foreground text-xs">{log.category ?? "—"}</td>
                      <td className="px-6 py-3">
                        {log.actor ? (
                          <div>
                            <div className="font-medium text-xs">{log.actor.fullName}</div>
                            <div className="text-xs text-muted-foreground">{log.actor.email}</div>
                          </div>
                        ) : <span className="text-muted-foreground text-xs">System</span>}
                      </td>
                      <td className="px-6 py-3 text-xs text-muted-foreground">
                        {log.entityType ? `${log.entityType}${log.entityId ? ` #${log.entityId}` : ""}` : "—"}
                      </td>
                      <td className="px-6 py-3">
                        {log.status && (
                          <Badge variant={(STATUS_VARIANTS[log.status] ?? "secondary") as any} className="text-xs">
                            {log.status}
                          </Badge>
                        )}
                      </td>
                      <td className="px-6 py-3 font-mono text-xs text-muted-foreground">{log.ipAddress ?? "—"}</td>
                      <td className="px-6 py-3 text-xs text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-3">
                        {log.metadata && (
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setSelectedLog(log)}>
                            {t.common.viewAll}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {data?.items.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-muted-foreground">{t.audit.noLogs}</td>
                    </tr>
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

      {selectedLog && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Event Detail — #{selectedLog.id}</CardTitle>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelectedLog(null)}>{t.common.close}</Button>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted/50 rounded-md p-4 overflow-auto max-h-64">
              {JSON.stringify({
                eventType: selectedLog.eventType,
                action: selectedLog.action,
                metadata: selectedLog.metadata,
                beforeSnapshot: (selectedLog as any).beforeSnapshot,
                afterSnapshot: (selectedLog as any).afterSnapshot,
              }, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
