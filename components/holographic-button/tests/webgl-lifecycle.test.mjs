import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';

// Execute the real component/effect with minimal React and WebGL test doubles.
// These are lifecycle regression tests, not browser/GPU image validation.
const bundled=await build({
 entryPoints:[fileURLToPath(new URL('../index.tsx',import.meta.url))],bundle:true,write:false,format:'esm',jsx:'automatic',
 plugins:[{name:'react-lifecycle-test',setup(builder){
  builder.onResolve({filter:/^react(?:\/jsx-runtime)?$/},args=>({path:args.path,namespace:'test-react'}));
  builder.onLoad({filter:/.*/,namespace:'test-react'},()=>({contents:`
   export const useRef=current=>({current});
   export const useCallback=callback=>callback;
   export const useEffect=effect=>globalThis.__holoLifecycle.effects.push(effect);
   export const forwardRef=component=>component;
   export function useState(value){const hooks=globalThis.__holoLifecycle;const slot={value:hooks.initialStates[hooks.states.length]??value};hooks.states.push(slot);return[slot.value,next=>{slot.value=typeof next==='function'?next(slot.value):next}]}
   export const jsx=(type,props)=>({type,props});export const jsxs=jsx;
  `}));
 }}],
});
const {HolographicButton}=await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`);
const identity=new Float32Array([1,0,0,0,1,0,0,0,1]);

function harness(failure={}){
 const hooks={effects:[],states:[],initialStates:[false,Boolean(failure.initialError)]};globalThis.__holoLifecycle=hooks;
 const frames=new Map(),listeners=new Map(),resources={shaders:new Set(),programs:new Set(),buffers:new Set()};
 const deleted={shaders:[],programs:[],buffers:[]},created={shaders:0,programs:0,buffers:0},viewports=[];
 let nextFrame=0,draws=0,contextLost=false;
 const allocate=kind=>{const id=++created[kind];if(failure[`${kind}Allocation`]===id)return null;const resource={id};resources[kind].add(resource);return resource};
 const remove=(kind,resource)=>{assert.ok(resources[kind].delete(resource),`${kind} deleted exactly once`);deleted[kind].push(resource.id)};
 const gl={
  VERTEX_SHADER:1,FRAGMENT_SHADER:2,COMPILE_STATUS:3,LINK_STATUS:4,ARRAY_BUFFER:5,STATIC_DRAW:6,FLOAT:7,COLOR_BUFFER_BIT:8,TRIANGLES:9,
  isContextLost:()=>contextLost,getExtension(){return{}},
  createShader:()=>allocate('shaders'),shaderSource(shader){if(failure.shaderSource===shader.id)throw Error('shader source failed')},compileShader(){},
  getShaderParameter:shader=>failure.shaderCompile!==shader.id,getShaderInfoLog:()=> 'shader failed',deleteShader:shader=>remove('shaders',shader),
  createProgram:()=>allocate('programs'),attachShader(_program,shader){if(failure.attachShader===shader.id)throw Error('attach failed')},linkProgram(){},
  getProgramParameter:()=>!failure.link,getProgramInfoLog:()=> 'link failed',deleteProgram:program=>remove('programs',program),useProgram(){},
  createBuffer:()=>allocate('buffers'),deleteBuffer:buffer=>remove('buffers',buffer),bindBuffer(){},bufferData(){if(failure.bufferData)throw Error('buffer upload failed')},
  getAttribLocation:()=>0,enableVertexAttribArray(){},vertexAttribPointer(){},getUniformLocation:(_program,name)=>name,
  uniform4f(){},uniform1f(){},uniform2f(){},uniformMatrix3fv(){},viewport:(...values)=>viewports.push(values),clearColor(){},clear(){},
  drawArrays(){if(failure.draw)throw Error('draw failed');draws++},
 };
 const canvas={
  width:0,height:0,getContext:()=>failure.noContext?null:gl,getBoundingClientRect:()=>({width:240,height:60}),
  addEventListener(type,listener){assert.equal(listeners.has(type),false);listeners.set(type,listener)},
  removeEventListener(type,listener){if(listeners.get(type)===listener)listeners.delete(type)},
 };
 globalThis.devicePixelRatio=3;
 globalThis.requestAnimationFrame=callback=>{frames.set(++nextFrame,callback);return nextFrame};
 globalThis.cancelAnimationFrame=id=>frames.delete(id);
 const tree=HolographicButton({motion:{matrix:{current:identity}}},null),canvases=[];
 const walk=node=>{if(!node||typeof node!=='object')return;if(node.type==='canvas')canvases.push(node);for(const child of [node.props?.children].flat())walk(child)};
 walk(tree);assert.equal(canvases.length,2);canvases[0].props.ref.current=canvas;
 // The last button effect owns the SDR/WebGL fallback; do not start WebGPU.
 const effect=hooks.effects.at(-1);
 return {
  mount:()=>effect(),frames,listeners,resources,deleted,created,viewports,canvas,tree,canvases,
  frame(){const [id,callback]=frames.entries().next().value;frames.delete(id);callback(100)},
  lose(){contextLost=true;const event=new Event('webglcontextlost',{cancelable:true});listeners.get(event.type)?.(event);return event},
  restore(){contextLost=false;listeners.get('webglcontextrestored')?.(new Event('webglcontextrestored'))},
  get error(){return hooks.states[1].value},get draws(){return draws},
 };
}
function assertReleased(h){
 for(const resources of Object.values(h.resources))assert.equal(resources.size,0);
 assert.equal(h.frames.size,0);
}

for(const [name,failure] of [
 ['unavailable context',{noContext:true}],['program allocation',{programsAllocation:1}],
 ['first shader allocation',{shadersAllocation:1}],['second shader allocation',{shadersAllocation:2}],
 ['first shader compilation',{shaderCompile:1}],['second shader compilation',{shaderCompile:2}],
 ['shader source exception',{shaderSource:2}],['shader attachment exception',{attachShader:2}],
 ['program linking',{link:true}],['buffer allocation',{buffersAllocation:1}],['buffer upload exception',{bufferData:true}],
])test(`WebGL ${name} failure cleans all partial resources`,()=>{
 const h=harness(failure),stop=h.mount();assert.equal(h.error,true);assertReleased(h);
 assert.equal(typeof stop,'function');stop();stop();assertReleased(h);assert.equal(h.listeners.size,0);
});

test('WebGL draw failure stops RAF, releases resources, and activates fallback',()=>{
 const h=harness({draw:true}),stop=h.mount();assert.equal(h.error,false);assert.equal(h.frames.size,1);
 h.frame();assert.equal(h.error,true);assertReleased(h);stop();stop();assert.equal(h.listeners.size,0);
});

test('WebGL context loss activates fallback and restoration starts one fresh renderer',()=>{
 const h=harness(),stop=h.mount();h.frame();assert.equal(h.draws,1);assert.equal(h.canvas.width,480);assert.equal(h.canvas.height,120);
 const staleFrame=h.frames.values().next().value;
 const event=h.lose();assert.equal(event.defaultPrevented,true);assert.equal(h.error,true);assertReleased(h);
 h.restore();assert.equal(h.error,false);assert.equal(h.frames.size,1);
 assert.deepEqual(h.viewports.at(-1),[0,0,480,120]);
 staleFrame(200);assert.equal(h.frames.size,1);assert.equal(h.draws,1);
 h.frame();assert.equal(h.draws,2);assert.equal(h.created.programs,2);assert.equal(h.created.shaders,4);assert.equal(h.created.buffers,2);
 stop();stop();assertReleased(h);assert.equal(h.listeners.size,0);
});

test('WebGL repeated loss, restoration and cleanup leaves no RAF or event subscriptions',()=>{
 const h=harness();
 for(let i=0;i<20;i++){
  const stop=h.mount();assert.equal(h.frames.size,1);assert.equal(h.listeners.size,2);
  h.lose();assertReleased(h);h.restore();h.frame();
  const afterUnmount=h.listeners.get('webglcontextrestored');stop();stop();afterUnmount();
  assertReleased(h);assert.equal(h.listeners.size,0);
 }
 assert.equal(h.created.programs,40);assert.equal(h.deleted.programs.length,40);
 assert.equal(h.created.shaders,80);assert.equal(h.deleted.shaders.length,80);
 assert.equal(h.created.buffers,40);assert.equal(h.deleted.buffers.length,40);
});

test('unmount while WebGL context is lost cannot restart rendering',()=>{
 const h=harness(),stop=h.mount();h.lose();const restored=h.listeners.get('webglcontextrestored');
 stop();restored();assertReleased(h);assert.equal(h.listeners.size,0);assert.equal(h.created.programs,1);
});

test('unavailable GPU renders a neutral fallback with the original button label',()=>{
 const healthy=harness(),fallback=harness({initialError:true});
 const body=h=>h.tree.props.children.find(child=>child.props.className.startsWith('holo-button__body'));
 assert.equal(body(healthy).props.className,'holo-button__body');
 assert.equal(body(fallback).props.className,'holo-button__body holo-button__body--fallback');
 assert.equal(body(fallback).props.children.at(-1).props.children.props.children,'ACTIVATE');
 assert.equal(JSON.stringify(fallback.tree).includes('WEBGL UNAVAILABLE'),false);
 assert.ok(fallback.canvases.every(canvas=>canvas.props.style.visibility==='hidden'));
});
