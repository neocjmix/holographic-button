# v1 HDR preview

Version **1.0.0-preview.10** refines the broad silver reflection after preview.9. The accepted diffraction colors, diamond pattern, grain, shallow inset rim, aurora sensitivity and strength-5 preview remain.

## Optical diagnosis

The previous softbox had a broad flat plateau, followed by an encoded-RGB crossfade toward fixed gray. At strength 5 the full-coverage blend reached about 94%. The geometry was reflection-directed, but the material response could resemble a color replacement rather than changing reflected illumination. Adding bloom alone would not repair that cue.

A neutral specular reflection is compatible with diffraction: in the specular direction multiple wavelengths can contribute together. The next step is improving the reflection response, not replacing the accepted colorful field with a full spectral simulation.

## Bounded changes

- Narrow the inner angular plateau slightly while retaining broad, soft outer shoulders
- Move the reflected source toward screen-right at the reference portrait pose
- Evaluate the new neutral reflected contribution in linear light, then encode for presentation
- Preserve source luminance when neutralizing bright HDR color, so this stylized highlight does not make existing bright patches darker. This is an artistic continuity rule, not a universal law of diffraction; individual colored diffraction orders can physically be brighter than another reflection direction.
- Give the accepted checker/grain a very subtle influence on reflection softness and add gentle illumination variation within the bright region
- Keep source aurora exact outside the reflection; no glow, new decorative texture or original-four-material changes

This remains an artistic, inexpensive area-environment approximation, not a complete conductor BRDF or area-light integral. A small analytic light is not evidence of a physically measured emitter. The world-fixed highlight remains heading-dependent; the separate aurora is heading-independent.

## References

- [Stam / GPU Gems: Simulating Diffraction](https://developer.nvidia.com/gpugems/gpugems/part-i-natural-effects/chapter-8-simulating-diffraction)
- [PBRT: Conductor BRDF](https://www.pbr-book.org/4ed/Reflection_Models/Conductor_BRDF)
- [Filament: physically based rendering and linear lighting](https://google.github.io/filament/Filament.html)
- [Heitz et al.: polygonal lights with LTC](https://eheitzresearch.wordpress.com/415-2/) and [authors' WebGL demo](https://blog.selfshadow.com/sandbox/ltc.html)

These inform the approximation; no reference shader code or assets were copied for this revision.

## Validation and publication

CPU analytical comparisons and shader compilation cannot verify physical HDR appearance. The cloud browser has no GPU. Real output depends on the user's browser/display headroom. The demo starts at 5 with its existing 0–10 slider; API default remains 1.

MIT attribution for bpisano/Sticker remains included. Both repositories are public, but npm publication guards remain enabled. No npm release, main merge, tag or original-demo replacement is authorized.
