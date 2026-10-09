"use client";

import {useMemo,useState} from "react";
import {HolographicButton,OPTICAL_PRESETS,OPTICAL_CONTROLS,DEFAULT_OPTICAL_OPTIONS,normalizeOpticalOptions,type OpticalOptions,type OpticalPresetId,useHolographicMotion} from "@neocjmix/holographic-button";
import {toSliderValue,fromSliderValue,formatOpticalValue,matchesPreset} from "./optical-tuning";

const PACKAGE="@neocjmix/holographic-button";
const SATIN_PRESET=OPTICAL_PRESETS.find(preset=>preset.id==="satin-mirror")!;
const DEMO_PRESET_NOTES:Partial<Record<OpticalPresetId,string>>={"satin-mirror":"부드러운 회색 거울 반사"};
const controlGroups=[
 {id:"surface",label:"표면과 반사",note:"반사의 선명함, 방향성과 표면의 굴곡을 조절해요."},
 {id:"pattern",label:"무늬와 미세 구조",note:"회절과 미세한 요철로 같은 표면의 인상을 바꿔요."},
 {id:"motion",label:"빛과 움직임",note:"기기를 움직인 뒤 빛이 원래 방향으로 돌아오는 시간을 조절해요."},
] as const;
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
 const[presetId,setPresetId]=useState<OpticalPresetId>(SATIN_PRESET.id);
 const[label,setLabel]=useState("ACTIVATE");
 const[width,setWidth]=useState(560);
 const[height,setHeight]=useState(148);
 const[specular,setSpecular]=useState(5);
 const[opticalOptions,setOpticalOptions]=useState<OpticalOptions>(()=>({...DEFAULT_OPTICAL_OPTIONS}));
 const currentPreset=OPTICAL_PRESETS.find(preset=>preset.id===presetId)!;
 const modified=!matchesPreset(opticalOptions,specular,currentPreset);
 const materialLabel=modified?"Custom · "+currentPreset.label:currentPreset.label;
 const applyPreset=(id:OpticalPresetId)=>{
  const preset=OPTICAL_PRESETS.find(item=>item.id===id)!;
  setPresetId(id);setOpticalOptions(normalizeOpticalOptions(preset.options));setSpecular(preset.specular);
 };
 const resetSatinMirror=()=>{setPresetId(SATIN_PRESET.id);setOpticalOptions({...DEFAULT_OPTICAL_OPTIONS});setSpecular(5)};
 const[disabled,setDisabled]=useState(false);
 const[manager,setManager]=useState<keyof typeof installCommands>("npm");
 const[activated,setActivated]=useState(0);
 const code=useMemo(()=>[
  '"use client";','',
  'import {','  HolographicButton,','  useHolographicMotion,','} from "'+PACKAGE+'";',
  'import "'+PACKAGE+'/styles.css";','',
  'export function CTA() {','  const motion = useHolographicMotion({','    requestOnFirstInteraction: true,','  });','',
  '  return (','    <HolographicButton','      motion={motion}','      variant="satin-mirror"',
  '      width="min(100%, '+width+'px)"','      height={'+height+'}',
  '      specular={'+specular+'}',
  '      opticalOptions={{',...Object.entries(opticalOptions).map(([key,value])=>'        '+key+': '+value+','),'      }}',
  disabled?'      disabled':null,
  '      onClick={() => alert("Activated")}','    >','      {'+JSON.stringify(label||"BUTTON")+'}','    </HolographicButton>','  );','}'
 ].filter(line=>line!==null).join("\n"),[width,height,specular,disabled,label,opticalOptions]);

 return <main className="docs-shell">
  <nav className="topbar" aria-label="Primary navigation">
   <a className="brand" href="#top"><span className="brand-mark"/><b>Holographic Button</b><em>v1.0.0</em></a>
   <div className="nav-links"><a href="#playground">Playground</a><a href="#install">Install</a><a href="#api">API</a><a href="https://github.com/neocjmix/holographic-button" target="_blank" rel="noreferrer">GitHub ↗</a></div>
  </nav>
  <aside className="ai-warning" aria-label="Implementation and display notes"><strong>AI-ASSISTED IMPLEMENTATION</strong><p>Built with AI under human visual direction. HDR is available on supported displays and browsers, with WebGL fallback. Check rendering, accessibility and performance on your target devices before shipping.</p></aside>

  <section className="hero-section" id="top">
   <div className="hero-copy">
    <p className="kicker"><span>REACT / HDR + WEBGL</span> WORLD-LIT INTERFACE MATERIAL</p>
    <h1>A button that<br/><i>catches the light.</i></h1>
    <p className="lede">A physically directed holographic CTA for React. Tilt the phone—or move the pointer—and the material responds to a fixed world light in real time.</p>
    <div className="hero-actions"><a className="primary-link" href="#install">Get started <span>↓</span></a><a className="text-link" href="#playground">Tune the props</a></div>
    <div className="hero-facts"><span>MIT LICENSE</span><span>ONE SHADER · NUMERIC PRESETS</span><span>REACT 18+</span></div>
   </div>
   <div className="hero-object">
    <p>LIVE MATERIAL <span>MOVE YOUR DEVICE</span></p>
    <HolographicButton motion={motion} variant="satin-mirror" opticalOptions={DEFAULT_OPTICAL_OPTIONS} specular={5} width="min(100%, 620px)" height={164} onClick={()=>setActivated(v=>v+1)}>ENTER</HolographicButton>
    <small>{activated?"ACTIVATED × "+activated:"NATIVE BUTTON · TAP TO TEST"}</small>
   </div>
  </section>

  <section className="playground section-frame" id="playground">
   <div className="section-intro"><p className="section-index">01 / PLAYGROUND</p><h2>Tune it in place.</h2><p>Start from a numeric preset, then shape the same optical surface with every control. The result and React example update together; sensors and pointer input share one reflection model.</p></div>
   <div className="playground-grid tuning-layout">
    <div className="control-panel">
     <div className="control-group">
      <span className="control-label">Optical preset · 하나의 셰이더</span>
      <div className="segment-grid preset-grid" aria-label="Optical presets">{OPTICAL_PRESETS.map(preset=><button type="button" key={preset.id} aria-pressed={presetId===preset.id&&!modified} className={presetId===preset.id&&!modified?"selected":""} onClick={()=>applyPreset(preset.id)}><b>{preset.label}</b><small>{DEMO_PRESET_NOTES[preset.id]??preset.note}</small></button>)}</div>
      <p className="preset-status" aria-live="polite"><b>{modified?"Custom / 수정됨":currentPreset.label}</b><span>{modified?currentPreset.label+"에서 조절한 값이에요.":"프리셋은 아래 모든 수치의 시작점이에요."}</span></p>
      <div className="preset-actions"><button className="copy-button preset-reset" type="button" onClick={()=>applyPreset(presetId)} disabled={!modified}>선택 프리셋 복원</button><button className="copy-button satin-reset" type="button" onClick={resetSatinMirror}>Satin Mirror로 돌아가기</button></div>
     </div>
     <div className="field-grid">
      <label><span>Label</span><input value={label} maxLength={18} onChange={e=>setLabel(e.target.value)}/></label>
      <label className="toggle-field"><span>Disabled</span><button type="button" role="switch" aria-checked={disabled} className={disabled?"on":""} onClick={()=>setDisabled(v=>!v)}><i/></button></label>
     </div>
     <label className="range-field"><span>Width <b>{width}px</b></span><input type="range" min="280" max="680" step="10" value={width} onChange={e=>setWidth(Number(e.target.value))}/></label>
     <label className="range-field"><span>Height <b>{height}px</b></span><input type="range" min="96" max="200" step="2" value={height} onChange={e=>setHeight(Number(e.target.value))}/></label>
     <label className="range-field"><span>Surface specular <b>{specular.toFixed(2)}×</b></span><input aria-label="Surface specular intensity" type="range" min="0" max="10" step="0.05" value={specular} onChange={e=>setSpecular(Number(e.target.value))}/></label>
     <p className="tuning-note">모든 프리셋은 같은 셰이더를 사용해요. 넓은 범위는 작은 값도 섬세하게 조절할 수 있게 간격을 나눴어요. 표시된 숫자는 실제 적용값이에요.</p>
     {controlGroups.map(group=><fieldset className="optical-tuning" key={group.id} aria-label={group.label}>
      <legend>{group.label}</legend>
      <p>{group.note}</p>
      {OPTICAL_CONTROLS.filter(control=>control.group===group.id).map(control=>{
       const logarithmic=control.scale==="log"&&control.min>0;
       const nonlinear=logarithmic||control.scale==="power";
       const value=opticalOptions[control.key];
       const contextHint=control.key==="rainbowSpacing"&&opticalOptions.iridescence===0&&opticalOptions.diffraction===0
        ? "색 코팅이나 회절 강도를 올리면 간격의 차이가 보여요."
        : control.key==="facetScale"&&opticalOptions.facetStrength===0
         ? "격자 요철을 올리면 셀 밀도의 차이가 보여요."
         : control.key==="directionality"&&opticalOptions.reflectionBlur===0
          ? "반사 블러를 올리면 방향성의 차이가 보여요.":null;
       return <label className="range-field" key={control.key}>
        <span>{control.label}<b>{formatOpticalValue(value,control.unit)}</b></span>
        <input aria-label={control.label} aria-describedby={[control.hint?"hint-"+control.key:null,contextHint?"context-"+control.key:null].filter(Boolean).join(" ")||undefined} aria-valuetext={formatOpticalValue(value,control.unit)} data-optical-control={control.key} data-scale={logarithmic?"log":control.scale==="power"?"power":"linear"} type="range" min={nonlinear?0:control.min} max={nonlinear?1:control.max} step={nonlinear?.001:control.step} value={toSliderValue(value,control)} onChange={event=>setOpticalOptions(previous=>normalizeOpticalOptions({...previous,[control.key]:fromSliderValue(Number(event.target.value),control)}))}/>
        {control.hint&&<small className="control-hint" id={"hint-"+control.key}>{control.hint}</small>}
        {contextHint&&<small className="control-hint contextual-hint" id={"context-"+control.key}>{contextHint}</small>}
       </label>;
      })}
     </fieldset>)}
    </div>
    <div className="live-stage">
     <div className="stage-meta"><span>RESULT</span><em>{materialLabel}</em></div>
     <HolographicButton motion={motion} variant="satin-mirror" width={"min(100%, "+width+"px)"} height={height} specular={specular} opticalOptions={opticalOptions} disabled={disabled} onClick={()=>setActivated(v=>v+1)}>{label||"BUTTON"}</HolographicButton>
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
   <div className="section-intro compact"><p className="section-index">03 / PRESETS</p><h2>One surface.<br/>Many starting points.</h2><p>Every sample uses the same shader with a different set of numbers. These fixed examples stay unchanged while you tune the playground. Satin Mirror preserves the accepted neutral baseline.</p></div>
   <div className="material-grid">{OPTICAL_PRESETS.map((preset,index)=><article key={preset.id}><div><span>{"0"+(index+1)}</span><h3>{preset.label}</h3><p>{DEMO_PRESET_NOTES[preset.id]??preset.note}</p></div><HolographicButton motion={motion} variant="satin-mirror" opticalOptions={preset.options} specular={preset.specular} height={112} onClick={()=>setActivated(v=>v+1)}>{preset.label.toUpperCase()}</HolographicButton></article>)}</div>
  </section>

  <section className="api section-frame" id="api">
   <div className="section-intro"><p className="section-index">04 / API</p><h2>Small surface.<br/>Native behavior.</h2><p>The component adds material-specific props and inherits the rest from React’s native button type.</p></div>
   <div className="api-content">
    <div className="api-block"><h3>HolographicButton</h3><div className="api-table" role="table">
     {[
      ["motion","HolographicMotion","required","Shared matrix from the hook."],
      ["variant","HolographicVariant","spectral-film","This demo uses satin-mirror with numeric presets. Legacy variants remain available in the package."],
      ["children","ReactNode","ACTIVATE","Visible primary content."],
      ["width","CSS width","CSS default","Number or any CSS width."],
      ["height","CSS height","CSS default","Number or any CSS height."],
      ["opticalOptions","Partial<OpticalOptions>","Satin baseline","Numeric controls for the unified satin-mirror shader. Presets fill the same options."],
      ["mirrorOptions","Partial<MirrorOptions>","legacy alias","The earlier tuning API remains supported for compatibility."],
      ["specular","number | boolean","1","Highlight strength: 0 = off, 1 = original, above 1 = stronger. Boolean values remain supported."],
     ].map(row=><div className="api-row" role="row" key={row[0]}><code>{row[0]}</code><span>{row[1]}</span><em>{row[2]}</em><p>{row[3]}</p></div>)}
    </div><div className="native-strip"><b>Also forwards</b><span>on*</span><span>disabled</span><span>type / name / value / form</span><span>aria-* / data-*</span><span>className / style / ref</span></div></div>
    <div className="api-block"><h3>useHolographicMotion</h3><div className="hook-card"><code>const motion = useHolographicMotion(&#123;<br/>  pointerFallback: true,<br/>  requestOnFirstInteraction: true,<br/>  telemetry: false<br/>&#125;);</code><p>Use one instance per group. Reactive <code>telemetry</code> is opt-in, so the default path does not re-render the tree for diagnostics. The library renders no HUD.</p></div>
    <div className="support-card"><span>PRESET API</span><h4>Numbers, ready to tune.</h4><p><code>OPTICAL_PRESETS</code> supplies each complete option set and its specular strength. <code>OPTICAL_CONTROLS</code> describes the ranges; <code>DEFAULT_OPTICAL_OPTIONS</code> and <code>normalizeOpticalOptions</code> provide the neutral baseline and safe normalization.</p></div>
    <div className="support-card"><span>GEOMETRY NOTE</span><h4>The pill is intentional.</h4><p>Arbitrary corner radius is not exposed because the DOM clipping, WebGL signed-distance field, and reflective rim must describe the same contour.</p></div></div>
   </div>
  </section>

  <section className="closing">
   <p>READY FOR A LITTLE TOO MUCH BUTTON?</p><h2>Give the interface<br/><i>a surface.</i></h2><a href="#install">Install {PACKAGE} <span>↗</span></a>
  </section>

  <footer><div><span className="brand-mark"/><b>Holographic Button</b><small>MIT © 2026 ChanJin Park</small></div><p>Inspired by <a href="https://x.com/luciascarlet/status/1930614317541474598" target="_blank" rel="noreferrer">Lucia Scarlet’s holographic controls ↗</a></p><div><a href="#top">Top ↑</a><a href="https://github.com/neocjmix/holographic-button" target="_blank" rel="noreferrer">GitHub ↗</a></div></footer>
 <p style={{fontSize:12,opacity:.65}}>Legacy Sticker Foil adapted from <a href="https://github.com/bpisano/Sticker">bpisano/Sticker</a> · <a href="./THIRD_PARTY_NOTICES.md">MIT notice</a></p>
 </main>;
}
