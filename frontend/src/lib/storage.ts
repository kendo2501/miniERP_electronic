let _a: string | null = null;
const _k = "_sid";

export const tokenMgr = {
  getAccess: () => _a,
  setAccess: (t: string | null) => { _a = t; },
  getRefresh: (): string | null => {
    if (typeof window === "undefined") return null;
    const r = localStorage.getItem(_k);
    try { return r ? atob(r) : null; } catch { return null; }
  },
  setRefresh: (t: string) => {
    if (typeof window !== "undefined") localStorage.setItem(_k, btoa(t));
  },
  clear: () => {
    _a = null;
    if (typeof window !== "undefined") localStorage.removeItem(_k);
  },
};
