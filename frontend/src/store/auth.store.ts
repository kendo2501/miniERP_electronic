import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { AuthUser } from "@/types/auth";
import { tokenMgr } from "@/lib/storage";

const _ek = "_ms";
const _enc = createJSONStorage(() => ({
  getItem: (k: string) => {
    if (typeof window === "undefined") return null;
    const r = localStorage.getItem(k);
    try { return r ? atob(r) : null; } catch { return null; }
  },
  setItem: (k: string, v: string) => {
    if (typeof window !== "undefined") localStorage.setItem(k, btoa(v));
  },
  removeItem: (k: string) => {
    if (typeof window !== "undefined") localStorage.removeItem(k);
  },
}));

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: AuthUser) => void;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,

      setTokens: (accessToken, refreshToken) => {
        tokenMgr.setAccess(accessToken);
        tokenMgr.setRefresh(refreshToken);
        set({ isAuthenticated: true });
      },

      setUser: (user) => set({ user }),

      logout: () => {
        tokenMgr.clear();
        set({ user: null, isAuthenticated: false });
      },

      hasPermission: (permission) => {
        const { user } = get();
        return user?.permissions?.includes(permission) ?? false;
      },

      hasRole: (role) => {
        const { user } = get();
        return user?.roles?.some((r) => r.toLowerCase() === role.toLowerCase()) ?? false;
      },
    }),
    {
      name: _ek,
      storage: _enc,
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
      }),
    }
  )
);
