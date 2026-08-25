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
