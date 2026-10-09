# Changelog

All notable changes follow [Keep a Changelog](https://keepachangelog.com/) and Semantic Versioning.

## 1.0.0 — 2026-10-09

### Added

- HDR output through WebGPU on supported displays and browsers, with WebGL fallback.
- One configurable reflective shader with Satin Mirror, Card Foil, Grid Prism and Smooth Prism numeric presets.
- Exported optical defaults, limits, normalization, preset values and control metadata.
- Continuous coating density, attached facet strength/density, shared grating orientation, anisotropic blur and surface-detail controls.
- Adaptive reflected-light recovery, a neutral procedural room environment, and a reference-derived Sticker Foil variant with MIT attribution.
- Source-executed optical references, frozen baseline fixtures, backend parity, lifecycle, sensor, demo and packaging regression tests.

### Changed

- Promote the full optical playground to the official demo, with grouped live controls, contextual hints, custom-state feedback, selected-preset reset and Satin Mirror reset.
- Preserve the neutral Satin Mirror baseline and maintain compatibility with original variants, the nine-field `mirrorOptions` alias and boolean `specular` values.
- Keep the component's original `spectral-film`/strength-1 API defaults; the documented quick start and demo explicitly select Satin Mirror/strength 5.
- Distribute diffraction energy across valid orders, preserve neutral reflection when orders cannot propagate, and preserve color with an RGB-wide SDR shoulder.
- Use content-hashed demo assets and ship both MIT license notices in the Pages output.
- Replace isolated-preview scaffolding and release warnings with stable documentation while retaining AI attribution and verification limitations.

### Fixed

- Reject nonfinite sensor readings and safely default unavailable screen-orientation angles to zero.
- Clean up partial WebGL initialization and stopped HDR renderers, and retain a readable fallback when rendering becomes unavailable.
- Keep the mobile tuning result flush to the viewport while preserving its desktop offset.

### Verification limits

Automated CPU references, lifecycle mocks, typechecks and build checks do not establish physical GPU/HDR display quality or mobile frame rate. Validate on your target devices.

## 0.1.2 — 2026-08-25

### Changed

- Moved the package, issues, release workflow, and demo to the dedicated `neocjmix/holographic-button` repository.
- Updated npm package metadata and provenance links for the new repository.
- Removed Work-specific hosting metadata from the public repository.

## 0.1.1 — 2026-08-25

### Fixed

- Prevented a load-time iOS Safari permission request from blocking the first real interaction, and request only the shared orientation permission instead of racing both sensor APIs.

## 0.1.0 — 2026-08-24

### Added

- Four WebGL optical materials: spectral film, brushed foil, thin film, and facet chrome.
- World-fixed lighting driven by device attitude with pointer fallback.
- Native button props, form semantics, accessibility attributes, and DOM ref forwarding.
- Responsive width and height controls with a fixed high-fidelity pill silhouette.
- Prominent disclosure that the implementation is AI-generated and has not received human review.

### Fixed

- Made iOS Safari motion authorization recover existing permission on entry and retry safely on tap when WebKit rejects a non-eligible gesture.
### Changed

- Reworked the shared specular response as a smooth glass clear coat and moved the fixed key light roughly 45° toward the lower side of the surface.
- Exposed surface-specular intensity, roughness, bloom, and Fresnel as live-updating component props.
- Unified specular lighting with each material's perturbed surface normal so prism facets and rim bump directly shape the highlight instead of carrying a separate smooth top coat.
- Softened the recessed/raised rim transition by widening the bump profile and reducing its normal displacement.
- Added specular color, dielectric IOR, anisotropy strength, and anisotropy rotation controls.
- Changed the default text label treatment from white screen blending to solid black while preserving arbitrary JSX children.
- Made zero specular intensity disable every direct highlight contribution and added an independent highlight-size control.
- Removed the label text shadow so the copy no longer appears engraved.
- Promoted the tuned blue, broad anisotropic specular settings from the playground to the component defaults.
- Replaced the public specular tuning parameters with a single `specular` boolean and fixed the approved preset inside the material.
- Changed the hero copy to “A button that catches the light.”
- Removed the outermost white top-edge highlight while retaining the inset reflective rim.
