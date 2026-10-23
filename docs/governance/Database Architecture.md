
# Database Architecture — Biggers Training Platform

Status: Authoritative. Audited directly against live Supabase project `kouyxrwnzjphuvnvxwyj` ("biggers-training-platform", paid org) on 2026-08-10 via `list_tables`, `execute_sql` against `information_schema`/`pg_policies`/`pg_proc`, `get_advisors`, and `list_migrations`. This is the real, current schema — not a plan.

**Do not confuse with `htsqbaeubcmmvgbpjqig`** ("sven@biggersmarket.com's Project", free org) — an unrelated Supabase project in the same account. It is not this app. If a future session's Supabase MCP connector defaults to the free org, it will not see this schema; the correct project_id is `kouyxrwnzjphuvnvxwyj`.

> **Known gap (2026-10-23):** this document predates the `paths`, `locations` and `employee_secondary_divisions` tables, `steps.day_position`, `steps.signoff_checklist`, `step_blocks`, and the `modules.path`/`path_id` columns (which replaced `sub_path`). Where it disagrees with the live schema, the live schema wins. See `.claude/rules/database.md` for the current facts. A full refresh is an open item in `docs/state/open-items.md`.

---

## CURRENT STATE

### Tables (19, all RLS-enabled, all with `created_at`/`updated_at` maintained by `update_updated_at_column()`)

**employees**
`id` PK · `user_id` uuid unique nullable (FK-equivalent link to `auth.users`, populated on first sign-in) · `email` unique · `full_name` · `auth_tier` enum(`staff`/`manager`/`owner`) default `staff` · `department_scope` enum(`universal`/`market`/`kitchen`/`delivery`) nullable — manager's authorization scope · `location_id` text nullable (`market_street`/`carolina_beach_road`) · `path` text — the trainee's own assigned onboarding track (market/kitchen/delivery), set at first login · `status` enum(`active`/`inactive`/`merged`) · `merged_into` uuid, self-FK · `can_manage_team` bool default false — the General Manager flag.

**tracks** (3 rows: universal, market, kitchen)
`id` PK · `slug` unique · `name` · `department` enum · `sequence_order` · `location_tag`.

**modules** (16 rows)
`id` PK · `track_id` FK → tracks · `slug` unique · `name` · `description` · `sub_path` · `day_assignment` int nullable — **every step in a module inherits this module's single day; a step needing a different day requires a new/different module, never an edit to the shared module's day_assignment** · `sequence_order` · `is_assignable` bool — flags Leadership/Bartender/Forklift-style modules outside the 4-day window.

**steps** (74 rows)
`id` PK · `module_id` FK → modules · `title` · `step_type` enum(`text`/`photo`/`video`/`quiz`/`doing_signoff`/`supervised_live_practice`) · `content_status` enum(`ready`/`needs_restructuring`/`missing`/`blocked`) · `content_body` · `content_notes` (admin-only, never trainee-rendered) · `media_url` · `video_url` · `sequence_order` · `location_tag` · `supports_manager_initials` bool — lightweight ungated acknowledgment, distinct from full sign-off · `media_recommendation` enum(`none`/`photo`/`video`) — admin-curation-only field, DB-comment-documented as never rendered to trainees or in `/preview` · `media_recommendation_note`.

**quiz_bank** (6 rows) / **quiz_attempts** (0 rows)
Standard: `step_id` FK, `options` jsonb, `correct_option` int; attempts FK to `employees`+`steps`. Authoring UI live on `/admin/content` since 2026-08-11 (ADL-039). Insert/update RLS scoped to GM+Owner only (`is_gm() OR has_tier('owner')`), narrower than the general Manager-direct-edit pattern — any signed-in manager can still read active questions (needed for trainees taking the quiz), and manager/owner can read soft-deleted ones too.

**progress_records** (7 rows)
`employee_id` FK, `step_id` FK, `status` enum(`not_started`/`in_progress`/`completed`/`signed_off`), `signed_off_by`/`signed_off_at`.

**reference_documents** (25 rows)
`document_type` enum(`checklist`/`sop`) · `sections` jsonb (ordered line items grouped by section for checklists; narrative body for SOPs) · `content_status` enum · `departments` text[] (supports multi-department docs, e.g. POS Item Entry tagged `['kitchen','market']`) · `location_tag`.

**checklist_instances** (1 row) / **checklist_line_completions** (1 row)
Shipped 2026-08-09. One **shared** instance per `(document_id, day, location)` — not per-employee; this was a deliberate, explicitly-required design point (a second person opening the same checklist mid-shift must see prior check-offs, not a blank list). `status` check-constrained to `in_progress`/`submitted`. Completions unique on `(instance_id, section_index, line_order)`, upserted; unchecking clears `completed_by`/`completed_at` but keeps the row (no hard delete). Always fetched with `staleTime: 0`.

**huddle_cards** (15 rows)
`category`, `standard_text`, `manager_tip`, `sequence_order`, `departments` text[]. Deterministic day-of-year rotation against each department's eligible pool — no manual picker. Owner-approval-gated once per card (not per-day).

**manager_notes** (1 row)
`note_text`, `effective_date` date, `departments` text[], `location_tag`, `photo_url`. Direct manager/owner write, no approval queue (operational precedent). Surfaced only on its own `effective_date` (exact match, not a range) via `todaysManagerNotesQueryOptions`; full history (including soft-deleted rows) stays browsable on `/huddle-notes → Manager notes`, no date filter. **Soft-deleted rows are hard-deleted 30 days after `deleted_at`** by a daily `pg_cron` job (see Scheduled Jobs below) — the second approved exception to "no hard deletes, ever" (ADL-005), alongside ADL-011. Scoped to `manager_notes` only; `huddle_cards` uses the same `is_deleted` column but is curated, reusable content and is explicitly excluded from any retention purge.

**delivery_issues** (0 rows)
`product_vendor`, `issue_description`, `photo_url`, `photo_url_2`, `truck_date` (defaults today, editable, distinct from `created_at`), `reported_by`/`assigned_to` FK to employees, `status` text default `'open'`. Any signed-in employee may report; routing recipient is a free-choice manager/owner pick, not hardcoded to a role.

**sourcing_board_entries** (8 rows) / **sourcing_board_delete_requests** (0 rows)
Entries: `product`, `region`, `supplier`, `category`, `seasonality`, `photo_url`, `is_deleted`/`deleted_by`/`deleted_at`. Requests table (added 2026-08-10, migration `sourcing_board_delete_approval`): `entry_id`, `product_snapshot`, `requested_by`/`requested_at`, `status`(pending/approved/rejected), `reviewed_by`/`reviewed_at`, `reason`. Deliberately **not** department-scoped — sourcing questions are treated as low-risk to expose broadly.

**suggestion_queue** (0 rows)
The structured 3-field form: `field_what`, `field_how`, `field_how_you_know`, `status` enum(pending/approved/rejected), FKs to `steps`/`modules`/`reference_documents`.

**assignable_module_assignments** (0 rows)
`employee_id`/`module_id`/`assigned_by`, `due_date`. Backs `/compliance`. Create/end-assignment UI live on `/compliance` since 2026-08-11 (ADL-040) — "End assignment" soft-deletes via existing `is_deleted`/`deleted_by`/`deleted_at` columns, no new columns needed. Insert/update RLS scoped to GM+Owner only (`is_gm() OR has_tier('owner')`), matching team-management scope (`guard_auth_tier()`). This is the mechanism for assigning restricted positions (Bartender/Forklift/Leadership) and, going forward, seasonal modules (pumpkins, Christmas trees, etc.) to specific employees — see Training Architecture.md on the seasonal training layer.

**presentation_reference_entries** (0 rows)
`category` (free text, no fixed taxonomy), `item_name`, `photo_url`, `portion_note`, `department`. Direct manager edit, no approval — same precedent as Sourcing Board.

**version_history** (146 rows)
Append-only. `entity_type` (polymorphic, no FK by design), `entity_id`, `changed_by`, `snapshot` jsonb (full pre-update row). Written by `record_version()` BEFORE UPDATE on `modules`, `steps`, `tracks`, `reference_documents`, `presentation_reference_entries`. Owner/manager read only.

### Functions (public schema; all `SECURITY DEFINER` except `update_updated_at_column`)

| Function | Purpose |
|---|---|
| `has_tier(_tier)` | Tier check, requires `status='active' AND is_deleted=false` |
| `is_manager_or_owner()` / `is_gm()` | Role-bucket helpers (`is_gm` = manager tier + `can_manage_team=true`) |
| `current_tier()` / `my_department()` / `my_location()` | RLS convenience lookups |
| `can_manage_progress_for(employee_id, step_id)` | Owners: unrestricted. Managers: Universal-track steps signable for anyone regardless of own dept/location; department/location-scoped steps require a `path` match against the manager's `department_scope`/`location_id`. |
| `guard_auth_tier()` | Trigger on `employees` UPDATE — owners unrestricted; GMs may only flip staff↔manager tier and active/inactive status within their own department+location, cannot touch owner rows, cannot grant/revoke `can_manage_team`; everyone else cannot change `auth_tier`/`can_manage_team` at all |
| `guard_sourcing_delete()` | Trigger on `sourcing_board_entries` UPDATE — blocks any non-owner from setting `is_deleted=true` directly, forcing the delete-request flow |
| `guard_track_reorder()` | Trigger on `tracks` UPDATE (added 2026-08-11, ADL-036) — blocks any non-GM/Owner from changing `sequence_order`, so a department-scoped Manager can't resort the shared track list for everyone. Other track fields unaffected. |
| `handle_new_user()` | Auth trigger — creates/links an `employees` row by email on `auth.users` insert, `on conflict (email) do update set user_id` (lets pre-provisioned rows get claimed on first real sign-in) |
| `record_version()` | Writes the pre-update row to `version_history` |
| `merge_employees(primary, duplicate)` | Owner-only. Reassigns `progress_records`, `quiz_attempts`, `suggestion_queue`, `version_history.changed_by`, `assignable_module_assignments` from duplicate→primary, de-duplicating on conflict; soft-deletes duplicate as `status='merged'`. **This function hard-deletes true duplicate rows in `progress_records` and `assignable_module_assignments`** (the one approved exception to "no hard deletes, ever" — see ADL-011) — those two tables have no soft-delete column, and the hard-delete only fires when both merged accounts already hold a record for the identical step. |

### Scheduled Jobs (`pg_cron`)

`pg_cron` extension, enabled 2026-08-21 (ADL-090) — first use of scheduled jobs in this project.

| Job | Schedule | Purpose |
|---|---|---|
| `purge-manager-notes-30d` | Daily, 08:00 UTC | `delete from manager_notes where is_deleted = true and deleted_at < now() - interval '30 days'`. Hard-deletes only rows already manually soft-deleted by a manager/owner; does not touch active notes regardless of age, and does not touch `huddle_cards`. |

### Authentication

Supabase Auth, magic-link only, no passwords. Sessions persist long-term on device. `handle_new_user()` links new `auth.users` rows to `employees` by email — pre-provisioned owner/manager rows get claimed automatically on first real sign-in rather than defaulting to staff. New unmatched signups default to `auth_tier='staff'` at the DB level.

### Storage

Private `reference-photos` bucket, signed URLs with 1-hour TTL, backing the shared `PhotoUpload`/`StoredPhoto` component (Sourcing Board, Delivery Issues; Portioning photo upload not yet exercised — table exists, 0 rows). Photos are compressed client-side (1600px / JPEG 80%) before upload. Non-square source photos center-crop rather than resize — an accepted, known tradeoff until re-upload.

Private `brand-assets` bucket (added 2026-08-11, ADL-034) — mascot poses and future brand imagery. RLS: any signed-in user can view, `has_tier('owner')` only can write. No in-app upload UI exists or is planned; Sven/Wells/Andrew upload directly via the Supabase dashboard at fixed, well-known paths (`mascot/empty.png`, `mascot/milestone.png`, `mascot/assistant.png`), which the app reads via `useBrandAsset()`/`MascotImage` — a missing object is a normal, silent no-render state, not an error. This is the pattern for any future "content Sven's team uploads independently, with no code change" need — see Product Constitution Non-Negotiable Rule #9.

---

## TARGET STATE (decided but not yet built, or explicitly deferred)

**Note: this section was stale as of 2026-08-11 verification — several items below listed as "not yet built" had already shipped (ADL-026 through ADL-030). Corrected in place.**

- **Policy acknowledgement** as a distinct tracked object — see Information Architecture.md ISSUE-01. Not urgent while the Handbook stays paper-based; should be built before any policy content is digitized in-app.
- **CertificationRecord (CFPM/ServSafe/OSHA tracking)** — explicitly decided out of scope. Sven audits certification coverage manually against the weekday/weekend schedule; `/compliance` reads `assignable_module_assignments` only, informationally. See ADL-017. Do not build this without a new explicit request.
- **Retention-check scheduling** (day-7/day-30 spaced-retrieval quiz triggers) — flagged in the original spec as a small open technical decision, not yet resolved.
- **No-Lovable-needed content growth (Sven's explicit standing goal, 2026-08-11):** new Tracks/Modules/Steps/positions should be addable via `/admin/content` without a Lovable session — this already works today for the four existing departments (Universal/Market/Kitchen/Delivery) and for new `is_assignable` "position" modules (Bartender/Forklift/Leadership-style). **Real constraint, documented not fixed:** `employees.department_scope` is a fixed Postgres enum (`universal`/`market`/`kitchen`/`delivery`), not free text like `location_tag`. A genuinely new 5th department would need an `ALTER TYPE ... ADD VALUE` migration plus an RLS/UI review — a schema change, not an in-app action. Not converting this to free text preemptively (no 5th department is currently anticipated; doing so now would be speculative complexity against the anti-over-engineering rule). Revisit only if a real 5th department is proposed.

**Built since this section was last accurate (all live 2026-08-11):** Huddle card/manager-note authoring UI (ADL-026), GM-accessible `/approvals` review path for Sourcing Board delete requests (ADL-027), onboarding-complete indicator on `/team` (ADL-028), standalone "Me" screen (ADL-029), company-wide Delivery Issues list (ADL-030), drag-and-drop reorder for tracks/modules/steps in `/admin/content` (ADL-036), quiz question authoring UI scoped to GM+Owner (ADL-039), assignable-module-assignment authoring on `/compliance` scoped to GM+Owner (ADL-040).

## TECHNICAL DEBT / REQUIRED MIGRATIONS

Per Supabase's own advisor tool (`get_advisors`), all findings are WARN/INFO severity — nothing CRITICAL/ERROR. **Status as of the 2026-08-11 cleanup pass (ADL-025):**

- ~~Security WARN × 12 (SECURITY DEFINER RPC exposure)~~ — **Resolved 2026-08-11.** Reviewed individually; each function either self-scopes via `auth.uid()` or is trigger-only (RPC exposure is inert). Explicit sign-off recorded directly on each function via `COMMENT ON FUNCTION` (migration `record_security_definer_signoff_comments`), so this no longer needs re-litigating each audit — the advisor will keep flagging it (that's expected, it can't read the comments), but the decision is made and recorded.
- **Security WARN × 1 (leaked-password protection disabled):** still open, low-priority, dismissed as moot under magic-link-only auth (no passwords exist to leak). Not fixed, no action planned.
- **Performance INFO × ~29 (unindexed foreign keys):** still open. Immaterial at current row counts. Revisit before real scale, not urgent now.
- ~~Performance WARN × 9 (`auth.uid()` re-evaluated per row)~~ — **Resolved 2026-08-11.** All flagged policies on `employees`, `progress_records`, `quiz_attempts`, `suggestion_queue`, `assignable_module_assignments`, `sourcing_board_delete_requests` now wrap the call as `(select auth.uid())` (migration `wrap_auth_uid_rls_perf_fixes`). No behavior change, confirmed via `get_advisors` re-run — these warnings no longer appear.
- **Performance WARN × 2 (redundant overlapping permissive policies):** still open, deliberately deferred. `employees` SELECT (`employees_select_self` + `employees_select_staff_directory`) and `huddle_cards` SELECT (owner-manage-all + everyone-can-view) each have two permissive policies doing different things by design (self-access vs. staff-directory access; owner-write vs. universal-read) — consolidating them without changing semantics is more involved than the other fixes and isn't urgent at current scale. Revisit as a dedicated pass if the schema grows further.
- ~~Orphaned migration risk: `fix_tcs_content.sql`~~ — **Resolved 2026-08-11.** Diffed against the live `steps` table: the script already ran successfully (the live TCS step's `content_body` matches its output exactly). No duplicate or clobber risk — a separate, unrelated `is_deleted=true` seed-era duplicate of the same title was found in the process, confirmed already correctly soft-deleted (predates this audit, not a new issue). The stray file itself is safe but redundant; recommend deleting it directly in the Lovable editor next time someone is in there (trivial, no need to spend an agent turn on it).
- ~~Naming overlap: `department_scope` vs. `path`~~ — **Resolved 2026-08-11.** Clarifying `COMMENT ON COLUMN` added to both (migration `add_department_scope_path_column_comments`). No rename — both fields keep their current names and behavior, just now self-documenting in the schema.

## Governance Pattern Confirmed (applies to any future table)

**Corrected 2026-08-11:** this section previously stated curated content (tracks/modules/steps) is "owner-approval-gated for managers via `suggestion_queue`." A direct `pg_policies` audit on `modules`, `steps`, and `tracks` (done during the post-remediation verification pass, and independently confirmed the same day by a concurrent session building drag-reorder, see Architecture Decision Log ADL-036) found that was stale: `modules_update`, `steps_update`, and `tracks_write_mgr` have always granted a department-scoped Manager **direct** UPDATE, no approval gate. `suggestion_queue` is a separate, parallel path (`/suggest` → `/approvals`) that a Manager can optionally use, not a required front door to `/admin/content`. Corrected pattern:

- **Curated/standards content** (Training tracks/modules/steps, and manager edits to Reference `checklists`/`sops`) → direct write for a Manager within their own department, direct for Owner anywhere. `suggestion_queue`/`/approvals` exists as a separate, optional path (e.g. for a staff flag or a Manager who wants a second opinion before publishing) — not a mandatory gate.
- **Two narrower exceptions, GM+Owner only, not open to a regular Manager:** quiz question authoring (`quiz_bank`) and restricted/seasonal module assignment (`assignable_module_assignments`) — see ADL-039, ADL-040. Also GM+Owner only: reordering sections/tracks themselves (ADL-036) and Sourcing Board entry deletion (ADL-024).
- **Operational/time-sensitive content** (Sourcing Board edits, Portioning/Presentation, Manager Notes, Delivery Issues, Huddle Card display) → direct write for managers, no approval queue.

This also supersedes the original Lovable Project Knowledge line "all content changes route through Owner approval at launch, even a manager editing their own department" — that line describes launch-day intent, not current or ever-actual behavior at the RLS level, and should be corrected in Lovable's Project Knowledge panel to avoid a future Lovable prompt re-adding approval gating to content that has always been direct-edit. See Current Build State.md for this as a flagged action item.
