---
paths:
  - "src/routes/preview.tsx"
  - "src/routes/modules.$moduleId.tsx"
  - "src/components/training/**"
  - "src/components/admin/StepBlocksEditor.tsx"
  - "src/components/admin/EntityEditPanels.tsx"
  - "src/lib/training.queries.ts"
  - "src/lib/preview.queries.ts"
  - "src/lib/queue.queries.ts"
  - "src/lib/cross-training.queries.ts"
  - "src/lib/richText.tsx"
  - "src/lib/inline-format.ts"
---

# Training Rendering and Plan Logic Rules

Applies to all agents, including Lovable. This code decides what a trainee sees and in what order. Bugs here are high-impact and have happened before (blank `/preview`, Market missing Universal Day 1, cross-day ordering).

## Preview parity

- `/preview` and `/modules/$moduleId` must render a step identically for a trainee. Admin additions only: edit pencils, sign-off controls, preview banner, Owner/Manager-only sections.
- Shared rendering lives in `ModuleHeader`, `StepRenderer`, `BlockRenderer`, `TraineeWalk`. Change the shared component; never fork a per-screen copy.
- Module intro cards resolve through the shared `introCardText` helper (`card_override_text`, `hide_module_card`).

## Plan and ordering

Plan logic lives in `src/lib/training.queries.ts` (`planQueryOptions`, `compareModulesByDay`, `getDayGroupedSteps`, `moduleVisibleForScope`). The trainee plan, Training Queue and sign-off backlog all share these helpers. Change the helper, never a per-screen copy.

- Day comes from `modules.day_assignment`. Steps inherit it. Never move one step's day by editing a shared module's day; that drags every other step with it.
- Module order: day first, then Universal before Division modules on the same day, then track `sequence_order`, then module `sequence_order`.
- Within a day, steps are bucketed by `steps.day_position`: `start` (for example Clock In), `middle` (default), `end`. The day's one trainer stop (`doing_signoff` or `supervised_live_practice`) must come last in the day. Setting it to `end` guarantees that; today most Day 2 to 4 trainer stops are `middle` and are last only because their module sorts last. Days never interleave.
- Universal always merges into every Division's plan.
- **Paths (branches):** rows in the `paths` table, per track (today: Kitchen Production and Service). `modules.path_id = null` means shared by every branch; otherwise only employees with that `path_id` see it. Manager-tier employees see every branch of their home Division. Branch logic is data-driven; never hardcode "Production" or "Service."
- **Cross-training:** `employee_secondary_divisions` adds another Division (with its own `path_id`) to the plan. Universal is not repeated.
- `department_scope` drives plan, completion and onboarding math. `employees.path` and `modules.path` (text) are legacy; use `path_id`.
- `is_assignable` modules sit outside the 4-day plan and appear only when assigned.
- A module with zero steps shows "This module has no steps yet." It must never blank the screen or break day navigation.

## Content rendering

- Read `step_blocks` first. If any blocks exist, they are what renders. Legacy `content_body`/`media_url`/`video_url` render only when a step has no blocks.
- Block types are enforced by a database CHECK constraint. Adding one uses the `add-step-block-type` skill.
- Inline formatting is stored as markers (`**bold**`, `*italic*`, `__underline__`) and rendered by `richText`. Do not switch storage to HTML.
- Block types rendered by `BlockRenderer`: `heading` (h2/h3), `paragraph`, `list` (numbered with optional `payload.start`, or bulleted), `photo`, `gallery`, `video` (YouTube only), `label_value` (label/value rows with keyword icons), `danger_zone`. Unknown types render nothing.
- Legacy `content_body` keeps its older conventions (`Label | Value` lines as a card grid, `## ` sub-headings, `[[danger-zone]]` marker). Do not extend legacy parsing; new features go to blocks.
- Media renders based on presence, not on `step_type`.

## Progress and sign-off

- Status values: `not_started`, `in_progress`, `completed`, `signed_off`. Viewing is never completion.
- Self-paced completion is trusted (no watch verification).
- Sign-off authorization is `can_manage_progress_for()` in the database, based on the step's Division, not the trainee's home Division.
- The sign-off checklist gate (`steps.signoff_checklist`) must be fully checked before Sign Off unlocks; confirmed items are saved to `progress_records.checklist_confirmed`.
- Trainer handoff notes (`progress_records.notes`) are admin-only and never shown to the trainee.
