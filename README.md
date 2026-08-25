# Holographic Button

A world-lit holographic WebGL button for React. Its material responds to device attitude on mobile and pointer movement on desktop while the lights remain fixed in world space.

[Live demo](https://neocjmix.github.io/holographic-button/) · [npm](https://www.npmjs.com/package/@neocjmix/holographic-button) · [Package documentation](./components/holographic-button/README.md) · MIT

> [!WARNING]
> This implementation and its documentation were generated entirely by AI and have not received human code review. Treat v0.x as experimental and audit it before production use.

## Install

```bash
npm install @neocjmix/holographic-button
```

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
    <HolographicButton motion={motion} variant="spectral-film">
      ACTIVATE
    </HolographicButton>
  );
}
```

## Repository layout

- `components/holographic-button` — the published React package
- `app` — source for the interactive documentation site
- `github-pages` — static GitHub Pages entry and generated assets
- `.github/workflows` — npm release and Pages deployment workflows

## Development

Requires Node.js 22.13 or newer for the repository tooling.

```bash
npm ci
npm run build
```

Useful checks:

```bash
npm run build:package
npm run pack:check
npm run typecheck
```

## License

[MIT](./components/holographic-button/LICENSE) © 2026 ChanJin Park
