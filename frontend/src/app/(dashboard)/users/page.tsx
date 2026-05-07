"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Search, Lock, Unlock, MoreHorizontal, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { usersApi } from "@/lib/api/users";
import { useAuthStore } from "@/store/auth.store";
import { CreateUserDialog } from "./create-user-dialog";
import type { User } from "@/types/user";
import { useLanguage } from "@/context/language-context";

const STATUS_VARIANT: Record<string, "success" | "destructive" | "warning" | "secondary"> = {
  ACTIVE: "success",
  LOCKED: "destructive",
  INACTIVE: "secondary",
};

export default function UsersPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const { hasPermission } = useAuthStore();
  const qc = useQueryClient();
  const { t } = useLanguage();

  const { data, isLoading } = useQuery({
    queryKey: ["users", page, search],
    queryFn: () => usersApi.list({ page, limit: 15, search: search || undefined }),
    placeholderData: (prev) => prev,
  });

  const lockMutation = useMutation({
    mutationFn: (id: number) => usersApi.lock(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users"] }); toast.success("User locked"); },
    onError: () => toast.error("Failed to lock user"),
  });

  const unlockMutation = useMutation({
    mutationFn: (id: number) => usersApi.unlock(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users"] }); toast.success("User unlocked"); },
    onError: () => toast.error("Failed to unlock user"),
  });

  const canCreate = hasPermission("auth.user.create");
  const canLock = hasPermission("auth.user.lock");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t.users.title}</h1>
          <p className="text-muted-foreground mt-1">{t.users.subtitle}</p>
        </div>
        {canCreate && (
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" />
            {t.users.createUser}
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={`${t.common.search}...`}
                className="pl-9"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            {data && (
              <span className="text-sm text-muted-foreground">
                {data.total} {t.common.role}
              </span>
            )}
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
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.users.fullName}</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.users.email}</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.users.role}</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.users.status}</th>
                    <th className="h-10 px-6 text-left font-medium text-muted-foreground">{t.users.createdAt}</th>
                    <th className="h-10 px-4 text-right font-medium text-muted-foreground">{t.common.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.items.map((user: User) => (
                    <tr key={user.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-3 font-medium">{user.fullName || "—"}</td>
                      <td className="px-6 py-3 text-muted-foreground">{user.email}</td>
                      <td className="px-6 py-3">
                        <div className="flex flex-wrap gap-1">
                          {user.roles?.map((r) => (
                            <Badge key={r.id} variant="outline" className="text-xs">{r.name}</Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <Badge variant={STATUS_VARIANT[user.status] ?? "secondary"}>
                          {user.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-3 text-muted-foreground text-xs">
                        {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {canLock && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>{t.common.actions}</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {user.status === "LOCKED" ? (
                                <DropdownMenuItem onClick={() => unlockMutation.mutate(user.id)} disabled={unlockMutation.isPending}>
                                  <Unlock className="h-4 w-4 mr-2" />
                                  Unlock
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => lockMutation.mutate(user.id)} disabled={lockMutation.isPending} className="text-destructive focus:text-destructive">
                                  <Lock className="h-4 w-4 mr-2" />
                                  Lock
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </td>
                    </tr>
                  ))}
                  {data?.items.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-muted-foreground">{t.users.noUsers}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-6 py-3">
              <span className="text-sm text-muted-foreground">
                {t.common.page} {data.page} {t.common.of} {data.totalPages}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page <= 1}>{t.common.previous}</Button>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= data.totalPages}>{t.common.next}</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateUserDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        onSuccess={() => qc.invalidateQueries({ queryKey: ["users"] })}
      />
    </div>
  );
}
