import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const built = await build({
  entryPoints: ['components/holographic-button/index.tsx'], bundle: true, write: false, format: 'esm', jsx: 'automatic',
  plugins: [{ name: 'test-react', setup(b) {
    b.onResolve({ filter: /^react(?:\/jsx-runtime)?$/ }, args => ({ path: args.path, namespace: 'test-react' }));
    b.onLoad({ filter: /.*/, namespace: 'test-react' }, args => ({ contents: args.path.endsWith('jsx-runtime')
      ? 'export const jsx=(type,props)=>({type,props}),jsxs=jsx;'
      : 'export const useRef=current=>({current}),useState=initial=>[initial,()=>{}],useCallback=f=>f,forwardRef=f=>f;export const useEffect=f=>{globalThis.__motionEffects.push(f)};' }));
  } }],
});
const { useHolographicMotion } = await import('data:text/javascript;base64,' + Buffer.from(built.outputFiles[0].text).toString('base64'));

function harness(t, screen = {}, window = {}) {
  const originals = new Map();
  const handlers = new Map(), effects = [];
  const replace = (key, value) => { originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key)); Object.defineProperty(globalThis, key, { value, configurable: true, writable: true }); };
  replace('__motionEffects', effects); replace('screen', screen); replace('window', window);
  replace('performance', { now: () => 1000 });
  replace('addEventListener', (type, callback) => handlers.set(type, callback));
  replace('removeEventListener', type => handlers.delete(type));
  const motion = useHolographicMotion({ pointerFallback: false });
  const cleanup = effects.map(effect => effect());
  t.after(() => {
    for (const stop of cleanup) stop?.();
    for (const [key, original] of originals) { if (original) Object.defineProperty(globalThis, key, original); else delete globalThis[key]; }
  });
  return { motion, emit: (type, event) => handlers.get(type)?.(event) };
}

test('valid orientation remains finite when both screen-angle APIs are absent', t => {
  const { motion, emit } = harness(t);
  emit('deviceorientation', { alpha: 0, beta: 30, gamma: 10 });
  assert.ok(motion.matrix.current.every(Number.isFinite));
  assert.ok(Math.abs(motion.matrix.current[8] - 0.85286853) < 1e-6);
});
test('invalid modern angle falls back to valid legacy orientation', t => {
  const { motion, emit } = harness(t, { orientation: { angle: NaN } }, { orientation: 90 });
  emit('deviceorientation', { alpha: 0, beta: 0, gamma: 0 });
  assert.ok(motion.matrix.current.every(Number.isFinite));
  assert.ok(Math.abs(motion.matrix.current[1] + 1) < 1e-6);
});
test('nonfinite screen angles safely fall back to zero', t => {
  const { motion, emit } = harness(t, { orientation: { angle: Infinity } }, { orientation: NaN });
  emit('deviceorientation', { alpha: 0, beta: 0, gamma: 0 });
  assert.deepEqual([...motion.matrix.current], [1, 0, 0, 0, 1, 0, 0, 0, 1]);
});
test('nonfinite orientation events preserve the last valid matrix', t => {
  const { motion, emit } = harness(t);
  emit('deviceorientation', { alpha: null, beta: 30, gamma: 10 });
  const valid = [...motion.matrix.current];
  for (const key of ['alpha', 'beta', 'gamma']) for (const value of [NaN, Infinity, -Infinity]) {
    emit('deviceorientation', { alpha: 0, beta: 40, gamma: 20, [key]: value });
    assert.deepEqual([...motion.matrix.current], valid, `${key}=${value}`);
  }
});
test('nonfinite acceleration is ignored before angle conversion', t => {
  const { motion, emit } = harness(t);
  emit('devicemotion', { accelerationIncludingGravity: { x: 1, y: -4, z: 9 } });
  const valid = [...motion.matrix.current];
  assert.ok(valid.every(Number.isFinite));
  assert.notDeepEqual(valid, [1, 0, 0, 0, 1, 0, 0, 0, 1]);
  for (const key of ['x', 'y', 'z']) for (const value of [NaN, Infinity, -Infinity]) {
    emit('devicemotion', { accelerationIncludingGravity: { x: 2, y: -3, z: 8, [key]: value } });
    assert.deepEqual([...motion.matrix.current], valid, `${key}=${value}`);
  }
});
