"use client";
import { useState } from "react";
import { Menu } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { AuthGuard } from "@/components/layout/auth-guard";
import { NotificationBell } from "@/components/layout/notification-bell";
import { PageTransition } from "@/components/layout/page-transition";
import { Button } from "@/components/ui/button";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden">
        {/* Mobile backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-20 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar — drawer on mobile, static on desktop */}
        <div
          className={[
            "fixed inset-y-0 left-0 z-30 transition-transform duration-300 ease-in-out",
            "lg:relative lg:translate-x-0 lg:z-auto",
            sidebarOpen ? "translate-x-0" : "-translate-x-full",
          ].join(" ")}
        >
          <Sidebar onClose={() => setSidebarOpen(false)} />
        </div>

        {/* Main content */}
        <div className="flex flex-1 flex-col overflow-hidden min-w-0">
          {/* Topbar */}
          <header className="flex h-14 shrink-0 items-center bg-white border-b border-border px-4 lg:px-6 gap-3 shadow-sm relative">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#593E67] via-[#B85B56] to-[#FEA837]" />

            {/* Hamburger — mobile only */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-9 w-9 shrink-0"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>

            {/* Spacer */}
            <div className="flex-1" />

            <NotificationBell />
          </header>

          <main className="flex-1 overflow-y-auto bg-background p-4 lg:p-8">
            <PageTransition>{children}</PageTransition>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
