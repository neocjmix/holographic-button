# v1 HDR preview

Version **1.0.0-preview.14** keeps the accepted preview.13 Satin Mirror as its default and exposes live optical tuning. No diffraction is enabled by default.

## Live controls

The typed `mirrorOptions` prop applies only to `satin-mirror`. `DEFAULT_MIRROR_OPTIONS` and `MIRROR_OPTION_LIMITS` are exported. Omitted, non-finite or out-of-range values are normalized to safe defaults/bounds.

| Field | Default | Range | Meaning |
|---|---:|---:|---|
| diffraction | 0 | 0–2 | Colored diffraction contribution; zero preserves the gray mirror |
| rainbowSpacing | 1 | .25–4 | Relative grating spacing; larger pitch produces narrower diffraction angles |
| reflectionBlur | 1 | 0–3 | Overall reflected-environment blur |
| directionality | 1 | 0–2 | Zero is isotropic, one is preview.13 anisotropy |
| bubbles | 1 | 0–4 | Existing bubble perturbation amplitude |
| scratches | 1 | 0–4 | Existing scratch perturbation amplitude |
| ridgeWidth | 1 | .25–2 | Multiplier on the preview.13 ridge width |
| ridgeHeight | 1 | 0–3 | Multiplier on the preview.13 ridge height |
| recoverySeconds | 2.5 | .25–10 | Light-recovery time constant; lower values respond faster |

The existing specular/HDR strength slider remains separate, initially 5. Reset restores the optical defaults and strength 5 without changing label, size or selected material. The generated React example includes current tuning values. The mirror gallery sample follows the same settings.

On small screens the result precedes the controls and remains sticky while adjusting them. This layout is preview-only; the original base demo and component stylesheets remain untouched.

## Optical and runtime behavior

The default branch retains the preview.13 environment/reflection helpers. Enabled diffraction traces wavelength/order directions in the surface grating frame and samples the same reflected environment with the same anisotropic filter. It is not a screen-space rainbow overlay. Some wavelengths/orders do not propagate at small grating spacing; a colored contribution can therefore diminish at those settings.

Optical sliders update uniforms without recreating GPU resources. Mirror recovery retains persistent per-instance state while its time constant changes, avoiding configuration conflicts with the foil. HDR and WebGL share that instance's sampler, with same-timestamp deduplication and bounded pause handling. Original four materials and Sticker Foil ignore mirror options.

Enabled diffraction is more expensive: the current bounded filter can perform up to 105 room evaluations per pixel versus 15 with diffraction disabled. No mobile frame-rate claim is made. The default does not incur the optional diffraction sampling cost.

## Preserved baseline

Sticker Foil retains its restored preview.11 color path and existing recovery. The shared baseline rounded ridge remains width .128 and height .0032, with flat outer land and center; mirror-specific multipliers do not change other materials. Default tuning preserves preview.13 appearance for identical pose and elapsed-time inputs. Independently mounted mirror instances now own their recovery phase rather than inheriting another material's elapsed history.

## Verification and publication

CPU analytical tests, shader compilation and browser control checks do not establish physical GPU/HDR display quality. The cloud browser has no GPU; on-device inspection remains necessary, especially for opt-in diffraction performance.

MIT attribution for bpisano/Sticker remains included. Both repositories are public, but npm guards remain enabled. No npm release, main merge, tag or original-demo replacement is authorized.
