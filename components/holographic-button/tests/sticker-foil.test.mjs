import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {glsl,wgsl,bodyOf,models,samples,luminance,decode,attitude} from './sticker-foil-reference.mjs';

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

test('new preset returns before old facet micro-normals and dark metallic presentation',()=>{
 assert.ok(glsl.indexOf('if(method>3.5)')<glsl.indexOf('float grain=noise('));
 assert.ok(wgsl.indexOf('if (method > 3.5)')<wgsl.indexOf('  let grain ='));
 const g=bodyOf(glsl,'if(method>3.5)'),w=bodyOf(wgsl,'if (method > 3.5)');
 assert.ok(g.includes('return;'));assert.ok(w.includes('return vec4f(stickerRgb * al, al)'));
 assert.ok(w.includes('if (al < .01) { return vec4f(0.); }'));
 for(const source of [g,w])for(const forbidden of ['metal/','metal /','presentHdr(','micro','material'])assert.equal(source.includes(forbidden),false,forbidden);
 assert.ok(g.includes('normalize(vec3(gd*rim.y,1.))'));
 assert.ok(w.includes('normalize(vec3f(gd * rim.y, 1.))'));
 assert.ok(g.includes('worldFromDevice[2].xy'));assert.ok(w.includes('u.worldFromDevice[2].xy'));
 assert.ok(g.includes('stickerRgb*al,al'));
});

for(const [language,model] of models) {
 test(`${language}: six simultaneous pastel hue zones with a bright silver base at three widths and poses`,()=>{
  for(const aspect of [2,4,6])for(const pose of [[0,0,0],[12,-15,0],[-14,15,0]]){
    const colors=samples(model,{aspect,pose,intensity:0}).map(s=>s.color);
    const bins=[0,0,0,0,0,0];for(const c of colors){const bin=hueBin(c);if(bin>=0)bins[bin]++}
    assert.ok(bins.every(n=>n/colors.length>.055),`${aspect} ${pose}: ${bins}`);
    assert.ok(average(colors.map(luminance))>.84);
    assert.ok(Math.min(...colors.map(luminance))>.68);
    const silver=colors.filter(c=>chroma(c)<.08).length/colors.length;
    assert.ok(silver>.12&&silver<.26,`silver fraction ${silver}`);
    assert.ok(average(colors.map(chroma))>.17&&average(colors.map(chroma))<.24);
    assert.ok(colors.flat().every(c=>c>=0&&c<=1));
  }
 });
 test(`${language}: independent X/Y phases translate opposite tilt while the diamond remains fixed`,()=>{
  for(const aspect of [2,4,6])for(const tilt of [-.3,-.05,0,.12,.3]){
    const x=.57,y=.39;
    const shiftedX=x-tilt*.7/(aspect*.42),shiftedY=y-tilt*.7/.68;
    assert.ok(Math.abs(model.stickerPhaseX(shiftedX,tilt,aspect)-model.stickerPhaseX(x,0,aspect))<1e-12);
    assert.ok(Math.abs(model.stickerPhaseY(shiftedY,tilt)-model.stickerPhaseY(y,0))<1e-12);
  }
  let changed=0;
  for(let i=0;i<120;i++){
    const uv=[.1+.8*(i%20)/19,.2+.6*Math.floor(i/20)/5];
    const a=model.shade({uv,intensity:0}),b=model.shade({uv,intensity:0,pose:[12,-15,0]});
    assert.equal(a.pattern,b.pattern);assert.ok(a.pattern===0||a.pattern===1);
    if(delta(a.base,b.base)>.05)changed++;
    assert.equal(delta(a.normal,[0,0,1]),0);assert.equal(delta(b.normal,[0,0,1]),0);
  }
  assert.ok(changed>100);
 });
 test(`${language}: fixed diamond has fine, aspect-correct, alternating contrast`,()=>{
  let switches=0,last=model.stickerDiamond(.1,.4,4);
  for(let i=1;i<=2000;i++){
    const p=model.stickerDiamond(.1+.8*i/2000,.4,4);
    switches+=p!==last?1:0;last=p;
  }
  assert.ok(switches>60&&switches<90,`diamond transitions ${switches}`);
  for(const aspect of [2,4,6])for(const physicalX of [.1,.2,.31,.47,.7]){
    assert.equal(model.stickerDiamond(physicalX/aspect,.41,aspect),model.stickerDiamond(physicalX/4,.41,4));
  }
 });
 test(`${language}: tilt response is continuous without angle wrapping or pattern shimmer`,()=>{
  for(const angle of [-85,-45,-20,0,20,45,85])for(const uv of [[.18,.3],[.4,.5],[.76,.64]]){
    const a=model.shade({uv,pose:[angle,angle*.6,15]}),b=model.shade({uv,pose:[angle+.0001,angle*.6,15]});
    assert.ok(delta(a.base,b.base)<.00001);
    assert.ok(Math.abs(a.glare-b.glare)<.00001);
    assert.equal(a.pattern,b.pattern);
  }
 });
 test(`${language}: specular zero preserves foil and numeric strength controls only soft glare`,()=>{
  const ss=samples(model,{intensity:0});
  for(const s of ss){assert.deepEqual(s.color,s.base);assert.deepEqual(s.hdrColor,s.base)}
  const uv=[.48,.29],zero=model.shade({uv,intensity:0});
  let prior=zero;
  for(const intensity of [.25,.5,1,2,3]){
    const current=model.shade({uv,intensity});
    assert.deepEqual(current.base,zero.base);assert.equal(current.glare,zero.glare);
    assert.ok(luminance(current.color)>luminance(prior.color));
    prior=current;
  }
  for(const intensity of [0,.25,1,3,100]){
    const edge=model.shade({uv:[.15,.5],intensity});
    assert.equal(edge.glare,0);assert.deepEqual(edge.color,edge.base);assert.deepEqual(edge.hdrColor,edge.base);
  }
 });
 test(`${language}: separate glare follows the existing matrix and fixed light positions`,()=>{
  const a=model.shade({uv:[.5,.5],matrix:attitude([0,0,0])});
  const b=model.shade({uv:[.5,.5],matrix:attitude([12,-15,0])});
  assert.ok(Math.hypot(...a.centers[0].map((x,i)=>x-b.centers[0][i]))>.1);
  assert.ok(Math.hypot(...a.centers[1].map((x,i)=>x-b.centers[1][i]))>.1);
  for(const offset of [.05,.1,.2,.4,.67,.8]){
    // Equal physical horizontal/vertical distances must have equal blur.
    assert.equal(model.stickerGlare(offset,0,0,0,.68),model.stickerGlare(0,offset,0,0,.68));
  }
  const shader=language==='GLSL'?glsl:wgsl;
  assert.match(shader,/stickerGlare\(p\.x,\s*p\.y,/);
  assert.match(shader,/stickerLight\s*=\s*normalize\(vec3f?\(-\.12,\s*-\.66,\s*\.74\)\)/);
  assert.match(shader,/stickerLight2\s*=\s*normalize\(vec3f?\(\.72,\s*-\.12,\s*\.68\)\)/);
 });
}

test('WGSL: HDR extension is localized to glare, with a bounded finite highlight and exact SDR outside it',()=>{
 const model=models[1][1];
 for(const pose of [[0,0,0],[12,-15,0],[-14,15,0]]){
   const ss=samples(model,{pose});
   const bright=ss.filter(s=>Math.max(...s.hdrColor)>1).length/ss.length;
   assert.ok(bright>.07&&bright<.16,`HDR area ${bright}`);
   assert.ok(Math.max(...ss.flatMap(s=>s.hdrColor))>1.1);
   for(const s of ss){
     if(s.glare<=.16)assert.deepEqual(s.hdrColor,s.color);
     assert.ok(s.hdrColor.every((c,i)=>c>=s.color[i]&&Number.isFinite(c)&&decode(c)<4));
   }
 }
 for(const intensity of [0,.001,.25,1,3,1000])for(const base of [.1,.7,.86,1])for(const glare of [0,.01,.16,.5,1,1.27]){
   const out=model.stickerHdr(base,glare,intensity);
   assert.ok(Number.isFinite(out)&&out>=base&&decode(out)<4);
 }
 for(const base of [.7,.86,.99])assert.ok(Math.abs(model.stickerHdr(base,.16+1e-8,1)-model.stickerHdr(base,.16,1))<1e-7);
});

test('GLSL/WGSL actual scalar equations, assembled base, diamond, glare and SDR presentation agree numerically',()=>{
 const g=models[0][1],w=models[1][1];
 for(const aspect of [1.5,2,4,6])for(const pose of [[0,0,0],[12,-15,0],[-14,15,0],[30,-25,17]])for(const intensity of [0,.5,1,3]){
   for(let i=0;i<60;i++){
     const options={aspect,pose,intensity,uv:[.08+.84*(i%12)/11,.18+.64*Math.floor(i/12)/4]};
     const a=g.shade(options),b=w.shade(options);
     assert.deepEqual(a.base,b.base);assert.deepEqual(a.color,b.color);
     assert.equal(a.pattern,b.pattern);assert.equal(a.glare,b.glare);assert.equal(a.alpha,b.alpha);
     assert.deepEqual(a.normal,b.normal);
   }
 }
 // The actual reference's third channel couples both phases, rather than a
 // recolored one-dimensional spectrum. No advertised-but-unused blend factor.
 for(const shader of [glsl,wgsl]){
   assert.match(bodyOf(shader,shader===glsl?'float stickerChannel(':'fn stickerChannel('),/sin\(phaseX \+ phaseY - jitter\)/);
   assert.equal(shader.includes('blendFactor'),false);
 }
});
