"use client";
import { useEffect, useState } from "react";

function _d(s: string): string {
  try {
    const b = atob(s);
    const u = new Uint8Array(b.length);
    for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
    return new TextDecoder().decode(u);
  } catch { return ""; }
}

const _a = "8J+agCBtaW5pRVJQIEVsZWN0cm9uaWM=";
const _b = "V2ViIG7DoHkgxJHGsOG7o2MgcGjDoXQgdHJp4buDbiBi4bufaSBt4buZdCBuaMOzbSBn4buTbSAzIHRow6BuaCB2acOqbjoKCiAg4oCiIE5ndXnhu4VuIFRoYW5oIEhp4buHdQogIOKAoiBUcuG6p24gUGjDuiBUaGnhu4duCiAg4oCiIEzDom0gQuG7mWkgU2FuaAo=";
const _c = "VHJhbmcgc+G6vSB04buxIMSR4buZbmcgcmVsb2FkIHNhdQ==";
const _lk = "_dmx";

export function Eg() {
  const [vis, setVis] = useState(false);
  const [cnt, setCnt] = useState(60);

  useEffect(() => {
    let mW = 0, mH = 0;
    try {
      const s = JSON.parse(localStorage.getItem(_lk) || "{}");
      mW = s.w || 0; mH = s.h || 0;
    } catch { /**/ }

    function sv() {
      try { localStorage.setItem(_lk, JSON.stringify({ w: mW, h: mH })); } catch { /**/ }
    }

    function dt(iw: number, ih: number): boolean {
      const ow = window.outerWidth || iw;
      const oh = window.outerHeight || ih;
      return (ow - iw) > 50 || (oh - ih) > 120 || (mW - iw) > 40 || (mH - ih) > 40;
    }

    let open = false;

    function show() { if (!open) { open = true; setVis(true); } }
    function hide() { if (open) { open = false; setVis(false); } }

    function tick() {
      const iw = window.innerWidth, ih = window.innerHeight;
      let ch = false;
      if (iw > mW) { mW = iw; ch = true; }
      if (ih > mH) { mH = ih; ch = true; }
      if (ch) sv();
      if (dt(iw, ih)) show(); else hide();
    }

    if (window.location.search.includes("x=1")) { setVis(true); return; }

    // Immediate check on mount
    { const iw = window.innerWidth, ih = window.innerHeight; if (dt(iw, ih)) show(); }

    const t0 = setTimeout(() => {
      const iw = window.innerWidth, ih = window.innerHeight;
      if (iw > mW) mW = iw;
      if (ih > mH) mH = ih;
      sv();
      if (dt(iw, ih)) show();
      window.addEventListener("resize", tick);
      if (window.visualViewport) window.visualViewport.addEventListener("resize", tick);
    }, 500);

    const iv = setInterval(tick, 100);

    // Secondary: console.debug getter — fires only when DevTools console is active
    const _ge = document.createElement("img");
    let _gd = false;
    Object.defineProperty(_ge, "id", { get() { _gd = true; return ""; }, configurable: true });
    const giv = setInterval(() => {
      _gd = false;
      console.debug(_ge);
      setTimeout(() => { if (_gd) show(); else if (!dt(window.innerWidth, window.innerHeight)) hide(); }, 150);
    }, 600);

    return () => {
      clearTimeout(t0);
      clearInterval(iv);
      clearInterval(giv);
      window.removeEventListener("resize", tick);
      if (window.visualViewport) window.visualViewport.removeEventListener("resize", tick);
    };
  }, []);

  useEffect(() => {
    if (!vis) { setCnt(60); return; }
    setCnt(60);
    const iv = setInterval(() => setCnt(c => { if (c <= 1) { window.location.reload(); return 0; } return c - 1; }), 1000);
    return () => clearInterval(iv);
  }, [vis]);

  if (!vis) return null;

  const t = _d(_a), em = t.split(" ")[0], nm = t.split(" ").slice(1).join(" ");

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 2147483647, background: "rgba(30,15,40,.96)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(12px)" }}>
      <div style={{ background: "linear-gradient(145deg,#432D51,#593E67,#84495F)", borderRadius: 24, padding: "44px 52px", textAlign: "center", maxWidth: 460, width: "92%", boxShadow: "0 8px 60px rgba(254,168,55,.2),0 0 0 1px rgba(254,168,55,.25)" }}>
        <div style={{ fontSize: 52, lineHeight: 1, marginBottom: 6 }}>{em}</div>
        <div style={{ color: "#FEA837", fontSize: 20, fontWeight: 800, marginBottom: 24, letterSpacing: 0.5 }}>{nm}</div>
        <div style={{ color: "rgba(255,255,255,.8)", fontSize: 14, lineHeight: 2.4, whiteSpace: "pre-line", marginBottom: 32 }}>{_d(_b)}</div>
        <div style={{ background: "rgba(0,0,0,.28)", borderRadius: 14, padding: "14px 24px" }}>
          <div style={{ color: "rgba(255,255,255,.45)", fontSize: 11, marginBottom: 6, letterSpacing: 0.5 }}>{_d(_c)}</div>
          <div style={{ color: "#FEA837", fontSize: 32, fontWeight: 800, lineHeight: 1 }}>{cnt}s</div>
          <div style={{ marginTop: 10, height: 4, background: "rgba(255,255,255,.1)", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", background: "#FEA837", width: `${(cnt / 60) * 100}%`, transition: "width 1s linear", borderRadius: 2 }} />
          </div>
        </div>
      </div>
    </div>
  );
}
