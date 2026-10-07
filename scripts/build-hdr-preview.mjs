import {build} from 'esbuild';
import {mkdir,copyFile} from 'node:fs/promises';
await mkdir('preview-dist/v1',{recursive:true});
await build({entryPoints:['preview/v1/lab.tsx'],outfile:'preview-dist/v1/lab.js',bundle:true,alias:{'@neocjmix/holographic-button':'./components/holographic-button/index.tsx'},minify:true,jsx:'automatic',format:'iife',target:'es2022',define:{'process.env.NODE_ENV':'"production"'}});
await copyFile('preview/v1/index.html','preview-dist/v1/index.html');

await copyFile('components/holographic-button/THIRD_PARTY_NOTICES.md','preview-dist/v1/THIRD_PARTY_NOTICES.md');
