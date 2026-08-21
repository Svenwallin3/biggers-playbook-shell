# Project memory

## Core
- Photo uploads must never store raw HEIC; convert to JPEG client-side (native decode, then heic-to). Never reintroduce heic2any.
- New step content (any text/photo/video step) must be authored as step_blocks rows, never written to steps.content_body. content_body is legacy — only pre-existing steps use it, and only until manually converted. Any new step, whether created by you or via direct Supabase SQL, should have content_body left null with real content going straight into step_blocks. Never require a 'Convert to blocks' click on something that was just created.

## Memories
- [HEIC photo upload decoding](mem://heic-decoding.md) — how iPhone HEIC/HEIF uploads are converted to JPEG and why heic2any is rejected.
