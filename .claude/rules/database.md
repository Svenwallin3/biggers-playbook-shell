---
paths:
  - "supabase/**"
  - "src/integrations/supabase/**"
  - "src/lib/*.queries.ts"
  - "src/lib/*.functions.ts"
  - "src/lib/approvals.ts"
  - "src/lib/photo-storage.ts"
  - "src/lib/ask.retrieval.ts"
---

# Database Rules

Applies to all agents, including Lovable. Full detail: `docs/governance/Database Architecture.md`.

## Project

- Supabase project `kouyxrwnzjphuvnvxwyj` ("biggers-training-platform"). Never `htsqbaeubcmmvgbpjqig` (unrelated free-org project).
- Inspect the live schema, policies and functions before any change. The docs can lag the database.
- Do not create a migration unless the request asks for a database change.

## Hard rules

- **No hard deletes on content tables.** Soft delete with `is_deleted`, `deleted_by`, `deleted_at`. `version_history` is written by `record_version()` before update on `modules`, `steps`, `tracks`, `reference_documents`, `presentation_reference_entries`. Approved hard-delete exceptions only: `merge_employees()`, the `purge-manager-notes-30d` cron job, `delete_step_block()` on an already-hidden block.
- **Every new table gets RLS enabled and explicit policies** before any UI uses it. Use the `rls-change` skill.
- **Guard triggers enforce what RLS alone cannot.** Existing: `guard_auth_tier()` (team tier/status/removal), `guard_sourcing_delete()`, `guard_track_reorder()`, `guard_track_delete()`, `guard_module_delete()`, `guard_reference_document_delete()`. Soft delete is an UPDATE, so any new UPDATE grant must be checked for an accidental delete grant.
- **Authorization helpers** (`has_tier`, `is_manager_or_owner`, `is_gm`, `my_department`, `my_location`, `can_manage_progress_for`, `gm_can_review_suggestion`) require `status = 'active' AND is_deleted = false`. Reuse them; do not write new identity checks inline.
- `SECURITY DEFINER` functions derive the caller from `auth.uid()`; never trust a passed-in employee id. Revoke execute from `anon` on new functions unless anon access is intended.
- Wrap `auth.uid()` in policies as `(select auth.uid())`.

## Schema facts that trip people up

`docs/governance/Database Architecture.md` predates the Locations and Paths tables. Where it disagrees with the live schema, the live schema wins; flag the gap.

- `day_assignment` lives on `modules`, not `steps`. `steps.day_position` (`start`/`middle`/`end`) places a step within its day.
- `department_scope` (enum `universal`/`market`/`kitchen`/`delivery`) is the employee's Division: authorization scope and plan driver. Owners have `department_scope = null` meaning unrestricted.
- **Paths:** `paths` table (`track_id`, `name`, `is_active`). `modules.path_id` (null = shared) and `employees.path_id` reference it. `employees.path` and `modules.path` text columns are legacy; do not add new reads or writes.
- **Locations:** `locations` table (`division`, `name`, `is_active`). `employees.location_id` is a uuid referencing it; compare with matching types (a uuid = text mismatch broke every GM edit once). Content `location_tag` fields are plain text.
- **Cross-training:** `employee_secondary_divisions` (`employee_id`, `department`, `path_id`), soft-deleted like everything else.
- New step content goes in `step_blocks`, not `steps.content_body`. `step_blocks.block_type` has a CHECK constraint that must change in lockstep with the frontend `BlockType` union (`add-step-block-type` skill).
- `quiz_bank` answers are never exposed to trainees. Quizzes are graded server-side through `get_quiz_questions` / `submit_quiz_answer`.
- `checklist_instances` are shared per document, per day, per Location (not per employee) and are Division/Location scoped by RLS.
- `reference_documents.sections` is jsonb; each section carries its own `content_kind` (`checklist` or `paragraph`).
- A new Division would require `ALTER TYPE` plus an RLS and UI review. Name it as a schema change; never fake it with a module.
- Account rows are created by `handle_new_user()` only after email confirmation.

## Storage

- `reference-photos` (private, signed URLs, 1-hour TTL) for content and operational photos.
- `brand-assets` (private, any signed-in user reads, Owner writes) for mascot and brand images at fixed paths; a missing object renders nothing.
- Never use Lovable asset storage.
