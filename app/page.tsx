"use client";
import {useCallback,useEffect,useRef,useState} from "react";
type Tilt={x:number;y:number}; type Kind="CSS"|"SVG"|"Canvas"|"WebGL";
const clamp=(n:number)=>Math.max(-1,Math.min(1,n));

function Frame({kind,tilt,children,activate}:{kind:Kind;tilt:Tilt;children:React.ReactNode;activate:(k:Kind)=>void}){
 const style={"--rx":(-tilt.y*9)+"deg","--ry":(tilt.x*12)+"deg","--mx":(50+tilt.x*42)+"%",
  "--my":(50+tilt.y*42)+"%","--shine":(tilt.x*34+tilt.y*17)+"deg"} as React.CSSProperties;
 return <article className="demo-row"><div className="tech-label"><span>{kind}</span><i/></div>
  <button className="tilt-stage" style={style} onClick={()=>activate(kind)} aria-label={"Activate "+kind+" holographic button"}>
   <span className="button-shadow"/><span className="button-plane">{children}</span></button></article>;
}
const Copy=({label,n}:{label:string;n:string})=><span className="cta-copy"><b>{label}</b><em>{n}</em></span>;
function CssButton(){return <span className="css-holo holo-surface"><span className="css-spectrum"/>
 <span className="microgrid"/><span className="edge-light"/><Copy label="EXPLORE" n="01"/></span>}

function SvgButton({tilt}:{tilt:Tilt}){
 const gx=50+tilt.x*42,gy=50+tilt.y*42;
 return <span className="svg-holo holo-surface"><svg viewBox="0 0 720 190" preserveAspectRatio="none" aria-hidden="true">
  <defs><linearGradient id="spectrum" x1={(gx-55)+"%"} y1={(gy-45)+"%"} x2={(gx+55)+"%"} y2={(gy+45)+"%"}>
   <stop offset="0" stopColor="#090d18"/><stop offset=".16" stopColor="#ff67ce"/><stop offset=".32" stopColor="#675cff"/>
   <stop offset=".49" stopColor="#54e9ff"/><stop offset=".64" stopColor="#dfff6a"/><stop offset=".8" stopColor="#ff8d52"/>
   <stop offset="1" stopColor="#111526"/></linearGradient>
   <radialGradient id="glint" cx={gx+"%"} cy={gy+"%"} r="52%"><stop offset="0" stopColor="white" stopOpacity=".94"/>
    <stop offset=".1" stopColor="#caffff" stopOpacity=".56"/><stop offset=".3" stopColor="#795cff" stopOpacity=".16"/>
    <stop offset="1" stopColor="#000" stopOpacity="0"/></radialGradient>
   <filter id="foil" x="-10%" y="-30%" width="120%" height="160%"><feTurbulence type="fractalNoise" baseFrequency=".012 .18" numOctaves="3" seed="7" result="grain"/>
    <feColorMatrix in="grain" values="1 0 0 0 .1 0 1 0 0 .12 0 0 1 0 .16 0 0 0 .42 0" result="colored"/>
    <feBlend in="SourceGraphic" in2="colored" mode="screen" result="base"/><feSpecularLighting in="grain" surfaceScale="7"
     specularConstant="1.1" specularExponent="28" lightingColor="#e9ffff" result="spec">
     <fePointLight x={360+tilt.x*290} y={95+tilt.y*100} z="95"/></feSpecularLighting>
    <feComposite in="spec" in2="SourceAlpha" operator="in" result="clip"/><feBlend in="base" in2="clip" mode="screen"/></filter>
   <filter id="bump" x="-5%" y="-15%" width="110%" height="130%"><feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur"/>
    <feSpecularLighting in="blur" surfaceScale="8" specularConstant="1.2" specularExponent="24" lightingColor="white" result="shine">
     <feDistantLight azimuth={230+tilt.x*60} elevation="48"/></feSpecularLighting>
    <feComposite in="shine" in2="SourceAlpha" operator="in" result="shineClip"/><feBlend in="SourceGraphic" in2="shineClip" mode="screen"/></filter>
  </defs><rect x="4" y="4" width="712" height="182" rx="91" fill="url(#spectrum)" filter="url(#foil)"/>
  <rect x="5" y="5" width="710" height="180" rx="90" fill="url(#glint)"/>
  <rect x="9" y="9" width="702" height="172" rx="86" fill="none" stroke="rgba(255,255,255,.6)" strokeWidth="5" filter="url(#bump)"/>
  <path d="M88 139 C202 66 403 46 637 89" fill="none" stroke="white" strokeOpacity=".16" strokeWidth="2"/>
 </svg><Copy label="DISCOVER" n="02"/></span>;
}

function CanvasButton({tilt}:{tilt:Tilt}){
 const ref=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{const c=ref.current;if(!c)return;const r=c.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);
  const w=Math.max(1,Math.round(r.width*d)),h=Math.max(1,Math.round(r.height*d));if(c.width!==w||c.height!==h){c.width=w;c.height=h}
  const x=c.getContext("2d");if(!x)return;x.clearRect(0,0,w,h);x.save();x.beginPath();x.roundRect(2*d,2*d,w-4*d,h-4*d,h/2);x.clip();
  const a=Math.atan2(tilt.y+.28,tilt.x+.16),cx=w*(.5+tilt.x*.34),cy=h*(.5+tilt.y*.28),len=Math.hypot(w,h);
  const g=x.createLinearGradient(cx-Math.cos(a)*len,cy-Math.sin(a)*len,cx+Math.cos(a)*len,cy+Math.sin(a)*len);
  const stops:Array<[number,string]>=[[0,"#080a12"],[.16,"#6c4bff"],[.31,"#ff56c7"],[.46,"#ffd36f"],[.59,"#6effd0"],
   [.73,"#54a7ff"],[.88,"#bd5cff"],[1,"#090b14"]];stops.forEach(s=>g.addColorStop(s[0],s[1]));x.fillStyle=g;x.fillRect(0,0,w,h);
  const img=x.getImageData(0,0,w,h),data=img.data;for(let py=0;py<h;py++)for(let px=0;px<w;px++){const i=(py*w+px)*4;if(!data[i+3])continue;
   const wave=Math.sin(px*.074+py*.12)+Math.sin(px*.013-py*.22)*.55;
   const grain=Math.abs((Math.sin(px*12.9898+py*78.233)*43758.5453)%1),dx=(px-cx)/w,dy=(py-cy)/h;
   const glint=Math.max(0,1-Math.sqrt(dx*dx+dy*dy)*6),lift=wave*5+grain*8+glint*105;
   data[i]=Math.min(255,data[i]+lift);data[i+1]=Math.min(255,data[i+1]+lift*1.08);data[i+2]=Math.min(255,data[i+2]+lift*1.2)}
  x.putImageData(img,0,0);const bloom=x.createRadialGradient(cx,cy,0,cx,cy,w*.27);
  bloom.addColorStop(0,"rgba(255,255,255,.82)");bloom.addColorStop(.12,"rgba(180,255,255,.38)");bloom.addColorStop(1,"rgba(30,0,255,0)");
  x.globalCompositeOperation="screen";x.fillStyle=bloom;x.fillRect(0,0,w,h);x.globalCompositeOperation="source-over";
  const rim=x.createLinearGradient(0,0,0,h);rim.addColorStop(0,"rgba(255,255,255,.95)");rim.addColorStop(.14,"rgba(255,255,255,.1)");
  rim.addColorStop(.78,"rgba(0,0,0,.5)");rim.addColorStop(1,"rgba(255,255,255,.55)");x.strokeStyle=rim;x.lineWidth=5*d;
  x.beginPath();x.roundRect(4*d,4*d,w-8*d,h-8*d,h/2);x.stroke();x.restore()},[tilt]);
 return <span className="canvas-holo holo-surface"><canvas ref={ref}/><Copy label="CONTINUE" n="03"/></span>;
}

const VS="attribute vec2 position;varying vec2 uv;void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}";
const FS="precision highp float;varying vec2 uv;uniform vec2 tilt,resolution;"+
"float rr(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return min(max(q.x,q.y),0.)+length(max(q,0.))-r;}"+
"vec3 spectral(float x){return .55+.45*cos(6.28318*(x+vec3(.00,.33,.67)));}"+
"float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}"+
"void main(){vec2 p=uv-.5;float a=resolution.x/resolution.y;p.x*=a;float d=rr(p,vec2(a*.485,.465),.44);"+
"float aa=fwidth(d)*1.5,alpha=1.-smoothstep(-aa,aa,d);if(alpha<.01)discard;vec2 light=vec2(.5)+tilt*vec2(.34,.28),v=uv-light;"+
"float ang=atan(v.y,v.x),rad=length(v),film=uv.x*1.9+uv.y*.8+tilt.x*.9-tilt.y*.55+sin(uv.y*46.+tilt.x*5.)*.032+sin(uv.x*17.-uv.y*9.)*.055;"+
"vec3 c=mix(vec3(.018,.022,.04),spectral(film*1.12+sin(ang*2.)*.07),.63+pow(clamp(rad*1.9,0.,1.),2.2)*.22);"+
"c=mix(c,spectral(film*.63-rad*1.7+.26),.25);float glint=pow(max(0.,1.-rad*4.1),4.),rim=1.-smoothstep(-.055,-.004,d);"+
"c+=glint*vec3(1.3,1.55,1.75)+rim*vec3(.58,.7,.82);c+=hash(floor(uv*resolution*.55))*.07+(.5+.5*sin((uv.x*resolution.x+uv.y*37.)*.22))*.025;"+
"c*=.78+(.5-uv.y)*.25;gl_FragColor=vec4(c,alpha);}";
function makeShader(gl:WebGLRenderingContext,type:number,source:string){const s=gl.createShader(type)!;gl.shaderSource(s,source);gl.compileShader(s);return s}
function WebglButton({tilt}:{tilt:Tilt}){
 const ref=useRef<HTMLCanvasElement>(null);useEffect(()=>{const c=ref.current;if(!c)return;const gl=c.getContext("webgl",{antialias:true,alpha:true});if(!gl)return;
  const r=c.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);c.width=Math.round(r.width*d);c.height=Math.round(r.height*d);const p=gl.createProgram()!;
  gl.attachShader(p,makeShader(gl,gl.VERTEX_SHADER,VS));gl.attachShader(p,makeShader(gl,gl.FRAGMENT_SHADER,FS));gl.linkProgram(p);gl.useProgram(p);
  const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  const pos=gl.getAttribLocation(p,"position");gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
  gl.uniform2f(gl.getUniformLocation(p,"tilt"),tilt.x,tilt.y);gl.uniform2f(gl.getUniformLocation(p,"resolution"),c.width,c.height);
  gl.viewport(0,0,c.width,c.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.drawArrays(gl.TRIANGLES,0,6)},[tilt]);
 return <span className="webgl-holo holo-surface"><canvas ref={ref}/><span className="webgl-caustic"/><Copy label="ENTER" n="04"/></span>;
}

export default function Home(){
 const[tilt,setTilt]=useState<Tilt>({x:0,y:0}),[motion,setMotion]=useState<"idle"|"active"|"denied">("idle"),[alert,setAlert]=useState<Kind|null>(null);
 const target=useRef<Tilt>({x:0,y:0});useEffect(()=>{let raf=0;const tick=()=>{setTilt(p=>({x:p.x+(target.current.x-p.x)*.11,
  y:p.y+(target.current.y-p.y)*.11}));raf=requestAnimationFrame(tick)};raf=requestAnimationFrame(tick);return()=>cancelAnimationFrame(raf)},[]);
 useEffect(()=>{const move=(e:PointerEvent)=>{if(motion==="active"||e.pointerType==="touch")return;
  target.current={x:clamp((e.clientX/innerWidth-.5)*2),y:clamp((e.clientY/innerHeight-.5)*2)}};addEventListener("pointermove",move,{passive:true});
  return()=>removeEventListener("pointermove",move)},[motion]);
 const orientation=useCallback((e:DeviceOrientationEvent)=>{target.current={x:clamp((e.gamma||0)/28),y:clamp(((e.beta||0)-35)/32)}},[]);
 const enable=async()=>{try{const D=DeviceOrientationEvent as typeof DeviceOrientationEvent&{requestPermission?:()=>Promise<"granted"|"denied">};
  const p=typeof D.requestPermission==="function"?await D.requestPermission():"granted";if(p!=="granted"){setMotion("denied");return}
  addEventListener("deviceorientation",orientation,true);setMotion("active")}catch{setMotion("denied")}};
 useEffect(()=>()=>removeEventListener("deviceorientation",orientation,true),[orientation]);
 return <main className="lab-shell"><header className="lab-header"><div><p className="eyebrow">INTERACTION MATERIAL STUDY <span>№ 004</span></p>
  <h1>Holographic<br/><i>CTA</i> Lab</h1></div><div className="header-tools"><button className={"motion-toggle "+motion} onClick={enable} disabled={motion==="active"}>
  <span className="motion-dot"/>{motion==="active"?"MOTION LIVE":motion==="denied"?"MOTION BLOCKED":"ENABLE MOTION"}</button>
  <p>Tilt your phone<br/>or move the pointer.</p></div></header>
  <section className="button-stack" aria-label="Four holographic CTA implementations">
   <Frame kind="CSS" tilt={tilt} activate={setAlert}><CssButton/></Frame><Frame kind="SVG" tilt={tilt} activate={setAlert}><SvgButton tilt={tilt}/></Frame>
   <Frame kind="Canvas" tilt={tilt} activate={setAlert}><CanvasButton tilt={tilt}/></Frame><Frame kind="WebGL" tilt={tilt} activate={setAlert}><WebglButton tilt={tilt}/></Frame>
  </section><footer><span>Four render paths</span><span>One optical behavior</span><span>2026</span></footer>
  {alert&&<div className="alert-backdrop" onPointerDown={e=>{if(e.target===e.currentTarget)setAlert(null)}}><div className="alert-card" role="alertdialog" aria-modal="true" aria-labelledby="alert-title">
   <div className="alert-icon">✓</div><p className="alert-kicker">INTERACTION CONFIRMED</p><h2 id="alert-title">{alert} is alive.</h2>
   <p>The holographic surface responded as a real CTA button.</p><button autoFocus onClick={()=>setAlert(null)}>CLOSE <span>×</span></button>
  </div></div>}</main>;
}
