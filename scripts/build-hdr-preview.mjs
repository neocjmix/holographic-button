import {build} from 'esbuild';
import {mkdir,copyFile} from 'node:fs/promises';
await mkdir('preview-dist/v1',{recursive:true});
await build({entryPoints:['preview/v1/lab.tsx'],outfile:'preview-dist/v1/lab.js',bundle:true,minify:true,jsx:'automatic',format:'iife',target:'es2022',define:{'process.env.NODE_ENV':'"production"'}});
await copyFile('preview/v1/index.html','preview-dist/v1/index.html');
