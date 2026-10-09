import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build,transform} from 'esbuild';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
const uiModule=await transform(await readFile('app/optical-tuning.ts','utf8'),{loader:'ts',format:'esm'});
const {toSliderValue,fromSliderValue,formatOpticalValue,matchesPreset}=await import('data:text/javascript;base64,'+Buffer.from(uiModule.code).toString('base64'));
const hash=s=>createHash('sha256').update(s).digest('hex');
test('stable metadata is coherent and only the component is publishable',async()=>{
 const root=JSON.parse(await readFile('package.json','utf8'));
 const pkg=JSON.parse(await readFile('components/holographic-button/package.json','utf8'));
 assert.equal(root.private,true);assert.notEqual(pkg.private,true);
 assert.equal(pkg.version,'1.0.0');assert.equal(root.version,pkg.version);
 assert.equal(root.dependencies[pkg.name],pkg.version);
 assert.ok(!pkg.scripts.prepublishOnly);
 for(const path of ['package-lock.json','components/holographic-button/package-lock.json']){
  const lock=JSON.parse(await readFile(path,'utf8'));
  assert.equal(lock.version,pkg.version);assert.equal(lock.packages[''].version,pkg.version);
 }
 assert.match(pkg.files.join(' '),/THIRD_PARTY_NOTICES/);
});
test('original interaction CSS, attitude math and texture formulas are unchanged outside approved rim rules',async()=>{const now=await readFile('components/holographic-button/index.tsx','utf8');assert.equal(hash((await readFile('components/holographic-button/holographic-button.css','utf8')).replace(/\n\.holo-button__body--fallback\{[^}]*\}\n?$/,'').replace(/\.holo-button__(?:shadow|body(?::after)?)\{[^}]*\}/g,'')),'dcd8e2dfd3a30c255a2a4ce12d4d45826af917d9eb1f49a987a08c0fabbaaeb2');assert.equal(hash(await readFile('app/globals.css','utf8')),'6d025dfee5367522edf6852b6a484d4a3d9f3a63bbe9f79177424635f9c72ab4');assert.equal(hash(now.slice(now.indexOf('const rad='),now.indexOf('export function useHolographicMotion'))),'b496c72cff212d40531c0161c231cd5b389f39eeb7374444201ce719b40e0ad6');});
test('demo always renders one satin shader with numeric optical options',async()=>{
 assert.match(await readFile('github-pages/entry.tsx','utf8'),/import Home from "..\/app\/page"/);
 const demo=await readFile('app/page.tsx','utf8');
 assert.match(demo,/Surface specular intensity/);
 assert.match(demo,/min="0" max="10" step="0.05"/);
 assert.doesNotMatch(demo,/setVariant|variant=\{/);
 assert.equal([...demo.matchAll(/variant="satin-mirror"/g)].length,4,'three rendered examples plus copied React code');
 assert.match(demo,/opticalOptions=\{DEFAULT_OPTICAL_OPTIONS\}/);
 assert.match(demo,/opticalOptions=\{opticalOptions\}/);
 assert.match(demo,/opticalOptions=\{preset.options\} specular=\{preset.specular\}/);
 assert.match(demo,/ONE SHADER · NUMERIC PRESETS/);
 assert.match(demo,/Legacy variants remain available in the package/);
});

test('preserve texture segment vec3 e=env(r',async()=>{const now=await readFile('components/holographic-button/index.tsx','utf8');assert.equal(hash(now.slice(now.indexOf('vec3 e=env(rw,si),metal;'),now.indexOf('float sl='))),'7b7fb1a429806318fcf65834e0c073187aed06197ee439135a3cc796e90d007e')});

test('preserve texture segment float hash(v',async()=>{const now=await readFile('components/holographic-button/index.tsx','utf8');assert.equal(hash(now.slice(now.indexOf('float hash(vec2 p)'),now.indexOf('float ggx(float n'))),'ecb600c17d992b68b3df980ff46991660b5ee7c4eed1f00dcd03929dedd01a05')});

test("original preset values stay intact beside new foil",async()=>{const s=await readFile("components/holographic-button/index.tsx","utf8");for(const value of ['"spectral-film":{method:0,material:[.08,.72,.11,.55]}','"brushed-foil":{method:1,material:[.46,.48,.23,.82]}','"thin-film":{method:2,material:[.78,.62,.18,.32]}','"facet-chrome":{method:3,material:[1.18,1.05,.09,1]}'])assert.ok(s.includes(value));assert.ok(s.includes('"sticker-foil":{method:4'))});

test('preset changes load complete numeric values and show custom state on optical edits',async()=>{
 const demo=await readFile('app/page.tsx','utf8');
 assert.match(demo,/useState<OpticalPresetId>\(SATIN_PRESET.id\)/);
 assert.match(demo,/setPresetId\(id\);setOpticalOptions\(normalizeOpticalOptions\(preset.options\)\);setSpecular\(preset.specular\)/);
 assert.match(demo,/const modified=!matchesPreset\(opticalOptions,specular,currentPreset\)/);
 assert.match(demo,/aria-pressed=\{presetId===preset.id&&!modified\}/);
 assert.match(demo,/Custom \/ 수정됨/);
 assert.match(demo,/onClick=\{\(\)=>applyPreset\(presetId\)\} disabled=\{!modified\}/);
 const preset={options:{diffraction:0,recoverySeconds:2.5},specular:5};
 assert.ok(matchesPreset({...preset.options},5,preset));
 assert.equal(matchesPreset({...preset.options,diffraction:.2},5,preset),false);
 assert.equal(matchesPreset({...preset.options},6,preset),false);
 assert.ok(matchesPreset({...preset.options},preset.specular,preset),'restoring values clears custom state');
});

test('Satin Mirror reset preserves the baseline and strength five',async()=>{
 const demo=await readFile('app/page.tsx','utf8');
 assert.match(demo,/const\[specular,setSpecular\]=useState\(5\)/);
 assert.match(demo,/useState<OpticalOptions>\(\(\)=>\(\{\.\.\.DEFAULT_OPTICAL_OPTIONS\}\)\)/);
 assert.match(demo,/setPresetId\(SATIN_PRESET.id\);setOpticalOptions\(\{\.\.\.DEFAULT_OPTICAL_OPTIONS\}\);setSpecular\(5\)/);
 assert.match(demo,/onClick=\{resetSatinMirror\}>Satin Mirror로 돌아가기/);
 assert.match(demo,/Object\.entries\(opticalOptions\)/);
 assert.match(demo,/JSON\.stringify\(label\|\|"BUTTON"\)/);
});

test('all grouped optical controls remain available and do not remount the result',async()=>{
 const demo=await readFile('app/page.tsx','utf8');
 for(const group of ['surface','pattern','motion'])assert.ok(demo.includes('id:"'+group+'"'));
 assert.match(demo,/OPTICAL_CONTROLS\.filter\(control=>control.group===group.id\)\.map/);
 assert.match(demo,/aria-valuetext=\{formatOpticalValue\(value,control.unit\)\}/);
 assert.match(demo,/data-scale=\{logarithmic\?"log":control.scale==="power"\?"power":"linear"\}/);
 assert.match(demo,/step=\{nonlinear\?\.001:control.step\}/);
 assert.match(demo,/fromSliderValue\(Number\(event.target.value\),control\)/);
 assert.doesNotMatch(demo,/variant===[^;\n]*&&<fieldset/);
 assert.doesNotMatch(demo,/<HolographicButton[^>]*\bkey=/);
 assert.match(demo,/control.hint&&<small className="control-hint"/);
});

test('log sliders cover their entire positive range without a linear-step dead zone',()=>{
 const range={min:.02,max:80,step:.05,scale:'log'};
 assert.equal(toSliderValue(range.min,range),0);
 assert.equal(toSliderValue(range.max,range),1);
 assert.equal(fromSliderValue(0,range),range.min);
 assert.equal(fromSliderValue(1,range),range.max);
 assert.ok(Math.abs(fromSliderValue(.5,range)-Math.sqrt(range.min*range.max))<1e-6);
 for(let position=0;position<=1;position+=.001){
  const actual=fromSliderValue(position,range);
  assert.ok(Number.isFinite(actual)&&actual>=range.min&&actual<=range.max);
  assert.ok(Math.abs(toSliderValue(actual,range)-position)<1e-6);
 }
 assert.ok(fromSliderValue(.001,range)>range.min);
 assert.equal(fromSliderValue(-1,range),range.min);
 assert.equal(fromSliderValue(2,range),range.max);
 assert.equal(formatOpticalValue(.025),'0.025×');
 assert.equal(formatOpticalValue(2.5,'s'),'2.5s');
});

test('linear sliders preserve exact values and clamp to bounds',()=>{
 const range={min:0,max:12,step:.02};
 for(const value of [0,.02,1,5,12]){
  assert.equal(toSliderValue(value,range),value);
  assert.equal(fromSliderValue(value,range),value);
 }
 assert.equal(fromSliderValue(-1,range),0);
 assert.equal(fromSliderValue(20,range),12);
});

test('demo retains sticky mobile result, readable hints and versioned title',async()=>{
 const css=await readFile('app/tuning.css','utf8');
 assert.match(css,/\.docs-shell\{overflow:clip\}/);
 assert.match(css,/position:sticky/);
 assert.match(css,/\.tuning-layout \.live-stage\{grid-row:1/);
 assert.match(css,/\.tuning-layout \.control-panel\{grid-row:2/);
 assert.match(css,/\.control-hint/);
 assert.match(css,/min-height:44px/);
 assert.match(await readFile('github-pages/entry.tsx','utf8'),/import "..\/app\/tuning\.css"/);
 assert.match(await readFile('app/index.html','utf8'),/__PACKAGE_VERSION__/);
});

test('mobile result sticks flush to the viewport while desktop keeps its original offset',async()=>{
 const css=await readFile('app/tuning.css','utf8');
 const [desktop,mobile]=css.split('@media(max-width:760px){');
 assert.match(desktop,/\.tuning-layout \.live-stage\{position:sticky;top:84px;/);
 assert.match(mobile,/\.tuning-layout \.live-stage\{grid-row:1;top:0;z-index:5;/);
 const globals=await readFile('app/globals.css','utf8');
 assert.match(globals,/\.topbar\{position:relative;/,'header scrolls away rather than covering the flush mobile result');
});

test('power sliders make zero-inclusive defect ranges controllable near their baseline',()=>{
 const range={min:0,max:100,step:.1,scale:'power'};
 assert.equal(toSliderValue(0,range),0);
 assert.equal(toSliderValue(100,range),1);
 assert.equal(fromSliderValue(0,range),0);
 assert.equal(fromSliderValue(1,range),100);
 assert.ok(toSliderValue(1,range)>.2&&toSliderValue(1,range)<.22);
 assert.equal(fromSliderValue(.5,range),12.5);
 for(const value of [0,.0001,.1,1,4,30,100])assert.ok(Math.abs(fromSliderValue(toSliderValue(value,range),range)-value)<1e-6);
 assert.equal(fromSliderValue(-1,range),0);
 assert.equal(fromSliderValue(2,range),100);
});


test('rendered demo exposes every control with correct mapping and default values',async()=>{
 const built=await build({
  stdin:{contents:'import {renderToStaticMarkup} from "react-dom/server"; import Home from "./app/page.tsx"; export const html=renderToStaticMarkup(<Home/>); export {OPTICAL_CONTROLS,OPTICAL_PRESETS,DEFAULT_OPTICAL_OPTIONS} from "@neocjmix/holographic-button";',resolveDir:process.cwd(),loader:'tsx'},
  alias:{'@neocjmix/holographic-button':resolve('components/holographic-button/index.tsx')},
  bundle:true,write:false,platform:'node',format:'cjs',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'},
 });
 const module={exports:{}};
 new Function('require','module','exports',built.outputFiles[0].text)(createRequire(import.meta.url),module,module.exports);
 const {html,OPTICAL_CONTROLS:controls,OPTICAL_PRESETS:presets,DEFAULT_OPTICAL_OPTIONS:defaults}=module.exports;
 assert.equal([...html.matchAll(/aria-pressed="true"/g)].length,1);
 assert.equal([...html.matchAll(/<button[^>]*class="holo-button"/g)].length,presets.length+2,'hero, live result and each fixed preset');
 assert.equal([...html.matchAll(/data-optical-control="/g)].length,controls.length);
 for(const control of controls){
  const field=html.match(new RegExp('<input[^>]*data-optical-control="'+control.key+'"[^>]*>'))?.[0];
  assert.ok(field,'rendered control '+control.key);
  const nonlinear=control.scale==='log'||control.scale==='power';
  assert.ok(field.includes('min="'+(nonlinear?0:control.min)+'"'),control.key+' minimum');
  assert.ok(field.includes('max="'+(nonlinear?1:control.max)+'"'),control.key+' maximum');
  assert.ok(field.includes('step="'+(nonlinear?.001:control.step)+'"'),control.key+' step');
  assert.ok(field.includes('aria-valuetext="'+formatOpticalValue(defaults[control.key],control.unit)+'"'),control.key+' actual value');
  assert.match(field,new RegExp('aria-describedby="hint-'+control.key+'(?: |")'),control.key+' hint');
  assert.ok(html.includes(control.key+': '+defaults[control.key]+','),control.key+' exact copied value');
 }
 assert.ok(html.includes('Custom / 수정됨')===false,'initial state is unmodified');
 assert.ok(html.includes('Satin Mirror로 돌아가기'));
 assert.ok(html.includes('v1.0.0'));
 assert.ok(html.includes('색 코팅이나 회절 강도를 올리면 간격의 차이가 보여요.'));
 assert.ok(html.includes('격자 요철을 올리면 셀 밀도의 차이가 보여요.'));
});

test('stable demo has honest attribution without preview warnings',async()=>{const source=await readFile('app/page.tsx','utf8');assert.match(source,/AI-ASSISTED IMPLEMENTATION/);assert.match(source,/THIRD_PARTY_NOTICES\.md/);assert.doesNotMatch(source,/preview\.15|UNREVIEWED AI OUTPUT|No human has reviewed|not published to npm/);});
