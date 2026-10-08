# v1 HDR preview

Version **1.0.0-preview.9** preserves the accepted Sticker Foil diffraction texture and adds a separate broad silver-white reflection. The preview starts at strength **5**, with the existing 0–10 slider retained for comparison; the component API default remains 1.

## Accepted foil, slightly faster movement

The source-derived pastel field, enlarged diamond pattern (effective scale 12.5), grain and shallow inset rim remain. Sensor-to-aurora movement gains 20%; the shared motion hook and other four material formulas are unchanged. Aurora remains independent of compass heading.

## Broad reflection

Sticker Foil's small point-light gloss is replaced with an extended softbox approximation. Its central plateau can illuminate the whole flat face; wide, soft shoulders create a gradient across the button when the viewing angle moves away. This is an artistic real-time approximation, not a full area-light or diffraction simulation.

The bright region approaches neutral silver-white while preserving faint gray diamond/grain relief. Highlight coverage is bounded separately from diffraction intensity, preventing a strength of 5 from simply multiplying the face into featureless white. Away from the reflection the accepted color field returns.

The reflected emitter retains the existing world-space light orientation. Its location consequently depends on device heading; the aurora and highlight are distinct layers, not a single moving spot. The original four materials retain their lighting, textures and defaults.

## Preservation and validation

The native button behavior, motion hook, CSS, flat face and outermost land, and shallow inset crimp remain unchanged from preview.8. Shader equations, continuity, texture retention and bounded output can be checked analytically, but CPU comparisons and compilation are not physical HDR-display validation. The cloud browser has no GPU; final perceived brightness depends on the user's display and available headroom.

## Publication

MIT reference attribution remains included. No GPL code/assets were copied. Both repositories are public, but package publication guards remain enabled. No npm release, main merge, tag or replacement of the original demo is authorized.
