# v1 HDR preview

Version **1.0.0-preview.7** corrects the fifth `sticker-foil` preset against [bpisano/Sticker at 301b9e0](https://github.com/bpisano/Sticker/tree/301b9e0fb802c01edb2ed25695b3ba62e9c61da3). Preview.6 was visually rejected: it changed the reference's phase density, defaults and compositing order, producing repeated color patches and an unrelated white glare.

## Reference fidelity

- Top-left normalized coordinates; color scale 3, without an aspect multiplier on color phase
- White source, contrast .9, sinusoidal amplitude .25 and brightness-weighted intensity .8
- Surface-fixed diamond checker using the source's effective 5 × 5 scale, contrast 1.2
- Source noise scale 100 and contrast 1.2; gradient jitter evaluated in view-point coordinates
- Reference reflection precedes the foil. On a white base it does not change RGB, so the preview no longer adds a separate white light on top
- Unclipped source foil values are retained for HDR rather than clamping them and inventing a whitening bloom

## Cross-framework adaptations

The existing device-attitude matrix is mapped to softened rotation/normalized motion. It is not SwiftUI's own motion runtime. Canvas coverage alpha remains valid and premultiplied; the source's contrast operations on alpha are not reproduced. The existing capsule, inset rim styling, DOM label and four earlier materials are retained, rather than copying the sample sticker artwork.

At numeric specular 1, HDR retains the reference's over-white foil values. The control scales only this excess for Sticker Foil; its white-base SDR color stays the same. The other four variants retain their existing specular behavior.

All five presets remain together in the original demo; the playground starts on Sticker Foil. Reference equations are checked against an independent source-derived analytical oracle, in addition to GLSL/WGSL parity and preservation tests. These are not GPU or physical HDR display tests: the cloud browser has no GPU, and iPhone display appearance still needs human review.

## Scope and publication

MIT reference attribution is included in the package and isolated preview. Pokémon CSS was visual research only; no GPL code or assets were copied. This is an artistic foil effect, not a full diffraction simulation.

Package manifests retain `private: true` and publication guards. Both repositories are public. This preview does not authorize an npm release, a main merge, or replacing the original demo.
