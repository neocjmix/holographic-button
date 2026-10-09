import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {transform} from 'esbuild';
import {glsl,wgsl,componentSource,rendererSource,bodyOf,scalarFunction,norm,dot,attitude,models,smoothstep,distance} from './sticker-foil-reference.mjs';
const loadTs=async text=>{const {code}=await transform(text,{loader:'ts',format:'esm'});return import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)};
const {DEFAULT_MIRROR_OPTIONS:D,MIRROR_OPTION_LIMITS:L,normalizeMirrorOptions:clean}=await loadTs(rendererSource);
const recoverySource=await readFile(new URL('../foil-recovery.ts',import.meta.url),'utf8');
const {createFoilRecovery}=await loadTs(recoverySource);
const fixture=JSON.parse(await readFile(new URL('./preview13-mirror-oracle.json',import.meta.url),'utf8'));
const hash=s=>createHash('sha256').update(s).digest('hex');
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const mul=(a,k)=>a.map(v=>v*k);
const add=(a,b)=>a.map((v,i)=>v+b[i]);
const basis=models[0][1].basis;
export function analytical(source,language,options={}) {
 const o=clean(options),A={x:o.diffraction,y:o.rainbowSpacing,z:o.reflectionBlur,w:o.directionality},B={x:o.bubbles,y:o.scratches,z:o.ridgeWidth,w:o.ridgeHeight};
 const bindings={exp:Math.exp,step:(e,x)=>x<e?0:1,mirrorA:A,mirrorB:B,u:{mirrorA:A,mirrorB:B}};
 const functions={};
 for(const [name,args]of Object.entries({mirrorRect:['x','y','cx','cy','hx','hy'],mirrorRoom:['horizontal','vertical','forward','intensity'],mirrorWeight:['i'],mirrorHeight:['x','y'],rimProfile:['inward'],mirrorRim:['inward'],mirrorTunedHeight:['x','y']})){
  const kind=language==='wgsl'?'fn':name.includes('Rim')||name==='rimProfile'?'vec2':'float';
  functions[name]=scalarFunction(source,`${kind} ${name}(`,args,{...bindings,...functions});
 }
 const reflection=(r,tangent,intensity)=>{
  const t=norm(sub(tangent,mul(r,dot(tangent,r)))),b=cross(r,t);
  const transverse=(.15556349186*(1-Math.min(o.directionality,1))+.009*Math.min(o.directionality,1))/Math.max(o.directionality,1);
  let total=0;
  for(let x=-2;x<=2;x++)for(let y=-1;y<=1;y++){
   const ray=norm(add(add(r,mul(t,x*.11*o.reflectionBlur)),mul(b,y*transverse*o.reflectionBlur)));
   total+=functions.mirrorRoom(...basis.map(a=>dot(ray,a)),intensity)*functions.mirrorWeight(x)*(2-Math.abs(y))/64;
  }return total;
 };
 const order=(r,n,t,wavelength,order,intensity)=>{
  const g=norm(sub(t,mul(n,dot(t,n)))),parallel=add(sub(r,mul(n,dot(r,n))),mul(g,order*wavelength/(1.2*o.rainbowSpacing))),q=dot(parallel,parallel);
  if(q>=1)return 0;
  const ray=add(parallel,mul(n,Math.sqrt(Math.max(0,1-q))));
  return reflection(ray,t,intensity)*smoothstep(0,.08,1-q);
 };
 const shade=(pose=[62.9,1.1,0],x=0,y=0)=>{
  const mat=attitude(pose),world=v=>[0,1,2].map(i=>mat[i]*v[0]+mat[i+3]*v[1]+mat[i+6]*v[2]);
  const uv=[x/4+.5,.5-y],eps=.00001;
  const dx=(distance([uv[0]+eps/4,uv[1]],4)-distance([uv[0]-eps/4,uv[1]],4))/(2*eps),dy=(distance([uv[0],uv[1]-eps],4)-distance([uv[0],uv[1]+eps],4))/(2*eps),gd=norm([dx+.00001,dy+.00001]);
  const slope=functions.mirrorRim(Math.max(0,-distance(uv,4)))[1];
  const micro=[(functions.mirrorTunedHeight(x+.0005,y)-functions.mirrorTunedHeight(x-.0005,y))/.001,(functions.mirrorTunedHeight(x,y+.0005)-functions.mirrorTunedHeight(x,y-.0005))/.001];
  const n=norm(world(norm([gd[0]*slope-micro[0],gd[1]*slope-micro[1],1]))),v=norm(world([-x,-y,5])),r=sub(mul(n,2*dot(n,v)),v),t=world([1,0,0]),neutral=.015+.78*reflection(r,t,5);
  return [.650,.530,.460].map(w=>neutral+.78*o.diffraction*.5*(order(r,n,t,w,1,5)+order(r,n,t,w,-1,5)));
 };
 return {...functions,reflection,order,shade};
}

test('typed defaults and clamping are finite, independent and immutable at the public root',()=>{
 assert.deepEqual(clean(),{diffraction:0,rainbowSpacing:1,reflectionBlur:1,directionality:1,bubbles:1,scratches:1,ridgeWidth:1,ridgeHeight:1,recoverySeconds:2.5});
 assert.ok(Object.isFrozen(D));assert.notStrictEqual(clean(),D);
 for(const [key,[lo,hi]]of Object.entries(L)){
  for(const invalid of [NaN,Infinity,-Infinity,undefined,null,'1'])assert.equal(clean({[key]:invalid})[key],D[key]);
  assert.equal(clean({[key]:-1e99})[key],lo);assert.equal(clean({[key]:1e99})[key],hi);
 }
});
test('preview13 original room, blur, defects and rim helper bodies remain byte-identical',()=>{
 for(const [language,source]of [['glsl',glsl],['wgsl',wgsl]])for(const [signature,expected]of Object.entries(fixture.helpers[language]))assert.equal(hash(bodyOf(source,signature)),expected,`${language} ${signature}`);
 for(const source of [glsl,wgsl]){
  assert.match(source,/if \((?:u\.)?mirrorB.x == 1. && (?:u\.)?mirrorB.y == 1.\)/);
  assert.match(source,/if \((?:u\.)?mirrorA.z == 1. && (?:u\.)?mirrorA.w == 1.\)/);
  assert.match(source,/if \((?:u\.)?mirrorB.z == 1. && (?:u\.)?mirrorB.w == 1.\)/);
 }
});
test('new optical helper bodies are identical across GLSL and WGSL after syntax normalization',()=>{
 const normalize=s=>s.replace(/u\./g,'').replace(/\b(?:let|var|int|float|vec2|vec3)\s+/g,'').replace(/: i32/g,'').replace(/\b(?:vec2f|vec3f)\(/g,m=>m.replace('f','')).replace(/f32\(/g,'float(').replace(/[{}\s]/g,'');
 for(const [name,result]of [['mirrorRim','vec2'],['mirrorTunedHeight','float'],['mirrorTunedReflection','float'],['mirrorOrder','float'],['mirrorDiffraction','vec3']]){
  assert.equal(normalize(bodyOf(glsl,`${result} ${name}(`)),normalize(bodyOf(wgsl,`fn ${name}(`)),name);
 }
});
test('defects are independently removable and rim height/width preserve flat center and boundary',()=>{
 for(const [source,language]of [[glsl,'glsl'],[wgsl,'wgsl']]){
  const baseline=analytical(source,language),zero=analytical(source,language,{bubbles:0,scratches:0,ridgeHeight:0});
  for(let i=0;i<101;i++){
   const x=-2+i*.04,y=Math.sin(i)*.4;
   assert.equal(baseline.mirrorTunedHeight(x,y),baseline.mirrorHeight(x,y));
   assert.equal(zero.mirrorTunedHeight(x,y),0);
   assert.deepEqual(baseline.mirrorRim(i*.005),baseline.rimProfile(i*.005));
   assert.ok(zero.mirrorRim(i*.005).every(v=>v===0));
  }
  const bubbles=analytical(source,language,{bubbles:4,scratches:0}),scratches=analytical(source,language,{bubbles:0,scratches:4});
  assert.ok(bubbles.mirrorTunedHeight(-.63,.12)>.00039);assert.ok(scratches.mirrorTunedHeight(-.14,-.0632)<-.000031);
  for(const width of [.25,1,2])for(const height of [0,1,3]){
   const m=analytical(source,language,{ridgeWidth:width,ridgeHeight:height});
   for(const inward of [0,.018,.018+.128*width,.4,.465])assert.deepEqual(m.mirrorRim(inward),[0,0]);
   assert.ok(Math.abs(m.mirrorRim(.018+.064*width)[0]-.0032*height)<1e-14);
  }
 }
});
test('zero blur is a single ray; directionality really changes angular filtering',()=>{
 const a=analytical(glsl,'glsl',{reflectionBlur:0}),normal=norm([.13,.86,.49]),t=norm([1,0,0]);
 assert.ok(Math.abs(a.reflection(normal,t,5)-a.mirrorRoom(...basis.map(b=>dot(normal,b)),5))<1e-14);
 let delta=0;
 const b=analytical(glsl,'glsl',{directionality:0}),c=analytical(glsl,'glsl',{directionality:2});
 for(let x=-1;x<1;x+=.05){const r=norm([x,-.86,.49]);delta+=Math.abs(b.reflection(r,t,5)-c.reflection(r,t,5));}
 assert.ok(delta>.1);
});
test('diffraction orders produce distinct colors coupled to view, pose and spacing',()=>{
 const m=analytical(glsl,'glsl',{diffraction:2}),wide=analytical(glsl,'glsl',{diffraction:2,rainbowSpacing:2});
 let chroma=0,view=0,pose=0,spacing=0;
 for(let x=-2;x<=2;x+=.1){
  const a=m.shade(undefined,x),b=m.shade(undefined,x+.5),c=m.shade([50,15,0],x),d=wide.shade(undefined,x);
  chroma=Math.max(chroma,Math.max(...a)-Math.min(...a));
  view+=a.reduce((s,v,i)=>s+Math.abs(v-b[i]),0);pose+=a.reduce((s,v,i)=>s+Math.abs(v-c[i]),0);spacing+=a.reduce((s,v,i)=>s+Math.abs(v-d[i]),0);
 }
 assert.ok(chroma>.12);assert.ok(view>1);assert.ok(pose>1);assert.ok(spacing>1);
 for(const pose of [[0,0,0],[62.9,1.1,0],[180,90,270]]){const a=analytical(glsl,'glsl').shade(pose);assert.equal(a[0],a[1]);assert.equal(a[1],a[2]);}
});
test('all option minima, maxima and mixed extremes stay finite in the optical reference',()=>{
 const configs=[Object.fromEntries(Object.entries(L).map(([k,v])=>[k,v[0]])),Object.fromEntries(Object.entries(L).map(([k,v])=>[k,v[1]]))];
 for(let i=0;i<32;i++)configs.push(Object.fromEntries(Object.entries(L).map(([k,v],j)=>[k,v[(i>>j)%2]])));
 for(const o of configs){const m=analytical(glsl,'glsl',o);for(const pose of [[0,0,0],[62.9,1.1,0],[180,90,270],[-90,-90,180]])for(const x of [-1.8,0,1.8])for(const v of m.shade(pose,x))assert.ok(Number.isFinite(v)&&v>=0&&v<40);}
});
test('recovery 2.5 seconds matches immutable preview13 trajectory exactly',()=>{
 const r=createFoilRecovery();
 for(const sample of fixture.recovery){const actual=Array.from(r.sample(new Float32Array(attitude(sample.pose)),sample.now,2.5));assert.deepEqual(actual,sample.matrix);}
});
test('changing recovery speed preserves state, frame cache and direct device response',()=>{
 const r=createFoilRecovery(),raw=new Float32Array(attitude([0,0,0]));let current;
 for(let i=0;i<100;i++)current=r.sample(raw,i*16,2.5);
 assert.strictEqual(r.sample(raw,99*16,.25),current);
 const next=r.sample(raw,100*16,10);
 assert.ok(Math.max(...next.map((v,i)=>Math.abs(v-current[i])))<.01);
 const fresh=createFoilRecovery().sample(raw,100*16,10);
 assert.ok(Math.max(...next.map((v,i)=>Math.abs(v-fresh[i])))>.1);
 const other=createFoilRecovery();for(let i=0;i<100;i++)other.sample(raw,i*16,2.5);
 assert.notDeepEqual(Array.from(r.sample(new Float32Array(attitude([50,20,0])),101*16,10)),Array.from(other.sample(raw,101*16,10)));
});
test('live tuning uses refs and uniform uploads, never effect dependencies or shared foil configuration',()=>{
 assert.match(componentSource,/mirrorTuning.current=normalizeMirrorOptions\(mirrorOptions\)/);
 assert.match(componentSource,/mirrorRecovery.current!\.sample\(motion.matrix.current,now,mirrorTuning.current.recoverySeconds\)/);
 assert.match(componentSource,/mirrorOptions:\(\)=>mirrorTuning.current/);
 assert.match(componentSource,/gl.uniform4f\(uma,mt.diffraction,mt.rainbowSpacing,mt.reflectionBlur,mt.directionality\)/);
 assert.match(componentSource,/gl.uniform4f\(umb,mt.bubbles,mt.scratches,mt.ridgeWidth,mt.ridgeHeight\)/);
 for(const deps of componentSource.matchAll(/\},\[([^\]]+)\]\)/g))assert.ok(!/mirrorOptions|mirrorTuning.current/.test(deps[1]));
 assert.match(componentSource,/preset.method===4\?retainFoilRecovery/);
 assert.match(componentSource,/preset.method===5\?mirrorRecovery.current!/);
});
