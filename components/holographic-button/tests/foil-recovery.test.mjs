import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {transform} from 'esbuild';
import {attitude,models,dot} from './sticker-foil-reference.mjs';
const source=await readFile(new URL('../foil-recovery.ts',import.meta.url),'utf8');
const component=await readFile(new URL('../index.tsx',import.meta.url),'utf8');
const renderer=await readFile(new URL('../hdr-renderer.ts',import.meta.url),'utf8');
const {code}=await transform(source,{loader:'ts',format:'esm'});
const {createFoilRecovery,retainFoilRecovery,foilRecoveryMatrix}=await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
const raw=pose=>new Float32Array(attitude(pose));
const delta=(a,b)=>Math.max(...a.map((v,i)=>Math.abs(v-b[i])));
const light=models[0][1].basis[2];
const angle=m=>Math.acos(Math.min(1,Math.max(-1,dot(Array.from(m.slice(6)),light))));
function run(pose,hz,seconds){const r=createFoilRecovery(),m=raw(pose);let out;for(let i=0;i<=hz*seconds;i++)out=r.sample(m,1000*i/hz);return out;}
test('constant attitude convergence is elapsed-time based at 30/60/120 Hz',()=>{
 for(const pose of [[0,0,0],[90,35,179],[-140,-70,359]]){
  const outputs=[30,60,120].map(hz=>run(pose,hz,8));
  assert.ok(delta(outputs[0],outputs[1])<2e-7);assert.ok(delta(outputs[1],outputs[2])<2e-7);
  assert.ok(angle(outputs[0])<.14);
 }
});
test('steady pose recovers bright colored reflection without replacing sensor input',()=>{
 const r=createFoilRecovery(),m=raw([0,0,0]),saved=Array.from(m),energies=[];
 for(let i=0;i<=1200;i++){const out=r.sample(m,i*1000/60);if(i%120===0)energies.push(models[0][1].shade({uv:[.5,.5],matrix:out,intensity:5}).coverage);}
 assert.equal(energies[0],0);assert.ok(energies.at(-1)>.99);assert.deepEqual(Array.from(m),saved);
 for(let i=1;i<energies.length;i++)assert.ok(energies[i]>=energies[i-1]-1e-8);
});
test('new device tilt remains immediate then slowly returns to colored emitter',()=>{
 const r=createFoilRecovery();let before;
 for(let i=0;i<=1200;i++)before=r.sample(raw([45,10,0]),i*1000/60);
 const moved=raw([85,10,0]);let after=r.sample(moved,20000+1000/60);
 assert.ok(delta(before,after)>.45);assert.ok(angle(after)>.6);
 for(let i=2;i<=900;i++)after=r.sample(moved,20000+i*1000/60);
 assert.ok(angle(after)<.005);
});
test('long pause freezes correction, preserves changed raw pose, and dt is capped',()=>{
 const a=createFoilRecovery(),b=createFoilRecovery(),m=raw([30,0,0]);
 for(let i=0;i<=120;i++){a.sample(m,i*1000/60);b.sample(m,i*1000/60);}
 const moved=raw([75,20,0]),resume=a.sample(moved,62000),immediate=b.sample(moved,2000+1e-7);
 assert.ok(delta(resume,immediate)<1e-7);
 const c=createFoilRecovery(),d=createFoilRecovery();c.sample(m,0);d.sample(m,0);
 assert.deepEqual(c.sample(m,200),d.sample(m,100));
 assert.ok(a.sample(moved,62016).every(Number.isFinite));
});
test('heading wrap and 180-degree orientations remain proper rotations without drift',()=>{
 const r=createFoilRecovery();let last;
 for(let i=0;i<2000;i++){
  const out=r.sample(raw([180,30,(179+i*.01)%360]),i*1000/120);
  for(let c=0;c<3;c++)assert.ok(Math.abs(Math.hypot(...out.slice(c*3,c*3+3))-1)<1e-6);
  assert.ok(Math.abs(dot(Array.from(out.slice(0,3)),Array.from(out.slice(3,6))))<1e-6);
  if(last)assert.ok(delta(last,out)<.03);last=out;
 }
});
test('shared stable refs are coherent, duplicate RAF samples idempotent, final release resets',()=>{
 const ref={current:raw([0,0,0])},other={current:raw([0,0,0])};
 const releaseA=retainFoilRecovery(ref),releaseB=retainFoilRecovery(ref),releaseOther=retainFoilRecovery(other);
 foilRecoveryMatrix(ref,0);for(let i=1;i<=120;i++)foilRecoveryMatrix(ref,i*1000/60);
 const adapted=foilRecoveryMatrix(ref,2000);
 assert.strictEqual(foilRecoveryMatrix(ref,2000),adapted);
 assert.ok(delta(adapted,foilRecoveryMatrix(other,2000))>.3);
 releaseA();releaseA();assert.strictEqual(foilRecoveryMatrix(ref,2000),adapted);
 releaseB();assert.strictEqual(foilRecoveryMatrix(ref,2001),ref.current);
 const releaseNew=retainFoilRecovery(ref);assert.ok(delta(foilRecoveryMatrix(ref,2002),ref.current)<1e-7);
 releaseNew();releaseOther();
});
test('same effective matrix source feeds HDR and WebGL; original four and shared hook remain raw',()=>{
 assert.match(component,/preset.method===4\?foilRecoveryMatrix\(motion.matrix,now\):motion.matrix.current/);
 assert.match(component,/matrix:renderMatrix/);assert.match(component,/uniformMatrix3fv\(um,false,renderMatrix\(now\)\)/);
 assert.match(renderer,/const m = options.matrix\(now\)/);
 assert.match(component,/retainFoilRecovery\(motion.matrix\):undefined,\[motion.matrix,preset\]/);
 assert.ok(!source.includes('requestAnimationFrame'));assert.ok(!source.includes('addEventListener'));assert.ok(!source.includes('setInterval'));
});
