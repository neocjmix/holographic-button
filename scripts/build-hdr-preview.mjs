import {build} from 'esbuild';
import {mkdir,copyFile,readFile,writeFile} from 'node:fs/promises';
import {basename,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

export async function buildHdrPreview({entryPoint='preview/v1/lab.tsx',outdir='preview-dist/v1'}={}){
 await mkdir(outdir,{recursive:true});
 const result=await build({entryPoints:{lab:entryPoint},outdir,entryNames:'[name]-[hash]',metafile:true,bundle:true,alias:{'@neocjmix/holographic-button':'./components/holographic-button/index.tsx'},minify:true,jsx:'automatic',format:'iife',target:'es2022',define:{'process.env.NODE_ENV':'"production"'}});
 const entry=Object.entries(result.metafile.outputs).find(([,output])=>output.entryPoint);
 if(!entry||!entry[1].cssBundle)throw new Error('Preview build must emit both JavaScript and CSS');
 let html=await readFile('preview/v1/index.html','utf8');
 // Read actual output names rather than duplicating esbuild's content hash logic.
 for(const [reference,output]of [['src="./lab.js"',entry[0]],['href="./lab.css"',entry[1].cssBundle]]){
  if(html.split(reference).length!==2)throw new Error(`Preview template must contain exactly one ${reference}`);
  html=html.replace(reference,reference.replace(/lab\.(js|css)/,basename(output)));
 }
 await writeFile(join(outdir,'index.html'),html);
 await copyFile('components/holographic-button/THIRD_PARTY_NOTICES.md',join(outdir,'THIRD_PARTY_NOTICES.md'));
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await buildHdrPreview();
