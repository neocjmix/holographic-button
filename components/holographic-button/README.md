# @neocjmix/holographic-button

A world-lit holographic React button with WebGL fallback and HDR on supported displays. Its reflective surface responds to device attitude on mobile and pointer movement on desktop while the lights remain fixed in world space.

[Live demo](https://neocjmix.github.io/holographic-button/) · [Source](https://github.com/neocjmix/holographic-button) · MIT

Implementation and documentation were developed with AI assistance under human visual direction. Test rendering, accessibility and performance on the browsers and devices you support; automated checks do not replace a full security or accessibility audit.

## Features

- Satin Mirror, Card Foil, Grid Prism and Smooth Prism: four numeric presets of one configurable optical shader.
- Compatible original material variants and reference-derived Sticker Foil.
- Extended-range WebGPU rendering on supported HDR displays, with WebGL 1 fallback.
- World-fixed specular lighting and a smoothly raised inset reflective rim.
- Device orientation, motion fallback, screen rotation correction, and pointer fallback.
- A real `<button>` with native events, form props, accessibility attributes, and DOM refs.
- One shared motion hook can drive any number of buttons.
- No runtime dependency beyond React. WebGL 1 compatible.

## Install

```bash
npm install @neocjmix/holographic-button
```

## Quick start

```tsx
"use client";

import {
  HolographicButton,
  DEFAULT_OPTICAL_OPTIONS,
  useHolographicMotion,
} from "@neocjmix/holographic-button";
import "@neocjmix/holographic-button/styles.css";

export function CTA() {
  const motion = useHolographicMotion({
    requestOnFirstInteraction: true,
  });

  return (
    <HolographicButton
      motion={motion}
      variant="satin-mirror"
      opticalOptions={DEFAULT_OPTICAL_OPTIONS}
      width="min(100%, 560px)"
      height={148}
      specular={5}
      onClick={() => alert("Activated")}
    >
      ACTIVATE
    </HolographicButton>
  );
}
```

This explicitly selects the same neutral Satin Mirror preset and strength as the demo. For compatibility, the component defaults remain `variant="spectral-film"` and `specular={1}` when omitted.

In Next.js App Router, render the hook and button from a Client Component. Import the stylesheet once from that component or your global stylesheet entry.

## API

### `useHolographicMotion(options?)`

Creates the shared attitude matrix. Use one hook per visual group and pass the returned `motion` object to every button.

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `pointerFallback` | `boolean` | `true` | Uses pointer position when a live sensor signal is unavailable. |
| `requestOnFirstInteraction` | `boolean` | `false` | Resumes existing iOS permission on entry or requests it on the first tap. |
| `telemetry` | `boolean` | `false` | Enables reactive diagnostic updates. Leave off to avoid monitoring re-renders. |

The returned object includes `telemetry` when reactive diagnostics are enabled. The library itself renders no HUD.

### `<HolographicButton>`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `motion` | `HolographicMotion` | required | Shared motion object returned by the hook. |
| `variant` | `HolographicVariant` | `spectral-film` | Optical surface model. |
| `children` | `ReactNode` | `ACTIVATE` | Main button content. |
| `width` | `CSSProperties["width"]` | CSS default | Convenience width override. |
| `height` | `CSSProperties["height"]` | CSS default | Convenience height override. |
| `specular` | `number \| boolean` | `1` | Highlight strength: 0 off, 1 original, above 1 stronger. |
| `opticalOptions` | `Partial<OpticalOptions>` | Satin Mirror defaults | Live unified optics on `satin-mirror`; other variants ignore it. |
| `mirrorOptions` | `Partial<MirrorOptions>` | mirror defaults | Legacy nine-field tuning alias; `opticalOptions` wins when both set the same field. |

Every native button prop is forwarded: `onClick`, all other `on*` handlers, `disabled`, `type`, `name`, `value`, `form`, `aria-*`, `data-*`, `className`, `style`, and `ref`. The default `type` is `button` to avoid accidental form submission. Plain text inherits the default black label treatment; `children` remains a `ReactNode`, so styled JSX, icons, and custom label structures can provide their own colors.

The broad, neutral metal specular preset is part of the material design rather than a public collection of tuning knobs. For the original four materials, `specular={false}` removes the direct environment-light lobes and rim glints while retaining the holographic base material. Sticker Foil instead settles to its neutral substrate when reflected intensity is zero. The highlight uses the same perturbed normal as each optical material, including prism facets, microtexture, and the smooth inset rim. The macro face and outermost edge are flat; the prior glass-like top-coat highlight has been replaced by a broad metal response. The numeric strength is uploaded on the existing animation loop, so moving the slider does not recreate the renderer. Boolean true/false remain compatible with 1/0. Negative strengths clamp to zero; non-finite values use 1.

The internal preset is informed by common PBR material concepts but uses a compact custom WebGL 1 approximation rather than claiming glTF conformance.

Variants: `spectral-film`, `brushed-foil`, `thin-film`, `facet-chrome`, `sticker-foil`, and `satin-mirror`.

Sticker Foil treats its reference-derived rainbow field and enlarged diamond pattern as colored reflected light. Its color and brightness respond to a common light/view configuration; it no longer overlays a separate silver-white state. The demo starts with Satin Mirror at strength 5 and offers a 0–10 strength control. The component API default remains 1. HDR output depends on display headroom and is not a calibrated luminance multiple.

## Motion permission

Most browsers expose device attitude immediately on HTTPS. iOS Safari requires a user gesture before it can show a new permission prompt. Set `requestOnFirstInteraction: true` only when that behavior is appropriate for your experience; the default is `false` to avoid an unexpected permission prompt. The demo opts in: an existing decision is restored on entry, while a new prompt appears on the first tap without a separate enable button. If Safari rejects a request because the gesture was not eligible, the hook remains ready to retry on the next tap. Until sensor events arrive, pointer movement drives the same world-space reflection model. Sensor values remain in memory and are not transmitted or persisted by the library.

## Accessibility and fallbacks

- Keyboard activation, focus, disabled state, form behavior, and ARIA come from the native button.
- The canvas is decorative; visible content remains DOM text.
- If WebGL is unavailable, the button keeps its native interaction and displays a fallback surface.
- `prefers-reduced-motion` removes CSS transitions. Sensor-driven material response remains direct input feedback.

## Styling

Use `width`, `height`, `className`, and `style` for layout. The silhouette is intentionally a pill: arbitrary `border-radius` is not exposed because the WebGL signed-distance field, reflective rim, and DOM clipping must describe the same geometry.

## Browser support

Modern browsers with WebGL 1 and React 18.2 or newer. Device orientation requires HTTPS and may be limited by browser or embedded-webview policy.

## Releasing

The `Publish Holographic Button` GitHub Actions workflow runs when a SemVer tag matching `v*.*.*` is pushed. The tag must match this package's version and point to a commit contained in `main`. The workflow installs locked dependencies, runs the complete repository checks, publishes with npm Trusted Publishing and provenance, and creates a GitHub Release if one does not already exist.

Prepare releases from the repository root: update the package version, repository version, workspace dependency and both lockfiles together; update the changelog; run `npm ci` and `npm run check`; commit the verified changes and land them on `main`. Then create and push `v<package-version>` at that exact commit. Do not tag an unverified or unmerged commit. Check the workflow and npm before announcing the release.

Re-running an existing tag skips versions already on npm and GitHub Releases already present. npm Trusted Publishing is configured for owner `neocjmix`, repository `holographic-button`, and workflow filename `publish-holographic-button.yml`; publication uses short-lived OIDC credentials without a long-lived npm token in GitHub.

## Credits

Visual direction inspired by [Lucia Scarlet’s holographic controls](https://x.com/luciascarlet/status/1930614317541474598). Project and visual direction by ChanJin Park, with AI-assisted shader, interaction and React implementation. The retained Sticker Foil adaptation includes [bpisano/Sticker MIT attribution](./THIRD_PARTY_NOTICES.md).

## License

[MIT](./LICENSE) © 2026 ChanJin Park

### Satin Mirror

Use `variant="satin-mirror"` for a neutral mirror with an original procedural room environment, anisotropic reflection blur, and subtle surface-attached bubbles and scratches. It shares the rounded inset rim and adaptive light recovery with Sticker Foil. Its HDR response extends the same reflected environment; no external texture fetch is required.

### Unified optical presets

Use `variant="satin-mirror"` and `opticalOptions`. Every preset uses the same shader, normal, procedural room, rounded ridge and recovery state; preset names are never passed to the GPU. The four added parameters are coating density (`iridescence`), attached-cell micro-normal/phase strength (`facetStrength`), cells per face height (`facetScale`), and shared grating/grid/blur orientation (`gratingAngle`, degrees).

```tsx
import {HolographicButton, OPTICAL_PRESETS} from "@neocjmix/holographic-button";

const foil = OPTICAL_PRESETS.find(preset => preset.id === "card-foil")!;
<HolographicButton
  motion={motion}
  variant="satin-mirror"
  opticalOptions={foil.options}
  specular={foil.specular}
>ACTIVATE</HolographicButton>;
```

`DEFAULT_OPTICAL_OPTIONS`, `OPTICAL_OPTION_LIMITS`, `OPTICAL_PRESETS`, `OPTICAL_CONTROLS`, `normalizeOpticalOptions`, and their types are exported. Presets are immutable complete starting values; copy and edit them freely. Controls use refs and uniform updates without replacing GPU resources or restarting recovery. Omitted, non-number and non-finite fields use defaults; finite values clamp to the exported bounds.

`MirrorOptions`, `DEFAULT_MIRROR_OPTIONS`, `MIRROR_OPTION_LIMITS` and the original variant names remain compatible. Legacy `mirrorOptions` keeps its original nine-field shape and accepts the newly expanded ranges. It is merged before `opticalOptions`; the latter takes precedence per field. The package default variant remains `spectral-film`; the demo explicitly selects `satin-mirror`.

This is a stylized reflective material, not measured card-foil optics or a transmitting glass model. Thin-film-like color modulates the same reflected room radiance; wavelength/order diffraction reuses that room. No artwork, card texture, or external asset is fetched. Color coating and diffraction share `rainbowSpacing`: smaller values increase angular coating cycles, while propagating diffraction orders follow wavelength/pitch geometry. At sufficiently small pitch, non-propagating order energy remains in the neutral reflection. The grating angle also rotates anisotropic blur and the attached cell grid.

The unchanged default has zero diffraction, zero coating and zero facets. Its original room, blur, defects and rounded ridge helpers are retained. SDR uses an RGB-wide shoulder, equal to the original scalar curve for gray; HDR encodes the same linear RGB directly. Both paths keep geometric premultiplied alpha. See the [range table and verification limits](./OPTICAL_TUNING.md#optical-ranges) before relying on extreme settings or mobile performance.
