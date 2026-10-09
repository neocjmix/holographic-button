/**
 * WebGPU presentation matching the WebGL material and optical controls.
 * Motion, surface geometry, texture formulas and colors share the same model.
 *
 * HDR adds specular-only excess above the SDR shoulder in linear light, keeping
 * the zero-specular base unchanged. rgba16float with colorSpace: "srgb" uses
 * transfer-encoded output, premultiplied by geometric coverage alpha.
 * The browser and display determine the available HDR headroom.
 * https://www.w3.org/TR/webgpu/#canvas-color-space
 */

/** Legacy mirror controls. Relative values of 1 preserve preview13. */
export type MirrorOptions = {
  diffraction: number;
  rainbowSpacing: number;
  reflectionBlur: number;
  directionality: number;
  bubbles: number;
  scratches: number;
  ridgeWidth: number;
  ridgeHeight: number;
  /** Adaptation time constant in seconds; smaller is faster. Never disables motion. */
  recoverySeconds: number;
};
export const DEFAULT_MIRROR_OPTIONS: Readonly<MirrorOptions> = Object.freeze({
  diffraction: 0, rainbowSpacing: 1, reflectionBlur: 1, directionality: 1,
  bubbles: 1, scratches: 1, ridgeWidth: 1, ridgeHeight: 1, recoverySeconds: 2.5,
});
export const MIRROR_OPTION_LIMITS: Readonly<Record<keyof MirrorOptions, readonly [number, number]>> = Object.freeze({
  diffraction: [0, 8] as const, rainbowSpacing: [.25, 8] as const,
  reflectionBlur: [0, 4] as const, directionality: [0, 4] as const,
  bubbles: [0, 100] as const, scratches: [0, 100] as const,
  ridgeWidth: [.15, 3.25] as const, ridgeHeight: [0, 6] as const,
  recoverySeconds: [.1, 30] as const,
});
export function normalizeMirrorOptions(input?: Partial<MirrorOptions>): MirrorOptions {
  const result = { ...DEFAULT_MIRROR_OPTIONS };
  for (const key of Object.keys(result) as (keyof MirrorOptions)[]) {
    const value = input?.[key], [min, max] = MIRROR_OPTION_LIMITS[key];
    if (typeof value === "number" && Number.isFinite(value)) result[key] = Math.min(max, Math.max(min, value));
  }
  return result;
}

/** One continuous material model; presets contain numbers, never shader modes. */
export type OpticalOptions = MirrorOptions & {
  /** Reflected-light coating: 0 neutral, 1 vivid, 2 high-contrast spectral color. */
  iridescence: number;
  /** Attached printed facets: changes micro-normal and coating phase together. */
  facetStrength: number;
  /** Number of square/diamond cells per face-height unit. */
  facetScale: number;
  /** Surface grating and grid rotation in degrees. */
  gratingAngle: number;
};
export const DEFAULT_OPTICAL_OPTIONS: Readonly<OpticalOptions> = Object.freeze({
  ...DEFAULT_MIRROR_OPTIONS, iridescence: 0, facetStrength: 0, facetScale: 12, gratingAngle: 0,
});
export const OPTICAL_OPTION_LIMITS: Readonly<Record<keyof OpticalOptions, readonly [number, number]>> = Object.freeze({
  ...MIRROR_OPTION_LIMITS, iridescence: [0, 2] as const, facetStrength: [0, 1] as const,
  facetScale: [2, 48] as const, gratingAngle: [-90, 90] as const,
});
export function normalizeOpticalOptions(input?: Partial<OpticalOptions>): OpticalOptions {
  const result = { ...DEFAULT_OPTICAL_OPTIONS };
  for (const key of Object.keys(result) as (keyof OpticalOptions)[]) {
    const value = input?.[key], [min, max] = OPTICAL_OPTION_LIMITS[key];
    if (typeof value === "number" && Number.isFinite(value)) result[key] = Math.min(max, Math.max(min, value));
  }
  return result;
}
export type OpticalPresetId = "satin-mirror" | "card-foil" | "grid-prism" | "smooth-prism";
export type OpticalPreset = Readonly<{id: OpticalPresetId; label: string; note: string; options: Readonly<OpticalOptions>; specular: number}>;
const opticalPreset = (id: OpticalPresetId, label: string, note: string, input: Partial<OpticalOptions>, specular = 5): OpticalPreset =>
  Object.freeze({ id, label, note, options: Object.freeze(normalizeOpticalOptions(input)), specular });
export const OPTICAL_PRESETS: readonly OpticalPreset[] = Object.freeze([
  opticalPreset("satin-mirror", "Satin Mirror", "프리뷰 13의 부드러운 회색 거울", {}),
  opticalPreset("card-foil", "Card Foil", "포켓몬 카드에서 영감받은 파스텔 포일", { iridescence: .75, diffraction: 1.4, rainbowSpacing: .8, reflectionBlur: .35, directionality: .4, facetStrength: .14, facetScale: 18, gratingAngle: 45, bubbles: 0, scratches: 0 }),
  opticalPreset("grid-prism", "Grid Prism", "각진 셀마다 갈라지는 선명한 스펙트럼", { iridescence: 1.1, diffraction: .5, rainbowSpacing: .6, reflectionBlur: .18, directionality: 1.6, facetStrength: .23, facetScale: 7, gratingAngle: 0, bubbles: 0, scratches: 0 }),
  opticalPreset("smooth-prism", "Smooth Prism", "매끈한 표면 위의 넓은 색 반사", { iridescence: 1, diffraction: .8, rainbowSpacing: 1.65, reflectionBlur: .06, directionality: 0, facetStrength: 0, bubbles: 0, scratches: 0 }),
]);
export type OpticalControl = Readonly<{key: keyof OpticalOptions; label: string; min: number; max: number; step: number; unit?: string; scale?: "log" | "power"; group: "surface" | "pattern" | "motion"; hint: string}>;
const control = (key: keyof OpticalOptions, label: string, group: OpticalControl["group"], step: number, hint: string, extra: Pick<OpticalControl, "unit" | "scale"> = {}): OpticalControl =>
  Object.freeze({ key, label, group, step, hint, min: OPTICAL_OPTION_LIMITS[key][0], max: OPTICAL_OPTION_LIMITS[key][1], ...extra });
export const OPTICAL_CONTROLS: readonly OpticalControl[] = Object.freeze([
  control("iridescence", "색 코팅", "pattern", .02, "0은 무채색, 1은 선명한 색, 2는 강한 색 대비"),
  control("diffraction", "회절 강도", "pattern", .05, "거울 반사를 파장별 회절로 옮겨. 밝기만 더하지 않아"),
  control("rainbowSpacing", "회절 격자 간격", "pattern", .01, "작을수록 촘촘한 코팅 색. 아주 작은 간격은 회절 차수가 사라질 수 있어", {scale:"log"}),
  control("gratingAngle", "격자 방향", "pattern", 1, "회절, 반사 블러 방향과 셀을 함께 회전해", {unit:"°"}),
  control("facetStrength", "격자 요철", "pattern", .01, "0은 매끈한 면. 올리면 각 셀의 반사와 색이 갈라져"),
  control("facetScale", "격자 밀도", "pattern", .1, "버튼 높이당 셀 개수. 방향 45°에서 다이아몬드", {scale:"log",unit:" cells"}),
  control("reflectionBlur", "반사 블러", "surface", .02, "0은 또렷한 반사. 높은 값은 넓게 퍼진 반사"),
  control("directionality", "블러 방향성", "surface", .05, "0은 균일한 블러. 높을수록 한 방향으로 길어져"),
  control("bubbles", "미세 기포", "surface", .1, "1은 원래 미세 기포, 100은 뚜렷하게 부푼 표면", {scale:"power"}),
  control("scratches", "미세 흠집", "surface", .1, "1은 원래 미세 흠집, 100은 깊은 홈", {scale:"power"}),
  control("ridgeWidth", "테두리 요철 폭", "surface", .01, "원래 둥근 테두리의 폭. 중앙 평면은 유지돼", {scale:"log"}),
  control("ridgeHeight", "테두리 돌출 높이", "surface", .05, "0은 평평한 테두리. 높이면 반사각이 크게 바뀌어"),
  control("recoverySeconds", "각도 회복 시간", "motion", .01, "작을수록 빠르게 빛을 되찾아. 기기 움직임은 즉시 반영돼", {scale:"log",unit:"s"}),
]);

export const originalHdrShader: string = /* wgsl */ `
struct Uniforms {
  worldFromDevice: mat4x4f,
  material: vec4f,
  // xy: backing-store resolution, z: original material method, w: intensity
  settings: vec4f,
  mirrorA: vec4f, // diffraction, grating spacing, blur, directionality
  mirrorB: vec4f, // bubbles, scratches, ridge width, ridge height
  opticalC: vec4f, // coating density, facets, cells/height, grating angle (radians)
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
  let t = (inward - .018) / .128;
  if (t <= 0. || t >= 1.) { return vec2f(0.); }
  let q = 1. - t;
  return vec2f(64. * .0032 * t * t * t * q * q * q,
               (192. * .0032 / .128) * t * t * q * q * (1. - 2. * t));
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
  return stickerEncode(stickerLinear(base, highlight, substrate, .5 * strength));
}

// Original neutral room map and a bounded surface-aligned anisotropic reflection filter.
fn mirrorRect(x: f32, y: f32, cx: f32, cy: f32, hx: f32, hy: f32) -> f32 {
return (1. - smoothstep(hx - .10, hx + .10, abs(x - cx))) * (1. - smoothstep(hy - .035, hy + .035, abs(y - cy)));
}
fn mirrorRoom(horizontal: f32, vertical: f32, forward: f32, intensity: f32) -> f32 {
let z = max(abs(forward), .08);
let x = horizontal / z; let y = vertical / z;
let wall = .18 + .16 * smoothstep(-.6, .7, y);
let floorBand = 1. - smoothstep(-.48, -.40, y);
let cabinet = mirrorRect(x, y, -.68, -.12, .24, .48);
let panel = mirrorRect(x, y, .73, .02, .17, .68);
let window = mirrorRect(x, y, -.24, .17, .34, .24);
let mullion = (1. - smoothstep(.012, .105, abs(x + .24))) + (1. - smoothstep(.018, .048, abs(y - .17)));
let panes = window * max(0., 1. - mullion);
let room = wall * (1. - .52 * floorBand) - .12 * cabinet - .11 * panel + .21 * window;
let front = smoothstep(-.1, .25, forward);
return max(.035, room) + front * panes * (1.6 * max(intensity, 0.) / (1. + .16 * max(intensity, 0.)));
}
fn mirrorWeight(i: f32) -> f32 {
return 6. - 2. * abs(i) - step(1.5, abs(i));
}
fn mirrorHeight(x: f32, y: f32) -> f32 {
let b1 = exp(-((x + .63) * (x + .63) + (y - .12) * (y - .12)) / .0009);
let b2 = exp(-((x - .41) * (x - .41) + (y + .20) * (y + .20)) / .0004);
let b3 = exp(-((x - 1.13) * (x - 1.13) + (y - .03) * (y - .03)) / .000625);
let scratch = exp(-pow((y + .08 + .12 * x) / .003, 2.)) * exp(-pow((x + .14) / .21, 4.));
return .00010 * b1 + .00007 * b2 + .00008 * b3 - .000008 * scratch;
}
fn mirrorReflection(r: vec3f, tangent: vec3f, intensity: f32) -> f32 {
 let projected = tangent - r * dot(tangent, r); let t = projected / max(length(projected), .00001); let b = cross(r, t);
 var total = 0.;
 for (var ix: i32 = -2; ix <= 2; ix++) { for (var iy: i32 = -1; iy <= 1; iy++) {
  let x = f32(ix); let y = f32(iy);
  let ray = normalize(r + t * (x * .11) + b * (y * .009));
  let radiance = mirrorRoom(dot(ray, vec3f(.997884910,-.011350451,-.064006826)), dot(ray, vec3f(.062139647,.455690748,.887966557)), dot(ray, vec3f(.019088498,-.890065790,.455432235)), intensity);
  total += radiance * mirrorWeight(x) * (2. - abs(y)) / 64.;
 }}
 return total;
}

// Footprint-aware source edges suppress repeated windows at wide filter settings.
fn opticalRect(x: f32, y: f32, cx: f32, cy: f32, hx: f32, hy: f32, softness: f32) -> f32 {
 return (1. - smoothstep(hx - .10 - softness, hx + .10 + softness, abs(x - cx))) * (1. - smoothstep(hy - .035 - softness, hy + .035 + softness, abs(y - cy)));
}
fn opticalRoom(horizontal: f32, vertical: f32, forward: f32, intensity: f32, softness: f32) -> f32 {
let z = max(abs(forward), .08);
let x = horizontal / z; let y = vertical / z;
let wall = .18 + .16 * smoothstep(-.6, .7, y);
let floorBand = 1. - smoothstep(-.48 - softness, -.40 + softness, y);
let cabinet = opticalRect(x, y, -.68, -.12, .24, .48, softness);
let panel = opticalRect(x, y, .73, .02, .17, .68, softness);
let window = opticalRect(x, y, -.24, .17, .34, .24, softness);
let mullion = (1. - smoothstep(.012 - softness, .105 + softness, abs(x + .24))) + (1. - smoothstep(.018 - softness, .048 + softness, abs(y - .17)));
let panes = window * max(0., 1. - mullion);
let room = wall * (1. - .52 * floorBand) - .12 * cabinet - .11 * panel + .21 * window;
let front = smoothstep(-.1, .25, forward);
return max(.035, room) + front * panes * (1.6 * max(intensity, 0.) / (1. + .16 * max(intensity, 0.)));
}

// Tuned paths retain the original helper verbatim at preview13 defaults.
fn mirrorRim(inward: f32) -> vec2f {
 if (u.mirrorB.z == 1. && u.mirrorB.w == 1.) { return rimProfile(inward); }
 let width = .128 * u.mirrorB.z;
 let t = (inward - .018) / width;
 if (t <= 0. || t >= 1.) { return vec2f(0.); }
 let q = 1. - t;
 return vec2f(64. * .0032 * u.mirrorB.w * t*t*t*q*q*q, (192. * .0032 * u.mirrorB.w / width) * t*t*q*q*(1. - 2.*t));
}
fn mirrorTunedHeight(x: f32, y: f32) -> f32 {
 if (u.mirrorB.x == 1. && u.mirrorB.y == 1.) { return mirrorHeight(x, y); }
 let b1 = exp(-((x + .63) * (x + .63) + (y - .12) * (y - .12)) / .0009);
 let b2 = exp(-((x - .41) * (x - .41) + (y + .20) * (y + .20)) / .0004);
 let b3 = exp(-((x - 1.13) * (x - 1.13) + (y - .03) * (y - .03)) / .000625);
 let scratch = exp(-pow((y + .08 + .12 * x) / .003, 2.)) * exp(-pow((x + .14) / .21, 4.));
 return (.00010 * b1 + .00007 * b2 + .00008 * b3) * u.mirrorB.x - .000008 * scratch * u.mirrorB.y;
}
fn mirrorTunedReflection(r: vec3f, tangent: vec3f, intensity: f32) -> f32 {
 if (u.mirrorA.z == 1. && u.mirrorA.w == 1.) { return mirrorReflection(r, tangent, intensity); }
 let projected = tangent - r * dot(tangent, r);
 let t = projected / max(length(projected), .00001); let b = cross(r, t);
 // Match angular variance at zero directionality (the two kernel axes have different weights).
 let transverse = mix(.15556349186, .009, min(u.mirrorA.w, 1.)) / max(u.mirrorA.w, 1.);
 let stretch = sqrt(max(u.mirrorA.w, 1.));
 let softness = .11 * max(0., u.mirrorA.z * stretch - 1.);
 var total = 0.;
 for (var ix: i32 = -2; ix <= 2; ix++) { for (var iy: i32 = -1; iy <= 1; iy++) {
  let x = f32(ix); let y = f32(iy);
  let ray = normalize(r + t * (x * .11 * u.mirrorA.z * stretch) + b * (y * transverse * u.mirrorA.z));
  let radiance = opticalRoom(dot(ray, vec3f(.997884910,-.011350451,-.064006826)), dot(ray, vec3f(.062139647,.455690748,.887966557)), dot(ray, vec3f(.019088498,-.890065790,.455432235)), intensity, softness);
  total += radiance * mirrorWeight(x) * (2. - abs(y)) / 64.;
 }}
 return total;
}
// Tangential grating equation: kIncident_parallel = kSpecular_parallel + m*lambda/d*g.
// Reconstruct the normal component; non-propagating energy stays in zero order. Wavelengths
// and pitch are in micrometers. The same room, normal, viewer and surface tangent
// supply neutral and colored reflections; there is no UV rainbow overlay.
fn mirrorOrder(r: vec3f, n: vec3f, tangent: vec3f, wavelength: f32, order: f32, intensity: f32, neutral: f32) -> f32 {
 let g = normalize(tangent - n * dot(tangent, n));
 let parallelRay = r - n * dot(r, n) + g * (order * wavelength / (1.2 * u.mirrorA.y));
 let q = dot(parallelRay, parallelRay);
 if (q >= 1.) { return neutral; }
 let ray = parallelRay + n * sqrt(max(0., 1. - q));
 let visibility = smoothstep(0., .08, 1. - q);
 return mix(neutral, mirrorTunedReflection(ray, tangent, intensity), visibility);
}
fn mirrorDiffraction(r: vec3f, n: vec3f, tangent: vec3f, intensity: f32, neutral: f32) -> vec3f {
 let positive = vec3f(mirrorOrder(r,n,tangent,.650,1.,intensity,neutral), mirrorOrder(r,n,tangent,.530,1.,intensity,neutral), mirrorOrder(r,n,tangent,.460,1.,intensity,neutral));
 let negative = vec3f(mirrorOrder(r,n,tangent,.650,-1.,intensity,neutral), mirrorOrder(r,n,tangent,.530,-1.,intensity,neutral), mirrorOrder(r,n,tangent,.460,-1.,intensity,neutral));
 return .5 * (positive + negative);
}

// Continuous surface parameters only. No preset identifier reaches the shader.
fn opticalGrid(x: f32, y: f32) -> vec3f {
 let c = cos(u.opticalC.w); let s = sin(u.opticalC.w);
 let qx = (c * x - s * y) * u.opticalC.z;
 let qy = (s * x + c * y) * u.opticalC.z;
 let cx = floor(qx); let cy = floor(qy);
 let fx = fract(qx); let fy = fract(qy);
 let footprint = clamp(u.opticalC.z / max(u.material.y, 1.), .005, .24);
 let edge = min(min(fx, 1. - fx), min(fy, 1. - fy));
 let fade = smoothstep(0., footprint, edge);
 let a = hash(vec2f(cx, cy)); let b = hash(vec2f(cx + 7.31, cy + 7.31));
 let nx = (a - .5) * .32 * u.opticalC.y * fade;
 let ny = (b - .5) * .32 * u.opticalC.y * fade;
 return vec3f(c * nx + s * ny, -s * nx + c * ny, (a - .5) * .6 * u.opticalC.y);
}
fn opticalCoatingChannel(horizontal: f32, vertical: f32, cellPhase: f32, offset: f32) -> f32 {
 let axis = horizontal * cos(u.opticalC.w) + vertical * sin(u.opticalC.w);
 // Stylized thin-film carrier: shared pitch controls angular color frequency.
 // Density stays active throughout 0..2, rather than clamping a blend at one.
 let phase = axis * (1.2 / u.mirrorA.y) + .15 + cellPhase;
 let color = pow(.5 + .5 * cos(6.28318 * (phase + offset)), 1.35);
 return exp(-2. * u.opticalC.x * (1. - color)) * (1. + .25 * u.opticalC.x);
}
fn opticalCoating(r: vec3f, cellPhase: f32) -> vec3f {
 let horizontal = dot(r, vec3f(.997884910,-.011350451,-.064006826));
 let vertical = dot(r, vec3f(.062139647,.455690748,.887966557));
 let axis = horizontal * cos(u.opticalC.w) + vertical * sin(u.opticalC.w);
 // Artistic thin-film carrier, not a measured multilayer interference solution.
 return vec3f(opticalCoatingChannel(horizontal, vertical, cellPhase, 0.), opticalCoatingChannel(horizontal, vertical, cellPhase, .67), opticalCoatingChannel(horizontal, vertical, cellPhase, .33));
}
fn opticalRadiance(r: vec3f, n: vec3f, tangent: vec3f, cellPhase: f32, intensity: f32) -> vec3f {
 let neutral = .015 + .78 * mirrorTunedReflection(r, tangent, intensity);
 var color = vec3f(neutral);
 if (u.mirrorA.x > 0.) {
  // Transfer zero-order energy rather than piling gray-bearing orders on top.
  let efficiency = u.mirrorA.x / (1. + u.mirrorA.x);
  let diffracted = vec3f(.015) + .78 * mirrorDiffraction(r, n, tangent, intensity, (neutral - .015) / .78);
  color = mix(color, diffracted, efficiency);
 }
 if (u.opticalC.x > 0.) { color *= opticalCoating(r, cellPhase); }
 return color;
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
  // Defects perturb only the sixth material's normal, never its flat macro face.
  if (method > 4.5) {
    if (al < .01) { return vec4f(0.); }
    let rim = mirrorRim(inward);
    var grid = vec3f(0.);
    if (u.opticalC.y > 0.) { grid = opticalGrid(p.x, p.y); }
    let micro = vec2f(mirrorTunedHeight(p.x + .0005, p.y) - mirrorTunedHeight(p.x - .0005, p.y), mirrorTunedHeight(p.x, p.y + .0005) - mirrorTunedHeight(p.x, p.y - .0005)) / .001;
    let n = normalize((u.worldFromDevice * vec4f(normalize(vec3f(gd * rim.y - micro + grid.xy, 1.)), 0.)).xyz);
    let v = normalize((u.worldFromDevice * vec4f(viewDirection(p), 0.)).xyz);
    let r = reflect(-v, n);
    let t = normalize((u.worldFromDevice * vec4f(cos(u.opticalC.w), sin(u.opticalC.w), 0., 0.)).xyz);
    let color = opticalRadiance(r, n, t, grid.z, specularIntensity);
    return vec4f(vec3f(stickerEncode(color.r), stickerEncode(color.g), stickerEncode(color.b)) * al, al);
  }
  // Isolated fifth texture retains preview11's complete color path.
  if (method > 3.5) {
    if (al < .01) { return vec4f(0.); }
    let stickerUv = vec2f(uv.x, 1. - uv.y);
    let stickerInput = 1.;
    let sn = normalize((u.worldFromDevice * vec4f(normalize(vec3f(gd * rim.y, 1.)), 0.)).xyz);
    let sv = normalize((u.worldFromDevice * vec4f(viewDirection(p), 0.)).xyz);
    let sr = reflect(-sv, sn);
    let opticalX = stickerMotion(dot(sr, vec3f(.997884910, -.011350451, -.064006826)));
    let opticalY = stickerMotion(dot(sr, vec3f(.062139647, .455690748, .887966557)));
    let stickerBase = vec3f(stickerChannel(0., stickerUv.x, stickerUv.y, opticalX, opticalY, material.x, material.y, stickerInput),
                             stickerChannel(1., stickerUv.x, stickerUv.y, opticalX, opticalY, material.x, material.y, stickerInput),
                             stickerChannel(2., stickerUv.x, stickerUv.y, opticalX, opticalY, material.x, material.y, stickerInput));
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
  mirrorOptions?: () => Partial<MirrorOptions>;
  opticalOptions?: () => Partial<OpticalOptions>;
  error: (message: string) => void;
};

// A private structural subset avoids adding global WebGPU declarations to a
// package which also supports TypeScript projects with older DOM libraries.
type GpuBuffer = { destroy(): void };
type GpuModule = { getCompilationInfo(): Promise<{ messages: { type: string; message: string }[] }> };
type GpuPipeline = { getBindGroupLayout(index: number): unknown };
type GpuPass = { setPipeline(pipeline: GpuPipeline): void; setBindGroup(index: number, group: unknown): void; draw(count: number): void; end(): void };
type GpuEncoder = { beginRenderPass(descriptor: unknown): GpuPass; finish(): unknown };
type GpuLoss = { reason: string; message?: string };
type GpuDevice = {
  pushErrorScope(filter: string): void;
  popErrorScope(): Promise<{ message: string } | null>;
  createShaderModule(descriptor: { code: string }): GpuModule;
  createRenderPipelineAsync(descriptor: unknown): Promise<GpuPipeline>;
  createBuffer(descriptor: { size: number; usage: number }): GpuBuffer;
  createBindGroup(descriptor: unknown): unknown;
  createCommandEncoder(): GpuEncoder;
  queue: { writeBuffer(buffer: GpuBuffer, offset: number, data: Float32Array): void; submit(commands: unknown[]): void };
  lost: Promise<GpuLoss>;
};
type GpuContext = {
  configure(descriptor: unknown): void;
  getConfiguration?(): { format?: string; toneMapping?: { mode?: string }; alphaMode?: string } | null;
  getCurrentTexture(): { createView(): unknown };
  unconfigure(): void;
};
type GpuNavigator = { gpu?: { requestAdapter(): Promise<{ requestDevice(): Promise<GpuDevice> } | null> } };

type SharedGpuDevice = { device: GpuDevice; listeners: Set<(info: GpuLoss) => void>; loss?: GpuLoss };
let sharedDevice: Promise<SharedGpuDevice> | undefined;
function getDevice(): Promise<SharedGpuDevice> {
  if (!sharedDevice) {
    const pending = (async () => {
      const gpu = (navigator as unknown as GpuNavigator).gpu;
      if (!gpu) throw new Error("WebGPU unavailable");
      const adapter = await gpu.requestAdapter();
      if (!adapter) throw new Error("WebGPU adapter unavailable");
      const device = await adapter.requestDevice();
      const shared: SharedGpuDevice = { device, listeners: new Set() };
      // Keep only one promise callback per device. A renderer removes its
      // listener on stop, so a long-lived device cannot retain old canvases.
      void device.lost.then(info => {
        shared.loss = info;
        if (sharedDevice === pending) sharedDevice = undefined;
        const listeners = [...shared.listeners];
        shared.listeners.clear();
        for (const listener of listeners) {
          try { listener(info); } catch { /* One fallback must not block others. */ }
        }
      });
      return shared;
    })();
    sharedDevice = pending;
    void pending.catch(() => { if (sharedDevice === pending) sharedDevice = undefined; });
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
  const shared = await getDevice();
  const { device } = shared;
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
    shared.listeners.delete(onLost);
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
  const onLost = (info: GpuLoss) => fail(`WebGPU device lost: ${info.message || info.reason}`);
  shared.listeners.add(onLost);
  try {
    if (shared.loss) { onLost(shared.loss); throw new Error(failureMessage); }
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
    // mat4 (64 bytes), material/settings (32), three optical option vec4s (48).
    // WebGPU's normative usage bits: UNIFORM=0x40, COPY_DST=0x08.
    buffer = device.createBuffer({ size: 144, usage: 0x40 | 0x08 });
    const group = device.createBindGroup({ layout: pipeline.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer } }] });
    const validation = await device.popErrorScope();
    scopeOpen = false;
    if (validation) throw new Error(validation.message);
    if (stopped) throw new Error(failureMessage);
    const values = new Float32Array(36);
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
          if (options.method >= 4) values.set([Math.max(rect.width, 1), Math.max(rect.height, 1), 0, 0], 16);
          const m = options.matrix(now);
          values.set([m[0], m[1], m[2], 0, m[3], m[4], m[5], 0, m[6], m[7], m[8], 0, 0, 0, 0, 1]);
          const intensity = options.specular();
          values.set([width, height, options.method, Number.isFinite(intensity) ? Math.max(0, intensity) : 0], 20);
          const mirror = normalizeOpticalOptions({ ...options.mirrorOptions?.(), ...options.opticalOptions?.() });
          values.set([mirror.diffraction, mirror.rainbowSpacing, mirror.reflectionBlur, mirror.directionality,
            mirror.bubbles, mirror.scratches, mirror.ridgeWidth, mirror.ridgeHeight,
            mirror.iridescence, mirror.facetStrength, mirror.facetScale, mirror.gratingAngle * Math.PI / 180], 24);
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
