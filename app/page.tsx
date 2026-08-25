"use client";
import {useCallback,useEffect,useRef,useState} from "react";

type Permission="idle"|"requesting"|"granted"|"denied"|"unavailable";
type Telemetry={permission:Permission;signal:"waiting"|"live"|"stale";source:"none"|"orientation"|"motion"|"pointer";
 alpha:number|null;beta:number|null;gamma:number|null;events:number;hz:number;age:number|null;normal:[number,number,number];secure:boolean};
const rad=(n:number)=>n*Math.PI/180;
const fmt=(n:number|null)=>n===null?"—":n.toFixed(1)+"°";

function mul(a:number[],b:number[]){
 const o=new Array(9).fill(0);for(let r=0;r<3;r++)for(let c=0;c<3;c++)for(let k=0;k<3;k++)o[r*3+c]+=a[r*3+k]*b[k*3+c];return o;
}
function attitudeMatrix(alpha:number,beta:number,gamma:number,screenAngle:number){
 const a=rad(alpha),b=rad(beta),g=rad(gamma),s=rad(-screenAngle),ca=Math.cos(a),sa=Math.sin(a),cb=Math.cos(b),sb=Math.sin(b),
  cg=Math.cos(g),sg=Math.sin(g),cs=Math.cos(s),ss=Math.sin(s);
 const rz=[ca,-sa,0,sa,ca,0,0,0,1],rx=[1,0,0,0,cb,-sb,0,sb,cb],ry=[cg,0,sg,0,1,0,-sg,0,cg],screen=[cs,-ss,0,ss,cs,0,0,0,1];
 const m=mul(mul(mul(rz,rx),ry),screen);
 return new Float32Array([m[0],m[3],m[6],m[1],m[4],m[7],m[2],m[5],m[8]]);
}
function surfaceNormal(m:Float32Array):[number,number,number]{return[m[6],m[7],m[8]]}

const VS="attribute vec2 position;varying vec2 uv;void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}";
const FS=[
"#extension GL_OES_standard_derivatives : enable",
"precision highp float;varying vec2 uv;uniform vec2 resolution;uniform mat3 worldFromDevice;uniform float time;uniform vec4 material;uniform float method;",
"float sdRoundRect(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return min(max(q.x,q.y),0.)+length(max(q,0.))-r;}",
"float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}",
"float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1)),f.x),f.y);}",
"vec3 spectrum(float t){vec3 c=.5+.5*cos(6.2831853*(t+vec3(.00,.67,.33)));return pow(c,vec3(1.35));}",
"float ggx(float ndh,float rough){float a=rough*rough,a2=a*a,d=ndh*ndh*(a2-1.)+1.;return a2/(3.14159*d*d);}",
"vec3 environment(vec3 r){",
" vec3 col=mix(vec3(.012,.014,.019),vec3(.095,.105,.125),smoothstep(-.35,.7,r.y));",
" float horizon=exp(-pow(abs(r.y+.08)*7.,2.));col+=horizon*vec3(.10,.115,.13);",
" vec3 boxDir=normalize(vec3(-.32,.72,.61));float soft=pow(max(dot(r,boxDir),0.),46.);",
" float core=pow(max(dot(r,boxDir),0.),240.);col+=soft*vec3(.56,.60,.64)+core*vec3(2.4,2.15,1.8);",
" float sideA=pow(max(dot(r,normalize(vec3(.88,.05,.47))),0.),90.);",
" float sideB=pow(max(dot(r,normalize(vec3(-.86,-.12,.5))),0.),110.);col+=sideA*vec3(.32,.08,.13)+sideB*vec3(.06,.13,.27);",
" float ceiling=smoothstep(.72,.92,r.y)*(.55+.45*sin(atan(r.z,r.x)*5.));col+=ceiling*vec3(.22,.235,.25);return col;}",
"void main(){",
" vec2 p=uv-.5;float aspect=resolution.x/resolution.y;p.x*=aspect;",
" float d=sdRoundRect(p,vec2(aspect*.488,.465),.43);float aa=max(fwidth(d)*1.5,.0015);float alpha=1.-smoothstep(-aa,aa,d);if(alpha<.01)discard;",
" vec2 grad=normalize(vec2(dFdx(d),dFdy(d))+vec2(.00001));float inward=max(-d,0.);",
" float ringMask=1.-smoothstep(.095,.12,inward);float ringPhase=clamp(inward/.095,0.,1.)*6.28318;",
" float ringHeight=-sin(ringPhase)*ringMask;float ringSlope=-cos(ringPhase)*ringMask;",
" float grain=noise(uv*vec2(720.,115.));float brush=sin(uv.x*1380.+noise(uv*vec2(7.,29.))*8.);",
" vec2 micro=vec2(0.);if(method>.5&&method<1.5)micro=vec2(brush*.010,dFdy(grain)*.08);",
" if(method>1.5&&method<2.5)micro=vec2(dFdx(noise(uv*vec2(16.,9.))),dFdy(noise(uv*vec2(16.,9.))))*.035;",
" vec2 cell=floor(uv*vec2(24.,7.));if(method>2.5)micro=(vec2(hash(cell),hash(cell+7.31))-.5)*.075;",
" vec3 shapeN=normalize(vec3(p.x*.18,p.y*.38,1.));vec3 n=normalize(vec3(shapeN.xy+grad*ringSlope*.78+micro,1.-abs(ringHeight)*.18));vec3 nw=normalize(worldFromDevice*n);",
" vec3 v=vec3(0,0,1),vw=normalize(worldFromDevice*v),rw=normalize(reflect(-vw,nw));",
" vec3 light=normalize(vec3(-.10,.16,.982)),light2=normalize(vec3(.72,-.12,.68));",
" float ndl=max(dot(nw,light),0.),ndl2=max(dot(nw,light2),0.),ndv=max(dot(nw,vw),.001);",
" vec3 h=normalize(light+vw);float spec=ggx(max(dot(nw,h),0.),mix(material.z,material.z+.11,grain))*ndl;",
" float fresnel=.18+.82*pow(1.-ndv,5.);vec3 env=environment(rw);",
" float incidence=dot(nw,light);vec3 metal;",
" if(method<.5){float sweep=dot(rw,normalize(vec3(.76,.18,.62)))*.58+rw.y*.16+.08;vec3 film=spectrum(sweep);metal=env*.46+film*(.68+fresnel*.42)+vec3(spec)*.72;}",
" else if(method<1.5){float streak=.5+.5*sin(uv.x*920.+noise(uv*vec2(8.,37.))*5.);float glint=pow(streak,18.);vec3 petrol=vec3(.018,.055,.068)+spectrum(dot(rw,normalize(vec3(.82,.08,.56)))*1.72+.46)*.24;metal=env*.72+petrol*(.52+.34*ndl)+glint*spectrum(uv.x*.4+incidence)*.34+vec3(spec)*1.12;}",
" else if(method<2.5){float optical=(1.-abs(incidence))*1.58+noise(uv*vec2(5.,3.))*.07+.18;vec3 pearl=.72+.20*cos(6.28318*(optical*vec3(1.,1.29,1.61)+vec3(.02,.24,.51)));metal=env*.31+pearl*(.64+fresnel*.48)+vec3(spec)*.58;}",
" else{float facet=hash(cell);float band=dot(rw,normalize(vec3(.67,.29,.68)))*3.15+facet*.18;vec3 prism=spectrum(band);float ribbon=.42+.58*pow(.5+.5*cos(6.28318*band),5.);metal=env*1.02+prism*(.48+.62*ribbon)+vec3(spec)*1.48;}",
" vec3 shapeNW=normalize(worldFromDevice*shapeN);float shapeNdL=max(dot(shapeNW,light),0.);float shapeNdH=max(dot(shapeNW,h),0.);float bodySpec=min(ggx(shapeNdH,.18)*shapeNdL*.105,2.2);float keySpec=pow(shapeNdH,92.)*1.05;float softSpec=pow(shapeNdH,18.)*.32;metal+=vec3(bodySpec+keySpec+softSpec)+ndl2*vec3(.075,.025,.045);",
" float raised=max(ringHeight,0.),recessed=max(-ringHeight,0.);metal+=raised*(environment(rw)*1.25+vec3(.13));",
" metal*=1.-recessed*.34;metal+=pow(max(ringSlope,0.),6.)*vec3(.28,.3,.33);",
" float vignette=1.-dot(uv-.5,uv-.5)*.34;metal*=vignette;metal=metal/(metal+vec3(.78));",
" gl_FragColor=vec4(pow(max(metal,0.),vec3(.86)),alpha);}"
].join("\n");

function compile(gl:WebGLRenderingContext,type:number,source:string){
 const s=gl.createShader(type)!;gl.shaderSource(s,source);gl.compileShader(s);
 if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s)||"Shader compile failed");return s;
}
function ReflectiveButton({matrix,onClick,label,index,material,method}:{matrix:React.RefObject<Float32Array>;onClick:()=>void;label:string;index:string;material:[number,number,number,number];method:number}){
 const canvas=useRef<HTMLCanvasElement>(null),[error,setError]=useState(false);
 useEffect(()=>{const c=canvas.current;if(!c)return;let raf=0;
  try{const gl=c.getContext("webgl",{alpha:true,antialias:true,premultipliedAlpha:true});if(!gl){setError(true);return}
   gl.getExtension("OES_standard_derivatives");const program=gl.createProgram()!;
   gl.attachShader(program,compile(gl,gl.VERTEX_SHADER,VS));gl.attachShader(program,compile(gl,gl.FRAGMENT_SHADER,FS));gl.linkProgram(program);
   if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program)||"Program link failed");gl.useProgram(program);
   const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
   const pos=gl.getAttribLocation(program,"position");gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
   const uRes=gl.getUniformLocation(program,"resolution"),uWorld=gl.getUniformLocation(program,"worldFromDevice"),uTime=gl.getUniformLocation(program,"time"),uMaterial=gl.getUniformLocation(program,"material"),uMethod=gl.getUniformLocation(program,"method");
   const draw=(now:number)=>{const r=c.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2),w=Math.max(1,Math.round(r.width*dpr)),h=Math.max(1,Math.round(r.height*dpr));
    if(c.width!==w||c.height!==h){c.width=w;c.height=h;gl.viewport(0,0,w,h)}gl.uniform2f(uRes,w,h);gl.uniformMatrix3fv(uWorld,false,matrix.current);
    gl.uniform1f(uTime,now*.001);gl.uniform4f(uMaterial,material[0],material[1],material[2],material[3]);gl.uniform1f(uMethod,method);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.drawArrays(gl.TRIANGLES,0,6);raf=requestAnimationFrame(draw)};
   raf=requestAnimationFrame(draw);return()=>cancelAnimationFrame(raf);
  }catch{setError(true)}
 },[matrix]);
 return <button className="sticker-stage" onClick={onClick} aria-label="Activate reflective holographic button">
  <span className="sticker-shadow"/><span className="sticker-body">{error?<span className="webgl-error">WEBGL UNAVAILABLE</span>:<canvas ref={canvas}/>}
   <span className="sticker-copy"><small>{label}</small><b>ACTIVATE</b><em>{index}</em></span>
  </span></button>;
}

function HUD({data}:{data:Telemetry}){
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
 </aside>;
}

export default function Home(){
 const matrix=useRef<Float32Array>(attitudeMatrix(0,0,0,0)),pointer=useRef({x:0,y:0});
 const permission=useRef<Permission>("idle"),stats=useRef({events:0,first:0,last:0,lastOrientation:0,lastPaint:0});
 const[hud,setHud]=useState<Telemetry>({permission:"idle",signal:"waiting",source:"none",alpha:null,beta:null,gamma:null,events:0,hz:0,age:null,normal:[0,0,1],secure:true});
 const[alert,setAlert]=useState<string|null>(null);
 const publish=useCallback((raw:Partial<Telemetry>,force=false)=>{const now=performance.now();if(!force&&now-stats.current.lastPaint<80)return;stats.current.lastPaint=now;
  setHud(old=>({...old,...raw,permission:permission.current,events:stats.current.events,hz:stats.current.events*1000/Math.max(1,now-stats.current.first),
   age:stats.current.last?Math.round(now-stats.current.last):null,secure:window.isSecureContext}))},[]);
 const consume=useCallback((alpha:number,beta:number,gamma:number,source:"orientation"|"motion")=>{
  const screenAngle=((screen.orientation?.angle??Number((window as Window&{orientation?:number}).orientation)??0)+360)%360;
  matrix.current=attitudeMatrix(alpha,beta,gamma,screenAngle);const now=performance.now();stats.current.events++;stats.current.first ||=now;stats.current.last=now;
  if(source==="orientation")stats.current.lastOrientation=now;permission.current="granted";
  publish({signal:"live",source,alpha,beta,gamma,normal:surfaceNormal(matrix.current)},false);
 },[publish]);
 useEffect(()=>{setHud(h=>({...h,secure:window.isSecureContext}));
  const orient=(e:DeviceOrientationEvent)=>{if(typeof e.beta==="number"&&typeof e.gamma==="number")consume(typeof e.alpha==="number"?e.alpha:0,e.beta,e.gamma,"orientation")};
  const motion=(e:DeviceMotionEvent)=>{if(performance.now()-stats.current.lastOrientation<600)return;const g=e.accelerationIncludingGravity;
   if(!g||typeof g.x!=="number"||typeof g.y!=="number"||typeof g.z!=="number")return;
   consume(0,Math.atan2(-g.y,g.z)*180/Math.PI,Math.atan2(g.x,Math.hypot(g.y,g.z))*180/Math.PI,"motion")};
  addEventListener("deviceorientation",orient,true);addEventListener("deviceorientationabsolute",orient as EventListener,true);addEventListener("devicemotion",motion,true);
  const timer=setInterval(()=>{const now=performance.now(),age=stats.current.last?Math.round(now-stats.current.last):null;
   setHud(h=>({...h,age,signal:age!==null&&age<900?"live":permission.current==="granted"?"stale":"waiting"}))},400);
  return()=>{removeEventListener("deviceorientation",orient,true);removeEventListener("deviceorientationabsolute",orient as EventListener,true);removeEventListener("devicemotion",motion,true);clearInterval(timer)}
 },[consume]);
 useEffect(()=>{const move=(e:PointerEvent)=>{if(hud.signal==="live")return;pointer.current={x:(e.clientX/innerWidth-.5)*70,y:(e.clientY/innerHeight-.5)*70};
   matrix.current=attitudeMatrix(pointer.current.x,pointer.current.y*.65,pointer.current.x*.45,0);publish({source:"pointer",alpha:pointer.current.x,beta:pointer.current.y*.65,gamma:pointer.current.x*.45,normal:surfaceNormal(matrix.current)},false)};
  addEventListener("pointermove",move,{passive:true});return()=>removeEventListener("pointermove",move)},[hud.signal,publish]);
 useEffect(()=>{const O=window.DeviceOrientationEvent as typeof DeviceOrientationEvent&{requestPermission?:()=>Promise<"granted"|"denied">};
  const M=window.DeviceMotionEvent as typeof DeviceMotionEvent&{requestPermission?:()=>Promise<"granted"|"denied">};
  const needsGesture=typeof O?.requestPermission==="function"||typeof M?.requestPermission==="function";
  if(!needsGesture){permission.current=O?"granted":"unavailable";publish({permission:permission.current,signal:"waiting"},true);return}
  const request=async()=>{permission.current="requesting";publish({permission:"requesting",signal:"waiting"},true);try{
   const asks:Promise<"granted"|"denied">[]=[];if(typeof O.requestPermission==="function")asks.push(O.requestPermission());if(typeof M.requestPermission==="function")asks.push(M.requestPermission());
   const results=await Promise.all(asks);permission.current=results.every(v=>v==="granted")?"granted":"denied";publish({permission:permission.current,signal:permission.current==="denied"?"stale":"waiting"},true);
  }catch{permission.current="denied";publish({permission:"denied",signal:"stale"},true)}};
  const firstTouch=()=>void request();addEventListener("pointerdown",firstTouch,{once:true,capture:true});return()=>removeEventListener("pointerdown",firstTouch,true);
 },[publish]);
 const variants=[
  {label:"SPECTRAL FILM / BROAD SWEEP",index:"01",method:0,material:[.08,.72,.11,.55] as [number,number,number,number]},
  {label:"PETROL / BRUSHED FOIL",index:"02",method:1,material:[.46,.48,.23,.82] as [number,number,number,number]},
  {label:"PEARL / THIN-FILM",index:"03",method:2,material:[.78,.62,.18,.32] as [number,number,number,number]},
  {label:"PRISM / FACET CHROME",index:"04",method:3,material:[1.18,1.05,.09,1.0] as [number,number,number,number]},
 ];
 return <main className="lab-shell"><header><div><p className="eyebrow">OPTICAL MATERIAL STUDY <span>WEBGL / 04</span></p>
  <h1>World-Space<br/><i>Hologram</i></h1></div><p className="intro">A metallic diffraction surface.<br/>Lit by a fixed world, not an animation.</p></header>
  <section className="hero"><div className="axis-label"><span>MATERIAL VARIATIONS</span><i/></div><div className="variation-grid">
   {variants.map(v=><article className="variation" key={v.index}><ReflectiveButton matrix={matrix} label={v.label} index={v.index} material={v.material} method={v.method} onClick={()=>setAlert(v.label)}/></article>)}
  </div><div className="material-note"><span>RECESSED → RAISED RIM</span><span>BODY SPECULAR</span><span>WORLD LIGHTS</span></div>
  </section><footer><span>DEVICE ATTITUDE → SURFACE NORMAL → REFLECTION VECTOR<br/><a href="https://dribbble.com/shots/25057911-Holographic-CTA" target="_blank" rel="noreferrer">INSPIRED BY RTHWIK GOPINATH — HOLOGRAPHIC CTA ↗</a></span><span>2026</span></footer>
  <HUD data={hud}/>
  {alert&&<div className="alert-backdrop" onPointerDown={e=>{if(e.target===e.currentTarget)setAlert(null)}}><div className="alert-card" role="alertdialog" aria-modal="true">
   <div className="alert-icon">✓</div><p>{alert}</p><h2>Surface activated.</h2><button autoFocus onClick={()=>setAlert(null)}>CLOSE <span>×</span></button>
  </div></div>}
 </main>;
}
