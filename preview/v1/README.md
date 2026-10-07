# v1 HDR preview

Version 1.0.0-preview.4. Original four texture formulas, colors, grain/facets, CSS, motion, native button behavior and demo controls are retained.

Changes requested for this iteration:
- Flat macro face and flat outermost edge, with one softly raised inset rim
- Broader, neutral tin-like specular reflection; no new textures
- Light positions and environment directions deliberately unchanged pending feedback
- HDR presentation and numeric specular slider retained

This is an artistic tin-like reflection treatment over the existing holographic textures, not a measured elemental-tin material. The original install commands refer to the published package, which does not contain this preview. No npm publication is authorized. Both repositories are public; package manifests have `private: true` as a publication guard.

The demo remains `app/page.tsx`. Reference notes and validation are in the draft PR. Tests cover texture preservation, rim continuity, renderer lifecycle and HDR output transform. Actual HDR appearance requires an HDR-capable GPU/display; the cloud browser cannot verify physical highlight output.

## Shading references
- [Filament specular BRDF](https://google.github.io/filament/main/filament.html): GGX distribution, height-correlated Smith visibility and Schlick Fresnel, perceptual roughness squared
- [Three.js physical material](https://threejs.org/docs/pages/MeshPhysicalMaterial.html): separate metallic reflection from dielectric clearcoat
- [Disney physically based shading notes](https://media.disneyanimation.com/uploads/production/publication_asset/48/asset/s2012_pbs_disney_brdf_notes_v3.pdf): roughness and clearcoat separation

The existing holographic color branches remain deliberately artistic. Neutral F0=.75 and roughness near .30 are visual starting values, not measured tin constants. The compact inset ridge has zero height, slope and curvature at both ends, with its normal derived from its height slope. No extra bump texture was added.
