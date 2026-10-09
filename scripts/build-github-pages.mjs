import { build } from 'esbuild';
import { copyFile, mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));

export async function buildGithubPages({ entryPoint = join(root, 'github-pages/entry.tsx'), outdir = join(root, 'github-pages') } = {}) {
  const assetsDir = join(outdir, 'assets');
  await mkdir(assetsDir, { recursive: true });
  const result = await build({
    entryPoints: { app: entryPoint },
    outdir: assetsDir,
    entryNames: '[name]-[hash]',
    metafile: true,
    bundle: true,
    minify: true,
    sourcemap: false,
    format: 'iife',
    platform: 'browser',
    target: ['es2020'],
    jsx: 'automatic',
    alias: {
      '@neocjmix/holographic-button': join(root, 'components/holographic-button/index.tsx'),
      react: join(root, 'node_modules/react'),
      'react-dom': join(root, 'node_modules/react-dom'),
    },
    define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  });
  const entry = Object.entries(result.metafile.outputs).find(([, output]) => output.entryPoint);
  if (!entry || !entry[1].cssBundle) throw new Error('Demo build must emit both JavaScript and CSS');
  const js = basename(entry[0]);
  const css = basename(entry[1].cssBundle);
  const pkg = JSON.parse(await readFile(join(root, 'components/holographic-button/package.json'), 'utf8'));
  let html = await readFile(join(root, 'app/index.html'), 'utf8');
  for (const [token, value] of [['__APP_JS__', `./assets/${js}`], ['__APP_CSS__', `./assets/${css}`], ['__PACKAGE_VERSION__', pkg.version]]) {
    if (!html.includes(token)) throw new Error(`Demo template is missing ${token}`);
    html = html.replaceAll(token, value);
  }
  await writeFile(join(outdir, 'index.html'), html);
  await copyFile(join(root, 'public/favicon.svg'), join(outdir, 'favicon.svg'));
  for (const file of ['LICENSE', 'THIRD_PARTY_NOTICES.md']) {
    await copyFile(join(root, 'components/holographic-button', file), join(outdir, file));
  }
  // The HTML now points to the completed build; obsolete bundles cannot leak into deployment.
  const emitted = new Set(Object.keys(result.metafile.outputs).map(path => basename(path)));
  for (const file of await readdir(assetsDir)) {
    if (/\.(?:js|css)(?:\.map)?$/.test(file) && !emitted.has(file)) await unlink(join(assetsDir, file));
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await buildGithubPages();
