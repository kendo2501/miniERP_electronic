function _enc64(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let b = "";
  for (let i = 0; i < bytes.length; i++) b += String.fromCharCode(bytes[i]);
  return btoa(b);
}

function _dec64(s: string): string {
  const b = atob(s);
  const bytes = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) bytes[i] = b.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

let _a: string | null = null;
const _k = "_sid";

export const tokenMgr = {
  getAccess: () => _a,
  setAccess: (t: string | null) => { _a = t; },
  getRefresh: (): string | null => {
    if (typeof window === "undefined") return null;
    const r = localStorage.getItem(_k);
    try { return r ? _dec64(r) : null; } catch { return null; }
  },
  setRefresh: (t: string) => {
    if (typeof window !== "undefined") localStorage.setItem(_k, _enc64(t));
  },
  clear: () => {
    _a = null;
    if (typeof window !== "undefined") localStorage.removeItem(_k);
  },
};
