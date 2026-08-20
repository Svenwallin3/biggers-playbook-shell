---
name: HEIC photo upload decoding
description: Photo uploads convert iPhone HEIC/HEIF to JPEG client-side via native decode then heic-to; heic2any is rejected.
type: constraint
---
Photo uploads (src/lib/photo-storage.ts) convert HEIC/HEIF to JPEG in the browser before compression/upload:

1. Native Safari/WebKit decode (`createImageBitmap` + canvas) is tried first — fastest on Apple devices.
2. Fallback is lazy-loaded `heic-to` (bundles current libheif/libde265), imported dynamically so the ~3 MB decoder only downloads for HEIC uploaders.
3. Failure throws `HeicConversionError` and shows a toast. Never silently upload a `.heic` — it cannot render outside Safari.

Do not go back to `heic2any` (ADL-081): its older bundled libheif build fails on modern iPhone containers (grid-tiled HEVC primary plus Apple HDR gain map / style delta / sky matte auxiliary images), which is the default output of iPhone 15+ on iOS 17+.

Verified 2026-08-20 in Chromium through the app's own module: a 45-tile 5712x4284 iPhone 15 photo carrying an `urn:com:apple:photo:2020:aux:hdrgainmap` auxiliary, a 7.4 MB grid/`tmap` iPhone photo, and a simple single-frame HEIC all convert to the correct visible primary photo (never the gain map or a matte).

Known limit: libheif's JS decoder exposes only top-level images, so the HDR gain map itself is not applied — output is the base SDR image, which is what these uploads need.
