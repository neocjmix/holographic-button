> New in preview.6: `variant="sticker-foil"` adds a bright, spatial pastel foil preset. The four existing variants are preserved. See THIRD_PARTY_NOTICES.md for the MIT reference attribution.

> v1.0.0-preview.6: isolated HDR preview, not published to npm. Original textures and behavior are preserved. This iteration flattens the macro face and outer edge, rounds the inset ridge and broadens the tin-like reflection without moving the lights; supported HDR displays use WebGPU extended-range presentation, otherwise the original WebGL renderer remains active.

# @neocjmix/holographic-button

A physically directed holographic WebGL button for React. Its reflective surface responds to device attitude on mobile and pointer movement on desktop while the lights remain fixed in world space.

[Live demo](https://neocjmix.github.io/holographic-button/) · [Source](https://github.com/neocjmix/holographic-button) · MIT

> [!WARNING]
> This implementation and its documentation were generated entirely by AI and have not received human code review. Treat v0.x as experimental, inspect the source, and perform your own security and accessibility review before production use.

## Features

- Four distinct optical models rather than one shader with color presets.
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
      variant="spectral-film"
      width="min(100%, 560px)"
      height={148}
      specular={1}
      onClick={() => alert("Activated")}
    >
      ACTIVATE
    </HolographicButton>
  );
}
```

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

Every native button prop is forwarded: `onClick`, all other `on*` handlers, `disabled`, `type`, `name`, `value`, `form`, `aria-*`, `data-*`, `className`, `style`, and `ref`. The default `type` is `button` to avoid accidental form submission. Plain text inherits the default black label treatment; `children` remains a `ReactNode`, so styled JSX, icons, and custom label structures can provide their own colors.

The broad, neutral metal specular preset is part of the material design rather than a public collection of tuning knobs. Set `specular={false}` to remove its direct environment-light lobes and rim glints while retaining the holographic base material. The highlight uses the same perturbed normal as each optical material, including prism facets, microtexture, and the smooth inset rim. The macro face and outermost edge are flat; the prior glass-like top-coat highlight has been replaced by a broad metal response. The numeric strength is uploaded on the existing animation loop, so moving the slider does not recreate the renderer. Boolean true/false remain compatible with 1/0. Negative strengths clamp to zero; non-finite values use 1.

The internal preset is informed by common PBR material concepts but uses a compact custom WebGL 1 approximation rather than claiming glTF conformance.

Variants: `spectral-film`, `brushed-foil`, `thin-film`, and `facet-chrome`.

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

The `Publish Holographic Button` GitHub Actions workflow runs when a SemVer tag matching `v*.*.*` is pushed. It requires the tag version to match `package.json`, verifies that the tagged commit belongs to `main`, installs locked dependencies, typechecks, builds, inspects the package tarball, publishes to npm, and then creates a GitHub Release with generated notes.

For a normal release, run from this package directory with a clean worktree:

```bash
npm version patch # or: minor / major
git push origin main --follow-tags
```

Do not create the GitHub Release manually; the workflow creates it only after npm publication succeeds. Re-running a tag whose npm version or GitHub Release already exists is safe because those operations are skipped.

Configure npm Trusted Publishing for GitHub Actions with owner `neocjmix`, repository `holographic-button`, and workflow filename `publish-holographic-button.yml`. Releases use short-lived OIDC credentials and automatic provenance; no long-lived npm token is stored in GitHub.

## Credits

Visual direction inspired by [Lucia Scarlet’s holographic controls](https://x.com/luciascarlet/status/1930614317541474598). Shader, interaction model, and React implementation by ChanJin Park.

## License

[MIT](./LICENSE) © 2026 ChanJin Park
