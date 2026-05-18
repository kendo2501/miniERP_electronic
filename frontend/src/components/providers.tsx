"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
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
  "VHJhbmcgc+G6vSB04buxIMSR4buZbmcgcmVsb2FkIHNhdQ==",
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

  const [_vis, _setVis] = useState(false);
  const [_cnt, _setCnt] = useState(60);
  const _ci = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    ["accessToken", "refreshToken", "auth-storage"].forEach((k) => localStorage.removeItem(k));
  }, []);

  useEffect(() => {
    let _w = false;
    let _bw = 0;
    let _bh = 0;
    let _rid: ReturnType<typeof setInterval> | null = null;

    const _open = () => {
      _setVis(true);
      _setCnt(60);
      if (_ci.current) clearInterval(_ci.current);
      _ci.current = setInterval(() => {
        _setCnt((p) => {
          if (p <= 1) { window.location.reload(); return 0; }
          return p - 1;
        });
      }, 1000);
    };

    const _close = () => {
      _setVis(false);
      if (_ci.current) { clearInterval(_ci.current); _ci.current = null; }
    };

    const _tick = () => {
      const _dw = window.outerWidth - window.innerWidth;
      const _dh = window.outerHeight - window.innerHeight;
      console.log("[diag] ow-iw=" + _dw + " oh-ih=" + _dh + " bw=" + _bw + " bh=" + _bh + " dw=" + (_dw - _bw) + " dh=" + (_dh - _bh));
      const _o = (_dw - _bw) > 50 || (_dh - _bh) > 50;
      if (_o && !_w) { _w = true; _open(); }
      else if (!_o && _w) { _w = false; _close(); }
    };

    // Snapshot baseline after page fully settles (no DevTools open yet)
    const _init = setTimeout(() => {
      _bw = window.outerWidth - window.innerWidth;
      _bh = window.outerHeight - window.innerHeight;
      console.log("[baseline] bw=" + _bw + " bh=" + _bh);
      window.addEventListener("resize", _tick);
      _rid = setInterval(_tick, 800);
    }, 1200);

    return () => {
      clearTimeout(_init);
      window.removeEventListener("resize", _tick);
      if (_rid) clearInterval(_rid);
      if (_ci.current) clearInterval(_ci.current);
    };
  }, []);

  return (
    <LanguageProvider>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster richColors position="top-right" />
        {_vis && (
          <div style={{
            position: "fixed", inset: 0, zIndex: 99999,
            background: "rgba(30,15,40,0.96)",
            display: "flex", alignItems: "center", justifyContent: "center",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}>
            <div style={{
              background: "linear-gradient(145deg,#432D51 0%,#593E67 55%,#84495F 100%)",
              borderRadius: 24, padding: "44px 52px",
              textAlign: "center", maxWidth: 460, width: "92%",
              boxShadow: "0 8px 60px rgba(254,168,55,0.20), 0 0 0 1px rgba(254,168,55,0.25)",
            }}>
              <div style={{ fontSize: 52, marginBottom: 6, lineHeight: 1 }}>
                {_d(_m[0]).split(" ")[0]}
              </div>
              <div style={{
                color: "#FEA837", fontSize: 20, fontWeight: 800,
                marginBottom: 24, letterSpacing: 0.5,
              }}>
                {_d(_m[0]).split(" ").slice(1).join(" ")}
              </div>
              <div style={{
                color: "rgba(255,255,255,0.80)", fontSize: 14,
                lineHeight: 2.4, whiteSpace: "pre-line",
                marginBottom: 32,
              }}>
                {_d(_m[1])}
              </div>
              <div style={{
                background: "rgba(0,0,0,0.28)", borderRadius: 14,
                padding: "14px 24px",
              }}>
                <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, marginBottom: 6, letterSpacing: 0.5 }}>
                  {_d(_m[2])}
                </div>
                <div style={{ color: "#FEA837", fontSize: 32, fontWeight: 800, lineHeight: 1 }}>
                  {_cnt}s
                </div>
                <div style={{
                  marginTop: 10, height: 4,
                  background: "rgba(255,255,255,0.10)", borderRadius: 2, overflow: "hidden",
                }}>
                  <div style={{
                    height: "100%", background: "#FEA837",
                    width: `${(_cnt / 60) * 100}%`,
                    transition: "width 1s linear", borderRadius: 2,
                  }} />
                </div>
              </div>
            </div>
          </div>
        )}
      </QueryClientProvider>
    </LanguageProvider>
  );
}
