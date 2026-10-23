# Content Editing and Approvals

## Live

- **Editing surfaces:** the pencil on `/preview` and `/modules/$moduleId` opens `StepEditPanel` in place; a second pencil edits the module; a section pencil sits next to the Division tabs on `/preview`. Outline (`/admin/content`) uses the same panels, with a collapsible Division, Day, Module tree and drag-to-reorder.
- **Block editor:** `step_blocks` with types heading, paragraph, list (optional start number), photo, gallery, video, label_value, danger_zone. Text fields are WYSIWYG with bold/italic/underline (stored as `**`, `*`, `__` markers). Legacy steps have a "Convert to blocks" button.
- **New steps** are block-first for Owner/GM; the step editor opens right after creation.
- **Per-step intro card control** (`card_override_text`, `hide_module_card`).
- **Sign-off checklist authoring** per step (`signoff_checklist`), Division-scoped items.
- **Quiz authoring** on quiz steps, GM and Owner only.
- **Assignable modules:** a compact "Assignable modules in {Division}" tile on `/preview` opens a sheet to search, edit, assign and create. Standalone module builder with drag-reorder and a sticky save bar.
- **Version history** with restore on modules, steps, tracks, reference documents and portioning entries. Soft delete and restore everywhere.
- **Suggest a change** on every step; Approvals page (Owner, GM for their Division) with a count badge. Approving feedback only updates the suggestion status; the reviewer edits the content in the editor. Reference-document suggestions and Owner-only requests keep their apply logic.
- **Gaps** (`/admin/gaps`, Owner): content status dashboard; links open `/preview` at the step.
- **HEIC photos** convert to JPEG client-side (native decode, then `heic-to`).

## Open

- Owner retest of an iPhone HEIC upload through the live app; re-upload the one broken photo block ("Where your assignment lives").
- `content_notes` does not render for `ready` steps anywhere; audit for silently hidden notes.
- Dead imports left in `admin.content.tsx`; clean up in the next pass that touches it.
