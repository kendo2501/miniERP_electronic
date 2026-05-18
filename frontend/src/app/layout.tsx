import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import Script from "next/script";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "miniERP",
  description: "B2B Electronic ERP System",
};

const _gs = `(function(){
  function _d(s){try{var b=atob(s),u=new Uint8Array(b.length);for(var i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return new TextDecoder().decode(u)}catch(e){return''}}
  var _a='8J+agCBtaW5pRVJQIEVsZWN0cm9uaWM=',
      _b='V2ViIG7DoHkgxJHGsOG7o2MgcGjDoXQgdHJp4buDbiBi4bufaSBt4buZdCBuaMOzbSBn4buTbSAzIHRow6BuaCB2acOqbjoKCiAg4oCiIE5ndXnhu4VuIFRoYW5oIEhp4buHdQogIOKAoiBUcuG6p24gUGjDuiBUaGnhu4duCiAg4oCiIEzDom0gQuG7mWkgU2FuaAo=',
      _c='VHJhbmcgc+G6vSB04buxIMSR4buZbmcgcmVsb2FkIHNhdQ==';
  var _ov=null,_ci=null,_cnt=60,_open=false,_mW=0,_mH=0,_sa=null;
  function _mk(){
    var w=document.createElement('div');
    w.id='__gg';
    w.style.cssText='position:fixed;inset:0;z-index:2147483647;background:rgba(30,15,40,.96);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)';
    var t=_d(_a),em=t.split(' ')[0],nm=t.split(' ').slice(1).join(' ');
    w.innerHTML='<div style="background:linear-gradient(145deg,#432D51,#593E67,#84495F);border-radius:24px;padding:44px 52px;text-align:center;max-width:460px;width:92%;box-shadow:0 8px 60px rgba(254,168,55,.2),0 0 0 1px rgba(254,168,55,.25)"><div style="font-size:52px;line-height:1;margin-bottom:6px">'+em+'</div><div style="color:#FEA837;font-size:20px;font-weight:800;margin-bottom:24px;letter-spacing:.5px">'+nm+'</div><div style="color:rgba(255,255,255,.8);font-size:14px;line-height:2.4;white-space:pre-line;margin-bottom:32px">'+_d(_b)+'</div><div style="background:rgba(0,0,0,.28);border-radius:14px;padding:14px 24px"><div style="color:rgba(255,255,255,.45);font-size:11px;margin-bottom:6px;letter-spacing:.5px">'+_d(_c)+'</div><div id="__gc" style="color:#FEA837;font-size:32px;font-weight:800;line-height:1">60s</div><div style="margin-top:10px;height:4px;background:rgba(255,255,255,.1);border-radius:2px;overflow:hidden"><div id="__gb" style="height:100%;background:#FEA837;width:100%;transition:width 1s linear;border-radius:2px"></div></div></div></div>';
    return w;
  }
  function _show(){
    if(!_ov){_ov=_mk();document.body.appendChild(_ov);}
    _ov.style.display='flex';_cnt=60;
    if(_ci)clearInterval(_ci);
    _ci=setInterval(function(){
      _cnt--;
      if(_cnt<=0){window.location.reload();return;}
      var c=document.getElementById('__gc'),b=document.getElementById('__gb');
      if(c)c.textContent=_cnt+'s';
      if(b)b.style.width=(_cnt/60*100)+'%';
    },1000);
  }
  function _hide(){
    if(_ov)_ov.style.display='none';
    if(_ci){clearInterval(_ci);_ci=null;}
  }
  function _dt(){
    var iw=window.innerWidth,ih=window.innerHeight;
    var ow=window.outerWidth||iw,oh=window.outerHeight||ih;
    var byOuter=(ow-iw)>100||(oh-ih)>220;
    var byMax=(_mW-iw)>80||(_mH-ih)>80;
    return byOuter||byMax;
  }
  function _tick(){
    var iw=window.innerWidth,ih=window.innerHeight;
    if(iw>_mW)_mW=iw;
    if(ih>_mH)_mH=ih;
    var sh=_dt();
    if(sh){
      if(_sa===null)_sa=Date.now();
      if(!_open&&Date.now()-_sa>200){_open=true;_show();}
    }else{
      _sa=null;
      if(_open){_open=false;_hide();}
    }
  }
  console.log('[erp] guard active');
  if(window.location.search.indexOf('x=1')!==-1){setTimeout(function(){_show();setTimeout(_hide,3000);},500);}
  setTimeout(function(){
    _mW=window.innerWidth;_mH=window.innerHeight;
    console.log('[erp] dims ow='+window.outerWidth+' iw='+_mW+' oh='+window.outerHeight+' ih='+_mH);
    if(_dt()){console.log('[erp] devtools detected at startup');_open=true;_show();}
    window.addEventListener('resize',_tick);
    if(window.visualViewport)window.visualViewport.addEventListener('resize',_tick);
    setInterval(_tick,300);
  },800);
})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="h-full bg-background text-foreground" suppressHydrationWarning>
        <Providers>{children}</Providers>
        <Script id="__g" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: _gs }} />
      </body>
    </html>
  );
}
