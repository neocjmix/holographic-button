# Changelog

All notable changes follow [Keep a Changelog](https://keepachangelog.com/) and Semantic Versioning.

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
