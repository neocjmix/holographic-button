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

test('texture color stays source-faithful except authorized checker scale',()=>{
 for(const [language,model] of models) for(const uv of [[.117,.193],[.39,.61],[.83,.76]]) {
  const expected=upstream({uv,checkerScale:12.5});
  assert.ok(delta(model.shade({uv}).base,expected.color)<1e-8);
 }
 // Independent literal upstream checker remains 25 by default; changing only
 // the checker frequency restores the original source RGB oracle.
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
    const expected=upstream({uv,transform,width,height,sourceBase,intensity,checkerScale:12.5});
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
 test(`${language}: authorized checker is twice as large and noise remains attached`,()=>{
  let switches=0,last=model.stickerDiamond(.1,.4,4);
  for(let i=1;i<=2000;i++){const p=model.stickerDiamond(.1+.8*i/2000,.4,4);switches+=p!==last?1:0;last=p}
  assert.ok(switches>50&&switches<65,`${switches}`);
  for(const uv of [[.15,.3],[.6,.7]])assert.equal(model.shade({uv,pose:[0,0,0]}).pattern,model.shade({uv,pose:[25,-20,100]}).pattern);
 });
 test(`${language}: reflection comes before foil, leaves white fill RGB unchanged`,()=>{
  for(const uv of [[.5,.5],[.52,.49],[.9,.2]]){
   assert.deepEqual(model.shade({uv,intensity:0}).base,model.shade({uv,intensity:3}).base);
   const actual=model.shade({uv,sourceBase:.35,intensity:1});
   const expected=upstream({uv,sourceBase:.35,width:592,height:148,checkerScale:12.5});
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
   assert.ok(b.hdrColor.every((x,i)=>x>=b.color[i]));
  }
 }
});
test('HDR preserves natural source excess at1 and offers a genuinely stronger upper range',()=>{
 const model=models[1][1];
 for(const base of [.1,.7,1,1.1,1.3]){
  assert.equal(model.stickerHdr(base,0,0,.96),Math.min(base,1));
  assert.equal(model.stickerHdr(base,1,0,.96),base);
  let prior=0;
  for(const intensity of [0,.25,.5,1,2,3,1000]){
   const out=model.stickerHdr(base,intensity,0,.96);
   assert.ok(out>=prior&&out<=Math.min(base,1)+11*Math.max(base-1,0));prior=out;
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

test('softbox aligned at portrait fills the face with neutral textured silver in SDR and HDR',()=>{
 for(const [language,model] of models)for(const aspect of [1,2,4,6]){
  const row=samples(model,{pose:[62.4,-6.9,0],aspect,intensity:5},101,31);
  assert.ok(Math.min(...row.map(s=>s.coverage))>.99,`${language} aspect${aspect}`);
  assert.ok(Math.max(...row.map(s=>chroma(s.color)))<.05);
  assert.ok(row.every(s=>s.color.every(c=>c<1&&c>.82)));
  if(language==='WGSL')assert.ok(Math.max(...row.map(s=>chroma(s.hdrColor)/luminance(s.hdrColor)))<.055);
  // Texture must remain visible within each local neighborhood, where the
  // softbox is flat; a large-scale illumination gradient cannot satisfy this.
  const patch=Array.from({length:100},(_,i)=>model.shade({uv:[.45+(i%10)*.002,.45+Math.floor(i/10)*.002],aspect,pose:[62.4,-6.9,0],intensity:5}));
  assert.ok(Math.max(...patch.map(s=>luminance(s.color)))-Math.min(...patch.map(s=>luminance(s.color)))>.045);
 }
});
test('off-angle softbox shoulder is a broad monotonic gradient, with exact source recovery outside',()=>{
 for(const [language,model] of models){
  const row=Array.from({length:31},(_,i)=>model.shade({uv:[.08+.84*i/30,.5],pose:[62.4,45,0],intensity:5}));
  const weights=row.map(s=>s.coverage);
  assert.ok(Math.max(...weights)-Math.min(...weights)>.4,JSON.stringify(weights));
  assert.ok(weights.filter(v=>v>.05&&v<.95).length>row.length*.6);
  for(let i=1;i<weights.length;i++)assert.ok(weights[i]<=weights[i-1]+1e-6);
  for(const pose of [[-80,0,0],[0,0,180]])for(const uv of [[.2,.3],[.5,.5],[.8,.7]]){
   const s=model.shade({uv,pose,intensity:5});assert.equal(s.highlight,0);
   assert.deepEqual(s.color,s.base.map(c=>Math.max(0,Math.min(1,c))));
  }
 }
});
test('softbox bound is separate from aurora strength, and source motion gains exactly20%',()=>{
 for(const [,model] of models){
  for(const axis of [-1,-.7,0,.2,1]){
   const angle=Math.asin(axis),old=.5*angle/(1+Math.abs(angle)/(Math.PI/2));
   assert.ok(Math.abs(model.stickerMotion(axis)-1.2*old)<1e-12);
  }
  assert.ok(model.stickerHighlight(1,5)>.93&&model.stickerHighlight(1,5)<.94);
  for(const intensity of [0,.1,1,5,10,1000])for(const coverage of [0,.2,1])assert.ok(model.stickerHighlight(coverage,intensity)<=1);
 }
});
test('world-lit highlight remains finite and continuous at portrait, landscape and heading changes',()=>{
 for(const [,model] of models)for(const beta of [-180,-90,0,62.4,90,180])for(const gamma of [-90,0,90])for(const heading of [0,90,180,270]){
  const pose=[beta,gamma,heading],a=model.shade({uv:[.39,.61],pose,intensity:5});
  assert.ok([...a.color,...a.hdrColor,a.coverage].every(Number.isFinite));
  for(const axis of [0,1,2]){
   const next=pose.map((v,i)=>v+(i===axis?.01:0)),b=model.shade({uv:[.39,.61],pose:next,intensity:5});
   assert.ok(Math.abs(a.coverage-b.coverage)<.005);
  }
 }
});
test('gloss off restores raw SDR and alpha stays finite at silhouette and all pose extremes',()=>{
 for(const [language,model] of models)for(const pose of [[-180,0,0],[-90,90,180],[90,-90,270],[180,0,0]])
 for(const uv of [[0,0],[.01,.5],[.5,.5],[1,1]])for(const intensity of [0,1,3,10]){
  const s=model.shade({uv,pose,intensity});
  assert.ok([...s.color,...s.hdrColor,s.alpha].every(Number.isFinite));
  assert.ok(s.alpha>=0&&s.alpha<=1);
  if(intensity===0){assert.deepEqual(s.color,s.base.map(x=>Math.max(0,Math.min(1,x))));assert.deepEqual(s.hdrColor,s.color)}
 }
});
