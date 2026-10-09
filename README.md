# Holographic Button

A world-lit holographic React button with live optical controls and HDR on supported displays. Device attitude and pointer movement move one reflective surface beneath world-fixed lighting.

[Live demo](https://neocjmix.github.io/holographic-button/) · [npm](https://www.npmjs.com/package/@neocjmix/holographic-button) · [Package documentation](./components/holographic-button/README.md) · MIT

Version 1.0.0 includes Satin Mirror, Card Foil, Grid Prism and Smooth Prism as numeric presets of one configurable shader. The original material variants remain supported.

## Install

```bash
npm install @neocjmix/holographic-button
```

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
      specular={5}
    >
      ACTIVATE
    </HolographicButton>
  );
}
```

This matches the demo's neutral starting point. For compatibility, omitting `variant` still selects `spectral-film` and omitting `specular` still uses `1`.

## Repository layout

- `components/holographic-button` — the published React package, optical regression tests and frozen reference fixtures
- `app` — interactive documentation, tuning controls, styles and HTML template
- `github-pages` — static entry point and generated demo, including MIT notices
- `tests` — demo, build and release-metadata checks
- `.github/workflows` — verified npm release and Pages deployment workflows

## Development

Requires Node.js 22.13 or newer for the repository tooling.

```bash
npm ci
npm run check
```

`check` runs all tests, package and demo typechecks, both builds, and a package-content dry run. `npm run build:pages` creates content-hashed demo assets and removes stale bundles. The [optical tuning guide](./components/holographic-button/OPTICAL_TUNING.md) documents ranges, performance tradeoffs and verification limits.

## Attribution and verification

Implementation and documentation were developed with AI assistance under human visual direction. Automated checks do not establish physical HDR display quality, mobile frame rate or a full security/accessibility audit; test on the browsers and devices you support.

## License

[MIT](./components/holographic-button/LICENSE) © 2026 ChanJin Park. The retained Sticker Foil implementation includes [third-party MIT attribution](./components/holographic-button/THIRD_PARTY_NOTICES.md).
