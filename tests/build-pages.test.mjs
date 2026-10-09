import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildGithubPages } from '../scripts/build-github-pages.mjs';

async function workspace(t) {
  const dir = await mkdtemp(join(tmpdir(), 'holographic-demo-build-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return dir;
}
async function readAssets(outdir) {
  const html = await readFile(join(outdir, 'index.html'), 'utf8');
  const js = html.match(/src="\.\/assets\/(app-[A-Z0-9]+\.js)"/)?.[1];
  const css = html.match(/href="\.\/assets\/(app-[A-Z0-9]+\.css)"/)?.[1];
  assert.ok(js, 'HTML references content-hashed JavaScript');
  assert.ok(css, 'HTML references content-hashed CSS');
  assert.doesNotMatch(html, /__APP_|__PACKAGE_VERSION__|preview|v0\.1\.2/);
  const files = await readdir(join(outdir, 'assets'));
  assert.deepEqual(files.filter(file => /\.(?:js|css)$/.test(file)).sort(), [js, css].sort());
  return { html, js, css, jsBytes: await readFile(join(outdir, 'assets', js), 'utf8'), cssBytes: await readFile(join(outdir, 'assets', css), 'utf8') };
}
async function fixture(t) {
  const dir = await workspace(t), entryPoint = join(dir, 'entry.js'), cssPath = join(dir, 'style.css');
  await writeFile(entryPoint, 'import "./style.css"; globalThis.demoVersion = "before";');
  await writeFile(cssPath, 'body { color: red; }');
  let sequence = 0;
  return { entryPoint, cssPath, build: async () => {
    const outdir = join(dir, `build-${sequence++}`);
    await buildGithubPages({ entryPoint, outdir });
    return readAssets(outdir);
  } };
}
test('official demo includes all tuning styles, current presets, version, and full notices', async t => {
  const outdir = await workspace(t);
  await buildGithubPages({ outdir });
  const assets = await readAssets(outdir);
  assert.match(assets.html, /v1\.0\.0/);
  assert.match(assets.html, /<html lang="en">/);
  assert.doesNotMatch(assets.html, /\p{Script=Hangul}/u);
  assert.match(assets.cssBytes, /\.tuning-layout \.live-stage/);
  assert.match(assets.cssBytes, /grid-row:1;top:0/);
  assert.match(assets.jsBytes, /Card Foil/);
  assert.match(assets.jsBytes, /AI-ASSISTED IMPLEMENTATION/);
  assert.doesNotMatch(assets.jsBytes, /UNREVIEWED AI OUTPUT|not published to npm|v1\.0\.0-preview/);
  for (const file of ['LICENSE', 'THIRD_PARTY_NOTICES.md']) assert.equal(await readFile(join(outdir, file), 'utf8'), await readFile(`components/holographic-button/${file}`, 'utf8'));
});
test('identical demo content has deterministic names and bytes', async t => {
  const source = await fixture(t);
  assert.deepEqual(await source.build(), await source.build());
});
test('changed JavaScript invalidates its demo asset URL', async t => {
  const source = await fixture(t), before = await source.build();
  await writeFile(source.entryPoint, 'import "./style.css"; globalThis.demoVersion = "after";');
  const after = await source.build();
  assert.notEqual(after.jsBytes, before.jsBytes); assert.notEqual(after.js, before.js); assert.equal(after.css, before.css);
});
test('changed CSS invalidates its demo asset URL', async t => {
  const source = await fixture(t), before = await source.build();
  await writeFile(source.cssPath, 'body { color: blue; }');
  const after = await source.build();
  assert.notEqual(after.cssBytes, before.cssBytes); assert.notEqual(after.css, before.css);
});
test('rebuild removes obsolete asset files without removing unrelated files', async t => {
  const outdir = await workspace(t);
  await buildGithubPages({ outdir });
  await writeFile(join(outdir, 'assets', 'app.js'), 'stale');
  await writeFile(join(outdir, 'assets', 'styles.css'), 'stale');
  await writeFile(join(outdir, 'assets', 'keep.txt'), 'keep');
  await buildGithubPages({ outdir });
  await readAssets(outdir);
  assert.equal(await readFile(join(outdir, 'assets', 'keep.txt'), 'utf8'), 'keep');
});
