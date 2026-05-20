"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";

const INACTIVE_MS = 15 * 60 * 1000;
const KEY = "_hidAt";

export function useInactivityLogout() {
  const { isAuthenticated, logout } = useAuthStore();
  const router = useRouter();
  // Stable refs so the listener doesn't capture stale closures
  const logoutRef = useRef(logout);
  const routerRef = useRef(router);

  useEffect(() => { logoutRef.current = logout; });
  useEffect(() => { routerRef.current = router; });

  useEffect(() => {
    if (!isAuthenticated) return;

    const onVisibility = () => {
      if (document.hidden) {
        sessionStorage.setItem(KEY, Date.now().toString());
      } else {
        const hiddenAt = sessionStorage.getItem(KEY);
        sessionStorage.removeItem(KEY);
        if (hiddenAt && Date.now() - Number(hiddenAt) > INACTIVE_MS) {
          logoutRef.current();
          routerRef.current.replace("/login");
        }
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [isAuthenticated]);
}
