import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {transform} from 'esbuild';
import {shade, stats} from './shader-reference.mjs';

const source = await readFile(new URL('../hdr-renderer.ts', import.meta.url), 'utf8');
const componentSource = await readFile(new URL('../index.tsx', import.meta.url), 'utf8');
const wgsl = source.split('/* wgsl */ `')[1].split('`;')[0];
const glsl = JSON.parse(componentSource.match(/const FS=(\[[\s\S]*?\])\.join\("\\n"\);/)[1]).join('\n');
const hash = s => createHash('sha256').update(s).digest('hex');
const {code} = await transform(source, {loader: 'ts', format: 'esm'});
let moduleNumber = 0;
const load = () => import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}#${++moduleNumber}`);
const identity = new Float32Array([1,0,0,0,1,0,0,0,1]);

function harness({hdr=true, configurationError=false, shaderError=false, validationError=false, alreadyLost=false}={}) {
  let depth=0, maximumDepth=0, destroyed=0, unconfigured=0, adapterRequests=0;
  let nextFrame=0, resolveLost, lastConfiguration, lastValues, lastPass, drawn=0;
  const frames=new Map();
  const lost=alreadyLost ? Promise.resolve({reason:'destroyed'}) : new Promise(resolve=>{resolveLost=resolve});
  const device={
    pushErrorScope(){maximumDepth=Math.max(maximumDepth,++depth)},
    async popErrorScope(){depth--;return validationError?{message:'validation failed'}:null},
    createShaderModule({code}){assert.ok(code.includes('fn ggxAniso'));return{async getCompilationInfo(){return{messages:shaderError?[{type:'error',message:'shader failed'}]:[]}}}},
    async createRenderPipelineAsync(){return{getBindGroupLayout(){return{}}}},
    createBuffer({size,usage}){assert.equal(size,96);assert.equal(usage,72);return{destroy(){destroyed++}}},
    createBindGroup(){return{}},
    createCommandEncoder(){return{beginRenderPass(descriptor){lastPass=descriptor;return{setPipeline(){},setBindGroup(){},draw(n){assert.equal(n,3);drawn++},end(){}}},finish(){return{}}}},
    queue:{writeBuffer(_buffer,_offset,values){lastValues=Array.from(values)},submit(){}},
    lost,
  };
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{gpu:{async requestAdapter(){adapterRequests++;return{async requestDevice(){return device}}}}}});
  globalThis.matchMedia=()=>({matches:hdr});
  globalThis.document={hidden:false};globalThis.devicePixelRatio=3;
  globalThis.requestAnimationFrame=callback=>{frames.set(++nextFrame,callback);return nextFrame};
  globalThis.cancelAnimationFrame=id=>frames.delete(id);
  const makeCanvas=()=>({width:0,height:0,getBoundingClientRect(){return{width:240,height:60}},getContext(){return{
    configure(config){if(configurationError)throw Error('configuration failed');lastConfiguration=config},
    getConfiguration(){return lastConfiguration},
    unconfigure(){unconfigured++},getCurrentTexture(){return{createView(){return{}}}},
  }}});
  return {makeCanvas,device,lose(){resolveLost({reason:'destroyed'})},frame(){const [id,callback]=frames.entries().next().value;frames.delete(id);callback()},get state(){return{depth,maximumDepth,destroyed,unconfigured,adapterRequests,lastConfiguration,lastValues,lastPass,drawn,frames:frames.size}}};
}
function options(overrides={}){return{matrix:()=>identity,method:0,material:[.08,.72,.11,.55],specular:()=>1,error(){},...overrides}}

test('SDR capability rejects before creating GPU resources',async()=>{
 const h=harness({hdr:false});const {createOriginalHdrRenderer}=await load();
 await assert.rejects(createOriginalHdrRenderer(h.makeCanvas(),options()),/HDR display unavailable/);
 assert.equal(h.state.adapterRequests,0);
});
test('concurrent mounts serialize device scopes and cleanup is idempotent',async()=>{
 const h=harness();const {createOriginalHdrRenderer}=await load();
 const cleanups=await Promise.all(Array.from({length:8},()=>createOriginalHdrRenderer(h.makeCanvas(),options())));
 assert.equal(h.state.maximumDepth,1);assert.equal(h.state.depth,0);assert.equal(h.state.adapterRequests,1);
 assert.equal(h.state.lastConfiguration.format,'rgba16float');assert.equal(h.state.lastConfiguration.colorSpace,'srgb');
 assert.equal(h.state.lastConfiguration.alphaMode,'premultiplied');assert.equal(h.state.lastConfiguration.toneMapping.mode,'extended');
 cleanups.forEach(stop=>{stop();stop()});assert.equal(h.state.destroyed,8);assert.equal(h.state.unconfigured,8);assert.equal(h.state.frames,0);
});
test('live matrix/intensity use original column-major packing, resize, transparent clear',async()=>{
 const h=harness();const {createOriginalHdrRenderer}=await load();let intensity=2.5;
 const m=new Float32Array([1,2,3,4,5,6,7,8,9]),canvas=h.makeCanvas();
 const stop=await createOriginalHdrRenderer(canvas,options({matrix:()=>m,method:3,material:[1.18,1.05,.09,1],specular:()=>intensity}));
 h.frame();assert.equal(canvas.width,480);assert.equal(canvas.height,120);
 assert.deepEqual(h.state.lastValues.slice(0,16),[1,2,3,0,4,5,6,0,7,8,9,0,0,0,0,1]);
 assert.deepEqual(h.state.lastValues.slice(20),[480,120,3,2.5]);
 assert.equal(h.state.lastValues[19],1);assert.deepEqual(h.state.lastPass.colorAttachments[0].clearValue,{r:0,g:0,b:0,a:0});
 intensity=0;h.frame();assert.equal(h.state.lastValues[23],0);
 intensity=NaN;h.frame();assert.equal(h.state.lastValues[23],0);
 intensity=-3;h.frame();assert.equal(h.state.lastValues[23],0);
 document.hidden=true;h.frame();assert.equal(h.state.drawn,4);stop();
});
for(const [flag,message,buffers] of [['configurationError','configuration failed',0],['shaderError','shader failed',0],['validationError','validation failed',1]]) {
 test(`${flag} balances scopes and releases resources`,async()=>{
  const h=harness({[flag]:true});const {createOriginalHdrRenderer}=await load();
  await assert.rejects(createOriginalHdrRenderer(h.makeCanvas(),options()),new RegExp(message));
  assert.equal(h.state.depth,0);assert.equal(h.state.destroyed,buffers);assert.equal(h.state.unconfigured,1);assert.equal(h.state.frames,0);
 });
}
test('device loss stops rendering, releases resources and reports only once',async()=>{
 const h=harness();const {createOriginalHdrRenderer}=await load();const errors=[];
 const stop=await createOriginalHdrRenderer(h.makeCanvas(),options({error:e=>errors.push(e)}));
 h.lose();await Promise.resolve();await Promise.resolve();stop();
 assert.equal(errors.length,1);assert.match(errors[0],/device lost/);assert.equal(h.state.destroyed,1);assert.equal(h.state.unconfigured,1);assert.equal(h.state.frames,0);
});
test('loss during initialization rejects instead of returning an active renderer',async()=>{
 const h=harness({alreadyLost:true});const {createOriginalHdrRenderer}=await load();const errors=[];
 await assert.rejects(createOriginalHdrRenderer(h.makeCanvas(),options({error:e=>errors.push(e)})),/device lost/);
 assert.equal(errors.length,1);assert.equal(h.state.depth,0);assert.equal(h.state.frames,0);assert.equal(h.state.unconfigured,1);
});
test('frame exceptions release resources and invoke fallback once',async()=>{
 const h=harness();const {createOriginalHdrRenderer}=await load();const errors=[];
 const stop=await createOriginalHdrRenderer(h.makeCanvas(),options({matrix(){throw Error('matrix unavailable')},error:e=>errors.push(e)}));
 h.frame();stop();assert.deepEqual(errors,['matrix unavailable']);assert.equal(h.state.destroyed,1);assert.equal(h.state.frames,0);
});
test('shader preserves silhouette, material branches, lighting directions and coordinate convention',async()=>{
 const {originalHdrShader:s}=await load();
 for(const marker of ['a * .488, .465), .43','720., 115.','7., 29.','1380.','16., 9.','24., 7.','-.12, -.66, .74','.72, -.356, .592','specularIntensity * 1.55','e * .46','e * .72','e * .31','e * 1.02','metal + vec3f(.78)','vec3f(.86)']) assert.ok(s.includes(marker),marker);
 assert.ok(s.includes('1. - pixel.y / resolution.y'));assert.ok(s.includes('vec2f(dpdx(d), -dpdy(d))'));
 assert.ok(s.includes('grainDy = -dpdy(grain)'));assert.ok(s.includes('vec2f(dpdx(filmNoise), -dpdy(filmNoise))'));
 assert.ok(s.indexOf('let filmGradient')<s.indexOf('discard;'));assert.ok(s.includes('encoded * alpha, alpha'));
 assert.ok(s.includes('clamp(dot(nw, vw), .001, 1.)'));
 assert.ok(s.includes('vec4f(viewDirection(p), 0.)'));assert.ok(glsl.includes('worldFromDevice*viewDirection(p)'));
 for(const threshold of ['method < .5','method < 1.5','method < 2.5']) assert.ok(s.includes(threshold));
 // All environment colors, angular widths and directions remain unchanged.
 assert.equal(hash(functionBody(wgsl,'fn env(').replace('-.12, -.88, .46','-.32, .72, .61').replace(' 34.', ' 46.').replace(' 150.', ' 240.').replace('.07, .075, .08', '.56, .6, .64').replace('.3, .26875, .225', '2.4, 2.15, 1.8')),'1eb48d33ba83842e098117ec04366e7a0ccea24469c3c5e90ccaae132af73dfb');
 assert.equal(hash(functionBody(glsl,'vec3 env(').replace('-.12,-.88,.46','-.32,.72,.61').replace(',34.', ',46.').replace(',150.', ',240.').replace('.07,.075,.08', '.56,.6,.64').replace('.3,.26875,.225', '2.4,2.15,1.8')),'f3231a0254ea9700d50888ae7eb0f4c8e86e264193fe40255ededebc149524b0');
});
test('all four texture formulas, palettes, noise and microtexture are unchanged',()=>{
 assert.equal(hash(glsl.slice(glsl.indexOf('vec3 e=env(rw,si),metal;'),glsl.indexOf('float sl=nls'))),'7b7fb1a429806318fcf65834e0c073187aed06197ee439135a3cc796e90d007e');
 assert.equal(hash(wgsl.slice(wgsl.indexOf('  if (method < .5) {'),wgsl.indexOf('  let sl = nls;'))),'bb82bfb4f66635e34776ef42ce9b4592fc2b6f8227090e2f9761259a3056f999');
 assert.equal(hash(glsl.slice(glsl.indexOf('grain=noise('),glsl.indexOf('vec3 n=normalize(',glsl.indexOf('grain=noise(')))),'a34322f2368c32d9860f10b27bae8e935b167c9869baf5679ac4ec5e21bd2e41');
 assert.equal(hash(wgsl.slice(wgsl.indexOf('  let grain ='),wgsl.indexOf('  // inward=-d'))),'8ff604af175e3c069df7697c7ec07aa85a0cacb8c7a95789787554f514f60160');
 for(const [shader,prefix] of [[glsl,'float'],[wgsl,'fn']]) {
   assert.equal(hash(functionBody(shader,`${prefix} hash(`)),prefix==='fn'?'4c0c459143feec91a2994e3d79c8cb0fd3eeea005ed40505d6669db65e6fb55d':'9264003d8773386fb9fe7582dc16a348ce9b4904775d22d3b5d4b23ecaf2c627');
   assert.equal(hash(functionBody(shader,`${prefix} noise(`)),prefix==='fn'?'e95ec688cac6243b03b8f6cb4623254237fd4626828f6b6a83b06264f25595e0':'b58fc352df9253a69864b7e04b49202cc3bf7a7b6604b4051444ab0a56598246');
 }
});

// Execute the actual scalar shader function bodies in double precision. This
// ties the geometry/BRDF checks to both sources, but is not GPU/render validation.
function functionBody(shader,signature) {
 const at=shader.indexOf(signature);assert.notEqual(at,-1,signature);
 const start=shader.indexOf('{',at);let depth=1,end=start+1;
 for(;depth&&end<shader.length;end++){if(shader[end]==='{')depth++;if(shader[end]==='}')depth--}
 assert.equal(depth,0,signature);return shader.slice(start+1,end-1);
}
const scalarBindings={pow:Math.pow,sqrt:Math.sqrt,max:Math.max,vec2:(...v)=>v.length===1?[v[0],v[0]]:v};
function scalarFunction(shader,signature,parameters,bindings={}) {
 const body=functionBody(shader,signature).replace(/\bfloat\s+/g,'let ').replace(/\bvec2f\(/g,'vec2(');
 const bound={...scalarBindings,...bindings};
 return new Function(...Object.keys(bound),...parameters,body).bind(null,...Object.values(bound));
}
function shaderMath(shader,language) {
 const signature=name=>`${language==='wgsl'?'fn':name==='rimProfile'?'vec2':'float'} ${name}(`;
 const ggx=scalarFunction(shader,signature('ggx'),['n','r']);
 const smithVisibility=scalarFunction(shader,signature('smithVisibility'),['nl','nv','r']);
 const brdf=scalarFunction(shader,signature('conductorBRDF'),['nh','nl','nv','vh','r'],{ggx,smithVisibility});
 const rim=scalarFunction(shader,signature('rimProfile'),['inward']);
 return {ggx,smithVisibility,brdf,rim};
}
const shaderModels=[['GLSL',shaderMath(glsl,'glsl')],['WGSL',shaderMath(wgsl,'wgsl')]];
const normalize=v=>{const length=Math.hypot(...v);return v.map(x=>x/length)};
function halfWidth(ggx,r) {
 const half=ggx(1,r)*.5;let lo=0,hi=Math.PI/2;
 for(let i=0;i<70;i++){const mid=(lo+hi)/2;if(ggx(Math.cos(mid),r)>half)lo=mid;else hi=mid}
 return (lo+hi)/2;
}
for(const [language,{rim,ggx,brdf}] of shaderModels) {
 test(`${language} macroscopic face and outer edge are flat, with only a shallow positive inset ridge`,()=>{
   for(const inward of [-.1,0,.01,.018,.146,.2,.25,.465,1]) {
     assert.deepEqual(rim(inward),[0,0]);assert.deepEqual(normalize([rim(inward)[1],0,1]),[0,0,1]);
   }
   assert.ok(Math.abs(rim(.082)[0]-.0032)<1e-15);assert.ok(Math.abs(rim(.082)[1])<1e-14);
   let maxSlope=0;
   for(let i=0;i<=1000;i++) {
     const inward= .018+.128*i/1000,[height,slope]=rim(inward);
     assert.ok(height>=0&&height<=.0032+1e-15);assert.ok(Number.isFinite(slope));
     maxSlope=Math.max(maxSlope,Math.abs(slope));
   }
   assert.ok(rim(.027)[1]>0);assert.ok(rim(.117)[1]<0);
   const degrees=Math.atan(maxSlope)*180/Math.PI;assert.ok(degrees>4.9&&degrees<5.0);
 });
 test(`${language} ridge joins are C2 and normals use the true height derivative`,()=>{
   const epsilon=1e-6;
   for(const endpoint of [.018,.146]) {
     const [height,slope]=rim(endpoint);assert.equal(height,0);assert.equal(slope,0);
     const finiteSlope=(rim(endpoint+epsilon)[0]-rim(endpoint-epsilon)[0])/(2*epsilon);
     const finiteCurvature=(rim(endpoint+epsilon)[1]-rim(endpoint-epsilon)[1])/(2*epsilon);
     assert.ok(Math.abs(finiteSlope)<1e-8);assert.ok(Math.abs(finiteCurvature)<.001);
   }
   for(let i=1;i<100;i++) {
     const inward= .018+.128*i/100;
     const finiteSlope=(rim(inward+epsilon)[0]-rim(inward-epsilon)[0])/(2*epsilon);
     assert.ok(Math.abs(finiteSlope-rim(inward)[1])<1e-8);
     assert.ok(Math.abs(rim(inward)[0]-rim(.164-inward)[0])<1e-15);
   }
 });
 test(`${language} tin-like GGX has a wider half-maximum lobe than the original roughness range`,()=>{
   assert.ok(halfWidth(ggx,.30)>halfWidth(ggx,.16)*3.5);
   assert.ok(halfWidth(ggx,.30)>halfWidth(ggx,.05)*35);
   for(const materialZ of [.11,.23,.18,.09])for(const grain of [0,.5,1]) {
     const oldRough=Math.max(.05,Math.min(.16,materialZ*.55+(grain-.5)*.012));
     const rough=Math.max(.26,Math.min(.38,.24+materialZ*.4+(grain-.5)*.012));
     assert.ok(halfWidth(ggx,rough)>halfWidth(ggx,oldRough)*4);
   }
   // Broadening distributes the peak, rather than adding a rim brightness term.
   assert.ok(ggx(1,.3)<ggx(1,.16));assert.ok(ggx(Math.cos(.1),.3)>ggx(Math.cos(.1),.16));
 });
 test(`${language} neutral conductor BRDF stays finite at grazing angles`,()=>{
   for(const nl of [0,.00001,.01,.5,1])for(const nv of [.001,.01,.5,1])for(const nh of [0,.5,.99,1])for(const r of [.26,.3,.38]) {
     const value=brdf(nh,nl,nv,.8,r)*nl;assert.ok(Number.isFinite(value)&&value>=0);
   }
   assert.ok(Math.abs(brdf(1,1,1,1,.3)-ggx(1,.3)*.25*.75)<1e-12);
 });
}
test('GLSL and WGSL profiles and shared specular equations agree numerically',()=>{
 const g=shaderModels[0][1],w=shaderModels[1][1];
 for(let i=0;i<=1000;i++)assert.deepEqual(g.rim(i/1000),w.rim(i/1000));
 for(const r of [.26,.3,.38])for(const n of [.001,.2,.5,.9,1])assert.equal(g.brdf(n,n,n,.8,r),w.brdf(n,n,n,.8,r));
 assert.ok(glsl.includes('n=normalize(vec3(gd*rim.y+micro,1.))'));assert.ok(wgsl.includes('n = normalize(vec3f(gd * rim.y + micro, 1.))'));
 assert.ok(glsl.includes('rough=clamp(.24+material.z*.4+(grain-.5)*.012,.26,.38)'));assert.ok(wgsl.includes('rough = clamp(.24 + material.z * .4 + (grain - .5) * .012, .26, .38)'));
 for(const shader of [glsl,wgsl])for(const removed of ['shapeN','recessed','raised','surfaceR','let glass','float glass','let pin','let bloom'])assert.equal(shader.includes(removed),false,removed);
});

// Independent double-precision presentation reference, not a GPU rendering test.
const legacy=m=>Math.pow(Math.max(m/(m+.78),0),.86);
const decode=c=>c>.04045?Math.pow((c+.055)/1.055,2.4):c/12.92;
const encode=c=>c>.0031308?1.055*Math.pow(c,1/2.4)-.055:c*12.92;
const present=(m,base)=>{const c=legacy(m),e=Math.max(m-Math.max(base,1),0);return e>0?encode(decode(c)+3*e/(3+e)):c};
test('HDR presentation leaves ordinary colors and zero-specular base exactly unchanged',()=>{
 for(let i=0;i<=1000;i++){const m=i/1000;assert.equal(present(m,m*.5),legacy(m))}
 for(const m of [0,.01,.3,.8,1,1.1,2,4,10,1000]) assert.equal(present(m,m),legacy(m));
});
test('specular excess exceeds SDR white, stays finite and bounded by four linear whites',()=>{
 let previous=0;
 for(const m of [0,.1,.5,1,1.001,1.5,2,4,16,100,1e6]) {
  const c=present(m,.5);assert.ok(Number.isFinite(c));assert.ok(c>=previous);assert.ok(decode(c)<4);previous=c;
 }
 assert.ok(present(2,.5)>1);assert.ok(present(100,.5)>present(2,.5));
 assert.ok(Math.abs(present(1+1e-8,.5)-present(1,.5))<1e-7);
});
test('bottom-up UV plus signed derivatives recovers original upward rim gradient',()=>{
 const height=100,width=400,x=123.5,y=19.5;
 const gpuUv=[x/width,1-y/height],glUv=[x/width,(height-y)/height];
 assert.ok(Math.abs(gpuUv[0]-glUv[0])<1e-12);assert.ok(Math.abs(gpuUv[1]-glUv[1])<1e-12);
 const distance=(u,v)=>Math.hypot(u-.5,v-.5),step=1/height;
 const dyGl=distance(glUv[0],glUv[1]+step)-distance(glUv[0],glUv[1]);
 const dyGpu=distance(gpuUv[0],gpuUv[1])-distance(gpuUv[0],gpuUv[1]+step);
 assert.ok(Math.abs(-dyGpu-dyGl)<1e-12);
});

// Evaluate source expressions rather than only asserting their spelling. These
// helpers use the shader's view/phase/spectrum/BRDF and current neutral gains.
// RGB arithmetic outside those functions is an independent central-face CPU
// reference. This does not claim GPU or physical-display validation.
const dot=(a,b)=>a.reduce((sum,value,i)=>sum+value*b[i],0);
const fract=x=>x-Math.floor(x);
const hashPoint=p=>fract(Math.sin(dot(p,[127.1,311.7]))*43758.5453);
function expression(shader,pattern,parameters,bindings={}) {
 const match=shader.match(pattern);assert.ok(match,pattern);
 const expr=match[1].replace(/\bvec3f\(/g,'vec3(');
 const bound={normalize,dot,vec3:(...values)=>values,hash:hashPoint,...bindings};
 return new Function(...Object.keys(bound),...parameters,`return ${expr};`).bind(null,...Object.values(bound));
}
const opticalModels=[['GLSL',glsl],['WGSL',wgsl]].map(([language,shader],i)=>{
 const view=expression(shader,language==='GLSL'?/vec3 viewDirection\([^}]*return ([^;]+);/:/fn viewDirection\([^}]*return ([^;]+);/,['p']);
 const sweep=expression(shader,/(?:float|let) sweep\s*=\s*([^;]+);/,['rw']);
 const band=expression(shader,/(?:float|let) band\s*=\s*([^;]+);/,['rw','cell']);
 const spectrumBody=functionBody(shader,language==='GLSL'?'vec3 spectrum(':'fn spectrum(').replace(/\bvec3f\(/g,'vec3(');
 const spectrumFunction=new Function('pow','cos','vec3','t',spectrumBody);
 const spectrum=t=>[0,1,2].map(channel=>spectrumFunction(Math.pow,Math.cos,(...v)=>v.length===1?v[0]:v[channel],t));
 const gains={
   gain:expression(shader,/(?:spec|let spec)\s*=\s*([^;},]+)(?:[,;])/,['brdf','nls','si'])(1,1,1),
   primary:Number(shader.match(/(?:surfaceSpec|let surfaceSpec)\s*=\s*brdf\s*\*\s*sl\s*\*\s*([.\d]+)/)[1]),
   secondary:Number(shader.match(/rough\)\s*\*\s*ndl2\s*\*\s*([.\d]+);/)[1]),
 };
 return [language,{...gains,math:{view,sweep,band,spectrum,brdf:shaderModels[i][1].brdf}}];
});
for(const [language,model] of opticalModels) {
 test(`${language} finite-position viewer stays above a genuinely flat macro face`,()=>{
  assert.deepEqual(model.math.view({x:0,y:0}).map(x=>x+0),[0,0,1]);
  for(const aspect of [2,3,4,6])for(const y of [-.25,0,.25])for(const x of [-.38*aspect,0,.38*aspect]) {
   const v=model.math.view({x,y});assert.ok(Math.abs(Math.hypot(...v)-1)<1e-14);
   assert.ok(v[2]>0);assert.ok(Math.abs(v[0]/v[2]+x/5)<1e-14);assert.ok(Math.abs(v[1]/v[2]+y/5)<1e-14);
   const sample=shade({...model,uv:[x/aspect+.5,y+.5],aspect});assert.deepEqual(sample.normal,[0,0,1]);
  }
  assert.ok(model.math.view({x:-1,y:0})[0]>0);assert.ok(model.math.view({x:1,y:0})[0]<0);
 });
 test(`${language} flat Spectral and Prism show spatial color change at multiple widths and poses`,()=>{
  for(const aspect of [2,3,4,6])for(const pose of [[0,0],[18,-15],[-18,15]]) {
   const spectral=stats({...model,aspect,pose,method:0});
   assert.ok(spectral.phaseSpan>.09,JSON.stringify({aspect,pose,spectral}));
   assert.ok(spectral.colorRange>.13);assert.ok(spectral.chromaMean>.32);
   const prism=stats({...model,aspect,pose,method:3});
   assert.ok(prism.phaseSpan>.55);assert.ok(prism.colorRange>.38);assert.ok(prism.chromaMean>.30);
  }
  // A regression to parallel rays has zero phase span even though the unchanged
  // material palettes still exist in the source. This catches the preview.4 bug.
  const parallel=stats({...model,math:{...model.math,view:()=>[0,0,1]},method:0});
  assert.equal(parallel.phaseSpan,0);assert.ok(parallel.colorRange<.025);
 });
 test(`${language} neutral highlight is localized and retains surrounding rainbow at intensity one`,()=>{
  const pose=[62,-7];
  for(const method of [0,3]) {
   const tuned=stats({...model,pose,method}),unscaled=stats({...model,pose,method,gain:1,primary:.35,secondary:.08});
   assert.ok(tuned.chromaMean>unscaled.chromaMean*2);
   assert.ok(tuned.whiteFraction<.55);assert.ok(unscaled.whiteFraction>.85);
   assert.ok(tuned.highlightMax>1&&tuned.highlightMax<5);
   assert.ok(tuned.highlightMax<unscaled.highlightMax*.4);
   assert.ok(tuned.hdrRelativeChromaMean>.28);
   assert.ok(tuned.hdrRelativeChromaMean>unscaled.hdrRelativeChromaMean*2);
   assert.ok(tuned.hdrExcessFraction<.60);assert.ok(unscaled.hdrExcessFraction>.80);
   assert.ok(tuned.hdrPeak>1&&tuned.hdrPeak<1.5);
  }
 });
 test(`${language} all four central-face references remain finite from specular zero through three`,()=>{
  for(const method of [0,1,2,3])for(const intensity of [0,1,3])for(const pose of [[0,0],[18,-15],[42,-9]])for(const u of [.12,.3,.5,.7,.88]) {
   const sample=shade({...model,method,intensity,pose,uv:[u,.5]});
   assert.ok(sample.color.every(x=>Number.isFinite(x)&&x>=0&&x<1));
   assert.ok(sample.hdrColor.every(x=>Number.isFinite(x)&&x>=0&&x<1.83));
   if(intensity===0)assert.deepEqual(sample.hdrColor,sample.color);
  }
  // Pearl's incidence/noise-based formula intentionally retains subtle variation.
  const pearl=stats({...model,method:2}),spectral=stats({...model,method:0});
  assert.ok(pearl.colorRange>.01&&pearl.colorRange<.08);assert.ok(spectral.colorRange>pearl.colorRange*10);
 });
}
test('GLSL and WGSL finite view, phase, palette and highlight gains agree numerically',()=>{
 const a=opticalModels[0][1],b=opticalModels[1][1];
 assert.deepEqual([a.gain,a.primary,a.secondary],[b.gain,b.primary,b.secondary]);
 for(const pose of [[0,0],[18,-15],[-18,15],[42,-9]])for(const aspect of [2,4,6])for(const method of [0,1,2,3])for(const u of [.12,.3,.5,.7,.88]) {
  const params={pose,aspect,method,uv:[u,.5]},x=shade({...a,...params}),y=shade({...b,...params});
  assert.deepEqual(x,y);
 }
});

test('method4 sends CSS-point dimensions separately from DPR backing resolution, including resize',async()=>{
 const h=harness();const {createOriginalHdrRenderer}=await load();
 const canvas=h.makeCanvas();
 const stop=await createOriginalHdrRenderer(canvas,options({method:4,material:[0,0,0,0]}));
 h.frame();
 assert.deepEqual(h.state.lastValues.slice(16,20),[240,60,0,0]);
 assert.deepEqual(h.state.lastValues.slice(20,22),[480,120]);
 canvas.getBoundingClientRect=()=>({width:320,height:148});
 h.frame();assert.deepEqual(h.state.lastValues.slice(16,20),[320,148,0,0]);
 assert.deepEqual(h.state.lastValues.slice(20,22),[640,296]);stop();
});

test('portrait primary reflection projects onto the finite face and broadens only 20 percent',()=>{
 const l=normalize([-.12,-.88,.46]);
 for(const beta of [58,60,62.4,65,67]){
  const b=beta*Math.PI/180;
  const local=[l[0],l[1]*Math.cos(b)+l[2]*Math.sin(b),-l[1]*Math.sin(b)+l[2]*Math.cos(b)];
  const p=[5*local[0]/local[2],5*local[1]/local[2]];
  assert.ok(Math.abs(p[0])<1.5&&Math.abs(p[1])<.465,JSON.stringify({beta,p}));
 }
 for(const [,math] of shaderModels)for(const r of [.276,.284,.312,.332]){
  const ratio=halfWidth(math.ggx,r*1.095445115)/halfWidth(math.ggx,r);
  assert.ok(ratio>1.19&&ratio<1.22);
 }
});
test('all four HDR styles meaningfully increase at10 versus3 and1 without changing zero-specular color',()=>{
 for(const method of [0,1,2,3]){
  const peak=[0,1,3,10].map(intensity=>{
   let max=0;
   for(let x=0;x<41;x++)for(let y=0;y<11;y++){
    const sample=shade({method,intensity,pose:[62,-7],uv:[.12+.76*x/40,.15+.7*y/10]});
    assert.ok(sample.hdrColor.every(Number.isFinite));
    if(intensity===0)assert.deepEqual(sample.color,sample.hdrColor);
    max=Math.max(max,...sample.hdrColor.map(decode));
   }
   return max;
  });
  assert.ok(peak[3]>peak[2]*1.5&&peak[3]>peak[1]*2,JSON.stringify({method,peak}));
 }
});

test('all SDR and HDR paths premultiply only geometric coverage at the output',()=>{
 assert.ok(glsl.includes('vec4(pow(max(metal,0.),vec3(.86))*al,al)'));
 assert.ok(glsl.includes('vec4(stickerRgb*al,al)'));
 assert.ok(wgsl.includes('vec4f(encoded * alpha, alpha)'));
 assert.ok(wgsl.includes('vec4f(stickerRgb * al, al)'));
 for(const alpha of [0,.001,.25,.75,1])for(const color of [0,.3,1,2]){
  assert.equal(color*alpha,alpha===1?color:color*alpha);
  if(alpha===0)assert.equal(color*alpha,0);
 }
});
