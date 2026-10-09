# v1 HDR preview

Version **1.0.0-preview.13** restores Sticker Foil's preview.11 color treatment, retains adaptive angle recovery, doubles the actual inset ridge dimensions, and adds a separate **Satin Mirror** material.

## Restored foil

Sticker Foil's source texture, chroma treatment and HDR response return to the verified preview.11 shader. The preview.12 extra saturation and HDR boost are removed. Angle recovery remains enabled; the enlarged shared rim is intentionally different from preview.11.

## Doubled rounded ridge

The raised ridge itself is doubled in both dimensions relative to preview.12: normalized width **.064 → .128**, height **.0016 → .0032**. This is not a thicker CSS outline or shadow. The C2 rounded profile keeps a flat central face and flat outermost land. Scaling both dimensions equally retains its maximum slope while making the ridge wider and taller.

## Satin Mirror

The sixth material starts with a neutral gray reflecting surface and an original procedural room environment, including broad windows/panels and dark structure. Environment lookup follows the reflected viewing ray; it is not a painted screen-space background.

Horizontal and vertical reflection blur are intentionally very different. Bright reflected sources use the same directional filtering as the rest of the environment, so the specular softness agrees with the reflection. Small surface-attached bubble and scratch deviations perturb reflection on an otherwise flat face. These imperfections belong only to Satin Mirror and do not replace existing textures.

Satin Mirror and Sticker Foil share the gradual adaptive light reference and enlarged rim. HDR extends reflected-light range; no external environment assets, accounts, runtime fetches or new engines are required. This is a procedural environment and stylized material approximation, not a photographed room or measured surface.

## Recovery and verification

Device motion still changes the reflection immediately. At rest, the light reference recovers toward its calibrated display angle using the existing 2.5-second time constant. Shared RAF timestamps avoid double adaptation, long pauses do not accrue adaptation debt, and the original four materials retain their raw motion path.

The demo shows all six variants, with Satin Mirror selected initially. Mirror and foil samples use strength 5; the existing original-four samples retain strength 1. The playground slider remains 0–10 and the component API default remains 1.

CPU analytical comparisons, deterministic tests and shader compilation are not physical GPU/HDR display validation. The cloud browser has no GPU; visual appearance and performance must still be evaluated on a device.

## Publication

MIT attribution for bpisano/Sticker remains included. No third-party environment image or shader code is copied for Satin Mirror. Both repositories are public, but npm publication guards remain enabled. No npm release, main merge, tag or original-demo replacement is authorized.
