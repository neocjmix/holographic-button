import {build} from "esbuild";
import {copyFile,mkdir,readFile,writeFile} from "node:fs/promises";

const outDir=new URL("../github-pages/assets/",import.meta.url);
const rootReact=new URL("../node_modules/react",import.meta.url).pathname;
const rootReactDom=new URL("../node_modules/react-dom",import.meta.url).pathname;
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
 alias:{
  react:rootReact,
  "react-dom":rootReactDom
 },
 define:{"process.env.NODE_ENV":JSON.stringify("production")}
});
const component=await readFile(new URL("../components/holographic-button/holographic-button.css",import.meta.url),"utf8");
const docs=await readFile(new URL("../app/globals.css",import.meta.url),"utf8");
await writeFile(new URL("styles.css",outDir),component+"\n"+docs);
await copyFile(new URL("../public/favicon.svg",import.meta.url),new URL("../github-pages/favicon.svg",import.meta.url));
