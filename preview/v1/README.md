# v1 original-design HDR preview

Version 1.0.0-preview.3. The original four materials, bump geometry, world-space lighting, button DOM/CSS, motion hook and demo controls are preserved. The experimental replacement material lab is no longer the preview entry.

Only requested product changes:
- HDR presentation on supported displays/browsers, retaining the original WebGL fallback
- Numeric `specular` intensity (0 off, 1 original, >1 stronger), with boolean backward compatibility
- A demo intensity slider replacing the former switch

The demo is the original `app/page.tsx` with these narrow changes. Existing install commands refer to the published package, which does not contain this preview. No npm publication is authorized. Both repositories are public; package manifests have `private: true` solely as a publication guard.

Validation: package/demo type checks, package/preview build, shader and lifecycle tests. Actual HDR rendering requires a real HDR-capable GPU/display; the cloud browser cannot verify physical highlight output.
