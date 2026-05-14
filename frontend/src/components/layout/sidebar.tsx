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
  ClipboardCheck,
  Zap,
  FileText,
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
  { href: "/dashboard",                  labelKey: "dashboard"      as const, icon: LayoutDashboard, permission: null },
  { href: "/catalog",                    labelKey: "catalog"        as const, icon: LayoutGrid,      permission: "catalog.product.view" },
  { href: "/inventory",                  labelKey: "inventory"      as const, icon: Package,         permission: "inventory.stock.view" },
  { href: "/customers",                  labelKey: "customers"      as const, icon: UserRound,       permission: "customer.view_assigned" },
  { href: "/sales",                      labelKey: "sales"          as const, icon: ShoppingCart,    permission: "sales.quotation.create" },
  { href: "/my-quotations",               labelKey: "myQuotations"   as const, icon: FileText,        permission: "sales.quotation.view_own" },
  { href: "/my-orders",                  labelKey: "myOrders"       as const, icon: ClipboardList,   permission: "sales.order.view_own" },
  { href: "/sales/stock-inquiries",      labelKey: "stockInquiries" as const, icon: ClipboardCheck,  permission: "inventory.stock.request" },
  { href: "/inventory/stock-inquiries",  labelKey: "stockInquiries" as const, icon: ClipboardCheck,  permission: "inventory.stock.respond" },
  { href: "/finance",                    labelKey: "finance"        as const, icon: DollarSign,      permission: "finance.invoice.view" },
  { href: "/audit",                      labelKey: "auditLog"       as const, icon: Shield,          permission: "audit.security.view" },
  { href: "/notifications",              labelKey: "notifications"  as const, icon: Bell,            permission: null },
  { href: "/settings",                   labelKey: "settings"       as const, icon: Settings,        permission: "profile.update_self" },
  { href: "/users",                      labelKey: "users"          as const, icon: Users,           permission: "auth.user.read" },
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
    <aside className="flex h-full w-60 flex-col bg-sidebar-background">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 px-5 border-b border-sidebar-border">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FEA837] shrink-0">
          <Zap className="h-4 w-4 text-[#432D51]" fill="currentColor" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-sm text-white leading-tight">miniERP</span>
          <span className="text-[10px] text-sidebar-foreground/50 leading-none">Electronic</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 px-3 py-4 overflow-y-auto">
        {visibleItems.map(({ href, labelKey, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-white/15 text-white shadow-sm"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-white"
              )}
            >
              {/* Active accent bar */}
              <span className={cn(
                "absolute left-3 h-5 w-0.5 rounded-full transition-all duration-150",
                isActive ? "bg-[#FEA837]" : "bg-transparent"
              )} />
              <Icon className={cn(
                "h-4 w-4 shrink-0 transition-colors",
                isActive ? "text-[#FEA837]" : "text-sidebar-foreground/70 group-hover:text-white"
              )} />
              <span className="flex-1 truncate">{t.sidebar[labelKey]}</span>
              {isActive && (
                <ChevronRight className="ml-auto h-3 w-3 text-[#FEA837] shrink-0" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Divider */}
      <div className="h-px bg-sidebar-border mx-3" />

      {/* Language toggle */}
      <div className="px-3 pt-2">
        <button
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-white transition-colors"
          onClick={toggleLang}
          title={t.sidebar.switchLang}
        >
          <Languages className="h-3.5 w-3.5 shrink-0" />
          {lang === "vi" ? "🇻🇳 Tiếng Việt" : "🇺🇸 English"}
        </button>
      </div>

      {/* User card */}
      <div className="p-3 pt-2">
        <div className="rounded-xl bg-white/8 border border-sidebar-border p-3">
          <div className="flex items-center gap-2.5 mb-3">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className="text-xs font-semibold bg-[#84495F] text-white border-0">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="truncate text-xs font-semibold text-white">{user?.fullName ?? "—"}</p>
              <p className="truncate text-[10px] text-sidebar-foreground/50 mt-0.5">{user?.email ?? "—"}</p>
            </div>
          </div>
          <button
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-sidebar-foreground/70 hover:bg-white/10 hover:text-white transition-colors"
            onClick={handleLogout}
          >
            <LogOut className="h-3.5 w-3.5" />
            {t.common.logout}
          </button>
        </div>
      </div>
    </aside>
  );
}
