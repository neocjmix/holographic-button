import {OPTICAL_CONTROLS,OPTICAL_PRESETS,type OpticalControl,type OpticalOptions,type OpticalPreset,type OpticalPresetId} from "@neocjmix/holographic-button";

// English presentation belongs to the demo; the published metadata stays intact.
const PRESET_COPY={
 "satin-mirror":{label:"Satin Mirror",note:"Soft gray mirror reflections"},
 "card-foil":{label:"Card Foil",note:"Pastel foil inspired by Pokémon cards"},
 "grid-prism":{label:"Grid Prism",note:"Vivid spectra split across angular cells"},
 "smooth-prism":{label:"Smooth Prism",note:"Broad color reflections on a smooth surface"},
} satisfies Record<OpticalPresetId,Pick<OpticalPreset,"label"|"note">>;

const CONTROL_COPY={
 iridescence:{label:"Color coating",hint:"0 is neutral, 1 is vivid, and 2 increases color contrast."},
 diffraction:{label:"Diffraction strength",hint:"Shifts mirror reflections into wavelength-dependent diffraction instead of only adding brightness."},
 rainbowSpacing:{label:"Grating spacing",hint:"Smaller values create tighter color bands. Very small spacing can suppress diffraction orders."},
 gratingAngle:{label:"Grating angle",hint:"Rotates the diffraction, reflection blur, and grid together."},
 facetStrength:{label:"Grid relief",hint:"0 is smooth. Higher values split each cell's reflection and color."},
 facetScale:{label:"Grid density",hint:"Cells per button-height unit. A 45° grating angle creates diamonds."},
 reflectionBlur:{label:"Reflection blur",hint:"0 keeps reflections sharp. Higher values spread them out."},
 directionality:{label:"Blur directionality",hint:"0 gives uniform blur. Higher values stretch it in one direction."},
 bubbles:{label:"Microbubbles",hint:"1 preserves the original microbubbles. 100 creates a visibly swollen surface."},
 scratches:{label:"Microscratches",hint:"1 preserves the original microscratches. 100 creates deep grooves."},
 ridgeWidth:{label:"Rim width",hint:"Adjusts the rounded rim's width while keeping the center flat."},
 ridgeHeight:{label:"Rim height",hint:"0 makes the rim flat. Higher values change its reflection angle more strongly."},
 recoverySeconds:{label:"Angle recovery time",hint:"Lower values return the light faster. Device movement still responds immediately."},
} satisfies Record<keyof OpticalOptions,Pick<OpticalControl,"label"|"hint">>;

export const DEMO_OPTICAL_PRESETS:readonly OpticalPreset[]=OPTICAL_PRESETS.map(preset=>({...preset,...PRESET_COPY[preset.id]}));
export const DEMO_OPTICAL_CONTROLS:readonly OpticalControl[]=OPTICAL_CONTROLS.map(control=>({...control,...CONTROL_COPY[control.key]}));
