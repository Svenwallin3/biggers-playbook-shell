
# Roles and Permissions — Biggers Training Platform

Status: Authoritative. Audited directly against live RLS policies, trigger functions, and route guards on 2026-08-10.

There are **four** effective access levels, not three. Project documentation elsewhere (Lovable Project Knowledge panel) still describes only staff/manager/owner — the General Manager tier shipped 2026-08-09 as a flag on top of manager, not a new enum value, and has not yet been reflected in that file. This document reflects the live, real state.

> **Note (2026-10-23):** the ADL-103 changes in §9 are built (2026-09-24) and awaiting the Owner's browser test. The permissions table in `AGENTS.md` reflects the built state. §2 below will be rewritten to match once the test passes.

---

## 1. Access Levels

| Level | DB representation | Who |
|---|---|---|
| **Staff (Employee)** | `auth_tier = 'staff'` | New hires and existing floor staff. Default for all new magic-link signups. |
| **Manager** | `auth_tier = 'manager'`, `can_manage_team = false` | Department/location leads without GM authority — e.g. a shift lead who can sign off training and edit their own department's operational content, but cannot change anyone's access tier. |
| **General Manager (GM)** | `auth_tier = 'manager'`, `can_manage_team = true` | Store GMs and equivalent — everything a Manager can do, plus scoped team-management (`/team`). |
| **Owner** | `auth_tier = 'owner'` | Sven, Wells Struble, Andrew Cameron. Unrestricted. |

Additional scoping dimensions, independent of tier: `department_scope` (universal/market/kitchen/delivery — a manager's authorization boundary) and `location_id`/`location_tag` (market_street/carolina_beach_road — matters only within `market`). A trainee's own assigned track is tracked separately as `path`, not `department_scope` — see Database Architecture.md for the naming-overlap note.

Accounts are deactivated via `status` (`active`/`inactive`/`merged`), not deleted. **All authorization functions require `status='active' AND is_deleted=false`** — this was a real, fixed gap (2026-08-09): deactivation previously did nothing, a departed employee kept full access indefinitely.

## 2. Capability Matrix

GM is not a separate access level — it's a flag on top of Manager (§1). This matrix reflects that: three columns, not four. Where GM's authority differs from a base Manager's, that's called out inside the Manager cell rather than given its own column.

| Capability | Staff | Manager (GM noted where it differs) | Owner |
|---|---|---|---|
| View assigned training, complete self-paced steps | ✅ own only | — | ✅ any (preview) |
| Flag a training step | ✅ | ✅ | ✅ |
| Submit a full 3-field content suggestion (`/suggest`) | ❌ (flag only) | ✅ company-wide, not dept-scoped | ✅ |
| Sign off a live-practice/trainer step | ❌ | ✅ own dept+location scope; any manager for Universal-track steps | ✅ any |
| Log manager-initials (ungated acknowledgment) | ❌ | ✅ | ✅ |
| Edit Training content directly (`/admin/content`) — **tightened 2026-08-11, ADL-049** | ❌ | ❌ suggest only (title + content body, routes to `/approvals` via `suggestion_queue.step_id`) · **GM: ✅ own department, direct** | ✅ any, direct |
| Create a new track/module/step | ❌ | ✅ own department, direct (unchanged; GM: same) | ✅ any, direct |
| Edit a Checklist/SOP/Manager Guide's content or details directly — **new 2026-08-11, ADL-049** | ❌ | ❌ suggest only (`/suggest`-style, routes to `suggestion_queue.reference_document_id`) · **GM: ✅ own department, direct** | ✅ any, direct |
| Create a new Checklist/SOP | ❌ | ❌ suggest only (unchanged; GM: same, suggest only) | ✅ direct |
| Delete a Checklist/SOP/Manager Guide | ❌ | ❌ (blocked by `guard_reference_document_delete_trigger`; GM: same) | ✅ direct |
| Reorder modules within a section, or drag a module to a different section (`sequence_order`/`track_id`) | ❌ | ✅ own department only, direct (GM: same) | ✅ any, direct |
| Reorder sections (tracks) themselves | ❌ | ❌ (blocked by `guard_track_reorder_trigger`) · **GM: ✅** | ✅ any, direct |
| Author/edit quiz questions (`quiz_bank`) on a step | ❌ (read-only view of existing questions) | ❌ read-only, same as Staff · **GM: ✅** | ✅ any, direct |
| Assign a restricted/seasonal module to an employee, or end an assignment (`assignable_module_assignments`) | ❌ | ❌ read-only `/compliance` view · **GM: ✅** | ✅ any, direct |
| Approve/reject suggestions (`/approvals`) | ❌ | ❌ (GM: same, no approval authority) | ✅ only |
| Edit Sourcing Board / Portioning / Manager Notes directly | ❌ | ✅ (GM: same) | ✅ |
| Delete a Sourcing Board entry | ❌ | ❌ may submit a request, cannot approve · **GM: ✅ can submit or approve requests** | ✅ direct, or approves requests |
| Report a Delivery Issue | ✅ | ✅ | ✅ |
| Route/receive a Delivery Issue | — | ✅ (recipient pick, any manager/owner; GM: same) | ✅ |
| Complete/submit a digital checklist instance | ✅ | ✅ | ✅ (shared instance, any signed-in user) |
| View Training Queue ("needs you") | ❌ | ✅ own dept (GM: same) | ✅ all depts |
| View `/compliance` (assignable-module + overdue backlog) | ❌ | ✅ (GM: same) | ✅ |
| View `/admin/gaps` content-status dashboard | ❌ | ❌ (GM: same) | ✅ only |
| Set an employee's tier / status (`/team`) | ❌ | ❌ base Manager has no access · **GM: ✅ staff↔manager only, own dept+location, cannot touch owner rows or the GM flag itself** | ✅ any, including granting GM |
| Merge duplicate employee accounts | ❌ | ❌ (GM: same) | ✅ only |
| Preview any track as a trainee (`/preview`, `?preview=1`) | ❌ | ✅ (GM: same) | ✅ |

## 3. UI Visibility vs. Real Authorization

Per project instructions, front-end hiding is never treated as sufficient authorization on its own. This has been tested in practice, not just stated as policy — three real incidents confirm it was previously violated and then fixed:

1. **Employee deactivation (fixed 2026-08-09):** every gating function (`has_tier`, `is_manager_or_owner`, `is_gm`, `my_department`, `my_location`) matched only on `user_id`, with no `status`/`is_deleted` check. A deactivated employee's session kept full RLS-level access — this was a database-level gap, not a UI one.
2. **Owner Reference Guides filter (fixed 2026-08-07):** owners have `department_scope = null` by design; the client-side `visibleToDepartment` filter treated null as "show nothing." RLS itself was fine — the UI filter was the (non-security) bug.
3. **Sourcing Board delete (fixed 2026-08-10):** `sourcing_board_entries.is_deleted` was directly settable by any manager at the RLS level the moment a delete button existed in the UI, before `guard_sourcing_delete()` was added to block non-owners at the trigger level.

**Standing rule for any new feature:** verify the RLS policy or guard trigger directly before considering a capability "restricted." Do not infer authorization from what a screen currently shows or hides.

## 4. RLS Behavior Reference

- `can_manage_progress_for(employee_id, step_id)` is the real authorization gate for signing off progress — not a client check. Owners always pass. Managers pass for Universal-track steps regardless of their own scope; otherwise the step's track department must match the manager's `department_scope`, and for `market` specifically, `location_id` must also match.
- `guard_auth_tier()` is the real authorization gate for changing another employee's `auth_tier`, `status`, or `can_manage_team`. It enforces the full GM boundary in SQL (own dept+location, staff↔manager only, no owner rows, cannot self-grant/revoke GM) — this cannot be bypassed by a UI that simply hides the option.
- `guard_sourcing_delete()` blocks direct hard-set of `is_deleted=true` on Sourcing Board entries for anyone but an owner or GM (widened 2026-08-11, ADL-024), independent of what the delete button in the UI allows a manager to click. The `sourcing_board_delete_requests` insert policy was corrected in the same pass — regular managers previously could not even submit a delete request (a real latent bug, insert was GM/Owner-only); now any manager can submit, only GM/Owner can approve. **Remaining gap: the `/approvals` route itself is still owner-only gated in the UI**, so a GM currently has the database-level permission but no screen to exercise it — a small Lovable build item.
- All `SECURITY DEFINER` functions are technically callable via direct PostgREST RPC by any authenticated (and in most cases anon) caller — this is expected because each function internally re-derives the caller's identity via `auth.uid()` rather than trusting a passed-in employee ID, but it has not yet had an explicit recorded sign-off (see Database Architecture.md, Technical Debt).

## 5. Department/Location Scoping Details

- A **manager's** authorization scope is `department_scope` + (for market) `location_id`. This governs what they can sign off and, if edit policies mirror the same pattern, what training content they can edit directly.
- A **GM's** team-management scope is the same department_scope + location_id pairing, enforced in `guard_auth_tier()`.
- **Owners** have `department_scope = null` and are unrestricted everywhere — this null value is meaningful (means "no restriction"), not an unset default; any new department-scoped feature must treat null-for-owner as intentional, matching the fix already made for the Reference Guides filter.
- **Sourcing Board, Portioning, and huddle-card display are deliberately not department-restricted for read** (huddle cards use their own `departments` array to control which department's daily rotation includes them, which is a content-relevance filter, not an authorization boundary).

## 6. Module Reorder / Cross-Section Move — Scoping Detail (ADL-036)

**Correction (2026-08-11):** this section originally assumed Manager edits to `modules`/`tracks`/`steps` routed through `suggestion_queue` approval, matching what §2 used to say. Direct RLS audit (`pg_policies` on `modules`, `steps`, `tracks`) found that was stale — `modules_update`, `steps_update`, and (pre-fix) `tracks_write_mgr` have always granted a department-scoped Manager direct UPDATE, no approval gate. §2 is corrected to match. `suggestion_queue` is a separate, parallel path (`/suggest` → `/approvals`), not a gate in front of `/admin/content`.

Given that, module reorder/move needed **no new grant** for Managers — direct, own-department UPDATE already covered `sequence_order` and (by the existing `modules_update` policy shape) already rejects a cross-department `track_id` change today: `WITH CHECK` re-evaluates against the *new* row, so if a Manager retargets a module's `track_id` to a track outside `my_department()`, the check fails and Postgres rejects the write. No migration needed for this half.

Section (track) reorder was the real gap: `tracks_write_mgr` let any department-scoped Manager change their own track's `sequence_order` directly — which resorts the shared admin list for everyone, not just their department. Added `guard_track_reorder()` (before-update trigger on `tracks`, same pattern as `guard_sourcing_delete()`) that raises an exception if `sequence_order` changes and the caller is not Owner or GM. Other track fields (name, description, department, etc.) are unaffected — Managers keep direct edit there. Live in Supabase (migration `guard_track_reorder`, 2026-08-11).

Neither capability introduces any new delete path — soft-delete of a module/section remains governed by the existing rules elsewhere in this document; reorder/move only ever touches `sequence_order` and `track_id`, never `is_deleted`.

## 7. Quiz Authoring and Module Assignment — GM+Owner Only (ADL-039, ADL-040)

Two capabilities are scoped narrower than the general "Manager, own department, direct" pattern that governs most content edits: authoring `quiz_bank` questions, and creating/ending an `assignable_module_assignments` row. Both are Sven's explicit call (2026-08-11) — quiz correctness has real safety/compliance weight, and module assignment is the same weight of decision as team-tier management (`guard_auth_tier()`, already GM+Owner-only).

Enforced at the RLS level, not just the UI: `quiz_bank` and `assignable_module_assignments` insert/update policies check `is_gm() OR has_tier('owner')`, narrowed from the general `is_manager_or_owner()` pattern via migrations `restrict_quiz_bank_write_to_gm_owner` and `restrict_assignable_module_assignments_write_to_gm_owner`. A regular (non-GM) Manager can still *read* both — existing quiz questions on a step they're editing, and the existing `/compliance` assignments table — but has no write path at either the UI or database level.

## 8. Content-Edit Governance Realignment — GM Direct, Manager Suggests (ADL-049)

**Superseded by this section:** §6's note that "a department-scoped Manager [has] direct UPDATE, no approval gate" on `tracks`/`modules`/`steps` was accurate through 2026-08-11 but is no longer the live rule. §2's matrix above reflects the corrected, current state; this section records why and exactly what changed.

Sven's direct call (2026-08-11): a regular (non-GM) Manager should never be able to change training content or reference-document content without Owner review — they can suggest, not publish. A GM (functionally, "one person per location/instance" — e.g. the Kitchen Operations Manager holding `can_manage_team = true`) is trusted the same as before: direct edit, own department, no queue. This is a **tightening** for training content (Managers previously had direct edit per ADL-036) and a **widening** for reference documents (previously Owner-only for everyone but Owner; GM now also gets direct edit, still short of Owner).

What changed, by table:
- **`tracks`/`modules`/`steps` UPDATE**: RLS narrowed from `has_tier('manager') AND own department` to `is_gm() AND own department` (Owner unaffected). **INSERT is unchanged** — any Manager, GM or not, can still create a new track/module/step directly in their own department; only *editing existing* content tightened. A regular Manager viewing a step in their own department now sees title + content body editable with a "Submit for approval" action (inserts into `suggestion_queue` with `step_id` set — that column existed, unused, before this change); every other field (step type, status, media, location tag) is read-only for them, matching exactly what `/approvals`'s existing auto-apply-on-approve logic knows how to publish (title + content_body only). Track/Module metadata panels (`TrackEditPanel`/`ModuleEditPanel`) are now GM+Owner edit-only with no suggestion fallback — no `track_id` column exists on `suggestion_queue`, and this wasn't asked for; a regular Manager simply sees them read-only now, same as the existing cross-department pattern.
- **`reference_documents` UPDATE**: RLS widened from Owner-only to `has_tier('owner') OR (is_gm() AND own department)`. A new trigger, `guard_reference_document_delete()` (same pattern as `guard_track_reorder`/`guard_sourcing_delete`), blocks anyone but an Owner from setting `is_deleted = true` — since soft-delete is implemented as a plain UPDATE on this table, without the guard a GM's new edit grant would have silently also granted delete. **INSERT (creating a new Checklist/SOP) is unchanged** — Owner-direct, GM and every other Manager still route through `suggestion_queue` via `NewDocumentDialog`, exactly as before. `LineItemEditor`, `SectionBodyEditor`, and the newer `DocumentMetaEditDialog` (title/group/departments/location) all now branch on `isOwner || isGeneralManager` instead of `isOwner` alone for the direct-vs-suggest save path.
- **`/approvals`**: unchanged in who can *review* — still Owner-only (a GM is not granted suggestion-approval authority by this change, only direct-edit authority for their own work). Intro copy corrected to stop implying any manager's own-department edits still route through here.

**Known gap, not fixed in this pass:** the `/approvals` auto-apply-on-approve logic only actually publishes step suggestions (`s.step` case: title + content_body + `content_status: 'ready'`). Reference-document suggestions (line-item, section-body, or document-detail proposals from a regular Manager) mark the queue row `approved` but do **not** automatically write anything to `reference_documents` — an Owner approving one today has to separately go make the edit themselves using the suggestion text as a reference. This predates 2026-08-11 and wasn't introduced by this change, but is now more load-bearing since regular Managers rely on it more. Flagged to Sven; not built without a separate scoping conversation (three different suggestion shapes — line items, section body, document meta — would each need their own apply logic, real but not asked-for scope).

**Person-level note:** `can_manage_team = true` is the mechanism for "one GM/Kitchen-Operations-Manager per location/instance" — no new tier or schema needed, per ADL-013. As of 2026-08-11 no Kitchen employee account exists yet for Emily or Kelly (self-registration via magic link, ADL-002 — they haven't signed up), so this flag has not been set for anyone in Kitchen yet. When Emily's account is created, set `can_manage_team = true` for her only (not Kelly), consistent with "only one person at each location," via `/team` (Owner-only action per §2, "grant GM").

## 9. Approved 2026-09-24, Not Yet Built (ADL-103)

Target state once the Stage 1 build is verified. §2 above still describes the live app until then. **Database side live 2026-09-24:** create restricted to Owner/GM own division, section delete guarded (Owner only), GM review access to their team's suggestions. UI side built 2026-09-24 (Stage 1 prompts 1-3); pending Sven's browser test, after which §2 gets rewritten to match.

- **Create sections, modules, steps:** Owner, or GM in own division. Regular Managers suggest.
- **Reorder modules and steps:** Owner, or GM in own division. Regular Managers suggest. (Database already enforces this; UI to follow.)
- **Delete a whole section (track):** Owner direct; GM submits a request, Owner approves. New `guard_track_delete()` trigger.
- **Review suggestions and flags:** Owners (all) and GMs (from their own team, or about their own division's content). Owner-only request types (delete module/section/document, new document) are never GM-reviewable.
- **Approvals never write step content from a suggestion.** Reviewers open the step and edit it in the real editor.
- **Portioning & Presentation:** GM direct, Manager suggests (moves out of the ADL-014 operational group). Separate follow-up build.
- **Unchanged:** Sourcing Board, Manager Notes, Delivery Issues stay Manager-direct. Hard-delete exceptions to ADL-005: `merge_employees()`, the 30-day Manager Notes purge, and the trash button on an already-hidden step block.
