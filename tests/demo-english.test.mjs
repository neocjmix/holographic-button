import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';

// Exercise the demo's real event callbacks and re-render its real component tree.
// Only app-local state/memo hooks are substituted; package hooks and SSR stay real.
// This checks rendered copy and attributes, not browser input or GPU behavior.
const built=await build({
 stdin:{contents:`
  import {createElement} from "react";
  import {renderToStaticMarkup} from "react-dom/server";
  import Home from "./app/page.tsx";
  import {beginRender,resetState} from "demo-state-harness";
  export {resetState};
  export {OPTICAL_CONTROLS,OPTICAL_PRESETS,DEFAULT_OPTICAL_OPTIONS} from "@neocjmix/holographic-button";
  export {DEMO_OPTICAL_CONTROLS,DEMO_OPTICAL_PRESETS} from "./app/demo-copy.ts";
  export function render(){
   beginRender();
   let tree;
   const html=renderToStaticMarkup(createElement(function Capture(){tree=Home();return tree;}));
   return {html,tree};
  }
 `,resolveDir:process.cwd(),loader:'tsx'},
 alias:{'@neocjmix/holographic-button':resolve('components/holographic-button/index.tsx')},
 plugins:[{name:'demo-local-state',setup(build){
  build.onResolve({filter:/^react$/},args=>args.importer===resolve('app/page.tsx')?{path:'demo-state-harness',namespace:'demo-harness'}:undefined);
  build.onResolve({filter:/^demo-state-harness$/},()=>({path:'demo-state-harness',namespace:'demo-harness'}));
  build.onLoad({filter:/.*/,namespace:'demo-harness'},()=>({loader:'js',contents:`
   let values=[],cursor=0;
   export function beginRender(){cursor=0;}
   export function resetState(){values=[];cursor=0;}
   export function useState(initial){
    const index=cursor++;
    if(!(index in values))values[index]=typeof initial==="function"?initial():initial;
    return [values[index],next=>{values[index]=typeof next==="function"?next(values[index]):next;}];
   }
   export function useMemo(create){return create();}
  `}));
 }}],
 bundle:true,write:false,platform:'node',format:'cjs',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'},
});
const module={exports:{}};
new Function('require','module','exports',built.outputFiles[0].text)(createRequire(import.meta.url),module,module.exports);
const {render,resetState,OPTICAL_CONTROLS,OPTICAL_PRESETS,DEFAULT_OPTICAL_OPTIONS,DEMO_OPTICAL_CONTROLS,DEMO_OPTICAL_PRESETS}=module.exports;
const hangul=/\p{Script=Hangul}/u;
const packageMetadataBefore=JSON.stringify({OPTICAL_CONTROLS,OPTICAL_PRESETS});

function find(tree,predicate){
 if(Array.isArray(tree))return tree.map(child=>find(child,predicate)).find(Boolean);
 if(!tree||typeof tree!=='object')return undefined;
 return predicate(tree)?tree:find(tree.props?.children,predicate);
}
function element(state,predicate){const found=find(state.tree,predicate);assert.ok(found,'requested rendered control exists');return found;}
function click(state,predicate){element(state,predicate).props.onClick();return render();}
function change(state,predicate,value){element(state,predicate).props.onChange({target:{value}});return render();}
function english(state){assert.doesNotMatch(state.html,hangul,'built-in rendered text and accessibility attributes contain no Hangul');return state;}
const optical=key=>node=>node.type==='input'&&node.props['data-optical-control']===key;
const button=text=>node=>node.type==='button'&&node.props.children===text;
const presetButton=id=>node=>node.type==='button'&&node.key===id;

test('hero uses the exact custom preset without changing playground defaults or activation',()=>{
 resetState();let state=render();
 const heroSection=element(state,node=>node.props?.id==='top');
 const hero=find(heroSection,node=>node.props?.children==='A LITTLE TOO MUCH BUTTON');
 assert.ok(hero,'hero button exists');
 assert.equal(hero.props.variant,'satin-mirror');
 assert.equal(hero.props.width,'min(100%, 560px)');
 assert.equal(hero.props.height,148);
 assert.equal(hero.props.specular,4.7);
 assert.deepEqual(hero.props.opticalOptions,{
  diffraction:1.95,rainbowSpacing:0.4569157,reflectionBlur:0.64,directionality:1.55,
  bubbles:4.862712,scratches:0,ridgeWidth:1,ridgeHeight:1,recoverySeconds:2.5,
  iridescence:0.74,facetStrength:0,facetScale:2,gratingAngle:51,
 });
 const playground=element(state,node=>node.props?.id==='playground');
 const live=find(playground,node=>node.props?.variant==='satin-mirror');
 assert.equal(live.props.children,'ACTIVATE');
 assert.equal(live.props.width,'min(100%, 560px)');
 assert.equal(live.props.height,148);
 assert.equal(live.props.specular,5);
 assert.deepEqual(live.props.opticalOptions,DEFAULT_OPTICAL_OPTIONS);
 hero.props.onClick();state=render();
 assert.ok(state.html.includes('ACTIVATED × 1'));
 hero.props.onClick();state=render();
 assert.ok(state.html.includes('ACTIVATED × 2'));
});

test('English presentation covers every preset and control without changing package metadata or values',()=>{
 assert.equal(DEMO_OPTICAL_PRESETS.length,OPTICAL_PRESETS.length);
 assert.equal(DEMO_OPTICAL_CONTROLS.length,OPTICAL_CONTROLS.length);
 for(const [index,preset] of DEMO_OPTICAL_PRESETS.entries()){
  const {label,note,...values}=preset;
  const {label:originalLabel,note:originalNote,...originalValues}=OPTICAL_PRESETS[index];
  assert.ok(label&&note);
  assert.doesNotMatch(label+note,hangul);
  assert.deepEqual(values,originalValues);
  assert.equal(preset.options,OPTICAL_PRESETS[index].options,'reuse immutable numeric preset options');
 }
 for(const [index,control] of DEMO_OPTICAL_CONTROLS.entries()){
  const {label,hint,...range}=control;
  const {label:originalLabel,hint:originalHint,...originalRange}=OPTICAL_CONTROLS[index];
  assert.ok(label&&hint);
  assert.doesNotMatch(label+hint,hangul);
  assert.deepEqual(range,originalRange,'all control keys, units, ranges, scales, and groups stay intact');
 }
 assert.equal(JSON.stringify({OPTICAL_CONTROLS,OPTICAL_PRESETS}),packageMetadataBefore);
});

test('all presets, custom states, and both resets render English copy',()=>{
 resetState();let state=english(render());
 for(const preset of DEMO_OPTICAL_PRESETS){
  state=english(click(state,presetButton(preset.id)));
  assert.ok(state.html.includes('Each preset is a starting point for all values below.'));
  assert.doesNotMatch(state.html,/<b>Custom<\/b>/);
  assert.equal(element(state,presetButton(preset.id)).props['aria-pressed'],true);
  const specular=node=>node.props?.['aria-label']==='Surface specular intensity';
  state=english(change(state,specular,preset.specular+.5));
  assert.match(state.html,/<b>Custom<\/b>/);
  assert.ok(state.html.includes('Adjusted from '+preset.label+'.'));
  assert.ok(state.html.includes('Custom · '+preset.label));
  assert.equal(element(state,presetButton(preset.id)).props['aria-pressed'],false);
  assert.equal(element(state,button('Reset selected preset')).props.disabled,false);
  state=english(click(state,button('Reset selected preset')));
  assert.doesNotMatch(state.html,/<b>Custom<\/b>/);
  assert.equal(element(state,button('Reset selected preset')).props.disabled,true);
  assert.equal(element(state,specular).props.value,preset.specular);
  state=english(change(state,optical('iridescence'),preset.options.iridescence===0?1:0));
  assert.match(state.html,/<b>Custom<\/b>/);
  state=english(click(state,button('Back to Satin Mirror')));
  assert.doesNotMatch(state.html,/<b>Custom<\/b>/);
  assert.equal(element(state,presetButton('satin-mirror')).props['aria-pressed'],true);
  assert.equal(element(state,specular).props.value,5);
  for(const control of DEMO_OPTICAL_CONTROLS){
   assert.equal(element(state,optical(control.key)).props['aria-label'],control.label);
   assert.ok(state.html.includes(control.key+': '+DEFAULT_OPTICAL_OPTIONS[control.key]+','));
  }
 }
});

test('conditional hints and all slider value text stay English across edits',()=>{
 resetState();let state=english(render());
 assert.match(state.html,/Increase Color coating or Diffraction strength to see changes in spacing\./);
 assert.match(state.html,/Increase Grid relief to see changes in cell density\./);
 state=english(change(state,optical('reflectionBlur'),0));
 assert.match(state.html,/Increase Reflection blur to see changes in directionality\./);
 assert.match(element(state,optical('directionality')).props['aria-describedby'],/context-directionality/);
 for(const [key,value] of [['iridescence',1],['facetStrength',.5],['reflectionBlur',1]])state=english(change(state,optical(key),value));
 assert.doesNotMatch(state.html,/class="control-hint contextual-hint"/);
 for(const control of DEMO_OPTICAL_CONTROLS){
  for(const bound of ['min','max']){
   const input=element(state,optical(control.key));
   state=english(change(state,optical(control.key),input.props[bound]));
   const changed=element(state,optical(control.key));
   assert.equal(changed.props['aria-label'],control.label);
   assert.doesNotMatch(changed.props['aria-valuetext'],hangul);
   assert.match(changed.props['aria-describedby'],new RegExp('hint-'+control.key));
  }
 }
});

test('activation, disabled state, package-manager commands, and generated examples stay English',()=>{
 resetState();let state=english(render());
 state=english(click(state,node=>typeof node.props?.onClick==='function'&&node.props.children==='A LITTLE TOO MUCH BUTTON'));
 assert.match(state.html,/ACTIVATED × 1/);
 assert.match(state.html,/EVENT RECEIVED × 1/);
 state=english(click(state,node=>node.props?.role==='switch'));
 assert.match(state.html,/DISABLED · NATIVE STATE/);
 assert.match(state.html,/aria-checked="true"/);
 state=english(click(state,node=>node.props?.role==='switch'));
 assert.match(state.html,/aria-checked="false"/);
 for(const [manager,command] of [['pnpm','pnpm add'],['yarn','yarn add'],['bun','bun add'],['npm','npm install']]){
  state=english(click(state,node=>node.props?.role==='tab'&&node.key===manager));
  assert.ok(state.html.includes(command+' @neocjmix/holographic-button'));
 }
 state=english(change(state,node=>node.type==='input'&&node.props.maxLength===18,''));
 assert.ok(state.html.includes('BUTTON'));
});

test('English demo copy does not restrict the user-provided button label',()=>{
 resetState();let state=render();
 state=change(state,node=>node.type==='input'&&node.props.maxLength===18,'시작하기');
 assert.ok(state.html.includes('시작하기'),'custom Korean label remains visible and appears in the React example');
 assert.ok(state.html.includes('{&quot;시작하기&quot;}'),'copied example preserves the user-provided label');
 assert.doesNotMatch(state.html.replaceAll('시작하기',''),hangul,'only user-provided text is exempt from the built-in copy check');
 assert.equal(JSON.stringify({OPTICAL_CONTROLS,OPTICAL_PRESETS}),packageMetadataBefore);
});
