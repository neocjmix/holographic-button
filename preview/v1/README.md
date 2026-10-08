# v1 HDR preview

Version **1.0.0-preview.12** keeps the coupled colored-reflection model and adds richer chroma, stronger colored HDR, gradual light recovery and a fuller rounded rim.

## Color and reflection

The rainbow remains the reflection itself. The existing source curve, checker scale 12.5 and grain remain the color carrier; a post-texture chroma adjustment reduces the washed-out appearance without replacing the pattern. Extra HDR range strengthens colored reflection instead of adding a white overlay. SDR retains a shared-RGB shoulder to avoid channel-clipping into white.

## Slowly recovering light

Sensor movement still changes reflection immediately. The foil's lighting reference then adapts over time toward a calibrated colorful viewing angle, so a stationary dark pose gradually recovers instead of remaining black. This is deliberate art-directed lighting, not a claim that a physical world-fixed lamp behaves this way.

The adaptive reference uses a 2.5-second response time, so recovery is gradual rather than a snap.

Recovery is foil-only. The shared sensor hook and the original four materials' motion are preserved. HDR and WebGL use the same effective foil orientation; recovery must not run twice merely because both render paths are present. Timing is elapsed-time based, with bounded handling of pauses and resume.

## Rounded raised rim

The shared inset ridge becomes wider and taller across all five materials: its normalized width grows from .038 to .064 and peak height from .00055 to .0016. Its smoothly joined profile retains a flat center and flat outermost land. No angular bevel, new CSS highlight overlay, texture replacement or general palette change is introduced.

## Approximation and verification

One reflected-ray/light-frame coordinate drives rainbow phase and reflected energy. This remains a stylized colored-reflection approximation, not a spectral diffraction solver, measured BSDF or full area-light integration. [Stam / GPU Gems](https://developer.nvidia.com/gpugems/gpugems/part-i-natural-effects/chapter-8-simulating-diffraction), [PBRT conductor reflection](https://www.pbr-book.org/4ed/Reflection_Models/Conductor_BRDF) and [Filament](https://google.github.io/filament/Filament.html) informed the previous optical revisions.

CPU analytical images, deterministic recovery tests and shader compilation do not verify physical HDR appearance. The cloud browser has no GPU. Final appearance depends on the user's device and available headroom. The demo starts at strength 5 and retains the 0–10 control; component API default remains 1.

## Publication

MIT attribution for bpisano/Sticker remains included. Both repositories are public, but npm publication guards remain enabled. No npm release, main merge, tag or original-demo replacement is authorized.
