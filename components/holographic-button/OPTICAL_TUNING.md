# Optical presets and tuning

Version **1.0.0** uses one configurable optical shader throughout the demo. The hero, live result and preset gallery all render `variant="satin-mirror"` with numeric `opticalOptions`. The separate legacy material variants remain supported by the package, but are not shader choices in this demo.

## Presets and live controls

`OPTICAL_PRESETS` supplies complete `{id, label, note, options, specular}` starting points. Choosing one loads all its optical values and highlight strength. Every optical control stays available for every preset. Contextual hints explain when a control needs another effect enabled to become visible, without disabling that control. Changing an optical value or specular strength marks the result **Custom / 수정됨** and clears the preset's selected indicator; returning to its exact values restores that indicator.

- **선택 프리셋 복원** restores the selected preset's full option set and strength
- **Satin Mirror로 돌아가기** always restores `DEFAULT_OPTICAL_OPTIONS` and specular strength 5 in one click
- Label, width, height and disabled state are independent of optical presets and resets
- The hero retains the neutral Satin Mirror baseline; the gallery uses fixed, independent preset exemplars
- The generated React example includes the exact current `opticalOptions`, specular strength, label and layout values

The exported `OPTICAL_CONTROLS` metadata is the single source for slider keys, limits, increments, units, labels, hints and grouping. Controls are grouped into surface/reflection, pattern/microstructure, and light/motion. Wide positive ranges marked `scale: "log"` use a normalized 0–1 slider with step .001 and an exponential mapping. Zero-inclusive wide ranges marked `scale: "power"` use the same normalized slider and a cubic mapping: `value = min + (max - min) × position³`. This keeps low-amplitude defects near the baseline easy to tune without losing the high end. Visible values and accessible value text show the actual optical values, not that normalized position. Linear controls use their exported min/max/step directly. `normalizeOpticalOptions` clamps edits to supported limits.

The numeric specular/HDR strength slider remains separate and initially 5. Updating a preset or slider does not key/remount the live button. GPU uniform updates and resource lifetime are managed by the component.

On small screens the result precedes the controls and remains sticky while adjusting them. Touch-friendly controls, Korean hints and custom-state feedback are included in the official demo. On mobile the result sticks flush to the top of the viewport.

## Optical ranges

| Option | Default | Range | Interpretation |
|---|---:|---:|---|
| diffraction | 0 | 0–8 | Bounded energy transfer `amount / (1 + amount)` |
| rainbowSpacing | 1 | .25–8 | Relative grating pitch and shared angular coating scale; logarithmic |
| reflectionBlur | 1 | 0–4 | Reflected environment blur; broad filters also soften source edges |
| directionality | 1 | 0–4 | Isotropic at zero; increasing values stretch the surface-aligned filter |
| bubbles | 1 | 0–100 | Localized original bubble height; cubic UI for control near 1 |
| scratches | 1 | 0–100 | Localized original scratch depth; cubic UI for control near 1 |
| ridgeWidth | 1 | .15–3.25 | Relative bead width, always leaving a flat central area; logarithmic |
| ridgeHeight | 1 | 0–6 | Relative bead height; narrow/high extremes deliberately dramatic |
| recoverySeconds | 2.5 | .1–30s | Light recovery time constant; logarithmic, direct device input stays immediate |
| iridescence | 0 | 0–2 | Coating optical density: every value changes spectral contrast |
| facetStrength | 0 | 0–1 | Attached-cell micro-normal and color-phase variation |
| facetScale | 12 | 2–48 | Cells per face height, independent of aspect ratio; logarithmic |
| gratingAngle | 0° | −90–90° | Rotates diffraction, anisotropic reflection and square/diamond grid |

The four presets are starting points, not exact reproductions of a commercial card or of the old shaders. Card Foil has a pastel diagonal microstructure; Grid Prism has stronger square facets; Smooth Prism removes the facets for a coherent rainbow. Changing any setting uses the same shader path.

Diffraction follows wavelength/pitch geometry; very small pitch may not produce visible propagating orders at the current angle. Their unavailable energy stays in the zero-order reflection rather than making the button black. The same spacing controls the stylized coating's angular frequency, so the coating can remain colorful there. The coating is not a calibrated multilayer or measured physical material.

The default still evaluates 15 room samples per pixel. Enabled diffraction can evaluate up to 105; coating/facets do not add extra room samples. Presets with diffraction therefore cost more than the neutral baseline, including fixed gallery examples. No mobile frame-rate claim is made.

From the source repository root, run `node scripts/render-optical-contact-sheet.mjs /tmp/optical-presets` to produce a reproducible CPU contact sheet (PPM) and metrics JSON. Rows are presets; columns are recovered, two nearby, and initial poses. Source scalar helpers plus explicit double-precision vector math support the analysis, without simulating GPU rasterization, device precision or HDR presentation.

## Compatibility and verification

`opticalOptions` is the current API for this configurable shader. Earlier `mirrorOptions` and the original material variant names remain supported for compatibility; they are not removed or silently relabeled as the new numeric presets. The package API default is documented separately from the demo's Satin Mirror starting state.

The default optical values retain the accepted neutral Satin Mirror baseline, with diffraction disabled. Preset appearance and opt-in effects should be checked on physical devices. CPU tests, shader compilation and server-rendered control checks do not establish physical GPU/HDR display quality or mobile frame rate.

MIT attribution for bpisano/Sticker remains included in [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md) for the legacy implementation.
