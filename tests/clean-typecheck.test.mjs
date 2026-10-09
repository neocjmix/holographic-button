import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, lstat, mkdir, mkdtemp, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);

test('package and demo typecheck from source without prebuilt workspace declarations', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'holographic-clean-typecheck-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const files = [
    'package.json', 'tsconfig.json',
    'app/page.tsx', 'app/demo-copy.ts', 'app/optical-tuning.ts', 'github-pages/entry.tsx',
    'components/holographic-button/package.json',
    'components/holographic-button/tsconfig.build.json',
    'components/holographic-button/index.tsx',
    'components/holographic-button/hdr-renderer.ts',
    'components/holographic-button/foil-recovery.ts',
  ];
  for (const file of files) {
    await mkdir(dirname(join(dir, file)), { recursive: true });
    await cp(file, join(dir, file));
  }
  // Copy dependencies, preserving the workspace's relative symlink into this
  // disposable source tree. Reusing the original node_modules path would let
  // old dist declarations conceal the clean-checkout regression.
  await cp('node_modules', join(dir, 'node_modules'), { recursive: true, dereference: false, verbatimSymlinks: true });
  assert.equal(await realpath(join(dir, 'node_modules/@neocjmix/holographic-button')), join(dir, 'components/holographic-button'));
  const dist = join(dir, 'components/holographic-button/dist');
  await assert.rejects(lstat(dist), { code: 'ENOENT' });
  const { stdout } = await run('npm', ['run', 'typecheck'], { cwd: dir, maxBuffer: 1024 * 1024 });
  assert.match(stdout, /tsc -p tsconfig\.build\.json --noEmit/);
  await assert.rejects(lstat(dist), { code: 'ENOENT' });
});
