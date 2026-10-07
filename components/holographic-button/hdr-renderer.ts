/**
 * WebGPU presentation matching the WebGL material in this preview.
 * The four texture branches, world-space light positions, noise and motion retain
 * the original design. The shared macro normal, inset ridge and metal reflection
 * are deliberately refined in preview.4, identically in GLSL and WGSL.
 *
 * HDR presentation is the only added shading step:
 *   C = (M / (M + 0.78)) ^ 0.86       original, display-encoded artistic curve
 *   E = max(M - max(B, 1), 0)        specular-only excess above the SDR shoulder
 *   H = decodeSRGB(C) + 3 E/(3 + E) bounded highlight extension, <4x SDR white
 *   output = encodeSRGB(H) * alpha
 * B is the SAME material evaluated with specular intensity zero. Thus no lift
 * is added to the base material, or at intensity zero, and M <= 1 is unchanged.
 * This retains the original artistic curve; removing it would alter all colors.
 * rgba16float canvas values with colorSpace:'srgb' are transfer-encoded, hence
 * the explicit decode/add/encode, rather than encoding the original C twice.
 * Canvas alphaMode:'premultiplied' requires the final encoded RGB times alpha.
 * Source: https://www.w3.org/TR/webgpu/#canvas-color-space
 * The browser/display still decides the actually available HDR headroom.
 */

export const originalHdrShader = /* wgsl */ `
struct Uniforms {
  worldFromDevice: mat4x4f,
  material: vec4f,
  // xy: backing-store resolution, z: original material method, w: intensity
  settings: vec4f,
};
@group(0) @binding(0) var<uniform> u: Uniforms;

@vertex fn vs(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
  let positions = array<vec2f, 3>(vec2f(-1., -1.), vec2f(3., -1.), vec2f(-1., 3.));
  return vec4f(positions[i], 0., 1.);
}

fn rr(p: vec2f, b: vec2f, r: f32) -> f32 {
  let q = abs(p) - b + vec2f(r);
  return min(max(q.x, q.y), 0.) + length(max(q, vec2f(0.))) - r;
}
fn hash(p: vec2f) -> f32 {
  return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453);
}
fn noise(p: vec2f) -> f32 {
  let i = floor(p);
  var f = fract(p);
  f = f * f * (vec2f(3.) - 2. * f);
  return mix(mix(hash(i), hash(i + vec2f(1., 0.)), f.x),
             mix(hash(i + vec2f(0., 1.)), hash(i + vec2f(1.)), f.x), f.y);
}
fn spectrum(t: f32) -> vec3f {
  return pow(vec3f(.5) + .5 * cos(6.28318 * (vec3f(t) + vec3f(0., .67, .33))), vec3f(1.35));
}
fn ggx(n: f32, r: f32) -> f32 {
  let a = r * r;
  let a2 = a * a;
  let d = n * n * (a2 - 1.) + 1.;
  return a2 / (3.14159 * d * d);
}
fn ggxAniso(n: vec3f, h: vec3f, t0: vec3f, r: f32, a: f32, rot: f32) -> f32 {
  let t = normalize(t0 - n * dot(t0, n));
  let b = cross(n, t);
  let c = cos(rot);
  let s = sin(rot);
  let base = max(.0006, r * r);
  let ax = max(.0006, base * (1. - a * .72));
  let ay = max(.0006, base * (1. + a * .72));
  let tr = t * c + b * s;
  let br = -t * s + b * c;
  let x = dot(h, tr) / ax;
  let y = dot(h, br) / ay;
  let z = max(dot(n, h), 0.);
  let q = x * x + y * y + z * z;
  return 1. / (3.14159 * ax * ay * q * q);
}
// A tiny positive bead with C2 joins to the flat outer edge and central face.
// Its analytic inward derivative controls the normal; height adds no brightness.
fn rimProfile(inward: f32) -> vec2f {
  let t = (inward - .025) / .06;
  if (t <= 0. || t >= 1.) { return vec2f(0.); }
  let q = 1. - t;
  return vec2f(64. * .0012 * t * t * t * q * q * q,
               (192. * .0012 / .06) * t * t * q * q * (1. - 2. * t));
}
// GGX with height-correlated Smith visibility and neutral conductor Schlick F.
// F0=.75 and roughness are artistic tin-like approximations, not measured tin.
// https://google.github.io/filament/main/filament.html#materialsystem/specularbrdf
fn smithVisibility(nl: f32, nv: f32, r: f32) -> f32 {
  let a = r * r;
  let a2 = a * a;
  let gv = nl * sqrt(nv * nv * (1. - a2) + a2);
  let gl = nv * sqrt(nl * nl * (1. - a2) + a2);
  return .5 / max(gv + gl, .00001);
}
fn conductorBRDF(nh: f32, nl: f32, nv: f32, vh: f32, r: f32) -> f32 {
  let f = .75 + .25 * pow(1. - vh, 5.);
  return ggx(nh, r) * smithVisibility(nl, nv, r) * f;
}
fn env(r: vec3f, si: f32) -> vec3f {
  var c = mix(vec3f(.012, .014, .019), vec3f(.095, .105, .125), smoothstep(-.35, .7, r.y));
  c += exp(-pow(abs(r.y + .08) * 7., 2.)) * vec3f(.1, .115, .13);
  let d = normalize(vec3f(-.32, .72, .61));
  c += (pow(max(dot(r, d), 0.), 46.) * vec3f(.56, .6, .64)
      + pow(max(dot(r, d), 0.), 240.) * vec3f(2.4, 2.15, 1.8)) * si;
  c += (pow(max(dot(r, normalize(vec3f(.88, .05, .47))), 0.), 90.) * vec3f(.32, .08, .13)
      + pow(max(dot(r, normalize(vec3f(-.86, -.12, .5))), 0.), 110.) * vec3f(.06, .13, .27)) * si;
  return c;
}
fn decodeSRGB(c: vec3f) -> vec3f {
  return select(c / 12.92, pow((c + vec3f(.055)) / 1.055, vec3f(2.4)), c > vec3f(.04045));
}
fn encodeSRGB(c: vec3f) -> vec3f {
  return select(c * 12.92, 1.055 * pow(max(c, vec3f(0.)), vec3f(1. / 2.4)) - vec3f(.055), c > vec3f(.0031308));
}
fn presentHdr(metal: vec3f, nonSpecular: vec3f, alpha: f32) -> vec4f {
  let legacy = pow(max(metal / (metal + vec3f(.78)), vec3f(0.)), vec3f(.86));
  let excess = max(metal - max(nonSpecular, vec3f(1.)), vec3f(0.));
  let linearHDR = decodeSRGB(legacy) + 3. * excess / (vec3f(3.) + excess);
  // Avoid a round-trip at ordinary values: exact original encoded color.
  let encoded = select(legacy, encodeSRGB(linearHDR), excess > vec3f(0.));
  return vec4f(encoded * alpha, alpha);
}

@fragment fn fs(@builtin(position) pixel: vec4f) -> @location(0) vec4f {
  let resolution = u.settings.xy;
  let method = u.settings.z;
  let specularIntensity = u.settings.w;
  let material = u.material;
  // WebGL UV and dFdy increase upward; WebGPU framebuffer Y increases downward.
  // BOTH UV and derivative signs must be converted, including grain/noise bump.
  let uv = vec2f(pixel.x / resolution.x, 1. - pixel.y / resolution.y);
  var p = uv - vec2f(.5);
  let a = resolution.x / resolution.y;
  p.x *= a;
  let d = rr(p, vec2f(a * .488, .465), .43);
  let aa = max(fwidth(d) * 1.5, .0015);
  let al = 1. - smoothstep(-aa, aa, d);
  let gd = normalize(vec2f(dpdx(d), -dpdy(d)) + vec2f(.00001));
  let inward = max(-d, 0.);
  let rim = rimProfile(inward);
  let grain = noise(uv * vec2f(720., 115.));
  let brush = sin(uv.x * 1380. + noise(uv * vec2f(7., 29.)) * 8.);
  // Derivatives execute before discard / material branching (WGSL uniformity).
  let grainDy = -dpdy(grain);
  let filmNoise = noise(uv * vec2f(16., 9.));
  let filmGradient = vec2f(dpdx(filmNoise), -dpdy(filmNoise));
  if (al < .01) { discard; }
  var micro = vec2f(0.);
  if (method > .5 && method < 1.5) { micro = vec2f(brush * .010, grainDy * .08); }
  if (method > 1.5 && method < 2.5) { micro = filmGradient * .035; }
  let cell = floor(uv * vec2f(24., 7.));
  if (method > 2.5) { micro = (vec2f(hash(cell), hash(cell + vec2f(7.31))) - vec2f(.5)) * .075; }
  // inward=-d, so -grad(height)=gd * dh/d(inward). Preserve texture micro-bump.
  let n = normalize(vec3f(gd * rim.y + micro, 1.));
  let nw = normalize((u.worldFromDevice * vec4f(n, 0.)).xyz);
  let vw = normalize((u.worldFromDevice * vec4f(0., 0., 1., 0.)).xyz);
  let rw = normalize(reflect(-vw, nw));
  let l = normalize(vec3f(-.12, -.66, .74));
  let l2 = normalize(vec3f(.72, -.12, .68));
  let h = normalize(l + vw);
  let tw = normalize((u.worldFromDevice * vec4f(1., 0., 0., 0.)).xyz);
  let si = specularIntensity * 1.55;
  let ndl = max(dot(nw, l), 0.);
  let ndl2 = max(dot(nw, l2), 0.);
  // Unit-vector dot products can round above one; keep pow(1-ndv, 5) defined.
  let ndv = clamp(dot(nw, vw), .001, 1.);
  let rough = clamp(.24 + material.z * .4 + (grain - .5) * .012, .26, .38);
  let brdf = conductorBRDF(max(dot(nw, h), 0.), ndl, ndv, clamp(dot(vw, h), 0., 1.), rough);
  let spec = brdf * ndl * si;
  let fres = .18 + .82 * pow(1. - ndv, 5.);
  let inc = dot(nw, l);
  let e = env(rw, si);
  let eBase = env(rw, 0.);
  var metal: vec3f;
  var nonSpecular: vec3f;
  if (method < .5) {
    let sweep = dot(rw, normalize(vec3f(.76, .18, .62))) * .58 + rw.y * .16 + .08;
    let color = spectrum(sweep) * (.68 + fres * .42);
    metal = e * .46 + color + vec3f(spec) * .72;
    nonSpecular = eBase * .46 + color;
  } else if (method < 1.5) {
    let streak = .5 + .5 * sin(uv.x * 920. + noise(uv * vec2f(8., 37.)) * 5.);
    let glint = pow(streak, 18.);
    let petrol = vec3f(.018, .055, .068) + spectrum(dot(rw, normalize(vec3f(.82, .08, .56))) * 1.72 + .46) * .24;
    let color = petrol * (.52 + .34 * ndl) + glint * spectrum(uv.x * .4 + inc) * .34;
    metal = e * .72 + color + vec3f(spec) * 1.12;
    nonSpecular = eBase * .72 + color;
  } else if (method < 2.5) {
    let optical = (1. - abs(inc)) * 1.58 + noise(uv * vec2f(5., 3.)) * .07 + .18;
    let pearl = vec3f(.72) + .20 * cos(6.28318 * (optical * vec3f(1., 1.29, 1.61) + vec3f(.02, .24, .51)));
    let color = pearl * (.64 + fres * .48);
    metal = e * .31 + color + vec3f(spec) * .58;
    nonSpecular = eBase * .31 + color;
  } else {
    let band = dot(rw, normalize(vec3f(.67, .29, .68))) * 3.15 + hash(cell) * .18;
    let prism = spectrum(band);
    let color = prism * (.48 + .62 * (.42 + .58 * pow(.5 + .5 * cos(6.28318 * band), 5.)));
    metal = e * 1.02 + color + vec3f(spec) * 1.48;
    nonSpecular = eBase * 1.02 + color;
  }
  let sl = ndl;
  let surfaceF = .75 + .25 * pow(1. - ndv, 5.);
  let h2 = normalize(l2 + vw);
  let surfaceSpec = brdf * sl * .35
      + conductorBRDF(max(dot(nw, h2), 0.), ndl2, ndv, clamp(dot(vw, h2), 0., 1.), rough) * ndl2 * .08;
  // Shared broad metal reflection, with the original lights and environment.
  metal += (vec3f(surfaceSpec) + e * surfaceF * .10) * si;
  let vignette = 1. - dot(uv - vec2f(.5), uv - vec2f(.5)) * .34;
  metal *= vignette;
  nonSpecular *= vignette;
  return presentHdr(metal, nonSpecular, al);
}
`;

export type OriginalHdrOptions = {
  matrix: () => Float32Array;
  method: number;
  material: readonly number[];
  specular: () => number;
  error: (message: string) => void;
};

// A private structural subset avoids adding global WebGPU declarations to a
// package which also supports TypeScript projects with older DOM libraries.
type GpuBuffer = { destroy(): void };
type GpuModule = { getCompilationInfo(): Promise<{ messages: { type: string; message: string }[] }> };
type GpuPipeline = { getBindGroupLayout(index: number): unknown };
type GpuPass = { setPipeline(pipeline: GpuPipeline): void; setBindGroup(index: number, group: unknown): void; draw(count: number): void; end(): void };
type GpuEncoder = { beginRenderPass(descriptor: unknown): GpuPass; finish(): unknown };
type GpuDevice = {
  pushErrorScope(filter: string): void;
  popErrorScope(): Promise<{ message: string } | null>;
  createShaderModule(descriptor: { code: string }): GpuModule;
  createRenderPipelineAsync(descriptor: unknown): Promise<GpuPipeline>;
  createBuffer(descriptor: { size: number; usage: number }): GpuBuffer;
  createBindGroup(descriptor: unknown): unknown;
  createCommandEncoder(): GpuEncoder;
  queue: { writeBuffer(buffer: GpuBuffer, offset: number, data: Float32Array): void; submit(commands: unknown[]): void };
  lost: Promise<{ reason: string; message?: string }>;
};
type GpuContext = {
  configure(descriptor: unknown): void;
  getConfiguration?(): { format?: string; toneMapping?: { mode?: string }; alphaMode?: string } | null;
  getCurrentTexture(): { createView(): unknown };
  unconfigure(): void;
};
type GpuNavigator = { gpu?: { requestAdapter(): Promise<{ requestDevice(): Promise<GpuDevice> } | null> } };

let sharedDevice: Promise<GpuDevice> | undefined;
function getDevice(): Promise<GpuDevice> {
  if (!sharedDevice) {
    const pending = (async () => {
      const gpu = (navigator as unknown as GpuNavigator).gpu;
      if (!gpu) throw new Error("WebGPU unavailable");
      const adapter = await gpu.requestAdapter();
      if (!adapter) throw new Error("WebGPU adapter unavailable");
      return adapter.requestDevice();
    })();
    sharedDevice = pending;
    pending.then(device => {
      void device.lost.then(() => { if (sharedDevice === pending) sharedDevice = undefined; });
    }, () => { if (sharedDevice === pending) sharedDevice = undefined; });
  }
  return sharedDevice;
}

// Validation scopes are device-wide. Parallel button mounts must not interleave.
let initializationQueue: Promise<unknown> = Promise.resolve();
export function createOriginalHdrRenderer(canvas: HTMLCanvasElement, options: OriginalHdrOptions): Promise<() => void> {
  const result = initializationQueue.then(() => initialize(canvas, options));
  initializationQueue = result.catch(() => undefined);
  return result;
}

async function initialize(canvas: HTMLCanvasElement, options: OriginalHdrOptions): Promise<() => void> {
  if (typeof matchMedia !== "function" || !matchMedia("(dynamic-range: high)").matches) {
    throw new Error("HDR display unavailable; retain the original WebGL renderer");
  }
  const device = await getDevice();
  const context = canvas.getContext("webgpu") as unknown as GpuContext | null;
  if (!context) throw new Error("WebGPU canvas unavailable");
  let buffer: GpuBuffer | undefined;
  let scopeOpen = false;
  let ready = false;
  let stopped = false;
  let failureMessage = "HDR renderer stopped during initialization";
  let raf = 0;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(raf);
    buffer?.destroy();
    context.unconfigure();
  };
  const fail = (message: string) => {
    if (stopped) return;
    failureMessage = message;
    stop();
    options.error(message);
  };
  void device.lost.then(info => fail(`WebGPU device lost: ${info.message || info.reason}`));
  try {
    device.pushErrorScope("validation");
    scopeOpen = true;
    context.configure({ device, format: "rgba16float", colorSpace: "srgb", alphaMode: "premultiplied", toneMapping: { mode: "extended" } });
    const configuration = context.getConfiguration?.();
    if (configuration?.toneMapping?.mode !== "extended" || configuration.format !== "rgba16float") {
      throw new Error("Extended HDR canvas configuration unavailable");
    }
    const module = device.createShaderModule({ code: originalHdrShader });
    const info = await module.getCompilationInfo();
    if (stopped) throw new Error(failureMessage);
    const errors = info.messages.filter(message => message.type === "error");
    if (errors.length) throw new Error(errors.map(message => message.message).join("\n"));
    const pipeline = await device.createRenderPipelineAsync({
      layout: "auto",
      vertex: { module, entryPoint: "vs" },
      fragment: { module, entryPoint: "fs", targets: [{ format: "rgba16float" }] },
      primitive: { topology: "triangle-list" },
    });
    if (stopped) throw new Error(failureMessage);
    // mat4 (64 bytes), material vec4 (16), settings vec4 (16).
    // WebGPU's normative usage bits: UNIFORM=0x40, COPY_DST=0x08.
    buffer = device.createBuffer({ size: 96, usage: 0x40 | 0x08 });
    const group = device.createBindGroup({ layout: pipeline.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer } }] });
    const validation = await device.popErrorScope();
    scopeOpen = false;
    if (validation) throw new Error(validation.message);
    if (stopped) throw new Error(failureMessage);
    const values = new Float32Array(24);
    values.set(options.material.slice(0, 4), 16);
    const frame = () => {
      if (stopped) return;
      try {
        if (!document.hidden) {
          const rect = canvas.getBoundingClientRect();
          const dpr = Math.min(devicePixelRatio || 1, 2);
          const width = Math.max(1, Math.round(rect.width * dpr));
          const height = Math.max(1, Math.round(rect.height * dpr));
          if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
          const m = options.matrix();
          values.set([m[0], m[1], m[2], 0, m[3], m[4], m[5], 0, m[6], m[7], m[8], 0, 0, 0, 0, 1]);
          const intensity = options.specular();
          values.set([width, height, options.method, Number.isFinite(intensity) ? Math.max(0, intensity) : 0], 20);
          device.queue.writeBuffer(buffer!, 0, values);
          const encoder = device.createCommandEncoder();
          const pass = encoder.beginRenderPass({ colorAttachments: [{
            view: context.getCurrentTexture().createView(),
            loadOp: "clear", storeOp: "store", clearValue: { r: 0, g: 0, b: 0, a: 0 },
          }] });
          pass.setPipeline(pipeline);
          pass.setBindGroup(0, group);
          pass.draw(3);
          pass.end();
          device.queue.submit([encoder.finish()]);
        }
        raf = requestAnimationFrame(frame);
      } catch (error) {
        fail(error instanceof Error ? error.message : String(error));
      }
    };
    raf = requestAnimationFrame(frame);
    ready = true;
    return stop;
  } finally {
    try { if (scopeOpen) await device.popErrorScope(); }
    finally { if (!ready) stop(); }
  }
}
