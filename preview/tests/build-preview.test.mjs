import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,readdir,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {buildHdrPreview} from '../../scripts/build-hdr-preview.mjs';

async function workspace(t){
 const dir=await mkdtemp(join(tmpdir(),'hdr-preview-build-'));
 t.after(()=>rm(dir,{recursive:true,force:true}));
 return dir;
}

async function readAssets(outdir){
 const html=await readFile(join(outdir,'index.html'),'utf8');
 const js=html.match(/<script src="\.\/(lab-[A-Z0-9]+\.js)"><\/script>/)?.[1];
 const css=html.match(/<link rel="stylesheet" href="\.\/(lab-[A-Z0-9]+\.css)">/)?.[1];
 assert.ok(js,'HTML references a content-hashed JavaScript bundle');
 assert.ok(css,'HTML references a content-hashed stylesheet');
 assert.doesNotMatch(html,/(?:src|href)="\.\/lab\.(?:js|css)"/);
 const files=await readdir(outdir);
 assert.deepEqual(files.filter(file=>/\.(?:js|css)$/.test(file)).sort(),[js,css].sort());
 return {html,js,css,jsBytes:await readFile(join(outdir,js),'utf8'),cssBytes:await readFile(join(outdir,css),'utf8')};
}

async function fixture(t){
 const dir=await workspace(t),entryPoint=join(dir,'entry.js'),cssPath=join(dir,'style.css');
 await writeFile(entryPoint,'import "./style.css"; globalThis.previewVersion = "before";');
 await writeFile(cssPath,'body { color: red; }');
 let sequence=0;
 return {entryPoint,cssPath,build:async()=>{
  const outdir=join(dir,`build-${sequence++}`);
  await buildHdrPreview({entryPoint,outdir});
  return readAssets(outdir);
 }};
}

test('preview HTML references the exact emitted hashed assets and preserves its template and notices',async t=>{
 const outdir=await workspace(t);
 await buildHdrPreview({outdir});
 const assets=await readAssets(outdir);
 const template=await readFile('preview/v1/index.html','utf8');
 assert.equal(assets.html,template.replace('./lab.js',`./${assets.js}`).replace('./lab.css',`./${assets.css}`));
 assert.equal(await readFile(join(outdir,'THIRD_PARTY_NOTICES.md'),'utf8'),await readFile('components/holographic-button/THIRD_PARTY_NOTICES.md','utf8'));
});

test('identical preview content has deterministic names and bytes across output directories',async t=>{
 const source=await fixture(t);
 assert.deepEqual(await source.build(),await source.build());
});

test('changed JavaScript content invalidates its preview asset URL',async t=>{
 const source=await fixture(t),before=await source.build();
 await writeFile(source.entryPoint,'import "./style.css"; globalThis.previewVersion = "after";');
 const after=await source.build();
 assert.notEqual(after.jsBytes,before.jsBytes);
 assert.notEqual(after.js,before.js);
 assert.equal(after.css,before.css);
});

test('changed CSS content invalidates its preview asset URL',async t=>{
 const source=await fixture(t),before=await source.build();
 await writeFile(source.cssPath,'body { color: blue; }');
 const after=await source.build();
 assert.notEqual(after.cssBytes,before.cssBytes);
 assert.notEqual(after.css,before.css);
});
