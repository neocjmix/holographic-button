import {build} from "esbuild";
import {mkdir,readFile,writeFile} from "node:fs/promises";

const outDir=new URL("../github-pages/assets/",import.meta.url);
await mkdir(outDir,{recursive:true});
await build({
 entryPoints:[new URL("../github-pages/entry.tsx",import.meta.url).pathname],
 outfile:new URL("app.js",outDir).pathname,
 bundle:true,
 minify:true,
 sourcemap:false,
 format:"iife",
 platform:"browser",
 target:["es2020"],
 jsx:"automatic",
 define:{"process.env.NODE_ENV":JSON.stringify("production")}
});
const component=await readFile(new URL("../components/holographic-button/holographic-button.css",import.meta.url),"utf8");
const docs=(await readFile(new URL("../app/globals.css",import.meta.url),"utf8"))
 .replace('@import "tailwindcss";',"")
 .replace('@import "@neocjmix/holographic-button/styles.css";',"");
await writeFile(new URL("styles.css",outDir),component+"\n"+docs);
