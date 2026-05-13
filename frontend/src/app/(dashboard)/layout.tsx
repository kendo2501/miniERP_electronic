import { Sidebar } from "@/components/layout/sidebar";
import { AuthGuard } from "@/components/layout/auth-guard";
import { NotificationBell } from "@/components/layout/notification-bell";
import { PageTransition } from "@/components/layout/page-transition";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Topbar */}
          <header className="flex h-14 shrink-0 items-center justify-end bg-white border-b border-border px-6 gap-2 shadow-sm">
            <div className="absolute top-0 left-60 right-0 h-0.5 bg-gradient-to-r from-[#593E67] via-[#B85B56] to-[#FEA837]" />
            <NotificationBell />
          </header>
          <main className="flex-1 overflow-y-auto bg-background p-8">
            <PageTransition>{children}</PageTransition>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
