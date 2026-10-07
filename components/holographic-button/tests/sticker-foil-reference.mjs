// Source-executed, double-precision analytical reference. This is NOT a GPU or
// display test: rasterization, derivatives and device float precision differ.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

export const componentSource = await readFile(new URL('../index.tsx', import.meta.url), 'utf8');
export const rendererSource = await readFile(new URL('../hdr-renderer.ts', import.meta.url), 'utf8');
export const glsl = JSON.parse(componentSource.match(/const FS=(\[[\s\S]*?\])\.join\("\\n"\);/)[1]).join('\n');
export const wgsl = rendererSource.split('/* wgsl */ `')[1].split('`;')[0];
export const clamp = (x,lo=0,hi=1) => Math.max(lo,Math.min(hi,x));
export const mix = (a,b,t) => a*(1-t)+b*t;
export const smoothstep = (a,b,x) => {const t=clamp((x-a)/(b-a));return t*t*(3-2*t)};
export const decode = c => c>.04045 ? ((c+.055)/1.055)**2.4 : c/12.92;
export const encode = c => c>.0031308 ? 1.055*c**(1/2.4)-.055 : c*12.92;
export const dot = (a,b) => a.reduce((s,v,i)=>s+v*b[i],0);
export const norm = v => {const l=Math.hypot(...v);return v.map(x=>x/l)};
export const luminance = c => dot(c,[.2126,.7152,.0722]);
export function bodyOf(shader,signature) {
 const at=shader.indexOf(signature);assert.notEqual(at,-1,signature);
 const start=shader.indexOf('{',at);let depth=1,end=start+1;
 for(;depth&&end<shader.length;end++){if(shader[end]==='{')depth++;if(shader[end]==='}')depth--}
 assert.equal(depth,0,signature);return shader.slice(start+1,end-1);
}
const scalarBuiltins={
 sin:Math.sin,cos:Math.cos,floor:Math.floor,sqrt:Math.sqrt,pow:Math.pow,
 asin:Math.asin,abs:Math.abs,atan:Math.atan2,atan2:Math.atan2,min:Math.min,max:Math.max,fract:x=>x-Math.floor(x),clamp,mix,smoothstep,
 vec2:(...v)=>v.length===1?[v[0],v[0]]:v,
 vec3f:x=>({x,y:x,z:x}),decodeSRGB:v=>({x:decode(v.x)}),encodeSRGB:v=>({x:encode(v.x)}),
};
export function scalarFunction(shader,signature,parameters,bindings={}) {
 const body=bodyOf(shader,signature).replace(/\bfloat\s+/g,'let ').replace(/\bvec2f\(/g,'vec2(');
 const bound={...scalarBuiltins,...bindings};
 return new Function(...Object.keys(bound),...parameters,body).bind(null,...Object.values(bound));
}
const functionParameters={
 stickerRandom:['x','y'],stickerNoise:['x','y'],stickerDiamond:['x','y','aspect'],
 stickerPhase:['position','transform'],stickerMotion:['axis'],
 stickerChannel:['channel','x','y','tx','ty','width','height','base'],
 stickerGlare:['x','y','tx','ty','aspect'],stickerReflectedBase:['base','glare','intensity'],stickerSdr:['base'],
};
const mul=(a,b)=>{const o=new Array(9).fill(0);for(let r=0;r<3;r++)for(let c=0;c<3;c++)for(let k=0;k<3;k++)o[r*3+c]+=a[r*3+k]*b[k*3+c];return o};
const matrixFunction=new Function('rad','mul','alpha','beta','gamma','screenAngle',bodyOf(componentSource,'function attitudeMatrix(')).bind(null,n=>n*Math.PI/180,mul);
export const attitude = ([beta=0,gamma=0,alpha=0]=[]) => Array.from(matrixFunction(alpha,beta,gamma,0));
export const distance = (uv,aspect) => {
 const p=[(uv[0]-.5)*aspect,uv[1]-.5],q=[Math.abs(p[0])-aspect*.488+.43,Math.abs(p[1])-.465+.43];
 return Math.min(Math.max(...q),0)+Math.hypot(...q.map(x=>Math.max(x,0)))-.43;
};
export function sourceModel(shader,language) {
 const model={};
 for(const [name,parameters] of Object.entries(functionParameters))model[name]=scalarFunction(shader,`${language==='GLSL'?'float':'fn'} ${name}(`,parameters,model);
 model.rim=scalarFunction(shader,`${language==='GLSL'?'vec2':'fn'} rimProfile(`,['inward']);
 if(language==='WGSL')model.stickerHdr=scalarFunction(shader,'fn stickerHdr(',['base','intensity'],model);
 model.shade=({uv,aspect=4,pose=[0,0,0],matrix=attitude(pose),intensity=1,height=148,transform,sourceBase=1}={})=>{
   const width=aspect*height;
   const tilt=transform??[model.stickerMotion(-matrix[2]),model.stickerMotion(matrix[5])];
   // Public analytical UV is top-left, matching SwiftUI. Both fragment paths
   // explicitly invert their legacy bottom-left Y before these scalar calls.
   const glare=model.stickerGlare(...uv,...tilt,aspect);
   const incoming=model.stickerReflectedBase(sourceBase,glare,intensity);
   const base=[0,1,2].map(c=>model.stickerChannel(c,...uv,...tilt,width,height,incoming));
   const color=base.map(model.stickerSdr);
   const hdrColor=model.stickerHdr?base.map(c=>model.stickerHdr(c,intensity)):color;
   const d=distance(uv,aspect),alpha=1-smoothstep(-1.5/height,1.5/height,d);
   return {base,color,hdrColor,glare,tilt,pattern:model.stickerDiamond(...uv,aspect),alpha:alpha<.01?0:alpha};
 };
 return model;
}
// Independent literal upstream oracle, not extracted from our shader. Based on
// bpisano/Sticker commit301b9e0 FoilShader.metal, ReflectionShader.metal and
// StickerEffectParameter.swift. Double precision, no Metal half emulation.
export function upstream({uv,transform=[0,0],width=592,height=148,sourceBase=1,intensity=1}) {
 const fract=x=>x-Math.floor(x);
 const random=p=>fract(Math.sin(p[0]*12.9898+p[1]*78.233)*43758.5453);
 const noise=p=>{
  const i=p.map(Math.floor),f=p.map(fract),u=f.map(x=>x*x*(3-2*x));
  const a=random(i),b=random([i[0]+1,i[1]]),c=random([i[0],i[1]+1]),d=random([i[0]+1,i[1]+1]);
  return a*(1-u[0])+b*u[0]+(c-a)*u[1]*(1-u[0])+(d-b)*u[0]*u[1];
 };
 const position=[uv[0]*width,uv[1]*height],size=[width,height];
 const offset=transform.map((t,i)=>t*size[i]*-150);
 const q=position.map((p,i)=>p/(size[i]*3)+(offset[i]+size[i]*250)/(size[i]*3)*.01);
 const normalized=[position[0]*(width/height),position[1]];
 const checkerUV=normalized.map((p,i)=>p/size[i]*5*5);
 const angle=45*Math.PI/180;
 const rotated=[Math.cos(angle)*checkerUV[0]-Math.sin(angle)*checkerUV[1],Math.sin(angle)*checkerUV[0]+Math.cos(angle)*checkerUV[1]];
 const pattern=(Math.floor(rotated[0])+Math.floor(rotated[1]))%2===0?0:1;
 const jitter=random(position)*.1;
 const foil=[.9+.25*Math.sin(q[0]*10+jitter),.9+.25*Math.cos(q[1]*10+jitter),.9+.25*Math.sin((q[0]+q[1])*10-jitter)];
 const reflectionRadius=Math.min(width,height)/2/width;
 const glare=1-smoothstep(0,reflectionRadius,Math.hypot(uv[0]-(.5+transform[0]),uv[1]-(.5+transform[1])));
 const reflectionAlpha=clamp(.3*Math.max(intensity,0)*glare);
 const reflected=sourceBase*(1-reflectionAlpha)+reflectionAlpha;
 const luma=c=>c[0]*.299+c[1]*.587+c[2]*.114;
 const blend=Math.max(smoothstep(.2,1,reflected)*.8,.3);
 let color=foil.map(c=>reflected*(1-blend)+c*blend);
 const contrast=(rgb,pattern)=>{const factor=1+(.2*pattern*luma(rgb));return rgb.map(c=>(c-.5)*factor+.5)};
 color=contrast(color,pattern);
 color=contrast(color,noise([position[0]/width*100,position[1]/height*100]));
 return {color,glare,pattern};
}
export const models=[['GLSL',sourceModel(glsl,'GLSL')],['WGSL',sourceModel(wgsl,'WGSL')]];
export function samples(model,options={},width=121,height=33) {
 const output=[];
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
   const uv=[(x+.5)/width,(y+.5)/height];
   if(distance(uv,options.aspect??4)<-.09)output.push(model.shade({...options,uv}));
 }
 return output;
}
