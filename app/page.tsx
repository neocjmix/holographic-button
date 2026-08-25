"use client";

import {useMemo,useState} from "react";
import {HolographicButton,type HolographicVariant,useHolographicMotion} from "@neocjmix/holographic-button";

const PACKAGE="@neocjmix/holographic-button";
const variants:{value:HolographicVariant;label:string;note:string}[]=[
 {value:"spectral-film",label:"Spectral",note:"Broad rainbow sweep"},
 {value:"brushed-foil",label:"Brushed",note:"Directional metal grain"},
 {value:"thin-film",label:"Pearl",note:"Clean thin-film gradient"},
 {value:"facet-chrome",label:"Prism",note:"Fragmented chrome facets"},
];
const installCommands={npm:"npm install "+PACKAGE,pnpm:"pnpm add "+PACKAGE,yarn:"yarn add "+PACKAGE,bun:"bun add "+PACKAGE};

function CopyButton({value,label="Copy"}:{value:string;label?:string}){
 const[copied,setCopied]=useState(false);
 const copy=async()=>{await navigator.clipboard?.writeText(value);setCopied(true);setTimeout(()=>setCopied(false),1400)};
 return <button className="copy-button" onClick={copy} aria-label={"Copy "+label}>{copied?"Copied":"Copy"}</button>;
}

function CodeBlock({code,label}:{code:string;label:string}){
 return <div className="code-block"><div className="code-head"><span>{label}</span><CopyButton value={code} label={label}/></div><pre><code>{code}</code></pre></div>;
}

export default function Home(){
 const motion=useHolographicMotion({requestOnFirstInteraction:true});
 const[variant,setVariant]=useState<HolographicVariant>("spectral-film");
 const[label,setLabel]=useState("ACTIVATE");
 const[width,setWidth]=useState(560);
 const[height,setHeight]=useState(148);
 const[specularIntensity,setSpecularIntensity]=useState(1);
 const[specularRoughness,setSpecularRoughness]=useState(.06);
 const[specularBloom,setSpecularBloom]=useState(.14);
 const[specularFresnel,setSpecularFresnel]=useState(.22);
 const[specularColor,setSpecularColor]=useState("#fffaf6");
 const[specularIOR,setSpecularIOR]=useState(1.5);
 const[specularAnisotropy,setSpecularAnisotropy]=useState(0);
 const[specularRotation,setSpecularRotation]=useState(0);
 const[disabled,setDisabled]=useState(false);
 const[manager,setManager]=useState<keyof typeof installCommands>("npm");
 const[activated,setActivated]=useState(0);
 const code=useMemo(()=>[
  '"use client";','',
  'import {','  HolographicButton,','  useHolographicMotion,','} from "'+PACKAGE+'";',
  'import "'+PACKAGE+'/styles.css";','',
  'export function CTA() {','  const motion = useHolographicMotion({','    requestOnFirstInteraction: true,','  });','',
  '  return (','    <HolographicButton','      motion={motion}','      variant="'+variant+'"',
  '      width="min(100%, '+width+'px)"','      height={'+height+'}',
  '      specularIntensity={'+specularIntensity.toFixed(2)+'}','      specularRoughness={'+specularRoughness.toFixed(3)+'}',
  '      specularBloom={'+specularBloom.toFixed(2)+'}','      specularFresnel={'+specularFresnel.toFixed(2)+'}',
  '      specularColor="'+specularColor+'"','      specularIOR={'+specularIOR.toFixed(2)+'}',
  '      specularAnisotropy={'+specularAnisotropy.toFixed(2)+'}','      specularAnisotropyRotation={'+(specularRotation*Math.PI/180).toFixed(3)+'}',
  disabled?'      disabled':'',
  '      onClick={() => alert("Activated")}','    >','      '+label,'    </HolographicButton>','  );','}'
 ].filter(Boolean).join("\n"),[variant,width,height,specularIntensity,specularRoughness,specularBloom,specularFresnel,specularColor,specularIOR,specularAnisotropy,specularRotation,disabled,label]);

 return <main className="docs-shell">
  <nav className="topbar" aria-label="Primary navigation">
   <a className="brand" href="#top"><span className="brand-mark"/><b>Holographic Button</b><em>v0.1.0</em></a>
   <div className="nav-links"><a href="#playground">Playground</a><a href="#install">Install</a><a href="#api">API</a><a href="https://github.com/neocjmix/neocjmix.github.io/tree/master/holographic-cta-lab/react" target="_blank" rel="noreferrer">GitHub ↗</a></div>
  </nav>
  <aside className="ai-warning" aria-label="AI-generated code warning"><strong>UNREVIEWED AI OUTPUT</strong><p>This implementation and its documentation were generated entirely by AI. No human has reviewed the code yet. Treat v0.1.0 as experimental and audit it before production use.</p></aside>

  <section className="hero-section" id="top">
   <div className="hero-copy">
    <p className="kicker"><span>REACT / WEBGL</span> WORLD-LIT INTERFACE MATERIAL</p>
    <h1>A button that<br/>reflects <i>the room.</i></h1>
    <p className="lede">A physically directed holographic CTA for React. Tilt the phone—or move the pointer—and the material responds to a fixed world light in real time.</p>
    <div className="hero-actions"><a className="primary-link" href="#install">Get started <span>↓</span></a><a className="text-link" href="#playground">Tune the props</a></div>
    <div className="hero-facts"><span>MIT LICENSE</span><span>4 MATERIALS</span><span>REACT 18+</span><span>NO HUMAN REVIEW</span></div>
   </div>
   <div className="hero-object">
    <p>LIVE MATERIAL <span>MOVE YOUR DEVICE</span></p>
    <HolographicButton motion={motion} variant="spectral-film" width="min(100%, 620px)" height={164} onClick={()=>setActivated(v=>v+1)}>ENTER</HolographicButton>
    <small>{activated?"ACTIVATED × "+activated:"NATIVE BUTTON · TAP TO TEST"}</small>
   </div>
  </section>

  <section className="playground section-frame" id="playground">
   <div className="section-intro"><p className="section-index">01 / PLAYGROUND</p><h2>Tune it in place.</h2><p>Change the public props and copy the exact React code. Sensor input is automatic; desktop pointer movement uses the same reflection model.</p></div>
   <div className="playground-grid">
    <div className="control-panel">
     <div className="control-group"><span className="control-label">Material</span><div className="segment-grid">{variants.map(item=><button key={item.value} className={variant===item.value?"selected":""} onClick={()=>setVariant(item.value)}><b>{item.label}</b><small>{item.note}</small></button>)}</div></div>
     <div className="field-grid">
      <label><span>Label</span><input value={label} maxLength={18} onChange={e=>setLabel(e.target.value)}/></label>
      <label className="toggle-field"><span>Disabled</span><button type="button" role="switch" aria-checked={disabled} className={disabled?"on":""} onClick={()=>setDisabled(v=>!v)}><i/></button></label>
     </div>
     <label className="range-field"><span>Width <b>{width}px</b></span><input type="range" min="280" max="680" step="10" value={width} onChange={e=>setWidth(Number(e.target.value))}/></label>
     <label className="range-field"><span>Height <b>{height}px</b></span><input type="range" min="96" max="200" step="2" value={height} onChange={e=>setHeight(Number(e.target.value))}/></label>
     <div className="control-group specular-controls"><span className="control-label">Surface specular</span>
      <label className="range-field"><span>Intensity <b>{specularIntensity.toFixed(2)}</b></span><input type="range" min="0" max="3" step="0.05" value={specularIntensity} onChange={e=>setSpecularIntensity(Number(e.target.value))}/></label>
      <label className="range-field"><span>Roughness <b>{specularRoughness.toFixed(3)}</b></span><input type="range" min="0.025" max="0.3" step="0.005" value={specularRoughness} onChange={e=>setSpecularRoughness(Number(e.target.value))}/></label>
      <label className="range-field"><span>Bloom <b>{specularBloom.toFixed(2)}</b></span><input type="range" min="0" max="1" step="0.02" value={specularBloom} onChange={e=>setSpecularBloom(Number(e.target.value))}/></label>
      <label className="range-field"><span>Fresnel <b>{specularFresnel.toFixed(2)}</b></span><input type="range" min="0" max="1" step="0.02" value={specularFresnel} onChange={e=>setSpecularFresnel(Number(e.target.value))}/></label>
      <label className="color-field"><span>Color <b>{specularColor}</b></span><input type="color" value={specularColor} onChange={e=>setSpecularColor(e.target.value)}/></label>
      <label className="range-field"><span>IOR <b>{specularIOR.toFixed(2)}</b></span><input type="range" min="1" max="2.5" step="0.05" value={specularIOR} onChange={e=>setSpecularIOR(Number(e.target.value))}/></label>
      <label className="range-field"><span>Anisotropy <b>{specularAnisotropy.toFixed(2)}</b></span><input type="range" min="0" max="1" step="0.02" value={specularAnisotropy} onChange={e=>setSpecularAnisotropy(Number(e.target.value))}/></label>
      <label className="range-field"><span>Direction <b>{specularRotation}°</b></span><input type="range" min="0" max="360" step="1" value={specularRotation} onChange={e=>setSpecularRotation(Number(e.target.value))}/></label>
     </div>
    </div>
    <div className="live-stage">
     <div className="stage-meta"><span>RESULT</span><em>{variant.replace("-"," ")}</em></div>
     <HolographicButton motion={motion} variant={variant} width={"min(100%, "+width+"px)"} height={height} specularIntensity={specularIntensity} specularRoughness={specularRoughness} specularBloom={specularBloom} specularFresnel={specularFresnel} specularColor={specularColor} specularIOR={specularIOR} specularAnisotropy={specularAnisotropy} specularAnisotropyRotation={specularRotation*Math.PI/180} disabled={disabled} onClick={()=>setActivated(v=>v+1)}>{label||"BUTTON"}</HolographicButton>
     <p>{disabled?"DISABLED · NATIVE STATE":activated?"EVENT RECEIVED × "+activated:"CLICK, TAP, FOCUS, OR SUBMIT LIKE A BUTTON"}</p>
    </div>
   </div>
   <CodeBlock code={code} label="CTA.tsx"/>
  </section>

  <section className="install section-frame" id="install">
   <div className="section-intro"><p className="section-index">02 / INSTALL</p><h2>Two imports.<br/>One shared hook.</h2><p>The JavaScript is ESM and the stylesheet is an explicit export. React is a peer dependency; there are no other runtime packages.</p></div>
   <div className="install-grid">
    <div className="install-card">
     <div className="manager-tabs" role="tablist" aria-label="Package manager">{(Object.keys(installCommands) as (keyof typeof installCommands)[]).map(item=><button type="button" role="tab" aria-selected={manager===item} className={manager===item?"active":""} onClick={()=>setManager(item)} key={item}>{item}</button>)}</div>
     <div className="command-line"><code>{installCommands[manager]}</code><CopyButton value={installCommands[manager]} label="install command"/></div>
    </div>
    <div className="install-steps">
     <article><span>01</span><div><h3>Import the component</h3><p>Import the stylesheet once, then create one motion hook for the buttons in that visual scene.</p></div></article>
     <article><span>02</span><div><h3>Render a real button</h3><p>Native events, form attributes, ARIA, data attributes, className, style, and ref reach the underlying element.</p></div></article>
     <article><span>03</span><div><h3>Let input arrive</h3><p>Desktop uses pointer position. Supported phones use attitude sensors; iOS resumes existing permission on entry or asks on the first tap.</p></div></article>
    </div>
   </div>
  </section>

  <section className="materials section-frame" id="materials">
   <div className="section-intro compact"><p className="section-index">03 / MATERIALS</p><h2>Four optical models.</h2><p>Each variant changes how the surface is described, not just its palette.</p></div>
   <div className="material-grid">{variants.map((item,index)=><article key={item.value}><div><span>{"0"+(index+1)}</span><h3>{item.label}</h3><p>{item.note}</p></div><HolographicButton motion={motion} variant={item.value} height={112} onClick={()=>setActivated(v=>v+1)}>{item.label.toUpperCase()}</HolographicButton></article>)}</div>
  </section>

  <section className="api section-frame" id="api">
   <div className="section-intro"><p className="section-index">04 / API</p><h2>Small surface.<br/>Native behavior.</h2><p>The component adds material-specific props and inherits the rest from React’s native button type.</p></div>
   <div className="api-content">
    <div className="api-block"><h3>HolographicButton</h3><div className="api-table" role="table">
     {[
      ["motion","HolographicMotion","required","Shared matrix from the hook."],
      ["variant","HolographicVariant","spectral-film","One of four optical surfaces."],
      ["children","ReactNode","ACTIVATE","Visible primary content."],
      ["width","CSS width","CSS default","Number or any CSS width."],
      ["height","CSS height","CSS default","Number or any CSS height."],
      ["specularIntensity","number","1","Surface highlight energy, clamped from 0 to 3."],
      ["specularRoughness","number","0.06","Surface specular lobe width, clamped from 0.025 to 0.3."],
      ["specularBloom","number","0.14","Soft blue-white halo around the highlight, clamped from 0 to 1."],
      ["specularFresnel","number","0.22","How strongly the surface brightens toward grazing angles, clamped from 0 to 1."],
      ["specularColor","hex or RGB tuple","#fffaf6","F0 highlight tint as #RGB, #RRGGBB, or normalized RGB."],
      ["specularIOR","number","1.5","Dielectric index of refraction, clamped from 1 to 2.5."],
      ["specularAnisotropy","number","0","Highlight elongation, clamped from 0 to 1."],
      ["specularAnisotropyRotation","radians","0","Direction of the elongated highlight, clamped to ±2π."],
     ].map(row=><div className="api-row" role="row" key={row[0]}><code>{row[0]}</code><span>{row[1]}</span><em>{row[2]}</em><p>{row[3]}</p></div>)}
    </div><div className="native-strip"><b>Also forwards</b><span>on*</span><span>disabled</span><span>type / name / value / form</span><span>aria-* / data-*</span><span>className / style / ref</span></div></div>
    <div className="api-block"><h3>useHolographicMotion</h3><div className="hook-card"><code>const motion = useHolographicMotion(&#123;<br/>  pointerFallback: true,<br/>  requestOnFirstInteraction: true,<br/>  telemetry: false<br/>&#125;);</code><p>Use one instance per group. Reactive <code>telemetry</code> is opt-in, so the default path does not re-render the tree for diagnostics. The library renders no HUD.</p></div>
    <div className="support-card"><span>GEOMETRY NOTE</span><h4>The pill is intentional.</h4><p>Arbitrary corner radius is not exposed because the DOM clipping, WebGL signed-distance field, and reflective rim must describe the same contour.</p></div></div>
   </div>
  </section>

  <section className="closing">
   <p>READY FOR A LITTLE TOO MUCH BUTTON?</p><h2>Give the interface<br/><i>a surface.</i></h2><a href="#install">Install {PACKAGE} <span>↗</span></a>
  </section>

  <footer><div><span className="brand-mark"/><b>Holographic Button</b><small>MIT © 2026 ChanJin Park</small></div><p>Inspired by <a href="https://x.com/luciascarlet/status/1930614317541474598" target="_blank" rel="noreferrer">Lucia Scarlet’s holographic controls ↗</a></p><div><a href="#top">Top ↑</a><a href="https://github.com/neocjmix/neocjmix.github.io/tree/master/holographic-cta-lab/react" target="_blank" rel="noreferrer">GitHub ↗</a></div></footer>
 </main>;
}
