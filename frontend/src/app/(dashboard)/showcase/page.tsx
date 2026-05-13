"use client";

import { useState } from "react";
import {
  LayoutDashboard, Package, ShoppingCart, Users, BarChart3, Settings,
  Bell, Search, Menu, X, TrendingUp, TrendingDown, ArrowRight,
  ChevronRight, CheckCircle2, Clock, AlertCircle, Loader2, Star,
  Download, Filter, MoreHorizontal, Plus, Zap, Shield, Globe,
  LogOut, ChevronDown, BarChart2, FileText, Truck, CreditCard,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type BadgeVariant = "highlight" | "accent" | "cta" | "secondary" | "neutral";
type ButtonVariant = "cta" | "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

// ─── Design Token Components ─────────────────────────────────────────────────

function Badge({ variant = "neutral", children }: { variant?: BadgeVariant; children: React.ReactNode }) {
  const styles: Record<BadgeVariant, string> = {
    highlight: "bg-brand-highlight/15 text-amber-700 border border-brand-highlight/40",
    accent:    "bg-brand-accent/10 text-brand-accent border border-brand-accent/30",
    cta:       "bg-brand-cta/10 text-orange-700 border border-brand-cta/30",
    secondary: "bg-brand-secondary/10 text-brand-secondary border border-brand-secondary/30",
    neutral:   "bg-gray-100 text-gray-600 border border-gray-200",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${styles[variant]}`}>
      {children}
    </span>
  );
}

function Btn({
  variant = "cta", size = "md", disabled = false, loading = false,
  children, onClick, className = "",
}: {
  variant?: ButtonVariant; size?: ButtonSize; disabled?: boolean;
  loading?: boolean; children: React.ReactNode; onClick?: () => void; className?: string;
}) {
  const base = "inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all duration-150 cursor-pointer select-none";
  const sizes: Record<ButtonSize, string> = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };
  const variants: Record<ButtonVariant, string> = {
    cta:       "bg-brand-cta text-white hover:bg-[#C6650F] active:scale-95 shadow-sm shadow-brand-cta/30",
    primary:   "bg-brand-primary text-white hover:bg-brand-secondary active:scale-95 shadow-sm shadow-brand-primary/20",
    secondary: "bg-brand-secondary/10 text-brand-secondary border border-brand-secondary/30 hover:bg-brand-secondary/20 active:scale-95",
    ghost:     "bg-transparent text-brand-primary hover:bg-brand-primary/8 active:scale-95",
    danger:    "bg-brand-accent text-white hover:bg-[#A34A45] active:scale-95 shadow-sm shadow-brand-accent/30",
  };
  const disabledStyle = "opacity-50 cursor-not-allowed pointer-events-none";

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`${base} ${sizes[size]} ${variants[variant]} ${(disabled || loading) ? disabledStyle : ""} ${className}`}
    >
      {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {children}
    </button>
  );
}

function Avatar({ name, size = "md", ring = false }: { name: string; size?: "sm" | "md" | "lg"; ring?: boolean }) {
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const sizes = { sm: "h-7 w-7 text-xs", md: "h-9 w-9 text-sm", lg: "h-11 w-11 text-base" };
  return (
    <div className={`${sizes[size]} rounded-full bg-gradient-to-br from-brand-secondary to-brand-primary flex items-center justify-center font-bold text-white shrink-0 ${ring ? "ring-2 ring-brand-highlight ring-offset-1" : ""}`}>
      {initials}
    </div>
  );
}

// ─── Data ─────────────────────────────────────────────────────────────────────

// Explicit Tailwind classes — dynamic strings won't be scanned by Tailwind v4
const kpiStyles = [
  { bg: "bg-brand-primary/10", text: "text-brand-primary" },
  { bg: "bg-brand-cta/10",     text: "text-brand-cta" },
  { bg: "bg-brand-secondary/10", text: "text-brand-secondary" },
  { bg: "bg-brand-accent/10",  text: "text-brand-accent" },
];

const kpis = [
  { label: "Total Revenue", value: "₫ 2.4B", change: +14.5, icon: BarChart2 },
  { label: "Active Orders", value: "1,284", change: +8.2, icon: ShoppingCart },
  { label: "Customers", value: "4,071", change: +3.1, icon: Users },
  { label: "Inventory SKUs", value: "892", change: -2.4, icon: Package },
];

const orders = [
  { id: "ORD-8841", customer: "Công ty TNHH Điện Phong", amount: "₫ 14,200,000", status: "completed", items: 8, date: "13 May 2026" },
  { id: "ORD-8840", customer: "Cty CP Xây Dựng Miền Nam", amount: "₫ 6,750,000", status: "pending", items: 3, date: "13 May 2026" },
  { id: "ORD-8839", customer: "Điện tử Bảo Minh Ltd", amount: "₫ 28,900,000", status: "processing", items: 15, date: "12 May 2026" },
  { id: "ORD-8838", customer: "HTX Nông Nghiệp Hưng Thịnh", amount: "₫ 3,120,000", status: "completed", items: 4, date: "12 May 2026" },
  { id: "ORD-8837", customer: "Công ty Cơ Điện Tiến Phát", amount: "₫ 52,480,000", status: "overdue", items: 22, date: "11 May 2026" },
  { id: "ORD-8836", customer: "TNHH TM Dịch Vụ Điện Nam", amount: "₫ 9,640,000", status: "processing", items: 6, date: "11 May 2026" },
];

const activities = [
  { user: "Nguyen Van A", action: "Created quotation #Q-3221", time: "2 min ago", icon: FileText, color: "text-brand-primary" },
  { user: "Le Thi B", action: "Confirmed delivery ORD-8838", time: "18 min ago", icon: Truck, color: "text-brand-cta" },
  { user: "Tran Van C", action: "Recorded payment ₫ 14.2M", time: "42 min ago", icon: CreditCard, color: "text-green-600" },
  { user: "Pham Thi D", action: "Low stock alert: Cáp CVV-4×50", time: "1 hr ago", icon: AlertCircle, color: "text-brand-accent" },
  { user: "Hoang Van E", action: "New customer registered", time: "2 hr ago", icon: Users, color: "text-brand-secondary" },
];

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, active: false },
  { label: "Catalog", icon: Package, active: false, badge: "New" },
  { label: "Sales", icon: ShoppingCart, active: true },
  { label: "Customers", icon: Users, active: false },
  { label: "Inventory", icon: BarChart3, active: false, badge: "3" },
  { label: "Finance", icon: CreditCard, active: false },
  { label: "Reports", icon: FileText, active: false },
  { label: "Settings", icon: Settings, active: false },
];

const statusConfig: Record<string, { label: string; variant: BadgeVariant; icon: React.ReactNode }> = {
  completed:  { label: "Completed",  variant: "secondary", icon: <CheckCircle2 className="h-3 w-3" /> },
  pending:    { label: "Pending",    variant: "highlight", icon: <Clock className="h-3 w-3" /> },
  processing: { label: "Processing", variant: "cta",       icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  overdue:    { label: "Overdue",    variant: "accent",    icon: <AlertCircle className="h-3 w-3" /> },
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────

const kpiBarColors = [
  "bg-brand-primary", "bg-brand-cta", "bg-brand-secondary", "bg-brand-accent",
];

function KpiCard({ kpi, idx }: { kpi: typeof kpis[0]; idx: number }) {
  const isUp = kpi.change >= 0;
  const style = kpiStyles[idx];
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow duration-200 group">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-2.5 rounded-xl ${style.bg}`}>
          <kpi.icon className={`h-5 w-5 ${style.text}`} />
        </div>
        <span className={`flex items-center gap-0.5 text-xs font-semibold px-2 py-1 rounded-full ${isUp ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
          {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {Math.abs(kpi.change)}%
        </span>
      </div>
      <p className="text-2xl font-bold text-gray-900 tracking-tight">{kpi.value}</p>
      <p className="text-sm text-gray-500 mt-1">{kpi.label}</p>
      <div className="mt-4 h-1 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${kpiBarColors[idx]} rounded-full transition-all duration-700`}
          style={{ width: `${Math.min(80 + kpi.change, 100)}%` }}
        />
      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-64 z-50 flex flex-col
          bg-brand-primary
          transition-transform duration-300 ease-in-out
          ${open ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0 lg:static lg:z-auto lg:flex
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-brand-highlight flex items-center justify-center shadow-lg">
              <Zap className="h-4.5 w-4.5 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-none">miniERP</p>
              <p className="text-white/50 text-xs mt-0.5">Electronic B2B</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden text-white/60 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.label}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                transition-all duration-150 group
                ${item.active
                  ? "bg-white/15 text-white shadow-sm"
                  : "text-white/65 hover:text-white hover:bg-white/8"
                }
              `}
            >
              <item.icon className={`h-4.5 w-4.5 shrink-0 transition-transform group-hover:scale-105 ${item.active ? "text-brand-highlight" : ""}`} />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge && (
                <span className={`text-xs px-1.5 py-0.5 rounded-md font-semibold ${item.badge === "New" ? "bg-brand-highlight text-white" : "bg-white/20 text-white"}`}>
                  {item.badge}
                </span>
              )}
              {item.active && <ChevronRight className="h-3.5 w-3.5 text-white/40" />}
            </button>
          ))}
        </nav>

        {/* User profile */}
        <div className="p-3 border-t border-white/10">
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/8 transition-colors group">
            <Avatar name="Admin User" size="sm" ring />
            <div className="flex-1 text-left min-w-0">
              <p className="text-white text-xs font-semibold truncate">Admin User</p>
              <p className="text-white/45 text-xs truncate">admin@minierp.vn</p>
            </div>
            <LogOut className="h-3.5 w-3.5 text-white/40 group-hover:text-white/70 transition-colors shrink-0" />
          </button>
        </div>
      </aside>
    </>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────

function Navbar({ onMenuClick }: { onMenuClick: () => void }) {
  const [notifOpen, setNotifOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm">
      <div className="flex items-center gap-3 px-4 sm:px-6 h-14">
        {/* Mobile menu button */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-1.5 rounded-lg text-brand-primary hover:bg-brand-primary/8 transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Breadcrumb */}
        <div className="hidden sm:flex items-center gap-1.5 text-sm">
          <span className="text-gray-400">Sales</span>
          <ChevronRight className="h-3.5 w-3.5 text-gray-300" />
          <span className="font-semibold text-brand-primary">Orders</span>
        </div>

        {/* Search */}
        <div className="flex-1 max-w-sm ml-auto sm:mx-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              placeholder="Search orders, customers..."
              className="w-full pl-9 pr-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary/40 placeholder-gray-400 transition-all"
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Notification bell */}
          <div className="relative">
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative p-2 rounded-xl text-gray-500 hover:text-brand-primary hover:bg-brand-primary/8 transition-colors"
            >
              <Bell className="h-4.5 w-4.5" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-brand-highlight rounded-full ring-1 ring-white" />
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
                  <p className="font-semibold text-sm text-gray-900">Notifications</p>
                  <Badge variant="highlight">3 new</Badge>
                </div>
                <div className="divide-y divide-gray-50">
                  {[
                    { title: "Low stock alert", desc: "Cáp CVV-4×50 has 5 units left", time: "5m", unread: true },
                    { title: "Payment received", desc: "₫ 14.2M from Điện Phong Ltd", time: "18m", unread: true },
                    { title: "Order overdue", desc: "ORD-8837 past delivery date", time: "1h", unread: true },
                  ].map((n, i) => (
                    <div key={i} className={`flex gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors ${n.unread ? "bg-brand-highlight/3" : ""}`}>
                      <div className={`h-1.5 w-1.5 mt-1.5 rounded-full shrink-0 ${n.unread ? "bg-brand-highlight" : "bg-transparent"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{n.title}</p>
                        <p className="text-xs text-gray-500 truncate">{n.desc}</p>
                      </div>
                      <span className="text-xs text-gray-400 shrink-0">{n.time}</span>
                    </div>
                  ))}
                </div>
                <div className="p-2 border-t border-gray-50">
                  <button className="w-full text-xs text-center text-brand-primary font-medium py-1.5 rounded-lg hover:bg-brand-primary/5 transition-colors">
                    View all notifications
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Avatar dropdown */}
          <button className="flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200">
            <Avatar name="Admin User" size="sm" />
            <span className="hidden sm:block text-sm font-medium text-gray-700">Admin</span>
            <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
          </button>
        </div>
      </div>
    </header>
  );
}

// ─── Orders Table ─────────────────────────────────────────────────────────────

function OrdersTable() {
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  const toggleRow = (id: string) =>
    setSelectedRows((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Table header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-gray-50">
        <div>
          <h2 className="font-bold text-gray-900">Recent Orders</h2>
          <p className="text-xs text-gray-500 mt-0.5">{orders.length} orders this period</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedRows.length > 0 && (
            <span className="text-xs text-brand-secondary font-medium">
              {selectedRows.length} selected
            </span>
          )}
          <Btn variant="secondary" size="sm">
            <Filter className="h-3.5 w-3.5" /> Filter
          </Btn>
          <Btn variant="secondary" size="sm">
            <Download className="h-3.5 w-3.5" /> Export
          </Btn>
          <Btn variant="cta" size="sm">
            <Plus className="h-3.5 w-3.5" /> New Order
          </Btn>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/70">
              <th className="h-10 w-10 text-center">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-brand-primary focus:ring-brand-primary/30 cursor-pointer"
                  onChange={(e) => setSelectedRows(e.target.checked ? orders.map((o) => o.id) : [])}
                  checked={selectedRows.length === orders.length}
                />
              </th>
              {["Order ID", "Customer", "Items", "Amount", "Status", "Date", ""].map((h) => (
                <th key={h} className="h-10 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {orders.map((order) => {
              const status = statusConfig[order.status];
              const isSelected = selectedRows.includes(order.id);
              return (
                <tr
                  key={order.id}
                  onClick={() => toggleRow(order.id)}
                  className={`cursor-pointer transition-colors ${isSelected ? "bg-brand-primary/3" : "hover:bg-gray-50/60"}`}
                >
                  <td className="text-center py-3.5 w-10">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-brand-primary focus:ring-brand-primary/30"
                      checked={isSelected}
                      onChange={() => toggleRow(order.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="font-mono text-xs font-semibold text-brand-primary bg-brand-primary/8 px-2 py-0.5 rounded-md">
                      {order.id}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 max-w-[180px]">
                    <span className="truncate block text-gray-800 font-medium text-xs">{order.customer}</span>
                  </td>
                  <td className="px-4 py-3.5 text-gray-500 text-xs">{order.items} items</td>
                  <td className="px-4 py-3.5 font-semibold text-gray-900 whitespace-nowrap">{order.amount}</td>
                  <td className="px-4 py-3.5">
                    <Badge variant={status.variant}>
                      {status.icon}
                      {status.label}
                    </Badge>
                  </td>
                  <td className="px-4 py-3.5 text-gray-400 text-xs whitespace-nowrap">{order.date}</td>
                  <td className="px-4 py-3.5">
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className="p-1 rounded-lg text-gray-400 hover:text-brand-primary hover:bg-brand-primary/8 transition-colors"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-50">
        <span className="text-xs text-gray-500">Showing 1–6 of 284 orders</span>
        <div className="flex gap-1.5">
          {["1", "2", "3", "…", "48"].map((p) => (
            <button
              key={p}
              className={`h-7 min-w-[28px] px-2 rounded-lg text-xs font-medium transition-colors ${p === "1" ? "bg-brand-primary text-white" : "text-gray-500 hover:bg-gray-100"}`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Activity Feed ────────────────────────────────────────────────────────────

function ActivityFeed() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
        <div>
          <h2 className="font-bold text-gray-900">Activity Feed</h2>
          <p className="text-xs text-gray-500 mt-0.5">Latest team actions</p>
        </div>
        <Btn variant="ghost" size="sm">View all <ArrowRight className="h-3.5 w-3.5" /></Btn>
      </div>
      <div className="divide-y divide-gray-50">
        {activities.map((act, i) => (
          <div key={i} className="flex items-start gap-3 px-5 py-3.5 hover:bg-gray-50/60 transition-colors">
            <div className="h-8 w-8 rounded-xl bg-gray-50 flex items-center justify-center shrink-0 mt-0.5">
              <act.icon className={`h-4 w-4 ${act.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{act.action}</p>
              <p className="text-xs text-gray-500 mt-0.5">by {act.user}</p>
            </div>
            <span className="text-xs text-gray-400 whitespace-nowrap mt-0.5">{act.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Quick Stats Panel ────────────────────────────────────────────────────────

function QuickStats() {
  return (
    <div className="bg-gradient-to-br from-brand-primary to-brand-secondary rounded-2xl p-5 text-white shadow-lg shadow-brand-primary/20">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-sm">Monthly Target</h3>
        <Badge variant="highlight"><Star className="h-3 w-3" />On track</Badge>
      </div>
      <p className="text-3xl font-black tracking-tight">78%</p>
      <p className="text-white/60 text-xs mt-1">₫ 18.7B of ₫ 24B goal</p>

      {/* Progress bar */}
      <div className="mt-4 h-2 bg-white/15 rounded-full overflow-hidden">
        <div className="h-full w-[78%] bg-brand-highlight rounded-full relative">
          <div className="absolute right-0 top-1/2 -translate-y-1/2 h-3.5 w-3.5 bg-white rounded-full border-2 border-brand-highlight shadow-sm" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-5">
        {[
          { label: "New Leads",    value: "142",  icon: Users   },
          { label: "Closed Deals", value: "89",   icon: CheckCircle2 },
          { label: "Avg Order",    value: "₫12M", icon: BarChart2 },
          { label: "Repeat Rate",  value: "64%",  icon: TrendingUp },
        ].map((s) => (
          <div key={s.label} className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
            <div className="flex items-center gap-1.5 mb-1">
              <s.icon className="h-3.5 w-3.5 text-white/60" />
              <span className="text-xs text-white/60">{s.label}</span>
            </div>
            <p className="font-bold text-white">{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Design System Tokens Showcase ───────────────────────────────────────────

function DesignTokens() {
  const [loading, setLoading] = useState(false);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-5">
      <div>
        <h2 className="font-bold text-gray-900">Design System</h2>
        <p className="text-xs text-gray-500 mt-0.5">Color palette · Buttons · Badges · States</p>
      </div>

      {/* Color swatches */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5">Palette</p>
        <div className="flex flex-wrap gap-2">
          {[
            { color: "bg-brand-primary",   label: "#593E67", name: "Primary"   },
            { color: "bg-brand-secondary", label: "#84495F", name: "Secondary" },
            { color: "bg-brand-accent",    label: "#B85B56", name: "Accent"    },
            { color: "bg-brand-cta",       label: "#DE741C", name: "CTA"       },
            { color: "bg-brand-highlight", label: "#FEA837", name: "Highlight" },
          ].map((s) => (
            <div key={s.name} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
              <div className={`h-5 w-5 rounded-lg ${s.color} shadow-sm`} />
              <div>
                <p className="text-xs font-semibold text-gray-700">{s.name}</p>
                <p className="text-xs text-gray-400 font-mono">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Buttons */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5">Buttons</p>
        <div className="flex flex-wrap gap-2">
          <Btn variant="cta">Primary CTA</Btn>
          <Btn variant="primary">Brand Primary</Btn>
          <Btn variant="secondary">Secondary</Btn>
          <Btn variant="ghost">Ghost</Btn>
          <Btn variant="danger">Danger</Btn>
          <Btn variant="cta" disabled>Disabled</Btn>
          <Btn variant="cta" loading={loading} onClick={() => { setLoading(true); setTimeout(() => setLoading(false), 2000); }}>
            {loading ? "Loading..." : "Click to Load"}
          </Btn>
        </div>
      </div>

      {/* Size variants */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5">Button Sizes</p>
        <div className="flex flex-wrap items-center gap-2">
          <Btn variant="cta" size="sm">Small</Btn>
          <Btn variant="cta" size="md">Medium</Btn>
          <Btn variant="cta" size="lg">Large</Btn>
        </div>
      </div>

      {/* Badges */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5">Badges</p>
        <div className="flex flex-wrap gap-2">
          <Badge variant="highlight"><Star className="h-3 w-3" />Highlight</Badge>
          <Badge variant="accent"><AlertCircle className="h-3 w-3" />Accent</Badge>
          <Badge variant="cta"><Zap className="h-3 w-3" />CTA</Badge>
          <Badge variant="secondary"><CheckCircle2 className="h-3 w-3" />Secondary</Badge>
          <Badge variant="neutral">Neutral</Badge>
        </div>
      </div>

      {/* Form inputs */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5">Form Controls</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-600">Default Input</label>
            <input
              className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary/50 transition-all placeholder-gray-400"
              placeholder="Type something..."
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-brand-accent flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> Error State
            </label>
            <input
              className="w-full px-3 py-2 text-sm bg-brand-accent/3 border border-brand-accent/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-accent/20 transition-all text-brand-accent placeholder-brand-accent/40"
              placeholder="Invalid input..."
              defaultValue="wrong@"
            />
            <p className="text-xs text-brand-accent">Please enter a valid email</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Feature Cards ────────────────────────────────────────────────────────────

function FeatureCards() {
  const features = [
    {
      icon: Shield, title: "RBAC Security",
      desc: "50+ permission codes, JWT rotation, role-based access control",
      iconBg: "bg-brand-primary/10", iconText: "text-brand-primary", linkText: "text-brand-primary",
    },
    {
      icon: Zap, title: "Real-time Events",
      desc: "Event-driven architecture via NestJS EventEmitter between modules",
      iconBg: "bg-brand-cta/10", iconText: "text-brand-cta", linkText: "text-brand-cta",
    },
    {
      icon: Globe, title: "Customer Portal",
      desc: "Self-service B2B portal with catalog browsing and order tracking",
      iconBg: "bg-brand-secondary/10", iconText: "text-brand-secondary", linkText: "text-brand-secondary",
    },
    {
      icon: BarChart3, title: "Finance Reports",
      desc: "AR/AP aging, revenue trends, cash flow — all in one dashboard",
      iconBg: "bg-brand-accent/10", iconText: "text-brand-accent", linkText: "text-brand-accent",
    },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {features.map((f) => (
        <div
          key={f.title}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group cursor-pointer"
        >
          <div className={`h-10 w-10 rounded-xl ${f.iconBg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200`}>
            <f.icon className={`h-5 w-5 ${f.iconText}`} />
          </div>
          <h3 className="font-bold text-gray-900 text-sm mb-1">{f.title}</h3>
          <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
          <div className={`mt-4 flex items-center gap-1 text-xs font-semibold ${f.linkText}`}>
            Learn more <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Page Shell ───────────────────────────────────────────────────────────────

export default function ShowcasePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-full bg-[#F8F7FA]">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar onMenuClick={() => setSidebarOpen(true)} />

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 space-y-6">

            {/* Page header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-black text-brand-primary tracking-tight">Sales Orders</h1>
                <p className="text-sm text-gray-500 mt-0.5">Manage your B2B sales pipeline · May 2026</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="highlight"><CheckCircle2 className="h-3 w-3" />System online</Badge>
                <Btn variant="primary" size="sm"><Globe className="h-3.5 w-3.5" />Portal</Btn>
                <Btn variant="cta"><Plus className="h-4 w-4" />New Order</Btn>
              </div>
            </div>

            {/* KPI cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {kpis.map((kpi, i) => <KpiCard key={kpi.label} kpi={kpi} idx={i} />)}
            </div>

            {/* Feature cards */}
            <FeatureCards />

            {/* Main grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Orders table — spans 2 cols */}
              <div className="xl:col-span-2 space-y-6">
                <OrdersTable />
                <DesignTokens />
              </div>

              {/* Right column */}
              <div className="space-y-4">
                <QuickStats />
                <ActivityFeed />
              </div>
            </div>

            {/* Footer spacer */}
            <div className="h-4" />
          </div>
        </main>
      </div>
    </div>
  );
}
