"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  LogOut,
  ChevronRight,
  Building2,
  Package,
  UserRound,
  ShoppingCart,
  DollarSign,
  LayoutGrid,
  Shield,
  Bell,
  Settings,
  Languages,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuthStore } from "@/store/auth.store";
import { authApi } from "@/lib/api/auth";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useLanguage } from "@/context/language-context";

// permission: null = visible to all authenticated users
const NAV_ITEMS = [
  { href: "/dashboard",     labelKey: "dashboard"    as const, icon: LayoutDashboard, permission: null },
  { href: "/catalog",       labelKey: "catalog"      as const, icon: LayoutGrid,      permission: "catalog.product.view" },
  { href: "/inventory",     labelKey: "inventory"    as const, icon: Package,         permission: "inventory.stock.view" },
  { href: "/customers",     labelKey: "customers"    as const, icon: UserRound,       permission: "customer.view_assigned" },
  { href: "/sales",         labelKey: "sales"        as const, icon: ShoppingCart,    permission: "sales.delivery.view" },
  { href: "/my-orders",     labelKey: "myOrders"     as const, icon: ClipboardList,   permission: "sales.order.view_own" },
  { href: "/finance",       labelKey: "finance"      as const, icon: DollarSign,      permission: "finance.invoice.view" },
  { href: "/audit",         labelKey: "auditLog"     as const, icon: Shield,          permission: "audit.security.view" },
  { href: "/notifications", labelKey: "notifications"as const, icon: Bell,            permission: null },
  { href: "/settings",      labelKey: "settings"     as const, icon: Settings,        permission: "profile.update_self" },
  { href: "/users",         labelKey: "users"        as const, icon: Users,           permission: "auth.user.read" },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const { user, hasPermission, logout } = useAuthStore();
  const router = useRouter();
  const { t, toggleLang, lang } = useLanguage();

  const visibleItems = NAV_ITEMS.filter(
    (item) => item.permission === null || hasPermission(item.permission)
  );

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore — revoke anyway
    }
    logout();
    router.push("/login");
    toast.success(t.common.logout);
  };

  const initials = user?.fullName
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? "??";

  return (
    <aside className="flex h-full w-60 flex-col border-r bg-sidebar-background">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 px-6 border-b">
        <Building2 className="h-6 w-6 text-sidebar-primary" />
        <span className="font-semibold text-sidebar-foreground">miniERP</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 p-4">
        {visibleItems.map(({ href, labelKey, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              pathname === href || pathname.startsWith(href + "/")
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {t.sidebar[labelKey]}
            {(pathname === href || pathname.startsWith(href + "/")) && (
              <ChevronRight className="ml-auto h-3 w-3" />
            )}
          </Link>
        ))}
      </nav>

      <Separator />

      {/* Language toggle */}
      <div className="px-4 pt-3">
        <Button
          variant="ghost"
          size="sm"
          className="w-full gap-2 justify-start text-muted-foreground hover:text-foreground"
          onClick={toggleLang}
          title={t.sidebar.switchLang}
        >
          <Languages className="h-4 w-4" />
          {lang === "vi" ? "🇻🇳 Tiếng Việt" : "🇺🇸 English"}
        </Button>
      </div>

      <Separator className="mt-3" />

      {/* User + logout */}
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium text-sidebar-foreground">{user?.fullName ?? "—"}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email ?? "—"}</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          {t.common.logout}
        </Button>
      </div>
    </aside>
  );
}
