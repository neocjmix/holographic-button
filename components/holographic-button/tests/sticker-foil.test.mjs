import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {glsl,wgsl,bodyOf,models,samples,luminance,decode,attitude,upstream} from './sticker-foil-reference.mjs';

const hash=s=>createHash('sha256').update(s).digest('hex');
const chroma=c=>Math.max(...c)-Math.min(...c);
const delta=(a,b)=>Math.max(...a.map((v,i)=>Math.abs(v-b[i])));
const average=v=>v.reduce((a,b)=>a+b,0)/v.length;
function hueBin(c) {
 const max=Math.max(...c),d=chroma(c);
 if(d<.08)return -1;
 const hue=max===c[0]?(c[1]-c[2])/d:max===c[1]?2+(c[2]-c[0])/d:4+(c[0]-c[1])/d;
 return Math.floor((hue+6)%6);
}
function removeBranch(shader,marker) {
 const at=shader.indexOf(marker);assert.notEqual(at,-1);
 const body=bodyOf(shader,marker),open=shader.indexOf('{',at);
 return shader.slice(0,at)+shader.slice(open+body.length+2);
}

test('method 4 is isolated: removing only its additions restores both complete previous shader sources byte-for-byte',()=>{
 const comment='// Sticker foil adapted from bpisano/Sticker';
 let g=glsl.slice(0,glsl.indexOf(comment))+glsl.slice(glsl.indexOf('void main()'));
 g=removeBranch(g,'if(method>3.5)');
 assert.equal(hash(g),'ae33949d2e580d9dcebcac6f24ac4d13623a13c110d899f3aaad3bfcaffb2d75');
 let w=wgsl.slice(0,wgsl.indexOf(comment))+wgsl.slice(wgsl.indexOf('@fragment fn fs('));
 const from=w.indexOf('  // Isolated fifth preset;');
 const to=w.indexOf('  let grain =');
 assert.ok(from>0&&to>from);
 w=w.slice(0,from)+w.slice(to);
 assert.equal(hash(w),'fe7a6539af2b6597e6c6b9711ea7ec58d5aa2f542ea98d9ad8a336dbbcaa2fed');
});

test('method4 uses top-left UV and CSS-point dimensions without changing original motion',()=>{
 assert.match(glsl,/stickerUv=vec2\(uv.x,1.-uv.y\)/);
 assert.match(wgsl,/stickerUv = vec2f\(uv.x, 1. - uv.y\)/);
 for(const shader of [glsl,wgsl])assert.ok(shader.includes('material.x'));
});
for(const [language,model] of models) {
 test(`${language}: independent upstream oracle matches all RGB channels, dimensions and poses`,()=>{
  for(const [width,height] of [[560,148],[320,148],[300,300],[30,30]])
  for(const transform of [[0,0],[.15,-.12],[-.3,.21]])
  for(const sourceBase of [1,.35])for(const intensity of [0,1,2]){
   for(const uv of [[.117,.193],[.39,.61],[.501,.497],[.83,.76]]){
    const expected=upstream({uv,transform,width,height,sourceBase,intensity});
    const actual=model.shade({uv,transform,aspect:width/height,height,sourceBase,intensity});
    assert.ok(delta(actual.base,expected.color)<1e-8,JSON.stringify({language,width,height,uv,actual:actual.base,expected:expected.color}));
    assert.ok(Math.abs(actual.glare-expected.glare)<1e-12);
   }
  }
 });
 test(`${language}: phase density stays at 10/3 across both axes, unrelated to aspect`,()=>{
  assert.ok(Math.abs(model.stickerPhase(1,0)-model.stickerPhase(0,0)-10/3)<1e-12);
  assert.equal(model.stickerPhase(.4,.1),model.stickerPhase(.25,0));
 });
 test(`${language}: source checkerScale is applied twice and noise remains attached`,()=>{
  let switches=0,last=model.stickerDiamond(.1,.4,4);
  for(let i=1;i<=2000;i++){const p=model.stickerDiamond(.1+.8*i/2000,.4,4);switches+=p!==last?1:0;last=p}
  assert.ok(switches>105&&switches<120,`${switches}`);
  for(const uv of [[.15,.3],[.6,.7]])assert.equal(model.shade({uv,pose:[0,0,0]}).pattern,model.shade({uv,pose:[25,-20,100]}).pattern);
 });
 test(`${language}: reflection comes before foil, leaves white fill RGB unchanged`,()=>{
  for(const uv of [[.5,.5],[.52,.49],[.9,.2]]){
   assert.deepEqual(model.shade({uv,intensity:0}).base,model.shade({uv,intensity:3}).base);
   const actual=model.shade({uv,sourceBase:.35,intensity:1});
   const expected=upstream({uv,sourceBase:.35,width:592,height:148});
   assert.ok(delta(actual.base,expected.color)<1e-8);
  }
 });
 test(`${language}: matrix adapter ignores compass heading and stays finite`,()=>{
  for(const pose of [[12,-15,0],[-35,22,0],[0,0,0]]){
   const a=model.shade({uv:[.3,.5],pose});
   for(const heading of [0,45,180,270]){
    const b=model.shade({uv:[.3,.5],pose:[pose[0],pose[1],heading]});
    assert.deepEqual(a.tilt,b.tilt);assert.deepEqual(a.base,b.base);
   }
  }
  for(const beta of [-179,-90,0,90,179])for(const gamma of [-90,0,90]){
   const s=model.shade({uv:[.3,.6],pose:[beta,gamma,0]});
   assert.ok(s.tilt.every(x=>Number.isFinite(x)&&Math.abs(x)<Math.PI/4));
  }
 });
}
test('actual GLSL and WGSL scalar source agrees; SDR clamps only at presentation',()=>{
 for(const pose of [[0,0,0],[12,-15,0],[-20,25,130]])for(const aspect of [1,2,4,6]){
  for(let i=0;i<90;i++){
   const opts={uv:[.02+.96*(i%10)/9,.02+.96*Math.floor(i/10)/8],pose,aspect};
   const a=models[0][1].shade(opts),b=models[1][1].shade(opts);
   assert.deepEqual(a.base,b.base);assert.deepEqual(a.color,b.color);
   assert.deepEqual(b.hdrColor,b.base.map(x=>Math.max(0,x)));
  }
 }
});
test('HDR preserves natural source excess at1; specular scales only bounded over-white color',()=>{
 const model=models[1][1];
 for(const base of [.1,.7,1,1.1,1.3]){
  assert.equal(model.stickerHdr(base,0),Math.min(base,1));
  assert.equal(model.stickerHdr(base,1),base);
  let prior=0;
  for(const intensity of [0,.25,.5,1,2,3,1000]){
   const out=model.stickerHdr(base,intensity);
   assert.ok(out>=prior&&out<=Math.min(base,1)+2*Math.max(base-1,0));prior=out;
  }
 }
});

for(const [language,model] of models)test(`${language}: gravity adapter is continuous across upright and inverted handset poses`,()=>{
 for(const beta of [-180,-90,0,90,180])for(const gamma of [-90,-20,1,20,90]){
  const a=model.shade({uv:[.39,.61],pose:[beta-.01,gamma,30]});
  const b=model.shade({uv:[.39,.61],pose:[beta+.01,gamma,30]});
  assert.ok(delta(a.tilt,b.tilt)<.001,JSON.stringify({beta,gamma,a:a.tilt,b:b.tilt}));
  assert.ok(delta(a.base,b.base)<.002);
 }
});
