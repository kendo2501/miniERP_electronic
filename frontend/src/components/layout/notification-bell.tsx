"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, CheckCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/api/client";
import { cn } from "@/lib/utils";

interface Notification {
  id: number;
  notificationType?: string;
  subject?: string;
  content?: string;
  priority?: string;
  readAt?: string;
  createdAt: string;
}

const PRIORITY_COLORS: Record<string, string> = {
  URGENT: "text-red-500",
  HIGH: "text-orange-500",
  NORMAL: "",
  LOW: "text-muted-foreground",
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { data: countData } = useQuery({
    queryKey: ["notifications-unread"],
    queryFn: () => apiClient.get<{ unreadCount: number }>("/notifications/me/unread-count").then((r) => r.data),
    refetchInterval: 30000,
  });

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["notifications-me"],
    queryFn: () =>
      apiClient.get<{ items: Notification[] }>("/notifications/me", { params: { limit: 15 } }).then((r) => r.data),
    enabled: open,
  });

  const markReadMut = useMutation({
    mutationFn: (id: number) => apiClient.post(`/notifications/me/${id}/read`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications-me"] });
      qc.invalidateQueries({ queryKey: ["notifications-unread"] });
    },
  });

  const markAllMut = useMutation({
    mutationFn: () => apiClient.post("/notifications/me/read-all"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications-me"] });
      qc.invalidateQueries({ queryKey: ["notifications-unread"] });
    },
  });

  const unread = countData?.unreadCount ?? 0;

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative h-9 w-9"
        onClick={() => setOpen((v) => !v)}
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#FEA837] text-[10px] font-bold text-[#432D51]">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-50 w-80 rounded-lg border bg-background shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b px-4 py-3">
              <span className="font-semibold text-sm">Notifications</span>
              {unread > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => markAllMut.mutate()}
                  disabled={markAllMut.isPending}
                >
                  {markAllMut.isPending
                    ? <Loader2 className="h-3 w-3 animate-spin" />
                    : <CheckCheck className="h-3 w-3" />
                  }
                  Mark all read
                </Button>
              )}
            </div>

            {/* List */}
            <div className="max-h-96 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : notifications?.items.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  No notifications
                </div>
              ) : (
                notifications?.items.map((n) => (
                  <div
                    key={n.id}
                    className={cn(
                      "flex gap-3 border-b px-4 py-3 transition-colors last:border-0",
                      !n.readAt ? "bg-primary/5" : "hover:bg-muted/30"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn("text-xs font-medium truncate", PRIORITY_COLORS[n.priority ?? "NORMAL"])}>
                          {n.subject ?? n.notificationType ?? "Notification"}
                        </p>
                        {!n.readAt && (
                          <button
                            className="shrink-0 text-muted-foreground hover:text-foreground"
                            onClick={() => markReadMut.mutate(n.id)}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.content}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {new Date(n.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {!n.readAt && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#FEA837]" />
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="border-t px-4 py-2">
              <a href="/notifications" className="block text-center text-xs text-primary hover:underline">
                View all notifications
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
