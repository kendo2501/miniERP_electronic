"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Toaster } from "sonner";
import { LanguageProvider } from "@/context/language-context";

const _d = (s: string) => {
  try {
    const b = atob(s);
    const u = new Uint8Array(b.length);
    for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
    return new TextDecoder().decode(u);
  } catch { return ""; }
};
const _m = [
  "8J+agCBtaW5pRVJQIEVsZWN0cm9uaWM=",
  "V2ViIG7DoHkgxJHGsOG7o2MgcGjDoXQgdHJp4buDbiBi4bufaSBt4buZdCBuaMOzbSBn4buTbSAzIHRow6BuaCB2acOqbjoKCiAg4oCiIE5ndXnhu4VuIFRoYW5oIEhp4buHdQogIOKAoiBUcuG6p24gUGjDuiBUaGnhu4duCiAg4oCiIEzDom0gQuG7mWkgU2FuaAo=",
  "Y29sb3I6I0ZFQTgzNztmb250LXNpemU6MjJweDtmb250LXdlaWdodDpib2xkOw==",
  "Y29sb3I6IzQzMkQ1MTtmb250LXNpemU6MTRweDtsaW5lLWhlaWdodDoyOw==",
];

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, staleTime: 30_000 },
        },
      })
  );

  useEffect(() => {
    ["accessToken", "refreshToken", "auth-storage"].forEach((k) => localStorage.removeItem(k));
  }, []);

  useEffect(() => {
    let _w = false;
    let _ct: ReturnType<typeof setTimeout> | null = null;
    const _f = () => {
      console.log("%c" + _d(_m[0]), _d(_m[2]));
      console.log("%c" + _d(_m[1]), _d(_m[3]));
      _ct = setTimeout(() => window.location.reload(), 60_000);
    };
    const _c = () => { if (_ct !== null) { clearTimeout(_ct); _ct = null; } };
    const _tick = () => {
      const _o = window.outerWidth - window.innerWidth > 100 || window.outerHeight - window.innerHeight > 200;
      if (_o && !_w) { _w = true; _f(); } else if (!_o && _w) { _w = false; _c(); }
    };
    window.addEventListener("resize", _tick);
    const _id = setInterval(_tick, 1000);
    return () => {
      window.removeEventListener("resize", _tick);
      clearInterval(_id);
      if (_ct !== null) clearTimeout(_ct);
    };
  }, []);

  return (
    <LanguageProvider>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster richColors position="top-right" />
      </QueryClientProvider>
    </LanguageProvider>
  );
}
