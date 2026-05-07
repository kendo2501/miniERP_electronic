"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, CheckCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiClient } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useLanguage } from "@/context/language-context";

interface Notification {
  id: number;
  channel?: string;
  notificationType?: string;
  subject?: string;
  content?: string;
  status?: string;
  priority?: string;
  readAt?: string;
  sentAt?: string;
  createdAt: string;
}

const PRIORITY_VARIANTS: Record<string, string> = {
  URGENT: "destructive",
  HIGH: "warning",
  NORMAL: "secondary",
  LOW: "outline",
};

export default function NotificationsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const qc = useQueryClient();
  const { t } = useLanguage();

  const { data, isLoading } = useQuery({
    queryKey: ["notifications-page", page, statusFilter],
    queryFn: () =>
      apiClient.get<{ items: Notification[]; total: number; page: number; totalPages: number }>(
        "/notifications/me",
        { params: { page, limit: 20, status: statusFilter !== "all" ? statusFilter : undefined } }
      ).then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const { data: countData } = useQuery({
    queryKey: ["notifications-unread"],
    queryFn: () => apiClient.get<{ unreadCount: number }>("/notifications/me/unread-count").then((r) => r.data),
  });

  const markReadMut = useMutation({
    mutationFn: (id: number) => apiClient.post(`/notifications/me/${id}/read`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications-page"] });
      qc.invalidateQueries({ queryKey: ["notifications-unread"] });
    },
  });

  const markAllMut = useMutation({
    mutationFn: () => apiClient.post("/notifications/me/read-all"),
    onSuccess: () => {
      toast.success(t.notifications.markAllRead);
      qc.invalidateQueries({ queryKey: ["notifications-page"] });
      qc.invalidateQueries({ queryKey: ["notifications-unread"] });
    },
  });

  const unread = countData?.unreadCount ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t.notifications.title}</h1>
          <p className="text-muted-foreground mt-1">
            {t.notifications.subtitle}
            {unread > 0 && <span className="ml-2 text-primary font-medium">({unread} {t.notifications.unread})</span>}
          </p>
        </div>
        {unread > 0 && (
          <Button variant="outline" onClick={() => markAllMut.mutate()} disabled={markAllMut.isPending}>
            {markAllMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
            {t.notifications.markAllRead}
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-36"><SelectValue placeholder={t.notifications.all} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.notifications.all}</SelectItem>
                <SelectItem value="PENDING">{t.common.pending}</SelectItem>
                <SelectItem value="SENT">{t.common.sent}</SelectItem>
                <SelectItem value="READ">{t.notifications.markRead}</SelectItem>
              </SelectContent>
            </Select>
            {data && <span className="text-sm text-muted-foreground ml-auto">{data.total} {t.notifications.title.toLowerCase()}</span>}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="divide-y">
              {data?.items.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    "flex items-start gap-4 px-6 py-4 transition-colors",
                    !n.readAt ? "bg-primary/5" : "hover:bg-muted/20"
                  )}
                >
                  <div className={cn(
                    "mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                    !n.readAt ? "bg-primary/20" : "bg-muted"
                  )}>
                    <Bell className={cn("h-4 w-4", !n.readAt ? "text-primary" : "text-muted-foreground")} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">
                        {n.subject ?? n.notificationType ?? t.notifications.title}
                      </p>
                      {n.priority && n.priority !== "NORMAL" && (
                        <Badge variant={(PRIORITY_VARIANTS[n.priority] ?? "secondary") as any} className="text-xs">
                          {n.priority}
                        </Badge>
                      )}
                      {n.channel && (
                        <Badge variant="outline" className="text-xs">{n.channel}</Badge>
                      )}
                      {!n.readAt && (
                        <span className="h-2 w-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{n.content}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(n.createdAt).toLocaleString()}
                    </p>
                  </div>

                  {!n.readAt && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                      onClick={() => markReadMut.mutate(n.id)}
                      disabled={markReadMut.isPending}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              {data?.items.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
                  <Bell className="h-8 w-8 opacity-30" />
                  <p className="text-sm">{t.notifications.noNotifications}</p>
                </div>
              )}
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
    </div>
  );
}
