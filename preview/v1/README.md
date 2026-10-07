# v1 HDR material preview

Unpublished `1.0.0-preview.1`. Existing root demo and WebGL implementation remain unchanged. This branch's workspace is private and prepublishOnly fails deliberately. Never tag or run the release workflow.

Build: `npm ci --ignore-scripts && npm run build:preview`.
Serve `preview-dist` over HTTPS or localhost, open `/v1/`.

Four material studies have paired WebGPU extended-HDR and tone-mapped SDR views. Reference patches encode relative linear radiance 1, 1.5, 2, 4 into sRGB float16 presentation. All surfaces use shared orientation state. Configuration success is NOT proof of emitted HDR brightness. The real-device acceptance gate compares the extended patches with adjacent CSS white on an HDR iPhone; screenshots cannot satisfy it. Sensor permission is initiated by user interaction only. Reduced motion freezes orientation response.

Preview deployment must use a separate approved preview site/repository. Do not dispatch the existing Pages workflow: it replaces the original artifact. No production merge, npm publication, tag, or release is part of this review.
