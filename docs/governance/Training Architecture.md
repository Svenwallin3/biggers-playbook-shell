
# Training Architecture — Biggers Training Platform

Status: Authoritative. Last audited: 2026-08-10. Claude acts as the instructional-design authority on this project by standing mandate from Sven, not as a transcriber of source documents — see [[feedback_training_content_design_principles]]. This document formalizes the rules already governing content decisions, so they don't have to be re-derived or re-argued each session.

---

## 1. Evidence Base (do not cite the debunked alternative)

Governing rules below are backed by retrieval practice / spaced repetition (fact retention, well-supported, 2-3x passive re-reading), deliberate practice with feedback (skill acquisition), and Gagné's instructional-events sequencing (tell → show → do). **Do not cite the "95% video / 10% text retention" statistic or the "Cone of Learning" anywhere in this project — both are discredited and have no real empirical backing**, despite being ubiquitous in training-vendor marketing content.

## 2. Onboarding Structure

- **4-day onboarding window is non-negotiable**, given the high-turnover, college-age, part-time workforce. Specialty/restricted content (Forklift, Bartender, alcohol receiving, Leadership path) lives outside this window entirely, assigned later via `is_assignable` modules.
- **Day 1 is Universal/Hospitality for every employee**, regardless of track — currently live: Clock In & Get Set Up (ungated, first) → Handbook & Code of Conduct Essentials (paper handbook remains authoritative; the in-app step is orientation copy + topic list only, not digitized policy text) → Welcome video → Hospitality Standards → one end-of-day trainer block (role-play + facilities walkthrough + sign-off). "Universal" describes this shared skeleton, not identical content for every track — for Kitchen specifically, four self-paced safety modules (Hazard Awareness, Food Safety Numbers & Storage, Allergen Awareness, the Food Safety & Allergen Quiz) also run on Day 1 now, after the Universal modules and before the trainer block, per ADL-052. The single end-of-day trainer stop stays Hospitality-only; the hands-on reinforcement of that safety content still happens the next day, on Day 2's trainer walkthrough.
- **Days 2-4 are track-specific** (Market or Kitchen; Delivery deferred to a single-page SOP, not a full track). Day 4 is always supervised live practice with real customers — a distinct step type (`supervised_live_practice`), never passive shadowing.
- **Sequencing principle:** order by first-shift utility (what an employee will actually do in hour one), not topical/company-history logic.
- **Cross-training** (an employee learning a second track later) reuses the exact same modules via the `is_assignable` mechanism — there is no separate, lightened cross-training content path. Rejected alternative: a shortened parallel Days 5-6 track, dropped in favor of just assigning the second track's normal Days 2-4 whenever relevant.

## 3. Module / Step / Day Rules

- **`day_assignment` lives on `modules`, not `steps`.** Every step in a module inherits that module's day. A step that must move to a different day than its module requires creating/using a different module at the correct day and moving just that step — never editing the shared module's `day_assignment` (this would silently drag every other step in it along too; a near-miss of exactly this mistake was caught and reverted once already).
- **Exactly one trainer stop (`doing_signoff` or `supervised_live_practice`) per calendar training day, full stop.** Not one per module, not one per skill area, regardless of how many modules or skill areas feed into that day. All self-paced content for the day comes first; all of that day's hands-on content is folded into one combined walkthrough with one title, one body, one sign-off action. This was tightened through direct correction — an earlier "one per module" and then "one per logical group" design were both rejected as still too many manager interruptions.
- **Manager-initials vs. full sign-off:** two distinct verification mechanisms exist on purpose. `supports_manager_initials` is a lightweight, ungated witness mark (used for Handbook, Facilities Walkthrough — acknowledgment-type content that shouldn't block progression). `doing_signoff`/`supervised_live_practice` is the real, gated certifying event. Do not use manager-initials as a substitute for genuine skill certification, and do not gate simple acknowledgment content behind full sign-off.
- **Ungated-step ordering workaround:** because the day-grouping logic always pushes gated/trainer steps to the end of the day, a step that must happen literally first (Clock In) is modeled as a plain ungated `text` step, not `doing_signoff`, even though a manager is physically present for it. This is a deliberate architectural choice, not an oversight — see ADL-018.
- **Manager Guides must stay in sync with any day/order change.** The day-based Manager Walkthrough Guides (ADL-045) are sourced from live step content, not authored independently of it. Any change to a module's `day_assignment`, a step's `sequence_order` within a day, or a step's substantive content on Day 1-4 requires checking that day's Manager Guide in the same pass and updating it if it now describes something stale — a moved or reworded step and its Manager Guide entry are one unit to maintain, not two independently-drifting artifacts. Sven's direct standing instruction (2026-08-11).
- **Authority gate on automated guide edits (ADL-102, 2026-08-26).** The weekly `manager-guide-drift-check` scheduled task has standing write authority to fix stale step/module references inside a Manager Walkthrough Guide directly, no approval needed — but only when the curriculum (`steps`/`modules`) changed *after* that guide's own `updated_at`. If Sven has touched a guide on or after the current curriculum state, any apparent mismatch is treated as an intentional authorial choice, never as drift to correct — the check skips it silently, no edit, no flag. This is a per-guide, per-department/day timestamp comparison, not a global one. The check is also barred from ever reorganizing a guide's section structure (Stops, track groupings, headers) — only inline stale references inside existing sections are in scope; section architecture is Sven's call.

## 4. Format Selection Rules (the "Christmas Tree" pattern)

Text is the default for every module. Beyond that, format is chosen per content type, not applied uniformly:

- **Photo:** wherever correctness is visual and static (produce table facing, cooler stacking, correct label, plating, a before/after display comparison). Cheap, no filming required.
- **Video:** reserved for motion/technique skills only (knife cuts, wrap technique, pallet jack, forklift, running a register, equipment operation, cleaning technique). Kept deliberately scarce (originally scoped ~15-25 clips company-wide) — this is a stated constraint, not a suggestion to loosen casually.
- **Quiz:** short (3-5 question) checks, only where a wrong answer has real consequences (food safety numbers, alcohol/age verification, cash handling, EBT/SNAP rules). Skip quizzes on anything already certified by live demonstration — explicitly decided not to add a redundant quiz on top of Kitchen Days 2-4 content, since POS accuracy and hospitality-under-pressure are already tested live at Day 4. Same question banks reused for day-7/day-30 spaced-retention checks.
- **Doing (live practice, trainer sign-off):** always the actual certification. Text/photo/video shorten and standardize the shadowing — they never replace it.

## 5. Behavioral vs. Factual vs. Procedural Content

- **Behavioral/interpersonal skills** (hospitality, customer interactions, complaint handling): live role-play with manager feedback is the actual skill-building and certifying mechanism, not a substitute question. Video/text provide consistent modeling beforehand — a structural guarantee the modeling actually happens the same way regardless of which manager is training that day — not a replacement for the live practice itself. **Department-specific role-play scenarios must be genuinely substantively different when the real situation differs** (a kitchen service-window interaction is not the same as a market-floor interaction) — a shared script with a couple of swapped nouns is not acceptable; each department needs its own real scenario content where the substance actually differs. Where department differences are truly cosmetic (a name, a location reference), one shared module with tagged variants is correct and was chosen for most of Hospitality Day 1.
- **Knowledge/factual content** (food safety numbers, policy, procedures): concise instruction plus retrieval-practice quizzes is the right base — no live component required by default.
- **Procedural skills:** concise numbered steps, photo when visual recognition matters, video only when motion/technique materially improves understanding, manager sign-off when physical execution must be verified. Do not default to video for procedural content that photo or text already covers adequately.

## 6. Structural Enforcement Over Manager Memory

Biggers' manager-led live training is not reliably executed in practice today — the written manager guides describe the intended process, not a guaranteed one (see [[project_biggers_training_manager_followthrough]]). **Do not design any critical learning path to depend on a manager reliably remembering to deliver it.** Where a manager action is required, the platform surfaces it as a visible, per-employee, queued requirement (Training Queue's "Needs you" section) — never a document that merely exists and hopes to be found. This principle is directly evidenced by a real internal example: the "Hot Side Crutch" portioning reference existed, was thorough, and per Emily's own account, "nobody would ever use it."

## 7. Reinforcement Mechanisms

- **Standard of the Day / Huddle Cards:** daily-cadence reinforcement (not weekly/monthly), delivered as a fixed line item inside the daily opening checklist so it survives manager-reliability risk structurally rather than depending on memory. Deterministic day-of-year rotation per department's eligible content pool, each card owner-approved once before entering rotation. Explicitly **not** stacked with a second new weekly live-practice layer — decided against adding a second manager commitment before the daily huddle habit is proven.
- **Daily Huddle** is a first-class manager-training deliverable in its own right (a short "How to Run the Daily Huddle" guide, under 3 minutes, 3 fixed parts), company-wide, not Kitchen-specific.
- **Spaced retrieval:** day-7/day-30 quiz reuse for knowledge content, using the same question banks as the original module quiz. Scheduling mechanism for triggering these is still an open technical decision (see Current Build State.md, Pending Decisions).
- **Cleanliness/compliance and hospitality decay are treated as two different problems, not one:** cleanliness is a completion-tracking gap, solved by the digital checklist submission-gate (every line checked or flagged before submission is allowed) — not a training-cadence problem. Hospitality is a genuinely decaying behavioral skill needing its own recurring mechanism (the daily huddle). Do not conflate a compliance-tracking fix with a skill-reinforcement fix.

## 8. Certification / Status Vocabulary

Per project instructions and as implemented: `not_started` / `in_progress` / `completed` / `signed_off` on `progress_records`. "Opened" or "viewed" is never treated as proof of competency — completion of a self-paced step is trusted at face value ("trust that they watched the video" is a standing, deliberate decision — no watch-verification layer has been or will be built), but anything requiring real competency verification uses `doing_signoff`/`supervised_live_practice`, gated, with a named manager attached via `signed_off_by`.

**CertificationRecord (formal regulatory certifications — CFPM, ServSafe, OSHA) is explicitly out of scope for the app.** Sven audits certification coverage against the weekday/weekend schedule manually; `/compliance` only surfaces `assignable_module_assignments` completion, informationally. See ADL-017. Do not build regulatory-certification tracking without a new explicit request.

## 9. Known Content Gaps (as of 2026-08-10, from the Kitchen Training Program Gap Audit)

Two systemic, company-wide gaps flagged and not yet actioned:
1. **No reinforcement mechanism after Day 4** besides the day-7/day-30 quiz reuse.
2. **No train-the-trainer content** for the informal Kitchen trainers who actually run the daily walkthrough (Emily, Jenny, Winston, Kelly, Chandler, Katie) — a delivery-consistency risk. Recommended and not yet built: a single "How to Run a Walkthrough" SOP, matching the existing Manager Walkthrough Guides pattern.

Smaller, also-unactioned gaps: no waste/inventory-cost training, no guest-service-recovery empowered-fix path (100% escalate-to-manager today), no structured Production/Service cross-shift handoff content, no visible growth-path surfacing.

**Baker sequencing resolved (2026-08-10, ADL-023):** Baker follows the same Kitchen Production Days 2-4 track as every other production crew member — no separate track or sequencing fork.

**Baking Reference Library — parked, not open work (2026-08-11, ADL-031):** recipe content (weights, shapes, bake times/temps, proofing, mixing) lives in Biggers' separate recipe system, not this platform. Other stations' Reference Library entries exist specifically for visual plating/finishing consistency, not recipes — Baking has no equivalent identified gap, so no content is being authored here. Reactivate only if a specific visual-finishing need for baked goods is identified.

**Kitchen Production/Service Days 2-4 loaded 2026-08-11** — see §12. Content still drafted but **not yet loaded**: Market Register/POS training (awaiting Sven's review, one video still missing). See Current Build State.md.

## 10. Governance of Content Edits

**Corrected 2026-08-11:** this section previously stated curated training content edited by a Manager routes through owner approval via `suggestion_queue`. Direct audit of live `pg_policies` on `modules`/`steps`/`tracks` found that was stale — a department-scoped Manager has always had direct UPDATE access at the RLS level, no approval gate. `suggestion_queue` is a separate, parallel path (`/suggest` → `/approvals`), not a gate in front of `/admin/content`. Two-tier model, corrected: curated training content (tracks/modules/steps) is direct-edit for a Manager within their own department, direct for Owner anywhere — same as operational reference content (Sourcing Board, Portioning, Manager Notes, Delivery Issues). No hard deletes on content, ever — soft-delete plus full version history, restorable, specifically to prevent a disgruntled or exiting manager from destroying content.

**Reorder/move (ADL-036, 2026-08-11):** dragging modules to reorder them within a section, or between sections, changes position (`sequence_order`/`track_id`) only — never what the content says. It needed no new grant for Managers (already covered by the existing direct-edit RLS above, and cross-department `track_id` moves are already rejected by the existing `modules_update` policy's `WITH CHECK`). Section-level reorder was the one real gap: any department-scoped Manager could previously resort the shared track list for everyone via their track's `sequence_order` field. Closed via `guard_track_reorder()`, a before-update trigger restricting `tracks.sequence_order` changes to Owner/GM only — same pattern as `guard_sourcing_delete()`. See Roles and Permissions.md §2 and §6. Reorder never grants any delete capability.

**Narrower exceptions (ADL-039, ADL-040, 2026-08-11):** two content operations are scoped tighter than the general direct-edit-within-department rule above — quiz question authoring (`quiz_bank`) and assigning a restricted/seasonal `is_assignable` module to an employee (`assignable_module_assignments`) are General Manager + Owner actions, not open to a regular (non-GM) Manager. Both are enforced at the RLS level, not just in the UI.

## 11. Referencing People in Content

**Reference people by position/role, never by a specific person's name.** Say "a manager on duty," "the weekend leads," "the Kitchen Operations Manager" — not "Emily," "Casey," or "Kelly." This is a standing content-authorship rule (Sven's direct call, 2026-08-11, see ADL-041), not a dynamic lookup: the platform does not model job titles/positions as a queryable field (only the four access levels — staff/manager/GM/owner — exist in the database), so there is no "current role holder" component to invoke. The fix is purely editorial, applied at authoring time.

Reason: names change when someone is promoted, transferred, or leaves; a document written around a specific name silently goes stale and nobody is prompted to catch it. Position language stays correct indefinitely with zero maintenance.

This applies to all new content going forward, and was retroactively applied to five of six live content pieces found to hardcode names as of 2026-08-11 (see ADL-041 for the list). The sixth — a POS Item Entry SOP naming a specific individual for a monthly reconciliation task — is held pending confirmation of which role/position actually performs that task.

## 12. Kitchen Production/Service Days 2-4 (live 2026-08-11)

12 modules (6 Production, 6 Service), 23 steps, loaded on the existing Kitchen track (sub_path `Production`/`Service`, day_assignment 2-4, sequence_order 8-19, continuing directly after Foundations' 1-7). Full content and sourcing lives in `Kitchen_Production_Service_Days_2-4_Track_Draft.md`. Two new standing content patterns came out of this load, from the Kitchen Training Program Gap Audit's "change before the draft loads" findings, applicable beyond Kitchen going forward:

- **Guest-service recovery: draw the can-fix-it-yourself line, don't default everything to escalation.** Low-stakes, no-judgment fixes (a wrong item, a simple remake, a sold-out substitution) are handled by the employee directly. Anything with real judgment attached (a comp, a refund) still goes to a manager. For either case, use a short, repeatable framework — LAST (Listen, Apologize, Solve, Thank) was chosen over HEART for its shorter form. Food-safety-driven escalation (an allergy question) is never downgraded by this rule; that's a different category, not a service-recovery judgment call. Apply this same shape (can-fix-it-yourself vs. needs-a-manager, plus a repeatable short framework) to Market's customer-scenario content when it's built, rather than defaulting to escalate-everything there too.
- **Cross-shift handoff gets a named line at the actual seam, not a generic "communicate well" instruction.** Where a track structurally splits across different crews/days (Kitchen's weekday Production vs. weekend Service), the content names specifically what the next crew depends on from the previous one, placed in the outgoing crew's own Day 3 content, not as a separate handoff artifact. Applied here as Production naming the Thursday-close-to-Friday-open handoff and Service naming the Sunday-close-to-Monday-open handoff.

**Not folded into this load:** the "How to Run a Walkthrough" trainer SOP (§9, Gap Audit finding #2) is a separate Reference Library document, not part of this track's content, and remains open — see Current Build State.md, Next Logical Build Priorities.
