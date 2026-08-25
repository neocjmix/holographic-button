"use client";
import {useState} from "react";
import {HolographicButton,type HolographicTelemetry,type HolographicVariant,useHolographicMotion} from "../components/holographic-button";

const fmt=(n:number|null)=>n===null?"—":n.toFixed(1)+"°";
const code=`import {
  HolographicButton,
  useHolographicMotion,
} from "./components/holographic-button";

export function CTA() {
  const motion = useHolographicMotion();

  return (
    <HolographicButton
      motion={motion}
      variant="spectral-film"
      width="min(100%, 560px)"
      height={148}
      eyebrow="BROAD SWEEP"
      badge="01"
      onClick={() => alert("Activated")}
    >
      ACTIVATE
    </HolographicButton>
  );
}`;

function HUD({data}:{data:HolographicTelemetry}){
 const[expanded,setExpanded]=useState(true);
 return <aside className={"sensor-hud "+data.signal+(expanded?"":" collapsed")}>
  <button className="hud-head" onClick={()=>setExpanded(v=>!v)} aria-expanded={expanded} aria-label={expanded?"Collapse sensor HUD":"Expand sensor HUD"}><span className="hud-led"/><b>WORLD ATTITUDE</b><em>{data.signal==="live"?"LIVE":data.signal==="stale"?"NO SIGNAL":"WAITING"}</em><i className="hud-caret">⌄</i></button>
  <div className="hud-content"><div className="hud-grid"><span>PERMISSION</span><strong>{data.permission}</strong><span>SOURCE</span><strong>{data.source}</strong>
   <span>EVENTS</span><strong>{data.events}</strong><span>RATE</span><strong>{data.hz.toFixed(1)} Hz</strong>
   <span>ALPHA / YAW</span><strong>{fmt(data.alpha)}</strong><span>BETA / PITCH</span><strong>{fmt(data.beta)}</strong>
   <span>GAMMA / ROLL</span><strong>{fmt(data.gamma)}</strong><span>LAST</span><strong>{data.age===null?"—":data.age+" ms"}</strong>
   <span>NORMAL X</span><strong>{data.normal[0].toFixed(3)}</strong><span>NORMAL Y</span><strong>{data.normal[1].toFixed(3)}</strong>
   <span>NORMAL Z</span><strong>{data.normal[2].toFixed(3)}</strong><span>HTTPS</span><strong>{data.secure?"yes":"no"}</strong>
  </div></div>
 </aside>
}

const variants:{variant:HolographicVariant;eyebrow:string;name:string;badge:string}[]=[
 {variant:"spectral-film",eyebrow:"BROAD SWEEP",name:"SPECTRAL FILM",badge:"01"},
 {variant:"brushed-foil",eyebrow:"BRUSHED FOIL",name:"PETROL",badge:"02"},
 {variant:"thin-film",eyebrow:"THIN-FILM",name:"PEARL",badge:"03"},
 {variant:"facet-chrome",eyebrow:"FACET CHROME",name:"PRISM",badge:"04"},
];

export default function Home(){
 const motion=useHolographicMotion(),[alert,setAlert]=useState<string|null>(null),[copied,setCopied]=useState(false);
 const copy=async()=>{await navigator.clipboard?.writeText(code);setCopied(true);setTimeout(()=>setCopied(false),1400)};
 return <main className="lab-shell"><header><div><p className="eyebrow">REUSABLE OPTICAL UI <span>REACT / WEBGL</span></p><h1>Holographic<br/><i>Button</i></h1></div><p className="intro">One hook. Four optical models.<br/>World-space light and device attitude.</p></header>
  <section className="hero"><div className="axis-label"><span>LIVE COMPONENTS</span><i/></div><div className="variation-grid">
   {variants.map(v=><article className="variation" key={v.variant}><HolographicButton motion={motion} variant={v.variant} eyebrow={v.eyebrow} badge={v.badge} aria-label={`Activate ${v.name}`} onClick={()=>setAlert(v.name)}>{v.name}</HolographicButton></article>)}
  </div><div className="material-note"><span>4 OPTICAL MODELS</span><span>SHARED MOTION HOOK</span><span>WORLD LIGHTS</span></div></section>
  <section className="usage"><div className="axis-label"><span>USE IT</span><i/></div><div className="usage-grid"><div><h2>A real button API.</h2><p>Render one motion hook per scene and share it across any number of buttons. The component forwards native button handlers, form props, accessibility attributes, styles, and refs to its actual button element.</p><div className="api-row"><span>width / height</span><span>className / style</span><span>disabled / type</span><span>all on* handlers</span><span>ref / aria-* / data-*</span></div></div><div className="code-card"><button onClick={copy}>{copied?"COPIED":"COPY"}</button><pre><code>{code}</code></pre></div></div></section>
  <footer><span>REACT COMPONENT / WEBGL 1 / ZERO RUNTIME DEPENDENCIES<br/><a href="https://dribbble.com/shots/25057911-Holographic-CTA" target="_blank" rel="noreferrer">INSPIRED BY RTHWIK GOPINATH — HOLOGRAPHIC CTA ↗</a></span><span>2026</span></footer>
  <HUD data={motion.telemetry}/>
  {alert&&<div className="alert-backdrop" onPointerDown={e=>{if(e.target===e.currentTarget)setAlert(null)}}><div className="alert-card" role="alertdialog" aria-modal="true"><div className="alert-icon">✓</div><p>{alert}</p><h2>Component activated.</h2><button autoFocus onClick={()=>setAlert(null)}>CLOSE <span>×</span></button></div></div>}
 </main>
}
