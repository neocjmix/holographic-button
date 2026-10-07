# v1 HDR preview

Version 1.0.0-preview.6 adds **Sticker Foil** as a fifth independent preset. The four prior shader paths, palette/texture formulas, light directions, motion, controls and button geometry are preserved from preview.5.

The new preset uses a bright two-dimensional pastel foil field, surface-fixed fine diamond contrast and independent soft glare, inspired by bpisano/Sticker. Existing presets do not receive that pattern. HDR is reserved for local glare rather than washing out the entire foil face.

The preview defaults to the new option in the playground; all five appear in the material comparison. Numeric specular continues to control highlight strength. The original four public variant names/default component behavior remain compatible.

References: [Sticker](https://github.com/bpisano/Sticker) (MIT, full notice included) and [Pokémon CSS live demo](https://poke-holo.simey.me/) (visual reference only; GPL code/assets not copied).

This is a stylized visual effect, not measured tin or a full diffraction simulation. Package manifests retain private:true and publishing guards. No npm release or main merge is authorized. Both repositories are public. The cloud browser has no GPU, so shader semantic/numerical tests are not physical HDR display validation.
