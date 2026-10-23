
# Product Constitution — Biggers Training Platform

Status: Authoritative. Last audited: 2026-08-10.
Source hierarchy for this and all governance files: (1) Sven's most recent explicit instruction, (2) approved current app behavior/architecture (live Supabase + Lovable code), (3) these governance files, (4) existing project documentation in Drive, (5) older source/historical materials. Conflicts are flagged, never silently resolved.

This document does not restate the full project instructions already governing this workspace. It records the mission, principles, and hard rules as they apply to the *actual system being built*, and exists so a new Claude session or Lovable prompt does not have to re-derive them from chat history.

---

## 1. Product Mission

Replace Biggers Market's informal onboarding (a shared video-folder link) with an operational training system that gets new hires productive inside a non-negotiable 4-day window, keeps ~100 employees across Markets, Kitchen, and Delivery current on procedure, and gives managers and ownership structural visibility into who still needs what — instead of relying on a document existing or a manager remembering to teach it.

The platform is not a training repository. It is the operational nervous system for how a new hire learns the job, how a working employee finds an answer mid-shift, and how a manager knows where intervention is required today.

## 2. Target Users

- **Employees (staff tier):** new hires in their 4-day onboarding window, and existing staff using the app as a daily reference.
- **Managers (manager tier, optionally General-Manager-flagged):** department/location leads (Store GMs, Kitchen Ops Manager, Delivery Manager) who sign off live-practice steps, run the daily huddle, edit their department's operational content, and increasingly (as GMs) manage their team's access tier.
- **Owners:** Sven, Wells Struble, Andrew Cameron — full access, approve all suggestions, edit anything directly, own the merge tool and company-wide visibility screens.

## 3. Employee Experience Principles

- Know what to do next without navigating menus — the home screen leads with today's required action, not a dashboard.
- Learn in a fixed, protected sequence: Universal/Hospitality Day 1 always first; within any day, all self-paced content comes before that day's single trainer stop, never interleaved.
- Get a fast, trustworthy answer mid-shift — this is why cross-entity Search and the grounded "Ask" assistant exist as first-class, not buried, features.
- Never see fabricated or padded content — a missing photo/video/step must render as visibly incomplete, not silently absent.
- Preview and browse (Training Library) exist for legitimate refreshing; they must not blur with the tracked, gated onboarding path.

## 4. Manager Experience Principles

- See exceptions, not raw data. "Who needs me right now" (Training Queue's "Needs you") outranks "what happened historically" (Compliance's backlog view) as the default framing.
- Structural enforcement over memory. Any step requiring a manager action is a visible, queued, per-employee requirement — never a document that exists but nobody is prompted to use (the "Hot Side Crutch" lesson).
- Operational content a manager needs to change constantly (Sourcing Board, Manager Notes, Delivery Issues, Portioning references) is direct-edit, no approval queue. Curated training/reference content a manager edits routes through owner approval. This split is deliberate — see [[Roles and Permissions]] and ADL-014.
- A manager's own department/location scope is a real authorization boundary (RLS), not a UI convenience.

## 5. Owner/Admin Experience

- One authoritative version of every piece of operational knowledge, with full version history and no hard deletes, ever — a departing or disgruntled manager cannot destroy content.
- Structure-first, content-backfilled: `content_status` (ready / needs_restructuring / missing / blocked) lets the shape of the app be visible before every piece of content is finished, surfaced live on `/admin/gaps` rather than tracked in a separate spreadsheet.
- Owner preview of a module must render exactly as a trainee sees it, aside from legitimate admin affordances (edit/delete, sign-off controls, manager/owner-only landing sections). This is a standing, previously-violated-and-fixed requirement — see [[feedback_owner_preview_matches_trainee_view]] and ADL-016.
- Modular architecture is a locked requirement: editing one module/step must never cascade unintended changes elsewhere.
- **Growth without a Lovable session, as the default expectation, not the exception.** Sven's explicit standing goal (2026-08-11): as Biggers grows, adding a new training area, module, or position should be something he/Wells/Andrew do inside the app, not something that requires coming back to Claude/Lovable every time. This is why the platform is built around Tracks/Modules/Steps as data, not code — `/admin/content` already lets an Owner (or a Manager, within their department, via the approval queue) create a new Track, Module, or Step directly, and a new "position" is modeled as an `is_assignable` module (the same mechanism already used for Bartender/Forklift/Leadership), not a code change. **One real remaining exception, tracked as open work:** a genuinely new *department* (a 5th silo beyond Universal/Market/Kitchen/Delivery) requires a schema change, because `employees.department_scope` is a fixed Postgres enum, not free text — see Database Architecture.md. New tracks/modules/positions *within* the four existing departments need no schema change and no Lovable session. **Resolved 2026-08-11:** Huddle Cards and Manager Notes now have a real in-app authoring screen (`/huddle-notes`) — the last content type that used to require direct SQL.

## 6. Product Decision Hierarchy

Unchanged from project instructions, restated for reference when making a build call:

1. Employee comprehension
2. Speed to complete the intended task
3. Clear primary action
4. Mobile usability
5. Operational reliability
6. Consistency across the application
7. Maintainability and clean architecture
8. Administrative efficiency
9. Visual polish
10. Novelty

## 7. Navigation Philosophy

The aspirational conceptual navigation in the project instructions is Home / Learn / How-To / Checklists / Me. **The live app does not yet map cleanly onto this** — see Information Architecture.md §3 for the actual route list and the gap analysis. In short: Home ("/") and Learn (`/modules/$id`, `/training-library`) exist and match intent; How-To and Checklists are merged into one `/reference` shell (Sourcing / Checklists / SOPs / Presentation tabs); there is no standalone "Me" (profile/progress) screen — progress lives embedded in Home. This is not being called a defect by default (progress is genuinely visible on Home today), but it should be treated as a deliberate simplification to confirm, not an accident to silently perpetuate. See Current Build State.md, Known UX Issues.

Owner/manager navigation was deliberately regrouped (2026-08-07) from 14 flat top-level items into ~6 (Today/Search/Reference always visible; Training Queue top-level; Content and Admin as dropdowns; one account menu) specifically to keep primary-action clarity on mobile. Any new manager/owner screen must fit into this grouping, not add a 7th top-level item, without a stated reason.

## 8. Mobile-First Requirements

Most training happens on a phone. This is enforced today via a hamburger/slide-out nav below the `md` breakpoint carrying the same grouping as desktop, and an `admin-dense` CSS mode that shrinks density specifically on manager/owner screens (trainee-facing screens stay roomier). Any new screen must be designed mobile-first, not adapted after the fact.

## 9. Search Philosophy

Search must answer an operational question ("customer says the watermelon was rotten"), not require knowing which folder or track a document lives in. Today this is implemented two ways, both live: a cross-entity keyword `/search` across modules/steps/sourcing/reference documents, and a strictly-grounded "Ask" assistant (retrieval-first, LLM only phrases the answer from matched rows with a citation, hard-coded refusal to guess on ungrounded questions — a deliberate safety control given food-safety stakes). Any future search or AI feature must preserve the no-guessing guarantee; this is a governance-level constraint, not a style preference.

## 10. Progressive Disclosure Principles

- Trainees see only their current gated step and what's already complete; the full Training Library exists separately for anyone who wants to browse ahead or review.
- Admin-only fields (`content_notes`, `media_recommendation`, `media_recommendation_note`) never render to trainees or inside `/preview`, by explicit design and by DB-comment-documented intent.
- Card-grid vs. numbered-list rendering, `## ` sub-headings, and manager-initials-vs-full-signoff are all judgment calls made per content type, not universal rules — see Training Architecture.md and Design System.md for when to use which.

## 11. Rules for Avoiding Unnecessary Complexity

- Don't build a new top-level screen, table, or role tier when an existing mechanism already covers the need (the General Manager tier was added as a boolean flag on the existing manager tier, specifically to avoid re-auditing every RLS policy for a new enum value — ADL-013).
- Don't add a notification/push system on top of a rejected one — an owner-only "overdue backlog" view was chosen over per-employee alerts because Sven explicitly rejected notification noise once already (Training Queue escalation, 2026-08-05); the same call was reapplied to checklist-review accountability without re-asking.
- Don't fork a whole track per location; tag individual steps/documents with a `location_tag` on one canonical record instead (locked since the original spec, implemented via `employees.location_id` and `*.location_tag` fields).

## 12. Core Product Invariants

- Training, SOP, Checklist, Policy, and Reference are distinct content concepts. **Current state deviates from this on one point: Policy is not yet a distinct object type** — see Information Architecture.md ISSUE-01. This governance layer records the invariant as intended; it does not silently reclassify existing data to match it.
- No hard deletes, ever, on content tables (soft-delete + full version history). One documented, approved exception exists in `merge_employees` for true duplicate-account records — see Database Architecture.md and ADL-011.
- RLS is the actual security boundary. Client-side filtering is convenience only. This has already been violated and fixed three separate times (owner Reference Guides filter, employee deactivation, Sourcing Board delete) — treat any new feature's authorization as unverified until RLS is checked directly, not just the UI.
- Every module/step/document carries a location field even where multi-location content isn't yet written, to avoid a later data-model fork.
- Opened/viewed is never proof of competency. Status vocabulary (not_started/in_progress/completed/signed_off) and step types (text/photo/video/quiz/doing_signoff/supervised_live_practice) exist specifically so verification matches operational risk.

## 13. What the Platform Is Explicitly Not

- Not a payroll, scheduling, or legal-document system (Homebase and paper forms remain authoritative for W4/I9/scheduling; the platform only computes onboarding-completion state).
- Not a certification-tracking system for regulatory credentials (CFPM/ServSafe/OSHA) — this was explicitly decided out of scope; Sven audits certification coverage manually. See ADL-017.
- Not a vendor/distributor directory — explicitly proposed and explicitly rejected by Sven (2026-08-09). Do not resurface this without a new, explicit request.
- Not a generic document repository or a clone of the Google Drive folder structure — Drive is a source repository, not the target information architecture.
- Not a real-time collaboration tool — shared checklist instances assume sequential hand-off (one person picks up where the last left off), not simultaneous multi-user editing.

## 14. Non-Negotiable Product Rules

Future Claude sessions and Lovable prompts must not violate these without explicitly surfacing the conflict to Sven first:

1. Owner preview of any module must render exactly as a trainee sees it, admin controls aside.
2. Exactly one trainer stop (`doing_signoff` / `supervised_live_practice`) per calendar training day, regardless of how many modules or skill areas feed into it.
3. No hard deletes on content tables outside the one approved merge-tool exception.
4. `content_status` placeholders (missing/blocked) must never render as if content exists; never fabricate content to fill a gap.
5. Admin-only fields (`content_notes`, `media_recommendation*`) never reach trainee-facing rendering, including `/preview`.
6. Client-side role/department checks are never sufficient authorization on their own — every new writable feature needs its own RLS policy reviewed, not inherited by assumption.
7. Don't design any critical learning path to depend on a manager reliably remembering to deliver it live — build the structural queue/gate instead.
8. Don't add a vendor directory, a per-employee notification/alert feed, or a Homebase sync without a new explicit request — all three were proposed and explicitly rejected once already.
9. New training areas, modules, and positions must be addable by Sven/Wells/Andrew inside the app (via `/admin/content` and the `is_assignable`-module pattern), not require a new Lovable build, unless the request genuinely needs a new content *type*, a new *department*, or a new *permission tier* — those are schema/code changes and should be named as such, not quietly treated as "just add a module."
