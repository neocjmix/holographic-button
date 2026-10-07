import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRenderer,shader} from '../v1/renderer.js';
let depth=0,maxDepth=0,destroyed=0,unconfigured=0,config;
globalThis.GPUBufferUsage={UNIFORM:1,COPY_DST:2};globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=()=>{};
const device={pushErrorScope(){depth++;maxDepth=Math.max(maxDepth,depth)},async popErrorScope(){depth--;return null},createShaderModule(){return{async getCompilationInfo(){await Promise.resolve();return{messages:[]}}}},async createRenderPipelineAsync(){return{getBindGroupLayout(){return{}}}},createBuffer(){return{destroy(){destroyed++}}},createBindGroup(){return{}},lost:new Promise(()=>{})};
Object.defineProperty(globalThis,'navigator',{value:{gpu:{async requestAdapter(){return{async requestDevice(){return device}}}}},configurable:true});
const options={kind:0,hdr:true,matrix:()=>new Float32Array([1,0,0,0,1,0,0,0,1]),peak:()=>1,pressed:()=>0,error(){}};
function canvas(fail=false){let c;return{getContext(){return{configure(v){if(fail)throw Error('configuration failed');c=v;config=v},getConfiguration(){return c},unconfigure(){unconfigured++}}}}}
test('concurrent initialization scopes are serialized and cleanup releases resources',async()=>{const cleanup=await Promise.all(Array.from({length:10},()=>createRenderer(canvas(),options)));assert.equal(maxDepth,1);assert.equal(depth,0);assert.equal(config.format,'rgba16float');assert.equal(config.toneMapping.mode,'extended');cleanup.forEach(fn=>fn());assert.equal(destroyed,10);assert.equal(unconfigured,10)});
test('failed configuration closes error scope and unconfigures',async()=>{await assert.rejects(createRenderer(canvas(true),options),/configuration failed/);assert.equal(depth,0);assert.equal(unconfigured,11)});
test('shader uses nonnegative Gaussian bases and explicit transfer',()=>{assert.ok(shader.includes('gradient=vec2f(sign(p.x)*q.x,p.y)/qlen'));assert.ok(shader.includes('vec3f(gradient*slope,1.)'));assert.ok(!shader.includes('q.x*.6')); assert.ok(shader.includes('fn encode'));assert.ok(shader.includes('1.5,2.,4.'))});
test('preview publication guards and static fallback',async()=>{for(const path of ['package.json','components/holographic-button/package.json'])assert.equal(JSON.parse(await readFile(path,'utf8')).private,true);assert.match(await readFile('preview/v1/style.css','utf8'),/\.fallback canvas\{visibility:hidden\}/);assert.match(await readFile('preview/v1/lab.tsx','utf8'),/requestOnFirstInteraction:false/)});

test('flat capsule normal is continuous across axes and rim points outward',()=>{
 const n=(x,y)=>{const span=1, qx=Math.max(Math.abs(x)-span,0),len=Math.max(Math.hypot(qx,y),.00001),inward=Math.max(.34-len,0);const t=Math.max(0,Math.min(1,(inward-.055)/.03)),mask=1-t*t*(3-2*t);const slope=-Math.cos(Math.min(inward/.08,1)*2*Math.PI)*mask*.46;return[Math.sign(x)*qx/len*slope,y/len*slope,1]};
 assert.ok(Math.hypot(...n(-.4,.1).slice(0,2))<1e-9);assert.ok(Math.hypot(...n(.4,.1).slice(0,2))<1e-9);
 const left=n(-1.32,.01),right=n(1.32,.01);assert.ok(Math.abs(left[0]+right[0])<1e-9);assert.ok(Math.abs(left[1]-right[1])<1e-9);
 const topL=n(-.000001,.32),topR=n(.000001,.32);assert.ok(Math.hypot(topL[0]-topR[0],topL[1]-topR[1])<1e-8);
});
