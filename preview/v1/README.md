# v1 HDR preview

Version **1.0.0-preview.8** applies the next visual feedback after preview.7: larger Sticker Foil texture, more metal gloss, accessible highlight angle, slightly wider/softer reflection, a thinner stamped rim and a stronger HDR control range.

## Sticker Foil

The reference-derived broad pastel color field is retained: normalized top-left phase at scale 3, white source, contrast .9, amplitude .25, brightness-weighted intensity .8. The checker changes from effective scale 25 to **12.5**, doubling its linear size. This is now an intentional deviation from [bpisano/Sticker](https://github.com/bpisano/Sticker/tree/301b9e0fb802c01edb2ed25695b3ba62e9c61da3), approved to avoid the fine fabric-like appearance.

A separate world-lit metallic gloss is added without replacing the foil color field. The numeric specular control now affects this gloss in SDR as well as HDR. Reference equations and deliberate material adaptations are tested separately; visual changes are not described as exact upstream parity.

## Shared highlight and rim

The specular light is calibrated toward a nominal portrait pitch around 62 degrees instead of 42 degrees, with a modestly wider and softer lobe. This is a deterministic design pose, not a measurement of the user's posture. Existing color-incidence formulas retain their original light so the adjustment does not unintentionally retune Thin Film and the other palettes. Fixed world-space lighting still depends on device heading.

The white environment highlight is aligned with the revised specular direction. Its radiance is reduced to avoid washing out the now-aligned face at the default setting. Ambient colors and existing material texture formulas remain intact. The macro face and outermost edge remain flat, with a shallow smooth inset crimp. Static white bevel overlays and heavy dark extrusion are removed so shader illumination supplies the moving rim glint.

## Strength and validation limits

The demo slider spans **0–10**, default 1. Stronger settings increase highlight headroom, rather than uniformly lifting the entire background. The existing materials’ linear highlight shoulder grows from 3 at default to 7.5 at strength 10; foil intensity uses 11i/(10+i), giving 5.5 at 10 instead of saturating near 2. The value is an artistic intensity control, not a claim of calibrated nits or a physical brightness multiplier.

The original motion hook, native button behavior, label and unrelated demo styling remain preserved. WebGL edge RGB now correctly follows the canvas premultiplied-alpha contract, removing a latent bright fringe exposed by the transparent rim styling; fully covered interior colors are unchanged. CPU analytical comparisons, shader tests and compilation checks are not physical HDR display validation; the cloud browser has no GPU.

## Publication

MIT reference attribution remains included. No GPL code/assets were copied. Both repositories are public, but package publication guards remain enabled. No npm release, main merge, tag or replacement of the original demo is authorized.
