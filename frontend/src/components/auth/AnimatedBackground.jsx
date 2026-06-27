import { useEffect, useRef } from 'react'

/* ─────────────────────────────────────────────────────────────────────────────
   TOP NOTCH animated backgrounds — crash-proof pure CSS + SVG:
   1. USER  · LIGHT  — "Golden Hour Voyage"   warm bokeh + sun lens + waves
   2. USER  · DARK   — "Northern Lights"      starfield + SVG-turbulence aurora
   3. ADMIN · LIGHT  — "Crystal Data Grid"    mesh gradient + hex grid + nodes
   4. ADMIN · DARK   — "Neural Command"       cyberpunk + circuit + data streams
───────────────────────────────────────────────────────────────────────────── */

const CSS_KEYFRAMES = `
@keyframes tn-float    {0%,100%{transform:translate(0,0) scale(1)}   33%{transform:translate(20px,-30px) scale(1.05)} 66%{transform:translate(-15px,15px) scale(0.96)}}
@keyframes tn-float2   {0%,100%{transform:translate(0,0)}            50%{transform:translate(-25px,-20px)}}
@keyframes tn-float3   {0%,100%{transform:translate(0,0) scale(1)}   40%{transform:translate(30px,20px) scale(1.08)} 80%{transform:translate(-10px,-25px) scale(0.94)}}
@keyframes tn-pulse    {0%,100%{opacity:.4;transform:scale(1)}        50%{opacity:.85;transform:scale(1.08)}}
@keyframes tn-pulse2   {0%,100%{opacity:.2;transform:scale(1)}        50%{opacity:.6;transform:scale(1.1)}}
@keyframes tn-twinkle  {0%,100%{opacity:.1;transform:scale(0.8)}      50%{opacity:1;transform:scale(1.2)}}
@keyframes tn-twinkle2 {0%,100%{opacity:.3}                            50%{opacity:.9}}
@keyframes tn-aurora   {0%,100%{transform:skewX(-4deg) scaleX(1) translateY(0);opacity:.65} 30%{transform:skewX(3deg) scaleX(1.06) translateY(-8px);opacity:1} 60%{transform:skewX(-2deg) scaleX(0.97) translateY(5px);opacity:.75}}
@keyframes tn-aurora2  {0%,100%{transform:skewX(3deg) scaleX(1) translateY(0);opacity:.5}  40%{transform:skewX(-4deg) scaleX(1.08) translateY(6px);opacity:.9}  70%{transform:skewX(2deg) scaleX(0.95) translateY(-4px);opacity:.6}}
@keyframes tn-aurora3  {0%,100%{transform:skewX(-2deg) scaleX(1.02) translateY(0);opacity:.4} 50%{transform:skewX(4deg) scaleX(0.97) translateY(-10px);opacity:.85}}
@keyframes tn-shoot    {0%{transform:translate(0,0);opacity:0} 5%{opacity:1} 50%{opacity:.7} 100%{transform:translate(260px,130px);opacity:0}}
@keyframes tn-shoot2   {0%{transform:translate(0,0);opacity:0} 5%{opacity:.8} 100%{transform:translate(200px,100px);opacity:0}}
@keyframes tn-drift    {0%{transform:translateX(0)} 100%{transform:translateX(-50%)}}
@keyframes tn-scan     {0%{top:-8%} 100%{top:108%}}
@keyframes tn-radar    {0%{transform:translate(-50%,-50%) scale(0);opacity:.5} 100%{transform:translate(-50%,-50%) scale(3);opacity:0}}
@keyframes tn-node     {0%,100%{box-shadow:0 0 4px 1px currentColor,0 0 0 0 transparent;opacity:.6} 50%{box-shadow:0 0 8px 2px currentColor,0 0 22px 8px currentColor;opacity:1}}
@keyframes tn-fall     {0%{transform:translateY(-100px);opacity:0} 10%{opacity:1} 90%{opacity:.6} 100%{transform:translateY(110vh);opacity:0}}
@keyframes tn-shimmer  {0%{background-position:200% center} 100%{background-position:-200% center}}
@keyframes tn-sun      {0%,100%{transform:scale(1);filter:blur(40px)} 50%{transform:scale(1.06);filter:blur(45px)}}
@keyframes tn-hexwave  {0%,100%{opacity:.055} 50%{opacity:.12}}
@keyframes tn-mesh1    {0%,100%{transform:translate(0,0) scale(1)}   35%{transform:translate(60px,-40px) scale(1.1)} 70%{transform:translate(-30px,50px) scale(0.9)}}
@keyframes tn-mesh2    {0%,100%{transform:translate(0,0) scale(1)}   40%{transform:translate(-50px,30px) scale(1.08)} 75%{transform:translate(40px,-50px) scale(0.93)}}
@keyframes tn-mesh3    {0%,100%{transform:translate(0,0) scale(1)}   30%{transform:translate(45px,55px) scale(1.05)} 65%{transform:translate(-60px,-30px) scale(0.95)}}
@keyframes tn-circuit  {0%,100%{stroke-dashoffset:0} 50%{stroke-dashoffset:-80}}
@keyframes tn-glow-pulse {0%,100%{filter:blur(80px) brightness(1)} 50%{filter:blur(90px) brightness(1.2)}}
@keyframes tn-flicker  {0%,95%,100%{opacity:.7} 96%{opacity:.3} 98%{opacity:.5}}
@keyframes tn-hue-rot  {0%{filter:hue-rotate(0deg)} 100%{filter:hue-rotate(40deg)}}
`

function injectCSS() {
  if (document.getElementById('tn-styles')) return
  const el = document.createElement('style')
  el.id = 'tn-styles'
  el.textContent = CSS_KEYFRAMES
  document.head.appendChild(el)
}

// deterministic "random" from index
const dv  = (i, scale=1, offset=0) => ((i * 7.3 + offset) % scale)
const dv2 = (i, scale=1, offset=0) => ((i * 13.7 + offset) % scale)

// ─────────────────────────────────────────────────────────────────────────────
// 1. USER LIGHT — "Golden Hour Voyage"
//    Sun lens + 3-depth bokeh field + sparkle constellation + bottom wave
// ─────────────────────────────────────────────────────────────────────────────
function UserLight() {
  // 3 depth layers of bokeh
  const bokeh = [
    // FAR layer — large, very blurred, slow
    {w:500,h:500,t:'2%',  l:'60%', dur:'32s',del:'0s',   blur:90,  col:'rgba(255,200,80,0.13)',  anim:'tn-float3'},
    {w:420,h:420,t:'50%', l:'75%', dur:'28s',del:'-10s', blur:80,  col:'rgba(100,200,255,0.12)', anim:'tn-float2'},
    {w:460,h:460,t:'30%', l:'-5%', dur:'35s',del:'-5s',  blur:85,  col:'rgba(80,220,160,0.10)',  anim:'tn-float'},
    // MID layer
    {w:280,h:280,t:'10%', l:'20%', dur:'22s',del:'-3s',  blur:55,  col:'rgba(255,180,60,0.16)',  anim:'tn-float2'},
    {w:320,h:320,t:'60%', l:'40%', dur:'26s',del:'-8s',  blur:60,  col:'rgba(80,180,255,0.14)',  anim:'tn-float3'},
    {w:260,h:260,t:'40%', l:'80%', dur:'20s',del:'-14s', blur:50,  col:'rgba(180,100,255,0.09)', anim:'tn-float'},
    {w:200,h:200,t:'75%', l:'10%', dur:'24s',del:'-6s',  blur:50,  col:'rgba(60,220,140,0.12)',  anim:'tn-float2'},
    // NEAR layer — smaller, sharper, faster
    {w:120,h:120,t:'25%', l:'50%', dur:'15s',del:'-2s',  blur:25,  col:'rgba(255,200,80,0.22)',  anim:'tn-float3'},
    {w:100,h:100,t:'65%', l:'65%', dur:'18s',del:'-7s',  blur:22,  col:'rgba(100,200,255,0.20)', anim:'tn-float'},
    {w:80, h:80, t:'15%', l:'85%', dur:'14s',del:'-4s',  blur:20,  col:'rgba(80,220,160,0.25)',  anim:'tn-float2'},
    {w:90, h:90, t:'80%', l:'30%', dur:'16s',del:'-9s',  blur:18,  col:'rgba(255,160,60,0.22)',  anim:'tn-float3'},
  ]
  // sparkle dots — 45 of them
  const sparks = Array.from({length:45},(_,i)=>({
    t:`${dv(i,96,2)}%`, l:`${dv2(i,96,4)}%`,
    s: 1.5+dv(i,3,1), dur:`${2.5+dv2(i,5,0.5)}s`, del:`${-dv(i,7,0.3)}s`,
    col: i%4===0?'rgba(255,200,80,0.9)':i%4===1?'rgba(80,190,255,0.9)':i%4===2?'rgba(80,220,140,0.9)':'rgba(200,120,255,0.8)',
    anim: i%2===0?'tn-twinkle':'tn-twinkle2',
  }))

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Rich layered base */}
      <div className="absolute inset-0" style={{
        background:`
          radial-gradient(ellipse 120% 80% at 70% -10%, rgba(255,220,130,0.35) 0%, transparent 55%),
          radial-gradient(ellipse 100% 70% at -10% 50%, rgba(100,200,255,0.2) 0%, transparent 50%),
          radial-gradient(ellipse 80% 80% at 100% 100%, rgba(80,220,160,0.18) 0%, transparent 55%),
          radial-gradient(ellipse 60% 60% at 40% 80%, rgba(180,120,255,0.10) 0%, transparent 50%),
          linear-gradient(160deg, #fffbf0 0%, #fef3e2 20%, #e8f4fd 50%, #e0f5ee 75%, #f0eeff 100%)
        `
      }}/>
      {/* Sun lens flare */}
      <div className="absolute" style={{
        width:600, height:600, top:'-15%', right:'-5%',
        background:'radial-gradient(circle, rgba(255,230,100,0.28) 0%, rgba(255,180,60,0.14) 30%, transparent 65%)',
        filter:'blur(40px)',
        animation:'tn-sun 12s ease-in-out infinite',
      }}/>
      {/* Cross-lens highlight */}
      <div className="absolute" style={{
        width:2, height:'100%', top:0, right:'12%',
        background:'linear-gradient(to bottom, transparent, rgba(255,230,100,0.06), rgba(255,230,100,0.12), rgba(255,230,100,0.06), transparent)',
        transform:'rotate(15deg)',
      }}/>
      <div className="absolute" style={{
        width:'100%', height:2, top:'12%', right:0,
        background:'linear-gradient(to right, transparent, rgba(255,230,100,0.05), rgba(255,230,100,0.10), rgba(255,230,100,0.05), transparent)',
        transform:'rotate(-5deg)',
      }}/>
      {/* Bokeh field */}
      {bokeh.map((b,i)=>(
        <div key={i} className="absolute rounded-full" style={{
          width:b.w, height:b.h, top:b.t, left:b.l,
          background:`radial-gradient(circle, ${b.col} 0%, transparent 75%)`,
          filter:`blur(${b.blur}px)`,
          animation:`${b.anim} ${b.dur} ease-in-out infinite`,
          animationDelay:b.del,
        }}/>
      ))}
      {/* Diagonal shimmer sweep */}
      <div className="absolute inset-0" style={{
        background:'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.08) 48%, rgba(255,255,200,0.06) 52%, transparent 70%)',
        backgroundSize:'200% 100%',
        animation:'tn-shimmer 8s linear infinite',
      }}/>
      {/* Sparkle constellation */}
      {sparks.map((s,i)=>(
        <div key={i} className="absolute rounded-full" style={{
          width:s.s, height:s.s, top:s.t, left:s.l,
          background:s.col,
          boxShadow:`0 0 ${s.s*3}px ${s.s}px ${s.col}`,
          animation:`${s.anim} ${s.dur} ease-in-out infinite`,
          animationDelay:s.del,
        }}/>
      ))}
      {/* Bottom wave SVG */}
      <svg className="absolute bottom-0 left-0 w-full" viewBox="0 0 1440 160" preserveAspectRatio="none" style={{filter:'blur(1px)'}}>
        <path d="M0,80 C200,130 400,30 720,80 C900,110 1100,40 1440,80 L1440,160 L0,160Z" fill="rgba(100,190,255,0.07)"/>
        <path d="M0,110 C300,60 600,140 900,100 C1100,75 1300,120 1440,105 L1440,160 L0,160Z" fill="rgba(80,220,160,0.055)"/>
        <path d="M0,130 C400,100 800,155 1200,125 C1350,115 1420,135 1440,130 L1440,160 L0,160Z" fill="rgba(180,140,255,0.04)"/>
      </svg>
      {/* Top light haze */}
      <div className="absolute top-0 left-0 w-full h-48" style={{
        background:'linear-gradient(to bottom, rgba(255,230,130,0.08) 0%, transparent 100%)',
      }}/>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. USER DARK — "Northern Lights Expedition"
//    3-layer parallax starfield + SVG turbulence aurora + shooting stars
// ─────────────────────────────────────────────────────────────────────────────
function UserDark() {
  // 3 star layers — different sizes, speeds, brightness
  const starsSmall  = Array.from({length:160},(_,i)=>({ t:`${dv(i,99,1)}%`, l:`${dv2(i,99,3)}%`, s:0.6, dur:`${3+dv(i,4,0.5)}s`, del:`${-dv2(i,8,0)}s` }))
  const starsMid    = Array.from({length:80}, (_,i)=>({ t:`${dv(i,98,5)}%`, l:`${dv2(i,98,7)}%`, s:1.1, dur:`${2+dv(i,3,1)}s`,  del:`${-dv2(i,6,1)}s` }))
  const starsBright = Array.from({length:35}, (_,i)=>({ t:`${dv(i,96,9)}%`, l:`${dv2(i,96,11)}%`,s:1.8, dur:`${1.5+dv(i,2,0.5)}s`,del:`${-dv2(i,4,0.5)}s`,glow:true }))

  const auroras = [
    { top:'14%', height:'30%', color:'rgba(0,255,180,0.09)',   color2:'rgba(0,230,180,0.04)',  dur:'16s', del:'0s',   anim:'tn-aurora',  blur:22 },
    { top:'22%', height:'25%', color:'rgba(0,200,255,0.08)',   color2:'rgba(30,180,255,0.03)', dur:'20s', del:'-6s',  anim:'tn-aurora2', blur:18 },
    { top:'32%', height:'20%', color:'rgba(140,80,255,0.07)',  color2:'rgba(100,60,220,0.03)', dur:'24s', del:'-11s', anim:'tn-aurora3', blur:20 },
    { top:'8%',  height:'22%', color:'rgba(0,255,140,0.065)',  color2:'rgba(0,200,120,0.025)', dur:'28s', del:'-4s',  anim:'tn-aurora',  blur:25 },
    { top:'40%', height:'18%', color:'rgba(80,200,255,0.055)', color2:'rgba(0,160,255,0.02)',  dur:'18s', del:'-9s',  anim:'tn-aurora2', blur:16 },
  ]

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* SVG filters for aurora turbulence */}
      <svg style={{position:'absolute',width:0,height:0}}>
        <defs>
          <filter id="aurora-turb" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.012 0.004" numOctaves="4" seed="5" result="noise"/>
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="40" xChannelSelector="R" yChannelSelector="G"/>
          </filter>
          <filter id="aurora-turb2" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="turbulence" baseFrequency="0.008 0.003" numOctaves="3" seed="12" result="noise2"/>
            <feDisplacementMap in="SourceGraphic" in2="noise2" scale="30" xChannelSelector="G" yChannelSelector="R"/>
          </filter>
          <filter id="star-glow">
            <feGaussianBlur stdDeviation="1.5" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
      </svg>

      {/* Deep space gradient base */}
      <div className="absolute inset-0" style={{
        background:`
          radial-gradient(ellipse 60% 50% at 15% 20%, rgba(0,30,80,0.7) 0%, transparent 60%),
          radial-gradient(ellipse 50% 40% at 80% 35%, rgba(40,0,80,0.5) 0%, transparent 55%),
          radial-gradient(ellipse 40% 50% at 45% 70%, rgba(0,40,60,0.4) 0%, transparent 55%),
          linear-gradient(170deg, #010510 0%, #030a1a 30%, #050d22 60%, #020814 100%)
        `
      }}/>

      {/* Milky Way band */}
      <div className="absolute" style={{
        width:'160%', height:'35%', top:'25%', left:'-30%',
        background:'linear-gradient(to bottom, transparent, rgba(180,200,255,0.018), rgba(200,220,255,0.025), rgba(180,200,255,0.018), transparent)',
        transform:'rotate(-15deg)',
        filter:'blur(30px)',
      }}/>

      {/* Star layer 1 — tiny, dim */}
      {starsSmall.map((s,i)=>(
        <div key={`ss${i}`} className="absolute rounded-full bg-white" style={{
          width:s.s, height:s.s, top:s.t, left:s.l,
          opacity:0.35,
          animation:`tn-twinkle2 ${s.dur} ease-in-out infinite`,
          animationDelay:s.del,
        }}/>
      ))}
      {/* Star layer 2 — medium */}
      {starsMid.map((s,i)=>(
        <div key={`sm${i}`} className="absolute rounded-full" style={{
          width:s.s, height:s.s, top:s.t, left:s.l,
          background:`hsl(${200+i%40},55%,90%)`,
          animation:`tn-twinkle ${s.dur} ease-in-out infinite`,
          animationDelay:s.del,
        }}/>
      ))}
      {/* Star layer 3 — bright, with glow */}
      {starsBright.map((s,i)=>(
        <div key={`sb${i}`} className="absolute rounded-full" style={{
          width:s.s, height:s.s, top:s.t, left:s.l,
          background:`hsl(${195+i%45},70%,95%)`,
          boxShadow:`0 0 4px 2px hsl(${195+i%45},80%,80%)`,
          animation:`tn-twinkle ${s.dur} ease-in-out infinite`,
          animationDelay:s.del,
        }}/>
      ))}

      {/* Aurora bands with SVG turbulence filter */}
      {auroras.map((a,i)=>(
        <div key={`au${i}`} className="absolute left-0 w-full" style={{
          top:a.top, height:a.height,
          background:`linear-gradient(to bottom, transparent 0%, ${a.color} 30%, ${a.color} 70%, ${a.color2} 85%, transparent 100%)`,
          filter:`blur(${a.blur}px)`,
          animation:`${a.anim} ${a.dur} ease-in-out infinite`,
          animationDelay:a.del,
        }}/>
      ))}
      {/* SVG turbulence aurora overlay for organic waviness */}
      <div className="absolute inset-0" style={{filter:'url(#aurora-turb)', opacity:0.6, pointerEvents:'none'}}>
        <div className="absolute" style={{
          top:'10%', left:0, width:'100%', height:'45%',
          background:'linear-gradient(to bottom, transparent, rgba(0,220,160,0.035), rgba(40,200,255,0.03), rgba(0,200,160,0.025), transparent)',
          filter:'blur(8px)',
          animation:'tn-aurora 18s ease-in-out infinite',
        }}/>
      </div>

      {/* Shooting stars */}
      <div className="absolute" style={{
        width:120, height:1.5, top:'12%', left:'15%',
        background:'linear-gradient(to right, transparent, rgba(200,240,255,0.9), transparent)',
        borderRadius:2,
        animation:'tn-shoot 9s ease-in-out infinite',
        animationDelay:'2s',
        transform:'rotate(25deg)',
        transformOrigin:'left center',
      }}/>
      <div className="absolute" style={{
        width:90, height:1, top:'30%', left:'55%',
        background:'linear-gradient(to right, transparent, rgba(180,220,255,0.7), transparent)',
        borderRadius:2,
        animation:'tn-shoot2 13s ease-in-out infinite',
        animationDelay:'7s',
        transform:'rotate(22deg)',
        transformOrigin:'left center',
      }}/>
      <div className="absolute" style={{
        width:70, height:1, top:'8%', left:'75%',
        background:'linear-gradient(to right, transparent, rgba(200,240,255,0.6), transparent)',
        borderRadius:2,
        animation:'tn-shoot 16s ease-in-out infinite',
        animationDelay:'4s',
        transform:'rotate(28deg)',
        transformOrigin:'left center',
      }}/>

      {/* Atmospheric glow at horizon */}
      <div className="absolute bottom-0 left-0 w-full h-32" style={{
        background:'linear-gradient(to top, rgba(0,40,80,0.15), transparent)',
      }}/>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. ADMIN LIGHT — "Crystal Data Grid"
//    Animated mesh gradient + hex SVG grid + prismatic strip + node network
// ─────────────────────────────────────────────────────────────────────────────
function AdminLight() {
  const nodes = Array.from({length:22},(_,i)=>({
    t:`${8+dv(i,83,3)}%`, l:`${5+dv2(i,89,7)}%`,
    s:3+dv(i,4,1), dur:`${2.5+dv2(i,3,0.5)}s`, del:`${-dv(i,5,0.2)}s`,
    col:i%3===0?'rgba(99,80,210,0.7)':i%3===1?'rgba(80,130,255,0.65)':'rgba(139,100,246,0.6)',
  }))
  // SVG connection lines between conceptually nearby nodes
  const edges = [
    [8,14],[14,3],[3,18],[18,7],[7,11],[11,20],[20,1],[1,15],[15,6],[6,19],
    [19,4],[4,12],[12,16],[16,9],[9,2],[2,17],[17,13],[13,5],[5,10],[10,8],
  ]

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* SVG filters */}
      <svg style={{position:'absolute',width:0,height:0}}>
        <defs>
          <filter id="prismatic">
            <feColorMatrix type="hueRotate" values="0">
              <animate attributeName="values" values="0;15;0" dur="8s" repeatCount="indefinite"/>
            </feColorMatrix>
          </filter>
        </defs>
      </svg>

      {/* Clean base */}
      <div className="absolute inset-0" style={{
        background:'linear-gradient(145deg, #f9f8ff 0%, #f0edff 30%, #eaefff 60%, #f4f0ff 100%)'
      }}/>

      {/* Animated mesh gradient — 4 drifting blobs create living gradient */}
      <div className="absolute rounded-full" style={{
        width:700, height:700, top:'-20%', left:'-15%',
        background:'radial-gradient(circle, rgba(99,102,241,0.13) 0%, rgba(129,140,248,0.06) 50%, transparent 70%)',
        filter:'blur(80px)',
        animation:'tn-mesh1 28s ease-in-out infinite',
      }}/>
      <div className="absolute rounded-full" style={{
        width:600, height:600, bottom:'-20%', right:'-15%',
        background:'radial-gradient(circle, rgba(139,92,246,0.12) 0%, rgba(167,139,250,0.05) 50%, transparent 70%)',
        filter:'blur(80px)',
        animation:'tn-mesh2 24s ease-in-out infinite',
      }}/>
      <div className="absolute rounded-full" style={{
        width:500, height:500, top:'30%', left:'35%',
        background:'radial-gradient(circle, rgba(80,120,255,0.10) 0%, rgba(99,102,241,0.04) 50%, transparent 70%)',
        filter:'blur(70px)',
        animation:'tn-mesh3 32s ease-in-out infinite',
      }}/>
      <div className="absolute rounded-full" style={{
        width:400, height:400, top:'-5%', right:'20%',
        background:'radial-gradient(circle, rgba(168,85,247,0.08) 0%, transparent 70%)',
        filter:'blur(60px)',
        animation:'tn-mesh1 20s ease-in-out infinite',
        animationDelay:'-10s',
      }}/>

      {/* Prismatic iridescent strip at top */}
      <div className="absolute top-0 left-0 w-full" style={{height:4,
        background:'linear-gradient(90deg, #6366f1, #8b5cf6, #06b6d4, #10b981, #f59e0b, #ef4444, #ec4899, #8b5cf6, #6366f1)',
        backgroundSize:'200% 100%',
        animation:'tn-shimmer 6s linear infinite',
        opacity:0.7,
      }}/>

      {/* Hexagonal SVG grid */}
      <svg className="absolute inset-0 w-full h-full" style={{animation:'tn-hexwave 5s ease-in-out infinite'}}>
        <defs>
          <pattern id="hexGrid" x="0" y="0" width="70" height="81" patternUnits="userSpaceOnUse">
            <polygon points="35,3 66,20 66,54 35,71 4,54 4,20"
              fill="none" stroke="rgba(99,80,210,0.55)" strokeWidth="0.7"/>
          </pattern>
          <pattern id="hexGrid2" x="35" y="40.5" width="70" height="81" patternUnits="userSpaceOnUse">
            <polygon points="35,3 66,20 66,54 35,71 4,54 4,20"
              fill="none" stroke="rgba(99,80,210,0.3)" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hexGrid)" opacity="0.6"/>
        <rect width="100%" height="100%" fill="url(#hexGrid2)" opacity="0.4"/>
        {/* Highlighted hexes */}
        {Array.from({length:8},(_,i)=>(
          <polygon key={i}
            points="35,3 66,20 66,54 35,71 4,54 4,20"
            fill={`rgba(99,80,220,${0.04+dv(i,0.03,0.01)})`}
            stroke="rgba(99,80,220,0.5)"
            strokeWidth="1"
            transform={`translate(${dv2(i,900,50)},${dv(i,600,80)})`}
          />
        ))}
      </svg>

      {/* Network edges */}
      <svg className="absolute inset-0 w-full h-full" style={{opacity:0.18}}>
        {edges.map(([a,b],i)=>(
          nodes[a] && nodes[b] ? (
            <line key={i}
              x1={nodes[a].l} y1={nodes[a].t}
              x2={nodes[b].l} y2={nodes[b].t}
              stroke="rgba(99,80,210,1)" strokeWidth="0.8"
            />
          ) : null
        ))}
      </svg>
      {/* Network nodes */}
      {nodes.map((n,i)=>(
        <div key={i} className="absolute rounded-full" style={{
          width:n.s, height:n.s, top:n.t, left:n.l,
          background:n.col, color:n.col,
          animation:`tn-node ${n.dur} ease-in-out infinite`,
          animationDelay:n.del,
        }}/>
      ))}

      {/* Corner accent — prismatic gradient corner */}
      <div className="absolute bottom-0 right-0" style={{
        width:300, height:300,
        background:'radial-gradient(circle at 100% 100%, rgba(99,102,241,0.12) 0%, rgba(168,85,247,0.06) 40%, transparent 65%)',
        filter:'blur(30px)',
      }}/>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. ADMIN DARK — "Neural Command Center"
//    Deep glow orbs + animated circuit grid + data streams + neon pulse nodes
// ─────────────────────────────────────────────────────────────────────────────
function AdminDark() {
  const cnodes = Array.from({length:38},(_,i)=>({
    t:`${3+dv(i,93,2)}%`, l:`${3+dv2(i,93,5)}%`,
    s:2.5+dv(i,3.5,0.5),
    dur:`${2+dv2(i,2.5,0.5)}s`, del:`${-dv(i,4,0.3)}s`,
    col: i%4===0?'#6366f1':i%4===1?'#8b5cf6':i%4===2?'#06b6d4':'#a855f7',
  }))
  const streams = Array.from({length:18},(_,i)=>({
    l:`${dv2(i,96,2)}%`,
    dur:`${2.2+dv(i,3,0.4)}s`, del:`${-dv2(i,3,0)}s`,
    col: i%3===0?'rgba(99,102,241,0.6)':i%3===1?'rgba(139,92,246,0.55)':'rgba(6,182,212,0.45)',
    h: 55+dv(i,70,10),
  }))
  // Circuit trace paths (animated SVG dashes)
  const traces = [
    'M 10%,50% L 30%,50% L 30%,30% L 60%,30% L 60%,70% L 80%,70%',
    'M 20%,80% L 20%,60% L 50%,60% L 50%,20% L 80%,20%',
    'M 5%,25% L 40%,25% L 40%,75% L 90%,75%',
  ]

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* SVG filters */}
      <svg style={{position:'absolute',width:0,height:0}}>
        <defs>
          <filter id="neon-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="circuit-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.5" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
      </svg>

      {/* Ultra-deep base */}
      <div className="absolute inset-0" style={{
        background:`
          radial-gradient(ellipse 60% 55% at 10% 15%, rgba(50,0,100,0.4) 0%, transparent 60%),
          radial-gradient(ellipse 55% 50% at 90% 80%, rgba(30,0,80,0.35) 0%, transparent 55%),
          radial-gradient(ellipse 40% 45% at 50% 50%, rgba(20,0,50,0.25) 0%, transparent 55%),
          linear-gradient(135deg, #04010f 0%, #070512 30%, #050212 60%, #06030e 100%)
        `
      }}/>

      {/* Massive background glow orbs */}
      <div className="absolute rounded-full" style={{
        width:700, height:700, top:'-20%', left:'-15%',
        background:'radial-gradient(circle, rgba(99,102,241,0.14) 0%, rgba(99,102,241,0.04) 50%, transparent 70%)',
        filter:'blur(80px)',
        animation:'tn-glow-pulse 10s ease-in-out infinite',
      }}/>
      <div className="absolute rounded-full" style={{
        width:650, height:650, bottom:'-20%', right:'-15%',
        background:'radial-gradient(circle, rgba(139,92,246,0.13) 0%, rgba(139,92,246,0.04) 50%, transparent 70%)',
        filter:'blur(80px)',
        animation:'tn-glow-pulse 14s ease-in-out infinite',
        animationDelay:'-6s',
      }}/>
      <div className="absolute rounded-full" style={{
        width:400, height:400, top:'40%', left:'40%',
        background:'radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%)',
        filter:'blur(70px)',
        animation:'tn-pulse 8s ease-in-out infinite',
        animationDelay:'-3s',
      }}/>

      {/* Precise circuit grid — SVG */}
      <svg className="absolute inset-0 w-full h-full">
        {/* Vertical grid lines */}
        {Array.from({length:24},(_,i)=>(
          <line key={`v${i}`}
            x1={`${(i+1)*4}%`} y1="0" x2={`${(i+1)*4}%`} y2="100%"
            stroke={`rgba(${i%3===0?'99,102,241':i%3===1?'139,92,246':'80,80,180'},${0.03+0.025*Math.sin(i*0.8)})`}
            strokeWidth="0.5"
          />
        ))}
        {/* Horizontal grid lines */}
        {Array.from({length:16},(_,i)=>(
          <line key={`h${i}`}
            x1="0" y1={`${(i+1)*6.25}%`} x2="100%" y2={`${(i+1)*6.25}%`}
            stroke={`rgba(${i%2===0?'99,102,241':'139,92,246'},${0.04+0.02*Math.sin(i*1.2)})`}
            strokeWidth="0.5"
          />
        ))}
        {/* Animated circuit traces */}
        <polyline points="80,460 280,460 280,280 560,280 560,620 820,620"
          fill="none" stroke="rgba(99,102,241,0.35)" strokeWidth="1.2"
          strokeDasharray="20 8" filter="url(#circuit-glow)">
          <animate attributeName="stroke-dashoffset" values="0;-560" dur="8s" repeatCount="indefinite"/>
        </polyline>
        <polyline points="200,760 200,560 480,560 480,200 780,200"
          fill="none" stroke="rgba(139,92,246,0.3)" strokeWidth="1"
          strokeDasharray="15 10" filter="url(#circuit-glow)">
          <animate attributeName="stroke-dashoffset" values="0;-480" dur="11s" repeatCount="indefinite"/>
        </polyline>
        <polyline points="60,240 400,240 400,700 880,700"
          fill="none" stroke="rgba(6,182,212,0.25)" strokeWidth="1"
          strokeDasharray="12 12" filter="url(#circuit-glow)">
          <animate attributeName="stroke-dashoffset" values="0;-400" dur="14s" repeatCount="indefinite"/>
        </polyline>
        {/* Circuit junction dots */}
        {[[280,460],[280,280],[560,280],[560,620],[200,560],[480,560],[480,200],[400,240],[400,700]].map(([x,y],i)=>(
          <circle key={i} cx={x} cy={y} r="3.5"
            fill="none" stroke={i%2===0?'rgba(99,102,241,0.6)':'rgba(139,92,246,0.5)'}
            strokeWidth="1.2" filter="url(#circuit-glow)">
            <animate attributeName="r" values="2.5;4.5;2.5" dur={`${2+i*0.3}s`} repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.5;1;0.5" dur={`${2+i*0.3}s`} repeatCount="indefinite"/>
          </circle>
        ))}
      </svg>

      {/* Pulsing neon circuit nodes */}
      {cnodes.map((n,i)=>(
        <div key={i} className="absolute rounded-full" style={{
          width:n.s, height:n.s, top:n.t, left:n.l,
          background:n.col, color:n.col,
          animation:`tn-node ${n.dur} ease-in-out infinite`,
          animationDelay:n.del,
          filter:'url(#neon-glow)',
        }}/>
      ))}

      {/* Vertical data streams */}
      {streams.map((s,i)=>(
        <div key={i} className="absolute" style={{
          left:s.l, top:0, width:1, height:s.h,
          background:`linear-gradient(to bottom, transparent 0%, ${s.col} 40%, ${s.col} 80%, transparent 100%)`,
          animation:`tn-fall ${s.dur} linear infinite`,
          animationDelay:s.del,
        }}/>
      ))}

      {/* Horizontal scan line sweep */}
      <div className="absolute left-0 w-full" style={{
        height:100,
        background:'linear-gradient(to bottom, transparent, rgba(99,102,241,0.055), rgba(139,92,246,0.03), transparent)',
        animation:'tn-scan 5s linear infinite',
        mixBlendMode:'screen',
      }}/>

      {/* Radar pulse effect from center */}
      <div className="absolute rounded-full" style={{
        width:200, height:200, top:'50%', left:'50%',
        border:'1px solid rgba(99,102,241,0.15)',
        animation:'tn-radar 6s ease-out infinite',
      }}/>
      <div className="absolute rounded-full" style={{
        width:200, height:200, top:'50%', left:'50%',
        border:'1px solid rgba(139,92,246,0.12)',
        animation:'tn-radar 6s ease-out infinite',
        animationDelay:'-3s',
      }}/>

      {/* Bottom atmosphere */}
      <div className="absolute bottom-0 left-0 w-full h-24" style={{
        background:'linear-gradient(to top, rgba(20,0,50,0.3), transparent)',
      }}/>
      {/* Flicker effect on whole grid occasionally */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background:'transparent',
        animation:'tn-flicker 12s ease-in-out infinite',
      }}/>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────
const VARIANTS = {
  'user-light':  UserLight,
  'user-dark':   UserDark,
  'admin-light': AdminLight,
  'admin-dark':  AdminDark,
}

export default function AnimatedBackground({ isDark, portal = 'user' }) {
  const variant = `${portal}-${isDark ? 'dark' : 'light'}`
  const orbRef  = useRef(null)

  useEffect(() => { injectCSS() }, [])

  // Smooth parallax on mouse move
  useEffect(() => {
    const handler = e => {
      if (!orbRef.current) return
      const mx = (e.clientX / window.innerWidth  - 0.5) * 40
      const my = (e.clientY / window.innerHeight - 0.5) * 40
      orbRef.current.querySelectorAll('.bg-orb').forEach((el, i) => {
        const f = (i + 1) * 0.35
        el.style.transform = `translate(${mx * f}px, ${my * f}px)`
      })
    }
    window.addEventListener('mousemove', handler)
    return () => window.removeEventListener('mousemove', handler)
  }, [])

  const Bg = VARIANTS[variant] || UserLight

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      <Bg />

      {/* Deep-field parallax orbs */}
      <div ref={orbRef} className="absolute inset-0 pointer-events-none">
        <div className="bg-orb absolute -top-72 -left-72 w-[750px] h-[750px] rounded-full transition-transform duration-700 ease-out" style={{
          background: `radial-gradient(circle, ${{
            'user-light': 'rgba(100,180,255,0.14)',
            'user-dark':  'rgba(0,200,180,0.08)',
            'admin-light':'rgba(99,102,241,0.12)',
            'admin-dark': 'rgba(99,102,241,0.11)',
          }[variant]} 0%, transparent 70%)`,
          filter:'blur(100px)',
        }}/>
        <div className="bg-orb absolute -bottom-72 -right-72 w-[700px] h-[700px] rounded-full transition-transform duration-700 ease-out" style={{
          background: `radial-gradient(circle, ${{
            'user-light': 'rgba(16,185,129,0.12)',
            'user-dark':  'rgba(30,80,255,0.07)',
            'admin-light':'rgba(139,92,246,0.10)',
            'admin-dark': 'rgba(139,92,246,0.09)',
          }[variant]} 0%, transparent 70%)`,
          filter:'blur(100px)',
        }}/>
        <div className="bg-orb absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full transition-transform duration-700 ease-out" style={{
          background: `radial-gradient(circle, ${{
            'user-light': 'rgba(250,190,80,0.09)',
            'user-dark':  'rgba(100,50,200,0.06)',
            'admin-light':'rgba(80,120,255,0.08)',
            'admin-dark': 'rgba(168,85,247,0.07)',
          }[variant]} 0%, transparent 70%)`,
          filter:'blur(90px)',
        }}/>
      </div>

      {/* Vignette frame */}
      <div className="absolute inset-0" style={{
        background: isDark
          ? 'radial-gradient(ellipse 90% 90% at 50% 50%, transparent 25%, rgba(2,1,8,0.6) 100%)'
          : 'radial-gradient(ellipse 90% 90% at 50% 50%, transparent 25%, rgba(235,238,255,0.45) 100%)',
      }}/>
    </div>
  )
}
