/**
 * WebGPU presentation matching the WebGL material in this preview.
 * The four texture branches, noise and motion retain
 * the original design. The shared macro normal, inset ridge and metal reflection
 * are deliberately refined in preview.4, identically in GLSL and WGSL.
 *
 * Preview.8 retargets specular lights to portrait pitch, broadens them 20%, and
 * adds controlled Sticker Foil gloss. Original incidence still drives colors.
 * Preview.11 couples foil phase and colored radiance to one reflected-light frame.
 * The source curve/pattern and 20% softened gain remain; gravity-only phase and
 * the separate white overlay are removed. This is a stylized optical response.
 * Preview.12 deepens post-texture chroma and colored HDR headroom, widens the
 * shared C2 rim, and uses a shared foil-only adaptive light-frame correction.
 * SDR uses an RGB-wide shoulder; HDR extends the same colored reflection.
 * HDR presentation:
 *   C = (M / (M + 0.78)) ^ 0.86       original, display-encoded artistic curve
 *   E = max(M - max(B, 1), 0)        specular-only excess above the SDR shoulder
 *   H = decodeSRGB(C) + K E/(K + E), K=3 at intensity<=1, 7.5 at10
 *   Default headroom is unchanged; high slider values deliberately grow it.
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
// A wider, taller positive bead with C2 joins to flat outer land and center.
// Its analytic inward derivative controls the normal; height adds no brightness.
fn rimProfile(inward: f32) -> vec2f {
  let t = (inward - .018) / .064;
  if (t <= 0. || t >= 1.) { return vec2f(0.); }
  let q = 1. - t;
  return vec2f(64. * .0016 * t * t * t * q * q * q,
               (192. * .0016 / .064) * t * t * q * q * (1. - 2. * t));
}
// Virtual viewer at (0,0,5) in device coordinates, five face-height units away.
// This artistic optical perspective restores a reflected color sweep on a flat
// face without changing its normal. At 4:1 aspect the full horizontal FOV is 44deg.
// View and normal share a frame: raw world attitude for the original four;
// the foil renderer alone supplies its slowly adapting effective light frame.
fn viewDirection(p: vec2f) -> vec3f {
  return normalize(vec3f(-p.x, -p.y, 5.));
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
  let d = normalize(vec3f(-.12, -.88, .46));
  c += (pow(max(dot(r, d), 0.), 34.) * vec3f(.07, .075, .08)
      + pow(max(dot(r, d), 0.), 150.) * vec3f(.3, .26875, .225)) * si;
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
  let headroom = 3. + .5 * clamp(u.settings.w - 1., 0., 9.);
  let linearHDR = decodeSRGB(legacy) + headroom * excess / (vec3f(headroom) + excess);
  // Avoid a round-trip at ordinary values: exact original encoded color.
  let encoded = select(legacy, encodeSRGB(linearHDR), excess > vec3f(0.));
  return vec4f(encoded * alpha, alpha);
}

// Sticker foil adapted from bpisano/Sticker at 301b9e0 (MIT).
// Environment defaults, not the ShaderLibrary wrapper's scale=2 default.
// Top-left UV; CSS-point random; only the checker uses aspect correction.
// Preserve upstream white-fill foil color curve as the colored reflection carrier.
// Canvas uses geometric coverage alpha: upstream contrast also alters alpha,
// which is not portable to a premultiplied browser canvas. See reference tests.
fn stickerRandom(x: f32, y: f32) -> f32 {
  return fract(sin(x * 12.9898 + y * 78.233) * 43758.5453);
}
fn stickerNoise(x: f32, y: f32) -> f32 {
  let ix = floor(x); let iy = floor(y);
  let fx = fract(x); let fy = fract(y);
  let sx = fx * fx * (3. - 2. * fx); let sy = fy * fy * (3. - 2. * fy);
  let a = stickerRandom(ix, iy); let b = stickerRandom(ix + 1., iy);
  let c = stickerRandom(ix, iy + 1.); let d = stickerRandom(ix + 1., iy + 1.);
  return mix(a, b, sx) + (c - a) * sy * (1. - sx) + (d - b) * sx * sy;
}
fn stickerDiamond(x: f32, y: f32, aspect: f32) -> f32 {
  let dx = (x * aspect - y) * .7071067811865476 * 12.5;
  let dy = (x * aspect + y) * .7071067811865476 * 12.5;
  return 2. * fract((floor(dx) + floor(dy)) * .5);
}
fn stickerPhase(position: f32, transform: f32) -> f32 {
  return 10. * (position + 2.5 - 1.5 * transform) / 3.;
}
// Optical angular adapter, retaining the source softening with 20% extra gain.
// Both phase axes use the same reflected-light frame as angular visibility.
// This is a stylized colored reflection, not a wavelength-resolved diffraction solver.
fn stickerMotion(axis: f32) -> f32 {
  let angle = asin(clamp(axis, -1., 1.));
  return .6 * angle / (1. + abs(angle) / 1.5707963267948966);
}


fn stickerChannel(channel: f32, x: f32, y: f32, tx: f32, ty: f32, width: f32, height: f32, base: f32) -> f32 {
  let phaseX = stickerPhase(x, tx); let phaseY = stickerPhase(y, ty);
  let jitter = stickerRandom(x * width, y * height) * .1;
  let balance = max(smoothstep(.2, 1., base) * .8, .3);
  let red = mix(base, .9 + .25 * sin(phaseX + jitter), balance);
  let green = mix(base, .9 + .25 * cos(phaseY + jitter), balance);
  let blue = mix(base, .9 + .25 * sin(phaseX + phaseY - jitter), balance);
  let brightness = red * .299 + green * .587 + blue * .114;
  let checkerContrast = mix(1., 1.2, stickerDiamond(x, y, width / height) * brightness);
  let checkerBrightness = (brightness - .5) * checkerContrast + .5;
  let grainContrast = mix(1., 1.2, stickerNoise(x * 100., y * 100.) * checkerBrightness);
  if (channel < .5) { return (red - .5) * checkerContrast * grainContrast + .5; }
  if (channel < 1.5) { return (green - .5) * checkerContrast * grainContrast + .5; }
  return (blue - .5) * checkerContrast * grainContrast + .5;
}
// Bounded area-emitter approximation, not a spectral or integrated microfacet BRDF.
// Slightly narrower core; broad shoulders and existing perspective/rim remain.
fn stickerSoftbox(horizontal: f32, vertical: f32, forward: f32) -> f32 {
  let denominator = max(forward, .001);
  let side = 1. - smoothstep(.58, 2.8, abs(horizontal) / denominator);
  let top = 1. - smoothstep(.095, .65, abs(vertical) / denominator);
  return side * top * smoothstep(0., .25, forward);
}
fn stickerReflection(horizontal: f32, vertical: f32, forward: f32, x: f32, y: f32, aspect: f32) -> f32 {
  // Reuse the existing attached pattern only: tiny lobe-width variation, no bump.
  let roughness = 1. + .02 * (stickerDiamond(x, y, aspect) - .5) + .02 * (stickerNoise(x * 100., y * 100.) - .5);
  let h = horizontal / max(forward, .001);
  let v = vertical / max(forward, .001);
  // Smooth emitter radiance variation keeps colored reflection responsive in the core.
  let emitter = 1. - .04 * (1. - 1. / (1. + 4. * (h / .58) * (h / .58) + 4. * (v / .095) * (v / .095)));
  return stickerSoftbox(horizontal / roughness, vertical / roughness, forward) * emitter;
}

fn stickerHighlight(coverage: f32, intensity: f32) -> f32 {
  return coverage * max(intensity, 0.) / (.35 + max(intensity, 0.));
}
fn stickerSubstrate(x: f32, y: f32, aspect: f32) -> f32 {
  return .98 - .07 * stickerDiamond(x, y, aspect) - .025 * stickerNoise(x * 100., y * 100.);
}
fn stickerDecode(c: f32) -> f32 {
  if (c <= .04045) { return c / 12.92; }
  return pow((c + .055) / 1.055, 2.4);
}
fn stickerEncode(c: f32) -> f32 {
  if (c <= .0031308) { return c * 12.92; }
  return 1.055 * pow(c, 1. / 2.4) - .055;
}
// Both canvases receive encoded values; compose reflected light in linear space.
// Peak-preserving chroma applied after the untouched source texture.
fn stickerChroma(channel: f32, peak: f32) -> f32 {
  return peak * pow(max(channel, 0.) / max(peak, .00001), 3.2);
}
fn stickerLinear(base: f32, highlight: f32, substrate: f32, headroom: f32) -> f32 {
  // Dim neutral environment plus one colored reflection; no white highlight layer.
  return .055 * stickerDecode(substrate) + stickerDecode(max(base, 0.)) * highlight * (.82 + headroom);
}
fn stickerSdr(base: f32, highlight: f32, substrate: f32, peak: f32) -> f32 {
  let radiance = stickerLinear(base, highlight, substrate, 0.);
  let peakRadiance = stickerLinear(peak, highlight, substrate, 0.);
  let excess = max(peakRadiance - .8, 0.);
  let shoulder = .8 + .2 * excess / (.2 + excess);
  let scale = min(1., shoulder / max(peakRadiance, .00001));
  return stickerEncode(radiance * scale);
}
// Extended-range light strengthens the same colored reflection, without neutralization.

fn stickerHdr(base: f32, intensity: f32, highlight: f32, substrate: f32) -> f32 {
  let strength = 11. * max(intensity, 0.) / (10. + max(intensity, 0.));
  return stickerEncode(stickerLinear(base, highlight, substrate, .9 * strength));
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
  // Isolated fifth texture; all presets share the portrait specular light.
  if (method > 3.5) {
    if (al < .01) { return vec4f(0.); }
    let stickerUv = vec2f(uv.x, 1. - uv.y);
    let stickerInput = 1.;
    let sn = normalize((u.worldFromDevice * vec4f(normalize(vec3f(gd * rim.y, 1.)), 0.)).xyz);
    let sv = normalize((u.worldFromDevice * vec4f(viewDirection(p), 0.)).xyz);
    let sr = reflect(-sv, sn);
    let opticalX = stickerMotion(dot(sr, vec3f(.997884910, -.011350451, -.064006826)));
    let opticalY = stickerMotion(dot(sr, vec3f(.062139647, .455690748, .887966557)));
    var stickerBase = vec3f(stickerChannel(0., stickerUv.x, stickerUv.y, opticalX, opticalY, material.x, material.y, stickerInput),
                             stickerChannel(1., stickerUv.x, stickerUv.y, opticalX, opticalY, material.x, material.y, stickerInput),
                             stickerChannel(2., stickerUv.x, stickerUv.y, opticalX, opticalY, material.x, material.y, stickerInput));
    let carrierPeak = max(stickerBase.r, max(stickerBase.g, stickerBase.b));
    stickerBase = vec3f(stickerChroma(stickerBase.r, carrierPeak), stickerChroma(stickerBase.g, carrierPeak), stickerChroma(stickerBase.b, carrierPeak));
    let coverage = stickerReflection(dot(sr, vec3f(.997884910, -.011350451, -.064006826)),
                                  dot(sr, vec3f(.062139647, .455690748, .887966557)),
                                  dot(sr, vec3f(.019088498, -.890065790, .455432235)), stickerUv.x, stickerUv.y, a);
    let highlight = stickerHighlight(coverage, specularIntensity);
    let substrate = stickerSubstrate(stickerUv.x, stickerUv.y, a);
    let stickerRgb = vec3f(stickerHdr(stickerBase.r, specularIntensity, highlight, substrate),
                            stickerHdr(stickerBase.g, specularIntensity, highlight, substrate),
                            stickerHdr(stickerBase.b, specularIntensity, highlight, substrate));
    return vec4f(stickerRgb * al, al);
  }
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
  let vw = normalize((u.worldFromDevice * vec4f(viewDirection(p), 0.)).xyz);
  let rw = normalize(reflect(-vw, nw));
  let l = normalize(vec3f(-.12, -.66, .74));
  let ls = normalize(vec3f(-.12, -.88, .46));
  let l2 = normalize(vec3f(.72, -.356, .592));
  let h = normalize(ls + vw);
  let tw = normalize((u.worldFromDevice * vec4f(1., 0., 0., 0.)).xyz);
  let si = specularIntensity * 1.55;
  let ndl = max(dot(nw, l), 0.);
  let nls = max(dot(nw, ls), 0.);
  let ndl2 = max(dot(nw, l2), 0.);
  // Unit-vector dot products can round above one; keep pow(1-ndv, 5) defined.
  let ndv = clamp(dot(nw, vw), .001, 1.);
  let rough = clamp(.24 + material.z * .4 + (grain - .5) * .012, .26, .38) * 1.095445115;
  let brdf = conductorBRDF(max(dot(nw, h), 0.), nls, ndv, clamp(dot(vw, h), 0., 1.), rough);
  // Scale neutral radiance before the unchanged material branches to retain color.
  let spec = brdf * nls * si * .12;
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
  let sl = nls;
  let surfaceF = .75 + .25 * pow(1. - ndv, 5.);
  let h2 = normalize(l2 + vw);
  let surfaceSpec = brdf * sl * .08
      + conductorBRDF(max(dot(nw, h2), 0.), ndl2, ndv, clamp(dot(vw, h2), 0., 1.), rough) * ndl2 * .025;
  // Shared metal reflection: portrait light, 20% wider GGX; original environment.
  metal += (vec3f(surfaceSpec) + e * surfaceF * .10) * si;
  let vignette = 1. - dot(uv - vec2f(.5), uv - vec2f(.5)) * .34;
  metal *= vignette;
  nonSpecular *= vignette;
  return presentHdr(metal, nonSpecular, al);
}
`;

export type OriginalHdrOptions = {
  matrix: (now: number) => Float32Array;
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
    const frame = (now: number = performance.now()) => {
      if (stopped) return;
      try {
        if (!document.hidden) {
          const rect = canvas.getBoundingClientRect();
          const dpr = Math.min(devicePixelRatio || 1, 2);
          const width = Math.max(1, Math.round(rect.width * dpr));
          const height = Math.max(1, Math.round(rect.height * dpr));
          if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
          if (options.method === 4) values.set([Math.max(rect.width, 1), Math.max(rect.height, 1), 0, 0], 16);
          const m = options.matrix(now);
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
