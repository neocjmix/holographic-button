// Source-executed scalar helpers plus explicit vector algebra in double precision.
// This is an analytical reference, NOT GPU rasterization or HDR display evidence.
import {transform} from 'esbuild';
import {glsl,wgsl,rendererSource,scalarFunction,norm,dot,attitude,models,smoothstep,distance,encode} from './sticker-foil-reference.mjs';
const {code}=await transform(rendererSource,{loader:'ts',format:'esm'});
export const options=await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
export {glsl,wgsl};
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const add=(a,b)=>a.map((v,i)=>v+b[i]),sub=(a,b)=>a.map((v,i)=>v-b[i]),mul=(a,k)=>a.map(v=>v*k);
const basis=models[0][1].basis;
export function opticalModel(source=glsl,language='glsl',input={}) {
 const o=options.normalizeOpticalOptions(input);
 const A={x:o.diffraction,y:o.rainbowSpacing,z:o.reflectionBlur,w:o.directionality},B={x:o.bubbles,y:o.scratches,z:o.ridgeWidth,w:o.ridgeHeight},C={x:o.iridescence,y:o.facetStrength,z:o.facetScale,w:o.gratingAngle*Math.PI/180},material={y:148};
 const bindings={exp:Math.exp,step:(e,x)=>x<e?0:1,mirrorA:A,mirrorB:B,opticalC:C,material,u:{mirrorA:A,mirrorB:B,opticalC:C,material},vec3:(...v)=>v,vec3f:(...v)=>v,hash:p=>{const v=Math.sin(dot(p,[127.1,311.7]))*43758.5453;return v-Math.floor(v)}};
 const f={};
 for(const [name,args,result] of [
  ['mirrorRect',['x','y','cx','cy','hx','hy'],'float'],['mirrorRoom',['horizontal','vertical','forward','intensity'],'float'],['opticalRect',['x','y','cx','cy','hx','hy','softness'],'float'],['opticalRoom',['horizontal','vertical','forward','intensity','softness'],'float'],['mirrorWeight',['i'],'float'],['mirrorHeight',['x','y'],'float'],['rimProfile',['inward'],'vec2'],['mirrorRim',['inward'],'vec2'],['mirrorTunedHeight',['x','y'],'float'],['opticalGrid',['x','y'],'vec3'],['opticalCoatingChannel',['horizontal','vertical','cellPhase','offset'],'float'],
 ])f[name]=scalarFunction(source,`${language==='wgsl'?'fn':result} ${name}(`,args,{...bindings,...f});
 const reflection=(r,tangent,intensity)=>{
  const projected=sub(tangent,mul(r,dot(tangent,r))),t=mul(projected,1/Math.max(Math.hypot(...projected),.00001)),b=cross(r,t);
  const stretch=Math.sqrt(Math.max(o.directionality,1)),softness=.11*Math.max(0,o.reflectionBlur*stretch-1);
  const transverse=(.15556349186*(1-Math.min(o.directionality,1))+.009*Math.min(o.directionality,1))/Math.max(o.directionality,1);
  let total=0;
  for(let x=-2;x<=2;x++)for(let y=-1;y<=1;y++){
   const ray=norm(add(add(r,mul(t,x*.11*o.reflectionBlur*stretch)),mul(b,y*transverse*o.reflectionBlur)));
   const radiance=o.reflectionBlur===1&&o.directionality===1?f.mirrorRoom(...basis.map(a=>dot(ray,a)),intensity):f.opticalRoom(...basis.map(a=>dot(ray,a)),intensity,softness);
   total+=radiance*f.mirrorWeight(x)*(2-Math.abs(y))/64;
  }return total;
 };
 const order=(r,n,t,wavelength,order,intensity,neutral)=>{
  const g=norm(sub(t,mul(n,dot(t,n)))),parallel=add(sub(r,mul(n,dot(r,n))),mul(g,order*wavelength/(1.2*o.rainbowSpacing))),q=dot(parallel,parallel);
  if(q>=1)return neutral;
  const ray=add(parallel,mul(n,Math.sqrt(Math.max(0,1-q))));
  const visibility=smoothstep(0,.08,1-q);return neutral*(1-visibility)+reflection(ray,t,intensity)*visibility;
 };
 const shade=({pose=[62.9,1.1,0],matrix=attitude(pose),x=0,y=0,aspect=4,height=148,intensity=5,viewOffset=[0,0]}={})=>{
  material.y=height;
  const world=v=>[0,1,2].map(i=>matrix[i]*v[0]+matrix[i+3]*v[1]+matrix[i+6]*v[2]);
  const uv=[x/aspect+.5,.5-y],eps=.00001,d=distance(uv,aspect);
  const dx=(distance([uv[0]+eps/aspect,uv[1]],aspect)-distance([uv[0]-eps/aspect,uv[1]],aspect))/(2*eps),dy=(distance([uv[0],uv[1]-eps],aspect)-distance([uv[0],uv[1]+eps],aspect))/(2*eps),gd=norm([dx+.00001,dy+.00001]);
  const slope=f.mirrorRim(Math.max(0,-d))[1],grid=o.facetStrength>0?f.opticalGrid(x,y):[0,0,0];
  const micro=[(f.mirrorTunedHeight(x+.0005,y)-f.mirrorTunedHeight(x-.0005,y))/.001,(f.mirrorTunedHeight(x,y+.0005)-f.mirrorTunedHeight(x,y-.0005))/.001];
  const n=norm(world(norm([gd[0]*slope-micro[0]+grid[0],gd[1]*slope-micro[1]+grid[1],1]))),v=norm(world([-x+viewOffset[0],-y+viewOffset[1],5])),r=sub(mul(n,2*dot(n,v)),v),t=world([Math.cos(C.w),Math.sin(C.w),0]);
  const neutral=.015+.78*reflection(r,t,intensity),efficiency=o.diffraction/(1+o.diffraction);
  const radiance=[.650,.530,.460].map((w,i)=>{
   let c=neutral;
   if(o.diffraction>0)c=neutral*(1-efficiency)+(.015+.78*.5*(order(r,n,t,w,1,intensity,(neutral-.015)/.78)+order(r,n,t,w,-1,intensity,(neutral-.015)/.78)))*efficiency;
   if(o.iridescence>0)c*=f.opticalCoatingChannel(dot(r,basis[0]),dot(r,basis[1]),grid[2],[0,.67,.33][i]);
   return c;
  });
  const peak=Math.max(...radiance),color=radiance.map(c=>encode(c/(1+peak))),hdr=radiance.map(encode);
  const alpha=1-smoothstep(-1.5/height,1.5/height,d);
  return {radiance,color,hdr,alpha:alpha<.01?0:alpha,grid,n,r,t,neutral};
 };
 return {o,...f,reflection,order,shade};
}
