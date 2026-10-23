
# Information Architecture — Biggers Training Platform

Status: Authoritative. Last audited: 2026-08-10, against live Lovable routes and Supabase schema (project `kouyxrwnzjphuvnvxwyj`, Lovable project `23de8112-f5cb-48b9-ad2c-a85026287649`).

See [[Product Constitution]] for the principles this structure serves. This document records the *actual* current structure, notes where it diverges from the aspirational structure in project instructions, and flags real gaps rather than silently redesigning around them.

---

## 1. Content Type Taxonomy

Five conceptual types are mandated by project instructions: Training, SOP, Checklist, Policy, Reference. Current implementation status of each:

| Type | Definition | Implemented as | Status |
|---|---|---|---|
| **Training** | Content an employee is expected to learn, sequenced, gated, trackable to completion/sign-off. | `tracks` → `modules` → `steps` (step_type: text/photo/video/quiz/doing_signoff/supervised_live_practice), tracked via `progress_records`. | Fully implemented. |
| **SOP** | Operational instructions for fast reference during a task, not necessarily linear. | `reference_documents` with `document_type = 'sop'`. | Fully implemented (e.g. Rush Sequencing, POS Item Entry). |
| **Checklist** | A record that specific work was performed, with identity/date/location and optional sign-off. | `reference_documents` with `document_type = 'checklist'` (the template) + `checklist_instances`/`checklist_line_completions` (the live per-day-per-location record). | Fully implemented, including the completion-record layer (Phase 3, shipped 2026-08-09). |
| **Policy** | An authoritative business rule that may require acknowledgement. | **Not a distinct object.** Currently folded into Training steps (e.g. Handbook & Code of Conduct Essentials is a `text` step) with an informal "manager-initials" witness mechanism (`steps.supports_manager_initials`) standing in for acknowledgement. | **ISSUE-01, see below.** |
| **Reference** | Standing information, no assignment/completion/testing required. | `sourcing_board_entries`, `presentation_reference_entries`, `huddle_cards`, `manager_notes`. | Implemented, but two of these (huddle_cards, manager_notes) have no dedicated management screen — see §5 gap. |

**ISSUE-01**
- CURRENT BEHAVIOR: Policy content (Handbook essentials, Code of Conduct, harassment/discrimination reporting) is modeled as an ordinary Training step with an optional lightweight "manager-initials" witness mark. There is no `policy_acknowledgements` table, no versioned "you acknowledged policy version X" record, and the actual Employee Handbook remains a paper document outside the app entirely (confirmed 2026-08-10: the app step is orientation copy + a topic list only, not digitized policy text).
- WHY IT MAY BE A PROBLEM: If a policy changes (e.g. dress code, harassment reporting process) there is no structural way to know who acknowledged the old version vs. the new one, and no audit trail distinct from ordinary training-step completion. This is a real compliance-adjacent gap, not just a taxonomy nicety, especially for anything HR/legal-adjacent.
- RECOMMENDED DECISION: Introduce a genuine `policy` step_type (or a lightweight parallel `policy_acknowledgements` table keyed to a policy version) once real digital policy content exists — not needed while the Handbook stays paper-based, but should be built before any policy content is digitized in-app.
- IMPACT IF CHANGED: New enum value or new table, new RLS, one new UI treatment (acknowledge button vs. sign-off vs. manager-initials). No impact on existing Training/SOP/Checklist data.
- **This is a flag, not a change. No schema modification has been made.**

## 2. Content Hierarchy

```
Track (Universal / Market / Kitchen / Delivery[deferred])
  └─ Module (sub_path, day_assignment, sequence_order, is_assignable for restricted/compliance modules)
       └─ Step (step_type, content_status, content_body, media_url/video_url, location_tag)

Reference Document (document_type: checklist | sop)
  └─ Sections (jsonb) → Line items (checklists only)
       └─ Checklist Instance (per document, per day, per location — shared, not per-employee)
            └─ Line Completions

Sourcing Board Entry (flat, unscoped by department)
Presentation Reference Entry (Portioning, department-scoped)
Huddle Card (deterministic daily rotation, department-scoped)
Manager Note (date + department + location scoped, ephemeral/operational)
Delivery Issue (report → routed to a named manager/owner recipient, status tracked)
```

`is_assignable` modules (Leadership path, Bartender, Forklift, alcohol receiving) sit outside the 4-day onboarding window and are assigned ad hoc via `assignable_module_assignments`, reusing the same Module/Step structure — no separate content model was built for this, by design.

## 3. Navigation — Actual vs. Aspirational

Project instructions specify a conceptual employee nav of **Home / Learn / How-To / Checklists / Me**. Actual live routes, audited directly from `src/routes/`:

| Route | Audience | Maps to conceptual nav as |
|---|---|---|
| `/` | staff+ | Home (employee: up-next + progress; manager/owner: Daily Brief — huddle card, manager notes, "assigned to you" queue) |
| `/modules/$moduleId` | staff+ | Learn (the actual step flow; supports `?preview=1` and `?trainee=` params) |
| `/training-library` | staff+ | Learn (browse-all, non-gated) |
| `/reference/sourcing`, `/reference/checklists`, `/reference/sops`, `/reference/presentation` | staff+ (edit gated) | How-To + Checklists, merged into one tabbed shell |
| `/search` | all | cross-cutting, not a distinct nav concept |
| — | — | **No distinct "Me" screen exists.** Progress is embedded in Home, not a separate profile/progress destination. |
| `/training-queue` | manager/owner | not in the conceptual employee nav — manager-only |
| `/suggest`, `/approvals`, `/admin/content`, `/admin/gaps`, `/team`, `/compliance`, `/merge-tool`, `/preview` | manager/owner | admin/manager surface, outside the employee conceptual nav entirely |

**Resolved 2026-08-10 (ADL-022):** a "Me" screen will be built — a single place to see everything completed/assigned across all tracks. It is reached via the existing account/profile entry point, **not** a new top-level nav item, per Sven's explicit nav-discipline preference. Additive only (a new read query over `progress_records` joined to assigned tracks/modules) — no restructuring of Home or Training Library. Not yet built — see Current Build State.md.

Owner/manager nav is deliberately grouped (Today/Search/Reference always visible; Training Queue top-level; Content dropdown for Suggest/Approvals/Content-editor/Preview/Gaps; Admin dropdown for Team/Compliance/Assign Training/Merge; one account menu) — see Product Constitution §7.

**Assign Training (`/assign-training`, live 2026-08-18, ADL-063):** added as its own labeled item in the Admin dropdown, not a new top-level nav item, per the same nav-discipline principle as the "Me" screen decision above. Split out of Compliance's former "Assignments" card, which owners found hard to discover. Browses `is_assignable` modules grouped by Division then by a new `modules.category` field (nullable text, division-agnostic, same Select-from-existing-values + "Custom…" pattern as `sub_path` per ADL-060). Opens the same New Assignment dialog Compliance already used, unchanged. Manager role gets read-only access; GM+Owner get the Assign and New Module actions, matching the existing RLS already enforced on `assignable_module_assignments`, no RLS change. Compliance itself is unchanged apart from the Assignments card's removal — it still owns the overdue sign-off backlog.

## 4. Search Behavior

Two distinct mechanisms, both live, serving different intents:

- **`/search`** — keyword search across modules, steps, sourcing board entries, and reference documents. RLS-scoped, skips `content_status = missing/blocked` placeholder content. For browsing/reference lookup.
- **"Ask" assistant** (embedded on Home) — retrieval-first, LLM-phrased-only answer with a citation back to source; hard-coded fallback ("I don't have that in the system yet, check with a manager") when nothing matches. Never freeform/ungrounded. For fast, safety-adjacent operational questions ("customer says the watermelon was rotten").

Any future search enhancement must preserve: RLS scoping, placeholder-content exclusion, and the Ask assistant's no-guess guarantee.

## 5. Tagging Principles

- **Division** (labeled "Division" in the UI as of ADL-051; the underlying columns/enum are still named `department`/`department_scope`, unchanged): `reference_documents.departments` (array — supports multi-division docs like POS Item Entry, tagged `['kitchen','market']`), `huddle_cards.departments` (array), `manager_notes.departments` (array), `employees.department_scope` (single enum, used for manager authorization scope), `employees.path` (single text value, the trainee's assigned onboarding track). "Department" is deliberately reserved as a term for a real, narrower, not-yet-modeled concept — a section within one store location (e.g. Produce Department, Meat Department) — one level below Location, which the `department` enum's four values (universal/market/kitchen/delivery) sit above. **Note the naming overlap between `department_scope` and `path` — both represent "which division" but serve different purposes (authorization scope vs. assigned track) and are separate fields with separate semantics. Not a bug, but a naming risk for future developers — see Database Architecture.md ISSUE.**
- **Location:** `employees.location_id`, `tracks.location_tag`, `steps.location_tag`, `reference_documents.location_tag` — all plain text (`market_street` / `carolina_beach_road`), deliberately not an enum, for extensibility as locations are added.
- **Content status:** `content_status` (ready/needs_restructuring/missing/blocked) on steps, tracks-adjacent content, and reference documents — drives both trainee-facing placeholder rendering and the live `/admin/gaps` dashboard.

## 6. Where Each Content Type Belongs — Quick Reference

- New onboarding content for a track/day → `modules`/`steps`, gated, sequenced, one trainer stop per day.
- A standing "how do I do X" reference with no completion tracking → `reference_documents` (SOP) or `presentation_reference_entries` (Portioning).
- A recurring compliance record (opening checklist, cleaning log) → `reference_documents` (checklist template) + `checklist_instances`/`checklist_line_completions` for the daily record.
- A daily-rotating hospitality talking point → `huddle_cards`.
- A short-lived operational heads-up (truck arriving late, event today) → `manager_notes`.
- A quality/vendor problem needing a specific person's attention → `delivery_issues`.
- A restricted/regulated skill outside the 4-day window (Forklift, Bartender, Leadership path) → an `is_assignable` module, assigned via `assignable_module_assignments`. Do not build a parallel content model for these.

## 7. Explicit Non-Recreation of Drive Structure

The Google Drive folder tree (Project Knowledge Import, per-track draft docs, per-station checklists) is a **source repository**, not the target IA. None of it has been, or should be, mirrored 1:1 into the app's navigation. The Reference Library's structure (Checklists / SOPs / Presentation, department- and location-tagged) is the intentionally different, employee-facing reorganization of that same underlying content.
