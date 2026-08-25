# @neocjmix/holographic-button

A physically directed holographic WebGL button for React. Its reflective surface responds to device attitude on mobile and pointer movement on desktop while the lights remain fixed in world space.

[Live demo](https://neocjmix.github.io/holographic-cta-lab/) · [Source](https://github.com/neocjmix/neocjmix.github.io/tree/master/holographic-cta-lab/react) · MIT

> [!WARNING]
> This implementation and its documentation were generated entirely by AI and have not received human code review. Treat v0.x as experimental, inspect the source, and perform your own security and accessibility review before production use.

## Features

- Four distinct optical models rather than one shader with color presets.
- World-fixed specular lighting and a recessed-to-raised reflective rim.
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
      specular={true}
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
| `specular` | `boolean` | `true` | Enables the fixed, tuned surface highlight. |

Every native button prop is forwarded: `onClick`, all other `on*` handlers, `disabled`, `type`, `name`, `value`, `form`, `aria-*`, `data-*`, `className`, `style`, and `ref`. The default `type` is `button` to avoid accidental form submission. Plain text inherits the default black label treatment; `children` remains a `ReactNode`, so styled JSX, icons, and custom label structures can provide their own colors.

The specular preset is part of the material design rather than a public collection of tuning knobs. Set `specular={false}` to remove its direct environment-light lobes and rim glints while retaining the holographic base material. The highlight uses the same perturbed normal as each optical material, including prism facets, microtexture, and rim bump; it is not rendered as a separate top coat. The boolean is uploaded on the existing animation loop, so toggling it does not recreate the WebGL program.

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

## Credits

Visual direction inspired by [Lucia Scarlet’s holographic controls](https://x.com/luciascarlet/status/1930614317541474598). Shader, interaction model, and React implementation by ChanJin Park.

## License

[MIT](./LICENSE) © 2026 ChanJin Park
