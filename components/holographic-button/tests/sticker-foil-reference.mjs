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
 min:Math.min,max:Math.max,fract:x=>x-Math.floor(x),clamp,mix,smoothstep,
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
 stickerPhaseX:['x','tiltX','aspect'],stickerPhaseY:['y','tiltY'],
 stickerChannel:['channel','x','y','tiltX','tiltY','aspect'],
 stickerGlare:['x','y','centerX','centerY','radius'],stickerSdr:['base','glare','intensity'],
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
 if(language==='WGSL')model.stickerHdr=scalarFunction(shader,'fn stickerHdr(',['base','glare','intensity'],model);
 // Evaluate the actual two-light composition expression from each source.
 const shine=shader.match(/(?:float|let) stickerShine\s*=\s*([^;]+);/)[1];
 const composeShine=new Function('stickerGlare','p','stickerCenter','stickerCenter2',`return ${shine};`).bind(null,model.stickerGlare);
 const centerScale=Number(shader.match(/stickerCenter\s*=\s*-reflect\([^;]+?\)\.xy\s*\*\s*([.\d]+)/)[1]);
 model.shade=({uv,aspect=4,pose=[0,0,0],matrix=attitude(pose),intensity=1,height=160}={})=>{
   const p=[(uv[0]-.5)*aspect,uv[1]-.5],d=distance(uv,aspect),step=1e-5;
   const dx=(distance([uv[0]+step/aspect,uv[1]],aspect)-distance([uv[0]-step/aspect,uv[1]],aspect))/(2*step);
   const dy=(distance([uv[0],uv[1]+step],aspect)-distance([uv[0],uv[1]-step],aspect))/(2*step);
   const gd=norm([dx+.00001,dy+.00001]);
   const rim=model.rim(Math.max(-d,0));
   const normal=norm([gd[0]*rim[1],gd[1]*rim[1],1]);
   const columns=[matrix.slice(0,3),matrix.slice(3,6),matrix.slice(6,9)];
   const tilt=columns[2].slice(0,2);
   const centers=[[-.12,-.66,.74],[.72,-.12,.68]].map(light=>{
     const l=norm(light),local=columns.map(column=>dot(column,l)),nl=dot(local,normal);
     return local.slice(0,2).map((v,i)=>(v-2*nl*normal[i])*centerScale);
   });
   const point=v=>({x:v[0],y:v[1]});
   const glare=composeShine(point(p),point(centers[0]),point(centers[1]));
   const base=[0,1,2].map(c=>model.stickerChannel(c,...uv,...tilt,aspect));
   const color=base.map(c=>model.stickerSdr(c,glare,intensity));
   const hdrColor=model.stickerHdr?base.map(c=>model.stickerHdr(c,glare,intensity)):color;
   const aa=Math.max(1.5*(Math.abs(dx)+Math.abs(dy))/height,.0015);
   const alpha=1-smoothstep(-aa,aa,d);
   return {base,color,hdrColor,glare,centers,normal,tilt,pattern:model.stickerDiamond(...uv,aspect),alpha:alpha<.01?0:alpha};
 };
 return model;
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
