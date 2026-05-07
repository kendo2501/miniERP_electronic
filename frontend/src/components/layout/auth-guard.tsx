"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { authApi } from "@/lib/api/auth";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, setUser } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    // Refresh user profile on mount
    authApi.me().then(setUser).catch(() => {
      router.replace("/login");
    });
  }, [isAuthenticated, router, setUser]);

  if (!isAuthenticated) return null;
  return <>{children}</>;
}
