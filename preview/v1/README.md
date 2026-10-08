# v1 HDR preview

Version **1.0.0-preview.11** changes Sticker Foil's optical concept: the rainbow itself is reflected light. It no longer combines an independently moving rainbow with a separate silver-white highlight.

## One reflected-light response

The reflected viewing ray is projected into the existing rightward light frame. Those same coordinates drive both the rainbow phase displacement and the angular reflection envelope. Sensor motion, perspective and the shallow rim consequently change color and brightness together. There is no independent gravity-driven hue layer underneath a white mask.

The accepted source-derived pastel curve, enlarged diamond pattern (scale 12.5), grain and shallow inset rim remain. The softened motion gain is retained on the new optical coordinate, so motion is not numerically identical to the previous gravity-only color adapter. Heading can now affect color and brightness together because the source remains world-fixed.

The background is a low neutral textured substrate. Colored reflected radiance brightens when it catches the source and falls away as the angle moves away. HDR increases this same colored reflection instead of adding a separate white state. SDR uses a shared RGB-scale highlight shoulder to preserve hue rather than clip channels to white; this compresses fine brightness contrast compared with the previous silver state, while the underlying checker/grain functions remain unchanged. The previous silver crossfade, peak desaturation and source-luminance floor are removed.

## Approximation, not a full diffraction solver

A real grating can retain a zero-order achromatic reflection without a separate coating. That does not require reproducing it as a large independent white overlay. This revision intentionally prioritizes a coupled colored-reflection appearance.

The phase colors remain an artistic approximation informed by [Stam / GPU Gems: Simulating Diffraction](https://developer.nvidia.com/gpugems/gpugems/part-i-natural-effects/chapter-8-simulating-diffraction). This is not a spectral grating equation, complete conductor BRDF, measured BSDF or integrated area-light simulation. [PBRT conductor reflection](https://www.pbr-book.org/4ed/Reflection_Models/Conductor_BRDF) and [Filament linear lighting](https://google.github.io/filament/Filament.html) inform the shading pipeline.

## Preservation and validation

The original four materials, shared motion hook, native button behavior and CSS remain unchanged. Demo strength starts at 5 and retains the 0–10 control; component API default remains 1. CPU analytical comparisons and compilation do not verify physical HDR appearance. The cloud browser has no GPU; final appearance depends on the user's device and available headroom.

## Publication

MIT attribution for bpisano/Sticker remains included. No new reference code or assets are copied. Both repositories are public, but npm publication guards remain enabled. No npm release, main merge, tag or original-demo replacement is authorized.
