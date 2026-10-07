import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {transform} from 'esbuild';

const source = await readFile(new URL('../hdr-renderer.ts', import.meta.url), 'utf8');
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
test('shader preserves original geometry/material/light constants and coordinate convention',async()=>{
 const {originalHdrShader:s}=await load();
 for(const marker of ['a * .488, .465), .43','smoothstep(.12, .15, inward)','inward / .12','gd * rs * .56','abs(rh) * .12','p.x * .18, p.y * .38','720., 115.','7., 29.','1380.','16., 9.','24., 7.','-.12, -.66, .74','.72, -.12, .68','specularIntensity * 1.55','rough) * ndl * .42 * si','e * .46','e * .72','e * .31','e * 1.02','surfaceR = .215','size = 2.55','surfaceR, .66, 1.5707963','.380392, .996078','metal + vec3f(.78)','vec3f(.86)']) assert.ok(s.includes(marker),marker);
 assert.ok(s.includes('1. - pixel.y / resolution.y'));assert.ok(s.includes('vec2f(dpdx(d), -dpdy(d))'));
 assert.ok(s.includes('grainDy = -dpdy(grain)'));assert.ok(s.includes('vec2f(dpdx(filmNoise), -dpdy(filmNoise))'));
 assert.ok(s.indexOf('let filmGradient')<s.indexOf('discard;'));assert.ok(s.includes('encoded * alpha, alpha'));
 assert.ok(s.includes('clamp(dot(nw, vw), .001, 1.)'));
 for(const threshold of ['method < .5','method < 1.5','method < 2.5']) assert.ok(s.includes(threshold));
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
