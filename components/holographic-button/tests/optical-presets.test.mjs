import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {opticalModel,options,glsl,wgsl} from './optical-reference.mjs';
import {bodyOf,scalarFunction,models,norm,dot,attitude,encode} from './sticker-foil-reference.mjs';
const {DEFAULT_OPTICAL_OPTIONS:D,DEFAULT_MIRROR_OPTIONS:legacy,OPTICAL_OPTION_LIMITS:L,OPTICAL_PRESETS:P,OPTICAL_CONTROLS:C,normalizeOpticalOptions:clean}=options;
const normalize=s=>s.replace(/u\./g,'').replace(/\b(?:let|var|int|float|vec2|vec3)\s+/g,'').replace(/: i32/g,'').replace(/\b(?:vec2f|vec3f)\(/g,m=>m.replace('f','')).replace(/f32\(/g,'float(').replace(/[{}\s]/g,'');
test('presets are immutable complete numeric options with no renderer selectors',()=>{
 assert.equal(P.length,4);assert.deepEqual(P[0].options,D);assert.equal(P[0].specular,5);
 assert.equal(C.length,Object.keys(D).length);assert.equal(new Set(C.map(x=>x.key)).size,C.length);
 for(const p of P){assert.ok(Object.isFrozen(p)&&Object.isFrozen(p.options));assert.deepEqual(Object.keys(p.options).sort(),Object.keys(D).sort());assert.deepEqual(clean(p.options),p.options);assert.ok(!('method' in p)&&!('variant' in p));}
 for(const c of C)assert.deepEqual([c.min,c.max],L[c.key]);
 for(const [key,[lo,hi]]of Object.entries(L)){
  for(const invalid of [NaN,Infinity,-Infinity,undefined,null,'1'])assert.equal(clean({[key]:invalid})[key],D[key]);
  assert.equal(clean({[key]:-1e99})[key],lo);assert.equal(clean({[key]:1e99})[key],hi);
 }
 for(const key of Object.keys(legacy))assert.equal(D[key],legacy[key]);
});
test('all new and modified optical equations are identical across backends',()=>{
 for(const [name,result]of [['opticalRect','float'],['opticalRoom','float'],['mirrorTunedReflection','float'],['opticalGrid','vec3'],['opticalCoatingChannel','float'],['opticalCoating','vec3'],['opticalRadiance','vec3']])assert.equal(normalize(bodyOf(glsl,`${result} ${name}(`)),normalize(bodyOf(wgsl,`fn ${name}(`)),name);
 assert.match(glsl,/color=color\/\(1\.\+max\(color.r,max\(color.g,color.b\)\)\)/);
 assert.match(wgsl,/stickerEncode\(color.r\)/);
});
test('source-executed scalar optics and full CPU output agree in both shader languages',()=>{
 for(const p of P){const a=opticalModel(glsl,'glsl',p.options),b=opticalModel(wgsl,'wgsl',p.options);
  for(const pose of [[0,0,0],[62.9,1.1,0],[50,-15,0],[75,15,0]])for(let i=0;i<19;i++){
   const args={pose,x:-1.8+i*.2,y:Math.sin(i)*.3};assert.deepEqual(a.shade(args),b.shade(args));
  }
 }
});
test('zero coating/facets preserves the exact original neutral room response',()=>{
 const m=opticalModel();
 for(let i=0;i<40;i++){
  const sample=m.shade({x:-1.8+i*.09,y:Math.sin(i)*.3});
  assert.deepEqual(sample.radiance,[sample.neutral,sample.neutral,sample.neutral]);
  assert.equal(sample.color[0],encode(sample.neutral/(1+sample.neutral)));
 }
 assert.deepEqual(m.opticalGrid(.33,.12),[0,0,0]);
});
test('every colored preset changes with pose and viewer and has useful chroma near recovery',()=>{
 for(const p of P.slice(1)){
  const m=opticalModel(glsl,'glsl',p.options);let chroma=0,poseDelta=0,viewDelta=0;
  for(let i=0;i<33;i++){
   const q={x:-1.7+i*.10625,y:.083},a=m.shade(q),b=m.shade({...q,pose:[50,15,0]}),c=m.shade({...q,viewOffset:[.5,.1]});
   chroma+=Math.max(...a.color)-Math.min(...a.color);poseDelta+=a.color.reduce((v,x,j)=>v+Math.abs(x-b.color[j]),0);viewDelta+=a.color.reduce((v,x,j)=>v+Math.abs(x-c.color[j]),0);
  }
  assert.ok(chroma/33>.10,`${p.id} chroma ${chroma/33}`);assert.ok(poseDelta/33>.04,p.id);assert.ok(viewDelta/33>.02,p.id);
 }
});
test('coating remains active above one; facets and scale are attached to the surface',()=>{
 const a=opticalModel(glsl,'glsl',{...P[2].options,iridescence:1}),b=opticalModel(glsl,'glsl',{...P[2].options,iridescence:2});
 assert.notDeepEqual(a.shade().radiance,b.shade().radiance);
 const cell=a.opticalGrid(.2,.1);a.shade({pose:[0,0,0]});assert.deepEqual(a.opticalGrid(.2,.1),cell);
 const c=opticalModel(glsl,'glsl',{...P[2].options,facetScale:40});assert.notDeepEqual(cell,c.opticalGrid(.2,.1));
});
test('all endpoints and mixed extremes remain finite, bounded and preserve flat center at the widest ridge',()=>{
 const configs=[Object.fromEntries(Object.entries(L).map(([k,v])=>[k,v[0]])),Object.fromEntries(Object.entries(L).map(([k,v])=>[k,v[1]]))];
 for(let i=0;i<32;i++)configs.push(Object.fromEntries(Object.entries(L).map(([k,v],j)=>[k,v[(i>>j)%2]])));
 for(const cfg of configs){const m=opticalModel(glsl,'glsl',cfg);for(const pose of [[0,0,0],[62.9,1.1,0],[180,90,270],[-90,-90,180]])for(const x of [-1.8,0,1.8])for(const v of m.shade({pose,x}).radiance)assert.ok(Number.isFinite(v)&&v>=0&&v<10);}
 const m=opticalModel(glsl,'glsl',{ridgeWidth:L.ridgeWidth[1],ridgeHeight:L.ridgeHeight[1]});assert.deepEqual(m.mirrorRim(.465),[0,0]);
});
test('new uniforms are live and presets never become effect dependencies or component keys',async()=>{
 const s=await readFile(new URL('../index.tsx',import.meta.url),'utf8');
 assert.match(s,/opticalOptions:\(\)=>mirrorTuning.current/);
 assert.match(s,/gl.uniform4f\(uoc,mt.iridescence,mt.facetStrength,mt.facetScale,mt.gratingAngle\*Math.PI\/180\)/);
 for(const deps of s.matchAll(/\},\[([^\]]+)\]\)/g))assert.ok(!/opticalOptions|mirrorOptions/.test(deps[1]));
});
test('every optical slider produces a measurable image change within its supported range',()=>{
 const probes=[[-.61,.12],[.44,-.2],[1.15,.03],[-.14,-.0612],[-.1,-.066],[.5,-.14],[0,.40],[1.65,.22],[-1.7,-.2],[-.81,.07],[.31,-.07]];
 for(const key of Object.keys(D).filter(k=>k!=='recoverySeconds')){
  const base={...P[2].options,bubbles:1,scratches:1,reflectionBlur:1};
  const a=opticalModel(glsl,'glsl',{...base,[key]:L[key][0]}),b=opticalModel(glsl,'glsl',{...base,[key]:L[key][1]});let delta=0;
  for(const pose of [[62.9,1.1,0],[50,-15,0]])for(const [x,y]of probes){const A=a.shade({x,y,pose}).color,B=b.shade({x,y,pose}).color;delta=Math.max(delta,...A.map((v,i)=>Math.abs(v-B[i])));}
  assert.ok(delta>.005,`${key} endpoint image delta ${delta}`);
 }
});
test('vanishing diffraction orders retain zero-order reflection instead of blackening the surface',()=>{
 const m=opticalModel(glsl,'glsl',{diffraction:8,rainbowSpacing:.25,iridescence:0});
 // At normal incidence d=.3um is below every RGB wavelength. All six orders vanish.
 const n=[0,0,1],r=[0,0,1],t=[1,0,0],neutral=m.reflection(r,t,5);
 for(const wavelength of [.65,.53,.46])for(const direction of [-1,1])assert.equal(m.order(r,n,t,wavelength,direction,5,neutral),neutral);
});
test('default complete analytical output matches frozen pre-edit preview14 radiance',async()=>{
 const fixture=JSON.parse(await readFile(new URL('./preview14-neutral-oracle.json',import.meta.url),'utf8'));
 assert.equal(fixture.sourceCommit,'440348c08a51565d6aa8dbdfa7914673c1c3331a');assert.equal(fixture.samples.length,112);
 for(const s of fixture.samples){const result=opticalModel().shade(s);for(const c of result.radiance)assert.ok(Math.abs(c-s.radiance)<5e-13,JSON.stringify(s));}
});
