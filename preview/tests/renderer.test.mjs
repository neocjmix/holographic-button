import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const hash=s=>createHash('sha256').update(s).digest('hex');
test('publication guards remain enabled',async()=>{for(const path of ['package.json','components/holographic-button/package.json'])assert.equal(JSON.parse(await readFile(path,'utf8')).private,true);assert.match(JSON.parse(await readFile('components/holographic-button/package.json','utf8')).scripts.prepublishOnly,/forbidden/)});
test('original CSS, motion and texture formulas are unchanged',async()=>{const now=await readFile('components/holographic-button/index.tsx','utf8');assert.equal(hash(await readFile('components/holographic-button/holographic-button.css','utf8')),'1968a10cd24938098a40efffed017bc5bdc3da6a4f8ff4f9fb41c99e6a5340be');assert.equal(hash(await readFile('app/globals.css','utf8')),'6d025dfee5367522edf6852b6a484d4a3d9f3a63bbe9f79177424635f9c72ab4');assert.equal(hash(now.slice(now.indexOf('const rad='),now.indexOf('const VS='))),'4f119a162b99f7c97531098e95f638cc8a41534bfddaedfa6ed5856808d4392d');});
test('preview uses original demo with numeric specular control',async()=>{assert.match(await readFile('preview/v1/lab.tsx','utf8'),/import Home from "..\/..\/app\/page"/);const demo=await readFile('app/page.tsx','utf8');assert.match(demo,/Surface specular intensity/);assert.match(demo,/min="0" max="3" step="0.05"/);for(const name of ['Spectral','Brushed','Pearl','Prism'])assert.ok(demo.includes('label:"'+name+'"'))});

test('preserve texture segment vec3 e=env(r',async()=>{const now=await readFile('components/holographic-button/index.tsx','utf8');assert.equal(hash(now.slice(now.indexOf('vec3 e=env(rw,si),metal;'),now.indexOf('float sl=ndl'))),'7b7fb1a429806318fcf65834e0c073187aed06197ee439135a3cc796e90d007e')});

test('preserve texture segment float hash(v',async()=>{const now=await readFile('components/holographic-button/index.tsx','utf8');assert.equal(hash(now.slice(now.indexOf('float hash(vec2 p)'),now.indexOf('float ggx(float n'))),'ecb600c17d992b68b3df980ff46991660b5ee7c4eed1f00dcd03929dedd01a05')});

test("original preset values stay intact beside new foil",async()=>{const s=await readFile("components/holographic-button/index.tsx","utf8");for(const value of ['"spectral-film":{method:0,material:[.08,.72,.11,.55]}','"brushed-foil":{method:1,material:[.46,.48,.23,.82]}','"thin-film":{method:2,material:[.78,.62,.18,.32]}','"facet-chrome":{method:3,material:[1.18,1.05,.09,1]}'])assert.ok(s.includes(value));assert.ok(s.includes('"sticker-foil":{method:4'))});
