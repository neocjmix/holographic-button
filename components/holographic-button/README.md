# Holographic Button

WebGL React CTA with four optical models, world-fixed lighting, pointer fallback, and device-attitude input.

```tsx
import { HolographicButton, useHolographicMotion } from "./components/holographic-button";

export function CTA() {
  const motion = useHolographicMotion();
  return (
    <HolographicButton
      motion={motion}
      variant="spectral-film"
      width="min(100%, 560px)"
      height={148}
      eyebrow="BROAD SWEEP"
      badge="01"
      disabled={false}
      onClick={() => alert("Activated")}
    >
      ACTIVATE
    </HolographicButton>
  );
}
```

Variants: `spectral-film`, `brushed-foil`, `thin-film`, and `facet-chrome`.

`HolographicButtonProps` includes React's native button props, so `onClick`, all `on*` handlers, `disabled`, `type`, `name`, `value`, `form`, `aria-*`, `data-*`, `className`, `style`, and `ref` work on the real `<button>` element. `width` and `height` are convenience layout props and accept CSS values or numbers.

The silhouette is intentionally a pill. Arbitrary `border-radius` is not exposed because the WebGL signed-distance field, reflective rim, and DOM clipping must describe the same geometry.

The hook automatically uses pointer movement on desktop. On iOS, the first user interaction requests motion permission because Safari requires transient user activation.
