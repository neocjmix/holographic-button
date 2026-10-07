// CPU analytical reference, not a GPU render. Samples the central flat face;
// derivative micro-bump is omitted for Brushed/Pearl, while their base noise and
// palettes remain. GLSL/WGSL view, spectral phases, spectrum, BRDF and radiance
// gains can be injected directly from shader source by the accompanying tests.
const add=(a,b)=>a.map((v,i)=>v+(Array.isArray(b)?b[i]:b));
const mul=(a,b)=>a.map((v,i)=>v*(Array.isArray(b)?b[i]:b));
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const norm=a=>mul(a,1/Math.hypot(...a));
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const fract=x=>x-Math.floor(x);
const hash=p=>fract(Math.sin(dot(p,[127.1,311.7]))*43758.5453);
const mix=(a,b,t)=>add(mul(a,1-t),mul(b,t));
const noise=p=>{const i=p.map(Math.floor),f=p.map(fract).map(x=>x*x*(3-2*x)),a=hash(i)*(1-f[0])+hash(add(i,[1,0]))*f[0],b=hash(add(i,[0,1]))*(1-f[0])+hash(add(i,[1,1]))*f[0];return a*(1-f[1])+b*f[1]};
const spectrum=t=>[0,.67,.33].map(x=>(.5+.5*Math.cos(6.28318*(t+x)))**1.35);
const rot=(v,[x,y])=>{x*=Math.PI/180;y*=Math.PI/180;const q=[v[0],v[1]*Math.cos(x)-v[2]*Math.sin(x),v[1]*Math.sin(x)+v[2]*Math.cos(x)];return [q[0]*Math.cos(y)+q[2]*Math.sin(y),q[1],-q[0]*Math.sin(y)+q[2]*Math.cos(y)]};
const smooth=(a,b,x)=>{x=clamp((x-a)/(b-a),0,1);return x*x*(3-2*x)};
const env=(r,si)=>{let c=mix([.012,.014,.019],[.095,.105,.125],smooth(-.35,.7,r[1]));c=add(c,mul([.1,.115,.13],Math.exp(-((Math.abs(r[1]+.08)*7)**2))));const d=norm([-.32,.72,.61]);c=add(c,mul(add(mul([.56,.6,.64],Math.max(dot(r,d),0)**46),mul([2.4,2.15,1.8],Math.max(dot(r,d),0)**240)),si));return add(c,mul(add(mul([.32,.08,.13],Math.max(dot(r,norm([.88,.05,.47])),0)**90),mul([.06,.13,.27],Math.max(dot(r,norm([-.86,-.12,.5])),0)**110)),si))};
const brdf=(nh,nl,nv,vh,r)=>{const a=r*r,a2=a*a,d=nh*nh*(a2-1)+1,ggx=a2/(3.14159*d*d),gv=nl*Math.sqrt(nv*nv*(1-a2)+a2),gl=nv*Math.sqrt(nl*nl*(1-a2)+a2);return ggx*.5/Math.max(gv+gl,.00001)*(.75+.25*(1-vh)**5)};
export function shade({uv,aspect=4,pose=[0,0],distance=5,gain=.12,primary=.08,secondary=.025,intensity=1,method=0,math={}}){
 const spectral=math.spectrum??spectrum,conductor=math.brdf??brdf;
 const p=[(uv[0]-.5)*aspect,uv[1]-.5];let micro=[0,0];const cell=uv.map((x,i)=>Math.floor(x*[24,7][i]));if(method===3)micro=mul([hash(cell)-.5,hash(add(cell,7.31))-.5],.075);
 const grain=noise(mul(uv,[720,115]));if(method===1)micro=[Math.sin(uv[0]*1380+noise(mul(uv,[7,29]))*8)*.010,0];
 const n=norm([...micro,1]),nw=norm(rot(n,pose)),vw=norm(rot(math.view?math.view({x:p[0],y:p[1]}):norm([-p[0],-p[1],distance]),pose)),rw=norm(add(mul(vw,-1),mul(nw,2*dot(vw,nw)))),l=norm([-.12,-.66,.74]),l2=norm([.72,-.12,.68]),h=norm(add(l,vw));
 const si=intensity*1.55,ndl=Math.max(dot(nw,l),0),ndl2=Math.max(dot(nw,l2),0),ndv=clamp(dot(nw,vw),.001,1),rough=clamp(.24+[.11,.23,.18,.09][method]*.4+(grain-.5)*.012,.26,.38),b=conductor(Math.max(dot(nw,h),0),ndl,ndv,clamp(dot(vw,h),0,1),rough),spec=b*ndl*si*gain,fres=.18+.82*(1-ndv)**5,inc=dot(nw,l),e=env(rw,si);let color,phase;
 if(method===0){phase=math.sweep?math.sweep(Object.assign([...rw],{x:rw[0],y:rw[1],z:rw[2]})):dot(rw,norm([.76,.18,.62]))*.58+rw[1]*.16+.08;color=mul(spectral(phase),.68+fres*.42)}
 if(method===1){const streak=.5+.5*Math.sin(uv[0]*920+noise(mul(uv,[8,37]))*5),glint=streak**18;phase=dot(rw,norm([.82,.08,.56]))*1.72+.46;const petrol=add([.018,.055,.068],mul(spectral(phase),.24));color=add(mul(petrol,.52+.34*ndl),mul(spectral(uv[0]*.4+inc),glint*.34))}
 if(method===2){const optical=(1-Math.abs(inc))*1.58+noise(mul(uv,[5,3]))*.07+.18;phase=optical;color=mul([1,1.29,1.61].map((x,i)=>.72+.20*Math.cos(6.28318*(optical*x+[.02,.24,.51][i]))),.64+fres*.48)}
 if(method===3){phase=math.band?math.band(rw,cell):dot(rw,norm([.67,.29,.68]))*3.15+hash(cell)*.18;color=mul(spectral(phase),.48+.62*(.42+.58*(.5+.5*Math.cos(6.28318*phase))**5))}
 const h2=norm(add(l2,vw)),surfaceSpec=b*ndl*primary+conductor(Math.max(dot(nw,h2),0),ndl2,ndv,clamp(dot(vw,h2),0,1),rough)*ndl2*secondary;let metal=add(add(mul(e,[.46,.72,.31,1.02][method]),color),spec*[.72,1.12,.58,1.48][method]);metal=add(metal,mul(add([surfaceSpec,surfaceSpec,surfaceSpec],mul(e,(.75+.25*(1-ndv)**5)*.10)),si));metal=mul(metal,1-((uv[0]-.5)**2+(uv[1]-.5)**2)*.34);const out=metal.map(x=>(x/(x+.78))**.86);
 const vignette=1-((uv[0]-.5)**2+(uv[1]-.5)**2)*.34;
 const nonSpecular=mul(add(mul(env(rw,0),[.46,.72,.31,1.02][method]),color),vignette);
 const decode=x=>x>.04045?((x+.055)/1.055)**2.4:x/12.92;
 const encode=x=>x>.0031308?1.055*x**(1/2.4)-.055:x*12.92;
 const hdrColor=out.map((c,i)=>{const excess=Math.max(metal[i]-Math.max(nonSpecular[i],1),0);return excess>0?encode(decode(c)+3*excess/(3+excess)):c});
 return {phase,metal,nonSpecular,color:out,hdrColor,chroma:Math.max(...out)-Math.min(...out),normal:nw,view:vw};
}
export function stats(options={}){const samples=Array.from({length:161},(_,i)=>shade({...options,uv:[.12+.76*i/160,.5]})),channels=[0,1,2].map(c=>samples.map(s=>s.color[c]));return {phaseSpan:Math.max(...samples.map(s=>s.phase))-Math.min(...samples.map(s=>s.phase)),chromaMean:samples.reduce((s,v)=>s+v.chroma,0)/samples.length,chromaMin:Math.min(...samples.map(s=>s.chroma)),colorRange:Math.max(...channels.map(v=>Math.max(...v)-Math.min(...v))),highlightMax:Math.max(...samples.flatMap(s=>s.metal)),whiteFraction:samples.filter(s=>s.chroma<.10).length/samples.length,hdrPeak:Math.max(...samples.flatMap(s=>s.hdrColor)),hdrRelativeChromaMean:samples.reduce((sum,s)=>sum+(Math.max(...s.hdrColor)-Math.min(...s.hdrColor))/Math.max(...s.hdrColor),0)/samples.length,hdrExcessFraction:samples.filter(s=>Math.max(...s.hdrColor)>1).length/samples.length};}
