# Modern iPhone HEIC decoding

## Build
- Keep Safari/WebKit native HEIC decoding as the first, fastest path.
- Replace the `heic2any` fallback with lazy-loaded `heic-to` 1.5.2, whose current libheif/libde265 build supports tiled HEIC reconstruction.
- Preserve the existing JPEG output, compression, upload path, and clear conversion error behavior.
- Remove the obsolete `heic2any` dependency.

## Verification
- Decode a real 7.4 MB iPhone grid/tmap HEIC with many HEVC tiles and auxiliary content, confirming the result is the full visible primary photo rather than a gain map or matte.
- Decode a simpler older HEIC to prevent regression.
- Confirm JPEG output has `.jpg` naming and renders in Chromium, then check project diagnostics.

## Technical details
`heic-to` is loaded only when native decoding fails, so its roughly 3 MB decoder bundle is not part of the normal app path. Its libheif wrapper enumerates top-level images (excluding auxiliary tile items) and the tested modern fixture resolves the reconstructed primary image as the first result.
