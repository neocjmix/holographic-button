import test from 'node:test';
import assert from 'node:assert/strict';
import {glsl,wgsl,bodyOf,models,samples,luminance,decode,attitude,upstream,dot} from './sticker-foil-reference.mjs';
const chroma=c=>Math.max(...c)-Math.min(...c);
const delta=(a,b)=>Math.max(...a.map((v,i)=>Math.abs(v-b[i])));
const average=v=>v.reduce((a,b)=>a+b,0)/v.length;
const chromaticity=c=>c.map(v=>v/c.reduce((a,b)=>a+b,0));
for(const [language,m] of models){
 test(`${language}: unchanged source curve matches independent upstream oracle`,()=>{
  for(const [width,height]of [[560,148],[320,148],[300,300],[30,30]])for(const transform of [[0,0],[.15,-.12],[-.3,.21]])for(const sourceBase of [1,.35])for(const intensity of [0,1,5])for(const uv of [[.117,.193],[.39,.61],[.83,.76]]){
   const actual=m.shade({uv,transform,aspect:width/height,height,sourceBase,intensity});
   const expected=upstream({uv,transform,width,height,sourceBase,intensity,checkerScale:12.5});
   assert.ok(delta(actual.rawBase,expected.color)<1e-8);
   const optical=upstream({uv,transform:actual.opticalTilt,width,height,checkerScale:12.5});
   assert.ok(delta(actual.sourceTexture,optical.color)<1e-8);
  }
 });
 test(`${language}: source phase density, checker and +20% softened gain remain`,()=>{
  assert.ok(Math.abs(m.stickerPhase(1,0)-m.stickerPhase(0,0)-10/3)<1e-12);
  for(const axis of [-1,-.7,0,.2,1]){
   const angle=Math.asin(axis),old=.5*angle/(1+Math.abs(angle)/(Math.PI/2));
   assert.ok(Math.abs(m.stickerMotion(axis)-1.2*old)<1e-12);
  }
  let switches=0,last=m.stickerDiamond(.1,.4,4);
  for(let i=1;i<=2000;i++){const p=m.stickerDiamond(.1+.8*i/2000,.4,4);switches+=p!==last?1:0;last=p}
  assert.ok(switches>50&&switches<65);
 });
 test(`${language}: same optical frame drives color and energy at fixed gravity`,()=>{
  const opts={uv:[.39,.61],pose:[45,20,0],intensity:5};
  const a=m.shade(opts),b=m.shade({...opts,viewOffset:[1.2,.8]});
  assert.deepEqual(a.tilt,b.tilt);
  assert.ok(delta(chromaticity(a.base.map(decode)),chromaticity(b.base.map(decode)))>.015);
  assert.ok(Math.abs(a.coverage-b.coverage)>.1);
  // Rotate source frame while holding attitude and viewer constant.
  const angle=.25,c=Math.cos(angle),s=Math.sin(angle);
  const basis=m.basis.map(v=>[v[0],c*v[1]-s*v[2],s*v[1]+c*v[2]]);
  const shifted=m.shade({...opts,lightBasis:basis});
  assert.deepEqual(a.tilt,shifted.tilt);
  assert.ok(delta(a.opticalTilt,shifted.opticalTilt)>.05);
  assert.ok(Math.abs(a.coverage-shifted.coverage)>.1);
  assert.ok(delta(chromaticity(a.base),chromaticity(shifted.base))>.01);
 });
 test(`${language}: rainbow fades to dim neutral substrate off-angle and with light off`,()=>{
  const aligned=samples(m,{pose:[62.9,1.1,0],intensity:5},41,13);
  const litMean=average(aligned.map(s=>luminance(s.color.map(decode))));
  assert.ok(average(aligned.map(s=>chroma(s.color)))>.1);
  for(const pose of [[0,0,0],[-80,0,0],[120,0,0]]){
   const off=samples(m,{pose,intensity:5},41,13);
   assert.ok(average(off.map(s=>luminance(s.color.map(decode))))<litMean*.5);
  }
  for(const pose of [[0,0,0],[62.9,1.1,0],[90,20,0]])for(const s of samples(m,{pose,intensity:0},31,11)){
   assert.ok(chroma(s.color)<1e-12);assert.ok(luminance(s.color)<.3);assert.deepEqual(s.hdrColor,s.color);
  }
 });
 test(`${language}: finite continuous response through upright, inverted and heading transitions`,()=>{
  for(const beta of [-180,-90,0,45,62.4,90,180])for(const gamma of [-90,0,20,90])for(const heading of [0,90,180,270]){
   const pose=[beta,gamma,heading],a=m.shade({uv:[.39,.61],pose,intensity:5});
   assert.ok([...a.color,...a.hdrColor,...a.opticalTilt,a.coverage,a.alpha].every(Number.isFinite));
   for(const axis of [0,1,2]){
    const next=pose.map((v,i)=>v+(i===axis?.01:0)),b=m.shade({uv:[.39,.61],pose:next,intensity:5});
    assert.ok(delta(a.color,b.color)<.005);assert.ok(delta(a.opticalTilt,b.opticalTilt)<.001);
   }
  }
 });
 test(`${language}: attached pattern remains visible in colored reflection`,()=>{
  const patch=Array.from({length:100},(_,i)=>m.shade({uv:[.45+(i%10)*.002,.45+Math.floor(i/10)*.002],pose:[62.9,1.1,0],intensity:5}));
  assert.ok(Math.max(...patch.map(s=>luminance(s.color)))-Math.min(...patch.map(s=>luminance(s.color)))>.02);
 });
}
test('actual shader integration uses identical frame for optical phase and angular envelope',()=>{
 for(const shader of [glsl,wgsl]){
  const branch=bodyOf(shader,'if (method > 3.5)'.replaceAll(' ',shader===glsl?'':' '));
  assert.ok(!branch.includes('stickerTilt'));
  assert.match(branch,/opticalX\s*=\s*stickerMotion\(dot\(sr/);
  assert.match(branch,/opticalY\s*=\s*stickerMotion\(dot\(sr/);
  assert.match(branch,/stickerChannel\(0\.,\s*stickerUv.x,\s*stickerUv.y,\s*opticalX,\s*opticalY/);
  assert.ok(!branch.includes('sourceLuma'));assert.ok(!branch.includes('silver'));
 }
 assert.deepEqual(models[0][1].basis,models[1][1].basis);
});
test('GLSL and WGSL share exact unclipped colored radiance; HDR only adds colored energy',()=>{
 const [sdr,hdr]=models.map(([,m])=>m);
 for(const base of [.1,.6,.9,1.2])for(const h of [0,.01,.3,.9])for(const substrate of [.885,.94,.98]){
  const expected=.055*decode(substrate)+decode(base)*h*.82;
  assert.ok(Math.abs(sdr.stickerLinear(base,h,substrate,0)-expected)<1e-12);
  assert.equal(sdr.stickerLinear(base,h,substrate,0),hdr.stickerLinear(base,h,substrate,0));
 }
 for(const pose of [[0,0,0],[45,20,0],[62.9,1.1,0],[90,-20,90]])for(const aspect of [1,2,4,6])for(const intensity of [0,.1,1,5,1000])for(let i=0;i<30;i++){
  const opts={uv:[.08+.84*(i%6)/5,.1+.8*Math.floor(i/6)/4],pose,aspect,intensity};
  const a=sdr.shade(opts),b=hdr.shade(opts);assert.deepEqual(a.base,b.base);assert.deepEqual(a.color,b.color);
  assert.ok(b.hdrColor.every((c,i)=>Number.isFinite(c)&&c>=b.color[i]-1e-12));
  const ambient=.055*decode(b.substrate),linear=b.hdrColor.map(decode);
  if(b.highlight>.01){const carrier=b.base.map(decode);assert.ok(delta(chromaticity(linear.map(c=>c-ambient)),chromaticity(carrier))<1e-10)}
 }
});
test('preserved rightward light frame and finite silhouette',()=>{
 const m=models[0][1],matrix=attitude([62.4,-6.9,0]),light=m.basis[2];
 const local=[0,1,2].map(c=>dot(matrix.slice(c*3,c*3+3),light));
 const dx=5*local[0]/local[2]/4,dy=-5*local[1]/local[2];
 assert.ok(dx>.16&&dx<.19);assert.ok(Math.abs(dy)<.05);
 for(const [,m]of models)for(const uv of [[0,0],[.01,.5],[.5,.5],[1,1]])for(const pose of [[-180,0,0],[-90,90,180],[90,-90,270],[180,0,0]]){
  const s=m.shade({uv,pose,intensity:5});assert.ok([...s.color,...s.hdrColor,s.alpha].every(Number.isFinite));assert.ok(s.alpha>=0&&s.alpha<=1);
 }
});

test('SDR shoulder preserves whole-RGB chromaticity without channel clipping',()=>{
 for(const [,m]of models)for(const rgb of [[.5,.9,1.3],[1.3,1.2,.8],[.8,.6,.4]])for(const highlight of [.2,.7,.95]){
  const linear=rgb.map(c=>m.stickerLinear(c,highlight,.94,0));
  const encoded=rgb.map(c=>m.stickerSdr(c,highlight,.94,Math.max(...rgb)));
  assert.ok(encoded.every(c=>c>=0&&c<1));
  assert.ok(delta(chromaticity(encoded.map(decode)),chromaticity(linear))<1e-12);
 }
});
test('upper HDR intensity increases colored reflection substantially',()=>{
 const m=models[1][1],means=[1,5,10].map(intensity=>average(samples(m,{pose:[62.9,1.1,0],intensity},41,13).map(s=>luminance(s.hdrColor.map(decode)))));
 assert.ok(means[1]>means[0]*1.8);assert.ok(means[2]>means[1]*1.3);
});

test('post-texture chroma increases saturation, preserves the spectral peak and leaves neutral input neutral',()=>{
 for(const [,m]of models){
  for(const rgb of [[.7,.9,1.2],[1.3,.8,.6],[.5,.6,.4],[1,1,1]]){
   const peak=Math.max(...rgb),enhanced=rgb.map(c=>m.stickerChroma(c,peak));
   assert.equal(Math.max(...enhanced),peak);
   assert.ok(enhanced.every(c=>Number.isFinite(c)&&c>=0&&c<=peak));
   if(chroma(rgb)>0)assert.ok(chroma(enhanced)>chroma(rgb)*1.5);
   else assert.deepEqual(enhanced,rgb);
  }
  const ss=samples(m,{pose:[62.9,1.1,0],intensity:5},121,33);
  const original=ss.map(s=>s.sourceTexture.map(c=>m.stickerSdr(c,s.highlight,s.substrate,Math.max(...s.sourceTexture))));
  assert.ok(average(ss.map(s=>chroma(s.color)))>average(original.map(chroma))*1.9);
  assert.ok(ss.every(s=>s.color.every(c=>Number.isFinite(c)&&c>=0&&c<1)));
  assert.ok(ss.filter(s=>chroma(s.color)<.1).length<original.filter(c=>chroma(c)<.1).length);
 }
});
test('strength-five HDR peak exceeds preview11 while remaining carried by saturated spectral color',()=>{
 const m=models[1][1],ss=samples(m,{pose:[62.9,1.1,0],intensity:5},121,33);
 const peak12=Math.max(...ss.flatMap(s=>s.hdrColor.map(decode)));
 // Preview11 used the same source peak and .5 * strength headroom.
 const peak11=Math.max(...ss.flatMap(s=>s.sourceTexture.map(c=>m.stickerLinear(c,s.highlight,s.substrate,.5*(11*5/(10+5))))));
 assert.ok(peak12>peak11*1.5);
 const bright=ss.filter(s=>Math.max(...s.hdrColor.map(decode))>peak12*.9);
 assert.ok(bright.length>0);assert.ok(average(bright.map(s=>chroma(s.hdrColor)/Math.max(...s.hdrColor)))>.4);
});
