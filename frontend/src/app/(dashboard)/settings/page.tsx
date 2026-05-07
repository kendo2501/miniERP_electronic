"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Settings, Save, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiClient } from "@/lib/api/client";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth.store";
import { useLanguage } from "@/context/language-context";

interface Setting {
  id: number;
  category?: string;
  key: string;
  value: any;
  valueType?: string;
  scope?: string;
  isSensitive: boolean;
  isReadonly: boolean;
  version: number;
  updatedAt: string;
  updater?: { id: number; fullName: string };
}

function SettingRow({ setting, onSave }: { setting: Setting; onSave: (key: string, value: any) => void }) {
  const { t } = useLanguage();
  const [editVal, setEditVal] = useState(
    typeof setting.value === "object" ? JSON.stringify(setting.value, null, 2) : String(setting.value ?? "")
  );
  const [showSecret, setShowSecret] = useState(false);
  const [dirty, setDirty] = useState(false);

  const displayVal = setting.isSensitive && !showSecret ? "***" : editVal;

  return (
    <tr className="border-b last:border-0">
      <td className="px-6 py-3">
        <div className="font-mono text-xs font-medium">{setting.key}</div>
        {setting.scope && <div className="text-xs text-muted-foreground">{setting.scope}</div>}
      </td>
      <td className="px-6 py-3">
        {setting.isReadonly ? (
          <span className="font-mono text-xs text-muted-foreground">{String(setting.value ?? "—")}</span>
        ) : (
          <div className="flex items-center gap-2">
            <Input
              className="h-8 text-xs font-mono max-w-xs"
              value={displayVal}
              onChange={(e) => { setEditVal(e.target.value); setDirty(true); }}
              disabled={setting.isSensitive && !showSecret}
            />
            {setting.isSensitive && (
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0"
                onClick={() => setShowSecret((v) => !v)}>
                {showSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </Button>
            )}
          </div>
        )}
      </td>
      <td className="px-6 py-3 text-xs text-muted-foreground">{setting.valueType ?? "—"}</td>
      <td className="px-6 py-3">
        <div className="flex gap-1">
          {setting.isSensitive && <Badge variant="secondary" className="text-xs">Sensitive</Badge>}
          {setting.isReadonly && <Badge variant="outline" className="text-xs">Read-only</Badge>}
        </div>
      </td>
      <td className="px-6 py-3 text-xs text-muted-foreground">
        <div>{setting.updater?.fullName ?? "System"}</div>
        <div>{new Date(setting.updatedAt).toLocaleDateString()}</div>
      </td>
      <td className="px-6 py-3">
        {!setting.isReadonly && dirty && (
          <Button size="sm" className="h-7 text-xs gap-1"
            onClick={() => { onSave(setting.key, editVal); setDirty(false); }}>
            <Save className="h-3 w-3" /> {t.common.save}
          </Button>
        )}
      </td>
    </tr>
  );
}

export default function SettingsPage() {
  const [categoryFilter, setCategoryFilter] = useState("all");
  const { hasPermission } = useAuthStore();
  const qc = useQueryClient();
  const { t } = useLanguage();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["settings", categoryFilter],
    queryFn: () =>
      apiClient.get<Setting[]>("/settings", {
        params: { category: categoryFilter !== "all" ? categoryFilter : undefined },
      }).then((r) => r.data),
  });

  const { data: categories } = useQuery({
    queryKey: ["settings-categories"],
    queryFn: () =>
      apiClient.get<{ category: string; _count: { id: number } }[]>("/settings/categories").then((r) => r.data),
  });

  const updateMut = useMutation({
    mutationFn: ({ key, value }: { key: string; value: any }) =>
      apiClient.patch(`/settings/${key}`, { value }),
    onSuccess: () => {
      toast.success(t.settings.profileUpdated);
      qc.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed to update setting"),
  });

  const canManage = hasPermission("settings.manage");

  if (!canManage) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
        <Settings className="h-10 w-10 opacity-20" />
        <p>You don't have permission to view system settings.</p>
      </div>
    );
  }

  const grouped = settings?.reduce<Record<string, Setting[]>>((acc, s) => {
    const cat = s.category ?? "General";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {}) ?? {};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t.settings.title}</h1>
          <p className="text-muted-foreground mt-1">{t.settings.subtitle}</p>
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder={`${t.common.all}`} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.common.all}</SelectItem>
            {categories?.map((c) => (
              <SelectItem key={c.category} value={c.category}>
                {c.category} ({c._count.id})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {t.common.noData}
          </CardContent>
        </Card>
      ) : (
        Object.entries(grouped).map(([category, items]) => (
          <Card key={category}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-4 w-4 text-muted-foreground" />
                {category}
                <Badge variant="outline" className="text-xs font-normal">{items.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="h-9 px-6 text-left font-medium text-muted-foreground">Key</th>
                      <th className="h-9 px-6 text-left font-medium text-muted-foreground">Value</th>
                      <th className="h-9 px-6 text-left font-medium text-muted-foreground">Type</th>
                      <th className="h-9 px-6 text-left font-medium text-muted-foreground">Flags</th>
                      <th className="h-9 px-6 text-left font-medium text-muted-foreground">Updated</th>
                      <th className="h-9 px-6 text-left font-medium text-muted-foreground"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((s) => (
                      <SettingRow
                        key={s.key}
                        setting={s}
                        onSave={(key, value) => updateMut.mutate({ key, value })}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
